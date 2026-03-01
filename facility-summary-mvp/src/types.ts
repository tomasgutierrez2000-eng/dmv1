export interface FacilitySummary {
  // Original fields
  facility_id: string;
  credit_agreement_id: string;
  counterparty_id: string;
  facility_type: string;
  product: string;
  lob_l1_name: string;
  lob_l2_name: string;
  lob_l3_name: string;
  region: string;
  committed_amount_usd: number;
  effective_date: string;
  maturity_date: string;
  facility_status: string;
  utilized_amount_usd: number;
  outstanding_exposure_usd: number;
  undrawn_amount_usd: number;
  prior_month_exposure_usd: number;
  as_of_date: string;
  counterparty_name: string;
  internal_risk_rating: number;
  external_risk_rating: string;
  legal_entity_id: string;
  legal_entity_name: string;
  fr2590_category: string;
  industry: string;
  amendment_type: string | null;
  amendment_subtype: string | null;
  amendment_status: string | null;
  amendment_start_date: string | null;
  participating_counterparty_ids: string[];
  risk_mitigant_type: string | null;
  risk_mitigant_subtype: string | null;
  risk_mitigant_amount_usd: number;
  cross_entity_exposure_usd: number;
  portfolio: string;
  is_syndicated: boolean;
  utilization_pct: number;
  is_active: boolean;
  days_remaining: number;
  coverage_ratio_pct: number;
  has_amendment: boolean;
  has_active_amendment: boolean;
  amendment_aging_days: number | null;
  has_cross_entity_exposure: boolean;
  exposure_change_pct: number;
  exposure_trend_direction: string;

  // Enrichment fields - Pricing
  spread_bps: number;
  base_rate_pct: number;
  all_in_rate_pct: number;
  rate_index_code: string;
  rate_cap_pct: number | null;
  below_threshold_flag: boolean;
  prior_month_spread_bps: number;
  spread_change_bps: number;

  // Enrichment fields - Delinquency
  total_overdue_amt: number;
  days_past_due_max: number;
  delinquency_status_code: string;
  delinquency_bucket_code: string;
  is_delinquent: boolean;

  // Enrichment fields - Pricing Exception
  pricing_exception_flag: boolean;

  // Enrichment fields - Profitability
  net_interest_income_amt: number;
  total_revenue_amt: number;
  nim_pct: number;
  roa_pct: number;
  roe_pct: number;
  total_debt_service_amt: number;
  interest_rate_sensitivity_pct: number;

  // Enrichment fields - RWA & Rating Bucket
  rwa_amt: number;
  internal_risk_rating_bucket_code: string;
  return_on_rwa_pct: number;

  // Enrichment fields - Risk Flags
  is_deteriorated: boolean;
  is_criticized: boolean;
  is_watch_list: boolean;
  has_covenant_breach: boolean;
  risk_flag_count: number;
  highest_flag_severity: string | null;

  // Enrichment fields - Rating History
  internal_rating_prior: string | null;
  external_rating_prior: string | null;
  has_internal_downgrade: boolean;
  has_external_downgrade: boolean;
  has_any_downgrade: boolean;

  // Enrichment fields - Exposure & Loss
  ead_usd: number;
  expected_loss_usd: number;
  expected_loss_rate_pct: number;

  // Enrichment fields - Financial Metrics
  dscr: number | null;
  ltv: number | null;
  fccr: number | null;
  tangible_net_worth_usd: number | null;

  // Enrichment fields - Limits
  counterparty_limit_usd: number | null;
  counterparty_limit_utilized_usd: number | null;
  counterparty_limit_status: string | null;

  // Enrichment fields - Date Buckets (derived)
  maturity_date_bucket: string;
  origination_date_bucket: string;
  effective_date_bucket: string;

  // Enrichment fields - Bank Share
  bank_share_pct: number;

  // Enrichment fields - Operating Cost
  operating_expense_amt: number;

  // Enrichment fields - Capital Adequacy
  capital_adequacy_ratio_pct: number | null;

  // Enrichment fields - Loan Count
  number_of_loans: number;

  // Enrichment fields - Rating Migration
  external_rating_status: string;
  external_rating_change_steps: number;
  internal_rating_status: string;
  internal_rating_change_steps: number;
}

export interface DeskSummary {
  lob_l1_name: string;
  lob_l2_name: string;
  lob_l3_name: string;
  as_of_date: string;
  facility_count: number;
  total_exposure_usd: number;
  total_committed_usd: number;
  total_utilized_usd: number;
  utilization_pct: number;
  exposure_change_pct: number;
  avg_spread_bps: number;
  avg_base_rate_pct: number;
  avg_all_in_rate_pct: number;
  exception_count: number;
  avg_coverage_ratio_pct: number;
  delinquent_facility_count: number;
  delinquency_rate_pct: number;
  deteriorated_count: number;
  criticized_count: number;
  downgrade_count: number;
  cross_entity_facility_count: number;
  total_cross_entity_exposure_usd: number;
  avg_dscr: number | null;
  avg_ltv: number | null;
  avg_fccr: number | null;
  avg_internal_risk_rating: number;
  avg_bank_share_pct: number;
  avg_roe_pct: number;
  total_debt_service_amt: number;
  total_rwa_amt: number;
  avg_ir_sensitivity_pct: number;
  avg_return_on_rwa_pct: number;
  pricing_exception_count: number;
  total_ead_usd: number;
  total_expected_loss_usd: number;
  avg_expected_loss_rate_pct: number;
  total_cross_entity_exposure_usd: number;
  cross_entity_facility_count: number;
  active_facility_count: number;
  avg_tangible_net_worth_usd: number | null;
  exception_rate_pct: number;
  avg_capital_adequacy_ratio_pct: number | null;
  total_operating_expense_amt: number;
}

export interface LobL2Summary extends DeskSummary {
  lob_limit_usd: number | null;
  lob_limit_utilized_usd: number | null;
  lob_headroom_usd: number | null;
  lob_utilization_pct: number | null;
  lob_limit_status: string | null;
  desk_count: number;
  top_desk_by_exposure: string | null;
  bottom_desk_by_exposure: string | null;
  prior_month_exposure_usd: number;
  prior_month_avg_spread_bps: number;
  prior_month_coverage_ratio_pct: number;
  total_nii_amt: number;
  total_revenue_amt: number;
  avg_nim_pct: number;
  avg_roa_pct: number;
  top_sector: string;
  top_sector_pct: number;
  top_region: string;
  top_region_pct: number;
  unique_counterparty_count: number;
  doi_pct: number;
}

export interface LobL1Summary {
  lob_l1_name: string;
  as_of_date: string;
  l2_lob_count: number;
  facility_count: number;
  total_exposure_usd: number;
  total_committed_usd: number;
  total_utilized_usd: number;
  utilization_pct: number;
  exposure_change_pct: number;
  avg_spread_bps: number;
  avg_base_rate_pct: number;
  avg_all_in_rate_pct: number;
  exception_count: number;
  avg_coverage_ratio_pct: number;
  delinquent_facility_count: number;
  delinquency_rate_pct: number;
  deteriorated_count: number;
  criticized_count: number;
  downgrade_count: number;
  cross_entity_facility_count: number;
  total_cross_entity_exposure_usd: number;
  avg_dscr: number | null;
  avg_ltv: number | null;
  avg_fccr: number | null;
  avg_internal_risk_rating: number;
  avg_bank_share_pct: number;
  avg_roe_pct: number;
  total_debt_service_amt: number;
  total_rwa_amt: number;
  avg_ir_sensitivity_pct: number;
  avg_return_on_rwa_pct: number;
  pricing_exception_count: number;
  total_ead_usd: number;
  total_expected_loss_usd: number;
  avg_expected_loss_rate_pct: number;
  total_cross_entity_exposure_usd: number;
  cross_entity_facility_count: number;
  active_facility_count: number;
  avg_tangible_net_worth_usd: number | null;
  exception_rate_pct: number;
  avg_capital_adequacy_ratio_pct: number | null;
  total_operating_expense_amt: number;
  desk_count: number;
  top_desk_by_exposure: string | null;
  bottom_desk_by_exposure: string | null;
  prior_month_exposure_usd: number;
  prior_month_avg_spread_bps: number;
  prior_month_coverage_ratio_pct: number;
  total_nii_amt: number;
  total_revenue_amt: number;
  avg_nim_pct: number;
  avg_roa_pct: number;
  top_sector: string;
  top_sector_pct: number;
  top_region: string;
  top_region_pct: number;
  unique_counterparty_count: number;
  doi_pct: number;
}
