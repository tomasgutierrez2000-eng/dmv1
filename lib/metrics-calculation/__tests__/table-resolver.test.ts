import { describe, it, expect, vi } from 'vitest';
import { getTableKeysForMetric } from '../table-resolver';
import type { L3Metric } from '@/data/l3-metrics';

// Mock formula-resolver to return controlled SQL
vi.mock('../formula-resolver', () => ({
  resolveFormulaForDimension: vi.fn((_metric, _dim) => {
    return {
      formula: 'test',
      formulaSQL: `SELECT * FROM l2.facility_exposure_snapshot fes
        LEFT JOIN l2.facility_master fm ON fm.facility_id = fes.facility_id
        LEFT JOIN l2.counterparty c ON c.counterparty_id = fm.counterparty_id`,
      source: 'metric-base',
    };
  }),
}));

function makeMetric(overrides: Partial<L3Metric> = {}): L3Metric {
  return {
    id: 'C001',
    name: 'Test',
    page: 'P1',
    section: '',
    metricType: 'Ratio',
    formula: 'SUM(x)',
    formulaSQL: 'SELECT 1',
    description: '',
    displayFormat: '',
    sampleValue: '',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount', description: '' },
    ],
    dimensions: [],
    ...overrides,
  } as L3Metric;
}

describe('getTableKeysForMetric', () => {
  it('extracts tables from sourceFields', () => {
    const m = makeMetric();
    const keys = getTableKeysForMetric(m, 'facility');
    expect(keys).toContain('L2.facility_exposure_snapshot');
  });

  it('extracts tables from formula SQL via regex', () => {
    const m = makeMetric();
    const keys = getTableKeysForMetric(m, 'facility');
    expect(keys).toContain('L2.facility_master');
    expect(keys).toContain('L2.counterparty');
  });

  it('deduplicates table keys', () => {
    const m = makeMetric();
    const keys = getTableKeysForMetric(m, 'facility');
    const fesCount = keys.filter(k => k === 'L2.facility_exposure_snapshot').length;
    expect(fesCount).toBe(1);
  });

  it('handles metric with no sourceFields', () => {
    const m = makeMetric({ sourceFields: [] });
    const keys = getTableKeysForMetric(m, 'facility');
    // Still extracts from SQL
    expect(keys.length).toBeGreaterThan(0);
  });
});
