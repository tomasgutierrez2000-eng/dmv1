/**
 * Generator: non-credit position + position_detail rows.
 *
 * Parallel to position.ts but for standalone positions (facility_id = NULL).
 * Reads from PositionStateMap instead of FacilityStateMap.
 */

import type { SqlRow } from '../types';
import { FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { PositionStateMap, PositionState } from '../position-types';
import { positionStateKey } from '../position-types';
import type { IDRegistry } from '../../id-registry';
import { round } from '../prng';

const NC_SOURCE = 'NC_PRODUCT_FACTORY';

/**
 * Generate l2.position and l2.position_detail rows from PositionStateMap.
 *
 * IMPORTANT: l2.position PK is just position_id (NOT composite with as_of_date).
 * So each (conceptual_position, date) pair needs a UNIQUE position_id allocated
 * from the registry — same pattern as the credit facility position generator.
 */
export function generateNCPositionRows(
  stateMap: PositionStateMap,
  positionIds: number[],
  dates: string[],
  registry: IDRegistry,
): { positions: SqlRow[]; positionDetails: SqlRow[]; positionIdMap: Map<string, number> } {
  const positions: SqlRow[] = [];
  const positionDetails: SqlRow[] = [];
  const positionIdMap = new Map<string, number>();

  for (const date of dates) {
    for (const conceptualPosId of positionIds) {
      const state = stateMap.get(positionStateKey(conceptualPosId, date));
      if (!state) continue;

      // Allocate a unique position_id for this (position, date) pair
      const dbPosId = registry.allocate('nc_position', 1, 'nc-products')[0];
      positionIdMap.set(`${conceptualPosId}|${date}`, dbPosId);

      positions.push(buildPositionRow(state, date, dbPosId));
      positionDetails.push(buildPositionDetailRow(state, date, dbPosId));
    }
  }

  return { positions, positionDetails, positionIdMap };
}

function buildPositionRow(state: PositionState, date: string, dbPosId: number): SqlRow {
  const bal = getBalanceAmount(state);
  const notional = getNotionalAmount(state);
  const accruedInterest = getAccruedInterest(state);

  return {
    position_id: dbPosId,
    as_of_date: date,
    facility_id: null,  // standalone — no facility
    counterparty_id: state.counterparty_id,
    balance_amount: round(bal, 2),
    currency_code: state.currency_code,
    accrued_interest_amt: round(accruedInterest, 2),
    book_value_amt: round(Math.abs(bal) + accruedInterest, 2),
    market_value_amt: round(getMarketValue(state), 2),
    notional_amount: round(notional, 2),
    credit_status_code: 'PERFORMING',
    internal_risk_rating: state.internal_rating,
    external_risk_rating: state.external_rating,
    pd_estimate: state.pd_annual > 0 ? state.pd_annual.toFixed(6) : null,
    lgd_estimate: state.lgd_estimate > 0 ? state.lgd_estimate.toFixed(6) : null,
    effective_date: state.origination_date,
    contractual_maturity_date: state.maturity_date,
    legal_entity_id: state.legal_entity_id,
    is_trading_banking_book_flag: isTradingBook(state),
    exposure_type_code: getExposureType(state),
    product_code: state.product_code,
    product_subtype_id: state.product_subtype_id,
    netting_set_id: state.category === 'DERIVATIVES' ? state.netting_set_id : null,
    customer_id: `CUST-${state.counterparty_id}`,
    cost_center_id: state.legal_entity_id * 100 + (state.position_id % 10),
    source_system_id: FACTORY_SOURCE_SYSTEM_ID,
    record_source: NC_SOURCE,
    created_by: 'nc_factory',
  };
}

function buildPositionDetailRow(state: PositionState, date: string, dbPosId: number): SqlRow {
  return {
    position_id: dbPosId,
    as_of_date: date,
    detail_type: state.category,
    amount: round(getBalanceAmount(state), 2),
    current_balance: round(Math.abs(getBalanceAmount(state)), 2),
    interest_rate: getInterestRate(state),
    rate_type: state.category === 'BORROWINGS' && state.is_overnight ? 'OVERNIGHT' : 'FLOATING',
    origination_date: state.origination_date,
    maturity_date: state.maturity_date,
    source_system_id: FACTORY_SOURCE_SYSTEM_ID,
    record_source: NC_SOURCE,
    created_by: 'nc_factory',
  };
}

// ─── State → Row Mapping Helpers ─────────────────────────────────────────

function getBalanceAmount(s: PositionState): number {
  switch (s.category) {
    case 'DERIVATIVES': return s.mtm_value;
    case 'SFT': return s.cash_leg_amount;
    case 'SECURITIES': return s.face_value * s.price / 100;
    case 'DEPOSITS': return s.balance;
    case 'BORROWINGS': return s.principal_amount;
    case 'DEBT': return s.outstanding_balance;
    case 'EQUITIES': return s.market_value;
    case 'STOCK': return s.shares * s.price_per_share;
  }
}

function getNotionalAmount(s: PositionState): number {
  switch (s.category) {
    case 'DERIVATIVES': return s.notional_amount;
    case 'SFT': return s.cash_leg_amount;
    case 'SECURITIES': return s.face_value;
    case 'DEPOSITS': return s.balance;
    case 'BORROWINGS': return s.principal_amount;
    case 'DEBT': return s.face_value;
    case 'EQUITIES': return s.market_value;
    case 'STOCK': return s.shares * s.price_per_share;
  }
}

function getMarketValue(s: PositionState): number {
  switch (s.category) {
    case 'DERIVATIVES': return s.mtm_value;
    case 'SFT': return s.cash_leg_amount;
    case 'SECURITIES': return s.face_value * s.price / 100;
    case 'DEPOSITS': return s.balance;
    case 'BORROWINGS': return s.principal_amount;
    case 'DEBT': return s.face_value * s.price / 100;
    case 'EQUITIES': return s.market_value;
    case 'STOCK': return s.shares * s.price_per_share;
  }
}

function getAccruedInterest(s: PositionState): number {
  switch (s.category) {
    case 'DERIVATIVES': return 0;
    case 'SFT': return s.cash_leg_amount * s.repo_rate / 12;
    case 'SECURITIES': return s.accrued_interest;
    case 'DEPOSITS': return s.balance * s.interest_rate / 12;
    case 'BORROWINGS': return s.principal_amount * s.interest_rate / 12;
    case 'DEBT': return s.face_value * s.coupon_rate / 12;
    case 'EQUITIES': return s.market_value * s.dividend_yield / 12;
    case 'STOCK': return 0;
  }
}

function getInterestRate(s: PositionState): number | null {
  switch (s.category) {
    case 'DERIVATIVES': return s.interest_rate;
    case 'SFT': return s.repo_rate;
    case 'SECURITIES': return s.coupon_rate;
    case 'DEPOSITS': return s.interest_rate;
    case 'BORROWINGS': return s.interest_rate;
    case 'DEBT': return s.coupon_rate;
    case 'EQUITIES': return null;
    case 'STOCK': return null;
  }
}

function getExposureType(s: PositionState): string {
  switch (s.category) {
    case 'DERIVATIVES': return 'DERIVATIVE';
    case 'SFT': return 'SFT';
    case 'SECURITIES': return 'SECURITY';
    case 'DEPOSITS': return 'DEPOSIT';
    case 'BORROWINGS': return 'BORROWING';
    case 'DEBT': return 'DEBT';
    case 'EQUITIES': return 'EQUITY';
    case 'STOCK': return 'EQUITY';
  }
}

function isTradingBook(s: PositionState): boolean {
  if (s.category === 'DERIVATIVES') return s.is_trading_book;
  if (s.category === 'SECURITIES') return s.accounting_intent === 'TRADING';
  return false;
}
