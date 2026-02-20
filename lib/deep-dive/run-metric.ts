import type { CalculationDimension, L3Metric } from '@/data/l3-metrics';
import { getTableKeysForMetric } from '@/lib/metrics-calculation/table-resolver';
import { getDistinctAsOfDates } from '@/lib/metrics-calculation/sql-runner';
import type { RunMetricError, RunMetricOutput, RunMetricResult } from '@/lib/metrics-calculation/types';
import { runMetricCalculation } from '@/lib/metrics-calculation/engine';

export type { RunMetricError, RunMetricOutput, RunMetricResult };

export async function runMetric(
  metric: L3Metric,
  dimension: CalculationDimension,
  asOfDate: string | null
): Promise<RunMetricOutput> {
  return runMetricCalculation({ metric, dimension, asOfDate });
}

export { getDistinctAsOfDates, getTableKeysForMetric };
