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

/* ── Portfolio-level counterparties (for committed-facility-amount-weighted avg demo) ────── */

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

/* ── Desk-level segments (structured, with colors) ─────────────────────── */

export interface DeskSegment {
  label: string;
  productType: 'CRE' | 'CI' | 'LevFin';
  numeratorLabel: string;
  dscr: number;
  exposure: number;
  color: string;
  colorBg: string;
}

/*
 * Math verification:
 *   CRE: pooled from CRE facilities: 4,575,000 / 3,550,000 = 1.29x (matches DESK_CRE_POOLED)
 *   C&I: pooled from C&I facilities: 10,640,000 / 4,030,000 = 2.64x (matches DESK_CI_POOLED)
 *   Blended: (1.29 × 100M + 2.64 × 140M) / (100M + 140M) = (129M + 369.6M) / 240M = 2.08x
 */
export const DSCR_DESK_SEGMENTS: DeskSegment[] = [
  { label: 'CRE Desk',  productType: 'CRE', numeratorLabel: 'NOI',    dscr: 1.29, exposure: 100_000_000, color: 'text-blue-400',   colorBg: 'bg-blue-500/10 border-blue-500/20' },
  { label: 'C&I Desk',  productType: 'CI',  numeratorLabel: 'EBITDA', dscr: 2.64, exposure: 140_000_000, color: 'text-purple-400', colorBg: 'bg-purple-500/10 border-purple-500/20' },
];

/** Blended exposure-weighted DSCR across all desk segments */
export const DSCR_DESK_BLENDED = 2.08;

/* ── Portfolio distribution buckets ────────────────────────────────────── */

export interface DSCRBucket {
  range: string;
  label: string;
  count: number;
  exposure: number;
  color: string;
  bg: string;
}

export const DSCR_PORTFOLIO_BUCKETS: DSCRBucket[] = [
  { range: '< 1.0x',      label: 'Critical', count: 3,  exposure: 45_000_000,  color: 'text-red-400',     bg: 'bg-red-500/10' },
  { range: '1.0 – 1.25x', label: 'Watch',    count: 8,  exposure: 180_000_000, color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  { range: '1.25 – 1.5x', label: 'Adequate', count: 15, exposure: 420_000_000, color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
  { range: '1.5 – 2.0x',  label: 'Good',     count: 22, exposure: 890_000_000, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { range: '> 2.0x',      label: 'Strong',   count: 12, exposure: 650_000_000, color: 'text-emerald-300', bg: 'bg-emerald-500/10' },
];

/* ── Business Segment-level trend data ─────────────────────────────────── */

export interface DSCRLoBEntry {
  label: string;
  dscr: number;
  numeratorBasis: string;
  trend: 'up' | 'down' | 'flat';
  color: string;
  bg: string;
  note: string;
}

export const DSCR_LOB_ENTRIES: DSCRLoBEntry[] = [
  { label: 'CRE',       dscr: 1.29, numeratorBasis: 'NOI',         trend: 'down', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   note: 'NOI-based' },
  { label: 'Corporate',  dscr: 2.64, numeratorBasis: 'EBITDA',      trend: 'flat', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', note: 'EBITDA-based' },
  { label: 'Lev Fin',   dscr: 1.85, numeratorBasis: 'Adj. EBITDA', trend: 'up',   color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',  note: 'Adj. EBITDA' },
];

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

/** Format DSCR ratio */
export function fmtDscr(n: number): string {
  return n.toFixed(2) + 'x';
}

/** DSCR risk band color */
export function dscrBandColor(dscr: number): string {
  if (dscr < 1.0) return 'text-red-400';
  if (dscr < 1.25) return 'text-amber-400';
  if (dscr < 1.5) return 'text-yellow-400';
  return 'text-emerald-400';
}

/** DSCR risk band label */
export function dscrBandLabel(dscr: number): string {
  if (dscr < 1.0) return 'Critical';
  if (dscr < 1.25) return 'Watch';
  if (dscr < 1.5) return 'Adequate';
  return 'Healthy';
}
