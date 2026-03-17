/**
 * L2 table categories using the 11 unified GSIB-aligned categories shared across L1/L2/L3.
 * Used by "Load Full Model" demo path to group tables consistently.
 */
export const L2_CATEGORY_ORDER = [
  'Counterparty & Entity',
  'Exposure & Position',
  'Credit Risk & Ratings',
  'Collateral & Risk Mitigation',
  'Limits & Risk Appetite',
  'Financial Performance',
  'Amendments & Forbearance',
  'Stress Testing',
] as const;

export const L2_TABLE_CATEGORIES: Record<string, string> = {
  // ── Counterparty & Entity ──
  counterparty: 'Counterparty & Entity',
  legal_entity: 'Counterparty & Entity',
  credit_agreement_master: 'Counterparty & Entity',
  facility_master: 'Counterparty & Entity',
  contract_master: 'Counterparty & Entity',
  instrument_master: 'Counterparty & Entity',
  counterparty_hierarchy: 'Counterparty & Entity',
  legal_entity_hierarchy: 'Counterparty & Entity',
  control_relationship: 'Counterparty & Entity',
  economic_interdependence_relationship: 'Counterparty & Entity',
  credit_agreement_counterparty_participation: 'Counterparty & Entity',
  facility_counterparty_participation: 'Counterparty & Entity',
  facility_lender_allocation: 'Counterparty & Entity',
  facility_lob_attribution: 'Counterparty & Entity',
  duns_entity_observation: 'Counterparty & Entity',

  // ── Exposure & Position ──
  facility_exposure_snapshot: 'Exposure & Position',
  netting_set_exposure_snapshot: 'Exposure & Position',
  exposure_counterparty_attribution: 'Exposure & Position',
  position: 'Exposure & Position',
  position_detail: 'Exposure & Position',
  netting_agreement: 'Exposure & Position',
  netting_set: 'Exposure & Position',
  netting_set_link: 'Exposure & Position',

  // ── Credit Risk & Ratings ──
  counterparty_rating_observation: 'Credit Risk & Ratings',
  facility_risk_snapshot: 'Credit Risk & Ratings',
  risk_flag: 'Credit Risk & Ratings',
  credit_event: 'Credit Risk & Ratings',
  credit_event_facility_link: 'Credit Risk & Ratings',
  ecl_staging_snapshot: 'Credit Risk & Ratings',
  watchlist_entry: 'Credit Risk & Ratings',

  // ── Collateral & Risk Mitigation ──
  collateral_asset_master: 'Collateral & Risk Mitigation',
  collateral_link: 'Collateral & Risk Mitigation',
  collateral_snapshot: 'Collateral & Risk Mitigation',
  crm_protection_master: 'Collateral & Risk Mitigation',
  protection_link: 'Collateral & Risk Mitigation',
  risk_mitigant_master: 'Collateral & Risk Mitigation',
  risk_mitigant_link: 'Collateral & Risk Mitigation',
  csa_master: 'Collateral & Risk Mitigation',
  margin_agreement: 'Collateral & Risk Mitigation',

  // ── Limits & Risk Appetite ──
  limit_contribution_snapshot: 'Limits & Risk Appetite',
  limit_utilization_event: 'Limits & Risk Appetite',
  limit_assignment_snapshot: 'Limits & Risk Appetite',
  metric_threshold_snapshot: 'Limits & Risk Appetite',
  exception_event: 'Limits & Risk Appetite',

  // ── Financial Performance ──
  facility_financial_snapshot: 'Financial Performance',
  facility_delinquency_snapshot: 'Financial Performance',
  facility_pricing_snapshot: 'Financial Performance',
  facility_profitability_snapshot: 'Financial Performance',
  counterparty_financial_snapshot: 'Financial Performance',
  facility_credit_approval: 'Financial Performance',
  deal_pipeline_fact: 'Financial Performance',
  financial_metric_observation: 'Financial Performance',
  payment_ledger: 'Financial Performance',
  cash_flow: 'Financial Performance',
  gl_journal_entry: 'Financial Performance',
  gl_account_balance_snapshot: 'Financial Performance',
  fx_rate: 'Financial Performance',

  // ── Amendments & Forbearance ──
  amendment_event: 'Amendments & Forbearance',
  amendment_change_detail: 'Amendments & Forbearance',
  forbearance_event: 'Amendments & Forbearance',

  // ── Stress Testing ──
  stress_test_breach: 'Stress Testing',
};

const DEFAULT_L2_CATEGORY = 'Counterparty & Entity';

export function getL2Category(tableName: string): string {
  return L2_TABLE_CATEGORIES[tableName] ?? DEFAULT_L2_CATEGORY;
}
