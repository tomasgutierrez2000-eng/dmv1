import type { CalculationDimension, L3Metric } from '@/data/l3-metrics';

export const VALID_CALCULATION_DIMENSIONS: CalculationDimension[] = ['counterparty', 'facility', 'L1', 'L2', 'L3'];

export interface RunMetricResult {
  ok: true;
  inputRowCounts: Record<string, number>;
  sqlExecuted: string;
  result:
    | { type: 'scalar'; value: number | null }
    | { type: 'grouped'; rows: { dimension_value: string | number; metric_value: number }[] };
  asOfDateUsed: string | null;
}

export interface RunMetricError {
  ok: false;
  error: string;
  hint?: string;
  sqlExecuted?: string;
  inputRowCounts?: Record<string, number>;
}

export type RunMetricOutput = RunMetricResult | RunMetricError;

export interface RunMetricRequest {
  metric: L3Metric;
  dimension: CalculationDimension;
  asOfDate: string | null;
}

export interface FormulaResolution {
  formula: string;
  formulaSQL?: string;
  source: 'metric-dimension' | 'metric-base' | 'legacy-fallback';
}

export interface RunDiagnostics {
  metricId: string;
  dimension: CalculationDimension;
  durationMs: number;
  asOfDateRequested: string | null;
  asOfDateUsed: string | null;
  tableCount: number;
  error?: string;
}
