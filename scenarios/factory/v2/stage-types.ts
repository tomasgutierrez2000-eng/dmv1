/**
 * Typed stage interfaces for the facility state evolution pipeline.
 *
 * Each stage declares exactly which FacilityState fields it reads (Input)
 * and which fields it writes (Output). The compiler enforces that stages
 * cannot silently depend on or mutate fields outside their contract.
 *
 * Convention: inputs use Pick<FacilityState, ...> so the types stay in sync
 * with FacilityState automatically — no parallel hierarchy to maintain.
 */

import type {
  FacilityState, CounterpartyFinancials, FacilityEvent,
  CreditStatus, IFRS9Stage, CovenantState,
} from './types';
import type { MarketEnvironment } from './market-environment';
import type { TimeFrequency } from './types';

// ─── Shared Context (passed to every stage) ─────────────────────────────

export interface StageContext {
  date: string;
  dates: string[];
  dateIdx: number;
  dt: number;
  rng: () => number;
}

// ─── Stage 1: Base Rate ─────────────────────────────────────────────────

export type BaseRateInput = Pick<FacilityState, 'currency_code'>;

export interface BaseRateOutput {
  base_rate_pct: number;
  cost_of_funds_pct: number;
}

// ─── Stage 2: Draw Behavior ─────────────────────────────────────────────

export type DrawBehaviorInput = Pick<FacilityState,
  | 'story_arc' | 'drawn_amount' | 'committed_amount'
  | 'product_type' | 'lifecycle_stage' | 'industry_id'
  | 'original_committed' | 'facility_type_code'
>;

export interface DrawBehaviorOutput {
  drawn_amount: number;
  undrawn_amount: number;
  prior_drawn_amount: number;
  last_draw_date: string | null;
  last_repay_date: string | null;
}

// ─── Stage 3: Collateral Revaluation ────────────────────────────────────

export type CollateralInput = Pick<FacilityState,
  | 'collateral_value' | 'collateral_type' | 'drawn_amount'
>;

export interface CollateralOutput {
  collateral_value: number;
  ltv_ratio: number;
}

// ─── Stage 4: PD Update ────────────────────────────────────────────────

export type PDUpdateInput = Pick<FacilityState,
  | 'pd_at_origination' | 'industry_id' | 'story_arc'
>;

export interface PDUpdateOutput {
  pd_annual: number;
}

// ─── Stage 5: Spread Update ────────────────────────────────────────────

export type SpreadUpdateInput = Pick<FacilityState,
  | 'spread_bps' | 'rating_tier' | 'story_arc'
>;

export interface SpreadUpdateOutput {
  spread_bps: number;
}

// ─── Stage 6: Pricing ──────────────────────────────────────────────────

export type PricingInput = Pick<FacilityState,
  | 'base_rate_pct' | 'spread_bps' | 'product_type'
  | 'committed_amount' | 'drawn_amount' | 'industry_id'
>;

export interface PricingOutput {
  all_in_rate_pct: number;
  last_rate_reset_date: string;
}

// ─── Stage 7: Credit Status, DPD & Covenant Testing ────────────────────

export type CovenantTestInput = Pick<FacilityState,
  | 'story_arc' | 'credit_status' | 'days_past_due'
  | 'covenant_package' | 'covenants' | 'rating_tier'
  | 'facility_id' | 'counterparty_id'
  | 'drawn_amount' | 'collateral_value'
  | 'lgd_current' | 'pd_annual'
>;

export interface CovenantTestOutput {
  credit_status: CreditStatus;
  days_past_due: number;
  covenants: CovenantState[];
  next_test_date: string | null;
  events: FacilityEvent[];
}

// ─── Stage 8: IFRS 9 Staging ───────────────────────────────────────────

export type IFRS9Input = Pick<FacilityState,
  | 'ifrs9_stage' | 'days_past_due' | 'credit_status'
  | 'pd_annual' | 'pd_at_origination' | 'events_this_period'
>;

export interface IFRS9Output {
  ifrs9_stage: IFRS9Stage;
}

// ─── Stage 9: Derived Metrics ──────────────────────────────────────────

export type DerivedMetricsInput = Pick<FacilityState,
  | 'product_type' | 'drawn_amount' | 'undrawn_amount'
  | 'risk_weight_pct' | 'pd_annual' | 'lgd_current'
  | 'ifrs9_stage' | 'remaining_tenor_months' | 'maturity_date'
>;

export interface DerivedMetricsOutput {
  ead: number;
  ccf: number;
  rwa: number;
  expected_loss: number;
  ecl_12m: number;
  ecl_lifetime: number;
  remaining_tenor_months: number;
  dscr: number;
  icr: number;
  leverage_ratio: number;
}

// ─── Stage 10: Lifecycle Transitions ────────────────────────────────────

export type LifecycleInput = Pick<FacilityState,
  | 'lifecycle_stage' | 'remaining_tenor_months'
  | 'drawn_amount' | 'product_type' | 'original_committed'
  | 'days_past_due' | 'credit_status'
  | 'committed_amount' | 'facility_id' | 'counterparty_id'
  | 'covenants' | 'covenant_package' | 'collateral_type'
  | 'ltv_ratio' | 'events_this_period'
>;

export interface LifecycleOutput {
  lifecycle_stage: FacilityState['lifecycle_stage'];
  events: FacilityEvent[];
}
