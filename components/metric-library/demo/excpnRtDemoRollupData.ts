/* ────────────────────────────────────────────────────────────────────────────
 * Exception Rate Lineage Demo — Sample Rollup Data
 *
 * Provides realistic numbers for the rollup walkthrough animation.
 * Exception Rate = Exception_Count / Total_Facility_Count × 100
 * Rollup: POOLED_DIVISION — re-pool counts at every aggregation level.
 * Math is pre-verified — totals are consistent.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ExcpnRtFacilityRow {
  name: string;
  hasException: boolean;
  exceptionType: string | null;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL' | null;
  counterpartyName: string;
  deskName: string;
}

export interface ExcpnRtCounterpartyRow {
  name: string;
  exceptionCount: number;
  totalCount: number;
  exceptionRate: number;
  /** Material-only variant: only MAJOR/CRITICAL */
  materialExceptionCount: number;
  materialExceptionRate: number;
}

export interface ExcpnRtDeskRow {
  name: string;
  exceptionCount: number;
  totalCount: number;
  exceptionRate: number;
  materialExceptionCount: number;
  materialExceptionRate: number;
}

/* ── Facilities ────────────────────────────────────────────────────────────
 * Math verification (All Exceptions):
 *   F-201: 1 exception  / 1 = 100.00%
 *   F-202: 0 exceptions / 1 =   0.00%
 *   F-203: 1 exception  / 1 = 100.00%  (MINOR severity → excluded from Material)
 *   F-204: 0 exceptions / 1 =   0.00%
 *   F-205: 1 exception  / 1 = 100.00%
 *
 * Math verification (Material Exceptions — MAJOR/CRITICAL only):
 *   F-201: 1 (MAJOR)     → counted
 *   F-202: 0             → not counted
 *   F-203: 1 (MINOR)     → NOT counted
 *   F-204: 0             → not counted
 *   F-205: 1 (CRITICAL)  → counted
 * ──────────────────────────────────────────────────────────────────────────── */

export const FACILITIES: ExcpnRtFacilityRow[] = [
  { name: 'Facility A (CRE Office Loan)',   hasException: true,  exceptionType: 'LTV_BREACH',      severity: 'MAJOR',    counterpartyName: 'Apex Properties', deskName: 'CRE Lending' },
  { name: 'Facility B (CRE Multifamily)',    hasException: false, exceptionType: null,              severity: null,       counterpartyName: 'Apex Properties', deskName: 'CRE Lending' },
  { name: 'Facility C (CRE Retail Center)', hasException: true,  exceptionType: 'COVENANT_WAIVER', severity: 'MINOR',    counterpartyName: 'Apex Properties', deskName: 'CRE Lending' },
  { name: 'Facility D (Corp Term Loan A)',   hasException: false, exceptionType: null,              severity: null,       counterpartyName: 'Meridian Corp',   deskName: 'Corp Lending' },
  { name: 'Facility E (Corp Revolver)',      hasException: true,  exceptionType: 'DSCR_BREACH',    severity: 'CRITICAL', counterpartyName: 'Meridian Corp',   deskName: 'Corp Lending' },
];

/* ── Counterparty-level totals ─────────────────────────────────────────────
 * All Exceptions:
 *   Apex Properties:  2 / 3 = 66.67%
 *   Meridian Corp:    1 / 2 = 50.00%
 *
 * Material Exceptions:
 *   Apex Properties:  1 / 3 = 33.33%
 *   Meridian Corp:    1 / 2 = 50.00%
 * ──────────────────────────────────────────────────────────────────────────── */

export const COUNTERPARTIES: ExcpnRtCounterpartyRow[] = [
  { name: 'Apex Properties', exceptionCount: 2, totalCount: 3, exceptionRate: 66.67, materialExceptionCount: 1, materialExceptionRate: 33.33 },
  { name: 'Meridian Corp',   exceptionCount: 1, totalCount: 2, exceptionRate: 50.00, materialExceptionCount: 1, materialExceptionRate: 50.00 },
];

/* ── Desk-level totals ─────────────────────────────────────────────────────
 * All Exceptions:
 *   CRE Lending:   2 / 3 = 66.67%  (3 facilities)
 *   Corp Lending:  1 / 2 = 50.00%  (2 facilities)
 *
 * Material Exceptions:
 *   CRE Lending:   1 / 3 = 33.33%
 *   Corp Lending:  1 / 2 = 50.00%
 * ──────────────────────────────────────────────────────────────────────────── */

export const DESKS: ExcpnRtDeskRow[] = [
  { name: 'CRE Lending',  exceptionCount: 2, totalCount: 3, exceptionRate: 66.67, materialExceptionCount: 1, materialExceptionRate: 33.33 },
  { name: 'Corp Lending', exceptionCount: 1, totalCount: 2, exceptionRate: 50.00, materialExceptionCount: 1, materialExceptionRate: 50.00 },
];

/* ── Portfolio totals ────────────────────────────────────────────────────
 * All Exceptions:    3 / 5 = 60.00%
 * Material Exceptions: 2 / 5 = 40.00%
 * ──────────────────────────────────────────────────────────────────────────── */

export const PORTFOLIO_EXCEPTION_COUNT = 3;
export const PORTFOLIO_TOTAL_COUNT = 5;
export const PORTFOLIO_EXCEPTION_RATE = 60.00;

export const PORTFOLIO_MATERIAL_EXCEPTION_COUNT = 2;
export const PORTFOLIO_MATERIAL_EXCEPTION_RATE = 40.00;

/* ── Helpers ──────────────────────────────────────────────────────────────── */

export function fmtPct(n: number): string {
  return n.toFixed(2) + '%';
}

export function fmtCount(n: number): string {
  return n.toString();
}

export function fmtRatio(num: number, den: number): string {
  return `${num} / ${den}`;
}

export function facilitiesForCounterparty(cpName: string): ExcpnRtFacilityRow[] {
  return FACILITIES.filter((f) => f.counterpartyName === cpName);
}

export function facilitiesForDesk(deskName: string): ExcpnRtFacilityRow[] {
  return FACILITIES.filter((f) => f.deskName === deskName);
}

export function countExceptions(rows: ExcpnRtFacilityRow[], materialOnly: boolean): number {
  if (materialOnly) {
    return rows.filter((r) => r.hasException && (r.severity === 'MAJOR' || r.severity === 'CRITICAL')).length;
  }
  return rows.filter((r) => r.hasException).length;
}
