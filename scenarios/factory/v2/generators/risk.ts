/**
 * Generator: facility_risk_snapshot
 * Reads: pd_annual, lgd_current, ccf, risk_weight_pct, internal_rating
 */
import type { FacilityStateMap, SqlRow } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import { round } from '../prng';

export function generateRiskRows(
  stateMap: FacilityStateMap,
  facilityIds: string[],
  dates: string[],
): SqlRow[] {
  const rows: SqlRow[] = [];

  for (const date of dates) {
    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      rows.push({
        facility_id: state.facility_id,
        as_of_date: date,
        counterparty_id: state.counterparty_id,
        currency_code: state.currency_code,
        pd_pct: round(state.pd_annual, 6),
        lgd_pct: round(state.lgd_current, 6),
        ccf: round(state.ccf, 4),
        internal_risk_rating: state.internal_rating,
        risk_weight_std_pct: round(state.risk_weight_pct, 6),
        risk_weight_erba_pct: round(state.risk_weight_pct * 0.95, 6),
        is_defaulted_flag: state.credit_status === 'DEFAULT',
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });
    }
  }

  return rows;
}
