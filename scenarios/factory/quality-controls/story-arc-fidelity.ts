/**
 * Group 5: Story Arc Fidelity
 *
 * Validates that generated data tells the scenario's story correctly.
 */

import type { L1Chain } from '../chain-builder';
import type { V2GeneratorOutput } from '../v2/generators';
import type { ScenarioConfig } from '../scenario-config';
import type { StoryArc } from '../../../scripts/shared/mvp-config';
import type { QualityControlResult } from './shared-types';
import { findTable } from './shared-types';

export function runStoryArcChecks(
  output: V2GeneratorOutput,
  chain: L1Chain,
  config: ScenarioConfig,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const cpArcs = new Map<string, StoryArc>();
  for (let i = 0; i < config.counterparties.length; i++) {
    const cp = chain.counterparties[i];
    if (cp) cpArcs.set(cp.counterparty_id, config.counterparties[i].story_arc);
  }

  // Collect time-series per facility
  const facilityTS = new Map<string, Array<{
    date: string; drawn: number; committed: number;
    pd?: number; credit_status_code?: number; spread_bps?: number;
  }>>();

  const exposureTable = findTable(output, 'facility_exposure_snapshot');
  if (exposureTable) {
    for (const row of exposureTable.rows) {
      const fid = row.facility_id as string;
      if (!facilityTS.has(fid)) facilityTS.set(fid, []);
      facilityTS.get(fid)!.push({
        date: row.as_of_date as string,
        drawn: row.drawn_amount as number ?? 0,
        committed: row.committed_amount as number ?? 0,
        credit_status_code: row.credit_status_code as number | undefined,
      });
    }
  }

  // Merge risk PD
  const riskTable = findTable(output, 'facility_risk_snapshot');
  if (riskTable) {
    for (const row of riskTable.rows) {
      const fid = row.facility_id as string;
      const date = row.as_of_date as string;
      const entry = facilityTS.get(fid)?.find(e => e.date === date);
      if (entry) entry.pd = entry.pd ?? (row.pd_pct as number | undefined);
    }
  }

  // Merge pricing spread
  const pricingTable = findTable(output, 'facility_pricing_snapshot');
  if (pricingTable) {
    for (const row of pricingTable.rows) {
      const fid = row.facility_id as string;
      const date = row.as_of_date as string;
      const entry = facilityTS.get(fid)?.find(e => e.date === date);
      if (entry) entry.spread_bps = entry.spread_bps ?? (row.spread_bps as number | undefined);
    }
  }

  // Credit events by counterparty
  const eventTable = findTable(output, 'credit_event');
  const cpHasDefaultEvent = new Set<string>();
  const cpHasAnyEvent = new Set<string>();
  if (eventTable) {
    for (const row of eventTable.rows) {
      const cpId = row.counterparty_id as string;
      cpHasAnyEvent.add(cpId);
      const eventType = row.credit_event_type_code as number;
      if (typeof eventType === 'number' && eventType <= 7) cpHasDefaultEvent.add(cpId);
    }
  }

  // Check arcs
  for (const [cpId, arc] of cpArcs) {
    const cpFacIds = chain.facilities.filter(f => f.counterparty_id === cpId).map(f => f.facility_id);
    if (cpFacIds.length === 0) continue;

    const allSeries = cpFacIds.flatMap(fid => facilityTS.get(fid) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    if (allSeries.length < 2) continue;

    const pds = allSeries.filter(e => e.pd !== undefined).map(e => e.pd!);
    const spreads = allSeries.filter(e => e.spread_bps !== undefined).map(e => e.spread_bps!);
    const drawnVals = allSeries.map(e => e.drawn);

    switch (arc) {
      case 'DETERIORATING': {
        if (pds.length >= 2 && pds[pds.length - 1] < pds[0] * 0.9) {
          warnings.push(`Story DETERIORATING CP ${cpId}: PD fell ${pds[0].toFixed(4)}->${pds[pds.length-1].toFixed(4)}`);
        }
        // Should have at least one adverse event
        if (!cpHasAnyEvent.has(cpId)) {
          warnings.push(`Story DETERIORATING CP ${cpId}: no credit events generated`);
        }
        break;
      }
      case 'RECOVERING': {
        if (pds.length >= 2 && pds[pds.length - 1] > pds[0] * 1.1) {
          warnings.push(`Story RECOVERING CP ${cpId}: PD rose ${pds[0].toFixed(4)}->${pds[pds.length-1].toFixed(4)}`);
        }
        // Drawn should trend down
        if (drawnVals.length >= 2 && drawnVals[drawnVals.length - 1] > drawnVals[0] * 1.15) {
          warnings.push(`Story RECOVERING CP ${cpId}: drawn increased — expected decrease`);
        }
        break;
      }
      case 'STABLE_IG':
      case 'STEADY_HY':
      case 'GROWING':
      case 'NEW_RELATIONSHIP': {
        if (drawnVals.length >= 3) {
          const mean = drawnVals.reduce((s, v) => s + v, 0) / drawnVals.length;
          if (mean > 0) {
            const maxChange = Math.max(...drawnVals.slice(1).map((v, i) => Math.abs(v - drawnVals[i]) / mean));
            if (maxChange > 0.30) {
              warnings.push(`Story ${arc} CP ${cpId}: MoM drawn change ${(maxChange*100).toFixed(1)}% — too volatile`);
            }
          }
        }
        break;
      }
      case 'STRESSED_SECTOR': {
        if (spreads.length >= 2 && spreads[spreads.length - 1] < spreads[0] * 0.9) {
          warnings.push(`Story STRESSED_SECTOR CP ${cpId}: spread narrowed ${spreads[0]}->${spreads[spreads.length-1]}bps`);
        }
        // PD should also increase
        if (pds.length >= 2 && pds[pds.length - 1] < pds[0] * 0.9) {
          warnings.push(`Story STRESSED_SECTOR CP ${cpId}: PD fell — expected sector stress to increase PD`);
        }
        break;
      }
    }
  }

  // Counterparty count check
  if (chain.counterparties.length !== config.counterparties.length) {
    warnings.push(`CP count: YAML=${config.counterparties.length} vs chain=${chain.counterparties.length}`);
  }

  // Date coverage
  if (output.dates.length > 0 && exposureTable) {
    const datesInData = new Set(exposureTable.rows.map(r => r.as_of_date as string));
    const missing = output.dates.filter(d => !datesInData.has(d));
    if (missing.length > 0) {
      warnings.push(`Missing exposure data for ${missing.length}/${output.dates.length} dates`);
    }
  }

  return { errors, warnings };
}
