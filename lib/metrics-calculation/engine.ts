import type { CalculationDimension, L3Metric } from '@/data/l3-metrics';
import { CALCULATION_DIMENSIONS } from '@/data/l3-metrics';
import { resolveFormulaForDimension } from './formula-resolver';
import { getMetricById } from './registry';
import { runEscapeHatchCalculator } from './escape-hatch';
import { getDistinctAsOfDates, runSqlMetric } from './sql-runner';
import { getTableKeysForMetric } from './table-resolver';
import type { RunDiagnostics, RunMetricOutput } from './types';

function logRunDiagnostics(diag: RunDiagnostics): void {
  const level = diag.error ? 'error' : 'info';
  const payload = {
    event: 'metrics_calculation_run',
    metricId: diag.metricId,
    dimension: diag.dimension,
    durationMs: diag.durationMs,
    asOfDateRequested: diag.asOfDateRequested,
    asOfDateUsed: diag.asOfDateUsed,
    tableCount: diag.tableCount,
    error: diag.error,
  };
  if (level === 'error') {
    console.error('[metrics-calculation]', JSON.stringify(payload));
    return;
  }
  console.info('[metrics-calculation]', JSON.stringify(payload));
}

export function resolveAllowedDimensions(metric: L3Metric): CalculationDimension[] {
  return metric.allowedDimensions?.length ? metric.allowedDimensions : CALCULATION_DIMENSIONS;
}

export async function runMetricCalculation(input: {
  metric: L3Metric;
  dimension: CalculationDimension;
  asOfDate: string | null;
}): Promise<RunMetricOutput> {
  const startedAt = Date.now();
  const { metric, dimension, asOfDate } = input;
  const resolved = resolveFormulaForDimension(metric, dimension, { allowLegacyFallback: true });
  if (!resolved?.formulaSQL?.trim()) {
    return {
      ok: false,
      error: 'No formulaSQL defined for this metric and dimension',
      hint: 'Add formulaSQL in the metric record (base or per-dimension).',
    };
  }

  if (resolved.source === 'legacy-fallback') {
    console.warn(
      '[metrics-calculation]',
      JSON.stringify({
        event: 'legacy_formula_fallback_used',
        metricId: metric.id,
        dimension,
      })
    );
  }

  const escaped = await runEscapeHatchCalculator({ metric, dimension, asOfDate });
  if (escaped) {
    logRunDiagnostics({
      metricId: metric.id,
      dimension,
      durationMs: Date.now() - startedAt,
      asOfDateRequested: asOfDate,
      asOfDateUsed: escaped.ok ? escaped.asOfDateUsed : null,
      tableCount: 0,
      error: escaped.ok ? undefined : escaped.error,
    });
    return escaped;
  }

  const tableKeys = getTableKeysForMetric(metric, dimension);
  const result = await runSqlMetric({
    rawSql: resolved.formulaSQL,
    tableKeys,
    asOfDate,
  });

  logRunDiagnostics({
    metricId: metric.id,
    dimension,
    durationMs: Date.now() - startedAt,
    asOfDateRequested: asOfDate,
    asOfDateUsed: result.ok ? result.asOfDateUsed : null,
    tableCount: tableKeys.length,
    error: result.ok ? undefined : result.error,
  });
  return result;
}

export function listMetricAsOfDates(metric: L3Metric, dimension: CalculationDimension): string[] {
  const tableKeys = getTableKeysForMetric(metric, dimension);
  return getDistinctAsOfDates(tableKeys);
}

export function getMetricForCalculation(metricId: string): L3Metric | undefined {
  return getMetricById(metricId);
}
