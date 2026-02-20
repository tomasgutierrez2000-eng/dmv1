import type { CalculationDimension, L3Metric } from '@/data/l3-metrics';
import { getFormulaForDimension } from '@/data/metrics_dimensions_filled';
import type { FormulaResolution } from './types';

export interface FormulaResolverOptions {
  allowLegacyFallback?: boolean;
}

export function resolveFormulaForDimension(
  metric: L3Metric,
  dimension: CalculationDimension,
  options?: FormulaResolverOptions
): FormulaResolution | null {
  const metricByDimension = metric.formulasByDimension?.[dimension];
  if (metricByDimension?.formula?.trim() || metricByDimension?.formulaSQL?.trim()) {
    return {
      formula: metricByDimension.formula || metric.formula,
      formulaSQL: metricByDimension.formulaSQL || metric.formulaSQL,
      source: 'metric-dimension',
    };
  }

  if (options?.allowLegacyFallback) {
    const legacy = getFormulaForDimension(metric.id, dimension);
    if (legacy?.formula?.trim() || legacy?.formulaSQL?.trim()) {
      return {
        formula: legacy.formula || metric.formula,
        formulaSQL: legacy.formulaSQL || metric.formulaSQL,
        source: 'legacy-fallback',
      };
    }
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
