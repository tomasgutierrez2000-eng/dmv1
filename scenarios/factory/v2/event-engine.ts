/**
 * Event engine — auto-generates events from threshold crossings.
 *
 * Replaces manual YAML event configuration with rules-based auto-generation.
 * Events emerge naturally from facility state changes (PD increase, covenant
 * breach, DPD progression, utilization spike, rating migration).
 *
 * Event types map directly to L2 tables:
 *   - credit_event: FAILURE_TO_PAY, BANKRUPTCY, RESTRUCTURING, RATING_DOWNGRADE
 *   - risk_flag: COVENANT_BREACH, HIGH_UTILIZATION, COLLATERAL_SHORTFALL, etc.
 *   - amendment_event: COVENANT_WAIVER, MATURITY_EXTENSION, FACILITY_INCREASE
 *   - exception_event: LIMIT_EXCEEDANCE, POLICY_EXCEPTION
 *
 * Cooldown periods prevent event spam.
 */

import type { FacilityState, FacilityEvent, CreditStatus } from './types';
import { CREDIT_STATUS_CODE } from './types';

// ─── Event Type Definitions ────────────────────────────────────────────

export type CreditEventType =
  | 'FAILURE_TO_PAY'
  | 'BANKRUPTCY'
  | 'RESTRUCTURING'
  | 'RATING_DOWNGRADE'
  | 'CROSS_DEFAULT'
  | 'OBLIGATION_ACCELERATION';

export type RiskFlagType =
  | 'COVENANT_BREACH'
  | 'COVENANT_WARNING'
  | 'HIGH_UTILIZATION'
  | 'COLLATERAL_SHORTFALL'
  | 'MATURITY_CONCENTRATION'
  | 'PAYMENT_DEFAULT'
  | 'RATING_MIGRATION_ADVERSE'
  | 'RATING_DIVERGENCE'
  | 'SECTOR_STRESS'
  | 'CONCENTRATION_RISK';

export type AmendmentType =
  | 'COVENANT_WAIVER'
  | 'MATURITY_EXTENSION'
  | 'FACILITY_INCREASE'
  | 'SPREAD_REDUCTION'
  | 'COLLATERAL_RELEASE'
  | 'COVENANT_RESET';

export type ExceptionType =
  | 'LIMIT_EXCEEDANCE'
  | 'POLICY_EXCEPTION'
  | 'APPROVAL_OVERRIDE'
  | 'CONCENTRATION_EXCEPTION';

// ─── Cooldown Tracking ─────────────────────────────────────────────────

/**
 * Track event cooldowns to prevent spam.
 * Key: "facilityId|eventType", Value: date string of last event.
 */
export class EventCooldownTracker {
  private lastEvents = new Map<string, string>();

  /** Check if enough time has passed since last event of this type. */
  canFire(facilityId: number, eventType: string, date: string, cooldownDays: number): boolean {
    const key = `${facilityId}|${eventType}`;
    const lastDate = this.lastEvents.get(key);
    if (!lastDate) return true;

    const lastMs = new Date(lastDate).getTime();
    const currentMs = new Date(date).getTime();
    const daysSince = (currentMs - lastMs) / (24 * 60 * 60 * 1000);
    return daysSince >= cooldownDays;
  }

  /** Record an event firing. */
  recordEvent(facilityId: number, eventType: string, date: string): void {
    const key = `${facilityId}|${eventType}`;
    this.lastEvents.set(key, date);
  }
}

// ─── Event Rules ───────────────────────────────────────────────────────

/** Default cooldown periods (days) per event type. */
const COOLDOWN_DAYS: Record<string, number> = {
  COVENANT_BREACH: 90,       // Max 1 per quarter
  COVENANT_WARNING: 30,
  HIGH_UTILIZATION: 14,
  COLLATERAL_SHORTFALL: 30,
  MATURITY_CONCENTRATION: 30,
  PAYMENT_DEFAULT: 30,
  RATING_MIGRATION_ADVERSE: 60,
  RATING_DIVERGENCE: 90,
  FAILURE_TO_PAY: 90,
  BANKRUPTCY: 365,
  RESTRUCTURING: 180,
  RATING_DOWNGRADE: 60,
  COVENANT_WAIVER: 90,
  MATURITY_EXTENSION: 180,
  LIMIT_EXCEEDANCE: 14,
  SECTOR_STRESS: 30,
};

// ─── Composite Event Generation ────────────────────────────────────────

export interface EventEngineOutput {
  creditEvents: FacilityEvent[];
  riskFlags: FacilityEvent[];
  amendments: FacilityEvent[];
  exceptions: FacilityEvent[];
}

/**
 * Process raw facility events into categorized L2 table events.
 *
 * Takes the events_this_period from FacilityState (generated during
 * state evolution) and categorizes them for the appropriate L2 tables.
 * Also generates derivative events (e.g., a covenant breach generates
 * both a risk_flag and potentially a credit_event).
 */
export function categorizeEvents(
  state: FacilityState,
  prevState: FacilityState | null,
  date: string,
  cooldowns: EventCooldownTracker,
): EventEngineOutput {
  const creditEvents: FacilityEvent[] = [];
  const riskFlags: FacilityEvent[] = [];
  const amendments: FacilityEvent[] = [];
  const exceptions: FacilityEvent[] = [];

  // ── Process raw events from state evolution ──
  for (const evt of state.events_this_period) {
    switch (evt.type) {
      case 'COVENANT_BREACH':
        if (cooldowns.canFire(state.facility_id, 'COVENANT_BREACH', date, COOLDOWN_DAYS.COVENANT_BREACH)) {
          riskFlags.push({ ...evt, type: 'COVENANT_BREACH' });
          cooldowns.recordEvent(state.facility_id, 'COVENANT_BREACH', date);
        }
        break;

      case 'COVENANT_BREACH_NO_WAIVER':
        // No waiver → potential credit event
        if (cooldowns.canFire(state.facility_id, 'RESTRUCTURING', date, COOLDOWN_DAYS.RESTRUCTURING)) {
          creditEvents.push({
            ...evt,
            type: 'RESTRUCTURING',
            description: `Covenant breach without waiver — facility ${state.facility_id} under restructuring review`,
          });
          cooldowns.recordEvent(state.facility_id, 'RESTRUCTURING', date);
        }
        break;

      case 'COVENANT_WARNING':
        if (cooldowns.canFire(state.facility_id, 'COVENANT_WARNING', date, COOLDOWN_DAYS.COVENANT_WARNING)) {
          riskFlags.push({ ...evt, type: 'COVENANT_WARNING' });
          cooldowns.recordEvent(state.facility_id, 'COVENANT_WARNING', date);
        }
        break;

      case 'HIGH_UTILIZATION':
        if (cooldowns.canFire(state.facility_id, 'HIGH_UTILIZATION', date, COOLDOWN_DAYS.HIGH_UTILIZATION)) {
          riskFlags.push(evt);
          cooldowns.recordEvent(state.facility_id, 'HIGH_UTILIZATION', date);
        }
        break;

      case 'COLLATERAL_SHORTFALL':
        if (cooldowns.canFire(state.facility_id, 'COLLATERAL_SHORTFALL', date, COOLDOWN_DAYS.COLLATERAL_SHORTFALL)) {
          riskFlags.push(evt);
          cooldowns.recordEvent(state.facility_id, 'COLLATERAL_SHORTFALL', date);
        }
        break;

      case 'MATURITY_CONCENTRATION':
      case 'MATURITY_APPROACHING':
        if (cooldowns.canFire(state.facility_id, 'MATURITY_CONCENTRATION', date, COOLDOWN_DAYS.MATURITY_CONCENTRATION)) {
          riskFlags.push({ ...evt, type: 'MATURITY_CONCENTRATION' });
          cooldowns.recordEvent(state.facility_id, 'MATURITY_CONCENTRATION', date);
        }
        break;

      case 'PAYMENT_DELAY':
        if (cooldowns.canFire(state.facility_id, 'PAYMENT_DEFAULT', date, COOLDOWN_DAYS.PAYMENT_DEFAULT)) {
          riskFlags.push({ ...evt, type: 'PAYMENT_DEFAULT' });
          cooldowns.recordEvent(state.facility_id, 'PAYMENT_DEFAULT', date);
        }
        break;

      case 'FACILITY_DEFAULT':
        if (cooldowns.canFire(state.facility_id, 'FAILURE_TO_PAY', date, COOLDOWN_DAYS.FAILURE_TO_PAY)) {
          creditEvents.push({
            ...evt,
            type: 'FAILURE_TO_PAY',
          });
          cooldowns.recordEvent(state.facility_id, 'FAILURE_TO_PAY', date);
        }
        break;

      case 'CROSS_DEFAULT':
        creditEvents.push({ ...evt, type: 'CROSS_DEFAULT' });
        break;

      case 'LIFECYCLE_TRANSITION':
        // Informational — no L2 table event
        break;

      default:
        // Unknown event type → route to risk flags
        riskFlags.push(evt);
        break;
    }
  }

  // ── Compare with previous state for change-based events ──
  if (prevState) {
    // Rating migration (adverse)
    if (prevState.credit_status !== state.credit_status) {
      const prevCode = CREDIT_STATUS_CODE[prevState.credit_status] ?? 1;
      const currCode = CREDIT_STATUS_CODE[state.credit_status] ?? 1;
      if (currCode > prevCode) {
        // Deterioration
        if (cooldowns.canFire(state.facility_id, 'RATING_MIGRATION_ADVERSE', date, COOLDOWN_DAYS.RATING_MIGRATION_ADVERSE)) {
          riskFlags.push({
            type: 'RATING_MIGRATION_ADVERSE',
            date,
            description: `Credit status migrated from ${prevState.credit_status} to ${state.credit_status}`,
            severity: currCode >= 5 ? 'CRITICAL' : 'HIGH',
            triggered_by: 'credit_status_change',
            facility_ids: [state.facility_id],
            counterparty_id: state.counterparty_id,
          });
          cooldowns.recordEvent(state.facility_id, 'RATING_MIGRATION_ADVERSE', date);

          // Rating downgrade event (if 2+ notch drop)
          if (currCode - prevCode >= 2) {
            creditEvents.push({
              type: 'RATING_DOWNGRADE',
              date,
              description: `Multi-notch downgrade: ${prevState.credit_status} → ${state.credit_status}`,
              severity: 'HIGH',
              triggered_by: 'rating_migration',
              facility_ids: [state.facility_id],
              counterparty_id: state.counterparty_id,
            });
          }
        }
      }
    }

    // Spread widening (significant — >100bps)
    if (state.spread_bps - prevState.spread_bps > 100) {
      riskFlags.push({
        type: 'SECTOR_STRESS',
        date,
        description: `Spread widened ${state.spread_bps - prevState.spread_bps}bps (${prevState.spread_bps} → ${state.spread_bps})`,
        severity: 'MEDIUM',
        triggered_by: 'spread_widening',
        facility_ids: [state.facility_id],
        counterparty_id: state.counterparty_id,
      });
    }

    // Waivers issued (covenant breached but waiver active)
    for (const cov of state.covenants) {
      if (cov.is_breached && cov.waiver_active) {
        const prevCov = prevState.covenants.find(c => c.covenant_type === cov.covenant_type);
        if (!prevCov?.waiver_active) {
          amendments.push({
            type: 'COVENANT_WAIVER',
            date,
            description: `Waiver granted for ${cov.covenant_type}: current ${cov.current_value.toFixed(2)} vs threshold ${cov.threshold_value.toFixed(2)}`,
            severity: 'MEDIUM',
            triggered_by: `waiver_${cov.covenant_type}`,
            facility_ids: [state.facility_id],
            counterparty_id: state.counterparty_id,
          });
        }
      }
    }
  }

  return { creditEvents, riskFlags, amendments, exceptions };
}

/**
 * Process all facilities for a date and collect categorized events.
 */
export function processAllEvents(
  states: Map<number, FacilityState>,
  prevStates: Map<number, FacilityState> | null,
  date: string,
  cooldowns: EventCooldownTracker,
): {
  allCreditEvents: FacilityEvent[];
  allRiskFlags: FacilityEvent[];
  allAmendments: FacilityEvent[];
  allExceptions: FacilityEvent[];
} {
  const allCreditEvents: FacilityEvent[] = [];
  const allRiskFlags: FacilityEvent[] = [];
  const allAmendments: FacilityEvent[] = [];
  const allExceptions: FacilityEvent[] = [];

  for (const [facilityId, state] of Array.from(states)) {
    const prevState = prevStates?.get(facilityId) ?? null;
    const result = categorizeEvents(state, prevState, date, cooldowns);
    allCreditEvents.push(...result.creditEvents);
    allRiskFlags.push(...result.riskFlags);
    allAmendments.push(...result.amendments);
    allExceptions.push(...result.exceptions);
  }

  return { allCreditEvents, allRiskFlags, allAmendments, allExceptions };
}
