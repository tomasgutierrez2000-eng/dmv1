/**
 * L2 table categories for the demo model (23 tables: snapshots, events, attributions).
 * Note: data_quality_score_snapshot and stress_test_result promoted to L3 (derived).
 * Note: metric_threshold demoted to L1 (reference/configuration).
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
  facility_financial_snapshot: 'Facility snapshots',
  limit_contribution_snapshot: 'Limits',
  limit_utilization_event: 'Limits',
  amendment_change_detail: 'Events & amendments',
  amendment_event: 'Events & amendments',
  credit_event: 'Credit events',
  credit_event_facility_link: 'Credit events',
  stress_test_breach: 'Stress test & pipeline',
  deal_pipeline_fact: 'Stress test & pipeline',
  counterparty_rating_observation: 'Ratings & metrics',
  financial_metric_observation: 'Ratings & metrics',
  exception_event: 'Exceptions & data quality',
  risk_flag: 'Exceptions & data quality',
};

const DEFAULT_L2_CATEGORY = 'L2';

export function getL2Category(tableName: string): string {
  return L2_TABLE_CATEGORIES[tableName] ?? DEFAULT_L2_CATEGORY;
}
