/* ────────────────────────────────────────────────────────────────────────────
 * Counterparty Allocation % Lineage Demo — Sample Rollup Data
 *
 * Single variant: participation_pct from facility_counterparty_participation (L1)
 *
 * Rollup: Raw at both facility and counterparty levels.
 *         N/A at desk / portfolio / lob (relationship metric)
 *
 * Math is pre-verified — totals are consistent.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface AllocPctFacilityRow {
  name: string;
  facilityId: string;
  committedAmt: number;
  counterpartyName: string;
  deskName: string;
  participationPct: number;
}

export interface AllocPctCounterpartyRow {
  name: string;
  totalCommitted: number;
  facilityCount: number;
}

/* ── Facilities ────────────────────────────────────────────────────────────
 * Each row represents a (facility, counterparty) pair — a single
 * counterparty's participation in one facility.
 *
 * participation_pct is looked up directly from
 * facility_counterparty_participation for each (facility_id, counterparty_id).
 * ──────────────────────────────────────────────────────────────────────────── */

export const FACILITIES: AllocPctFacilityRow[] = [
  {
    name: 'Facility A (Syndicated Revolver)',
    facilityId: 'F-201',
    committedAmt: 100_000_000,
    counterpartyName: 'Apex Properties',
    deskName: 'CRE Lending',
    participationPct: 60.00,
  },
  {
    name: 'Facility B (Term Loan A)',
    facilityId: 'F-202',
    committedAmt: 75_000_000,
    counterpartyName: 'Apex Properties',
    deskName: 'CRE Lending',
    participationPct: 100.00,
  },
  {
    name: 'Facility C (Syndicated Term Loan)',
    facilityId: 'F-203',
    committedAmt: 200_000_000,
    counterpartyName: 'Apex Properties',
    deskName: 'Corp Lending',
    participationPct: 35.00,
  },
  {
    name: 'Facility D (Letter of Credit)',
    facilityId: 'F-204',
    committedAmt: 50_000_000,
    counterpartyName: 'Meridian Corp',
    deskName: 'Corp Lending',
    participationPct: 100.00,
  },
  {
    name: 'Facility E (Bridge Facility)',
    facilityId: 'F-205',
    committedAmt: 150_000_000,
    counterpartyName: 'Meridian Corp',
    deskName: 'CRE Lending',
    participationPct: 45.00,
  },
];

/* ── Counterparties ───────────────────────────────────────────────────────
 * At counterparty level, each facility's participation_pct is a raw lookup.
 * No weighted average — each row retains its own participation_pct.
 * ──────────────────────────────────────────────────────────────────────────── */

export const COUNTERPARTIES: AllocPctCounterpartyRow[] = [
  { name: 'Apex Properties', totalCommitted: 375_000_000, facilityCount: 3 },
  { name: 'Meridian Corp',   totalCommitted: 200_000_000, facilityCount: 2 },
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
