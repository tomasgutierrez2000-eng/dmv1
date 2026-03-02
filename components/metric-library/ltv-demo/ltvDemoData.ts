/* ────────────────────────────────────────────────────────────────────────────
 * LTV Lineage Demo — Sample Data
 *
 * All numbers are realistic CRE examples. Math is verified:
 *   F-10042: $10,500,000 / $15,000,000 = 70.0%
 *   F-10043: $7,800,000  / $12,580,645 = 62.0%
 *   F-10044: $4,200,000  / $5,384,615  = 78.0%
 *   Counterparty Wtd Avg: 68.7%
 * ──────────────────────────────────────────────────────────────────────────── */

/* ── Formatting helpers ────────────────────────────────────────────────────── */

export function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

export function fmtM(n: number): string {
  return '$' + (n / 1_000_000).toFixed(1) + 'M';
}

export function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + '%';
}

/* ── Example Facility ──────────────────────────────────────────────────────── */

export const EXAMPLE_FACILITY = {
  facility_id: 'F-10042',
  counterparty_id: 'CP-2001',
  counterparty_name: 'Meridian Office Partners LLC',
  lob_segment_id: 'L1-002-L2-03-L3-04',
  facility_type: 'Term Loan CRE',
  committed_facility_amt: 12_000_000,
  drawn_amount: 10_500_000,
  gross_exposure_usd: 12_000_000,
  collateral_valuation: 15_000_000,
  collateral_asset_id: 'COL-5501',
  collateral_type: 'Commercial Office Building',
  collateral_description: '200 Market Street, San Francisco — Class A, 180,000 sqft',
  ltv: 0.70,
  as_of_date: '2025-03-31',
};

/* ── Taxonomy Hierarchy Path ───────────────────────────────────────────────── */

export interface TaxonomyNode {
  managed_segment_id: string;
  segment_name: string;
  parent_segment_id: string | null;
  tree_level: number;
  level_label: string;
}

export const TAXONOMY_PATH: TaxonomyNode[] = [
  {
    managed_segment_id: 'L1-002-L2-03-L3-04',
    segment_name: 'CRE Origination Desk',
    parent_segment_id: 'L1-002-L2-03',
    tree_level: 3,
    level_label: 'L3 — Desk',
  },
  {
    managed_segment_id: 'L1-002-L2-03',
    segment_name: 'Commercial Real Estate',
    parent_segment_id: 'L1-002',
    tree_level: 2,
    level_label: 'L2 — Portfolio',
  },
  {
    managed_segment_id: 'L1-002',
    segment_name: 'Corporate & Investment Banking',
    parent_segment_id: 'L0-001',
    tree_level: 1,
    level_label: 'L1 — Line of Business',
  },
];

/* ── Table Schemas (for mini table display) ────────────────────────────────── */

export interface TableField {
  name: string;
  type: string;
  pk?: boolean;
  fk?: string;
  value: string;
  highlight?: 'numerator' | 'denominator' | 'fk';
}

export interface TableSchema {
  layer: string;
  label: string;
  description: string;
  fields: TableField[];
}

export const TABLE_SCHEMAS: Record<string, TableSchema> = {
  facility_master: {
    layer: 'L1',
    label: 'facility_master',
    description: 'Master record for each credit facility — the anchor table',
    fields: [
      { name: 'facility_id', type: 'BIGINT', pk: true, value: 'F-10042' },
      { name: 'counterparty_id', type: 'BIGINT', fk: 'counterparty', value: 'CP-2001', highlight: 'fk' },
      { name: 'lob_segment_id', type: 'BIGINT', fk: 'enterprise_business_taxonomy', value: 'L1-002-L2-03-L3-04', highlight: 'fk' },
      { name: 'facility_type', type: 'VARCHAR', value: 'Term Loan CRE' },
      { name: 'committed_facility_amt', type: 'DECIMAL', value: '$12,000,000' },
    ],
  },
  facility_exposure_snapshot: {
    layer: 'L2',
    label: 'facility_exposure_snapshot',
    description: 'Point-in-time exposure readings — changes every reporting date',
    fields: [
      { name: 'facility_id', type: 'BIGINT', pk: true, fk: 'facility_master', value: 'F-10042', highlight: 'fk' },
      { name: 'as_of_date', type: 'DATE', pk: true, value: '2025-03-31' },
      { name: 'drawn_amount', type: 'DECIMAL', value: '$10,500,000', highlight: 'numerator' },
      { name: 'gross_exposure_usd', type: 'DECIMAL', value: '$12,000,000' },
    ],
  },
  collateral_snapshot: {
    layer: 'L2',
    label: 'collateral_snapshot',
    description: 'Point-in-time collateral valuations — typically annual appraisals for CRE',
    fields: [
      { name: 'facility_id', type: 'BIGINT', pk: true, fk: 'facility_master', value: 'F-10042', highlight: 'fk' },
      { name: 'as_of_date', type: 'DATE', pk: true, value: '2025-03-31' },
      { name: 'current_valuation_usd', type: 'DECIMAL', value: '$15,000,000', highlight: 'denominator' },
      { name: 'collateral_type', type: 'VARCHAR', value: 'Office Building' },
    ],
  },
  enterprise_business_taxonomy: {
    layer: 'L1',
    label: 'enterprise_business_taxonomy',
    description: 'Hierarchical org structure — Desk / Portfolio / Line of Business',
    fields: [
      { name: 'managed_segment_id', type: 'BIGINT', pk: true, value: 'L1-002-L2-03-L3-04', highlight: 'fk' },
      { name: 'segment_name', type: 'VARCHAR', value: 'CRE Origination Desk' },
      { name: 'parent_segment_id', type: 'BIGINT', fk: 'self', value: 'L1-002-L2-03', highlight: 'fk' },
      { name: 'tree_level', type: 'INTEGER', value: '3' },
    ],
  },
};

/* ── Rollup Data — Facilities ──────────────────────────────────────────────── */

export interface LTVFacilityRow {
  name: string;
  facilityId: string;
  facilityType: string;
  collateralDesc: string;
  drawnAmount: number;
  collateralValue: number;
  ltv: number;
  exposure: number;
}

export const FACILITIES: LTVFacilityRow[] = [
  {
    name: 'Office Building',
    facilityId: 'F-10042',
    facilityType: 'Term Loan',
    collateralDesc: '200 Market St, SF',
    drawnAmount: 10_500_000,
    collateralValue: 15_000_000,
    ltv: 0.70,
    exposure: 10_500_000,
  },
  {
    name: 'Retail Center',
    facilityId: 'F-10043',
    facilityType: 'Term Loan',
    collateralDesc: 'Meridian Retail, Oakland',
    drawnAmount: 7_800_000,
    collateralValue: 12_580_645,
    ltv: 0.62,
    exposure: 7_800_000,
  },
  {
    name: 'Warehouse',
    facilityId: 'F-10044',
    facilityType: 'Revolver',
    collateralDesc: 'Bay Logistics, Hayward',
    drawnAmount: 4_200_000,
    collateralValue: 5_384_615,
    ltv: 0.78,
    exposure: 4_200_000,
  },
];

/* ── Rollup Data — Counterparties (for desk-level aggregation) ─────────────── */

export interface LTVCounterpartyRow {
  name: string;
  ltv: number;
  exposure: number;
}

export const DESK_COUNTERPARTIES: LTVCounterpartyRow[] = [
  { name: 'Meridian Office Partners', ltv: 0.687, exposure: 22_500_000 },
  { name: 'Apex Retail Holdings', ltv: 0.72, exposure: 35_000_000 },
  { name: 'Summit Industrial REIT', ltv: 0.58, exposure: 18_000_000 },
];

/* ── Rollup Data — Portfolio distribution buckets ──────────────────────────── */

export interface LTVBucket {
  label: string;
  count: number;
  exposure: number;
  color: string;
}

export const PORTFOLIO_BUCKETS: LTVBucket[] = [
  { label: '< 60%', count: 18, exposure: 280_000_000, color: 'emerald' },
  { label: '60 — 70%', count: 24, exposure: 420_000_000, color: 'blue' },
  { label: '70 — 80%', count: 15, exposure: 310_000_000, color: 'amber' },
  { label: '> 80%', count: 6, exposure: 90_000_000, color: 'red' },
];

/* ── Computation helpers ───────────────────────────────────────────────────── */

export function exposureWeightedLTV(rows: { ltv: number; exposure: number }[]): number {
  const totalWtd = rows.reduce((sum, r) => sum + r.ltv * r.exposure, 0);
  const totalExp = rows.reduce((sum, r) => sum + r.exposure, 0);
  return totalWtd / totalExp;
}

/** Counterparty-level weighted LTV for FACILITIES */
export const COUNTERPARTY_WEIGHTED_LTV = exposureWeightedLTV(FACILITIES);
// Verified: (0.70*10.5M + 0.62*7.8M + 0.78*4.2M) / (10.5M+7.8M+4.2M) = 0.6867 ≈ 68.7%

/** Desk-level weighted LTV across counterparties */
export const DESK_WEIGHTED_LTV = exposureWeightedLTV(DESK_COUNTERPARTIES);
// (0.687*22.5M + 0.72*35M + 0.58*18M) / (22.5M+35M+18M) ≈ 67.3%
