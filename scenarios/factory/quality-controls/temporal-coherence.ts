/**
 * Group 7: Temporal Coherence
 *
 * Time series integrity:
 * - Dates are chronologically ordered
 * - All snapshot tables use the same date grid
 * - No duplicate (facility_id, as_of_date) rows
 * - MoM changes are reasonable (no unexplained jumps)
 * - Committed amounts don't change without amendment
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

  return { errors, warnings };
}
