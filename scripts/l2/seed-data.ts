/**
 * L2 seed data: 12 rows per table, GSIB-realistic, aligned to L1 IDs (1..10).
 * facility_id, counterparty_id, credit_agreement_id, collateral_asset_id, limit_rule_id, etc. use 1–10.
 *
 * EVERY column must be handled here to avoid fallback placeholder values (100.5 / column_name_N).
 * All as_of_date values are 2025-01-31 per SEED_CONVENTIONS.md.
 */

const N = 12; // rows per table
const AS_OF = '2025-01-31';

// --- Shared reference arrays (aligned to facility_id 1..10, with 11/12 cycling back) ---
const DRAWN = [120_000_000, 450_000_000, 800_000_000, 0, 275_000_000, 1_200_000_000, 0, 90_000_000, 600_000_000, 2_100_000_000, 350_000_000, 0];
const COMMITTED = [250_000_000, 500_000_000, 1_000_000_000, 2_500_000_000, 750_000_000, 1_500_000_000, 3_000_000_000, 400_000_000, 600_000_000, 5_000_000_000, 500_000_000, 1_200_000_000];
const CURRENCIES = ['USD', 'EUR', 'USD', 'GBP', 'USD', 'USD', 'EUR', 'USD', 'GBP', 'USD', 'USD', 'EUR'];
const POS_TYPES = ['LOAN', 'REV', 'COMMIT', 'LOAN', 'REV', 'LOAN', 'COMMIT', 'REV', 'LOAN', 'REV', 'LOAN', 'COMMIT'];
const SPREADS = [175, 250, 325, 200, 400, 150, 275, 225, 300, 125, 350, 190];
const ALL_IN_RATES = [6.25, 7.50, 8.25, 6.75, 9.00, 5.75, 7.25, 6.95, 8.00, 5.50, 8.50, 6.40];
const BASE_RATES = [4.50, 5.00, 4.95, 4.75, 5.00, 4.25, 4.50, 4.70, 5.00, 4.25, 5.00, 4.50];
const PD_ESTIMATES = [0.0042, 0.0185, 0.0025, 0.0095, 0.0320, 0.0015, 0.0275, 0.0060, 0.0190, 0.0008, 0.0120, 0.0230];
const LGD_ESTIMATES = [0.45, 0.40, 0.35, 0.50, 0.45, 0.40, 0.55, 0.38, 0.42, 0.48, 0.44, 0.41];
const RISK_WEIGHTS = [100, 75, 50, 150, 100, 75, 125, 50, 100, 100, 75, 100];
const CREDIT_STATUS = ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING'];
const CREDIT_STATUS_IDS = [1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1];
const DPD = [0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 8, 0];
const INTERNAL_RATINGS = ['A+', 'BBB+', 'AA-', 'BB', 'B+', 'AA', 'B-', 'BBB', 'BB+', 'AAA', 'BBB-', 'BB-'];
const EXTERNAL_RATINGS = ['A1', 'Baa1', 'Aa3', 'Ba2', 'B1', 'Aa2', 'B3', 'Baa2', 'Ba1', 'Aaa', 'Baa3', 'Ba3'];
const MATURITY_DATES = ['2027-06-30', '2028-03-15', '2026-12-20', '2029-09-30', '2027-01-15', '2030-06-30', '2026-04-30', '2028-11-15', '2027-08-30', '2031-12-31', '2027-03-15', '2028-06-30'];
const ORIGINATION_DATES = ['2022-06-15', '2021-11-20', '2023-01-10', '2020-09-01', '2022-03-25', '2019-06-15', '2023-07-01', '2022-01-10', '2021-08-15', '2018-12-01', '2022-10-01', '2021-05-15'];
const VALUATION_AMTS = [50_000_000, 120_000_000, 85_000_000, 200_000_000, 30_000_000, 450_000_000, 75_000_000, 95_000_000, 110_000_000, 320_000_000, 60_000_000, 140_000_000];
const HAIRCUTS = [0, 2.5, 4, 15, 25, 0, 5, 8, 12, 20, 3, 6];
const CRM_TYPES = ['CASH', 'REAL_ESTATE', 'RECEIVABLES', 'EQUIPMENT', 'INVENTORY', 'CASH', 'SECURITIES', 'REAL_ESTATE', 'RECEIVABLES', 'SECURITIES', 'CASH', 'REAL_ESTATE'];
const MITIGANT_GROUPS = ['FINANCIAL', 'PHYSICAL', 'RECEIVABLE', 'PHYSICAL', 'PHYSICAL', 'FINANCIAL', 'FINANCIAL', 'PHYSICAL', 'RECEIVABLE', 'FINANCIAL', 'FINANCIAL', 'PHYSICAL'];
const MITIGANT_SUBTYPES = ['CASH_DEPOSIT', 'CRE', 'AR_POOL', 'MACHINERY', 'RAW_MATERIAL', 'CASH_DEPOSIT', 'GOVT_BOND', 'INDUSTRIAL', 'AR_POOL', 'EQUITY', 'CASH_DEPOSIT', 'RESIDENTIAL'];
const LIMIT_AMTS = [500_000_000, 1_000_000_000, 750_000_000, 2_000_000_000, 400_000_000, 1_500_000_000, 600_000_000, 350_000_000, 900_000_000, 3_000_000_000, 550_000_000, 800_000_000];
const UTILIZED = [120_000_000, 450_000_000, 0, 1_200_000_000, 100_000_000, 800_000_000, 300_000_000, 50_000_000, 400_000_000, 2_100_000_000, 200_000_000, 350_000_000];
const AMENDMENT_TYPES = ['INCREASE', 'EXTENSION', 'PRICING', 'COVENANT', 'PARTY', 'FACILITY', 'SECURITY', 'OTHER', 'INCREASE', 'EXTENSION', 'PRICING', 'COVENANT'];
const AMENDMENT_STATUSES = ['EFFECTIVE', 'COMPLETED', 'APPROVED', 'EFFECTIVE', 'PENDING', 'COMPLETED', 'EFFECTIVE', 'APPROVED', 'COMPLETED', 'EFFECTIVE', 'PENDING', 'EFFECTIVE'];
const AMENDMENT_EFF_DATES = ['2024-11-01', '2024-12-15', '2025-01-01', '2024-10-20', '2025-02-01', '2024-09-01', '2025-01-15', '2024-08-01', '2024-12-01', '2025-01-10', '2025-02-15', '2024-07-15'];
const RISK_FLAGS = ['CONCENTRATION', 'WATCH_LIST', 'COVENANT_BREACH', 'MATURITY_1Y', 'CONCENTRATION', 'WATCH_LIST', 'SECTOR', 'COUNTRY', 'CONCENTRATION', 'WATCH_LIST', 'MATURITY_1Y', 'SECTOR'];
const LOB_NAMES = ['IB_LEVERAGED', 'IB_IG', 'CRE_OFFICE', 'CRE_MULTI', 'ABL_RETAIL', 'IB_IG', 'MM_SPONSOR', 'ABL_HEALTHCARE', 'IB_LEVERAGED', 'IB_IG', 'CRE_INDUSTRIAL', 'MM_SPONSOR'];
const FR2590_CATS = ['C&I', 'C&I', 'CRE', 'CRE', 'C&I', 'C&I', 'C&I', 'C&I', 'C&I', 'C&I', 'C&I', 'CRE'];
const EXPOSURE_TYPES = ['FUNDED', 'FUNDED', 'UNFUNDED', 'FUNDED', 'FUNDED', 'FUNDED', 'UNFUNDED', 'FUNDED', 'FUNDED', 'FUNDED', 'FUNDED', 'UNFUNDED'];
const PIPELINE_STAGES = ['PITCH', 'TERM_SHEET', 'DOCS', 'CLOSING', 'PITCH', 'TERM_SHEET', 'DOCS', 'CLOSING', 'PITCH', 'TERM_SHEET', 'DOCS', 'CLOSING'];
const PROPOSED_AMTS = [100_000_000, 250_000_000, 500_000_000, 75_000_000, 300_000_000, 150_000_000, 400_000_000, 80_000_000, 200_000_000, 600_000_000, 90_000_000, 350_000_000];
const METRIC_CODES = ['PD', 'LGD', 'EL', 'RWA', 'CAPITAL_REQ', 'PD', 'LGD', 'EL', 'RWA', 'CAPITAL_REQ', 'PD', 'LGD'];
const METRIC_NAMES = ['Probability of Default', 'Loss Given Default', 'Expected Loss', 'Risk-Weighted Assets', 'Capital Requirement', 'Probability of Default', 'Loss Given Default', 'Expected Loss', 'Risk-Weighted Assets', 'Capital Requirement', 'Probability of Default', 'Loss Given Default'];
const METRIC_CATS = ['CREDIT_QUALITY', 'CREDIT_QUALITY', 'LOSS', 'CAPITAL', 'CAPITAL', 'CREDIT_QUALITY', 'CREDIT_QUALITY', 'LOSS', 'CAPITAL', 'CAPITAL', 'CREDIT_QUALITY', 'CREDIT_QUALITY'];
const METRIC_VALS = [0.42, 1.85, 2.10, 0.95, 3.20, 1.50, 2.75, 0.60, 1.90, 4.00, 1.20, 2.30];
const METRIC_USD_VALS = [420_000, 1_850_000, 2_100_000, 950_000, 3_200_000, 1_500_000, 2_750_000, 600_000, 1_900_000, 4_000_000, 1_200_000, 2_300_000];

// Netting set data
const NETTED_EXP = [10_000_000, 25_000_000, 0, 15_000_000, 40_000_000, 5_000_000, 30_000_000, 0, 20_000_000, 50_000_000, 8_000_000, 12_000_000];
const GROSS_EXP = [45_000_000, 80_000_000, 22_000_000, 60_000_000, 120_000_000, 35_000_000, 90_000_000, 18_000_000, 70_000_000, 150_000_000, 40_000_000, 55_000_000];
const NETTING_BENEFIT = [35_000_000, 55_000_000, 22_000_000, 45_000_000, 80_000_000, 30_000_000, 60_000_000, 18_000_000, 50_000_000, 100_000_000, 32_000_000, 43_000_000];
const COLL_HELD = [5_000_000, 12_000_000, 8_000_000, 20_000_000, 15_000_000, 3_000_000, 25_000_000, 6_000_000, 10_000_000, 30_000_000, 7_000_000, 9_000_000];
const GROSS_MTM = [42_000_000, 75_000_000, 18_000_000, 55_000_000, 115_000_000, 32_000_000, 85_000_000, 15_000_000, 65_000_000, 140_000_000, 38_000_000, 50_000_000];
const PFE_USD = [8_000_000, 15_000_000, 4_000_000, 12_000_000, 22_000_000, 6_000_000, 18_000_000, 3_000_000, 14_000_000, 28_000_000, 7_000_000, 10_000_000];

// Stress test data
const STRESS_LOSS = [10_000_000, 25_000_000, 5_000_000, 50_000_000, 15_000_000, 30_000_000, 8_000_000, 40_000_000, 12_000_000, 60_000_000, 7_000_000, 20_000_000];
const BREACH_AMTS = [5_000_000, 0, 12_000_000, 0, 3_000_000, 0, 8_000_000, 0, 0, 15_000_000, 0, 2_000_000];
const SCENARIO_TYPES = ['BASELINE', 'ADVERSE', 'SEVERELY_ADVERSE', 'BASELINE', 'ADVERSE', 'SEVERELY_ADVERSE', 'BASELINE', 'ADVERSE', 'SEVERELY_ADVERSE', 'BASELINE', 'ADVERSE', 'SEVERELY_ADVERSE'];
const SCENARIO_STATUSES = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED'];
const BREACH_SEVERITIES = ['LOW', 'NONE', 'HIGH', 'NONE', 'MEDIUM', 'NONE', 'HIGH', 'NONE', 'NONE', 'CRITICAL', 'NONE', 'LOW'];

// Credit event data
const CE_EVENT_TYPES = ['PAYMENT_DEFAULT', 'COVENANT_BREACH', 'CROSS_DEFAULT', 'BANKRUPTCY', 'RESTRUCTURING', 'PAYMENT_DEFAULT', 'RATING_DOWNGRADE', 'COVENANT_BREACH', 'PAYMENT_DEFAULT', 'CROSS_DEFAULT', 'COVENANT_BREACH', 'RESTRUCTURING'];
const CE_EVENT_STATUSES = ['OPEN', 'RESOLVED', 'OPEN', 'OPEN', 'RESOLVED', 'RESOLVED', 'OPEN', 'RESOLVED', 'OPEN', 'OPEN', 'RESOLVED', 'RESOLVED'];
const CE_LOSS = [2_400_000, 0, 8_000_000, 0, 0, 0, 0, 0, 6_000_000, 21_000_000, 0, 0];
const CE_RECOVERY = [1_200_000, 0, 3_200_000, 0, 0, 0, 0, 0, 2_400_000, 5_250_000, 0, 0];
const CE_RATINGS = ['B-', 'BB', 'B+', 'CCC', 'B', 'BBB-', 'BB-', 'BB+', 'B-', 'CCC+', 'BB-', 'BB'];
const CE_SUMMARIES = [
  'Missed Q4 principal payment on Term Loan A',
  'DSCR fell below 1.10x covenant threshold',
  'Triggered by subsidiary default under separate facility',
  'Filed Chapter 11 voluntary petition',
  'Amended to extend maturity and reduce spread',
  'Interest payment 30 days overdue, cured Jan-10',
  "Moody's downgrade from Ba2 to B1",
  'Leverage ratio exceeded 5.5x maximum',
  'Failed to make scheduled amortization payment',
  'Cross-default triggered by missed bond payment',
  'Fixed charge coverage ratio below 1.0x',
  'Debt-for-equity swap completed Dec-2024',
];

// Deal pipeline data
const EXPECTED_CLOSE_DATES = ['2025-03-15', '2025-04-30', '2025-02-28', '2025-02-15', '2025-06-30', '2025-05-15', '2025-03-31', '2025-02-20', '2025-07-15', '2025-04-15', '2025-03-01', '2025-02-28'];
const EXPECTED_SPREADS = [200, 175, 250, 150, 325, 200, 275, 175, 225, 150, 300, 225];
const EXPECTED_TENORS = ['60', '84', '48', '36', '60', '84', '72', '36', '60', '120', '48', '60'];
const EXPECTED_GRADES = ['BBB+', 'A-', 'BBB', 'A+', 'BB+', 'A', 'BBB-', 'A+', 'BBB', 'AA-', 'BB+', 'BBB-'];
const PIPELINE_STATUSES = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'CLOSING', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'CLOSING', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'CLOSING'];

// Exception event data
const EXCEPTION_TYPES = ['MISSING_DATA', 'OUT_OF_RANGE', 'DUPLICATE', 'MISSING_DATA', 'OUT_OF_RANGE', 'DUPLICATE', 'MISSING_DATA', 'OUT_OF_RANGE', 'DUPLICATE', 'MISSING_DATA', 'OUT_OF_RANGE', 'DUPLICATE'];
const EXCEPTION_SEVS = ['LOW', 'MEDIUM', 'LOW', 'HIGH', 'MEDIUM', 'LOW', 'HIGH', 'MEDIUM', 'LOW', 'CRITICAL', 'MEDIUM', 'LOW'];
const EXCEPTION_STATUSES = ['RESOLVED', 'OPEN', 'RESOLVED', 'ESCALATED', 'OPEN', 'RESOLVED', 'ESCALATED', 'OPEN', 'RESOLVED', 'ESCALATED', 'OPEN', 'RESOLVED'];
const EXCEPTION_DESCS = [
  'Missing LGD estimate for facility 1',
  'PD value 32% exceeds upper bound for IG counterparty',
  'Duplicate collateral record for asset 3',
  'Missing financial statements for Q3-2024',
  'Spread 400bps outside expected range for BB+ credit',
  'Duplicate position entry from source system',
  'Missing rating observation for counterparty 7',
  'DSCR value 0.6x below minimum threshold',
  'Duplicate cash flow record for facility 9',
  'Missing collateral valuation for $2.1B exposure',
  'LTV ratio 185% exceeds policy maximum 100%',
  'Duplicate amendment record corrected',
];
const EXCEPTION_OWNERS = ['Credit Risk Analytics', 'Portfolio Management', 'Data Operations', 'Credit Review', 'Risk Management', 'Data Operations', 'Credit Risk Analytics', 'Portfolio Management', 'Data Operations', 'Credit Review', 'Risk Management', 'Data Operations'];
const BREACH_AMTS_EX = [0, 2_750_000, 0, 0, 5_500_000, 0, 0, 1_200_000, 0, 21_000_000, 8_500_000, 0];
const BREACH_PCTS_EX = [0, 8.5, 0, 0, 15.2, 0, 0, 4.1, 0, 42.0, 22.0, 0];
const DAYS_OPEN = [3, 12, 1, 18, 8, 2, 21, 5, 1, 30, 10, 2];
const REMED_PLANS = [
  'Source system fix deployed, re-extract pending',
  'Manual override pending credit officer review',
  'Duplicate removed in batch reconciliation',
  'Escalated to RM for financial statement collection',
  'Pricing review with syndications desk',
  'Dedup script scheduled for next processing cycle',
  'Rating model re-run requested from CRA team',
  'Covenant waiver request submitted to credit committee',
  'Source system dedup completed',
  'Emergency collateral revaluation ordered',
  'LTV limit exception approval in progress',
  'Automated dedup rule added to prevent recurrence',
];

// Risk flag data
const FLAG_CODES = ['CONC_01', 'WL_02', 'COV_03', 'MAT_04', 'CONC_05', 'WL_06', 'SEC_07', 'CTY_08', 'CONC_09', 'WL_10', 'MAT_11', 'SEC_12'];
const FLAG_DESCS = [
  'Single-name concentration exceeds 5% of Tier 1 capital',
  'Added to internal watch list - deteriorating financials',
  'Leverage covenant breach: 6.2x vs 5.5x max',
  'Facility matures within 12 months, refinancing risk',
  'Industry concentration in TMT exceeds 15% limit',
  "Downgrade watch - negative outlook from Moody's",
  'Energy sector exposure above risk appetite threshold',
  'UK country risk elevated post macro deterioration',
  'Top 10 borrower concentration above policy limit',
  'Added to SNC criticized list',
  'Bridge loan maturity approaching, takeout uncertain',
  'Healthcare sector stress from regulatory changes',
];
const FLAG_SCOPES = ['COUNTERPARTY', 'COUNTERPARTY', 'FACILITY', 'FACILITY', 'PORTFOLIO', 'COUNTERPARTY', 'PORTFOLIO', 'PORTFOLIO', 'COUNTERPARTY', 'COUNTERPARTY', 'FACILITY', 'PORTFOLIO'];
const FLAG_SEVS = ['HIGH', 'MEDIUM', 'HIGH', 'MEDIUM', 'HIGH', 'LOW', 'MEDIUM', 'LOW', 'HIGH', 'HIGH', 'MEDIUM', 'LOW'];
const FLAG_TRIGGERS = [5.2, 0, 6.2, 11, 16.3, 0, 12.1, 0, 8.4, 0, 8, 0];

// DQ score data
const DQ_DIMS = ['COMPLETENESS', 'VALIDITY', 'TIMELINESS', 'COMPLETENESS', 'VALIDITY', 'TIMELINESS', 'COMPLETENESS', 'VALIDITY', 'COMPLETENESS', 'VALIDITY', 'COMPLETENESS', 'VALIDITY'];
const DQ_SCORE_DIMS = ['COMPLETENESS', 'VALIDITY', 'TIMELINESS', 'COMPLETENESS', 'VALIDITY', 'TIMELINESS', 'COMPLETENESS', 'VALIDITY', 'COMPLETENESS', 'VALIDITY', 'COMPLETENESS', 'VALIDITY'];
const DQ_IMPACT_PCTS = [2.1, 1.5, 3.2, 1.0, 2.5, 0.8, 4.0, 3.5, 1.2, 5.0, 2.8, 0.5];
const DQ_REPORT_CODES = ['FR_Y14Q', 'FR_Y14Q,CCAR', 'FR_Y14Q', 'DFAST', 'FR_Y14Q', 'CCAR', 'FR_Y14Q,DFAST', 'CCAR', 'FR_Y14Q', 'CCAR,DFAST', 'FR_Y14Q', 'FR_Y14Q'];
const DQ_ISSUE_COUNTS = [3, 7, 12, 2, 5, 1, 15, 8, 4, 18, 6, 1];
const DQ_RECON_BREAKS = [0, 2, 4, 0, 1, 0, 5, 3, 1, 8, 2, 0];

/** Helper to get a facility_id in 1..10 range */
function fid(idx: number): number { return (idx % 10) + 1; }
function cid(idx: number): number { return (idx % 10) + 1; }

export function getL2SeedValue(
  tableName: string,
  columnName: string,
  rowIndex: number
): string | number | null | undefined {
  const idx = rowIndex % N;
  const i = rowIndex + 1;

  switch (tableName) {
    // ═══════════════════════════════════════════════════════════════════
    // POSITION
    // ═══════════════════════════════════════════════════════════════════
    case 'position':
      if (columnName === 'position_id') return i;
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'instrument_id') return fid(idx);
      if (columnName === 'position_type') return POS_TYPES[idx];
      if (columnName === 'balance_amount') return DRAWN[idx];
      if (columnName === 'currency_code') return CURRENCIES[idx];
      if (columnName === 'source_system_id') return fid(idx);
      if (columnName === 'accrued_interest_amt') return [425_000, 1_875_000, 2_200_000, 0, 1_031_250, 5_750_000, 0, 260_625, 2_000_000, 9_625_000, 1_239_583, 0][idx];
      if (columnName === 'book_value_amt') return DRAWN[idx];
      if (columnName === 'contractual_maturity_date') return MATURITY_DATES[idx];
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'credit_agreement_id') return fid(idx);
      if (columnName === 'credit_status_code') return CREDIT_STATUS[idx];
      if (columnName === 'effective_date') return ORIGINATION_DATES[idx];
      if (columnName === 'exposure_type_code') return EXPOSURE_TYPES[idx];
      if (columnName === 'external_risk_rating') return EXTERNAL_RATINGS[idx];
      if (columnName === 'internal_risk_rating') return INTERNAL_RATINGS[idx];
      if (columnName === 'legal_entity_id') return 1;
      if (columnName === 'lgd_estimate') return String(LGD_ESTIMATES[idx]);
      if (columnName === 'market_value_amt') return DRAWN[idx];
      if (columnName === 'netting_set_id') return fid(idx);
      if (columnName === 'notional_amount') return COMMITTED[idx];
      if (columnName === 'pd_estimate') return String(PD_ESTIMATES[idx]);
      if (columnName === 'position_currency') return CURRENCIES[idx];
      if (columnName === 'trading_banking_book_flag') return 'B';
      if (columnName === 'ultimate_parent_id') return cid(idx);
      break;

    // ═══════════════════════════════════════════════════════════════════
    // POSITION_DETAIL
    // ═══════════════════════════════════════════════════════════════════
    case 'position_detail': {
      const detailTypes = ['PRINCIPAL', 'INTEREST', 'FEE', 'PRINCIPAL', 'INTEREST', 'FEE', 'PRINCIPAL', 'INTEREST', 'FEE', 'PRINCIPAL', 'INTEREST', 'FEE'];
      if (columnName === 'position_detail_id') return i;
      if (columnName === 'position_id') return (idx % 12) + 1;
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'detail_type') return detailTypes[idx];
      if (columnName === 'amount') return [100_000, 2_500, 500, 200_000, 3_200, 800, 150_000, 1_800, 400, 300_000, 4_000, 600][idx];
      if (columnName === 'maturity_date') return MATURITY_DATES[idx];
      if (columnName === 'cash_leg_amount') return detailTypes[idx] === 'PRINCIPAL' ? DRAWN[idx] : 0;
      if (columnName === 'ccf') return [1.0, 0.75, 0.5, 1.0, 0.75, 0.5, 1.0, 0.75, 0.5, 1.0, 0.75, 0.5][idx];
      if (columnName === 'current_balance') return DRAWN[idx];
      if (columnName === 'days_past_due') return DPD[idx];
      if (columnName === 'delinquency_status') return CREDIT_STATUS[idx];
      if (columnName === 'derivative_type') return undefined; // N/A for loans
      if (columnName === 'fair_value') return DRAWN[idx];
      if (columnName === 'funded_amount') return DRAWN[idx];
      if (columnName === 'haircut_applied_pct') return HAIRCUTS[idx];
      if (columnName === 'insured_balance') return 0;
      if (columnName === 'interest_rate') return ALL_IN_RATES[idx] / 100;
      if (columnName === 'mark_to_market') return DRAWN[idx];
      if (columnName === 'origination_date') return ORIGINATION_DATES[idx];
      if (columnName === 'pfe') return undefined; // N/A for loans
      if (columnName === 'quantity') return 1;
      if (columnName === 'rate_index') return BASE_RATES[idx] / 100;
      if (columnName === 'rate_type') return 'F'; // F=floating
      if (columnName === 'replacement_cost') return 0;
      if (columnName === 'sft_type') return undefined; // N/A for loans
      if (columnName === 'spread_bps') return SPREADS[idx];
      if (columnName === 'total_commitment') return COMMITTED[idx];
      if (columnName === 'unfunded_amount') return Math.max(0, (COMMITTED[idx] ?? 0) - (DRAWN[idx] ?? 0));
      if (columnName === 'unrealized_gain_loss') return '0';
      if (columnName === 'product_node_id') return fid(idx);
      if (columnName === 'exposure_type_code') return 'LOAN';
      if (columnName === 'notional_amount') return DRAWN[idx];
      if (columnName === 'credit_conversion_factor') return 1.0;
      if (columnName === 'lgd_pct') return LGD_ESTIMATES[idx] * 100;
      if (columnName === 'risk_weight_pct') return RISK_WEIGHTS[idx];
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXPOSURE_COUNTERPARTY_ATTRIBUTION
    // ═══════════════════════════════════════════════════════════════════
    case 'exposure_counterparty_attribution':
      if (columnName === 'attribution_id') return i;
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'exposure_type_id') return fid(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'exposure_amount') return DRAWN[idx];
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'attributed_exposure_usd') return DRAWN[idx];
      if (columnName === 'attribution_pct') return 100.00;
      if (columnName === 'counterparty_role_code') return 'BORROWER';
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'is_risk_shifted_flag') return 'N';
      if (columnName === 'risk_shifted_from_counterparty_id') return undefined; // no risk shift
      break;

    // ═══════════════════════════════════════════════════════════════════
    // FACILITY_EXPOSURE_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'facility_exposure_snapshot': {
      const drawn = DRAWN[idx] ?? 0;
      const committed = COMMITTED[idx] ?? 0;
      const undrawn = Math.max(0, committed - drawn);
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'exposure_type_id') return fid(idx);
      if (columnName === 'drawn_amount') return drawn;
      if (columnName === 'committed_amount') return committed;
      if (columnName === 'undrawn_amount') return undrawn;
      if (columnName === 'source_system_id') return fid(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'coverage_ratio_pct') return drawn > 0 ? Math.round((VALUATION_AMTS[idx] ?? 0) / drawn * 100 * 100) / 100 : 0;
      if (columnName === 'currency_code') return CURRENCIES[idx];
      if (columnName === 'exposure_amount_local') return drawn;
      if (columnName === 'facility_exposure_id') return i;
      if (columnName === 'fr2590_category_code') return FR2590_CATS[idx];
      if (columnName === 'gross_exposure_usd') return committed;
      if (columnName === 'legal_entity_id') return 1;
      if (columnName === 'lob_segment_id') return fid(idx);
      if (columnName === 'net_exposure_usd') return Math.max(0, drawn - (VALUATION_AMTS[idx] ?? 0));
      if (columnName === 'product_node_id') return fid(idx);
      if (columnName === 'outstanding_balance_amt') return drawn;
      if (columnName === 'undrawn_commitment_amt') return undrawn;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // NETTING_SET_EXPOSURE_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'netting_set_exposure_snapshot':
      if (columnName === 'netting_set_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'netted_exposure_amount') return NETTED_EXP[idx];
      if (columnName === 'gross_exposure_amount') return GROSS_EXP[idx];
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'collateral_held_usd') return COLL_HELD[idx];
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'gross_mtm_usd') return GROSS_MTM[idx];
      if (columnName === 'legal_entity_id') return 1;
      if (columnName === 'netting_set_exposure_id') return i;
      if (columnName === 'pfe_usd') return PFE_USD[idx];
      if (columnName === 'netting_benefit_amt') return NETTING_BENEFIT[idx];
      break;

    // ═══════════════════════════════════════════════════════════════════
    // FACILITY_LOB_ATTRIBUTION
    // ═══════════════════════════════════════════════════════════════════
    case 'facility_lob_attribution':
      if (columnName === 'attribution_id') return i;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'lob_segment_id') return fid(idx);
      if (columnName === 'attribution_pct') return 100;
      if (columnName === 'attributed_amount') return DRAWN[idx];
      if (columnName === 'attribution_amount_usd') return DRAWN[idx];
      if (columnName === 'attribution_type') return 'DIRECT';
      if (columnName === 'lob_node_id') return fid(idx);
      if (columnName === 'hierarchy_id') return 'DEFAULT_LOB_HIERARCHY';
      break;

    // ═══════════════════════════════════════════════════════════════════
    // COLLATERAL_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'collateral_snapshot': {
      const val = VALUATION_AMTS[idx] ?? 0;
      const haircut = HAIRCUTS[idx] ?? 0;
      const eligible = Math.round(val * (1 - haircut / 100));
      if (columnName === 'collateral_asset_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'valuation_amount') return val;
      if (columnName === 'haircut_pct') return haircut;
      if (columnName === 'eligible_collateral_amount') return eligible;
      if (columnName === 'source_system_id') return fid(idx);
      if (columnName === 'allocated_amount_usd') return eligible;
      if (columnName === 'collateral_snapshot_id') return i;
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'crm_type_code') return CRM_TYPES[idx];
      if (columnName === 'current_valuation_usd') return val;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'mitigant_group_code') return MITIGANT_GROUPS[idx];
      if (columnName === 'mitigant_subtype') return MITIGANT_SUBTYPES[idx];
      if (columnName === 'original_valuation_usd') return Math.round(val * 1.05); // slight appreciation
      if (columnName === 'risk_shifting_flag') return 'N';
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CASH_FLOW
    // ═══════════════════════════════════════════════════════════════════
    case 'cash_flow': {
      const cfTypes = ['DRAW', 'REPAY', 'INTEREST', 'FEE', 'DRAW', 'REPAY', 'INTEREST', 'FEE', 'DRAW', 'REPAY', 'INTEREST', 'FEE'];
      const cfAmts = [5_000_000, -2_000_000, 125_000, 50_000, 10_000_000, -1_500_000, 200_000, 75_000, 3_000_000, -3_000_000, 90_000, 25_000];
      const cfDirs = ['INBOUND', 'OUTBOUND', 'INBOUND', 'INBOUND', 'INBOUND', 'OUTBOUND', 'INBOUND', 'INBOUND', 'INBOUND', 'OUTBOUND', 'INBOUND', 'INBOUND'];
      const cfDates = ['2025-01-31', '2025-01-30', '2025-01-29', '2025-01-28', '2025-01-27', '2025-01-24', '2025-01-23', '2025-01-22', '2025-01-21', '2025-01-20', '2025-01-17', '2025-01-16'];
      if (columnName === 'cash_flow_id') return i;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'cash_flow_date') return cfDates[idx];
      if (columnName === 'cash_flow_type') return cfTypes[idx];
      if (columnName === 'amount') return cfAmts[idx];
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'contractual_amt') return Math.abs(cfAmts[idx] ?? 0);
      if (columnName === 'contractual_amt_usd') return Math.abs(cfAmts[idx] ?? 0);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'flow_date') return cfDates[idx];
      if (columnName === 'flow_direction') return cfDirs[idx];
      if (columnName === 'flow_id') return i;
      if (columnName === 'flow_type') return cfTypes[idx];
      if (columnName === 'maturity_bucket_id') return [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3][idx];
      if (columnName === 'position_id') return (idx % 12) + 1;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // FACILITY_FINANCIAL_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'facility_financial_snapshot':
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'noi_amt') return [8_500_000, 12_200_000, 22_000_000, 0, 6_800_000, 35_000_000, 0, 4_200_000, 15_600_000, 52_000_000, 9_100_000, 0][idx];
      if (columnName === 'total_debt_service_amt') return [5_800_000, 7_200_000, 14_500_000, 0, 5_400_000, 21_000_000, 0, 3_200_000, 9_800_000, 38_000_000, 7_500_000, 0][idx];
      if (columnName === 'revenue_amt') return [14_000_000, 20_000_000, 38_000_000, 0, 12_000_000, 58_000_000, 0, 7_500_000, 26_000_000, 85_000_000, 15_000_000, 0][idx];
      if (columnName === 'operating_expense_amt') return [5_500_000, 7_800_000, 16_000_000, 0, 5_200_000, 23_000_000, 0, 3_300_000, 10_400_000, 33_000_000, 5_900_000, 0][idx];
      if (columnName === 'ebitda_amt') return [10_200_000, 15_000_000, 27_500_000, 0, 8_500_000, 42_000_000, 0, 5_100_000, 19_200_000, 62_000_000, 11_200_000, 0][idx];
      if (columnName === 'interest_expense_amt') return [3_800_000, 5_200_000, 10_500_000, 0, 3_900_000, 15_000_000, 0, 2_100_000, 7_200_000, 28_000_000, 5_500_000, 0][idx];
      if (columnName === 'principal_payment_amt') return [2_000_000, 2_000_000, 4_000_000, 0, 1_500_000, 6_000_000, 0, 1_100_000, 2_600_000, 10_000_000, 2_000_000, 0][idx];
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'reporting_period') return 'Q4-2024';
      if (columnName === 'financial_snapshot_id') return i;
      break;

    // ═══════════════════════════════════════════════════════════════════
    // FACILITY_DELINQUENCY_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'facility_delinquency_snapshot': {
      const dpd = DPD[idx] ?? 0;
      const isWatch = CREDIT_STATUS_IDS[idx] === 2;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'credit_status_code') return CREDIT_STATUS_IDS[idx];
      if (columnName === 'days_past_due') return dpd;
      if (columnName === 'watch_list_flag') return isWatch ? 'Y' : 'N';
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'currency_code') return CURRENCIES[idx];
      if (columnName === 'days_past_due_max') return dpd; // max = current for snapshot
      if (columnName === 'delinquency_bucket_code') return dpd === 0 ? 'CURRENT' : dpd <= 30 ? '1_30' : dpd <= 60 ? '31_60' : dpd <= 90 ? '61_90' : '90_PLUS';
      if (columnName === 'delinquency_snapshot_id') return i;
      if (columnName === 'delinquency_status_code') return CREDIT_STATUS[idx];
      if (columnName === 'last_payment_received_date') return isWatch ? '2025-01-10' : '2025-01-28';
      if (columnName === 'overdue_interest_amt') return isWatch ? (DRAWN[idx] ?? 0) * (ALL_IN_RATES[idx] ?? 0) / 100 / 12 : 0;
      if (columnName === 'overdue_principal_amt') return isWatch ? [0, 0, 0, 0, 2_500_000, 0, 0, 0, 0, 0, 1_500_000, 0][idx] : 0;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // FACILITY_PRICING_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'facility_pricing_snapshot':
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'spread_bps') return SPREADS[idx];
      if (columnName === 'rate_index_id') return fid(idx);
      if (columnName === 'all_in_rate_pct') return ALL_IN_RATES[idx];
      if (columnName === 'floor_pct') return [0, 0, 0.25, 0, 0.50, 0, 0.25, 0, 0, 0, 0.25, 0][idx];
      if (columnName === 'base_rate_pct') return BASE_RATES[idx];
      if (columnName === 'currency_code') return CURRENCIES[idx];
      if (columnName === 'facility_pricing_id') return i;
      if (columnName === 'min_spread_threshold_bps') return [100, 125, 150, 100, 200, 75, 125, 100, 150, 75, 175, 100][idx];
      if (columnName === 'payment_frequency') return ['QUARTERLY', 'MONTHLY', 'QUARTERLY', 'MONTHLY', 'QUARTERLY', 'MONTHLY', 'QUARTERLY', 'MONTHLY', 'QUARTERLY', 'MONTHLY', 'QUARTERLY', 'MONTHLY'][idx];
      if (columnName === 'prepayment_penalty_flag') return ['N', 'N', 'Y', 'N', 'Y', 'N', 'Y', 'N', 'N', 'N', 'Y', 'N'][idx];
      if (columnName === 'rate_cap_pct') return [12.00, 10.00, 12.00, 10.00, 14.00, 9.00, 12.00, 10.00, 12.00, 8.00, 14.00, 10.00][idx];
      if (columnName === 'rate_index_code') return ['SOFR', 'EURIBOR', 'SOFR', 'SONIA', 'SOFR', 'SOFR', 'EURIBOR', 'SOFR', 'SONIA', 'SOFR', 'SOFR', 'EURIBOR'][idx];
      break;

    // ═══════════════════════════════════════════════════════════════════
    // FACILITY_PROFITABILITY_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'facility_profitability_snapshot': {
      const niiYtd = [1_250_000, 3_200_000, 5_800_000, 0, 2_100_000, 9_200_000, 0, 450_000, 4_100_000, 18_500_000, 2_200_000, 800_000];
      const feeYtd = [85_000, 120_000, 250_000, 50_000, 90_000, 400_000, 30_000, 60_000, 180_000, 600_000, 110_000, 75_000];
      const drawn = DRAWN[idx] ?? 0;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'nii_ytd') return niiYtd[idx];
      if (columnName === 'fee_income_ytd') return feeYtd[idx];
      if (columnName === 'ledger_account_id') return fid(idx);
      if (columnName === 'allocated_equity_amt') return Math.round(drawn * 0.08); // ~8% equity allocation
      if (columnName === 'avg_earning_assets_amt') return drawn;
      if (columnName === 'base_currency_code') return 'USD';
      if (columnName === 'fee_income_amt') return feeYtd[idx];
      if (columnName === 'interest_expense_amt') return Math.round((niiYtd[idx] ?? 0) * 0.6); // ~60% funding cost
      if (columnName === 'interest_income_amt') return Math.round((niiYtd[idx] ?? 0) * 1.6); // NII = income - expense
      if (columnName === 'profitability_snapshot_id') return i;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // LIMIT_CONTRIBUTION_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'limit_contribution_snapshot': {
      const contrib = [120_000_000, 450_000_000, 0, 200_000_000, 100_000_000, 800_000_000, 300_000_000, 50_000_000, 400_000_000, 1_500_000_000, 200_000_000, 350_000_000];
      if (columnName === 'limit_rule_id') return fid(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'contribution_amount') return contrib[idx];
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'contribution_amount_usd') return contrib[idx];
      if (columnName === 'contribution_id') return i;
      if (columnName === 'contribution_pct') return LIMIT_AMTS[idx] > 0 ? Math.round((contrib[idx] ?? 0) / (LIMIT_AMTS[idx] ?? 1) * 100 * 100) / 100 : 0;
      if (columnName === 'facility_id') return fid(idx);
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // LIMIT_UTILIZATION_EVENT
    // ═══════════════════════════════════════════════════════════════════
    case 'limit_utilization_event':
      if (columnName === 'limit_rule_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'utilized_amount') return UTILIZED[idx];
      if (columnName === 'available_amount') return (LIMIT_AMTS[idx] ?? 0) - (UTILIZED[idx] ?? 0);
      if (columnName === 'reporting_ts') return '2025-01-31 18:00:00';
      if (columnName === 'utilization_event_id') return i;
      if (columnName === 'utilized_amount_usd') return UTILIZED[idx];
      break;

    // ═══════════════════════════════════════════════════════════════════
    // AMENDMENT_CHANGE_DETAIL
    // ═══════════════════════════════════════════════════════════════════
    case 'amendment_change_detail': {
      const changeTypes = ['COMMITMENT', 'PRICING', 'MATURITY', 'COVENANT', 'PARTY', 'COMMITMENT', 'PRICING', 'MATURITY', 'COVENANT', 'PARTY', 'COMMITMENT', 'PRICING'];
      const oldVals = ['$200M', 'L+225bps', '2026-12-31', 'Max leverage 5.0x', 'Borrower A only', '$1.2B', 'L+300bps', '2027-03-31', 'Min DSCR 1.20x', 'Party A, Party B', '$400M', 'L+250bps'];
      const newVals = ['$250M', 'L+175bps', '2027-06-30', 'Max leverage 5.5x', 'Borrower A + Sub', '$1.5B', 'L+275bps', '2028-09-30', 'Min DSCR 1.10x', 'Party A, Party B, Party C', '$500M', 'L+190bps'];
      const changeCurrencies: (string | undefined)[] = ['USD', 'USD', undefined, undefined, undefined, 'USD', 'USD', undefined, undefined, undefined, 'USD', 'USD'];
      const changeFields = ['committed_amount', 'spread_bps', 'maturity_date', 'leverage_covenant', 'borrower_list', 'committed_amount', 'spread_bps', 'maturity_date', 'dscr_covenant', 'participant_list', 'committed_amount', 'spread_bps'];
      if (columnName === 'change_detail_id') return i;
      if (columnName === 'amendment_id') return (idx % 12) + 1;
      if (columnName === 'change_type') return changeTypes[idx];
      if (columnName === 'old_value') return oldVals[idx];
      if (columnName === 'new_value') return newVals[idx];
      if (columnName === 'amendment_event_id') return (idx % 12) + 1;
      if (columnName === 'change_currency_code') return changeCurrencies[idx];
      if (columnName === 'change_field_name') return changeFields[idx];
      if (columnName === 'change_seq') return 1;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // AMENDMENT_EVENT
    // ═══════════════════════════════════════════════════════════════════
    case 'amendment_event': {
      const amendDescs = [
        'Commitment increase from $200M to $250M',
        'Maturity extended 18 months to Mar-2028',
        'Spread reduced from L+325 to L+275',
        'Leverage covenant relaxed from 5.0x to 5.5x',
        'Addition of subsidiary guarantor',
        'Accordion exercise on revolving facility',
        'Collateral release of Tranche B security package',
        'Administrative agent change to JPM',
        'Commitment increase from $500M to $600M',
        'Maturity extended 24 months to Dec-2031',
        'Pricing grid amendment pending credit approval',
        'DSCR covenant threshold reduced from 1.20x to 1.10x',
      ];
      const completedDates: (string | undefined)[] = ['2024-11-15', '2025-01-02', undefined, '2024-11-01', undefined, '2024-09-15', '2025-01-20', undefined, '2024-12-15', '2025-01-15', undefined, '2024-08-01'];
      if (columnName === 'amendment_id') return i;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'credit_agreement_id') return fid(idx);
      if (columnName === 'amendment_type_code') return AMENDMENT_TYPES[idx];
      if (columnName === 'amendment_status_code') return AMENDMENT_STATUSES[idx];
      if (columnName === 'effective_date') return AMENDMENT_EFF_DATES[idx];
      if (columnName === 'event_ts') return '2025-01-15 14:30:00';
      if (columnName === 'amendment_description') return amendDescs[idx];
      if (columnName === 'amendment_event_id') return i;
      if (columnName === 'amendment_status') return AMENDMENT_STATUSES[idx];
      if (columnName === 'amendment_subtype') return ['SIZE', 'TENOR', 'SPREAD', 'FINANCIAL', 'GUARANTOR', 'SIZE', 'COLLATERAL', 'ADMIN', 'SIZE', 'TENOR', 'SPREAD', 'FINANCIAL'][idx];
      if (columnName === 'amendment_type') return AMENDMENT_TYPES[idx];
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'completed_date') return completedDates[idx];
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'identified_date') return ['2024-10-15', '2024-11-20', '2024-12-10', '2024-09-25', '2025-01-05', '2024-08-15', '2025-01-02', '2024-07-20', '2024-11-15', '2024-12-20', '2025-01-28', '2024-06-30'][idx];
      if (columnName === 'last_updated_ts') return '2025-01-31 12:00:00';
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CREDIT_EVENT
    // ═══════════════════════════════════════════════════════════════════
    case 'credit_event': {
      const eventDates = ['2025-01-15', '2025-01-10', '2025-01-08', '2024-12-20', '2024-12-15', '2025-01-05', '2025-01-20', '2024-11-30', '2025-01-12', '2025-01-18', '2024-12-22', '2024-11-15'];
      if (columnName === 'credit_event_id') return i;
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'credit_event_type_code') return fid(idx);
      if (columnName === 'event_date') return eventDates[idx];
      if (columnName === 'event_ts') return '2025-01-15 10:00:00';
      if (columnName === 'default_definition_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'event_risk_rating') return CE_RATINGS[idx];
      if (columnName === 'event_status') return CE_EVENT_STATUSES[idx];
      if (columnName === 'event_summary') return CE_SUMMARIES[idx];
      if (columnName === 'loss_amount_usd') return CE_LOSS[idx];
      if (columnName === 'recovery_amount_usd') return CE_RECOVERY[idx];
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CREDIT_EVENT_FACILITY_LINK
    // ═══════════════════════════════════════════════════════════════════
    case 'credit_event_facility_link': {
      const ead = DRAWN[idx] ?? 0;
      const estLoss = CE_LOSS[idx] ?? 0;
      if (columnName === 'link_id') return i;
      if (columnName === 'credit_event_id') return (idx % 12) + 1;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'exposure_at_default') return ead;
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'estimated_loss_usd') return estLoss;
      if (columnName === 'impact_pct') return ead > 0 ? Math.round(estLoss / ead * 100 * 100) / 100 : 0;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STRESS_TEST_BREACH
    // ═══════════════════════════════════════════════════════════════════
    case 'stress_test_breach': {
      const breachAmt = BREACH_AMTS[idx] ?? 0;
      if (columnName === 'breach_id') return i;
      if (columnName === 'scenario_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'limit_rule_id') return fid(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'breach_amount') return breachAmt;
      if (columnName === 'breach_amount_usd') return breachAmt;
      if (columnName === 'breach_severity') return BREACH_SEVERITIES[idx];
      if (columnName === 'control_description') return breachAmt > 0 ? 'Limit utilization exceeded under stress scenario' : 'No breach under this scenario';
      if (columnName === 'control_owner') return ['Credit Risk', 'Portfolio Mgmt', 'Risk Analytics', 'Credit Risk', 'Portfolio Mgmt', 'Risk Analytics', 'Credit Risk', 'Portfolio Mgmt', 'Risk Analytics', 'Credit Risk', 'Portfolio Mgmt', 'Risk Analytics'][idx];
      if (columnName === 'failure_description') return breachAmt > 0 ? 'Stressed exposure exceeds approved limit' : 'Within limit under stress';
      if (columnName === 'lob_segment_id') return fid(idx);
      if (columnName === 'stress_test_result_id') return (idx % 12) + 1;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STRESS_TEST_RESULT
    // ═══════════════════════════════════════════════════════════════════
    case 'stress_test_result': {
      const loss = STRESS_LOSS[idx] ?? 0;
      const totalExp = COMMITTED[idx] ?? 1;
      if (columnName === 'result_id') return i;
      if (columnName === 'scenario_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'portfolio_id') return fid(idx);
      if (columnName === 'loss_amount') return loss;
      if (columnName === 'pnl_impact') return -loss;
      if (columnName === 'capital_impact_pct') return Math.round(loss / totalExp * 100 * 100) / 100;
      if (columnName === 'execution_date') return '2025-01-31';
      if (columnName === 'expected_loss_usd') return Math.round(loss * 0.6); // EL < stress loss
      if (columnName === 'result_description') return `${SCENARIO_TYPES[idx]} scenario: ${loss > 20_000_000 ? 'significant' : 'moderate'} loss impact`;
      if (columnName === 'result_status') return SCENARIO_STATUSES[idx];
      if (columnName === 'scenario_type') return SCENARIO_TYPES[idx];
      if (columnName === 'stress_test_result_id') return i;
      if (columnName === 'total_breaches') return BREACH_AMTS[idx] > 0 ? 1 : 0;
      if (columnName === 'total_exposure_usd') return totalExp;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // DEAL_PIPELINE_FACT
    // ═══════════════════════════════════════════════════════════════════
    case 'deal_pipeline_fact': {
      const proposed = PROPOSED_AMTS[idx] ?? 0;
      if (columnName === 'pipeline_id') return i;
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'stage_code') return PIPELINE_STAGES[idx];
      if (columnName === 'proposed_amount') return proposed;
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'expected_all_in_rate_pct') return [6.50, 6.25, 7.00, 5.75, 8.25, 6.50, 7.25, 6.00, 6.75, 5.50, 7.50, 6.75][idx];
      if (columnName === 'expected_close_date') return EXPECTED_CLOSE_DATES[idx];
      if (columnName === 'expected_committed_amt') return proposed;
      if (columnName === 'expected_coverage_ratio') return [120, 150, 100, 200, 80, 175, 100, 180, 110, 250, 90, 130][idx];
      if (columnName === 'expected_exposure_amt') return Math.round(proposed * 0.7); // ~70% utilization expected
      if (columnName === 'expected_internal_risk_grade') return EXPECTED_GRADES[idx];
      if (columnName === 'expected_spread_bps') return EXPECTED_SPREADS[idx];
      if (columnName === 'expected_tenor_months') return EXPECTED_TENORS[idx];
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'lob_segment_id') return fid(idx);
      if (columnName === 'pipeline_deal_id') return i;
      if (columnName === 'pipeline_stage') return PIPELINE_STAGES[idx];
      if (columnName === 'pipeline_status') return PIPELINE_STATUSES[idx];
      if (columnName === 'record_level_code') return 'DEAL';
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // COUNTERPARTY_RATING_OBSERVATION
    // ═══════════════════════════════════════════════════════════════════
    case 'counterparty_rating_observation': {
      const isInternal = idx % 2 === 0;
      const ratingAgencies = ['INTERNAL', 'MOODYS', 'INTERNAL', 'S&P', 'INTERNAL', 'FITCH', 'INTERNAL', 'MOODYS', 'INTERNAL', 'S&P', 'INTERNAL', 'FITCH'];
      const ratingTypes = ['TTC', 'ISSUER', 'TTC', 'LT_ISSUER', 'PIT', 'LT_ISSUER', 'TTC', 'ISSUER', 'PIT', 'LT_ISSUER', 'TTC', 'ISSUER'];
      const ratingValues = isInternal ? INTERNAL_RATINGS : EXTERNAL_RATINGS;
      const priorRatings = ['A', 'Baa2', 'AA-', 'Ba1', 'BB+', 'Aa3', 'B', 'Baa1', 'BB+', 'Aaa', 'BBB', 'Ba2'];
      if (columnName === 'observation_id') return i;
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'rating_grade_id') return fid(idx);
      if (columnName === 'rating_source_id') return fid(idx);
      if (columnName === 'is_internal_flag') return isInternal ? 'Y' : 'N';
      if (columnName === 'pd_implied') return String(PD_ESTIMATES[idx]);
      if (columnName === 'prior_rating_value') return priorRatings[idx];
      if (columnName === 'rating_agency') return ratingAgencies[idx];
      if (columnName === 'rating_date') return '2025-01-15';
      if (columnName === 'rating_type') return ratingTypes[idx];
      if (columnName === 'rating_value') return ratingValues[idx];
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // FINANCIAL_METRIC_OBSERVATION
    // ═══════════════════════════════════════════════════════════════════
    case 'financial_metric_observation':
      if (columnName === 'observation_id') return i;
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'metric_definition_id') return fid(idx);
      if (columnName === 'value') return METRIC_VALS[idx];
      if (columnName === 'context_id') return fid(idx);
      if (columnName === 'credit_agreement_id') return fid(idx);
      if (columnName === 'metric_category') return METRIC_CATS[idx];
      if (columnName === 'metric_code') return METRIC_CODES[idx];
      if (columnName === 'metric_name') return METRIC_NAMES[idx];
      if (columnName === 'metric_value') return METRIC_VALS[idx];
      if (columnName === 'metric_value_usd') return METRIC_USD_VALS[idx];
      if (columnName === 'period_end_date') return '2024-12-31';
      break;

    // ═══════════════════════════════════════════════════════════════════
    // METRIC_THRESHOLD
    // ═══════════════════════════════════════════════════════════════════
    case 'metric_threshold': {
      const threshTypes = ['MIN', 'MAX', 'MIN', 'MAX', 'MIN', 'MAX', 'MIN', 'MAX', 'MIN', 'MAX', 'MIN', 'MAX'];
      const threshVals = [0.5, 2.0, 1.0, 3.0, 0.25, 1.5, 0.75, 2.5, 0.1, 4.0, 1.25, 3.5];
      const metricThreshNames = ['PD Floor', 'LGD Ceiling', 'EL Floor', 'RWA Ceiling', 'Capital Floor', 'PD Ceiling', 'LGD Floor', 'EL Ceiling', 'RWA Floor', 'Capital Ceiling', 'PD Alert', 'LGD Alert'];
      const metricThreshDescs = [
        'Minimum PD threshold for IG obligors', 'Maximum LGD for secured facilities',
        'Minimum EL for provisioning', 'Maximum RWA density for portfolio',
        'Minimum capital requirement ratio', 'Maximum PD for investment grade',
        'Minimum LGD for unsecured', 'Maximum EL for single obligor',
        'Minimum RWA for off-balance sheet', 'Maximum capital allocation per LOB',
        'PD early warning threshold', 'LGD early warning threshold',
      ];
      if (columnName === 'threshold_id') return i;
      if (columnName === 'metric_definition_id') return fid(idx);
      if (columnName === 'threshold_type') return threshTypes[idx];
      if (columnName === 'threshold_value') return threshVals[idx];
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return undefined; // still active
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'inner_threshold_pct') return [80, 85, 75, 90, 80, 85, 75, 90, 80, 85, 75, 90][idx];
      if (columnName === 'last_threshold_updated_date') return '2024-12-15';
      if (columnName === 'limit_type') return threshTypes[idx] === 'MIN' ? 'FLOOR' : 'CEILING';
      if (columnName === 'limit_value') return threshVals[idx];
      if (columnName === 'lod1_sponsor') return ['Credit Risk', 'Credit Risk', 'Finance', 'Capital Mgmt', 'Capital Mgmt', 'Credit Risk', 'Credit Risk', 'Finance', 'Capital Mgmt', 'Capital Mgmt', 'Credit Risk', 'Credit Risk'][idx];
      if (columnName === 'lod2_sponsor') return ['Risk Management', 'Risk Management', 'Risk Management', 'Risk Management', 'CRO Office', 'Risk Management', 'Risk Management', 'Risk Management', 'Risk Management', 'CRO Office', 'Risk Management', 'Risk Management'][idx];
      if (columnName === 'metric_category') return METRIC_CATS[idx];
      if (columnName === 'metric_code') return METRIC_CODES[idx];
      if (columnName === 'metric_description') return metricThreshDescs[idx];
      if (columnName === 'metric_id_display') return `MTR-${String(i).padStart(3, '0')}`;
      if (columnName === 'metric_name') return metricThreshNames[idx];
      if (columnName === 'metric_owner') return ['Credit Analytics', 'Portfolio Mgmt', 'Finance', 'Capital Planning', 'Treasury', 'Credit Analytics', 'Portfolio Mgmt', 'Finance', 'Capital Planning', 'Treasury', 'Credit Analytics', 'Portfolio Mgmt'][idx];
      if (columnName === 'metric_threshold_id') return i;
      if (columnName === 'outer_threshold_pct') return [95, 95, 90, 95, 95, 95, 90, 95, 95, 95, 90, 95][idx];
      if (columnName === 'report_deadline') return ['T+5', 'T+5', 'T+10', 'T+5', 'T+15', 'T+5', 'T+5', 'T+10', 'T+5', 'T+15', 'T+5', 'T+5'][idx];
      if (columnName === 'report_frequency') return ['MONTHLY', 'MONTHLY', 'QUARTERLY', 'MONTHLY', 'QUARTERLY', 'MONTHLY', 'MONTHLY', 'QUARTERLY', 'MONTHLY', 'QUARTERLY', 'MONTHLY', 'MONTHLY'][idx];
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXCEPTION_EVENT
    // ═══════════════════════════════════════════════════════════════════
    case 'exception_event': {
      const raisedDates = ['2025-01-28', '2025-01-19', '2025-01-30', '2025-01-13', '2025-01-23', '2025-01-29', '2025-01-10', '2025-01-26', '2025-01-30', '2025-01-01', '2025-01-21', '2025-01-29'];
      const resolvedDates: (string | undefined)[] = ['2025-01-31 14:00:00', undefined, '2025-01-31 10:00:00', undefined, undefined, '2025-01-31 16:00:00', undefined, undefined, '2025-01-31 09:00:00', undefined, undefined, '2025-01-31 11:00:00'];
      const targetRemDates = ['2025-01-31', '2025-02-15', '2025-01-31', '2025-02-28', '2025-02-10', '2025-01-31', '2025-02-28', '2025-02-05', '2025-01-31', '2025-03-15', '2025-02-15', '2025-01-31'];
      const actualRemDates: (string | undefined)[] = ['2025-01-31', undefined, '2025-01-31', undefined, undefined, '2025-01-31', undefined, undefined, '2025-01-31', undefined, undefined, '2025-01-31'];
      if (columnName === 'exception_id') return i;
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'exception_type') return EXCEPTION_TYPES[idx];
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'raised_ts') return raisedDates[idx] + ' 09:00:00';
      if (columnName === 'resolved_ts') return resolvedDates[idx];
      if (columnName === 'actual_remediation_date') return actualRemDates[idx];
      if (columnName === 'approver') return ['VP Credit', 'SVP Risk', 'VP Data', 'MD Credit', 'SVP Risk', 'VP Data', 'MD Credit', 'SVP Risk', 'VP Data', 'CRO', 'SVP Risk', 'VP Data'][idx];
      if (columnName === 'breach_amount_usd') return BREACH_AMTS_EX[idx];
      if (columnName === 'breach_pct') return BREACH_PCTS_EX[idx];
      if (columnName === 'days_open') return DAYS_OPEN[idx];
      if (columnName === 'exception_description') return EXCEPTION_DESCS[idx];
      if (columnName === 'exception_owner') return EXCEPTION_OWNERS[idx];
      if (columnName === 'exception_severity') return EXCEPTION_SEVS[idx];
      if (columnName === 'exception_status') return EXCEPTION_STATUSES[idx];
      if (columnName === 'exception_value') return BREACH_AMTS_EX[idx];
      if (columnName === 'identified_date') return raisedDates[idx];
      if (columnName === 'limit_rule_id') return fid(idx);
      if (columnName === 'lob_segment_id') return fid(idx);
      if (columnName === 'lod_sponsor') return ['LoD1 Credit', 'LoD2 Risk', 'LoD1 Data', 'LoD1 Credit', 'LoD2 Risk', 'LoD1 Data', 'LoD1 Credit', 'LoD2 Risk', 'LoD1 Data', 'LoD2 Risk', 'LoD2 Risk', 'LoD1 Data'][idx];
      if (columnName === 'metric_threshold_id') return fid(idx);
      if (columnName === 'remediation_plan') return REMED_PLANS[idx];
      if (columnName === 'target_remediation_date') return targetRemDates[idx];
      if (columnName === 'threshold_value') return [0.5, 2.0, 1.0, 3.0, 0.25, 1.5, 0.75, 2.5, 0.1, 4.0, 1.25, 3.5][idx];
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // RISK_FLAG
    // ═══════════════════════════════════════════════════════════════════
    case 'risk_flag': {
      const raisedTs = ['2025-01-10 09:00:00', '2025-01-15 11:30:00', '2025-01-08 14:00:00', '2025-01-20 10:00:00', '2025-01-12 09:30:00', '2025-01-22 16:00:00', '2025-01-18 08:45:00', '2025-01-25 13:15:00', '2025-01-05 10:00:00', '2025-01-28 09:00:00', '2025-01-14 11:00:00', '2025-01-19 15:30:00'];
      const clearedTs: (string | undefined)[] = ['2025-01-25 16:00:00', undefined, undefined, undefined, undefined, '2025-01-30 14:00:00', undefined, '2025-01-31 10:00:00', undefined, undefined, undefined, '2025-01-28 12:00:00'];
      if (columnName === 'risk_flag_id') return i;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'flag_type') return RISK_FLAGS[idx];
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'raised_ts') return raisedTs[idx];
      if (columnName === 'cleared_ts') return clearedTs[idx];
      if (columnName === 'created_ts') return raisedTs[idx];
      if (columnName === 'flag_code') return FLAG_CODES[idx];
      if (columnName === 'flag_description') return FLAG_DESCS[idx];
      if (columnName === 'flag_scope') return FLAG_SCOPES[idx];
      if (columnName === 'flag_severity') return FLAG_SEVS[idx];
      if (columnName === 'flag_trigger_value') return FLAG_TRIGGERS[idx];
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // DATA_QUALITY_SCORE_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'data_quality_score_snapshot': {
      const tables = ['facility_master', 'counterparty', 'collateral_asset', 'facility_master', 'counterparty', 'collateral_asset', 'facility_master', 'counterparty', 'facility_master', 'counterparty', 'facility_master', 'counterparty'];
      const completeness = [98.5, 99.2, 97.8, 99.0, 98.0, 99.5, 97.0, 98.8, 99.1, 96.5, 98.2, 99.8];
      const validity = [99.0, 98.5, 99.2, 97.8, 99.0, 98.0, 99.5, 97.0, 98.8, 99.1, 96.5, 98.2];
      const overall = [98.8, 98.9, 98.5, 98.4, 98.5, 98.8, 98.2, 97.9, 98.9, 97.8, 97.4, 99.0];
      if (columnName === 'score_id') return i;
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'target_table') return tables[idx];
      if (columnName === 'source_system_id') return fid(idx);
      if (columnName === 'completeness_pct') return completeness[idx];
      if (columnName === 'validity_pct') return validity[idx];
      if (columnName === 'overall_score') return overall[idx];
      if (columnName === 'dimension_id') return fid(idx);
      if (columnName === 'dimension_name') return DQ_DIMS[idx];
      if (columnName === 'dq_score_id') return i;
      if (columnName === 'dq_score_pct') return overall[idx];
      if (columnName === 'impact_pct') return DQ_IMPACT_PCTS[idx];
      if (columnName === 'impacted_report_codes') return DQ_REPORT_CODES[idx];
      if (columnName === 'issue_count') return DQ_ISSUE_COUNTS[idx];
      if (columnName === 'reconciliation_break_count') return DQ_RECON_BREAKS[idx];
      if (columnName === 'score_dimension') return DQ_SCORE_DIMS[idx];
      break;
    }
  }

  return null;
}
