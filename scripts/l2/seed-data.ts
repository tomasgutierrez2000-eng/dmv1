/**
 * L2 seed data: GSIB-realistic, aligned to L1 IDs.
 *
 * Default mode: 50 rows per table (5 cycles × 10 facilities).
 * MVP mode: FACILITY_COUNT × 5 cycles per table.
 *
 * 5 "cycles" per facility tell a story:
 *   Cycle 0: Base positions — mostly PERFORMING
 *   Cycle 1: Secondary views — a couple moving to WATCH
 *   Cycle 2: Stress/events — more WATCH, covenant breaches
 *   Cycle 3: Recovery/amendments — some improving, some worsening
 *   Cycle 4: Current state — portfolio reality
 *
 * EVERY column must be handled here to avoid fallback placeholder values.
 * All as_of_date values are 2025-01-31 per SEED_CONVENTIONS.md.
 */

import { getCounterpartyStoryArc } from '../l1/mvp-counterparties';
import { getFacilityCounterpartyId, getFacilityAgreementId, getFacilityCommittedAmount } from '../l1/mvp-agreements-facilities';
import {
  STORY_PD_MULTIPLIERS, STORY_UTILIZATION, STORY_SPREAD_MULTIPLIERS,
  STORY_CREDIT_STATUS, STORY_DPD, RATING_TIER_MAP,
} from '../shared/mvp-config';
import type { StoryArc, RatingTier } from '../shared/mvp-config';
import { getCounterpartyRatingTier } from '../l1/mvp-counterparties';

let FACILITY_COUNT = 10;
const AS_OF = '2025-01-31';

/** Called by generate.ts to set the facility count for MVP profile. */
export function setL2FacilityCount(count: number): void { FACILITY_COUNT = count; }

/** Total rows per table (facility count × 5 cycles). Used where the old `const N = 50` was. */
function N(): number { return FACILITY_COUNT * 5; }

// ───────────── deterministic helpers ─────────────
/** Facility id: cycles 1..FACILITY_COUNT */
function fid(idx: number): number { return (idx % FACILITY_COUNT) + 1; }
/** Index into 10-element lookup arrays, cycling 0..9 regardless of FACILITY_COUNT */
function fidx10(idx: number): number { return (fid(idx) - 1) % 10; }
function cid(idx: number): number {
  const facId = fid(idx);
  if (FACILITY_COUNT <= 10) return facId;
  return getFacilityCounterpartyId(facId);
}
/** Which cycle (0-4) for the given row index */
function cycle(idx: number): number { return Math.floor(idx / FACILITY_COUNT); }

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
  const shift = (shifts[c] ?? 0) + (facShifts[(fac - 1) % facShifts.length] ?? 0);
  return Math.round(base * (1 + shift * (pct / 0.15)));
}

// ───────────── MVP helpers ─────────────
/** Story arc for a facility via its counterparty */
function arcOf(idx: number): StoryArc {
  return getCounterpartyStoryArc(cid(idx) - 1);
}
/** Rating tier for a facility via its counterparty */
function tierOf(idx: number): RatingTier {
  return getCounterpartyRatingTier(cid(idx) - 1);
}

/** Base spread from rating tier (bps) */
const TIER_BASE_SPREADS: Record<RatingTier, number> = {
  IG_HIGH: 125, IG_MID: 175, IG_LOW: 250,
  HY_HIGH: 325, HY_MID: 425, HY_LOW: 550,
};

/** Base risk weight from rating tier */
const TIER_BASE_RW: Record<RatingTier, number> = {
  IG_HIGH: 50, IG_MID: 75, IG_LOW: 100,
  HY_HIGH: 100, HY_MID: 125, HY_LOW: 150,
};

/** Base rate by currency */
const CURRENCY_BASE_RATES: Record<string, number> = {
  USD: 4.75, EUR: 3.50, GBP: 4.25, JPY: 0.50, CHF: 1.50,
};

/** Internal rating labels per tier, cycling by arc cycle position */
const TIER_INT_RATINGS: Record<RatingTier, string[]> = {
  IG_HIGH: ['AA-', 'AA', 'A+', 'AA-', 'AA'],
  IG_MID:  ['A', 'A-', 'A+', 'A', 'A-'],
  IG_LOW:  ['BBB+', 'BBB', 'BBB+', 'BBB-', 'BBB'],
  HY_HIGH: ['BB+', 'BB', 'BB+', 'BBB-', 'BB+'],
  HY_MID:  ['BB', 'BB-', 'B+', 'BB-', 'BB'],
  HY_LOW:  ['B+', 'B', 'B-', 'B', 'B+'],
};

/** External (Moody's) rating labels per tier, cycling by arc cycle position */
const TIER_EXT_RATINGS: Record<RatingTier, string[]> = {
  IG_HIGH: ['Aa3', 'Aa2', 'A1', 'Aa3', 'Aa2'],
  IG_MID:  ['A2', 'A3', 'A1', 'A2', 'A3'],
  IG_LOW:  ['Baa1', 'Baa2', 'Baa1', 'Baa3', 'Baa2'],
  HY_HIGH: ['Ba1', 'Ba2', 'Ba1', 'Baa3', 'Ba1'],
  HY_MID:  ['Ba2', 'Ba3', 'B1', 'Ba3', 'Ba2'],
  HY_LOW:  ['B1', 'B2', 'B3', 'B2', 'B1'],
};

/** Rating migration offsets for deteriorating / recovering / stressed arcs */
const RATING_MIGRATION: Record<StoryArc, number[]> = {
  STABLE_IG:        [0, 0, 0, 0, 0],
  GROWING:          [0, 0, 0, 1, 1],     // improve (index moves toward better)
  STEADY_HY:        [0, 0, 0, 0, 0],
  DETERIORATING:    [0, 0, 1, 2, 2],     // worsen (index moves toward worse)
  RECOVERING:       [2, 1, 0, 0, 0],     // started worse, improving
  STRESSED_SECTOR:  [0, 0, 1, 1, 0],     // temporary worsening
  NEW_RELATIONSHIP: [0, 0, 0, 0, 0],
};

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
function drawn(idx: number): number {
  const f = fid(idx) - 1;
  if (f < 10) return DRAWN_BY_CYCLE[cycle(idx)][f];
  const commitAmt = getFacilityCommittedAmount(fid(idx));
  const arc = arcOf(idx);
  return Math.round(commitAmt * STORY_UTILIZATION[arc][cycle(idx)]);
}

const COMMITTED = [250_000_000, 500_000_000, 1_000_000_000, 2_500_000_000, 750_000_000, 1_500_000_000, 3_000_000_000, 400_000_000, 600_000_000, 5_000_000_000];
function committed(idx: number): number {
  const f = fid(idx) - 1;
  if (f < 10) return COMMITTED[f];
  return getFacilityCommittedAmount(fid(idx));
}

const BASE_CURRENCIES = ['USD', 'EUR', 'USD', 'GBP', 'USD', 'USD', 'EUR', 'USD', 'GBP', 'USD'];
function currency(idx: number): string {
  const f = fid(idx) - 1;
  if (f < 10) return BASE_CURRENCIES[f];
  return pick(BASE_CURRENCIES, f);
}

const POS_TYPES_BASE = ['LOAN', 'REV', 'COMMIT', 'LOAN', 'REV', 'LOAN', 'COMMIT', 'REV', 'LOAN', 'REV'];
const POS_TYPES_ALT = ['REV', 'LOAN', 'LOAN', 'COMMIT', 'LOAN', 'REV', 'LOAN', 'COMMIT', 'REV', 'LOAN'];
function posType(idx: number): string {
  const f = fid(idx) - 1;
  if (f < 10) return cycle(idx) % 2 === 0 ? POS_TYPES_BASE[f] : POS_TYPES_ALT[f];
  const types = ['LOAN', 'REV', 'COMMIT'];
  return types[(f + cycle(idx)) % types.length];
}

const BASE_SPREADS = [175, 250, 325, 200, 400, 150, 275, 225, 300, 125];
function spread(idx: number): number {
  const c = cycle(idx);
  const f = fid(idx) - 1;
  if (f < 10) {
    // Atlas (5) and Westlake (8) spreads widen under stress
    if (f === 4) return [400, 425, 475, 450, 440][c]; // Atlas widens
    if (f === 7) return [225, 240, 280, 260, 250][c]; // Westlake widens
    return BASE_SPREADS[f] + (c - 2) * 5; // slight variation
  }
  const tier = tierOf(idx);
  const arc = arcOf(idx);
  const base = TIER_BASE_SPREADS[tier];
  // Add small deterministic jitter per facility (±15 bps)
  const jitter = ((f * 7) % 31) - 15;
  return Math.round((base + jitter) * STORY_SPREAD_MULTIPLIERS[arc][c]);
}

const BASE_ALL_IN = [6.25, 7.50, 8.25, 6.75, 9.00, 5.75, 7.25, 6.95, 8.00, 5.50];
function allInRate(idx: number): number {
  const s = spread(idx);
  const br = baseRate(idx);
  return Math.round((br + s / 100) * 100) / 100;
}

const BASE_RATES_ARRAY = [4.50, 5.00, 4.95, 4.75, 5.00, 4.25, 4.50, 4.70, 5.00, 4.25];
function baseRate(idx: number): number {
  const f = fid(idx) - 1;
  if (f < 10) return BASE_RATES_ARRAY[f];
  const ccy = currency(idx);
  return CURRENCY_BASE_RATES[ccy] ?? 4.75;
}

// PD with credit migration story
const PD_BY_CYCLE: number[][] = [
  [0.0042, 0.0185, 0.0025, 0.0095, 0.0320, 0.0015, 0.0275, 0.0060, 0.0190, 0.0008], // c0
  [0.0040, 0.0190, 0.0028, 0.0090, 0.0380, 0.0015, 0.0280, 0.0072, 0.0185, 0.0008], // c1 slight moves
  [0.0045, 0.0200, 0.0030, 0.0088, 0.0520, 0.0018, 0.0300, 0.0095, 0.0210, 0.0010], // c2 stress: Atlas & Westlake jump
  [0.0043, 0.0195, 0.0027, 0.0085, 0.0480, 0.0016, 0.0290, 0.0085, 0.0200, 0.0009], // c3 partial recovery
  [0.0041, 0.0188, 0.0026, 0.0087, 0.0450, 0.0014, 0.0285, 0.0078, 0.0195, 0.0009], // c4 current
];
function pd(idx: number): number {
  const f = fid(idx) - 1;
  if (f < 10) return PD_BY_CYCLE[cycle(idx)][f];
  const tier = tierOf(idx);
  const arc = arcOf(idx);
  const tierData = RATING_TIER_MAP[tier];
  const basePd = (tierData.pdLow + tierData.pdHigh) / 2;
  // Add small deterministic jitter per facility (±10% of range)
  const range = tierData.pdHigh - tierData.pdLow;
  const jitter = (((f * 13) % 21) - 10) / 10 * range * 0.5;
  const rawPd = (basePd + jitter) * STORY_PD_MULTIPLIERS[arc][cycle(idx)];
  return Math.round(rawPd * 10000) / 10000; // 4 decimal places
}

const BASE_LGD = [0.45, 0.40, 0.35, 0.50, 0.45, 0.40, 0.55, 0.38, 0.42, 0.48];
function lgd(idx: number): number {
  const f = fid(idx) - 1;
  const c = cycle(idx);
  if (f < 10) return Math.round((BASE_LGD[f] + (c - 2) * 0.01) * 100) / 100;
  const tier = tierOf(idx);
  const baseLgd = RATING_TIER_MAP[tier].lgd;
  return Math.round((baseLgd + (c - 2) * 0.01) * 100) / 100;
}

const BASE_RW = [100, 75, 50, 150, 100, 75, 125, 50, 100, 100];
function riskWeight(idx: number): number {
  const f = fid(idx) - 1;
  const c = cycle(idx);
  if (f < 10) {
    if (f === 4 && c >= 2) return 150; // Atlas upgrades to 150% RW
    if (f === 7 && c >= 2) return 75; // Westlake stays
    return BASE_RW[f];
  }
  const tier = tierOf(idx);
  const arc = arcOf(idx);
  let rw = TIER_BASE_RW[tier];
  // Elevate RW for deteriorating/stressed names in stress cycles
  if ((arc === 'DETERIORATING' || arc === 'STRESSED_SECTOR') && c >= 2) rw = Math.min(rw + 50, 250);
  return rw;
}

// Credit status story
const STATUS_BY_CYCLE: string[][] = [
  ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING'],
  ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING'],
  ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING', 'PERFORMING'],
  ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'SPECIAL_MENTION', 'PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING', 'PERFORMING'],
  ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'WATCH', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING'],
];
function creditStatus(idx: number): string {
  const f = fid(idx) - 1;
  if (f < 10) return STATUS_BY_CYCLE[cycle(idx)][f];
  return STORY_CREDIT_STATUS[arcOf(idx)][cycle(idx)];
}
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
function dpd(idx: number): number {
  const f = fid(idx) - 1;
  if (f < 10) return DPD_BY_CYCLE[cycle(idx)][f];
  return STORY_DPD[arcOf(idx)][cycle(idx)];
}

// Internal ratings with migration
const INT_RATINGS_BY_CYCLE: string[][] = [
  ['A+', 'BBB+', 'AA-', 'BB', 'B+', 'AA', 'B-', 'BBB', 'BB+', 'AAA'],
  ['A+', 'BBB+', 'AA-', 'BB', 'B', 'AA', 'B-', 'BBB-', 'BB+', 'AAA'],
  ['A', 'BBB', 'AA-', 'BB', 'B-', 'AA', 'CCC+', 'BB+', 'BB', 'AA+'],
  ['A+', 'BBB+', 'AA-', 'BB+', 'B', 'AA', 'B-', 'BBB-', 'BB+', 'AAA'],
  ['A+', 'BBB+', 'AA-', 'BB', 'B+', 'AA', 'B-', 'BBB', 'BB+', 'AAA'],
];
function intRating(idx: number): string {
  const f = fid(idx) - 1;
  if (f < 10) return INT_RATINGS_BY_CYCLE[cycle(idx)][f];
  const tier = tierOf(idx);
  const arc = arcOf(idx);
  const c = cycle(idx);
  const ratings = TIER_INT_RATINGS[tier];
  const migration = RATING_MIGRATION[arc][c];
  // migration > 0 means worse → pick a higher index (worse rating)
  const ratingIdx = Math.min(c + migration, ratings.length - 1);
  return ratings[ratingIdx];
}

const EXT_RATINGS_BY_CYCLE: string[][] = [
  ['A1', 'Baa1', 'Aa3', 'Ba2', 'B1', 'Aa2', 'B3', 'Baa2', 'Ba1', 'Aaa'],
  ['A1', 'Baa1', 'Aa3', 'Ba2', 'B2', 'Aa2', 'B3', 'Baa3', 'Ba1', 'Aaa'],
  ['A2', 'Baa2', 'Aa3', 'Ba2', 'B3', 'Aa2', 'Caa1', 'Ba1', 'Ba2', 'Aa1'],
  ['A1', 'Baa1', 'Aa3', 'Ba1', 'B2', 'Aa2', 'B3', 'Baa3', 'Ba1', 'Aaa'],
  ['A1', 'Baa1', 'Aa3', 'Ba2', 'B1', 'Aa2', 'B3', 'Baa2', 'Ba1', 'Aaa'],
];
function extRating(idx: number): string {
  const f = fid(idx) - 1;
  if (f < 10) return EXT_RATINGS_BY_CYCLE[cycle(idx)][f];
  const tier = tierOf(idx);
  const arc = arcOf(idx);
  const c = cycle(idx);
  const ratings = TIER_EXT_RATINGS[tier];
  const migration = RATING_MIGRATION[arc][c];
  const ratingIdx = Math.min(c + migration, ratings.length - 1);
  return ratings[ratingIdx];
}

const BASE_MATURITY_DATES = ['2027-06-30', '2028-03-15', '2026-12-20', '2029-09-30', '2027-01-15', '2030-06-30', '2026-04-30', '2028-11-15', '2027-08-30', '2031-12-31'];
function maturityDate(idx: number): string {
  const f = fid(idx) - 1;
  if (f < 10) return BASE_MATURITY_DATES[f];
  const year = 2026 + (f % 6);
  const month = ((f * 7) % 12) + 1;
  const day = ((f * 3) % 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const BASE_ORIGINATION_DATES = ['2022-06-15', '2021-11-20', '2023-01-10', '2020-09-01', '2022-03-25', '2019-06-15', '2023-07-01', '2022-01-10', '2021-08-15', '2018-12-01'];
function originationDate(idx: number): string {
  const f = fid(idx) - 1;
  if (f < 10) return BASE_ORIGINATION_DATES[f];
  const year = 2018 + (f % 6);
  const month = ((f * 5) % 12) + 1;
  const day = ((f * 11) % 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const BASE_VALUATIONS = [50_000_000, 120_000_000, 85_000_000, 200_000_000, 30_000_000, 450_000_000, 75_000_000, 95_000_000, 110_000_000, 320_000_000];
function valuation(idx: number): number {
  const f = fid(idx) - 1;
  if (f < 10) return vary(BASE_VALUATIONS[f], idx, 0.10);
  return vary(Math.round(committed(idx) * 0.2), idx, 0.10);
}

const BASE_HAIRCUTS = [0, 2.5, 4, 15, 25, 0, 5, 8, 12, 20];
function haircut(idx: number): number {
  const f = fid(idx) - 1;
  if (f < 10) return BASE_HAIRCUTS[f];
  const haircuts = [0, 2.5, 4, 8, 12, 15, 20, 25];
  return haircuts[f % haircuts.length];
}

const CRM_TYPES_BASE = ['CASH', 'REAL_ESTATE', 'RECEIVABLES', 'EQUIPMENT', 'INVENTORY', 'CASH', 'SECURITIES', 'REAL_ESTATE', 'RECEIVABLES', 'SECURITIES'];
const MITIGANT_GROUPS_BASE = ['FINANCIAL', 'PHYSICAL', 'RECEIVABLE', 'PHYSICAL', 'PHYSICAL', 'FINANCIAL', 'FINANCIAL', 'PHYSICAL', 'RECEIVABLE', 'FINANCIAL'];
const MITIGANT_SUBTYPES_BASE = ['CASH_DEPOSIT', 'CRE', 'AR_POOL', 'MACHINERY', 'RAW_MATERIAL', 'CASH_DEPOSIT', 'GOVT_BOND', 'INDUSTRIAL', 'AR_POOL', 'EQUITY'];

const BASE_LIMITS = [500_000_000, 1_000_000_000, 750_000_000, 2_000_000_000, 400_000_000, 1_500_000_000, 600_000_000, 350_000_000, 900_000_000, 3_000_000_000];
function limitAmt(idx: number): number {
  const f = fid(idx) - 1;
  if (f < 10) return BASE_LIMITS[f];
  return Math.round(committed(idx) * 1.2);
}
function utilized(idx: number): number { return drawn(idx); }

const AMEND_TYPES_ALL = ['INCREASE', 'EXTENSION', 'PRICING', 'COVENANT', 'PARTY', 'FACILITY', 'SECURITY', 'RESTATEMENT', 'WAIVER', 'DECREASE'];
function amendType(idx: number): string {
  const c = cycle(idx);
  const f = fid(idx) - 1;
  return AMEND_TYPES_ALL[(f + c * 3) % AMEND_TYPES_ALL.length];
}

const AMEND_STATUSES_ALL = ['EFFECTIVE', 'COMPLETED', 'APPROVED', 'EFFECTIVE', 'PENDING', 'COMPLETED', 'EFFECTIVE', 'APPROVED', 'COMPLETED', 'EFFECTIVE'];
function amendStatus(idx: number): string { return AMEND_STATUSES_ALL[(fid(idx) - 1 + cycle(idx)) % AMEND_STATUSES_ALL.length]; }

const AMEND_MONTHS = [11, 12, 1, 10, 2, 9, 1, 8, 12, 1];
const AMEND_DAYS = [1, 15, 1, 20, 1, 1, 15, 1, 1, 10];
function amendEffDate(idx: number): string {
  const c = cycle(idx);
  const f = fid(idx) - 1;
  const month = pick(AMEND_MONTHS, f);
  const year = c <= 1 ? 2024 : 2025;
  const day = pick(AMEND_DAYS, f);
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
function proposedAmt(idx: number): number {
  const f = fid(idx) - 1;
  if (f < 10) return vary(BASE_PROPOSED[f], idx, 0.20);
  return vary(Math.round(committed(idx) * 0.3), idx, 0.20);
}

const METRIC_CODES_ALL = ['PD', 'LGD', 'EL', 'RWA', 'CAPITAL_REQ', 'DSCR', 'LTV', 'UTIL', 'ROE', 'NCO_RATE'];
const METRIC_NAMES_ALL = ['Probability of Default', 'Loss Given Default', 'Expected Loss', 'Risk-Weighted Assets', 'Capital Requirement', 'Debt Service Coverage', 'Loan-to-Value', 'Utilization Rate', 'Return on Equity', 'Net Charge-Off Rate'];
const METRIC_CATS_ALL = ['CREDIT_QUALITY', 'CREDIT_QUALITY', 'LOSS', 'CAPITAL', 'CAPITAL', 'CREDIT_QUALITY', 'CREDIT_QUALITY', 'EXPOSURE', 'PROFITABILITY', 'LOSS'];
function metricCode(idx: number): string { return METRIC_CODES_ALL[(fid(idx) - 1 + cycle(idx) * 2) % METRIC_CODES_ALL.length]; }
function metricName(idx: number): string { return METRIC_NAMES_ALL[(fid(idx) - 1 + cycle(idx) * 2) % METRIC_NAMES_ALL.length]; }
function metricCat(idx: number): string { return METRIC_CATS_ALL[(fid(idx) - 1 + cycle(idx) * 2) % METRIC_CATS_ALL.length]; }

const BASE_METRIC_VALS = [0.42, 1.85, 2.10, 0.95, 3.20, 1.50, 2.75, 0.60, 1.90, 4.00];
function metricVal(idx: number): number {
  const base = pick(BASE_METRIC_VALS, fid(idx) - 1);
  return Math.round((base + cycle(idx) * 0.15) * 100) / 100;
}
function metricUsdVal(idx: number): number { return Math.round(metricVal(idx) * 1_000_000); }

// Netting set data
const BASE_GROSS_EXP = [45_000_000, 80_000_000, 22_000_000, 60_000_000, 120_000_000, 35_000_000, 90_000_000, 18_000_000, 70_000_000, 150_000_000];
function grossExp(idx: number): number {
  const f = fid(idx) - 1;
  if (f < 10) return vary(BASE_GROSS_EXP[f], idx);
  return vary(Math.round(drawn(idx) * 0.15), idx);
}
const NETTING_RATIOS = [0.22, 0.31, 0, 0.25, 0.33, 0.14, 0.33, 0, 0.29, 0.33];
function nettedExp(idx: number): number {
  const f = fid(idx) - 1;
  if (f < 10) return Math.round(grossExp(idx) * NETTING_RATIOS[f]);
  const ratio = 0.15 + ((f * 11) % 21) / 100; // 0.15 - 0.35
  return Math.round(grossExp(idx) * ratio);
}
function nettingBenefit(idx: number): number { return grossExp(idx) - nettedExp(idx); }
const BASE_COLL_HELD = [5_000_000, 12_000_000, 8_000_000, 20_000_000, 15_000_000, 3_000_000, 25_000_000, 6_000_000, 10_000_000, 30_000_000];
function collHeld(idx: number): number {
  const f = fid(idx) - 1;
  if (f < 10) return vary(BASE_COLL_HELD[f], idx);
  return vary(Math.round(valuation(idx) * 0.15), idx);
}
function grossMtm(idx: number): number { return Math.round(grossExp(idx) * 0.92); }
function pfeUsd(idx: number): number { return Math.round(grossExp(idx) * 0.18); }

// Stress test data
const BASE_STRESS_LOSS = [10_000_000, 25_000_000, 5_000_000, 50_000_000, 15_000_000, 30_000_000, 8_000_000, 40_000_000, 12_000_000, 60_000_000];
function stressLoss(idx: number): number {
  const f = fid(idx) - 1;
  if (f < 10) return vary(BASE_STRESS_LOSS[f], idx, 0.25);
  // stress loss = drawn × lgd × stress factor (higher for deteriorating/stressed arcs)
  const arc = arcOf(idx);
  const stressFactors: Record<StoryArc, number> = {
    STABLE_IG: 0.02, GROWING: 0.02, STEADY_HY: 0.04,
    DETERIORATING: 0.08, RECOVERING: 0.05, STRESSED_SECTOR: 0.10,
    NEW_RELATIONSHIP: 0.03,
  };
  return vary(Math.round(drawn(idx) * lgd(idx) * (stressFactors[arc] ?? 0.04)), idx, 0.25);
}
function breachAmt(idx: number): number {
  const c = cycle(idx);
  const f = fid(idx) - 1;
  // More breaches in stress cycles — safe for any f value (uses modular arithmetic)
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
  if (f < 10) {
    // Losses concentrated on troubled names in stress cycles
    if ((f === 4 || f === 7) && c >= 2) return Math.round(drawn(idx) * 0.02);
    if (f === 0 && c === 2) return 2_400_000;
    if (f === 2 && c === 2) return 8_000_000;
    if (f === 8 && c === 2) return 6_000_000;
    if (f === 9 && c === 2) return 21_000_000;
    return 0;
  }
  // MVP: losses for deteriorating/stressed arcs in stress cycles
  const arc = arcOf(idx);
  if (c >= 2 && (arc === 'DETERIORATING' || arc === 'STRESSED_SECTOR')) {
    return Math.round(drawn(idx) * 0.02);
  }
  if (c === 2 && f % 10 === 0) return Math.round(drawn(idx) * 0.005); // occasional losses
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
const EXPECTED_TENORS = ['60', '84', '48', '36', '60', '84', '72', '36', '60', '120'];
function expectedTenor(idx: number): string { return pick(EXPECTED_TENORS, fid(idx) - 1); }
function expectedGrade(idx: number): string {
  const f = fid(idx) - 1;
  const grades = ['BBB+', 'A-', 'BBB', 'A+', 'BB+', 'A', 'BBB-', 'A+', 'BBB', 'AA-'];
  if (f < 10) return grades[f];
  // MVP: use rating tier's S&P rating
  return RATING_TIER_MAP[tierOf(idx)].spRatings[0];
}
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
  const f = fid(idx) - 1;
  return cycle(idx) % 2 === 0 ? pick(RISK_FLAG_TYPES, f) : pick(RISK_FLAG_TYPES_ALT, f);
}
const FLAG_CODES_BASE = ['CONC', 'WL', 'COV', 'MAT', 'CONC', 'WL', 'SEC', 'CTY', 'CONC', 'WL'];
function flagCode(idx: number): string { return `${pick(FLAG_CODES_BASE, fid(idx) - 1)}_${String(idx + 1).padStart(2, '0')}`; }

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
function flagScope(idx: number): string { return pick(FLAG_SCOPES_BASE, fid(idx) - 1); }

function flagSeverity(idx: number): string {
  const f = fid(idx) - 1;
  const c = cycle(idx);
  if (f < 10) {
    if ((f === 4 || f === 7) && c >= 2) return 'HIGH'; // troubled names
    return ['HIGH', 'MEDIUM', 'HIGH', 'MEDIUM', 'HIGH', 'LOW', 'MEDIUM', 'LOW', 'HIGH', 'HIGH'][f];
  }
  const arc = arcOf(idx);
  if ((arc === 'DETERIORATING' || arc === 'STRESSED_SECTOR') && c >= 2) return 'HIGH';
  const sevs = ['HIGH', 'MEDIUM', 'LOW', 'MEDIUM', 'HIGH'];
  return sevs[f % sevs.length];
}

function flagTrigger(idx: number): number {
  const f = fid(idx) - 1;
  const triggers = [5.2, 0, 6.2, 11, 16.3, 0, 12.1, 0, 8.4, 0];
  return pick(triggers, f) + cycle(idx) * 0.5;
}

// DQ score data
const DQ_DIMS_BASE = ['COMPLETENESS', 'VALIDITY', 'TIMELINESS', 'COMPLETENESS', 'VALIDITY', 'TIMELINESS', 'COMPLETENESS', 'VALIDITY', 'COMPLETENESS', 'VALIDITY'];
function dqDim(idx: number): string { return pick(DQ_DIMS_BASE, fid(idx) - 1); }
const DQ_TABLES = ['facility_master', 'counterparty', 'collateral_asset', 'position', 'credit_event', 'amendment_event', 'netting_set', 'limit_rule', 'instrument_master', 'exposure_snapshot'];
function dqTable(idx: number): string { return DQ_TABLES[(fid(idx) - 1 + cycle(idx)) % DQ_TABLES.length]; }

const DQ_COMPLETENESS_BASE = [98.5, 99.2, 97.8, 99.0, 98.0, 99.5, 97.0, 98.8, 99.1, 96.5];
function dqCompleteness(idx: number): number {
  const base = pick(DQ_COMPLETENESS_BASE, fid(idx) - 1);
  return Math.round((base + cycle(idx) * 0.2) * 10) / 10;
}
const DQ_VALIDITY_BASE = [99.0, 98.5, 99.2, 97.8, 99.0, 98.0, 99.5, 97.0, 98.8, 99.1];
function dqValidity(idx: number): number {
  const base = pick(DQ_VALIDITY_BASE, fid(idx) - 1);
  return Math.round((base + cycle(idx) * 0.1) * 10) / 10;
}
function dqOverall(idx: number): number {
  return Math.round((dqCompleteness(idx) * 0.5 + dqValidity(idx) * 0.5) * 10) / 10;
}
const DQ_IMPACT_BASE = [2.1, 1.5, 3.2, 1.0, 2.5, 0.8, 4.0, 3.5, 1.2, 5.0];
function dqImpactPct(idx: number): number { return pick(DQ_IMPACT_BASE, fid(idx) - 1); }
const DQ_REPORT_CODES_BASE = ['FR_Y14Q', 'FR_Y14Q,CCAR', 'FR_Y14Q', 'DFAST', 'FR_Y14Q', 'CCAR', 'FR_Y14Q,DFAST', 'CCAR', 'FR_Y14Q', 'CCAR,DFAST'];
function dqReportCodes(idx: number): string { return pick(DQ_REPORT_CODES_BASE, fid(idx) - 1); }
const DQ_ISSUE_BASE = [3, 7, 12, 2, 5, 1, 15, 8, 4, 18];
function dqIssueCount(idx: number): number { return Math.max(0, pick(DQ_ISSUE_BASE, fid(idx) - 1) - cycle(idx)); }
const DQ_RECON_BASE = [0, 2, 4, 0, 1, 0, 5, 3, 1, 8];
function dqReconBreaks(idx: number): number { return Math.max(0, pick(DQ_RECON_BASE, fid(idx) - 1) - cycle(idx)); }

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

// ── DSCR target distribution — realistic GSIB-level variation ──
// CRE (BL=3, BRIDGE=7): median ~1.30x, range 0.70-2.80x
// C&I (all others):      median ~2.50x, range 0.85-7.00x
const CRE_DSCR_BUCKETS = [
  // [dscr, weight] — distressed to strong
  0.72, 0.78, 0.85, 0.91, 0.96,          // distressed (5)
  1.02, 1.05, 1.08, 1.10, 1.12, 1.15, 1.18, 1.20, 1.22, 1.24,  // watch (10)
  1.26, 1.28, 1.30, 1.32, 1.35, 1.38, 1.40, 1.42, 1.45, 1.48,  // healthy (10)
  1.50, 1.55, 1.60, 1.65, 1.70, 1.75, 1.80, 1.85, 1.90, 1.95,  // solid (10)
  2.00, 2.10, 2.20, 2.40, 2.80,          // strong (5)
];
const CI_DSCR_BUCKETS = [
  0.85, 0.92, 0.97,                       // distressed (3)
  1.10, 1.15, 1.20, 1.30, 1.40, 1.50,    // watch (6)
  1.60, 1.70, 1.80, 1.90, 2.00, 2.10, 2.20, 2.30, 2.40, 2.50,  // healthy (10)
  2.60, 2.80, 3.00, 3.20, 3.50, 3.80, 4.00, 4.20, 4.50, 4.80,  // solid (10)
  5.00, 5.50, 6.00, 6.50, 7.00,          // strong (5)
];
const CRE_PRODUCT_NODES = new Set([3, 7]); // BL, BRIDGE

function dscrTarget(idx: number): number {
  const f = fid(idx);
  const c = cycle(idx);
  // Use facility-specific PRNG for deterministic but varied assignment
  const rng = mulberry32(f * 1000 + 42);
  const r = rng(); // 0..1
  const productNode = ((f - 1) % 10) + 1;
  const isCre = CRE_PRODUCT_NODES.has(productNode);
  const buckets = isCre ? CRE_DSCR_BUCKETS : CI_DSCR_BUCKETS;
  const bucketIdx = Math.floor(r * buckets.length);
  const baseDscr = buckets[Math.min(bucketIdx, buckets.length - 1)];
  // Cycle drift: stress in cycle 2, recovery in cycle 3
  const cycleDrift = [0, -0.03, -0.12, 0.05, 0.02][c] ?? 0;
  return Math.max(0.50, baseDscr + cycleDrift);
}

// Financial snapshot amounts — debt service is base, NOI/EBITDA derived from target DSCR
function debtService(idx: number): number {
  if (drawn(idx) === 0) return 0;
  return vary(Math.round(drawn(idx) * 0.048), idx, 0.10);
}
function noi(idx: number): number {
  if (drawn(idx) === 0) return 0;
  const tds = debtService(idx);
  return Math.round(tds * dscrTarget(idx));
}
function ebitda(idx: number): number {
  if (drawn(idx) === 0) return 0;
  const tds = debtService(idx);
  return Math.round(tds * dscrTarget(idx));
}
function revenue(idx: number): number {
  if (drawn(idx) === 0) return 0;
  // Revenue = NOI / ~0.6 margin for CRE, EBITDA / ~0.4 margin for C&I
  const f = fid(idx);
  const productNode = ((f - 1) % 10) + 1;
  const isCre = CRE_PRODUCT_NODES.has(productNode);
  const income = isCre ? noi(idx) : ebitda(idx);
  const margin = isCre ? 0.55 + (f % 7) * 0.02 : 0.35 + (f % 5) * 0.03;
  return Math.round(income / margin);
}
function opex(idx: number): number {
  if (drawn(idx) === 0) return 0;
  return Math.max(0, revenue(idx) - noi(idx));
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
  const f = fid(idx) - 1;
  // Prior is one notch above current
  const priors = ['A', 'Baa2', 'AA-', 'Ba1', 'BB+', 'Aa3', 'B', 'Baa1', 'BB+', 'Aaa'];
  if (f < 10) return priors[f];
  // For MVP, prior rating is the cycle 0 rating for this tier
  const tier = tierOf(idx);
  return TIER_INT_RATINGS[tier][0];
}

// Metric threshold helpers
const THRESH_TYPES = ['MIN', 'MAX'];
function threshType(idx: number): string { return THRESH_TYPES[(fid(idx) - 1 + cycle(idx)) % 2]; }
const THRESH_VALS_BASE = [0.5, 2.0, 1.0, 3.0, 0.25, 1.5, 0.75, 2.5, 0.1, 4.0];
function threshVal(idx: number): number {
  const base = pick(THRESH_VALS_BASE, fid(idx) - 1);
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
  const idx = rowIndex % N();
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
      if (columnName === 'exposure_type_code') return pick(EXPOSURE_TYPES_BASE, fid(idx) - 1);
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
      if (columnName === 'product_node_id') return fid(idx);
      break;

    // ═══════════════════════════════════════════════════════════════════
    // POSITION_DETAIL
    // ═══════════════════════════════════════════════════════════════════
    case 'position_detail': {
      const detailTypes = ['PRINCIPAL', 'INTEREST', 'FEE'];
      const dt = detailTypes[(fid(idx) - 1 + cycle(idx)) % detailTypes.length];
      if (columnName === 'position_detail_id') return i;
      if (columnName === 'position_id') return (idx % N()) + 1;
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
      if (columnName === 'fr2590_category_code') return pick(FR2590_CATS_BASE, fid(idx) - 1);
      if (columnName === 'gross_exposure_usd') return c;
      if (columnName === 'legal_entity_id') return 1;
      if (columnName === 'lob_segment_id') return fid(idx);
      if (columnName === 'net_exposure_usd') return Math.max(0, d - val);
      if (columnName === 'product_node_id') return fid(idx);
      if (columnName === 'outstanding_balance_amt') return d;
      if (columnName === 'undrawn_commitment_amt') return undrawn;
      if (columnName === 'total_collateral_mv_usd') return val;
      if (columnName === 'internal_risk_rating_bucket_code') return String((idx % 10) + 1);
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
      if (columnName === 'crm_type_code') return pick(CRM_TYPES_BASE, fid(idx) - 1);
      if (columnName === 'current_valuation_usd') return val;
      if (columnName === 'facility_id') return fid(idx);
      if (columnName === 'mitigant_group_code') return pick(MITIGANT_GROUPS_BASE, fid(idx) - 1);
      if (columnName === 'mitigant_subtype') return pick(MITIGANT_SUBTYPES_BASE, fid(idx) - 1);
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
      if (columnName === 'position_id') return (idx % N()) + 1;
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
      if (columnName === 'floor_pct') return pick([0, 0, 0.25, 0, 0.50, 0, 0.25, 0, 0, 0], fid(idx) - 1);
      if (columnName === 'base_rate_pct') return baseRate(idx);
      if (columnName === 'currency_code') return currency(idx);
      if (columnName === 'facility_pricing_id') return i;
      if (columnName === 'min_spread_threshold_bps') return pick([100, 125, 150, 100, 200, 75, 125, 100, 150, 75], fid(idx) - 1);
      if (columnName === 'payment_frequency') return fid(idx) % 2 === 0 ? 'MONTHLY' : 'QUARTERLY';
      if (columnName === 'prepayment_penalty_flag') return fid(idx) % 3 === 0 ? 'Y' : 'N';
      if (columnName === 'rate_cap_pct') return pick([12.00, 10.00, 12.00, 10.00, 14.00, 9.00, 12.00, 10.00, 12.00, 8.00], fid(idx) - 1);
      if (columnName === 'rate_index_code') return pick(['SOFR', 'EURIBOR', 'SOFR', 'SONIA', 'SOFR', 'SOFR', 'EURIBOR', 'SOFR', 'SONIA', 'SOFR'], fid(idx) - 1);
      if (columnName === 'pricing_tier') return String((idx % 10) + 1);
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
      if (columnName === 'amendment_id') return (idx % N()) + 1;
      if (columnName === 'change_type') return changeType(idx);
      if (columnName === 'old_value') return oldVal(idx);
      if (columnName === 'new_value') return newVal(idx);
      if (columnName === 'amendment_event_id') return (idx % N()) + 1;
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
      if (columnName === 'credit_event_id') return (idx % N()) + 1;
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
      if (columnName === 'stress_test_result_id') return (idx % N()) + 1;
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
      if (columnName === 'expected_coverage_ratio') return pick([120, 150, 100, 200, 80, 175, 100, 180, 110, 250], fid(idx) - 1);
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

    // metric_threshold: DEMOTED TO L1 — seed data should be generated by L1 scripts
    // data_quality_score_snapshot: PROMOTED TO L3 — seed data should be generated by L3 scripts

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

    // data_quality_score_snapshot: PROMOTED TO L3 — seed data should be generated by L3 scripts

    // ═══════════════════════════════════════════════════════════════════
    // COUNTERPARTY_FINANCIAL_SNAPSHOT
    // Borrower-level financial statement data — 5 cycles per counterparty
    // Cycle 0: Base, 1: Watch (stress), 2: Stress, 3: Recovery, 4: Current
    // ═══════════════════════════════════════════════════════════════════
    case 'counterparty_financial_snapshot': {
      const baseRevenue = [5000, 8200, 3100, 12500, 6700, 9800, 4500, 15000, 7200, 11000];
      const revenueMultiplier = [1.0, 0.92, 0.85, 0.95, 1.02][cycle(idx)];
      const rev = Math.round(baseRevenue[fidx10(idx)] * revenueMultiplier * 1000000);
      const opex = Math.round(rev * [0.72, 0.68, 0.75, 0.65, 0.70, 0.73, 0.71, 0.66, 0.69, 0.74][fidx10(idx)]);
      const intExp = Math.round(rev * 0.08);
      const taxExp = Math.round((rev - opex - intExp) * 0.21);
      const depr = Math.round(rev * 0.04);
      const amort = Math.round(rev * 0.02);
      const netIncome = rev - opex - intExp - taxExp;
      const totalAssets = Math.round(rev * [3.2, 2.8, 4.1, 2.5, 3.0, 3.5, 2.9, 2.3, 3.3, 2.7][fidx10(idx)]);
      const totalLiabilities = Math.round(totalAssets * [0.65, 0.58, 0.72, 0.55, 0.62, 0.68, 0.60, 0.52, 0.66, 0.59][fidx10(idx)]);
      const equity = totalAssets - totalLiabilities;
      const ebitda = netIncome + intExp + taxExp + depr + amort;
      const noi = rev - opex;

      if (columnName === 'financial_snapshot_id') return i;
      if (columnName === 'counterparty_id') return cid(idx);
      if (columnName === 'as_of_date') return AS_OF;
      if (columnName === 'reporting_period') return ['Q4-2024', 'Q1-2025', 'Q2-2025', 'Q3-2025', 'Q4-2025'][cycle(idx)];
      if (columnName === 'currency_code') return 'USD';
      if (columnName === 'revenue_amt') return rev;
      if (columnName === 'operating_expense_amt') return opex;
      if (columnName === 'net_income_amt') return netIncome;
      if (columnName === 'interest_expense_amt') return intExp;
      if (columnName === 'tax_expense_amt') return taxExp;
      if (columnName === 'depreciation_amt') return depr;
      if (columnName === 'amortization_amt') return amort;
      if (columnName === 'total_assets_amt') return totalAssets;
      if (columnName === 'total_liabilities_amt') return totalLiabilities;
      if (columnName === 'shareholders_equity_amt') return equity;
      if (columnName === 'ebitda_amt') return ebitda;
      if (columnName === 'noi_amt') return noi;
      // Total debt service = interest expense + estimated principal repayment (10% of total liabilities annualised)
      if (columnName === 'total_debt_service_amt') return intExp + Math.round(totalLiabilities * 0.10);
      break;
    }
  }

  return null;
}
