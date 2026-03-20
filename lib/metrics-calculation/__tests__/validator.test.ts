import { describe, it, expect } from 'vitest';
import {
  normalizeMetric,
  validateMetric,
  parseDimensions,
  parseToggles,
  parseAllowedDimensions,
  parseFormulasByDimension,
  PAGES,
  METRIC_TYPES,
} from '../validator';

// ─── normalizeMetric ──────────────────────────────────────────────────

describe('normalizeMetric', () => {
  it('fills defaults for empty partial', () => {
    const m = normalizeMetric({}, 'C001');
    expect(m.id).toBe('C001');
    expect(m.name).toBe('');
    expect(m.page).toBe('P1');
    expect(m.metricType).toBe('Derived');
    expect(m.sourceFields).toEqual([]);
    expect(m.dimensions).toEqual([]);
  });

  it('preserves valid values', () => {
    const m = normalizeMetric(
      { name: 'DSCR', page: 'P3', metricType: 'Ratio', formula: 'a/b' },
      'C042'
    );
    expect(m.name).toBe('DSCR');
    expect(m.page).toBe('P3');
    expect(m.metricType).toBe('Ratio');
    expect(m.formula).toBe('a/b');
  });

  it('defaults invalid page to P1', () => {
    const m = normalizeMetric({ page: 'INVALID' as any }, 'C001');
    expect(m.page).toBe('P1');
  });

  it('defaults invalid metricType to Derived', () => {
    const m = normalizeMetric({ metricType: 'BOGUS' as any }, 'C001');
    expect(m.metricType).toBe('Derived');
  });

  it('omits empty formulasByDimension', () => {
    const m = normalizeMetric({ formulasByDimension: {} }, 'C001');
    expect(m.formulasByDimension).toBeUndefined();
  });

  it('preserves non-empty formulasByDimension', () => {
    const m = normalizeMetric(
      { formulasByDimension: { facility: { formula: 'SUM(x)' } } },
      'C001'
    );
    expect(m.formulasByDimension).toBeDefined();
    expect(m.formulasByDimension!.facility?.formula).toBe('SUM(x)');
  });
});

// ─── validateMetric ───────────────────────────────────────────────────

describe('validateMetric', () => {
  const validMetric = {
    name: 'Test Metric',
    formula: 'SUM(x)',
    sourceFields: [{ layer: 'L2' as const, table: 'fes', field: 'drawn_amount' }],
  };

  it('accepts a valid metric', () => {
    expect(validateMetric(validMetric).ok).toBe(true);
  });

  it('rejects missing name', () => {
    const r = validateMetric({ ...validMetric, name: '' });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('name');
  });

  it('rejects missing formula', () => {
    const r = validateMetric({ ...validMetric, formula: '' });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('formula');
  });

  it('rejects empty sourceFields', () => {
    const r = validateMetric({ ...validMetric, sourceFields: [] });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('source field');
  });

  it('rejects source field with invalid layer', () => {
    const r = validateMetric({
      ...validMetric,
      sourceFields: [{ layer: 'L3' as any, table: 't', field: 'f' }],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('L1 or L2');
  });

  it('rejects source field missing table', () => {
    const r = validateMetric({
      ...validMetric,
      sourceFields: [{ layer: 'L2' as any, table: '', field: 'f' }],
    });
    expect(r.ok).toBe(false);
  });

  it('rejects invalid page', () => {
    const r = validateMetric({ ...validMetric, page: 'P99' as any });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('page');
  });

  it('rejects invalid metricType', () => {
    const r = validateMetric({ ...validMetric, metricType: 'INVALID' as any });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('metricType');
  });

  // SQL shape validation
  it('rejects formulaSQL that does not start with SELECT', () => {
    const r = validateMetric({ ...validMetric, formulaSQL: 'WITH cte AS (SELECT 1) SELECT 1' });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('SELECT');
  });

  it('rejects multi-statement formulaSQL', () => {
    const r = validateMetric({ ...validMetric, formulaSQL: 'SELECT 1; DROP TABLE t' });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('single SQL statement');
  });

  it('rejects write operations in formulaSQL', () => {
    const r = validateMetric({ ...validMetric, formulaSQL: 'SELECT 1 UNION INSERT INTO t VALUES(1)' });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('read-only');
  });

  // formulasByDimension validation
  it('rejects invalid dimension key', () => {
    const r = validateMetric({
      ...validMetric,
      formulasByDimension: { bogus: { formula: 'SUM(x)' } } as any,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('invalid calculation dimension');
  });

  it('rejects dimension with empty formula', () => {
    const r = validateMetric({
      ...validMetric,
      formulasByDimension: { facility: { formula: '' } },
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('formula is required for dimension');
  });

  it('rejects dimension with invalid SQL', () => {
    const r = validateMetric({
      ...validMetric,
      formulasByDimension: { facility: { formula: 'SUM(x)', formulaSQL: 'DROP TABLE t' } },
    });
    expect(r.ok).toBe(false);
  });
});

// ─── parseDimensions ──────────────────────────────────────────────────

describe('parseDimensions', () => {
  it('parses semicolon-delimited dimensions with interactions', () => {
    const result = parseDimensions('region:FILTER;product:GROUP_BY');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ dimension: 'region', interaction: 'FILTER' });
    expect(result[1]).toEqual({ dimension: 'product', interaction: 'GROUP_BY' });
  });

  it('defaults interaction to FILTER when missing', () => {
    const result = parseDimensions('region');
    expect(result[0].interaction).toBe('FILTER');
  });

  it('returns empty for null/empty input', () => {
    expect(parseDimensions('')).toEqual([]);
    expect(parseDimensions(null as any)).toEqual([]);
  });

  it('filters out empty segments', () => {
    const result = parseDimensions('region;;product:TOGGLE');
    expect(result).toHaveLength(2);
  });
});

// ─── parseToggles ──────────────────────────────────────────────────────

describe('parseToggles', () => {
  it('splits semicolon-delimited toggles', () => {
    expect(parseToggles('abs;pct')).toEqual(['abs', 'pct']);
  });

  it('returns empty for null/empty', () => {
    expect(parseToggles('')).toEqual([]);
    expect(parseToggles(null as any)).toEqual([]);
  });
});

// ─── parseAllowedDimensions ────────────────────────────────────────────

describe('parseAllowedDimensions', () => {
  it('returns valid calculation dimensions', () => {
    const result = parseAllowedDimensions('facility;counterparty');
    expect(result).toBeDefined();
    expect(result).toContain('facility');
    expect(result).toContain('counterparty');
  });

  it('returns undefined for empty input', () => {
    expect(parseAllowedDimensions('')).toBeUndefined();
  });

  it('returns undefined when all dimensions are listed', () => {
    const all = 'facility;counterparty;L1;L2;L3';
    expect(parseAllowedDimensions(all)).toBeUndefined();
  });

  it('filters out invalid dimensions', () => {
    const result = parseAllowedDimensions('facility;BOGUS;counterparty');
    expect(result).toBeDefined();
    expect(result).toHaveLength(2);
  });
});

// ─── parseFormulasByDimension ──────────────────────────────────────────

describe('parseFormulasByDimension', () => {
  it('extracts dimension formulas from row', () => {
    const row = {
      formula: 'base formula',
      formula_facility: 'SUM(x)',
      formulaSQL_facility: 'SELECT SUM(x) FROM t',
    };
    const result = parseFormulasByDimension(row);
    expect(result).toBeDefined();
    expect(result!.facility?.formula).toBe('SUM(x)');
    expect(result!.facility?.formulaSQL).toBe('SELECT SUM(x) FROM t');
  });

  it('returns undefined when no dimension formulas exist', () => {
    const row = { formula: 'base' };
    expect(parseFormulasByDimension(row)).toBeUndefined();
  });

  it('falls back to base formula when dimension formula is empty', () => {
    const row = {
      formula: 'base formula',
      formula_facility: '',
      formulaSQL_facility: 'SELECT 1',
    };
    const result = parseFormulasByDimension(row);
    expect(result?.facility?.formula).toBe('base formula');
  });
});
