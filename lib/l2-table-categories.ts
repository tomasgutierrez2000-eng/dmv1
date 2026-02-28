/**
 * L2 table categories for the demo model (26 tables: snapshots, events, attributions).
 */
export const L2_CATEGORY_ORDER = [
  'Position & exposure',
  'Exposure & collateral snapshots',
  'Facility snapshots',
  'Limits',
  'Events & amendments',
  'Credit events',
  'Stress test & pipeline',
  'Ratings & metrics',
  'Exceptions & data quality',
  'Liquidity snapshots',
  'Capital snapshots',
] as const;

export const L2_TABLE_CATEGORIES: Record<string, string> = {
  position: 'Position & exposure',
  position_detail: 'Position & exposure',
  exposure_counterparty_attribution: 'Exposure & collateral snapshots',
  facility_exposure_snapshot: 'Exposure & collateral snapshots',
  netting_set_exposure_snapshot: 'Exposure & collateral snapshots',
  facility_lob_attribution: 'Exposure & collateral snapshots',
  collateral_snapshot: 'Exposure & collateral snapshots',
  cash_flow: 'Exposure & collateral snapshots',
  facility_delinquency_snapshot: 'Facility snapshots',
  facility_pricing_snapshot: 'Facility snapshots',
  facility_profitability_snapshot: 'Facility snapshots',
  limit_contribution_snapshot: 'Limits',
  limit_utilization_event: 'Limits',
  amendment_change_detail: 'Events & amendments',
  amendment_event: 'Events & amendments',
  credit_event: 'Credit events',
  credit_event_facility_link: 'Credit events',
  stress_test_breach: 'Stress test & pipeline',
  stress_test_result: 'Stress test & pipeline',
  deal_pipeline_fact: 'Stress test & pipeline',
  counterparty_rating_observation: 'Ratings & metrics',
  financial_metric_observation: 'Ratings & metrics',
  metric_threshold: 'Ratings & metrics',
  exception_event: 'Exceptions & data quality',
  risk_flag: 'Exceptions & data quality',
  data_quality_score_snapshot: 'Exceptions & data quality',
  // Liquidity snapshots
  securities_position_snapshot: 'Liquidity snapshots',
  deposit_balance_snapshot: 'Liquidity snapshots',
  wholesale_funding_snapshot: 'Liquidity snapshots',
  liquidity_cash_flow_projection: 'Liquidity snapshots',
  derivative_margin_snapshot: 'Liquidity snapshots',
  // Capital snapshots
  capital_instrument_snapshot: 'Capital snapshots',
  capital_deduction_snapshot: 'Capital snapshots',
  rwa_snapshot: 'Capital snapshots',
  leverage_exposure_snapshot: 'Capital snapshots',
};

const DEFAULT_L2_CATEGORY = 'L2';

export function getL2Category(tableName: string): string {
  return L2_TABLE_CATEGORIES[tableName] ?? DEFAULT_L2_CATEGORY;
}
