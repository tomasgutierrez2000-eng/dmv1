/**
 * Canonical order for L1 categories in the main view (domain-overview).
 * Uses the 11 unified GSIB-aligned categories shared across L1/L2/L3.
 */
export const L1_CATEGORY_ORDER = [
  'Counterparty & Entity',
  'Exposure & Position',
  'Credit Risk & Ratings',
  'Collateral & Risk Mitigation',
  'Limits & Risk Appetite',
  'Financial Performance',
  'Amendments & Forbearance',
  'Stress Testing',
  'Regulatory & Capital',
  'Data Quality & Infrastructure',
] as const;

/**
 * Maps L1 table names to unified GSIB-aligned categories.
 * Used by "Load Full Model" demo path to group tables consistently.
 */
export const L1_TABLE_CATEGORIES: Record<string, string> = {
  // ── Counterparty & Entity ──
  entity_type_dim: 'Counterparty & Entity',
  counterparty_role_dim: 'Counterparty & Entity',
  org_unit_dim: 'Counterparty & Entity',
  enterprise_business_taxonomy: 'Counterparty & Entity',
  enterprise_product_taxonomy: 'Counterparty & Entity',
  industry_dim: 'Counterparty & Entity',
  duns_entity_dim: 'Counterparty & Entity',
  reporting_entity_dim: 'Counterparty & Entity',

  // ── Exposure & Position ──
  exposure_type_dim: 'Exposure & Position',

  // ── Credit Risk & Ratings ──
  rating_scale_dim: 'Credit Risk & Ratings',
  rating_grade_dim: 'Credit Risk & Ratings',
  rating_source: 'Credit Risk & Ratings',
  rating_mapping: 'Credit Risk & Ratings',
  internal_risk_rating_bucket_dim: 'Credit Risk & Ratings',
  risk_rating_tier_dim: 'Credit Risk & Ratings',
  rating_change_status_dim: 'Credit Risk & Ratings',
  credit_event_type_dim: 'Credit Risk & Ratings',
  credit_status_dim: 'Credit Risk & Ratings',
  dpd_bucket_dim: 'Credit Risk & Ratings',
  default_definition_dim: 'Credit Risk & Ratings',
  watchlist_category_dim: 'Credit Risk & Ratings',
  ecl_stage_dim: 'Credit Risk & Ratings',
  impairment_model_dim: 'Credit Risk & Ratings',

  // ── Collateral & Risk Mitigation ──
  collateral_type: 'Collateral & Risk Mitigation',
  collateral_eligibility_dim: 'Collateral & Risk Mitigation',
  collateral_haircut_dim: 'Collateral & Risk Mitigation',
  crm_type_dim: 'Collateral & Risk Mitigation',
  crm_eligibility_dim: 'Collateral & Risk Mitigation',
  risk_mitigant_type_dim: 'Collateral & Risk Mitigation',
  portfolio_dim: 'Collateral & Risk Mitigation',
  collateral_portfolio: 'Collateral & Risk Mitigation',

  // ── Limits & Risk Appetite ──
  limit_status_dim: 'Limits & Risk Appetite',
  limit_rule: 'Limits & Risk Appetite',
  limit_threshold: 'Limits & Risk Appetite',
  metric_threshold: 'Limits & Risk Appetite',
  sccl_counterparty_group: 'Limits & Risk Appetite',
  sccl_counterparty_group_member: 'Limits & Risk Appetite',

  // ── Financial Performance ──
  pricing_tier_dim: 'Financial Performance',
  utilization_status_dim: 'Financial Performance',
  ledger_account_dim: 'Financial Performance',
  interest_rate_index_dim: 'Financial Performance',

  // ── Amendments & Forbearance ──
  amendment_status_dim: 'Amendments & Forbearance',
  amendment_type_dim: 'Amendments & Forbearance',
  forbearance_type_dim: 'Amendments & Forbearance',

  // ── Stress Testing ──
  scenario_dim: 'Stress Testing',

  // ── Regulatory & Capital ──
  regulatory_jurisdiction: 'Regulatory & Capital',
  regulatory_mapping: 'Regulatory & Capital',
  regulatory_capital_basis_dim: 'Regulatory & Capital',
  report_cell_definition: 'Regulatory & Capital',
  fr2590_category_dim: 'Regulatory & Capital',
  basel_exposure_type_dim: 'Regulatory & Capital',
  regulatory_capital_requirement: 'Regulatory & Capital',
  equity_allocation_config: 'Regulatory & Capital',
  capital_allocation: 'Regulatory & Capital',

  // ── Data Quality & Infrastructure ──
  currency_dim: 'Data Quality & Infrastructure',
  country_dim: 'Data Quality & Infrastructure',
  region_dim: 'Data Quality & Infrastructure',
  date_dim: 'Data Quality & Infrastructure',
  date_time_dim: 'Data Quality & Infrastructure',
  maturity_bucket_dim: 'Data Quality & Infrastructure',
  origination_date_bucket_dim: 'Data Quality & Infrastructure',
  reporting_calendar_dim: 'Data Quality & Infrastructure',
  source_system_registry: 'Data Quality & Infrastructure',
  run_control: 'Data Quality & Infrastructure',
  report_registry: 'Data Quality & Infrastructure',
  validation_check_registry: 'Data Quality & Infrastructure',
  reconciliation_control: 'Data Quality & Infrastructure',
  model_registry_dim: 'Data Quality & Infrastructure',
  rule_registry: 'Data Quality & Infrastructure',
  context_dim: 'Data Quality & Infrastructure',
  metric_definition_dim: 'Data Quality & Infrastructure',
  instrument_identifier: 'Data Quality & Infrastructure',
};

const DEFAULT_CATEGORY = 'Data Quality & Infrastructure';

export function getL1Category(tableName: string): string {
  return L1_TABLE_CATEGORIES[tableName] ?? DEFAULT_CATEGORY;
}
