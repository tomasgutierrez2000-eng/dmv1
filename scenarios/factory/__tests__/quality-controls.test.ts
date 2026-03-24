import { describe, it, expect } from 'vitest';
import { stdev, sampleRows, merge, extractNumericField } from '../quality-controls/shared-types';

describe('stdev', () => {
  it('returns 0 for empty array', () => {
    expect(stdev([])).toBe(0);
  });

  it('returns 0 for single element', () => {
    expect(stdev([42])).toBe(0);
  });

  it('returns 0 for identical values', () => {
    expect(stdev([5, 5, 5, 5, 5])).toBe(0);
  });

  it('computes correct value for known data', () => {
    // Sample: [2, 4, 4, 4, 5, 5, 7, 9]
    // Mean = 5, variance = 4.571..., stdev = 2.138...
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    const result = stdev(values);
    expect(result).toBeCloseTo(2.138, 2);
  });

  it('handles two elements', () => {
    // [0, 10]: mean=5, variance=(25+25)/1=50, stdev=sqrt(50)=7.071
    expect(stdev([0, 10])).toBeCloseTo(7.071, 2);
  });
});

describe('sampleRows', () => {
  it('returns all rows when count <= max', () => {
    const rows = [{ a: 1 }, { a: 2 }, { a: 3 }];
    expect(sampleRows(rows, 5)).toEqual(rows);
    expect(sampleRows(rows, 3)).toEqual(rows);
  });

  it('returns at most max rows', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ a: i }));
    const sampled = sampleRows(rows, 10);
    expect(sampled.length).toBeLessThanOrEqual(10);
  });

  it('returns empty for empty input', () => {
    expect(sampleRows([], 10)).toEqual([]);
  });

  it('samples evenly across the array', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ idx: i }));
    const sampled = sampleRows(rows, 10);
    // First element should be the first row
    expect((sampled[0] as any).idx).toBe(0);
    // Should include elements from throughout the array
    const lastSampled = (sampled[sampled.length - 1] as any).idx;
    expect(lastSampled).toBeGreaterThan(50);
  });
});

describe('merge', () => {
  it('combines errors and warnings from multiple results', () => {
    const r1 = { errors: ['err1'], warnings: ['warn1'] };
    const r2 = { errors: ['err2'], warnings: [] };
    const r3 = { errors: [], warnings: ['warn2', 'warn3'] };
    const merged = merge(r1, r2, r3);
    expect(merged.errors).toEqual(['err1', 'err2']);
    expect(merged.warnings).toEqual(['warn1', 'warn2', 'warn3']);
  });

  it('handles empty inputs', () => {
    const merged = merge(
      { errors: [], warnings: [] },
      { errors: [], warnings: [] },
    );
    expect(merged.errors).toEqual([]);
    expect(merged.warnings).toEqual([]);
  });

  it('handles single input', () => {
    const merged = merge({ errors: ['a'], warnings: ['b'] });
    expect(merged.errors).toEqual(['a']);
    expect(merged.warnings).toEqual(['b']);
  });
});

describe('extractNumericField', () => {
  it('extracts numeric values for a field', () => {
    const rows = [
      { amount: 100, name: 'a' },
      { amount: 200, name: 'b' },
      { amount: 300, name: 'c' },
    ];
    expect(extractNumericField(rows, 'amount')).toEqual([100, 200, 300]);
  });

  it('filters out null and undefined values', () => {
    const rows = [
      { amount: 100 },
      { amount: null },
      { amount: undefined },
      { amount: 200 },
    ];
    expect(extractNumericField(rows, 'amount')).toEqual([100, 200]);
  });

  it('filters out non-numeric values', () => {
    const rows = [
      { amount: 100 },
      { amount: 'not a number' },
      { amount: 200 },
    ];
    expect(extractNumericField(rows, 'amount')).toEqual([100, 200]);
  });

  it('returns empty array when field does not exist', () => {
    const rows = [{ other: 100 }];
    expect(extractNumericField(rows, 'amount')).toEqual([]);
  });

  it('returns empty array for empty rows', () => {
    expect(extractNumericField([], 'amount')).toEqual([]);
  });
});
