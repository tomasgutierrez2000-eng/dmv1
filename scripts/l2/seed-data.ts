/**
 * L2 seed data: 10+ rows per table, GSIB-realistic, aligned to L1 IDs (1..10).
 * facility_id, counterparty_id, credit_agreement_id, collateral_asset_id, limit_rule_id, etc. use 1–10.
 */

const N = 12; // 10+ rows
const AS_OF_DATES = [
  '2025-01-31', '2025-01-30', '2025-01-29', '2025-01-28', '2025-01-27',
  '2025-01-24', '2025-01-23', '2025-01-22', '2025-01-21', '2025-01-20',
  '2025-01-17', '2025-01-16',
];

const DRAWN_AMOUNTS = [120_000_000, 450_000_000, 800_000_000, 0, 275_000_000, 1_200_000_000, 0, 90_000_000, 600_000_000, 2_100_000_000, 350_000_000, 0];
const COMMITTED_AMOUNTS = [250_000_000, 500_000_000, 1_000_000_000, 2_500_000_000, 750_000_000, 1_500_000_000, 3_000_000_000, 400_000_000, 600_000_000, 5_000_000_000, 500_000_000, 1_200_000_000];
const VALUATION_AMOUNTS = [50_000_000, 120_000_000, 85_000_000, 200_000_000, 30_000_000, 450_000_000, 75_000_000, 95_000_000, 110_000_000, 320_000_000, 60_000_000, 140_000_000];
const HAIRCUT_PCTS = [0, 2.5, 4, 15, 25, 0, 5, 8, 12, 20, 3, 6];
const SPREAD_BPS = [175, 250, 325, 200, 400, 150, 275, 225, 300, 125, 350, 190];
const ALL_IN_RATE_PCTS = [6.25, 7.50, 8.25, 6.75, 9.00, 5.75, 7.25, 6.95, 8.00, 5.50, 8.50, 6.40];
const CREDIT_STATUS_CODES = [1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1];
const DAYS_PAST_DUE = [0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 8, 0];
const NII_YTD = [1250, 3200, 5800, 0, 2100, 9200, 0, 450, 4100, 18500, 2200, 800];
const FEE_INCOME_YTD = [85, 120, 250, 50, 90, 400, 30, 60, 180, 600, 110, 75];
const AMENDMENT_TYPE_CODES = ['INCREASE', 'EXTENSION', 'PRICING', 'COVENANT', 'PARTY', 'FACILITY', 'SECURITY', 'OTHER', 'INCREASE', 'EXTENSION', 'PRICING', 'COVENANT'];
const AMENDMENT_STATUS_CODES = ['EFFECTIVE', 'COMPLETED', 'APPROVED', 'EFFECTIVE', 'PENDING', 'COMPLETED', 'EFFECTIVE', 'APPROVED', 'COMPLETED', 'EFFECTIVE', 'PENDING', 'EFFECTIVE'];
const AMENDMENT_EFFECTIVE_DATES = ['2024-11-01', '2024-12-15', '2025-01-01', '2024-10-20', '2025-02-01', '2024-09-01', '2025-01-15', '2024-08-01', '2024-12-01', '2025-01-10', '2025-02-15', '2024-07-15'];
const RISK_FLAG_TYPES = ['CONCENTRATION', 'WATCH_LIST', 'COVENANT_BREACH', 'MATURITY_1Y', 'CONCENTRATION', 'WATCH_LIST', 'SECTOR', 'COUNTRY', 'CONCENTRATION', 'WATCH_LIST', 'MATURITY_1Y', 'SECTOR'];
const LIMIT_AMOUNTS = [500_000_000, 1_000_000_000, 750_000_000, 2_000_000_000, 400_000_000, 1_500_000_000, 600_000_000, 350_000_000, 900_000_000, 3_000_000_000, 550_000_000, 800_000_000];
const UTILIZED_AMOUNTS = [120_000_000, 450_000_000, 0, 1_200_000_000, 100_000_000, 800_000_000, 300_000_000, 50_000_000, 400_000_000, 2_100_000_000, 200_000_000, 350_000_000];
const METRIC_VALUES = [0.42, 1.85, 2.10, 0.95, 3.20, 1.50, 2.75, 0.60, 1.90, 4.00, 1.20, 2.30];

export function getL2SeedValue(
  tableName: string,
  columnName: string,
  rowIndex: number
): string | number | null {
  const idx = rowIndex % N;
  const i = rowIndex + 1;

  switch (tableName) {
    case 'position':
      if (columnName === 'position_id') return i;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'facility_id') return (idx % 10) + 1;
      if (columnName === 'instrument_id') return (idx % 10) + 1;
      if (columnName === 'position_type') return ['LOAN', 'REV', 'COMMIT', 'LOAN', 'REV', 'LOAN', 'COMMIT', 'REV', 'LOAN', 'REV', 'LOAN', 'COMMIT'][idx];
      if (columnName === 'balance_amount') return DRAWN_AMOUNTS[idx];
      if (columnName === 'currency_code') return ['USD', 'EUR', 'USD', 'GBP', 'USD', 'USD', 'EUR', 'USD', 'GBP', 'USD', 'USD', 'EUR'][idx];
      if (columnName === 'source_system_id') return (idx % 10) + 1;
      break;

    case 'position_detail':
      if (columnName === 'position_detail_id') return i;
      if (columnName === 'position_id') return (idx % 12) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'detail_type') return ['PRINCIPAL', 'INTEREST', 'FEE', 'PRINCIPAL', 'INTEREST', 'FEE', 'PRINCIPAL', 'INTEREST', 'FEE', 'PRINCIPAL', 'INTEREST', 'FEE'][idx];
      if (columnName === 'amount') return [100_000, 2500, 500, 200_000, 3200, 800, 150_000, 1800, 400, 300_000, 4000, 600][idx];
      if (columnName === 'maturity_date') return '2027-06-30';
      break;

    case 'exposure_counterparty_attribution':
      if (columnName === 'attribution_id') return i;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'exposure_type_id') return (idx % 10) + 1;
      if (columnName === 'counterparty_id') return (idx % 10) + 1;
      if (columnName === 'exposure_amount') return DRAWN_AMOUNTS[idx];
      if (columnName === 'currency_code') return 'USD';
      break;

    case 'facility_exposure_snapshot':
      if (columnName === 'facility_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'exposure_type_id') return (idx % 10) + 1;
      if (columnName === 'drawn_amount') return DRAWN_AMOUNTS[idx];
      if (columnName === 'committed_amount') return COMMITTED_AMOUNTS[idx];
      if (columnName === 'undrawn_amount') return (COMMITTED_AMOUNTS[idx] ?? 0) - (DRAWN_AMOUNTS[idx] ?? 0);
      if (columnName === 'source_system_id') return (idx % 10) + 1;
      break;

    case 'netting_set_exposure_snapshot':
      if (columnName === 'netting_set_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'netted_exposure_amount') return [10_000_000, 25_000_000, 0, 15_000_000, 40_000_000, 5_000_000, 30_000_000, 0, 20_000_000, 50_000_000, 8_000_000, 12_000_000][idx];
      if (columnName === 'gross_exposure_amount') return [45_000_000, 80_000_000, 22_000_000, 60_000_000, 120_000_000, 35_000_000, 90_000_000, 18_000_000, 70_000_000, 150_000_000, 40_000_000, 55_000_000][idx];
      if (columnName === 'currency_code') return 'USD';
      break;

    case 'facility_lob_attribution':
      if (columnName === 'attribution_id') return i;
      if (columnName === 'facility_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'lob_segment_id') return (idx % 10) + 1;
      if (columnName === 'attribution_pct') return 100;
      if (columnName === 'attributed_amount') return DRAWN_AMOUNTS[idx];
      break;

    case 'collateral_snapshot':
      if (columnName === 'collateral_asset_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'valuation_amount') return VALUATION_AMOUNTS[idx];
      if (columnName === 'haircut_pct') return HAIRCUT_PCTS[idx];
      if (columnName === 'eligible_collateral_amount') return Math.round((VALUATION_AMOUNTS[idx] ?? 0) * (1 - (HAIRCUT_PCTS[idx] ?? 0) / 100));
      if (columnName === 'source_system_id') return (idx % 10) + 1;
      break;

    case 'cash_flow':
      if (columnName === 'cash_flow_id') return i;
      if (columnName === 'facility_id') return (idx % 10) + 1;
      if (columnName === 'cash_flow_date') return AS_OF_DATES[idx];
      if (columnName === 'cash_flow_type') return ['DRAW', 'REPAY', 'INTEREST', 'FEE', 'DRAW', 'REPAY', 'INTEREST', 'FEE', 'DRAW', 'REPAY', 'INTEREST', 'FEE'][idx];
      if (columnName === 'amount') return [5_000_000, -2_000_000, 125_000, 50_000, 10_000_000, -1_500_000, 200_000, 75_000, 3_000_000, -3_000_000, 90_000, 25_000][idx];
      if (columnName === 'currency_code') return 'USD';
      break;

    case 'facility_financial_snapshot':
      if (columnName === 'facility_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'noi_amt') return [8_500_000, 12_200_000, 22_000_000, 0, 6_800_000, 35_000_000, 0, 4_200_000, 15_600_000, 52_000_000, 9_100_000, 0][idx];
      if (columnName === 'total_debt_service_amt') return [5_800_000, 7_200_000, 14_500_000, 0, 5_400_000, 21_000_000, 0, 3_200_000, 9_800_000, 38_000_000, 7_500_000, 0][idx];
      if (columnName === 'revenue_amt') return [14_000_000, 20_000_000, 38_000_000, 0, 12_000_000, 58_000_000, 0, 7_500_000, 26_000_000, 85_000_000, 15_000_000, 0][idx];
      if (columnName === 'operating_expense_amt') return [5_500_000, 7_800_000, 16_000_000, 0, 5_200_000, 23_000_000, 0, 3_300_000, 10_400_000, 33_000_000, 5_900_000, 0][idx];
      if (columnName === 'ebitda_amt') return [10_200_000, 15_000_000, 27_500_000, 0, 8_500_000, 42_000_000, 0, 5_100_000, 19_200_000, 62_000_000, 11_200_000, 0][idx];
      if (columnName === 'interest_expense_amt') return [3_800_000, 5_200_000, 10_500_000, 0, 3_900_000, 15_000_000, 0, 2_100_000, 7_200_000, 28_000_000, 5_500_000, 0][idx];
      if (columnName === 'principal_payment_amt') return [2_000_000, 2_000_000, 4_000_000, 0, 1_500_000, 6_000_000, 0, 1_100_000, 2_600_000, 10_000_000, 2_000_000, 0][idx];
      if (columnName === 'counterparty_id') return (idx % 10) + 1;
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'reporting_period') return ['Q4-2024', 'Q4-2024', 'Q4-2024', 'Q4-2024', 'Q4-2024', 'Q4-2024', 'Q4-2024', 'Q4-2024', 'Q4-2024', 'Q4-2024', 'Q4-2024', 'Q4-2024'][idx];
      break;

    case 'facility_delinquency_snapshot':
      if (columnName === 'facility_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'credit_status_code') return CREDIT_STATUS_CODES[idx];
      if (columnName === 'days_past_due') return DAYS_PAST_DUE[idx];
      if (columnName === 'watch_list_flag') return CREDIT_STATUS_CODES[idx] === 2 ? 'Y' : 'N';
      break;

    case 'facility_pricing_snapshot':
      if (columnName === 'facility_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'spread_bps') return SPREAD_BPS[idx];
      if (columnName === 'rate_index_id') return (idx % 10) + 1;
      if (columnName === 'all_in_rate_pct') return ALL_IN_RATE_PCTS[idx];
      if (columnName === 'floor_pct') return [0, 0, 0.25, 0, 0.50, 0, 0.25, 0, 0, 0, 0.25, 0][idx];
      break;

    case 'facility_profitability_snapshot':
      if (columnName === 'facility_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'nii_ytd') return NII_YTD[idx];
      if (columnName === 'fee_income_ytd') return FEE_INCOME_YTD[idx];
      if (columnName === 'ledger_account_id') return (idx % 10) + 1;
      break;

    case 'limit_contribution_snapshot':
      if (columnName === 'limit_rule_id') return (idx % 10) + 1;
      if (columnName === 'counterparty_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'contribution_amount') return [120_000_000, 450_000_000, 0, 200_000_000, 100_000_000, 800_000_000, 300_000_000, 50_000_000, 400_000_000, 1_500_000_000, 200_000_000, 350_000_000][idx];
      if (columnName === 'currency_code') return 'USD';
      break;

    case 'limit_utilization_event':
      if (columnName === 'limit_rule_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'counterparty_id') return (idx % 10) + 1;
      if (columnName === 'utilized_amount') return UTILIZED_AMOUNTS[idx];
      if (columnName === 'available_amount') return (LIMIT_AMOUNTS[idx] ?? 0) - (UTILIZED_AMOUNTS[idx] ?? 0);
      break;

    case 'amendment_change_detail':
      if (columnName === 'change_detail_id') return i;
      if (columnName === 'amendment_id') return (idx % 12) + 1;
      if (columnName === 'change_type') return ['COMMITMENT', 'PRICING', 'MATURITY', 'COVENANT', 'PARTY', 'COMMITMENT', 'PRICING', 'MATURITY', 'COVENANT', 'PARTY', 'COMMITMENT', 'PRICING'][idx];
      if (columnName === 'old_value') return 'Prior value';
      if (columnName === 'new_value') return 'New value';
      break;

    case 'amendment_event':
      if (columnName === 'amendment_id') return i;
      if (columnName === 'facility_id') return (idx % 10) + 1;
      if (columnName === 'credit_agreement_id') return (idx % 10) + 1;
      if (columnName === 'amendment_type_code') return AMENDMENT_TYPE_CODES[idx];
      if (columnName === 'amendment_status_code') return AMENDMENT_STATUS_CODES[idx];
      if (columnName === 'effective_date') return AMENDMENT_EFFECTIVE_DATES[idx];
      if (columnName === 'event_ts') return '2025-01-15 14:30:00';
      break;

    case 'credit_event':
      if (columnName === 'credit_event_id') return i;
      if (columnName === 'counterparty_id') return (idx % 10) + 1;
      if (columnName === 'credit_event_type_code') return (idx % 10) + 1;
      if (columnName === 'event_date') return AS_OF_DATES[idx];
      if (columnName === 'event_ts') return '2025-01-15 10:00:00';
      if (columnName === 'default_definition_id') return (idx % 10) + 1;
      break;

    case 'credit_event_facility_link':
      if (columnName === 'link_id') return i;
      if (columnName === 'credit_event_id') return (idx % 12) + 1;
      if (columnName === 'facility_id') return (idx % 10) + 1;
      if (columnName === 'exposure_at_default') return DRAWN_AMOUNTS[idx];
      break;

    case 'stress_test_breach':
      if (columnName === 'breach_id') return i;
      if (columnName === 'scenario_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'limit_rule_id') return (idx % 10) + 1;
      if (columnName === 'counterparty_id') return (idx % 10) + 1;
      if (columnName === 'breach_amount') return [5_000_000, 0, 12_000_000, 0, 3_000_000, 0, 8_000_000, 0, 0, 15_000_000, 0, 2_000_000][idx];
      break;

    case 'stress_test_result':
      if (columnName === 'result_id') return i;
      if (columnName === 'scenario_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'portfolio_id') return (idx % 10) + 1;
      if (columnName === 'loss_amount') return [10_000_000, 25_000_000, 5_000_000, 50_000_000, 15_000_000, 30_000_000, 8_000_000, 40_000_000, 12_000_000, 60_000_000, 7_000_000, 20_000_000][idx];
      if (columnName === 'pnl_impact') return [-10_000_000, -25_000_000, -5_000_000, -50_000_000, -15_000_000, -30_000_000, -8_000_000, -40_000_000, -12_000_000, -60_000_000, -7_000_000, -20_000_000][idx];
      break;

    case 'deal_pipeline_fact':
      if (columnName === 'pipeline_id') return i;
      if (columnName === 'counterparty_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'stage_code') return ['PITCH', 'TERM_SHEET', 'DOCS', 'CLOSING', 'PITCH', 'TERM_SHEET', 'DOCS', 'CLOSING', 'PITCH', 'TERM_SHEET', 'DOCS', 'CLOSING'][idx];
      if (columnName === 'proposed_amount') return [100_000_000, 250_000_000, 500_000_000, 75_000_000, 300_000_000, 150_000_000, 400_000_000, 80_000_000, 200_000_000, 600_000_000, 90_000_000, 350_000_000][idx];
      if (columnName === 'currency_code') return 'USD';
      break;

    case 'counterparty_rating_observation':
      if (columnName === 'observation_id') return i;
      if (columnName === 'counterparty_id') return (idx % 10) + 1;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'rating_grade_id') return (idx % 10) + 1;
      if (columnName === 'rating_source_id') return (idx % 10) + 1;
      if (columnName === 'is_internal_flag') return idx % 2 === 0 ? 'Y' : 'N';
      break;

    case 'financial_metric_observation':
      if (columnName === 'observation_id') return i;
      if (columnName === 'counterparty_id') return idx % 2 === 0 ? (idx % 10) + 1 : null;
      if (columnName === 'facility_id') return idx % 2 === 1 ? (idx % 10) + 1 : null;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'metric_definition_id') return (idx % 10) + 1;
      if (columnName === 'value') return METRIC_VALUES[idx];
      if (columnName === 'context_id') return (idx % 10) + 1;
      break;

    case 'metric_threshold':
      if (columnName === 'threshold_id') return i;
      if (columnName === 'metric_definition_id') return (idx % 10) + 1;
      if (columnName === 'threshold_type') return ['MIN', 'MAX', 'MIN', 'MAX', 'MIN', 'MAX', 'MIN', 'MAX', 'MIN', 'MAX', 'MIN', 'MAX'][idx];
      if (columnName === 'threshold_value') return [0.5, 2.0, 1.0, 3.0, 0.25, 1.5, 0.75, 2.5, 0.1, 4.0, 1.25, 3.5][idx];
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return null;
      break;

    case 'exception_event':
      if (columnName === 'exception_id') return i;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'exception_type') return ['MISSING_DATA', 'OUT_OF_RANGE', 'DUPLICATE', 'MISSING_DATA', 'OUT_OF_RANGE', 'DUPLICATE', 'MISSING_DATA', 'OUT_OF_RANGE', 'DUPLICATE', 'MISSING_DATA', 'OUT_OF_RANGE', 'DUPLICATE'][idx];
      if (columnName === 'facility_id') return idx % 2 === 0 ? (idx % 10) + 1 : null;
      if (columnName === 'counterparty_id') return idx % 2 === 1 ? (idx % 10) + 1 : null;
      if (columnName === 'raised_ts') return '2025-01-15 09:00:00';
      if (columnName === 'resolved_ts') return idx % 3 === 0 ? '2025-01-15 14:00:00' : null;
      break;

    case 'risk_flag':
      if (columnName === 'risk_flag_id') return i;
      if (columnName === 'facility_id') return idx % 2 === 0 ? (idx % 10) + 1 : null;
      if (columnName === 'counterparty_id') return idx % 2 === 1 ? (idx % 10) + 1 : null;
      if (columnName === 'flag_type') return RISK_FLAG_TYPES[idx];
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'raised_ts') return '2025-01-10 09:00:00';
      if (columnName === 'cleared_ts') return idx % 3 === 0 ? '2025-01-14 16:00:00' : null;
      break;

    case 'data_quality_score_snapshot':
      if (columnName === 'score_id') return i;
      if (columnName === 'as_of_date') return AS_OF_DATES[idx];
      if (columnName === 'target_table') return ['facility_master', 'counterparty', 'collateral_asset_master', 'facility_master', 'counterparty', 'collateral_asset_master', 'facility_master', 'counterparty', 'facility_master', 'counterparty', 'facility_master', 'counterparty'][idx];
      if (columnName === 'source_system_id') return (idx % 10) + 1;
      if (columnName === 'completeness_pct') return [98.5, 99.2, 97.8, 99.0, 98.0, 99.5, 97.0, 98.8, 99.1, 96.5, 98.2, 99.8][idx];
      if (columnName === 'validity_pct') return [99.0, 98.5, 99.2, 97.8, 99.0, 98.0, 99.5, 97.0, 98.8, 99.1, 96.5, 98.2][idx];
      if (columnName === 'overall_score') return [98.8, 98.9, 98.5, 98.4, 98.5, 98.8, 98.2, 97.9, 98.9, 97.8, 97.4, 99.0][idx];
      break;
  }

  return null;
}
