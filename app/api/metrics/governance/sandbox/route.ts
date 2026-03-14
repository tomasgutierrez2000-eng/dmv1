import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { executeSandboxQuery, getLatestAsOfDate } from '@/lib/governance/sandbox-runner';
import { validateFormulaSql } from '@/lib/governance/validation';
import { parseGovernanceUser } from '@/lib/governance/identity';

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
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    if (!process.env.DATABASE_URL) {
      return jsonError('Database not connected', { status: 503, code: 'DB_UNAVAILABLE' });
    }

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

    // Resolve date
    let resolvedDate = as_of_date;
    if (!resolvedDate) {
      resolvedDate = await getLatestAsOfDate() ?? undefined;
      if (!resolvedDate) {
        return jsonError('No data available', { status: 404, code: 'NO_DATA' });
      }
    }

    const params = { as_of_date: resolvedDate };
    const opts = { maxRows: 1000, timeoutMs: 30_000 };

    // Run both queries in parallel
    const [currentResult, proposedResult] = await Promise.allSettled([
      executeSandboxQuery(current_sql, params, opts),
      executeSandboxQuery(proposed_sql, params, opts),
    ]);

    const currentData = currentResult.status === 'fulfilled'
      ? { rows: currentResult.value.rows, row_count: currentResult.value.rowCount, duration_ms: currentResult.value.durationMs, error: null }
      : { rows: [], row_count: 0, duration_ms: 0, error: (currentResult.reason as Error)?.message ?? 'Failed' };

    const proposedData = proposedResult.status === 'fulfilled'
      ? { rows: proposedResult.value.rows, row_count: proposedResult.value.rowCount, duration_ms: proposedResult.value.durationMs, error: null }
      : { rows: [], row_count: 0, duration_ms: 0, error: (proposedResult.reason as Error)?.message ?? 'Failed' };

    // Compute comparison
    const currentMap = new Map(
      currentData.rows.map(r => [String(r.dimension_key), Number(r.metric_value)]),
    );
    const proposedMap = new Map(
      proposedData.rows.map(r => [String(r.dimension_key), Number(r.metric_value)]),
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
    });
  });
}
