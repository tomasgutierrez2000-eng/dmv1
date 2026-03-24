/**
 * Tests for StoryWeaver — entity-centric narrative engine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StoryWeaver, type FacilityStory } from '../story-weaver';
import { STORY_TEMPLATES, ratingFromPD, tierFromPD, healthStateFromPDandDPD } from '../story-templates';
import type { FacilityState, CreditStatus } from '../v2/types';

let weaver: StoryWeaver;

function makeMockState(overrides: Partial<FacilityState> = {}): FacilityState {
  return {
    facility_id: 1,
    counterparty_id: 100,
    credit_agreement_id: 50,
    product_type: 'REVOLVING_CREDIT',
    currency_code: 'USD',
    facility_type_code: 'REVOLVING',
    story_arc: 'STABLE_IG',
    rating_tier: 'IG_MID',
    size_profile: 'LARGE',
    industry_id: 1,
    country_code: 'US',
    committed_amount: 100_000_000,
    drawn_amount: 35_000_000,
    undrawn_amount: 65_000_000,
    original_committed: 100_000_000,
    pd_annual: 0.25,
    pd_at_origination: 0.20,
    lgd_current: 35,
    internal_rating: 'A',
    external_rating_sp: 'A',
    external_rating_moodys: 'A2',
    credit_status: 'PERFORMING' as CreditStatus,
    days_past_due: 0,
    ifrs9_stage: 1,
    spread_bps: 125,
    base_rate_pct: 5.33,
    all_in_rate_pct: 6.58,
    fee_rate_pct: 0.25,
    cost_of_funds_pct: 4.80,
    collateral_value: 42_000_000,
    collateral_type: 'RE',
    ltv_ratio: 83,
    covenant_package: null,
    covenants: [],
    next_test_date: null,
    lifecycle_stage: 'FUNDED',
    origination_date: '2024-01-15',
    maturity_date: '2029-01-15',
    remaining_tenor_months: 36,
    amortization_schedule: null,
    next_payment_date: null,
    is_revolving: true,
    ead: 75_000_000,
    ccf: 0.75,
    rwa: 37_500_000,
    risk_weight_pct: 50,
    expected_loss: 65_625,
    ecl_12m: 45_000,
    ecl_lifetime: 180_000,
    dscr: 1.8,
    icr: 3.2,
    leverage_ratio: 2.5,
    last_draw_date: '2025-08-15',
    last_repay_date: '2025-08-01',
    last_rate_reset_date: '2025-08-01',
    prior_drawn_amount: 30_000_000,
    events_this_period: [],
    ...overrides,
  } as FacilityState;
}

beforeEach(() => {
  weaver = new StoryWeaver(42);
});

/* ────────────────── Story Assignment ────────────────── */

describe('assignStories', () => {
  it('should assign stories to all counterparties', () => {
    weaver.assignStories([100, 101, 102, 103, 104]);
    expect(weaver.getAssignment(100)).toBeDefined();
    expect(weaver.getAssignment(101)).toBeDefined();
    expect(weaver.getAssignment(104)).toBeDefined();
  });

  it('should have STABLE as the most common assignment', () => {
    const cpIds = Array.from({ length: 100 }, (_, i) => i + 1);
    weaver.assignStories(cpIds);

    let stableCount = 0;
    for (const cpId of cpIds) {
      if (weaver.getAssignment(cpId)?.storyType === 'STABLE') stableCount++;
    }
    // STABLE should be 50%+ (template says 65-75%)
    expect(stableCount).toBeGreaterThan(40);
  });

  it('should respect overrides', () => {
    weaver.assignStories([100, 101], new Map([
      [100, { counterpartyId: 100, storyType: 'CREDIT_DETERIORATION', rootCause: 'Test', startMonth: 0, speed: 1.0 }],
    ]));
    expect(weaver.getAssignment(100)!.storyType).toBe('CREDIT_DETERIORATION');
  });
});

/* ────────────────── Initialization ────────────────── */

describe('initializeFromState', () => {
  it('should create a story from FacilityState', () => {
    weaver.assignStories([100]);
    const state = makeMockState();
    const story = weaver.initializeFromState(state, '2025-08-31');

    expect(story.facilityId).toBe(1);
    expect(story.counterpartyId).toBe(100);
    expect(story.pdAnnual).toBe(0.25);
    expect(story.healthState).toBe('PERFORMING');
    expect(story.committedAmount).toBe(100_000_000);
  });

  it('should be retrievable after creation', () => {
    weaver.assignStories([100]);
    const state = makeMockState();
    weaver.initializeFromState(state, '2025-08-31');

    const retrieved = weaver.getStory(1, '2025-08-31');
    expect(retrieved).toBeDefined();
    expect(retrieved!.facilityId).toBe(1);
  });
});

/* ────────────────── Monthly Evolution ────────────────── */

describe('evolveOneMonth', () => {
  it('should evolve a STABLE facility with minimal change', () => {
    weaver.assignStories([100], new Map([
      [100, { counterpartyId: 100, storyType: 'STABLE', rootCause: null, startMonth: 0, speed: 1.0 }],
    ]));
    const state = makeMockState();
    weaver.initializeFromState(state, '2025-08-31');

    const evolved = weaver.evolveOneMonth(1, '2025-08-31', '2025-09-30', 1);
    expect(evolved).toBeDefined();

    // PD should barely change for STABLE
    expect(evolved!.pdAnnual).toBeGreaterThan(0.15);
    expect(evolved!.pdAnnual).toBeLessThan(0.40);

    // Health state should remain PERFORMING
    expect(evolved!.healthState).toBe('PERFORMING');
  });

  it('should deteriorate a CREDIT_DETERIORATION facility', () => {
    weaver.assignStories([100], new Map([
      [100, { counterpartyId: 100, storyType: 'CREDIT_DETERIORATION', rootCause: 'Revenue miss', startMonth: 0, speed: 1.0 }],
    ]));
    const state = makeMockState();
    weaver.initializeFromState(state, '2025-08-31');

    // Evolve 3 months
    weaver.evolveOneMonth(1, '2025-08-31', '2025-09-30', 1);
    weaver.evolveOneMonth(1, '2025-09-30', '2025-10-31', 2);
    const month3 = weaver.evolveOneMonth(1, '2025-10-31', '2025-11-30', 3);

    expect(month3).toBeDefined();
    // PD should have increased significantly
    expect(month3!.pdAnnual).toBeGreaterThan(0.25);
    // Risk flags should appear
    expect(month3!.riskFlags.length).toBeGreaterThan(0);
  });

  it('should enforce PD temporal constraint (no >3x monthly change)', () => {
    weaver.assignStories([100], new Map([
      [100, { counterpartyId: 100, storyType: 'EVENT_DRIVEN', rootCause: 'Fraud', startMonth: 0, speed: 1.0 }],
    ]));
    const state = makeMockState();
    weaver.initializeFromState(state, '2025-08-31');

    const evolved = weaver.evolveOneMonth(1, '2025-08-31', '2025-09-30', 1);
    expect(evolved).toBeDefined();

    // Even for EVENT_DRIVEN, PD change should be clamped to 3x
    expect(evolved!.pdAnnual / 0.25).toBeLessThanOrEqual(3.1); // 3x with small tolerance
  });

  it('should derive drawn amount from utilization', () => {
    weaver.assignStories([100], new Map([
      [100, { counterpartyId: 100, storyType: 'STABLE', rootCause: null, startMonth: 0, speed: 1.0 }],
    ]));
    const state = makeMockState();
    weaver.initializeFromState(state, '2025-08-31');

    const evolved = weaver.evolveOneMonth(1, '2025-08-31', '2025-09-30', 1);
    expect(evolved).toBeDefined();

    // drawn = utilization% × committed (allow tolerance for large amounts)
    const expectedDrawn = (evolved!.utilization / 100) * evolved!.committedAmount;
    const tolerance = evolved!.committedAmount * 0.001; // 0.1% tolerance
    expect(Math.abs(evolved!.drawnAmount - expectedDrawn)).toBeLessThan(tolerance);
  });
});

/* ────────────────── Cross-Counterparty Coherence ────────────────── */

describe('enforceCrossCounterpartyCoherence', () => {
  it('should make all facilities for same counterparty have same PD', () => {
    weaver.assignStories([100]);
    const state1 = makeMockState({ facility_id: 1, counterparty_id: 100, pd_annual: 0.5 });
    const state2 = makeMockState({ facility_id: 2, counterparty_id: 100, pd_annual: 0.3 });

    weaver.initializeFromState(state1, '2025-08-31');
    weaver.initializeFromState(state2, '2025-08-31');

    weaver.enforceCrossCounterpartyCoherence([1, 2], '2025-08-31');

    const story1 = weaver.getStory(1, '2025-08-31')!;
    const story2 = weaver.getStory(2, '2025-08-31')!;
    expect(story1.pdAnnual).toBe(story2.pdAnnual);
    expect(story1.internalRating).toBe(story2.internalRating);
  });
});

/* ────────────────── Story Templates ────────────────── */

describe('story templates', () => {
  it('all templates should have at least one phase', () => {
    for (const [type, template] of Object.entries(STORY_TEMPLATES)) {
      expect(template.phases.length).toBeGreaterThan(0);
    }
  });

  it('portfolio shares should sum to ~100%', () => {
    let totalMin = 0;
    let totalMax = 0;
    for (const template of Object.values(STORY_TEMPLATES)) {
      totalMin += template.portfolioSharePct.min;
      totalMax += template.portfolioSharePct.max;
    }
    // Should roughly sum to 100%
    expect(totalMin).toBeGreaterThan(80);
    expect(totalMax).toBeLessThan(130);
  });
});

/* ────────────────── Helper Functions ────────────────── */

describe('ratingFromPD', () => {
  it('should map PD to correct ratings', () => {
    expect(ratingFromPD(0.02)).toBe('AAA');
    expect(ratingFromPD(0.25)).toBe('A');
    expect(ratingFromPD(1.2)).toBe('BB+');
    expect(ratingFromPD(4.0)).toBe('B+');
    expect(ratingFromPD(25.0)).toBe('CC');
    expect(ratingFromPD(50.0)).toBe('C');
    expect(ratingFromPD(100)).toBe('D');
  });
});

describe('tierFromPD', () => {
  it('should map PD to correct tiers', () => {
    expect(tierFromPD(0.20)).toBe('INVESTMENT_GRADE');
    expect(tierFromPD(1.0)).toBe('STANDARD');
    expect(tierFromPD(5.0)).toBe('SUBSTANDARD');
    expect(tierFromPD(15.0)).toBe('DOUBTFUL');
    expect(tierFromPD(50.0)).toBe('LOSS');
  });
});

describe('healthStateFromPDandDPD', () => {
  it('should derive health state correctly', () => {
    expect(healthStateFromPDandDPD(0.20, 0)).toBe('PERFORMING');
    expect(healthStateFromPDandDPD(0.50, 0)).toBe('WATCH');
    expect(healthStateFromPDandDPD(3.0, 0)).toBe('DETERIORATING');
    expect(healthStateFromPDandDPD(6.0, 35)).toBe('STRESSED');
    expect(healthStateFromPDandDPD(12.0, 65)).toBe('DISTRESSED');
    expect(healthStateFromPDandDPD(50.0, 120)).toBe('DEFAULT');
  });
});
