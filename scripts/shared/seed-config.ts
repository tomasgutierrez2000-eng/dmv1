/**
 * Shared GSIB seed configuration — domain-knowledge constants
 * used by both the L2 seed generator and the V2 factory.
 *
 * Tier-level lookup tables for spreads, risk weights, ratings,
 * currency base rates, and rating migration paths.
 */

import type { StoryArc, RatingTier } from './mvp-config';

// ─── Tier-level base values (deterministic, for seed generation) ────────

/** Base spread from rating tier (bps) — point estimates for seed data */
export const TIER_BASE_SPREADS: Record<RatingTier, number> = {
  IG_HIGH: 125, IG_MID: 175, IG_LOW: 250,
  HY_HIGH: 325, HY_MID: 425, HY_LOW: 550,
};

/** Base risk weight from rating tier (percentage) — point estimates for seed data */
export const TIER_BASE_RW: Record<RatingTier, number> = {
  IG_HIGH: 50, IG_MID: 75, IG_LOW: 100,
  HY_HIGH: 100, HY_MID: 125, HY_LOW: 150,
};

// ─── Currency reference data ────────────────────────────────────────────

/** Base interest rate by currency (annualized %) */
export const CURRENCY_BASE_RATES: Record<string, number> = {
  USD: 4.75, EUR: 3.50, GBP: 4.25, JPY: 0.50, CHF: 1.50,
};

// ─── Rating label arrays (5-cycle time-series per tier) ─────────────────

/** Internal (S&P-style) rating labels per tier, cycling by arc cycle position */
export const TIER_INT_RATINGS: Record<RatingTier, string[]> = {
  IG_HIGH: ['AA-', 'AA', 'A+', 'AA-', 'AA'],
  IG_MID:  ['A', 'A-', 'A+', 'A', 'A-'],
  IG_LOW:  ['BBB+', 'BBB', 'BBB+', 'BBB-', 'BBB'],
  HY_HIGH: ['BB+', 'BB', 'BB+', 'BBB-', 'BB+'],
  HY_MID:  ['BB', 'BB-', 'B+', 'BB-', 'BB'],
  HY_LOW:  ['B+', 'B', 'B-', 'B', 'B+'],
};

/** External (Moody's) rating labels per tier, cycling by arc cycle position */
export const TIER_EXT_RATINGS: Record<RatingTier, string[]> = {
  IG_HIGH: ['Aa3', 'Aa2', 'A1', 'Aa3', 'Aa2'],
  IG_MID:  ['A2', 'A3', 'A1', 'A2', 'A3'],
  IG_LOW:  ['Baa1', 'Baa2', 'Baa1', 'Baa3', 'Baa2'],
  HY_HIGH: ['Ba1', 'Ba2', 'Ba1', 'Baa3', 'Ba1'],
  HY_MID:  ['Ba2', 'Ba3', 'B1', 'Ba3', 'Ba2'],
  HY_LOW:  ['B1', 'B2', 'B3', 'B2', 'B1'],
};

// ─── Rating migration paths ────────────────────────────────────────────

/** Rating migration offsets for deteriorating / recovering / stressed arcs */
export const RATING_MIGRATION: Record<StoryArc, number[]> = {
  STABLE_IG:        [0, 0, 0, 0, 0],
  GROWING:          [0, 0, 0, 1, 1],     // improve (index moves toward better)
  STEADY_HY:        [0, 0, 0, 0, 0],
  DETERIORATING:    [0, 0, 1, 2, 2],     // worsen (index moves toward worse)
  RECOVERING:       [2, 1, 0, 0, 0],     // started worse, improving
  STRESSED_SECTOR:  [0, 0, 1, 1, 0],     // temporary worsening
  NEW_RELATIONSHIP: [0, 0, 0, 0, 0],
};
