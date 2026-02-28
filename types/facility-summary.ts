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

  // Enrichment fields - Profitability
  net_interest_income_amt: number;
  total_revenue_amt: number;
  nim_pct: number;
  roa_pct: number;
  roe_pct: number;

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
}
