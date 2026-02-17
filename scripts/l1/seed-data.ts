/**
 * Realistic seed data for L1 demo — large US bank (e.g. Bank of America) style.
 * All arrays sized for 10 rows (ROWS_PER_TABLE) for referential integrity.
 */

export const COUNTRY_CODES = ['US', 'GB', 'DE', 'FR', 'JP', 'CH', 'CA', 'AU', 'NL', 'SG'];
export const COUNTRY_NAMES = [
  'United States', 'United Kingdom', 'Germany', 'France', 'Japan', 'Switzerland',
  'Canada', 'Australia', 'Netherlands', 'Singapore',
];

export const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'CNY', 'HKD', 'SGD'];
export const CURRENCY_NAMES = [
  'US Dollar', 'Euro', 'British Pound', 'Swiss Franc', 'Japanese Yen', 'Canadian Dollar',
  'Australian Dollar', 'Chinese Yuan', 'Hong Kong Dollar', 'Singapore Dollar',
];
export const CURRENCY_SYMBOLS = ['$', '€', '£', 'CHF', '¥', 'C$', 'A$', '¥', 'HK$', 'S$'];

export const REGION_CODES = ['AMER', 'EMEA', 'APAC', 'LATAM', 'NAM', 'EU', 'ASEAN', 'GCC', 'UK', 'NA'];
export const REGION_NAMES = [
  'Americas', 'Europe Middle East Africa', 'Asia Pacific', 'Latin America', 'North America',
  'Europe', 'ASEAN', 'Gulf Cooperation Council', 'United Kingdom', 'North America',
];

export const ENTITY_TYPE_CODES = ['CORP', 'BANK', 'SOV', 'FI', 'SPE', 'FUND', 'INS', 'PE', 'RE', 'OTH'];
export const ENTITY_TYPE_NAMES = [
  'Corporate', 'Bank', 'Sovereign', 'Financial Institution', 'Special Purpose Entity',
  'Fund', 'Insurance', 'Private Equity', 'Real Estate', 'Other',
];

export const INDUSTRY_CODES = ['TMT', 'HC', 'FIN', 'ENE', 'IND', 'CON', 'RET', 'UTL', 'MAT', 'CD'];
export const INDUSTRY_NAMES = [
  'Technology Media Telecom', 'Healthcare', 'Financials', 'Energy', 'Industrials',
  'Consumer', 'Retail', 'Utilities', 'Materials', 'Consumer Discretionary',
];

export const PORTFOLIO_CODES = ['IG-CORP', 'LEV-FIN', 'COMM', 'CRE', 'FIG', 'TMT', 'ENERGY', 'HEALTH', 'SYND', 'BILAT'];
export const PORTFOLIO_NAMES = [
  'Investment Grade Corporate', 'Leveraged Finance', 'Commercial Banking', 'Commercial Real Estate',
  'Financial Institutions', 'TMT Sector', 'Energy & Natural Resources', 'Healthcare',
  'Syndicated Loans', 'Bilateral Facilities',
];

export const LOB_SEGMENT_CODES = ['GCB', 'CB', 'GBM', 'WM', 'GWM', 'GTS', 'CRED', 'MARKET', 'TREAS', 'RISK'];
export const LOB_SEGMENT_NAMES = [
  'Global Corporate Banking', 'Commercial Banking', 'Global Banking & Markets', 'Wealth Management',
  'Global Wealth & Investment', 'Global Transaction Services', 'Credit', 'Markets', 'Treasury', 'Risk',
];

export const PRODUCT_CODES = ['REV', 'TL', 'BL', 'ABL', 'TLB', 'L/C', 'BRIDGE', 'CP', 'TRADE', 'MM'];
export const PRODUCT_NAMES = [
  'Revolving Credit', 'Term Loan', 'Bridge Loan', 'Asset-Based Lending', 'Term Loan B',
  'Letters of Credit', 'Bridge Facility', 'Commercial Paper', 'Trade Finance', 'Money Market',
];

export const RATE_INDEX_CODES = ['SOFR', 'SOFR-90', 'EURIBOR', 'SONIA', 'FF', 'PRIME', 'CDOR', 'BBSW', 'HIBOR', 'SOR'];
export const RATE_INDEX_NAMES = [
  'Secured Overnight Financing Rate', 'SOFR 90-Day', 'Euro Interbank Offered Rate', 'Sterling Overnight Index',
  'Fed Funds', 'Prime Rate', 'Canadian Dollar Offered Rate', 'Bank Bill Swap Rate', 'HKD Interbank', 'SGD Swap Offer',
];

/** Large corporate counterparties (borrowers) — Fortune 500 style */
export const COUNTERPARTY_LEGAL_NAMES = [
  'Apple Inc.', 'Microsoft Corporation', 'Amazon.com Inc.', 'JPMorgan Chase & Co.', 'Exxon Mobil Corporation',
  'Johnson & Johnson', 'Berkshire Hathaway Inc.', 'UnitedHealth Group Incorporated', 'Procter & Gamble Co.', 'Chevron Corporation',
];

export const COUNTERPARTY_TYPES = ['CORPORATE', 'CORPORATE', 'CORPORATE', 'BANK', 'CORPORATE', 'CORPORATE', 'CORPORATE', 'CORPORATE', 'CORPORATE', 'CORPORATE'];

/** Bank legal entities (lender side — BofA-style) */
export const LEGAL_ENTITY_NAMES = [
  'Bank of America, N.A.', 'BofA Securities, Inc.', 'Merrill Lynch Capital Corporation', 'Bank of America Europe DAC',
  'BofA Securities Europe SA', 'Bank of America (Japan) Ltd.', 'Bank of America Canada', 'MLPF&S', 'Banc of America Leasing', 'Bank of America Merchant Services',
];

export const FACILITY_TYPES = [
  'REVOLVING_CREDIT', 'TERM_LOAN', 'REVOLVING_CREDIT', 'TERM_LOAN_B', 'BRIDGE_LOAN',
  'REVOLVING_CREDIT', 'TERM_LOAN', 'LETTER_OF_CREDIT', 'REVOLVING_CREDIT', 'TERM_LOAN',
];
export const FACILITY_STATUSES = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING', 'ACTIVE', 'MATURED', 'ACTIVE', 'ACTIVE', 'ACTIVE'];
export const FACILITY_NAMES = [
  'Apple Inc. — USD Revolver 2027', 'Microsoft Corp. — Term Loan B', 'Amazon — Multi-Currency RCF', 'JPMorgan — Bridge Facility', 'Exxon Mobil — Working Capital RCF',
  'Johnson & Johnson — Syndicated RCF', 'Berkshire — Bilateral Term', 'UnitedHealth — Acquisition Facility', 'P&G — Global Revolver', 'Chevron — Credit Facility',
];

/** Committed amounts in USD (250M to 5B) */
export const COMMITTED_AMOUNTS = [250_000_000, 500_000_000, 1_000_000_000, 2_500_000_000, 750_000_000, 1_500_000_000, 3_000_000_000, 400_000_000, 600_000_000, 5_000_000_000];

export const AGREEMENT_TYPES = ['SYNDICATED', 'BILATERAL', 'SYNDICATED', 'BILATERAL', 'SYNDICATED', 'SYNDICATED', 'BILATERAL', 'SYNDICATED', 'SYNDICATED', 'BILATERAL'];
export const AGREEMENT_STATUSES = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE'];
export const AGREEMENT_REFERENCES = [
  'CA-2022-001-USD', 'CA-2023-042-EUR', 'CA-2022-108-USD', 'CA-2024-015-GBP', 'CA-2023-089-USD',
  'CA-2022-033-USD', 'CA-2021-056-USD', 'CA-2024-002-USD', 'CA-2023-021-Multi', 'CA-2022-077-USD',
];

/** Origination and maturity dates — spread 2020–2024 origination, 2025–2030 maturity */
const ORIGINATION_DATES = ['2022-03-15', '2023-06-01', '2022-09-20', '2024-01-10', '2023-11-01', '2021-07-15', '2020-12-01', '2024-02-28', '2023-04-15', '2022-06-30'];
const MATURITY_DATES = ['2027-03-15', '2028-06-01', '2026-09-20', '2029-01-10', '2028-11-01', '2026-07-15', '2025-12-01', '2029-02-28', '2028-04-15', '2027-06-30'];
export function getOriginationDate(rowIndex: number): string {
  return ORIGINATION_DATES[rowIndex % ORIGINATION_DATES.length];
}
export function getMaturityDate(rowIndex: number): string {
  return MATURITY_DATES[rowIndex % MATURITY_DATES.length];
}

export const SOURCE_SYSTEM_NAMES = [
  'LoanIQ', 'ACBS', 'Summit', 'FIS', 'Moody\'s Credit Lens', 'S&P Capital IQ', 'Internal Risk', 'Treasury', 'GL', 'Regulatory',
];

export const AMENDMENT_STATUS_CODES = ['DRAFT', 'PENDING', 'APPROVED', 'EFFECTIVE', 'COMPLETED', 'REJECTED', 'WITHDRAWN', 'PENDING', 'APPROVED', 'EFFECTIVE'];
export const AMENDMENT_TYPE_CODES = ['INCREASE', 'EXTENSION', 'PRICING', 'COVENANT', 'PARTY', 'FACILITY', 'SECURITY', 'OTHER', 'INCREASE', 'EXTENSION'];

export const CREDIT_STATUS_NAMES = ['PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING'];
export const EXPOSURE_TYPE_CODES = ['LOAN', 'REV', 'DERIV', 'SFT', 'COMMIT', 'GUAR', 'L/C', 'LOAN', 'REV', 'LOAN'];

export const COLLATERAL_TYPE_NAMES = ['CASH', 'GOVT_SEC', 'CORP_BOND', 'EQUITY', 'REAL_ESTATE', 'INV_REC', 'GUARANTEE', 'OTHER', 'CASH', 'GOVT_SEC'];
export const CRM_TYPE_CODES = ['COLLATERAL', 'GUARANTEE', 'NETTING', 'CREDIT_DERIV', 'COLLATERAL', 'GUARANTEE', 'NETTING', 'COLLATERAL', 'GUARANTEE', 'NETTING'];

export const LEDGER_ACCOUNT_CODES = ['1200', '1201', '1202', '1300', '1301', '1400', '1500', '1600', '1700', '1800'];
export const LEDGER_ACCOUNT_NAMES = [
  'Commercial Loans', 'Revolvers Drawn', 'Term Loans', 'Commitments', 'Unfunded Revolvers',
  'Letters of Credit', 'Derivatives Receivable', 'Collateral Held', 'Allowance', 'Interest Receivable',
];

export const JURISDICTION_CODES = ['US', 'US', 'EU', 'UK', 'CH', 'SG', 'HK', 'JP', 'CA', 'AU'];
export const JURISDICTION_NAMES = [
  'United States', 'United States (State)', 'European Union', 'United Kingdom', 'Switzerland',
  'Singapore', 'Hong Kong', 'Japan', 'Canada', 'Australia',
];

export const GRADE_CODES = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'AA', 'A', 'BBB'];
export const GRADE_NAMES = ['Investment Grade', 'Investment Grade', 'Investment Grade', 'Investment Grade', 'Speculative', 'Speculative', 'Speculative', 'Investment Grade', 'Investment Grade', 'Investment Grade'];

const N = 10;

/**
 * Returns a realistic seed value for (tableName, columnName, rowIndex) or null to use default logic.
 * Ensures FKs reference existing dimension rows (same index or rowIndex % N).
 */
export function getSeedValue(tableName: string, columnName: string, rowIndex: number): string | number | null {
  const idx = rowIndex % N;

  switch (tableName) {
    case 'currency_dim':
      if (columnName === 'currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'currency_name') return CURRENCY_NAMES[idx];
      if (columnName === 'currency_symbol') return CURRENCY_SYMBOLS[idx];
      if (columnName === 'minor_unit_decimals') return [2, 2, 2, 2, 0, 2, 2, 2, 2, 2][idx];
      break;
    case 'country_dim':
      if (columnName === 'country_code') return COUNTRY_CODES[idx];
      if (columnName === 'country_name') return COUNTRY_NAMES[idx];
      if (columnName === 'iso_alpha_3') return ['USA', 'GBR', 'DEU', 'FRA', 'JPN', 'CHE', 'CAN', 'AUS', 'NLD', 'SGP'][idx];
      if (columnName === 'is_developed_market') return 'Y';
      break;
    case 'region_dim':
      if (columnName === 'region_code') return REGION_CODES[idx];
      if (columnName === 'region_name') return REGION_NAMES[idx];
      break;
    case 'entity_type_dim':
      if (columnName === 'entity_type_code') return ENTITY_TYPE_CODES[idx];
      if (columnName === 'entity_type_name') return ENTITY_TYPE_NAMES[idx];
      break;
    case 'industry_dim':
      if (columnName === 'industry_name') return INDUSTRY_NAMES[idx];
      if (columnName === 'industry_code') return INDUSTRY_CODES[idx];
      break;
    case 'portfolio_dim':
      if (columnName === 'portfolio_code') return PORTFOLIO_CODES[idx];
      if (columnName === 'portfolio_name') return PORTFOLIO_NAMES[idx];
      break;
    case 'enterprise_business_taxonomy':
      if (columnName === 'segment_code') return LOB_SEGMENT_CODES[idx];
      if (columnName === 'segment_name') return LOB_SEGMENT_NAMES[idx];
      break;
    case 'enterprise_product_taxonomy':
      if (columnName === 'product_code') return PRODUCT_CODES[idx];
      if (columnName === 'product_name') return PRODUCT_NAMES[idx];
      break;
    case 'interest_rate_index_dim':
      if (columnName === 'index_code') return RATE_INDEX_CODES[idx];
      if (columnName === 'index_name') return RATE_INDEX_NAMES[idx];
      break;
    case 'source_system_registry':
      if (columnName === 'source_system_name') return SOURCE_SYSTEM_NAMES[idx];
      break;
    case 'counterparty':
      if (columnName === 'legal_name') return COUNTERPARTY_LEGAL_NAMES[idx];
      if (columnName === 'counterparty_type') return COUNTERPARTY_TYPES[idx];
      if (columnName === 'country_code') return COUNTRY_CODES[idx];
      if (columnName === 'entity_type_code') return ENTITY_TYPE_CODES[idx];
      break;
    case 'legal_entity':
      if (columnName === 'legal_name') return LEGAL_ENTITY_NAMES[idx];
      if (columnName === 'country_code') return COUNTRY_CODES[idx];
      break;
    case 'credit_agreement_master':
      if (columnName === 'agreement_type') return AGREEMENT_TYPES[idx];
      if (columnName === 'status_code') return AGREEMENT_STATUSES[idx];
      if (columnName === 'agreement_reference') return AGREEMENT_REFERENCES[idx];
      if (columnName === 'currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'origination_date') return getOriginationDate(rowIndex);
      if (columnName === 'maturity_date') return getMaturityDate(rowIndex);
      break;
    case 'facility_master':
      if (columnName === 'facility_name') return FACILITY_NAMES[idx];
      if (columnName === 'facility_type') return FACILITY_TYPES[idx];
      if (columnName === 'facility_status') return FACILITY_STATUSES[idx];
      if (columnName === 'committed_facility_amt') return COMMITTED_AMOUNTS[idx];
      if (columnName === 'currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'origination_date') return getOriginationDate(rowIndex);
      if (columnName === 'maturity_date') return getMaturityDate(rowIndex);
      break;
    case 'amendment_status_dim':
      if (columnName === 'amendment_status_code') return AMENDMENT_STATUS_CODES[idx];
      break;
    case 'amendment_type_dim':
      if (columnName === 'amendment_type_code') return AMENDMENT_TYPE_CODES[idx];
      break;
    case 'credit_status_dim':
      if (columnName === 'credit_status_name') return CREDIT_STATUS_NAMES[idx];
      break;
    case 'exposure_type_dim':
      if (columnName === 'exposure_type_code') return EXPOSURE_TYPE_CODES[idx];
      break;
    case 'collateral_type':
      if (columnName === 'name') return COLLATERAL_TYPE_NAMES[idx];
      break;
    case 'crm_type_dim':
      if (columnName === 'crm_type_code') return CRM_TYPE_CODES[idx];
      break;
    case 'ledger_account_dim':
      if (columnName === 'account_code') return LEDGER_ACCOUNT_CODES[idx];
      if (columnName === 'account_name') return LEDGER_ACCOUNT_NAMES[idx];
      break;
    case 'regulatory_jurisdiction':
      if (columnName === 'jurisdiction_code') return JURISDICTION_CODES[idx];
      if (columnName === 'jurisdiction_name') return JURISDICTION_NAMES[idx];
      break;
    case 'rating_grade_dim':
      if (columnName === 'grade_code') return GRADE_CODES[idx];
      if (columnName === 'grade_name') return GRADE_NAMES[idx];
      break;
    default:
      break;
  }
  return null;
}
