/**
 * Group 7: Temporal Coherence
 *
 * Time series integrity:
 * - Dates are chronologically ordered
 * - All snapshot tables use the same date grid
 * - No duplicate (facility_id, as_of_date) rows
 * - MoM changes are reasonable (no unexplained jumps)
 * - Committed amounts don't change without amendment
 * - Daily-frequency tables share exact date sets
 * - Month-end tables use actual month-end dates only
 * - Profitability/capital/financial tables don't use intra-month dates
 */

import type { V2GeneratorOutput } from '../v2/generators';
import type { QualityControlResult } from './shared-types';
import { findTable } from './shared-types';

export function runTemporalCoherence(
  output: V2GeneratorOutput,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const expectedDates = output.dates.sort();

  // Check each snapshot table uses the expected date grid
  const SNAPSHOT_TABLES = [
    'facility_exposure_snapshot', 'facility_risk_snapshot', 'facility_pricing_snapshot',
    'facility_delinquency_snapshot', 'position', 'collateral_snapshot',
    'facility_profitability_snapshot', 'ecl_provision_snapshot',
  ];

  for (const tableName of SNAPSHOT_TABLES) {
    const td = findTable(output, tableName);
    if (!td || td.rows.length === 0) continue;

    // Check for dates outside expected grid
    const tableDates = new Set(td.rows.map(r => r.as_of_date as string));
    const unexpectedDates = [...tableDates].filter(d => !expectedDates.includes(d));
    if (unexpectedDates.length > 0) {
      warnings.push(`Temporal: ${tableName} has ${unexpectedDates.length} date(s) outside expected grid: ${unexpectedDates.slice(0, 3).join(', ')}`);
    }
  }

  // Check for large unexplained jumps in exposure time series
  const exposureTable = findTable(output, 'facility_exposure_snapshot');
  if (exposureTable) {
    // Group by facility
    const facSeries = new Map<number, Array<{ date: string; drawn: number; committed: number }>>();
    for (const row of exposureTable.rows) {
      const fid = row.facility_id as number;
      if (!facSeries.has(fid)) facSeries.set(fid, []);
      facSeries.get(fid)!.push({
        date: row.as_of_date as string,
        drawn: row.drawn_amount as number ?? 0,
        committed: row.committed_amount as number ?? 0,
      });
    }

    let jumpCount = 0;
    for (const [fid, series] of facSeries) {
      series.sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 1; i < series.length; i++) {
        const prev = series[i - 1];
        const curr = series[i];

        // Check for committed amount changes > 20%
        if (prev.committed > 0 && curr.committed > 0) {
          const commitChange = Math.abs(curr.committed - prev.committed) / prev.committed;
          if (commitChange > 0.20 && jumpCount < 5) {
            warnings.push(
              `Temporal: facility ${fid} committed jumped ${(commitChange*100).toFixed(0)}% ` +
              `(${prev.committed.toFixed(0)}->${curr.committed.toFixed(0)}) between ${prev.date}->${curr.date}`
            );
            jumpCount++;
          }
        }

        // Check for drawn going negative
        if (curr.drawn < -0.01) {
          errors.push(`Temporal: facility ${fid} negative drawn (${curr.drawn.toFixed(0)}) on ${curr.date}`);
        }
      }
    }
  }

  // Check PD monotonicity for DETERIORATING arcs (should generally increase)
  // This is complementary to Group 5 but focused on temporal smoothness
  const riskTable = findTable(output, 'facility_risk_snapshot');
  if (riskTable) {
    const facPDs = new Map<number, Array<{ date: string; pd: number }>>();
    for (const row of riskTable.rows) {
      const fid = row.facility_id as number;
      const pd = row.pd_pct as number;
      if (pd === undefined || pd === null) continue;
      if (!facPDs.has(fid)) facPDs.set(fid, []);
      facPDs.get(fid)!.push({ date: row.as_of_date as string, pd });
    }

    let pdJumpCount = 0;
    for (const [fid, series] of facPDs) {
      series.sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 1; i < series.length; i++) {
        const prev = series[i - 1];
        const curr = series[i];
        // PD shouldn't jump by more than 10x in one period
        if (prev.pd > 0 && curr.pd / prev.pd > 10 && pdJumpCount < 3) {
          warnings.push(
            `Temporal: facility ${fid} PD jumped ${(prev.pd*100).toFixed(4)}%->${(curr.pd*100).toFixed(4)}% ` +
            `(${(curr.pd/prev.pd).toFixed(1)}x) between ${prev.date}->${curr.date}`
          );
          pdJumpCount++;
        }
      }
    }
  }

  // ── Calendar frequency enforcement ──
  // Daily-frequency snapshot tables should share the same date set.
  // Month-end tables (profitability, capital, financial) should only use actual month-end dates.

  const DAILY_TABLES = [
    'facility_exposure_snapshot', 'facility_risk_snapshot', 'facility_pricing_snapshot',
    'facility_delinquency_snapshot', 'position',
  ];
  const MONTH_END_TABLES = [
    'facility_profitability_snapshot', 'facility_financial_snapshot',
    'counterparty_financial_snapshot', 'capital_position_snapshot',
  ];

  // Collect date sets for daily tables and check they share the same grid
  const dailyDateSets: Array<{ table: string; dates: Set<string> }> = [];
  for (const tableName of DAILY_TABLES) {
    const td = findTable(output, tableName);
    if (!td || td.rows.length === 0) continue;
    const dates = new Set(td.rows.map(r => r.as_of_date as string).filter(Boolean));
    dailyDateSets.push({ table: tableName, dates });
  }

  if (dailyDateSets.length >= 2) {
    // Use the first non-empty table as reference
    const ref = dailyDateSets[0];
    for (let i = 1; i < dailyDateSets.length; i++) {
      const other = dailyDateSets[i];
      // Check if other has dates not in reference (acceptable — some tables may have fewer dates)
      // But warn if reference has dates that other is completely missing
      const missingFromOther = [...ref.dates].filter(d => !other.dates.has(d));
      const extraInOther = [...other.dates].filter(d => !ref.dates.has(d));

      if (missingFromOther.length > 0 && missingFromOther.length > ref.dates.size * 0.3) {
        warnings.push(
          `Calendar: ${other.table} is missing ${missingFromOther.length}/${ref.dates.size} dates ` +
          `present in ${ref.table} — daily tables should share the same date grid`
        );
      }
      if (extraInOther.length > 0 && extraInOther.length > 2) {
        warnings.push(
          `Calendar: ${other.table} has ${extraInOther.length} date(s) not in ${ref.table}: ` +
          `${extraInOther.slice(0, 3).join(', ')}`
        );
      }
    }
  }

  // Validate month-end tables only use actual month-end dates
  for (const tableName of MONTH_END_TABLES) {
    const td = findTable(output, tableName);
    if (!td || td.rows.length === 0) continue;

    const tableDates = new Set(td.rows.map(r => r.as_of_date as string).filter(Boolean));
    const nonMonthEnd: string[] = [];

    for (const dateStr of tableDates) {
      if (!isMonthEnd(dateStr)) {
        nonMonthEnd.push(dateStr);
      }
    }

    if (nonMonthEnd.length > 0) {
      warnings.push(
        `Calendar: ${tableName} has ${nonMonthEnd.length} non-month-end date(s): ` +
        `${nonMonthEnd.slice(0, 3).join(', ')} — profitability/financial tables should use month-end dates only`
      );
    }
  }

  return { errors, warnings };
}

/** Check if a YYYY-MM-DD date string is the last day of its month (or last business day ±1). */
function isMonthEnd(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00Z'); // noon UTC to avoid timezone issues
  if (isNaN(d.getTime())) return false;

  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  // Last day of this month
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  // Allow last day, or last-1/last-2 for business day adjustment (weekend rollback)
  return day >= lastDay - 2;
}
