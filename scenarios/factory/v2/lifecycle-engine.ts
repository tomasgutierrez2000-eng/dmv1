/**
 * Lifecycle engine — facility lifecycle state transitions.
 *
 * Models the full facility lifecycle:
 *   COMMITMENT → FUNDED → AMORTIZING → MATURING → MATURED
 *                                                    ├→ [refinanced → new facility]
 *                                                    └→ DEFAULT → WORKOUT → WRITTEN_OFF
 *   ├→ RESTRUCTURED (covenant breach + no waiver)
 *   └→ DEFAULT (DPD > 90 or credit event)
 *
 * Also handles:
 *   - Amortization schedule generation
 *   - Maturity wall detection
 *   - Refinancing probability model
 *   - Workout: partial recovery over 12-24 months
 */

import type { RatingTier } from '../../../scripts/shared/mvp-config';
import type {
  FacilityState, FacilityEvent, LifecycleStage, ProductType,
} from './types';
import { PRODUCT_CONFIGS, willRefinance } from './product-models';
import { round, range } from './prng';

// ─── Workout/Recovery Parameters ───────────────────────────────────────

interface WorkoutParams {
  /** Recovery rate (fraction of outstanding). */
  recoveryRate: number;
  /** Duration in months. */
  durationMonths: number;
}

const WORKOUT_PARAMS: Record<'IG' | 'HY', WorkoutParams> = {
  IG: { recoveryRate: 0.40, durationMonths: 12 },
  HY: { recoveryRate: 0.20, durationMonths: 24 },
};

// ─── Lifecycle Transition Rules ────────────────────────────────────────

/**
 * Determine the next lifecycle stage based on current state and conditions.
 *
 * Returns null if no transition should occur.
 */
export function determineTransition(
  state: FacilityState,
  date: string,
  rng: () => number,
): { newStage: LifecycleStage; event: FacilityEvent } | null {
  const remainingMonths = state.remaining_tenor_months;

  switch (state.lifecycle_stage) {
    case 'COMMITMENT':
      // Transition to FUNDED on first draw
      if (state.drawn_amount > 0) {
        return {
          newStage: 'FUNDED',
          event: makeEvent(state, date, 'LIFECYCLE_FUNDED', 'LOW',
            `Facility ${state.facility_id}: first draw completed, now FUNDED`),
        };
      }
      return null;

    case 'FUNDED':
      // Check for default conditions first
      if (shouldDefault(state)) {
        return {
          newStage: 'DEFAULT',
          event: makeEvent(state, date, 'FACILITY_DEFAULT', 'CRITICAL',
            `Facility ${state.facility_id} entered DEFAULT from FUNDED state`),
        };
      }
      // Check for restructuring (covenant breach without waiver)
      if (shouldRestructure(state)) {
        return {
          newStage: 'RESTRUCTURED',
          event: makeEvent(state, date, 'FACILITY_RESTRUCTURED', 'HIGH',
            `Facility ${state.facility_id} entered RESTRUCTURED due to covenant breach`),
        };
      }
      // Check for amortization start (term loans)
      if (PRODUCT_CONFIGS[state.product_type].amortizes
          && state.drawn_amount < state.original_committed * 0.99) {
        return {
          newStage: 'AMORTIZING',
          event: makeEvent(state, date, 'LIFECYCLE_AMORTIZING', 'LOW',
            `Facility ${state.facility_id}: amortization payments have begun`),
        };
      }
      // Check maturity proximity
      if (remainingMonths <= 3 && remainingMonths > 0) {
        return {
          newStage: 'MATURING',
          event: makeEvent(state, date, 'LIFECYCLE_MATURING', 'MEDIUM',
            `Facility ${state.facility_id}: ${remainingMonths} months to maturity`),
        };
      }
      return null;

    case 'AMORTIZING':
      if (shouldDefault(state)) {
        return {
          newStage: 'DEFAULT',
          event: makeEvent(state, date, 'FACILITY_DEFAULT', 'CRITICAL',
            `Facility ${state.facility_id} entered DEFAULT during amortization`),
        };
      }
      if (remainingMonths <= 3 && remainingMonths > 0) {
        return {
          newStage: 'MATURING',
          event: makeEvent(state, date, 'LIFECYCLE_MATURING', 'MEDIUM',
            `Facility ${state.facility_id}: approaching maturity with ${remainingMonths} months remaining`),
        };
      }
      return null;

    case 'MATURING':
      if (shouldDefault(state)) {
        return {
          newStage: 'DEFAULT',
          event: makeEvent(state, date, 'FACILITY_DEFAULT', 'CRITICAL',
            `Facility ${state.facility_id} entered DEFAULT near maturity`),
        };
      }
      if (remainingMonths <= 0) {
        // Maturity reached — check for refinancing
        if (willRefinance(rng, state.product_type, state.rating_tier)) {
          return {
            newStage: 'MATURED',
            event: makeEvent(state, date, 'FACILITY_MATURED_REFINANCED', 'LOW',
              `Facility ${state.facility_id}: matured and refinanced into new facility`),
          };
        }
        return {
          newStage: 'MATURED',
          event: makeEvent(state, date, 'FACILITY_MATURED', 'MEDIUM',
            `Facility ${state.facility_id}: matured without refinancing`),
        };
      }
      return null;

    case 'RESTRUCTURED':
      if (shouldDefault(state)) {
        return {
          newStage: 'DEFAULT',
          event: makeEvent(state, date, 'RESTRUCTURED_TO_DEFAULT', 'CRITICAL',
            `Facility ${state.facility_id}: restructured facility entered DEFAULT`),
        };
      }
      return null;

    case 'DEFAULT':
      // Transition to WORKOUT after cure period (30 days)
      if (state.days_past_due <= 30 && state.credit_status !== 'DEFAULT') {
        // Cured!
        return {
          newStage: 'WORKOUT',
          event: makeEvent(state, date, 'DEFAULT_TO_WORKOUT', 'HIGH',
            `Facility ${state.facility_id}: entering workout/recovery phase`),
        };
      }
      // Auto-transition to WORKOUT after extended default
      if (state.days_past_due > 180) {
        return {
          newStage: 'WORKOUT',
          event: makeEvent(state, date, 'EXTENDED_DEFAULT_TO_WORKOUT', 'HIGH',
            `Facility ${state.facility_id}: extended default, moving to workout`),
        };
      }
      return null;

    case 'WORKOUT': {
      // Check if workout is complete (recovery achieved)
      const isIG = state.rating_tier.startsWith('IG');
      const params = isIG ? WORKOUT_PARAMS.IG : WORKOUT_PARAMS.HY;
      // Approximate workout completion based on balance reduction
      const recoveryTarget = state.original_committed * (1 - params.recoveryRate);
      if (state.drawn_amount <= recoveryTarget) {
        return {
          newStage: 'WRITTEN_OFF',
          event: makeEvent(state, date, 'WORKOUT_COMPLETE', 'HIGH',
            `Facility ${state.facility_id}: workout complete, residual written off`),
        };
      }
      return null;
    }

    case 'MATURED':
    case 'WRITTEN_OFF':
      // Terminal states — no transitions
      return null;

    default:
      return null;
  }
}

// ─── Maturity Wall Detection ───────────────────────────────────────────

export interface MaturityWallEntry {
  facilityId: string;
  counterpartyId: string;
  maturityDate: string;
  drawnAmount: number;
  committedAmount: number;
  productType: ProductType;
  ratingTier: RatingTier;
  remainingMonths: number;
}

/**
 * Detect maturity wall — cluster of facilities maturing in the same period.
 * Returns grouped maturities by quarter.
 */
export function detectMaturityWall(
  facilities: FacilityState[],
  asOfDate: string,
  lookAheadMonths: number = 12,
): Map<string, MaturityWallEntry[]> {
  const asOf = new Date(asOfDate + 'T00:00:00Z');
  const cutoff = new Date(asOf);
  cutoff.setUTCMonth(cutoff.getUTCMonth() + lookAheadMonths);

  const wall = new Map<string, MaturityWallEntry[]>();

  for (const fac of facilities) {
    const maturity = new Date(fac.maturity_date + 'T00:00:00Z');
    if (maturity >= asOf && maturity <= cutoff) {
      // Determine quarter
      const q = Math.floor(maturity.getUTCMonth() / 3) + 1;
      const key = `${maturity.getUTCFullYear()}-Q${q}`;

      if (!wall.has(key)) wall.set(key, []);
      wall.get(key)!.push({
        facilityId: fac.facility_id,
        counterpartyId: fac.counterparty_id,
        maturityDate: fac.maturity_date,
        drawnAmount: fac.drawn_amount,
        committedAmount: fac.committed_amount,
        productType: fac.product_type,
        ratingTier: fac.rating_tier,
        remainingMonths: fac.remaining_tenor_months,
      });
    }
  }

  return wall;
}

/**
 * Generate maturity wall risk flags for concentrated maturities.
 * A concentration exists when >3 facilities or >$500M mature in the same quarter.
 */
export function generateMaturityWallFlags(
  wall: Map<string, MaturityWallEntry[]>,
  date: string,
): FacilityEvent[] {
  const events: FacilityEvent[] = [];

  for (const [quarter, entries] of wall) {
    const totalAmount = entries.reduce((s, e) => s + e.drawnAmount, 0);
    if (entries.length > 3 || totalAmount > 500_000_000) {
      const facilityIds = entries.map(e => e.facilityId);
      const cpIds = [...new Set(entries.map(e => e.counterpartyId))];
      events.push({
        type: 'MATURITY_WALL',
        date,
        description: `Maturity wall in ${quarter}: ${entries.length} facilities, $${(totalAmount / 1e6).toFixed(0)}M maturing`,
        severity: entries.length > 5 || totalAmount > 1_000_000_000 ? 'CRITICAL' : 'HIGH',
        triggered_by: 'maturity_wall_detection',
        facility_ids: facilityIds,
        counterparty_id: cpIds[0],
      });
    }
  }

  return events;
}

// ─── Workout Balance Evolution ─────────────────────────────────────────

/**
 * Compute the drawn amount during workout phase.
 * Balance declines as recoveries are made, eventually reaching the write-off amount.
 */
export function workoutBalance(
  rng: () => number,
  state: FacilityState,
  monthsInWorkout: number,
): number {
  const isIG = state.rating_tier.startsWith('IG');
  const params = isIG ? WORKOUT_PARAMS.IG : WORKOUT_PARAMS.HY;

  // Linear recovery schedule with noise
  const progress = Math.min(monthsInWorkout / params.durationMonths, 1.0);
  const recoveryAmount = state.original_committed * params.recoveryRate * progress;
  const noise = range(rng, -0.05, 0.05) * recoveryAmount;

  return Math.max(0, round(state.drawn_amount - recoveryAmount + noise, 2));
}

// ─── Helpers ───────────────────────────────────────────────────────────

function shouldDefault(state: FacilityState): boolean {
  return state.days_past_due > 90 || state.credit_status === 'DEFAULT';
}

function shouldRestructure(state: FacilityState): boolean {
  // Restructure if covenant breached without waiver and not already defaulting
  return state.covenants.some(c => c.is_breached && !c.waiver_active)
    && state.days_past_due <= 90
    && state.credit_status !== 'DEFAULT';
}

function makeEvent(
  state: FacilityState,
  date: string,
  type: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  description: string,
): FacilityEvent {
  return {
    type,
    date,
    description,
    severity,
    triggered_by: 'lifecycle_engine',
    facility_ids: [state.facility_id],
    counterparty_id: state.counterparty_id,
  };
}
