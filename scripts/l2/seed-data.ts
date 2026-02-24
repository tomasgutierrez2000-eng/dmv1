/**
 * L2 seed data: 50 rows per table, GSIB-realistic, aligned to L1 IDs (1..10).
 * facility_id, counterparty_id, credit_agreement_id, etc. cycle 1–10.
 *
 * 5 "cycles" per facility (rows 0-9, 10-19, 20-29, 30-39, 40-49) tell a story:
 *   Cycle 0: Base positions — mostly PERFORMING
 *   Cycle 1: Secondary views — a couple moving to WATCH
 *   Cycle 2: Stress/events — more WATCH, covenant breaches
 *   Cycle 3: Recovery/amendments — some improving, some worsening
 *   Cycle 4: Current state — portfolio reality
 *
 * EVERY column must be handled here to avoid fallback placeholder values.
 * All as_of_date values are 2025-01-31 per SEED_CONVENTIONS.md.
 */

const N = 50; // rows per table
const AS_OF = '2025-01-31';

// ───────────── deterministic helpers ─────────────
/** Facility/counterparty id: cycles 1..10 */
function fid(idx: number): number { return (idx % 10) + 1; }
function cid(idx: number): number { return (idx % 10) + 1; }
/** Which cycle (0-4) for the given row index */
function cycle(idx: number): number { return Math.floor(idx / 10); }

// ── mulberry32 PRNG for deterministic variation ──
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Pick from array using stable hash */
function pick<T>(arr: T[], idx: number): T { return arr[idx % arr.length]; }

/** Vary an amount by ±pct based on cycle, deterministic */
function vary(base: number, idx: number, pct: number = 0.15): number {
  const c = cycle(idx);
  const fac = fid(idx);
  // Each cycle shifts the amount slightly
  const shifts = [0, 0.05, -0.08, 0.12, -0.03];
  const facShifts = [0, 0.02, -0.01, 0.03, -0.02, 0.01, -0.03, 0.02, 0.01, -0.01];
  const shift = (shifts[c] ?? 0) + (facShifts[fac - 1] ?? 0);
  return Math.round(base * (1 + shift * (pct / 0.15)));
}

// ───────────── SHARED REFERENCE ARRAYS (base per facility 1-10) ─────────────

// Base drawn amounts per facility (cycle 0)
const BASE_DRAWN = [120_000_000, 450_000_000, 800_000_000, 0, 275_000_000, 1_200_000_000, 0, 90_000_000, 600_000_000, 2_100_000_000];
// Drawn varies per cycle: facility 5 (Atlas) draws more as it deteriorates, facility 7 (Pinnacle) goes to zero
const DRAWN_BY_CYCLE: number[][] = [
  [120_000_000, 450_000_000, 800_000_000, 0, 275_000_000, 1_200_000_000, 0, 90_000_000, 600_000_000, 2_100_000_000], // c0
  [130_000_000, 440_000_000, 820_000_000, 0, 320_000_000, 1_180_000_000, 0, 95_000_000, 580_000_000, 2_050_000_000], // c1
  [125_000_000, 460_000_000, 780_000_000, 0, 380_000_000, 1_220_000_000, 0, 100_000_000, 620_000_000, 2_150_000_000], // c2 stress
  [110_000_000, 430_000_000, 750_000_000, 0, 400_000_000, 1_150_000_000, 0, 85_000_000, 560_000_000, 2_000_000_000], // c3 amend
  [115_000_000, 445_000_000, 790_000_000, 0, 350_000_000, 1_190_000_000, 0, 80_000_000, 590_000_000, 2_080_000_000], // c4 current
];
function drawn(idx: number): number { return DRAWN_BY_CYCLE[cycle(idx)][fid(idx) - 1]; }

const COMMITTED = [250_000_000, 500_000_000, 1_000_000_000, 2_500_000_000, 750_000_000, 1_500_000_000, 3_000_000_000, 400_000_000, 600_000_000, 5_000_000_000];
function committed(idx: number): number { return COMMITTED[fid(idx) - 1]; }

const BASE_CURRENCIES = ['USD', 'EUR', 'USD', 'GBP', 'USD', 'USD', 'EUR', 'USD', 'GBP', 'USD'];
function currency(idx: number): string { return BASE_CURRENCIES[fid(idx) - 1]; }

const POS_TYPES_BASE = ['LOAN', 'REV', 'COMMIT', 'LOAN', 'REV', 'LOAN', 'COMMIT', 'REV', 'LOAN', 'REV'];
const POS_TYPES_ALT = ['REV', 'LOAN', 'LOAN', 'COMMIT', 'LOAN', 'REV', 'LOAN', 'COMMIT', 'REV', 'LOAN'];
function posType(idx: number): string { return cycle(idx) % 2 === 0 ? POS_TYPES_BASE[fid(idx) - 1] : POS_TYPES_ALT[fid(idx) - 1]; }

const BASE_SPREADS = [175, 250, 325, 200, 400, 150, 275, 225, 300, 125];
function spread(idx: number): number {
  const c = cycle(idx);
  const f = fid(idx) - 1;
  // Atlas (5) and Westlake (8) spreads widen under stress
  if (f === 4) return [400, 425, 475, 450, 440][c]; // Atlas widens
  if (f === 7) return [225, 240, 280, 260, 250][c]; // Westlake widens
  return BASE_SPREADS[f] + (c - 2) * 5; // slight variation
}

const BASE_ALL_IN = [6.25, 7.50, 8.25, 6.75, 9.00, 5.75, 7.25, 6.95, 8.00, 5.50];
function allInRate(idx: number): number {
  const s = spread(idx);
  const baseRate = [4.50, 5.00, 4.95, 4.75, 5.00, 4.25, 4.50, 4.70, 5.00, 4.25][fid(idx) - 1];
  return Math.round((baseRate + s / 100) * 100) / 100;
}

function baseRate(idx: number): number {
  return [4.50, 5.00, 4.95, 4.75, 5.00, 4.25, 4.50, 4.70, 5.00, 4.25][fid(idx) - 1];
}

// PD with credit migration story
const PD_BY_CYCLE: number[][] = [
  [0.0042, 0.0185, 0.0025, 0.0095, 0.0320, 0.0015, 0.0275, 0.0060, 0.0190, 0.0008], // c0
  [0.0040, 0.0190, 0.0028, 0.0090, 0.0380, 0.0015, 0.0280, 0.0072, 0.0185, 0.0008], // c1 slight moves
  [0.0045, 0.0200, 0.0030, 0.0088, 0.0520, 0.0018, 0.0300, 0.0095, 0.0210, 0.0010], // c2 stress: Atlas & Westlake jump
  [0.0043, 0.0195, 0.0027, 0.0085, 0.0480, 0.0016, 0.0290, 0.0085, 0.0200, 0.0009], // c3 partial recovery
  [0.0041, 0.0188, 0.0026, 0.0087, 0.0450, 0.0014, 0.0285, 0.0078, 0.0195, 0.0009], // c4 current
];
function pd(idx: number): number { return PD_BY_CYCLE[cycle(idx)][fid(idx) - 1]; }

const BASE_LGD = [0.45, 0.40, 0.35, 0.50, 0.45, 0.40, 0.55, 0.38, 0.42, 0.48];
function lgd(idx: number): number {
  const c = cycle(idx);
  return Math.round((BASE_LGD[fid(idx) - 1] + (c - 2) * 0.01) * 100) / 100;
}

const BASE_RW = [100, 75, 50, 150, 100, 75, 125, 50, 100, 100];
function riskWeight(idx: number): number {
  const f = fid(idx) - 1;
  const c = cycle(idx);
  if (f === 4 && c >= 2) return 150; // Atlas upgrades to 150% RW
  if (f === 7 && c >= 2) return 75; // Westlake stays
  return BASE_RW[f];
}

// Credit status story
const STATUS_BY_CYCLE: string[][] = [
  ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING'],
  ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING'],
  ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING', 'PERFORMING'],
  ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'SPECIAL_MENTION', 'PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING', 'PERFORMING'],
  ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING'],
];
function creditStatus(idx: number): string { return STATUS_BY_CYCLE[cycle(idx)][fid(idx) - 1]; }
function creditStatusId(idx: number): number {
  const s = creditStatus(idx);
  if (s === 'PERFORMING') return 1;
  if (s === 'WATCH') return 2;
  if (s === 'SPECIAL_MENTION') return 3;
  if (s === 'SUBSTANDARD') return 4;
  return 1;
}

const DPD_BY_CYCLE: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 15, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 32, 0, 0, 12, 0, 0],
  [0, 0, 0, 0, 45, 0, 0, 8, 0, 0],
  [0, 0, 0, 0, 18, 0, 0, 0, 0, 0],
];
function dpd(idx: number): number { return DPD_BY_CYCLE[cycle(idx)][fid(idx) - 1]; }

// Internal ratings with migration
const INT_RATINGS_BY_CYCLE: string[][] = [
  ['A+', 'BBB+', 'AA-', 'BB', 'B+', 'AA', 'B-', 'BBB', 'BB+', 'AAA'],
  ['A+', 'BBB+', 'AA-', 'BB', 'B', 'AA', 'B-', 'BBB-', 'BB+', 'AAA'],
  ['A', 'BBB', 'AA-', 'BB', 'B-', 'AA', 'CCC+', 'BB+', 'BB', 'AA+'],
  ['A+', 'BBB+', 'AA-', 'BB+', 'B', 'AA', 'B-', 'BBB-', 'BB+', 'AAA'],
  ['A+', 'BBB+', 'AA-', 'BB', 'B+', 'AA', 'B-', 'BBB', 'BB+', 'AAA'],
];
function intRating(idx: number): string { return INT_RATINGS_BY_CYCLE[cycle(idx)][fid(idx) - 1]; }

const EXT_RATINGS_BY_CYCLE: string[][] = [
  ['A1', 'Baa1', 'Aa3', 'Ba2', 'B1', 'Aa2', 'B3', 'Baa2', 'Ba1', 'Aaa'],
  ['A1', 'Baa1', 'Aa3', 'Ba2', 'B2', 'Aa2', 'B3', 'Baa3', 'Ba1', 'Aaa'],
  ['A2', 'Baa2', 'Aa3', 'Ba2', 'B3', 'Aa2', 'Caa1', 'Ba1', 'Ba2', 'Aa1'],
  ['A1', 'Baa1', 'Aa3', 'Ba1', 'B2', 'Aa2', 'B3', 'Baa3', 'Ba1', 'Aaa'],
  ['A1', 'Baa1', 'Aa3', 'Ba2', 'B1', 'Aa2', 'B3', 'Baa2', 'Ba1', 'Aaa'],
];
function extRating(idx: number): string { return EXT_RATINGS_BY_CYCLE[cycle(idx)][fid(idx) - 1]; }

const BASE_MATURITY_DATES = ['2027-06-30', '2028-03-15', '2026-12-20', '2029-09-30', '2027-01-15', '2030-06-30', '2026-04-30', '2028-11-15', '2027-08-30', '2031-12-31'];
function maturityDate(idx: number): string { return BASE_MATURITY_DATES[fid(idx) - 1]; }

const BASE_ORIGINATION_DATES = ['2022-06-15', '2021-11-20', '2023-01-10', '2020-09-01', '2022-03-25', '2019-06-15', '2023-07-01', '2022-01-10', '2021-08-15', '2018-12-01'];
function originationDate(idx: number): string { return BASE_ORIGINATION_DATES[fid(idx) - 1]; }

const BASE_VALUATIONS = [50_000_000, 120_000_000, 85_000_000, 200_000_000, 30_000_000, 450_000_000, 75_000_000, 95_000_000, 110_000_000, 320_000_000];
function valuation(idx: number): number { return vary(BASE_VALUATIONS[fid(idx) - 1], idx, 0.10); }

const BASE_HAIRCUTS = [0, 2.5, 4, 15, 25, 0, 5, 8, 12, 20];
function haircut(idx: number): number { return BASE_HAIRCUTS[fid(idx) - 1]; }

const CRM_TYPES_BASE = ['CASH', 'REAL_ESTATE', 'RECEIVABLES', 'EQUIPMENT', 'INVENTORY', 'CASH', 'SECURITIES', 'REAL_ESTATE', 'RECEIVABLES', 'SECURITIES'];
const MITIGANT_GROUPS_BASE = ['FINANCIAL', 'PHYSICAL', 'RECEIVABLE', 'PHYSICAL', 'PHYSICAL', 'FINANCIAL', 'FINANCIAL', 'PHYSICAL', 'RECEIVABLE', 'FINANCIAL'];
const MITIGANT_SUBTYPES_BASE = ['CASH_DEPOSIT', 'CRE', 'AR_POOL', 'MACHINERY', 'RAW_MATERIAL', 'CASH_DEPOSIT', 'GOVT_BOND', 'INDUSTRIAL', 'AR_POOL', 'EQUITY'];

const BASE_LIMITS = [500_000_000, 1_000_000_000, 750_000_000, 2_000_000_000, 400_000_000, 1_500_000_000, 600_000_000, 350_000_000, 900_000_000, 3_000_000_000];
function limitAmt(idx: number): number { return BASE_LIMITS[fid(idx) - 1]; }
function utilized(idx: number): number { return drawn(idx); }

const AMEND_TYPES_ALL = ['INCREASE', 'EXTENSION', 'PRICING', 'COVENANT', 'PARTY', 'FACILITY', 'SECURITY', 'RESTATEMENT', 'WAIVER', 'DECREASE'];
function amendType(idx: number): string {
  const c = cycle(idx);
  const f = fid(idx) - 1;
  return AMEND_TYPES_ALL[(f + c * 3) % AMEND_TYPES_ALL.length];
}

const AMEND_STATUSES_ALL = ['EFFECTIVE', 'COMPLETED', 'APPROVED', 'EFFECTIVE', 'PENDING', 'COMPLETED', 'EFFECTIVE', 'APPROVED', 'COMPLETED', 'EFFECTIVE'];
function amendStatus(idx: number): string { return AMEND_STATUSES_ALL[(fid(idx) - 1 + cycle(idx)) % AMEND_STATUSES_ALL.length]; }

function amendEffDate(idx: number): string {
  const c = cycle(idx);
  const month = [11, 12, 1, 10, 2, 9, 1, 8, 12, 1][fid(idx) - 1];
  const year = c <= 1 ? 2024 : 2025;
  const day = [1, 15, 1, 20, 1, 1, 15, 1, 1, 10][fid(idx) - 1];
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const RISK_FLAG_TYPES = ['CONCENTRATION', 'WATCH_LIST', 'COVENANT_BREACH', 'MATURITY_1Y', 'CONCENTRATION', 'WATCH_LIST', 'SECTOR', 'COUNTRY', 'CONCENTRATION', 'WATCH_LIST'];
const RISK_FLAG_TYPES_ALT = ['SECTOR', 'MATURITY_1Y', 'COUNTRY', 'COVENANT_BREACH', 'WATCH_LIST', 'CONCENTRATION', 'MATURITY_1Y', 'SECTOR', 'COUNTRY', 'CONCENTRATION'];

const LOB_NAMES_BASE = ['IB_LEVERAGED', 'IB_IG', 'CRE_OFFICE', 'CRE_MULTI', 'ABL_RETAIL', 'IB_IG', 'MM_SPONSOR', 'ABL_HEALTHCARE', 'IB_LEVERAGED', 'IB_IG'];
const FR2590_CATS_BASE = ['C&I', 'C&I', 'CRE', 'CRE', 'C&I', 'C&I', 'C&I', 'C&I', 'C&I', 'C&I'];
const EXPOSURE_TYPES_BASE = ['FUNDED', 'FUNDED', 'UNFUNDED', 'FUNDED', 'FUNDED', 'FUNDED', 'UNFUNDED', 'FUNDED', 'FUNDED', 'FUNDED'];

const PIPELINE_STAGES_ALL = ['PITCH', 'TERM_SHEET', 'DOCS', 'CLOSING', 'WON', 'PITCH', 'TERM_SHEET', 'DOCS', 'CLOSING', 'LOST'];
function pipelineStage(idx: number): string { return PIPELINE_STAGES_ALL[(fid(idx) - 1 + cycle(idx)) % PIPELINE_STAGES_ALL.length]; }

const BASE_PROPOSED = [100_000_000, 250_000_000, 500_000_000, 75_000_000, 300_000_000, 150_000_000, 400_000_000, 80_000_000, 200_000_000, 600_000_000];
function proposedAmt(idx: number): number { return vary(BASE_PROPOSED[fid(idx) - 1], idx, 0.20); }

const METRIC_CODES_ALL = ['PD', 'LGD', 'EL', 'RWA', 'CAPITAL_REQ', 'DSCR', 'LTV', 'UTIL', 'ROE', 'NCO_RATE'];
const METRIC_NAMES_ALL = ['Probability of Default', 'Loss Given Default', 'Expected Loss', 'Risk-Weighted Assets', 'Capital Requirement', 'Debt Service Coverage', 'Loan-to-Value', 'Utilization Rate', 'Return on Equity', 'Net Charge-Off Rate'];
const METRIC_CATS_ALL = ['CREDIT_QUALITY', 'CREDIT_QUALITY', 'LOSS', 'CAPITAL', 'CAPITAL', 'CREDIT_QUALITY', 'CREDIT_QUALITY', 'EXPOSURE', 'PROFITABILITY', 'LOSS'];
function metricCode(idx: number): string { return METRIC_CODES_ALL[(fid(idx) - 1 + cycle(idx) * 2) % METRIC_CODES_ALL.length]; }
function metricName(idx: number): string { return METRIC_NAMES_ALL[(fid(idx) - 1 + cycle(idx) * 2) % METRIC_NAMES_ALL.length]; }
function metricCat(idx: number): string { return METRIC_CATS_ALL[(fid(idx) - 1 + cycle(idx) * 2) % METRIC_CATS_ALL.length]; }

const BASE_METRIC_VALS = [0.42, 1.85, 2.10, 0.95, 3.20, 1.50, 2.75, 0.60, 1.90, 4.00];
function metricVal(idx: number): number {
  const base = BASE_METRIC_VALS[fid(idx) - 1];
  return Math.round((base + cycle(idx) * 0.15) * 100) / 100;
}
function metricUsdVal(idx: number): number { return Math.round(metricVal(idx) * 1_000_000); }

// Netting set data
const BASE_GROSS_EXP = [45_000_000, 80_000_000, 22_000_000, 60_000_000, 120_000_000, 35_000_000, 90_000_000, 18_000_000, 70_000_000, 150_000_000];
function grossExp(idx: number): number { return vary(BASE_GROSS_EXP[fid(idx) - 1], idx); }
function nettedExp(idx: number): number { return Math.round(grossExp(idx) * [0.22, 0.31, 0, 0.25, 0.33, 0.14, 0.33, 0, 0.29, 0.33][fid(idx) - 1]); }
function nettingBenefit(idx: number): number { return grossExp(idx) - nettedExp(idx); }
const BASE_COLL_HELD = [5_000_000, 12_000_000, 8_000_000, 20_000_000, 15_000_000, 3_000_000, 25_000_000, 6_000_000, 10_000_000, 30_000_000];
function collHeld(idx: number): number { return vary(BASE_COLL_HELD[fid(idx) - 1], idx); }
function grossMtm(idx: number): number { return Math.round(grossExp(idx) * 0.92); }
function pfeUsd(idx: number): number { return Math.round(grossExp(idx) * 0.18); }

// Stress test data
const BASE_STRESS_LOSS = [10_000_000, 25_000_000, 5_000_000, 50_000_000, 15_000_000, 30_000_000, 8_000_000, 40_000_000, 12_000_000, 60_000_000];
function stressLoss(idx: number): number { return vary(BASE_STRESS_LOSS[fid(idx) - 1], idx, 0.25); }
function breachAmt(idx: number): number {
  const c = cycle(idx);
  const f = fid(idx) - 1;
  // More breaches in stress cycles
  if (c === 2 || c === 3) return f % 3 === 0 ? Math.round(stressLoss(idx) * 0.4) : 0;
  return f % 5 === 0 ? Math.round(stressLoss(idx) * 0.2) : 0;
}

const SCENARIO_TYPES_ALL = ['BASELINE', 'ADVERSE', 'SEVERELY_ADVERSE'];
function scenarioType(idx: number): string { return SCENARIO_TYPES_ALL[(fid(idx) - 1 + cycle(idx)) % 3]; }
function scenarioStatus(idx: number): string {
  if (cycle(idx) >= 3 && fid(idx) % 3 === 0) return 'IN_PROGRESS';
  return 'COMPLETED';
}
function breachSeverity(idx: number): string {
  const b = breachAmt(idx);
  if (b === 0) return 'NONE';
  if (b > 15_000_000) return 'CRITICAL';
  if (b > 8_000_000) return 'HIGH';
  if (b > 3_000_000) return 'MEDIUM';
  return 'LOW';
}

// Credit event data
const CE_EVENT_TYPES_ALL = ['PAYMENT_DEFAULT', 'COVENANT_BREACH', 'CROSS_DEFAULT', 'BANKRUPTCY', 'RESTRUCTURING', 'PAYMENT_DEFAULT', 'RATING_DOWNGRADE', 'COVENANT_BREACH', 'PAYMENT_DEFAULT', 'CROSS_DEFAULT'];
function ceEventType(idx: number): string { return CE_EVENT_TYPES_ALL[(fid(idx) - 1 + cycle(idx)) % CE_EVENT_TYPES_ALL.length]; }
function ceEventStatus(idx: number): string {
  const c = cycle(idx);
  if (c >= 3) return 'RESOLVED';
  return c % 2 === 0 ? 'OPEN' : 'RESOLVED';
}
function ceLoss(idx: number): number {
  const c = cycle(idx);
  const f = fid(idx) - 1;
  // Losses concentrated on troubled names in stress cycles
  if ((f === 4 || f === 7) && c >= 2) return Math.round(drawn(idx) * 0.02);
  if (f === 0 && c === 2) return 2_400_000;
  if (f === 2 && c === 2) return 8_000_000;
  if (f === 8 && c === 2) return 6_000_000;
  if (f === 9 && c === 2) return 21_000_000;
  return 0;
}
function ceRecovery(idx: number): number { return Math.round(ceLoss(idx) * 0.4); }
function ceRating(idx: number): string {
  return intRating(idx);
}

const CE_SUMMARIES_POOL = [
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
  'Forbearance agreement entered into',
  'Covenant holiday granted through Q2-2025',
  'Asset sale proceeds used for partial paydown',
  'Subordinated debt service deferred',
  'Working capital facility fully drawn under stress',
  'Rating agency placed on negative CreditWatch',
  'Sponsor equity cure provision exercised',
  'Insurance claim filed on collateral damage',
  'Maturity acceleration notice issued',
  'Standstill agreement with syndicate lenders',
  'DIP financing approved by bankruptcy court',
  'Pre-pack restructuring plan filed',
  'Guarantor financial deterioration flagged',
  'Environmental liability provision increased',
  'Supply chain disruption impacted cash flows',
  'Interest rate hedge expired unrenewed',
  'Tenant vacancy in CRE collateral reached 30%',
  'Currency mismatch exposure crystallized',
  'Regulatory action impacted business operations',
  'Key customer concentration loss event',
  'Technology platform outage caused revenue drop',
  'Commodity price decline below breakeven',
  'Labor dispute affected production capacity',
  'Acquisition integration costs exceeded plan',
  'Seasonal liquidity shortfall triggered draw',
  'Tax dispute resulted in lien on assets',
  'Change of control triggered put option',
  'Market value of collateral declined 20%',
  'Pension fund deficit crystallized on balance sheet',
  'Product recall impacted revenue forecast',
  'Cyber incident affected payment processing',
  'Climate risk assessment downgraded property',
  'Portfolio concentration limit approached',
  'Cross-border transfer restriction imposed',
  'Anti-money laundering review flagged transactions',
  'Trade finance documentary discrepancy',
  'Lease termination reduced NOI below covenant',
  'Subordinated lender exercised step-in rights',
];
function ceSummary(idx: number): string { return CE_SUMMARIES_POOL[idx % CE_SUMMARIES_POOL.length]; }

// Event dates spread across Jan 2025
function eventDate(idx: number): string {
  const day = ((idx * 7 + fid(idx) * 3) % 28) + 1;
  return `2025-01-${String(day).padStart(2, '0')}`;
}

// Deal pipeline data
function expectedCloseDate(idx: number): string {
  const monthOffset = (fid(idx) + cycle(idx)) % 6 + 2; // Feb-Jul 2025
  return `2025-${String(monthOffset).padStart(2, '0')}-${[15, 28, 30, 15, 28, 30][(fid(idx) - 1) % 6]}`;
}
function expectedSpread(idx: number): number { return spread(idx) - 25; }
function expectedTenor(idx: number): string { return ['60', '84', '48', '36', '60', '84', '72', '36', '60', '120'][fid(idx) - 1]; }
function expectedGrade(idx: number): string { return ['BBB+', 'A-', 'BBB', 'A+', 'BB+', 'A', 'BBB-', 'A+', 'BBB', 'AA-'][fid(idx) - 1]; }
function pipelineStatus(idx: number): string {
  const stage = pipelineStage(idx);
  if (stage === 'CLOSING' || stage === 'WON') return 'CLOSING';
  if (stage === 'LOST') return 'WITHDRAWN';
  return 'ACTIVE';
}

// Exception event data
const EXCEPTION_TYPES_POOL = ['MISSING_DATA', 'OUT_OF_RANGE', 'DUPLICATE', 'STALE_DATA', 'RECONCILIATION_BREAK'];
function exceptionType(idx: number): string { return EXCEPTION_TYPES_POOL[(fid(idx) - 1 + cycle(idx)) % EXCEPTION_TYPES_POOL.length]; }
const EXCEPTION_SEVS_ALL = ['LOW', 'MEDIUM', 'LOW', 'HIGH', 'MEDIUM', 'LOW', 'HIGH', 'MEDIUM', 'LOW', 'CRITICAL'];
function exceptionSev(idx: number): string { return EXCEPTION_SEVS_ALL[(fid(idx) - 1 + cycle(idx)) % EXCEPTION_SEVS_ALL.length]; }
function exceptionStatus(idx: number): string {
  const c = cycle(idx);
  if (c >= 3) return 'RESOLVED';
  if (c === 2 && fid(idx) % 3 === 0) return 'ESCALATED';
  return c % 2 === 0 ? 'OPEN' : 'RESOLVED';
}

const EXCEPTION_DESCS_POOL = [
  'Missing LGD estimate for facility', 'PD value exceeds upper bound for IG counterparty',
  'Duplicate collateral record for asset', 'Missing financial statements for Q3-2024',
  'Spread outside expected range for credit', 'Duplicate position entry from source system',
  'Missing rating observation for counterparty', 'DSCR value below minimum threshold',
  'Duplicate cash flow record for facility', 'Missing collateral valuation for exposure',
  'LTV ratio exceeds policy maximum', 'Duplicate amendment record corrected',
  'Stale market data for collateral valuation', 'Reconciliation break in GL vs. sub-ledger',
  'Missing borrower financial covenants data', 'Out-of-range interest rate calculation',
  'Duplicate netting set membership', 'Missing country risk classification',
  'FX rate staleness exceeds tolerance', 'Data feed latency above SLA threshold',
  'Missing obligor industry classification', 'Inconsistent maturity date across systems',
  'Duplicate limit utilization record', 'Missing stress test input parameters',
  'Reconciliation break in exposure aggregation', 'Stale internal rating for counterparty',
  'Missing collateral perfection documentation', 'Out-of-range LGD for secured facility',
  'Duplicate credit event record', 'Missing regulatory classification code',
  'Stale appraisal for CRE collateral', 'Reconciliation break in capital calculation',
  'Missing guarantee documentation reference', 'Out-of-range commitment utilization',
  'Duplicate source system feed records', 'Missing Basel asset class mapping',
  'Stale credit bureau data', 'Reconciliation break in P&L attribution',
  'Missing environmental risk assessment', 'Out-of-range concentration metric',
  'Duplicate amendment approval workflow', 'Missing cross-default clause reference',
  'Stale counterparty financial data', 'Reconciliation break in collateral pool',
  'Missing inter-company exposure netting', 'Out-of-range DSCR calculation',
  'Duplicate regulatory report submission', 'Missing AML/KYC refresh documentation',
  'Stale pipeline deal probability', 'Reconciliation break in fee accrual',
];
function exceptionDesc(idx: number): string { return EXCEPTION_DESCS_POOL[idx % EXCEPTION_DESCS_POOL.length]; }

const EXCEPTION_OWNERS_POOL = ['Credit Risk Analytics', 'Portfolio Management', 'Data Operations', 'Credit Review', 'Risk Management', 'Collateral Ops', 'Regulatory Reporting', 'Finance', 'Treasury', 'Compliance'];
function exceptionOwner(idx: number): string { return EXCEPTION_OWNERS_POOL[(fid(idx) - 1 + cycle(idx)) % EXCEPTION_OWNERS_POOL.length]; }

function breachAmtEx(idx: number): number {
  const sev = exceptionSev(idx);
  if (sev === 'LOW') return 0;
  if (sev === 'MEDIUM') return vary(2_750_000, idx, 0.30);
  if (sev === 'HIGH') return vary(5_500_000, idx, 0.30);
  return vary(21_000_000, idx, 0.20); // CRITICAL
}
function breachPctEx(idx: number): number {
  const amt = breachAmtEx(idx);
  if (amt === 0) return 0;
  return Math.round(amt / limitAmt(idx) * 100 * 10) / 10;
}
function daysOpen(idx: number): number {
  const status = exceptionStatus(idx);
  if (status === 'RESOLVED') return [1, 2, 3, 1, 2][cycle(idx)];
  if (status === 'ESCALATED') return [18, 21, 25, 30, 15][cycle(idx)];
  return [5, 8, 12, 10, 7][(fid(idx) - 1) % 5];
}

const REMED_PLANS_POOL = [
  'Source system fix deployed, re-extract pending', 'Manual override pending credit officer review',
  'Duplicate removed in batch reconciliation', 'Escalated to RM for financial statement collection',
  'Pricing review with syndications desk', 'Dedup script scheduled for next processing cycle',
  'Rating model re-run requested from CRA team', 'Covenant waiver request submitted to credit committee',
  'Source system dedup completed', 'Emergency collateral revaluation ordered',
  'LTV limit exception approval in progress', 'Automated dedup rule added to prevent recurrence',
  'Data quality rule updated in validation engine', 'GL reconciliation break under investigation',
  'Financial data refresh requested from borrower', 'Rate calculation engine patch deployed',
  'Netting set membership corrected', 'Country risk code updated in reference data',
  'FX rate feed SLA review with vendor', 'Data pipeline latency fix in progress',
  'Industry code mapped from SIC to GICS', 'Maturity date alignment across booking systems',
  'Limit utilization dedup script deployed', 'Stress test model inputs refreshed',
  'Exposure aggregation logic corrected', 'Internal rating model refresh initiated',
  'Perfection documentation collected from legal', 'LGD model recalibrated for secured segment',
  'Credit event record merged in golden source', 'Regulatory mapping table updated',
  'CRE appraisal ordered from independent valuer', 'Capital calc engine patched for edge case',
  'Guarantee doc reference linked in system', 'Utilization calc fix deployed to production',
  'Source system feed dedup at ingestion layer', 'Basel asset class mapping updated',
  'Credit bureau data refresh scheduled', 'P&L attribution logic corrected',
  'ESG risk assessment module updated', 'Concentration limit recalculated',
  'Amendment workflow duplicate entries purged', 'Cross-default clause linked to master agreement',
  'Quarterly financial refresh completed', 'Collateral pool reconciliation fixed',
  'Intercompany netting rules updated', 'DSCR calculation methodology corrected',
  'Regulatory report resubmission filed', 'KYC refresh initiated for counterparty',
  'Pipeline probability model retrained', 'Fee accrual engine patched',
];
function remediationPlan(idx: number): string { return REMED_PLANS_POOL[idx % REMED_PLANS_POOL.length]; }

// Risk flag data
function flagType(idx: number): string {
  return cycle(idx) % 2 === 0 ? RISK_FLAG_TYPES[fid(idx) - 1] : RISK_FLAG_TYPES_ALT[fid(idx) - 1];
}
const FLAG_CODES_BASE = ['CONC', 'WL', 'COV', 'MAT', 'CONC', 'WL', 'SEC', 'CTY', 'CONC', 'WL'];
function flagCode(idx: number): string { return `${FLAG_CODES_BASE[fid(idx) - 1]}_${String(idx + 1).padStart(2, '0')}`; }

const FLAG_DESCS_POOL = [
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
  'CRE vacancy rate above 25% threshold',
  'Commodity price exposure unhedged',
  'Currency mismatch in cross-border facility',
  'Sponsor leverage above 7.0x',
  'Single-obligor limit utilization at 92%',
  'Environmental liability risk flagged',
  'Management key person risk identified',
  'Supply chain concentration risk',
  'Counterparty CDS spread widened 150bps',
  'Trade receivables aging beyond 90 days',
  'Debt/equity ratio above sector median',
  'Negative free cash flow for 2 consecutive quarters',
  'Regulatory investigation disclosed',
  'Dividend payout suspended by borrower',
  'Collateral coverage ratio below 1.2x minimum',
  'Interest coverage below 2.0x threshold',
  'Technology obsolescence risk flagged',
  'Customer churn rate elevated above baseline',
  'Cross-default clause triggered at subsidiary',
  'Pension deficit exceeds materiality threshold',
  'Acquisition integration risk elevated',
  'Market share decline in core segment',
  'Working capital cycle deteriorated 15+ days',
  'Lease renewal risk on anchor tenant',
  'Raw material cost inflation above forecast',
  'Cybersecurity incident response ongoing',
  'Credit insurance provider downgraded',
  'Debt service reserve account below minimum',
  'Intercompany loan exposure flagged',
  'Construction cost overrun on project finance',
  'Political risk in operating jurisdiction',
  'Revenue concentration above 40% single customer',
  'Tax assessment disputed by authorities',
  'ESG score decline to below-average',
  'Patent expiry affecting revenue pipeline',
  'Labor cost inflation above wage covenant',
  'Real estate appraisal below prior valuation',
  'Liquidity coverage ratio approaching minimum',
];
function flagDesc(idx: number): string { return FLAG_DESCS_POOL[idx % FLAG_DESCS_POOL.length]; }

const FLAG_SCOPES_BASE = ['COUNTERPARTY', 'COUNTERPARTY', 'FACILITY', 'FACILITY', 'PORTFOLIO', 'COUNTERPARTY', 'PORTFOLIO', 'PORTFOLIO', 'COUNTERPARTY', 'COUNTERPARTY'];
function flagScope(idx: number): string { return FLAG_SCOPES_BASE[fid(idx) - 1]; }

function flagSeverity(idx: number): string {
  const f = fid(idx) - 1;
  const c = cycle(idx);
  if ((f === 4 || f === 7) && c >= 2) return 'HIGH'; // troubled names
  return ['HIGH', 'MEDIUM', 'HIGH', 'MEDIUM', 'HIGH', 'LOW', 'MEDIUM', 'LOW', 'HIGH', 'HIGH'][f];
}

function flagTrigger(idx: number): number {
  return [5.2, 0, 6.2, 11, 16.3, 0, 12.1, 0, 8.4, 0][fid(idx) - 1] + cycle(idx) * 0.5;
}

// DQ score data
const DQ_DIMS_BASE = ['COMPLETENESS', 'VALIDITY', 'TIMELINESS', 'COMPLETENESS', 'VALIDITY', 'TIMELINESS', 'COMPLETENESS', 'VALIDITY', 'COMPLETENESS', 'VALIDITY'];
function dqDim(idx: number): string { return DQ_DIMS_BASE[fid(idx) - 1]; }
const DQ_TABLES = ['facility_master', 'counterparty', 'collateral_asset', 'position', 'credit_event', 'amendment_event', 'netting_set', 'limit_rule', 'instrument_master', 'exposure_snapshot'];
function dqTable(idx: number): string { return DQ_TABLES[(fid(idx) - 1 + cycle(idx)) % DQ_TABLES.length]; }

function dqCompleteness(idx: number): number {
  const base = [98.5, 99.2, 97.8, 99.0, 98.0, 99.5, 97.0, 98.8, 99.1, 96.5][fid(idx) - 1];
  return Math.round((base + cycle(idx) * 0.2) * 10) / 10;
}
function dqValidity(idx: number): number {
  const base = [99.0, 98.5, 99.2, 97.8, 99.0, 98.0, 99.5, 97.0, 98.8, 99.1][fid(idx) - 1];
  return Math.round((base + cycle(idx) * 0.1) * 10) / 10;
}
function dqOverall(idx: number): number {
  return Math.round((dqCompleteness(idx) * 0.5 + dqValidity(idx) * 0.5) * 10) / 10;
}
function dqImpactPct(idx: number): number { return [2.1, 1.5, 3.2, 1.0, 2.5, 0.8, 4.0, 3.5, 1.2, 5.0][fid(idx) - 1]; }
function dqReportCodes(idx: number): string { return ['FR_Y14Q', 'FR_Y14Q,CCAR', 'FR_Y14Q', 'DFAST', 'FR_Y14Q', 'CCAR', 'FR_Y14Q,DFAST', 'CCAR', 'FR_Y14Q', 'CCAR,DFAST'][fid(idx) - 1]; }
function dqIssueCount(idx: number): number { return Math.max(0, [3, 7, 12, 2, 5, 1, 15, 8, 4, 18][fid(idx) - 1] - cycle(idx)); }
function dqReconBreaks(idx: number): number { return Math.max(0, [0, 2, 4, 0, 1, 0, 5, 3, 1, 8][fid(idx) - 1] - cycle(idx)); }

// ───────────── raised/cleared timestamps ─────────────
function raisedTs(idx: number): string {
  const day = ((idx * 3 + 5) % 28) + 1;
  const hour = (8 + (idx % 10));
  return `2025-01-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String((idx * 17) % 60).padStart(2, '0')}:00`;
}
function clearedTs(idx: number): string | undefined {
  // ~40% of flags get cleared
  if ((idx * 7 + 3) % 5 < 2) return `2025-01-${String(Math.min(31, ((idx * 3 + 10) % 28) + 4)).padStart(2, '0')} ${String(14 + idx % 4).padStart(2, '0')}:00:00`;
  return undefined;
}

function raisedDate(idx: number): string {
  const day = ((idx * 3 + 2) % 28) + 1;
  return `2025-01-${String(day).padStart(2, '0')}`;
}
function resolvedDate(idx: number): string | undefined {
  if (exceptionStatus(idx) === 'RESOLVED') return `2025-01-31 ${String(9 + idx % 8).padStart(2, '0')}:00:00`;
  return undefined;
}

// ───────────── amendment descriptions ─────────────
const AMEND_DESCS_POOL = [
  'Commitment increase from $200M to $250M', 'Maturity extended 18 months to Mar-2028',
  'Spread reduced from L+325 to L+275', 'Leverage covenant relaxed from 5.0x to 5.5x',
  'Addition of subsidiary guarantor', 'Accordion exercise on revolving facility',
  'Collateral release of Tranche B security package', 'Administrative agent change to JPM',
  'Commitment increase from $500M to $600M', 'Maturity extended 24 months to Dec-2031',
  'Pricing grid amendment pending credit approval', 'DSCR covenant threshold reduced from 1.20x to 1.10x',
  'Facility size reduced by $100M at borrower request', 'Interest rate floor added at SOFR + 100bps',
  'Guarantor entity substituted with stronger parent', 'Security package enhanced with additional CRE pledge',
  'Amendment and restatement to add new tranche', 'Waiver of minimum liquidity covenant for Q4-2024',
  'Pricing step-up triggered by rating downgrade', 'Co-borrower added under existing facility',
  'Revolving period extended by 12 months', 'Commitment fee waived during draw period',
  'Cross-default threshold raised from $5M to $10M', 'Financial reporting frequency changed to monthly',
  'Permitted acquisition basket increased to $200M', 'Change of control definition narrowed',
  'Prepayment premium reduced from 2% to 1%', 'Currency of determination changed to EUR',
  'Incremental term loan facility added', 'Reserved capacity allocated for future accordion',
  'Compliance certificate delivery extended 15 days', 'Minimum hedging requirement reduced',
  'EBITDA add-backs capped at 25% of pro forma', 'Borrowing base redetermination frequency changed',
  'Swingline sublimit increased to $50M', 'Letter of credit sublimit reduced',
  'Mandatory prepayment sweep percentage lowered', 'Restricted payments basket increased',
  'Leverage ratio step-down schedule extended', 'Subsidiary guarantor release conditions amended',
  'SOFR spread adjustment mechanism updated', 'ESG margin ratchet added to pricing grid',
  'Sustainability-linked KPI targets established', 'Working capital facility term extended',
  'Collateral valuation methodology updated', 'Insurance coverage requirements reduced',
  'Equity cure right expanded to 3 exercises', 'Clean-down period requirement waived',
  'Material adverse change definition narrowed', 'Assignment and transfer provisions updated',
];
function amendDesc(idx: number): string { return AMEND_DESCS_POOL[idx % AMEND_DESCS_POOL.length]; }

function amendCompletedDate(idx: number): string | undefined {
  const s = amendStatus(idx);
  if (s === 'COMPLETED' || s === 'EFFECTIVE') {
    const day = Math.min(31, ((fid(idx) * 3 + cycle(idx) * 7) % 28) + 1);
    return `2025-01-${String(day).padStart(2, '0')}`;
  }
  return undefined;
}

const AMEND_SUBTYPES = ['SIZE', 'TENOR', 'SPREAD', 'FINANCIAL', 'GUARANTOR', 'SIZE', 'COLLATERAL', 'ADMIN', 'SIZE', 'TENOR'];
function amendSubtype(idx: number): string { return AMEND_SUBTYPES[(fid(idx) - 1 + cycle(idx)) % AMEND_SUBTYPES.length]; }

function amendIdentifiedDate(idx: number): string {
  const monthBack = cycle(idx) + 1;
  const m = 12 - monthBack + 1;
  const day = ((fid(idx) * 5) % 28) + 1;
  return `2024-${String(Math.max(1, Math.min(12, m))).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Amendment change detail arrays ──
const CHANGE_TYPES_ALL = ['COMMITMENT', 'PRICING', 'MATURITY', 'COVENANT', 'PARTY', 'COMMITMENT', 'PRICING', 'MATURITY', 'COVENANT', 'PARTY'];
const OLD_VALS_ALL = ['$200M', 'L+225bps', '2026-12-31', 'Max leverage 5.0x', 'Borrower A only', '$1.2B', 'L+300bps', '2027-03-31', 'Min DSCR 1.20x', 'Party A, Party B'];
const NEW_VALS_ALL = ['$250M', 'L+175bps', '2027-06-30', 'Max leverage 5.5x', 'Borrower A + Sub', '$1.5B', 'L+275bps', '2028-09-30', 'Min DSCR 1.10x', 'Party A, Party B, Party C'];
const CHANGE_FIELDS_ALL = ['committed_amount', 'spread_bps', 'maturity_date', 'leverage_covenant', 'borrower_list', 'committed_amount', 'spread_bps', 'maturity_date', 'dscr_covenant', 'participant_list'];
function changeType(idx: number): string { return CHANGE_TYPES_ALL[(fid(idx) - 1 + cycle(idx)) % CHANGE_TYPES_ALL.length]; }
function oldVal(idx: number): string { return OLD_VALS_ALL[(fid(idx) - 1 + cycle(idx)) % OLD_VALS_ALL.length]; }
function newVal(idx: number): string { return NEW_VALS_ALL[(fid(idx) - 1 + cycle(idx)) % NEW_VALS_ALL.length]; }
function changeField(idx: number): string { return CHANGE_FIELDS_ALL[(fid(idx) - 1 + cycle(idx)) % CHANGE_FIELDS_ALL.length]; }
function changeCurrency(idx: number): string | undefined {
  const ct = changeType(idx);
  return (ct === 'COMMITMENT' || ct === 'PRICING') ? 'USD' : undefined;
}

// Cash flow types & amounts
const CF_TYPES = ['DRAW', 'REPAY', 'INTEREST', 'FEE'];
function cfType(idx: number): string { return CF_TYPES[(fid(idx) - 1 + cycle(idx)) % CF_TYPES.length]; }
function cfAmount(idx: number): number {
  const t = cfType(idx);
  const base = drawn(idx) || committed(idx);
  if (t === 'DRAW') return Math.round(base * 0.04);
  if (t === 'REPAY') return -Math.round(base * 0.02);
  if (t === 'INTEREST') return Math.round(base * allInRate(idx) / 100 / 12);
  return Math.round(base * 0.001); // FEE
}
function cfDirection(idx: number): string { return cfType(idx) === 'REPAY' ? 'OUTBOUND' : 'INBOUND'; }
function cfDate(idx: number): string {
  const day = Math.max(1, 31 - idx);
  return `2025-01-${String(day).padStart(2, '0')}`;
}

// Financial snapshot amounts
function noi(idx: number): number {
  if (drawn(idx) === 0) return 0;
  return vary(Math.round(drawn(idx) * 0.07), idx, 0.10);
}
function debtService(idx: number): number {
  if (drawn(idx) === 0) return 0;
  return vary(Math.round(drawn(idx) * 0.048), idx, 0.10);
}
function revenue(idx: number): number {
  if (drawn(idx) === 0) return 0;
  return vary(Math.round(drawn(idx) * 0.12), idx, 0.10);
}
function opex(idx: number): number {
  if (drawn(idx) === 0) return 0;
  return vary(Math.round(drawn(idx) * 0.045), idx, 0.10);
}
function ebitda(idx: number): number {
  if (drawn(idx) === 0) return 0;
  return vary(Math.round(drawn(idx) * 0.085), idx, 0.10);
}
function interestExpense(idx: number): number {
  if (drawn(idx) === 0) return 0;
  return Math.round(drawn(idx) * allInRate(idx) / 100 / 12 * 4); // quarterly
}
function principalPayment(idx: number): number {
  if (drawn(idx) === 0) return 0;
  return vary(Math.round(drawn(idx) * 0.017), idx, 0.10);
}

// Profitability
function niiYtd(idx: number): number {
  if (drawn(idx) === 0) return 0;
  return vary(Math.round(drawn(idx) * spread(idx) / 10000 * 0.25), idx, 0.15); // ~1Q of spread income
}
function feeYtd(idx: number): number {
  return vary(Math.round(committed(idx) * 0.0002), idx, 0.20);
}

// Approvers & owners
const APPROVERS = ['VP Credit', 'SVP Risk', 'VP Data', 'MD Credit', 'SVP Risk', 'VP Data', 'MD Credit', 'SVP Risk', 'VP Data', 'CRO'];
function approver(idx: number): string { return APPROVERS[(fid(idx) - 1 + cycle(idx)) % APPROVERS.length]; }

const LOD_SPONSORS = ['LoD1 Credit', 'LoD2 Risk', 'LoD1 Data', 'LoD1 Credit', 'LoD2 Risk', 'LoD1 Data', 'LoD1 Credit', 'LoD2 Risk', 'LoD1 Data', 'LoD2 Risk'];
function lodSponsor(idx: number): string { return LOD_SPONSORS[(fid(idx) - 1 + cycle(idx)) % LOD_SPONSORS.length]; }

// Rating observation helpers
const RATING_AGENCIES = ['INTERNAL', 'MOODYS', 'INTERNAL', 'S&P', 'INTERNAL', 'FITCH', 'INTERNAL', 'MOODYS', 'INTERNAL', 'S&P'];
const RATING_TYPES = ['TTC', 'ISSUER', 'TTC', 'LT_ISSUER', 'PIT', 'LT_ISSUER', 'TTC', 'ISSUER', 'PIT', 'LT_ISSUER'];
function ratingAgency(idx: number): string { return RATING_AGENCIES[(fid(idx) - 1 + cycle(idx)) % RATING_AGENCIES.length]; }
function ratingType(idx: number): string { return RATING_TYPES[(fid(idx) - 1 + cycle(idx)) % RATING_TYPES.length]; }
function isInternal(idx: number): boolean { return ratingAgency(idx) === 'INTERNAL'; }
function priorRating(idx: number): string {
  // Prior is one notch above current
  const priors = ['A', 'Baa2', 'AA-', 'Ba1', 'BB+', 'Aa3', 'B', 'Baa1', 'BB+', 'Aaa'];
  return priors[fid(idx) - 1];
}

// Metric threshold helpers
const THRESH_TYPES = ['MIN', 'MAX'];
function threshType(idx: number): string { return THRESH_TYPES[(fid(idx) - 1 + cycle(idx)) % 2]; }
function threshVal(idx: number): number {
  const base = [0.5, 2.0, 1.0, 3.0, 0.25, 1.5, 0.75, 2.5, 0.1, 4.0][fid(idx) - 1];
  return Math.round((base + cycle(idx) * 0.1) * 100) / 100;
}
const THRESH_NAMES_POOL = ['PD Floor', 'LGD Ceiling', 'EL Floor', 'RWA Ceiling', 'Capital Floor', 'PD Ceiling', 'LGD Floor', 'EL Ceiling', 'RWA Floor', 'Capital Ceiling'];
function threshName(idx: number): string { return THRESH_NAMES_POOL[(fid(idx) - 1 + cycle(idx)) % THRESH_NAMES_POOL.length]; }
const THRESH_DESCS_POOL = [
  'Minimum PD threshold for IG obligors', 'Maximum LGD for secured facilities',
  'Minimum EL for provisioning', 'Maximum RWA density for portfolio',
  'Minimum capital requirement ratio', 'Maximum PD for investment grade',
  'Minimum LGD for unsecured', 'Maximum EL for single obligor',
  'Minimum RWA for off-balance sheet', 'Maximum capital allocation per LOB',
];
function threshDesc(idx: number): string { return THRESH_DESCS_POOL[(fid(idx) - 1 + cycle(idx)) % THRESH_DESCS_POOL.length]; }

const METRIC_OWNERS = ['Credit Analytics', 'Portfolio Mgmt', 'Finance', 'Capital Planning', 'Treasury', 'Credit Analytics', 'Portfolio Mgmt', 'Finance', 'Capital Planning', 'Treasury'];
const LOD1_SPONSORS = ['Credit Risk', 'Credit Risk', 'Finance', 'Capital Mgmt', 'Capital Mgmt', 'Credit Risk', 'Credit Risk', 'Finance', 'Capital Mgmt', 'Capital Mgmt'];
const LOD2_SPONSORS = ['Risk Management', 'Risk Management', 'Risk Management', 'Risk Management', 'CRO Office', 'Risk Management', 'Risk Management', 'Risk Management', 'Risk Management', 'CRO Office'];

const CONTROL_OWNERS = ['Credit Risk', 'Portfolio Mgmt', 'Risk Analytics'];
function controlOwner(idx: number): string { return CONTROL_OWNERS[(fid(idx) - 1 + cycle(idx)) % CONTROL_OWNERS.length]; }

// ═══════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════

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
      if (columnName === 'position_type') return posType(idx);
      if (columnName === 'balance_amount') return drawn(idx);
      if (columnName === 'currency_code') return currency(idx);
      if (columnName === 'source_system_id') return fid(idx);
      if (columnName === 'accrued_interest_amt') return drawn(idx) > 0 ? Math.round(drawn(idx) * allInRate(idx) / 100 / 12) : 0;
      if (columnName === 'book_value_amt') return drawn(idx);
      if (columnName === 'contractual_maturity_date') return maturityDate(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'credit_agreement_id') return fid(idx);
      if (columnName === 'credit_status_code') return creditStatus(idx);
      if (columnName === 'effective_date') return originationDate(idx);
      if (columnName === 'exposure_type_code') return EXPOSURE_TYPES_BASE[fid(idx) - 1];
      if (columnName === 'external_risk_rating') return extRating(idx);
      if (columnName === 'internal_risk_rating') return intRating(idx);
      if (columnName === 'legal_entity_id') return 1;
      if (columnName === 'lgd_estimate') return String(lgd(idx));
      if (columnName === 'market_value_amt') return drawn(idx);
      if (columnName === 'netting_set_id') return fid(idx);
      if (columnName === 'notional_amount') return committed(idx);
      if (columnName === 'pd_estimate') return String(pd(idx));
      if (columnName === 'position_currency') return currency(idx);
      if (columnName === 'trading_banking_book_flag') return 'B';
      if (columnName === 'ultimate_parent_id') return cid(idx);
      break;

    // ═══════════════════════════════════════════════════════════════════
    // POSITION_DETAIL
    // ═══════════════════════════════════════════════════════════════════
    case 'position_detail': {
      const detailTypes = ['PRINCIPAL', 'INTEREST', 'FEE'];
      const dt = detailTypes[(fid(idx) - 1 + cycle(idx)) % detailTypes.length];
      if (columnName === 'position_detail_id') return i;
      if (columnName === 'position_id') return (idx % N) + 1;
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'detail_type') return dt;
      if (columnName === 'amount') return dt === 'PRINCIPAL' ? drawn(idx) : dt === 'INTEREST' ? Math.round(drawn(idx) * allInRate(idx) / 100 / 12) : Math.round(committed(idx) * 0.001);
      if (columnName === 'maturity_date') return maturityDate(idx);
      if (columnName === 'cash_leg_amount') return dt === 'PRINCIPAL' ? drawn(idx) : 0;
      if (columnName === 'ccf') return dt === 'PRINCIPAL' ? 1.0 : 0.5;
      if (columnName === 'current_balance') return drawn(idx);
      if (columnName === 'days_past_due') return dpd(idx);
      if (columnName === 'delinquency_status') return creditStatus(idx);
      if (columnName === 'derivative_type') return undefined;
      if (columnName === 'fair_value') return drawn(idx);
      if (columnName === 'funded_amount') return drawn(idx);
      if (columnName === 'haircut_applied_pct') return haircut(idx);
      if (columnName === 'insured_balance') return 0;
      if (columnName === 'interest_rate') return allInRate(idx) / 100;
      if (columnName === 'mark_to_market') return drawn(idx);
      if (columnName === 'origination_date') return originationDate(idx);
      if (columnName === 'pfe') return undefined;
      if (columnName === 'quantity') return 1;
      if (columnName === 'rate_index') return baseRate(idx) / 100;
      if (columnName === 'rate_type') return 'F';
      if (columnName === 'replacement_cost') return 0;
      if (columnName === 'sft_type') return undefined;
      if (columnName === 'spread_bps') return spread(idx);
      if (columnName === 'total_commitment') return committed(idx);
      if (columnName === 'unfunded_amount') return Math.max(0, committed(idx) - drawn(idx));
      if (columnName === 'unrealized_gain_loss') return '0';
      if (columnName === 'product_node_id') return fid(idx);
      if (columnName === 'exposure_type_code') return 'LOAN';
      if (columnName === 'notional_amount') return drawn(idx);
      if (columnName === 'credit_conversion_factor') return 1.0;
      if (columnName === 'lgd_pct') return lgd(idx) * 100;
      if (columnName === 'risk_weight_pct') return riskWeight(idx);
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
      if (columnName === 'exposure_amount') return drawn(idx);
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'attributed_exposure_usd') return drawn(idx);
      if (columnName === 'attribution_pct') return 100.00;
      if (columnName === 'counterparty_role_code') return 'BORROWER';
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'is_risk_shifted_flag') return 'N';
      if (columnName === 'risk_shifted_from_counterparty_id') return undefined;
      break;

    // ═══════════════════════════════════════════════════════════════════
    // FACILITY_EXPOSURE_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'facility_exposure_snapshot': {
      const d = drawn(idx);
      const c = committed(idx);
      const undrawn = Math.max(0, c - d);
      const val = valuation(idx);
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'exposure_type_id') return fid(idx);
      if (columnName === 'drawn_amount') return d;
      if (columnName === 'committed_amount') return c;
      if (columnName === 'undrawn_amount') return undrawn;
      if (columnName === 'source_system_id') return fid(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'coverage_ratio_pct') return d > 0 ? Math.round(val / d * 100 * 100) / 100 : 0;
      if (columnName === 'currency_code') return currency(idx);
      if (columnName === 'exposure_amount_local') return d;
      if (columnName === 'facility_exposure_id') return i;
      if (columnName === 'fr2590_category_code') return FR2590_CATS_BASE[fid(idx) - 1];
      if (columnName === 'gross_exposure_usd') return c;
      if (columnName === 'legal_entity_id') return 1;
      if (columnName === 'lob_segment_id') return fid(idx);
      if (columnName === 'net_exposure_usd') return Math.max(0, d - val);
      if (columnName === 'product_node_id') return fid(idx);
      if (columnName === 'outstanding_balance_amt') return d;
      if (columnName === 'undrawn_commitment_amt') return undrawn;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // NETTING_SET_EXPOSURE_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'netting_set_exposure_snapshot':
      if (columnName === 'netting_set_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'netted_exposure_amount') return nettedExp(idx);
      if (columnName === 'gross_exposure_amount') return grossExp(idx);
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'collateral_held_usd') return collHeld(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'gross_mtm_usd') return grossMtm(idx);
      if (columnName === 'legal_entity_id') return 1;
      if (columnName === 'netting_set_exposure_id') return i;
      if (columnName === 'pfe_usd') return pfeUsd(idx);
      if (columnName === 'netting_benefit_amt') return nettingBenefit(idx);
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
      if (columnName === 'attributed_amount') return drawn(idx);
      if (columnName === 'attribution_amount_usd') return drawn(idx);
      if (columnName === 'attribution_type') return 'DIRECT';
      if (columnName === 'lob_node_id') return fid(idx);
      if (columnName === 'hierarchy_id') return 'DEFAULT_LOB_HIERARCHY';
      break;

    // ═══════════════════════════════════════════════════════════════════
    // COLLATERAL_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'collateral_snapshot': {
      const val = valuation(idx);
      const hc = haircut(idx);
      const eligible = Math.round(val * (1 - hc / 100));
      if (columnName === 'collateral_asset_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'valuation_amount') return val;
      if (columnName === 'haircut_pct') return hc;
      if (columnName === 'eligible_collateral_amount') return eligible;
      if (columnName === 'source_system_id') return fid(idx);
      if (columnName === 'allocated_amount_usd') return eligible;
      if (columnName === 'collateral_snapshot_id') return i;
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'crm_type_code') return CRM_TYPES_BASE[fid(idx) - 1];
      if (columnName === 'current_valuation_usd') return val;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'mitigant_group_code') return MITIGANT_GROUPS_BASE[fid(idx) - 1];
      if (columnName === 'mitigant_subtype') return MITIGANT_SUBTYPES_BASE[fid(idx) - 1];
      if (columnName === 'original_valuation_usd') return Math.round(val * 1.05);
      if (columnName === 'risk_shifting_flag') return 'N';
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // CASH_FLOW
    // ═══════════════════════════════════════════════════════════════════
    case 'cash_flow': {
      const cft = cfType(idx);
      const amt = cfAmount(idx);
      if (columnName === 'cash_flow_id') return i;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'cash_flow_date') return cfDate(idx);
      if (columnName === 'cash_flow_type') return cft;
      if (columnName === 'amount') return amt;
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'contractual_amt') return Math.abs(amt);
      if (columnName === 'contractual_amt_usd') return Math.abs(amt);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'flow_date') return cfDate(idx);
      if (columnName === 'flow_direction') return cfDirection(idx);
      if (columnName === 'flow_id') return i;
      if (columnName === 'flow_type') return cft;
      if (columnName === 'maturity_bucket_id') return Math.min(10, Math.floor(idx / 5) + 1);
      if (columnName === 'position_id') return (idx % N) + 1;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // FACILITY_FINANCIAL_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'facility_financial_snapshot':
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'noi_amt') return noi(idx);
      if (columnName === 'total_debt_service_amt') return debtService(idx);
      if (columnName === 'revenue_amt') return revenue(idx);
      if (columnName === 'operating_expense_amt') return opex(idx);
      if (columnName === 'ebitda_amt') return ebitda(idx);
      if (columnName === 'interest_expense_amt') return interestExpense(idx);
      if (columnName === 'principal_payment_amt') return principalPayment(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'reporting_period') return ['Q4-2024', 'Q3-2024', 'Q2-2024', 'Q1-2024', 'Q4-2023'][cycle(idx)];
      if (columnName === 'financial_snapshot_id') return i;
      break;

    // ═══════════════════════════════════════════════════════════════════
    // FACILITY_DELINQUENCY_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'facility_delinquency_snapshot': {
      const d = dpd(idx);
      const isWatch = creditStatusId(idx) >= 2;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'credit_status_code') return creditStatusId(idx);
      if (columnName === 'days_past_due') return d;
      if (columnName === 'watch_list_flag') return isWatch ? 'Y' : 'N';
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'currency_code') return currency(idx);
      if (columnName === 'days_past_due_max') return d;
      if (columnName === 'delinquency_bucket_code') return d === 0 ? 'CURRENT' : d <= 30 ? '1_30' : d <= 60 ? '31_60' : d <= 90 ? '61_90' : '90_PLUS';
      if (columnName === 'delinquency_snapshot_id') return i;
      if (columnName === 'delinquency_status_code') return creditStatus(idx);
      if (columnName === 'last_payment_received_date') return isWatch ? '2025-01-10' : '2025-01-28';
      if (columnName === 'overdue_interest_amt') return isWatch ? Math.round(drawn(idx) * allInRate(idx) / 100 / 12) : 0;
      if (columnName === 'overdue_principal_amt') return isWatch && d > 15 ? Math.round(drawn(idx) * 0.005) : 0;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // FACILITY_PRICING_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'facility_pricing_snapshot':
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'spread_bps') return spread(idx);
      if (columnName === 'rate_index_id') return fid(idx);
      if (columnName === 'all_in_rate_pct') return allInRate(idx);
      if (columnName === 'floor_pct') return [0, 0, 0.25, 0, 0.50, 0, 0.25, 0, 0, 0][fid(idx) - 1];
      if (columnName === 'base_rate_pct') return baseRate(idx);
      if (columnName === 'currency_code') return currency(idx);
      if (columnName === 'facility_pricing_id') return i;
      if (columnName === 'min_spread_threshold_bps') return [100, 125, 150, 100, 200, 75, 125, 100, 150, 75][fid(idx) - 1];
      if (columnName === 'payment_frequency') return fid(idx) % 2 === 0 ? 'MONTHLY' : 'QUARTERLY';
      if (columnName === 'prepayment_penalty_flag') return fid(idx) % 3 === 0 ? 'Y' : 'N';
      if (columnName === 'rate_cap_pct') return [12.00, 10.00, 12.00, 10.00, 14.00, 9.00, 12.00, 10.00, 12.00, 8.00][fid(idx) - 1];
      if (columnName === 'rate_index_code') return ['SOFR', 'EURIBOR', 'SOFR', 'SONIA', 'SOFR', 'SOFR', 'EURIBOR', 'SOFR', 'SONIA', 'SOFR'][fid(idx) - 1];
      break;

    // ═══════════════════════════════════════════════════════════════════
    // FACILITY_PROFITABILITY_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'facility_profitability_snapshot': {
      const d = drawn(idx);
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'nii_ytd') return niiYtd(idx);
      if (columnName === 'fee_income_ytd') return feeYtd(idx);
      if (columnName === 'ledger_account_id') return fid(idx);
      if (columnName === 'allocated_equity_amt') return Math.round(d * 0.08);
      if (columnName === 'avg_earning_assets_amt') return d;
      if (columnName === 'base_currency_code') return 'USD';
      if (columnName === 'fee_income_amt') return feeYtd(idx);
      if (columnName === 'interest_expense_amt') return Math.round(niiYtd(idx) * 0.6);
      if (columnName === 'interest_income_amt') return Math.round(niiYtd(idx) * 1.6);
      if (columnName === 'profitability_snapshot_id') return i;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // LIMIT_CONTRIBUTION_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'limit_contribution_snapshot': {
      const contrib = drawn(idx);
      if (columnName === 'limit_rule_id') return fid(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'contribution_amount') return contrib;
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'contribution_amount_usd') return contrib;
      if (columnName === 'contribution_id') return i;
      if (columnName === 'contribution_pct') return limitAmt(idx) > 0 ? Math.round(contrib / limitAmt(idx) * 100 * 100) / 100 : 0;
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
      if (columnName === 'utilized_amount') return utilized(idx);
      if (columnName === 'available_amount') return limitAmt(idx) - utilized(idx);
      if (columnName === 'reporting_ts') return '2025-01-31 18:00:00';
      if (columnName === 'utilization_event_id') return i;
      if (columnName === 'utilized_amount_usd') return utilized(idx);
      break;

    // ═══════════════════════════════════════════════════════════════════
    // AMENDMENT_CHANGE_DETAIL
    // ═══════════════════════════════════════════════════════════════════
    case 'amendment_change_detail':
      if (columnName === 'change_detail_id') return i;
      if (columnName === 'amendment_id') return (idx % N) + 1;
      if (columnName === 'change_type') return changeType(idx);
      if (columnName === 'old_value') return oldVal(idx);
      if (columnName === 'new_value') return newVal(idx);
      if (columnName === 'amendment_event_id') return (idx % N) + 1;
      if (columnName === 'change_currency_code') return changeCurrency(idx);
      if (columnName === 'change_field_name') return changeField(idx);
      if (columnName === 'change_seq') return cycle(idx) + 1;
      break;

    // ═══════════════════════════════════════════════════════════════════
    // AMENDMENT_EVENT
    // ═══════════════════════════════════════════════════════════════════
    case 'amendment_event':
      if (columnName === 'amendment_id') return i;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'credit_agreement_id') return fid(idx);
      if (columnName === 'amendment_type_code') return amendType(idx);
      if (columnName === 'amendment_status_code') return amendStatus(idx);
      if (columnName === 'effective_date') return amendEffDate(idx);
      if (columnName === 'event_ts') return '2025-01-15 14:30:00';
      if (columnName === 'amendment_description') return amendDesc(idx);
      if (columnName === 'amendment_event_id') return i;
      if (columnName === 'amendment_status') return amendStatus(idx);
      if (columnName === 'amendment_subtype') return amendSubtype(idx);
      if (columnName === 'amendment_type') return amendType(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'completed_date') return amendCompletedDate(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'identified_date') return amendIdentifiedDate(idx);
      if (columnName === 'last_updated_ts') return '2025-01-31 12:00:00';
      break;

    // ═══════════════════════════════════════════════════════════════════
    // CREDIT_EVENT
    // ═══════════════════════════════════════════════════════════════════
    case 'credit_event':
      if (columnName === 'credit_event_id') return i;
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'credit_event_type_code') return fid(idx);
      if (columnName === 'event_date') return eventDate(idx);
      if (columnName === 'event_ts') return '2025-01-15 10:00:00';
      if (columnName === 'default_definition_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'event_risk_rating') return ceRating(idx);
      if (columnName === 'event_status') return ceEventStatus(idx);
      if (columnName === 'event_summary') return ceSummary(idx);
      if (columnName === 'loss_amount_usd') return ceLoss(idx);
      if (columnName === 'recovery_amount_usd') return ceRecovery(idx);
      break;

    // ═══════════════════════════════════════════════════════════════════
    // CREDIT_EVENT_FACILITY_LINK
    // ═══════════════════════════════════════════════════════════════════
    case 'credit_event_facility_link': {
      const ead = drawn(idx);
      const estLoss = ceLoss(idx);
      if (columnName === 'link_id') return i;
      if (columnName === 'credit_event_id') return (idx % N) + 1;
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
      const ba = breachAmt(idx);
      if (columnName === 'breach_id') return i;
      if (columnName === 'scenario_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'limit_rule_id') return fid(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'breach_amount') return ba;
      if (columnName === 'breach_amount_usd') return ba;
      if (columnName === 'breach_severity') return breachSeverity(idx);
      if (columnName === 'control_description') return ba > 0 ? 'Limit utilization exceeded under stress scenario' : 'No breach under this scenario';
      if (columnName === 'control_owner') return controlOwner(idx);
      if (columnName === 'failure_description') return ba > 0 ? 'Stressed exposure exceeds approved limit' : 'Within limit under stress';
      if (columnName === 'lob_segment_id') return fid(idx);
      if (columnName === 'stress_test_result_id') return (idx % N) + 1;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STRESS_TEST_RESULT
    // ═══════════════════════════════════════════════════════════════════
    case 'stress_test_result': {
      const loss = stressLoss(idx);
      const totalExp = committed(idx) || 1;
      if (columnName === 'result_id') return i;
      if (columnName === 'scenario_id') return fid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'portfolio_id') return fid(idx);
      if (columnName === 'loss_amount') return loss;
      if (columnName === 'pnl_impact') return -loss;
      if (columnName === 'capital_impact_pct') return Math.round(loss / totalExp * 100 * 100) / 100;
      if (columnName === 'execution_date') return '2025-01-31';
      if (columnName === 'expected_loss_usd') return Math.round(loss * 0.6);
      if (columnName === 'result_description') return `${scenarioType(idx)} scenario: ${loss > 20_000_000 ? 'significant' : 'moderate'} loss impact`;
      if (columnName === 'result_status') return scenarioStatus(idx);
      if (columnName === 'scenario_type') return scenarioType(idx);
      if (columnName === 'stress_test_result_id') return i;
      if (columnName === 'total_breaches') return breachAmt(idx) > 0 ? 1 : 0;
      if (columnName === 'total_exposure_usd') return totalExp;
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // DEAL_PIPELINE_FACT
    // ═══════════════════════════════════════════════════════════════════
    case 'deal_pipeline_fact': {
      const proposed = proposedAmt(idx);
      if (columnName === 'pipeline_id') return i;
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'stage_code') return pipelineStage(idx);
      if (columnName === 'proposed_amount') return proposed;
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'expected_all_in_rate_pct') return allInRate(idx) - 0.25;
      if (columnName === 'expected_close_date') return expectedCloseDate(idx);
      if (columnName === 'expected_committed_amt') return proposed;
      if (columnName === 'expected_coverage_ratio') return [120, 150, 100, 200, 80, 175, 100, 180, 110, 250][fid(idx) - 1];
      if (columnName === 'expected_exposure_amt') return Math.round(proposed * 0.7);
      if (columnName === 'expected_internal_risk_grade') return expectedGrade(idx);
      if (columnName === 'expected_spread_bps') return expectedSpread(idx);
      if (columnName === 'expected_tenor_months') return expectedTenor(idx);
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'lob_segment_id') return fid(idx);
      if (columnName === 'pipeline_deal_id') return i;
      if (columnName === 'pipeline_stage') return pipelineStage(idx);
      if (columnName === 'pipeline_status') return pipelineStatus(idx);
      if (columnName === 'record_level_code') return 'DEAL';
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // COUNTERPARTY_RATING_OBSERVATION
    // ═══════════════════════════════════════════════════════════════════
    case 'counterparty_rating_observation': {
      const isInt = isInternal(idx);
      if (columnName === 'observation_id') return i;
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'rating_grade_id') return fid(idx);
      if (columnName === 'rating_source_id') return fid(idx);
      if (columnName === 'is_internal_flag') return isInt ? 'Y' : 'N';
      if (columnName === 'pd_implied') return String(pd(idx));
      if (columnName === 'prior_rating_value') return priorRating(idx);
      if (columnName === 'rating_agency') return ratingAgency(idx);
      if (columnName === 'rating_date') return eventDate(idx);
      if (columnName === 'rating_type') return ratingType(idx);
      if (columnName === 'rating_value') return isInt ? intRating(idx) : extRating(idx);
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
      if (columnName === 'value') return metricVal(idx);
      if (columnName === 'context_id') return fid(idx);
      if (columnName === 'credit_agreement_id') return fid(idx);
      if (columnName === 'metric_category') return metricCat(idx);
      if (columnName === 'metric_code') return metricCode(idx);
      if (columnName === 'metric_name') return metricName(idx);
      if (columnName === 'metric_value') return metricVal(idx);
      if (columnName === 'metric_value_usd') return metricUsdVal(idx);
      if (columnName === 'period_end_date') return '2024-12-31';
      break;

    // ═══════════════════════════════════════════════════════════════════
    // METRIC_THRESHOLD
    // ═══════════════════════════════════════════════════════════════════
    case 'metric_threshold': {
      const tt = threshType(idx);
      if (columnName === 'threshold_id') return i;
      if (columnName === 'metric_definition_id') return fid(idx);
      if (columnName === 'threshold_type') return tt;
      if (columnName === 'threshold_value') return threshVal(idx);
      if (columnName === 'effective_from_date') return '2024-01-01';
      if (columnName === 'effective_to_date') return undefined;
      if (columnName === 'active_flag') return 'Y';
      if (columnName === 'inner_threshold_pct') return [80, 85, 75, 90, 80, 85, 75, 90, 80, 85][fid(idx) - 1];
      if (columnName === 'last_threshold_updated_date') return '2024-12-15';
      if (columnName === 'limit_type') return tt === 'MIN' ? 'FLOOR' : 'CEILING';
      if (columnName === 'limit_value') return threshVal(idx);
      if (columnName === 'lod1_sponsor') return LOD1_SPONSORS[fid(idx) - 1];
      if (columnName === 'lod2_sponsor') return LOD2_SPONSORS[fid(idx) - 1];
      if (columnName === 'metric_category') return metricCat(idx);
      if (columnName === 'metric_code') return metricCode(idx);
      if (columnName === 'metric_description') return threshDesc(idx);
      if (columnName === 'metric_id_display') return `MTR-${String(i).padStart(3, '0')}`;
      if (columnName === 'metric_name') return threshName(idx);
      if (columnName === 'metric_owner') return METRIC_OWNERS[(fid(idx) - 1 + cycle(idx)) % METRIC_OWNERS.length];
      if (columnName === 'metric_threshold_id') return i;
      if (columnName === 'outer_threshold_pct') return [95, 95, 90, 95, 95, 95, 90, 95, 95, 95][fid(idx) - 1];
      if (columnName === 'report_deadline') return fid(idx) % 3 === 0 ? 'T+10' : fid(idx) % 5 === 0 ? 'T+15' : 'T+5';
      if (columnName === 'report_frequency') return fid(idx) % 3 === 0 ? 'QUARTERLY' : 'MONTHLY';
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXCEPTION_EVENT
    // ═══════════════════════════════════════════════════════════════════
    case 'exception_event': {
      const rd = raisedDate(idx);
      if (columnName === 'exception_id') return i;
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'exception_type') return exceptionType(idx);
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'raised_ts') return rd + ' 09:00:00';
      if (columnName === 'resolved_ts') return resolvedDate(idx);
      if (columnName === 'actual_remediation_date') return exceptionStatus(idx) === 'RESOLVED' ? '2025-01-31' : undefined;
      if (columnName === 'approver') return approver(idx);
      if (columnName === 'breach_amount_usd') return breachAmtEx(idx);
      if (columnName === 'breach_pct') return breachPctEx(idx);
      if (columnName === 'days_open') return daysOpen(idx);
      if (columnName === 'exception_description') return exceptionDesc(idx);
      if (columnName === 'exception_owner') return exceptionOwner(idx);
      if (columnName === 'exception_severity') return exceptionSev(idx);
      if (columnName === 'exception_status') return exceptionStatus(idx);
      if (columnName === 'exception_value') return breachAmtEx(idx);
      if (columnName === 'identified_date') return rd;
      if (columnName === 'limit_rule_id') return fid(idx);
      if (columnName === 'lob_segment_id') return fid(idx);
      if (columnName === 'lod_sponsor') return lodSponsor(idx);
      if (columnName === 'metric_threshold_id') return fid(idx);
      if (columnName === 'remediation_plan') return remediationPlan(idx);
      if (columnName === 'target_remediation_date') return exceptionStatus(idx) === 'RESOLVED' ? '2025-01-31' : `2025-02-${String(((fid(idx) * 3) % 28) + 1).padStart(2, '0')}`;
      if (columnName === 'threshold_value') return threshVal(idx);
      break;
    }

    // ═══════════════════════════════════════════════════════════════════
    // RISK_FLAG
    // ═══════════════════════════════════════════════════════════════════
    case 'risk_flag':
      if (columnName === 'risk_flag_id') return i;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'flag_type') return flagType(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'raised_ts') return raisedTs(idx);
      if (columnName === 'cleared_ts') return clearedTs(idx);
      if (columnName === 'created_ts') return raisedTs(idx);
      if (columnName === 'flag_code') return flagCode(idx);
      if (columnName === 'flag_description') return flagDesc(idx);
      if (columnName === 'flag_scope') return flagScope(idx);
      if (columnName === 'flag_severity') return flagSeverity(idx);
      if (columnName === 'flag_trigger_value') return flagTrigger(idx);
      break;

    // ═══════════════════════════════════════════════════════════════════
    // DATA_QUALITY_SCORE_SNAPSHOT
    // ═══════════════════════════════════════════════════════════════════
    case 'data_quality_score_snapshot':
      if (columnName === 'score_id') return i;
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'target_table') return dqTable(idx);
      if (columnName === 'source_system_id') return fid(idx);
      if (columnName === 'completeness_pct') return dqCompleteness(idx);
      if (columnName === 'validity_pct') return dqValidity(idx);
      if (columnName === 'overall_score') return dqOverall(idx);
      if (columnName === 'dimension_id') return fid(idx);
      if (columnName === 'dimension_name') return dqDim(idx);
      if (columnName === 'dq_score_id') return i;
      if (columnName === 'dq_score_pct') return dqOverall(idx);
      if (columnName === 'impact_pct') return dqImpactPct(idx);
      if (columnName === 'impacted_report_codes') return dqReportCodes(idx);
      if (columnName === 'issue_count') return dqIssueCount(idx);
      if (columnName === 'reconciliation_break_count') return dqReconBreaks(idx);
      if (columnName === 'score_dimension') return dqDim(idx);
      break;
  }

  return null;
}
