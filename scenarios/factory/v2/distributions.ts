/**
 * Statistical distributions for realistic GSIB data generation.
 *
 * Replaces hardcoded arrays with parameterized distributions:
 *   - LogNormal: committed amounts (right-skewed, bounded)
 *   - Beta: utilization ratios (bounded [0,1])
 *   - Ornstein-Uhlenbeck: spread evolution (mean-reverting)
 *   - Normal (bounded): LGD, financial ratios
 *   - Triangular: collateral haircuts, fee rates
 *
 * Every function takes a seeded RNG for reproducibility.
 */

import type { RatingTier, SizeProfile } from '../../../scripts/shared/mvp-config';
import type { ProductType } from './types';
import { clamp } from './prng';

// ─── Core Distribution Samplers ────────────────────────────────────────

/** Sample from a standard normal distribution via Box-Muller transform. */
export function normalSample(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

/** Sample from N(mean, std), clamped to [lo, hi]. */
export function boundedNormal(
  rng: () => number,
  mean: number,
  std: number,
  lo: number,
  hi: number,
): number {
  return clamp(mean + normalSample(rng) * std, lo, hi);
}

/**
 * Sample from a log-normal distribution.
 *   mu, sigma are parameters of the underlying normal.
 *   Result = exp(N(mu, sigma)), clamped to [lo, hi].
 */
export function logNormalSample(
  rng: () => number,
  mu: number,
  sigma: number,
  lo: number,
  hi: number,
): number {
  const x = Math.exp(mu + normalSample(rng) * sigma);
  return clamp(x, lo, hi);
}

/**
 * Sample from a Beta distribution using the Jöhnk algorithm.
 *   alpha, beta > 0.  Returns value in [0, 1].
 */
export function betaSample(
  rng: () => number,
  alpha: number,
  beta: number,
): number {
  // For alpha,beta >= 1 use the gamma-based approach
  const ga = gammaSample(rng, alpha);
  const gb = gammaSample(rng, beta);
  return ga / (ga + gb);
}

/** Sample from Gamma(shape, 1) using Marsaglia-Tsang for shape >= 1. */
function gammaSample(rng: () => number, shape: number): number {
  if (shape < 1) {
    // Boost: Gamma(shape) = Gamma(shape+1) * U^(1/shape)
    return gammaSample(rng, shape + 1) * Math.pow(rng(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = normalSample(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

/**
 * Sample from a triangular distribution.
 *   Returns value in [lo, hi] with mode at `mode`.
 */
export function triangularSample(
  rng: () => number,
  lo: number,
  mode: number,
  hi: number,
): number {
  const u = rng();
  const fc = (mode - lo) / (hi - lo);
  if (u < fc) {
    return lo + Math.sqrt(u * (hi - lo) * (mode - lo));
  }
  return hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode));
}

// ─── Ornstein-Uhlenbeck Process (Mean-Reverting) ───────────────────────

export interface OUParams {
  mean: number;       // Long-run mean
  theta: number;      // Mean-reversion speed (higher = faster revert)
  sigma: number;      // Volatility
}

/**
 * Step an Ornstein-Uhlenbeck process forward one period.
 *   dx = theta * (mean - x) * dt + sigma * sqrt(dt) * dW
 *   dt is in years (e.g., 7/365 for weekly, 30/365 for monthly).
 */
export function ouStep(
  rng: () => number,
  current: number,
  params: OUParams,
  dt: number,
): number {
  const drift = params.theta * (params.mean - current) * dt;
  const diffusion = params.sigma * Math.sqrt(dt) * normalSample(rng);
  return current + drift + diffusion;
}

// ─── Committed Amount Distribution ─────────────────────────────────────

/** LogNormal parameters by SizeProfile (mu, sigma in log-dollars). */
const COMMITMENT_PARAMS: Record<SizeProfile, { mu: number; sigma: number; lo: number; hi: number }> = {
  LARGE: { mu: Math.log(1_200_000_000), sigma: 0.60, lo: 500_000_000, hi: 5_000_000_000 },
  MID:   { mu: Math.log(250_000_000),   sigma: 0.50, lo: 100_000_000, hi: 500_000_000 },
  SMALL: { mu: Math.log(50_000_000),    sigma: 0.45, lo: 20_000_000,  hi: 100_000_000 },
};

/** Industry multipliers on commitment (e.g., Energy is capital-intensive). */
const INDUSTRY_COMMITMENT_MULT: Record<number, number> = {
  21: 1.30,  // Energy — capital-intensive
  23: 1.15,  // Construction
  31: 1.10,  // Manufacturing
  11: 0.85,  // Agriculture — lower scale
  54: 0.90,  // Professional services
  52: 1.20,  // Finance — larger facilities
};

/** Sample a realistic committed amount. */
export function sampleCommittedAmount(
  rng: () => number,
  size: SizeProfile,
  industryId: number,
): number {
  const p = COMMITMENT_PARAMS[size];
  const base = logNormalSample(rng, p.mu, p.sigma, p.lo, p.hi);
  const mult = INDUSTRY_COMMITMENT_MULT[industryId] ?? 1.0;
  // Round to nearest $100K for realism
  return Math.round((base * mult) / 100_000) * 100_000;
}

// ─── Utilization Distribution ──────────────────────────────────────────

/** Beta parameters for utilization by product type and credit quality. */
interface UtilizationParams {
  alpha: number;
  beta: number;
  floor: number;  // Minimum utilization (e.g., term loans always 1.0)
  cap: number;    // Maximum utilization
}

const UTILIZATION_PARAMS: Record<ProductType, UtilizationParams> = {
  REVOLVING_CREDIT:      { alpha: 3.0, beta: 4.0, floor: 0.05, cap: 0.98 },
  TERM_LOAN:             { alpha: 50,  beta: 1.0, floor: 0.95, cap: 1.00 }, // Always ~100%
  TERM_LOAN_B:           { alpha: 50,  beta: 1.0, floor: 0.95, cap: 1.00 },
  LETTER_OF_CREDIT:      { alpha: 1.5, beta: 8.0, floor: 0.00, cap: 1.00 }, // Mostly undrawn
  BRIDGE_LOAN:           { alpha: 8.0, beta: 2.0, floor: 0.50, cap: 1.00 }, // High utilization
  DELAYED_DRAW_TERM_LOAN:{ alpha: 2.0, beta: 5.0, floor: 0.00, cap: 1.00 }, // Often partially drawn
  SWINGLINE:             { alpha: 2.0, beta: 6.0, floor: 0.00, cap: 0.90 }, // Short-term draws
};

/** Sample utilization ratio for a facility. */
export function sampleUtilization(
  rng: () => number,
  productType: ProductType,
  storyMultiplier: number,  // From STORY_UTILIZATION curve
): number {
  const p = UTILIZATION_PARAMS[productType];
  // Term loans are always fully drawn (no beta sampling needed)
  if (p.alpha >= 50) return clamp(p.floor + rng() * (p.cap - p.floor), p.floor, p.cap);
  const base = betaSample(rng, p.alpha, p.beta);
  // Apply story arc multiplier (centered around 1.0)
  const adjusted = base * storyMultiplier;
  return clamp(adjusted, p.floor, p.cap);
}

// ─── LGD Distribution ─────────────────────────────────────────────────

/** LGD parameters by rating tier: mean and std within a bounded range. */
const LGD_PARAMS: Record<RatingTier, { mean: number; std: number; lo: number; hi: number }> = {
  IG_HIGH: { mean: 0.40, std: 0.05, lo: 0.25, hi: 0.55 },
  IG_MID:  { mean: 0.42, std: 0.05, lo: 0.28, hi: 0.58 },
  IG_LOW:  { mean: 0.45, std: 0.06, lo: 0.30, hi: 0.60 },
  HY_HIGH: { mean: 0.48, std: 0.06, lo: 0.32, hi: 0.65 },
  HY_MID:  { mean: 0.55, std: 0.07, lo: 0.38, hi: 0.72 },
  HY_LOW:  { mean: 0.60, std: 0.08, lo: 0.42, hi: 0.78 },
};

/** Sample LGD for a facility based on its rating tier. */
export function sampleLGD(rng: () => number, tier: RatingTier): number {
  const p = LGD_PARAMS[tier];
  return Math.round(boundedNormal(rng, p.mean, p.std, p.lo, p.hi) * 10000) / 10000;
}

// ─── Spread Distribution ───────────────────────────────────────────────

/** Base spread parameters by rating tier (in basis points). */
export const BASE_SPREAD_BPS: Record<RatingTier, { mean: number; std: number; lo: number; hi: number }> = {
  IG_HIGH: { mean: 85,  std: 15, lo: 50,  hi: 130 },
  IG_MID:  { mean: 125, std: 20, lo: 75,  hi: 200 },
  IG_LOW:  { mean: 175, std: 25, lo: 110, hi: 275 },
  HY_HIGH: { mean: 250, std: 35, lo: 170, hi: 380 },
  HY_MID:  { mean: 350, std: 45, lo: 240, hi: 500 },
  HY_LOW:  { mean: 500, std: 60, lo: 350, hi: 700 },
};

/** Spread O-U parameters by rating tier for time evolution. */
export const SPREAD_OU_PARAMS: Record<RatingTier, OUParams> = {
  IG_HIGH: { mean: 85,  theta: 2.0, sigma: 10 },
  IG_MID:  { mean: 125, theta: 2.0, sigma: 15 },
  IG_LOW:  { mean: 175, theta: 1.8, sigma: 20 },
  HY_HIGH: { mean: 250, theta: 1.5, sigma: 30 },
  HY_MID:  { mean: 350, theta: 1.5, sigma: 40 },
  HY_LOW:  { mean: 500, theta: 1.2, sigma: 55 },
};

/** Sample initial spread for a facility. */
export function sampleSpread(rng: () => number, tier: RatingTier): number {
  const p = BASE_SPREAD_BPS[tier];
  return Math.round(boundedNormal(rng, p.mean, p.std, p.lo, p.hi));
}

/** Evolve spread via O-U process for one time step. */
export function evolveSpread(
  rng: () => number,
  currentBps: number,
  tier: RatingTier,
  storyMultiplier: number,
  dt: number,
): number {
  const params = { ...SPREAD_OU_PARAMS[tier] };
  // Story arc shifts the long-run mean
  params.mean = params.mean * storyMultiplier;
  const evolved = ouStep(rng, currentBps, params, dt);
  // Spreads cannot be negative
  return Math.max(Math.round(evolved), 10);
}

// ─── Risk Weight Distribution ──────────────────────────────────────────

/** Base risk weights by rating tier (percentage). */
export const BASE_RISK_WEIGHT_PCT: Record<RatingTier, { mean: number; std: number; lo: number; hi: number }> = {
  IG_HIGH: { mean: 50,  std: 8,  lo: 20,  hi: 75  },
  IG_MID:  { mean: 75,  std: 10, lo: 45,  hi: 100 },
  IG_LOW:  { mean: 100, std: 12, lo: 65,  hi: 130 },
  HY_HIGH: { mean: 100, std: 12, lo: 65,  hi: 140 },
  HY_MID:  { mean: 125, std: 15, lo: 85,  hi: 160 },
  HY_LOW:  { mean: 150, std: 18, lo: 100, hi: 200 },
};

/** Sample risk weight for a facility. */
export function sampleRiskWeight(rng: () => number, tier: RatingTier): number {
  const p = BASE_RISK_WEIGHT_PCT[tier];
  return Math.round(boundedNormal(rng, p.mean, p.std, p.lo, p.hi) * 100) / 100;
}

// ─── CCF (Credit Conversion Factor) ───────────────────────────────────

/** CCF by product type — deterministic, per Basel rules. */
export const CCF_BY_PRODUCT: Record<ProductType, number> = {
  REVOLVING_CREDIT:       0.40,
  TERM_LOAN:              1.00,
  TERM_LOAN_B:            1.00,
  LETTER_OF_CREDIT:       0.20,  // Performance LC; standby = 1.00
  BRIDGE_LOAN:            1.00,
  DELAYED_DRAW_TERM_LOAN: 0.75,
  SWINGLINE:              0.40,
};

// ─── Fee Rate Distribution ─────────────────────────────────────────────

/** Sample commitment/facility fee rate. */
export function sampleFeeRate(rng: () => number, productType: ProductType, tier: RatingTier): number {
  // Higher tier = lower fee; revolvers pay undrawn fees, term loans pay upfront
  const tierIdx = ['IG_HIGH', 'IG_MID', 'IG_LOW', 'HY_HIGH', 'HY_MID', 'HY_LOW'].indexOf(tier);
  const baseBps = 15 + tierIdx * 8; // 15-55 bps
  const productAdj = productType === 'REVOLVING_CREDIT' ? 1.0
    : productType === 'LETTER_OF_CREDIT' ? 1.5
    : productType === 'BRIDGE_LOAN' ? 2.0
    : 0.5; // Term loans: lower ongoing fees
  const feeBps = baseBps * productAdj + rng() * 10;
  return Math.round(feeBps) / 10000; // Convert bps to decimal
}

// ─── Collateral Value Distribution ─────────────────────────────────────

export interface CollateralParams {
  /** Base LTV ratio (value / exposure). */
  baseLTV: number;
  /** Annual volatility of collateral value. */
  annualVol: number;
  /** Annual drift (appreciation/depreciation). */
  annualDrift: number;
}

/** Collateral parameters by type. */
export const COLLATERAL_PARAMS: Record<string, CollateralParams> = {
  RE:          { baseLTV: 0.70, annualVol: 0.15, annualDrift: 0.02 },
  RECEIVABLES: { baseLTV: 0.80, annualVol: 0.05, annualDrift: 0.00 },
  FLEET:       { baseLTV: 0.65, annualVol: 0.12, annualDrift: -0.10 },
  EQUIPMENT:   { baseLTV: 0.60, annualVol: 0.20, annualDrift: -0.08 },
  CASH:        { baseLTV: 1.00, annualVol: 0.00, annualDrift: 0.00 },
  NONE:        { baseLTV: 0.00, annualVol: 0.00, annualDrift: 0.00 },
};

/** Sample initial collateral value as multiple of exposure. */
export function sampleCollateralValue(
  rng: () => number,
  exposure: number,
  collateralType: string,
): number {
  const p = COLLATERAL_PARAMS[collateralType] ?? COLLATERAL_PARAMS['NONE'];
  if (p.baseLTV === 0) return 0;
  // Collateral value = exposure / LTV with some noise
  const ltv = boundedNormal(rng, p.baseLTV, 0.08, 0.30, 1.00);
  const value = exposure / ltv;
  return Math.round(value / 1000) * 1000; // Round to nearest $1K
}

/** Evolve collateral value over one time period. */
export function evolveCollateralValue(
  rng: () => number,
  currentValue: number,
  collateralType: string,
  dt: number,
): number {
  const p = COLLATERAL_PARAMS[collateralType] ?? COLLATERAL_PARAMS['NONE'];
  if (p.annualVol === 0) return currentValue;
  // Geometric Brownian Motion: dV/V = mu*dt + sigma*sqrt(dt)*dW
  const drift = p.annualDrift * dt;
  const diffusion = p.annualVol * Math.sqrt(dt) * normalSample(rng);
  return Math.round(currentValue * Math.exp(drift + diffusion) / 1000) * 1000;
}

// ─── Financial Ratio Distributions ─────────────────────────────────────

export interface FinancialRatioParams {
  revenueToCommitted: { lo: number; hi: number };  // Revenue as % of committed
  opExRatio: { mean: number; std: number };         // OpEx / Revenue
  interestCoverMult: number;                        // ICR baseline multiplier
}

/** Financial ratio parameters by rating tier. */
export const FINANCIAL_PARAMS: Record<RatingTier, FinancialRatioParams> = {
  IG_HIGH: { revenueToCommitted: { lo: 0.15, hi: 0.30 }, opExRatio: { mean: 0.55, std: 0.05 }, interestCoverMult: 6.0 },
  IG_MID:  { revenueToCommitted: { lo: 0.13, hi: 0.25 }, opExRatio: { mean: 0.58, std: 0.06 }, interestCoverMult: 4.5 },
  IG_LOW:  { revenueToCommitted: { lo: 0.12, hi: 0.22 }, opExRatio: { mean: 0.60, std: 0.06 }, interestCoverMult: 3.0 },
  HY_HIGH: { revenueToCommitted: { lo: 0.10, hi: 0.20 }, opExRatio: { mean: 0.62, std: 0.07 }, interestCoverMult: 2.2 },
  HY_MID:  { revenueToCommitted: { lo: 0.08, hi: 0.18 }, opExRatio: { mean: 0.65, std: 0.07 }, interestCoverMult: 1.5 },
  HY_LOW:  { revenueToCommitted: { lo: 0.06, hi: 0.15 }, opExRatio: { mean: 0.68, std: 0.08 }, interestCoverMult: 1.0 },
};

// ─── Tenor Distribution ────────────────────────────────────────────────

/** Tenor parameters by product type (in years). */
const TENOR_PARAMS: Record<ProductType, { lo: number; mode: number; hi: number }> = {
  REVOLVING_CREDIT:       { lo: 3, mode: 5, hi: 7 },
  TERM_LOAN:              { lo: 3, mode: 5, hi: 7 },
  TERM_LOAN_B:            { lo: 5, mode: 7, hi: 10 },
  LETTER_OF_CREDIT:       { lo: 1, mode: 2, hi: 3 },
  BRIDGE_LOAN:            { lo: 0.5, mode: 0.75, hi: 1.5 },
  DELAYED_DRAW_TERM_LOAN: { lo: 3, mode: 5, hi: 7 },
  SWINGLINE:              { lo: 1, mode: 2, hi: 3 },
};

/** Sample a tenor in years for a facility. */
export function sampleTenorYears(rng: () => number, productType: ProductType): number {
  const p = TENOR_PARAMS[productType];
  const raw = triangularSample(rng, p.lo, p.mode, p.hi);
  // Round to nearest quarter
  return Math.round(raw * 4) / 4;
}

// ─── Industry Seasonality ──────────────────────────────────────────────

/**
 * Seasonal utilization multiplier by industry and month (1-12).
 * Returns a multiplier ∈ [0.85, 1.30] representing seasonal draw patterns.
 */
export function seasonalMultiplier(industryId: number, month: number): number {
  switch (industryId) {
    case 44: case 45: // Retail
      // Q4 holiday season spike
      if (month >= 10 && month <= 12) return 1.20 + (month - 10) * 0.05; // 1.20, 1.25, 1.30
      if (month >= 1 && month <= 2) return 0.85; // Post-holiday low
      return 1.00;
    case 21: // Energy
      // Winter demand peak
      if (month >= 11 || month <= 2) return 1.15;
      if (month >= 6 && month <= 8) return 0.90; // Summer low
      return 1.00;
    case 11: // Agriculture
      // Spring planting season
      if (month >= 3 && month <= 5) return 1.25;
      if (month >= 9 && month <= 10) return 1.10; // Harvest financing
      return 0.90;
    case 23: // Construction
      // Summer peak
      if (month >= 5 && month <= 9) return 1.10;
      if (month >= 12 || month <= 2) return 0.85; // Winter slowdown
      return 1.00;
    case 72: // Hospitality
      if (month >= 5 && month <= 8) return 1.15; // Summer travel
      if (month === 12) return 1.10; // Holiday travel
      return 0.95;
    default:
      return 1.00; // No seasonal pattern
  }
}
