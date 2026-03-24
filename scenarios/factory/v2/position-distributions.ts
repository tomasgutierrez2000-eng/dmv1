/**
 * Product-specific distribution parameters for GSIB-realistic non-credit positions.
 *
 * Each product category has notional/balance ranges, PD/LGD profiles, currency
 * weights, and maturity ranges calibrated to GSIB trading books and balance sheets.
 */

import type { NonCreditCategory } from './position-types';

export interface DistributionParams {
  /** Log-normal mu parameter for primary amount (notional/balance/face) */
  amount_mu: number;
  /** Log-normal sigma parameter */
  amount_sigma: number;
  /** Floor (minimum) */
  amount_min: number;
  /** Ceiling (maximum) */
  amount_max: number;
  /** PD range [min, max] */
  pd_range: [number, number];
  /** LGD range [min, max] */
  lgd_range: [number, number];
  /** Currency weights: code → probability */
  currency_weights: { code: string; weight: number }[];
  /** Maturity range in months [min, max]. null = perpetual */
  maturity_months: [number, number] | null;
  /** Legal entity distribution weights (IDs 1-10) */
  le_weights: number[];
}

export const NC_DISTRIBUTIONS: Record<NonCreditCategory, DistributionParams> = {
  DERIVATIVES: {
    amount_mu: 18.5,    // ~e^18.5 ≈ $108M notional median
    amount_sigma: 1.2,
    amount_min: 10_000_000,
    amount_max: 500_000_000,
    pd_range: [0.001, 0.08],
    lgd_range: [0.35, 0.60],
    currency_weights: [
      { code: 'USD', weight: 0.45 }, { code: 'EUR', weight: 0.25 },
      { code: 'GBP', weight: 0.12 }, { code: 'JPY', weight: 0.10 },
      { code: 'CHF', weight: 0.08 },
    ],
    maturity_months: [3, 120],  // 3 months to 10 years
    le_weights: [0.30, 0.20, 0.15, 0.10, 0.08, 0.05, 0.04, 0.03, 0.03, 0.02],
  },

  SFT: {
    amount_mu: 20.0,    // ~e^20 ≈ $485M cash leg median
    amount_sigma: 1.0,
    amount_min: 50_000_000,
    amount_max: 2_000_000_000,
    pd_range: [0.001, 0.02],   // Low PD — secured, high-quality counterparties
    lgd_range: [0.10, 0.25],
    currency_weights: [
      { code: 'USD', weight: 0.55 }, { code: 'EUR', weight: 0.25 },
      { code: 'GBP', weight: 0.15 }, { code: 'JPY', weight: 0.05 },
    ],
    maturity_months: [0, 12],   // Overnight to 1 year
    le_weights: [0.35, 0.25, 0.15, 0.10, 0.05, 0.04, 0.03, 0.01, 0.01, 0.01],
  },

  SECURITIES: {
    amount_mu: 17.7,    // ~e^17.7 ≈ $48M face value median
    amount_sigma: 1.3,
    amount_min: 5_000_000,
    amount_max: 200_000_000,
    pd_range: [0.0003, 0.04],  // Mostly IG securities
    lgd_range: [0.20, 0.45],
    currency_weights: [
      { code: 'USD', weight: 0.50 }, { code: 'EUR', weight: 0.20 },
      { code: 'GBP', weight: 0.15 }, { code: 'JPY', weight: 0.10 },
      { code: 'CAD', weight: 0.05 },
    ],
    maturity_months: [12, 360],  // 1 to 30 years
    le_weights: [0.25, 0.20, 0.15, 0.12, 0.08, 0.07, 0.05, 0.04, 0.02, 0.02],
  },

  DEPOSITS: {
    amount_mu: 17.0,    // ~e^17 ≈ $24M balance median
    amount_sigma: 2.0,  // High variance — retail $50K to institutional $500M
    amount_min: 50_000,
    amount_max: 500_000_000,
    pd_range: [0, 0],          // Deposits are liabilities, not credit risk
    lgd_range: [0, 0],
    currency_weights: [
      { code: 'USD', weight: 0.65 }, { code: 'EUR', weight: 0.15 },
      { code: 'GBP', weight: 0.10 }, { code: 'JPY', weight: 0.05 },
      { code: 'CAD', weight: 0.05 },
    ],
    maturity_months: null,      // Demand/savings: perpetual; time deposits set per-product
    le_weights: [0.40, 0.15, 0.10, 0.10, 0.08, 0.05, 0.04, 0.04, 0.02, 0.02],
  },

  BORROWINGS: {
    amount_mu: 20.7,    // ~e^20.7 ≈ $975M principal median
    amount_sigma: 1.0,
    amount_min: 100_000_000,
    amount_max: 5_000_000_000,
    pd_range: [0.001, 0.003],  // Bank/GSE counterparties
    lgd_range: [0.10, 0.25],
    currency_weights: [
      { code: 'USD', weight: 0.70 }, { code: 'EUR', weight: 0.15 },
      { code: 'GBP', weight: 0.15 },
    ],
    maturity_months: [0, 36],   // Overnight to 3 years
    le_weights: [0.35, 0.20, 0.15, 0.10, 0.08, 0.05, 0.03, 0.02, 0.01, 0.01],
  },

  DEBT: {
    amount_mu: 21.4,    // ~e^21.4 ≈ $2B face value median
    amount_sigma: 0.8,
    amount_min: 500_000_000,
    amount_max: 10_000_000_000,
    pd_range: [0.001, 0.005],  // Own debt — issuer risk
    lgd_range: [0.25, 0.60],
    currency_weights: [
      { code: 'USD', weight: 0.55 }, { code: 'EUR', weight: 0.25 },
      { code: 'GBP', weight: 0.20 },
    ],
    maturity_months: [36, 360],  // 3 to 30 years
    le_weights: [0.30, 0.20, 0.15, 0.10, 0.08, 0.07, 0.05, 0.03, 0.01, 0.01],
  },

  EQUITIES: {
    amount_mu: 17.7,    // ~e^17.7 ≈ $48M market value median
    amount_sigma: 1.5,
    amount_min: 10_000_000,
    amount_max: 500_000_000,
    pd_range: [0, 0],          // Not applicable for equity positions
    lgd_range: [1.0, 1.0],    // 100% loss potential
    currency_weights: [
      { code: 'USD', weight: 0.50 }, { code: 'EUR', weight: 0.20 },
      { code: 'GBP', weight: 0.15 }, { code: 'JPY', weight: 0.10 },
      { code: 'CHF', weight: 0.05 },
    ],
    maturity_months: null,      // Perpetual
    le_weights: [0.25, 0.20, 0.15, 0.10, 0.10, 0.05, 0.05, 0.05, 0.03, 0.02],
  },

  STOCK: {
    amount_mu: 17.0,    // ~e^17 ≈ $24M market value median
    amount_sigma: 1.5,
    amount_min: 5_000_000,
    amount_max: 200_000_000,
    pd_range: [0, 0],
    lgd_range: [1.0, 1.0],
    currency_weights: [
      { code: 'USD', weight: 0.55 }, { code: 'EUR', weight: 0.20 },
      { code: 'GBP', weight: 0.15 }, { code: 'JPY', weight: 0.10 },
    ],
    maturity_months: null,
    le_weights: [0.25, 0.20, 0.15, 0.10, 0.10, 0.05, 0.05, 0.05, 0.03, 0.02],
  },
};

/** SA-CCR add-on factors by derivative asset class (% of notional). */
export const SA_CCR_ADD_ON: Record<string, number> = {
  IRS: 0.005,           // 0.5% for interest rate
  CDS: 0.05,            // 5% for credit
  FX_FORWARD: 0.04,     // 4% for FX
  FX_OPTION: 0.04,
  EQUITY_SWAP: 0.08,    // 8% for equity
  COMMODITY_FUT: 0.18,  // 18% for commodity
  SWAPTION: 0.005,
  TRS: 0.05,
};

/** MTM volatility by derivative type (annual, as fraction of notional). */
export const DERIVATIVE_VOL: Record<string, number> = {
  IRS: 0.005,
  CDS: 0.02,
  FX_FORWARD: 0.02,
  FX_OPTION: 0.03,
  EQUITY_SWAP: 0.05,
  COMMODITY_FUT: 0.04,
  SWAPTION: 0.008,
  TRS: 0.03,
};

/** Haircut ranges by collateral quality level. */
export const SFT_HAIRCUTS: Record<string, [number, number]> = {
  LEVEL_1: [0.005, 0.02],    // 0.5-2% for govt bonds
  LEVEL_2A: [0.04, 0.10],    // 4-10% for corp bonds
  LEVEL_2B: [0.15, 0.25],    // 15-25% for equities
};

/** Rating-to-PD mapping for non-credit products. */
export const RATING_PD_MAP: Record<string, [number, number]> = {
  AAA:  [0.0001, 0.0005],
  'AA+': [0.0003, 0.001],
  AA:   [0.0005, 0.002],
  'A+': [0.001, 0.003],
  A:    [0.002, 0.005],
  'BBB+': [0.005, 0.01],
  BBB:  [0.01, 0.02],
  'BB+': [0.02, 0.04],
  BB:   [0.04, 0.08],
  B:    [0.08, 0.15],
};

export const RATING_TIERS: string[] = ['AAA', 'AA+', 'AA', 'A+', 'A', 'BBB+', 'BBB', 'BB+', 'BB', 'B'];

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
