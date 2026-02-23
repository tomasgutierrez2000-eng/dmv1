/**
 * GSIB-grade seed data for L1 reference tables.
 *
 * Every column returns a domain-correct, realistic value — no placeholder
 * patterns like 'column_name_N'.  Counterparties and legal entities are
 * fictitious to avoid any appearance of real bank data.
 *
 * All arrays sized for 10 rows (ROWS_PER_TABLE) for referential integrity.
 */

/* ───────────────────────────── shared lookups ──────────────────────────── */

export const COUNTRY_CODES = ['US', 'GB', 'DE', 'FR', 'JP', 'CH', 'CA', 'AU', 'NL', 'SG'];
export const COUNTRY_NAMES = [
  'United States', 'United Kingdom', 'Germany', 'France', 'Japan', 'Switzerland',
  'Canada', 'Australia', 'Netherlands', 'Singapore',
];
const ISO_ALPHA_3 = ['USA', 'GBR', 'DEU', 'FRA', 'JPN', 'CHE', 'CAN', 'AUS', 'NLD', 'SGP'];
const ISO_NUMERIC_COUNTRY = ['840', '826', '276', '250', '392', '756', '124', '036', '528', '702'];
const COUNTRY_REGION_CODES = ['AMER', 'EMEA', 'EMEA', 'EMEA', 'APAC', 'EMEA', 'AMER', 'APAC', 'EMEA', 'APAC'];
const BASEL_COUNTRY_RISK_WEIGHTS = ['0%', '0%', '0%', '0%', '0%', '0%', '0%', '0%', '0%', '0%'];

export const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'CNY', 'HKD', 'SGD'];
export const CURRENCY_NAMES = [
  'US Dollar', 'Euro', 'British Pound', 'Swiss Franc', 'Japanese Yen', 'Canadian Dollar',
  'Australian Dollar', 'Chinese Yuan', 'Hong Kong Dollar', 'Singapore Dollar',
];
export const CURRENCY_SYMBOLS = ['$', '€', '£', 'CHF', '¥', 'C$', 'A$', '¥', 'HK$', 'S$'];
const ISO_NUMERIC_CURRENCY = ['840', '978', '826', '756', '392', '124', '036', '156', '344', '702'];
const IS_G10_CURRENCY = ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'N', 'N', 'N'];

export const REGION_CODES = ['AMER', 'EMEA', 'APAC', 'LATAM', 'NAM', 'EU', 'ASEAN', 'GCC', 'UK', 'CEE'];
export const REGION_NAMES = [
  'Americas', 'Europe Middle East Africa', 'Asia Pacific', 'Latin America', 'North America',
  'European Union', 'ASEAN', 'Gulf Cooperation Council', 'United Kingdom', 'Central & Eastern Europe',
];
const REGION_GROUPS = ['GLOBAL', 'GLOBAL', 'GLOBAL', 'AMER', 'AMER', 'EMEA', 'APAC', 'EMEA', 'EMEA', 'EMEA'];

export const ENTITY_TYPE_CODES = ['CORP', 'BANK', 'SOV', 'FI', 'SPE', 'FUND', 'INS', 'PE', 'RE', 'OTH'];
export const ENTITY_TYPE_NAMES = [
  'Corporate', 'Bank', 'Sovereign', 'Financial Institution', 'Special Purpose Entity',
  'Fund', 'Insurance', 'Private Equity', 'Real Estate', 'Other',
];
const IS_FIN_INST = ['N', 'Y', 'N', 'Y', 'N', 'Y', 'Y', 'N', 'N', 'N'];
const IS_SOVEREIGN = ['N', 'N', 'Y', 'N', 'N', 'N', 'N', 'N', 'N', 'N'];
const REG_CPTY_CLASS = ['CORPORATE', 'BANK', 'SOVEREIGN', 'BANK', 'CORPORATE', 'EQUITY', 'INSURANCE', 'CORPORATE', 'CRE', 'OTHER'];

export const INDUSTRY_CODES = ['TMT', 'HC', 'FIN', 'ENE', 'IND', 'CON', 'RET', 'UTL', 'MAT', 'CD'];
export const INDUSTRY_NAMES = [
  'Technology Media Telecom', 'Healthcare', 'Financials', 'Energy', 'Industrials',
  'Consumer Staples', 'Retail', 'Utilities', 'Materials', 'Consumer Discretionary',
];
const INDUSTRY_LEVELS = ['SECTOR', 'SECTOR', 'SECTOR', 'SECTOR', 'SECTOR', 'SECTOR', 'INDUSTRY', 'SECTOR', 'SECTOR', 'SECTOR'];
const INDUSTRY_STANDARDS = ['GICS', 'GICS', 'GICS', 'GICS', 'GICS', 'GICS', 'GICS', 'GICS', 'GICS', 'GICS'];

export const PORTFOLIO_CODES = ['IG-CORP', 'LEV-FIN', 'COMM', 'CRE', 'FIG', 'TMT', 'ENERGY', 'HEALTH', 'SYND', 'BILAT'];
export const PORTFOLIO_NAMES = [
  'Investment Grade Corporate', 'Leveraged Finance', 'Commercial Banking', 'Commercial Real Estate',
  'Financial Institutions', 'TMT Sector', 'Energy & Natural Resources', 'Healthcare',
  'Syndicated Loans', 'Bilateral Facilities',
];
const PORTFOLIO_TYPES = ['SECTOR', 'RISK_TIER', 'LOB', 'ASSET_CLASS', 'SECTOR', 'SECTOR', 'SECTOR', 'SECTOR', 'ORIGINATION', 'ORIGINATION'];

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
const INDEX_FAMILIES = ['SOFR', 'SOFR', 'IBOR', 'RFR', 'OVERNIGHT', 'PRIME', 'IBOR', 'IBOR', 'IBOR', 'IBOR'];
const INDEX_CURRENCIES = ['USD', 'USD', 'EUR', 'GBP', 'USD', 'USD', 'CAD', 'AUD', 'HKD', 'SGD'];
const INDEX_TENORS = ['ON', '3M', '3M', 'ON', 'ON', 'DAILY', '3M', '3M', '3M', '3M'];
const INDEX_COMPOUNDING = ['SIMPLE', 'COMPOUNDED', 'SIMPLE', 'COMPOUNDED', 'SIMPLE', 'NONE', 'SIMPLE', 'SIMPLE', 'SIMPLE', 'SIMPLE'];
const INDEX_DAYCOUNTS = ['ACT/360', 'ACT/360', 'ACT/360', 'ACT/365', 'ACT/360', 'ACT/360', 'ACT/365', 'ACT/365', 'ACT/365', 'ACT/365'];
const INDEX_PUBLICATIONS = ['FRBNY', 'FRBNY', 'EMMI', 'BOE', 'FRBNY', 'WSJ', 'REFINITIV', 'ASX', 'HKAB', 'ABS'];
const INDEX_FALLBACK_BPS = [0, 26.161, 0, 0, 0, 0, 29.547, 0, 0, 0];
const INDEX_BMU = ['Y', 'Y', 'Y', 'Y', 'Y', 'N', 'N', 'Y', 'N', 'N'];
const INDEX_IS_FALLBACK = ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N'];

/** Fictitious corporate counterparties (borrowers) — realistic but not real companies */
export const COUNTERPARTY_LEGAL_NAMES = [
  'Meridian Aerospace Holdings Inc.', 'Northbridge Pharmaceuticals Corp.', 'Pacific Ridge Energy LLC',
  'Silverton Financial Group', 'Atlas Industrial Technologies Inc.',
  'Greenfield Consumer Brands Inc.', 'Pinnacle Healthcare Systems Corp.', 'Westlake Materials Group Ltd.',
  'Ironclad Infrastructure Partners LP', 'Crestview Real Estate Investment Trust',
];
export const COUNTERPARTY_TYPES = ['CORPORATE', 'CORPORATE', 'CORPORATE', 'BANK', 'CORPORATE', 'CORPORATE', 'CORPORATE', 'CORPORATE', 'CORPORATE', 'RE_TRUST'];
const CPTY_ENTITY_TYPES = ['CORP', 'CORP', 'CORP', 'FI', 'CORP', 'CORP', 'CORP', 'CORP', 'PE', 'RE'];
const CPTY_INDUSTRIES = [1, 2, 4, 3, 5, 6, 2, 9, 5, 10];
const CPTY_COUNTRIES = ['US', 'US', 'US', 'GB', 'DE', 'US', 'US', 'AU', 'CA', 'US'];
const CPTY_BASEL_ASSET_CLASS = ['CORPORATE', 'CORPORATE', 'CORPORATE', 'BANK', 'CORPORATE', 'CORPORATE', 'CORPORATE', 'CORPORATE', 'CORPORATE', 'CRE'];
const CPTY_INTERNAL_RATINGS = ['3', '4', '5', '2', '4', '3', '5', '6', '5', '4'];
const CPTY_EXTERNAL_SP = ['A+', 'BBB+', 'BBB', 'AA-', 'BBB+', 'A', 'BBB-', 'BB+', 'BBB-', 'BBB'];
const CPTY_EXTERNAL_MOODYS = ['A1', 'Baa1', 'Baa2', 'Aa3', 'Baa1', 'A2', 'Baa3', 'Ba1', 'Baa3', 'Baa2'];
const CPTY_EXTERNAL_FITCH = ['A+', 'BBB+', 'BBB', 'AA-', 'BBB+', 'A', 'BBB-', 'BB+', 'BBB-', 'BBB'];
const CPTY_PD = [0.0012, 0.0035, 0.0058, 0.0005, 0.0035, 0.0018, 0.0072, 0.0125, 0.0072, 0.0045];
const CPTY_LGD = [0.45, 0.45, 0.40, 0.45, 0.45, 0.45, 0.45, 0.45, 0.35, 0.25];
const CPTY_LEI = [
  '529900ABCDEF123456XX', '529900GHIJKL789012YY', '529900MNOPQR345678ZZ',
  '213800STUVWX901234AA', '391200BCDEFG567890BB', '529900HIJKLM123456CC',
  '529900NOPQRS789012DD', '969500TUVWXY345678EE', '529900FGHIJK901234FF', '529900LMNOPQ567890GG',
];
const CPTY_REG_TYPES = ['CORPORATE', 'CORPORATE', 'CORPORATE', 'BANK', 'CORPORATE', 'CORPORATE', 'CORPORATE', 'CORPORATE', 'CORPORATE', 'CRE'];
const CPTY_Y14_TYPES = ['LARGE_CORPORATE', 'LARGE_CORPORATE', 'LARGE_CORPORATE', 'BANK', 'LARGE_CORPORATE', 'LARGE_CORPORATE', 'LARGE_CORPORATE', 'MIDDLE_MARKET', 'LARGE_CORPORATE', 'CRE'];
const CPTY_FR2590_TYPES = ['C&I', 'C&I', 'C&I', 'FI', 'C&I', 'C&I', 'C&I', 'C&I', 'C&I', 'CRE'];
const CPTY_CALL_REPORT_TYPES = ['C&I_DOMESTIC', 'C&I_DOMESTIC', 'C&I_DOMESTIC', 'DEPOSITORY', 'C&I_FOREIGN', 'C&I_DOMESTIC', 'C&I_DOMESTIC', 'C&I_FOREIGN', 'C&I_FOREIGN', 'CRE_NONFARM'];
const CPTY_BASEL_GRADES = ['4', '5', '6', '2', '5', '4', '7', '8', '7', '6'];

/** Fictitious GSIB bank legal entities */
export const LEGAL_ENTITY_NAMES = [
  'Meridian National Bank, N.A.', 'Meridian Securities Inc.', 'Meridian Capital Corporation',
  'Meridian Bank Europe DAC', 'Meridian Securities Europe SA', 'Meridian Bank (Japan) Ltd.',
  'Meridian Bank Canada', 'Meridian Wealth Management LLC', 'Meridian Leasing Corp.', 'Meridian Merchant Services Inc.',
];
const LE_SHORT_NAMES = ['MNB', 'MSI', 'MCC', 'MBE', 'MSE', 'MBJ', 'MBC', 'MWM', 'MLC', 'MMS'];
const LE_ENTITY_TYPE_CODES = ['BANK', 'FI', 'CORP', 'BANK', 'FI', 'BANK', 'BANK', 'FI', 'CORP', 'CORP'];
const LE_FUNC_CURRENCIES = ['USD', 'USD', 'USD', 'EUR', 'EUR', 'JPY', 'CAD', 'USD', 'USD', 'USD'];
const LE_PRIMARY_REGULATORS = ['OCC', 'SEC', 'FRB', 'ECB', 'AMF', 'FSA', 'OSFI', 'SEC', 'OCC', 'OCC'];
const LE_RSSD_IDS = [480228, 480229, 480230, 0, 0, 0, 0, 480234, 480235, 480236];
const LE_TAX_IDS = [560505001, 560505002, 560505003, 0, 0, 0, 0, 560505008, 560505009, 560505010];
const LE_IS_REPORTING = ['Y', 'Y', 'N', 'Y', 'N', 'Y', 'Y', 'N', 'N', 'N'];

export const FACILITY_TYPES = [
  'REVOLVING_CREDIT', 'TERM_LOAN', 'REVOLVING_CREDIT', 'TERM_LOAN_B', 'BRIDGE_LOAN',
  'REVOLVING_CREDIT', 'TERM_LOAN', 'LETTER_OF_CREDIT', 'REVOLVING_CREDIT', 'TERM_LOAN',
];
export const FACILITY_STATUSES = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING', 'ACTIVE', 'MATURED', 'ACTIVE', 'ACTIVE', 'ACTIVE'];
export const FACILITY_NAMES = [
  'Meridian Aerospace — USD Revolver 2027', 'Northbridge Pharma — Term Loan B', 'Pacific Ridge — Multi-Currency RCF',
  'Silverton Financial — Bridge Facility', 'Atlas Industrial — Working Capital RCF',
  'Greenfield Consumer — Syndicated RCF', 'Pinnacle Healthcare — Bilateral Term', 'Westlake Materials — L/C Facility',
  'Ironclad Infrastructure — Global Revolver', 'Crestview REIT — Credit Facility',
];
const FACILITY_REFERENCES = [
  'FAC-2022-001-A', 'FAC-2023-042-A', 'FAC-2022-108-A', 'FAC-2024-015-A', 'FAC-2023-089-A',
  'FAC-2022-033-A', 'FAC-2021-056-A', 'FAC-2024-002-A', 'FAC-2023-021-A', 'FAC-2022-077-A',
];
const ALL_IN_RATES = [4.85, 6.25, 5.10, 7.15, 5.75, 4.50, 5.90, 3.25, 5.35, 6.50];
const SPREAD_BPS = [125, 225, 150, 315, 200, 100, 240, 75, 185, 300];
const RATE_FLOORS = [1.00, 1.50, 1.00, 2.00, 1.25, 0.75, 1.50, 0.50, 1.00, 2.00];
const RATE_CAPS = [8.00, 9.50, 8.50, 10.00, 9.00, 7.50, 9.50, 6.00, 8.50, 10.00];
const AMORT_TYPES = ['BULLET', 'AMORTIZING', 'BULLET', 'AMORTIZING', 'BULLET', 'BULLET', 'AMORTIZING', 'BULLET', 'BULLET', 'AMORTIZING'];
const PAYMENT_FREQS = ['QUARTERLY', 'MONTHLY', 'QUARTERLY', 'QUARTERLY', 'MONTHLY', 'QUARTERLY', 'MONTHLY', 'QUARTERLY', 'QUARTERLY', 'MONTHLY'];
const DAY_COUNT_CONVENTIONS = [1, 2, 1, 1, 2, 1, 2, 1, 1, 2]; // 1=ACT/360, 2=ACT/365
const REVOLVING_FLAGS = ['Y', 'N', 'Y', 'N', 'N', 'Y', 'N', 'N', 'Y', 'N'];

export const COMMITTED_AMOUNTS = [250_000_000, 500_000_000, 1_000_000_000, 2_500_000_000, 750_000_000, 1_500_000_000, 3_000_000_000, 400_000_000, 600_000_000, 5_000_000_000];

export const AGREEMENT_TYPES = ['SYNDICATED', 'BILATERAL', 'SYNDICATED', 'BILATERAL', 'SYNDICATED', 'SYNDICATED', 'BILATERAL', 'SYNDICATED', 'SYNDICATED', 'BILATERAL'];
export const AGREEMENT_STATUSES = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE'];
export const AGREEMENT_REFERENCES = [
  'CA-2022-001-USD', 'CA-2023-042-EUR', 'CA-2022-108-USD', 'CA-2024-015-GBP', 'CA-2023-089-USD',
  'CA-2022-033-USD', 'CA-2021-056-USD', 'CA-2024-002-USD', 'CA-2023-021-Multi', 'CA-2022-077-USD',
];

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
const SOURCE_DOMAINS = ['LENDING', 'LENDING', 'TRADING', 'PAYMENTS', 'CREDIT_RISK', 'CREDIT_RISK', 'RISK', 'TREASURY', 'FINANCE', 'REGULATORY'];
const SOURCE_FREQUENCIES = ['DAILY', 'DAILY', 'REAL_TIME', 'DAILY', 'WEEKLY', 'WEEKLY', 'DAILY', 'DAILY', 'DAILY', 'QUARTERLY'];
const SOURCE_OWNERS = ['Lending Ops', 'Lending Ops', 'Trading Tech', 'Payments Tech', 'Risk Analytics', 'Risk Analytics', 'CRO Office', 'Treasury Ops', 'Finance', 'Regulatory Reporting'];

export const AMENDMENT_STATUS_CODES = ['DRAFT', 'PENDING', 'APPROVED', 'EFFECTIVE', 'COMPLETED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'SUPERSEDED', 'CANCELLED'];
const AMENDMENT_STATUS_NAMES = ['Draft', 'Pending Approval', 'Approved', 'Effective', 'Completed', 'Rejected', 'Withdrawn', 'Expired', 'Superseded', 'Cancelled'];
const AMENDMENT_STATUS_GROUPS = ['IN_PROGRESS', 'IN_PROGRESS', 'IN_PROGRESS', 'ACTIVE', 'TERMINAL', 'TERMINAL', 'TERMINAL', 'TERMINAL', 'TERMINAL', 'TERMINAL'];
const AMENDMENT_IS_TERMINAL = ['N', 'N', 'N', 'N', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'];

export const AMENDMENT_TYPE_CODES = ['INCREASE', 'EXTENSION', 'PRICING', 'COVENANT', 'PARTY', 'FACILITY', 'SECURITY', 'RESTATEMENT', 'WAIVER', 'DECREASE'];
const AMENDMENT_TYPE_NAMES = [
  'Commitment Increase', 'Maturity Extension', 'Pricing Amendment', 'Covenant Modification',
  'Party Change', 'Facility Restructure', 'Security Package Change', 'Amendment & Restatement',
  'Covenant Waiver', 'Commitment Decrease',
];
const AMENDMENT_TYPE_DESCS = [
  'Increase in committed facility amount', 'Extension of maturity date', 'Change to pricing grid or spread',
  'Modification of financial or non-financial covenants', 'Addition or removal of a party',
  'Restructuring of facility terms', 'Change to collateral or security package', 'Full amendment and restatement of credit agreement',
  'Temporary waiver of covenant compliance', 'Reduction in committed facility amount',
];

export const CREDIT_STATUS_NAMES = ['PERFORMING', 'PERFORMING', 'WATCH', 'SPECIAL_MENTION', 'SUBSTANDARD', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'DOUBTFUL', 'DEFAULT'];
const CREDIT_STATUS_CATEGORIES = ['PASS', 'PASS', 'CRITICIZED', 'CRITICIZED', 'CRITICIZED', 'PASS', 'PASS', 'PASS', 'CRITICIZED', 'NON_PERFORMING'];
const CREDIT_DELINQUENCY_BUCKETS = ['CURRENT', 'CURRENT', '1-29_DPD', '30-59_DPD', '60-89_DPD', 'CURRENT', 'CURRENT', 'CURRENT', '90-179_DPD', '180+_DPD'];
const CREDIT_DEFAULT_FLAGS = ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'Y'];

export const EXPOSURE_TYPE_CODES = ['LOAN', 'REV', 'DERIV', 'SFT', 'COMMIT', 'GUAR', 'L/C', 'COND_COMMIT', 'BOND', 'REPO'];
const EXPOSURE_TYPE_NAMES = [
  'Term Loan', 'Revolving Credit', 'Derivative', 'Securities Financing Transaction',
  'Unconditional Commitment', 'Financial Guarantee', 'Letter of Credit',
  'Conditional Commitment', 'Corporate Bond', 'Repurchase Agreement',
];
const BASEL_EXPOSURE_CLASSES = ['CORPORATE', 'CORPORATE', 'COUNTERPARTY_CREDIT', 'COUNTERPARTY_CREDIT', 'OFF_BALANCE_SHEET', 'OFF_BALANCE_SHEET', 'OFF_BALANCE_SHEET', 'OFF_BALANCE_SHEET', 'CORPORATE', 'COUNTERPARTY_CREDIT'];
const CCF_PCTS = [100.0, 100.0, 100.0, 100.0, 40.0, 50.0, 20.0, 20.0, 100.0, 100.0];
const OFF_BS_FLAGS = ['N', 'N', 'N', 'N', 'Y', 'Y', 'Y', 'Y', 'N', 'N'];
const SA_CCR_CLASSES = ['NA', 'NA', 'INTEREST_RATE', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA'];

export const COLLATERAL_TYPE_NAMES = ['CASH', 'GOVT_SEC', 'CORP_BOND', 'EQUITY', 'REAL_ESTATE', 'RECEIVABLES', 'GUARANTEE', 'GOLD', 'INVENTORY', 'EQUIPMENT'];
const COLLATERAL_CATEGORIES = ['FINANCIAL', 'FINANCIAL', 'FINANCIAL', 'FINANCIAL', 'PHYSICAL', 'RECEIVABLES', 'UNFUNDED', 'PHYSICAL', 'PHYSICAL', 'PHYSICAL'];
const COLLATERAL_DESCS = [
  'Cash and cash equivalents', 'Government securities and sovereign debt', 'Investment-grade corporate bonds',
  'Listed equities on major exchanges', 'Commercial and residential real estate',
  'Trade receivables and invoices', 'Third-party financial guarantees', 'Gold bullion and certificates',
  'Raw materials and finished goods inventory', 'Plant, machinery and equipment',
];
const COLLATERAL_HAIRCUTS = [0.0, 0.5, 4.0, 15.0, 30.0, 20.0, 0.0, 5.0, 25.0, 35.0];
const COLLATERAL_VOL_ADJ = [0.0, 1.0, 6.0, 20.0, 0.0, 0.0, 0.0, 8.0, 0.0, 0.0];
const COLLATERAL_IS_FIN = ['Y', 'Y', 'Y', 'Y', 'N', 'N', 'N', 'Y', 'N', 'N'];
const COLLATERAL_ELIGIBLE_CRM = ['Y', 'Y', 'Y', 'Y', 'Y', 'N', 'Y', 'Y', 'N', 'N'];
const COLLATERAL_HQLA = ['L1', 'L1', 'L2A', 'L2B', 'NONE', 'NONE', 'NONE', 'L1', 'NONE', 'NONE'];
const COLLATERAL_HOLDING_DAYS = [0, 5, 10, 10, 0, 0, 0, 10, 0, 0];
const COLLATERAL_BASEL_RW = ['0%', '0%', '20%', '100%', '100%', '100%', '0%', '0%', '100%', '100%'];
const COLLATERAL_RISK_MIT_SUBTYPES = ['CASH', 'DEBT_SEC', 'DEBT_SEC', 'EQUITY_SEC', 'CRE', 'REC', 'GUARANTEE', 'COMMODITY', 'PHYSICAL', 'PHYSICAL'];

export const CRM_TYPE_CODES = ['COLLATERAL', 'GUARANTEE', 'NETTING', 'CREDIT_DERIV', 'MORTGAGE', 'PLEDGE', 'ASSIGNMENT', 'LIEN', 'SURETY', 'INSURANCE'];
const CRM_TYPE_NAMES = [
  'Financial Collateral', 'Third-Party Guarantee', 'Close-Out Netting', 'Credit Derivative',
  'Real Estate Mortgage', 'Asset Pledge', 'Receivables Assignment', 'Statutory Lien',
  'Surety Bond', 'Credit Insurance',
];
const CRM_CATEGORIES = ['FUNDED', 'UNFUNDED', 'NETTING', 'UNFUNDED', 'FUNDED', 'FUNDED', 'FUNDED', 'FUNDED', 'UNFUNDED', 'UNFUNDED'];
const BASEL_RECOG_METHODS = [
  'COMPREHENSIVE', 'SUBSTITUTION', 'BILATERAL_NETTING', 'SUBSTITUTION',
  'SIMPLE', 'COMPREHENSIVE', 'COMPREHENSIVE', 'SIMPLE', 'SUBSTITUTION', 'SUBSTITUTION',
];
const CRM_RISK_MIT_SUBTYPES = ['FINANCIAL', 'GUARANTEE', 'NETTING', 'CDS', 'CRE', 'PHYSICAL', 'RECEIVABLE', 'STATUTORY', 'SURETY', 'INSURANCE'];

export const LEDGER_ACCOUNT_CODES = ['1200', '1201', '1202', '1300', '1301', '1400', '1500', '1600', '1700', '1800'];
export const LEDGER_ACCOUNT_NAMES = [
  'Commercial Loans', 'Revolvers Drawn', 'Term Loans', 'Commitments', 'Unfunded Revolvers',
  'Letters of Credit', 'Derivatives Receivable', 'Collateral Held', 'Allowance', 'Interest Receivable',
];
const ACCOUNT_CATEGORIES = ['ASSET', 'ASSET', 'ASSET', 'OFF_BALANCE_SHEET', 'OFF_BALANCE_SHEET', 'OFF_BALANCE_SHEET', 'ASSET', 'ASSET', 'CONTRA_ASSET', 'ASSET'];
const ACCOUNT_TYPES = ['LOAN', 'LOAN', 'LOAN', 'COMMITMENT', 'COMMITMENT', 'CONTINGENT', 'DERIVATIVE', 'COLLATERAL', 'ALLOWANCE', 'ACCRUAL'];
const REG_REPORT_CODES = ['FFIEC031_SC_C', 'FFIEC031_SC_C', 'FFIEC031_SC_C', 'FFIEC031_SC_L', 'FFIEC031_SC_L', 'FFIEC031_SC_L', 'FFIEC031_SC_Q', 'FFIEC031_SC_R', 'FFIEC031_SC_C', 'FFIEC031_SC_C'];

export const JURISDICTION_CODES = ['US_FED', 'US_STATE', 'EU', 'UK', 'CH', 'SG', 'HK', 'JP', 'CA', 'AU'];
export const JURISDICTION_NAMES = [
  'United States (Federal)', 'United States (State)', 'European Union', 'United Kingdom', 'Switzerland',
  'Singapore', 'Hong Kong SAR', 'Japan', 'Canada', 'Australia',
];
const JURISDICTION_REGULATORS = ['OCC / FRB / FDIC', 'State Banking Depts', 'ECB / EBA', 'PRA / FCA', 'FINMA', 'MAS', 'HKMA', 'FSA / BOJ', 'OSFI', 'APRA'];
const JURISDICTION_FRAMEWORKS = ['US Basel III (Final Rule)', 'State Banking Law', 'CRR III / CRD VI', 'UK Basel 3.1', 'Swiss SBA', 'MAS Notice 637', 'HKMA SPM', 'FSA Basel III', 'OSFI CAR', 'APRA APS'];

export const GRADE_CODES = ['AAA', 'AA+', 'AA', 'A+', 'A', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB'];
export const GRADE_NAMES = [
  'Prime', 'High Grade', 'High Grade', 'Upper Medium Grade', 'Upper Medium Grade',
  'Lower Medium Grade', 'Lower Medium Grade', 'Lower Medium Grade', 'Non-Investment Grade Speculative', 'Non-Investment Grade Speculative',
];
const GRADE_PD_12M = [0.0001, 0.0002, 0.0003, 0.0005, 0.0008, 0.0015, 0.0025, 0.0040, 0.0075, 0.0120];
const GRADE_LGD_DOWNTURN = [0.30, 0.32, 0.35, 0.38, 0.40, 0.42, 0.45, 0.48, 0.50, 0.55];
const GRADE_RATING_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const GRADE_INVESTMENT_FLAGS = ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'N', 'N'];
const GRADE_NOTCHES = ['AAA', 'AA+', 'AA', 'A+', 'A', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB'];

const RATING_SOURCE_NAMES = [
  'S&P Global Ratings', 'Moody\'s Investors Service', 'Fitch Ratings', 'DBRS Morningstar',
  'Internal PD Model', 'Internal Expert Judgment', 'Kroll Bond Rating Agency', 'Japan Credit Rating',
  'China Chengxin Intl', 'RAM Holdings',
];
const RATING_SOURCE_TYPES = ['EXTERNAL', 'EXTERNAL', 'EXTERNAL', 'EXTERNAL', 'INTERNAL', 'INTERNAL', 'EXTERNAL', 'EXTERNAL', 'EXTERNAL', 'EXTERNAL'];
const RATING_VENDOR_CODES = ['SP', 'MOODYS', 'FITCH', 'DBRS', 'INT_PD', 'INT_EJ', 'KBRA', 'JCR', 'CCXI', 'RAM'];
const RATING_PRIORITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const SCALE_NAMES = ['S&P Long-Term', 'Moody\'s Long-Term', 'Fitch Long-Term', 'DBRS Long-Term', 'Internal 10-Point', 'Internal Expert', 'KBRA Long-Term', 'JCR Long-Term', 'CCXI Long-Term', 'RAM Long-Term'];
const SCALE_TYPES = ['EXTERNAL', 'EXTERNAL', 'EXTERNAL', 'EXTERNAL', 'INTERNAL', 'INTERNAL', 'EXTERNAL', 'EXTERNAL', 'EXTERNAL', 'EXTERNAL'];
const SCALE_COLORS = ['#2E7D32', '#388E3C', '#43A047', '#4CAF50', '#66BB6A', '#FFC107', '#FF9800', '#FF5722', '#E53935', '#B71C1C'];

const COUNTERPARTY_ROLE_CODES = ['BORROWER', 'GUARANTOR', 'AGENT', 'LEAD_ARRANGER', 'PARTICIPANT', 'ISSUER', 'TRUSTEE', 'SERVICER', 'SPONSOR', 'SUBORDINATE'];
const COUNTERPARTY_ROLE_NAMES = [
  'Borrower', 'Guarantor', 'Administrative Agent', 'Lead Arranger',
  'Syndicate Participant', 'Issuer', 'Trustee', 'Servicer', 'Sponsor', 'Subordinated Lender',
];
const COUNTERPARTY_ROLE_CATEGORIES = ['OBLIGOR', 'CREDIT_SUPPORT', 'AGENCY', 'ORIGINATION', 'LENDER', 'OBLIGOR', 'FIDUCIARY', 'OPERATIONS', 'ORIGINATION', 'LENDER'];
const COUNTERPARTY_ROLE_RISK_BEARING = ['Y', 'Y', 'N', 'N', 'Y', 'Y', 'N', 'N', 'N', 'Y'];
const COUNTERPARTY_ROLE_DESCS = [
  'Primary obligor under credit agreement', 'Entity providing guarantee of obligations',
  'Agent bank administering the facility', 'Bank arranging and structuring the deal',
  'Participating lender in syndication', 'Entity issuing instruments',
  'Third-party trustee holding collateral', 'Entity servicing the loan portfolio',
  'Equity sponsor of the transaction', 'Subordinated tranche lender',
];

const DEFAULT_DEF_CODES = ['US_90DPD', 'US_UNLIKELY', 'EU_90DPD', 'EU_UNLIKELY', 'UK_90DPD', 'CH_90DPD', 'SG_90DPD', 'CA_90DPD', 'AU_90DPD', 'GLOBAL_EVENT'];
const DEFAULT_DEF_DESCS = [
  'US: 90+ days past due', 'US: Unlikely to pay in full', 'EU: 90+ days past due per CRR Art 178',
  'EU: Obligor unlikely to pay', 'UK: 90+ days past due per PRA rules', 'CH: 90+ days past due per FINMA',
  'SG: 90+ days past due per MAS', 'CA: 90+ days past due per OSFI', 'AU: 90+ days past due per APRA',
  'Global: Credit event trigger (ISDA)',
];
const DEFAULT_DEF_JURISDICTIONS = ['US_FED', 'US_FED', 'EU', 'EU', 'UK', 'CH', 'SG', 'CA', 'AU', 'US_FED'];
const DEFAULT_DEF_DPD_THRESHOLDS = [90, 0, 90, 0, 90, 90, 90, 90, 90, 0];
const DEFAULT_DEF_CREDIT_EVENT = ['N', 'Y', 'N', 'Y', 'N', 'N', 'N', 'N', 'N', 'Y'];
const DEFAULT_DEF_MATERIALITY = [0, 500, 0, 500, 0, 0, 0, 0, 0, 0];

const MATURITY_BUCKET_CODES = ['ON', '1W', '1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', '10Y+'];
const MATURITY_BUCKET_NAMES = ['Overnight', '1 Week', '1 Month', '3 Months', '6 Months', '1 Year', '2 Years', '5 Years', '10 Years', 'Over 10 Years'];
const BUCKET_START_DAYS = [0, 1, 8, 31, 91, 181, 366, 731, 1826, 3651];
const BUCKET_END_DAYS = [1, 7, 30, 90, 180, 365, 730, 1825, 3650, 99999];

const FR2590_CATEGORY_NAMES = [
  'C&I - Term', 'C&I - Revolving', 'CRE - Construction', 'CRE - Non-Farm Non-Residential',
  'CRE - Multifamily', 'Consumer - Credit Card', 'Consumer - Auto', 'Consumer - Other',
  'Sovereign & Government', 'Interbank',
];
const FR2590_DEFINITIONS = [
  'Commercial & industrial term loans', 'Commercial & industrial revolving credits',
  'Construction and land development loans', 'Non-farm non-residential property loans',
  'Multifamily residential property loans', 'Credit card loans to individuals',
  'Automobile loans to individuals', 'Other consumer purpose loans',
  'Loans to sovereign and government entities', 'Loans to depository institutions',
];

const REG_CAP_BASIS_CODES = ['SA', 'AIRB', 'FIRB', 'SA_CCR', 'IMM', 'CEM', 'BIA', 'STA', 'AMA', 'IMA'];
const REG_CAP_BASIS_NAMES = [
  'Standardized Approach', 'Advanced IRB', 'Foundation IRB', 'SA-CCR', 'Internal Models Method',
  'Current Exposure Method', 'Basic Indicator Approach', 'Standardized Approach (OpRisk)',
  'Advanced Measurement Approach', 'Internal Models Approach',
];
const REG_CAP_BASIS_DESCS = [
  'Basel III Standardized Approach for credit risk', 'Advanced Internal Ratings-Based approach',
  'Foundation Internal Ratings-Based approach', 'Standardized Approach for Counterparty Credit Risk',
  'Internal Models Method for counterparty credit risk', 'Current Exposure Method (legacy)',
  'Basic Indicator Approach for operational risk', 'Standardized Approach for operational risk',
  'Advanced Measurement Approach for operational risk', 'Internal Models Approach for market risk',
];

const CONTEXT_DOMAINS = ['RISK', 'REGULATORY', 'FINANCIAL', 'OPERATIONAL', 'MANAGEMENT', 'STRESS_TEST', 'AUDIT', 'PRICING', 'COMPLIANCE', 'TREASURY'];
const CONTEXT_CODES = ['RISK_MGMT', 'REG_REPORT', 'FIN_STMT', 'OPS_DAILY', 'MGMT_REVIEW', 'CCAR_BASE', 'IA_REVIEW', 'PRICING_GRID', 'BSA_AML', 'ALM'];
const CONTEXT_NAMES = [
  'Risk Management', 'Regulatory Reporting', 'Financial Statement', 'Operational Daily',
  'Management Review', 'CCAR Baseline', 'Internal Audit Review', 'Pricing Grid',
  'BSA/AML Compliance', 'Asset-Liability Management',
];
const CONTEXT_DESCS = [
  'Internal risk management and monitoring', 'Regulatory report submissions (FR Y-14Q, FFIEC)',
  'GAAP/IFRS financial statement preparation', 'Daily operational risk monitoring',
  'Senior management portfolio review', 'CCAR/DFAST stress test baseline scenario',
  'Internal audit and SOX review', 'Client pricing and profitability analysis',
  'BSA/AML compliance monitoring', 'Interest rate risk and liquidity management',
];

const METRIC_CODES = ['PD_TTC', 'LGD_DTWN', 'EAD', 'RWA', 'ECL', 'DSCR', 'LTV', 'UTIL', 'ROE', 'NCO_RATE'];
const METRIC_NAMES = [
  'Probability of Default (TTC)', 'Loss Given Default (Downturn)', 'Exposure at Default',
  'Risk-Weighted Assets', 'Expected Credit Loss', 'Debt Service Coverage Ratio',
  'Loan-to-Value Ratio', 'Utilization Rate', 'Return on Equity', 'Net Charge-Off Rate',
];
const METRIC_DOMAINS = ['CREDIT_RISK', 'CREDIT_RISK', 'CREDIT_RISK', 'CAPITAL', 'LOSS', 'CREDIT_QUALITY', 'CREDIT_QUALITY', 'EXPOSURE', 'PROFITABILITY', 'LOSS'];
const METRIC_DEFINITIONS = [
  'Through-the-cycle probability of obligor default within 12 months',
  'Expected loss severity in economic downturn conditions',
  'Total exposure amount at time of potential default',
  'Risk-weighted asset amount per Basel III capital rules',
  'Expected credit loss under CECL/IFRS 9 methodology',
  'Ratio of net operating income to total debt service',
  'Ratio of outstanding loan balance to appraised property value',
  'Ratio of drawn amount to total committed facility amount',
  'Net income attributable to allocated equity capital',
  'Annualized net charge-offs as percentage of average loans',
];
const METRIC_PERIODICITIES = ['MONTHLY', 'QUARTERLY', 'DAILY', 'QUARTERLY', 'MONTHLY', 'QUARTERLY', 'QUARTERLY', 'DAILY', 'QUARTERLY', 'QUARTERLY'];
const METRIC_UOMS = ['RATIO', 'RATIO', 'USD', 'USD', 'USD', 'RATIO', 'RATIO', 'RATIO', 'RATIO', 'RATIO'];
const METRIC_VERSIONS = ['3.2', '3.2', '3.2', '3.2', '2.1', '2.0', '2.0', '1.5', '1.5', '1.5'];

const ORG_UNIT_CODES = ['NY-CB', 'NY-GCB', 'LN-EMEA', 'TK-APAC', 'NY-CRE', 'CH-WM', 'NY-RISK', 'NY-GTS', 'SF-TECH', 'HK-ASIA'];
const ORG_UNIT_NAMES = [
  'New York - Commercial Banking', 'New York - Global Corporate Banking', 'London - EMEA Coverage',
  'Tokyo - APAC Coverage', 'New York - CRE Lending', 'Charlotte - Wealth Management',
  'New York - Enterprise Risk', 'New York - Global Transaction Services', 'San Francisco - Technology Banking',
  'Hong Kong - Asia Coverage',
];
const ORG_UNIT_TYPES = ['COVERAGE', 'COVERAGE', 'REGIONAL', 'REGIONAL', 'PRODUCT', 'LOB', 'CONTROL', 'PRODUCT', 'SECTOR', 'REGIONAL'];
const COST_CENTER_CODES = ['CC-1001', 'CC-1002', 'CC-2001', 'CC-3001', 'CC-1003', 'CC-4001', 'CC-5001', 'CC-1004', 'CC-1005', 'CC-3002'];

/* Date dim: 10 month-end dates spanning a year */
const DATE_DIM_DATES = ['2025-01-31', '2024-12-31', '2024-11-30', '2024-10-31', '2024-09-30', '2024-06-30', '2024-03-31', '2023-12-31', '2023-09-30', '2023-06-30'];
const DATE_YEARS = [2025, 2024, 2024, 2024, 2024, 2024, 2024, 2023, 2023, 2023];
const DATE_QUARTERS = ['Q1', 'Q4', 'Q4', 'Q4', 'Q3', 'Q2', 'Q1', 'Q4', 'Q3', 'Q2'];
const DATE_MONTHS = [1, 12, 11, 10, 9, 6, 3, 12, 9, 6];
const DATE_DAYS = [31, 31, 30, 31, 30, 30, 31, 31, 30, 30];
const DATE_DOWS = [6, 3, 7, 4, 1, 1, 1, 1, 7, 6]; // 1=Mon..7=Sun
const DATE_DAY_NAMES = ['Friday', 'Tuesday', 'Saturday', 'Thursday', 'Monday', 'Sunday', 'Sunday', 'Sunday', 'Saturday', 'Friday'];
const DATE_IS_WEEKEND = ['N', 'N', 'Y', 'N', 'N', 'Y', 'Y', 'Y', 'Y', 'N'];
const DATE_IS_BUS_DAY = ['Y', 'Y', 'N', 'Y', 'Y', 'N', 'N', 'N', 'N', 'Y'];
const DATE_FISCAL_YEARS = [2025, 2025, 2025, 2025, 2025, 2024, 2024, 2024, 2024, 2024]; // fiscal year ending March
const DATE_FISCAL_QUARTERS = ['FQ4', 'FQ3', 'FQ3', 'FQ3', 'FQ2', 'FQ1', 'FQ4', 'FQ3', 'FQ2', 'FQ1'];
const DATE_FISCAL_MONTHS = [10, 9, 8, 7, 6, 3, 12, 9, 6, 3];

const GOVERNING_LAWS = ['NEW_YORK', 'ENGLISH', 'NEW_YORK', 'ENGLISH', 'NEW_YORK', 'NEW_YORK', 'ENGLISH', 'NEW_YORK', 'NEW_YORK', 'ENGLISH'];
const NETTING_AGR_TYPES = ['ISDA_MASTER', 'ISDA_MASTER', 'GMRA', 'GMSLA', 'ISDA_MASTER', 'ISDA_MASTER', 'GMRA', 'ISDA_MASTER', 'ISDA_MASTER', 'GMSLA'];
const NETTING_SET_TYPES = ['OTC_DERIVATIVES', 'OTC_DERIVATIVES', 'REPO', 'SEC_LENDING', 'OTC_DERIVATIVES', 'OTC_DERIVATIVES', 'REPO', 'OTC_DERIVATIVES', 'OTC_DERIVATIVES', 'SEC_LENDING'];
const MARGIN_FREQUENCIES = ['DAILY', 'DAILY', 'DAILY', 'WEEKLY', 'DAILY', 'DAILY', 'DAILY', 'WEEKLY', 'DAILY', 'WEEKLY'];
const MARGIN_MODELS = ['ISDA_SIMM', 'ISDA_SIMM', 'SCHEDULE', 'SCHEDULE', 'ISDA_SIMM', 'ISDA_SIMM', 'SCHEDULE', 'ISDA_SIMM', 'ISDA_SIMM', 'SCHEDULE'];

const CSA_TYPES = ['VM_ONLY', 'VM_AND_IM', 'VM_ONLY', 'VM_AND_IM', 'VM_ONLY', 'VM_AND_IM', 'VM_ONLY', 'VM_AND_IM', 'VM_ONLY', 'VM_AND_IM'];
const CSA_ELIGIBLE_COLLATERAL = [
  'Cash (USD, EUR, GBP)', 'Cash and Government Securities', 'Cash (USD, EUR)',
  'Cash, Govt Secs, IG Corp Bonds', 'Cash (USD)', 'Cash and Government Securities',
  'Cash (EUR, GBP)', 'Cash and Government Securities', 'Cash (USD, JPY)', 'Cash, Govt Secs, Gold',
];
const IM_AMOUNTS = [0, 15_000_000, 0, 25_000_000, 0, 12_000_000, 0, 18_000_000, 0, 22_000_000];
const VM_AMOUNTS = [5_200_000, 8_100_000, 3_400_000, 12_500_000, 2_800_000, 6_700_000, 4_100_000, 9_300_000, 7_600_000, 11_200_000];
const THRESHOLD_AMOUNTS = [10_000_000, 15_000_000, 10_000_000, 0, 25_000_000, 10_000_000, 15_000_000, 0, 20_000_000, 0];
const MIN_TRANSFER_AMOUNTS = [500_000, 500_000, 250_000, 100_000, 1_000_000, 500_000, 500_000, 250_000, 500_000, 250_000];
const INDEPENDENT_AMOUNTS = [0, 5_000_000, 0, 10_000_000, 0, 3_000_000, 0, 8_000_000, 0, 6_000_000];

const COLLATERAL_CHARGE_TYPES = ['FIRST_LIEN', 'SECOND_LIEN', 'FIRST_LIEN', 'PLEDGE', 'FIRST_MORTGAGE', 'FLOATING_CHARGE', 'UNSECURED', 'PLEDGE', 'FLOATING_CHARGE', 'FIRST_MORTGAGE'];
const COLLATERAL_ASSET_TYPES = ['CASH_DEPOSIT', 'UST_BONDS', 'CORP_BOND_IG', 'LISTED_EQUITY', 'COMMERCIAL_RE', 'TRADE_RECEIVABLES', 'PARENT_GUARANTEE', 'GOLD_BULLION', 'RAW_MATERIALS', 'MANUFACTURING_EQUIP'];
const COLLATERAL_STATUSES = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING_VALUATION', 'ACTIVE'];
const COLLATERAL_LIEN_PRIORITIES = [1, 2, 1, 1, 1, 1, 0, 1, 1, 1];
const COLLATERAL_REVAL_FREQS = ['DAILY', 'DAILY', 'WEEKLY', 'DAILY', 'ANNUAL', 'MONTHLY', 'ANNUAL', 'DAILY', 'SEMI_ANNUAL', 'ANNUAL'];
const COLLATERAL_ORIG_COSTS = [50_000_000, 75_000_000, 30_000_000, 20_000_000, 125_000_000, 15_000_000, 0, 10_000_000, 8_000_000, 45_000_000];

const ANCHOR_TYPES = ['FACILITY', 'FACILITY', 'CONTRACT', 'FACILITY', 'FACILITY', 'FACILITY', 'CONTRACT', 'FACILITY', 'FACILITY', 'CONTRACT'];
const LINK_TYPE_CODES = ['DIRECT', 'CROSS_COLLATERAL', 'DIRECT', 'DIRECT', 'BLANKET', 'DIRECT', 'DIRECT', 'CROSS_COLLATERAL', 'DIRECT', 'BLANKET'];

const PLEDGED_AMOUNTS = [50_000_000, 75_000_000, 30_000_000, 20_000_000, 125_000_000, 15_000_000, 0, 10_000_000, 8_000_000, 45_000_000];
const PLEDGED_CURRENCIES = ['USD', 'USD', 'EUR', 'USD', 'USD', 'USD', 'USD', 'USD', 'AUD', 'USD'];

const CONTRACT_TYPES = ['CREDIT_FACILITY', 'CREDIT_FACILITY', 'ISDA_MASTER', 'CREDIT_FACILITY', 'CREDIT_FACILITY', 'CREDIT_FACILITY', 'GMRA', 'CREDIT_FACILITY', 'CREDIT_FACILITY', 'GMSLA'];
const CONTRACT_STATUSES = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING', 'ACTIVE', 'MATURED', 'ACTIVE', 'ACTIVE', 'ACTIVE'];

const PROTECTION_REFS = [
  'CRM-2022-001', 'CRM-2023-015', 'CRM-2022-042', 'CRM-2024-003', 'CRM-2023-028',
  'CRM-2022-055', 'CRM-2021-019', 'CRM-2024-008', 'CRM-2023-033', 'CRM-2022-061',
];
const PROTECTION_NOTIONALS = [50_000_000, 100_000_000, 75_000_000, 200_000_000, 125_000_000, 80_000_000, 150_000_000, 60_000_000, 90_000_000, 250_000_000];
const PROTECTION_COVERAGES = [100.0, 80.0, 100.0, 50.0, 75.0, 100.0, 60.0, 100.0, 90.0, 100.0];

const HAIRCUT_METHOD = ['SUPERVISORY', 'SUPERVISORY', 'OWN_ESTIMATES', 'SUPERVISORY', 'OWN_ESTIMATES', 'OWN_ESTIMATES', 'SUPERVISORY', 'SUPERVISORY', 'OWN_ESTIMATES', 'SUPERVISORY'];

const REPORTING_ENTITY_CODES = ['MNB_CONSOL', 'MNB_BANK', 'MSI_BD', 'MBE_EU', 'MSE_EU', 'MBJ_JP', 'MBC_CA', 'MWM_US', 'MLC_US', 'MMS_US'];
const REPORTING_ENTITY_NAMES = [
  'Meridian National Bancorp (Consolidated)', 'Meridian National Bank, N.A.', 'Meridian Securities Inc.',
  'Meridian Bank Europe DAC', 'Meridian Securities Europe SA', 'Meridian Bank (Japan) Ltd.',
  'Meridian Bank Canada', 'Meridian Wealth Management LLC', 'Meridian Leasing Corp.', 'Meridian Merchant Services Inc.',
];

const REPORT_NAMES = [
  'FR Y-14Q', 'FR Y-9C', 'FFIEC 031', 'FFIEC 041', 'FR 2052a',
  'CCAR Capital Plan', 'DFAST Stress Test', 'FR 2590', 'FFIEC 009', 'FR Y-14M',
];
const REPORT_DESCRIPTIONS = [
  'Quarterly Capital Assessment & Stress Testing', 'Consolidated Financial Statements for BHCs',
  'Call Report (large banks with foreign offices)', 'Call Report (banks without foreign offices)',
  'Complex Institution Liquidity Monitoring Report',
  'Capital Plan submitted under CCAR', 'Dodd-Frank Stress Test Results',
  'Large Financial Institution Shared National Credits', 'Country Exposure Report', 'Monthly Capital Assessment Report',
];

/* ───────────────────────────── N = 10 ──────────────────────────── */

const N = 10;

/**
 * Returns a realistic seed value for (tableName, columnName, rowIndex) or null to use default logic.
 * Ensures FKs reference existing dimension rows (same index or rowIndex % N).
 */
export function getSeedValue(tableName: string, columnName: string, rowIndex: number): string | number | null {
  const idx = rowIndex % N;

  switch (tableName) {

    /* ──────────── currency_dim ──────────── */
    case 'currency_dim':
      if (columnName === 'currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'currency_name') return CURRENCY_NAMES[idx];
      if (columnName === 'currency_symbol') return CURRENCY_SYMBOLS[idx];
      if (columnName === 'minor_unit_decimals') return [2, 2, 2, 2, 0, 2, 2, 2, 2, 2][idx];
      if (columnName === 'is_active') return 'Y';
      if (columnName === 'iso_numeric') return ISO_NUMERIC_CURRENCY[idx];
      if (columnName === 'is_g10_currency') return IS_G10_CURRENCY[idx];
      break;

    /* ──────────── country_dim ──────────── */
    case 'country_dim':
      if (columnName === 'country_code') return COUNTRY_CODES[idx];
      if (columnName === 'country_name') return COUNTRY_NAMES[idx];
      if (columnName === 'iso_alpha_3') return ISO_ALPHA_3[idx];
      if (columnName === 'iso_numeric') return ISO_NUMERIC_COUNTRY[idx];
      if (columnName === 'is_active') return 'Y';
      if (columnName === 'region_code') return COUNTRY_REGION_CODES[idx];
      if (columnName === 'basel_country_risk_weight') return BASEL_COUNTRY_RISK_WEIGHTS[idx];
      if (columnName === 'is_developed_market') return 'Y';
      if (columnName === 'is_fatf_high_risk') return 'N';
      if (columnName === 'is_ofac_sanctioned') return 'N';
      if (columnName === 'jurisdiction_id') return idx + 1;
      break;

    /* ──────────── region_dim ──────────── */
    case 'region_dim':
      if (columnName === 'region_code') return REGION_CODES[idx];
      if (columnName === 'region_name') return REGION_NAMES[idx];
      if (columnName === 'display_order') return idx + 1;
      if (columnName === 'is_active_flag') return 'Y';
      if (columnName === 'region_group_code') return REGION_GROUPS[idx];
      if (columnName === 'source_system_id') return 10; // Regulatory
      break;

    /* ──────────── regulatory_jurisdiction ──────────── */
    case 'regulatory_jurisdiction':
      if (columnName === 'jurisdiction_code') return JURISDICTION_CODES[idx];
      if (columnName === 'jurisdiction_name') return JURISDICTION_NAMES[idx];
      if (columnName === 'jurisdiction_id') return idx + 1;
      if (columnName === 'is_active') return 'Y';
      if (columnName === 'primary_regulator') return JURISDICTION_REGULATORS[idx];
      if (columnName === 'regulatory_framework') return JURISDICTION_FRAMEWORKS[idx];
      break;

    /* ──────────── entity_type_dim ──────────── */
    case 'entity_type_dim':
      if (columnName === 'entity_type_code') return ENTITY_TYPE_CODES[idx];
      if (columnName === 'entity_type_name') return ENTITY_TYPE_NAMES[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'is_financial_institution') return IS_FIN_INST[idx];
      if (columnName === 'is_sovereign') return IS_SOVEREIGN[idx];
      if (columnName === 'regulatory_counterparty_class') return REG_CPTY_CLASS[idx];
      break;

    /* ──────────── credit_event_type_dim ──────────── */
    case 'credit_event_type_dim': {
      const eventNames = ['Failure to Pay', 'Bankruptcy', 'Obligation Acceleration', 'Obligation Default', 'Restructuring', 'Repudiation/Moratorium', 'Governmental Intervention', 'Cross Default', 'Distressed Exchange', 'Rating Downgrade'];
      const triggers = ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'N', 'N', 'N'];
      if (columnName === 'credit_event_type_code') return idx + 1;
      if (columnName === 'credit_event_type_id') return idx + 1;
      if (columnName === 'credit_event_type_name') return eventNames[idx];
      if (columnName === 'default_trigger_flag') return triggers[idx];
      if (columnName === 'active_flag') return 'Y';
      break;
    }

    /* ──────────── credit_status_dim ──────────── */
    case 'credit_status_dim':
      if (columnName === 'credit_status_code') return idx + 1;
      if (columnName === 'credit_status_name') return CREDIT_STATUS_NAMES[idx];
      if (columnName === 'default_flag') return CREDIT_DEFAULT_FLAGS[idx];
      if (columnName === 'delinquency_bucket') return CREDIT_DELINQUENCY_BUCKETS[idx];
      if (columnName === 'status_category') return CREDIT_STATUS_CATEGORIES[idx];
      break;

    /* ──────────── exposure_type_dim ──────────── */
    case 'exposure_type_dim':
      if (columnName === 'exposure_type_id') return idx + 1;
      if (columnName === 'exposure_type_code') return EXPOSURE_TYPE_CODES[idx];
      if (columnName === 'exposure_type_name') return EXPOSURE_TYPE_NAMES[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'basel_exposure_class') return BASEL_EXPOSURE_CLASSES[idx];
      if (columnName === 'ccf_pct') return CCF_PCTS[idx];
      if (columnName === 'off_balance_sheet_flag') return OFF_BS_FLAGS[idx];
      if (columnName === 'product_id') return idx + 1;
      if (columnName === 'sa_ccr_asset_class') return SA_CCR_CLASSES[idx];
      break;

    /* ──────────── amendment_status_dim ──────────── */
    case 'amendment_status_dim':
      if (columnName === 'amendment_status_code') return AMENDMENT_STATUS_CODES[idx];
      if (columnName === 'amendment_status_name') return AMENDMENT_STATUS_NAMES[idx];
      if (columnName === 'status_group') return AMENDMENT_STATUS_GROUPS[idx];
      if (columnName === 'is_terminal_flag') return AMENDMENT_IS_TERMINAL[idx];
      if (columnName === 'active_flag') return 'Y';
      break;

    /* ──────────── amendment_type_dim ──────────── */
    case 'amendment_type_dim':
      if (columnName === 'amendment_type_code') return AMENDMENT_TYPE_CODES[idx];
      if (columnName === 'amendment_type_name') return AMENDMENT_TYPE_NAMES[idx];
      if (columnName === 'description') return AMENDMENT_TYPE_DESCS[idx];
      if (columnName === 'active_flag') return 'Y';
      break;

    /* ──────────── default_definition_dim ──────────── */
    case 'default_definition_dim':
      if (columnName === 'default_definition_id') return idx + 1;
      if (columnName === 'default_definition_code') return DEFAULT_DEF_CODES[idx];
      if (columnName === 'description') return DEFAULT_DEF_DESCS[idx];
      if (columnName === 'jurisdiction_code') return DEFAULT_DEF_JURISDICTIONS[idx];
      if (columnName === 'days_past_due_threshold') return DEFAULT_DEF_DPD_THRESHOLDS[idx];
      if (columnName === 'credit_event_trigger_flag') return DEFAULT_DEF_CREDIT_EVENT[idx];
      if (columnName === 'materiality_threshold_amt') return DEFAULT_DEF_MATERIALITY[idx];
      break;

    /* ──────────── maturity_bucket_dim ──────────── */
    case 'maturity_bucket_dim':
      if (columnName === 'maturity_bucket_id') return idx + 1;
      if (columnName === 'bucket_code') return MATURITY_BUCKET_CODES[idx];
      if (columnName === 'bucket_name') return MATURITY_BUCKET_NAMES[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'bucket_start_days') return BUCKET_START_DAYS[idx];
      if (columnName === 'bucket_end_days') return BUCKET_END_DAYS[idx];
      if (columnName === 'jurisdiction_code') return 'US_FED';
      if (columnName === 'regulatory_framework') return 'US Basel III (Final Rule)';
      break;

    /* ──────────── fr2590_category_dim ──────────── */
    case 'fr2590_category_dim':
      if (columnName === 'fr2590_category_code') return idx + 1;
      if (columnName === 'category_name') return FR2590_CATEGORY_NAMES[idx];
      if (columnName === 'definition') return FR2590_DEFINITIONS[idx];
      if (columnName === 'display_order') return idx + 1;
      if (columnName === 'active_flag') return 'Y';
      break;

    /* ──────────── counterparty_role_dim ──────────── */
    case 'counterparty_role_dim':
      if (columnName === 'counterparty_role_code') return COUNTERPARTY_ROLE_CODES[idx];
      if (columnName === 'role_name') return COUNTERPARTY_ROLE_NAMES[idx];
      if (columnName === 'role_category') return COUNTERPARTY_ROLE_CATEGORIES[idx];
      if (columnName === 'is_risk_bearing_flag') return COUNTERPARTY_ROLE_RISK_BEARING[idx];
      if (columnName === 'description') return COUNTERPARTY_ROLE_DESCS[idx];
      if (columnName === 'is_active_flag') return 'Y';
      break;

    /* ──────────── rating_scale_dim ──────────── */
    case 'rating_scale_dim':
      if (columnName === 'rating_scale_id') return idx + 1;
      if (columnName === 'scale_name') return SCALE_NAMES[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'default_flag') return idx === 0 ? 'Y' : 'N';
      if (columnName === 'display_color_hex') return SCALE_COLORS[idx];
      if (columnName === 'investment_grade_flag') return GRADE_INVESTMENT_FLAGS[idx];
      if (columnName === 'pd_implied') return GRADE_PD_12M[idx];
      if (columnName === 'rating_grade_id') return idx + 1;
      if (columnName === 'rating_notch') return GRADE_NOTCHES[idx];
      if (columnName === 'rating_value') return GRADE_RATING_VALUES[idx];
      if (columnName === 'scale_type') return SCALE_TYPES[idx];
      break;

    /* ──────────── crm_type_dim ──────────── */
    case 'crm_type_dim':
      if (columnName === 'crm_type_code') return CRM_TYPE_CODES[idx];
      if (columnName === 'crm_type_name') return CRM_TYPE_NAMES[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'basel_recognition_method') return BASEL_RECOG_METHODS[idx];
      if (columnName === 'crm_category') return CRM_CATEGORIES[idx];
      if (columnName === 'eligible_flag') return 'Y';
      if (columnName === 'risk_mitigant_subtype_code') return CRM_RISK_MIT_SUBTYPES[idx];
      break;

    /* ──────────── source_system_registry ──────────── */
    case 'source_system_registry':
      if (columnName === 'source_system_name') return SOURCE_SYSTEM_NAMES[idx];
      if (columnName === 'data_domain') return SOURCE_DOMAINS[idx];
      if (columnName === 'ingestion_frequency') return SOURCE_FREQUENCIES[idx];
      if (columnName === 'system_owner') return SOURCE_OWNERS[idx];
      if (columnName === 'active_flag') return 'Y';
      break;

    /* ──────────── date_dim ──────────── */
    case 'date_dim':
      if (columnName === 'date_id') return idx + 1;
      if (columnName === 'calendar_date') return DATE_DIM_DATES[idx];
      if (columnName === 'calendar_year') return DATE_YEARS[idx];
      if (columnName === 'calendar_quarter') return DATE_QUARTERS[idx];
      if (columnName === 'calendar_month') return DATE_MONTHS[idx];
      if (columnName === 'day_of_month') return DATE_DAYS[idx];
      if (columnName === 'day_of_week') return DATE_DOWS[idx];
      if (columnName === 'day_name') return DATE_DAY_NAMES[idx];
      if (columnName === 'fiscal_year') return DATE_FISCAL_YEARS[idx];
      if (columnName === 'fiscal_quarter') return DATE_FISCAL_QUARTERS[idx];
      if (columnName === 'fiscal_month') return DATE_FISCAL_MONTHS[idx];
      if (columnName === 'is_weekend') return DATE_IS_WEEKEND[idx];
      if (columnName === 'is_month_end') return 'Y';
      if (columnName === 'is_quarter_end') return ['Y', 'Y', 'N', 'N', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'][idx];
      if (columnName === 'is_year_end') return ['N', 'Y', 'N', 'N', 'N', 'N', 'N', 'Y', 'N', 'N'][idx];
      if (columnName === 'is_us_business_day') return DATE_IS_BUS_DAY[idx];
      if (columnName === 'is_us_bank_holiday') return 'N';
      if (columnName === 'date_day') return DATE_DAYS[idx];
      if (columnName === 'date_month') return DATE_MONTHS[idx];
      if (columnName === 'date_quarter') return DATE_QUARTERS[idx];
      if (columnName === 'date_year') return DATE_YEARS[idx];
      break;

    /* ──────────── date_time_dim ──────────── */
    case 'date_time_dim': {
      const hours = [0, 6, 8, 10, 12, 14, 16, 18, 20, 23];
      const tzCodes = ['EST', 'EST', 'GMT', 'CET', 'JST', 'CET', 'EST', 'AEST', 'CET', 'SGT'];
      const isDST = ['N', 'N', 'N', 'N', 'N', 'Y', 'Y', 'N', 'N', 'N'];
      if (columnName === 'date_time_id') return idx + 1;
      if (columnName === 'date_id') return idx + 1;
      if (columnName === 'timestamp_utc') return `${DATE_DIM_DATES[idx]} ${String(hours[idx]).padStart(2, '0')}:00:00`;
      if (columnName === 'hour_of_day') return hours[idx];
      if (columnName === 'minute_of_hour') return 0;
      if (columnName === 'second_of_minute') return 0;
      if (columnName === 'timezone_code') return tzCodes[idx];
      if (columnName === 'is_dst') return isDST[idx];
      break;
    }

    /* ──────────── regulatory_capital_basis_dim ──────────── */
    case 'regulatory_capital_basis_dim':
      if (columnName === 'regulatory_capital_basis_id') return idx + 1;
      if (columnName === 'basis_code') return REG_CAP_BASIS_CODES[idx];
      if (columnName === 'basis_name') return REG_CAP_BASIS_NAMES[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'description') return REG_CAP_BASIS_DESCS[idx];
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'jurisdiction_code') return ['US_FED', 'US_FED', 'US_FED', 'US_FED', 'US_FED', 'US_FED', 'US_FED', 'US_FED', 'US_FED', 'US_FED'][idx];
      break;

    /* ──────────── industry_dim ──────────── */
    case 'industry_dim':
      if (columnName === 'industry_code') return INDUSTRY_CODES[idx];
      if (columnName === 'industry_name') return INDUSTRY_NAMES[idx];
      if (columnName === 'industry_level') return INDUSTRY_LEVELS[idx];
      if (columnName === 'industry_standard') return INDUSTRY_STANDARDS[idx];
      if (columnName === 'parent_industry_id') return idx < 5 ? null : Math.ceil(idx / 2);
      if (columnName === 'active_flag') return 'Y';
      break;

    /* ──────────── enterprise_business_taxonomy ──────────── */
    case 'enterprise_business_taxonomy':
      if (columnName === 'segment_code') return LOB_SEGMENT_CODES[idx];
      if (columnName === 'segment_name') return LOB_SEGMENT_NAMES[idx];
      if (columnName === 'parent_segment_id') return idx < 3 ? null : (idx < 6 ? 1 : 3);
      if (columnName === 'change_event') return 'INITIAL_LOAD';
      if (columnName === 'comments') return 'Loaded from enterprise taxonomy';
      if (columnName === 'description') return LOB_SEGMENT_NAMES[idx];
      if (columnName === 'long_description') return `${LOB_SEGMENT_NAMES[idx]} business segment`;
      if (columnName === 'parent') return idx < 3 ? 'ROOT' : (idx < 6 ? LOB_SEGMENT_CODES[0] : LOB_SEGMENT_CODES[2]);
      if (columnName === 'parent_leaf') return idx >= 6 ? 'Y' : 'N';
      if (columnName === 'requestor') return 'Enterprise Data Office';
      if (columnName === 'status') return 'ACTIVE';
      if (columnName === 'substatus') return 0;
      if (columnName === 'tree_level') return idx < 3 ? 1 : (idx < 6 ? 2 : 3);
      break;

    /* ──────────── enterprise_product_taxonomy ──────────── */
    case 'enterprise_product_taxonomy':
      if (columnName === 'product_code') return PRODUCT_CODES[idx];
      if (columnName === 'product_name') return PRODUCT_NAMES[idx];
      if (columnName === 'parent_node_id') return idx < 3 ? null : (idx < 6 ? 1 : 2);
      if (columnName === 'change_event') return 'INITIAL_LOAD';
      if (columnName === 'comments') return 'Loaded from product taxonomy';
      if (columnName === 'description') return PRODUCT_NAMES[idx];
      if (columnName === 'long_description') return `${PRODUCT_NAMES[idx]} product type`;
      if (columnName === 'fr2590_category_code') return (idx % 10) + 1;
      if (columnName === 'parent') return idx < 3 ? 'ROOT' : (idx < 6 ? PRODUCT_CODES[0] : PRODUCT_CODES[1]);
      if (columnName === 'parent_leaf') return idx >= 6 ? 'Y' : 'N';
      if (columnName === 'requestor') return 'Enterprise Data Office';
      if (columnName === 'status') return 'ACTIVE';
      if (columnName === 'substatus') return 0;
      if (columnName === 'tree_level') return idx < 3 ? 1 : (idx < 6 ? 2 : 3);
      break;

    /* ──────────── portfolio_dim ──────────── */
    case 'portfolio_dim':
      if (columnName === 'portfolio_code') return PORTFOLIO_CODES[idx];
      if (columnName === 'portfolio_name') return PORTFOLIO_NAMES[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'lob_segment_id') return (idx % 5) + 1;
      if (columnName === 'parent_portfolio_id') return idx < 4 ? null : (idx % 4) + 1;
      if (columnName === 'portfolio_type') return PORTFOLIO_TYPES[idx];
      break;

    /* ──────────── org_unit_dim ──────────── */
    case 'org_unit_dim':
      if (columnName === 'org_unit_code') return ORG_UNIT_CODES[idx];
      if (columnName === 'org_unit_name') return ORG_UNIT_NAMES[idx];
      if (columnName === 'parent_org_unit_id') return idx < 2 ? null : (idx % 2) + 1;
      if (columnName === 'cost_center_code') return COST_CENTER_CODES[idx];
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'is_current') return 'Y';
      if (columnName === 'lob_segment_id') return (idx % 5) + 1;
      if (columnName === 'manager_user_id') return idx + 1;
      if (columnName === 'org_unit_type') return ORG_UNIT_TYPES[idx];
      if (columnName === 'source_system_id') return 7; // Internal Risk
      break;

    /* ──────────── rating_source ──────────── */
    case 'rating_source':
      if (columnName === 'source_name') return RATING_SOURCE_NAMES[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'priority_rank') return RATING_PRIORITIES[idx];
      if (columnName === 'rating_source_name') return RATING_SOURCE_NAMES[idx];
      if (columnName === 'rating_source_type') return RATING_SOURCE_TYPES[idx];
      if (columnName === 'vendor_code') return RATING_VENDOR_CODES[idx];
      break;

    /* ──────────── rating_grade_dim ──────────── */
    case 'rating_grade_dim':
      if (columnName === 'grade_code') return GRADE_CODES[idx];
      if (columnName === 'grade_name') return GRADE_NAMES[idx];
      if (columnName === 'default_flag') return idx >= 9 ? 'Y' : 'N';
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'is_current') return 'Y';
      if (columnName === 'lgd_downturn') return GRADE_LGD_DOWNTURN[idx];
      if (columnName === 'pd_12m') return GRADE_PD_12M[idx];
      if (columnName === 'rating_grade_code') return idx + 1;
      if (columnName === 'rating_grade_name') return GRADE_NAMES[idx];
      if (columnName === 'rating_notch') return GRADE_NOTCHES[idx];
      if (columnName === 'rating_scale_code') return idx < 5 ? 'INTERNAL' : 'EXTERNAL';
      if (columnName === 'source_system_id') return idx < 4 ? 5 : 7; // Moody's or Internal Risk
      break;

    /* ──────────── collateral_type ──────────── */
    case 'collateral_type':
      if (columnName === 'name') return COLLATERAL_TYPE_NAMES[idx];
      if (columnName === 'collateral_category') return COLLATERAL_CATEGORIES[idx];
      if (columnName === 'description') return COLLATERAL_DESCS[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'basel_rwa_weight') return COLLATERAL_BASEL_RW[idx];
      if (columnName === 'hqla_level') return COLLATERAL_HQLA[idx];
      if (columnName === 'is_eligible_crm') return COLLATERAL_ELIGIBLE_CRM[idx];
      if (columnName === 'is_financial_collateral') return COLLATERAL_IS_FIN[idx];
      if (columnName === 'minimum_holding_period_days') return COLLATERAL_HOLDING_DAYS[idx];
      if (columnName === 'risk_mitigant_subtype_code') return COLLATERAL_RISK_MIT_SUBTYPES[idx];
      if (columnName === 'standard_haircut_pct') return COLLATERAL_HAIRCUTS[idx];
      if (columnName === 'volatility_adjustment_pct') return COLLATERAL_VOL_ADJ[idx];
      break;

    /* ──────────── interest_rate_index_dim ──────────── */
    case 'interest_rate_index_dim':
      if (columnName === 'index_code') return RATE_INDEX_CODES[idx];
      if (columnName === 'index_name') return RATE_INDEX_NAMES[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'cessation_date') return '9999-12-31'; // active indices — far-future sentinel
      if (columnName === 'compounding_method') return INDEX_COMPOUNDING[idx];
      if (columnName === 'currency_code') return INDEX_CURRENCIES[idx];
      if (columnName === 'day_count_convention') return INDEX_DAYCOUNTS[idx];
      if (columnName === 'fallback_spread_bps') return INDEX_FALLBACK_BPS[idx];
      if (columnName === 'fallback_to_index_id') return idx === 2 ? 1 : (idx === 6 ? 1 : null); // EURIBOR/CDOR fall back to SOFR
      if (columnName === 'index_family') return INDEX_FAMILIES[idx];
      if (columnName === 'is_bmu_compliant') return INDEX_BMU[idx];
      if (columnName === 'is_fallback_rate') return INDEX_IS_FALLBACK[idx];
      if (columnName === 'publication_source') return INDEX_PUBLICATIONS[idx];
      if (columnName === 'tenor_code') return INDEX_TENORS[idx];
      break;

    /* ──────────── ledger_account_dim ──────────── */
    case 'ledger_account_dim':
      if (columnName === 'account_code') return LEDGER_ACCOUNT_CODES[idx];
      if (columnName === 'account_name') return LEDGER_ACCOUNT_NAMES[idx];
      if (columnName === 'account_category') return ACCOUNT_CATEGORIES[idx];
      if (columnName === 'account_type') return ACCOUNT_TYPES[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'effective_from_date') return '2020-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'is_reconciliation_account') return ['Y', 'Y', 'Y', 'N', 'N', 'N', 'Y', 'N', 'Y', 'Y'][idx];
      if (columnName === 'legal_entity_id') return 1;
      if (columnName === 'lob_segment_id') return (idx % 5) + 1;
      if (columnName === 'parent_account_id') return idx < 3 ? null : (idx < 6 ? 1 : 4);
      if (columnName === 'regulatory_report_code') return REG_REPORT_CODES[idx];
      if (columnName === 'source_system_id') return 9; // GL
      break;

    /* ──────────── context_dim ──────────── */
    case 'context_dim':
      if (columnName === 'context_domain') return CONTEXT_DOMAINS[idx];
      if (columnName === 'context_code') return CONTEXT_CODES[idx];
      if (columnName === 'context_name') return CONTEXT_NAMES[idx];
      if (columnName === 'description') return CONTEXT_DESCS[idx];
      if (columnName === 'is_active_flag') return 'Y';
      break;

    /* ──────────── metric_definition_dim ──────────── */
    case 'metric_definition_dim':
      if (columnName === 'metric_code') return METRIC_CODES[idx];
      if (columnName === 'metric_name') return METRIC_NAMES[idx];
      if (columnName === 'calculation_rule_id') return idx + 1;
      if (columnName === 'definition_text') return METRIC_DEFINITIONS[idx];
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'is_active_flag') return 'Y';
      if (columnName === 'metric_domain') return METRIC_DOMAINS[idx];
      if (columnName === 'periodicity_code') return METRIC_PERIODICITIES[idx];
      if (columnName === 'source_system_id') return 7; // Internal Risk
      if (columnName === 'unit_of_measure') return METRIC_UOMS[idx];
      if (columnName === 'version') return METRIC_VERSIONS[idx];
      break;

    /* ──────────── counterparty ──────────── */
    case 'counterparty':
      if (columnName === 'legal_name') return COUNTERPARTY_LEGAL_NAMES[idx];
      if (columnName === 'counterparty_type') return COUNTERPARTY_TYPES[idx];
      if (columnName === 'country_code') return CPTY_COUNTRIES[idx];
      if (columnName === 'entity_type_code') return CPTY_ENTITY_TYPES[idx];
      if (columnName === 'industry_id') return CPTY_INDUSTRIES[idx];
      if (columnName === 'basel_asset_class') return CPTY_BASEL_ASSET_CLASS[idx];
      if (columnName === 'basel_risk_grade') return CPTY_BASEL_GRADES[idx];
      if (columnName === 'call_report_counterparty_type') return CPTY_CALL_REPORT_TYPES[idx];
      if (columnName === 'country_of_domicile') return COUNTRY_CODES.indexOf(CPTY_COUNTRIES[idx]) + 1;
      if (columnName === 'country_of_incorporation') return COUNTRY_CODES.indexOf(CPTY_COUNTRIES[idx]) + 1;
      if (columnName === 'country_of_risk') return COUNTRY_CODES.indexOf(CPTY_COUNTRIES[idx]) + 1;
      if (columnName === 'external_rating_fitch') return CPTY_EXTERNAL_FITCH[idx];
      if (columnName === 'external_rating_moodys') return CPTY_EXTERNAL_MOODYS[idx];
      if (columnName === 'external_rating_sp') return CPTY_EXTERNAL_SP[idx];
      if (columnName === 'fr2590_counterparty_type') return CPTY_FR2590_TYPES[idx];
      if (columnName === 'internal_risk_rating') return CPTY_INTERNAL_RATINGS[idx];
      if (columnName === 'is_affiliated') return 'N';
      if (columnName === 'is_central_counterparty') return 'N';
      if (columnName === 'is_financial_institution') return IS_FIN_INST[ENTITY_TYPE_CODES.indexOf(CPTY_ENTITY_TYPES[idx])];
      if (columnName === 'is_insider') return 'N';
      if (columnName === 'is_multilateral_dev_bank') return 'N';
      if (columnName === 'is_parent_flag') return 'Y';
      if (columnName === 'is_public_sector_entity') return 'N';
      if (columnName === 'is_regulated_entity') return idx === 3 ? 'Y' : 'N';
      if (columnName === 'is_sovereign') return 'N';
      if (columnName === 'lei_code') return CPTY_LEI[idx];
      if (columnName === 'lgd_unsecured') return CPTY_LGD[idx];
      if (columnName === 'pd_annual') return CPTY_PD[idx];
      if (columnName === 'regulatory_counterparty_type') return CPTY_REG_TYPES[idx];
      if (columnName === 'y14_obligor_type') return CPTY_Y14_TYPES[idx];
      break;

    /* ──────────── legal_entity ──────────── */
    case 'legal_entity':
      if (columnName === 'legal_name') return LEGAL_ENTITY_NAMES[idx];
      if (columnName === 'legal_entity_name') return LEGAL_ENTITY_NAMES[idx];
      if (columnName === 'country_code') return COUNTRY_CODES[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'entity_type_code') return LE_ENTITY_TYPE_CODES[idx];
      if (columnName === 'functional_currency_code') return LE_FUNC_CURRENCIES[idx];
      if (columnName === 'institution_id') return 1; // all belong to same GSIB holding company
      if (columnName === 'is_reporting_entity') return LE_IS_REPORTING[idx];
      if (columnName === 'lei_code') return CPTY_LEI[idx]; // reuse LEI array
      if (columnName === 'primary_regulator') return LE_PRIMARY_REGULATORS[idx];
      if (columnName === 'rssd_id') return LE_RSSD_IDS[idx];
      if (columnName === 'short_name') return LE_SHORT_NAMES[idx];
      if (columnName === 'tax_id') return LE_TAX_IDS[idx];
      break;

    /* ──────────── instrument_master ──────────── */
    case 'instrument_master': {
      const instNames = [
        'Senior Unsecured Note 5Y', 'Subordinated Note 10Y', 'Floating Rate Note 3Y',
        'Senior Secured Bond 7Y', 'Convertible Bond 5Y', 'Commercial Paper 90D',
        'Medium-Term Note 5Y', 'Covered Bond 7Y', 'Green Bond 10Y', 'Perpetual Bond',
      ];
      const instTypes = ['BOND', 'BOND', 'FRN', 'BOND', 'CONVERTIBLE', 'CP', 'MTN', 'COVERED', 'GREEN_BOND', 'PERP'];
      const seniorities = ['SENIOR_UNSECURED', 'SUBORDINATED', 'SENIOR_UNSECURED', 'SENIOR_SECURED', 'SUBORDINATED', 'SENIOR_UNSECURED', 'SENIOR_UNSECURED', 'SECURED', 'SENIOR_UNSECURED', 'SUBORDINATED'];
      const coupons = [4.50, 5.75, 0.0, 4.25, 3.50, 0.0, 4.85, 3.75, 5.10, 6.25];
      const couponFreqs = ['SEMI_ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'SEMI_ANNUAL', 'SEMI_ANNUAL', 'NONE', 'SEMI_ANNUAL', 'ANNUAL', 'SEMI_ANNUAL', 'SEMI_ANNUAL'];
      if (columnName === 'country_code') return COUNTRY_CODES[idx];
      if (columnName === 'currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'coupon_frequency') return couponFreqs[idx];
      if (columnName === 'coupon_rate') return coupons[idx];
      if (columnName === 'instrument_name') return instNames[idx];
      if (columnName === 'instrument_type') return instTypes[idx];
      if (columnName === 'is_callable') return idx === 9 ? 'Y' : 'N';
      if (columnName === 'is_convertible') return idx === 4 ? 'Y' : 'N';
      if (columnName === 'issue_date') return ORIGINATION_DATES[idx];
      if (columnName === 'issuer_counterparty_id') return idx + 1;
      if (columnName === 'maturity_date') return MATURITY_DATES[idx];
      if (columnName === 'product_id') return idx + 1;
      if (columnName === 'seniority') return seniorities[idx];
      break;
    }

    /* ──────────── instrument_identifier ──────────── */
    case 'instrument_identifier': {
      const idTypes = ['CUSIP', 'ISIN', 'CUSIP', 'ISIN', 'CUSIP', 'ISIN', 'CUSIP', 'ISIN', 'CUSIP', 'ISIN'];
      const idValues = [
        '12345A100', 'US12345A1007', '23456B200', 'GB23456B2008', '34567C300',
        'DE34567C3009', '45678D400', 'FR45678D4000', '56789E500', 'JP56789E5001',
      ];
      if (columnName === 'id_type') return idTypes[idx];
      if (columnName === 'id_value') return idValues[idx];
      if (columnName === 'source_system_id') return 1; // LoanIQ
      if (columnName === 'is_primary') return 'Y';
      break;
    }

    /* ──────────── credit_agreement_master ──────────── */
    case 'credit_agreement_master':
      if (columnName === 'agreement_type') return AGREEMENT_TYPES[idx];
      if (columnName === 'status_code') return AGREEMENT_STATUSES[idx];
      if (columnName === 'agreement_reference') return AGREEMENT_REFERENCES[idx];
      if (columnName === 'currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'origination_date') return getOriginationDate(rowIndex);
      if (columnName === 'maturity_date') return getMaturityDate(rowIndex);
      break;

    /* ──────────── facility_master ──────────── */
    case 'facility_master':
      if (columnName === 'facility_name') return FACILITY_NAMES[idx];
      if (columnName === 'facility_type') return FACILITY_TYPES[idx];
      if (columnName === 'facility_status') return FACILITY_STATUSES[idx];
      if (columnName === 'committed_facility_amt') return COMMITTED_AMOUNTS[idx];
      if (columnName === 'currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'origination_date') return getOriginationDate(rowIndex);
      if (columnName === 'maturity_date') return getMaturityDate(rowIndex);
      if (columnName === 'all_in_rate_pct') return ALL_IN_RATES[idx];
      if (columnName === 'amortization_type') return AMORT_TYPES[idx];
      if (columnName === 'created_by') return 'SYSTEM';
      if (columnName === 'day_count_convention') return DAY_COUNT_CONVENTIONS[idx];
      if (columnName === 'facility_reference') return FACILITY_REFERENCES[idx];
      if (columnName === 'interest_rate_reference') return Math.round((ALL_IN_RATES[idx] - (SPREAD_BPS[idx] / 100)) * 100) / 100;
      if (columnName === 'interest_rate_spread_bps') return SPREAD_BPS[idx];
      if (columnName === 'interest_rate_type') return idx % 2 === 0 ? 'FLOATING' : 'FIXED';
      if (columnName === 'next_repricing_date') return idx % 2 === 0 ? '2025-04-30' : '9999-12-31';
      if (columnName === 'payment_frequency') return PAYMENT_FREQS[idx];
      if (columnName === 'prepayment_penalty_flag') return idx % 3 === 0 ? 'Y' : 'N';
      if (columnName === 'product_id') return idx + 1;
      if (columnName === 'rate_cap_pct') return RATE_CAPS[idx];
      if (columnName === 'rate_floor_pct') return RATE_FLOORS[idx];
      if (columnName === 'region_code') return COUNTRY_REGION_CODES[idx];
      if (columnName === 'revolving_flag') return REVOLVING_FLAGS[idx];
      if (columnName === 'industry_code') return INDUSTRY_CODES[idx];
      break;

    /* ──────────── contract_master ──────────── */
    case 'contract_master':
      if (columnName === 'contract_type') return CONTRACT_TYPES[idx];
      if (columnName === 'contract_status') return CONTRACT_STATUSES[idx];
      if (columnName === 'effective_start_date') return ORIGINATION_DATES[idx];
      if (columnName === 'contract_end_date') return MATURITY_DATES[idx];
      break;

    /* ──────────── netting_agreement ──────────── */
    case 'netting_agreement':
      if (columnName === 'governing_law') return GOVERNING_LAWS[idx];
      if (columnName === 'is_bankruptcy_remote') return 'N';
      if (columnName === 'is_enforceable') return 'Y';
      if (columnName === 'margin_frequency') return MARGIN_FREQUENCIES[idx];
      if (columnName === 'minimum_transfer_amount') return MIN_TRANSFER_AMOUNTS[idx];
      if (columnName === 'netting_agreement_type') return NETTING_AGR_TYPES[idx];
      if (columnName === 'threshold_amount') return THRESHOLD_AMOUNTS[idx];
      break;

    /* ──────────── netting_set ──────────── */
    case 'netting_set':
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'governing_law') return GOVERNING_LAWS[idx];
      if (columnName === 'is_enforceable_flag') return 'Y';
      if (columnName === 'master_agreement_reference') return `ISDA-${2020 + idx}-${String(idx + 1).padStart(3, '0')}`;
      if (columnName === 'netting_set_type') return NETTING_SET_TYPES[idx];
      break;

    /* ──────────── netting_set_link ──────────── */
    case 'netting_set_link':
      if (columnName === 'anchor_type') return ANCHOR_TYPES[idx];
      if (columnName === 'source_system_id') return 1; // LoanIQ
      break;

    /* ──────────── csa_master ──────────── */
    case 'csa_master':
      if (columnName === 'csa_type') return CSA_TYPES[idx];
      if (columnName === 'currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'eligible_collateral_desc') return CSA_ELIGIBLE_COLLATERAL[idx];
      if (columnName === 'governing_law') return GOVERNING_LAWS[idx];
      if (columnName === 'independent_amount') return INDEPENDENT_AMOUNTS[idx];
      if (columnName === 'margin_frequency') return MARGIN_FREQUENCIES[idx];
      if (columnName === 'minimum_transfer_amount') return MIN_TRANSFER_AMOUNTS[idx];
      if (columnName === 'threshold_amount') return THRESHOLD_AMOUNTS[idx];
      break;

    /* ──────────── margin_agreement ──────────── */
    case 'margin_agreement':
      if (columnName === 'as_of_date') return '2025-01-31';
      if (columnName === 'currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'im_amount') return IM_AMOUNTS[idx];
      if (columnName === 'margin_model') return MARGIN_MODELS[idx];
      if (columnName === 'vm_amount') return VM_AMOUNTS[idx];
      break;

    /* ──────────── collateral_asset_master ──────────── */
    case 'collateral_asset_master':
      if (columnName === 'country_code') return COUNTRY_CODES[idx];
      if (columnName === 'currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'charge_type') return COLLATERAL_CHARGE_TYPES[idx];
      if (columnName === 'collateral_asset_type') return COLLATERAL_ASSET_TYPES[idx];
      if (columnName === 'collateral_id') return idx + 1;
      if (columnName === 'collateral_status') return COLLATERAL_STATUSES[idx];
      if (columnName === 'description') return COLLATERAL_DESCS[idx];
      if (columnName === 'insurance_expiry_date') return idx === 4 ? '2026-06-30' : '9999-12-31';
      if (columnName === 'insurance_flag') return idx === 4 ? 'Y' : 'N';
      if (columnName === 'lien_priority') return COLLATERAL_LIEN_PRIORITIES[idx];
      if (columnName === 'location_country_code') return COUNTRY_CODES[idx];
      if (columnName === 'location_description') return `${COUNTRY_NAMES[idx]} — Primary Location`;
      if (columnName === 'maturity_date') return idx < 5 ? MATURITY_DATES[idx] : null;
      if (columnName === 'original_cost') return COLLATERAL_ORIG_COSTS[idx];
      if (columnName === 'regulatory_eligible_flag') return COLLATERAL_ELIGIBLE_CRM[idx];
      if (columnName === 'revaluation_frequency') return COLLATERAL_REVAL_FREQS[idx];
      if (columnName === 'source_record_id') return idx + 1;
      if (columnName === 'valuation_currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'vintage_date') return ORIGINATION_DATES[idx];
      break;

    /* ──────────── collateral_link ──────────── */
    case 'collateral_link':
      if (columnName === 'anchor_type') return ANCHOR_TYPES[idx];
      if (columnName === 'source_system_id') return 1;
      if (columnName === 'link_type_code') return LINK_TYPE_CODES[idx];
      if (columnName === 'pledged_amount') return PLEDGED_AMOUNTS[idx];
      if (columnName === 'pledged_currency_code') return PLEDGED_CURRENCIES[idx];
      break;

    /* ──────────── collateral_eligibility_dim ──────────── */
    case 'collateral_eligibility_dim':
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'eligible_flag') return COLLATERAL_ELIGIBLE_CRM[idx];
      if (columnName === 'jurisdiction_code') return 'US_FED';
      if (columnName === 'haircut_method') return HAIRCUT_METHOD[idx];
      break;

    /* ──────────── collateral_haircut_dim ──────────── */
    case 'collateral_haircut_dim':
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'haircut_pct') return COLLATERAL_HAIRCUTS[idx];
      if (columnName === 'jurisdiction_code') return 'US_FED';
      if (columnName === 'volatility_adjustment_pct') return COLLATERAL_VOL_ADJ[idx];
      break;

    /* ──────────── crm_eligibility_dim ──────────── */
    case 'crm_eligibility_dim':
      if (columnName === 'crm_type_code') return CRM_TYPE_CODES[idx];
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'eligible_flag') return 'Y';
      if (columnName === 'jurisdiction_code') return 'US_FED';
      if (columnName === 'eligibility_conditions') return `Basel III eligible under ${JURISDICTION_FRAMEWORKS[0]}`;
      break;

    /* ──────────── crm_protection_master ──────────── */
    case 'crm_protection_master':
      if (columnName === 'crm_type_code') return CRM_TYPE_CODES[idx];
      if (columnName === 'currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'notional_amount') return PROTECTION_NOTIONALS[idx];
      if (columnName === 'maturity_date') return MATURITY_DATES[idx];
      if (columnName === 'enforceable_flag') return 'Y';
      if (columnName === 'coverage_pct') return PROTECTION_COVERAGES[idx];
      if (columnName === 'protection_reference') return PROTECTION_REFS[idx];
      break;

    /* ──────────── protection_link ──────────── */
    case 'protection_link': {
      const allocAmts = [50_000_000, 75_000_000, 30_000_000, 200_000_000, 125_000_000, 80_000_000, 150_000_000, 60_000_000, 90_000_000, 250_000_000];
      const allocPcts = [100.0, 75.0, 100.0, 80.0, 50.0, 100.0, 60.0, 100.0, 90.0, 100.0];
      if (columnName === 'allocated_amount') return allocAmts[idx];
      if (columnName === 'allocated_currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'allocation_pct') return allocPcts[idx];
      if (columnName === 'anchor_type') return ANCHOR_TYPES[idx];
      if (columnName === 'source_system_id') return 1;
      break;
    }

    /* ──────────── risk_mitigant_type_dim ──────────── */
    case 'risk_mitigant_type_dim': {
      const rmtCodes = ['CASH', 'DEBT_SEC', 'EQUITY_SEC', 'CRE', 'RRE', 'RECEIVABLE', 'GUARANTEE', 'CDS', 'PHYSICAL', 'INSURANCE'];
      const rmtNames = ['Cash Collateral', 'Debt Securities', 'Equity Securities', 'Commercial Real Estate', 'Residential Real Estate', 'Receivables', 'Third-Party Guarantee', 'Credit Default Swap', 'Physical Collateral', 'Credit Insurance'];
      const rmtCategories = ['FINANCIAL', 'FINANCIAL', 'FINANCIAL', 'PHYSICAL', 'PHYSICAL', 'RECEIVABLES', 'UNFUNDED', 'UNFUNDED', 'PHYSICAL', 'UNFUNDED'];
      const rmtParentCodes = ['FUNDED', 'FUNDED', 'FUNDED', 'FUNDED', 'FUNDED', 'FUNDED', 'UNFUNDED', 'UNFUNDED', 'FUNDED', 'UNFUNDED'];
      const rmtParentNames = ['Funded CRM', 'Funded CRM', 'Funded CRM', 'Funded CRM', 'Funded CRM', 'Funded CRM', 'Unfunded CRM', 'Unfunded CRM', 'Funded CRM', 'Unfunded CRM'];
      if (columnName === 'risk_mitigant_subtype_code') return rmtCodes[idx];
      if (columnName === 'subtype_name') return rmtNames[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'display_order') return idx + 1;
      if (columnName === 'eligible_flag') return ['Y', 'Y', 'Y', 'Y', 'Y', 'N', 'Y', 'Y', 'N', 'Y'][idx];
      if (columnName === 'mitigant_category') return rmtCategories[idx];
      if (columnName === 'parent_group_code') return rmtParentCodes[idx];
      if (columnName === 'parent_group_name') return rmtParentNames[idx];
      if (columnName === 'source_system_id') return 7; // Internal Risk
      break;
    }

    /* ──────────── risk_mitigant_master ──────────── */
    case 'risk_mitigant_master': {
      const rmDescs = [
        'Cash collateral pledge — USD deposit', 'UST bond collateral — 5Y maturity',
        'Corporate bond IG pledge', 'Listed equity collateral — NYSE',
        'Commercial real estate first mortgage', 'Trade receivables assignment',
        'Parent company guarantee — Silverton Financial', 'Credit default swap — single name',
        'Inventory blanket lien', 'Credit insurance policy — trade credit',
      ];
      const rmSourceTypes = ['PLEDGE', 'PLEDGE', 'PLEDGE', 'PLEDGE', 'MORTGAGE', 'ASSIGNMENT', 'GUARANTEE', 'CDS', 'LIEN', 'INSURANCE'];
      if (columnName === 'risk_mitigant_subtype_code') return COLLATERAL_RISK_MIT_SUBTYPES[idx];
      if (columnName === 'collateral_asset_id') return idx + 1;
      if (columnName === 'description') return rmDescs[idx];
      if (columnName === 'effective_from_date') return ORIGINATION_DATES[idx];
      if (columnName === 'effective_to_date') return idx === 6 ? '2025-12-01' : '9999-12-31';
      if (columnName === 'is_active_flag') return 'Y';
      if (columnName === 'mitigant_source_type') return rmSourceTypes[idx];
      if (columnName === 'protection_id') return idx + 1;
      if (columnName === 'provider_counterparty_id') return idx < 5 ? idx + 1 : (idx % 5) + 1;
      if (columnName === 'source_record_id') return 100_000 + idx + 1;
      if (columnName === 'source_system_id') return 1; // LoanIQ
      break;
    }

    /* ──────────── risk_mitigant_link ──────────── */
    case 'risk_mitigant_link':
      if (columnName === 'anchor_type') return ANCHOR_TYPES[idx];
      break;

    /* ──────────── collateral_portfolio ──────────── */
    case 'collateral_portfolio': {
      const cpDescs = [
        'GCB collateral pool — investment grade', 'Commercial banking secured portfolio',
        'GBM derivatives collateral', 'Wealth management pledge accounts',
        'GWM securities-based lending', 'GTS trade finance collateral',
        'Credit division general pledges', 'Markets margin collateral',
        'Treasury repo collateral pool', 'Risk management hedging book',
      ];
      const cpOverrides = [
        'GCB IG Collateral Pool', 'CB Secured Pool', 'GBM Derivatives Margin',
        'WM Pledge Portfolio', 'GWM SBL Portfolio', 'GTS Trade Collateral',
        'Credit General Pledges', 'Markets Margin Pool', 'Treasury Repo Pool', 'Risk Hedging Book',
      ];
      if (columnName === 'description') return cpDescs[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'portfolio_name_override') return cpOverrides[idx];
      break;
    }

    /* ──────────── counterparty_hierarchy ──────────── */
    case 'counterparty_hierarchy':
      if (columnName === 'hierarchy_type') return 'CORPORATE_FAMILY';
      if (columnName === 'ownership_pct') return 100.0;
      break;

    /* ──────────── legal_entity_hierarchy ──────────── */
    case 'legal_entity_hierarchy': {
      const lehConsolidation = ['FULL', 'FULL', 'FULL', 'FULL', 'FULL', 'FULL', 'FULL', 'EQUITY', 'FULL', 'FULL'];
      const lehLevels = ['1', '2', '2', '2', '3', '2', '2', '2', '2', '2'];
      const lehPaths = ['/MNB', '/MNB/MSI', '/MNB/MCC', '/MNB/MBE', '/MNB/MBE/MSE', '/MNB/MBJ', '/MNB/MBC', '/MNB/MWM', '/MNB/MLC', '/MNB/MMS'];
      const lehOwnership = [100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 51.0, 100.0, 100.0];
      if (columnName === 'as_of_date') return '2025-01-31';
      if (columnName === 'consolidation_method') return lehConsolidation[idx];
      if (columnName === 'hierarchy_level') return lehLevels[idx];
      if (columnName === 'hierarchy_path') return lehPaths[idx];
      if (columnName === 'hierarchy_type') return 'OWNERSHIP';
      if (columnName === 'ownership_pct') return lehOwnership[idx];
      // Parent FK must match the hierarchy path:
      // id=1 (MNB) is root (parent=self), id=5 (MSE) parent=4 (MBE), all others parent=1
      if (columnName === 'parent_legal_entity_id') return idx === 4 ? 4 : 1;
      if (columnName === 'ultimate_parent_legal_entity_id') return 1;
      break;
    }

    /* ──────────── control_relationship ──────────── */
    case 'control_relationship': {
      // Realistic parent-subsidiary pairs among counterparties
      // e.g., row 0: cpty 1 (Meridian Aerospace) controls cpty 5 (Atlas Industrial) as subsidiary
      const crParents      = [1, 1, 3, 4, 6, 6, 7, 8, 9, 10];
      const crSubsidiaries = [5, 2, 8, 3, 7, 9, 2, 5, 10, 1]; // ensure no self-reference
      const crControlTypes = ['MAJORITY_OWNERSHIP', 'SIGNIFICANT_INFLUENCE', 'MAJORITY_OWNERSHIP', 'FINANCIAL_INTERCONNECTION', 'MAJORITY_OWNERSHIP', 'OPERATIONAL_CONTROL', 'SIGNIFICANT_INFLUENCE', 'MAJORITY_OWNERSHIP', 'CONTRACTUAL_CONTROL', 'SIGNIFICANT_INFLUENCE'];
      const crOwnership = [80.0, 30.0, 100.0, 51.0, 65.0, 100.0, 25.0, 75.0, 100.0, 20.0];
      if (columnName === 'parent_counterparty_id') return crParents[idx];
      if (columnName === 'subsidiary_counterparty_id') return crSubsidiaries[idx];
      if (columnName === 'control_type_code') return crControlTypes[idx];
      if (columnName === 'controlled_counterparty_id') return crSubsidiaries[idx];
      if (columnName === 'controller_counterparty_id') return crParents[idx];
      if (columnName === 'ownership_pct') return crOwnership[idx];
      if (columnName === 'relationship_type') return 'MAJORITY_OWNED';
      if (columnName === 'source_system_id') return 7; // Internal Risk
      break;
    }

    /* ──────────── economic_interdependence_relationship ──────────── */
    case 'economic_interdependence_relationship': {
      // Pairs of economically interdependent counterparties (no self-references)
      // e.g., Meridian Aerospace (1) supplies Atlas Industrial (5)
      const eiCpty1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1];
      const eiCpty2 = [5, 7, 8, 3, 9, 7, 2, 10, 6, 3];
      const eiTypes = ['SUPPLY_CHAIN', 'REVENUE_DEPENDENCY', 'SUPPLY_CHAIN', 'FINANCIAL_DEPENDENCY', 'SUPPLY_CHAIN', 'REVENUE_DEPENDENCY', 'SUPPLY_CHAIN', 'FINANCIAL_DEPENDENCY', 'REVENUE_DEPENDENCY', 'SUPPLY_CHAIN'];
      const eiScores = ['HIGH', 'MEDIUM', 'LOW', 'HIGH', 'MEDIUM', 'LOW', 'HIGH', 'MEDIUM', 'LOW', 'HIGH'];
      const eiRationales = [0.85, 0.60, 0.35, 0.90, 0.55, 0.30, 0.80, 0.50, 0.25, 0.75];
      if (columnName === 'counterparty_id_1') return eiCpty1[idx];
      if (columnName === 'counterparty_id_2') return eiCpty2[idx];
      if (columnName === 'interdependence_type_code') return eiTypes[idx];
      if (columnName === 'interdependence_strength_score') return eiScores[idx];
      if (columnName === 'rationale') return eiRationales[idx];
      if (columnName === 'relationship_type') return 'ECONOMIC_INTERDEPENDENCE';
      if (columnName === 'source_system_id') return 7; // Internal Risk
      break;
    }

    /* ──────────── sccl_counterparty_group ──────────── */
    case 'sccl_counterparty_group': {
      // 6 groups (not 10 — some counterparties share groups to show SCCL aggregation)
      // Group 1: Meridian Aerospace + Atlas Industrial (supply chain interdependence)
      // Group 2: Northbridge Pharma + Pinnacle Healthcare (same sector consolidation)
      // Group 3: Pacific Ridge Energy (standalone)
      // Group 4: Silverton Financial (standalone FI)
      // Group 5: Greenfield Consumer + Westlake Materials (supply chain)
      // Group 6: Ironclad Infrastructure + Crestview RE (economic interdependence)
      const scclNames = [
        'Aerospace & Industrial Group', 'Healthcare & Pharma Group', 'Pacific Ridge Energy Group',
        'Silverton Financial Group', 'Consumer & Materials Group', 'Infrastructure & RE Group',
        'Aerospace & Industrial Group', 'Healthcare & Pharma Group', 'Consumer & Materials Group', 'Infrastructure & RE Group',
      ];
      const scclBases = ['CORPORATE_FAMILY', 'CORPORATE_FAMILY', 'CORPORATE_FAMILY', 'FINANCIAL_INTERCONNECTION', 'SUPPLY_CHAIN', 'ECONOMIC_INTERDEPENDENCE', 'CORPORATE_FAMILY', 'CORPORATE_FAMILY', 'SUPPLY_CHAIN', 'ECONOMIC_INTERDEPENDENCE'];
      // Map to 6 logical groups, repeating IDs for the shared groups
      const scclUltParents = [1, 2, 3, 4, 6, 9, 1, 2, 6, 9];
      if (columnName === 'group_name') return scclNames[idx];
      if (columnName === 'sccl_group_name') return scclNames[idx];
      if (columnName === 'group_type') return 'CORPORATE_FAMILY';
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'as_of_date') return '2025-01-31';
      if (columnName === 'created_by') return 'CREDIT_RISK_SYSTEM';
      if (columnName === 'grouping_basis') return scclBases[idx];
      if (columnName === 'jurisdiction_code') return JURISDICTION_CODES[idx];
      if (columnName === 'run_version_id') return 1;
      if (columnName === 'ultimate_parent_counterparty_id') return scclUltParents[idx];
      break;
    }

    /* ──────────── sccl_counterparty_group_member ──────────── */
    case 'sccl_counterparty_group_member': {
      // Members map counterparties to their SCCL groups
      // Group 1 (sccl_group_id=1): cpty 1 (parent), cpty 5 (subsidiary)
      // Group 2 (sccl_group_id=2): cpty 2 (parent), cpty 7 (subsidiary)
      // Group 3 (sccl_group_id=3): cpty 3 (standalone)
      // Group 4 (sccl_group_id=4): cpty 4 (standalone FI)
      // Group 5 (sccl_group_id=5): cpty 6 (parent), cpty 8 (subsidiary)
      // Group 6 (sccl_group_id=6): cpty 9 (parent), cpty 10 (subsidiary)
      const memberGroups = [1, 2, 3, 4, 5, 6, 1, 2, 5, 6]; // sccl_group_id
      const memberCptys  = [1, 2, 3, 4, 6, 9, 5, 7, 8, 10]; // counterparty_id
      const memberRoles  = ['ULTIMATE_PARENT', 'ULTIMATE_PARENT', 'ULTIMATE_PARENT', 'ULTIMATE_PARENT', 'ULTIMATE_PARENT', 'ULTIMATE_PARENT', 'SUBSIDIARY', 'SUBSIDIARY', 'SUBSIDIARY', 'SUBSIDIARY'];
      const memberOwnership = [100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 80.0, 75.0, 100.0, 60.0];
      if (columnName === 'sccl_group_id') return memberGroups[idx];
      if (columnName === 'counterparty_id') return memberCptys[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'effective_start_date') return '2024-01-01';
      if (columnName === 'effective_end_date') return '9999-12-31';
      if (columnName === 'included_flag') return 'Y';
      if (columnName === 'member_role_code') return memberRoles[idx];
      if (columnName === 'ownership_pct') return memberOwnership[idx];
      if (columnName === 'sccl_group_member_id') return idx + 1;
      if (columnName === 'source_system_id') return 7; // Internal Risk
      break;
    }

    /* ──────────── limit_rule ──────────── */
    case 'limit_rule': {
      const limitRuleCodes = ['LR-SN-001', 'LR-SC-002', 'LR-CY-003', 'LR-PD-004', 'LR-MT-005', 'LR-FX-006', 'LR-LL-007', 'LR-CRE-008', 'LR-FIG-009', 'LR-UN-010'];
      const limitNames = ['Single Name Limit', 'Sector Concentration', 'Country Limit', 'Product Limit', 'Maturity Limit', 'FX Exposure Limit', 'Leveraged Lending', 'CRE Concentration', 'FIG Limit', 'Unsecured Limit'];
      const limitAmounts = [5_000_000_000, 25_000_000_000, 15_000_000_000, 10_000_000_000, 20_000_000_000, 8_000_000_000, 12_000_000_000, 18_000_000_000, 7_000_000_000, 6_000_000_000];
      const limitScopes = ['COUNTERPARTY', 'SECTOR', 'COUNTRY', 'PRODUCT', 'MATURITY', 'CURRENCY', 'SECTOR', 'ASSET_CLASS', 'SECTOR', 'COLLATERAL'];
      const limitTypes = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]; // limit_type is DECIMAL — 1 = hard limit
      const riskTiers = [1.0, 2.0, 2.0, 3.0, 3.0, 2.0, 1.0, 1.0, 2.0, 3.0]; // also DECIMAL
      const innerThresholds = [80.0, 75.0, 80.0, 85.0, 75.0, 80.0, 70.0, 75.0, 80.0, 85.0];
      const outerThresholds = [95.0, 90.0, 95.0, 95.0, 90.0, 95.0, 85.0, 90.0, 95.0, 95.0];
      if (columnName === 'rule_code') return limitRuleCodes[idx];
      if (columnName === 'rule_name') return limitNames[idx];
      if (columnName === 'limit_name') return limitNames[idx];
      if (columnName === 'as_of_date') return '2025-01-31';
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'inner_threshold_pct') return innerThresholds[idx];
      if (columnName === 'limit_amount_usd') return limitAmounts[idx];
      if (columnName === 'limit_scope') return limitScopes[idx];
      if (columnName === 'limit_type') return limitTypes[idx];
      if (columnName === 'outer_threshold_pct') return outerThresholds[idx];
      if (columnName === 'risk_tier') return riskTiers[idx];
      if (columnName === 'active_flag') return 'Y';
      break;
    }

    /* ──────────── limit_threshold ──────────── */
    case 'limit_threshold': {
      const thresholdValues = [5_000_000_000, 10_000_000_000, 8_000_000_000, 3_000_000_000, 15_000_000_000, 2_000_000_000, 7_000_000_000, 12_000_000_000, 4_000_000_000, 6_000_000_000];
      const thresholdTypes = ['ABSOLUTE', 'ABSOLUTE', 'ABSOLUTE', 'PERCENTAGE', 'ABSOLUTE', 'PERCENTAGE', 'ABSOLUTE', 'ABSOLUTE', 'PERCENTAGE', 'ABSOLUTE'];
      const directions = ['UPPER', 'UPPER', 'UPPER', 'UPPER', 'UPPER', 'UPPER', 'UPPER', 'UPPER', 'UPPER', 'UPPER'];
      const escalations = ['ALERT', 'ALERT', 'ESCALATE', 'ALERT', 'BLOCK', 'ALERT', 'ESCALATE', 'BLOCK', 'ALERT', 'ESCALATE'];
      const lowerAbs = [4_000_000_000, 7_500_000_000, 6_000_000_000, 2_000_000_000, 10_000_000_000, 1_500_000_000, 5_000_000_000, 9_000_000_000, 3_000_000_000, 4_500_000_000];
      const upperAbs = [5_000_000_000, 10_000_000_000, 8_000_000_000, 3_000_000_000, 15_000_000_000, 2_000_000_000, 7_000_000_000, 12_000_000_000, 4_000_000_000, 6_000_000_000];
      const lowerPcts = [80.0, 75.0, 75.0, 80.0, 67.0, 75.0, 71.0, 75.0, 75.0, 75.0];
      const upperPcts = [100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0];
      if (columnName === 'threshold_value') return thresholdValues[idx];
      if (columnName === 'threshold_amount') return thresholdValues[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'direction') return directions[idx];
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'escalation_action') return escalations[idx];
      if (columnName === 'threshold_lower_abs') return lowerAbs[idx];
      if (columnName === 'threshold_lower_pct') return lowerPcts[idx];
      if (columnName === 'threshold_type') return thresholdTypes[idx];
      if (columnName === 'threshold_upper_abs') return upperAbs[idx];
      if (columnName === 'threshold_upper_pct') return upperPcts[idx];
      break;
    }

    /* ──────────── fx_rate ──────────── */
    case 'fx_rate': {
      const rates = [1.0000, 1.0850, 1.2650, 0.8810, 0.006667, 0.7400, 0.6520, 0.1380, 0.1282, 0.7450];
      const rateTypes = ['SPOT', 'SPOT', 'SPOT', 'SPOT', 'SPOT', 'SPOT', 'SPOT', 'SPOT', 'SPOT', 'SPOT'];
      const providers = ['BLOOMBERG', 'BLOOMBERG', 'BLOOMBERG', 'BLOOMBERG', 'BLOOMBERG', 'BLOOMBERG', 'BLOOMBERG', 'REUTERS', 'REUTERS', 'BLOOMBERG'];
      if (columnName === 'rate') return rates[idx];
      if (columnName === 'rate_value') return rates[idx];
      if (columnName === 'as_of_date') return '2025-01-31';
      if (columnName === 'from_currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'to_currency_code') return 'USD';
      if (columnName === 'base_currency_code') return CURRENCY_CODES[idx];
      if (columnName === 'quote_currency_code') return 'USD';
      if (columnName === 'rate_type') return rateTypes[idx];
      if (columnName === 'effective_ts') return '2025-01-31 16:00:00';
      if (columnName === 'loaded_ts') return '2025-01-31 18:00:00';
      if (columnName === 'provider') return providers[idx];
      break;
    }

    /* ──────────── run_control ──────────── */
    case 'run_control': {
      const runNames = [
        'Credit Risk Daily — 2025-01-31', 'Regulatory Reporting Q4 2024', 'Market Risk EOD — 2025-01-31',
        'Counterparty Risk Daily', 'CCAR Stress Test Run', 'Liquidity Risk FR2052a',
        'Operational Risk Monthly', 'Capital Adequacy Quarterly', 'DFAST Mid-Cycle', 'GL Reconciliation Daily',
      ];
      const runStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'RUNNING', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'FAILED'];
      const runCreators = ['SYSTEM', 'J.MARTINEZ', 'SYSTEM', 'SYSTEM', 'S.CHEN', 'SYSTEM', 'K.PATEL', 'SYSTEM', 'S.CHEN', 'SYSTEM'];
      const runCertifiers = ['R.JOHNSON', 'M.WILLIAMS', 'R.JOHNSON', 'R.JOHNSON', 'PENDING', 'A.GARCIA', 'K.PATEL', 'M.WILLIAMS', 'PENDING', 'PENDING'];
      const runNotes = [
        'Daily production run completed successfully', 'Q4 2024 regulatory submission batch',
        'End-of-day market risk calculations', 'Daily counterparty exposure refresh',
        'CCAR 2025 baseline scenario in progress', 'Daily FR 2052a liquidity submission',
        'Monthly operational risk refresh', 'Quarterly capital adequacy calculation',
        'DFAST mid-cycle stress test submission', 'GL reconciliation failed — data quality exception',
      ];
      if (columnName === 'run_name') return runNames[idx];
      if (columnName === 'run_status') return runStatuses[idx];
      if (columnName === 'status') return runStatuses[idx];
      if (columnName === 'as_of_date') return '2025-01-31';
      if (columnName === 'created_by') return runCreators[idx];
      if (columnName === 'certified_by') return runCertifiers[idx];
      if (columnName === 'certified_ts') return runCertifiers[idx] !== 'PENDING' ? '2025-02-01 09:00:00' : '2024-06-15 12:00:00';
      if (columnName === 'cutoff_ts') return '2025-01-31 23:59:59';
      if (columnName === 'notes') return runNotes[idx];
      if (columnName === 'run_version_id') return idx + 1;
      break;
    }

    /* ──────────── report_registry ──────────── */
    case 'report_registry': {
      const reportCodes = ['FRY14Q', 'FRY9C', 'FFIEC031', 'FFIEC041', 'FR2052A', 'CCAR_CP', 'DFAST', 'FR2590', 'FFIEC009', 'FRY14M'];
      const reportFreqs = ['QUARTERLY', 'QUARTERLY', 'QUARTERLY', 'QUARTERLY', 'DAILY', 'ANNUAL', 'ANNUAL', 'QUARTERLY', 'QUARTERLY', 'MONTHLY'];
      const reportRegulators = ['FRB', 'FRB', 'FFIEC', 'FFIEC', 'FRB', 'FRB', 'FRB', 'FRB', 'FFIEC', 'FRB'];
      const reportJurisdictions = ['US_FED', 'US_FED', 'US_FED', 'US_FED', 'US_FED', 'US_FED', 'US_FED', 'US_FED', 'US_FED', 'US_FED'];
      if (columnName === 'report_code') return reportCodes[idx];
      if (columnName === 'report_name') return REPORT_NAMES[idx];
      if (columnName === 'description') return REPORT_DESCRIPTIONS[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'effective_from_date') return '2020-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'frequency') return reportFreqs[idx];
      if (columnName === 'jurisdiction_code') return reportJurisdictions[idx];
      if (columnName === 'regulator_code') return reportRegulators[idx];
      break;
    }

    /* ──────────── reporting_calendar_dim ──────────── */
    case 'reporting_calendar_dim': {
      const calCodes = ['DAILY_US', 'MONTHLY_US', 'QUARTERLY_FRB', 'QUARTERLY_FFIEC', 'ANNUAL_CCAR', 'DAILY_UK', 'QUARTERLY_ECB', 'MONTHLY_FRB', 'SEMI_ANNUAL', 'QUARTERLY_OSFI'];
      const calNames = ['US Daily Reporting', 'US Monthly Cycle', 'FRB Quarterly Filing', 'FFIEC Quarterly Filing', 'CCAR Annual Cycle', 'UK Daily Reporting', 'ECB Quarterly Filing', 'FRB Monthly Filing', 'Semi-Annual Review', 'OSFI Quarterly Filing'];
      const calRegulators = ['FRB', 'FRB', 'FRB', 'FFIEC', 'FRB', 'PRA', 'ECB', 'FRB', 'FRB', 'OSFI'];
      const periodStarts = ['2025-01-01', '2025-01-01', '2024-10-01', '2024-10-01', '2025-01-01', '2025-01-01', '2024-10-01', '2025-01-01', '2024-07-01', '2024-10-01'];
      const periodEnds = ['2025-01-31', '2025-01-31', '2024-12-31', '2024-12-31', '2025-12-31', '2025-01-31', '2024-12-31', '2025-01-31', '2024-12-31', '2024-12-31'];
      const fiscalQuarters = ['2025-03-31', '2025-03-31', '2024-12-31', '2024-12-31', '2025-12-31', '2025-03-31', '2024-12-31', '2025-03-31', '2024-12-31', '2024-12-31'];
      const fiscalYears = ['2025-12-31', '2025-12-31', '2024-12-31', '2024-12-31', '2025-12-31', '2025-12-31', '2024-12-31', '2025-12-31', '2024-12-31', '2024-12-31'];
      const isPeriodEnd = ['Y', 'Y', 'Y', 'Y', 'N', 'Y', 'Y', 'Y', 'Y', 'Y'];
      if (columnName === 'calendar_code') return calCodes[idx];
      if (columnName === 'calendar_name') return calNames[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'as_of_date') return '2025-01-31';
      if (columnName === 'cutoff_ts') return '2025-01-31 23:59:59';
      if (columnName === 'fiscal_quarter') return fiscalQuarters[idx];
      if (columnName === 'fiscal_year') return fiscalYears[idx];
      if (columnName === 'is_period_end') return isPeriodEnd[idx];
      if (columnName === 'period_end_date') return periodEnds[idx];
      if (columnName === 'period_start_date') return periodStarts[idx];
      if (columnName === 'regulator_code') return calRegulators[idx];
      break;
    }

    /* ──────────── reporting_entity_dim ──────────── */
    case 'reporting_entity_dim': {
      const reJurisdictions = ['US_FED', 'US_FED', 'US_FED', 'EU', 'EU', 'JP', 'CA', 'US_FED', 'US_FED', 'US_FED'];
      const reFuncCurrencies = ['USD', 'USD', 'USD', 'EUR', 'EUR', 'JPY', 'CAD', 'USD', 'USD', 'USD'];
      const reConsolBasis = ['2025-01-31', '2025-01-31', '2025-01-31', '2025-01-31', '2025-01-31', '2025-01-31', '2025-01-31', '2025-01-31', '2025-01-31', '2025-01-31'];
      if (columnName === 'entity_code') return REPORTING_ENTITY_CODES[idx];
      if (columnName === 'entity_name') return REPORTING_ENTITY_NAMES[idx];
      if (columnName === 'reporting_entity_code') return REPORTING_ENTITY_CODES[idx];
      if (columnName === 'reporting_entity_name') return REPORTING_ENTITY_NAMES[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'consolidation_basis') return reConsolBasis[idx];
      if (columnName === 'effective_from_date') return '2020-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'functional_currency_code') return reFuncCurrencies[idx];
      if (columnName === 'is_current') return 'Y';
      if (columnName === 'jurisdiction_code') return reJurisdictions[idx];
      break;
    }

    /* ──────────── credit_agreement_counterparty_participation ──────────── */
    case 'credit_agreement_counterparty_participation': {
      const caRoles = ['BORROWER', 'BORROWER', 'BORROWER', 'GUARANTOR', 'BORROWER', 'BORROWER', 'BORROWER', 'BORROWER', 'BORROWER', 'BORROWER'];
      const caPrimary = ['Y', 'Y', 'Y', 'N', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'];
      const caPcts = [100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0];
      const caRolePriority = ['1', '1', '1', '2', '1', '1', '1', '1', '1', '1'];
      if (columnName === 'counterparty_role_code') return caRoles[idx];
      if (columnName === 'is_primary_flag') return caPrimary[idx];
      if (columnName === 'participation_type') return 'BORROWER';
      if (columnName === 'participation_pct') return caPcts[idx];
      if (columnName === 'source_record_id') return 200_000 + idx + 1;
      if (columnName === 'role_priority_rank') return caRolePriority[idx];
      break;
    }

    /* ──────────── facility_counterparty_participation ──────────── */
    case 'facility_counterparty_participation': {
      // Each facility has the borrower counterparty in this table.
      // The counterparty_id FK here points to the counterparty (borrower), not the bank.
      // Roles reflect the borrower/guarantor side of the facility.
      const fcRoles = ['BORROWER', 'BORROWER', 'BORROWER', 'BORROWER', 'BORROWER', 'BORROWER', 'BORROWER', 'BORROWER', 'BORROWER', 'BORROWER'];
      const fcPrimary = ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'];
      const fcPcts = [100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0];
      const fcRolePriority = ['1', '1', '1', '1', '1', '1', '1', '1', '1', '1'];
      if (columnName === 'counterparty_role_code') return fcRoles[idx];
      if (columnName === 'is_primary_flag') return fcPrimary[idx];
      if (columnName === 'participation_type') return 'BORROWER';
      if (columnName === 'participation_pct') return fcPcts[idx];
      if (columnName === 'role_priority_rank') return fcRolePriority[idx];
      if (columnName === 'source_record_id') return 300_000 + idx + 1;
      break;
    }

    /* ──────────── rating_mapping ──────────── */
    case 'rating_mapping': {
      const rmExtRatings = ['AAA', 'AA+', 'AA', 'A+', 'A', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB'];
      const rmSourceRatings = ['AAA', 'Aa1', 'AA', 'A+', 'A2', 'BBB+', 'Baa2', 'BBB-', 'Ba1', 'BB'];
      const rmGradeCodes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
      const rmMethods = ['DIRECT_MAP', 'DIRECT_MAP', 'DIRECT_MAP', 'DIRECT_MAP', 'DIRECT_MAP', 'DIRECT_MAP', 'DIRECT_MAP', 'DIRECT_MAP', 'MODEL_BASED', 'MODEL_BASED'];
      const rmApprovers = ['M.WILLIAMS', 'M.WILLIAMS', 'M.WILLIAMS', 'R.JOHNSON', 'R.JOHNSON', 'R.JOHNSON', 'S.CHEN', 'S.CHEN', 'A.GARCIA', 'A.GARCIA'];
      if (columnName === 'external_rating') return rmExtRatings[idx];
      if (columnName === 'source_rating_code') return rmSourceRatings[idx];
      if (columnName === 'rating_grade_code') return rmGradeCodes[idx];
      if (columnName === 'approved_by') return rmApprovers[idx];
      if (columnName === 'approved_ts') return '2024-06-01 10:00:00';
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'is_current') return 'Y';
      if (columnName === 'mapping_method') return rmMethods[idx];
      if (columnName === 'source_system_id') return 7; // Internal Risk
      break;
    }

    /* ──────────── reconciliation_control ──────────── */
    case 'reconciliation_control': {
      const rcNames = [
        'Loan Balance Recon', 'GL to Sub-Ledger Recon', 'Commitment Recon',
        'Collateral Valuation Recon', 'Counterparty Count Recon', 'Facility Count Recon',
        'Interest Accrual Recon', 'RWA Recon', 'Allowance Recon', 'FX Position Recon',
      ];
      const rcCheckNames = [
        'Total Loan Balance Match', 'GL Sub-Ledger Tie-Out', 'Unfunded Commitment Match',
        'Collateral MV Reconciliation', 'Counterparty Master Count', 'Active Facility Count',
        'Interest Accrual Variance', 'RWA Source-to-Report', 'CECL Allowance Match', 'FX Net Open Position',
      ];
      const rcCheckTypes = ['BALANCE', 'BALANCE', 'BALANCE', 'VALUATION', 'COUNT', 'COUNT', 'VARIANCE', 'BALANCE', 'BALANCE', 'BALANCE'];
      const rcStatuses = ['PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'WARNING', 'PASS', 'PASS', 'FAIL'];
      const rcExpected = [150_000_000_000.0, 150_000_000_000.0, 45_000_000_000.0, 25_000_000_000.0, 10_000.0, 85_000.0, 500_000_000.0, 800_000_000_000.0, 3_500_000_000.0, 0.0];
      const rcActual = [150_000_000_000.0, 150_000_000_000.0, 45_000_000_000.0, 25_000_000_000.0, 10_000.0, 85_000.0, 500_125_000.0, 800_000_000_000.0, 3_500_000_000.0, 150_000.0];
      const rcVariance = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 125_000.0, 0.0, 0.0, 150_000.0];
      const rcTolerance = [1_000_000.0, 500_000.0, 100_000.0, 1_000_000.0, 5.0, 10.0, 250_000.0, 5_000_000.0, 100_000.0, 50_000.0];
      const rcReportCodes = ['FFIEC031', 'FFIEC031', 'FRY14Q', 'FRY14Q', 'FRY14Q', 'FRY14Q', 'FFIEC031', 'FRY9C', 'FFIEC031', 'FFIEC031'];
      if (columnName === 'control_name') return rcNames[idx];
      if (columnName === 'check_name') return rcCheckNames[idx];
      if (columnName === 'check_type') return rcCheckTypes[idx];
      if (columnName === 'status') return rcStatuses[idx];
      if (columnName === 'expected_value') return rcExpected[idx];
      if (columnName === 'actual_value') return rcActual[idx];
      if (columnName === 'variance_value') return rcVariance[idx];
      if (columnName === 'tolerance_value') return rcTolerance[idx];
      if (columnName === 'executed_ts') return '2025-02-01 06:00:00';
      if (columnName === 'recon_id') return idx + 1;
      if (columnName === 'remediation_ticket_id') return idx === 9 ? 1001 : 0;
      if (columnName === 'report_code') return rcReportCodes[idx];
      if (columnName === 'run_version_id') return 1;
      break;
    }

    /* ──────────── regulatory_mapping ──────────── */
    case 'regulatory_mapping': {
      const regmCodes = ['RM-001', 'RM-002', 'RM-003', 'RM-004', 'RM-005', 'RM-006', 'RM-007', 'RM-008', 'RM-009', 'RM-010'];
      const regmLineItems = ['RCON2122', 'RCON2123', 'RCON3123', 'RCON3128', 'BHCK2170', 'BHCKB993', 'BHCK3210', 'BHCKA223', 'BHCKC880', 'BHCK4230'];
      const regmMetricNames = [
        'C&I Loans Domestic', 'C&I Loans Foreign', 'CRE Loans', 'Residential Mortgage',
        'Total Assets', 'Tier 1 Capital', 'Total Risk-Based Capital', 'Total RWA',
        'CECL Allowance', 'Net Income',
      ];
      const regmReportCodes = ['FFIEC031', 'FFIEC031', 'FFIEC031', 'FFIEC031', 'FRY9C', 'FRY9C', 'FRY9C', 'FRY9C', 'FFIEC031', 'FRY9C'];
      const regmSchedules = ['RC_C', 'RC_C', 'RC_C', 'RC_C', 'RC', 'RC_R', 'RC_R', 'RC_R', 'RC_C', 'RI'];
      const regmSourceMdrm = ['RCON2122', 'RCON2123', 'RCON3123', 'RCON3128', 'BHCK2170', 'BHCKB993', 'BHCK3210', 'BHCKA223', 'BHCKC880', 'BHCK4230'];
      const regmTargetMdrm = ['RCON2122', 'RCON2123', 'RCON3123', 'RCON3128', 'BHCK2170', 'BHCKB993', 'BHCK3210', 'BHCKA223', 'BHCKC880', 'BHCK4230'];
      const regmSourceReports = ['GL', 'GL', 'GL', 'GL', 'GL', 'CAPITAL_CALC', 'CAPITAL_CALC', 'RWA_ENGINE', 'CECL_ENGINE', 'GL'];
      const regmTargetReports = ['FFIEC031', 'FFIEC031', 'FFIEC031', 'FFIEC031', 'FRY9C', 'FRY9C', 'FRY9C', 'FRY9C', 'FFIEC031', 'FRY9C'];
      const regmRelTypes = ['DIRECT', 'DIRECT', 'DIRECT', 'DIRECT', 'AGGREGATION', 'CALCULATION', 'CALCULATION', 'CALCULATION', 'DIRECT', 'AGGREGATION'];
      const regmTransformRules = ['PASSTHROUGH', 'PASSTHROUGH', 'PASSTHROUGH', 'PASSTHROUGH', 'SUM', 'FORMULA', 'FORMULA', 'FORMULA', 'PASSTHROUGH', 'SUM'];
      const regmNotes = [
        'Direct map from GL to Call Report Schedule RC-C', 'Direct map — foreign C&I loans',
        'CRE loans per FFIEC instructions', 'Residential mortgage per Schedule RC-C',
        'Sum of all asset accounts for FR Y-9C RC', 'CET1 + AT1 capital calculation',
        'Tier 1 + Tier 2 total risk-based capital', 'Total RWA from risk engine',
        'Current expected credit loss provision', 'Aggregate net income line items',
      ];
      if (columnName === 'mapping_code') return regmCodes[idx];
      if (columnName === 'jurisdiction_code') return 'US_FED';
      if (columnName === 'effective_start_date') return '2024-01-01';
      if (columnName === 'effective_end_date') return '9999-12-31';
      if (columnName === 'line_item_code') return regmLineItems[idx];
      if (columnName === 'mapping_id') return idx + 1;
      if (columnName === 'mdrm_id') return idx + 1;
      if (columnName === 'metric_name') return regmMetricNames[idx];
      if (columnName === 'notes') return regmNotes[idx];
      if (columnName === 'relationship_type') return regmRelTypes[idx];
      if (columnName === 'report_code') return regmReportCodes[idx];
      if (columnName === 'schedule_code') return regmSchedules[idx];
      if (columnName === 'source_mdrm_code') return regmSourceMdrm[idx];
      if (columnName === 'source_report_code') return regmSourceReports[idx];
      if (columnName === 'source_system_id') return 10; // Regulatory
      if (columnName === 'target_mdrm_code') return regmTargetMdrm[idx];
      if (columnName === 'target_report_code') return regmTargetReports[idx];
      if (columnName === 'tolerance_pct') return [0.01, 0.01, 0.01, 0.01, 0.001, 0.001, 0.001, 0.001, 0.01, 0.001][idx];
      if (columnName === 'transformation_rule') return regmTransformRules[idx];
      if (columnName === 'calculation_rule_id') return idx + 1;
      break;
    }

    /* ──────────── report_cell_definition ──────────── */
    case 'report_cell_definition': {
      const rcdCellCodes = ['RC_C_1A', 'RC_C_1B', 'RC_C_2A', 'RC_C_2B', 'RC_1', 'RC_R_1', 'RC_R_2', 'RC_R_3', 'RC_C_3', 'RI_1'];
      const rcdCellNames = [
        'C&I Loans Domestic', 'C&I Loans Foreign', 'CRE Loans Secured', 'CRE Loans Unsecured',
        'Total Assets', 'CET1 Capital', 'Tier 1 Capital', 'Total RBC',
        'CECL Allowance Balance', 'Net Interest Income',
      ];
      const rcdCellDefs = [
        'SUM(loan_balance) WHERE counterparty_type = C&I AND domicile = DOMESTIC',
        'SUM(loan_balance) WHERE counterparty_type = C&I AND domicile = FOREIGN',
        'SUM(loan_balance) WHERE collateral_type = CRE AND secured = Y',
        'SUM(loan_balance) WHERE collateral_type = CRE AND secured = N',
        'SUM(asset_accounts)',
        'common_equity - goodwill - intangibles + AOCI_adjustment',
        'CET1 + additional_tier1',
        'tier1 + tier2',
        'SUM(cecl_allowance)',
        'interest_income - interest_expense',
      ];
      const rcdReportCodes = ['FFIEC031', 'FFIEC031', 'FFIEC031', 'FFIEC031', 'FRY9C', 'FRY9C', 'FRY9C', 'FRY9C', 'FFIEC031', 'FRY9C'];
      const rcdSchedules = ['RC_C', 'RC_C', 'RC_C', 'RC_C', 'RC', 'RC_R', 'RC_R', 'RC_R', 'RC_C', 'RI'];
      const rcdLineItems = ['RCON2122', 'RCON2123', 'RCON3123', 'RCON3128', 'BHCK2170', 'BHCKB993', 'BHCK3210', 'BHCKA223', 'BHCKC880', 'BHCK4074'];
      const rcdDatatypes = ['DECIMAL', 'DECIMAL', 'DECIMAL', 'DECIMAL', 'DECIMAL', 'DECIMAL', 'DECIMAL', 'DECIMAL', 'DECIMAL', 'DECIMAL'];
      const rcdIsDerived = ['N', 'N', 'N', 'N', 'Y', 'Y', 'Y', 'Y', 'N', 'Y'];
      if (columnName === 'cell_code') return rcdCellCodes[idx];
      if (columnName === 'cell_name') return rcdCellNames[idx];
      if (columnName === 'cell_definition') return rcdCellDefs[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'calculation_rule_id') return idx + 1;
      if (columnName === 'cell_datatype') return rcdDatatypes[idx];
      if (columnName === 'cell_id') return idx + 1;
      if (columnName === 'is_derived_flag') return rcdIsDerived[idx];
      if (columnName === 'line_item_code') return rcdLineItems[idx];
      if (columnName === 'report_code') return rcdReportCodes[idx];
      if (columnName === 'schedule_code') return rcdSchedules[idx];
      if (columnName === 'uom') return 1.0; // units (not thousands)
      break;
    }

    /* ──────────── model_registry_dim ──────────── */
    case 'model_registry_dim': {
      const mdlCodes = ['PD-CORP-01', 'PD-CRE-02', 'LGD-CORP-01', 'LGD-CRE-02', 'EAD-REV-01', 'CECL-01', 'CCAR-BASE-01', 'DFAST-ADV-01', 'SA-CCR-01', 'IFRS9-01'];
      const mdlNames = [
        'Corporate PD Scorecard', 'CRE PD Model', 'Corporate LGD Model', 'CRE LGD Model',
        'Revolving EAD/CCF Model', 'CECL Lifetime Loss Model', 'CCAR Baseline Stress Model',
        'DFAST Adverse Scenario Model', 'SA-CCR Exposure Model', 'IFRS 9 Staging Model',
      ];
      const mdlTypes = ['PD', 'PD', 'LGD', 'LGD', 'EAD', 'ECL', 'STRESS_TEST', 'STRESS_TEST', 'EXPOSURE', 'ECL'];
      const mdlVersions = ['4.2', '3.1', '2.5', '2.3', '3.0', '2.1', '5.0', '5.0', '1.2', '1.8'];
      const mdlValidationStatuses = ['APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'CONDITIONAL', 'CONDITIONAL', 'APPROVED', 'APPROVED'];
      const mdlDocUrls = [
        '/models/pd-corp/v4.2', '/models/pd-cre/v3.1', '/models/lgd-corp/v2.5', '/models/lgd-cre/v2.3',
        '/models/ead-rev/v3.0', '/models/cecl/v2.1', '/models/ccar/v5.0', '/models/dfast/v5.0',
        '/models/sa-ccr/v1.2', '/models/ifrs9/v1.8',
      ];
      if (columnName === 'model_code') return mdlCodes[idx];
      if (columnName === 'model_name') return mdlNames[idx];
      if (columnName === 'model_type') return mdlTypes[idx];
      if (columnName === 'model_version') return mdlVersions[idx];
      if (columnName === 'validation_status') return mdlValidationStatuses[idx];
      if (columnName === 'documentation_url') return mdlDocUrls[idx];
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      if (columnName === 'is_current') return 'Y';
      if (columnName === 'regulatory_approved_flag') return 'Y';
      break;
    }

    /* ──────────── scenario_dim ──────────── */
    case 'scenario_dim': {
      const scCodes = ['BASE', 'ADV', 'SEV_ADV', 'MGMT_CUSTOM', 'HIST_GFC', 'HIST_COVID', 'RATE_UP300', 'RATE_DN200', 'CRE_STRESS', 'IDIO_SNGL'];
      const scNames = [
        'CCAR Baseline', 'CCAR Adverse', 'CCAR Severely Adverse', 'Custom Management Scenario',
        'Historical GFC Replay', 'Historical COVID Replay', 'Interest Rate +300bp Shock',
        'Interest Rate -200bp Shock', 'CRE Downturn Scenario', 'Idiosyncratic Single-Name Stress',
      ];
      const scTypes = ['REGULATORY', 'REGULATORY', 'REGULATORY', 'MANAGEMENT', 'HISTORICAL', 'HISTORICAL', 'SENSITIVITY', 'SENSITIVITY', 'SECTOR', 'IDIOSYNCRATIC'];
      const scDescs = [
        'Federal Reserve CCAR baseline economic scenario', 'Federal Reserve CCAR adverse scenario',
        'Federal Reserve CCAR severely adverse scenario', 'Internal management stress scenario',
        'Replay of 2008-2009 Global Financial Crisis', 'Replay of 2020 COVID-19 pandemic shock',
        'Parallel shift +300bp across yield curve', 'Parallel shift -200bp across yield curve',
        'CRE sector-specific downturn scenario', 'Concentrated single-name default stress',
      ];
      const scRegCodes = ['CCAR_BASE', 'CCAR_ADV', 'CCAR_SEV', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA', 'NA'];
      const scHorizons = ['9', '9', '9', '4', '8', '4', '4', '4', '4', '1'];
      const scStarts = ['2025-01-01', '2025-01-01', '2025-01-01', '2025-01-01', '2008-09-01', '2020-03-01', '2025-01-01', '2025-01-01', '2025-01-01', '2025-01-01'];
      const scEnds = ['2027-09-30', '2027-09-30', '2027-09-30', '2025-12-31', '2010-04-30', '2021-06-30', '2025-12-31', '2025-12-31', '2025-12-31', '2025-03-31'];
      const scShocks = [
        '{"gdp_growth":-0.5,"unemployment":5.5}', '{"gdp_growth":-3.0,"unemployment":8.5}',
        '{"gdp_growth":-6.0,"unemployment":12.0}', '{"gdp_growth":-2.0,"unemployment":7.0}',
        '{"gdp_growth":-4.3,"unemployment":10.0}', '{"gdp_growth":-3.5,"unemployment":14.7}',
        '{"rate_shift_bps":300}', '{"rate_shift_bps":-200}',
        '{"cre_price_decline":-0.35}', '{"default_name":"TopExposure","lgd":0.60}',
      ];
      if (columnName === 'scenario_code') return scCodes[idx];
      if (columnName === 'scenario_name') return scNames[idx];
      if (columnName === 'scenario_type') return scTypes[idx];
      if (columnName === 'description') return scDescs[idx];
      if (columnName === 'is_active') return 'Y';
      if (columnName === 'regulatory_scenario_code') return scRegCodes[idx];
      if (columnName === 'scenario_start_date') return scStarts[idx];
      if (columnName === 'scenario_end_date') return scEnds[idx];
      if (columnName === 'scenario_horizon_months') return scHorizons[idx];
      if (columnName === 'shock_parameters_json') return scShocks[idx];
      break;
    }

    /* ──────────── validation_check_registry ──────────── */
    case 'validation_check_registry': {
      const vcNames = [
        'Counterparty LEI Required', 'Facility Amount Non-Negative', 'PD Range Check',
        'LGD Range Check', 'Rating Not Null', 'Maturity After Origination',
        'Currency Code Valid', 'Country Code Valid', 'Collateral Valuation Positive',
        'DSCR Ratio Positive',
      ];
      const vcTypes = ['NOT_NULL', 'RANGE', 'RANGE', 'RANGE', 'NOT_NULL', 'COMPARISON', 'REFERENTIAL', 'REFERENTIAL', 'RANGE', 'RANGE'];
      const vcTables = ['counterparty_master', 'facility_master', 'counterparty_master', 'counterparty_master', 'counterparty_master', 'facility_master', 'facility_master', 'counterparty_master', 'collateral_asset_master', 'facility_master'];
      const vcColumns = ['lei_code', 'committed_facility_amt', 'pd_annual', 'lgd_unsecured', 'internal_risk_rating', 'maturity_date', 'currency_code', 'country_of_risk', 'original_cost', 'dscr'];
      const vcSeverities = ['WARNING', 'ERROR', 'ERROR', 'ERROR', 'WARNING', 'ERROR', 'ERROR', 'ERROR', 'WARNING', 'WARNING'];
      if (columnName === 'check_name') return vcNames[idx];
      if (columnName === 'check_type') return vcTypes[idx];
      if (columnName === 'target_table') return vcTables[idx];
      if (columnName === 'target_column') return vcColumns[idx];
      if (columnName === 'severity') return vcSeverities[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'validation_check_id') return idx + 1;
      break;
    }

    /* ──────────── rule_registry ──────────── */
    case 'rule_registry': {
      const rrCodes = ['RR-PD-CALC', 'RR-LGD-CALC', 'RR-EAD-CALC', 'RR-RWA-SA', 'RR-RWA-IRB', 'RR-CCF-MAP', 'RR-ECL-CALC', 'RR-STAGE-ALLOC', 'RR-HAIRCUT', 'RR-LIMIT-CHECK'];
      const rrNames = [
        'PD Calculation Rule', 'LGD Calculation Rule', 'EAD Calculation Rule',
        'RWA Standardized Rule', 'RWA IRB Rule', 'CCF Mapping Rule',
        'ECL Calculation Rule', 'IFRS9 Stage Allocation Rule', 'Collateral Haircut Rule', 'Limit Breach Check Rule',
      ];
      const rrTypes = ['CALCULATION', 'CALCULATION', 'CALCULATION', 'CALCULATION', 'CALCULATION', 'MAPPING', 'CALCULATION', 'CLASSIFICATION', 'CALCULATION', 'VALIDATION'];
      const rrExpressions = [
        'PD = f(rating, macro)', 'LGD = f(collateral, seniority)', 'EAD = drawn + CCF * undrawn',
        'RWA = EAD * risk_weight', 'RWA = EAD * K_IRB * 12.5', 'CCF = lookup(exposure_type)',
        'ECL = PD * LGD * EAD', 'STAGE = f(dpd, rating_change)', 'AdjVal = MV * (1 - haircut)', 'BREACH = exposure > limit',
      ];
      const rrInputs = [
        'rating,macro_vars', 'collateral_type,seniority', 'drawn,undrawn,ccf',
        'ead,risk_weight', 'ead,pd,lgd,maturity', 'exposure_type',
        'pd,lgd,ead', 'dpd,rating_delta', 'market_value,haircut_pct', 'exposure,limit_amount',
      ];
      const rrOutputs = ['pd_value', 'lgd_value', 'ead_value', 'rwa_sa', 'rwa_irb', 'ccf_pct', 'ecl_amount', 'ifrs9_stage', 'adjusted_value', 'breach_flag'];
      const rrApprovers = ['M.WILLIAMS', 'M.WILLIAMS', 'R.JOHNSON', 'R.JOHNSON', 'S.CHEN', 'S.CHEN', 'A.GARCIA', 'A.GARCIA', 'K.PATEL', 'K.PATEL'];
      if (columnName === 'rule_code') return rrCodes[idx];
      if (columnName === 'rule_name') return rrNames[idx];
      if (columnName === 'rule_type') return rrTypes[idx];
      if (columnName === 'rule_expression') return rrExpressions[idx];
      if (columnName === 'input_variables') return rrInputs[idx];
      if (columnName === 'output_variable') return rrOutputs[idx];
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'approved_by') return rrApprovers[idx];
      if (columnName === 'approved_ts') return '2024-06-01 10:00:00';
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return '9999-12-31';
      break;
    }

    default:
      break;
  }
  return null;
}

/* ───────────────────────────── Scalability ──────────────────────────── */

/**
 * Dimension tables (SCD-0, lookup/reference) are capped at their natural size.
 * Master/entity tables scale to the requested N.
 * Linking/bridge tables scale proportionally.
 *
 * Returns the number of rows to generate for a given table.
 */
const DIMENSION_TABLES = new Set([
  'currency_dim', 'country_dim', 'region_dim', 'regulatory_jurisdiction',
  'entity_type_dim', 'credit_event_type_dim', 'credit_status_dim', 'exposure_type_dim',
  'amendment_status_dim', 'amendment_type_dim', 'default_definition_dim', 'maturity_bucket_dim',
  'fr2590_category_dim', 'counterparty_role_dim', 'rating_scale_dim', 'crm_type_dim',
  'date_dim', 'date_time_dim', 'regulatory_capital_basis_dim', 'risk_mitigant_type_dim',
  'reporting_calendar_dim', 'scenario_dim',
]);

/** Tables that should stay at 10 rows even when scaling (internal config/metadata). */
const FIXED_SIZE_TABLES = new Set([
  'source_system_registry', 'org_unit_dim', 'reporting_entity_dim',
  'run_control', 'report_registry', 'reconciliation_control',
  'legal_entity', 'legal_entity_hierarchy',
  // Rating/mapping tables have fixed domain values
  'rating_source', 'rating_scale_dim', 'rating_grade_dim', 'rating_mapping',
  'collateral_eligibility_dim', 'collateral_haircut_dim', 'crm_eligibility_dim',
  'regulatory_mapping', 'report_cell_definition',
  'context_dim', 'metric_definition_dim',
  'model_registry_dim', 'rule_registry', 'validation_check_registry',
]);

export function getTableRowCount(tableName: string, requestedRows: number): number {
  // Dimension tables stay at 10 (their natural domain size)
  if (DIMENSION_TABLES.has(tableName)) return 10;
  // Fixed-size tables stay at 10
  if (FIXED_SIZE_TABLES.has(tableName)) return 10;
  // Everything else scales to the requested count
  return requestedRows;
}
