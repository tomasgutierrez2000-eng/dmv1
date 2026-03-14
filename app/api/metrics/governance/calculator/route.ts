import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { executeSandboxQuery, getLatestAsOfDate } from '@/lib/governance/sandbox-runner';
import { validateFormulaSql } from '@/lib/governance/validation';

/**
 * POST /api/metrics/governance/calculator
 *
 * Execute a metric formula SQL against live PostgreSQL.
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
    if (!process.env.DATABASE_URL) {
      return jsonError('Database not connected', {
        status: 503,
        code: 'DB_UNAVAILABLE',
        details: 'Set DATABASE_URL to enable live calculations',
      });
    }

    const body = await req.json();
    const { sql, as_of_date, level, max_rows } = body as {
      sql?: string;
      as_of_date?: string;
      level?: string;
      max_rows?: number;
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

    // Execute
    const maxRows = Math.min(max_rows ?? 1000, 5000);
    const result = await executeSandboxQuery(
      sql,
      { as_of_date: resolvedDate },
      { maxRows, timeoutMs: 30_000 },
    );

    return jsonSuccess({
      rows: result.rows,
      row_count: result.rowCount,
      duration_ms: result.durationMs,
      as_of_date: resolvedDate,
      level: level ?? null,
      truncated: result.rowCount > maxRows,
      warnings: validation.warnings,
    });
  });
}
