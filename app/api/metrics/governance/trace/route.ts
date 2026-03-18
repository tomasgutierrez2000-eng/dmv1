import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { executeSandboxQuery, getLatestAsOfDate } from '@/lib/governance/sandbox-runner';
import { validateFormulaSql } from '@/lib/governance/validation';
import { getCatalogueItem } from '@/lib/metric-library/store';
import {
  extractTablesFromSql,
  resolveAliasMap,
  extractColumnRefsFromSql,
  parseFormulaSteps,
  humanizeTableName,
  type FormulaStep,
} from '@/lib/governance/sql-parser';
import { buildLabelSql } from '@/lib/governance/drill-down';

/* ── Types ──────────────────────────────────────────────────────────── */

interface TraceColumnUsed {
  name: string;
  value: unknown;
  role: 'measure' | 'join_key' | 'filter' | 'reference';
}

interface TraceStep {
  order: number;
  type: 'source' | 'join' | 'filter' | 'compute';
  table_name: string;
  table_display: string;
  layer: string;
  alias_in_sql: string;
  description: string;
  join_condition?: string;
  filter_condition?: string;
  columns_used: TraceColumnUsed[];
  row_data: Record<string, unknown>[];
  row_count: number;
}

interface TraceResult {
  metric: {
    item_id: string;
    name: string;
    abbreviation: string;
    formula: string;
    formula_sql: string;
    unit_type: string;
    direction: string;
  };
  entity: {
    level: string;
    dimension_key: string;
    dimension_label: string;
  };
  steps: TraceStep[];
  final_result: {
    metric_value: number | null;
    formatted: string;
  };
  as_of_date: string;
  duration_ms: number;
}

/* ── Level → catalogue level key mapping ──────────────────────────── */
const LEVEL_TO_CATALOGUE: Record<string, string> = {
  facility: 'facility',
  counterparty: 'counterparty',
  desk: 'desk',
  portfolio: 'portfolio',
  business_segment: 'lob',
};

/* ── Valid levels whitelist ────────────────────────────────────────── */
const VALID_LEVELS = new Set(['facility', 'counterparty', 'desk', 'portfolio', 'business_segment']);

/* ── Table-level query builder for a specific entity (parameterized) ── */
function buildTableQuery(
  schema: string,
  table: string,
  level: string,
  asOfDate: string,
): { sql: string; params: Record<string, unknown> } {
  const qualified = `${schema}.${table}`;
  const params: Record<string, unknown> = {};

  // Determine filter column based on table name
  let filterCol: string | null = null;
  if (table.includes('facility') || table === 'position' || table === 'collateral_snapshot') {
    filterCol = 'facility_id';
  } else if (table.includes('counterparty') || table === 'credit_event') {
    filterCol = 'counterparty_id';
  } else if (table.includes('agreement')) {
    filterCol = 'credit_agreement_id';
  }

  const conditions: string[] = [];

  // Entity scope (using bind params)
  if (level === 'facility' && filterCol === 'facility_id') {
    conditions.push(`${filterCol} = :dim_key`);
    params.dim_key = ':dim_key'; // placeholder — actual value bound by caller
  } else if (level === 'counterparty') {
    if (filterCol === 'counterparty_id') {
      conditions.push('counterparty_id = :dim_key');
    } else if (filterCol === 'facility_id') {
      conditions.push('facility_id IN (SELECT facility_id FROM l2.facility_master WHERE counterparty_id = :dim_key)');
    }
  }

  // Date filter for L2 tables
  if (schema === 'l2') {
    conditions.push('as_of_date = :trace_date');
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  return { sql: `SELECT * FROM ${qualified}${where} LIMIT 10`, params: {} };
}

/* ── Infer column roles ───────────────────────────────────────────── */
function inferColumnRole(col: string, formulaColRefs: Set<string>): TraceColumnUsed['role'] {
  if (formulaColRefs.has(col.toLowerCase())) return 'measure';
  if (col.endsWith('_id')) return 'join_key';
  if (col === 'as_of_date' || col.endsWith('_flag')) return 'filter';
  return 'reference';
}

/* ── Format metric value ──────────────────────────────────────────── */
function formatValue(value: number | null, unitType: string): string {
  if (value === null || value === undefined) return 'N/A';
  switch (unitType) {
    case 'PERCENTAGE':
      return `${value.toFixed(2)}%`;
    case 'CURRENCY':
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    case 'RATIO':
      return `${value.toFixed(4)}`;
    case 'COUNT':
      return `${Math.round(value)}`;
    case 'DAYS':
      return `${Math.round(value)} days`;
    case 'BPS':
      return `${value.toFixed(1)} bps`;
    default:
      return `${value.toFixed(2)}`;
  }
}

/* ── POST /api/metrics/governance/trace ──────────────────────────── */

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    if (!process.env.DATABASE_URL) {
      return jsonError('Database not connected', {
        status: 503,
        code: 'DB_UNAVAILABLE',
        details: 'Calculation Trace requires PostgreSQL connection',
      });
    }

    const body = await req.json();
    const { item_id, level, dimension_key, as_of_date } = body as {
      item_id?: string;
      level?: string;
      dimension_key?: string;
      as_of_date?: string;
    };

    if (!item_id || typeof item_id !== 'string') return jsonError('item_id is required', { status: 400 });
    if (!level || typeof level !== 'string' || !VALID_LEVELS.has(level)) {
      return jsonError(`level must be one of: ${[...VALID_LEVELS].join(', ')}`, { status: 400 });
    }
    if (!dimension_key || typeof dimension_key !== 'string' || dimension_key.length > 500) {
      return jsonError('dimension_key is required (max 500 chars)', { status: 400 });
    }
    if (as_of_date && (typeof as_of_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(as_of_date))) {
      return jsonError('as_of_date must be YYYY-MM-DD format', { status: 400 });
    }

    const startMs = Date.now();

    // Load catalogue item
    const item = await getCatalogueItem(item_id);
    if (!item) return jsonError(`Metric ${item_id} not found`, { status: 404 });

    // Get formula SQL for the requested level
    const levelKey = LEVEL_TO_CATALOGUE[level] ?? level;
    const levelDef = item.level_definitions?.find(d => d.level === levelKey);
    const formulaSql = levelDef?.formula_sql?.trim();

    if (!formulaSql) {
      return jsonError(`No formula defined for ${level} level`, { status: 400 });
    }

    // Validate SQL safety
    const safetyCheck = validateFormulaSql(formulaSql);
    if (!safetyCheck.valid) {
      return jsonError(`Formula SQL unsafe: ${safetyCheck.error}`, { status: 400 });
    }

    // Resolve date
    const asOfDate = as_of_date ?? (await getLatestAsOfDate());
    if (!asOfDate) {
      return jsonError('No as_of_date available', { status: 400 });
    }

    // Parse formula structure
    const parsedSteps = parseFormulaSteps(formulaSql);
    const aliasMap = resolveAliasMap(formulaSql);
    const colRefs = extractColumnRefsFromSql(formulaSql);
    const tables = extractTablesFromSql(formulaSql);

    // Build all formula-referenced columns across all aliases
    const allFormulaColumns = new Set<string>();
    for (const cols of colRefs.values()) {
      for (const c of cols) allFormulaColumns.add(c);
    }

    // Step 1: Query each source table for this entity's data
    const traceSteps: TraceStep[] = [];

    for (const parsed of parsedSteps) {
      if (!parsed.tableName || !parsed.schema) continue;
      if (parsed.type !== 'source' && parsed.type !== 'join') continue;

      const alias = parsed.alias ?? parsed.tableName;
      const aliasColRefs = colRefs.get(alias.toLowerCase()) ?? new Set<string>();

      // Build query for this table scoped to the entity (parameterized)
      const { sql: tableQuerySql } = buildTableQuery(
        parsed.schema,
        parsed.tableName,
        level,
        asOfDate,
      );

      try {
        const result = await executeSandboxQuery(
          tableQuerySql,
          { dim_key: dimension_key, trace_date: asOfDate },
          { timeoutMs: 5000 },
        );
        const rows = (result?.rows ?? []) as Record<string, unknown>[];

        // Build columns_used from actual row data
        const columnsUsed: TraceColumnUsed[] = [];
        if (rows.length > 0) {
          const rowKeys = Object.keys(rows[0]);
          for (const key of rowKeys) {
            const role = inferColumnRole(key, aliasColRefs);
            columnsUsed.push({
              name: key,
              value: rows[0][key],
              role,
            });
          }
        }

        traceSteps.push({
          order: traceSteps.length,
          type: parsed.type,
          table_name: `${parsed.schema}.${parsed.tableName}`,
          table_display: humanizeTableName(parsed.tableName),
          layer: parsed.schema.toUpperCase(),
          alias_in_sql: alias,
          description: parsed.description,
          join_condition: parsed.condition,
          columns_used: columnsUsed,
          row_data: rows.slice(0, 10),
          row_count: rows.length,
        });
      } catch {
        // Table query failed — still include step with error
        traceSteps.push({
          order: traceSteps.length,
          type: parsed.type,
          table_name: `${parsed.schema}.${parsed.tableName}`,
          table_display: humanizeTableName(parsed.tableName),
          layer: parsed.schema.toUpperCase(),
          alias_in_sql: alias,
          description: parsed.description,
          join_condition: parsed.condition,
          columns_used: [],
          row_data: [],
          row_count: 0,
        });
      }
    }

    // Step 2: Execute the full formula for this entity to get the result
    let metricValue: number | null = null;
    let dimensionLabel = dimension_key;

    try {
      // Execute formula with bind params (safe — no string concatenation)
      const result = await executeSandboxQuery(
        formulaSql,
        { as_of_date: asOfDate },
        { timeoutMs: 15000, maxRows: 2000 },
      );

      if (result?.rows) {
        const rows = result.rows as Array<{ dimension_key: unknown; metric_value: unknown }>;
        // Filter client-side for the specific entity
        const match = rows.find(r => {
          if (r.dimension_key === null || r.dimension_key === undefined) return false;
          return String(r.dimension_key) === String(dimension_key);
        });
        if (match) {
          const raw = match.metric_value;
          if (raw !== null && raw !== undefined) {
            const num = Number(raw);
            metricValue = Number.isFinite(num) ? num : null;
          }
        }
      }
    } catch {
      // Formula execution failed — metricValue stays null
    }

    // Step 3: Resolve dimension label
    try {
      const labelSql = buildLabelSql(level as import('@/lib/governance/drill-down').DrillLevel);
      if (labelSql) {
        const labelResult = await executeSandboxQuery(labelSql, {}, { timeoutMs: 3000 });
        if (labelResult?.rows?.[0]) {
          const row = labelResult.rows[0] as Record<string, unknown>;
          dimensionLabel = String(row.label ?? row.dimension_label ?? dimension_key);
        }
      }
    } catch {
      // Label resolution failed — use dimension_key as label
    }

    // Add compute step
    traceSteps.push({
      order: traceSteps.length,
      type: 'compute',
      table_name: 'formula',
      table_display: 'Calculate Result',
      layer: 'L3',
      alias_in_sql: 'result',
      description: `Apply formula: ${item.generic_formula ?? 'metric calculation'}`,
      columns_used: [],
      row_data: metricValue !== null ? [{ dimension_key, metric_value: metricValue }] : [],
      row_count: metricValue !== null ? 1 : 0,
    });

    const response: TraceResult = {
      metric: {
        item_id: item.item_id,
        name: item.item_name,
        abbreviation: item.abbreviation,
        formula: item.generic_formula ?? '',
        formula_sql: formulaSql,
        unit_type: item.unit_type ?? 'RATIO',
        direction: item.direction ?? 'NEUTRAL',
      },
      entity: {
        level,
        dimension_key,
        dimension_label: dimensionLabel,
      },
      steps: traceSteps,
      final_result: {
        metric_value: metricValue,
        formatted: formatValue(metricValue, item.unit_type ?? 'RATIO'),
      },
      as_of_date: asOfDate,
      duration_ms: Date.now() - startMs,
    };

    return jsonSuccess(response);
  });
}
