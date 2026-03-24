import { describe, it, expect } from 'vitest';
import { resolveFormulaForDimension } from '../formula-resolver';
import type { L3Metric } from '@/data/l3-metrics';

function makeMetric(overrides: Partial<L3Metric> = {}): L3Metric {
  return {
    id: 'C001',
    name: 'Test',
    page: 'P1',
    section: '',
    metricType: 'Ratio',
    formula: 'base formula',
    formulaSQL: 'SELECT base',
    description: '',
    displayFormat: '',
    sampleValue: '',
    sourceFields: [],
    dimensions: [],
    ...overrides,
  } as L3Metric;
}

describe('resolveFormulaForDimension', () => {
  it('priority 1: returns metric-dimension override when available', () => {
    const m = makeMetric({
      formulasByDimension: {
        facility: { formula: 'dim formula', formulaSQL: 'SELECT dim' },
      },
    });
    const result = resolveFormulaForDimension(m, 'facility');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('metric-dimension');
    expect(result!.formulaSQL).toBe('SELECT dim');
  });

  it('priority 1: uses base formula when dimension override has only SQL', () => {
    const m = makeMetric({
      formulasByDimension: {
        facility: { formula: '', formulaSQL: 'SELECT dim_sql' },
      },
    });
    const result = resolveFormulaForDimension(m, 'facility');
    expect(result!.source).toBe('metric-dimension');
    expect(result!.formula).toBe('base formula');
    expect(result!.formulaSQL).toBe('SELECT dim_sql');
  });

  it('priority 2: falls back to metric base formula', () => {
    const m = makeMetric();
    const result = resolveFormulaForDimension(m, 'facility');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('metric-base');
    expect(result!.formula).toBe('base formula');
    expect(result!.formulaSQL).toBe('SELECT base');
  });

  it('returns null when no formula exists at any level', () => {
    const m = makeMetric({ formula: '', formulaSQL: '' });
    const result = resolveFormulaForDimension(m, 'facility');
    expect(result).toBeNull();
  });

  it('prefers dimension override over base formula', () => {
    const m = makeMetric({
      formulasByDimension: {
        counterparty: { formula: 'dim override', formulaSQL: 'SELECT override' },
      },
    });
    const result = resolveFormulaForDimension(m, 'counterparty');
    expect(result!.source).toBe('metric-dimension');
    expect(result!.formulaSQL).toBe('SELECT override');
  });

  it('ignores dimension override with only whitespace', () => {
    const m = makeMetric({
      formulasByDimension: {
        facility: { formula: '  ', formulaSQL: '  ' },
      },
    });
    const result = resolveFormulaForDimension(m, 'facility');
    expect(result!.source).toBe('metric-base');
  });

  it('returns base formula for dimension without override', () => {
    const m = makeMetric({
      formulasByDimension: {
        facility: { formula: 'fac formula', formulaSQL: 'SELECT fac' },
      },
    });
    // Ask for 'counterparty' which has no override
    const result = resolveFormulaForDimension(m, 'counterparty');
    expect(result!.source).toBe('metric-base');
    expect(result!.formulaSQL).toBe('SELECT base');
  });
});
