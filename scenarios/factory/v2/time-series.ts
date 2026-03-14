/**
 * Time series date grid generator.
 *
 * Replaces the fixed 3-date `timeline.as_of_dates` with a configurable
 * date grid supporting daily, weekly, biweekly, monthly, and quarterly
 * frequencies. Default: WEEKLY.
 *
 * Generates business-day-aligned dates:
 *   - DAILY: every weekday
 *   - WEEKLY: every Friday (end-of-week snapshot)
 *   - BIWEEKLY: every other Friday
 *   - MONTHLY: last business day of month
 *   - QUARTERLY: last business day of quarter
 */

import type { TimeFrequency, TimeSeriesConfig } from './types';

// ─── Date Utilities ────────────────────────────────────────────────────

/** Check if a date is a weekday (Mon-Fri). */
function isWeekday(d: Date): boolean {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

/** Roll a date to the nearest prior weekday (if it falls on a weekend). */
function toPriorWeekday(d: Date): Date {
  const result = new Date(d);
  while (!isWeekday(result)) {
    result.setUTCDate(result.getUTCDate() - 1);
  }
  return result;
}

/** Roll a date to the next weekday (if it falls on a weekend). */
function toNextWeekday(d: Date): Date {
  const result = new Date(d);
  while (!isWeekday(result)) {
    result.setUTCDate(result.getUTCDate() + 1);
  }
  return result;
}

/** Format a Date as YYYY-MM-DD string. */
function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse a YYYY-MM-DD string to a Date (UTC). */
function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00Z');
}

/** Get the last day of a month. */
function lastDayOfMonth(year: number, month: number): Date {
  // month is 0-based in JS Date
  return new Date(Date.UTC(year, month + 1, 0));
}

/** Get the last business day of a month. */
function lastBusinessDayOfMonth(year: number, month: number): Date {
  return toPriorWeekday(lastDayOfMonth(year, month));
}

// ─── Date Grid Generators ──────────────────────────────────────────────

/** Generate daily (weekday) dates between start and end inclusive. */
function generateDaily(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = toNextWeekday(new Date(start));
  while (current <= end) {
    dates.push(formatDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
    while (!isWeekday(current) && current <= end) {
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }
  return dates;
}

/** Generate weekly dates (every Friday) between start and end. */
function generateWeekly(start: Date, end: Date): string[] {
  const dates: string[] = [];
  // Find the first Friday on or after start
  const current = new Date(start);
  while (current.getUTCDay() !== 5) {
    current.setUTCDate(current.getUTCDate() + 1);
  }
  while (current <= end) {
    dates.push(formatDate(current));
    current.setUTCDate(current.getUTCDate() + 7);
  }
  return dates;
}

/** Generate biweekly dates (every other Friday) between start and end. */
function generateBiweekly(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  while (current.getUTCDay() !== 5) {
    current.setUTCDate(current.getUTCDate() + 1);
  }
  while (current <= end) {
    dates.push(formatDate(current));
    current.setUTCDate(current.getUTCDate() + 14);
  }
  return dates;
}

/** Generate monthly dates (last business day of each month). */
function generateMonthly(start: Date, end: Date): string[] {
  const dates: string[] = [];
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();

  while (true) {
    const lbd = lastBusinessDayOfMonth(year, month);
    if (lbd > end) break;
    if (lbd >= start) {
      dates.push(formatDate(lbd));
    }
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }
  return dates;
}

/** Generate quarterly dates (last business day of quarter-end months). */
function generateQuarterly(start: Date, end: Date): string[] {
  const dates: string[] = [];
  let year = start.getUTCFullYear();
  // Quarter-end months: March (2), June (5), September (8), December (11)
  const quarterMonths = [2, 5, 8, 11];

  // Start from the first quarter-end on or after start
  let startMonthIdx = quarterMonths.findIndex(m => {
    const lbd = lastBusinessDayOfMonth(year, m);
    return lbd >= start;
  });
  if (startMonthIdx === -1) {
    year++;
    startMonthIdx = 0;
  }

  let qIdx = startMonthIdx;
  while (true) {
    const month = quarterMonths[qIdx % 4];
    const y = year + Math.floor(qIdx / 4);
    const lbd = lastBusinessDayOfMonth(y, month);
    if (lbd > end) break;
    if (lbd >= start) {
      dates.push(formatDate(lbd));
    }
    qIdx++;
    // Safety: prevent infinite loop for very distant end dates
    if (dates.length > 200) break;
  }
  return dates;
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Generate a date grid from a TimeSeriesConfig.
 *
 * If `snapshot_dates` is provided, uses those exact dates (backward compat
 * with YAML `as_of_dates`).
 *
 * Otherwise generates dates based on frequency between start and end.
 */
export function generateDateGrid(config: TimeSeriesConfig): string[] {
  // Backward compatibility: explicit snapshot dates
  if (config.snapshot_dates && config.snapshot_dates.length > 0) {
    return [...config.snapshot_dates].sort();
  }

  const start = parseDate(config.start_date);
  const end = parseDate(config.end_date);

  if (start > end) {
    throw new Error(`start_date (${config.start_date}) must be <= end_date (${config.end_date})`);
  }

  switch (config.frequency) {
    case 'DAILY':     return generateDaily(start, end);
    case 'WEEKLY':    return generateWeekly(start, end);
    case 'BIWEEKLY':  return generateBiweekly(start, end);
    case 'MONTHLY':   return generateMonthly(start, end);
    case 'QUARTERLY': return generateQuarterly(start, end);
    default:          return generateWeekly(start, end);
  }
}

/**
 * Compute the time-step size in years for a given frequency.
 * Used as `dt` parameter for O-U processes and GBM evolution.
 */
export function frequencyToDt(frequency: TimeFrequency): number {
  switch (frequency) {
    case 'DAILY':     return 1 / 252;    // Trading days per year
    case 'WEEKLY':    return 7 / 365;
    case 'BIWEEKLY':  return 14 / 365;
    case 'MONTHLY':   return 30 / 365;
    case 'QUARTERLY': return 91 / 365;
    default:          return 7 / 365;
  }
}

/**
 * Compute the cycle index (0-based) for mapping story arc curves
 * to a sequence of dates. Story arcs have 5 cycles. For longer
 * date grids, the cycle index repeats and smoothly interpolates.
 */
export function dateToCycleIndex(
  date: string,
  dates: string[],
  numCycles: number = 5,
): number {
  const idx = dates.indexOf(date);
  if (idx === -1) return 0;
  if (dates.length <= numCycles) return idx;
  // Map position in date array to cycle index via linear interpolation
  const t = idx / (dates.length - 1); // 0..1
  return Math.min(Math.floor(t * numCycles), numCycles - 1);
}

/**
 * Interpolate a story arc value for a date.
 *
 * For date grids longer than the arc's cycle count, smoothly interpolates
 * between arc values rather than using discrete jumps.
 */
export function interpolateArcValue(
  date: string,
  dates: string[],
  arcValues: readonly number[],
): number {
  const idx = dates.indexOf(date);
  if (idx === -1) return arcValues[0];

  const numCycles = arcValues.length;
  if (dates.length <= numCycles) {
    return arcValues[Math.min(idx, numCycles - 1)];
  }

  // Continuous interpolation across the arc
  const t = idx / (dates.length - 1); // 0..1
  const floatIdx = t * (numCycles - 1); // 0..numCycles-1
  const lo = Math.floor(floatIdx);
  const hi = Math.min(lo + 1, numCycles - 1);
  const frac = floatIdx - lo;
  return arcValues[lo] * (1 - frac) + arcValues[hi] * frac;
}

/**
 * Get month from a date string (1-12).
 */
export function getMonth(date: string): number {
  return new Date(date + 'T00:00:00Z').getUTCMonth() + 1;
}

/**
 * Calculate remaining months between two date strings.
 */
export function monthsBetween(fromDate: string, toDate: string): number {
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  const diffMs = to.getTime() - from.getTime();
  return Math.round(diffMs / (30.44 * 24 * 60 * 60 * 1000));
}
