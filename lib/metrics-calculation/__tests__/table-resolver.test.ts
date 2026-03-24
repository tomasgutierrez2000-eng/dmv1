import { describe, it, expect, vi } from 'vitest';
import { extractTableRefsFromSql, getTableKeysForMetric } from '../table-resolver';
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

describe('extractTableRefsFromSql', () => {
  it('extracts L1 and L2 table references', () => {
    const sql = 'SELECT * FROM l2.facility_exposure_snapshot fes JOIN l1.facility_master fm ON fm.facility_id = fes.facility_id';
    const keys = extractTableRefsFromSql(sql);
    expect(keys).toContain('L2.facility_exposure_snapshot');
    expect(keys).toContain('L1.facility_master');
  });

  it('extracts L3 table references', () => {
    const sql = 'SELECT * FROM l3.exposure_metric_cube emc JOIN l2.facility_risk_snapshot frs ON frs.facility_id = emc.facility_id';
    const keys = extractTableRefsFromSql(sql);
    expect(keys).toContain('L3.exposure_metric_cube');
    expect(keys).toContain('L2.facility_risk_snapshot');
  });

  it('deduplicates via Set', () => {
    const sql = 'SELECT l2.facility_master.facility_id, l2.facility_master.counterparty_id FROM l2.facility_master';
    const keys = extractTableRefsFromSql(sql);
    expect(keys.filter(k => k === 'L2.facility_master')).toHaveLength(1);
  });

  it('returns empty array for SQL with no table refs', () => {
    const keys = extractTableRefsFromSql('SELECT 1 + 1 AS result');
    expect(keys).toEqual([]);
  });

  it('is case-insensitive on schema prefix', () => {
    const sql = 'SELECT * FROM L1.currency_dim cd JOIN L2.fx_rate fx ON fx.from_currency_code = cd.currency_code';
    const keys = extractTableRefsFromSql(sql);
    expect(keys).toContain('L1.currency_dim');
    expect(keys).toContain('L2.fx_rate');
  });
});
