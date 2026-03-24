import type { CalculationDimension, L3Metric } from '@/data/l3-metrics';
import type { FormulaResolution } from './types';

/**
 * Resolve the formula for a metric at a given calculation dimension.
 *
 * Two-tier lookup:
 *   1. metric.formulasByDimension[dimension]  (per-dimension override)
 *   2. metric.formula / metric.formulaSQL     (base formula)
 */
export function resolveFormulaForDimension(
  metric: L3Metric,
  dimension: CalculationDimension,
): FormulaResolution | null {
  const metricByDimension = metric.formulasByDimension?.[dimension];
  if (metricByDimension?.formula?.trim() || metricByDimension?.formulaSQL?.trim()) {
    return {
      formula: metricByDimension.formula || metric.formula,
      formulaSQL: metricByDimension.formulaSQL || metric.formulaSQL,
      source: 'metric-dimension',
    };
  }

  if (metric.formula?.trim() || metric.formulaSQL?.trim()) {
    return {
      formula: metric.formula,
      formulaSQL: metric.formulaSQL,
      source: 'metric-base',
    };
  }

  return null;
}
