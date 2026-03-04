/* ────────────────────────────────────────────────────────────────────────────
 * Interest Income Lineage Demo — Sample Rollup Data
 *
 * Provides realistic numbers for the rollup walkthrough animation.
 * Interest Income = Drawn Amount x All-In Rate / 100 (annualized).
 * Rollup: Additive SUM at every aggregation level.
 * Math is pre-verified — totals are consistent.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface IntIncomeFacilityRow {
  name: string;
  drawnAmount: number;
  allInRatePct: number;
  interestIncome: number;
  counterpartyName: string;
  deskName: string;
}

export interface IntIncomeCounterpartyRow {
  name: string;
  interestIncome: number;
  totalDrawn: number;
}

export interface IntIncomeDeskRow {
  name: string;
  interestIncome: number;
  facilityCount: number;
}

/* ── Facilities ────────────────────────────────────────────────────────────
 * Math verification:
 *   A: 120,000,000 x 6.25 / 100 = 7,500,000
 *   B:  85,000,000 x 5.75 / 100 = 4,887,500
 *   C:  45,000,000 x 7.10 / 100 = 3,195,000
 *   D:  30,000,000 x 5.50 / 100 = 1,650,000
 *   E:  15,000,000 x 6.00 / 100 =   900,000
 * ──────────────────────────────────────────────────────────────────────────── */

export const FACILITIES: IntIncomeFacilityRow[] = [
  { name: 'Facility A (CRE Multifamily)', drawnAmount: 120_000_000, allInRatePct: 6.25, interestIncome: 7_500_000, counterpartyName: 'Apex Properties', deskName: 'CRE Lending' },
  { name: 'Facility B (CRE Office)',      drawnAmount: 85_000_000,  allInRatePct: 5.75, interestIncome: 4_887_500, counterpartyName: 'Apex Properties', deskName: 'CRE Lending' },
  { name: 'Facility C (Corp Term Loan)',   drawnAmount: 45_000_000,  allInRatePct: 7.10, interestIncome: 3_195_000, counterpartyName: 'Meridian Corp',   deskName: 'Corp Lending' },
  { name: 'Facility D (Corp LOC)',         drawnAmount: 30_000_000,  allInRatePct: 5.50, interestIncome: 1_650_000, counterpartyName: 'Meridian Corp',   deskName: 'Corp Lending' },
  { name: 'Facility E (Corp Revolver)',    drawnAmount: 15_000_000,  allInRatePct: 6.00, interestIncome: 900_000,   counterpartyName: 'Meridian Corp',   deskName: 'Corp Lending' },
];

/* ── Counterparty-level totals ─────────────────────────────────────────────
 * Apex Properties:  7,500,000 + 4,887,500 = 12,387,500
 * Meridian Corp:    3,195,000 + 1,650,000 + 900,000 = 5,745,000
 * ──────────────────────────────────────────────────────────────────────────── */

export const COUNTERPARTIES: IntIncomeCounterpartyRow[] = [
  { name: 'Apex Properties', interestIncome: 12_387_500, totalDrawn: 205_000_000 },
  { name: 'Meridian Corp',   interestIncome: 5_745_000,  totalDrawn: 90_000_000 },
];

/* ── Desk-level totals ─────────────────────────────────────────────────────
 * CRE Lending:   7,500,000 + 4,887,500 = 12,387,500  (2 facilities)
 * Corp Lending:  3,195,000 + 1,650,000 + 900,000 = 5,745,000  (3 facilities)
 * ──────────────────────────────────────────────────────────────────────────── */

export const DESKS: IntIncomeDeskRow[] = [
  { name: 'CRE Lending',  interestIncome: 12_387_500, facilityCount: 2 },
  { name: 'Corp Lending', interestIncome: 5_745_000,  facilityCount: 3 },
];

/* ── Portfolio total ───────────────────────────────────────────────────────
 * 12,387,500 + 5,745,000 = 18,132,500
 * ──────────────────────────────────────────────────────────────────────────── */

export const PORTFOLIO_TOTAL = 18_132_500;
export const PORTFOLIO_TOTAL_DRAWN = 295_000_000;

/* ── Helpers ──────────────────────────────────────────────────────────────── */

export function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

export function fmtM(n: number): string {
  return '$' + (n / 1_000_000).toFixed(0) + 'M';
}

export function fmtRate(r: number): string {
  return r.toFixed(2) + '%';
}

export function facilitiesForCounterparty(cpName: string): IntIncomeFacilityRow[] {
  return FACILITIES.filter((f) => f.counterpartyName === cpName);
}

export function facilitiesForDesk(deskName: string): IntIncomeFacilityRow[] {
  return FACILITIES.filter((f) => f.deskName === deskName);
}

export function sumInterestIncome(rows: IntIncomeFacilityRow[]): number {
  return rows.reduce((s, r) => s + r.interestIncome, 0);
}
