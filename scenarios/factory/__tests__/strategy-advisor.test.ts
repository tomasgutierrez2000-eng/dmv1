/**
 * Tests for StrategyAdvisor — strategy decisions and execution plans.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { StrategyAdvisor, type StrategyRequest } from '../strategy-advisor';
import { SchemaAnalyzer } from '../schema-analyzer';
import type { CurrentDBState, TableState } from '../strategy-types';

let advisor: StrategyAdvisor;
let analyzer: SchemaAnalyzer;

beforeAll(() => {
  analyzer = SchemaAnalyzer.create();
  advisor = new StrategyAdvisor(analyzer);
});

/* ────────────────── Helper: mock DB states ────────────────── */

function emptyDBState(): CurrentDBState {
  return { connected: true, tables: [], overallMinDate: null, overallMaxDate: null, totalRows: 0 };
}

function disconnectedState(): CurrentDBState {
  return { connected: false, tables: [], overallMinDate: null, overallMaxDate: null, totalRows: 0 };
}

function populatedDBState(): CurrentDBState {
  const tables: TableState[] = [
    { qualifiedName: 'l2.facility_exposure_snapshot', rowCount: 10000, minDate: '2025-08-31', maxDate: '2026-02-28', distinctDates: 7 },
    { qualifiedName: 'l2.facility_risk_snapshot', rowCount: 10000, minDate: '2025-08-31', maxDate: '2026-02-28', distinctDates: 7 },
  ];
  return {
    connected: true,
    tables,
    overallMinDate: '2025-08-31',
    overallMaxDate: '2026-02-28',
    totalRows: 20000,
  };
}

/* ────────────────── Strategy Decisions ────────────────── */

describe('decideStrategy', () => {
  it('should choose FRESH_START when DB is empty', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy({}, emptyDBState(), coverage);
    expect(decision.strategy).toBe('FRESH_START');
  });

  it('should choose FRESH_START when not connected', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy({}, disconnectedState(), coverage);
    expect(decision.strategy).toBe('FRESH_START');
  });

  it('should choose EXTEND_TEMPORAL when adding new dates', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy(
      { targetDates: ['2026-03-31'] },
      populatedDBState(),
      coverage,
    );
    expect(decision.strategy).toBe('EXTEND_TEMPORAL');
    expect(decision.targetDates).toContain('2026-03-31');
  });

  it('should choose PATCH when dates already exist', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy(
      { targetDates: ['2026-01-31'] }, // within existing range
      populatedDBState(),
      coverage,
    );
    expect(decision.strategy).toBe('PATCH');
  });

  it('should choose SCENARIO_APPEND when scenario ID provided', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy(
      { scenarioId: 'S57' },
      populatedDBState(),
      coverage,
    );
    expect(decision.strategy).toBe('SCENARIO_APPEND');
  });

  it('should honor forceStrategy', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy(
      { forceStrategy: 'FRESH_START' },
      populatedDBState(),
      coverage,
    );
    expect(decision.strategy).toBe('FRESH_START');
    expect(decision.requiresConfirmation).toBe(true);
  });
});

/* ────────────────── Decision Properties ────────────────── */

describe('decision properties', () => {
  it('should require confirmation for FRESH_START with existing data', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy(
      { forceStrategy: 'FRESH_START' },
      populatedDBState(),
      coverage,
    );
    expect(decision.requiresConfirmation).toBe(true);
    expect(decision.confirmationReason).toBeDefined();
    expect(decision.cleanupSQL).toBeDefined();
  });

  it('should not require confirmation for EXTEND_TEMPORAL', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy(
      { targetDates: ['2026-03-31'] },
      populatedDBState(),
      coverage,
    );
    // May require confirmation only if > 50K rows
    if (decision.estimatedRows <= 50000) {
      expect(decision.requiresConfirmation).toBe(false);
    }
  });

  it('should have target dates', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy(
      { targetDates: ['2026-03-31', '2026-04-30'] },
      populatedDBState(),
      coverage,
    );
    expect(decision.targetDates).toEqual(['2026-03-31', '2026-04-30']);
  });

  it('should estimate rows', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy(
      { targetDates: ['2026-03-31'] },
      populatedDBState(),
      coverage,
    );
    expect(decision.estimatedRows).toBeGreaterThan(0);
  });
});

/* ────────────────── Execution Plans ────────────────── */

describe('buildExecutionPlan', () => {
  it('should produce a plan with validate and load steps', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy(
      { targetDates: ['2026-03-31'] },
      populatedDBState(),
      coverage,
    );
    const plan = analyzer.getGenerationPlan(decision.tablesToGenerate);
    const execPlan = advisor.buildExecutionPlan(decision, plan);

    expect(execPlan.steps.length).toBeGreaterThan(0);
    const actions = execPlan.steps.map(s => s.action);
    expect(actions).toContain('VALIDATE');
    expect(actions).toContain('LOAD');
  });

  it('should include CLEANUP step for FRESH_START', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy(
      { forceStrategy: 'FRESH_START' },
      populatedDBState(),
      coverage,
    );
    const plan = analyzer.getGenerationPlan(decision.tablesToGenerate);
    const execPlan = advisor.buildExecutionPlan(decision, plan);

    const actions = execPlan.steps.map(s => s.action);
    expect(actions).toContain('CLEANUP');
  });

  it('should include CREATE_GENERATOR step when gaps exist', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy(
      { targetDates: ['2026-03-31'] },
      populatedDBState(),
      coverage,
    );
    const plan = analyzer.getGenerationPlan(decision.tablesToGenerate);
    const execPlan = advisor.buildExecutionPlan(decision, plan);

    // Should have generator creation step if there are uncovered tables
    if (plan.summary.newGeneratorsNeeded > 0) {
      const actions = execPlan.steps.map(s => s.action);
      expect(actions).toContain('CREATE_GENERATOR');
    }
  });

  it('should have sequential step numbers', () => {
    const coverage = analyzer.analyzeCoverage();
    const decision = advisor.decideStrategy({}, emptyDBState(), coverage);
    const plan = analyzer.getGenerationPlan(decision.tablesToGenerate);
    const execPlan = advisor.buildExecutionPlan(decision, plan);

    for (let i = 0; i < execPlan.steps.length; i++) {
      expect(execPlan.steps[i].step).toBe(i + 1);
    }
  });
});
