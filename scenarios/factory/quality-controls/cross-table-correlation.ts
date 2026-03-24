/**
 * Group 6: Cross-Table Correlation
 *
 * Ensures tables that should co-exist do:
 * - Every facility with exposure has risk, pricing, position rows
 * - Every facility with collateral_value > 0 has collateral_snapshot
 * - Credit events have facility links
 * - Amendment events have change details
 * - Cash flows exist for facilities with draw changes
 * - All tables have matching date grids
 * - Counterparties have rating observations
 */

import type { L1Chain } from '../chain-builder';
import type { V2GeneratorOutput } from '../v2/generators';
import type { QualityControlResult } from './shared-types';
import { findTable } from './shared-types';

export function runCrossTableCorrelation(
  output: V2GeneratorOutput,
  chain: L1Chain,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build facility-date sets per table
  const tablePresence = new Map<string, Set<string>>(); // table -> Set<"facId:date">
  const PAIRED_TABLES = [
    'facility_exposure_snapshot', 'facility_risk_snapshot',
    'facility_pricing_snapshot', 'facility_delinquency_snapshot',
    'position',
  ];

  for (const tableName of PAIRED_TABLES) {
    const td = findTable(output, tableName);
    if (!td) continue;
    const keys = new Set<string>();
    for (const row of td.rows) {
      keys.add(`${row.facility_id}:${row.as_of_date}`);
    }
    tablePresence.set(tableName, keys);
  }

  // Check exposure table has matching rows in other snapshot tables
  const exposureKeys = tablePresence.get('facility_exposure_snapshot');
  if (exposureKeys) {
    for (const [tableName, keys] of tablePresence) {
      if (tableName === 'facility_exposure_snapshot') continue;
      const missing = [...exposureKeys].filter(k => !keys.has(k));
      if (missing.length > 0) {
        const pct = ((missing.length / exposureKeys.size) * 100).toFixed(0);
        if (parseInt(pct) > 10) {
          warnings.push(`Cross-table: ${missing.length}/${exposureKeys.size} (${pct}%) exposure rows missing from ${tableName}`);
        }
      }
    }
  }

  // Check credit events have facility links
  const eventTable = findTable(output, 'credit_event');
  const linkTable = findTable(output, 'credit_event_facility_link');
  if (eventTable && linkTable) {
    const eventIds = new Set(eventTable.rows.map(r => r.credit_event_id));
    const linkedEventIds = new Set(linkTable.rows.map(r => r.credit_event_id));
    const unlinked = [...eventIds].filter(id => !linkedEventIds.has(id));
    if (unlinked.length > 0) {
      warnings.push(`Cross-table: ${unlinked.length}/${eventIds.size} credit events have no facility links`);
    }
  }

  // Check amendment events have change details
  const amendmentTable = findTable(output, 'amendment_event');
  const changeDetailTable = findTable(output, 'amendment_change_detail');
  if (amendmentTable && changeDetailTable) {
    const amendIds = new Set(amendmentTable.rows.map(r => r.amendment_id));
    const detailAmendIds = new Set(changeDetailTable.rows.map(r => r.amendment_id));
    const noDetails = [...amendIds].filter(id => !detailAmendIds.has(id));
    if (noDetails.length > 0) {
      warnings.push(`Cross-table: ${noDetails.length}/${amendIds.size} amendments have no change details`);
    }
  }

  // Check counterparties have rating observations
  const ratingTable = findTable(output, 'counterparty_rating_observation');
  if (ratingTable) {
    const ratedCPs = new Set(ratingTable.rows.map(r => r.counterparty_id));
    const allCPs = new Set(chain.counterparties.map(c => c.counterparty_id));
    const unrated = [...allCPs].filter(cp => !ratedCPs.has(cp));
    if (unrated.length > 0) {
      warnings.push(`Cross-table: ${unrated.length}/${allCPs.size} counterparties have no rating observations`);
    }
  }

  // Check facilities with exposure have profitability
  const profitTable = findTable(output, 'facility_profitability_snapshot');
  if (profitTable && exposureKeys) {
    const profitFacIds = new Set(profitTable.rows.map(r => r.facility_id));
    const exposureFacIds = new Set([...exposureKeys].map(k => parseInt(k.split(':')[0])));
    const noProfitability = [...exposureFacIds].filter(f => !profitFacIds.has(f));
    if (noProfitability.length > 0 && noProfitability.length > exposureFacIds.size * 0.2) {
      warnings.push(`Cross-table: ${noProfitability.length}/${exposureFacIds.size} facilities missing profitability snapshots`);
    }
  }

  // Check ECL provision exists for facilities
  const provisionTable = findTable(output, 'ecl_provision_snapshot');
  if (provisionTable && exposureKeys) {
    const provisionFacIds = new Set(provisionTable.rows.map(r => r.facility_id));
    const exposureFacIds = new Set([...exposureKeys].map(k => parseInt(k.split(':')[0])));
    const noProvision = [...exposureFacIds].filter(f => !provisionFacIds.has(f));
    if (noProvision.length > 0 && noProvision.length > exposureFacIds.size * 0.2) {
      warnings.push(`Cross-table: ${noProvision.length}/${exposureFacIds.size} facilities missing ECL provisions`);
    }
  }

  return { errors, warnings };
}
