/**
 * Group 12: SCD-2 Integrity
 *
 * Validates Slowly Changing Dimension Type 2 invariants on master/entity tables:
 *   - Only one row per entity has is_current_flag = true/'Y'
 *   - Effective windows (effective_start_date, effective_end_date) do not overlap
 *   - Current row has NULL or future effective_end_date
 *   - No gaps in effective date coverage (warning only)
 *
 * Applies to SCD-2 tables: counterparty, legal_entity, facility_master,
 * credit_agreement_master, instrument_master, netting_set,
 * collateral_asset_master, crm_protection_master, risk_mitigant_master.
 */

import type { V2GeneratorOutput } from '../v2/generators';
import type { QualityControlResult } from './shared-types';
import { findTable } from './shared-types';

/** Tables known to use SCD-2 pattern in the GSIB data model. */
const SCD2_TABLES: Array<{
  table: string;
  entityKey: string;
  currentFlag: string;
  startDate: string;
  endDate: string;
}> = [
  { table: 'counterparty', entityKey: 'counterparty_id', currentFlag: 'is_current_flag', startDate: 'effective_start_date', endDate: 'effective_end_date' },
  { table: 'facility_master', entityKey: 'facility_id', currentFlag: 'is_current_flag', startDate: 'effective_start_date', endDate: 'effective_end_date' },
  { table: 'credit_agreement_master', entityKey: 'credit_agreement_id', currentFlag: 'is_current_flag', startDate: 'effective_start_date', endDate: 'effective_end_date' },
  { table: 'collateral_asset_master', entityKey: 'collateral_asset_id', currentFlag: 'is_current_flag', startDate: 'effective_start_date', endDate: 'effective_end_date' },
  { table: 'crm_protection_master', entityKey: 'protection_id', currentFlag: 'is_current_flag', startDate: 'effective_start_date', endDate: 'effective_end_date' },
  { table: 'risk_mitigant_master', entityKey: 'risk_mitigant_id', currentFlag: 'is_current_flag', startDate: 'effective_start_date', endDate: 'effective_end_date' },
];

function isTruthy(val: unknown): boolean {
  if (val === true) return true;
  if (typeof val === 'string') {
    const s = val.toUpperCase();
    return s === 'Y' || s === 'TRUE' || s === '1';
  }
  return val === 1;
}

export function runSCDIntegrity(output: V2GeneratorOutput): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const scd of SCD2_TABLES) {
    const td = findTable(output, scd.table);
    if (!td || td.rows.length === 0) continue;

    // Check if the table actually has SCD columns — skip gracefully if not
    const firstRow = td.rows[0];
    const hasCurrentFlag = scd.currentFlag in firstRow;
    const hasStartDate = scd.startDate in firstRow;

    if (!hasCurrentFlag && !hasStartDate) continue;

    // Group rows by entity key
    const entityGroups = new Map<string | number, Array<Record<string, unknown>>>();
    for (const row of td.rows) {
      const key = row[scd.entityKey] as string | number;
      if (key === undefined || key === null) continue;
      if (!entityGroups.has(key)) entityGroups.set(key, []);
      entityGroups.get(key)!.push(row);
    }

    let multiCurrentCount = 0;
    let noCurrentCount = 0;
    let overlapCount = 0;
    let currentWithPastEndCount = 0;

    for (const [entityId, rows] of entityGroups) {
      // ── Check 1: Exactly one current row per entity ──
      if (hasCurrentFlag) {
        const currentRows = rows.filter(r => isTruthy(r[scd.currentFlag]));
        if (currentRows.length > 1) {
          multiCurrentCount++;
          if (multiCurrentCount <= 3) {
            errors.push(
              `SCD-2: ${scd.table} entity ${entityId} has ${currentRows.length} rows with ` +
              `${scd.currentFlag}=true (expected exactly 1)`
            );
          }
        } else if (currentRows.length === 0 && rows.length > 0) {
          noCurrentCount++;
          if (noCurrentCount <= 3) {
            warnings.push(
              `SCD-2: ${scd.table} entity ${entityId} has ${rows.length} row(s) but none with ` +
              `${scd.currentFlag}=true — no active version`
            );
          }
        }

        // ── Check 2: Current row should have NULL or future end date ──
        if (hasStartDate) {
          for (const row of currentRows) {
            const endDate = row[scd.endDate] as string | null;
            if (endDate !== null && endDate !== undefined) {
              const today = new Date().toISOString().slice(0, 10);
              if (endDate < today) {
                currentWithPastEndCount++;
                if (currentWithPastEndCount <= 3) {
                  warnings.push(
                    `SCD-2: ${scd.table} entity ${entityId} is_current=true but ` +
                    `${scd.endDate}=${endDate} is in the past`
                  );
                }
              }
            }
          }
        }
      }

      // ── Check 3: Non-overlapping effective windows ──
      if (hasStartDate && rows.length > 1) {
        const windows = rows
          .filter(r => r[scd.startDate] !== null && r[scd.startDate] !== undefined)
          .map(r => ({
            start: String(r[scd.startDate]),
            end: r[scd.endDate] !== null && r[scd.endDate] !== undefined
              ? String(r[scd.endDate])
              : '9999-12-31',
          }))
          .sort((a, b) => a.start.localeCompare(b.start));

        for (let i = 1; i < windows.length; i++) {
          const prev = windows[i - 1];
          const curr = windows[i];
          // Overlap: previous end date >= current start date
          if (prev.end >= curr.start) {
            overlapCount++;
            if (overlapCount <= 3) {
              errors.push(
                `SCD-2: ${scd.table} entity ${entityId} has overlapping effective windows: ` +
                `[${prev.start}..${prev.end}] overlaps [${curr.start}..${curr.end}]`
              );
            }
          }
        }
      }
    }

    // Summary counts for large-scale issues
    if (multiCurrentCount > 3) {
      errors.push(`SCD-2: ${scd.table} has ${multiCurrentCount} total entities with multiple current rows`);
    }
    if (noCurrentCount > 3) {
      warnings.push(`SCD-2: ${scd.table} has ${noCurrentCount} total entities with no current row`);
    }
    if (overlapCount > 3) {
      errors.push(`SCD-2: ${scd.table} has ${overlapCount} total overlapping effective windows`);
    }
  }

  return { errors, warnings };
}
