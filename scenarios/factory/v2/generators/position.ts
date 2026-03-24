/**
 * Generator: position + position_detail
 * Reads: drawn_amount, credit_status, days_past_due
 */
import type { FacilityStateMap, SqlRow } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round, seededRng } from '../prng';

export function generatePositionRows(
  stateMap: FacilityStateMap,
  facilityIds: string[],
  dates: string[],
  registry: IDRegistry,
): { positions: SqlRow[]; positionDetails: SqlRow[]; positionIdMap: Map<string, string> } {
  const positions: SqlRow[] = [];
  const positionDetails: SqlRow[] = [];
  const positionIdMap = new Map<string, string>();

  for (const date of dates) {
    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      const rng = seededRng(`pos-${facId}-${date}`);
      const posId = registry.allocate('position', 1)[0];
      const detailId = registry.allocate('position_detail', 1)[0];

      // Track position_id for product table generators
      positionIdMap.set(`${facId}|${date}`, posId);

      const accruedInterest = round(state.drawn_amount * state.all_in_rate_pct / 12, 2);

      positions.push({
        position_id: posId,
        as_of_date: date,
        facility_id: state.facility_id,
        counterparty_id: state.counterparty_id,
        credit_agreement_id: state.credit_agreement_id,
        balance_amount: round(state.drawn_amount, 2),
        currency_code: state.currency_code,
        accrued_interest_amt: accruedInterest,
        book_value_amt: round(state.drawn_amount + accruedInterest, 2),
        market_value_amt: round(state.drawn_amount * (1 - state.pd_annual), 2),
        notional_amount: round(state.committed_amount, 2),
        credit_status_code: state.credit_status,
        internal_risk_rating: state.internal_rating,
        external_risk_rating: state.external_rating_sp,
        pd_estimate: state.pd_annual.toFixed(6),
        lgd_estimate: state.lgd_current.toFixed(6),
        effective_date: state.origination_date,
        contractual_maturity_date: state.maturity_date,
        is_trading_banking_book_flag: false,
        exposure_type_code: 'CREDIT',
        product_code: state.product_type,
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });

      positionDetails.push({
        position_detail_id: detailId,
        position_id: posId,
        as_of_date: date,
        detail_type: 'LOAN',
        amount: round(state.drawn_amount, 2),
        current_balance: round(state.drawn_amount, 2),
        funded_amount: round(state.drawn_amount, 2),
        unfunded_amount: round(state.undrawn_amount, 2),
        total_commitment: round(state.committed_amount, 2),
        days_past_due: state.days_past_due,
        delinquency_status: state.days_past_due > 0 ? 'DELINQUENT' : 'CURRENT',
        interest_rate: state.all_in_rate_pct,
        spread_bps: round(state.spread_bps, 2),
        rate_type: 'FLOATING',
        origination_date: state.origination_date,
        maturity_date: state.maturity_date,
        ccf: state.ccf,
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });
    }
  }

  return { positions, positionDetails, positionIdMap };
}
