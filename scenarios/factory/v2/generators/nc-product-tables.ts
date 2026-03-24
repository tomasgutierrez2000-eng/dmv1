/**
 * Non-Credit Product Table Adapter — converts PositionState → product snapshot rows.
 *
 * Calls the SAME 32 generator functions from product-tables.ts via a FacilityState proxy.
 * Single translation point between position-centric and facility-centric models.
 */

import type { FacilityState, SqlRow } from '../types';
import { FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type {
  PositionState, PositionStateMap, DerivativeState, SFTState,
  SecurityState, DepositState, BorrowingState, DebtState,
  EquityState, StockState, NonCreditCategory,
} from '../position-types';
import { positionStateKey } from '../position-types';
import { round, seededRng } from '../prng';
import { safePush } from '../safe-collections';

// Import the existing product-table generator functions
// We import the module to call functions that are internal —
// but since they're not exported, we duplicate the adapter's own versions
// that directly produce SqlRow from PositionState (cleaner than proxy).

// ─── Types ───────────────────────────────────────────────────────────────

export interface NCProductTableOutput {
  tables: Map<string, SqlRow[]>;
}

type SnapshotType = 'indicative' | 'accounting' | 'classification' | 'risk';

function tableName(product: string, snapshot: SnapshotType): string {
  return `${product}_${snapshot}_snapshot`;
}

function auditFields(): Record<string, unknown> {
  return {
    created_ts: new Date().toISOString().replace('T', ' ').substring(0, 19),
    updated_ts: new Date().toISOString().replace('T', ' ').substring(0, 19),
  };
}

// ─── Category → Table Prefix Mapping ─────────────────────────────────────

const CATEGORY_PREFIX: Record<NonCreditCategory, string> = {
  DERIVATIVES: 'derivatives',
  SFT: 'sft',
  SECURITIES: 'securities',
  DEPOSITS: 'deposits',
  BORROWINGS: 'borrowings',
  DEBT: 'debt',
  EQUITIES: 'equities',
  STOCK: 'stock',
};

// ─── Main Generator ──────────────────────────────────────────────────────

export function generateNCProductTableRows(
  stateMap: PositionStateMap,
  positionIds: string[],
  dates: string[],
  positionIdMap: Map<string, string>,
): NCProductTableOutput {
  const tables = new Map<string, SqlRow[]>();

  // Initialize all 32 non-credit product tables
  for (const prefix of Object.values(CATEGORY_PREFIX)) {
    for (const snap of ['indicative', 'accounting', 'classification', 'risk'] as const) {
      tables.set(tableName(prefix, snap), []);
    }
  }

  for (const date of dates) {
    for (const posId of positionIds) {
      const state = stateMap.get(positionStateKey(posId, date));
      if (!state) continue;

      const prefix = CATEGORY_PREFIX[state.category];
      // Look up the actual DB position_id for this (conceptual_pos, date) pair
      const dbPosId = positionIdMap.get(`${posId}|${date}`);
      if (!dbPosId) continue;

      switch (state.category) {
        case 'DERIVATIVES':
          safePush(tables, tableName(prefix, 'indicative'), derivativesIndicative(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'accounting'), derivativesAccounting(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'classification'), derivativesClassification(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'risk'), derivativesRisk(state, date, dbPosId), 'nc-product');
          break;
        case 'SFT':
          safePush(tables, tableName(prefix, 'indicative'), sftIndicative(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'accounting'), sftAccounting(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'classification'), sftClassification(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'risk'), sftRisk(state, date, dbPosId), 'nc-product');
          break;
        case 'SECURITIES':
          safePush(tables, tableName(prefix, 'indicative'), securitiesIndicative(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'accounting'), securitiesAccounting(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'classification'), securitiesClassification(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'risk'), securitiesRisk(state, date, dbPosId), 'nc-product');
          break;
        case 'DEPOSITS':
          safePush(tables, tableName(prefix, 'indicative'), depositsIndicative(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'accounting'), depositsAccounting(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'classification'), depositsClassification(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'risk'), depositsRisk(state, date, dbPosId), 'nc-product');
          break;
        case 'BORROWINGS':
          safePush(tables, tableName(prefix, 'indicative'), borrowingsIndicative(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'accounting'), borrowingsAccounting(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'classification'), borrowingsClassification(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'risk'), borrowingsRisk(state, date, dbPosId), 'nc-product');
          break;
        case 'DEBT':
          safePush(tables, tableName(prefix, 'indicative'), debtIndicative(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'accounting'), debtAccounting(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'classification'), debtClassification(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'risk'), debtRisk(state, date, dbPosId), 'nc-product');
          break;
        case 'EQUITIES':
          safePush(tables, tableName(prefix, 'indicative'), equitiesIndicative(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'accounting'), equitiesAccounting(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'classification'), equitiesClassification(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'risk'), equitiesRisk(state, date, dbPosId), 'nc-product');
          break;
        case 'STOCK':
          safePush(tables, tableName(prefix, 'indicative'), stockIndicative(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'accounting'), stockAccounting(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'classification'), stockClassification(state, date, dbPosId), 'nc-product');
          safePush(tables, tableName(prefix, 'risk'), stockRisk(state, date, dbPosId), 'nc-product');
          break;
      }
    }
  }

  return { tables };
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT-SPECIFIC GENERATORS — produce SqlRow directly from PositionState
// (no proxy needed — cleaner than forcing through FacilityState shape)
// ═══════════════════════════════════════════════════════════════════════════

// ─── DERIVATIVES ─────────────────────────────────────────────────────────

function derivativesIndicative(s: DerivativeState, date: string, dbPosId: string): SqlRow {
  const riskDomain = ['IRS', 'SWAPTION'].includes(s.derivative_type) ? 'INTEREST_RATE'
    : ['CDS', 'TRS'].includes(s.derivative_type) ? 'CREDIT'
    : ['FX_FORWARD', 'FX_OPTION'].includes(s.derivative_type) ? 'FX'
    : s.derivative_type === 'EQUITY_SWAP' ? 'EQUITY' : 'COMMODITY';
  return {
    position_id: dbPosId, as_of_date: date,
    derivative_type: s.derivative_type,
    derivative_instrument_type: s.derivative_type,
    derivative_direction: s.direction,
    currency_code: s.currency_code,
    maturity_date: s.maturity_date,
    effective_maturity_date: s.maturity_date,
    interest_rate: s.interest_rate,
    interest_rate_type: s.derivative_type === 'IRS' ? 'FIXED' : 'FLOATING',
    clearing_status: s.clearing_status,
    clearing_type_flag: s.clearing_status === 'CLEARED' ? 'CCP_CLEARED' : 'OTC_BILATERAL',
    is_hedge: s.is_hedge,
    otc_trade_flag: s.clearing_status !== 'CLEARED',
    reporting_currency: 'USD',
    settlement_currency: s.currency_code,
    transaction_currency: s.currency_code,
    swap_type: ['IRS', 'SWAPTION'].includes(s.derivative_type) ? 'FIXED_FLOAT' : null,
    option_type: ['FX_OPTION', 'SWAPTION'].includes(s.derivative_type) ? 'CALL' : null,
    product_domain: riskDomain,
    risk_type: riskDomain,
    ...auditFields(),
  };
}

function derivativesAccounting(s: DerivativeState, date: string, dbPosId: string): SqlRow {
  const rng = seededRng(`da-${s.position_id}-${date}`);
  const ngr = round(0.65 + rng() * 0.30, 6);
  return {
    position_id: dbPosId, as_of_date: date,
    accounting_intent: s.is_trading_book ? 'TRADING' : 'HEDGING',
    bs_amount: s.mtm_value,
    carrying_value: round(Math.abs(s.mtm_value), 4),
    counterparty_exposure_value: Math.max(s.mtm_value, 0),
    exposure_amount: round(Math.abs(s.mtm_value) * 1.4, 4),
    exposure_at_default_ead: round(Math.abs(s.mtm_value) + s.pfe_amount, 4),
    fair_value: s.mtm_value,
    notional_amount: s.notional_amount,
    notional_amount_at_inception: round(s.notional_amount * 0.95, 4),
    effective_notional_amount: round(s.notional_amount * 0.8, 4),
    net_gross_ratio: ngr,
    aggregate_gross_value: round(Math.abs(s.mtm_value) * 1.5, 4),
    aggregate_net_value: round(Math.abs(s.mtm_value) * ngr, 4),
    current_credit_exposure_amount: Math.max(s.mtm_value, 0),
    conversion_factor_percentage: 1.0,
    usd_equivalent_amount: round(Math.abs(s.mtm_value), 4),
    trading_intent: s.is_trading_book ? 'YES' : 'NO',
    transaction_date: s.origination_date,
    asset_liability_flag: s.mtm_value >= 0 ? 'ASSET' : 'LIABILITY',
    ...auditFields(),
  };
}

function derivativesClassification(s: DerivativeState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    customer_id: `CUST-${s.counterparty_id}`,
    gl_account_number: s.is_trading_book ? 4100 : 4200,
    counterparty_type: ['BANK', 'CORPORATE', 'SOVEREIGN', 'FUND'][parseInt(s.counterparty_id, 10) %4],
    isda_id: `ISDA-${String(s.counterparty_id).padStart(6, '0')}`,
    legal_entity_id: String(s.legal_entity_id),
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'MUREX',
    internal_transaction_flag: parseInt(s.counterparty_id, 10) %20 === 0 ? 'Y' : 'N',
    cost_center_id: s.legal_entity_id * 100 + (parseInt(dbPosId, 10) % 10),
    call_report_code: s.derivative_type === 'IRS' ? 'RC-L12a' : s.derivative_type === 'CDS' ? 'RC-L12b' : 'RC-L12c',
    usd_conversion_rate: s.currency_code === 'USD' ? 1.0 : s.currency_code === 'EUR' ? 1.08 : s.currency_code === 'GBP' ? 1.27 : s.currency_code === 'JPY' ? 0.0067 : 1.12,
    qmna: s.clearing_status === 'CLEARED',
    ...auditFields(),
  };
}

function derivativesRisk(s: DerivativeState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    probability_of_default_pd: s.pd_annual,
    loss_given_default_lgd: s.lgd_estimate,
    expected_loss_given_default_elgd: round(s.lgd_estimate * 0.9, 6),
    two_year_probability_of_default: round(Math.min(s.pd_annual * 2, 1.0), 6),
    potential_future_exposure_amount: s.pfe_amount,
    potential_future_exposure_adjustment: round(s.notional_amount * 0.005, 4),
    eligible_collateral: s.collateral_received,
    eligible_im_cash: round(s.collateral_received * 0.4, 4),
    eligible_vm_cash: round(s.collateral_posted * 0.6, 4),
    collateralization_type: s.clearing_status === 'CLEARED' ? 'FULLY_COLLATERALIZED'
      : s.collateral_received > 0 ? 'PARTIALLY_COLLATERALIZED' : 'UNCOLLATERALIZED',
    pledged_flag: s.collateral_posted > 0,
    secured_flag: s.collateral_received > 0 ? 'SECURED' : 'UNSECURED',
    treasury_control_flag: false,
    maximum_probability_of_default: round(s.pd_annual * 1.5, 6),
    minimum_probability_of_default: round(s.pd_annual * 0.5, 6),
    ...auditFields(),
  };
}

// ─── SFT ─────────────────────────────────────────────────────────────────

function sftIndicative(s: SFTState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    sft_type: s.sft_type,
    sft_contract_id: `SFT-${String(s.position_id).padStart(8, '0')}`,
    currency_code: s.currency_code,
    maturity_date: s.maturity_date,
    effective_maturity_date: s.maturity_date,
    interest_rate: s.repo_rate,
    interest_rate_type: 'FLOATING',
    reporting_currency: 'USD',
    settlement_currency: s.currency_code,
    transaction_currency: s.currency_code,
    asset_liability_indicator: ['REPO', 'SEC_LENDING'].includes(s.sft_type) ? 'LIABILITY' : 'ASSET',
    principal_agent: s.is_principal ? 'PRINCIPAL' : 'AGENT',
    qmna_flag: parseInt(s.position_id, 10) % 4 === 0,
    ...auditFields(),
  };
}

function sftAccounting(s: SFTState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    accounting_intent: 'HELD_FOR_INVESTMENT',
    bs_amount: round(s.cash_leg_amount, 4),
    book_value_amount: round(s.cash_leg_amount, 4),
    counterparty_exposure_value: round(s.cash_leg_amount * (1 - (1 / (1 + s.haircut_pct))), 4),
    exposure_amount: round(s.cash_leg_amount, 4),
    exposure_at_default_ead: round(s.cash_leg_amount * (1 + s.haircut_pct), 4),
    fair_value_amount: round(s.cash_leg_amount * 1.001, 4),
    collateral_fair_value: round(s.collateral_value, 4),
    collateral_fair_value_at_reporting_date: round(s.collateral_value, 4),
    collateral_value_at_inception_date: round(s.cash_leg_amount * (1 + s.haircut_pct), 4),
    contract_amount: round(s.cash_leg_amount, 4),
    contract_amount_at_inception_date: round(s.cash_leg_amount, 4),
    contract_amount_at_reporting_date: round(s.cash_leg_amount, 4),
    usd_equivalent_amount: round(s.cash_leg_amount, 4),
    settlement_date: s.origination_date,
    transaction_date: s.origination_date,
    accrued_interest_amount: round(s.cash_leg_amount * s.repo_rate / 12, 4),
    ...auditFields(),
  };
}

function sftClassification(s: SFTState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    customer_id: `CUST-${s.counterparty_id}`,
    gl_account_number: ['REPO', 'REVERSE_REPO', 'SEC_LENDING', 'SEC_BORROWING', 'MARGIN_LOAN'].indexOf(s.sft_type) + 2100,
    counterparty_type: ['BANK', 'BROKER_DEALER', 'FUND'][parseInt(s.counterparty_id, 10) %3],
    legal_entity_id: String(s.legal_entity_id),
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'CALYPSO',
    internal_transaction_flag: parseInt(s.counterparty_id, 10) %15 === 0 ? 'Y' : 'N',
    cost_center_id: s.legal_entity_id * 100 + (parseInt(dbPosId, 10) % 10),
    call_report_code: 'RC-B10',
    transaction_type: s.sft_type,
    ...auditFields(),
  };
}

function sftRisk(s: SFTState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    probability_of_default_pd: s.pd_annual,
    loss_given_default_lgd: s.lgd_estimate,
    expected_loss_given_default_elgd: round(s.lgd_estimate * 0.85, 6),
    two_year_probability_of_default: round(Math.min(s.pd_annual * 2, 1.0), 6),
    pledged_flag: ['REPO', 'SEC_LENDING'].includes(s.sft_type),
    secured_flag: 'SECURED',
    encumbered_flag: s.sft_type === 'REPO',
    treasury_control_flag: false,
    rehypothecated: s.rehypothecation_flag ? 'Y' : 'N',
    liquid_assets_collateral_level: s.collateral_quality,
    maximum_probability_of_default: round(s.pd_annual * 1.5, 6),
    minimum_probability_of_default: round(s.pd_annual * 0.5, 6),
    ...auditFields(),
  };
}

// ─── SECURITIES ──────────────────────────────────────────────────────────

function securitiesIndicative(s: SecurityState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    security_type: s.security_type === 'GOVT_BOND' ? 'GOVERNMENT' : s.security_type === 'CORP_BOND' ? 'CORPORATE' : s.security_type,
    security_sub_type: s.security_type,
    product_code: s.product_code,
    currency_code: s.currency_code,
    maturity_date: s.maturity_date,
    issue_date: s.origination_date,
    interest_rate: s.yield_to_maturity,
    interest_rate_type: parseInt(s.position_id, 10) % 4 === 0 ? 'FLOATING' : 'FIXED',
    coupon_dividend_rate: s.coupon_rate,
    coupon_int_pmt_periodicity: ['QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'][parseInt(s.position_id, 10) % 3],
    reporting_currency: 'USD',
    settlement_currency: s.currency_code,
    transaction_currency: s.currency_code,
    weighted_average_life: round(s.duration / 0.85, 2),
    amortization_type: ['MBS', 'ABS', 'CLO'].includes(s.security_type) ? 'AMORTIZING' : 'BULLET',
    ...auditFields(),
  };
}

function securitiesAccounting(s: SecurityState, date: string, dbPosId: string): SqlRow {
  const marketValue = round(s.face_value * s.price / 100, 4);
  const bookValue = round(s.face_value * s.amortization_factor * 0.985, 4);
  return {
    position_id: dbPosId, as_of_date: date,
    accounting_intent: s.accounting_intent,
    balance_sheet_amount: marketValue,
    carrying_value: bookValue,
    amortized_cost: bookValue,
    fair_value_amount: marketValue,
    market_value: marketValue,
    accrued_interest_amount: round(s.accrued_interest, 4),
    accrued_interest_dividend_amount: round(s.accrued_interest, 4),
    original_face_value: round(s.face_value, 4),
    current_face_value: round(s.face_value * s.amortization_factor, 4),
    counterparty_exposure_value: marketValue,
    exposure_amount: marketValue,
    unrealized_gain_loss: round(marketValue - bookValue, 4),
    book_yield: s.yield_to_maturity,
    original_book_yield: round(s.coupon_rate + 0.005, 6),
    purchase_price: round(s.face_value * 0.99, 4),
    price: s.price,
    usd_equivalent_amounts: marketValue,
    fair_value_measurement_level: s.accounting_intent === 'TRADING' ? 'Level_1' : s.accounting_intent === 'AFS' ? 'Level_2' : 'Level_3',
    settlement_date: s.origination_date,
    trade_date: s.origination_date,
    ...auditFields(),
  };
}

function securitiesClassification(s: SecurityState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    cusip: String(parseInt(s.position_id, 10) % 999999).padStart(9, '0'),
    isin: `US${String(parseInt(s.position_id, 10) % 9999999999).padStart(10, '0')}0`,
    security_name: `${s.security_type} ${s.position_id}`,
    security_description: `${s.security_type} security`,
    security_status: 'ACTIVE',
    security_identifier: `SEC-${String(s.position_id).padStart(10, '0')}`,
    security_identifier_type: 'CUSIP',
    issuer_name: s.security_type === 'GOVT_BOND' ? 'US Treasury' : s.security_type === 'AGENCY' ? 'FHLMC' : `Issuer-${s.counterparty_id}`,
    issuer_type: s.security_type === 'GOVT_BOND' ? 'SOVEREIGN' : ['AGENCY', 'MBS'].includes(s.security_type) ? 'GSE' : 'CORPORATE',
    customer_id: `CUST-${s.counterparty_id}`,
    gl_account_number: ['GOVT_BOND', 'AGENCY'].includes(s.security_type) ? 1500 : ['MBS', 'ABS', 'CLO'].includes(s.security_type) ? 1600 : 1700,
    counterparty_type: s.security_type === 'GOVT_BOND' ? 'SOVEREIGN' : ['AGENCY', 'MBS'].includes(s.security_type) ? 'GSE' : 'CORPORATE',
    legal_entity_id: String(s.legal_entity_id),
    sector: s.security_type === 'GOVT_BOND' ? 'GOVERNMENT' : s.security_type === 'MUNI' ? 'MUNICIPAL' : 'FINANCIAL',
    country_code: ['US', 'GB', 'DE', 'JP'][parseInt(s.counterparty_id, 10) %4],
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'BLOOMBERG',
    call_report_code: s.security_type === 'GOVT_BOND' ? 'RC-B2a' : s.security_type === 'MBS' ? 'RC-B4a' : 'RC-B5',
    internal_transaction_flag: 'N',
    cost_center_id: s.legal_entity_id * 100 + (parseInt(dbPosId, 10) % 10),
    ...auditFields(),
  };
}

function securitiesRisk(s: SecurityState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    pledged_flag: parseInt(s.position_id, 10) % 5 === 0,
    encumbered_flag: parseInt(s.position_id, 10) % 7 === 0,
    performing_flag: true,
    non_accrual_status: false,
    secured_flag: ['MBS', 'ABS', 'CLO'].includes(s.security_type) ? 'SECURED' : 'UNSECURED',
    treasury_control_flag: parseInt(s.position_id, 10) % 8 === 0,
    liquid_assets_collateral_level: ['GOVT_BOND', 'AGENCY'].includes(s.security_type) ? 'LEVEL_1'
      : ['CORP_BOND', 'MBS'].includes(s.security_type) ? 'LEVEL_2A' : 'LEVEL_2B',
    trade_long_short_flag: 'LONG',
    private_placement_flag: s.security_type === 'CLO' && parseInt(s.position_id, 10) % 3 === 0,
    ...auditFields(),
  };
}

// ─── DEPOSITS ────────────────────────────────────────────────────────────

function depositsIndicative(s: DepositState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    deposit_account_type: s.deposit_type,
    currency_code: s.currency_code,
    interest_rate: s.interest_rate,
    interest_rate_type: s.deposit_type === 'DEMAND_DEP' ? 'NON_INTEREST_BEARING' : 'FIXED',
    interest_bearing_flag: s.deposit_type !== 'DEMAND_DEP',
    maturity_date: s.maturity_date,
    reporting_currency: 'USD',
    settlement_currency: s.currency_code,
    transaction_currency: s.currency_code,
    product_code: s.deposit_type,
    days_remaining_to_maturity: s.maturity_date ? s.remaining_tenor_months * 30 : null,
    ...auditFields(),
  };
}

function depositsAccounting(s: DepositState, date: string, dbPosId: string): SqlRow {
  const accrued = round(s.balance * s.interest_rate / 12, 4);
  return {
    position_id: dbPosId, as_of_date: date,
    accounting_intent: 'HELD_AT_COST',
    bs_amount: round(s.balance, 4),
    book_value_amount: round(s.balance, 4),
    deposit_balance: round(s.balance, 4),
    current_balance: round(s.balance, 4),
    accrued_interest_amount: accrued,
    accrued_interest_dividend_amount: accrued,
    fair_value_amount: round(s.balance, 4),
    usd_equivalent_amount: round(s.balance, 4),
    fdic_insured_balance: s.insured_balance,
    fdic_insured_depository_institution_flag: s.is_insured,
    original_balance: round(s.prior_balance, 4),
    interest_balance: round(accrued * 12, 4),
    amount_balance: round(s.balance, 4),
    ...auditFields(),
  };
}

function depositsClassification(s: DepositState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    customer_id: `CUST-${s.counterparty_id}`,
    gl_account_number: [6100, 6200, 6300, 6400][['DEMAND_DEP', 'SAVINGS', 'TIME_DEP', 'MMDA'].indexOf(s.deposit_type)],
    counterparty_type: ['CORPORATE', 'SME', 'RETAIL', 'GOVERNMENT', 'INSTITUTIONAL'][parseInt(s.counterparty_id, 10) %5],
    legal_entity_id: String(s.legal_entity_id),
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'CORE_BANKING',
    account_status: 'ACTIVE',
    internal_transaction_flag: parseInt(s.counterparty_id, 10) %25 === 0 ? 'Y' : 'N',
    geographic_code: parseInt(s.position_id, 10) % 4 === 0 ? 'DOMESTIC' : 'FOREIGN',
    cost_center_id: s.legal_entity_id * 100 + (parseInt(dbPosId, 10) % 10),
    call_report_code: s.deposit_type === 'DEMAND_DEP' ? 'RC-E1a' : s.deposit_type === 'SAVINGS' ? 'RC-E1b' : s.deposit_type === 'TIME_DEP' ? 'RC-E2' : 'RC-E3',
    insurance_provider: 'FDIC',
    fdic_ownership_code: ['SINGLE', 'JOINT', 'REVOCABLE_TRUST', 'BUSINESS'][parseInt(s.position_id, 10) % 4],
    stability: s.stability_class,
    ...auditFields(),
  };
}

function depositsRisk(s: DepositState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    operational_flag: s.is_operational,
    brokered_flag: s.is_brokered,
    reciprocal_flag: parseInt(s.position_id, 10) % 10 === 0,
    sweep_flag: s.deposit_type === 'MMDA' && parseInt(s.position_id, 10) % 3 === 0,
    relationship_flag: parseInt(s.position_id, 10) % 3 === 0,
    transactional_flag: s.deposit_type === 'DEMAND_DEP',
    stable_vs_less_stable_flag: s.stability_class,
    rc_e_depositor_type: ['INDIVIDUAL', 'CORPORATE', 'PUBLIC_FUND', 'GOVERNMENT', 'TRUST'][parseInt(s.counterparty_id, 10) %5],
    treasury_control_flag: false,
    negotiable_flag: s.deposit_type === 'TIME_DEP' && parseInt(s.position_id, 10) % 8 === 0,
    automated_renewal_flag: s.deposit_type === 'TIME_DEP',
    tradable_flag: false,
    ...auditFields(),
  };
}

// ─── BORROWINGS ──────────────────────────────────────────────────────────

function borrowingsIndicative(s: BorrowingState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    borrowing_type: s.borrowing_type,
    currency_code: s.currency_code,
    maturity_date: s.maturity_date,
    interest_rate: s.interest_rate,
    interest_rate_type: s.is_overnight ? 'FLOATING' : 'FIXED',
    interest_rate_variability: s.is_overnight ? 'VARIABLE' : 'FIXED',
    reporting_currency: 'USD',
    settlement_currency: s.currency_code,
    transaction_currency: s.currency_code,
    repayment_type: s.is_overnight ? 'OVERNIGHT' : 'BULLET',
    commitment_type: 'COMMITTED',
    ...auditFields(),
  };
}

function borrowingsAccounting(s: BorrowingState, date: string, dbPosId: string): SqlRow {
  const accrued = round(s.principal_amount * s.interest_rate / 12, 4);
  return {
    position_id: dbPosId, as_of_date: date,
    accounting_intent: 'HELD_AT_COST',
    bs_amount: round(s.principal_amount, 4),
    carrying_value: round(s.principal_amount, 4),
    current_outstanding_balance: round(s.principal_amount, 4),
    accrued_interest_amount: accrued,
    accrued_interest_dividend_amount: accrued,
    fair_value_amount: round(s.principal_amount, 4),
    counterparty_exposure_value: round(s.principal_amount, 4),
    exposure_amount: round(s.principal_amount, 4),
    exposure_at_default_ead: round(s.principal_amount, 4),
    original_amount: round(s.principal_amount, 4),
    usd_equivalent_amount: round(s.principal_amount, 4),
    funded_committed_exposure: round(s.principal_amount, 4),
    settlement_date: s.origination_date,
    borrowing_date: s.origination_date,
    borrowing_term: s.is_overnight ? 'OVERNIGHT' : 'TERM',
    ...auditFields(),
  };
}

function borrowingsClassification(s: BorrowingState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    customer_id: `CUST-${s.counterparty_id}`,
    gl_account_number: ['FED_FUNDS', 'FHLB_ADV', 'BROKERED_DEP'].indexOf(s.borrowing_type) + 3100,
    counterparty_type: s.borrowing_type === 'FED_FUNDS' ? 'BANK' : s.borrowing_type === 'FHLB_ADV' ? 'GSE' : 'BROKER_DEALER',
    legal_entity_id: String(s.legal_entity_id),
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'TREASURY_SYSTEM',
    internal_transaction_flag: parseInt(s.counterparty_id, 10) %20 === 0 ? 'Y' : 'N',
    cost_center_id: s.legal_entity_id * 100 + (parseInt(dbPosId, 10) % 10),
    call_report_code: s.borrowing_type === 'FED_FUNDS' ? 'RC-14a' : s.borrowing_type === 'FHLB_ADV' ? 'RC-16' : 'RC-14b',
    ...auditFields(),
  };
}

function borrowingsRisk(s: BorrowingState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    probability_of_default_pd: s.pd_annual,
    loss_given_default_lgd: s.lgd_estimate,
    internal_risk_rating: '2',
    pledged_flag: s.is_secured,
    secured_flag: s.is_secured ? 'SECURED' : 'UNSECURED',
    treasury_control_flag: true,
    non_accrual_status: false,
    ...auditFields(),
  };
}

// ─── DEBT ────────────────────────────────────────────────────────────────

function debtIndicative(s: DebtState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    debt_type: s.debt_type,
    security_type: 'DEBT',
    security_sub_type: s.debt_type,
    currency_code: s.currency_code,
    maturity_date: s.maturity_date,
    issue_date: s.origination_date,
    interest_rate: s.coupon_rate,
    interest_rate_type: parseInt(s.position_id, 10) % 3 === 0 ? 'FLOATING' : 'FIXED',
    reporting_currency: 'USD',
    settlement_currency: s.currency_code,
    transaction_currency: s.currency_code,
    remaining_maturity_days: s.remaining_tenor_months * 30,
    ...auditFields(),
  };
}

function debtAccounting(s: DebtState, date: string, dbPosId: string): SqlRow {
  const accrued = round(s.face_value * s.coupon_rate / 12, 4);
  const marketValue = round(s.face_value * s.price / 100, 4);
  return {
    position_id: dbPosId, as_of_date: date,
    accounting_intent: 'HELD_AT_AMORTIZED_COST',
    bs_amount: round(s.outstanding_balance, 4),
    carrying_value: round(s.outstanding_balance, 4),
    outstanding_balance: round(s.outstanding_balance, 4),
    accrued_interest_amount: accrued,
    accrued_interest_dividend_amount: accrued,
    amortized_cost: round(s.outstanding_balance * 0.995, 4),
    fair_value_amount: marketValue,
    original_face_amount: round(s.face_value, 4),
    counterparty_exposure_value: round(s.outstanding_balance, 4),
    exposure_amount: round(s.outstanding_balance, 4),
    exposure_at_default_ead: round(s.outstanding_balance, 4),
    usd_equivalent_amount: round(s.outstanding_balance, 4),
    premium_discount_amount: round(s.outstanding_balance * 0.005, 4),
    unrealized_gain_loss: round(marketValue - s.outstanding_balance, 4),
    settlement_date: s.origination_date,
    transaction_date: s.origination_date,
    ...auditFields(),
  };
}

function debtClassification(s: DebtState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    cusip: String(parseInt(s.position_id, 10) % 999999).padStart(9, '0'),
    isin: `US${String(parseInt(s.position_id, 10) % 9999999999).padStart(10, '0')}1`,
    customer_id: `CUST-${s.counterparty_id}`,
    gl_account_number: ['SENIOR_NOTE', 'SUBORD_NOTE', 'COVERED_BOND'].indexOf(s.debt_type) + 3400,
    counterparty_type: 'INVESTOR',
    legal_entity_id: String(s.legal_entity_id),
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'DEBT_MANAGEMENT',
    internal_transaction_flag: 'N',
    cost_center_id: s.legal_entity_id * 100 + (parseInt(dbPosId, 10) % 10),
    call_report_code: s.debt_type === 'SENIOR_NOTE' ? 'RC-20' : s.debt_type === 'SUBORD_NOTE' ? 'RC-19' : 'RC-20a',
    ...auditFields(),
  };
}

function debtRisk(s: DebtState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    probability_of_default_pd: s.pd_annual,
    loss_given_default_lgd: s.lgd_estimate,
    internal_risk_rating: s.debt_type === 'SUBORD_NOTE' ? '5' : s.debt_type === 'COVERED_BOND' ? '2' : '3',
    pledged_flag: s.debt_type === 'COVERED_BOND',
    non_accrual_status: false,
    treasury_control_flag: true,
    ...auditFields(),
  };
}

// ─── EQUITIES ────────────────────────────────────────────────────────────

function equitiesIndicative(s: EquityState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    equity_type: s.equity_type,
    currency_code: s.currency_code,
    reporting_currency: 'USD',
    settlement_currency: s.currency_code,
    transaction_currency: s.currency_code,
    ...auditFields(),
  };
}

function equitiesAccounting(s: EquityState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    bs_amount: round(s.market_value, 4),
    carrying_value: round(s.cost_basis * s.shares, 4),
    fair_value_amount: round(s.market_value, 4),
    market_value: round(s.market_value, 4),
    counterparty_exposure_value: round(s.market_value, 4),
    face_value: round(s.cost_basis * s.shares, 4),
    cash_dividends: round(s.market_value * s.dividend_yield, 4),
    ownership_percentage: s.ownership_pct,
    number_of_shares: s.shares,
    usd_equivalent_amount: round(s.market_value, 4),
    accrued_interest_dividend_amount: round(s.market_value * s.dividend_yield / 12, 4),
    retained_earnings: round(s.market_value * 0.15, 4),
    lendable_value: round(s.market_value * 0.7, 4),
    transaction_date: s.origination_date,
    ...auditFields(),
  };
}

function equitiesClassification(s: EquityState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    customer_id: `CUST-${s.counterparty_id}`,
    gl_account_number: s.equity_type === 'COMMON' ? 5100 : 5200,
    legal_entity_id: String(s.legal_entity_id),
    source_system_id: String(FACTORY_SOURCE_SYSTEM_ID),
    source_system_name: 'EQUITY_PLATFORM',
    stock_exchange_code: ['NYSE', 'NASDAQ', 'LSE', 'TSE'][parseInt(s.position_id, 10) % 4],
    ticker_symbol: `EQ-${String(s.position_id).padStart(5, '0')}`,
    internal_transaction_flag: 'N',
    cost_center_id: s.legal_entity_id * 100 + (parseInt(dbPosId, 10) % 10),
    call_report_code: s.equity_type === 'COMMON' ? 'RC-B6a' : 'RC-B6b',
    ...auditFields(),
  };
}

function equitiesRisk(s: EquityState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    treasury_control_flag: parseInt(s.position_id, 10) % 6 === 0,
    ...auditFields(),
  };
}

// ─── STOCK ───────────────────────────────────────────────────────────────

function stockIndicative(s: StockState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    currency_code: s.currency_code,
    stock_type: s.stock_type,
    stock_position_id: `STK-${String(s.position_id).padStart(8, '0')}`,
    ...auditFields(),
  };
}

function stockAccounting(s: StockState, date: string, dbPosId: string): SqlRow {
  const marketValue = round(s.shares * s.price_per_share, 4);
  return {
    position_id: dbPosId, as_of_date: date,
    bs_amount: marketValue,
    carrying_value: round(s.cost_basis * s.shares, 4),
    fair_value_amount: marketValue,
    market_value: marketValue,
    number_of_shares: s.shares,
    unrealized_gain_loss: round(s.unrealized_gain_loss, 4),
    accounting_method: s.accounting_method,
    investment_type: s.stock_type,
    ...auditFields(),
  };
}

function stockClassification(s: StockState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    customer_id: `CUST-${s.counterparty_id}`,
    legal_entity_id: String(s.legal_entity_id),
    internal_transaction_flag: 'N',
    investee_industry_type: ['TECHNOLOGY', 'FINANCIAL', 'HEALTHCARE', 'ENERGY', 'INDUSTRIAL', 'CONSUMER'][parseInt(s.position_id, 10) % 6],
    cost_center_id: s.legal_entity_id * 100 + (parseInt(dbPosId, 10) % 10),
    call_report_code: 'RC-B7',
    ...auditFields(),
  };
}

function stockRisk(s: StockState, date: string, dbPosId: string): SqlRow {
  return {
    position_id: dbPosId, as_of_date: date,
    treasury_control_flag: parseInt(s.position_id, 10) % 5 === 0,
    ...auditFields(),
  };
}
