/**
 * Story Weaver — entity-centric narrative engine for GSIB-quality data generation.
 *
 * THE CORE AGENT. Makes data narratively coherent by generating facility
 * STORIES (one state per entity), then projecting to table rows. All tables
 * derive from the same state — no independent column generation.
 *
 * Wraps (does NOT replace) FacilityStateManager. Adds a narrative layer:
 *   - Health state machine (PERFORMING → WATCH → DETERIORATING → ...)
 *   - Causal graph (root_cause → PD → rating → pricing → flags → events)
 *   - Cross-entity coherence (same counterparty = same PD/rating)
 *   - Temporal monotonicity (worsening trajectory never reverses)
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

import {
  STORY_TEMPLATES,
  CAUSAL_CHAIN,
  ratingFromPD,
  tierFromPD,
  healthStateFromPDandDPD,
  type StoryType,
  type StoryPhase,
  type StoryTemplate,
} from './story-templates';

import type { CreditStatus, FacilityState } from './v2/types';

/* ────────────────── Facility Story ────────────────── */

/**
 * Extended facility state with narrative tracking.
 * This is the single source of truth for one facility at one point in time.
 */
export interface FacilityStory {
  facilityId: number;
  counterpartyId: number;
  /** Current health state */
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

  // Causal chain values (derived in order)
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
   * Call this once before evolving any facilities.
   */
  assignStories(
    counterpartyIds: number[],
    overrides?: Map<number, StoryAssignment>,
  ): void {
    for (const cpId of counterpartyIds) {
      if (overrides?.has(cpId)) {
        this.assignments.set(cpId, overrides.get(cpId)!);
        continue;
      }

      // Random assignment based on portfolio distribution
      const r = this.rng() * 100;
      let cumulative = 0;
      let selectedType: StoryType = 'STABLE';

      for (const [type, template] of Object.entries(STORY_TEMPLATES)) {
        cumulative += (template.portfolioSharePct.min + template.portfolioSharePct.max) / 2;
        if (r <= cumulative) {
          selectedType = type as StoryType;
          break;
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
   * Initialize a facility story from existing FacilityState.
   */
  initializeFromState(state: FacilityState, date: string): FacilityStory {
    const assignment = this.assignments.get(state.counterparty_id);
    const storyType = assignment?.storyType ?? 'STABLE';

    const story: FacilityStory = {
      facilityId: state.facility_id,
      counterpartyId: state.counterparty_id,
      healthState: healthStateFromPDandDPD(state.pd_annual, state.days_past_due),
      previousHealthState: 'PERFORMING',
      storyType,
      currentPhaseIndex: 0,
      monthsInPhase: 0,
      phaseDuration: this.getPhaseDuration(storyType, 0),
      rootCause: assignment?.rootCause ?? null,
      trajectory: 'STABLE',
      pdAnnual: state.pd_annual,
      previousPD: state.pd_annual,
      internalRating: state.internal_rating,
      creditStatus: state.credit_status,
      spreadBps: state.spread_bps,
      utilization: state.committed_amount > 0
        ? (state.drawn_amount / state.committed_amount) * 100
        : 0,
      daysPastDue: state.days_past_due,
      dpdBucket: this.dpdToBucket(state.days_past_due),
      riskFlags: [],
      pendingEvents: [],
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
   * Evolve a facility story one month forward.
   * This is the core: walks the causal graph to derive all values.
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
    // Enforce temporal constraint
    const pdRatio = newPD / prevStory.pdAnnual;
    if (pdRatio > TEMPORAL_LIMITS.pd_max_monthly_factor) {
      newPD = prevStory.pdAnnual * TEMPORAL_LIMITS.pd_max_monthly_factor;
    }
    if (pdRatio < 1 / TEMPORAL_LIMITS.pd_max_monthly_factor) {
      newPD = prevStory.pdAnnual / TEMPORAL_LIMITS.pd_max_monthly_factor;
    }

    // 2. Rating (derived from PD)
    const newRating = ratingFromPD(newPD);

    // 3. Credit status (derived from rating + DPD)
    const newCreditStatus = this.deriveCreditStatus(newPD, prevStory.daysPastDue, activePhase);

    // 4. Spread (derived from rating tier, with lag)
    let newSpread: number;
    if (activePhase.pricingReprices && storyActive) {
      const tier = tierFromPD(newPD);
      const tierSpread = SPREAD_BY_RATING_TIER[tier];
      newSpread = this.interpolate(tierSpread.min, tierSpread.max);
    } else {
      // No repricing — drift slightly
      newSpread = prevStory.spreadBps + this.interpolate(-5, 5);
    }
    newSpread = Math.max(0, Math.min(5000, newSpread));

    // 5. Utilization (derived from health state)
    const newHealthState = storyActive ? activePhase.toState : prevStory.healthState;
    const healthUtil = UTILIZATION_BY_HEALTH[newHealthState];
    let newUtilization: number;
    if (storyActive) {
      const utilChange = this.interpolate(activePhase.utilizationChange.min, activePhase.utilizationChange.max) * speed;
      newUtilization = prevStory.utilization + utilChange;
    } else {
      newUtilization = prevStory.utilization + this.interpolate(-2, 2);
    }
    // Clamp to health-appropriate range
    newUtilization = Math.max(healthUtil.min, Math.min(healthUtil.max, newUtilization));

    // 6. Days Past Due (derived from health state)
    let newDPD = prevStory.daysPastDue;
    if (storyActive && activePhase.dpdBucketAdvance !== 0) {
      newDPD = this.advanceDPD(prevStory.daysPastDue, activePhase.dpdBucketAdvance);
    }
    // Enforce: DPD can't decrease without recovery event
    if (prevStory.trajectory === 'WORSENING' && newDPD < prevStory.daysPastDue && !activePhase.eventsToGenerate.includes('RESTRUCTURING_COMPLETE')) {
      newDPD = prevStory.daysPastDue;
    }

    // 7. DPD Bucket
    const newDPDBucket = this.dpdToBucket(newDPD);

    // 8. Risk flags
    const newFlags = [...prevStory.riskFlags];
    if (storyActive) {
      for (const flag of activePhase.flagsToAdd) {
        if (!newFlags.includes(flag)) newFlags.push(flag);
      }
    }
    // Auto-flags from threshold crossings
    if (newUtilization > 70 && !newFlags.includes('HIGH_UTILIZATION')) {
      newFlags.push('HIGH_UTILIZATION');
    }
    if (newDPD > 0 && !newFlags.includes('DELINQUENT')) {
      newFlags.push('DELINQUENT');
    }

    // 9. Events
    const pendingEvents = storyActive ? [...activePhase.eventsToGenerate] : [];

    // Determine trajectory
    let trajectory: FacilityStory['trajectory'];
    if (newPD > prevStory.pdAnnual * 1.1) trajectory = 'WORSENING';
    else if (newPD < prevStory.pdAnnual * 0.9) trajectory = 'IMPROVING';
    else trajectory = 'STABLE';

    // Derive drawn amount from utilization
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
    // Group by counterparty
    const cpFacilities = new Map<number, FacilityStory[]>();
    for (const fid of facilityIds) {
      const story = this.stories.get(`${fid}|${date}`);
      if (!story) continue;
      const group = cpFacilities.get(story.counterpartyId) ?? [];
      group.push(story);
      cpFacilities.set(story.counterpartyId, group);
    }

    // For each counterparty, make PD and rating consistent
    for (const [, facilities] of cpFacilities) {
      if (facilities.length <= 1) continue;

      // Use the first facility's PD/rating as the reference
      const refPD = facilities[0].pdAnnual;
      const refRating = facilities[0].internalRating;
      const refCreditStatus = facilities[0].creditStatus;
      const refHealthState = facilities[0].healthState;

      for (let i = 1; i < facilities.length; i++) {
        facilities[i].pdAnnual = refPD;
        facilities[i].internalRating = refRating;
        facilities[i].creditStatus = refCreditStatus;
        facilities[i].healthState = refHealthState;
        // Utilization, DPD, LGD can differ per facility
      }
    }
  }

  /**
   * Get a story for a facility at a date.
   */
  getStory(facilityId: number, date: string): FacilityStory | undefined {
    return this.stories.get(`${facilityId}|${date}`);
  }

  /**
   * Get all stories for a date.
   */
  getStoriesForDate(facilityIds: number[], date: string): FacilityStory[] {
    return facilityIds
      .map(fid => this.stories.get(`${fid}|${date}`))
      .filter((s): s is FacilityStory => !!s);
  }

  /**
   * Get story assignment for a counterparty.
   */
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

  private deriveCreditStatus(pd: number, dpd: number, phase: StoryPhase): CreditStatus {
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
