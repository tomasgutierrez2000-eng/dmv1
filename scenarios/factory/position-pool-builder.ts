/**
 * Position Pool Builder — creates initial PositionState for non-credit products.
 *
 * Parallel to chain-builder.ts but for standalone positions (no facility/agreement chain).
 * Allocates position IDs, assigns counterparties from existing PG pool, and initializes
 * product-specific state with GSIB-realistic distributions.
 */

import type { IDRegistry } from './id-registry';
import type {
  PositionState, NonCreditCategory, DerivativeState, SFTState,
  SecurityState, DepositState, BorrowingState, DebtState,
  EquityState, StockState,
} from './v2/position-types';
import { NC_PRODUCT_CODES, ALL_NC_CATEGORIES } from './v2/position-types';
import { NC_DISTRIBUTIONS, RATING_TIERS, SA_CCR_ADD_ON, SFT_HAIRCUTS } from './v2/position-distributions';
import { logNormalSample, boundedNormal } from './v2/distributions';
import { seededRng, pick, round, intRange, range, clamp } from './v2/prng';
import type { RatingTier } from '../../scripts/shared/mvp-config';

// ─── Configuration ───────────────────────────────────────────────────────

export interface PoolConfig {
  /** Positions per product category (default 100) */
  positionsPerCategory: number;
  /** Available counterparty IDs to assign from */
  counterpartyIds: number[];
  /** Available netting set IDs for derivatives */
  nettingSetIds: number[];
  /** Base date for origination (positions originated before this) */
  baseDate: string;
}

const DEFAULT_POOL_CONFIG: PoolConfig = {
  positionsPerCategory: 100,
  counterpartyIds: Array.from({ length: 100 }, (_, i) => i + 1), // 1-100
  nettingSetIds: Array.from({ length: 60 }, (_, i) => i + 1),    // 1-60
  baseDate: '2024-07-01',
};

// ─── Main Builder ────────────────────────────────────────────────────────

export interface PositionPool {
  /** All initial position states (one per position, for the first date) */
  positions: PositionState[];
  /** Position IDs grouped by category */
  idsByCategory: Map<NonCreditCategory, number[]>;
}

export function buildPositionPool(
  registry: IDRegistry,
  config: Partial<PoolConfig> = {},
): PositionPool {
  const cfg = { ...DEFAULT_POOL_CONFIG, ...config };
  const positions: PositionState[] = [];
  const idsByCategory = new Map<NonCreditCategory, number[]>();

  for (const category of ALL_NC_CATEGORIES) {
    const ids: number[] = [];
    const codes = NC_PRODUCT_CODES[category];
    const dist = NC_DISTRIBUTIONS[category];

    for (let i = 0; i < cfg.positionsPerCategory; i++) {
      const posId = registry.allocate('nc_position', 1, 'nc-products')[0];
      const rng = seededRng(`pool-${category}-${i}`);

      // Round-robin across product subtypes within category
      const subtype = codes[i % codes.length];

      // Assign counterparty with diversity
      const cpId = cfg.counterpartyIds[i % cfg.counterpartyIds.length];

      // Currency by weighted distribution
      const currency = pickWeighted(rng, dist.currency_weights);

      // Legal entity by weighted distribution
      const leId = pickWeightedIndex(rng, dist.le_weights) + 1;

      // Rating by position index (spread across tiers)
      const ratingIdx = Math.floor((i / cfg.positionsPerCategory) * RATING_TIERS.length);
      const rating = RATING_TIERS[Math.min(ratingIdx, RATING_TIERS.length - 1)];
      const ratingTier = ratingToTier(rating);

      // PD/LGD from distribution ranges
      const pd = dist.pd_range[0] === 0 && dist.pd_range[1] === 0
        ? 0
        : round(range(rng, dist.pd_range[0], dist.pd_range[1]), 6);
      const lgd = dist.lgd_range[0] === dist.lgd_range[1]
        ? dist.lgd_range[0]
        : round(range(rng, dist.lgd_range[0], dist.lgd_range[1]), 6);

      // Origination date: 6 months to 5 years before base date
      const daysBack = intRange(rng, 180, 1800);
      const origDate = subtractDays(cfg.baseDate, daysBack);

      // Maturity date
      const matDate = dist.maturity_months
        ? addMonths(origDate, intRange(rng, dist.maturity_months[0], dist.maturity_months[1]))
        : null;

      const remainingMonths = matDate ? monthsBetween(cfg.baseDate, matDate) : 999;

      // Primary amount from log-normal distribution
      const amount = round(logNormalSample(rng, dist.amount_mu, dist.amount_sigma, dist.amount_min, dist.amount_max), 2);

      // Build product-specific state
      const base = {
        position_id: posId,
        counterparty_id: cpId,
        product_subtype_id: subtype.subtypeId,
        product_code: subtype.code,
        currency_code: currency,
        legal_entity_id: leId,
        origination_date: origDate,
        maturity_date: matDate,
        remaining_tenor_months: Math.max(remainingMonths, 0),
        external_rating: rating,
        internal_rating: String(Math.min(ratingIdx + 1, 10)),
        pd_annual: pd,
        lgd_estimate: lgd,
        rating_tier: ratingTier,
      };

      const state = buildProductState(category, base, amount, rng, cfg);
      positions.push(state);
      ids.push(posId);
    }

    idsByCategory.set(category, ids);
  }

  return { positions, idsByCategory };
}

// ─── Product-Specific State Builders ─────────────────────────────────────

function buildProductState(
  category: NonCreditCategory,
  base: Omit<PositionState, 'category' | keyof DerivativeState>,
  amount: number,
  rng: () => number,
  cfg: PoolConfig,
): PositionState {
  switch (category) {
    case 'DERIVATIVES': {
      const notional = amount;
      const vol = 0.03; // initial MTM as fraction of notional
      const mtm = round(notional * (rng() * vol * 2 - vol), 2);
      const addOn = SA_CCR_ADD_ON[base.product_code] ?? 0.05;
      return {
        ...base,
        category: 'DERIVATIVES',
        derivative_type: base.product_code,
        notional_amount: notional,
        mtm_value: mtm,
        pfe_amount: round(Math.abs(mtm) + addOn * notional, 2),
        replacement_cost: Math.max(mtm, 0),
        netting_set_id: cfg.nettingSetIds[base.position_id % cfg.nettingSetIds.length],
        clearing_status: base.position_id % 3 === 0 ? 'CLEARED' : 'BILATERAL',
        direction: base.position_id % 2 === 0 ? 'PAY' : 'RECEIVE',
        is_hedge: base.position_id % 3 !== 0,
        is_trading_book: base.position_id % 3 === 0,
        collateral_posted: base.position_id % 3 === 0 ? round(Math.abs(mtm) * 0.8, 2) : 0,
        collateral_received: base.position_id % 3 === 0 ? round(Math.abs(mtm) * 0.3, 2) : 0,
        interest_rate: round(0.04 + rng() * 0.02, 6),
      } as DerivativeState;
    }

    case 'SFT': {
      const cashLeg = amount;
      const quality = (['LEVEL_1', 'LEVEL_2A', 'LEVEL_2B'] as const)[base.position_id % 3];
      const haircutRange = SFT_HAIRCUTS[quality];
      const haircut = round(range(rng, haircutRange[0], haircutRange[1]), 4);
      return {
        ...base,
        category: 'SFT',
        sft_type: base.product_code,
        cash_leg_amount: cashLeg,
        collateral_value: round(cashLeg * (1 + haircut + rng() * 0.02), 2),
        haircut_pct: haircut,
        repo_rate: round(0.053 + (rng() * 0.01 - 0.005), 6),
        is_principal: base.position_id % 3 === 0,
        collateral_quality: quality,
        rehypothecation_flag: base.product_code === 'SEC_LENDING' && rng() < 0.3,
      } as SFTState;
    }

    case 'SECURITIES': {
      const faceValue = amount;
      const coupon = round(0.03 + rng() * 0.04, 6); // 3-7%
      const price = round(boundedNormal(rng, 100, 5, 85, 115), 4);
      const yearsRemaining = Math.max(base.remaining_tenor_months / 12, 0.5);
      return {
        ...base,
        category: 'SECURITIES',
        security_type: base.product_code,
        face_value: faceValue,
        price,
        yield_to_maturity: round(Math.max(coupon + (100 - price) / yearsRemaining / price, 0.001), 6),
        duration: round(yearsRemaining * 0.85, 2),
        credit_spread_bps: round(boundedNormal(rng, 150, 80, 10, 500), 2),
        coupon_rate: coupon,
        accrued_interest: round(faceValue * coupon / 12 * (rng() * 6), 2), // 0-6 months accrued
        accounting_intent: (['HTM', 'AFS', 'TRADING'] as const)[base.position_id % 3],
        amortization_factor: ['MBS', 'ABS', 'CLO'].includes(base.product_code)
          ? round(1.0 - rng() * 0.15, 4) : 1.0,
      } as SecurityState;
    }

    case 'DEPOSITS': {
      const balance = amount;
      const isTimeDep = ['TIME_DEP', 'MMDA'].includes(base.product_code);
      const isDemand = base.product_code === 'DEMAND_DEP';
      return {
        ...base,
        category: 'DEPOSITS',
        deposit_type: base.product_code,
        balance,
        interest_rate: isDemand ? 0.001
          : base.product_code === 'SAVINGS' ? round(0.04 + rng() * 0.01, 6)
          : base.product_code === 'TIME_DEP' ? round(0.045 + rng() * 0.015, 6)
          : round(0.05 + rng() * 0.01, 6), // MMDA
        is_insured: true,
        insured_balance: Math.min(balance, 250000),
        stability_class: isDemand || base.product_code === 'SAVINGS' ? 'STABLE' : 'LESS_STABLE',
        is_operational: isDemand,
        is_brokered: base.product_code === 'MMDA' && rng() < 0.2,
        prior_balance: round(balance * (1 + (rng() * 0.04 - 0.02)), 2),
        maturity_date: isTimeDep ? base.maturity_date ?? addMonths(base.origination_date, intRange(rng, 3, 24)) : null,
      } as DepositState;
    }

    case 'BORROWINGS': {
      const principal = amount;
      const isOvernight = base.product_code === 'FED_FUNDS';
      return {
        ...base,
        category: 'BORROWINGS',
        borrowing_type: base.product_code,
        principal_amount: principal,
        interest_rate: isOvernight ? 0.0533
          : base.product_code === 'FHLB_ADV' ? round(0.048 + rng() * 0.005, 6)
          : round(0.052 + rng() * 0.005, 6),
        funding_cost_bps: round(boundedNormal(rng, 10, 5, 2, 30), 2),
        is_overnight: isOvernight,
        is_secured: base.product_code === 'FHLB_ADV',
      } as BorrowingState;
    }

    case 'DEBT': {
      const faceValue = amount;
      const coupon = base.product_code === 'SUBORD_NOTE'
        ? round(0.065 + rng() * 0.02, 6)
        : base.product_code === 'COVERED_BOND'
          ? round(0.04 + rng() * 0.01, 6)
          : round(0.055 + rng() * 0.015, 6);
      return {
        ...base,
        category: 'DEBT',
        debt_type: base.product_code,
        face_value: faceValue,
        coupon_rate: coupon,
        price: round(boundedNormal(rng, 99, 3, 90, 110), 4),
        credit_spread_bps: base.product_code === 'SUBORD_NOTE'
          ? round(boundedNormal(rng, 200, 50, 100, 400), 2)
          : round(boundedNormal(rng, 120, 40, 50, 250), 2),
        outstanding_balance: faceValue,
        is_callable: base.product_code !== 'COVERED_BOND' && rng() < 0.3,
      } as DebtState;
    }

    case 'EQUITIES': {
      const marketValue = amount;
      const pricePerShare = round(50 + rng() * 200, 2);
      const shares = round(marketValue / pricePerShare, 0);
      return {
        ...base,
        category: 'EQUITIES',
        equity_type: base.product_code === 'COMMON_EQ' ? 'COMMON' : 'PREFERRED',
        shares,
        price_per_share: pricePerShare,
        cost_basis: round(pricePerShare * (0.85 + rng() * 0.3), 2), // bought at 85-115% of current
        dividend_yield: round(0.01 + rng() * 0.04, 6), // 1-5%
        ownership_pct: round(clamp(rng() * 15, 0.1, 49.9), 2),
        market_value: round(shares * pricePerShare, 2),
      } as EquityState;
    }

    case 'STOCK': {
      const marketValue = amount;
      const pricePerShare = round(20 + rng() * 150, 2);
      const shares = round(marketValue / pricePerShare, 0);
      const costBasis = round(pricePerShare * (0.8 + rng() * 0.4), 2);
      return {
        ...base,
        category: 'STOCK',
        stock_type: base.product_code === 'COMMON_STOCK' ? 'COMMON' : 'PREFERRED',
        shares,
        price_per_share: pricePerShare,
        cost_basis: costBasis,
        unrealized_gain_loss: round((pricePerShare - costBasis) * shares, 2),
        accounting_method: (['EQUITY_METHOD', 'FAIR_VALUE', 'COST_METHOD'] as const)[base.position_id % 3],
      } as StockState;
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function pickWeighted(rng: () => number, weights: { code: string; weight: number }[]): string {
  const r = rng();
  let cumulative = 0;
  for (const w of weights) {
    cumulative += w.weight;
    if (r < cumulative) return w.code;
  }
  return weights[weights.length - 1].code;
}

function pickWeightedIndex(rng: () => number, weights: number[]): number {
  const r = rng();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (r < cumulative) return i;
  }
  return weights.length - 1;
}

function ratingToTier(rating: string): RatingTier {
  if (['AAA', 'AA+', 'AA', 'A+', 'A'].includes(rating)) return 'INVESTMENT_GRADE';
  if (['BBB+', 'BBB'].includes(rating)) return 'STANDARD';
  if (['BB+', 'BB'].includes(rating)) return 'SUBSTANDARD';
  return 'DOUBTFUL';
}

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function monthsBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
}
