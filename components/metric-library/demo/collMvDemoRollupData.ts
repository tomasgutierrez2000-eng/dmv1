/* ────────────────────────────────────────────────────────────────────────────
 * Current Collateral Market Value Lineage Demo — Sample Rollup Data
 *
 * Provides realistic numbers for the rollup walkthrough animation.
 * Collateral MV = SUM(current_valuation_usd) per facility from
 * collateral_snapshot, then participation-weighted at counterparty level.
 * Rollup: Additive SUM at desk/portfolio/lob levels.
 * Math is pre-verified — totals are consistent.
 *
 * Facility E has SPLIT PARTICIPATION:
 *   Apex Properties 60%, TechForge Manufacturing 40%
 *   This demonstrates the participation_pct concept at counterparty level.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface CollMvFacilityRow {
  name: string;
  collateralMv: number;
  collateralCount: number;
  counterpartyName: string;
  deskName: string;
  /** Participation splits — if omitted, 100% to counterpartyName */
  participations?: { counterpartyName: string; pct: number; attributedMv: number }[];
}

export interface CollMvCounterpartyRow {
  name: string;
  collateralMv: number;
  facilityCount: number;
  note?: string;
}

export interface CollMvDeskRow {
  name: string;
  collateralMv: number;
  facilityCount: number;
}

/* ── Facilities ────────────────────────────────────────────────────────────
 * Math verification (facility-level SUM from collateral_snapshot):
 *   A: 3 collateral assets → $55M + $40M + $25M = $120,000,000
 *   B: 2 collateral assets → $40M + $25M         = $65,000,000
 *   C: 2 collateral assets → $25M + $15M         = $40,000,000
 *   D: 1 collateral asset  → $25M                = $25,000,000
 *   E: 2 collateral assets → $30M + $20M         = $50,000,000
 *                                           Total = $300,000,000
 *
 * Facility E participation split:
 *   Apex Properties:       60% × $50M = $30,000,000
 *   TechForge Manufacturing: 40% × $50M = $20,000,000
 * ──────────────────────────────────────────────────────────────────────────── */

export const FACILITIES: CollMvFacilityRow[] = [
  { name: 'Facility A (CRE Multifamily)', collateralMv: 120_000_000, collateralCount: 3, counterpartyName: 'Apex Properties', deskName: 'CRE Lending' },
  { name: 'Facility B (CRE Office)',      collateralMv: 65_000_000,  collateralCount: 2, counterpartyName: 'Apex Properties', deskName: 'CRE Lending' },
  { name: 'Facility C (C&I Revolving)',    collateralMv: 40_000_000,  collateralCount: 2, counterpartyName: 'TechForge Mfg',   deskName: 'C&I Middle Market' },
  { name: 'Facility D (C&I Term Loan)',    collateralMv: 25_000_000,  collateralCount: 1, counterpartyName: 'TechForge Mfg',   deskName: 'C&I Middle Market' },
  {
    name: 'Facility E (CRE Retail)',
    collateralMv: 50_000_000,
    collateralCount: 2,
    counterpartyName: 'Apex Properties',
    deskName: 'CRE Lending',
    participations: [
      { counterpartyName: 'Apex Properties',  pct: 60, attributedMv: 30_000_000 },
      { counterpartyName: 'TechForge Mfg', pct: 40, attributedMv: 20_000_000 },
    ],
  },
];

/* ── Counterparty-level totals (participation-weighted) ──────────────────
 * Apex Properties:
 *   Facility A: 100% × $120M = $120,000,000
 *   Facility B: 100% × $65M  = $65,000,000
 *   Facility E:  60% × $50M  = $30,000,000
 *   Total:                     $215,000,000
 *
 * TechForge Manufacturing:
 *   Facility C: 100% × $40M  = $40,000,000
 *   Facility D: 100% × $25M  = $25,000,000
 *   Facility E:  40% × $50M  = $20,000,000
 *   Total:                     $85,000,000
 *
 * Grand total: $215M + $85M = $300,000,000 ✓
 * ──────────────────────────────────────────────────────────────────────────── */

export const COUNTERPARTIES: CollMvCounterpartyRow[] = [
  { name: 'Apex Properties',  collateralMv: 215_000_000, facilityCount: 3, note: 'Includes 60% of Facility E ($30M)' },
  { name: 'TechForge Mfg', collateralMv: 85_000_000,  facilityCount: 3, note: 'Includes 40% of Facility E ($20M)' },
];

/* ── Desk-level totals (direct SUM, no participation weighting) ──────────
 * CRE Lending:       $120M + $65M + $50M = $235,000,000  (3 facilities)
 * C&I Middle Market:  $40M + $25M        =  $65,000,000  (2 facilities)
 *                                   Total = $300,000,000 ✓
 * ──────────────────────────────────────────────────────────────────────────── */

export const DESKS: CollMvDeskRow[] = [
  { name: 'CRE Lending',       collateralMv: 235_000_000, facilityCount: 3 },
  { name: 'C&I Middle Market', collateralMv: 65_000_000,  facilityCount: 2 },
];

/* ── Portfolio total ───────────────────────────────────────────────────────
 * $235,000,000 + $65,000,000 = $300,000,000
 * ──────────────────────────────────────────────────────────────────────────── */

export const PORTFOLIO_TOTAL = 300_000_000;

/* ── Helpers ──────────────────────────────────────────────────────────────── */

export function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

export function fmtM(n: number): string {
  return '$' + (n / 1_000_000).toFixed(0) + 'M';
}

export function fmtPct(p: number): string {
  return p.toFixed(0) + '%';
}

export function facilitiesForCounterparty(cpName: string): CollMvFacilityRow[] {
  return FACILITIES.filter((f) => {
    if (f.counterpartyName === cpName) return true;
    return f.participations?.some((p) => p.counterpartyName === cpName);
  });
}

export function facilitiesForDesk(deskName: string): CollMvFacilityRow[] {
  return FACILITIES.filter((f) => f.deskName === deskName);
}

export function sumCollateralMv(rows: CollMvFacilityRow[]): number {
  return rows.reduce((s, r) => s + r.collateralMv, 0);
}

/** Get the participation-weighted MV for a given counterparty from a facility */
export function getParticipationMv(f: CollMvFacilityRow, cpName: string): number {
  if (f.participations) {
    const p = f.participations.find((p) => p.counterpartyName === cpName);
    return p ? p.attributedMv : 0;
  }
  return f.counterpartyName === cpName ? f.collateralMv : 0;
}
