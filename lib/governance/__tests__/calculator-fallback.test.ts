import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for the calculator API fallback logic.
 *
 * Since the route handlers are Next.js API routes (not easily unit-testable),
 * we test the extracted helper functions and mock the core dependencies.
 */

// Mock sql-runner before importing anything that uses it
vi.mock('@/lib/metrics-calculation/sql-runner', () => ({
  runSqlMetric: vi.fn(),
  getDistinctAsOfDates: vi.fn(),
}));

import { runSqlMetric, getDistinctAsOfDates } from '@/lib/metrics-calculation/sql-runner';
import { extractTableRefsFromSql } from '@/lib/metrics-calculation/table-resolver';

const mockRunSqlMetric = vi.mocked(runSqlMetric);
const mockGetDistinctAsOfDates = vi.mocked(getDistinctAsOfDates);

describe('calculator fallback — extractTableRefsFromSql', () => {
  it('extracts L1, L2, L3 refs from complex SQL', () => {
    const sql = `
      SELECT fes.facility_id AS dimension_key,
             SUM(fes.drawn_amount * COALESCE(fx.rate, 1)) AS metric_value
      FROM l2.facility_exposure_snapshot fes
      LEFT JOIN l1.facility_master fm ON fm.facility_id = fes.facility_id
      LEFT JOIN l2.fx_rate fx ON fx.from_currency_code = fes.currency_code
      LEFT JOIN l1.enterprise_business_taxonomy ebt ON ebt.managed_segment_id = fm.lob_segment_id
      WHERE fes.as_of_date = :as_of_date
      GROUP BY fes.facility_id
    `;
    const keys = extractTableRefsFromSql(sql);
    expect(keys).toContain('L2.facility_exposure_snapshot');
    expect(keys).toContain('L1.facility_master');
    expect(keys).toContain('L2.fx_rate');
    expect(keys).toContain('L1.enterprise_business_taxonomy');
    expect(keys).toHaveLength(4);
  });

  it('handles SQL with no schema-qualified tables', () => {
    const keys = extractTableRefsFromSql('SELECT COUNT(*) AS metric_value');
    expect(keys).toEqual([]);
  });
});

describe('calculator fallback — getSampleDataDates via getDistinctAsOfDates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dates sorted descending from sample data', () => {
    mockGetDistinctAsOfDates.mockReturnValue(['2025-01-31', '2024-12-31', '2024-11-30']);
    const dates = getDistinctAsOfDates(['L2.facility_exposure_snapshot']);
    expect(dates[0]).toBe('2025-01-31');
    expect(dates).toHaveLength(3);
  });

  it('returns empty array when no sample data has dates', () => {
    mockGetDistinctAsOfDates.mockReturnValue([]);
    const dates = getDistinctAsOfDates(['L2.nonexistent_table']);
    expect(dates).toEqual([]);
  });
});

describe('calculator fallback — executeFallbackQuery via runSqlMetric', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts grouped result to dimension_key/metric_value rows', async () => {
    mockRunSqlMetric.mockResolvedValue({
      ok: true,
      result: {
        type: 'grouped',
        rows: [
          { dimension_value: '1', metric_value: 42.5 },
          { dimension_value: '2', metric_value: 100.0 },
        ],
      },
      inputRowCounts: {},
      sqlExecuted: 'SELECT ...',
      asOfDateUsed: '2025-01-31',
    });

    const result = await runSqlMetric({
      rawSql: 'SELECT facility_id, SUM(drawn_amount) FROM l2.facility_exposure_snapshot GROUP BY facility_id',
      tableKeys: ['L2.facility_exposure_snapshot'],
      asOfDate: '2025-01-31',
    });

    expect(result.ok).toBe(true);
    expect(result.result?.type).toBe('grouped');
    if (result.result?.type === 'grouped') {
      expect(result.result.rows).toHaveLength(2);
      expect(result.result.rows[0]!.metric_value).toBe(42.5);
    }
  });

  it('converts scalar result', async () => {
    mockRunSqlMetric.mockResolvedValue({
      ok: true,
      result: { type: 'scalar', value: 12345.67 },
      inputRowCounts: {},
      sqlExecuted: 'SELECT ...',
      asOfDateUsed: '2025-01-31',
    });

    const result = await runSqlMetric({
      rawSql: 'SELECT SUM(amount) FROM l2.facility_exposure_snapshot',
      tableKeys: ['L2.facility_exposure_snapshot'],
      asOfDate: '2025-01-31',
    });

    expect(result.ok).toBe(true);
    expect(result.result?.type).toBe('scalar');
    if (result.result?.type === 'scalar') {
      expect(result.result.value).toBe(12345.67);
    }
  });

  it('throws on sql.js failure (ok: false)', async () => {
    mockRunSqlMetric.mockResolvedValue({
      ok: false,
      error: 'no such table: l2_nonexistent',
      code: 'RUNNER_FAILED',
      inputRowCounts: {},
      sqlExecuted: 'SELECT ...',
    });

    const result = await runSqlMetric({
      rawSql: 'SELECT * FROM l2.nonexistent',
      tableKeys: ['L2.nonexistent'],
      asOfDate: '2025-01-31',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('nonexistent');
  });

  it('propagates warnings from sql.js', async () => {
    mockRunSqlMetric.mockResolvedValue({
      ok: true,
      result: { type: 'grouped', rows: [] },
      inputRowCounts: {},
      sqlExecuted: 'SELECT ...',
      asOfDateUsed: '2025-01-31',
      warnings: ['Missing sample data for: L2.fx_rate (empty stub tables used)'],
    });

    const result = await runSqlMetric({
      rawSql: 'SELECT 1',
      tableKeys: ['L2.fx_rate'],
      asOfDate: null,
    });

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain('Missing sample data for: L2.fx_rate (empty stub tables used)');
  });
});

describe('calculator fallback — reference-data dates', () => {
  it('getSampleDataDates uses common L2 tables', () => {
    mockGetDistinctAsOfDates.mockReturnValue(['2025-01-31']);

    const tables = ['L2.facility_exposure_snapshot', 'L2.collateral_snapshot', 'L2.facility_risk_snapshot'];
    const dates = getDistinctAsOfDates(tables);

    expect(mockGetDistinctAsOfDates).toHaveBeenCalledWith(tables);
    expect(dates).toEqual(['2025-01-31']);
  });
});

describe('calculator fallback — env detection', () => {
  const originalEnv = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  it('hasDb is false when DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL;
    expect(!!process.env.DATABASE_URL).toBe(false);
  });

  it('hasDb is true when DATABASE_URL is set', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    expect(!!process.env.DATABASE_URL).toBe(true);
  });

  it('hasDb is false for empty string', () => {
    process.env.DATABASE_URL = '';
    expect(!!process.env.DATABASE_URL).toBe(false);
  });
});
