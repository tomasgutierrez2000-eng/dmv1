/**
 * Generator: limit_contribution_snapshot, limit_utilization_event
 * Reads: drawn per counterparty vs limits
 */
import type { FacilityState, FacilityStateMap, SqlRow } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round } from '../prng';

export function generateLimitRows(
  stateMap: FacilityStateMap,
  facilityIds: number[],
  dates: string[],
  registry: IDRegistry,
  limitRuleMap: Map<number, number>, // counterparty_id → limit_rule_id
): { contributions: SqlRow[]; utilizations: SqlRow[] } {
  const contributions: SqlRow[] = [];
  const utilizations: SqlRow[] = [];

  // Track unique counterparty+date combos
  const seen = new Set<string>();

  for (const date of dates) {
    // Aggregate facility-level drawn amounts by counterparty
    const cpDrawn = new Map<number, number>();
    const cpCommitted = new Map<number, number>();

    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      cpDrawn.set(state.counterparty_id,
        (cpDrawn.get(state.counterparty_id) ?? 0) + state.drawn_amount);
      cpCommitted.set(state.counterparty_id,
        (cpCommitted.get(state.counterparty_id) ?? 0) + state.committed_amount);
    }

    for (const [cpId, totalDrawn] of Array.from(cpDrawn)) {
      const cpKey = `${cpId}|${date}`;
      if (seen.has(cpKey)) continue;
      seen.add(cpKey);

      const totalCommitted = cpCommitted.get(cpId) ?? 0;
      const limitRuleId = limitRuleMap.get(cpId);
      if (!limitRuleId) continue;

      // Limit = committed amount as the single-name limit
      const limitAmount = totalCommitted;
      const utilizationPct = limitAmount > 0 ? totalDrawn / limitAmount : 0;

      const contribId = registry.allocate('limit_contribution_snapshot', 1)[0];
      contributions.push({
        contribution_id: contribId,
        limit_rule_id: limitRuleId,
        counterparty_id: cpId,
        as_of_date: date,
        facility_id: null,
        contribution_amount: round(totalDrawn, 2),
        contribution_amount_usd: round(totalDrawn, 2),
        contribution_pct: round(utilizationPct, 6),
        currency_code: 'USD',
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });

      // Utilization event
      const utilEventId = registry.allocate('limit_utilization_event', 1)[0];
      utilizations.push({
        utilization_event_id: utilEventId,
        limit_rule_id: limitRuleId,
        counterparty_id: cpId,
        as_of_date: date,
        utilized_amount: round(totalDrawn, 2),
        utilized_amount_usd: round(totalDrawn, 2),
        available_amount: round(limitAmount - totalDrawn, 2),
        currency_code: 'USD',
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });
    }
  }

  return { contributions, utilizations };
}
