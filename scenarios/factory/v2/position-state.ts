/**
 * Position State Manager — evolves non-credit positions through time.
 *
 * Parallel to FacilityStateManager but for standalone positions.
 * Each product category has its own evolution logic, driven by
 * market environment and seeded PRNG for reproducibility.
 */

import type {
  PositionState, PositionStateMap, DerivativeState, SFTState,
  SecurityState, DepositState, BorrowingState, DebtState,
  EquityState, StockState,
} from './position-types';
import { positionStateKey } from './position-types';
import type { MarketSnapshot, RateSnapshot } from './types';
import { DERIVATIVE_VOL, SA_CCR_ADD_ON } from './position-distributions';
import { normalSample } from './distributions';
import { seededRng, round, clamp } from './prng';

// ─── Manager ─────────────────────────────────────────────────────────────

export class PositionStateManager {
  private stateMap: PositionStateMap = new Map();

  /** Initialize with first-date states from the position pool. */
  initialize(positions: PositionState[], firstDate: string): void {
    for (const pos of positions) {
      this.stateMap.set(positionStateKey(pos.position_id, firstDate), { ...pos });
    }
  }

  /** Step to a new date, evolving all positions from the previous date. */
  step(prevDate: string, newDate: string, market: MarketSnapshot): void {
    const daysBetween = dateDiffDays(prevDate, newDate);
    const yearFraction = daysBetween / 365;

    for (const [key, prevState] of this.stateMap) {
      // Only process states from the previous date
      if (!key.endsWith(`|${prevDate}`)) continue;

      const rng = seededRng(`evolve-${prevState.position_id}-${newDate}`);
      const newState = evolvePosition(prevState, market, yearFraction, rng);

      // Update remaining tenor
      if (newState.maturity_date) {
        newState.remaining_tenor_months = Math.max(
          monthsBetween(newDate, newState.maturity_date), 0
        );
      }

      this.stateMap.set(positionStateKey(newState.position_id, newDate), newState);
    }
  }

  /** Get the full state map for generator consumption. */
  getStateMap(): PositionStateMap {
    return this.stateMap;
  }

  /** Get all unique position IDs. */
  getPositionIds(): string[] {
    const ids = new Set<string>();
    for (const state of this.stateMap.values()) {
      ids.add(state.position_id);
    }
    return [...ids];
  }
}

// ─── Evolution Router ────────────────────────────────────────────────────

function evolvePosition(
  prev: PositionState,
  market: MarketSnapshot,
  yearFraction: number,
  rng: () => number,
): PositionState {
  switch (prev.category) {
    case 'DERIVATIVES': return evolveDerivative(prev, market, yearFraction, rng);
    case 'SFT':         return evolveSFT(prev, market, yearFraction, rng);
    case 'SECURITIES':  return evolveSecurity(prev, market, yearFraction, rng);
    case 'DEPOSITS':    return evolveDeposit(prev, market, yearFraction, rng);
    case 'BORROWINGS':  return evolveBorrowing(prev, market, yearFraction, rng);
    case 'DEBT':        return evolveDebt(prev, market, yearFraction, rng);
    case 'EQUITIES':    return evolveEquity(prev, market, yearFraction, rng);
    case 'STOCK':       return evolveStock(prev, market, yearFraction, rng);
  }
}

// ─── DERIVATIVES: Ornstein-Uhlenbeck MTM + SA-CCR PFE ───────────────────

function evolveDerivative(
  prev: DerivativeState,
  market: MarketSnapshot,
  dt: number,
  rng: () => number,
): DerivativeState {
  const vol = DERIVATIVE_VOL[prev.derivative_type] ?? 0.03;
  const meanReversion = 0.5; // OU theta — reverts to 0

  // OU process: dX = theta*(mu - X)*dt + sigma*dW
  const shock = normalSample(rng) * Math.sqrt(dt);
  const drift = meanReversion * (0 - prev.mtm_value / prev.notional_amount) * dt;
  const newMtmFraction = (prev.mtm_value / prev.notional_amount) + drift + vol * shock;
  const mtm = round(prev.notional_amount * clamp(newMtmFraction, -0.15, 0.15), 2);

  const addOn = SA_CCR_ADD_ON[prev.derivative_type] ?? 0.05;
  const pfe = round(Math.abs(mtm) + addOn * prev.notional_amount, 2);

  // Collateral adjusts with MTM for cleared positions
  const collateralPosted = prev.clearing_status === 'CLEARED'
    ? round(Math.max(mtm, 0) * 0.8, 2) : prev.collateral_posted;
  const collateralReceived = prev.clearing_status === 'CLEARED'
    ? round(Math.max(-mtm, 0) * 0.8, 2) : prev.collateral_received;

  // Interest rate drifts slightly with market
  const sofr = market.rates.sofr_3m / 100;
  const newRate = round(sofr + (prev.interest_rate - sofr) * 0.95 + normalSample(rng) * 0.001, 6);

  return {
    ...prev,
    mtm_value: mtm,
    pfe_amount: pfe,
    replacement_cost: Math.max(mtm, 0),
    collateral_posted: collateralPosted,
    collateral_received: collateralReceived,
    interest_rate: clamp(newRate, 0, 0.15),
  };
}

// ─── SFT: Collateral Revaluation + Repo Rate Tracking ───────────────────

function evolveSFT(
  prev: SFTState,
  market: MarketSnapshot,
  dt: number,
  rng: () => number,
): SFTState {
  // Collateral value evolves with vol based on quality level
  const collVol = prev.collateral_quality === 'LEVEL_1' ? 0.005
    : prev.collateral_quality === 'LEVEL_2A' ? 0.015 : 0.03;
  const collShock = normalSample(rng) * Math.sqrt(dt) * collVol;
  const newCollateral = round(prev.collateral_value * (1 + collShock), 2);

  // Repo rate tracks SOFR
  const sofr = market.rates.sofr_1m / 100;
  const spread = prev.repo_rate - 0.053; // initial SOFR assumption
  const newRate = round(sofr + spread + normalSample(rng) * 0.0005, 6);

  return {
    ...prev,
    collateral_value: Math.max(newCollateral, prev.cash_leg_amount * 1.01), // minimum overcollateralization
    repo_rate: clamp(newRate, 0, 0.15),
  };
}

// ─── SECURITIES: Price/Yield Mean Reversion + Spread ─────────────────────

function evolveSecurity(
  prev: SecurityState,
  market: MarketSnapshot,
  dt: number,
  rng: () => number,
): SecurityState {
  // Price mean-reverts toward par (100)
  const priceVol = prev.security_type === 'GOVT_BOND' ? 1.5 : 2.5;
  const priceDrift = 0.3 * (100 - prev.price) * dt;
  const priceShock = normalSample(rng) * Math.sqrt(dt) * priceVol;
  const newPrice = round(clamp(prev.price + priceDrift + priceShock, 70, 130), 4);

  // Yield inverse to price
  const yearsRemaining = Math.max(prev.remaining_tenor_months / 12, 0.25);
  const newYield = round(prev.coupon_rate + (100 - newPrice) / yearsRemaining / newPrice, 6);

  // Duration decreases with time
  const newDuration = round(Math.max(prev.duration - dt, 0.1), 2);

  // Credit spread evolves
  const spreadShock = normalSample(rng) * 10 * Math.sqrt(dt); // bps
  const spreadDrift = 0.2 * (150 - prev.credit_spread_bps) * dt; // mean-revert to 150bps
  const newSpread = round(clamp(prev.credit_spread_bps + spreadDrift + spreadShock, 5, 600), 2);

  // MBS/ABS prepayment
  const newAmortFactor = ['MBS', 'ABS', 'CLO'].includes(prev.security_type)
    ? round(prev.amortization_factor * (1 - (0.05 + rng() * 0.1) * dt), 4) // 5-15% annual CPR
    : prev.amortization_factor;

  // Accrued interest: coupon accrual (resets each coupon period)
  const newAccrued = round(prev.face_value * prev.coupon_rate / 12, 2);

  return {
    ...prev,
    price: newPrice,
    yield_to_maturity: Math.max(newYield, 0.001),
    duration: newDuration,
    credit_spread_bps: newSpread,
    amortization_factor: newAmortFactor,
    accrued_interest: newAccrued,
  };
}

// ─── DEPOSITS: Balance Drift + Seasonal EOQ Overlay ──────────────────────

function evolveDeposit(
  prev: DepositState,
  market: MarketSnapshot,
  dt: number,
  rng: () => number,
): DepositState {
  const priorBalance = prev.balance;

  // Balance drift: stable deposits grow slowly, less_stable more volatile
  const annualGrowth = prev.stability_class === 'STABLE' ? 0.03 : -0.02;
  const balVol = prev.stability_class === 'STABLE' ? 0.02 : 0.06;
  const balDrift = prev.balance * annualGrowth * dt;
  const balShock = prev.balance * normalSample(rng) * Math.sqrt(dt) * balVol;
  const newBalance = round(Math.max(prev.balance + balDrift + balShock, 1000), 2);

  // Rate repricing for non-fixed
  let newRate = prev.interest_rate;
  if (prev.deposit_type !== 'TIME_DEP') {
    const sofr = market.rates.sofr_1m / 100;
    newRate = prev.deposit_type === 'DEMAND_DEP' ? 0.001
      : round(clamp(sofr * 0.85 + normalSample(rng) * 0.002, 0, 0.08), 6);
  }

  return {
    ...prev,
    balance: newBalance,
    interest_rate: newRate,
    insured_balance: Math.min(newBalance, 250000),
    prior_balance: priorBalance,
  };
}

// ─── BORROWINGS: Rate Tracking + Stable Principal ────────────────────────

function evolveBorrowing(
  prev: BorrowingState,
  market: MarketSnapshot,
  dt: number,
  rng: () => number,
): BorrowingState {
  const sofr = market.rates.sofr_1m / 100;

  let newRate: number;
  if (prev.is_overnight) {
    // Fed funds tracks SOFR exactly
    newRate = round(sofr, 6);
  } else {
    // Term borrowings: rate drifts slowly
    const spread = prev.interest_rate - 0.053; // initial SOFR
    newRate = round(sofr + spread + normalSample(rng) * 0.0003, 6);
  }

  return {
    ...prev,
    interest_rate: clamp(newRate, 0, 0.15),
    // Funding cost drifts slightly
    funding_cost_bps: round(clamp(prev.funding_cost_bps + normalSample(rng) * 0.5, 2, 30), 2),
  };
}

// ─── DEBT: Coupon Accrual + Price/Spread ─────────────────────────────────

function evolveDebt(
  prev: DebtState,
  market: MarketSnapshot,
  dt: number,
  rng: () => number,
): DebtState {
  // Credit spread drifts
  const spreadShock = normalSample(rng) * 8 * Math.sqrt(dt);
  const spreadDrift = 0.15 * (150 - prev.credit_spread_bps) * dt;
  const newSpread = round(clamp(prev.credit_spread_bps + spreadDrift + spreadShock, 30, 500), 2);

  // Price inverse to spread (simplified: +1bps spread = -0.04% price for 5yr duration)
  const spreadChange = newSpread - prev.credit_spread_bps;
  const priceImpact = -spreadChange * 0.0004 * 5; // duration ~5y
  const newPrice = round(clamp(prev.price + priceImpact + normalSample(rng) * 0.3, 85, 115), 4);

  return {
    ...prev,
    price: newPrice,
    credit_spread_bps: newSpread,
  };
}

// ─── EQUITIES: Geometric Brownian Motion ─────────────────────────────────

function evolveEquity(
  prev: EquityState,
  market: MarketSnapshot,
  dt: number,
  rng: () => number,
): EquityState {
  // GBM: dS/S = mu*dt + sigma*dW
  const mu = 0.08;     // 8% annual expected return
  const sigma = 0.20;  // 20% annual vol
  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const shock = sigma * Math.sqrt(dt) * normalSample(rng);
  const newPrice = round(prev.price_per_share * Math.exp(drift + shock), 2);

  const newMarketValue = round(prev.shares * newPrice, 2);

  // Dividend yield drifts slightly
  const newDivYield = round(clamp(prev.dividend_yield + normalSample(rng) * 0.002 * Math.sqrt(dt), 0.005, 0.08), 6);

  return {
    ...prev,
    price_per_share: Math.max(newPrice, 1),
    market_value: newMarketValue,
    dividend_yield: newDivYield,
  };
}

// ─── STOCK: Correlated with Equities ─────────────────────────────────────

function evolveStock(
  prev: StockState,
  market: MarketSnapshot,
  dt: number,
  rng: () => number,
): StockState {
  // Similar to equities but slightly different params
  const mu = 0.06;
  const sigma = 0.25;
  const drift = (mu - 0.5 * sigma * sigma) * dt;
  const shock = sigma * Math.sqrt(dt) * normalSample(rng);
  const newPrice = round(prev.price_per_share * Math.exp(drift + shock), 2);

  return {
    ...prev,
    price_per_share: Math.max(newPrice, 0.5),
    unrealized_gain_loss: round((newPrice - prev.cost_basis) * prev.shares, 2),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function dateDiffDays(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
}

function monthsBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
}
