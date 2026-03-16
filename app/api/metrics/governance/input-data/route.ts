import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { executeSandboxQuery } from '@/lib/governance/sandbox-runner';
import { getCatalogueItem } from '@/lib/metric-library/store';
import { readDataDictionary, type DataDictionaryTable, type DataDictionaryField } from '@/lib/data-dictionary';

/* ── Types ──────────────────────────────────────────────────── */

interface InputColumn {
  name: string;
  data_type: string;
  is_pk: boolean;
  is_fk: boolean;
  is_formula_ref: boolean;
  role?: string;
}

interface InputTableResult {
  schema: string;
  table: string;
  qualified_name: string;
  columns: InputColumn[];
  rows: Record<string, unknown>[];
  total_count: number;
  returned_count: number;
  truncated: boolean;
  highlighted_columns: string[];
  pk_columns: string[];
  duration_ms: number;
  error?: string;
}

interface ResolvedTable {
  schema: string;
  table: string;
  ingredientColumns: string[];
  formulaRefColumns: string[];
  pkColumns: string[];
  hasAsOfDate: boolean;
  allDDColumns: DataDictionaryField[];
}

/* ── Constants ──────────────────────────────────────────────── */

const ALLOWED_SCHEMAS = new Set(['l1', 'l2', 'l3']);
const COL_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const TABLE_RE = /\b(l[123])\.([a-z_][a-z0-9_]*)\b/gi;
const MAX_ROWS_CEILING = 200;
const DEFAULT_MAX_ROWS = 50;
const QUERY_TIMEOUT_MS = 10_000;

/* ── Scope filter mapping ───────────────────────────────────── */

/** Map level → column name that acts as dimension_key at that level */
const LEVEL_DIM_COLUMN: Record<string, string> = {
  facility: 'facility_id',
  counterparty: 'counterparty_id',
  desk: 'managed_segment_id',
  portfolio: 'managed_segment_id',
  business_segment: 'managed_segment_id',
};

/**
 * Build a WHERE clause to scope a table's rows to a specific dimension_key.
 * Returns null if no mapping is possible (table shown unscoped).
 */
function buildScopeClause(
  scopeLevel: string,
  scopeKey: string,
  table: string,
  ddColumns: DataDictionaryField[],
): { clause: string; params: Record<string, unknown> } | null {
  const colNames = new Set(ddColumns.map(c => c.name));

  if (scopeLevel === 'facility') {
    if (colNames.has('facility_id')) {
      return { clause: 'facility_id = :scope_key', params: { scope_key: scopeKey } };
    }
    return null;
  }

  if (scopeLevel === 'counterparty') {
    if (colNames.has('counterparty_id')) {
      return { clause: 'counterparty_id = :scope_key', params: { scope_key: scopeKey } };
    }
    if (colNames.has('facility_id')) {
      return {
        clause: 'facility_id IN (SELECT facility_id FROM l2.facility_master WHERE counterparty_id = :scope_key)',
        params: { scope_key: scopeKey },
      };
    }
    return null;
  }

  // Desk / Portfolio / Segment — EBT hierarchy scoping
  if (scopeLevel === 'desk') {
    if (colNames.has('managed_segment_id')) {
      return { clause: 'managed_segment_id = :scope_key', params: { scope_key: scopeKey } };
    }
    if (colNames.has('lob_segment_id')) {
      return {
        clause: `lob_segment_id IN (SELECT managed_segment_id FROM l1.enterprise_business_taxonomy WHERE managed_segment_id = :scope_key AND is_current_flag = 'Y')`,
        params: { scope_key: scopeKey },
      };
    }
    if (colNames.has('facility_id')) {
      return {
        clause: `facility_id IN (SELECT fm.facility_id FROM l2.facility_master fm LEFT JOIN l1.enterprise_business_taxonomy ebt ON ebt.managed_segment_id = fm.lob_segment_id AND ebt.is_current_flag = 'Y' WHERE ebt.managed_segment_id = :scope_key)`,
        params: { scope_key: scopeKey },
      };
    }
    return null;
  }

  if (scopeLevel === 'portfolio') {
    if (colNames.has('managed_segment_id')) {
      return { clause: 'managed_segment_id = :scope_key', params: { scope_key: scopeKey } };
    }
    if (colNames.has('facility_id')) {
      return {
        clause: `facility_id IN (SELECT fm.facility_id FROM l2.facility_master fm LEFT JOIN l1.enterprise_business_taxonomy ebt_l3 ON ebt_l3.managed_segment_id = fm.lob_segment_id AND ebt_l3.is_current_flag = 'Y' LEFT JOIN l1.enterprise_business_taxonomy ebt_l2 ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id AND ebt_l2.is_current_flag = 'Y' WHERE ebt_l2.managed_segment_id = :scope_key)`,
        params: { scope_key: scopeKey },
      };
    }
    return null;
  }

  if (scopeLevel === 'business_segment') {
    if (colNames.has('managed_segment_id')) {
      return { clause: 'managed_segment_id = :scope_key', params: { scope_key: scopeKey } };
    }
    if (colNames.has('facility_id')) {
      return {
        clause: `facility_id IN (SELECT fm.facility_id FROM l2.facility_master fm LEFT JOIN l1.enterprise_business_taxonomy ebt_l3 ON ebt_l3.managed_segment_id = fm.lob_segment_id AND ebt_l3.is_current_flag = 'Y' LEFT JOIN l1.enterprise_business_taxonomy ebt_l2 ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id AND ebt_l2.is_current_flag = 'Y' LEFT JOIN l1.enterprise_business_taxonomy ebt_l1 ON ebt_l1.managed_segment_id = ebt_l2.parent_segment_id AND ebt_l1.is_current_flag = 'Y' WHERE ebt_l1.managed_segment_id = :scope_key)`,
        params: { scope_key: scopeKey },
      };
    }
    return null;
  }

  return null;
}

/* ── Table resolution ───────────────────────────────────────── */

function extractTablesFromSql(sql: string): Array<{ schema: string; table: string }> {
  const seen = new Set<string>();
  const tables: Array<{ schema: string; table: string }> = [];
  let match;
  const re = new RegExp(TABLE_RE.source, TABLE_RE.flags);
  while ((match = re.exec(sql)) !== null) {
    const key = `${match[1].toLowerCase()}.${match[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      tables.push({ schema: match[1].toLowerCase(), table: match[2] });
    }
  }
  return tables;
}

/**
 * Extract alias.column references from formula SQL.
 * Returns a map: alias → Set<column_name>.
 * Skips schema prefixes (l1, l2, l3) which are table references, not aliases.
 */
function extractColumnRefsFromSql(sql: string): Map<string, Set<string>> {
  const COL_RE = /\b([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\b/gi;
  const refs = new Map<string, Set<string>>();
  let match;
  while ((match = COL_RE.exec(sql)) !== null) {
    const alias = match[1].toLowerCase();
    const column = match[2].toLowerCase();
    if (ALLOWED_SCHEMAS.has(alias)) continue; // schema.table, not alias.column
    if (!refs.has(alias)) refs.set(alias, new Set());
    refs.get(alias)!.add(column);
  }
  return refs;
}

/**
 * Try to map aliases in the SQL to actual table names.
 * Parses FROM/JOIN clauses for "schema.table_name alias" patterns.
 */
function resolveAliasMap(sql: string): Map<string, string> {
  const aliasMap = new Map<string, string>();
  // Match: FROM/JOIN l1.table_name alias_name  or  FROM/JOIN l1.table_name AS alias_name
  const re = /(?:FROM|JOIN)\s+(l[123])\.([a-z_][a-z0-9_]*)(?:\s+(?:AS\s+)?([a-z_][a-z0-9_]*))?/gi;
  let match;
  while ((match = re.exec(sql)) !== null) {
    const tableName = match[2];
    const alias = match[3];
    if (alias && !ALLOWED_SCHEMAS.has(alias)) {
      aliasMap.set(alias.toLowerCase(), tableName);
    }
  }
  return aliasMap;
}

function resolveIngredientTables(
  item: { ingredient_fields: Array<{ layer: string; table: string; field: string; description?: string }> },
  formulaSql: string | undefined,
  dd: { L1: DataDictionaryTable[]; L2: DataDictionaryTable[]; L3: DataDictionaryTable[] },
): ResolvedTable[] {
  const result = new Map<string, ResolvedTable>();

  // Helper to find DD table
  function findDD(schema: string, table: string): DataDictionaryTable | undefined {
    const layer = schema.toUpperCase() as 'L1' | 'L2' | 'L3';
    return dd[layer]?.find(t => t.name === table);
  }

  // Source 1: ingredient_fields from catalogue
  for (const field of item.ingredient_fields ?? []) {
    const schema = field.layer.toLowerCase();
    const key = `${schema}.${field.table}`;
    if (!result.has(key)) {
      const ddTable = findDD(schema, field.table);
      if (!ddTable) continue; // Skip tables not in DD
      const pkCols = ddTable.fields.filter(f => f.pk_fk?.is_pk).map(f => f.name);
      const hasAsOf = ddTable.fields.some(f => f.name === 'as_of_date');
      result.set(key, {
        schema,
        table: field.table,
        ingredientColumns: [],
        formulaRefColumns: [],
        pkColumns: pkCols,
        hasAsOfDate: hasAsOf,
        allDDColumns: ddTable.fields,
      });
    }
    const entry = result.get(key)!;
    if (!entry.ingredientColumns.includes(field.field)) {
      entry.ingredientColumns.push(field.field);
    }
  }

  // Source 2: formula SQL parsing (add tables not already found)
  if (formulaSql) {
    const sqlTables = extractTablesFromSql(formulaSql);
    for (const t of sqlTables) {
      const key = `${t.schema}.${t.table}`;
      if (!result.has(key)) {
        const ddTable = findDD(t.schema, t.table);
        if (!ddTable) continue;
        const pkCols = ddTable.fields.filter(f => f.pk_fk?.is_pk).map(f => f.name);
        const hasAsOf = ddTable.fields.some(f => f.name === 'as_of_date');
        result.set(key, {
          schema: t.schema,
          table: t.table,
          ingredientColumns: [],
          formulaRefColumns: [],
          pkColumns: pkCols,
          hasAsOfDate: hasAsOf,
          allDDColumns: ddTable.fields,
        });
      }
    }

    // Extract column references via alias resolution
    const aliasMap = resolveAliasMap(formulaSql);
    const colRefs = extractColumnRefsFromSql(formulaSql);
    for (const [alias, cols] of colRefs) {
      const tableName = aliasMap.get(alias);
      if (!tableName) continue;
      // Find which resolved table this alias maps to
      for (const entry of result.values()) {
        if (entry.table === tableName) {
          for (const col of cols) {
            if (!entry.formulaRefColumns.includes(col)) {
              entry.formulaRefColumns.push(col);
            }
          }
          break;
        }
      }
    }
  }

  return [...result.values()];
}

/* ── Query construction ─────────────────────────────────────── */

function buildTableQuery(
  table: ResolvedTable,
  asOfDate: string,
  scope: { dimension_key: string; level: string } | undefined,
  maxRows: number,
): { sql: string; params: Record<string, unknown> } {
  // Decide which columns to select
  const allDDColNames = table.allDDColumns.map(c => c.name);
  let selectedCols: string[];

  if (table.ingredientColumns.length > 0 || table.formulaRefColumns.length > 0) {
    // Build curated column list: PK + formula refs + ingredient fields + FKs
    const colSet = new Set<string>();
    for (const pk of table.pkColumns) colSet.add(pk);
    for (const col of table.formulaRefColumns) {
      if (allDDColNames.includes(col)) colSet.add(col);
    }
    for (const col of table.ingredientColumns) {
      if (allDDColNames.includes(col)) colSet.add(col);
    }
    // Add FK columns for traceability
    for (const f of table.allDDColumns) {
      if (f.pk_fk?.fk_target && !f.pk_fk?.is_pk) colSet.add(f.name);
    }
    // If very few columns, just select all (more useful for small tables)
    if (colSet.size < 3 && allDDColNames.length <= 20) {
      selectedCols = allDDColNames;
    } else {
      selectedCols = allDDColNames.filter(c => colSet.has(c));
    }
  } else {
    // No ingredient info — select all (capped by DD columns)
    selectedCols = allDDColNames.length <= 30
      ? allDDColNames
      : allDDColNames.slice(0, 30);
  }

  // Validate column names
  selectedCols = selectedCols.filter(c => COL_NAME_RE.test(c));
  if (selectedCols.length === 0) selectedCols = ['*'];

  const colList = selectedCols.join(', ');
  let sql = `SELECT ${colList} FROM ${table.schema}.${table.table}`;

  const whereClauses: string[] = [];
  const params: Record<string, unknown> = {};

  // Filter by as_of_date if table has that column
  if (table.hasAsOfDate) {
    whereClauses.push('as_of_date = :as_of_date');
    params.as_of_date = asOfDate;
  }

  // Scope filtering
  if (scope) {
    const scopeClause = buildScopeClause(scope.level, scope.dimension_key, table.table, table.allDDColumns);
    if (scopeClause) {
      whereClauses.push(scopeClause.clause);
      Object.assign(params, scopeClause.params);
    }
  }

  if (whereClauses.length > 0) {
    sql += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  // Order by PK for deterministic output
  if (table.pkColumns.length > 0) {
    const validPks = table.pkColumns.filter(c => COL_NAME_RE.test(c));
    if (validPks.length > 0) {
      sql += ` ORDER BY ${validPks.join(', ')}`;
    }
  }

  return { sql, params };
}

/* ── Column metadata builder ────────────────────────────────── */

function buildColumnMetadata(table: ResolvedTable): InputColumn[] {
  // Build role map from ingredient_fields context
  const highlightSet = new Set([...table.formulaRefColumns, ...table.ingredientColumns]);

  return table.allDDColumns
    .filter(f => COL_NAME_RE.test(f.name))
    .map(f => ({
      name: f.name,
      data_type: f.data_type ?? inferTypeFromName(f.name),
      is_pk: f.pk_fk?.is_pk ?? false,
      is_fk: !!f.pk_fk?.fk_target,
      is_formula_ref: highlightSet.has(f.name),
      role: inferFieldRole(f.name, table.table),
    }));
}

function inferTypeFromName(name: string): string {
  if (name.endsWith('_id')) return 'BIGINT';
  if (name.endsWith('_code')) return 'VARCHAR(30)';
  if (name.endsWith('_name') || name.endsWith('_desc') || name.endsWith('_text')) return 'VARCHAR(500)';
  if (name.endsWith('_amt')) return 'NUMERIC(20,4)';
  if (name.endsWith('_pct')) return 'NUMERIC(10,6)';
  if (name.endsWith('_date')) return 'DATE';
  if (name.endsWith('_ts')) return 'TIMESTAMP';
  if (name.endsWith('_flag')) return 'BOOLEAN';
  if (name.endsWith('_count')) return 'INTEGER';
  if (name.endsWith('_bps')) return 'NUMERIC(10,4)';
  return 'VARCHAR(64)';
}

function inferFieldRole(field: string, table: string): string | undefined {
  if (field.endsWith('_amt') || field.endsWith('_pct') || field.endsWith('_bps') || field.includes('valuation')) return 'MEASURE';
  if (field === `${table}_id` || (field.endsWith('_id') && field === table.replace(/_dim$/, '') + '_id')) return 'JOIN_KEY';
  if (field.endsWith('_id')) return 'DIMENSION';
  if (field === 'as_of_date') return 'FILTER';
  if (field.endsWith('_flag')) return 'FILTER';
  return undefined;
}

/* ── Route Handler ──────────────────────────────────────────── */

/**
 * POST /api/metrics/governance/input-data
 *
 * Query ingredient tables from PostgreSQL to show the actual
 * input data rows that feed into a metric calculation.
 * Read-only transaction with 10s timeout per table.
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    if (!process.env.DATABASE_URL) {
      return jsonError('Database not connected', {
        status: 503,
        code: 'DB_UNAVAILABLE',
        details: 'Set DATABASE_URL to enable input data inspection',
      });
    }

    const body = await req.json();
    const { item_id, as_of_date, level, formula_sql, scope, max_rows_per_table } = body as {
      item_id?: string;
      as_of_date?: string;
      level?: string;
      formula_sql?: string;
      scope?: { dimension_key: string; level: string };
      max_rows_per_table?: number;
    };

    if (!item_id || typeof item_id !== 'string') {
      return jsonError('item_id is required', { status: 400, code: 'VALIDATION_ERROR' });
    }
    if (!as_of_date || typeof as_of_date !== 'string') {
      return jsonError('as_of_date is required', { status: 400, code: 'VALIDATION_ERROR' });
    }

    // Load catalogue item
    const item = getCatalogueItem(item_id);
    if (!item) {
      return jsonError(`Catalogue item not found: ${item_id}`, { status: 404, code: 'NOT_FOUND' });
    }

    // Load data dictionary for table/column validation
    const dd = readDataDictionary();
    if (!dd) {
      return jsonError('Data dictionary not available', { status: 503, code: 'DD_UNAVAILABLE' });
    }

    // Also try the formula_sql from the item's level_definitions
    const levelKey = level === 'business_segment' ? 'lob' : level;
    const levelDef = item.level_definitions?.find(ld => ld.level === levelKey);
    const effectiveFormulaSql = formula_sql || levelDef?.formula_sql || undefined;

    // Resolve ingredient tables
    const tables = resolveIngredientTables(item, effectiveFormulaSql, dd);
    if (tables.length === 0) {
      return jsonSuccess({
        tables: [],
        as_of_date,
        scope_applied: false,
      });
    }

    // Validate schemas
    const validTables = tables.filter(t => ALLOWED_SCHEMAS.has(t.schema));
    const maxRows = Math.min(max_rows_per_table ?? DEFAULT_MAX_ROWS, MAX_ROWS_CEILING);

    // Build and execute queries in parallel
    const queries = validTables.map(t => ({
      table: t,
      ...buildTableQuery(t, as_of_date, scope, maxRows),
    }));

    const results = await Promise.allSettled(
      queries.map(q =>
        executeSandboxQuery(q.sql, q.params, { maxRows, timeoutMs: QUERY_TIMEOUT_MS }),
      ),
    );

    // Assemble response
    const tableResults: InputTableResult[] = results.map((r, i) => {
      const tDef = validTables[i];
      const columns = buildColumnMetadata(tDef);
      const highlighted = [...new Set([...tDef.formulaRefColumns, ...tDef.ingredientColumns])];

      if (r.status === 'fulfilled') {
        return {
          schema: tDef.schema,
          table: tDef.table,
          qualified_name: `${tDef.schema}.${tDef.table}`,
          columns,
          rows: r.value.rows.slice(0, maxRows),
          total_count: r.value.rowCount,
          returned_count: Math.min(r.value.rows.length, maxRows),
          truncated: r.value.rowCount > maxRows,
          highlighted_columns: highlighted,
          pk_columns: tDef.pkColumns,
          duration_ms: r.value.durationMs,
        };
      }

      return {
        schema: tDef.schema,
        table: tDef.table,
        qualified_name: `${tDef.schema}.${tDef.table}`,
        columns,
        rows: [],
        total_count: 0,
        returned_count: 0,
        truncated: false,
        highlighted_columns: highlighted,
        pk_columns: tDef.pkColumns,
        duration_ms: 0,
        error: r.reason instanceof Error ? r.reason.message : 'Query failed',
      };
    });

    return jsonSuccess({
      tables: tableResults,
      as_of_date,
      scope_applied: !!scope,
      scope_description: scope
        ? `Scoped to ${scope.level} = ${scope.dimension_key}`
        : undefined,
    });
  });
}
