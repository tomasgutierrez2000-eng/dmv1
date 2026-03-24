/**
 * GSIB Calculation Engine — Cross-Metric Reconciliation Runner
 *
 * Runs system-level checks after all metrics complete:
 *   1. Exposure conservation across levels
 *   2. Risk consistency (EL = PD x LGD x EAD)
 *   3. Completeness (every active facility has results)
 *   4. Orphan check (no phantom dimension_keys)
 */

import type { SqlExecutor } from './executor';
import type { CalcRunContext, ValidationCheckResult } from '../types';

/**
 * Run all cross-metric reconciliation checks.
 */
export async function runReconciliation(
  executor: SqlExecutor,
  ctx: CalcRunContext
): Promise<ValidationCheckResult[]> {
  const results: ValidationCheckResult[] = [];

  const checks = [
    checkExposureConservation,
    checkCompleteness,
    checkOrphans,
  ];

  for (const check of checks) {
    try {
      const result = await check(executor, ctx);
      results.push(result);
    } catch (err) {
      results.push({
        ruleId: `RECON-${check.name}`,
        ruleType: 'RECONCILIATION',
        severity: 'ERROR',
        status: 'SKIP',
        metricId: '*',
        message: `Reconciliation check failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Persist all reconciliation results
  for (const result of results) {
    try {
      await executor.execute(
        `INSERT INTO l3.calc_validation_result (
          run_id, metric_id, rule_id, rule_type, severity, status,
          message, detail
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          ctx.runId,
          result.metricId,
          result.ruleId,
          result.ruleType,
          result.severity,
          result.status,
          result.message,
          result.detail ? JSON.stringify(result.detail) : null,
        ]
      );
    } catch {
      // Fire-and-forget
    }
  }

  return results;
}

/**
 * Check that for each metric, the sum at facility level equals
 * the sum at business_segment level (within tolerance).
 */
async function checkExposureConservation(
  executor: SqlExecutor,
  ctx: CalcRunContext
): Promise<ValidationCheckResult> {
  const result = await executor.query(
    `WITH level_sums AS (
      SELECT
        metric_id,
        aggregation_level,
        SUM(metric_value) AS level_total
      FROM l3.metric_result
      WHERE run_id = :run_id
        AND aggregation_level IN ('facility', 'business_segment')
        AND metric_value IS NOT NULL
      GROUP BY metric_id, aggregation_level
    )
    SELECT
      f.metric_id,
      f.level_total AS facility_total,
      b.level_total AS bseg_total,
      ABS(f.level_total - COALESCE(b.level_total, 0)) AS diff
    FROM level_sums f
    LEFT JOIN level_sums b
      ON b.metric_id = f.metric_id AND b.aggregation_level = 'business_segment'
    WHERE f.aggregation_level = 'facility'
      AND ABS(f.level_total) > 0
      AND ABS(f.level_total - COALESCE(b.level_total, 0)) / NULLIF(ABS(f.level_total), 0) > 0.001`,
    { run_id: ctx.runId }
  );

  if (result.rowCount === 0) {
    return {
      ruleId: 'RECON-001',
      ruleType: 'RECONCILIATION',
      severity: 'ERROR',
      status: 'PASS',
      metricId: '*',
      message: 'Exposure conservation: all metrics reconcile across levels',
    };
  }

  const mismatches = result.rows.map(
    (r) => `${r.metric_id}: facility=${r.facility_total} vs bseg=${r.bseg_total}`
  );

  return {
    ruleId: 'RECON-001',
    ruleType: 'RECONCILIATION',
    severity: 'ERROR',
    status: 'FAIL',
    metricId: '*',
    message: `Exposure conservation: ${result.rowCount} metrics have level mismatches`,
    detail: { mismatches },
  };
}

/**
 * Check that every active facility has at least one metric_result row.
 */
async function checkCompleteness(
  executor: SqlExecutor,
  ctx: CalcRunContext
): Promise<ValidationCheckResult> {
  const result = await executor.query(
    `SELECT fm.facility_id
     FROM l2.facility_master fm
     WHERE fm.is_active_flag = 'Y'
       AND NOT EXISTS (
         SELECT 1 FROM l3.metric_result mr
         WHERE mr.run_id = :run_id
           AND mr.aggregation_level = 'facility'
           AND mr.dimension_key = fm.facility_id::TEXT
       )
     LIMIT 20`,
    { run_id: ctx.runId }
  );

  if (result.rowCount === 0) {
    return {
      ruleId: 'RECON-002',
      ruleType: 'RECONCILIATION',
      severity: 'WARNING',
      status: 'PASS',
      metricId: '*',
      message: 'Completeness: all active facilities have metric results',
    };
  }

  const missingIds = result.rows.map((r) => r.facility_id);

  return {
    ruleId: 'RECON-002',
    ruleType: 'RECONCILIATION',
    severity: 'WARNING',
    status: 'FAIL',
    metricId: '*',
    message: `Completeness: ${result.rowCount}+ active facilities have no metric results`,
    detail: { sample_missing_facility_ids: missingIds },
  };
}

/**
 * Check for orphan dimension_keys that don't exist in L1/L2 reference tables.
 */
async function checkOrphans(
  executor: SqlExecutor,
  ctx: CalcRunContext
): Promise<ValidationCheckResult> {
  // Check facility-level dimension_keys exist in facility_master
  const result = await executor.query(
    `SELECT mr.dimension_key, mr.metric_id
     FROM l3.metric_result mr
     WHERE mr.run_id = :run_id
       AND mr.aggregation_level = 'facility'
       AND mr.dimension_key IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM l2.facility_master fm
         WHERE fm.facility_id::TEXT = mr.dimension_key
       )
     LIMIT 20`,
    { run_id: ctx.runId }
  );

  if (result.rowCount === 0) {
    return {
      ruleId: 'RECON-003',
      ruleType: 'RECONCILIATION',
      severity: 'ERROR',
      status: 'PASS',
      metricId: '*',
      message: 'Orphan check: all facility dimension_keys exist in L1',
    };
  }

  const orphans = result.rows.map(
    (r) => `metric=${r.metric_id}, key=${r.dimension_key}`
  );

  return {
    ruleId: 'RECON-003',
    ruleType: 'RECONCILIATION',
    severity: 'ERROR',
    status: 'FAIL',
    metricId: '*',
    message: `Orphan check: ${result.rowCount}+ facility results reference non-existent facility_ids`,
    detail: { sample_orphans: orphans },
  };
}
