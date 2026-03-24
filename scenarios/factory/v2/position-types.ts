/**
 * Position-centric types for non-credit products (derivatives, SFT, securities,
 * deposits, borrowings, debt, equities, stock).
 *
 * Parallel to FacilityState but purpose-built for products that don't have
 * a facility → agreement → counterparty chain.
 */

import type { RatingTier } from '../../../scripts/shared/mvp-config';

// ─── Category Types ──────────────────────────────────────────────────────

export type NonCreditCategory =
  | 'DERIVATIVES' | 'SFT' | 'SECURITIES' | 'DEPOSITS'
  | 'BORROWINGS' | 'DEBT' | 'EQUITIES' | 'STOCK';

export const ALL_NC_CATEGORIES: NonCreditCategory[] = [
  'DERIVATIVES', 'SFT', 'SECURITIES', 'DEPOSITS',
  'BORROWINGS', 'DEBT', 'EQUITIES', 'STOCK',
];

// ─── Product Subtype Codes (mirror l1.product_subtype_dim IDs 11-49) ────

export const NC_PRODUCT_CODES: Record<NonCreditCategory, { code: string; subtypeId: number }[]> = {
  DERIVATIVES: [
    { code: 'IRS', subtypeId: 11 }, { code: 'CDS', subtypeId: 12 },
    { code: 'FX_FORWARD', subtypeId: 13 }, { code: 'FX_OPTION', subtypeId: 14 },
    { code: 'EQUITY_SWAP', subtypeId: 15 }, { code: 'COMMODITY_FUT', subtypeId: 16 },
    { code: 'SWAPTION', subtypeId: 17 }, { code: 'TRS', subtypeId: 18 },
  ],
  SFT: [
    { code: 'REPO', subtypeId: 26 }, { code: 'REVERSE_REPO', subtypeId: 27 },
    { code: 'SEC_LENDING', subtypeId: 28 }, { code: 'SEC_BORROWING', subtypeId: 29 },
    { code: 'MARGIN_LOAN', subtypeId: 30 },
  ],
  SECURITIES: [
    { code: 'GOVT_BOND', subtypeId: 19 }, { code: 'CORP_BOND', subtypeId: 20 },
    { code: 'MBS', subtypeId: 21 }, { code: 'ABS', subtypeId: 22 },
    { code: 'CLO', subtypeId: 23 }, { code: 'MUNI', subtypeId: 24 },
    { code: 'AGENCY', subtypeId: 25 },
  ],
  DEPOSITS: [
    { code: 'DEMAND_DEP', subtypeId: 36 }, { code: 'TIME_DEP', subtypeId: 37 },
    { code: 'SAVINGS', subtypeId: 38 }, { code: 'MMDA', subtypeId: 39 },
  ],
  BORROWINGS: [
    { code: 'FED_FUNDS', subtypeId: 40 }, { code: 'FHLB_ADV', subtypeId: 41 },
    { code: 'BROKERED_DEP', subtypeId: 42 },
  ],
  DEBT: [
    { code: 'SENIOR_NOTE', subtypeId: 43 }, { code: 'SUBORD_NOTE', subtypeId: 44 },
    { code: 'COVERED_BOND', subtypeId: 45 },
  ],
  EQUITIES: [
    { code: 'COMMON_EQ', subtypeId: 46 }, { code: 'PREFERRED_EQ', subtypeId: 47 },
  ],
  STOCK: [
    { code: 'COMMON_STOCK', subtypeId: 48 }, { code: 'PREFERRED_STK', subtypeId: 49 },
  ],
};

// ─── Base Position State ─────────────────────────────────────────────────

interface PositionStateBase {
  position_id: string;
  counterparty_id: string;
  product_subtype_id: number;
  product_code: string;             // e.g., 'IRS', 'REPO', 'GOVT_BOND'
  category: NonCreditCategory;
  currency_code: string;
  legal_entity_id: number;
  origination_date: string;
  maturity_date: string | null;     // null for perpetual (equities, demand deposits)
  remaining_tenor_months: number;
  external_rating: string;
  internal_rating: string;
  pd_annual: number;
  lgd_estimate: number;
  rating_tier: RatingTier;
}

// ─── Product-Specific States ─────────────────────────────────────────────

export interface DerivativeState extends PositionStateBase {
  category: 'DERIVATIVES';
  derivative_type: string;
  notional_amount: number;
  mtm_value: number;                // mark-to-market (can be negative)
  pfe_amount: number;               // potential future exposure
  replacement_cost: number;
  netting_set_id: number;
  clearing_status: 'CLEARED' | 'BILATERAL';
  direction: 'PAY' | 'RECEIVE';
  is_hedge: boolean;
  is_trading_book: boolean;
  collateral_posted: number;
  collateral_received: number;
  interest_rate: number;
}

export interface SFTState extends PositionStateBase {
  category: 'SFT';
  sft_type: string;
  cash_leg_amount: number;
  collateral_value: number;
  haircut_pct: number;
  repo_rate: number;
  is_principal: boolean;
  collateral_quality: 'LEVEL_1' | 'LEVEL_2A' | 'LEVEL_2B';
  rehypothecation_flag: boolean;
}

export interface SecurityState extends PositionStateBase {
  category: 'SECURITIES';
  security_type: string;
  face_value: number;
  price: number;                    // clean price as % of par (e.g., 98.5)
  yield_to_maturity: number;
  duration: number;
  credit_spread_bps: number;
  coupon_rate: number;
  accrued_interest: number;
  accounting_intent: 'HTM' | 'AFS' | 'TRADING';
  amortization_factor: number;      // for MBS/ABS prepayment
}

export interface DepositState extends PositionStateBase {
  category: 'DEPOSITS';
  deposit_type: string;
  balance: number;
  interest_rate: number;
  is_insured: boolean;
  insured_balance: number;
  stability_class: 'STABLE' | 'LESS_STABLE';
  is_operational: boolean;
  is_brokered: boolean;
  prior_balance: number;
}

export interface BorrowingState extends PositionStateBase {
  category: 'BORROWINGS';
  borrowing_type: string;
  principal_amount: number;
  interest_rate: number;
  funding_cost_bps: number;
  is_overnight: boolean;
  is_secured: boolean;
}

export interface DebtState extends PositionStateBase {
  category: 'DEBT';
  debt_type: string;
  face_value: number;
  coupon_rate: number;
  price: number;
  credit_spread_bps: number;
  outstanding_balance: number;
  is_callable: boolean;
}

export interface EquityState extends PositionStateBase {
  category: 'EQUITIES';
  equity_type: 'COMMON' | 'PREFERRED';
  shares: number;
  price_per_share: number;
  cost_basis: number;
  dividend_yield: number;
  ownership_pct: number;
  market_value: number;
}

export interface StockState extends PositionStateBase {
  category: 'STOCK';
  stock_type: 'COMMON' | 'PREFERRED';
  shares: number;
  price_per_share: number;
  cost_basis: number;
  unrealized_gain_loss: number;
  accounting_method: 'EQUITY_METHOD' | 'FAIR_VALUE' | 'COST_METHOD';
}

// ─── Discriminated Union ─────────────────────────────────────────────────

export type PositionState =
  | DerivativeState | SFTState | SecurityState | DepositState
  | BorrowingState | DebtState | EquityState | StockState;

/** Map of "positionId|date" → PositionState. */
export type PositionStateMap = Map<string, PositionState>;

/** Make a state map key. */
export function positionStateKey(positionId: string | number, date: string): string {
  return `${positionId}|${date}`;
}
