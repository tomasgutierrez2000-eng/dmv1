/* ────────────────────────────────────────────────────────────────────────────
 * Risk Rating Migration Lineage Demo — Sample Rollup Data
 *
 * Provides realistic numbers for the rollup walkthrough animation.
 * Risk Rating Migration = Exposure-Weighted Average Notch Change.
 * Notch Change = Current_Rating − Prior_Rating (positive = downgrade).
 * Rollup: Exposure-weighted average (WEIGHTED_AVERAGE) at every level.
 *
 * Internal Rating Scale (G-SIB standard):
 *   1 = Minimal Risk    (PD < 0.05%)
 *   2 = Low Risk        (PD 0.05–0.50%)
 *   3 = Moderate Risk   (PD 0.50–2.00%)
 *   4 = Elevated Risk   (PD 2.00–10.00%)
 *   5 = High/Default    (PD > 10.00%)
 *
 * Math is pre-verified — weighted averages are consistent at every level.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface RRMigFacilityRow {
  name: string;
  priorRating: number;
  currentRating: number;
  notchChange: number;
  grossExposure: number;
  counterpartyName: string;
  deskName: string;
  direction: 'UPGRADE' | 'DOWNGRADE' | 'STABLE';
}

export interface RRMigCounterpartyRow {
  name: string;
  migrationScore: number;
  totalExposure: number;
  facilityCount: number;
}

export interface RRMigDeskRow {
  name: string;
  migrationScore: number;
  totalExposure: number;
  facilityCount: number;
}

/* ── Facilities ────────────────────────────────────────────────────────────
 * Math verification (Notch Change = Current − Prior):
 *   A: 3 − 2 = +1  (downgrade)  × $20M
 *   B: 2 − 3 = −1  (upgrade)    × $15M
 *   C: 2 − 2 =  0  (stable)     × $25M
 *   D: 4 − 3 = +1  (downgrade)  × $10M
 *   E: 3 − 4 = −1  (upgrade)    × $30M
 * ──────────────────────────────────────────────────────────────────────────── */

export const FACILITIES: RRMigFacilityRow[] = [
  { name: 'Facility A (CRE Term Loan)',   priorRating: 2, currentRating: 3, notchChange: 1,  grossExposure: 20_000_000, counterpartyName: 'Acme Industries',  deskName: 'CRE Lending',  direction: 'DOWNGRADE' },
  { name: 'Facility B (Corp Revolver)',    priorRating: 3, currentRating: 2, notchChange: -1, grossExposure: 15_000_000, counterpartyName: 'Acme Industries',  deskName: 'Corp Lending', direction: 'UPGRADE' },
  { name: 'Facility C (CRE Office Loan)',  priorRating: 2, currentRating: 2, notchChange: 0,  grossExposure: 25_000_000, counterpartyName: 'GlobalCorp',       deskName: 'CRE Lending',  direction: 'STABLE' },
  { name: 'Facility D (Corp Term B)',      priorRating: 3, currentRating: 4, notchChange: 1,  grossExposure: 10_000_000, counterpartyName: 'GlobalCorp',       deskName: 'Corp Lending', direction: 'DOWNGRADE' },
  { name: 'Facility E (Corp Revolver)',    priorRating: 4, currentRating: 3, notchChange: -1, grossExposure: 30_000_000, counterpartyName: 'GlobalCorp',       deskName: 'Corp Lending', direction: 'UPGRADE' },
];

/* ── Counterparty-level weighted averages ─────────────────────────────────
 * Acme Industries:
 *   (1×20M + (−1)×15M) / (20M + 15M) = 5M / 35M = +0.1429 (slight deterioration)
 *
 * GlobalCorp:
 *   (0×25M + 1×10M + (−1)×30M) / (25M + 10M + 30M) = −20M / 65M = −0.3077 (improvement)
 * ──────────────────────────────────────────────────────────────────────────── */

export const COUNTERPARTIES: RRMigCounterpartyRow[] = [
  { name: 'Acme Industries', migrationScore: 0.1429,  totalExposure: 35_000_000, facilityCount: 2 },
  { name: 'GlobalCorp',      migrationScore: -0.3077, totalExposure: 65_000_000, facilityCount: 3 },
];

/* ── Desk-level weighted averages ─────────────────────────────────────────
 * CRE Lending (Fac A + C):
 *   (1×20M + 0×25M) / (20M + 25M) = 20M / 45M = +0.4444 (deterioration)
 *
 * Corp Lending (Fac B + D + E):
 *   ((−1)×15M + 1×10M + (−1)×30M) / (15M + 10M + 30M) = −35M / 55M = −0.6364 (improvement)
 * ──────────────────────────────────────────────────────────────────────────── */

export const DESKS: RRMigDeskRow[] = [
  { name: 'CRE Lending',  migrationScore: 0.4444,  totalExposure: 45_000_000, facilityCount: 2 },
  { name: 'Corp Lending', migrationScore: -0.6364, totalExposure: 55_000_000, facilityCount: 3 },
];

/* ── Portfolio total ───────────────────────────────────────────────────────
 * (1×20M + (−1)×15M + 0×25M + 1×10M + (−1)×30M) / (20M + 15M + 25M + 10M + 30M)
 * = (20 − 15 + 0 + 10 − 30) / 100
 * = −15 / 100
 * = −0.1500 (net improvement)
 *
 * Cross-check via desks:
 *   (0.4444×45M + (−0.6364)×55M) / (45M + 55M)
 *   = (20M + (−35M)) / 100M
 *   = −15M / 100M
 *   = −0.1500  ✓
 * ──────────────────────────────────────────────────────────────────────────── */

export const PORTFOLIO_MIGRATION_SCORE = -0.15;
export const PORTFOLIO_TOTAL_EXPOSURE = 100_000_000;

/* ── Rating scale reference ─────────────────────────────────────────────── */

export const RATING_SCALE = [
  { grade: 1, label: 'Minimal Risk',   pdRange: '< 0.05%',      regulatory: 'Pass' },
  { grade: 2, label: 'Low Risk',       pdRange: '0.05 – 0.50%', regulatory: 'Pass' },
  { grade: 3, label: 'Moderate Risk',  pdRange: '0.50 – 2.00%', regulatory: 'Pass' },
  { grade: 4, label: 'Elevated Risk',  pdRange: '2.00 – 10.0%', regulatory: 'Special Mention' },
  { grade: 5, label: 'High / Default', pdRange: '> 10.0%',      regulatory: 'Substandard' },
] as const;

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** Format exposure as $NNM */
export function fmtExp(n: number): string {
  return '$' + (n / 1_000_000).toFixed(0) + 'M';
}

/** Format migration score with sign and 2 decimals */
export function fmtScore(n: number): string {
  const sign = n > 0 ? '+' : '';
  return sign + n.toFixed(2);
}

/** Format notch change with sign */
export function fmtNotch(n: number): string {
  if (n === 0) return '0';
  return n > 0 ? `+${n}` : `${n}`;
}

/** Direction arrow symbol */
export function dirSymbol(dir: 'UPGRADE' | 'DOWNGRADE' | 'STABLE'): string {
  switch (dir) {
    case 'UPGRADE': return '\u2191';   // ↑
    case 'DOWNGRADE': return '\u2193'; // ↓
    case 'STABLE': return '\u2014';    // —
  }
}

/** Direction color class */
export function dirColor(dir: 'UPGRADE' | 'DOWNGRADE' | 'STABLE'): string {
  switch (dir) {
    case 'UPGRADE': return 'text-emerald-400';
    case 'DOWNGRADE': return 'text-rose-400';
    case 'STABLE': return 'text-gray-400';
  }
}

export function facilitiesForCounterparty(cpName: string): RRMigFacilityRow[] {
  return FACILITIES.filter((f) => f.counterpartyName === cpName);
}

export function facilitiesForDesk(deskName: string): RRMigFacilityRow[] {
  return FACILITIES.filter((f) => f.deskName === deskName);
}

export function weightedMigrationScore(rows: RRMigFacilityRow[]): number {
  const totalExposure = rows.reduce((s, r) => s + r.grossExposure, 0);
  if (totalExposure === 0) return 0;
  const weightedSum = rows.reduce((s, r) => s + r.notchChange * r.grossExposure, 0);
  return weightedSum / totalExposure;
}
