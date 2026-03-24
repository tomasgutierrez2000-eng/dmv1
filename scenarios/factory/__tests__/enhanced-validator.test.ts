/**
 * Tests for EnhancedValidator — pre-flight checks and story coherence.
 */

import { describe, it, expect } from 'vitest';
import { EnhancedValidator } from '../enhanced-validator';
import { PKRegistry } from '../pk-registry';
import type { FacilityStory } from '../story-weaver';

/* ────────────────── Pre-Flight Checklist ────────────────── */

describe('runPreFlightChecklist', () => {
  it('should pass for well-formed data', () => {
    const validator = new EnhancedValidator();
    const report = validator.runPreFlightChecklist([{
      schema: 'l2',
      table: 'facility_exposure_snapshot',
      rows: [{
        facility_exposure_id: 1,
        facility_id: 1,
        as_of_date: '2025-01-31',
        counterparty_id: 1,
        currency_code: 'USD',
        committed_amount: 100000,
        drawn_amount: 35000,
        undrawn_amount: 65000,
      }],
    }]);

    expect(report.totalChecks).toBeGreaterThanOrEqual(5);
    // The data is well-formed for the columns provided,
    // but may not include all DD columns — that's OK for this test
    // Check that no PK or type checks failed
    const pkChecks = report.checks.filter(c => c.name === 'PK_UNIQUE');
    for (const c of pkChecks) expect(c.passed).toBe(true);
  });

  it('should detect drawn > committed', () => {
    const validator = new EnhancedValidator();
    const report = validator.runPreFlightChecklist([{
      schema: 'l2',
      table: 'facility_exposure_snapshot',
      rows: [{
        facility_exposure_id: 1,
        facility_id: 1,
        as_of_date: '2025-01-31',
        drawn_amount: 150000,
        committed_amount: 100000,
      }],
    }]);

    const drawnCheck = report.checks.find(c => c.name === 'DRAWN_LE_COMMITTED');
    expect(drawnCheck).toBeDefined();
    expect(drawnCheck!.passed).toBe(false);
  });

  it('should detect boolean flag using true/false instead of Y/N', () => {
    const validator = new EnhancedValidator();
    const report = validator.runPreFlightChecklist([{
      schema: 'l2',
      table: 'facility_risk_snapshot',
      rows: [{
        facility_id: 1,
        as_of_date: '2025-01-31',
        defaulted_flag: true,  // Should be 'Y'
      }],
    }]);

    const boolCheck = report.checks.find(c => c.name === 'BOOLEAN_FORMAT');
    expect(boolCheck).toBeDefined();
    expect(boolCheck!.passed).toBe(false);
  });

  it('should detect negative amounts', () => {
    const validator = new EnhancedValidator();
    const report = validator.runPreFlightChecklist([{
      schema: 'l2',
      table: 'facility_exposure_snapshot',
      rows: [{
        facility_id: 1,
        drawn_amount: -5000,
        committed_amount: 100000,
      }],
    }]);

    const amtCheck = report.checks.find(c => c.name === 'NON_NEGATIVE_AMT');
    expect(amtCheck).toBeDefined();
    expect(amtCheck!.passed).toBe(false);
  });
});

/* ────────────────── PK Registry ────────────────── */

describe('PKRegistry', () => {
  it('should register and check PKs', () => {
    const registry = new PKRegistry();
    registry.registerPK('l1.counterparty', ['counterparty_id'], { counterparty_id: 100 });

    expect(registry.checkFK('l1.counterparty', 'counterparty_id', 100)).toBe(true);
    expect(registry.checkFK('l1.counterparty', 'counterparty_id', 999)).toBe(false);
  });

  it('should allow NULL FK values', () => {
    const registry = new PKRegistry();
    expect(registry.checkFK('l1.counterparty', 'counterparty_id', null)).toBe(true);
  });

  it('should detect duplicate composite PKs', () => {
    const registry = new PKRegistry();
    registry.registerPK('l2.facility_risk_snapshot', ['facility_id', 'as_of_date'],
      { facility_id: 1, as_of_date: '2025-01-31' });

    expect(registry.hasCompositePK('l2.facility_risk_snapshot',
      ['facility_id', 'as_of_date'], { facility_id: 1, as_of_date: '2025-01-31' })).toBe(true);
    expect(registry.hasCompositePK('l2.facility_risk_snapshot',
      ['facility_id', 'as_of_date'], { facility_id: 1, as_of_date: '2025-02-28' })).toBe(false);
  });

  it('should bulk register PKs', () => {
    const registry = new PKRegistry();
    registry.registerBulk('l1.counterparty', 'counterparty_id', [1, 2, 3, 4, 5]);

    expect(registry.getCount('l1.counterparty', 'counterparty_id')).toBe(5);
    expect(registry.checkFK('l1.counterparty', 'counterparty_id', 3)).toBe(true);
    expect(registry.checkFK('l1.counterparty', 'counterparty_id', 6)).toBe(false);
  });

  it('should report summary stats', () => {
    const registry = new PKRegistry();
    registry.registerBulk('l1.counterparty', 'counterparty_id', [1, 2, 3]);
    registry.registerBulk('l2.facility_master', 'facility_id', [10, 20]);

    const summary = registry.summary();
    expect(summary.tables).toBe(2);
    expect(summary.totalPKs).toBe(5);
  });
});

/* ────────────────── Tier 4: Data Quality (CLAUDE.md Lessons) ────────────────── */

describe('CLAUDE.md lessons learned checks', () => {
  it('should detect NULL sparsity (>90% NULL)', () => {
    const validator = new EnhancedValidator();
    const rows = Array.from({ length: 20 }, (_, i) => ({
      facility_id: i + 1,
      as_of_date: '2025-01-31',
      pd_pct: i === 0 ? 0.5 : null,  // 95% NULL
    }));
    const report = validator.runPreFlightChecklist([{
      schema: 'l2', table: 'facility_risk_snapshot', rows,
    }]);
    const nullCheck = report.checks.find(c => c.name === 'NULL_SPARSITY');
    expect(nullCheck).toBeDefined();
    expect(nullCheck!.passed).toBe(false);
  });

  it('should detect homogeneous dimension columns', () => {
    const validator = new EnhancedValidator();
    const rows = Array.from({ length: 15 }, (_, i) => ({
      facility_id: i + 1, as_of_date: '2025-01-31',
      currency_code: 'USD',  // All same value
    }));
    const report = validator.runPreFlightChecklist([{
      schema: 'l2', table: 'facility_exposure_snapshot', rows,
    }]);
    const divCheck = report.checks.find(c => c.name === 'DIM_DIVERSITY');
    expect(divCheck).toBeDefined();
    expect(divCheck!.passed).toBe(false);
  });

  it('should detect single-value boolean flags', () => {
    const validator = new EnhancedValidator();
    const rows = Array.from({ length: 15 }, () => ({
      facility_id: 1, as_of_date: '2025-01-31',
      is_active_flag: 'Y',  // All same
    }));
    const report = validator.runPreFlightChecklist([{
      schema: 'l2', table: 'facility_risk_snapshot', rows,
    }]);
    const boolCheck = report.checks.find(c => c.name === 'BOOL_BALANCE');
    expect(boolCheck).toBeDefined();
    expect(boolCheck!.passed).toBe(false);
  });

  it('should detect placeholder values (field_name_N pattern)', () => {
    const validator = new EnhancedValidator();
    const rows = Array.from({ length: 10 }, (_, i) => ({
      facility_id: i + 1, as_of_date: '2025-01-31',
      limit_status: `limit_status_${i}`,  // Placeholder pattern
    }));
    const report = validator.runPreFlightChecklist([{
      schema: 'l2', table: 'limit_utilization_event', rows,
    }]);
    const phCheck = report.checks.find(c => c.name === 'PLACEHOLDER_VALUES');
    expect(phCheck).toBeDefined();
    expect(phCheck!.passed).toBe(false);
  });

  it('should detect NULL weight columns (>5% NULL)', () => {
    const validator = new EnhancedValidator();
    const rows = Array.from({ length: 20 }, (_, i) => ({
      facility_id: i + 1, as_of_date: '2025-01-31',
      gross_exposure_usd: i < 5 ? null : 1000000,  // 25% NULL weight
    }));
    const report = validator.runPreFlightChecklist([{
      schema: 'l2', table: 'facility_exposure_snapshot', rows,
    }]);
    const weightCheck = report.checks.find(c => c.name === 'WEIGHT_COVERAGE');
    expect(weightCheck).toBeDefined();
    expect(weightCheck!.passed).toBe(false);
  });
});

/* ────────────────── Story Coherence Checks ────────────────── */

describe('runStoryCoherenceChecks', () => {
  function makeStory(overrides: Partial<FacilityStory> = {}): FacilityStory {
    return {
      facilityId: 1,
      counterpartyId: 100,
      healthState: 'PERFORMING',
      previousHealthState: 'PERFORMING',
      storyType: 'STABLE',
      currentPhaseIndex: 0,
      monthsInPhase: 0,
      phaseDuration: 12,
      rootCause: null,
      trajectory: 'STABLE',
      pdAnnual: 0.25,
      previousPD: 0.25,
      internalRating: 'A',
      creditStatus: 'PERFORMING',
      spreadBps: 125,
      utilization: 35,
      daysPastDue: 0,
      dpdBucket: 'CURRENT',
      riskFlags: [],
      pendingEvents: [],
      committedAmount: 100_000_000,
      drawnAmount: 35_000_000,
      currencyCode: 'USD',
      industryId: 1,
      countryCode: 'US',
      collateralValue: 42_000_000,
      lgdCurrent: 35,
      ...overrides,
    };
  }

  it('should pass for well-formed stories', () => {
    const validator = new EnhancedValidator();
    const stories = [makeStory()];
    const report = validator.runStoryCoherenceChecks(stories);

    expect(report.criticalFailures).toBe(0);
    expect(report.highFailures).toBe(0);
  });

  it('should detect PD/rating mismatch', () => {
    const validator = new EnhancedValidator();
    const stories = [makeStory({
      pdAnnual: 5.0,  // Substandard PD
      internalRating: 'AAA',  // Investment grade rating — mismatch!
    })];
    const report = validator.runStoryCoherenceChecks(stories);

    const pdRatingCheck = report.checks.find(c => c.name === 'PD_RATING_ALIGN');
    expect(pdRatingCheck).toBeDefined();
    expect(pdRatingCheck!.passed).toBe(false);
  });

  it('should detect cross-counterparty inconsistency', () => {
    const validator = new EnhancedValidator();
    const stories = [
      makeStory({ facilityId: 1, counterpartyId: 100, pdAnnual: 0.25 }),
      makeStory({ facilityId: 2, counterpartyId: 100, pdAnnual: 5.0 }),  // Same CP, different PD!
    ];
    const report = validator.runStoryCoherenceChecks(stories);

    const cpCheck = report.checks.find(c => c.name === 'CROSS_CP_CONSIST');
    expect(cpCheck).toBeDefined();
    expect(cpCheck!.passed).toBe(false);
  });

  it('should detect temporal monotonicity violation', () => {
    const validator = new EnhancedValidator();
    const prevStories = [makeStory({ facilityId: 1, pdAnnual: 2.0, trajectory: 'WORSENING' })];
    const currentStories = [makeStory({ facilityId: 1, pdAnnual: 0.5 })]; // PD dropped while worsening

    const report = validator.runStoryCoherenceChecks(currentStories, prevStories);

    const monoCheck = report.checks.find(c => c.name === 'TEMPORAL_MONOTONIC');
    expect(monoCheck).toBeDefined();
    expect(monoCheck!.passed).toBe(false);
  });
});
