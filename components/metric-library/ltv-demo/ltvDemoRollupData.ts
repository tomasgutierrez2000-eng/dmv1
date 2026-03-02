/* ────────────────────────────────────────────────────────────────────────────
 * LTV Lineage Demo — Sample Rollup Data
 *
 * Provides realistic numbers for the rollup walkthrough animation.
 * LTV = Exposure / Collateral Value × 100
 * Math is pre-verified — totals and ratios are consistent.
 * ──────────────────────────────────────────────────────────────────────────── */

/* ── Collateral detail for the primary example facility ──────────────────── */

export interface CollateralItem {
  name: string;
  type: string;
  currentValue: number;
  haircutPct: number;
  eligibleValue: number;
  mitigantGroup: 'M1' | 'M2';
}

export const FACILITY_A_COLLATERAL: CollateralItem[] = [
  {
    name: 'Commercial Building',
    type: 'Real Estate',
    currentValue: 20_000_000,
    haircutPct: 10,
    eligibleValue: 18_000_000,
    mitigantGroup: 'M1',
  },
  {
    name: 'Cash Deposit',
    type: 'Cash',
    currentValue: 3_000_000,
    haircutPct: 0,
    eligibleValue: 3_000_000,
    mitigantGroup: 'M1',
  },
  {
    name: 'Accounts Receivable',
    type: 'Receivables',
    currentValue: 2_200_000,
    haircutPct: 25,
    eligibleValue: 1_650_000,
    mitigantGroup: 'M2',
  },
];

/* ── Facility-level data ─────────────────────────────────────────────────── */

export interface LTVFacilityRow {
  name: string;
  exposure: number;
  collateralValue: number;
  ltv: number;
}

/*
 * Math verification:
 *   Fac A: 15,000,000 / 25,200,000 × 100 = 59.52% → 59.5%
 *   Fac B:  8,000,000 / 12,000,000 × 100 = 66.67% → 66.7%
 *   Fac C: 25,000,000 / 22,000,000 × 100 = 113.64% → 113.6%
 */
export const LTV_FACILITIES: LTVFacilityRow[] = [
  { name: 'Facility A (Multifamily)', exposure: 15_000_000, collateralValue: 25_200_000, ltv: 59.5 },
  { name: 'Facility B (Office)',      exposure: 8_000_000,  collateralValue: 12_000_000, ltv: 66.7 },
  { name: 'Facility C (Retail)',      exposure: 25_000_000, collateralValue: 22_000_000, ltv: 113.6 },
];

/* ── Counterparty-level data ─────────────────────────────────────────────── */

export interface LTVCounterpartyRow {
  name: string;
  ltv: number;
  exposure: number;
}

/*
 * Counterparty A — weighted LTV from 3 facilities above:
 *   (59.5 × 15 + 66.7 × 8 + 113.6 × 25) / (15 + 8 + 25)
 *   = (892.5 + 533.6 + 2840) / 48
 *   = 4266.1 / 48
 *   = 88.9%
 */
export const LTV_COUNTERPARTIES: LTVCounterpartyRow[] = [
  { name: 'Counterparty A', ltv: 88.9, exposure: 48_000_000 },
  { name: 'Counterparty B', ltv: 55.0, exposure: 35_000_000 },
  { name: 'Counterparty C', ltv: 72.3, exposure: 22_000_000 },
];

/* ── Desk-level data (by collateral type) ────────────────────────────────── */

export interface DeskSegment {
  label: string;
  collateralType: string;
  ltv: number;
  exposure: number;
  color: string;
  colorBg: string;
}

export const DESK_SEGMENTS: DeskSegment[] = [
  { label: 'CRE Desk',       collateralType: 'Real Estate',   ltv: 74.2, exposure: 620_000_000, color: 'text-blue-400',    colorBg: 'bg-blue-500/10 border-blue-500/20' },
  { label: 'Corporate Desk',  collateralType: 'Receivables',   ltv: 58.1, exposure: 280_000_000, color: 'text-purple-400',  colorBg: 'bg-purple-500/10 border-purple-500/20' },
  { label: 'Securities Desk', collateralType: 'Financial',     ltv: 65.8, exposure: 150_000_000, color: 'text-amber-400',   colorBg: 'bg-amber-500/10 border-amber-500/20' },
];

/* ── Portfolio distribution buckets ──────────────────────────────────────── */

export interface LTVBucket {
  range: string;
  label: string;
  count: number;
  exposure: number;
  color: string;
  bg: string;
}

export const PORTFOLIO_BUCKETS: LTVBucket[] = [
  { range: '< 60%',     label: 'Low Risk',   count: 12, exposure: 350_000_000, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { range: '60 – 80%',  label: 'Moderate',    count: 18, exposure: 680_000_000, color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
  { range: '80 – 100%', label: 'High Risk',   count: 8,  exposure: 420_000_000, color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  { range: '> 100%',    label: 'Underwater',   count: 4,  exposure: 180_000_000, color: 'text-red-400',     bg: 'bg-red-500/10' },
];

/* ── LoB-level trend data ────────────────────────────────────────────────── */

export interface LoBEntry {
  label: string;
  ltv: number;
  trend: 'up' | 'down' | 'flat';
  color: string;
  bg: string;
  note: string;
}

export const LOB_ENTRIES: LoBEntry[] = [
  { label: 'CRE',       ltv: 74.2, trend: 'up',   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   note: 'Property-backed' },
  { label: 'Corporate',  ltv: 58.1, trend: 'flat', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', note: 'Asset-backed' },
  { label: 'Securities', ltv: 65.8, trend: 'down', color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',  note: 'Market-marked' },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */

export function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

export function fmtM(n: number): string {
  return '$' + (n / 1_000_000).toFixed(0) + 'M';
}

export function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

/** Exposure-weighted average LTV */
export function exposureWeightedLTV(rows: LTVCounterpartyRow[]): number {
  const totalExposure = rows.reduce((s, r) => s + r.exposure, 0);
  const weighted = rows.reduce((s, r) => s + r.ltv * r.exposure, 0);
  return weighted / totalExposure;
}

/** Sum of all collateral values */
export function totalCollateralValue(items: CollateralItem[]): number {
  return items.reduce((s, c) => s + c.currentValue, 0);
}

/** Sum of all eligible values (after haircut) */
export function totalEligibleValue(items: CollateralItem[]): number {
  return items.reduce((s, c) => s + c.eligibleValue, 0);
}

/** LTV risk band color */
export function ltvBandColor(ltv: number): string {
  if (ltv < 60) return 'text-emerald-400';
  if (ltv < 80) return 'text-yellow-400';
  if (ltv < 100) return 'text-amber-400';
  return 'text-red-400';
}

/** LTV risk band label */
export function ltvBandLabel(ltv: number): string {
  if (ltv < 60) return 'Low Risk';
  if (ltv < 80) return 'Moderate';
  if (ltv < 100) return 'High Risk';
  return 'Underwater';
}
