/**
 * Market environment module — rate curves, FX, sector conditions.
 *
 * Replaces the hardcoded baseRate = 0.0530 with a rich, time-varying
 * market environment that drives pricing, cost of funds, and sector
 * stress across all facilities.
 *
 * Rate presets reflect actual Fed Funds trajectory and corresponding
 * benchmark rates (SOFR, Prime, EURIBOR, SONIA, TIBOR).
 */

import type { RatingTier } from '../../../scripts/shared/mvp-config';
import type {
  RateEnvironment, RateSnapshot, SectorCondition, MarketSnapshot,
} from './types';
import { normalSample } from './distributions';

// ─── Rate Environment Presets ──────────────────────────────────────────

/**
 * Anchor rate snapshots by date for each preset.
 * Between anchors, rates are linearly interpolated.
 */
interface RateAnchor {
  date: string;
  rates: RateSnapshot;
}

const RATE_PRESETS: Record<Exclude<RateEnvironment, 'CUSTOM'>, RateAnchor[]> = {
  CURRENT_2024: [
    {
      date: '2024-01-01',
      rates: {
        fed_funds: 5.33, sofr_1m: 5.31, sofr_3m: 5.33, sofr_6m: 5.28,
        prime: 8.50, euribor_3m: 3.90, sonia: 5.20, tibor_3m: 0.07,
      },
    },
    {
      date: '2025-01-31',
      rates: {
        fed_funds: 5.33, sofr_1m: 5.31, sofr_3m: 5.33, sofr_6m: 5.28,
        prime: 8.50, euribor_3m: 3.90, sonia: 5.20, tibor_3m: 0.07,
      },
    },
  ],

  CUTTING_CYCLE: [
    {
      date: '2024-07-01',
      rates: {
        fed_funds: 5.33, sofr_1m: 5.31, sofr_3m: 5.33, sofr_6m: 5.28,
        prime: 8.50, euribor_3m: 3.90, sonia: 5.20, tibor_3m: 0.07,
      },
    },
    {
      date: '2024-09-18', // First cut
      rates: {
        fed_funds: 5.08, sofr_1m: 5.06, sofr_3m: 5.05, sofr_6m: 4.95,
        prime: 8.25, euribor_3m: 3.65, sonia: 5.00, tibor_3m: 0.07,
      },
    },
    {
      date: '2024-11-07',
      rates: {
        fed_funds: 4.83, sofr_1m: 4.81, sofr_3m: 4.78, sofr_6m: 4.65,
        prime: 8.00, euribor_3m: 3.40, sonia: 4.75, tibor_3m: 0.07,
      },
    },
    {
      date: '2024-12-18',
      rates: {
        fed_funds: 4.58, sofr_1m: 4.56, sofr_3m: 4.50, sofr_6m: 4.35,
        prime: 7.75, euribor_3m: 3.15, sonia: 4.50, tibor_3m: 0.06,
      },
    },
    {
      date: '2025-03-19',
      rates: {
        fed_funds: 4.33, sofr_1m: 4.31, sofr_3m: 4.25, sofr_6m: 4.10,
        prime: 7.50, euribor_3m: 2.90, sonia: 4.25, tibor_3m: 0.06,
      },
    },
    {
      date: '2025-06-18',
      rates: {
        fed_funds: 4.08, sofr_1m: 4.06, sofr_3m: 4.00, sofr_6m: 3.85,
        prime: 7.25, euribor_3m: 2.65, sonia: 4.00, tibor_3m: 0.05,
      },
    },
  ],

  RISING_RATES: [
    {
      date: '2022-01-01',
      rates: {
        fed_funds: 0.08, sofr_1m: 0.05, sofr_3m: 0.10, sofr_6m: 0.30,
        prime: 3.25, euribor_3m: -0.57, sonia: 0.25, tibor_3m: -0.02,
      },
    },
    {
      date: '2022-06-15',
      rates: {
        fed_funds: 1.58, sofr_1m: 1.55, sofr_3m: 1.60, sofr_6m: 1.80,
        prime: 4.75, euribor_3m: -0.24, sonia: 1.25, tibor_3m: -0.01,
      },
    },
    {
      date: '2022-12-14',
      rates: {
        fed_funds: 4.33, sofr_1m: 4.30, sofr_3m: 4.35, sofr_6m: 4.50,
        prime: 7.50, euribor_3m: 2.13, sonia: 3.50, tibor_3m: 0.00,
      },
    },
    {
      date: '2023-07-26',
      rates: {
        fed_funds: 5.33, sofr_1m: 5.31, sofr_3m: 5.33, sofr_6m: 5.28,
        prime: 8.50, euribor_3m: 3.78, sonia: 5.25, tibor_3m: 0.05,
      },
    },
  ],

  RATE_PLATEAU: [
    {
      date: '2024-01-01',
      rates: {
        fed_funds: 5.33, sofr_1m: 5.31, sofr_3m: 5.33, sofr_6m: 5.28,
        prime: 8.50, euribor_3m: 3.90, sonia: 5.20, tibor_3m: 0.07,
      },
    },
    {
      date: '2026-01-01',
      rates: {
        fed_funds: 5.33, sofr_1m: 5.31, sofr_3m: 5.33, sofr_6m: 5.28,
        prime: 8.50, euribor_3m: 3.90, sonia: 5.20, tibor_3m: 0.07,
      },
    },
  ],

  ZERO_LOWER_BOUND: [
    {
      date: '2020-01-01',
      rates: {
        fed_funds: 1.55, sofr_1m: 1.52, sofr_3m: 1.54, sofr_6m: 1.50,
        prime: 4.75, euribor_3m: -0.38, sonia: 0.75, tibor_3m: -0.05,
      },
    },
    {
      date: '2020-04-01',
      rates: {
        fed_funds: 0.05, sofr_1m: 0.03, sofr_3m: 0.06, sofr_6m: 0.10,
        prime: 3.25, euribor_3m: -0.42, sonia: 0.10, tibor_3m: -0.07,
      },
    },
    {
      date: '2022-01-01',
      rates: {
        fed_funds: 0.08, sofr_1m: 0.05, sofr_3m: 0.10, sofr_6m: 0.30,
        prime: 3.25, euribor_3m: -0.57, sonia: 0.25, tibor_3m: -0.05,
      },
    },
  ],
};

// ─── FX Rates ──────────────────────────────────────────────────────────

/** Base FX rates vs USD (stable — not time-varying for MVP). */
const BASE_FX_RATES: Record<string, number> = {
  USD: 1.0000,
  EUR: 1.0850,  // 1 EUR = 1.085 USD
  GBP: 1.2700,
  JPY: 0.00667, // 1 JPY ≈ 0.00667 USD (≈150 JPY/USD)
  CHF: 1.1250,
  CAD: 0.7450,
  AUD: 0.6550,
  SGD: 0.7450,
  HKD: 0.1280,
  CNY: 0.1380,
  BRL: 0.2000,
  MXN: 0.0580,
  INR: 0.0120,
  KRW: 0.000750,
  SEK: 0.0960,
  NOK: 0.0940,
  DKK: 0.1455,
};

// ─── Credit Spreads by Rating ──────────────────────────────────────────

/** Base credit spreads in bps over benchmark, by rating tier. */
const BASE_CREDIT_SPREADS: Record<RatingTier, number> = {
  IG_HIGH: 60,
  IG_MID: 100,
  IG_LOW: 160,
  HY_HIGH: 280,
  HY_MID: 425,
  HY_LOW: 650,
};

// ─── Sector Conditions ─────────────────────────────────────────────────

/** Default sector conditions (NORMAL for all industries). */
function defaultSectorCondition(industryId: number): SectorCondition {
  return {
    industry_id: industryId,
    stress_level: 'NORMAL',
    pd_multiplier: 1.0,
    collateral_haircut_pct: 0,
    spread_adder_bps: 0,
  };
}

/** Sector stress profiles — what happens at each stress level. */
const STRESS_PROFILES: Record<'NORMAL' | 'ELEVATED' | 'STRESSED' | 'CRISIS', {
  pd_multiplier: number;
  collateral_haircut_pct: number;
  spread_adder_bps: number;
}> = {
  NORMAL:   { pd_multiplier: 1.0, collateral_haircut_pct: 0,    spread_adder_bps: 0 },
  ELEVATED: { pd_multiplier: 1.3, collateral_haircut_pct: 5,    spread_adder_bps: 25 },
  STRESSED: { pd_multiplier: 2.0, collateral_haircut_pct: 15,   spread_adder_bps: 75 },
  CRISIS:   { pd_multiplier: 3.5, collateral_haircut_pct: 30,   spread_adder_bps: 200 },
};

// ─── Market Environment Class ──────────────────────────────────────────

export interface SectorShockConfig {
  industry_id: number;
  stress_level: 'NORMAL' | 'ELEVATED' | 'STRESSED' | 'CRISIS';
  effective_date: string;
}

export class MarketEnvironment {
  private anchors: RateAnchor[];
  private sectorShocks: SectorShockConfig[];
  private rateOverrides: Partial<RateSnapshot>;

  constructor(
    preset: RateEnvironment,
    sectorShocks: SectorShockConfig[] = [],
    rateOverrides: Partial<RateSnapshot> = {},
    customAnchors?: RateAnchor[],
  ) {
    if (preset === 'CUSTOM') {
      this.anchors = customAnchors ?? RATE_PRESETS.CURRENT_2024;
    } else {
      this.anchors = RATE_PRESETS[preset];
    }
    this.sectorShocks = sectorShocks;
    this.rateOverrides = rateOverrides;
  }

  /** Get interpolated rates for a specific date. */
  getRates(date: string): RateSnapshot {
    const rates = this.interpolateRates(date);
    // Apply overrides
    return { ...rates, ...this.rateOverrides };
  }

  /** Get the base rate for a specific currency on a date. */
  getBaseRate(date: string, currencyCode: string): number {
    const rates = this.getRates(date);
    switch (currencyCode) {
      case 'USD': return rates.sofr_3m / 100;
      case 'EUR': return rates.euribor_3m / 100;
      case 'GBP': return rates.sonia / 100;
      case 'JPY': return rates.tibor_3m / 100;
      default: return rates.sofr_3m / 100; // Default to SOFR
    }
  }

  /** Get cost of funds for a currency (base rate - funding spread). */
  getCostOfFunds(date: string, currencyCode: string): number {
    // Funding spread = 50bps below base rate for well-funded GSIBs
    return Math.max(0, this.getBaseRate(date, currencyCode) - 0.0050);
  }

  /** Get FX rate for converting amount to USD. */
  getFxRate(currencyCode: string): number {
    return BASE_FX_RATES[currencyCode] ?? 1.0;
  }

  /** Get all FX rates. */
  getAllFxRates(): Record<string, number> {
    return { ...BASE_FX_RATES };
  }

  /** Get credit spread for a rating tier on a date. */
  getCreditSpread(date: string, tier: RatingTier, rng: () => number): number {
    const base = BASE_CREDIT_SPREADS[tier];
    // Add small random noise (±5% of base spread)
    const noise = normalSample(rng) * base * 0.05;
    return Math.round(base + noise);
  }

  /** Get sector condition for an industry on a date. */
  getSectorCondition(industryId: number, date: string): SectorCondition {
    // Check if any shock applies to this industry on this date
    const activeShock = this.sectorShocks.find(
      s => s.industry_id === industryId && s.effective_date <= date,
    );

    if (!activeShock) return defaultSectorCondition(industryId);

    const profile = STRESS_PROFILES[activeShock.stress_level];
    return {
      industry_id: industryId,
      stress_level: activeShock.stress_level,
      ...profile,
    };
  }

  /** Build a complete market snapshot for a date. */
  getSnapshot(date: string, rng: () => number): MarketSnapshot {
    const rates = this.getRates(date);
    const fx = this.getAllFxRates();

    const creditSpreads = {} as Record<RatingTier, number>;
    const tiers: RatingTier[] = ['IG_HIGH', 'IG_MID', 'IG_LOW', 'HY_HIGH', 'HY_MID', 'HY_LOW'];
    for (const tier of tiers) {
      creditSpreads[tier] = this.getCreditSpread(date, tier, rng);
    }

    // Collect sector conditions for all unique industry IDs in shocks
    const sectorConditions = new Map<number, SectorCondition>();
    for (const shock of this.sectorShocks) {
      sectorConditions.set(shock.industry_id, this.getSectorCondition(shock.industry_id, date));
    }

    return { date, rates, fx, credit_spreads: creditSpreads, sector_conditions: sectorConditions };
  }

  // ── Private helpers ──

  private interpolateRates(date: string): RateSnapshot {
    if (this.anchors.length === 0) {
      return RATE_PRESETS.CURRENT_2024[0].rates;
    }

    // Before first anchor: use first anchor values
    if (date <= this.anchors[0].date) {
      return { ...this.anchors[0].rates };
    }

    // After last anchor: use last anchor values
    const last = this.anchors[this.anchors.length - 1];
    if (date >= last.date) {
      return { ...last.rates };
    }

    // Find bracketing anchors and interpolate
    for (let i = 0; i < this.anchors.length - 1; i++) {
      const a = this.anchors[i];
      const b = this.anchors[i + 1];
      if (date >= a.date && date <= b.date) {
        const t = this.dateFraction(a.date, b.date, date);
        return this.lerpRates(a.rates, b.rates, t);
      }
    }

    return { ...last.rates };
  }

  private dateFraction(startDate: string, endDate: string, date: string): number {
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    const d = new Date(date).getTime();
    if (e === s) return 0;
    return (d - s) / (e - s);
  }

  private lerpRates(a: RateSnapshot, b: RateSnapshot, t: number): RateSnapshot {
    const lerp = (x: number, y: number) => Math.round((x + (y - x) * t) * 10000) / 10000;
    return {
      fed_funds: lerp(a.fed_funds, b.fed_funds),
      sofr_1m: lerp(a.sofr_1m, b.sofr_1m),
      sofr_3m: lerp(a.sofr_3m, b.sofr_3m),
      sofr_6m: lerp(a.sofr_6m, b.sofr_6m),
      prime: lerp(a.prime, b.prime),
      euribor_3m: lerp(a.euribor_3m, b.euribor_3m),
      sonia: lerp(a.sonia, b.sonia),
      tibor_3m: lerp(a.tibor_3m, b.tibor_3m),
    };
  }
}

// ─── Reference Rate Lookup ─────────────────────────────────────────────

/** Map currency to its natural benchmark rate name. */
export const CURRENCY_BENCHMARK: Record<string, string> = {
  USD: 'SOFR',
  EUR: 'EURIBOR',
  GBP: 'SONIA',
  JPY: 'TIBOR',
  CHF: 'SARON',
  CAD: 'CORRA',
  AUD: 'AONIA',
  SGD: 'SORA',
  HKD: 'HIBOR',
};

/** Get the benchmark rate name for a currency. */
export function getBenchmarkName(currencyCode: string): string {
  return CURRENCY_BENCHMARK[currencyCode] ?? 'SOFR';
}
