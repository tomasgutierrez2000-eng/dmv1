/**
 * Committed Amount Lineage — API-ready types and sample data
 *
 * Structure allows swapping mock data for API responses later.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * TYPES (API-ready)
 * ──────────────────────────────────────────────────────────────────────────── */

export interface FacilityCommitted {
  facility_id: string;
  total_commitment: number;
  currency_code: string;
  fx_rate: number;
  bank_share_pct: number;
  committed_usd: number;
  as_of_date?: string;
}

export interface CounterpartyCommitted {
  counterparty_id: string;
  ultimate_parent_id: string;
  attributed_exposure_usd: number;
  attribution_pct?: number;
  committed_usd: number; // SUM by ultimate_parent when aggregated
  as_of_date?: string;
}

export interface RollupLevelSample {
  level: 'facility' | 'counterparty' | 'L3' | 'L2' | 'L1' | 'L0';
  label: string;
  committed_usd: number;
  segment_id?: number;
  facility_count?: number;
  counterparty_count?: number;
}

/* ────────────────────────────────────────────────────────────────────────────
 * SAMPLE DATA — Facility path (2 facilities)
 * ──────────────────────────────────────────────────────────────────────────── */

export const SAMPLE_FACILITY_COMMITTED: FacilityCommitted[] = [
  {
    facility_id: 'F-7001',
    total_commitment: 50_000_000,
    currency_code: 'USD',
    fx_rate: 1.0,
    bank_share_pct: 0.4,
    committed_usd: 20_000_000,
    as_of_date: '2025-02-28',
  },
  {
    facility_id: 'F-7002',
    total_commitment: 80_000_000,
    currency_code: 'EUR',
    fx_rate: 1.08,
    bank_share_pct: 0.25,
    committed_usd: 21_600_000, // 80M × 1.08 × 0.25
    as_of_date: '2025-02-28',
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * SAMPLE DATA — Counterparty path (2 counterparties under one ultimate parent)
 * ──────────────────────────────────────────────────────────────────────────── */

export const SAMPLE_COUNTERPARTY_ATTRIBUTION: CounterpartyCommitted[] = [
  {
    counterparty_id: 'CP-801',
    ultimate_parent_id: 'UP-100',
    attributed_exposure_usd: 12_000_000,
    attribution_pct: 100,
    committed_usd: 28_800_000, // sum for UP-100
    as_of_date: '2025-02-28',
  },
  {
    counterparty_id: 'CP-802',
    ultimate_parent_id: 'UP-100',
    attributed_exposure_usd: 16_800_000,
    attribution_pct: 60,
    committed_usd: 28_800_000,
    as_of_date: '2025-02-28',
  },
];

/** Sum of attributed_exposure_usd for ultimate parent (derived so it stays in sync with sample rows) */
export const SAMPLE_ULTIMATE_PARENT_COMMITTED = SAMPLE_COUNTERPARTY_ATTRIBUTION.reduce(
  (sum, row) => sum + row.attributed_exposure_usd,
  0
);

/* ────────────────────────────────────────────────────────────────────────────
 * SAMPLE DATA — Rollup levels (for display in hierarchy section)
 * ──────────────────────────────────────────────────────────────────────────── */

export const SAMPLE_ROLLUP_LEVELS: RollupLevelSample[] = [
  { level: 'facility', label: 'Facility', committed_usd: 41_600_000, facility_count: 2 },
  { level: 'counterparty', label: 'Counterparty (Ultimate Parent)', committed_usd: 28_800_000, counterparty_count: 2 },
  { level: 'L3', label: 'Desk (L3)', committed_usd: 125_000_000, segment_id: 42, facility_count: 8 },
  { level: 'L2', label: 'Portfolio (L2)', committed_usd: 380_000_000, segment_id: 12, facility_count: 24 },
  { level: 'L1', label: 'Line of Business (L1)', committed_usd: 1_200_000_000, segment_id: 1, facility_count: 95 },
  { level: 'L0', label: 'Enterprise (L0)', committed_usd: 9_500_000_000, facility_count: 720 },
];
