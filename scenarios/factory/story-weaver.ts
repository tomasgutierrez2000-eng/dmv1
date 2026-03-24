/**
 * Story Weaver — narrative layer on top of FacilityStateManager.
 *
 * DELEGATES evolution to the V2 FacilityStateManager (10-stage pipeline).
 * Adds narrative analysis on top:
 *   - Health state derivation from FacilityState
 *   - Story template assignment with state-aware guards
 *   - Cross-entity coherence checks
 *   - Risk flag and event generation from state transitions
 *   - Temporal monotonicity enforcement
 *
 * SINGLE STATE MACHINE: StoryWeaver reads FROM FacilityState, it does NOT
 * maintain its own parallel evolution. This prevents drift between the V2
 * pipeline and agent-driven generation.
 */

import type { HealthState } from './gsib-calibration';
import {
  PD_BY_RATING_TIER,
  UTILIZATION_BY_HEALTH,
  SPREAD_BY_RATING_TIER,
  TEMPORAL_LIMITS,
  type RatingTierName,
} from './gsib-calibration';

import {
  STORY_TEMPLATES,
  ratingFromPD,
  tierFromPD,
  healthStateFromPDandDPD,
  type StoryType,
  type StoryPhase,
} from './story-templates';

import type { CreditStatus, FacilityState } from './v2/types';

/* ────────────────── Facility Story ────────────────── */

/**
 * Narrative analysis of a FacilityState at a point in time.
 * This is a READ-ONLY view derived from FacilityState — not a parallel state.
 */
export interface FacilityStory {
  facilityId: number;
  counterpartyId: number;
  /** Current health state (derived from PD + DPD) */
  healthState: HealthState;
  /** Previous month's health state */
  previousHealthState: HealthState;
  /** Story template driving this facility's arc */
  storyType: StoryType;
  /** Current phase index within the story template */
  currentPhaseIndex: number;
  /** Months spent in current phase */
  monthsInPhase: number;
  /** Duration target for current phase */
  phaseDuration: number;
  /** Root cause narrative */
  rootCause: string | null;
  /** Whether the trajectory is worsening, improving, or stable */
  trajectory: 'WORSENING' | 'IMPROVING' | 'STABLE';

  // Values derived from FacilityState (not independently generated)
  pdAnnual: number;
  previousPD: number;
  internalRating: string;
  creditStatus: CreditStatus;
  spreadBps: number;
  utilization: number;
  daysPastDue: number;
  dpdBucket: string;
  riskFlags: string[];
  pendingEvents: string[];

  // Identity (from FacilityState)
  committedAmount: number;
  drawnAmount: number;
  currencyCode: string;
  industryId: number;
  countryCode: string;
  collateralValue: number;
  lgdCurrent: number;
}

/* ────────────────── Story Assignment ────────────────── */

export interface StoryAssignment {
  counterpartyId: number;
  storyType: StoryType;
  rootCause: string | null;
  /** When the story begins (month index 0 = first date) */
  startMonth: number;
  /** Speed modifier (0.5 = slow, 1.0 = normal, 2.0 = fast) */
  speed: number;
}

/**
 * Story types that require the facility to already be in a distressed state.
 * If assigned to a PERFORMING facility, these are reassigned to STABLE.
 */
const DISTRESSED_ONLY_STORIES: Set<StoryType> = new Set(['RECOVERY', 'DEFAULT_WORKOUT']);

/**
 * Minimum PD threshold for a facility to be eligible for distressed-only stories.
 * Facilities below this are reassigned to STABLE.
 */
const DISTRESSED_PD_THRESHOLD = 5.0; // 5% PD = SUBSTANDARD or worse

/* ────────────────── Story Weaver ────────────────── */

export class StoryWeaver {
  private stories = new Map<string, FacilityStory>(); // "facilityId|date" → story
  private assignments = new Map<number, StoryAssignment>(); // counterpartyId → assignment
  private rng: () => number;

  constructor(seed?: number) {
    // Simple seeded RNG for determinism
    let s = seed ?? 42;
    this.rng = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  /**
   * Assign story arcs to counterparties.
   * Call this once before analyzing any facilities.
   *
   * STATE-AWARE: RECOVERY and DEFAULT_WORKOUT are only assigned to facilities
   * already in distressed state (PD >= 5%). If randomly selected for a healthy
   * facility, falls back to STABLE to prevent nonsensical narratives.
   */
  assignStories(
    counterpartyIds: number[],
    overrides?: Map<number, StoryAssignment>,
    /** Optional: current PD per counterparty for state-aware assignment */
    currentPDs?: Map<number, number>,
  ): void {
    for (const cpId of counterpartyIds) {
      if (overrides?.has(cpId)) {
        const override = overrides.get(cpId)!;
        // Even overrides get state-checked for distressed-only stories
        if (DISTRESSED_ONLY_STORIES.has(override.storyType)) {
          const currentPD = currentPDs?.get(cpId) ?? 0;
          if (currentPD < DISTRESSED_PD_THRESHOLD) {
            // Override requests RECOVERY/DEFAULT_WORKOUT but facility is healthy
            // Fall back to CREDIT_DETERIORATION (closest alternative)
            this.assignments.set(cpId, {
              ...override,
              storyType: 'CREDIT_DETERIORATION',
              rootCause: override.rootCause ?? 'Reassigned from ' + override.storyType,
            });
            continue;
          }
        }
        this.assignments.set(cpId, override);
        continue;
      }

      // Random assignment based on portfolio distribution (normalized to 100%)
      const entries = Object.entries(STORY_TEMPLATES);
      const rawWeights = entries.map(([, t]) => (t.portfolioSharePct.min + t.portfolioSharePct.max) / 2);
      const totalWeight = rawWeights.reduce((s, w) => s + w, 0);
      const r = this.rng() * totalWeight;
      let cumulative = 0;
      let selectedType: StoryType = 'STABLE';

      for (let i = 0; i < entries.length; i++) {
        cumulative += rawWeights[i];
        if (r <= cumulative) {
          selectedType = entries[i][0] as StoryType;
          break;
        }
      }

      // STATE-AWARE GUARD: RECOVERY/DEFAULT_WORKOUT only for distressed facilities
      if (DISTRESSED_ONLY_STORIES.has(selectedType)) {
        const currentPD = currentPDs?.get(cpId) ?? 0;
        if (currentPD < DISTRESSED_PD_THRESHOLD) {
          selectedType = 'STABLE'; // Safe fallback
        }
      }

      this.assignments.set(cpId, {
        counterpartyId: cpId,
        storyType: selectedType,
        rootCause: this.generateRootCause(selectedType),
        startMonth: selectedType === 'STABLE' ? 0 : Math.floor(this.rng() * 3),
        speed: 0.8 + this.rng() * 0.4, // 0.8-1.2
      });
    }
  }

  /**
   * Derive a FacilityStory from a FacilityState.
   *
   * This is a READ-ONLY derivation — it analyzes the FacilityState produced by
   * the V2 pipeline and adds narrative context (health state, flags, trajectory).
   * It does NOT evolve the state.
   */
  deriveStoryFromState(state: FacilityState, date: string, previousStory?: FacilityStory): FacilityStory {
    const assignment = this.assignments.get(state.counterparty_id);
    const storyType = assignment?.storyType ?? 'STABLE';

    const healthState = healthStateFromPDandDPD(state.pd_annual, state.days_past_due);
    const prevHealth = previousStory?.healthState ?? 'PERFORMING';

    // Derive trajectory from PD change
    const prevPD = previousStory?.pdAnnual ?? state.pd_annual;
    let trajectory: FacilityStory['trajectory'];
    if (state.pd_annual > prevPD * 1.1) trajectory = 'WORSENING';
    else if (state.pd_annual < prevPD * 0.9) trajectory = 'IMPROVING';
    else trajectory = 'STABLE';

    // Phase tracking
    let currentPhaseIndex = previousStory?.currentPhaseIndex ?? 0;
    let monthsInPhase = (previousStory?.monthsInPhase ?? 0) + 1;
    let phaseDuration = previousStory?.phaseDuration ?? this.getPhaseDuration(storyType, 0);

    const template = STORY_TEMPLATES[storyType];
    if (monthsInPhase >= phaseDuration && currentPhaseIndex < template.phases.length - 1) {
      currentPhaseIndex++;
      monthsInPhase = 0;
      phaseDuration = this.getPhaseDuration(storyType, currentPhaseIndex);
    }

    // Risk flags from threshold crossings
    const riskFlags: string[] = [...(previousStory?.riskFlags ?? [])];
    const activePhase = template.phases[currentPhaseIndex];

    // Auto-derive flags from state
    if (healthState !== 'PERFORMING' && !riskFlags.includes('WATCH_LIST')) {
      riskFlags.push('WATCH_LIST');
    }
    if (state.days_past_due > 0 && !riskFlags.includes('DELINQUENT')) {
      riskFlags.push('DELINQUENT');
    }
    const util = state.committed_amount > 0 ? (state.drawn_amount / state.committed_amount) * 100 : 0;
    if (util > 70 && !riskFlags.includes('HIGH_UTILIZATION')) {
      riskFlags.push('HIGH_UTILIZATION');
    }
    if (healthState === 'DETERIORATING' && !riskFlags.includes('DETERIORATING')) {
      riskFlags.push('DETERIORATING');
    }

    // Add phase-specific flags
    if (activePhase) {
      for (const flag of activePhase.flagsToAdd) {
        if (!riskFlags.includes(flag)) riskFlags.push(flag);
      }
    }

    // Events from state transitions
    const pendingEvents: string[] = [];
    if (healthState !== prevHealth) {
      if (state.pd_annual > prevPD * 1.5) pendingEvents.push('RATING_CHANGE');
      if (state.days_past_due > 0 && (previousStory?.daysPastDue ?? 0) === 0) pendingEvents.push('DELINQUENCY');
      if (healthState === 'DEFAULT') pendingEvents.push('DEFAULT');
    }
    if (activePhase) {
      for (const evt of activePhase.eventsToGenerate) {
        if (!pendingEvents.includes(evt)) pendingEvents.push(evt);
      }
    }

    const story: FacilityStory = {
      facilityId: state.facility_id,
      counterpartyId: state.counterparty_id,
      healthState,
      previousHealthState: prevHealth,
      storyType,
      currentPhaseIndex,
      monthsInPhase,
      phaseDuration,
      rootCause: assignment?.rootCause ?? null,
      trajectory,
      pdAnnual: state.pd_annual,
      previousPD: prevPD,
      internalRating: state.internal_rating ?? ratingFromPD(state.pd_annual),
      creditStatus: state.credit_status,
      spreadBps: state.spread_bps,
      utilization: util,
      daysPastDue: state.days_past_due,
      dpdBucket: this.dpdToBucket(state.days_past_due),
      riskFlags,
      pendingEvents,
      committedAmount: state.committed_amount,
      drawnAmount: state.drawn_amount,
      currencyCode: state.currency_code,
      industryId: state.industry_id,
      countryCode: state.country_code,
      collateralValue: state.collateral_value,
      lgdCurrent: state.lgd_current,
    };

    this.stories.set(`${state.facility_id}|${date}`, story);
    return story;
  }

  /**
   * Backwards-compatible: Initialize a facility story from FacilityState.
   * Alias for deriveStoryFromState (used by tests and direct callers).
   */
  initializeFromState(state: FacilityState, date: string): FacilityStory {
    return this.deriveStoryFromState(state, date);
  }

  /**
   * Backwards-compatible: Evolve a facility story one month forward.
   *
   * For standalone use (without FacilityStateManager), this creates a synthetic
   * next state by applying the story template's phase parameters.
   * When used with the full pipeline, prefer deriveStoryFromState() after
   * FacilityStateManager.step() instead.
   */
  evolveOneMonth(
    facilityId: number,
    previousDate: string,
    newDate: string,
    monthIndex: number,
  ): FacilityStory | null {
    const prevStory = this.stories.get(`${facilityId}|${previousDate}`);
    if (!prevStory) return null;

    const assignment = this.assignments.get(prevStory.counterpartyId);
    const template = STORY_TEMPLATES[prevStory.storyType];
    const phase = template.phases[prevStory.currentPhaseIndex] ?? template.phases[template.phases.length - 1];

    // Check if we should advance to next phase
    let currentPhaseIndex = prevStory.currentPhaseIndex;
    let monthsInPhase = prevStory.monthsInPhase + 1;
    let phaseDuration = prevStory.phaseDuration;

    const startMonth = assignment?.startMonth ?? 0;
    const storyActive = monthIndex >= startMonth;

    if (storyActive && monthsInPhase >= phaseDuration && currentPhaseIndex < template.phases.length - 1) {
      currentPhaseIndex++;
      monthsInPhase = 0;
      phaseDuration = this.getPhaseDuration(prevStory.storyType, currentPhaseIndex);
    }

    const activePhase = template.phases[currentPhaseIndex] ?? phase;
    const speed = assignment?.speed ?? 1.0;

    // ── CAUSAL CHAIN: derive values in strict order ──

    // 1. PD (primary risk indicator)
    let newPD: number;
    if (storyActive) {
      const factor = this.interpolate(activePhase.pdChangeFactor.min, activePhase.pdChangeFactor.max);
      newPD = prevStory.pdAnnual * Math.pow(factor, speed);
    } else {
      newPD = prevStory.pdAnnual * (0.98 + this.rng() * 0.04); // stable noise
    }
    // Clamp PD to valid range
    newPD = Math.max(0.01, Math.min(100, newPD));
    // Enforce temporal constraint — EVENT_DRIVEN stories bypass the cap
    const maxFactor = prevStory.storyType === 'EVENT_DRIVEN'
      ? TEMPORAL_LIMITS.pd_max_monthly_factor * 3
      : TEMPORAL_LIMITS.pd_max_monthly_factor;
    const pdRatio = newPD / prevStory.pdAnnual;
    if (pdRatio > maxFactor) {
      newPD = prevStory.pdAnnual * maxFactor;
    }
    if (pdRatio < 1 / TEMPORAL_LIMITS.pd_max_monthly_factor) {
      newPD = prevStory.pdAnnual / TEMPORAL_LIMITS.pd_max_monthly_factor;
    }

    // 2. Rating (derived from PD)
    const newRating = ratingFromPD(newPD);

    // 3. Credit status
    const newCreditStatus = this.deriveCreditStatus(newPD, prevStory.daysPastDue);

    // 4. Spread
    let newSpread: number;
    if (activePhase.pricingReprices && storyActive) {
      const tier = tierFromPD(newPD);
      const tierSpread = SPREAD_BY_RATING_TIER[tier];
      newSpread = this.interpolate(tierSpread.min, tierSpread.max);
    } else {
      newSpread = prevStory.spreadBps + this.interpolate(-5, 5);
    }
    newSpread = Math.max(0, Math.min(5000, newSpread));

    // 5. Utilization
    const newHealthState = storyActive ? activePhase.toState : prevStory.healthState;
    const healthUtil = UTILIZATION_BY_HEALTH[newHealthState];
    let newUtilization: number;
    if (storyActive) {
      const utilChange = this.interpolate(activePhase.utilizationChange.min, activePhase.utilizationChange.max) * speed;
      newUtilization = prevStory.utilization + utilChange;
    } else {
      newUtilization = prevStory.utilization + this.interpolate(-2, 2);
    }
    newUtilization = Math.max(healthUtil.min, Math.min(healthUtil.max, newUtilization));

    // 6. Days Past Due
    let newDPD = prevStory.daysPastDue;
    if (storyActive && activePhase.dpdBucketAdvance !== 0) {
      newDPD = this.advanceDPD(prevStory.daysPastDue, activePhase.dpdBucketAdvance);
    }
    if (prevStory.trajectory === 'WORSENING' && newDPD < prevStory.daysPastDue
        && !activePhase.eventsToGenerate.includes('RESTRUCTURING_COMPLETE')) {
      newDPD = prevStory.daysPastDue;
    }

    // 7-9. DPD Bucket, Risk flags, Events
    const newDPDBucket = this.dpdToBucket(newDPD);
    const newFlags = [...prevStory.riskFlags];
    if (storyActive) {
      for (const flag of activePhase.flagsToAdd) {
        if (!newFlags.includes(flag)) newFlags.push(flag);
      }
    }
    if (newUtilization > 70 && !newFlags.includes('HIGH_UTILIZATION')) newFlags.push('HIGH_UTILIZATION');
    if (newDPD > 0 && !newFlags.includes('DELINQUENT')) newFlags.push('DELINQUENT');

    const pendingEvents = storyActive ? [...activePhase.eventsToGenerate] : [];

    let trajectory: FacilityStory['trajectory'];
    if (newPD > prevStory.pdAnnual * 1.1) trajectory = 'WORSENING';
    else if (newPD < prevStory.pdAnnual * 0.9) trajectory = 'IMPROVING';
    else trajectory = 'STABLE';

    const newDrawn = (newUtilization / 100) * prevStory.committedAmount;

    const story: FacilityStory = {
      facilityId: prevStory.facilityId,
      counterpartyId: prevStory.counterpartyId,
      healthState: newHealthState,
      previousHealthState: prevStory.healthState,
      storyType: prevStory.storyType,
      currentPhaseIndex,
      monthsInPhase,
      phaseDuration,
      rootCause: prevStory.rootCause,
      trajectory,
      pdAnnual: Math.round(newPD * 1e6) / 1e6,
      previousPD: prevStory.pdAnnual,
      internalRating: newRating,
      creditStatus: newCreditStatus,
      spreadBps: Math.round(newSpread * 100) / 100,
      utilization: Math.round(newUtilization * 100) / 100,
      daysPastDue: newDPD,
      dpdBucket: newDPDBucket,
      riskFlags: newFlags,
      pendingEvents,
      committedAmount: prevStory.committedAmount,
      drawnAmount: Math.round(newDrawn * 100) / 100,
      currencyCode: prevStory.currencyCode,
      industryId: prevStory.industryId,
      countryCode: prevStory.countryCode,
      collateralValue: prevStory.collateralValue,
      lgdCurrent: prevStory.lgdCurrent,
    };

    this.stories.set(`${facilityId}|${newDate}`, story);
    return story;
  }

  /**
   * Ensure cross-counterparty coherence: all facilities for the same
   * counterparty get the same PD and rating.
   */
  enforceCrossCounterpartyCoherence(
    facilityIds: number[],
    date: string,
  ): void {
    const cpFacilities = new Map<number, FacilityStory[]>();
    for (const fid of facilityIds) {
      const story = this.stories.get(`${fid}|${date}`);
      if (!story) continue;
      const group = cpFacilities.get(story.counterpartyId) ?? [];
      group.push(story);
      cpFacilities.set(story.counterpartyId, group);
    }

    for (const [, facilities] of cpFacilities) {
      if (facilities.length <= 1) continue;
      const refPD = facilities[0].pdAnnual;
      const refRating = facilities[0].internalRating;
      const refCreditStatus = facilities[0].creditStatus;
      const refHealthState = facilities[0].healthState;

      for (let i = 1; i < facilities.length; i++) {
        facilities[i].pdAnnual = refPD;
        facilities[i].internalRating = refRating;
        facilities[i].creditStatus = refCreditStatus;
        facilities[i].healthState = refHealthState;
      }
    }
  }

  getStory(facilityId: number, date: string): FacilityStory | undefined {
    return this.stories.get(`${facilityId}|${date}`);
  }

  getStoriesForDate(facilityIds: number[], date: string): FacilityStory[] {
    return facilityIds
      .map(fid => this.stories.get(`${fid}|${date}`))
      .filter((s): s is FacilityStory => !!s);
  }

  getAssignment(counterpartyId: number): StoryAssignment | undefined {
    return this.assignments.get(counterpartyId);
  }

  /* ────────────────── Private Helpers ────────────────── */

  private interpolate(min: number, max: number): number {
    return min + this.rng() * (max - min);
  }

  private getPhaseDuration(storyType: StoryType, phaseIndex: number): number {
    const template = STORY_TEMPLATES[storyType];
    const phase = template.phases[phaseIndex];
    if (!phase) return 1;
    return Math.round(this.interpolate(phase.durationMonths.min, phase.durationMonths.max));
  }

  private deriveCreditStatus(pd: number, dpd: number): CreditStatus {
    if (dpd >= 90 || pd >= 30) return 'DEFAULT';
    if (dpd >= 60 || pd >= 10) return 'DOUBTFUL';
    if (dpd >= 30 || pd >= 5) return 'SUBSTANDARD';
    if (pd >= 2.0) return 'SPECIAL_MENTION';
    if (pd >= 0.40) return 'WATCH';
    return 'PERFORMING';
  }

  private dpdToBucket(dpd: number): string {
    if (dpd <= 0) return 'CURRENT';
    if (dpd <= 29) return '1-29';
    if (dpd <= 59) return '30-59';
    if (dpd <= 89) return '60-89';
    return '90+';
  }

  private advanceDPD(currentDPD: number, bucketAdvance: number): number {
    const buckets = [0, 15, 45, 75, 120];
    const currentBucketIdx = currentDPD <= 0 ? 0
      : currentDPD <= 29 ? 1
      : currentDPD <= 59 ? 2
      : currentDPD <= 89 ? 3
      : 4;
    const newIdx = Math.max(0, Math.min(4, currentBucketIdx + bucketAdvance));
    return buckets[newIdx];
  }

  private generateRootCause(storyType: StoryType): string | null {
    const causes: Record<StoryType, string[]> = {
      STABLE: [],
      CREDIT_DETERIORATION: ['Revenue decline', 'Sector downturn', 'Management issues', 'Customer concentration loss', 'Regulatory action'],
      RECOVERY: ['Restructuring complete', 'New management', 'Asset sale', 'Capital injection'],
      EVENT_DRIVEN: ['Fraud discovery', 'Regulatory sanction', 'Key customer bankruptcy', 'Natural disaster'],
      SEASONAL: [],
      DEFAULT_WORKOUT: ['Cash flow exhaustion', 'Covenant breaches', 'Market collapse'],
    };
    const options = causes[storyType];
    if (!options || options.length === 0) return null;
    return options[Math.floor(this.rng() * options.length)];
  }
}
