/**
 * Generator: 40 product-specific snapshot tables
 * (10 products × 4 categories: indicative, accounting, classification, risk)
 *
 * Maps FacilityState → product-specific rows at (position_id, as_of_date) grain.
 * Depends on position generator having already allocated position_ids.
 *
 * All 10 product categories fully implemented with GSIB-quality field mappings:
 * Loans, Off-BS Commitments, Derivatives, SFT, Securities, Deposits,
 * Borrowings, Debt, Equities, Stock.
 */
import type { FacilityState, FacilityStateMap, SqlRow } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import { round, seededRng } from '../prng';
import { safePush } from '../safe-collections';

// ─── Types ──────────────────────────────────────────────────────────────

/** The 10 product categories matching the Excel spec */
type ProductCategory =
  | 'loans' | 'derivatives' | 'offbs_commitments' | 'sft'
  | 'securities' | 'deposits' | 'borrowings' | 'debt'
  | 'equities' | 'stock';

/** The 4 snapshot types per product */
type SnapshotType = 'indicative' | 'accounting' | 'classification' | 'risk';

/** A product table's full name, e.g., "loans_accounting_snapshot" */
function tableName(product: ProductCategory, snapshot: SnapshotType): string {
  return `${product}_${snapshot}_snapshot`;
}

/** Map existing ProductType (facility-level) to the product category for product tables.
 *  Uses string comparison so new product_type values are forward-compatible
 *  without requiring ProductType union extension. */
function mapToProductCategory(state: FacilityState): ProductCategory {
  const pt = state.product_type as string;

  // Off-BS Commitments
  if (pt === 'LETTER_OF_CREDIT') return 'offbs_commitments';

  // Derivatives
  if (['IRS', 'CDS', 'FX_FORWARD', 'FX_OPTION', 'EQUITY_SWAP', 'COMMODITY_FUT', 'SWAPTION', 'TRS'].includes(pt))
    return 'derivatives';

  // SFT
  if (['REPO', 'REVERSE_REPO', 'SEC_LENDING', 'SEC_BORROWING', 'MARGIN_LOAN'].includes(pt))
    return 'sft';

  // Securities
  if (['GOVT_BOND', 'CORP_BOND', 'MBS', 'ABS', 'CLO', 'MUNI', 'AGENCY'].includes(pt))
    return 'securities';

  // Deposits
  if (['DEMAND_DEP', 'SAVINGS', 'TIME_DEP', 'MMDA'].includes(pt))
    return 'deposits';

  // Borrowings
  if (['FED_FUNDS', 'FHLB_ADV', 'BROKERED_DEP'].includes(pt))
    return 'borrowings';

  // Debt
  if (['SENIOR_NOTE', 'SUBORD_NOTE', 'COVERED_BOND'].includes(pt))
    return 'debt';

  // Equities
  if (['COMMON_EQ', 'PREFERRED_EQ'].includes(pt))
    return 'equities';

  // Stock
  if (['COMMON_STOCK', 'PREFERRED_STK'].includes(pt))
    return 'stock';

  // Default: all remaining facility-based products are loans
  return 'loans';
}

// ─── Product Table Output ───────────────────────────────────────────────

export interface ProductTableOutput {
  /** Keyed by full table name (e.g., "loans_accounting_snapshot") */
  tables: Map<string, SqlRow[]>;
}

// ─── Universal Fields (all 40 tables get these) ─────────────────────────

function auditFields(): Record<string, unknown> {
  return {
    created_ts: new Date().toISOString().replace('T', ' ').substring(0, 19),
    updated_ts: new Date().toISOString().replace('T', ' ').substring(0, 19),
  };
}

// ─── Loans Generators ───────────────────────────────────────────────────

function loansIndicative(state: FacilityState, positionId: string, date: string): SqlRow {
  const rng = seededRng(`li-${state.facility_id}-${date}`);
  return {
    position_id: positionId,
    as_of_date: date,
    interest_rate: state.all_in_rate_pct,
    interest_rate_index: 'SOFR',
    interest_rate_spread: round(state.spread_bps / 100, 6),
    interest_type_current: 'FLOATING',
    origination_date: state.origination_date,
    maturity_date: state.maturity_date,
    remaining_maturity_days: state.remaining_tenor_months * 30,
    remaining_time_to_repricing: Math.floor(rng() * 90) + 1,
    currency_code: state.currency_code,
    loan_type: state.is_revolving ? 'REVOLVING' : 'TERM',
    product_code: state.product_type,
    commitment_type: state.is_revolving ? 'COMMITTED' : 'UNCOMMITTED',
    repayment_type: state.is_revolving ? 'BULLET' : 'AMORTIZING',
    balloon_flag: false,
    ...auditFields(),
  };
}

function loansAccounting(state: FacilityState, positionId: string, date: string): SqlRow {
  const accruedInterest = round(state.drawn_amount * state.all_in_rate_pct / 12, 4);
  const allowance = round(state.ecl_12m, 4);
  return {
    position_id: positionId,
    as_of_date: date,
    accounting_intent: 'HELD_FOR_INVESTMENT',
    bs_amount: round(state.drawn_amount, 4),
    carrying_value: round(state.drawn_amount - allowance, 4),
    accrued_interest_amount: accruedInterest,
    accrued_interest_dividend_amount: accruedInterest,
    committed_exposure_global: round(state.committed_amount, 4),
    funded_committed_exposure: round(state.drawn_amount, 4),
    unfunded_committed_exposure: round(state.undrawn_amount, 4),
    utilized_exposure_global: round(state.drawn_amount, 4),
    counterparty_exposure_value: round(state.ead, 4),
    exposure_amount: round(state.drawn_amount, 4),
    allowance_balance: allowance,
    allowance_for_credit_losses_amount: allowance,
    charge_off_amount: state.credit_status === 'DEFAULT' ? round(state.drawn_amount * state.lgd_current, 4) : 0,
    recovery_amount: 0,
    fair_value_amount: round(state.drawn_amount * (1 - state.pd_annual * state.lgd_current), 4),
    lendable_value: round(state.collateral_value, 4),
    monthly_draw_amount: round(state.drawn_amount - state.prior_drawn_amount, 4),
    ...auditFields(),
  };
}

function loansClassification(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    customer_id: `CUST-${state.counterparty_id}`,
    facility_id: state.facility_id,
    counterparty_type: ['CORPORATE', 'SME', 'SOVEREIGN', 'BANK'][parseInt(state.counterparty_id, 10) % 4],
    product_category_code: state.product_type,
    industry_code: state.industry_id,
    country: state.country_code,
    loan_status: state.credit_status,
    gl_account_number: 1300,  // Typical loans receivable GL code
    ...auditFields(),
  };
}

function loansRisk(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    probability_of_default_pd: round(state.pd_annual, 6),
    loss_given_default_lgd: round(state.lgd_current, 6),
    expected_loss_given_default_elgd: round(state.lgd_current * 0.9, 6),
    two_year_probability_of_default: round(Math.min(state.pd_annual * 2, 1.0), 6),
    maximum_probability_of_default: round(state.pd_annual * 1.5, 6),
    minimum_probability_of_default: round(state.pd_annual * 0.5, 6),
    internal_risk_rating: state.internal_rating,
    entity_internal_risk_rating: state.internal_rating,
    delinquency_status: state.days_past_due > 0 ? 'DELINQUENT' : 'CURRENT',
    collateral_type: state.collateral_type,
    pledged_flag: parseInt(state.facility_id, 10) % 5 === 0,
    secured_flag: state.collateral_value > 0 ? 'SECURED' : 'UNSECURED',
    treasury_control_flag: false,
    non_accrual_date: state.credit_status === 'DEFAULT' ? date : null,
    ...auditFields(),
  };
}

// ─── Off-BS Commitments Generators ──────────────────────────────────────

function offbsIndicative(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    effective_date: state.origination_date,
    maturity_date: state.maturity_date,
    currency_code: state.currency_code,
    commitment_type: 'IRREVOCABLE',
    ...auditFields(),
  };
}

function offbsAccounting(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    committed_exposure_global: round(state.committed_amount, 4),
    funded_committed_exposure: round(state.drawn_amount, 4),
    unused_commitment_exposure: round(state.undrawn_amount, 4),
    counterparty_exposure_value: round(state.ead, 4),
    credit_conversion_factor: round(state.ccf, 6),
    allowance_for_credit_losses_amount: round(state.ecl_12m, 4),
    exposure_amount: round(state.drawn_amount, 4),
    ...auditFields(),
  };
}

function offbsClassification(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    customer_id: `CUST-${state.counterparty_id}`,
    country_code: state.country_code,
    gl_account_number: 9050,  // Off-balance-sheet commitments
    ...auditFields(),
  };
}

function offbsRisk(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    probability_of_default_pd: round(state.pd_annual, 6),
    loss_given_default_lgd: round(state.lgd_current, 6),
    expected_loss_given_default_elgd: round(state.lgd_current * 0.9, 6),
    two_year_probability_of_default: round(Math.min(state.pd_annual * 2, 1.0), 6),
    maximum_probability_of_default: round(state.pd_annual * 1.5, 6),
    minimum_probability_of_default: round(state.pd_annual * 0.5, 6),
    unconditionally_cancellable_flag: false,
    treasury_control_flag: false,
    ...auditFields(),
  };
}

// ─── Derivatives Generators ──────────────────────────────────────────────

function derivativesIndicative(state: FacilityState, positionId: string, date: string): SqlRow {
  const rng = seededRng(`di-${state.facility_id}-${date}`);
  const derivType = ['IRS', 'CDS', 'FX_FORWARD', 'FX_OPTION', 'EQUITY_SWAP', 'COMMODITY_FUT', 'SWAPTION', 'TRS'][parseInt(state.facility_id, 10) % 8];
  return {
    position_id: positionId,
    as_of_date: date,
    derivative_type: derivType,
    derivative_instrument_type: derivType,
    derivative_direction: parseInt(state.facility_id, 10) % 2 === 0 ? 'PAY' : 'RECEIVE',
    currency_code: state.currency_code,
    maturity_date: state.maturity_date,
    effective_maturity_date: state.maturity_date,
    interest_rate: round(state.base_rate_pct + rng() * 0.02, 6),
    interest_rate_type: derivType === 'IRS' ? 'FIXED' : 'FLOATING',
    clearing_status: parseInt(positionId, 10) % 3 === 0 ? 'CLEARED' : 'BILATERAL',
    clearing_type_flag: parseInt(positionId, 10) % 3 === 0 ? 'CCP_CLEARED' : 'OTC_BILATERAL',
    is_hedge: !state.is_revolving,
    otc_trade_flag: parseInt(positionId, 10) % 3 !== 0,
    reporting_currency: 'USD',
    settlement_currency: state.currency_code,
    transaction_currency: state.currency_code,
    swap_type: ['IRS', 'SWAPTION'].includes(derivType) ? 'FIXED_FLOAT' : null,
    option_type: ['FX_OPTION', 'SWAPTION'].includes(derivType) ? 'CALL' : null,
    product_domain: ['IRS', 'SWAPTION'].includes(derivType) ? 'INTEREST_RATE' :
      ['CDS', 'TRS'].includes(derivType) ? 'CREDIT' :
      ['FX_FORWARD', 'FX_OPTION'].includes(derivType) ? 'FX' :
      derivType === 'EQUITY_SWAP' ? 'EQUITY' : 'COMMODITY',
    risk_type: ['IRS', 'SWAPTION'].includes(derivType) ? 'INTEREST_RATE' :
      ['CDS', 'TRS'].includes(derivType) ? 'CREDIT' :
      ['FX_FORWARD', 'FX_OPTION'].includes(derivType) ? 'FX' :
      derivType === 'EQUITY_SWAP' ? 'EQUITY' : 'COMMODITY',
    ...auditFields(),
  };
}

function derivativesAccounting(state: FacilityState, positionId: string, date: string): SqlRow {
  const rng = seededRng(`da-${state.facility_id}-${date}`);
  const mtm = round(state.committed_amount * (rng() * 0.1 - 0.05), 4); // ±5% of notional
  const notional = round(state.committed_amount, 4);
  return {
    position_id: positionId,
    as_of_date: date,
    accounting_intent: state.is_revolving ? 'TRADING' : 'HEDGING',
    bs_amount: mtm,
    carrying_value: Math.abs(mtm),
    counterparty_exposure_value: Math.max(mtm, 0),
    exposure_amount: round(Math.abs(mtm) * 1.4, 4),
    fair_value: mtm,
    notional_amount: notional,
    notional_amount_at_inception: round(notional * 0.95, 4),
    effective_notional_amount: round(notional * 0.8, 4),
    net_gross_ratio: round(0.65 + rng() * 0.30, 6),
    aggregate_gross_value: round(Math.abs(mtm) * 1.5, 4),
    aggregate_net_value: round(Math.abs(mtm) * (0.65 + rng() * 0.30), 4),
    current_credit_exposure_amount: Math.max(mtm, 0),
    conversion_factor_percentage: 1.0,
    usd_equivalent_amount: Math.abs(mtm),
    trading_intent: state.is_revolving ? 'YES' : 'NO',
    transaction_date: state.origination_date,
    asset_liability_flag: mtm >= 0 ? 'ASSET' : 'LIABILITY',
    ...auditFields(),
  };
}

function derivativesClassification(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    customer_id: `CUST-${state.counterparty_id}`,
    gl_account_number: state.is_revolving ? 4100 : 4200,
    counterparty_type: ['BANK', 'CORPORATE', 'SOVEREIGN', 'FUND'][parseInt(state.counterparty_id, 10) % 4],
    isda_id: `ISDA-${String(state.counterparty_id).padStart(6, '0')}`,
    legal_entity_id: String((parseInt(state.facility_id, 10) % 10) + 1),
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'MUREX',
    internal_transaction_flag: parseInt(state.counterparty_id, 10) % 20 === 0 ? 'Y' : 'N',
    usd_conversion_rate: state.currency_code === 'USD' ? 1.0 :
      state.currency_code === 'EUR' ? 1.08 :
      state.currency_code === 'GBP' ? 1.27 :
      state.currency_code === 'JPY' ? 0.0067 : 1.12,
    qmna: parseInt(positionId, 10) % 3 === 0,
    ...auditFields(),
  };
}

function derivativesRisk(state: FacilityState, positionId: string, date: string): SqlRow {
  const rng = seededRng(`dr-${state.facility_id}-${date}`);
  const pfeMultiplier = parseInt(state.facility_id, 10) % 8 < 2 ? 0.005 : parseInt(state.facility_id, 10) % 8 < 4 ? 0.05 : 0.03;
  return {
    position_id: positionId,
    as_of_date: date,
    probability_of_default_pd: round(state.pd_annual, 6),
    loss_given_default_lgd: round(state.lgd_current, 6),
    expected_loss_given_default_elgd: round(state.lgd_current * 0.9, 6),
    two_year_probability_of_default: round(Math.min(state.pd_annual * 2, 1.0), 6),
    potential_future_exposure_amount: round(state.committed_amount * (pfeMultiplier + rng() * 0.01), 4),
    potential_future_exposure_adjustment: round(state.committed_amount * 0.005, 4),
    eligible_collateral: parseInt(positionId, 10) % 3 === 0 ? round(state.collateral_value * 0.8, 4) : 0,
    eligible_im_cash: parseInt(positionId, 10) % 3 === 0 ? round(state.collateral_value * 0.3, 4) : 0,
    eligible_vm_cash: parseInt(positionId, 10) % 2 === 0 ? round(state.collateral_value * 0.5, 4) : 0,
    collateralization_type: parseInt(positionId, 10) % 3 === 0 ? 'FULLY_COLLATERALIZED' :
      parseInt(positionId, 10) % 3 === 1 ? 'PARTIALLY_COLLATERALIZED' : 'UNCOLLATERALIZED',
    pledged_flag: parseInt(positionId, 10) % 4 === 0,
    secured_flag: parseInt(positionId, 10) % 3 === 0 ? 'SECURED' : 'UNSECURED',
    treasury_control_flag: false,
    maximum_probability_of_default: round(state.pd_annual * 1.5, 6),
    minimum_probability_of_default: round(state.pd_annual * 0.5, 6),
    ...auditFields(),
  };
}

// ─── SFT Generators ─────────────────────────────────────────────────────

function sftIndicative(state: FacilityState, positionId: string, date: string): SqlRow {
  const sftType = ['REPO', 'REVERSE_REPO', 'SEC_LENDING', 'SEC_BORROWING', 'MARGIN_LOAN'][parseInt(state.facility_id, 10) % 5];
  return {
    position_id: positionId,
    as_of_date: date,
    sft_type: sftType,
    sft_contract_id: `SFT-${String(positionId).padStart(8, '0')}`,
    currency_code: state.currency_code,
    maturity_date: state.maturity_date,
    effective_maturity_date: state.maturity_date,
    interest_rate: round(state.base_rate_pct, 6),
    interest_rate_type: 'FLOATING',
    reporting_currency: 'USD',
    settlement_currency: state.currency_code,
    transaction_currency: state.currency_code,
    asset_liability_indicator: ['REPO', 'SEC_LENDING'].includes(sftType) ? 'LIABILITY' : 'ASSET',
    principal_agent: parseInt(positionId, 10) % 3 === 0 ? 'PRINCIPAL' : 'AGENT',
    qmna_flag: parseInt(positionId, 10) % 4 === 0,
    ...auditFields(),
  };
}

function sftAccounting(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    accounting_intent: 'HELD_FOR_INVESTMENT',
    bs_amount: round(state.drawn_amount, 4),
    book_value_amount: round(state.drawn_amount, 4),
    counterparty_exposure_value: round(state.drawn_amount * 0.02, 4),
    exposure_amount: round(state.drawn_amount, 4),
    fair_value_amount: round(state.drawn_amount * 1.02, 4),
    collateral_fair_value: round(state.drawn_amount * 1.05, 4),
    collateral_fair_value_at_reporting_date: round(state.drawn_amount * 1.05, 4),
    collateral_value_at_inception_date: round(state.drawn_amount * 1.02, 4),
    contract_amount: round(state.drawn_amount, 4),
    contract_amount_at_inception_date: round(state.drawn_amount * 0.98, 4),
    contract_amount_at_reporting_date: round(state.drawn_amount, 4),
    usd_equivalent_amount: round(state.drawn_amount, 4),
    settlement_date: state.origination_date,
    transaction_date: state.origination_date,
    accrued_interest_amount: round(state.drawn_amount * state.all_in_rate_pct / 12, 4),
    ...auditFields(),
  };
}

function sftClassification(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    customer_id: `CUST-${state.counterparty_id}`,
    gl_account_number: [2100, 2200, 2300, 2400, 2500][parseInt(state.facility_id, 10) % 5],
    counterparty_type: ['BANK', 'BROKER_DEALER', 'FUND'][parseInt(state.counterparty_id, 10) % 3],
    legal_entity_id: String((parseInt(state.facility_id, 10) % 10) + 1),
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'CALYPSO',
    internal_transaction_flag: parseInt(state.counterparty_id, 10) % 15 === 0 ? 'Y' : 'N',
    transaction_type: ['REPO', 'REVERSE_REPO', 'SECURITIES_LENDING', 'SECURITIES_BORROWING', 'MARGIN_LENDING'][parseInt(state.facility_id, 10) % 5],
    ...auditFields(),
  };
}

function sftRisk(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    probability_of_default_pd: round(state.pd_annual, 6),
    loss_given_default_lgd: round(state.lgd_current * 0.5, 6), // Lower LGD for secured
    expected_loss_given_default_elgd: round(state.lgd_current * 0.4, 6),
    two_year_probability_of_default: round(Math.min(state.pd_annual * 2, 1.0), 6),
    pledged_flag: parseInt(state.facility_id, 10) % 5 < 2,
    secured_flag: 'SECURED',
    encumbered_flag: parseInt(state.facility_id, 10) % 5 === 0,
    treasury_control_flag: false,
    rehypothecated: parseInt(state.facility_id, 10) % 5 === 2 && parseInt(positionId, 10) % 3 === 0 ? 'Y' : 'N',
    liquid_assets_collateral_level: ['LEVEL_1', 'LEVEL_2A', 'LEVEL_2B'][parseInt(positionId, 10) % 3],
    maximum_probability_of_default: round(state.pd_annual * 1.5, 6),
    minimum_probability_of_default: round(state.pd_annual * 0.5, 6),
    ...auditFields(),
  };
}

// ─── Securities Generators ──────────────────────────────────────────────

function securitiesIndicative(state: FacilityState, positionId: string, date: string): SqlRow {
  const rng = seededRng(`si-${state.facility_id}-${date}`);
  const secType = ['GOVT_BOND', 'CORP_BOND', 'MBS', 'ABS', 'CLO', 'MUNI', 'AGENCY'][parseInt(state.facility_id, 10) % 7];
  return {
    position_id: positionId,
    as_of_date: date,
    security_type: secType === 'GOVT_BOND' ? 'GOVERNMENT' : secType === 'CORP_BOND' ? 'CORPORATE' : secType,
    security_sub_type: secType,
    product_code: secType,
    currency_code: state.currency_code,
    maturity_date: state.maturity_date,
    issue_date: state.origination_date,
    interest_rate: round(state.all_in_rate_pct, 6),
    interest_rate_type: parseInt(positionId, 10) % 4 === 0 ? 'FLOATING' : 'FIXED',
    coupon_dividend_rate: round(state.base_rate_pct + 0.005 + rng() * 0.03, 6),
    coupon_int_pmt_periodicity: ['QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'][parseInt(positionId, 10) % 3],
    reporting_currency: 'USD',
    settlement_currency: state.currency_code,
    transaction_currency: state.currency_code,
    weighted_average_life: round(state.remaining_tenor_months / 12 * 0.85, 4),
    amortization_type: ['MBS', 'ABS', 'CLO'].includes(secType) ? 'AMORTIZING' : 'BULLET',
    ...auditFields(),
  };
}

function securitiesAccounting(state: FacilityState, positionId: string, date: string): SqlRow {
  const rng = seededRng(`sa-${state.facility_id}-${date}`);
  const accrued = round(state.drawn_amount * state.all_in_rate_pct / 12, 4);
  return {
    position_id: positionId,
    as_of_date: date,
    accounting_intent: ['HTM', 'AFS', 'TRADING'][parseInt(positionId, 10) % 3],
    balance_sheet_amount: round(state.drawn_amount, 4),
    carrying_value: round(state.drawn_amount * 0.985, 4),
    amortized_cost: round(state.drawn_amount * 0.985, 4),
    fair_value_amount: round(state.drawn_amount * (1 + (rng() * 0.04 - 0.02)), 4),
    market_value: round(state.drawn_amount * (1 + (rng() * 0.04 - 0.02)), 4),
    accrued_interest_amount: accrued,
    accrued_interest_dividend_amount: accrued,
    original_face_value: round(state.committed_amount, 4),
    current_face_value: round(state.committed_amount * (1 - parseInt(state.facility_id, 10) % 100 * 0.0001), 4),
    counterparty_exposure_value: round(state.drawn_amount, 4),
    exposure_amount: round(state.drawn_amount, 4),
    unrealized_gain_loss: round(state.drawn_amount * (rng() * 0.04 - 0.02), 4),
    book_yield: round(state.all_in_rate_pct, 6),
    original_book_yield: round(state.base_rate_pct + 0.005, 6),
    purchase_price: round(state.drawn_amount * 0.99, 4),
    price: round(100 + (rng() * 5 - 2.5), 4),
    usd_equivalent_amounts: round(state.drawn_amount, 4),
    fair_value_measurement_level: ['Level_1', 'Level_2', 'Level_3'][parseInt(positionId, 10) % 3],
    settlement_date: state.origination_date,
    trade_date: state.origination_date,
    ...auditFields(),
  };
}

function securitiesClassification(state: FacilityState, positionId: string, date: string): SqlRow {
  const secType = ['GOVT_BOND', 'CORP_BOND', 'MBS', 'ABS', 'CLO', 'MUNI', 'AGENCY'][parseInt(state.facility_id, 10) % 7];
  return {
    position_id: positionId,
    as_of_date: date,
    cusip: String(parseInt(positionId, 10) % 999999).padStart(9, '0'),
    isin: `US${String(parseInt(positionId, 10) % 9999999999).padStart(10, '0')}0`,
    security_name: `${secType} Position ${positionId}`,
    security_description: `${secType} security`,
    security_status: 'ACTIVE',
    security_identifier: `SEC-${String(positionId).padStart(10, '0')}`,
    security_identifier_type: 'CUSIP',
    issuer_name: secType === 'GOVT_BOND' ? 'US Treasury' : secType === 'AGENCY' ? 'FHLMC' : `Issuer-${state.counterparty_id}`,
    issuer_type: ['GOVT_BOND'].includes(secType) ? 'SOVEREIGN' : ['AGENCY', 'MBS'].includes(secType) ? 'GSE' : 'CORPORATE',
    customer_id: `CUST-${state.counterparty_id}`,
    gl_account_number: ['GOVT_BOND', 'AGENCY'].includes(secType) ? 1500 : ['MBS', 'ABS', 'CLO'].includes(secType) ? 1600 : 1700,
    counterparty_type: ['GOVT_BOND'].includes(secType) ? 'SOVEREIGN' : ['AGENCY', 'MBS'].includes(secType) ? 'GSE' : 'CORPORATE',
    legal_entity_id: String((parseInt(state.facility_id, 10) % 10) + 1),
    sector: ['GOVT_BOND'].includes(secType) ? 'GOVERNMENT' : secType === 'MUNI' ? 'MUNICIPAL' : 'FINANCIAL',
    country_code: state.country_code,
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'BLOOMBERG',
    call_report_code: secType === 'GOVT_BOND' ? 'RC-B2a' : secType === 'MBS' ? 'RC-B4a' : 'RC-B5',
    internal_transaction_flag: 'N',
    ...auditFields(),
  };
}

function securitiesRisk(state: FacilityState, positionId: string, date: string): SqlRow {
  const secType = ['GOVT_BOND', 'CORP_BOND', 'MBS', 'ABS', 'CLO', 'MUNI', 'AGENCY'][parseInt(state.facility_id, 10) % 7];
  return {
    position_id: positionId,
    as_of_date: date,
    pledged_flag: parseInt(positionId, 10) % 5 === 0,
    encumbered_flag: parseInt(positionId, 10) % 7 === 0,
    performing_flag: true,
    non_accrual_status: false,
    secured_flag: ['MBS', 'ABS', 'CLO'].includes(secType) ? 'SECURED' : 'UNSECURED',
    treasury_control_flag: parseInt(positionId, 10) % 8 === 0,
    liquid_assets_collateral_level: ['GOVT_BOND', 'AGENCY'].includes(secType) ? 'LEVEL_1' :
      ['CORP_BOND', 'MBS'].includes(secType) ? 'LEVEL_2A' : 'LEVEL_2B',
    trade_long_short_flag: 'LONG',
    private_placement_flag: secType === 'CLO' && parseInt(positionId, 10) % 3 === 0,
    ...auditFields(),
  };
}

// ─── Deposits Generators ────────────────────────────────────────────────

function depositsIndicative(state: FacilityState, positionId: string, date: string): SqlRow {
  const depType = ['DEMAND_DEP', 'SAVINGS', 'TIME_DEP', 'MMDA'][parseInt(state.facility_id, 10) % 4];
  return {
    position_id: positionId,
    as_of_date: date,
    deposit_account_type: depType,
    currency_code: state.currency_code,
    interest_rate: depType === 'DEMAND_DEP' ? 0.001 : round(state.base_rate_pct * 0.9, 6),
    interest_rate_type: depType === 'DEMAND_DEP' ? 'NON_INTEREST_BEARING' : 'FIXED',
    interest_bearing_flag: depType !== 'DEMAND_DEP',
    maturity_date: ['TIME_DEP', 'MMDA'].includes(depType) ? state.maturity_date : null,
    reporting_currency: 'USD',
    settlement_currency: state.currency_code,
    transaction_currency: state.currency_code,
    product_code: depType,
    days_remaining_to_maturity: ['TIME_DEP', 'MMDA'].includes(depType) ? state.remaining_tenor_months * 30 : null,
    ...auditFields(),
  };
}

function depositsAccounting(state: FacilityState, positionId: string, date: string): SqlRow {
  const accrued = round(state.drawn_amount * state.base_rate_pct * 0.9 / 12, 4);
  return {
    position_id: positionId,
    as_of_date: date,
    accounting_intent: 'HELD_AT_COST',
    bs_amount: round(state.drawn_amount, 4),
    book_value_amount: round(state.drawn_amount, 4),
    deposit_balance: round(state.drawn_amount, 4),
    current_balance: round(state.drawn_amount, 4),
    accrued_interest_amount: accrued,
    accrued_interest_dividend_amount: accrued,
    fair_value_amount: round(state.drawn_amount, 4),
    usd_equivalent_amount: round(state.drawn_amount, 4),
    fdic_insured_balance: Math.min(state.drawn_amount, 250000),
    fdic_insured_depository_institution_flag: true,
    original_balance: round(state.committed_amount, 4),
    interest_balance: round(accrued * 12, 4),
    amount_balance: round(state.drawn_amount, 4),
    ...auditFields(),
  };
}

function depositsClassification(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    customer_id: `CUST-${state.counterparty_id}`,
    gl_account_number: [6100, 6200, 6300, 6400][parseInt(state.facility_id, 10) % 4],
    counterparty_type: ['CORPORATE', 'SME', 'RETAIL', 'GOVERNMENT', 'INSTITUTIONAL'][parseInt(state.counterparty_id, 10) % 5],
    legal_entity_id: String((parseInt(state.facility_id, 10) % 10) + 1),
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'CORE_BANKING',
    account_status: 'ACTIVE',
    internal_transaction_flag: parseInt(state.counterparty_id, 10) % 25 === 0 ? 'Y' : 'N',
    geographic_code: parseInt(positionId, 10) % 4 === 0 ? 'DOMESTIC' : 'FOREIGN',
    insurance_provider: 'FDIC',
    fdic_ownership_code: ['SINGLE', 'JOINT', 'REVOCABLE_TRUST', 'BUSINESS'][parseInt(positionId, 10) % 4],
    stability: parseInt(state.facility_id, 10) % 4 < 3 ? 'STABLE' : 'LESS_STABLE',
    ...auditFields(),
  };
}

function depositsRisk(state: FacilityState, positionId: string, date: string): SqlRow {
  const depType = ['DEMAND_DEP', 'SAVINGS', 'TIME_DEP', 'MMDA'][parseInt(state.facility_id, 10) % 4];
  return {
    position_id: positionId,
    as_of_date: date,
    operational_flag: depType === 'DEMAND_DEP',
    brokered_flag: depType === 'MMDA' && parseInt(positionId, 10) % 5 === 0,
    reciprocal_flag: parseInt(positionId, 10) % 10 === 0,
    sweep_flag: depType === 'MMDA' && parseInt(positionId, 10) % 3 === 0,
    relationship_flag: parseInt(positionId, 10) % 3 === 0,
    transactional_flag: depType === 'DEMAND_DEP',
    stable_vs_less_stable_flag: ['DEMAND_DEP', 'SAVINGS', 'TIME_DEP'].includes(depType) ? 'STABLE' : 'LESS_STABLE',
    treasury_control_flag: false,
    negotiable_flag: depType === 'TIME_DEP' && parseInt(positionId, 10) % 8 === 0,
    automated_renewal_flag: depType === 'TIME_DEP',
    tradable_flag: false,
    ...auditFields(),
  };
}

// ─── Borrowings Generators ──────────────────────────────────────────────

function borrowingsIndicative(state: FacilityState, positionId: string, date: string): SqlRow {
  const borrowType = ['FED_FUNDS', 'FHLB_ADV', 'BROKERED_DEP'][parseInt(state.facility_id, 10) % 3];
  return {
    position_id: positionId,
    as_of_date: date,
    borrowing_type: borrowType,
    currency_code: state.currency_code,
    maturity_date: state.maturity_date,
    interest_rate: round(state.base_rate_pct + (borrowType === 'FED_FUNDS' ? 0 : -0.005), 6),
    interest_rate_type: borrowType === 'FED_FUNDS' ? 'FLOATING' : 'FIXED',
    interest_rate_variability: borrowType === 'FED_FUNDS' ? 'VARIABLE' : 'FIXED',
    reporting_currency: 'USD',
    settlement_currency: state.currency_code,
    transaction_currency: state.currency_code,
    repayment_type: borrowType === 'FED_FUNDS' ? 'OVERNIGHT' : 'BULLET',
    commitment_type: 'COMMITTED',
    ...auditFields(),
  };
}

function borrowingsAccounting(state: FacilityState, positionId: string, date: string): SqlRow {
  const accrued = round(state.drawn_amount * state.base_rate_pct / 12, 4);
  return {
    position_id: positionId,
    as_of_date: date,
    accounting_intent: 'HELD_AT_COST',
    bs_amount: round(state.drawn_amount, 4),
    carrying_value: round(state.drawn_amount, 4),
    current_outstanding_balance: round(state.drawn_amount, 4),
    accrued_interest_amount: accrued,
    accrued_interest_dividend_amount: accrued,
    fair_value_amount: round(state.drawn_amount, 4),
    counterparty_exposure_value: round(state.drawn_amount, 4),
    exposure_amount: round(state.drawn_amount, 4),
    original_amount: round(state.committed_amount, 4),
    usd_equivalent_amount: round(state.drawn_amount, 4),
    funded_committed_exposure: round(state.drawn_amount, 4),
    settlement_date: state.origination_date,
    borrowing_date: state.origination_date,
    borrowing_term: ['OVERNIGHT', 'TERM', '30_DAY'][parseInt(state.facility_id, 10) % 3],
    ...auditFields(),
  };
}

function borrowingsClassification(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    customer_id: `CUST-${state.counterparty_id}`,
    gl_account_number: [3100, 3200, 3300][parseInt(state.facility_id, 10) % 3],
    counterparty_type: ['BANK', 'GSE', 'BROKER_DEALER'][parseInt(state.facility_id, 10) % 3],
    legal_entity_id: String((parseInt(state.facility_id, 10) % 10) + 1),
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'TREASURY_SYSTEM',
    internal_transaction_flag: parseInt(state.counterparty_id, 10) % 20 === 0 ? 'Y' : 'N',
    ...auditFields(),
  };
}

function borrowingsRisk(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    probability_of_default_pd: 0.001,
    loss_given_default_lgd: parseInt(state.facility_id, 10) % 3 === 1 ? 0.10 : 0.25,
    internal_risk_rating: '2',
    pledged_flag: parseInt(state.facility_id, 10) % 3 === 1,
    secured_flag: parseInt(state.facility_id, 10) % 3 === 1 ? 'SECURED' : 'UNSECURED',
    treasury_control_flag: true,
    non_accrual_status: false,
    ...auditFields(),
  };
}

// ─── Debt Generators ────────────────────────────────────────────────────

function debtIndicative(state: FacilityState, positionId: string, date: string): SqlRow {
  const debtType = ['SENIOR_NOTE', 'SUBORD_NOTE', 'COVERED_BOND'][parseInt(state.facility_id, 10) % 3];
  return {
    position_id: positionId,
    as_of_date: date,
    debt_type: debtType,
    security_type: 'DEBT',
    security_sub_type: debtType,
    currency_code: state.currency_code,
    maturity_date: state.maturity_date,
    issue_date: state.origination_date,
    interest_rate: round(debtType === 'SUBORD_NOTE' ? state.all_in_rate_pct + 0.01 : state.all_in_rate_pct, 6),
    interest_rate_type: parseInt(positionId, 10) % 3 === 0 ? 'FLOATING' : 'FIXED',
    reporting_currency: 'USD',
    settlement_currency: state.currency_code,
    transaction_currency: state.currency_code,
    remaining_maturity_days: state.remaining_tenor_months * 30,
    ...auditFields(),
  };
}

function debtAccounting(state: FacilityState, positionId: string, date: string): SqlRow {
  const accrued = round(state.drawn_amount * state.all_in_rate_pct / 12, 4);
  return {
    position_id: positionId,
    as_of_date: date,
    accounting_intent: 'HELD_AT_AMORTIZED_COST',
    bs_amount: round(state.drawn_amount, 4),
    carrying_value: round(state.drawn_amount, 4),
    outstanding_balance: round(state.drawn_amount, 4),
    accrued_interest_amount: accrued,
    accrued_interest_dividend_amount: accrued,
    amortized_cost: round(state.drawn_amount * 0.995, 4),
    fair_value_amount: round(state.drawn_amount * (1 - state.pd_annual * 0.5), 4),
    original_face_amount: round(state.committed_amount, 4),
    counterparty_exposure_value: round(state.drawn_amount, 4),
    exposure_amount: round(state.drawn_amount, 4),
    usd_equivalent_amount: round(state.drawn_amount, 4),
    premium_discount_amount: round(state.drawn_amount * 0.005, 4),
    unrealized_gain_loss: round(state.drawn_amount * (state.pd_annual * -0.5), 4),
    settlement_date: state.origination_date,
    transaction_date: state.origination_date,
    ...auditFields(),
  };
}

function debtClassification(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    cusip: String(parseInt(positionId, 10) % 999999).padStart(9, '0'),
    isin: `US${String(parseInt(positionId, 10) % 9999999999).padStart(10, '0')}1`,
    customer_id: `CUST-${state.counterparty_id}`,
    gl_account_number: [3400, 3500, 3600][parseInt(state.facility_id, 10) % 3],
    counterparty_type: 'INVESTOR',
    legal_entity_id: String((parseInt(state.facility_id, 10) % 10) + 1),
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'DEBT_MANAGEMENT',
    internal_transaction_flag: 'N',
    ...auditFields(),
  };
}

function debtRisk(state: FacilityState, positionId: string, date: string): SqlRow {
  const debtType = ['SENIOR_NOTE', 'SUBORD_NOTE', 'COVERED_BOND'][parseInt(state.facility_id, 10) % 3];
  return {
    position_id: positionId,
    as_of_date: date,
    probability_of_default_pd: debtType === 'SUBORD_NOTE' ? 0.005 : debtType === 'COVERED_BOND' ? 0.001 : 0.002,
    loss_given_default_lgd: debtType === 'SUBORD_NOTE' ? 0.60 : debtType === 'COVERED_BOND' ? 0.25 : 0.40,
    internal_risk_rating: debtType === 'SUBORD_NOTE' ? '5' : debtType === 'COVERED_BOND' ? '2' : '3',
    pledged_flag: debtType === 'COVERED_BOND',
    non_accrual_status: false,
    treasury_control_flag: true,
    ...auditFields(),
  };
}

// ─── Equities Generators ────────────────────────────────────────────────

function equitiesIndicative(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    equity_type: parseInt(state.facility_id, 10) % 2 === 0 ? 'COMMON' : 'PREFERRED',
    currency_code: state.currency_code,
    reporting_currency: 'USD',
    settlement_currency: state.currency_code,
    transaction_currency: state.currency_code,
    ...auditFields(),
  };
}

function equitiesAccounting(state: FacilityState, positionId: string, date: string): SqlRow {
  const rng = seededRng(`ea-${state.facility_id}-${date}`);
  const mktValue = round(state.drawn_amount * (1 + rng() * 0.1 - 0.05), 4);
  return {
    position_id: positionId,
    as_of_date: date,
    bs_amount: round(state.drawn_amount, 4),
    carrying_value: round(state.drawn_amount * 0.95, 4),
    fair_value_amount: mktValue,
    market_value: mktValue,
    counterparty_exposure_value: round(state.drawn_amount, 4),
    face_value: round(state.committed_amount, 4),
    cash_dividends: round(state.drawn_amount * 0.025, 4),
    ownership_percentage: round((parseInt(state.facility_id, 10) % 40 + 1) * 1.0, 4),
    number_of_shares: round(state.drawn_amount / (50 + parseInt(state.facility_id, 10) % 200), 4),
    usd_equivalent_amount: round(state.drawn_amount, 4),
    accrued_interest_dividend_amount: round(state.drawn_amount * 0.005, 4),
    retained_earnings: round(state.drawn_amount * 0.15, 4),
    lendable_value: round(mktValue * 0.7, 4),
    transaction_date: state.origination_date,
    ...auditFields(),
  };
}

function equitiesClassification(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    customer_id: `CUST-${state.counterparty_id}`,
    gl_account_number: parseInt(state.facility_id, 10) % 2 === 0 ? 5100 : 5200,
    legal_entity_id: String((parseInt(state.facility_id, 10) % 10) + 1),
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'EQUITY_PLATFORM',
    stock_exchange_code: ['NYSE', 'NASDAQ', 'LSE', 'TSE'][parseInt(positionId, 10) % 4],
    ticker_symbol: `EQ-${String(positionId).padStart(5, '0')}`,
    internal_transaction_flag: 'N',
    ...auditFields(),
  };
}

function equitiesRisk(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    treasury_control_flag: parseInt(positionId, 10) % 6 === 0,
    ...auditFields(),
  };
}

// ─── Stock Generators ───────────────────────────────────────────────────

function stockIndicative(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    currency_code: state.currency_code,
    stock_type: parseInt(state.facility_id, 10) % 2 === 0 ? 'COMMON' : 'PREFERRED',
    stock_position_id: `STK-${String(positionId).padStart(8, '0')}`,
    ...auditFields(),
  };
}

function stockAccounting(state: FacilityState, positionId: string, date: string): SqlRow {
  const rng = seededRng(`sta-${state.facility_id}-${date}`);
  const mktValue = round(state.drawn_amount * (1 + rng() * 0.08 - 0.04), 4);
  return {
    position_id: positionId,
    as_of_date: date,
    bs_amount: round(state.drawn_amount, 4),
    carrying_value: round(state.drawn_amount * 0.97, 4),
    fair_value_amount: mktValue,
    market_value: mktValue,
    number_of_shares: round(state.drawn_amount / (30 + parseInt(state.facility_id, 10) % 150), 4),
    unrealized_gain_loss: round(mktValue - state.drawn_amount * 0.97, 4),
    accounting_method: ['EQUITY_METHOD', 'FAIR_VALUE', 'COST_METHOD'][parseInt(positionId, 10) % 3],
    investment_type: parseInt(state.facility_id, 10) % 2 === 0 ? 'COMMON' : 'PREFERRED',
    ...auditFields(),
  };
}

function stockClassification(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    customer_id: `CUST-${state.counterparty_id}`,
    legal_entity_id: String((parseInt(state.facility_id, 10) % 10) + 1),
    internal_transaction_flag: 'N',
    investee_industry_type: ['TECHNOLOGY', 'FINANCIAL', 'HEALTHCARE', 'ENERGY', 'INDUSTRIAL', 'CONSUMER'][parseInt(positionId, 10) % 6],
    ...auditFields(),
  };
}

function stockRisk(state: FacilityState, positionId: string, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    treasury_control_flag: parseInt(positionId, 10) % 5 === 0,
    ...auditFields(),
  };
}

// ─── Main Generator ─────────────────────────────────────────────────────

/**
 * Generate product-specific snapshot rows for all positions.
 *
 * Requires position_ids to have been allocated first by generatePositionRows().
 * Uses the same positionIdMap to link product rows to positions.
 */
export function generateProductTableRows(
  stateMap: FacilityStateMap,
  facilityIds: string[],
  dates: string[],
  positionIdMap: Map<string, string>,
): ProductTableOutput {
  const tables = new Map<string, SqlRow[]>();

  // Initialize all 40 tables as empty arrays
  const allProducts: ProductCategory[] = [
    'loans', 'derivatives', 'offbs_commitments', 'sft',
    'securities', 'deposits', 'borrowings', 'debt',
    'equities', 'stock',
  ];
  const allSnapshots: SnapshotType[] = ['indicative', 'accounting', 'classification', 'risk'];
  for (const product of allProducts) {
    for (const snapshot of allSnapshots) {
      tables.set(tableName(product, snapshot), []);
    }
  }

  // Generate rows for each position
  for (const date of dates) {
    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      const posId = positionIdMap.get(stateKey(facId, date));
      if (!posId) continue;

      const category = mapToProductCategory(state);

      switch (category) {
        case 'loans':
          safePush(tables, 'loans_indicative_snapshot', loansIndicative(state, posId, date), 'product-tables');
          safePush(tables, 'loans_accounting_snapshot', loansAccounting(state, posId, date), 'product-tables');
          safePush(tables, 'loans_classification_snapshot', loansClassification(state, posId, date), 'product-tables');
          safePush(tables, 'loans_risk_snapshot', loansRisk(state, posId, date), 'product-tables');
          break;

        case 'offbs_commitments':
          safePush(tables, 'offbs_commitments_indicative_snapshot', offbsIndicative(state, posId, date), 'product-tables');
          safePush(tables, 'offbs_commitments_accounting_snapshot', offbsAccounting(state, posId, date), 'product-tables');
          safePush(tables, 'offbs_commitments_classification_snapshot', offbsClassification(state, posId, date), 'product-tables');
          safePush(tables, 'offbs_commitments_risk_snapshot', offbsRisk(state, posId, date), 'product-tables');
          break;

        case 'derivatives':
          safePush(tables, 'derivatives_indicative_snapshot', derivativesIndicative(state, posId, date), 'product-tables');
          safePush(tables, 'derivatives_accounting_snapshot', derivativesAccounting(state, posId, date), 'product-tables');
          safePush(tables, 'derivatives_classification_snapshot', derivativesClassification(state, posId, date), 'product-tables');
          safePush(tables, 'derivatives_risk_snapshot', derivativesRisk(state, posId, date), 'product-tables');
          break;

        case 'sft':
          safePush(tables, 'sft_indicative_snapshot', sftIndicative(state, posId, date), 'product-tables');
          safePush(tables, 'sft_accounting_snapshot', sftAccounting(state, posId, date), 'product-tables');
          safePush(tables, 'sft_classification_snapshot', sftClassification(state, posId, date), 'product-tables');
          safePush(tables, 'sft_risk_snapshot', sftRisk(state, posId, date), 'product-tables');
          break;

        case 'securities':
          safePush(tables, 'securities_indicative_snapshot', securitiesIndicative(state, posId, date), 'product-tables');
          safePush(tables, 'securities_accounting_snapshot', securitiesAccounting(state, posId, date), 'product-tables');
          safePush(tables, 'securities_classification_snapshot', securitiesClassification(state, posId, date), 'product-tables');
          safePush(tables, 'securities_risk_snapshot', securitiesRisk(state, posId, date), 'product-tables');
          break;

        case 'deposits':
          safePush(tables, 'deposits_indicative_snapshot', depositsIndicative(state, posId, date), 'product-tables');
          safePush(tables, 'deposits_accounting_snapshot', depositsAccounting(state, posId, date), 'product-tables');
          safePush(tables, 'deposits_classification_snapshot', depositsClassification(state, posId, date), 'product-tables');
          safePush(tables, 'deposits_risk_snapshot', depositsRisk(state, posId, date), 'product-tables');
          break;

        case 'borrowings':
          safePush(tables, 'borrowings_indicative_snapshot', borrowingsIndicative(state, posId, date), 'product-tables');
          safePush(tables, 'borrowings_accounting_snapshot', borrowingsAccounting(state, posId, date), 'product-tables');
          safePush(tables, 'borrowings_classification_snapshot', borrowingsClassification(state, posId, date), 'product-tables');
          safePush(tables, 'borrowings_risk_snapshot', borrowingsRisk(state, posId, date), 'product-tables');
          break;

        case 'debt':
          safePush(tables, 'debt_indicative_snapshot', debtIndicative(state, posId, date), 'product-tables');
          safePush(tables, 'debt_accounting_snapshot', debtAccounting(state, posId, date), 'product-tables');
          safePush(tables, 'debt_classification_snapshot', debtClassification(state, posId, date), 'product-tables');
          safePush(tables, 'debt_risk_snapshot', debtRisk(state, posId, date), 'product-tables');
          break;

        case 'equities':
          safePush(tables, 'equities_indicative_snapshot', equitiesIndicative(state, posId, date), 'product-tables');
          safePush(tables, 'equities_accounting_snapshot', equitiesAccounting(state, posId, date), 'product-tables');
          safePush(tables, 'equities_classification_snapshot', equitiesClassification(state, posId, date), 'product-tables');
          safePush(tables, 'equities_risk_snapshot', equitiesRisk(state, posId, date), 'product-tables');
          break;

        case 'stock':
          safePush(tables, 'stock_indicative_snapshot', stockIndicative(state, posId, date), 'product-tables');
          safePush(tables, 'stock_accounting_snapshot', stockAccounting(state, posId, date), 'product-tables');
          safePush(tables, 'stock_classification_snapshot', stockClassification(state, posId, date), 'product-tables');
          safePush(tables, 'stock_risk_snapshot', stockRisk(state, posId, date), 'product-tables');
          break;

        default:
          break;
      }
    }
  }

  return { tables };
}
