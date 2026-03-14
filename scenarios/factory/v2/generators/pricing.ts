/**
 * Generator: facility_pricing_snapshot
 * Reads: spread_bps, all_in_rate_pct, fee_rate_pct, base_rate_pct, cost_of_funds_pct
 */
import type { FacilityStateMap, SqlRow } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round } from '../prng';
import { getBenchmarkName } from '../market-environment';

export function generatePricingRows(
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

      const pricingId = registry.allocate('facility_pricing_snapshot', 1)[0];

      rows.push({
        facility_pricing_id: pricingId,
        facility_id: state.facility_id,
        as_of_date: date,
        currency_code: state.currency_code,
        spread_bps: round(state.spread_bps, 2),
        base_rate_pct: round(state.base_rate_pct, 6),
        all_in_rate_pct: round(state.all_in_rate_pct, 6),
        fee_rate_pct: round(state.fee_rate_pct, 6),
        cost_of_funds_pct: round(state.cost_of_funds_pct, 6),
        floor_pct: 0.000000,
        rate_cap_pct: null,
        rate_index_code: getBenchmarkName(state.currency_code),
        payment_frequency: state.is_revolving ? 'MONTHLY' : 'QUARTERLY',
        is_prepayment_penalty_flag: !state.is_revolving,
        is_pricing_exception_flag: false,
        pricing_exception_status: null,
        min_spread_threshold_bps: null,
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });
    }
  }

  return rows;
}
