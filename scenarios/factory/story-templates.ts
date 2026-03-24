/**
 * Story Templates — predefined narrative arcs for facility lifecycle stories.
 *
 * Each template defines:
 *   - Health state transitions and timing
 *   - Causal graph parameter ranges per phase
 *   - Cross-table projection rules
 *
 * The Story Weaver selects a template for each counterparty and walks through
 * its phases, deriving all table values from the causal chain.
 */

import type { HealthState } from './gsib-calibration';
import {
  PD_BY_RATING_TIER,
  UTILIZATION_BY_HEALTH,
  SPREAD_BY_RATING_TIER,
  DPD_BY_HEALTH,
  TEMPORAL_LIMITS,
  type RatingTierName,
} from './gsib-calibration';

/* ────────────────── Story Template Types ────────────────── */

export type StoryType =
  | 'STABLE'
  | 'CREDIT_DETERIORATION'
  | 'RECOVERY'
  | 'EVENT_DRIVEN'
  | 'SEASONAL'
  | 'DEFAULT_WORKOUT';

export interface StoryPhase {
  /** Starting health state for this phase */
  fromState: HealthState;
  /** Ending health state for this phase */
  toState: HealthState;
  /** Duration of this phase in months */
  durationMonths: { min: number; max: number };
  /** PD change factor (relative to previous month, e.g., 1.5 = +50%) */
  pdChangeFactor: { min: number; max: number };
  /** Utilization change (absolute %, e.g., +10 means utilization goes up 10%) */
  utilizationChange: { min: number; max: number };
  /** Spread change in bps */
  spreadChangeBps: { min: number; max: number };
  /** DPD bucket progression (how many buckets to advance) */
  dpdBucketAdvance: number;
  /** Risk flags to add in this phase */
  flagsToAdd: string[];
  /** Events to generate in this phase */
  eventsToGenerate: string[];
  /** Whether pricing reprices in this phase (with 30-60 day lag) */
  pricingReprices: boolean;
}

export interface StoryTemplate {
  type: StoryType;
  description: string;
  /** Percentage of portfolio that should follow this arc */
  portfolioSharePct: { min: number; max: number };
  /** Phases in order */
  phases: StoryPhase[];
  /** Whether this story can repeat (seasonal = yes, deterioration = no) */
  isRepeating: boolean;
}

/* ────────────────── Causal Graph ────────────────── */

/**
 * The causal ordering of field derivation.
 * Each field is derived from upstream fields only.
 * This is the core coherence mechanism.
 */
export const CAUSAL_CHAIN = [
  'root_cause',           // External trigger or event
  'pd_annual',            // Primary risk indicator — set first
  'internal_rating',      // Derived from PD band boundaries
  'credit_status',        // Derived from rating + DPD
  'spread_bps',           // Derived from rating tier (with 30-60 day lag)
  'utilization',          // Derived from health state behavior model
  'days_past_due',        // Derived from health state progression
  'dpd_bucket',           // Derived from days_past_due
  'risk_flags',           // Derived from threshold crossings
  'credit_events',        // Derived from state transitions
  'lifecycle_stage',      // Derived from credit_status + DPD
] as const;

export type CausalField = typeof CAUSAL_CHAIN[number];

/* ────────────────── Story Templates ────────────────── */

export const STORY_TEMPLATES: Record<StoryType, StoryTemplate> = {
  STABLE: {
    type: 'STABLE',
    description: 'Business as usual — minor fluctuations, no material deterioration',
    portfolioSharePct: { min: 65, max: 75 },
    isRepeating: true,
    phases: [{
      fromState: 'PERFORMING',
      toState: 'PERFORMING',
      durationMonths: { min: 12, max: 36 },
      pdChangeFactor: { min: 0.95, max: 1.05 },  // ±5% noise
      utilizationChange: { min: -3, max: 3 },
      spreadChangeBps: { min: -5, max: 5 },
      dpdBucketAdvance: 0,
      flagsToAdd: [],
      eventsToGenerate: [],
      pricingReprices: false,
    }],
  },

  CREDIT_DETERIORATION: {
    type: 'CREDIT_DETERIORATION',
    description: '4-8 month arc from performing to stressed/distressed',
    portfolioSharePct: { min: 10, max: 15 },
    isRepeating: false,
    phases: [
      {
        fromState: 'PERFORMING',
        toState: 'WATCH',
        durationMonths: { min: 1, max: 2 },
        pdChangeFactor: { min: 1.5, max: 2.5 },
        utilizationChange: { min: 5, max: 15 },
        spreadChangeBps: { min: 0, max: 10 },  // lag — not repriced yet
        dpdBucketAdvance: 0,
        flagsToAdd: ['WATCH_LIST'],
        eventsToGenerate: ['RATING_CHANGE'],
        pricingReprices: false,
      },
      {
        fromState: 'WATCH',
        toState: 'DETERIORATING',
        durationMonths: { min: 1, max: 2 },
        pdChangeFactor: { min: 1.8, max: 2.5 },
        utilizationChange: { min: 15, max: 25 },
        spreadChangeBps: { min: 50, max: 100 },
        dpdBucketAdvance: 0,
        flagsToAdd: ['DETERIORATING'],
        eventsToGenerate: ['PRICING_CHANGE'],
        pricingReprices: true,
      },
      {
        fromState: 'DETERIORATING',
        toState: 'STRESSED',
        durationMonths: { min: 1, max: 3 },
        pdChangeFactor: { min: 1.5, max: 2.0 },
        utilizationChange: { min: 10, max: 20 },
        spreadChangeBps: { min: 80, max: 150 },
        dpdBucketAdvance: 1,
        flagsToAdd: ['SUBSTANDARD_CANDIDATE', 'HIGH_UTILIZATION'],
        eventsToGenerate: ['DELINQUENCY', 'COVENANT_BREACH'],
        pricingReprices: true,
      },
      {
        fromState: 'STRESSED',
        toState: 'DISTRESSED',
        durationMonths: { min: 1, max: 2 },
        pdChangeFactor: { min: 1.3, max: 1.8 },
        utilizationChange: { min: 5, max: 15 },
        spreadChangeBps: { min: 0, max: 50 },  // may freeze during restructuring
        dpdBucketAdvance: 1,
        flagsToAdd: ['SUBSTANDARD', 'RESTRUCTURING_CANDIDATE'],
        eventsToGenerate: ['COVENANT_BREACH'],
        pricingReprices: false,  // frozen during restructuring
      },
    ],
  },

  RECOVERY: {
    type: 'RECOVERY',
    description: '3-6 month arc post-event, health improving',
    portfolioSharePct: { min: 5, max: 10 },
    isRepeating: false,
    phases: [
      {
        fromState: 'DISTRESSED',
        toState: 'STRESSED',
        durationMonths: { min: 1, max: 2 },
        pdChangeFactor: { min: 0.7, max: 0.85 },
        utilizationChange: { min: -10, max: -5 },
        spreadChangeBps: { min: -30, max: 0 },
        dpdBucketAdvance: 0,  // DPD may not improve yet
        flagsToAdd: [],
        eventsToGenerate: ['RESTRUCTURING_COMPLETE'],
        pricingReprices: false,
      },
      {
        fromState: 'STRESSED',
        toState: 'DETERIORATING',
        durationMonths: { min: 1, max: 2 },
        pdChangeFactor: { min: 0.65, max: 0.80 },
        utilizationChange: { min: -15, max: -5 },
        spreadChangeBps: { min: -50, max: -20 },
        dpdBucketAdvance: -1,
        flagsToAdd: [],
        eventsToGenerate: [],
        pricingReprices: true,
      },
      {
        fromState: 'DETERIORATING',
        toState: 'WATCH',
        durationMonths: { min: 2, max: 3 },
        pdChangeFactor: { min: 0.60, max: 0.75 },
        utilizationChange: { min: -15, max: -5 },
        spreadChangeBps: { min: -60, max: -30 },
        dpdBucketAdvance: -1,
        flagsToAdd: [],
        eventsToGenerate: ['RATING_CHANGE'],
        pricingReprices: true,
      },
    ],
  },

  EVENT_DRIVEN: {
    type: 'EVENT_DRIVEN',
    description: 'Sudden spike (default, fraud, regulatory) then new equilibrium',
    portfolioSharePct: { min: 2, max: 5 },
    isRepeating: false,
    phases: [
      {
        fromState: 'PERFORMING',
        toState: 'STRESSED',
        durationMonths: { min: 1, max: 1 },
        pdChangeFactor: { min: 5.0, max: 10.0 },
        utilizationChange: { min: 20, max: 40 },
        spreadChangeBps: { min: 100, max: 300 },
        dpdBucketAdvance: 2,
        flagsToAdd: ['WATCH_LIST', 'DETERIORATING', 'HIGH_UTILIZATION'],
        eventsToGenerate: ['RATING_CHANGE', 'DELINQUENCY'],
        pricingReprices: true,
      },
      {
        fromState: 'STRESSED',
        toState: 'DETERIORATING',
        durationMonths: { min: 2, max: 4 },
        pdChangeFactor: { min: 0.80, max: 0.95 },
        utilizationChange: { min: -10, max: -3 },
        spreadChangeBps: { min: -20, max: 0 },
        dpdBucketAdvance: 0,
        flagsToAdd: [],
        eventsToGenerate: [],
        pricingReprices: false,
      },
    ],
  },

  SEASONAL: {
    type: 'SEASONAL',
    description: 'Cyclical utilization and pricing (retail, agriculture, energy)',
    portfolioSharePct: { min: 5, max: 10 },
    isRepeating: true,
    phases: [
      {
        fromState: 'PERFORMING',
        toState: 'PERFORMING',
        durationMonths: { min: 3, max: 3 },  // Q1: low season
        pdChangeFactor: { min: 0.98, max: 1.02 },
        utilizationChange: { min: -15, max: -5 },
        spreadChangeBps: { min: 0, max: 0 },
        dpdBucketAdvance: 0,
        flagsToAdd: [],
        eventsToGenerate: [],
        pricingReprices: false,
      },
      {
        fromState: 'PERFORMING',
        toState: 'PERFORMING',
        durationMonths: { min: 3, max: 3 },  // Q2: ramp up
        pdChangeFactor: { min: 0.98, max: 1.02 },
        utilizationChange: { min: 10, max: 20 },
        spreadChangeBps: { min: 0, max: 0 },
        dpdBucketAdvance: 0,
        flagsToAdd: [],
        eventsToGenerate: [],
        pricingReprices: false,
      },
      {
        fromState: 'PERFORMING',
        toState: 'PERFORMING',
        durationMonths: { min: 3, max: 3 },  // Q3: peak
        pdChangeFactor: { min: 0.98, max: 1.02 },
        utilizationChange: { min: 5, max: 15 },
        spreadChangeBps: { min: 0, max: 0 },
        dpdBucketAdvance: 0,
        flagsToAdd: [],
        eventsToGenerate: [],
        pricingReprices: false,
      },
      {
        fromState: 'PERFORMING',
        toState: 'PERFORMING',
        durationMonths: { min: 3, max: 3 },  // Q4: wind down
        pdChangeFactor: { min: 0.98, max: 1.02 },
        utilizationChange: { min: -20, max: -10 },
        spreadChangeBps: { min: 0, max: 0 },
        dpdBucketAdvance: 0,
        flagsToAdd: [],
        eventsToGenerate: [],
        pricingReprices: false,
      },
    ],
  },

  DEFAULT_WORKOUT: {
    type: 'DEFAULT_WORKOUT',
    description: 'Through default into recovery or write-off',
    portfolioSharePct: { min: 1, max: 2 },
    isRepeating: false,
    phases: [
      {
        fromState: 'DISTRESSED',
        toState: 'DEFAULT',
        durationMonths: { min: 1, max: 1 },
        pdChangeFactor: { min: 2.0, max: 5.0 },
        utilizationChange: { min: 5, max: 10 },
        spreadChangeBps: { min: 0, max: 0 },  // frozen
        dpdBucketAdvance: 1,
        flagsToAdd: ['DEFAULT', 'NON_ACCRUAL'],
        eventsToGenerate: ['DEFAULT'],
        pricingReprices: false,
      },
      {
        fromState: 'DEFAULT',
        toState: 'RECOVERY',
        durationMonths: { min: 3, max: 6 },
        pdChangeFactor: { min: 0.5, max: 0.7 },
        utilizationChange: { min: -20, max: -10 },
        spreadChangeBps: { min: -50, max: 0 },
        dpdBucketAdvance: -1,
        flagsToAdd: [],
        eventsToGenerate: ['RESTRUCTURING_COMPLETE'],
        pricingReprices: true,
      },
    ],
  },
};

/* ────────────────── Rating from PD ────────────────── */

/**
 * Derive internal rating from PD value.
 * Inverse of the PD band table — given a PD, return the rating.
 */
export function ratingFromPD(pd: number): string {
  if (pd <= 0.03) return 'AAA';
  if (pd <= 0.05) return 'AA+';
  if (pd <= 0.08) return 'AA';
  if (pd <= 0.12) return 'AA-';
  if (pd <= 0.18) return 'A+';
  if (pd <= 0.25) return 'A';
  if (pd <= 0.32) return 'A-';
  if (pd <= 0.40) return 'BBB+';
  // Investment Grade ceiling at 0.40%
  if (pd <= 0.60) return 'BBB';
  if (pd <= 0.85) return 'BBB-';
  if (pd <= 1.30) return 'BB+';
  if (pd <= 2.00) return 'BB';
  if (pd <= 3.00) return 'BB-';
  if (pd <= 4.50) return 'B+';
  if (pd <= 7.00) return 'B';
  if (pd <= 10.0) return 'B-';
  if (pd <= 20.0) return 'CCC';
  if (pd <= 30.0) return 'CC';
  if (pd <= 50.0) return 'C';
  return 'D';
}

/**
 * Get the rating tier name for a PD value.
 */
export function tierFromPD(pd: number): RatingTierName {
  if (pd <= 0.40) return 'INVESTMENT_GRADE';
  if (pd <= 2.00) return 'STANDARD';
  if (pd <= 10.0) return 'SUBSTANDARD';
  if (pd <= 30.0) return 'DOUBTFUL';
  return 'LOSS';
}

/**
 * Get the health state for a PD/DPD combination.
 */
export function healthStateFromPDandDPD(pd: number, dpd: number): HealthState {
  if (dpd >= 90) return 'DEFAULT';
  if (dpd >= 60 || pd >= 10.0) return 'DISTRESSED';
  if (dpd >= 30 || pd >= 5.0) return 'STRESSED';
  if (dpd >= 1 || pd >= 2.0) return 'DETERIORATING';
  if (pd >= 0.40) return 'WATCH';
  return 'PERFORMING';
}
