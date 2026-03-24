/**
 * Generator: facility_profitability_snapshot
 * Reads: NII = drawn * (all_in - cof), fee income, allocated equity
 */
import type { FacilityStateMap, SqlRow } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round } from '../prng';

export function generateProfitabilityRows(
  stateMap: FacilityStateMap,
  facilityIds: string[],
  dates: string[],
  registry: IDRegistry,
): SqlRow[] {
  const rows: SqlRow[] = [];

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      const snapshotId = registry.allocate('facility_profitability_snapshot', 1)[0];

      // NII = drawn * (all-in rate - cost of funds)
      const nim = state.all_in_rate_pct - state.cost_of_funds_pct;
      const interestIncome = round(state.drawn_amount * state.all_in_rate_pct / 12, 2);
      const interestExpense = round(state.drawn_amount * state.cost_of_funds_pct / 12, 2);
      const nii = round(interestIncome - interestExpense, 2);

      // Fee income = undrawn * fee_rate / 12
      const feeIncome = round(state.undrawn_amount * state.fee_rate_pct / 12, 2);

      // YTD accumulation (simplified: multiply monthly by month index in year)
      const month = new Date(date + 'T00:00:00Z').getUTCMonth() + 1;
      const niiYtd = round(nii * month, 2);
      const feeYtd = round(feeIncome * month, 2);

      // Allocated equity = RWA * 10.5% (CET1 requirement)
      const allocatedEquity = round(state.rwa * 0.105, 2);

      rows.push({
        profitability_snapshot_id: snapshotId,
        facility_id: state.facility_id,
        as_of_date: date,
        currency_code: state.currency_code,
        interest_income_amt: interestIncome,
        interest_expense_amt: interestExpense,
        nii_ytd: niiYtd,
        fee_income_amt: feeIncome,
        fee_income_ytd: feeYtd,
        allocated_equity_amt: allocatedEquity,
        equity_allocation_pct: state.rwa > 0 ? round(0.105, 6) : 0,
        avg_earning_assets_amt: round(state.drawn_amount, 2),
        avg_nonearning_assets_amt: round(state.undrawn_amount * 0.10, 2),
        base_currency_code: state.currency_code,
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });
    }
  }

  return rows;
}
