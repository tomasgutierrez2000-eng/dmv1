import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { getCatalogueItem } from '@/lib/metric-library/store';
import { executeSandboxQuery } from '@/lib/governance/sandbox-runner';
import { readDataDictionary, type DataDictionaryTable } from '@/lib/data-dictionary';
import {
  extractTablesFromSql,
  extractJoinRefs,
  resolveAliasMap,
  extractColumnRefsFromSql,
} from '@/lib/governance/sql-parser';
import type { CatalogueItem } from '@/lib/metric-library/types';

/* ── Level key mapping (UI tab → catalogue level key) ─────── */

const TAB_TO_LEVEL: Record<string, string> = {
  facility: 'facility',
  counterparty: 'counterparty',
  desk: 'desk',
  portfolio: 'portfolio',
  business_segment: 'lob',
};

/* ── Heuristic join inference (fallback when no formula) ───── */

function tableAlias(table: string): string {
  return table
    .split('_')
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toLowerCase() || table.slice(0, 2);
}

interface IngredientTableEntry {
  key: string;
  layer: string;
  table: string;
  fields: Array<{
    layer: string;
    table: string;
    field: string;
    description: string;
    data_type?: string;
    role?: string;
  }>;
  row_count: number;
  source?: 'formula' | 'ingredient' | 'both';
  join_type?: string;
}

function inferJoinRelationships(
  tables: IngredientTableEntry[],
): Array<{ from: string; to: string; join_type: string }> {
  const seen = new Set<string>();
  const joins: Array<{ from: string; to: string; join_type: string }> = [];
  const tableFields = new Map<string, Set<string>>();
  for (const t of tables) {
    const fields = new Set(t.fields.map((f) => f.field));
    tableFields.set(t.table, fields);
  }
  for (const t1 of tables) {
    for (const t2 of tables) {
      if (t1.key === t2.key) continue;
      const f1 = tableFields.get(t1.table);
      const f2 = tableFields.get(t2.table);
      if (!f1 || !f2) continue;
      for (const field of f1) {
        if (!field.endsWith('_id')) continue;
        if (f2.has(field)) {
          const a1 = tableAlias(t1.table);
          const a2 = tableAlias(t2.table);
          const key = [a1, field, a2].join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          joins.push({ from: `${a1}.${field}`, to: `${a2}.${field}`, join_type: 'INNER' });
        }
      }
    }
  }
  return joins;
}

/* ── Row count enrichment ─────────────────────────────────── */

async function enrichRowCounts(tables: IngredientTableEntry[]): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  await Promise.allSettled(
    tables.map(async (t) => {
      try {
        const schema = t.layer.toLowerCase();
        const result = await executeSandboxQuery(
          `SELECT COUNT(*) AS cnt FROM ${schema}.${t.table}`,
          {},
          { maxRows: 1, timeoutMs: 5000 },
        );
        t.row_count = Number(result.rows[0]?.cnt ?? 0);
      } catch {
        t.row_count = -1;
      }
    }),
  );
}

/* ── Static response (backward compat, no level) ─────────── */

function buildStaticTables(item: CatalogueItem): IngredientTableEntry[] {
  const tableMap = new Map<string, { layer: string; table: string; fields: CatalogueItem['ingredient_fields'] }>();
  for (const field of item.ingredient_fields) {
    const key = `${field.layer.toLowerCase()}.${field.table}`;
    if (!tableMap.has(key)) {
      tableMap.set(key, { layer: field.layer, table: field.table, fields: [] });
    }
    tableMap.get(key)!.fields.push(field);
  }
  return [...tableMap.entries()].map(([key, info]) => ({
    key,
    layer: info.layer,
    table: info.table,
    fields: info.fields,
    row_count: -1,
  }));
}

/* ── Level-specific response (parse formula_sql + DD) ─────── */

function findDDTable(
  dd: { L1: DataDictionaryTable[]; L2: DataDictionaryTable[]; L3: DataDictionaryTable[] },
  schema: string,
  table: string,
): DataDictionaryTable | undefined {
  const layer = schema.toUpperCase() as 'L1' | 'L2' | 'L3';
  return dd[layer]?.find((t) => t.name === table);
}

function buildLevelTables(
  item: CatalogueItem,
  formulaSql: string,
): IngredientTableEntry[] {
  const dd = readDataDictionary();

  // Parse SQL
  const sqlTables = extractTablesFromSql(formulaSql);
  const joinRefs = extractJoinRefs(formulaSql);
  const aliasMap = resolveAliasMap(formulaSql);
  const colRefs = extractColumnRefsFromSql(formulaSql);

  // Map columns to tables via aliases
  const tableColumnRefs = new Map<string, Set<string>>();
  for (const [alias, cols] of colRefs) {
    const tableName = aliasMap.get(alias);
    if (!tableName) continue;
    for (const sqlT of sqlTables) {
      if (sqlT.table === tableName) {
        const key = `${sqlT.schema}.${sqlT.table}`;
        if (!tableColumnRefs.has(key)) tableColumnRefs.set(key, new Set());
        for (const c of cols) tableColumnRefs.get(key)!.add(c);
        break;
      }
    }
  }

  // Build tables from SQL, enriched with DD
  const tableMap = new Map<string, IngredientTableEntry>();

  for (const sqlT of sqlTables) {
    const key = `${sqlT.schema}.${sqlT.table}`;
    const layerUpper = sqlT.schema.toUpperCase();
    const ddTable = dd ? findDDTable(dd, sqlT.schema, sqlT.table) : undefined;
    const refCols = tableColumnRefs.get(key);
    const joinRef = joinRefs.find((j) => j.schema === sqlT.schema && j.table === sqlT.table);

    const fields: IngredientTableEntry['fields'] = [];

    if (ddTable) {
      for (const f of ddTable.fields) {
        const isReferenced = refCols?.has(f.name);
        const isPk = f.pk_fk?.is_pk;
        if (isReferenced || isPk) {
          fields.push({
            layer: layerUpper,
            table: sqlT.table,
            field: f.name,
            description: f.description || f.why_required || '',
            data_type: f.data_type,
            role: isReferenced ? 'FORMULA_REF' : 'JOIN_KEY',
          });
        }
      }
    }

    tableMap.set(key, {
      key,
      layer: layerUpper,
      table: sqlT.table,
      fields,
      row_count: -1,
      source: 'formula',
      join_type: joinRef?.join_type,
    });
  }

  // Merge static ingredient_fields
  for (const field of item.ingredient_fields ?? []) {
    const key = `${field.layer.toLowerCase()}.${field.table}`;
    if (tableMap.has(key)) {
      const entry = tableMap.get(key)!;
      entry.source = 'both';
      if (!entry.fields.some((f) => f.field === field.field)) {
        entry.fields.push({ ...field, role: 'MEASURE' });
      } else {
        const existing = entry.fields.find((f) => f.field === field.field);
        if (existing && existing.role === 'FORMULA_REF') existing.role = 'MEASURE';
      }
    } else {
      tableMap.set(key, {
        key,
        layer: field.layer,
        table: field.table,
        fields: [{ ...field, role: 'MEASURE' }],
        row_count: -1,
        source: 'ingredient',
      });
    }
  }

  return [...tableMap.values()];
}

/* ── ON clause extraction for join relationships ──────────── */

function extractJoinRelationships(
  formulaSql: string,
): Array<{ from: string; to: string; join_type: string }> {
  const joins: Array<{ from: string; to: string; join_type: string }> = [];
  // Match: [LEFT|INNER|...] JOIN schema.table alias ON alias.col = alias.col
  const re =
    /(?:(LEFT|RIGHT|INNER|CROSS|FULL)\s+)?JOIN\s+(l[123])\.([a-z_][a-z0-9_]*)(?:\s+(?:AS\s+)?([a-z_][a-z0-9_]*))?\s+ON\s+([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\s*=\s*([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)/gi;
  let m;
  while ((m = re.exec(formulaSql)) !== null) {
    const jtype = (m[1] || 'INNER').trim().toUpperCase();
    joins.push({
      from: `${m[5]}.${m[6]}`,
      to: `${m[7]}.${m[8]}`,
      join_type: jtype,
    });
  }
  return joins;
}

/* ── GET handler ──────────────────────────────────────────── */

/**
 * GET /api/metrics/governance/ingredients?item_id=MET-109&level=facility
 *
 * Returns ingredient field metadata for a catalogue item.
 * When `level` is provided, dynamically extracts tables from formula_sql
 * and enriches with data dictionary metadata.
 * Without `level`, returns static ingredient_fields (backward compat).
 */
export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const url = new URL(req.url);
    const itemId = url.searchParams.get('item_id');
    const level = url.searchParams.get('level');

    if (!itemId) {
      return jsonError('item_id is required', { status: 400, code: 'VALIDATION_ERROR' });
    }

    const item = getCatalogueItem(itemId);
    if (!item) {
      return jsonError('Item not found', { status: 404, code: 'NOT_FOUND' });
    }

    let tables: IngredientTableEntry[];
    let joinRelationships: Array<{ from: string; to: string; join_type: string }>;

    if (level) {
      // Level-specific: parse formula_sql
      const levelKey = TAB_TO_LEVEL[level] ?? level;
      const levelDef = item.level_definitions?.find((ld) => ld.level === levelKey);
      const formulaSql = levelDef?.formula_sql;

      if (formulaSql) {
        tables = buildLevelTables(item, formulaSql);
        joinRelationships = extractJoinRelationships(formulaSql);
      } else {
        // No formula for this level — fall back to static
        tables = buildStaticTables(item);
        joinRelationships = inferJoinRelationships(tables);
      }
    } else {
      // No level — static ingredient_fields (backward compat)
      tables = buildStaticTables(item);
      joinRelationships = inferJoinRelationships(tables);
    }

    await enrichRowCounts(tables);

    return jsonSuccess({
      item_id: itemId,
      item_name: item.item_name,
      level: level || null,
      tables,
      join_relationships: joinRelationships,
      db_connected: !!process.env.DATABASE_URL,
    });
  });
}
