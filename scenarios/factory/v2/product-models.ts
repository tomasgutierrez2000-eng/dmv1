/**
 * Product behavioral models — each facility type has distinct draw/amortize/fee behavior.
 *
 * This module replaces the one-size-fits-all approach where revolvers,
 * term loans, and LCs all behave identically. Each ProductType now has:
 *   - Draw behavior (how utilization changes over time)
 *   - Amortization schedule (if applicable)
 *   - CCF (credit conversion factor)
 *   - Fee structure (commitment fees, utilization-based pricing)
 *   - Maturity behavior (bullet vs. amortizing)
 *   - Seasonal overlays by industry
 */

import type { StoryArc, RatingTier } from '../../../scripts/shared/mvp-config';
import type {
  ProductType, FacilityState, AmortizationEntry, LifecycleStage,
} from './types';
import type { DrawBehaviorInput } from './stage-types';
import { clamp, range, round } from './prng';
import { sampleUtilization, seasonalMultiplier, CCF_BY_PRODUCT } from './distributions';
import { interpolateArcValue, getMonth } from './time-series';

// ─── Product Configuration ─────────────────────────────────────────────

export interface ProductConfig {
  /** Whether the product type revolves (draw/repay repeatedly). */
  isRevolving: boolean;
  /** Whether principal amortizes over time. */
  amortizes: boolean;
  /** Default CCF for undrawn commitments. */
  ccf: number;
  /** Spread adder over base (in bps) — product-specific premium. */
  spreadAdderBps: number;
  /** Whether facility pays commitment fee on undrawn portion. */
  hasUndrawnFee: boolean;
  /** Whether full draw happens at origination. */
  bulletDraw: boolean;
  /** Quarterly amortization rate (fraction of original principal). */
  amortizationRate: number;
  /** Refinancing probability at maturity (IG / HY). */
  refinanceProbIG: number;
  refinanceProbHY: number;
}

/** Product configurations by type. */
export const PRODUCT_CONFIGS: Record<ProductType, ProductConfig> = {
  REVOLVING_CREDIT: {
    isRevolving: true,
    amortizes: false,
    ccf: 0.40,
    spreadAdderBps: 0,
    hasUndrawnFee: true,
    bulletDraw: false,
    amortizationRate: 0,
    refinanceProbIG: 0.90,
    refinanceProbHY: 0.60,
  },
  TERM_LOAN: {
    isRevolving: false,
    amortizes: true,
    ccf: 1.00,
    spreadAdderBps: 0,
    hasUndrawnFee: false,
    bulletDraw: true,
    amortizationRate: 0.025, // 2.5% of original per quarter
    refinanceProbIG: 0.85,
    refinanceProbHY: 0.50,
  },
  TERM_LOAN_B: {
    isRevolving: false,
    amortizes: false, // Bullet maturity (1% annual amort max)
    ccf: 1.00,
    spreadAdderBps: 75,
    hasUndrawnFee: false,
    bulletDraw: true,
    amortizationRate: 0.0025, // 1% annual = 0.25% quarterly
    refinanceProbIG: 0.80,
    refinanceProbHY: 0.45,
  },
  LETTER_OF_CREDIT: {
    isRevolving: false,
    amortizes: false,
    ccf: 0.20, // Performance LC default; standby would be 1.00
    spreadAdderBps: 30,
    hasUndrawnFee: true,
    bulletDraw: false,
    amortizationRate: 0,
    refinanceProbIG: 0.85,
    refinanceProbHY: 0.55,
  },
  BRIDGE_LOAN: {
    isRevolving: false,
    amortizes: false,
    ccf: 1.00,
    spreadAdderBps: 200,
    hasUndrawnFee: false,
    bulletDraw: true,
    amortizationRate: 0,
    refinanceProbIG: 0.80,
    refinanceProbHY: 0.40,
  },
  DELAYED_DRAW_TERM_LOAN: {
    isRevolving: false,
    amortizes: true,
    ccf: 0.75,
    spreadAdderBps: 25,
    hasUndrawnFee: true,
    bulletDraw: false,
    amortizationRate: 0.020, // 2% per quarter
    refinanceProbIG: 0.85,
    refinanceProbHY: 0.50,
  },
  SWINGLINE: {
    isRevolving: true,
    amortizes: false,
    ccf: 0.40,
    spreadAdderBps: -15, // Cheaper than revolver (short-term)
    hasUndrawnFee: true,
    bulletDraw: false,
    amortizationRate: 0,
    refinanceProbIG: 0.90,
    refinanceProbHY: 0.65,
  },
};

// ─── Utilization Pricing Grid ──────────────────────────────────────────

/**
 * Utilization-based spread adjustment for revolvers.
 * GSIBs charge more when utilization is high (credit risk + liquidity drag).
 */
export function utilizationSpreadAdder(utilization: number): number {
  if (utilization < 0.50) return 0;
  if (utilization < 0.75) return 15;  // +15 bps
  if (utilization < 0.90) return 35;  // +35 bps
  return 60;                           // +60 bps for >90% utilization
}

// ─── Draw Behavior ─────────────────────────────────────────────────────

/**
 * Apply product-specific draw behavior for one time step.
 *
 * Returns the new drawn amount and undrawn amount after the period.
 * Does NOT mutate the state object.
 */
export function applyDrawBehavior(
  rng: () => number,
  state: DrawBehaviorInput,
  date: string,
  dates: string[],
  storyUtilCurve: readonly number[],
): { drawn_amount: number; undrawn_amount: number; prior_drawn_amount: number } {
  const config = PRODUCT_CONFIGS[state.product_type];
  const prior = state.drawn_amount;

  // Term loans and bridge loans: full draw, then amortize
  if (config.bulletDraw && state.lifecycle_stage !== 'COMMITMENT') {
    const amortized = applyAmortization(state, config);
    return {
      drawn_amount: amortized,
      undrawn_amount: state.committed_amount - amortized,
      prior_drawn_amount: prior,
    };
  }

  // Commitment stage: not yet drawn (or partial for DDTL)
  if (state.lifecycle_stage === 'COMMITMENT') {
    if (state.product_type === 'DELAYED_DRAW_TERM_LOAN') {
      // DDTLs draw gradually during commitment period
      const drawPct = clamp(rng() * 0.25, 0, 0.25);
      const drawn = round(state.committed_amount * drawPct, 2);
      return {
        drawn_amount: drawn,
        undrawn_amount: state.committed_amount - drawn,
        prior_drawn_amount: prior,
      };
    }
    return {
      drawn_amount: 0,
      undrawn_amount: state.committed_amount,
      prior_drawn_amount: prior,
    };
  }

  // Letter of credit: binary behavior (mostly undrawn, occasional full draw)
  if (state.product_type === 'LETTER_OF_CREDIT') {
    const drawChance = 0.05; // 5% per period
    const isDrawn = rng() < drawChance;
    const drawn = isDrawn ? state.committed_amount : 0;
    return {
      drawn_amount: drawn,
      undrawn_amount: state.committed_amount - drawn,
      prior_drawn_amount: prior,
    };
  }

  // Revolving credit / Swingline: fluctuating utilization
  if (config.isRevolving) {
    // Get story arc utilization target
    const storyMult = interpolateArcValue(date, dates, storyUtilCurve);
    // Apply seasonal overlay
    const month = getMonth(date);
    const seasonal = seasonalMultiplier(state.industry_id, month);
    // Sample utilization around story-driven target with seasonal adjustment
    const targetUtil = sampleUtilization(rng, state.product_type, storyMult * seasonal);
    // Add daily fluctuation (±5% random walk)
    const dailyNoise = (rng() - 0.5) * 0.05;
    const finalUtil = clamp(targetUtil + dailyNoise, 0.02, 0.98);
    const drawn = round(state.committed_amount * finalUtil, 2);
    return {
      drawn_amount: drawn,
      undrawn_amount: state.committed_amount - drawn,
      prior_drawn_amount: prior,
    };
  }

  // Fallback: use story arc utilization directly
  const storyMult = interpolateArcValue(date, dates, storyUtilCurve);
  const drawn = round(state.committed_amount * clamp(storyMult, 0, 1), 2);
  return {
    drawn_amount: drawn,
    undrawn_amount: state.committed_amount - drawn,
    prior_drawn_amount: prior,
  };
}

// ─── Amortization ──────────────────────────────────────────────────────

/**
 * Apply amortization to a term loan.
 * Returns the new drawn amount after amortization.
 */
function applyAmortization(state: Pick<FacilityState, 'drawn_amount' | 'original_committed'>, config: ProductConfig): number {
  if (!config.amortizes && config.amortizationRate === 0) {
    return state.drawn_amount;
  }
  // Quarterly amortization: reduce by amortizationRate * original committed
  const payment = state.original_committed * config.amortizationRate;
  const newBalance = Math.max(0, state.drawn_amount - payment);
  return round(newBalance, 2);
}

/**
 * Generate a full amortization schedule for a term loan.
 */
export function generateAmortizationSchedule(
  originalCommitted: number,
  allInRate: number,
  startDate: string,
  maturityDate: string,
  quarterlyRate: number,
): AmortizationEntry[] {
  const schedule: AmortizationEntry[] = [];
  let balance = originalCommitted;
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(maturityDate + 'T00:00:00Z');

  // Generate quarterly payment dates
  const current = new Date(start);
  current.setUTCMonth(current.getUTCMonth() + 3);

  while (current <= end && balance > 0) {
    const principalPayment = round(originalCommitted * quarterlyRate, 2);
    const interestPayment = round(balance * allInRate / 4, 2); // Quarterly interest
    balance = Math.max(0, balance - principalPayment);

    schedule.push({
      payment_date: current.toISOString().slice(0, 10),
      principal_amount: principalPayment,
      interest_amount: interestPayment,
      remaining_balance: round(balance, 2),
    });

    current.setUTCMonth(current.getUTCMonth() + 3);
  }

  // Balloon/bullet payment at maturity
  if (balance > 0) {
    const interestPayment = round(balance * allInRate / 4, 2);
    schedule.push({
      payment_date: maturityDate,
      principal_amount: round(balance, 2),
      interest_amount: interestPayment,
      remaining_balance: 0,
    });
  }

  return schedule;
}

// ─── Pricing ───────────────────────────────────────────────────────────

/**
 * Calculate all-in rate for a facility.
 */
export function calculateAllInRate(
  baseRatePct: number,
  spreadBps: number,
  productType: ProductType,
  utilization: number,
): number {
  const config = PRODUCT_CONFIGS[productType];
  const productAdder = config.spreadAdderBps;
  const utilAdder = config.isRevolving ? utilizationSpreadAdder(utilization) : 0;
  const totalSpreadBps = spreadBps + productAdder + utilAdder;
  return round(baseRatePct + totalSpreadBps / 10000, 6);
}

/**
 * Calculate fee rate for a facility.
 */
export function calculateFeeRate(
  productType: ProductType,
  tier: RatingTier,
): number {
  const config = PRODUCT_CONFIGS[productType];
  if (!config.hasUndrawnFee) return 0;
  // Fee scales with credit risk tier
  const tierIdx = ['IG_HIGH', 'IG_MID', 'IG_LOW', 'HY_HIGH', 'HY_MID', 'HY_LOW'].indexOf(tier);
  const baseBps = 15 + tierIdx * 8; // 15-55 bps
  return round(baseBps / 10000, 6);
}

// ─── EAD and RWA Calculations ──────────────────────────────────────────

/**
 * Calculate EAD (Exposure at Default).
 * EAD = drawn + CCF * undrawn
 */
export function calculateEAD(
  drawnAmount: number,
  undrawnAmount: number,
  productType: ProductType,
): number {
  const ccf = CCF_BY_PRODUCT[productType];
  return round(drawnAmount + ccf * undrawnAmount, 2);
}

/**
 * Calculate RWA (Risk-Weighted Assets).
 * RWA = EAD * risk_weight_pct / 100
 */
export function calculateRWA(ead: number, riskWeightPct: number): number {
  return round(ead * riskWeightPct / 100, 2);
}

/**
 * Calculate Expected Loss.
 * EL = PD * LGD * EAD
 */
export function calculateExpectedLoss(pd: number, lgd: number, ead: number): number {
  return round(pd * lgd * ead, 2);
}

// ─── IFRS 9 ECL ────────────────────────────────────────────────────────

/**
 * Calculate ECL (Expected Credit Loss) for IFRS 9 staging.
 *
 * Stage 1: 12-month ECL = PD_12m * LGD * EAD
 * Stage 2: Lifetime ECL = PD_lifetime * LGD * EAD (approx PD * remaining_tenor)
 * Stage 3: Best estimate of loss = LGD * EAD (PD ≈ 1)
 */
export function calculateECL(
  pd: number,
  lgd: number,
  ead: number,
  ifrs9Stage: 1 | 2 | 3,
  remainingTenorMonths: number,
): { ecl_12m: number; ecl_lifetime: number } {
  // 12-month ECL (always calculated for disclosure)
  const ecl12m = round(pd * lgd * ead, 2);

  // Lifetime ECL
  let eclLifetime: number;
  switch (ifrs9Stage) {
    case 1:
      eclLifetime = ecl12m; // Stage 1: provision = 12-month ECL
      break;
    case 2: {
      // Stage 2: lifetime ECL ≈ cumulative PD over remaining tenor
      const years = Math.max(remainingTenorMonths / 12, 1);
      // Simplified: cumulative PD ≈ 1 - (1-PD)^years
      const cumulativePD = 1 - Math.pow(1 - pd, years);
      eclLifetime = round(cumulativePD * lgd * ead, 2);
      break;
    }
    case 3:
      // Stage 3: PD ≈ 1, provision = LGD * EAD
      eclLifetime = round(lgd * ead, 2);
      break;
  }

  return { ecl_12m: ecl12m, ecl_lifetime: eclLifetime };
}

// ─── Facility Type Pools (for chain-builder enrichment) ────────────────

export interface FacilityPoolEntry {
  facilityType: ProductType;
  fraction: number;
}

/** Tranching pool configurations for credit agreements. */
export const FACILITY_POOLS: Record<string, FacilityPoolEntry[]> = {
  single: [
    { facilityType: 'REVOLVING_CREDIT', fraction: 1.0 },
  ],
  dual: [
    { facilityType: 'REVOLVING_CREDIT', fraction: 0.40 },
    { facilityType: 'TERM_LOAN', fraction: 0.60 },
  ],
  triple: [
    { facilityType: 'REVOLVING_CREDIT', fraction: 0.30 },
    { facilityType: 'TERM_LOAN', fraction: 0.45 },
    { facilityType: 'LETTER_OF_CREDIT', fraction: 0.25 },
  ],
  quad: [
    { facilityType: 'REVOLVING_CREDIT', fraction: 0.25 },
    { facilityType: 'TERM_LOAN', fraction: 0.35 },
    { facilityType: 'TERM_LOAN_B', fraction: 0.25 },
    { facilityType: 'LETTER_OF_CREDIT', fraction: 0.15 },
  ],
};

/** Select pool based on size profile and rating. */
export function selectFacilityPool(
  rng: () => number,
  sizeProfile: string,
  tier: RatingTier,
): FacilityPoolEntry[] {
  // Larger / lower-rated borrowers tend to have more complex structures
  const r = rng();
  const isHY = tier.startsWith('HY');
  const isLarge = sizeProfile === 'LARGE';

  if (isLarge && isHY) {
    // Large HY: complex structures
    return r < 0.30 ? FACILITY_POOLS.quad
      : r < 0.65 ? FACILITY_POOLS.triple
      : FACILITY_POOLS.dual;
  }
  if (isLarge) {
    return r < 0.20 ? FACILITY_POOLS.quad
      : r < 0.55 ? FACILITY_POOLS.triple
      : r < 0.85 ? FACILITY_POOLS.dual
      : FACILITY_POOLS.single;
  }
  if (isHY) {
    return r < 0.40 ? FACILITY_POOLS.dual
      : r < 0.70 ? FACILITY_POOLS.triple
      : FACILITY_POOLS.single;
  }
  // Small/Mid IG
  return r < 0.50 ? FACILITY_POOLS.single
    : r < 0.85 ? FACILITY_POOLS.dual
    : FACILITY_POOLS.triple;
}

// ─── Refinancing Model ─────────────────────────────────────────────────

/**
 * Determine if a maturing facility gets refinanced.
 */
export function willRefinance(
  rng: () => number,
  productType: ProductType,
  tier: RatingTier,
): boolean {
  const config = PRODUCT_CONFIGS[productType];
  const isIG = tier.startsWith('IG');
  const prob = isIG ? config.refinanceProbIG : config.refinanceProbHY;
  return rng() < prob;
}
