import { describe, it, expect } from 'vitest';
import {
  generateDateGrid, frequencyToDt, interpolateArcValue,
  getMonth, monthsBetween,
} from '../v2/time-series';

describe('generateDateGrid', () => {
  it('generates weekly dates (Fridays)', () => {
    const dates = generateDateGrid({
      start_date: '2025-01-01',
      end_date: '2025-02-01',
      frequency: 'WEEKLY',
    });
    expect(dates.length).toBeGreaterThan(0);
    // All dates should be Fridays
    for (const d of dates) {
      const day = new Date(d + 'T00:00:00Z').getUTCDay();
      expect(day).toBe(5); // Friday
    }
  });

  it('generates monthly dates (last business day)', () => {
    const dates = generateDateGrid({
      start_date: '2025-01-01',
      end_date: '2025-06-30',
      frequency: 'MONTHLY',
    });
    expect(dates.length).toBe(6);
    // All should be weekdays
    for (const d of dates) {
      const day = new Date(d + 'T00:00:00Z').getUTCDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
  });

  it('generates quarterly dates', () => {
    const dates = generateDateGrid({
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      frequency: 'QUARTERLY',
    });
    expect(dates.length).toBe(4);
  });

  it('uses snapshot_dates when provided', () => {
    const dates = generateDateGrid({
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      frequency: 'WEEKLY',
      snapshot_dates: ['2025-03-15', '2025-06-15', '2025-09-15'],
    });
    expect(dates).toEqual(['2025-03-15', '2025-06-15', '2025-09-15']);
  });

  it('throws when start > end', () => {
    expect(() => generateDateGrid({
      start_date: '2025-12-31',
      end_date: '2025-01-01',
      frequency: 'WEEKLY',
    })).toThrow();
  });
});

describe('frequencyToDt', () => {
  it('returns correct dt for each frequency', () => {
    expect(frequencyToDt('DAILY')).toBeCloseTo(1/252, 6);
    expect(frequencyToDt('WEEKLY')).toBeCloseTo(7/365, 6);
    expect(frequencyToDt('BIWEEKLY')).toBeCloseTo(14/365, 6);
    expect(frequencyToDt('MONTHLY')).toBeCloseTo(30/365, 6);
    expect(frequencyToDt('QUARTERLY')).toBeCloseTo(91/365, 6);
  });
});

describe('interpolateArcValue', () => {
  const dates = ['2025-01-31', '2025-02-28', '2025-03-31', '2025-04-30', '2025-05-30'];
  const arcValues = [0.4, 0.5, 0.6, 0.7, 0.8];

  it('returns exact value when dates.length == arcValues.length', () => {
    expect(interpolateArcValue('2025-01-31', dates, arcValues)).toBe(0.4);
    expect(interpolateArcValue('2025-03-31', dates, arcValues)).toBe(0.6);
    expect(interpolateArcValue('2025-05-30', dates, arcValues)).toBe(0.8);
  });

  it('returns first value for unknown date', () => {
    expect(interpolateArcValue('2099-01-01', dates, arcValues)).toBe(0.4);
  });

  it('interpolates for longer date grids', () => {
    const longDates = Array.from({ length: 20 }, (_, i) => `2025-${String(i+1).padStart(2, '0')}-15`);
    // Midpoint interpolation
    const mid = interpolateArcValue(longDates[10], longDates, arcValues);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.8);
  });
});

describe('getMonth', () => {
  it('returns correct month (1-12)', () => {
    expect(getMonth('2025-01-15')).toBe(1);
    expect(getMonth('2025-06-30')).toBe(6);
    expect(getMonth('2025-12-31')).toBe(12);
  });
});

describe('monthsBetween', () => {
  it('returns positive months for future date', () => {
    const months = monthsBetween('2025-01-01', '2025-07-01');
    expect(months).toBeCloseTo(6, 0);
  });

  it('returns 0 for same date', () => {
    expect(monthsBetween('2025-06-15', '2025-06-15')).toBe(0);
  });

  it('returns negative for past date', () => {
    const months = monthsBetween('2025-07-01', '2025-01-01');
    expect(months).toBeLessThan(0);
  });
});
