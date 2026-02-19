/**
 * Metrics × Dimensions — Formulas
 *
 * Primary source: metrics_dimensions_filled.xlsx (project root or data/).
 * Sheet "Definitions, KPI,Calc& Insights": col 0 = Data Element, cols 9/13/17/21/25 = Level Logic
 * for Facility, Counterparty, L3 Desk, L2 Portfolio, L1 Department/LoB.
 * Metrics Engine matches by metric.id or metric.name to Data Element.
 *
 * Fallback: METRICS_DIMENSIONS_FILLED below (or add rows for metrics not in the Excel).
 */

import type { CalculationDimension } from './l3-metrics';

export interface MetricDimensionFormulaRow {
  /** Metric id (e.g. M001, C001) */
  metricId: string;
  /** Dimension at which this formula applies */
  dimension: CalculationDimension;
  /** Human-readable formula (e.g. SUM(gross_exposure_usd) GROUP BY counterparty_id) */
  formula: string;
  /** Optional SQL expression for this dimension */
  formulaSQL?: string;
}

/**
 * Formulas per metric and dimension.
 * Add rows here or load from Excel sheet "metrics_dimensions_filled" (columns: metricId, dimension, formula, formulaSQL).
 */
export const METRICS_DIMENSIONS_FILLED: MetricDimensionFormulaRow[] = [
  // Example: same metric, different formula per dimension
  // { metricId: 'M001', dimension: 'counterparty', formula: 'SUM(gross_exposure_usd) GROUP BY counterparty_id', formulaSQL: 'SUM(fes.gross_exposure_usd) GROUP BY fes.counterparty_id' },
  // { metricId: 'M001', dimension: 'facility', formula: 'SUM(gross_exposure_usd) GROUP BY facility_id', formulaSQL: 'SUM(fes.gross_exposure_usd) GROUP BY fes.facility_id' },
];

const byKey = new Map<string, MetricDimensionFormulaRow>();
for (const row of METRICS_DIMENSIONS_FILLED) {
  byKey.set(`${row.metricId}\t${row.dimension}`, row);
}

/**
 * Get the formula (and optional formulaSQL) for a metric at a given calculation dimension.
 * Returns null if no dimension-specific formula is defined (caller should use metric.formula).
 */
export function getFormulaForDimension(
  metricId: string,
  dimension: CalculationDimension
): { formula: string; formulaSQL?: string } | null {
  const row = byKey.get(`${metricId}\t${dimension}`);
  if (!row) return null;
  return {
    formula: row.formula,
    formulaSQL: row.formulaSQL,
  };
}

/**
 * Get all dimension-specific formulas for a metric (for the dropdown / allowed dimensions).
 */
export function getFormulasByDimension(metricId: string): Map<CalculationDimension, { formula: string; formulaSQL?: string }> {
  const out = new Map<CalculationDimension, { formula: string; formulaSQL?: string }>();
  for (const row of METRICS_DIMENSIONS_FILLED) {
    if (row.metricId === metricId) {
      out.set(row.dimension, { formula: row.formula, formulaSQL: row.formulaSQL });
    }
  }
  return out;
}
