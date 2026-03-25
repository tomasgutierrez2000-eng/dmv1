import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { executeSandboxQuery, getLatestAsOfDate } from '@/lib/governance/sandbox-runner';
import { validateFormulaSql } from '@/lib/governance/validation';
import { runSqlMetric, getDistinctAsOfDates } from '@/lib/metrics-calculation/sql-runner';
import { extractTableRefsFromSql } from '@/lib/metrics-calculation/table-resolver';
import {
  DRILL_HIERARCHY, CHILD_LEVEL, POSITION_QUERY,
  buildDrillDownSqlSafe, buildLabelSql,
  type DrillLevel,
} from '@/lib/governance/drill-down';

/**
 * Fallback: execute SQL via in-memory sql.js with sample data.
 */
async function executeFallbackQuery(
  sql: string,
  asOfDate: string | null,
): Promise<{ rows: Record<string, unknown>[]; rowCount: number; durationMs: number; asOfDateUsed: string | null; warnings?: string[] }> {
  const tableKeys = extractTableRefsFromSql(sql);
  const start = performance.now();
  const result = await runSqlMetric({ rawSql: sql, tableKeys, asOfDate });
  const durationMs = Math.round(performance.now() - start);

  if (!result.ok) {
    throw new Error(result.error ?? 'sql.js execution failed');
  }

  // Convert RunMetricOutput to the same shape as SandboxQueryResult
  let rows: Record<string, unknown>[] = [];
  if (result.result?.type === 'grouped') {
    rows = result.result.rows.map(r => ({
      dimension_key: r.dimension_value,
      metric_value: r.metric_value,
    }));
  } else if (result.result?.type === 'scalar') {
    rows = [{ dimension_key: 'total', metric_value: result.result.value }];
  }

  return {
    rows,
    rowCount: rows.length,
    durationMs,
    asOfDateUsed: result.asOfDateUsed ?? asOfDate,
    warnings: result.warnings,
  };
}

/**
 * POST /api/metrics/governance/calculator
 *
 * Execute a metric formula SQL against live PostgreSQL.
 * Falls back to in-memory sql.js with sample data when DATABASE_URL is not set.
 * Read-only transaction with 30s timeout.
 *
 * Body: {
 *   sql: string,           — The formula SQL to execute
 *   as_of_date?: string,   — Date for bind param (default: latest available)
 *   level?: string,        — Level identifier (for logging)
 *   max_rows?: number,     — Max rows to return (default: 1000)
 * }
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const body = await req.json();
    const { sql, as_of_date, level, max_rows, drill_down } = body as {
      sql?: string;
      as_of_date?: string;
      level?: string;
      max_rows?: number;
      drill_down?: {
        parent_level: string;
        parent_dim_key: string;
      };
    };

    if (!sql || typeof sql !== 'string') {
      return jsonError('sql is required', { status: 400, code: 'VALIDATION_ERROR' });
    }

    // Validate SQL safety
    const validation = validateFormulaSql(sql);
    if (!validation.valid) {
      return jsonError(validation.error ?? 'Invalid SQL', {
        status: 400,
        code: 'VALIDATION_ERROR',
        details: validation.warnings.join('; '),
      });
    }

    const hasDb = !!process.env.DATABASE_URL;

    // ── Fallback path: sql.js in-memory engine ──
    if (!hasDb) {
      // Resolve date from sample data
      const tableKeys = extractTableRefsFromSql(sql);
      let resolvedDate = as_of_date;
      if (!resolvedDate) {
        const dates = getDistinctAsOfDates(tableKeys);
        resolvedDate = dates[0] ?? null;
      }

      // Drill-down not supported in fallback mode
      if (drill_down) {
        return jsonError('Drill-down requires a live database connection', {
          status: 503,
          code: 'DB_UNAVAILABLE',
          details: 'Set DATABASE_URL for drill-down support',
        });
      }

      try {
        const result = await executeFallbackQuery(sql, resolvedDate);
        const allWarnings = [...(validation.warnings || []), ...(result.warnings || []), 'Running against in-memory sample data (no DATABASE_URL)'];
        return jsonSuccess({
          rows: result.rows,
          row_count: result.rowCount,
          duration_ms: result.durationMs,
          as_of_date: result.asOfDateUsed,
          level: level ?? null,
          truncated: false,
          warnings: allWarnings,
          source: 'sample-data',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isWasmError = /sql\.js|wasm|initialize/i.test(msg);
        return jsonError(
          isWasmError
            ? 'Sample data engine unavailable — sql.js WASM could not initialize'
            : `Sample data calculation failed: ${msg}`,
          {
            status: 503,
            code: isWasmError ? 'WASM_UNAVAILABLE' : 'FALLBACK_FAILED',
            details: isWasmError
              ? 'The sql.js WASM binary may not be available in this deployment environment'
              : 'Formula may use tables/columns not present in sample data',
          },
        );
      }
    }

    // ── Primary path: live PostgreSQL ──

    // Resolve as_of_date
    let resolvedDate = as_of_date;
    if (!resolvedDate) {
      resolvedDate = await getLatestAsOfDate() ?? undefined;
      if (!resolvedDate) {
        return jsonError('No data available — could not determine as_of_date', {
          status: 404,
          code: 'NO_DATA',
        });
      }
    }

    // Determine effective SQL and params
    let effectiveSql = sql;
    const params: Record<string, unknown> = { as_of_date: resolvedDate };
    let childLevel: string | null = null;

    if (drill_down) {
      const { parent_level, parent_dim_key } = drill_down;

      // Validate parent_level
      if (!DRILL_HIERARCHY.includes(parent_level as DrillLevel)) {
        return jsonError(`Invalid parent_level: ${parent_level}`, {
          status: 400,
          code: 'VALIDATION_ERROR',
        });
      }
      if (parent_level === 'position') {
        return jsonError('Cannot drill down from position level', {
          status: 400,
          code: 'VALIDATION_ERROR',
        });
      }

      childLevel = CHILD_LEVEL[parent_level] ?? null;
      params.parent_key = parent_dim_key;

      if (childLevel === 'position') {
        // Leaf level: use direct position query
        effectiveSql = POSITION_QUERY;
      } else {
        // Wrap the child formula SQL with a parent filter
        effectiveSql = buildDrillDownSqlSafe(sql, parent_level as DrillLevel);
      }

      // Re-validate the wrapped SQL
      const wrappedValidation = validateFormulaSql(effectiveSql);
      if (!wrappedValidation.valid) {
        return jsonError(wrappedValidation.error ?? 'Invalid wrapped SQL', {
          status: 400,
          code: 'VALIDATION_ERROR',
          details: wrappedValidation.warnings.join('; '),
        });
      }
    }

    // Execute against PostgreSQL, falling back to sql.js on connection errors
    const maxRows = Math.min(max_rows ?? (drill_down ? 200 : 1000), 5000);
    try {
      const result = await executeSandboxQuery(
        effectiveSql,
        params,
        { maxRows, timeoutMs: 30_000 },
      );

      // Resolve labels for child-level dimension keys
      let rows = result.rows;
      const targetLevel = childLevel ?? level ?? null;
      if (targetLevel && rows.length > 0) {
        const labelSql = buildLabelSql(targetLevel as DrillLevel);
        if (labelSql) {
          try {
            const labelResult = await executeSandboxQuery(
              labelSql,
              { as_of_date: resolvedDate },
              { maxRows: 5000, timeoutMs: 5_000 },
            );
            const labelMap = new Map<string, string>();
            for (const lr of labelResult.rows) {
              labelMap.set(String(lr.dim_key ?? ''), String(lr.dim_label ?? ''));
            }
            rows = rows.map(r => ({
              ...r,
              dimension_label: labelMap.get(String(r.dimension_key ?? '')) ?? undefined,
            }));
          } catch {
            // Label resolution is best-effort; don't fail the request
          }
        }
      }

      return jsonSuccess({
        rows,
        row_count: result.rowCount,
        duration_ms: result.durationMs,
        as_of_date: resolvedDate,
        level: targetLevel,
        truncated: result.rowCount > maxRows,
        warnings: validation.warnings,
        source: 'postgresql',
      });
    } catch (pgErr) {
      // Runtime PG failure — fall back to sql.js if not a drill-down
      const pgMsg = pgErr instanceof Error ? pgErr.message : String(pgErr);
      const isConnectionError = /ECONNREFUSED|ECONNRESET|ETIMEDOUT|connection|timeout/i.test(pgMsg);

      if (!isConnectionError || drill_down) {
        // SQL errors (syntax, missing table) should not fall back — rethrow
        throw pgErr;
      }

      try {
        const fallback = await executeFallbackQuery(sql, resolvedDate ?? null);
        const allWarnings = [
          ...(validation.warnings || []),
          ...(fallback.warnings || []),
          `PostgreSQL unavailable (${pgMsg}) — fell back to in-memory sample data`,
        ];
        return jsonSuccess({
          rows: fallback.rows,
          row_count: fallback.rowCount,
          duration_ms: fallback.durationMs,
          as_of_date: fallback.asOfDateUsed,
          level: level ?? null,
          truncated: false,
          warnings: allWarnings,
          source: 'sample-data',
        });
      } catch (fallbackErr) {
        const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        return jsonError(`Database unavailable and sample data fallback failed: ${fbMsg}`, {
          status: 503,
          code: 'DB_AND_FALLBACK_UNAVAILABLE',
          details: `PG error: ${pgMsg}. Fallback error: ${fbMsg}`,
        });
      }
    }
  });
}
