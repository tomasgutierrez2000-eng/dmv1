/* ────────────────────────────────────────────────────────────────────────────
 * DSCR Lineage Demo — Sample Rollup Data
 *
 * Provides realistic numbers for the rollup walkthrough animation.
 * CRE uses NOI/Senior DS; C&I uses EBITDA/Global DS.
 * Math is pre-verified — totals and ratios are consistent.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { VariantKey } from './demoSteps';

export interface FacilityRow {
  name: string;
  numerator: number;
  denominator: number;
  dscr: number;
  exposure: number;
}

export interface CounterpartyRow {
  name: string;
  dscr: number;
  exposure: number;
}

/* ── CRE facilities ──────────────────────────────────────────────────────── */

export const CRE_FACILITIES: FacilityRow[] = [
  { name: 'Facility A (Multifamily)', numerator: 1_585_000, denominator: 1_200_000, dscr: 1.32, exposure: 50_000_000 },
  { name: 'Facility B (Office)',      numerator: 2_100_000, denominator: 1_400_000, dscr: 1.50, exposure: 30_000_000 },
  { name: 'Facility C (Retail)',      numerator: 890_000,   denominator: 950_000,   dscr: 0.94, exposure: 20_000_000 },
];

/* ── C&I facilities ──────────────────────────────────────────────────────── */

export const CI_FACILITIES: FacilityRow[] = [
  { name: 'Facility A (Term Loan)',   numerator: 5_640_000, denominator: 1_380_000, dscr: 4.09, exposure: 80_000_000 },
  { name: 'Facility B (Revolver)',    numerator: 3_200_000, denominator: 1_050_000, dscr: 3.05, exposure: 45_000_000 },
  { name: 'Facility C (LOC)',         numerator: 1_800_000, denominator: 1_600_000, dscr: 1.13, exposure: 15_000_000 },
];

/* ── Portfolio-level counterparties (for exposure-weighted avg demo) ────── */

export const CRE_COUNTERPARTIES: CounterpartyRow[] = [
  { name: 'Counterparty A', dscr: 1.29, exposure: 50_000_000 },
  { name: 'Counterparty B', dscr: 2.10, exposure: 30_000_000 },
  { name: 'Counterparty C', dscr: 0.85, exposure: 20_000_000 },
];

export const CI_COUNTERPARTIES: CounterpartyRow[] = [
  { name: 'Counterparty A', dscr: 3.12, exposure: 80_000_000 },
  { name: 'Counterparty B', dscr: 1.95, exposure: 45_000_000 },
  { name: 'Counterparty C', dscr: 1.13, exposure: 15_000_000 },
];

/* ── Desk-level segmented data ───────────────────────────────────────────── */

export const DESK_CRE_POOLED = {
  totalNumerator: 4_575_000,
  totalDenominator: 3_550_000,
  dscr: 1.29,
};

export const DESK_CI_POOLED = {
  totalNumerator: 10_640_000,
  totalDenominator: 4_030_000,
  dscr: 2.64,
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */

export function facilitiesFor(v: VariantKey): FacilityRow[] {
  return v === 'CRE' ? CRE_FACILITIES : CI_FACILITIES;
}

export function counterpartiesFor(v: VariantKey): CounterpartyRow[] {
  return v === 'CRE' ? CRE_COUNTERPARTIES : CI_COUNTERPARTIES;
}

export function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

export function fmtM(n: number): string {
  return '$' + (n / 1_000_000).toFixed(0) + 'M';
}

/** Sum numerators across facilities */
export function sumNumerators(rows: FacilityRow[]): number {
  return rows.reduce((s, r) => s + r.numerator, 0);
}

/** Sum denominators across facilities */
export function sumDenominators(rows: FacilityRow[]): number {
  return rows.reduce((s, r) => s + r.denominator, 0);
}

/** Exposure-weighted average DSCR */
export function exposureWeightedDSCR(rows: CounterpartyRow[]): number {
  const totalExposure = rows.reduce((s, r) => s + r.exposure, 0);
  const weighted = rows.reduce((s, r) => s + r.dscr * r.exposure, 0);
  return weighted / totalExposure;
}
