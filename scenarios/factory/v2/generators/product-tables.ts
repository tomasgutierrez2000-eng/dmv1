/**
 * Generator: 40 product-specific snapshot tables
 * (10 products × 4 categories: indicative, accounting, classification, risk)
 *
 * Maps FacilityState → product-specific rows at (position_id, as_of_date) grain.
 * Depends on position generator having already allocated position_ids.
 *
 * Current scope: Loans product (credit products under facilities).
 * Other products (Derivatives, Securities, SFT, Deposits, Borrowings, Debt,
 * Off-BS Commitments, Equities, Stock) produce skeleton rows with universal
 * fields — to be enriched when those products are modeled in the factory.
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

/** Map existing ProductType (facility-level) to the product category for product tables */
function mapToProductCategory(state: FacilityState): ProductCategory {
  // Current factory only generates credit products under facilities
  // All facility-linked positions are Loans or Off-BS Commitments
  switch (state.product_type) {
    case 'LETTER_OF_CREDIT':
      return 'offbs_commitments';
    default:
      return 'loans';
  }
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

function loansIndicative(state: FacilityState, positionId: number, date: string): SqlRow {
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

function loansAccounting(state: FacilityState, positionId: number, date: string): SqlRow {
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
    gross_contractual_charge_off_amount: state.credit_status === 'DEFAULT' ? round(state.drawn_amount * state.lgd_current, 4) : 0,
    recovery_amount: 0,
    fair_value_amount: round(state.drawn_amount * (1 - state.pd_annual * state.lgd_current), 4),
    fair_value_flag: 'N',
    lendable_value: round(state.collateral_value, 4),
    monthly_draw_amount: round(state.drawn_amount - state.prior_drawn_amount, 4),
    exposure_at_default_ead: round(state.ead, 4),
    ...auditFields(),
  };
}

function loansClassification(state: FacilityState, positionId: number, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    customer_id: `CUST-${state.counterparty_id}`,
    facility_id: state.facility_id,
    counterparty_type: state.product_type === 'LETTER_OF_CREDIT' ? 'BANK' : 'CORPORATE',
    industry_code: state.industry_id,
    entity_industry_code: state.industry_id,
    country: state.country_code,
    loan_status: state.credit_status,
    product_category_code: state.product_type,
    gl_account_number: 1300,  // Typical loans receivable GL code
    ...auditFields(),
  };
}

function loansRisk(state: FacilityState, positionId: number, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    probability_of_default_pd: round(state.pd_annual, 6),
    loss_given_default_lgd: round(state.lgd_current, 6),
    expected_loss_given_default_elgd: round(state.lgd_current * 0.95, 6), // ELGD ≈ LGD downturn adjusted
    internal_risk_rating: state.internal_rating,
    internal_rating: state.internal_rating,
    num_days_principal_or_interest_past_due: state.days_past_due,
    delinquency_status: state.days_past_due > 0 ? 'DELINQUENT' : 'CURRENT',
    delinquency_flag: state.days_past_due > 0 ? 'Y' : 'N',
    accrual_status: state.days_past_due >= 90 ? 'NON_ACCRUAL' : 'ACCRUAL',
    collateral_type: state.collateral_type,
    provision_for_credit_losses: round(state.ecl_12m, 4),
    two_year_probability_of_default: round(state.pd_annual * 1.8, 6), // Approximate 2-year PD
    maximum_probability_of_default: round(state.pd_annual * 2.5, 6),
    minimum_probability_of_default: round(state.pd_annual * 0.5, 6),
    ...auditFields(),
  };
}

// ─── Off-BS Commitments Generators ──────────────────────────────────────

function offbsIndicative(state: FacilityState, positionId: number, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    effective_date: state.origination_date,
    maturity_date: state.maturity_date,
    currency_code: state.currency_code,
    product_code: 'LETTER_OF_CREDIT',
    commitment_type: 'IRREVOCABLE',
    ...auditFields(),
  };
}

function offbsAccounting(state: FacilityState, positionId: number, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    committed_exposure_global: round(state.committed_amount, 4),
    funded_committed_exposure: round(state.drawn_amount, 4),
    unfunded_committed_exposure: round(state.undrawn_amount, 4),
    counterparty_exposure_value: round(state.ead, 4),
    credit_conversion_factor: round(state.ccf, 6),
    allowance_for_credit_losses_amount: round(state.ecl_12m, 4),
    fee_income_amount: round(state.committed_amount * state.fee_rate_pct / 12, 4),
    currency_code: state.currency_code,
    ...auditFields(),
  };
}

function offbsClassification(state: FacilityState, positionId: number, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    customer_id: `CUST-${state.counterparty_id}`,
    product_code: 'LETTER_OF_CREDIT',
    country_code: state.country_code,
    currency_code: state.currency_code,
    gl_account_number: 9050,  // Off-balance-sheet commitments
    ...auditFields(),
  };
}

function offbsRisk(state: FacilityState, positionId: number, date: string): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    probability_of_default_pd: round(state.pd_annual, 6),
    loss_given_default_lgd: round(state.lgd_current, 6),
    credit_conversion_factor: round(state.ccf, 6),
    exposure_at_default_ead: round(state.ead, 4),
    expected_loss: round(state.expected_loss, 4),
    risk_weight: round(state.risk_weight_pct, 6),
    unconditionally_cancellable_flag: false,
    ...auditFields(),
  };
}

// ─── Skeleton Generator (for products not yet modeled) ──────────────────

/**
 * Produces minimal rows with just PK + universal fields for products that
 * the factory doesn't yet model (Derivatives, SFT, Securities, Deposits, etc.).
 * These skeleton rows satisfy FK constraints and provide position-level grain.
 */
function skeletonRow(positionId: number, date: string, state: FacilityState): SqlRow {
  return {
    position_id: positionId,
    as_of_date: date,
    currency_code: state.currency_code,
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
  facilityIds: number[],
  dates: string[],
  positionIdMap: Map<string, number>,
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

        // Future: add Derivatives, SFT, Securities, Deposits, Borrowings, Debt, Equities, Stock
        // when the factory models those product types. For now, these products are not generated
        // because the factory's FacilityState only models credit products under facilities.
        default:
          break;
      }
    }
  }

  return { tables };
}
