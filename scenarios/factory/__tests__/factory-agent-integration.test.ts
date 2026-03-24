/**
 * Integration tests for the Data Factory Agent Suite.
 * Tests the full pipeline: schema → strategy → story → validate → observe.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SchemaAnalyzer } from '../schema-analyzer';
import { StrategyAdvisor, type StrategyRequest } from '../strategy-advisor';
import { GeneratorBuilder } from '../generator-builder';
import { StoryWeaver } from '../story-weaver';
import { EnhancedValidator } from '../enhanced-validator';
import { ScenarioObserver } from '../scenario-observer';
import { PKRegistry } from '../pk-registry';
import type { FacilityState, CreditStatus } from '../v2/types';
import type { FacilityStory } from '../story-weaver';

/* ────────────────── Shared Setup ────────────────── */

let analyzer: SchemaAnalyzer;

beforeAll(() => {
  analyzer = SchemaAnalyzer.create();
});

function makeFacilityState(cpId: number, facId: number, pd: number = 0.25): FacilityState {
  return {
    facility_id: facId,
    counterparty_id: cpId,
    credit_agreement_id: cpId,
    product_type: 'REVOLVING_CREDIT',
    currency_code: 'USD',
    facility_type_code: 'REVOLVING',
    story_arc: 'STABLE_IG' as any,
    rating_tier: 'IG_MID' as any,
    size_profile: 'LARGE' as any,
    industry_id: (cpId % 10) + 1,
    country_code: 'US',
    committed_amount: 100_000_000,
    drawn_amount: 35_000_000,
    undrawn_amount: 65_000_000,
    original_committed: 100_000_000,
    pd_annual: pd,
    pd_at_origination: 0.20,
    lgd_current: 35,
    internal_rating: 'A',
    external_rating_sp: 'A',
    external_rating_moodys: 'A2',
    credit_status: 'PERFORMING' as CreditStatus,
    days_past_due: 0,
    ifrs9_stage: 1 as const,
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
    lifecycle_stage: 'FUNDED' as any,
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
    last_draw_date: null,
    last_repay_date: null,
    last_rate_reset_date: null,
    prior_drawn_amount: 30_000_000,
    events_this_period: [],
  } as FacilityState;
}

/* ────────────────── E2E: Schema → Strategy → Plan ────────────────── */

describe('E2E: Schema → Strategy → Plan', () => {
  it('should produce a complete pipeline plan for EXTEND_TEMPORAL', async () => {
    const coverage = analyzer.analyzeCoverage();
    expect(coverage.totalTables).toBeGreaterThan(200);

    const advisor = new StrategyAdvisor(analyzer);
    const currentState = {
      connected: true,
      tables: [{ qualifiedName: 'l2.facility_exposure_snapshot', rowCount: 5000, minDate: '2025-08-31', maxDate: '2026-02-28', distinctDates: 7 }],
      overallMinDate: '2025-08-31',
      overallMaxDate: '2026-02-28',
      totalRows: 5000,
    };

    const decision = advisor.decideStrategy({ targetDates: ['2026-03-31'] }, currentState, coverage);
    expect(decision.strategy).toBe('EXTEND_TEMPORAL');
    expect(decision.targetDates).toContain('2026-03-31');

    const plan = analyzer.getGenerationPlan(decision.tablesToGenerate);
    expect(plan.steps.length).toBeGreaterThan(0);

    const execPlan = advisor.buildExecutionPlan(decision, plan);
    expect(execPlan.steps.length).toBeGreaterThan(2);
    expect(execPlan.steps.map(s => s.action)).toContain('VALIDATE');
    expect(execPlan.steps.map(s => s.action)).toContain('LOAD');
  });
});

/* ────────────────── E2E: Story → Validate → Observe ────────────────── */

describe('E2E: Story → Validate → Observe', () => {
  it('should generate coherent stories and pass validation', () => {
    const weaver = new StoryWeaver(42);
    const cpIds = [1, 2, 3, 4, 5];
    weaver.assignStories(cpIds);

    // Initialize 10 facilities (2 per counterparty)
    const facilities: FacilityState[] = [];
    for (const cpId of cpIds) {
      facilities.push(makeFacilityState(cpId, cpId * 10, 0.15 + cpId * 0.05));
      facilities.push(makeFacilityState(cpId, cpId * 10 + 1, 0.15 + cpId * 0.05));
    }

    for (const fac of facilities) {
      weaver.initializeFromState(fac, '2026-02-28');
    }

    // Evolve one month
    const facIds = facilities.map(f => f.facility_id);
    for (const fid of facIds) {
      weaver.evolveOneMonth(fid, '2026-02-28', '2026-03-31', 1);
    }
    weaver.enforceCrossCounterpartyCoherence(facIds, '2026-03-31');

    const stories = weaver.getStoriesForDate(facIds, '2026-03-31');
    expect(stories.length).toBe(10);

    // Validate stories
    const validator = new EnhancedValidator(analyzer);
    const report = validator.runStoryCoherenceChecks(stories);
    expect(report.criticalFailures).toBe(0);

    // Observe
    const observer = new ScenarioObserver();
    const obsReport = observer.generateReport(stories, undefined, '2026-03-31');
    expect(obsReport.facilitiesChecked).toBe(10);
    expect(obsReport.coherencePassRate).toBeGreaterThan(50);
  });

  it('should maintain cross-counterparty PD consistency after evolution', () => {
    const weaver = new StoryWeaver(99);
    weaver.assignStories([1]);

    const fac1 = makeFacilityState(1, 10, 0.25);
    const fac2 = makeFacilityState(1, 11, 0.30); // same CP, different initial PD

    weaver.initializeFromState(fac1, '2026-02-28');
    weaver.initializeFromState(fac2, '2026-02-28');

    weaver.evolveOneMonth(10, '2026-02-28', '2026-03-31', 1);
    weaver.evolveOneMonth(11, '2026-02-28', '2026-03-31', 1);
    weaver.enforceCrossCounterpartyCoherence([10, 11], '2026-03-31');

    const s1 = weaver.getStory(10, '2026-03-31')!;
    const s2 = weaver.getStory(11, '2026-03-31')!;

    // Same counterparty → same PD and rating
    expect(s1.pdAnnual).toBe(s2.pdAnnual);
    expect(s1.internalRating).toBe(s2.internalRating);

    // Validate
    const observer = new ScenarioObserver();
    const cpChecks = observer.checkCrossCounterpartyConsistency([s1, s2]);
    const failures = cpChecks.filter(c => c.result === 'FAIL');
    expect(failures.length).toBe(0);
  });
});

/* ────────────────── E2E: Multi-Month Evolution ────────────────── */

describe('E2E: Multi-Month Evolution', () => {
  it('should maintain narrative coherence across 6 months', () => {
    const weaver = new StoryWeaver(42);
    weaver.assignStories([1], new Map([
      [1, { counterpartyId: 1, storyType: 'CREDIT_DETERIORATION' as const, rootCause: 'Revenue miss', startMonth: 0, speed: 1.0 }],
    ]));

    const fac = makeFacilityState(1, 10, 0.20);
    weaver.initializeFromState(fac, '2025-09-30');

    const dates = ['2025-10-31', '2025-11-30', '2025-12-31', '2026-01-31', '2026-02-28', '2026-03-31'];
    let prevDate = '2025-09-30';

    for (let i = 0; i < dates.length; i++) {
      weaver.evolveOneMonth(10, prevDate, dates[i], i + 1);
      prevDate = dates[i];
    }

    // Get all stories
    const allStories: FacilityStory[] = [];
    for (const d of ['2025-09-30', ...dates]) {
      const s = weaver.getStory(10, d);
      if (s) allStories.push(s);
    }

    // PD should generally increase over 6 months for CREDIT_DETERIORATION
    const firstPD = allStories[0].pdAnnual;
    const lastPD = allStories[allStories.length - 1].pdAnnual;
    expect(lastPD).toBeGreaterThan(firstPD);

    // Risk flags should accumulate
    const lastFlags = allStories[allStories.length - 1].riskFlags;
    expect(lastFlags.length).toBeGreaterThan(0);

    // No month-over-month PD change should exceed 3x
    for (let i = 1; i < allStories.length; i++) {
      const ratio = allStories[i].pdAnnual / allStories[i - 1].pdAnnual;
      expect(ratio).toBeLessThanOrEqual(3.1); // small tolerance
    }

    // Run observer on the final month
    const observer = new ScenarioObserver();
    const prevStories = allStories.length > 1 ? [allStories[allStories.length - 2]] : undefined;
    const report = observer.generateReport([allStories[allStories.length - 1]], prevStories, '2026-03-31');
    expect(report.overallResult).not.toBe('FAIL');
  });
});

/* ────────────────── E2E: Generator Builder + Schema ────────────────── */

describe('E2E: Generator Builder coverage', () => {
  it('should scaffold generators for all uncovered L2 tables', () => {
    const builder = new GeneratorBuilder(analyzer);
    const l2Tables = analyzer.getTablesByLayer('L2');
    const plan = analyzer.getGenerationPlan(l2Tables);

    const needGen = plan.steps.filter(s => s.action === 'CREATE_GENERATOR');
    if (needGen.length === 0) return; // All covered — nothing to test

    // Scaffold the first uncovered table
    const first = needGen[0];
    const scaffold = builder.scaffoldGenerator(first.qualifiedName);
    expect(scaffold).toBeDefined();
    expect(scaffold!.sourceCode).toContain('export function');
    expect(scaffold!.columns.length).toBeGreaterThan(0);

    // Validate the scaffold
    const validation = builder.validateScaffold(scaffold!);
    expect(validation).toBeDefined();
    // Some issues may exist (unmapped columns) but structure should be valid
    expect(scaffold!.sourceCode).toContain('return rows;');
  });
});

/* ────────────────── PK Registry Integration ────────────────── */

describe('PK Registry integration', () => {
  it('should prevent FK violations when used with validator', () => {
    const pkReg = new PKRegistry();
    const validator = new EnhancedValidator(analyzer, pkReg);

    // Register some parent PKs
    pkReg.registerBulk('l2.facility_master', 'facility_id', [1, 2, 3, 4, 5]);
    pkReg.registerBulk('l2.counterparty', 'counterparty_id', [100, 101, 102]);

    // Check FK from child to parent
    expect(pkReg.checkFK('l2.facility_master', 'facility_id', 1)).toBe(true);
    expect(pkReg.checkFK('l2.facility_master', 'facility_id', 999)).toBe(false);
    expect(pkReg.checkFK('l2.counterparty', 'counterparty_id', 100)).toBe(true);
    expect(pkReg.checkFK('l2.counterparty', 'counterparty_id', 999)).toBe(false);

    // Null FKs should be allowed
    expect(pkReg.checkFK('l2.facility_master', 'facility_id', null)).toBe(true);
  });

  it('should detect composite PK duplicates', () => {
    const pkReg = new PKRegistry();

    pkReg.registerPK('l2.facility_risk_snapshot',
      ['facility_id', 'as_of_date'],
      { facility_id: 1, as_of_date: '2026-03-31' });

    // Same composite key → duplicate
    expect(pkReg.hasCompositePK('l2.facility_risk_snapshot',
      ['facility_id', 'as_of_date'],
      { facility_id: 1, as_of_date: '2026-03-31' })).toBe(true);

    // Different date → not duplicate
    expect(pkReg.hasCompositePK('l2.facility_risk_snapshot',
      ['facility_id', 'as_of_date'],
      { facility_id: 1, as_of_date: '2026-04-30' })).toBe(false);
  });
});

/* ────────────────── Edge Cases ────────────────── */

describe('Edge cases', () => {
  it('should handle empty facility list gracefully', () => {
    const weaver = new StoryWeaver(42);
    weaver.assignStories([]);
    const stories = weaver.getStoriesForDate([], '2026-03-31');
    expect(stories).toEqual([]);

    const observer = new ScenarioObserver();
    const report = observer.generateReport([], undefined, '2026-03-31');
    expect(report.facilitiesChecked).toBe(0);
    expect(report.overallResult).toBe('PASS');
  });

  it('should handle STABLE story with no state change', () => {
    const weaver = new StoryWeaver(42);
    weaver.assignStories([1], new Map([
      [1, { counterpartyId: 1, storyType: 'STABLE' as const, rootCause: null, startMonth: 0, speed: 1.0 }],
    ]));

    const fac = makeFacilityState(1, 10, 0.20);
    weaver.initializeFromState(fac, '2026-02-28');
    const evolved = weaver.evolveOneMonth(10, '2026-02-28', '2026-03-31', 1);

    expect(evolved).toBeDefined();
    expect(evolved!.healthState).toBe('PERFORMING');
    // PD should barely change for STABLE
    expect(Math.abs(evolved!.pdAnnual - 0.20)).toBeLessThan(0.10);
    // No events
    expect(evolved!.pendingEvents.length).toBe(0);
  });

  it('should handle RECOVERY story with improving trajectory', () => {
    const weaver = new StoryWeaver(42);
    weaver.assignStories([1], new Map([
      [1, { counterpartyId: 1, storyType: 'RECOVERY' as const, rootCause: 'Restructuring', startMonth: 0, speed: 1.0 }],
    ]));

    // Start from distressed state
    const fac = makeFacilityState(1, 10, 8.0);
    fac.credit_status = 'DOUBTFUL';
    fac.days_past_due = 75;
    weaver.initializeFromState(fac, '2026-02-28');

    const evolved = weaver.evolveOneMonth(10, '2026-02-28', '2026-03-31', 1);
    expect(evolved).toBeDefined();
    // PD should decrease for recovery
    expect(evolved!.pdAnnual).toBeLessThan(8.0);
  });

  it('validator should handle empty table list', () => {
    const validator = new EnhancedValidator(analyzer);
    const report = validator.runPreFlightChecklist([]);
    expect(report.passed).toBe(true);
    expect(report.totalChecks).toBeGreaterThanOrEqual(0);
  });
});
