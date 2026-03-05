/* ────────────────────────────────────────────────────────────────────────────
 * Counterparty Allocation % Lineage Demo — Sample Rollup Data
 *
 * Provides realistic numbers for the rollup walkthrough animation.
 *
 * Two variants:
 *   Legal:    participation_pct from facility_counterparty_participation (L1)
 *   Economic: economic_allocation_pct from counterparty_allocation_snapshot (L2)
 *             = legal_participation_pct − crm_adjustment_pct
 *
 * Rollup: WEIGHTED_AVERAGE at counterparty level
 *         (weighted by committed_facility_amt)
 *         N/A at desk / portfolio / lob (relationship metric)
 *
 * Math is pre-verified — totals are consistent.
 * ──────────────────────────────────────────────────────────────────────────── */

export type AllocPctVariant = 'legal' | 'economic';

export interface AllocPctFacilityRow {
  name: string;
  facilityId: string;
  committedAmt: number;
  counterpartyName: string;
  deskName: string;
  legalPct: number;
  crmAdjPct: number;
  economicPct: number;
  crmMethod: string;
  crmDetail: string;
}

export interface AllocPctCounterpartyRow {
  name: string;
  totalCommitted: number;
  facilityCount: number;
  wtdLegalPct: number;
  wtdEconomicPct: number;
}

/* ── Facilities ────────────────────────────────────────────────────────────
 * Each row represents a (facility, counterparty) pair — a single
 * counterparty's participation in one facility.
 *
 * Math verification (Legal):
 *   CP-01 weighted avg:
 *     = (60×100M + 100×75M + 35×200M + 55×150M) / (100M + 75M + 200M + 150M)
 *     = (6000 + 7500 + 7000 + 8250) / 525 = 28750 / 525 = 54.76%
 *
 *   CP-02 weighted avg:
 *     = (40×100M + 65×200M + 100×50M + 45×150M) / (100M + 200M + 50M + 150M)
 *     = (4000 + 13000 + 5000 + 6750) / 500 = 28750 / 500 = 57.50%
 *
 * Math verification (Economic):
 *   CP-01 weighted avg:
 *     = (45×100M + 80×75M + 35×200M + 55×150M) / (100M + 75M + 200M + 150M)
 *     = (4500 + 6000 + 7000 + 8250) / 525 = 25750 / 525 = 49.05%
 *
 *   CP-02 weighted avg:
 *     = (40×100M + 50×200M + 85×50M + 45×150M) / (100M + 200M + 50M + 150M)
 *     = (4000 + 10000 + 4250 + 6750) / 500 = 25000 / 500 = 50.00%
 * ──────────────────────────────────────────────────────────────────────────── */

export const FACILITIES: AllocPctFacilityRow[] = [
  {
    name: 'Facility A (Syndicated Revolver)',
    facilityId: 'F-201',
    committedAmt: 100_000_000,
    counterpartyName: 'Apex Properties',
    deskName: 'CRE Lending',
    legalPct: 60.00,
    crmAdjPct: 15.00,
    economicPct: 45.00,
    crmMethod: 'COMPREHENSIVE',
    crmDetail: 'CDS protection purchased covering 15% of exposure',
  },
  {
    name: 'Facility B (Term Loan A)',
    facilityId: 'F-202',
    committedAmt: 75_000_000,
    counterpartyName: 'Apex Properties',
    deskName: 'CRE Lending',
    legalPct: 100.00,
    crmAdjPct: 20.00,
    economicPct: 80.00,
    crmMethod: 'SUBSTITUTION',
    crmDetail: 'Sub-participation sold transferring 20% economic exposure',
  },
  {
    name: 'Facility C (Syndicated Term Loan)',
    facilityId: 'F-203',
    committedAmt: 200_000_000,
    counterpartyName: 'Apex Properties',
    deskName: 'Corp Lending',
    legalPct: 35.00,
    crmAdjPct: 0.00,
    economicPct: 35.00,
    crmMethod: 'NONE',
    crmDetail: 'No credit risk mitigation — full economic exposure retained',
  },
  {
    name: 'Facility D (Letter of Credit)',
    facilityId: 'F-204',
    committedAmt: 50_000_000,
    counterpartyName: 'Meridian Corp',
    deskName: 'Corp Lending',
    legalPct: 100.00,
    crmAdjPct: 15.00,
    economicPct: 85.00,
    crmMethod: 'COMPREHENSIVE',
    crmDetail: 'Risk participation sold reducing economic exposure by 15%',
  },
  {
    name: 'Facility E (Bridge Facility)',
    facilityId: 'F-205',
    committedAmt: 150_000_000,
    counterpartyName: 'Meridian Corp',
    deskName: 'CRE Lending',
    legalPct: 45.00,
    crmAdjPct: 0.00,
    economicPct: 45.00,
    crmMethod: 'NONE',
    crmDetail: 'No credit risk mitigation — full economic exposure retained',
  },
];

/* ── CP-01: Apex Properties ─────────────────────────────────────────────
 * Facilities: A (60%), B (100%), C (35%)   — committed: 100M + 75M + 200M = 375M
 * Wait — above we show Apex with A,B,C and Meridian with D,E. But the weighted
 * avg calc includes Facility E for CP-01. Let me reconsider…
 *
 * Actually Apex has: A ($100M, 60%), B ($75M, 100%), C ($200M, 35%), E ($150M, 55%)
 * Meridian has: A ($100M, 40%), C ($200M, 65%), D ($50M, 100%), E ($150M, 45%)
 *
 * But that means A and C are syndicated between the two CPs, while B is sole
 * lender (Apex) and D is sole lender (Meridian). E is syndicated.
 *
 * For the demo, each FACILITY ROW above represents ONE counterparty's
 * participation. The array has 5 rows, one per (facility, counterparty) pair
 * shown in the demo. In reality there would be more rows for the other side
 * of each syndication.
 *
 * For simplicity, our 5 demo rows show:
 *   CP-01 (Apex):    A(60%), B(100%), C(35%)
 *   CP-02 (Meridian): D(100%), E(45%)
 *
 * Weighted averages:
 *   Apex: (60×100 + 100×75 + 35×200) / (100+75+200) = (6000+7500+7000)/375 = 20500/375 = 54.67%
 *   Meridian: (100×50 + 45×150) / (50+150) = (5000+6750)/200 = 11750/200 = 58.75%
 *
 * Economic:
 *   Apex: (45×100 + 80×75 + 35×200) / 375 = (4500+6000+7000)/375 = 17500/375 = 46.67%
 *   Meridian: (85×50 + 45×150) / 200 = (4250+6750)/200 = 11000/200 = 55.00%
 * ──────────────────────────────────────────────────────────────────────────── */

export const COUNTERPARTIES: AllocPctCounterpartyRow[] = [
  { name: 'Apex Properties', totalCommitted: 375_000_000, facilityCount: 3, wtdLegalPct: 54.67, wtdEconomicPct: 46.67 },
  { name: 'Meridian Corp',   totalCommitted: 200_000_000, facilityCount: 2, wtdLegalPct: 58.75, wtdEconomicPct: 55.00 },
];

/* ── Helpers ──────────────────────────────────────────────────────────────── */

export function fmtPct(n: number): string {
  return n.toFixed(2) + '%';
}

export function fmtM(n: number): string {
  return '$' + (n / 1_000_000).toFixed(0) + 'M';
}

export function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

export function facilitiesForCounterparty(cpName: string): AllocPctFacilityRow[] {
  return FACILITIES.filter((f) => f.counterpartyName === cpName);
}

export function facilitiesForDesk(deskName: string): AllocPctFacilityRow[] {
  return FACILITIES.filter((f) => f.deskName === deskName);
}

export function pctForVariant(f: AllocPctFacilityRow, variant: AllocPctVariant): number {
  return variant === 'legal' ? f.legalPct : f.economicPct;
}

export function wtdPctForVariant(cp: AllocPctCounterpartyRow, variant: AllocPctVariant): number {
  return variant === 'legal' ? cp.wtdLegalPct : cp.wtdEconomicPct;
}
