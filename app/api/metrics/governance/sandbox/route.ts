import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { executeSandboxQuery, getLatestAsOfDate } from '@/lib/governance/sandbox-runner';
import { validateFormulaSql } from '@/lib/governance/validation';
import { parseGovernanceUser } from '@/lib/governance/identity';
import { runSqlMetric, getDistinctAsOfDates } from '@/lib/metrics-calculation/sql-runner';

async function persistSandboxRun(params: {
  item_id: string;
  run_by_id: string | null;
  run_by_name: string | null;
  level: string;
  as_of_date: string;
  current_sql: string;
  proposed_sql: string;
  current_row_count: number;
  proposed_row_count: number;
  current_total: number;
  proposed_total: number;
  reconciliation_pass: boolean;
  duration_ms: number | null;
  result_snapshot: Record<string, unknown>;
}): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query(
      `INSERT INTO l3.metric_sandbox_run (
        item_id, run_by_id, run_by_name, level, as_of_date,
        current_sql, proposed_sql, current_row_count, proposed_row_count,
        current_total, proposed_total, reconciliation_pass, duration_ms, result_snapshot
      ) VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        params.item_id,
        params.run_by_id,
        params.run_by_name,
        params.level,
        params.as_of_date,
        params.current_sql,
        params.proposed_sql,
        params.current_row_count,
        params.proposed_row_count,
        params.current_total,
        params.proposed_total,
        params.reconciliation_pass,
        params.duration_ms,
        JSON.stringify(params.result_snapshot),
      ],
    );
  } finally {
    await client.end();
  }
}

/**
 * POST /api/metrics/governance/sandbox
 *
 * Run current vs proposed formula comparison.
 * Both queries execute in read-only transactions.
 *
 * Body: {
 *   item_id: string,
 *   level: string,
 *   current_sql: string,
 *   proposed_sql: string,
 *   as_of_date?: string,
 * }
 */
/** Extract table keys from SQL for the local sql.js sandbox. */
function extractTableKeysFromSql(sql: string): string[] {
  const keys = new Set<string>();
  const re = /\b(L[12])\.(\w+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    keys.add(`${m[1].toUpperCase()}.${m[2]}`);
  }
  return Array.from(keys);
}

/** Convert sql.js RunMetricOutput to sandbox-compatible row format. */
function sqlJsResultToRows(result: Awaited<ReturnType<typeof runSqlMetric>>): { rows: Record<string, unknown>[]; rowCount: number; error: string | null } {
  if (!result.ok) {
    return { rows: [], rowCount: 0, error: result.error };
  }
  if (result.result.type === 'scalar') {
    return {
      rows: [{ dimension_key: 'scalar', metric_value: result.result.value }],
      rowCount: 1,
      error: null,
    };
  }
  return {
    rows: result.result.rows.map((r) => ({ dimension_key: r.dimension_value, metric_value: r.metric_value })),
    rowCount: result.result.rows.length,
    error: null,
  };
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = await req.json();
    const { item_id, level, current_sql, proposed_sql, as_of_date } = body as {
      item_id?: string;
      level?: string;
      current_sql?: string;
      proposed_sql?: string;
      as_of_date?: string;
    };

    if (!item_id || !level || !current_sql || !proposed_sql) {
      return jsonError('item_id, level, current_sql, and proposed_sql are required', {
        status: 400,
        code: 'VALIDATION_ERROR',
      });
    }

    // Validate both SQL statements
    for (const [label, sql] of [['current', current_sql], ['proposed', proposed_sql]] as const) {
      const validation = validateFormulaSql(sql);
      if (!validation.valid) {
        return jsonError(`Invalid ${label} SQL: ${validation.error}`, {
          status: 400,
          code: 'VALIDATION_ERROR',
        });
      }
    }

    const useLocalFallback = !process.env.DATABASE_URL;
    let currentData: { rows: Record<string, unknown>[]; row_count: number; duration_ms: number; error: string | null };
    let proposedData: { rows: Record<string, unknown>[]; row_count: number; duration_ms: number; error: string | null };
    let resolvedDate = as_of_date ?? '';

    if (useLocalFallback) {
      // Local fallback: use sql.js with sample data
      const allTableKeys = [...new Set([...extractTableKeysFromSql(current_sql), ...extractTableKeysFromSql(proposed_sql)])];

      if (!resolvedDate) {
        const dates = getDistinctAsOfDates(allTableKeys);
        resolvedDate = dates[0] ?? '';
        if (!resolvedDate) {
          return jsonError('No sample data available for sandbox comparison', { status: 404, code: 'NO_DATA' });
        }
      }

      const currentTableKeys = extractTableKeysFromSql(current_sql);
      const proposedTableKeys = extractTableKeysFromSql(proposed_sql);

      const start = performance.now();
      const [curResult, propResult] = await Promise.all([
        runSqlMetric({ rawSql: current_sql, tableKeys: currentTableKeys, asOfDate: resolvedDate }),
        runSqlMetric({ rawSql: proposed_sql, tableKeys: proposedTableKeys, asOfDate: resolvedDate }),
      ]);
      const duration = Math.round(performance.now() - start);

      const curRows = sqlJsResultToRows(curResult);
      const propRows = sqlJsResultToRows(propResult);

      currentData = { rows: curRows.rows, row_count: curRows.rowCount, duration_ms: duration, error: curRows.error };
      proposedData = { rows: propRows.rows, row_count: propRows.rowCount, duration_ms: duration, error: propRows.error };
    } else {
      // Primary path: PostgreSQL sandbox
      if (!resolvedDate) {
        resolvedDate = await getLatestAsOfDate() ?? '';
        if (!resolvedDate) {
          return jsonError('No data available', { status: 404, code: 'NO_DATA' });
        }
      }

      const params = { as_of_date: resolvedDate };
      const opts = { maxRows: 1000, timeoutMs: 30_000 };

      const [currentResult, proposedResult] = await Promise.allSettled([
        executeSandboxQuery(current_sql, params, opts),
        executeSandboxQuery(proposed_sql, params, opts),
      ]);

      currentData = currentResult.status === 'fulfilled'
        ? { rows: currentResult.value.rows, row_count: currentResult.value.rowCount, duration_ms: currentResult.value.durationMs, error: null }
        : { rows: [], row_count: 0, duration_ms: 0, error: (currentResult.reason as Error)?.message ?? 'Failed' };

      proposedData = proposedResult.status === 'fulfilled'
        ? { rows: proposedResult.value.rows, row_count: proposedResult.value.rowCount, duration_ms: proposedResult.value.durationMs, error: null }
        : { rows: [], row_count: 0, duration_ms: 0, error: (proposedResult.reason as Error)?.message ?? 'Failed' };
    }

    // Compute comparison — use NaN-safe numeric conversion
    const toNum = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const currentMap = new Map(
      currentData.rows.map(r => [String(r.dimension_key), toNum(r.metric_value)]),
    );
    const proposedMap = new Map(
      proposedData.rows.map(r => [String(r.dimension_key), toNum(r.metric_value)]),
    );

    const allKeys = new Set([...currentMap.keys(), ...proposedMap.keys()]);
    const changes: Array<{ key: string; current: number | null; proposed: number | null; delta: number | null }> = [];

    for (const key of allKeys) {
      const cur = currentMap.has(key) ? currentMap.get(key)! : null;
      const prop = proposedMap.has(key) ? proposedMap.get(key)! : null;
      const delta = cur !== null && prop !== null ? prop - cur : null;
      if (cur !== prop) {
        changes.push({ key, current: cur, proposed: prop, delta });
      }
    }

    // Parse user for sandbox run logging
    const user = parseGovernanceUser(req);

    // Persist sandbox run for audit (fire-and-forget)
    const proposedTotal = proposedData.rows.reduce(
      (sum, r) => sum + (Number(r.metric_value) || 0),
      0,
    );
    const currentTotal = currentData.rows.reduce(
      (sum, r) => sum + (Number(r.metric_value) || 0),
      0,
    );
    const reconciliationPass = changes.length === 0 || (
      currentData.row_count > 0 &&
      changes.length / Math.max(allKeys.size, 1) < 0.1
    );
    const durationMs = (currentData.duration_ms ?? 0) + (proposedData.duration_ms ?? 0) || null;

    persistSandboxRun({
      item_id: item_id,
      run_by_id: user?.user_id ?? null,
      run_by_name: user?.display_name ?? null,
      level,
      as_of_date: resolvedDate,
      current_sql: current_sql,
      proposed_sql: proposed_sql,
      current_row_count: currentData.row_count,
      proposed_row_count: proposedData.row_count,
      current_total: currentTotal,
      proposed_total: proposedTotal,
      reconciliation_pass: reconciliationPass,
      duration_ms: durationMs,
      result_snapshot: {
        total_keys: allKeys.size,
        matching: allKeys.size - changes.length,
        changed: changes.length,
        changes: changes.slice(0, 50),
      },
    }).catch((err) => console.error('[governance] Failed to persist sandbox run:', err));

    return jsonSuccess({
      item_id,
      level,
      as_of_date: resolvedDate,
      current: currentData,
      proposed: proposedData,
      comparison: {
        total_keys: allKeys.size,
        matching: allKeys.size - changes.length,
        changed: changes.length,
        changes: changes.slice(0, 100), // Cap at 100 for response size
      },
      run_by: user?.display_name ?? null,
      mode: useLocalFallback ? 'local' : 'database',
    });
  });
}
