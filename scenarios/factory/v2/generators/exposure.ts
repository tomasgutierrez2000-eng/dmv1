/**
 * Generator: facility_exposure_snapshot
 * Reads: drawn_amount, committed_amount, undrawn_amount, lifecycle_stage
 */
import type { FacilityState, FacilityStateMap, SqlRow } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round } from '../prng';

/**
 * @param bankShareMap - Map of facility_id → bank_share_pct from L1 lender allocations.
 *   For syndicated facilities, bank_share < 1.0. If not provided or missing, defaults to 1.0.
 */
export function generateExposureRows(
  stateMap: FacilityStateMap,
  facilityIds: number[],
  dates: string[],
  registry: IDRegistry,
  bankShareMap?: Map<number, number>,
): SqlRow[] {
  const rows: SqlRow[] = [];

  for (const date of dates) {
    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      const exposureId = registry.allocate('facility_exposure_snapshot', 1)[0];
      const utilization = state.committed_amount > 0
        ? state.drawn_amount / state.committed_amount : 0;

      // drawn_amount & undrawn_amount are the canonical columns used by metric formulas.
      // outstanding_balance_amt & undrawn_commitment_amt are legacy aliases — populate both
      // to prevent NULL gaps that silently break utilization, EAD, and exposure metrics.
      const drawnAmt = round(state.drawn_amount, 2);
      const undrawnAmt = round(state.undrawn_amount, 2);

      rows.push({
        facility_exposure_id: exposureId,
        facility_id: state.facility_id,
        as_of_date: date,
        counterparty_id: state.counterparty_id,
        currency_code: state.currency_code,
        committed_amount: round(state.committed_amount, 2),
        drawn_amount: drawnAmt,
        undrawn_amount: undrawnAmt,
        outstanding_balance_amt: drawnAmt,
        undrawn_commitment_amt: undrawnAmt,
        gross_exposure_usd: round(state.ead, 2),
        exposure_amount_local: drawnAmt,
        bank_share_pct: bankShareMap?.get(state.facility_id) ?? 1.000000,
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });
    }
  }

  return rows;
}
