import { describe, it, expect, vi } from 'vitest';
import { resolveFormulaForDimension } from '../formula-resolver';
import type { L3Metric } from '@/data/l3-metrics';

// Mock the legacy fallback module
vi.mock('@/data/metrics_dimensions_filled', () => ({
  getFormulaForDimension: vi.fn((metricId: string, dimension: string) => {
    if (metricId === 'C001' && dimension === 'counterparty') {
      return { formula: 'legacy formula', formulaSQL: 'SELECT legacy' };
    }
    return null;
  }),
}));

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

  it('priority 2: falls back to legacy when allowLegacyFallback=true', () => {
    const m = makeMetric();
    const result = resolveFormulaForDimension(m, 'counterparty', { allowLegacyFallback: true });
    expect(result).not.toBeNull();
    expect(result!.source).toBe('legacy-fallback');
    expect(result!.formulaSQL).toBe('SELECT legacy');
  });

  it('priority 2: skips legacy when allowLegacyFallback is false/missing', () => {
    const m = makeMetric();
    const result = resolveFormulaForDimension(m, 'counterparty');
    // Should fall through to metric-base, not legacy
    expect(result!.source).toBe('metric-base');
  });

  it('priority 3: falls back to metric base formula', () => {
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

  it('prefers dimension override over legacy even when legacy exists', () => {
    const m = makeMetric({
      formulasByDimension: {
        counterparty: { formula: 'dim override', formulaSQL: 'SELECT override' },
      },
    });
    const result = resolveFormulaForDimension(m, 'counterparty', { allowLegacyFallback: true });
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
});
