/**
 * Generator: counterparty_rating_observation
 * Reads: internal_rating, external_rating, pd_annual
 */
import type { FacilityStateMap, SqlRow } from '../types';
import { stateKey } from '../types';
import type { IDRegistry } from '../../id-registry';

export function generateRatingRows(
  stateMap: FacilityStateMap,
  facilityIds: number[],
  dates: string[],
  registry: IDRegistry,
): SqlRow[] {
  const rows: SqlRow[] = [];

  // Track unique counterparty+date combos (ratings are counterparty-level)
  const seen = new Set<string>();

  for (const date of dates) {
    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      const cpKey = `${state.counterparty_id}|${date}`;
      if (seen.has(cpKey)) continue;
      seen.add(cpKey);

      // Internal rating observation
      const internalObsId = registry.allocate('counterparty_rating_observation', 1)[0];
      rows.push({
        observation_id: internalObsId,
        counterparty_id: state.counterparty_id,
        as_of_date: date,
        rating_date: date,
        rating_value: state.internal_rating,
        rating_agency: 'INTERNAL',
        rating_type: 'INTERNAL_RISK_RATING',
        is_internal_flag: true,
        pd_implied: state.pd_annual.toFixed(6),
        risk_rating_status: state.credit_status === 'PERFORMING' ? 'ACTIVE' : 'UNDER_REVIEW',
        source_system_id: 1,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });

      // S&P external rating
      if (state.external_rating_sp && state.external_rating_sp !== 'NR') {
        const spObsId = registry.allocate('counterparty_rating_observation', 1)[0];
        rows.push({
          observation_id: spObsId,
          counterparty_id: state.counterparty_id,
          as_of_date: date,
          rating_date: date,
          rating_value: state.external_rating_sp,
          rating_agency: 'S&P',
          rating_type: 'LONG_TERM_ISSUER',
          is_internal_flag: false,
          pd_implied: state.pd_annual.toFixed(6),
          risk_rating_status: 'ACTIVE',
          source_system_id: 1,
          record_source: 'DATA_FACTORY_V2',
          created_by: 'factory_v2',
        });
      }

      // Moody's external rating
      if (state.external_rating_moodys && state.external_rating_moodys !== 'NR') {
        const moodysObsId = registry.allocate('counterparty_rating_observation', 1)[0];
        rows.push({
          observation_id: moodysObsId,
          counterparty_id: state.counterparty_id,
          as_of_date: date,
          rating_date: date,
          rating_value: state.external_rating_moodys,
          rating_agency: 'MOODYS',
          rating_type: 'LONG_TERM_ISSUER',
          is_internal_flag: false,
          pd_implied: state.pd_annual.toFixed(6),
          risk_rating_status: 'ACTIVE',
          source_system_id: 1,
          record_source: 'DATA_FACTORY_V2',
          created_by: 'factory_v2',
        });
      }
    }
  }

  return rows;
}
