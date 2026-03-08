/**
 * GSIB Calculation Engine — Result Writer
 *
 * Writes metric calculation results to l3.metric_result.
 * Idempotent: DELETE existing rows for (run_id, metric_id, level) then INSERT.
 */

import type { SqlExecutor } from './executor';
import { sqlHash } from './executor';
import type { CalcRunContext, AggregationLevel, MetricDefinition } from '../types';

export interface WriteResultInput {
  metric: MetricDefinition;
  level: AggregationLevel;
  rows: Record<string, unknown>[];
  sqlExecuted: string;
  sourceRowCount: number;
}

export interface WriteResultOutput {
  rowsWritten: number;
  durationMs: number;
}

/**
 * Write metric results to l3.metric_result.
 * Each row must have `dimension_key` and `metric_value` columns.
 */
export async function writeResults(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  input: WriteResultInput
): Promise<WriteResultOutput> {
  const start = performance.now();
  const { metric, level, rows, sqlExecuted, sourceRowCount } = input;
  const hash = sqlHash(sqlExecuted);

  // Wrap DELETE+INSERT in a transaction for atomicity
  let totalWritten = 0;

  await executor.transaction(async (client) => {
    // 1. DELETE existing results for idempotency
    await client.query(
      `DELETE FROM l3.metric_result
       WHERE run_id = $1 AND metric_id = $2 AND aggregation_level = $3`,
      [ctx.runId, metric.metric_id, level]
    );

    if (rows.length === 0) return;

    // 2. Batch INSERT using multi-row VALUES
    const BATCH_SIZE = 500;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const values: unknown[] = [];
      const placeholders: string[] = [];
      let paramIdx = 0;

      for (const row of batch) {
        const dimensionKey = row.dimension_key != null ? String(row.dimension_key) : null;
        const dimensionLabel = row.dimension_label != null ? String(row.dimension_label) : null;
        const metricValue = row.metric_value != null ? Number(row.metric_value) : null;

        const offsets = Array.from({ length: 14 }, (_, j) => `$${paramIdx + j + 1}`);
        placeholders.push(`(${offsets.join(', ')})`);

        values.push(
          ctx.runId,                    // $1
          ctx.runVersionId,             // $2
          ctx.asOfDate,                 // $3
          metric.metric_id,             // $4
          metric.version,               // $5
          level,                        // $6
          dimensionKey,                 // $7
          dimensionLabel,               // $8
          metricValue,                  // $9
          metric.unit_type,             // $10
          metric.display_format,        // $11
          ctx.baseCurrency,             // $12
          hash,                         // $13
          sourceRowCount,               // $14
        );
        paramIdx += 14;
      }

      const sql = `
        INSERT INTO l3.metric_result (
          run_id, run_version_id, as_of_date, metric_id, metric_version,
          aggregation_level, dimension_key, dimension_label, metric_value,
          unit_type, display_format, base_currency_code, formula_hash, source_row_count
        ) VALUES ${placeholders.join(', ')}`;

      const result = await client.query(sql, values);
      totalWritten += result.rowCount ?? 0;
    }
  });

  return {
    rowsWritten: totalWritten,
    durationMs: Math.round(performance.now() - start),
  };
}

/**
 * Initialize calc_run row at the start of a run.
 */
export async function initCalcRun(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  metricsRequested: number,
  cliArgs: string
): Promise<void> {
  await executor.execute(
    `INSERT INTO l3.calc_run (
      run_id, run_version_id, as_of_date, prior_as_of_date, base_currency_code,
      mode, status, metrics_requested, started_at, triggered_by, cli_args,
      engine_version, git_sha, config_snapshot
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      ctx.runId,
      ctx.runVersionId,
      ctx.asOfDate,
      ctx.priorAsOfDate,
      ctx.baseCurrency,
      'FULL',
      'RUNNING',
      metricsRequested,
      ctx.startedAt,
      ctx.config.dryRun ? 'dry-run' : process.env.USER ?? 'system',
      cliArgs,
      ctx.engineVersion,
      ctx.gitSha,
      JSON.stringify(ctx.config),
    ]
  );
}

/**
 * Finalize calc_run row at the end of a run.
 */
export async function finalizeCalcRun(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  summary: {
    status: string;
    metricsSucceeded: number;
    metricsFailed: number;
    metricsSkipped: number;
    totalRowsWritten: number;
    errorSummary?: string;
  }
): Promise<void> {
  const durationMs = Math.round(Date.now() - ctx.startedAt.getTime());

  await executor.execute(
    `UPDATE l3.calc_run SET
      status = $2,
      metrics_succeeded = $3,
      metrics_failed = $4,
      metrics_skipped = $5,
      total_rows_written = $6,
      completed_at = CURRENT_TIMESTAMP,
      duration_ms = $7,
      error_summary = $8
    WHERE run_id = $1`,
    [
      ctx.runId,
      summary.status,
      summary.metricsSucceeded,
      summary.metricsFailed,
      summary.metricsSkipped,
      summary.totalRowsWritten,
      durationMs,
      summary.errorSummary ?? null,
    ]
  );
}
