/**
 * L2 row types — extracted from the legacy l2-generator.ts.
 * Used by validator.ts for type-safe scenario validation.
 */

export interface ExposureRow {
  facility_exposure_id: number;
  facility_id: number;
  counterparty_id: number;
  as_of_date: string;
  exposure_type_id: number;
  drawn_amount: number;
  committed_amount: number;
  undrawn_amount: number;
  currency_code: string;
  limit_status_code: string;
}

export interface RatingObservationRow {
  observation_id: number;
  counterparty_id: number;
  as_of_date: string;
  rating_type: string;
  rating_value: string;
  rating_grade_id: number;
  is_internal_flag: string;
  pd_implied: string;
  rating_source_id: number;
}

export interface CreditEventRow {
  credit_event_id: number;
  counterparty_id: number;
  credit_event_type_code: number;
  event_date: string;
  event_summary: string;
  event_status: string;
}

export interface EventFacilityLinkRow {
  link_id: number;
  credit_event_id: number;
  facility_id: number;
}

export interface RiskFlagRow {
  risk_flag_id: number;
  facility_id: number | null;
  counterparty_id: number | null;
  flag_type: string;
  flag_code: string;
  flag_severity: string;
  as_of_date: string;
  flag_description: string;
}

export interface AmendmentEventRow {
  amendment_id: number;
  facility_id: number;
  credit_agreement_id: number;
  counterparty_id: number;
  amendment_type_code: string;
  amendment_status_code: string;
  effective_date: string;
  amendment_description: string;
}

export interface CollateralSnapshotRow {
  collateral_asset_id: number;
  counterparty_id: number;
  as_of_date: string;
  original_valuation_usd: number;
  current_valuation_usd: number;
}

export interface StressTestResultRow {
  result_id: number;
  scenario_id: number;
  as_of_date: string;
  loss_amount: number;
  result_status: string;
  result_description: string;
}

export interface StressTestBreachRow {
  breach_id: number;
  scenario_id: number;
  as_of_date: string;
  stress_test_result_id: number;
  counterparty_id: number;
  breach_amount_usd: number;
  breach_severity: string;
}

export interface DelinquencyRow {
  facility_id: number;
  counterparty_id: number;
  as_of_date: string;
  credit_status_code: number;
  days_past_due: number;
  delinquency_status_code: string;
}

export interface LimitContributionRow {
  limit_rule_id: number;
  counterparty_id: number;
  as_of_date: string;
  contribution_amount_usd: number;
  contribution_pct: number;
}

export interface LimitUtilizationRow {
  counterparty_id: number;
  limit_rule_id: number;
  as_of_date: string;
  utilized_amount: number;
  available_amount: number;
}

export interface DealPipelineRow {
  pipeline_id: number;
  counterparty_id: number;
  facility_id: number;
  as_of_date: string;
  pipeline_stage: string;
  proposed_amount: number;
  expected_close_date: string;
}

export interface DataQualityRow {
  score_id: number;
  dimension_name: string;
  as_of_date: string;
  completeness_score: number;
  validity_score: number;
  timeliness_score: number;
  overall_score: number;
}

export interface ExposureAttributionRow {
  attribution_id: number;
  counterparty_id: number;
  facility_id: number;
  as_of_date: string;
  exposure_type_id: number;
  counterparty_role_code: string;
  attributed_exposure_usd: number;
  attribution_pct: number;
}

export interface FacilityPricingRow {
  facility_id: number;
  as_of_date: string;
  spread_bps: number;
  rate_index_id: number;
  all_in_rate_pct: number;
  base_rate_pct: number;
  currency_code: string;
  facility_pricing_id: number;
  fee_rate_pct: number;
  cost_of_funds_pct: number;
  payment_frequency: string;
  is_prepayment_penalty_flag: string;
}

export interface FacilityRiskRow {
  facility_id: number;
  as_of_date: string;
  counterparty_id: number;
  pd_pct: number;
  lgd_pct: number;
  ccf: number;
  ead_amt: number;
  expected_loss_amt: number;
  rwa_amt: number;
  risk_weight_pct: number;
  internal_risk_rating: string;
  currency_code: string;
}

export interface FacilityFinancialRow {
  facility_id: number;
  as_of_date: string;
  counterparty_id: number;
  currency_code: string;
  reporting_period: string;
  revenue_amt: number;
  operating_expense_amt: number;
  ebitda_amt: number;
  total_debt_service_amt: number;
  interest_expense_amt: number;
  principal_payment_amt: number;
  net_income_amt: number;
  dscr_value: number;
  ltv_pct: number;
}

export interface PositionRow {
  position_id: number;
  as_of_date: string;
  facility_id: number;
  instrument_id: number;
  position_type: string;
  balance_amount: number;
  currency_code: string;
  source_system_id: number;
  counterparty_id: number;
  credit_agreement_id: number;
  credit_status_code: string;
  exposure_type_code: string;
  internal_risk_rating: string;
  external_risk_rating: string;
  notional_amount: number;
  is_trading_banking_book_flag: string;
  product_node_id: number;
}

export interface PositionDetailRow {
  position_detail_id: number;
  position_id: number;
  as_of_date: string;
  detail_type: string;
  amount: number;
  current_balance: number;
  funded_amount: number;
  unfunded_amount: number;
  total_commitment: number;
  interest_rate: number;
  days_past_due: number;
  delinquency_status: string;
  spread_bps: number;
  exposure_type_code: string;
  notional_amount: number;
  is_delinquent_payment_flag: string;
}

export interface CashFlowRow {
  cash_flow_id: number;
  facility_id: number;
  counterparty_id: number;
  cash_flow_date: string;
  cash_flow_type: string;
  amount: number;
  currency_code: string;
  as_of_date: string;
  flow_direction: string;
  flow_type: string;
}

export interface FacilityLobAttributionRow {
  attribution_id: number;
  facility_id: number;
  as_of_date: string;
  lob_segment_id: number;
  attribution_pct: number;
  attributed_amount: number;
  attribution_amount_usd: number;
  attribution_type: string;
}

export interface CounterpartyFinancialRow {
  financial_snapshot_id: number;
  counterparty_id: number;
  as_of_date: string;
  reporting_period: string;
  currency_code: string;
  revenue_amt: number;
  operating_expense_amt: number;
  net_income_amt: number;
  interest_expense_amt: number;
  total_assets_amt: number;
  total_liabilities_amt: number;
  shareholders_equity_amt: number;
  ebitda_amt: number;
  total_debt_service_amt: number;
}

export interface FacilityProfitabilityRow {
  facility_id: number;
  as_of_date: string;
  interest_income_amt: number;
  interest_expense_amt: number;
  fee_income_amt: number;
  nii_ytd: number;
  fee_income_ytd: number;
  ledger_account_id: number;
  base_currency_code: string;
}

export interface AmendmentChangeDetailRow {
  change_detail_id: number;
  amendment_id: number;
  change_type: string;
  old_value: string;
  new_value: string;
  change_field_name: string;
  change_seq: number;
}

export interface ExceptionEventRow {
  exception_id: number;
  as_of_date: string;
  exception_type: string;
  facility_id: number;
  counterparty_id: number;
  exception_status: string;
  exception_severity: string;
  exception_description: string;
  breach_amount_usd: number;
  breach_pct: number;
  identified_date: string;
  days_open: number;
}

export interface FacilityCreditApprovalRow {
  approval_id: number;
  facility_id: number;
  counterparty_id: number;
  as_of_date: string;
  approval_status: string;
  approval_date: string;
  approved_amount: number;
  is_exception_flag: string;
}

export interface FinancialMetricObservationRow {
  observation_id: number;
  counterparty_id: number;
  facility_id: number;
  as_of_date: string;
  metric_definition_id: number;
  metric_code: string;
  metric_name: string;
  metric_value: number;
  context_id: number;
}

export interface NettingSetExposureRow {
  netting_set_id: number;
  as_of_date: string;
  netted_exposure_amount: number;
  gross_exposure_amount: number;
  currency_code: string;
  counterparty_id: number;
  netting_set_exposure_id: number;
  netting_benefit_amt: number;
  pfe_usd: number;
}

export interface MetricThresholdL2Row {
  threshold_id: number;
  metric_definition_id: number;
  as_of_date: string;
  threshold_value: number;
  threshold_type: string;
}

export interface L2Data {
  facility_exposure_snapshot?: ExposureRow[];
  counterparty_rating_observation?: RatingObservationRow[];
  credit_event?: CreditEventRow[];
  credit_event_facility_link?: EventFacilityLinkRow[];
  risk_flag?: RiskFlagRow[];
  amendment_event?: AmendmentEventRow[];
  collateral_snapshot?: CollateralSnapshotRow[];
  stress_test_result?: StressTestResultRow[];
  stress_test_breach?: StressTestBreachRow[];
  facility_delinquency_snapshot?: DelinquencyRow[];
  limit_contribution_snapshot?: LimitContributionRow[];
  limit_utilization_event?: LimitUtilizationRow[];
  deal_pipeline_fact?: DealPipelineRow[];
  data_quality_score_snapshot?: DataQualityRow[];
  exposure_counterparty_attribution?: ExposureAttributionRow[];
  facility_pricing_snapshot?: FacilityPricingRow[];
  facility_risk_snapshot?: FacilityRiskRow[];
  facility_financial_snapshot?: FacilityFinancialRow[];
  position?: PositionRow[];
  position_detail?: PositionDetailRow[];
  cash_flow?: CashFlowRow[];
  facility_lob_attribution?: FacilityLobAttributionRow[];
  counterparty_financial_snapshot?: CounterpartyFinancialRow[];
  facility_profitability_snapshot?: FacilityProfitabilityRow[];
  amendment_change_detail?: AmendmentChangeDetailRow[];
  exception_event?: ExceptionEventRow[];
  facility_credit_approval?: FacilityCreditApprovalRow[];
  financial_metric_observation?: FinancialMetricObservationRow[];
  netting_set_exposure_snapshot?: NettingSetExposureRow[];
  metric_threshold?: MetricThresholdL2Row[];
}
