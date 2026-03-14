import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { executeSandboxQuery, getLatestAsOfDate } from '@/lib/governance/sandbox-runner';
import { validateFormulaSql } from '@/lib/governance/validation';
import {
  DRILL_HIERARCHY, CHILD_LEVEL, POSITION_QUERY,
  buildDrillDownSqlSafe, buildLabelSql,
  type DrillLevel,
} from '@/lib/governance/drill-down';

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

    // Execute
    const maxRows = Math.min(max_rows ?? (drill_down ? 200 : 1000), 5000);
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
    });
  });
}
