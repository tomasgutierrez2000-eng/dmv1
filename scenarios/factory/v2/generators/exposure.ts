/**
 * Generator: facility_exposure_snapshot
 * Reads: drawn_amount, committed_amount, undrawn_amount, lifecycle_stage
 */
import type { FacilityState, FacilityStateMap, SqlRow } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round } from '../prng';

export function generateExposureRows(
  stateMap: FacilityStateMap,
  facilityIds: number[],
  dates: string[],
  registry: IDRegistry,
): SqlRow[] {
  const rows: SqlRow[] = [];

  for (const date of dates) {
    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      const exposureId = registry.allocate('facility_exposure_snapshot', 1)[0];
      const utilization = state.committed_amount > 0
        ? state.drawn_amount / state.committed_amount : 0;

      rows.push({
        facility_exposure_id: exposureId,
        facility_id: state.facility_id,
        as_of_date: date,
        counterparty_id: state.counterparty_id,
        currency_code: state.currency_code,
        committed_amount: round(state.committed_amount, 2),
        outstanding_balance_amt: round(state.drawn_amount, 2),
        undrawn_commitment_amt: round(state.undrawn_amount, 2),
        gross_exposure_usd: round(state.ead, 2),
        exposure_amount_local: round(state.drawn_amount, 2),
        bank_share_pct: 1.000000,
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });
    }
  }

  return rows;
}
