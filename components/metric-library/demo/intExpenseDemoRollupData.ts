/* ────────────────────────────────────────────────────────────────────────────
 * Interest Expense Lineage Demo — Sample Rollup Data
 *
 * Provides realistic numbers for the rollup walkthrough animation.
 * Interest Expense = Drawn Amount x Cost of Funds Rate / 100 (annualized).
 * Rollup: Additive SUM at every aggregation level.
 * Math is pre-verified — totals are consistent.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface IntExpenseFacilityRow {
  name: string;
  drawnAmount: number;
  costOfFundsPct: number;
  interestExpense: number;
  counterpartyName: string;
  deskName: string;
}

export interface IntExpenseCounterpartyRow {
  name: string;
  interestExpense: number;
  totalDrawn: number;
}

export interface IntExpenseDeskRow {
  name: string;
  interestExpense: number;
  facilityCount: number;
}

/* ── Facilities ────────────────────────────────────────────────────────────
 * Math verification:
 *   A:  95,000,000 x 4.50 / 100 = 4,275,000
 *   B:  40,000,000 x 4.15 / 100 = 1,660,000
 *   C: 150,000,000 x 3.85 / 100 = 5,775,000
 *   D:  65,000,000 x 4.75 / 100 = 3,087,500
 *   E:  30,000,000 x 5.20 / 100 = 1,560,000
 * ──────────────────────────────────────────────────────────────────────────── */

export const FACILITIES: IntExpenseFacilityRow[] = [
  { name: 'Facility A (Senior Secured TL)', drawnAmount: 95_000_000,  costOfFundsPct: 4.50, interestExpense: 4_275_000, counterpartyName: 'Apex Manufacturing', deskName: 'Industrials' },
  { name: 'Facility B (Revolver)',          drawnAmount: 40_000_000,  costOfFundsPct: 4.15, interestExpense: 1_660_000, counterpartyName: 'Apex Manufacturing', deskName: 'Industrials' },
  { name: 'Facility C (Term Loan A)',       drawnAmount: 150_000_000, costOfFundsPct: 3.85, interestExpense: 5_775_000, counterpartyName: 'Meridian Healthcare', deskName: 'Healthcare' },
  { name: 'Facility D (ABL Facility)',      drawnAmount: 65_000_000,  costOfFundsPct: 4.75, interestExpense: 3_087_500, counterpartyName: 'Meridian Healthcare', deskName: 'Healthcare' },
  { name: 'Facility E (Bridge Loan)',       drawnAmount: 30_000_000,  costOfFundsPct: 5.20, interestExpense: 1_560_000, counterpartyName: 'Apex Manufacturing', deskName: 'Industrials' },
];

/* ── Counterparty-level totals ─────────────────────────────────────────────
 * Apex Manufacturing:  4,275,000 + 1,660,000 + 1,560,000 = 7,495,000
 * Meridian Healthcare: 5,775,000 + 3,087,500 = 8,862,500
 * ──────────────────────────────────────────────────────────────────────────── */

export const COUNTERPARTIES: IntExpenseCounterpartyRow[] = [
  { name: 'Apex Manufacturing',  interestExpense: 7_495_000, totalDrawn: 165_000_000 },
  { name: 'Meridian Healthcare', interestExpense: 8_862_500, totalDrawn: 215_000_000 },
];

/* ── Desk-level totals ─────────────────────────────────────────────────────
 * Industrials: 4,275,000 + 1,660,000 + 1,560,000 = 7,495,000  (3 facilities)
 * Healthcare:  5,775,000 + 3,087,500 = 8,862,500  (2 facilities)
 * ──────────────────────────────────────────────────────────────────────────── */

export const DESKS: IntExpenseDeskRow[] = [
  { name: 'Industrials', interestExpense: 7_495_000, facilityCount: 3 },
  { name: 'Healthcare',  interestExpense: 8_862_500, facilityCount: 2 },
];

/* ── Portfolio total ───────────────────────────────────────────────────────
 * 7,495,000 + 8,862,500 = 16,357,500
 * ──────────────────────────────────────────────────────────────────────────── */

export const PORTFOLIO_TOTAL = 16_357_500;
export const PORTFOLIO_TOTAL_DRAWN = 380_000_000;

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

export function facilitiesForCounterparty(cpName: string): IntExpenseFacilityRow[] {
  return FACILITIES.filter((f) => f.counterpartyName === cpName);
}

export function facilitiesForDesk(deskName: string): IntExpenseFacilityRow[] {
  return FACILITIES.filter((f) => f.deskName === deskName);
}

export function sumInterestExpense(rows: IntExpenseFacilityRow[]): number {
  return rows.reduce((s, r) => s + r.interestExpense, 0);
}
