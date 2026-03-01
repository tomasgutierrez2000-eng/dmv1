/* ────────────────────────────────────────────────────────────────────────────
 * LTV Lineage Demo — Sample Rollup Data
 *
 * Pre-verified math for the LTV rollup walkthrough. All exposure-weighted
 * averages can be re-derived from the facility rows.
 *
 * Standard LTV  = drawn_amount / collateral_value * 100
 * Stressed LTV  = drawn_amount / stressed_collateral_value * 100
 * ──────────────────────────────────────────────────────────────────────────── */

import type { LTVVariantKey } from './ltvDemoSteps';

/* ── Formatting helpers ── */

export const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const fmtM = (n: number) => `$${(n / 1_000_000).toFixed(0)}M`;

export const fmtPct = (n: number) =>
  Number.isNaN(n) ? 'N/A' : `${n.toFixed(1)}%`;

/* ── Facility-level data ── */

export interface LTVFacilityRow {
  name: string;
  drawnAmount: number;
  collateralValue: number;
  stressedCollateralValue: number;
  haircutPct: number;
  standardLtv: number;   // drawn / collateral * 100
  stressedLtv: number;   // drawn / stressedCollateral * 100
  exposure: number;       // gross_exposure_usd (= drawnAmount for simplicity)
  isSecured: boolean;
}

/**
 * Three facilities belonging to counterparty "Apex Property Holdings":
 *
 * Facility A: CRE Multifamily — $120M drawn, $175M collateral, 14.3% haircut
 *   Standard: 120/175 = 68.57%  Stressed: 120/150 = 80.00%
 *
 * Facility B: CRE Office — $85M drawn, $140M collateral, 20% haircut
 *   Standard: 85/140 = 60.71%   Stressed: 85/112 = 75.89%
 *
 * Facility C: Term Loan (unsecured) — $45M drawn, no collateral
 *   Standard: NULL               Stressed: NULL
 */
export const LTV_FACILITIES: LTVFacilityRow[] = [
  {
    name: 'Facility A (CRE Multifamily)',
    drawnAmount: 120_000_000,
    collateralValue: 175_000_000,
    stressedCollateralValue: 150_000_000,
    haircutPct: 14.3,
    standardLtv: 68.6, // 120/175*100 = 68.57 → 68.6
    stressedLtv: 80.0,  // 120/150*100 = 80.00
    exposure: 120_000_000,
    isSecured: true,
  },
  {
    name: 'Facility B (CRE Office)',
    drawnAmount: 85_000_000,
    collateralValue: 140_000_000,
    stressedCollateralValue: 112_000_000,
    haircutPct: 20.0,
    standardLtv: 60.7, // 85/140*100 = 60.71 → 60.7
    stressedLtv: 75.9,  // 85/112*100 = 75.89 → 75.9
    exposure: 85_000_000,
    isSecured: true,
  },
  {
    name: 'Facility C (Term Loan)',
    drawnAmount: 45_000_000,
    collateralValue: 0,
    stressedCollateralValue: 0,
    haircutPct: 0,
    standardLtv: NaN,   // unsecured — no LTV
    stressedLtv: NaN,
    exposure: 45_000_000,
    isSecured: false,
  },
];

/* ── Counterparty-level (exposure-weighted average of secured facilities) ── */

/**
 * Counterparty Standard LTV:
 *   (68.6 * 120M + 60.7 * 85M) / (120M + 85M)
 *   = (8_232M + 5_159.5M) / 205M
 *   = 13_391.5M / 205M = 65.3%
 *
 * Counterparty Stressed LTV:
 *   (80.0 * 120M + 75.9 * 85M) / (120M + 85M)
 *   = (9_600M + 6_451.5M) / 205M
 *   = 16_051.5M / 205M = 78.3%
 */
export const COUNTERPARTY_STANDARD_LTV = 65.3;
export const COUNTERPARTY_STRESSED_LTV = 78.3;
export const COUNTERPARTY_SECURED_EXPOSURE = 205_000_000;

/* ── Desk-level data ── */

export const DESK_LTV = {
  standard: { name: 'NYC CRE Desk', ltv: 65.3, exposure: 205_000_000 },
  stressed: { name: 'NYC CRE Desk', ltv: 78.3, exposure: 205_000_000 },
};

/* ── Portfolio-level distribution buckets ── */

export interface LTVBucket {
  range: string;
  status: string;
  count: number;
  exposureM: number;
  pctOfTotal: number;
  color: string;
}

export const LTV_BUCKETS_STANDARD: LTVBucket[] = [
  { range: '< 50%', status: 'Conservative', count: 8, exposureM: 320, pctOfTotal: 15.2, color: 'text-emerald-400' },
  { range: '50\u201365%', status: 'Moderate', count: 15, exposureM: 580, pctOfTotal: 27.5, color: 'text-emerald-300' },
  { range: '65\u201380%', status: 'Standard', count: 22, exposureM: 890, pctOfTotal: 42.2, color: 'text-yellow-400' },
  { range: '80\u2013100%', status: 'High', count: 10, exposureM: 280, pctOfTotal: 13.3, color: 'text-amber-400' },
  { range: '> 100%', status: 'Underwater', count: 3, exposureM: 38, pctOfTotal: 1.8, color: 'text-red-400' },
];

export const LTV_BUCKETS_STRESSED: LTVBucket[] = [
  { range: '< 50%', status: 'Conservative', count: 4, exposureM: 160, pctOfTotal: 7.6, color: 'text-emerald-400' },
  { range: '50\u201365%', status: 'Moderate', count: 10, exposureM: 380, pctOfTotal: 18.0, color: 'text-emerald-300' },
  { range: '65\u201380%', status: 'Standard', count: 18, exposureM: 720, pctOfTotal: 34.1, color: 'text-yellow-400' },
  { range: '80\u2013100%', status: 'High', count: 16, exposureM: 590, pctOfTotal: 28.0, color: 'text-amber-400' },
  { range: '> 100%', status: 'Underwater', count: 10, exposureM: 258, pctOfTotal: 12.2, color: 'text-red-400' },
];

/* ── Helpers ── */

export function ltvForVariant(facility: LTVFacilityRow, variant: LTVVariantKey): number {
  return variant === 'standard' ? facility.standardLtv : facility.stressedLtv;
}

export function bucketsForVariant(variant: LTVVariantKey): LTVBucket[] {
  return variant === 'standard' ? LTV_BUCKETS_STANDARD : LTV_BUCKETS_STRESSED;
}
