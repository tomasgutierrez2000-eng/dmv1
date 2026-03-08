/**
 * GSIB Calculation Engine — Audit Logger
 *
 * Logs one row per metric+level execution attempt to l3.calc_audit_log.
 * Fire-and-forget: audit failures do not block calculations.
 */

import type { SqlExecutor } from './executor';
import { sqlHash } from './executor';
import type { CalcRunContext, AggregationLevel, MetricExecStatus } from '../types';

export interface AuditEntry {
  metricId: string;
  metricVersion: string;
  level: AggregationLevel;
  status: MetricExecStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  rowsReturned?: number;
  rowsWritten?: number;
  sqlExecuted?: string;
  sourceTables?: string[];
  sourceRowCounts?: Record<string, number>;
  bindParams?: Record<string, unknown>;
  errorMessage?: string;
  errorCode?: string;
  errorDetail?: string;
  dependencyChain?: string[];
}

/**
 * Write an audit log entry. Errors are caught and logged to stderr.
 */
export async function logAudit(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  entry: AuditEntry
): Promise<void> {
  try {
    await executor.execute(
      `INSERT INTO l3.calc_audit_log (
        run_id, metric_id, metric_version, aggregation_level, status,
        started_at, completed_at, duration_ms, rows_returned, rows_written,
        sql_executed, sql_hash, source_tables, source_row_counts, bind_params,
        error_message, error_code, error_detail, dependency_chain
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19
      )`,
      [
        ctx.runId,
        entry.metricId,
        entry.metricVersion,
        entry.level,
        entry.status,
        entry.startedAt,
        entry.completedAt ?? null,
        entry.durationMs ?? null,
        entry.rowsReturned ?? null,
        entry.rowsWritten ?? null,
        entry.sqlExecuted ?? null,
        entry.sqlExecuted ? sqlHash(entry.sqlExecuted) : null,
        entry.sourceTables ?? null,
        entry.sourceRowCounts ? JSON.stringify(entry.sourceRowCounts) : null,
        entry.bindParams ? JSON.stringify(entry.bindParams) : null,
        entry.errorMessage ?? null,
        entry.errorCode ?? null,
        entry.errorDetail ?? null,
        entry.dependencyChain ?? null,
      ]
    );
  } catch (err) {
    // Fire-and-forget: audit logging failures must not block calculations
    console.error(
      `  [audit] Failed to log audit entry for ${entry.metricId}/${entry.level}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
