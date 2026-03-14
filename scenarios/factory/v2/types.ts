/**
 * Core types for Data Factory v2.
 *
 * FacilityState is the central abstraction — a single evolving state per
 * facility that all L2 generators read from, guaranteeing cross-table
 * correlation.
 */

import type { StoryArc, RatingTier, SizeProfile } from '../../../scripts/shared/mvp-config';

/** Source system ID for all factory-generated data. Matches l1.source_system_dim PK=1. */
export const FACTORY_SOURCE_SYSTEM_ID = 1;

// ─── Product Types ──────────────────────────────────────────────────────

export type ProductType =
  | 'REVOLVING_CREDIT'
  | 'TERM_LOAN'
  | 'TERM_LOAN_B'
  | 'LETTER_OF_CREDIT'
  | 'BRIDGE_LOAN'
  | 'DELAYED_DRAW_TERM_LOAN'
  | 'SWINGLINE';

// ─── Credit Status ──────────────────────────────────────────────────────

export type CreditStatus =
  | 'PERFORMING'
  | 'WATCH'
  | 'SPECIAL_MENTION'
  | 'SUBSTANDARD'
  | 'DOUBTFUL'
  | 'DEFAULT';

/** Map credit status to integer codes used in L2 tables. */
export const CREDIT_STATUS_CODE: Record<CreditStatus, number> = {
  PERFORMING: 1,
  WATCH: 3,
  SPECIAL_MENTION: 4,
  SUBSTANDARD: 5,
  DOUBTFUL: 9,
  DEFAULT: 10,
};

// ─── Lifecycle ──────────────────────────────────────────────────────────

export type LifecycleStage =
  | 'COMMITMENT'      // Signed but not yet funded
  | 'FUNDED'          // Active and drawing
  | 'AMORTIZING'      // Term loan principal declining
  | 'MATURING'        // Within 90 days of maturity
  | 'MATURED'         // Past maturity date
  | 'RESTRUCTURED'    // Modified terms
  | 'DEFAULT'         // Non-performing
  | 'WORKOUT'         // Active recovery
  | 'WRITTEN_OFF';    // Charged off

// ─── IFRS 9 ─────────────────────────────────────────────────────────────

export type IFRS9Stage = 1 | 2 | 3;

// ─── Covenants ──────────────────────────────────────────────────────────

export type CovenantType =
  | 'MIN_DSCR'
  | 'MAX_LTV'
  | 'MIN_ICR'
  | 'MAX_LEVERAGE'
  | 'MIN_CURRENT_RATIO'
  | 'MIN_TANGIBLE_NET_WORTH'
  | 'MAX_CAPEX'
  | 'MIN_FIXED_CHARGE';

export interface CovenantDefinition {
  type: CovenantType;
  threshold: number;
  direction: 'MIN' | 'MAX';
  warning_buffer_pct: number;  // e.g., 0.10 = warn at 10% headroom
}

export interface CovenantPackage {
  covenants: CovenantDefinition[];
  test_frequency: 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  cure_period_days: number;
  cross_default_threshold: number;
}

export interface CovenantState {
  covenant_type: CovenantType;
  threshold_value: number;
  current_value: number;
  headroom_pct: number;       // (current - threshold) / threshold
  is_breached: boolean;
  is_warning: boolean;
  waiver_active: boolean;
  last_test_date: string | null;
}

// ─── Events ─────────────────────────────────────────────────────────────

export interface FacilityEvent {
  type: string;
  date: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  triggered_by: string;
  facility_ids: number[];
  counterparty_id: number;
}

// ─── Amortization ───────────────────────────────────────────────────────

export interface AmortizationEntry {
  payment_date: string;
  principal_amount: number;
  interest_amount: number;
  remaining_balance: number;
}

// ─── Market Environment ─────────────────────────────────────────────────

export type RateEnvironment =
  | 'CURRENT_2024'
  | 'CUTTING_CYCLE'
  | 'RISING_RATES'
  | 'RATE_PLATEAU'
  | 'ZERO_LOWER_BOUND'
  | 'CUSTOM';

export interface RateSnapshot {
  fed_funds: number;
  sofr_1m: number;
  sofr_3m: number;
  sofr_6m: number;
  prime: number;
  euribor_3m: number;
  sonia: number;
  tibor_3m: number;
}

export interface SectorCondition {
  industry_id: number;
  stress_level: 'NORMAL' | 'ELEVATED' | 'STRESSED' | 'CRISIS';
  pd_multiplier: number;
  collateral_haircut_pct: number;
  spread_adder_bps: number;
}

export interface MarketSnapshot {
  date: string;
  rates: RateSnapshot;
  fx: Record<string, number>;  // currency -> USD rate
  credit_spreads: Record<RatingTier, number>;  // bps over base
  sector_conditions: Map<number, SectorCondition>;
}

// ─── Time Series ────────────────────────────────────────────────────────

export type TimeFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY';

export interface TimeSeriesConfig {
  start_date: string;
  end_date: string;
  frequency: TimeFrequency;
  snapshot_dates?: string[];  // Override: explicit dates (backward compat)
}

// ─── Counterparty Financial Model ───────────────────────────────────────

export interface CounterpartyFinancials {
  counterparty_id: number;
  total_revenue: number;
  ebitda: number;
  net_income: number;
  total_assets: number;
  total_liabilities: number;
  equity: number;
  total_debt: number;
  interest_expense: number;
  current_assets: number;
  current_liabilities: number;
  tangible_net_worth: number;
  capex: number;
  fixed_charges: number;
}

// ─── Facility State (THE CORE) ──────────────────────────────────────────

export interface FacilityState {
  // ── Identity ──
  facility_id: number;
  counterparty_id: number;
  credit_agreement_id: number;
  product_type: ProductType;
  currency_code: string;
  facility_type_code: string;   // Original type code from L1

  // ── Profile (immutable) ──
  story_arc: StoryArc;
  rating_tier: RatingTier;
  size_profile: SizeProfile;
  industry_id: number;
  country_code: string;

  // ── Balances ──
  committed_amount: number;
  drawn_amount: number;
  undrawn_amount: number;
  original_committed: number;  // At origination (never changes)

  // ── Credit Quality ──
  pd_annual: number;
  pd_at_origination: number;   // For IFRS 9 stage migration
  lgd_current: number;
  internal_rating: string;
  external_rating_sp: string;
  external_rating_moodys: string;
  credit_status: CreditStatus;
  days_past_due: number;
  ifrs9_stage: IFRS9Stage;

  // ── Pricing ──
  spread_bps: number;
  base_rate_pct: number;
  all_in_rate_pct: number;
  fee_rate_pct: number;
  cost_of_funds_pct: number;

  // ── Collateral ──
  collateral_value: number;
  collateral_type: string;    // RE, RECEIVABLES, FLEET, EQUIPMENT, CASH, NONE
  ltv_ratio: number;

  // ── Covenants ──
  covenant_package: CovenantPackage | null;
  covenants: CovenantState[];
  next_test_date: string | null;

  // ── Lifecycle ──
  lifecycle_stage: LifecycleStage;
  origination_date: string;
  maturity_date: string;
  remaining_tenor_months: number;
  amortization_schedule: AmortizationEntry[] | null;
  next_payment_date: string | null;
  is_revolving: boolean;

  // ── Risk Metrics (derived, cached) ──
  ead: number;
  ccf: number;
  rwa: number;
  risk_weight_pct: number;
  expected_loss: number;
  ecl_12m: number;
  ecl_lifetime: number;

  // ── Financial Ratios (counterparty-level, cached) ──
  dscr: number;
  icr: number;
  leverage_ratio: number;

  // ── Tracking ──
  last_draw_date: string | null;
  last_repay_date: string | null;
  last_rate_reset_date: string | null;
  prior_drawn_amount: number;    // For cash flow delta calc

  // ── Events This Period ──
  events_this_period: FacilityEvent[];
}

// ─── Facility State History ─────────────────────────────────────────────

/** Map of "facilityId|date" → FacilityState for all time steps. */
export type FacilityStateMap = Map<string, FacilityState>;

/** Make a state map key. */
export function stateKey(facilityId: number, date: string): string {
  return `${facilityId}|${date}`;
}

// ─── Generator Output Types ─────────────────────────────────────────────

/** Generic row type for SQL emission. */
export type SqlRow = Record<string, unknown>;

/** Table data for emission. */
export interface TableData {
  schema: string;   // 'l1', 'l2', 'l3'
  table: string;
  rows: SqlRow[];
}

// ─── V2 Scenario Config Extensions ─────────────────────────────────────

export interface V2MarketConfig {
  preset: RateEnvironment;
  sector_shocks?: {
    industry_id: number;
    stress_level: 'NORMAL' | 'ELEVATED' | 'STRESSED' | 'CRISIS';
    effective_date: string;
  }[];
  rate_overrides?: Partial<RateSnapshot>;
}

export interface V2TimeSeriesConfig {
  start_date: string;
  end_date: string;
  frequency: TimeFrequency;
}

export interface V2LifecycleConfig {
  include_matured: boolean;
  include_workouts: boolean;
  refinancing_probability: number;
}

export interface V2CovenantConfig {
  override: boolean;
  packages?: CovenantDefinition[];
}
