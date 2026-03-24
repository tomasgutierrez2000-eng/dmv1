/**
 * Generator: IFRS 9 / CECL provision data (NEW table — ecl_provision_snapshot)
 *
 * This generates provision/ECL data that may map to an existing L3 table
 * or be adapted for the current schema. The data itself comes from
 * FacilityState.ifrs9_stage, ecl_12m, ecl_lifetime.
 *
 * For schemas without a dedicated provision table, this data can be
 * incorporated into facility_risk_snapshot or a custom L3 table.
 */
import type { FacilityStateMap, SqlRow } from '../types';
import { stateKey } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round } from '../prng';

export function generateProvisionRows(
  stateMap: FacilityStateMap,
  facilityIds: string[],
  dates: string[],
  registry: IDRegistry,
): SqlRow[] {
  const rows: SqlRow[] = [];

  for (const date of dates) {
    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      const provisionId = registry.allocate('ecl_provision_snapshot', 1)[0];

      // Stage migration tracking
      const stageLabel = `STAGE_${state.ifrs9_stage}`;
      const provisionAmount = state.ifrs9_stage === 1
        ? state.ecl_12m
        : state.ecl_lifetime;

      // Coverage ratio = provision / drawn amount
      const coverageRatio = state.drawn_amount > 0
        ? round(provisionAmount / state.drawn_amount, 6)
        : 0;

      rows.push({
        provision_id: provisionId,
        facility_id: state.facility_id,
        counterparty_id: state.counterparty_id,
        as_of_date: date,
        currency_code: state.currency_code,
        ifrs9_stage: state.ifrs9_stage,
        stage_label: stageLabel,
        pd_annual: round(state.pd_annual, 6),
        pd_at_origination: round(state.pd_at_origination, 6),
        lgd_current: round(state.lgd_current, 6),
        ead: round(state.ead, 2),
        ecl_12m: round(state.ecl_12m, 2),
        ecl_lifetime: round(state.ecl_lifetime, 2),
        provision_amount: round(provisionAmount, 2),
        coverage_ratio_pct: coverageRatio,
        remaining_tenor_months: state.remaining_tenor_months,
        days_past_due: state.days_past_due,
        credit_status: state.credit_status,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });
    }
  }

  return rows;
}
