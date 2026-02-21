/**
 * Metric value store: shape of pre-calculated metric values for dashboard consumption.
 * Rows can be stored in l3.metric_value_fact (SQL) or produced on-demand from runMetricCalculation.
 */

import type { CalculationDimension, ConsumptionLevel } from '@/data/l3-metrics';
import { DIMENSION_TO_CONSUMPTION_LEVEL } from '@/data/l3-metrics';
import type { RunMetricOutput } from './metrics-calculation/types';

export type { ConsumptionLevel };

export interface MetricValueRow {
  run_version_id: string;
  as_of_date: string;
  metric_id: string;
  variant_id: string | null;
  aggregation_level: ConsumptionLevel;
  facility_id: string | null;
  counterparty_id: string | null;
  desk_id: string | null;
  portfolio_id: string | null;
  lob_id: string | null;
  value: number | null;
  unit?: string | null;
  display_format?: string | null;
}

const EMPTY = '';

/**
 * Map CalculationDimension to the dimension key field name used in MetricValueRow.
 */
function getDimensionKeyField(dimension: CalculationDimension): keyof Pick<
  MetricValueRow,
  'facility_id' | 'counterparty_id' | 'desk_id' | 'portfolio_id' | 'lob_id'
> {
  switch (dimension) {
    case 'facility':
      return 'facility_id';
    case 'counterparty':
      return 'counterparty_id';
    case 'L3':
      return 'desk_id';
    case 'L2':
      return 'portfolio_id';
    case 'L1':
      return 'lob_id';
    default:
      return 'facility_id';
  }
}

/**
 * Build metric value rows from a runMetricCalculation result.
 * Used by the values API when reading from SQL returns no rows (on-demand fallback)
 * and by a batch job that persists to l3.metric_value_fact.
 */
export function buildMetricValueRowsFromRunOutput(
  metricId: string,
  dimension: CalculationDimension,
  asOfDate: string,
  runVersionId: string,
  runOutput: RunMetricOutput,
  variantId?: string | null
): MetricValueRow[] {
  if (!runOutput.ok) return [];
  const level = DIMENSION_TO_CONSUMPTION_LEVEL[dimension];
  const keyField = getDimensionKeyField(dimension);

  const base: MetricValueRow = {
    run_version_id: runVersionId,
    as_of_date: asOfDate,
    metric_id: metricId,
    variant_id: variantId ?? null,
    aggregation_level: level,
    facility_id: null,
    counterparty_id: null,
    desk_id: null,
    portfolio_id: null,
    lob_id: null,
    value: null,
  };

  if (runOutput.result.type === 'scalar') {
    const row: MetricValueRow = { ...base, value: runOutput.result.value };
    row[keyField] = EMPTY;
    return [row];
  }

  return runOutput.result.rows.map((r) => {
    const dimensionValue =
      typeof r.dimension_value === 'string' || typeof r.dimension_value === 'number'
        ? String(r.dimension_value)
        : EMPTY;
    const row: MetricValueRow = {
      ...base,
      value: typeof r.metric_value === 'number' ? r.metric_value : Number(r.metric_value) || null,
    };
    row[keyField] = dimensionValue || null;
    return row;
  });
}
