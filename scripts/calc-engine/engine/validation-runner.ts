/**
 * GSIB Calculation Engine — Validation Runner
 *
 * Runs per-metric validation checks after calculation and writes
 * results to l3.calc_validation_result.
 */

import type { SqlExecutor } from './executor';
import type {
  CalcRunContext,
  ValidationCheckResult,
  ValidationStatus,
  MetricDefinition,
  ValidationRule,
  AggregationLevel,
} from '../types';

/**
 * Run all validation rules for a metric and persist results.
 */
export async function runValidations(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  metric: MetricDefinition
): Promise<ValidationCheckResult[]> {
  const results: ValidationCheckResult[] = [];

  for (const rule of metric.validations) {
    try {
      const result = await runSingleValidation(executor, ctx, metric, rule);
      results.push(result);
      await persistValidationResult(executor, ctx, result);
    } catch (err) {
      const errResult: ValidationCheckResult = {
        ruleId: rule.rule_id,
        ruleType: rule.type,
        severity: rule.severity,
        status: 'SKIP',
        metricId: metric.metric_id,
        message: `Validation error: ${err instanceof Error ? err.message : String(err)}`,
      };
      results.push(errResult);
      await persistValidationResult(executor, ctx, errResult);
    }
  }

  return results;
}

async function runSingleValidation(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  metric: MetricDefinition,
  rule: ValidationRule
): Promise<ValidationCheckResult> {
  const base: Omit<ValidationCheckResult, 'status' | 'message'> = {
    ruleId: rule.rule_id,
    ruleType: rule.type,
    severity: rule.severity,
    metricId: metric.metric_id,
  };

  switch (rule.type) {
    case 'NOT_NULL':
      return checkNotNull(executor, ctx, metric, base);

    case 'NON_NEGATIVE':
      return checkNonNegative(executor, ctx, metric, base);

    case 'THRESHOLD':
      return checkThreshold(executor, ctx, metric, rule, base);

    case 'RECONCILIATION':
      return checkReconciliation(executor, ctx, metric, rule, base);

    case 'PERIOD_OVER_PERIOD':
      return checkPeriodOverPeriod(executor, ctx, metric, rule, base);

    case 'CUSTOM_SQL':
      return checkCustomSql(executor, ctx, metric, rule, base);

    default:
      return { ...base, status: 'SKIP', message: `Unknown validation type: ${rule.type}` };
  }
}

async function checkNotNull(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  metric: MetricDefinition,
  base: Omit<ValidationCheckResult, 'status' | 'message'>
): Promise<ValidationCheckResult> {
  const result = await executor.query(
    `SELECT COUNT(*) AS cnt FROM l3.metric_result
     WHERE run_id = :run_id AND metric_id = :metric_id AND metric_value IS NULL`,
    { run_id: ctx.runId, metric_id: metric.metric_id }
  );
  const nullCount = Number(result.rows[0]?.cnt ?? 0);

  return nullCount === 0
    ? { ...base, status: 'PASS', message: 'No null values found', actualValue: 0 }
    : { ...base, status: 'FAIL', message: `${nullCount} null values found`, actualValue: nullCount };
}

async function checkNonNegative(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  metric: MetricDefinition,
  base: Omit<ValidationCheckResult, 'status' | 'message'>
): Promise<ValidationCheckResult> {
  const result = await executor.query(
    `SELECT COUNT(*) AS cnt FROM l3.metric_result
     WHERE run_id = :run_id AND metric_id = :metric_id AND metric_value < 0`,
    { run_id: ctx.runId, metric_id: metric.metric_id }
  );
  const negCount = Number(result.rows[0]?.cnt ?? 0);

  return negCount === 0
    ? { ...base, status: 'PASS', message: 'No negative values found', actualValue: 0 }
    : { ...base, status: 'FAIL', message: `${negCount} negative values found`, actualValue: negCount };
}

async function checkThreshold(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  metric: MetricDefinition,
  rule: ValidationRule,
  base: Omit<ValidationCheckResult, 'status' | 'message'>
): Promise<ValidationCheckResult> {
  const maxPct = Number(rule.params?.max_pct ?? 100);
  const compareLevel = String(rule.params?.compare_level ?? 'business_segment');

  // Get total at compare level
  const totalResult = await executor.query(
    `SELECT SUM(metric_value) AS total FROM l3.metric_result
     WHERE run_id = :run_id AND metric_id = :metric_id AND aggregation_level = :level`,
    { run_id: ctx.runId, metric_id: metric.metric_id, level: compareLevel }
  );
  const total = Number(totalResult.rows[0]?.total ?? 0);
  if (total === 0) {
    return { ...base, status: 'SKIP', message: 'Total is 0, cannot check threshold' };
  }

  // Find max individual value at the same level
  const maxResult = await executor.query(
    `SELECT MAX(metric_value) AS max_val, dimension_key FROM l3.metric_result
     WHERE run_id = :run_id AND metric_id = :metric_id AND aggregation_level = :level
     GROUP BY dimension_key ORDER BY MAX(metric_value) DESC LIMIT 1`,
    { run_id: ctx.runId, metric_id: metric.metric_id, level: compareLevel }
  );
  const maxVal = Number(maxResult.rows[0]?.max_val ?? 0);
  const pct = (maxVal / total) * 100;

  return pct <= maxPct
    ? { ...base, status: 'PASS', message: `Max concentration: ${pct.toFixed(2)}% (threshold: ${maxPct}%)`, actualValue: pct, expectedValue: maxPct }
    : { ...base, status: 'FAIL', message: `Concentration breach: ${pct.toFixed(2)}% exceeds ${maxPct}%`, actualValue: pct, expectedValue: maxPct, dimensionKey: String(maxResult.rows[0]?.dimension_key ?? '') };
}

async function checkReconciliation(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  metric: MetricDefinition,
  rule: ValidationRule,
  base: Omit<ValidationCheckResult, 'status' | 'message'>
): Promise<ValidationCheckResult> {
  const levels = (rule.params?.levels_to_compare as string[]) ?? ['facility', 'business_segment'];
  const tolerancePct = Number(rule.params?.tolerance_pct ?? 0.01);

  // Get SUM at each level
  const sums: Record<string, number> = {};
  for (const level of levels) {
    const result = await executor.query(
      `SELECT COALESCE(SUM(metric_value), 0) AS total FROM l3.metric_result
       WHERE run_id = :run_id AND metric_id = :metric_id AND aggregation_level = :level`,
      { run_id: ctx.runId, metric_id: metric.metric_id, level }
    );
    sums[level] = Number(result.rows[0]?.total ?? 0);
  }

  // Compare all levels to the first
  const referenceLevel = levels[0];
  const referenceSum = sums[referenceLevel];
  if (referenceSum === 0) {
    return { ...base, status: 'SKIP', message: `Reference level ${referenceLevel} has sum 0` };
  }

  for (let i = 1; i < levels.length; i++) {
    const diff = Math.abs(sums[levels[i]] - referenceSum);
    const diffPct = (diff / Math.abs(referenceSum)) * 100;

    if (diffPct > tolerancePct) {
      return {
        ...base,
        status: 'FAIL',
        message: `Reconciliation mismatch: ${referenceLevel}=${referenceSum.toFixed(2)} vs ${levels[i]}=${sums[levels[i]].toFixed(2)} (diff: ${diffPct.toFixed(4)}%, tolerance: ${tolerancePct}%)`,
        expectedValue: referenceSum,
        actualValue: sums[levels[i]],
        tolerance: tolerancePct,
        detail: sums,
      };
    }
  }

  return { ...base, status: 'PASS', message: `Cross-level reconciliation passed (tolerance: ${tolerancePct}%)`, detail: sums };
}

async function checkPeriodOverPeriod(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  metric: MetricDefinition,
  rule: ValidationRule,
  base: Omit<ValidationCheckResult, 'status' | 'message'>
): Promise<ValidationCheckResult> {
  const maxChangePct = Number(rule.params?.max_change_pct ?? 20);

  // Get current and prior run totals at business_segment level
  const currentResult = await executor.query(
    `SELECT COALESCE(SUM(metric_value), 0) AS total FROM l3.metric_result
     WHERE run_id = :run_id AND metric_id = :metric_id AND aggregation_level = 'business_segment'`,
    { run_id: ctx.runId, metric_id: metric.metric_id }
  );
  const currentTotal = Number(currentResult.rows[0]?.total ?? 0);

  // Find the most recent prior run
  const priorResult = await executor.query(
    `SELECT COALESCE(SUM(mr.metric_value), 0) AS total
     FROM l3.metric_result mr
     JOIN l3.calc_run cr ON cr.run_id = mr.run_id
     WHERE mr.metric_id = :metric_id
       AND mr.aggregation_level = 'business_segment'
       AND cr.as_of_date = :prior_date
       AND cr.status IN ('COMPLETED', 'PARTIAL')
     ORDER BY cr.started_at DESC LIMIT 1`,
    { metric_id: metric.metric_id, prior_date: ctx.priorAsOfDate }
  );
  const priorTotal = Number(priorResult.rows[0]?.total ?? 0);

  if (priorTotal === 0) {
    return { ...base, status: 'SKIP', message: 'No prior period data available for comparison' };
  }

  const changePct = Math.abs(((currentTotal - priorTotal) / priorTotal) * 100);

  return changePct <= maxChangePct
    ? { ...base, status: 'PASS', message: `Period change: ${changePct.toFixed(2)}% (threshold: ${maxChangePct}%)`, actualValue: changePct, expectedValue: maxChangePct }
    : { ...base, status: 'FAIL', message: `Large period change: ${changePct.toFixed(2)}% exceeds ${maxChangePct}%`, actualValue: changePct, expectedValue: maxChangePct };
}

async function checkCustomSql(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  metric: MetricDefinition,
  rule: ValidationRule,
  base: Omit<ValidationCheckResult, 'status' | 'message'>
): Promise<ValidationCheckResult> {
  if (!rule.custom_sql) {
    return { ...base, status: 'SKIP', message: 'No custom_sql defined' };
  }

  const result = await executor.query(rule.custom_sql, {
    run_id: ctx.runId,
    metric_id: metric.metric_id,
    as_of_date: ctx.asOfDate,
  });

  // Custom SQL should return a single row with `status` and `message` columns
  const row = result.rows[0];
  if (!row) {
    return { ...base, status: 'SKIP', message: 'Custom SQL returned no rows' };
  }

  return {
    ...base,
    status: (String(row.status ?? 'FAIL').toUpperCase() as ValidationStatus),
    message: String(row.message ?? 'Custom validation completed'),
    actualValue: row.actual_value != null ? Number(row.actual_value) : undefined,
    expectedValue: row.expected_value != null ? Number(row.expected_value) : undefined,
  };
}

async function persistValidationResult(
  executor: SqlExecutor,
  ctx: CalcRunContext,
  result: ValidationCheckResult
): Promise<void> {
  try {
    await executor.execute(
      `INSERT INTO l3.calc_validation_result (
        run_id, metric_id, rule_id, rule_type, severity, status,
        aggregation_level, dimension_key, expected_value, actual_value,
        tolerance, message, detail
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        ctx.runId,
        result.metricId,
        result.ruleId,
        result.ruleType,
        result.severity,
        result.status,
        result.level ?? null,
        result.dimensionKey ?? null,
        result.expectedValue ?? null,
        result.actualValue ?? null,
        result.tolerance ?? null,
        result.message,
        result.detail ? JSON.stringify(result.detail) : null,
      ]
    );
  } catch (err) {
    console.error(
      `  [validation] Failed to persist result ${result.ruleId}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
