/**
 * Generator: cash_flow
 * Reads: draw/repay deltas, interest income, fees
 *
 * Note: cash_flow table may not exist in the current DD schema.
 * This generator produces rows that can be adapted to whatever
 * cash flow table structure exists.
 */
import type { FacilityStateMap, SqlRow } from '../types';
import { stateKey } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round } from '../prng';

export function generateCashFlowRows(
  stateMap: FacilityStateMap,
  facilityIds: string[],
  dates: string[],
  registry: IDRegistry,
): SqlRow[] {
  const rows: SqlRow[] = [];

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const prevDate = i > 0 ? dates[i - 1] : null;

    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      const prevState = prevDate ? stateMap.get(stateKey(facId, prevDate)) : null;
      const priorDrawn = prevState?.drawn_amount ?? 0;
      const drawDelta = state.drawn_amount - priorDrawn;

      // Interest = drawn * all_in_rate / 12 (simplified monthly)
      const interestAmount = round(state.drawn_amount * state.all_in_rate_pct / 12, 2);
      // Fee income = undrawn * fee_rate / 12
      const feeAmount = round(state.undrawn_amount * state.fee_rate_pct / 12, 2);

      const cashFlowId = registry.allocate('cash_flow', 1)[0];

      // Disbursement (draw)
      if (drawDelta > 0) {
        rows.push({
          cash_flow_id: cashFlowId,
          facility_id: state.facility_id,
          counterparty_id: state.counterparty_id,
          as_of_date: date,
          cash_flow_type: 'DISBURSEMENT',
          amount: round(drawDelta, 2),
          currency_code: state.currency_code,
          direction: 'OUTFLOW',
          interest_amount: interestAmount,
          fee_amount: feeAmount,
          principal_amount: round(drawDelta, 2),
          record_source: 'DATA_FACTORY_V2',
          created_by: 'factory_v2',
        });
      }

      // Repayment
      if (drawDelta < 0) {
        rows.push({
          cash_flow_id: cashFlowId,
          facility_id: state.facility_id,
          counterparty_id: state.counterparty_id,
          as_of_date: date,
          cash_flow_type: 'REPAYMENT',
          amount: round(Math.abs(drawDelta), 2),
          currency_code: state.currency_code,
          direction: 'INFLOW',
          interest_amount: interestAmount,
          fee_amount: feeAmount,
          principal_amount: round(Math.abs(drawDelta), 2),
          record_source: 'DATA_FACTORY_V2',
          created_by: 'factory_v2',
        });
      }

      // Interest payment (always — even if no draw change)
      if (interestAmount > 0 && drawDelta === 0) {
        rows.push({
          cash_flow_id: registry.allocate('cash_flow', 1)[0],
          facility_id: state.facility_id,
          counterparty_id: state.counterparty_id,
          as_of_date: date,
          cash_flow_type: 'INTEREST',
          amount: interestAmount,
          currency_code: state.currency_code,
          direction: 'INFLOW',
          interest_amount: interestAmount,
          fee_amount: feeAmount,
          principal_amount: 0,
          record_source: 'DATA_FACTORY_V2',
          created_by: 'factory_v2',
        });
      }
    }
  }

  return rows;
}
