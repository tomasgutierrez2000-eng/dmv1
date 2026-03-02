import {
  Database,
  Building2,
  Users,
  Briefcase,
  FolderTree,
  PieChart,
  Calculator,
  Layers,
  Search,
  Zap,
  Sparkles,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import type {
  StepType,
  SourceTableMeta,
  SourceFieldMeta,
  Ingredient,
  LineageStep,
  TierSourceConfig,
  JoinHop,
  JoinChainData,
} from '../lineage-types';

/* ────────────────────────────────────────────────────────────────────────────
 * RE-EXPORTED TYPES FROM lineage-types (for convenience)
 * ──────────────────────────────────────────────────────────────────────────── */
export type { StepType, SourceTableMeta, SourceFieldMeta, Ingredient, LineageStep, TierSourceConfig, JoinHop, JoinChainData };

/* ────────────────────────────────────────────────────────────────────────────
 * COMPONENT METADATA — for X-Ray expandable rows
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ComponentMeta {
  field: string;
  table: string;
  type: string;
  desc: string;
  where?: string;
  fk?: string;
  sampleValue: string;
  stepType: StepType;
}

/* ────────────────────────────────────────────────────────────────────────────
 * COLLATERAL ITEM
 * ──────────────────────────────────────────────────────────────────────────── */

export interface CollateralItem {
  collateralId: string;
  type: string;
  valuation: number;
  haircut?: number;
}

/* ────────────────────────────────────────────────────────────────────────────
 * FACILITY LTV DATA — sample data for 3 facilities under one counterparty
 *
 * Math verified:
 *   F-7001: 18,500,000 / 25,200,000 = 73.41%
 *   F-7002: 45,000,000 / 52,000,000 = 86.54%
 *   F-7003: 12,000,000 / 25,500,000 = 47.06%
 *
 *   Counterparty weighted LTV:
 *     = (0.7341 × 20M + 0.8654 × 50M + 0.4706 × 15M) / (20M + 50M + 15M)
 *     = (14,682,000 + 43,270,000 + 7,059,000) / 85,000,000
 *     = 65,011,000 / 85,000,000 = 76.48%
 * ──────────────────────────────────────────────────────────────────────────── */

export interface FacilityLTVData {
  facilityId: string;
  facilityName: string;
  drawnAmount: number;
  collateralItems: CollateralItem[];
  totalCollateralValue: number;
  ltv: number;
  grossExposure: number;
}

export const FACILITY_DATA: FacilityLTVData[] = [
  {
    facilityId: 'F-7001',
    facilityName: 'Sunrise Towers — CRE Term Loan',
    drawnAmount: 18_500_000,
    collateralItems: [
      { collateralId: 'COL-101', type: 'Real Estate', valuation: 24_000_000, haircut: 0 },
      { collateralId: 'COL-102', type: 'Equipment', valuation: 1_200_000, haircut: 0.15 },
    ],
    totalCollateralValue: 25_200_000,
    ltv: 0.7341,
    grossExposure: 20_000_000,
  },
  {
    facilityId: 'F-7002',
    facilityName: 'Harbor View — CRE Revolver',
    drawnAmount: 45_000_000,
    collateralItems: [
      { collateralId: 'COL-201', type: 'Real Estate', valuation: 52_000_000, haircut: 0 },
    ],
    totalCollateralValue: 52_000_000,
    ltv: 0.8654,
    grossExposure: 50_000_000,
  },
  {
    facilityId: 'F-7003',
    facilityName: 'Meridian Office — Construction Loan',
    drawnAmount: 12_000_000,
    collateralItems: [
      { collateralId: 'COL-301', type: 'Real Estate', valuation: 18_000_000, haircut: 0 },
      { collateralId: 'COL-302', type: 'Cash Deposit', valuation: 2_500_000, haircut: 0 },
      { collateralId: 'COL-303', type: 'Personal Guarantee', valuation: 5_000_000, haircut: 0.25 },
    ],
    totalCollateralValue: 25_500_000,
    ltv: 0.4706,
    grossExposure: 15_000_000,
  },
];

export const COUNTERPARTY_WEIGHTED_LTV = 0.7648;

/* ────────────────────────────────────────────────────────────────────────────
 * LTV DISTRIBUTION BUCKETS
 * ──────────────────────────────────────────────────────────────────────────── */

export const LTV_BUCKETS = [
  { range: '< 50%', status: 'Strong', count: 12, exposure: 320, color: 'text-emerald-300', bg: 'bg-emerald-500/10' },
  { range: '50 – 70%', status: 'Good', count: 18, exposure: 680, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { range: '70 – 80%', status: 'Adequate', count: 15, exposure: 520, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { range: '80 – 90%', status: 'Watch', count: 8, exposure: 290, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { range: '> 90%', status: 'Critical', count: 4, exposure: 95, color: 'text-red-400', bg: 'bg-red-500/10' },
] as const;

/* ────────────────────────────────────────────────────────────────────────────
 * ROLLUP LEVELS — 5 levels with LTV-specific descriptions
 * ──────────────────────────────────────────────────────────────────────────── */

export interface RollupLevel {
  key: string;
  label: string;
  icon: React.ElementType;
  method: string;
  tier: string;
  color: string;
  purpose: string;
  description: string;
}

export const ROLLUP_LEVELS: RollupLevel[] = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Building2,
    method: 'Direct Calculation',
    tier: 'T2',
    color: 'amber',
    purpose: 'Underwriting, covenant compliance',
    description: 'LTV = drawn_amount / SUM(collateral_value). Each facility has one LTV ratio computed from its drawn balance and total pledged collateral.',
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    method: 'Exposure-Weighted Average',
    tier: 'T3',
    color: 'emerald',
    purpose: 'Obligor-level credit assessment',
    description: 'SUM(LTV × gross_exposure) / SUM(gross_exposure) across all facilities for this borrower. Larger loans contribute more to the overall LTV.',
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    method: 'Exposure-Weighted Average',
    tier: 'T3',
    color: 'emerald',
    purpose: 'Book quality monitoring',
    description: 'Exposure-weighted LTV across all counterparties in the desk. Segmented by product type to keep comparisons meaningful.',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    method: 'Exposure-Weighted Average + Distribution',
    tier: 'T3',
    color: 'emerald',
    purpose: 'Portfolio health trending',
    description: 'Exposure-weighted average LTV across all desks in the portfolio, plus distribution buckets (<50%, 50-70%, 70-80%, 80-90%, >90%) to reveal concentration risk.',
  },
  {
    key: 'lob',
    label: 'Line of Business',
    icon: PieChart,
    method: 'Exposure-Weighted Average',
    tier: 'T3',
    color: 'emerald',
    purpose: 'Directional early warning',
    description: 'Exposure-weighted average LTV across all portfolios in the LoB. Used as a trend indicator — not a limit metric. Appraisal staleness caveat applies.',
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * BREADCRUMB STEPS
 * ──────────────────────────────────────────────────────────────────────────── */

export interface BreadcrumbStep {
  id: string;
  label: string;
  layer: string;
  color: string;
  anchor: string;
  tables?: string[];
}

export const BREADCRUMB_STEPS: BreadcrumbStep[] = [
  { id: 'definition', label: 'Definition', layer: 'Metric', color: 'teal', anchor: 'definition' },
  { id: 'join-map', label: 'Join Map', layer: 'Plumbing', color: 'cyan', anchor: 'join-map', tables: ['facility_master', 'collateral_snapshot', 'facility_exposure_snapshot'] },
  { id: 'l1-reference', label: 'L1 Reference', layer: 'L1', color: 'blue', anchor: 'l1-reference', tables: ['facility_master', 'counterparty', 'collateral_asset_master'] },
  { id: 'l2-snapshot', label: 'L2 Snapshot', layer: 'L2', color: 'amber', anchor: 'l2-snapshot', tables: ['facility_exposure_snapshot', 'collateral_snapshot'] },
  { id: 'query-plan', label: 'Query Plan', layer: 'Engine', color: 'purple', anchor: 'query-plan' },
  { id: 'calculation', label: 'Calculation', layer: 'Calc', color: 'emerald', anchor: 'calculation' },
  { id: 'data-flow', label: 'Data Flow', layer: 'Trace', color: 'amber', anchor: 'data-flow' },
  { id: 'rollup', label: 'Rollup', layer: 'Hierarchy', color: 'emerald', anchor: 'rollup' },
  { id: 'audit-trail', label: 'Audit Trail', layer: 'Validate', color: 'emerald', anchor: 'audit-trail' },
];

/* ────────────────────────────────────────────────────────────────────────────
 * FK RELATIONSHIPS — for FKExplorer
 * ──────────────────────────────────────────────────────────────────────────── */

export interface FKRelationship {
  from: string;
  to: string;
  joinKey: string;
  why: string;
  cardinality: string;
}

export const FK_RELATIONSHIPS: FKRelationship[] = [
  {
    from: 'facility_exposure_snapshot',
    to: 'facility_master',
    joinKey: 'facility_id',
    why: 'Links each exposure snapshot to the facility it belongs to — the starting point for LTV calculation.',
    cardinality: '1:1 — one snapshot per facility per date',
  },
  {
    from: 'collateral_snapshot',
    to: 'facility_master',
    joinKey: 'facility_id',
    why: 'Links collateral valuations to their pledged facility. A facility may have N collateral items, so this is a 1:N relationship that requires SUM aggregation.',
    cardinality: 'N:1 — multiple collateral items per facility',
  },
  {
    from: 'collateral_snapshot',
    to: 'collateral_asset_master',
    joinKey: 'collateral_asset_id',
    why: 'Resolves the collateral type (Real Estate, Equipment, Cash, Guarantee) from the master reference table.',
    cardinality: '1:1 — one asset master record per collateral item',
  },
  {
    from: 'facility_master',
    to: 'counterparty',
    joinKey: 'counterparty_id',
    why: 'Identifies the borrower for this facility — used for counterparty-level LTV rollup.',
    cardinality: 'N:1 — multiple facilities may belong to one counterparty',
  },
  {
    from: 'facility_master',
    to: 'enterprise_business_taxonomy',
    joinKey: 'lob_segment_id → managed_segment_id',
    why: 'Maps each facility to a business unit (L3 desk → L2 portfolio → L1 LoB) for hierarchical rollup.',
    cardinality: '1:1 — one taxonomy node per facility',
  },
  {
    from: 'enterprise_business_taxonomy',
    to: 'enterprise_business_taxonomy',
    joinKey: 'parent_segment_id → managed_segment_id',
    why: 'Self-referencing join to walk up the LoB hierarchy: desk → portfolio → LoB root.',
    cardinality: '1:1 — each child has exactly one parent',
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * L1 TABLE DEFINITIONS
 * ──────────────────────────────────────────────────────────────────────────── */

export interface L1TableDef {
  tableName: string;
  scd: string;
  role: string;
  columns: { name: string; type: string; pk?: boolean; fk?: string; nullable?: boolean }[];
  sampleRow: Record<string, string | number>;
}

export const L1_TABLES: L1TableDef[] = [
  {
    tableName: 'facility_master',
    scd: 'SCD-2',
    role: 'Central hub — identifies the loan, its currency, counterparty, and LoB hierarchy linkage. LTV calculation joins here to get counterparty_id for rollup.',
    columns: [
      { name: 'facility_id', type: 'BIGINT', pk: true },
      { name: 'facility_name', type: 'VARCHAR(200)' },
      { name: 'facility_type', type: 'VARCHAR(50)' },
      { name: 'counterparty_id', type: 'BIGINT', fk: 'counterparty' },
      { name: 'credit_agreement_id', type: 'BIGINT', fk: 'credit_agreement_master' },
      { name: 'lob_segment_id', type: 'BIGINT', fk: 'enterprise_business_taxonomy' },
      { name: 'currency_code', type: 'VARCHAR(20)', fk: 'currency_dim' },
    ],
    sampleRow: { facility_id: 7001, facility_name: 'Sunrise Towers — CRE Term Loan', facility_type: 'CRE', counterparty_id: 8001, lob_segment_id: 100 },
  },
  {
    tableName: 'counterparty',
    scd: 'SCD-2',
    role: 'Borrower identity — used to group facilities for counterparty-level LTV rollup and to resolve the obligor for risk assessment.',
    columns: [
      { name: 'counterparty_id', type: 'BIGINT', pk: true },
      { name: 'legal_name', type: 'VARCHAR(200)' },
      { name: 'counterparty_type', type: 'VARCHAR(50)' },
      { name: 'internal_risk_rating', type: 'VARCHAR(10)' },
      { name: 'industry_id', type: 'BIGINT', fk: 'industry_dim' },
      { name: 'country_code', type: 'VARCHAR(3)', fk: 'country_dim' },
    ],
    sampleRow: { counterparty_id: 8001, legal_name: 'Sunrise Properties LLC', counterparty_type: 'CORPORATE', internal_risk_rating: 'BB+' },
  },
  {
    tableName: 'collateral_asset_master',
    scd: 'SCD-2',
    role: 'Collateral identity — describes the asset type and links to CRM type classification. Essential for understanding what secures the loan.',
    columns: [
      { name: 'collateral_asset_id', type: 'BIGINT', pk: true },
      { name: 'asset_description', type: 'VARCHAR(200)' },
      { name: 'crm_type_code', type: 'VARCHAR(20)', fk: 'crm_type_dim' },
      { name: 'mitigant_group_code', type: 'VARCHAR(20)' },
      { name: 'mitigant_subtype', type: 'VARCHAR(50)' },
    ],
    sampleRow: { collateral_asset_id: 101, asset_description: '24-unit apartment complex', crm_type_code: 'REAL_ESTATE', mitigant_group_code: 'FIN_COLL' },
  },
  {
    tableName: 'enterprise_business_taxonomy',
    scd: 'SCD-1',
    role: 'LoB hierarchy — self-referencing tree for desk → portfolio → LoB rollup. Drives LTV aggregation at L3/L2/L1 levels.',
    columns: [
      { name: 'managed_segment_id', type: 'BIGINT', pk: true },
      { name: 'segment_code', type: 'VARCHAR(50)' },
      { name: 'segment_name', type: 'VARCHAR(200)' },
      { name: 'tree_level', type: 'INTEGER' },
      { name: 'parent_segment_id', type: 'BIGINT', fk: 'enterprise_business_taxonomy' },
    ],
    sampleRow: { managed_segment_id: 100, segment_code: 'CRE_DESK', segment_name: 'CRE Lending Desk', tree_level: 3, parent_segment_id: 10 },
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * L2 FIELD METADATA — for X-Ray mode
 * ──────────────────────────────────────────────────────────────────────────── */

export const L2_FIELD_META: Record<string, ComponentMeta> = {
  'facility_exposure_snapshot.drawn_amount': {
    field: 'drawn_amount',
    table: 'facility_exposure_snapshot',
    type: 'DECIMAL(18,2)',
    desc: 'Current drawn balance on the facility — the numerator of the LTV ratio. Represents how much of the committed amount has actually been funded.',
    fk: 'facility_id → facility_master.facility_id',
    sampleValue: '$18,500,000',
    stepType: 'SOURCING',
  },
  'facility_exposure_snapshot.gross_exposure_usd': {
    field: 'gross_exposure_usd',
    table: 'facility_exposure_snapshot',
    type: 'DECIMAL(18,2)',
    desc: 'Total gross exposure in USD — used as the weighting basis for LTV rollups above facility level.',
    fk: 'facility_id → facility_master.facility_id',
    sampleValue: '$20,000,000',
    stepType: 'SOURCING',
  },
  'facility_exposure_snapshot.facility_id': {
    field: 'facility_id',
    table: 'facility_exposure_snapshot',
    type: 'BIGINT',
    desc: 'Foreign key linking exposure data to the facility master record.',
    fk: 'facility_id → facility_master.facility_id',
    sampleValue: '7001',
    stepType: 'SOURCING',
  },
  'facility_exposure_snapshot.as_of_date': {
    field: 'as_of_date',
    table: 'facility_exposure_snapshot',
    type: 'DATE',
    desc: 'Snapshot date — determines which business day the exposure is measured.',
    sampleValue: '2025-01-31',
    stepType: 'SOURCING',
  },
  'collateral_snapshot.current_valuation_usd': {
    field: 'current_valuation_usd',
    table: 'collateral_snapshot',
    type: 'DECIMAL(18,2)',
    desc: 'Current market valuation of a single collateral item in USD. Multiple items per facility must be SUMmed — this is the HYBRID step.',
    fk: 'facility_id → facility_master.facility_id',
    where: 'GROUP BY facility_id, as_of_date (aggregated across N collateral items)',
    sampleValue: '$24,000,000 (one item)',
    stepType: 'HYBRID',
  },
  'collateral_snapshot.facility_id': {
    field: 'facility_id',
    table: 'collateral_snapshot',
    type: 'BIGINT',
    desc: 'Links this collateral item to the facility it secures.',
    fk: 'facility_id → facility_master.facility_id',
    sampleValue: '7001',
    stepType: 'SOURCING',
  },
  'collateral_snapshot.collateral_asset_id': {
    field: 'collateral_asset_id',
    table: 'collateral_snapshot',
    type: 'BIGINT',
    desc: 'Links to collateral_asset_master for type classification.',
    fk: 'collateral_asset_id → collateral_asset_master.collateral_asset_id',
    sampleValue: '101',
    stepType: 'SOURCING',
  },
  'collateral_snapshot.as_of_date': {
    field: 'as_of_date',
    table: 'collateral_snapshot',
    type: 'DATE',
    desc: 'Valuation date — critical for appraisal staleness checks.',
    sampleValue: '2025-01-31',
    stepType: 'SOURCING',
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * LTV FORMULA COMPONENTS — for the definition card
 * ──────────────────────────────────────────────────────────────────────────── */

export const LTV_NUMERATOR_COMPONENTS: ComponentMeta[] = [
  {
    field: 'drawn_amount',
    table: 'L2.facility_exposure_snapshot',
    type: 'DECIMAL(18,2)',
    desc: 'Current drawn balance on the facility — amount actually funded and outstanding',
    fk: 'facility_id → facility_master.facility_id',
    sampleValue: '$18,500,000 (F-7001)',
    stepType: 'SOURCING',
  },
];

export const LTV_DENOMINATOR_COMPONENTS: ComponentMeta[] = [
  {
    field: 'SUM(current_valuation_usd)',
    table: 'L2.collateral_snapshot',
    type: 'DECIMAL(18,2)',
    desc: 'Total collateral value — SUM of all pledged collateral items for this facility. Multiple items (Real Estate, Equipment, Cash, Guarantees) are aggregated.',
    where: 'GROUP BY facility_id, as_of_date',
    fk: 'facility_id → facility_master.facility_id, collateral_asset_id → collateral_asset_master',
    sampleValue: '$25,200,000 (F-7001: 2 items)',
    stepType: 'HYBRID',
  },
];

export const LTV_WEIGHT_COMPONENTS: ComponentMeta[] = [
  {
    field: 'gross_exposure_usd',
    table: 'L2.facility_exposure_snapshot',
    type: 'DECIMAL(18,2)',
    desc: 'Gross exposure used as weight for LTV rollups above facility level',
    fk: 'facility_id → facility_master.facility_id',
    sampleValue: '$20,000,000 (F-7001)',
    stepType: 'SOURCING',
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * JOIN MAP — nodes and edges for interactive SVG diagram
 * ──────────────────────────────────────────────────────────────────────────── */

export interface JoinNode {
  id: string;
  label: string;
  layer: string;
  x: number;
  y: number;
  color: string;
}

export interface JoinEdge {
  from: string;
  to: string;
  label: string;
}

export const JOIN_NODES: JoinNode[] = [
  // L1 (blue)
  { id: 'fm', label: 'facility_master', layer: 'L1', x: 80, y: 60, color: 'blue' },
  { id: 'cp', label: 'counterparty', layer: 'L1', x: 80, y: 130, color: 'blue' },
  { id: 'cam', label: 'collateral_asset_master', layer: 'L1', x: 80, y: 200, color: 'blue' },
  { id: 'ebt', label: 'enterprise_business_taxonomy', layer: 'L1', x: 80, y: 270, color: 'blue' },
  // L2 (amber)
  { id: 'fes', label: 'facility_exposure_snapshot', layer: 'L2', x: 330, y: 60, color: 'amber' },
  { id: 'cs', label: 'collateral_snapshot', layer: 'L2', x: 330, y: 180, color: 'amber' },
  // Transform (purple)
  { id: 'coll_agg', label: 'Collateral Aggregation\n(HYBRID: SUM per facility)', layer: 'Transform', x: 560, y: 140, color: 'purple' },
  { id: 'ltv_calc', label: 'LTV = Drawn / Collateral\n(CALCULATION)', layer: 'Transform', x: 560, y: 60, color: 'purple' },
  { id: 'rollup', label: 'Exp-Weighted Rollup\n(CALCULATION)', layer: 'Transform', x: 560, y: 220, color: 'purple' },
  // L3 (emerald)
  { id: 'mvf', label: 'metric_value_fact', layer: 'L3', x: 770, y: 140, color: 'emerald' },
];

export const JOIN_EDGES: JoinEdge[] = [
  { from: 'fes', to: 'fm', label: 'facility_id' },
  { from: 'cs', to: 'fm', label: 'facility_id' },
  { from: 'cs', to: 'cam', label: 'collateral_asset_id' },
  { from: 'fm', to: 'cp', label: 'counterparty_id' },
  { from: 'fm', to: 'ebt', label: 'lob_segment_id' },
  { from: 'fes', to: 'ltv_calc', label: 'drawn_amount' },
  { from: 'cs', to: 'coll_agg', label: 'current_valuation_usd' },
  { from: 'coll_agg', to: 'ltv_calc', label: 'collateral_value' },
  { from: 'ltv_calc', to: 'rollup', label: 'facility_ltv' },
  { from: 'fes', to: 'rollup', label: 'gross_exposure (weight)' },
  { from: 'rollup', to: 'mvf', label: 'ltv_pct' },
];

/* ────────────────────────────────────────────────────────────────────────────
 * ROLLUP JOIN CHAINS — per-level join paths
 * ──────────────────────────────────────────────────────────────────────────── */

export const ROLLUP_JOIN_CHAINS: Record<string, JoinChainData> = {
  facility: {
    hops: [
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get drawn amount & facility identity' },
      { from: 'collateral_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get collateral valuations (SUM per facility)' },
    ],
    aggregation: 'Subquery: SUM(current_valuation_usd) GROUP BY facility_id, as_of_date — then divide drawn_amount by this total',
    result: 'One LTV ratio per facility (no rollup needed)',
  },
  counterparty: {
    hops: [
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get facility data' },
      { from: 'facility_master', fromLayer: 'L1', to: 'counterparty', toLayer: 'L1', joinKey: 'counterparty_id', note: 'Facility → borrower' },
    ],
    aggregation: 'Exposure-weighted: SUM(LTV × gross_exposure) / SUM(gross_exposure) across all facilities for this counterparty',
    result: 'One weighted-average LTV per counterparty',
  },
  desk: {
    hops: [
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get facility data' },
      { from: 'facility_master', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'lob_segment_id → managed_segment_id', note: 'Facility → desk (LoB tree leaf)' },
    ],
    aggregation: 'Exposure-weighted average LTV across all counterparties in the desk',
    result: 'One weighted-average LTV per desk',
  },
  portfolio: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id → managed_segment_id', note: 'Walk tree: desk → portfolio' },
    ],
    aggregation: 'Exposure-weighted: SUM(desk_LTV × desk_exposure) / SUM(desk_exposure) across desks in portfolio',
    result: 'One weighted-average LTV per portfolio + distribution buckets',
  },
  lob: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id → managed_segment_id', note: 'Walk tree: portfolio → LoB root' },
    ],
    aggregation: 'Exposure-weighted average across all portfolios in LoB (directional trend only)',
    result: 'One trend LTV per Line of Business — monitoring, not a limit',
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * QUERY PLAN STEPS
 * ──────────────────────────────────────────────────────────────────────────── */

export interface QueryPlanStep {
  step: number;
  layer: string;
  action: string;
  tables: string[];
  sql: string;
  stepType: StepType;
}

export const QUERY_PLAN_STEPS: QueryPlanStep[] = [
  {
    step: 1,
    layer: 'L2',
    action: 'Aggregate collateral per facility',
    tables: ['collateral_snapshot'],
    sql: 'SELECT facility_id, as_of_date, SUM(current_valuation_usd) AS collateral_value_usd\nFROM L2.collateral_snapshot\nGROUP BY facility_id, as_of_date',
    stepType: 'HYBRID',
  },
  {
    step: 2,
    layer: 'L2',
    action: 'Read facility exposure',
    tables: ['facility_exposure_snapshot'],
    sql: "SELECT facility_id, drawn_amount, gross_exposure_usd\nFROM L2.facility_exposure_snapshot\nWHERE as_of_date = :as_of_date",
    stepType: 'SOURCING',
  },
  {
    step: 3,
    layer: 'L2 + L1',
    action: 'Join exposure with collateral and facility_master',
    tables: ['facility_exposure_snapshot', 'collateral_snapshot (subquery)', 'facility_master'],
    sql: "SELECT fes.facility_id, fes.drawn_amount, cs.collateral_value_usd, fes.gross_exposure_usd\nFROM L2.facility_exposure_snapshot fes\nLEFT JOIN (\n  SELECT facility_id, as_of_date, SUM(current_valuation_usd) AS collateral_value_usd\n  FROM L2.collateral_snapshot GROUP BY facility_id, as_of_date\n) cs ON cs.facility_id = fes.facility_id AND cs.as_of_date = fes.as_of_date\nLEFT JOIN L1.facility_master fm ON fm.facility_id = fes.facility_id\nWHERE fes.as_of_date = :as_of_date",
    stepType: 'SOURCING',
  },
  {
    step: 4,
    layer: 'Calc',
    action: 'Compute LTV per dimension',
    tables: [],
    sql: "SELECT {dimension_expr} AS dimension_value,\n  SUM((fes.drawn_amount / NULLIF(cs.collateral_value_usd, 0)) * fes.gross_exposure_usd)\n  / NULLIF(SUM(CASE WHEN cs.collateral_value_usd > 0 THEN fes.gross_exposure_usd ELSE 0 END), 0)\n  AS metric_value\nFROM ... (joined tables)\nGROUP BY {dimension_expr}",
    stepType: 'CALCULATION',
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * ANIMATED DATA FLOW STEPS
 * ──────────────────────────────────────────────────────────────────────────── */

export interface FlowStep {
  layer: string;
  table: string;
  action: string;
  value: string;
  detail: string;
  color: string;
  stepType: StepType;
}

export const LTV_FLOW_STEPS: FlowStep[] = [
  { layer: 'L2', table: 'facility_exposure_snapshot', action: 'Read drawn amount', value: '$18,500,000', detail: 'F-7001 drawn balance', color: 'amber', stepType: 'SOURCING' },
  { layer: 'L2', table: 'collateral_snapshot', action: 'Read collateral item 1', value: '$24,000,000', detail: 'COL-101 Real Estate', color: 'amber', stepType: 'SOURCING' },
  { layer: 'L2', table: 'collateral_snapshot', action: 'Read collateral item 2', value: '$1,200,000', detail: 'COL-102 Equipment', color: 'amber', stepType: 'SOURCING' },
  { layer: 'Agg', table: 'collateral_snapshot', action: 'SUM collateral per facility', value: '$25,200,000', detail: 'SUM(24M + 1.2M) = 25.2M', color: 'purple', stepType: 'HYBRID' },
  { layer: 'L1', table: 'facility_master', action: 'Get facility identity', value: 'F-7001', detail: 'Sunrise Towers — CRE Term Loan', color: 'blue', stepType: 'SOURCING' },
  { layer: 'Calc', table: 'LTV formula', action: 'drawn / collateral', value: '73.41%', detail: '$18.5M / $25.2M', color: 'emerald', stepType: 'CALCULATION' },
  { layer: 'L2', table: 'facility_exposure_snapshot', action: 'Read weight', value: '$20,000,000', detail: 'gross_exposure_usd for rollup', color: 'amber', stepType: 'SOURCING' },
  { layer: 'Rollup', table: 'metric_value_fact', action: 'Store facility LTV', value: '73.41%', detail: 'metric_id=LTV, level=facility', color: 'emerald', stepType: 'CALCULATION' },
];

/* ────────────────────────────────────────────────────────────────────────────
 * AUDIT TRAIL — hierarchical drill-down tree
 * ──────────────────────────────────────────────────────────────────────────── */

export interface AuditTrailNode {
  id: string;
  level: 'dashboard' | 'lob' | 'portfolio' | 'counterparty' | 'facility' | 'l2_source';
  label: string;
  sublabel?: string;
  displayValue: string;
  method?: string;
  formula?: string;
  tier?: string;
  layerColor: string;
  icon: React.ElementType;
  children?: AuditTrailNode[];
}

export const AUDIT_TRAIL: AuditTrailNode = {
  id: 'dashboard',
  level: 'dashboard',
  label: 'Portfolio CRE LTV',
  sublabel: 'Dashboard widget',
  displayValue: '76.48%',
  method: 'Exposure-Weighted Average',
  tier: 'T3',
  layerColor: 'bg-pink-500',
  icon: Layers,
  children: [
    {
      id: 'cpty-8001',
      level: 'counterparty',
      label: 'Sunrise Properties LLC',
      sublabel: 'CTP-8001',
      displayValue: '76.48%',
      method: 'Exposure-Weighted Average',
      formula: 'SUM(LTV × exposure) / SUM(exposure)',
      tier: 'T3',
      layerColor: 'bg-emerald-500',
      icon: Users,
      children: [
        {
          id: 'fac-7001',
          level: 'facility',
          label: 'Sunrise Towers — CRE Term Loan',
          sublabel: 'F-7001',
          displayValue: '73.41%',
          method: 'Direct Calculation',
          formula: 'drawn_amount / SUM(collateral_value)',
          tier: 'T2',
          layerColor: 'bg-amber-500',
          icon: Building2,
          children: [
            {
              id: 'src-drawn-7001',
              level: 'l2_source',
              label: 'drawn_amount',
              sublabel: 'L2.facility_exposure_snapshot',
              displayValue: '$18,500,000',
              layerColor: 'bg-amber-500',
              icon: Database,
            },
            {
              id: 'src-coll-7001',
              level: 'l2_source',
              label: 'SUM(current_valuation_usd)',
              sublabel: 'L2.collateral_snapshot (2 items)',
              displayValue: '$25,200,000',
              method: 'SUM aggregation (HYBRID)',
              layerColor: 'bg-purple-500',
              icon: Database,
            },
          ],
        },
        {
          id: 'fac-7002',
          level: 'facility',
          label: 'Harbor View — CRE Revolver',
          sublabel: 'F-7002',
          displayValue: '86.54%',
          method: 'Direct Calculation',
          formula: '$45M / $52M',
          tier: 'T2',
          layerColor: 'bg-amber-500',
          icon: Building2,
        },
        {
          id: 'fac-7003',
          level: 'facility',
          label: 'Meridian Office — Construction Loan',
          sublabel: 'F-7003',
          displayValue: '47.06%',
          method: 'Direct Calculation',
          formula: '$12M / $25.5M',
          tier: 'T2',
          layerColor: 'bg-amber-500',
          icon: Building2,
        },
      ],
    },
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
 * LINEAGE STEPS PER TIER — the core new data structure
 * ──────────────────────────────────────────────────────────────────────────── */

export const TIER_STEP_CONFIGS: TierSourceConfig[] = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Building2,
    method: 'Direct Calculation',
    purpose: 'Underwriting, covenant compliance',
    calcTier: 'T2',
    description: 'LTV = drawn_amount / SUM(collateral_value). Each facility has one LTV ratio.',
    sourceTables: [
      {
        table: 'facility_exposure_snapshot', layer: 'L2', alias: 'fes', role: 'source',
        fieldsUsed: [
          { field: 'drawn_amount', type: 'DECIMAL(18,2)', description: 'Loan balance (numerator)', metricRole: 'numerator_input' },
          { field: 'gross_exposure_usd', type: 'DECIMAL(18,2)', description: 'Exposure weight for rollup', metricRole: 'weight' },
          { field: 'facility_id', type: 'BIGINT', description: 'Join key', isPK: false, isFK: true, fkTarget: 'facility_master.facility_id', metricRole: 'join_key' },
        ],
        joinTo: { table: 'facility_master', fromKey: 'facility_id', toKey: 'facility_id', type: 'LEFT' },
      },
      {
        table: 'collateral_snapshot', layer: 'L2', alias: 'cs', role: 'source',
        fieldsUsed: [
          { field: 'current_valuation_usd', type: 'DECIMAL(18,2)', description: 'Collateral value (denominator input)', metricRole: 'denominator_input' },
          { field: 'facility_id', type: 'BIGINT', description: 'Join key', isFK: true, fkTarget: 'facility_master.facility_id', metricRole: 'join_key' },
        ],
        joinTo: { table: 'facility_master', fromKey: 'facility_id', toKey: 'facility_id', type: 'LEFT', note: 'N:1 — multiple collateral items per facility' },
        aggregation: 'SUM(current_valuation_usd) GROUP BY facility_id, as_of_date',
        isSubquery: true,
      },
      {
        table: 'facility_master', layer: 'L1', alias: 'fm', role: 'reference',
        fieldsUsed: [
          { field: 'facility_id', type: 'BIGINT', description: 'Primary key', isPK: true, metricRole: 'join_key' },
          { field: 'counterparty_id', type: 'BIGINT', description: 'FK to borrower (for rollup)', isFK: true, fkTarget: 'counterparty.counterparty_id', metricRole: 'join_key' },
          { field: 'lob_segment_id', type: 'BIGINT', description: 'FK to LoB hierarchy (for rollup)', isFK: true, fkTarget: 'enterprise_business_taxonomy.managed_segment_id', metricRole: 'dimension' },
        ],
      },
    ],
    steps: [
      {
        id: 'fac-s1', stepNumber: 1, stepType: 'SOURCING', tier: 'facility',
        label: 'Read Drawn Amount',
        description: 'Retrieve the current drawn balance from the facility exposure snapshot. This is the numerator of the LTV ratio — how much the borrower has actually drawn down.',
        ingredients: [{ name: 'Drawn Amount', field: 'drawn_amount', table: 'facility_exposure_snapshot', layer: 'L2', sampleValue: 18_500_000, stepType: 'SOURCING', description: 'Current loan balance' }],
        sourceTables: [{ table: 'facility_exposure_snapshot', layer: 'L2', alias: 'fes', role: 'source', fieldsUsed: [{ field: 'drawn_amount', type: 'DECIMAL(18,2)', description: 'Numerator input' }] }],
        outputDescription: 'drawn_amount = $18,500,000',
      },
      {
        id: 'fac-s2', stepNumber: 2, stepType: 'HYBRID', tier: 'facility',
        label: 'Aggregate Collateral Value',
        description: 'Read all collateral items from collateral_snapshot for this facility and SUM their valuations. A facility may be secured by multiple collateral items (real estate, equipment, cash deposits, guarantees). This is HYBRID because it requires both sourcing (reading rows) and aggregation (SUM).',
        ingredients: [
          { name: 'Collateral Item 1 (Real Estate)', field: 'current_valuation_usd', table: 'collateral_snapshot', layer: 'L2', sampleValue: 24_000_000, stepType: 'SOURCING', description: 'COL-101 valuation' },
          { name: 'Collateral Item 2 (Equipment)', field: 'current_valuation_usd', table: 'collateral_snapshot', layer: 'L2', sampleValue: 1_200_000, stepType: 'SOURCING', description: 'COL-102 valuation' },
        ],
        sourceTables: [{ table: 'collateral_snapshot', layer: 'L2', alias: 'cs', role: 'source', fieldsUsed: [{ field: 'current_valuation_usd', type: 'DECIMAL(18,2)', description: 'Per-item valuation' }], aggregation: 'SUM(current_valuation_usd) GROUP BY facility_id, as_of_date', isSubquery: true }],
        formula: 'SUM(current_valuation_usd) = $24,000,000 + $1,200,000 = $25,200,000',
        outputDescription: 'collateral_value = $25,200,000 (2 items)',
      },
      {
        id: 'fac-s3', stepNumber: 3, stepType: 'SOURCING', tier: 'facility',
        label: 'Resolve Facility Identity',
        description: 'Join to facility_master to get the counterparty_id (for rollup to borrower level) and lob_segment_id (for rollup to desk/portfolio/LoB).',
        ingredients: [
          { name: 'Counterparty ID', field: 'counterparty_id', table: 'facility_master', layer: 'L1', sampleValue: 8001, stepType: 'SOURCING', description: 'FK to borrower' },
          { name: 'LoB Segment ID', field: 'lob_segment_id', table: 'facility_master', layer: 'L1', sampleValue: 100, stepType: 'SOURCING', description: 'FK to LoB hierarchy' },
        ],
        sourceTables: [{ table: 'facility_master', layer: 'L1', alias: 'fm', role: 'reference', fieldsUsed: [{ field: 'counterparty_id', type: 'BIGINT', description: 'FK to borrower' }, { field: 'lob_segment_id', type: 'BIGINT', description: 'FK to LoB tree' }] }],
        outputDescription: 'counterparty_id = 8001, lob_segment_id = 100',
      },
      {
        id: 'fac-s4', stepNumber: 4, stepType: 'CALCULATION', tier: 'facility',
        label: 'Compute Facility LTV',
        description: 'Divide drawn amount by total collateral value to get the LTV ratio. This is a pure calculation step — no data is read from tables here.',
        ingredients: [
          { name: 'Drawn Amount', field: 'drawn_amount', table: 'facility_exposure_snapshot', layer: 'L2', sampleValue: 18_500_000, stepType: 'SOURCING', description: 'From step 1' },
          { name: 'Total Collateral Value', field: 'SUM(current_valuation_usd)', table: 'collateral_snapshot', layer: 'L2', sampleValue: 25_200_000, stepType: 'HYBRID', aggregation: 'SUM', description: 'From step 2' },
        ],
        sourceTables: [],
        formula: 'LTV = drawn_amount / collateral_value = $18,500,000 / $25,200,000 = 73.41%',
        outputDescription: 'LTV = 73.41%',
      },
      {
        id: 'fac-s5', stepNumber: 5, stepType: 'SOURCING', tier: 'facility',
        label: 'Read Exposure Weight',
        description: 'Retrieve gross_exposure_usd from facility_exposure_snapshot. This is NOT used in the LTV formula itself but is needed as the weighting basis when LTV is rolled up to counterparty, desk, portfolio, and LoB levels.',
        ingredients: [{ name: 'Gross Exposure', field: 'gross_exposure_usd', table: 'facility_exposure_snapshot', layer: 'L2', sampleValue: 20_000_000, stepType: 'SOURCING', description: 'Weight for rollup' }],
        sourceTables: [{ table: 'facility_exposure_snapshot', layer: 'L2', alias: 'fes', role: 'source', fieldsUsed: [{ field: 'gross_exposure_usd', type: 'DECIMAL(18,2)', description: 'Rollup weight' }] }],
        outputDescription: 'gross_exposure = $20,000,000',
      },
    ],
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    method: 'Exposure-Weighted Average',
    purpose: 'Obligor-level credit assessment',
    calcTier: 'T3',
    description: 'SUM(LTV × gross_exposure) / SUM(gross_exposure) across borrower facilities.',
    sourceTables: [
      {
        table: 'facility_master', layer: 'L1', alias: 'fm', role: 'reference',
        fieldsUsed: [{ field: 'counterparty_id', type: 'BIGINT', description: 'Group facilities by borrower', isFK: true, fkTarget: 'counterparty.counterparty_id', metricRole: 'dimension' }],
      },
    ],
    crossLevelDeps: [{ fromTier: 'facility', fromTierLabel: 'Facility', stepIds: ['fac-s1', 'fac-s2', 'fac-s3', 'fac-s4', 'fac-s5'] }],
    steps: [
      {
        id: 'cpty-s1', stepNumber: 1, stepType: 'SOURCING', tier: 'counterparty',
        label: 'Group Facilities by Counterparty',
        description: 'Use facility_master.counterparty_id to identify all facilities belonging to this borrower. Each facility already has its own LTV from the facility-level calculation.',
        ingredients: [{ name: 'Counterparty ID', field: 'counterparty_id', table: 'facility_master', layer: 'L1', sampleValue: 8001, stepType: 'SOURCING', description: 'Group key' }],
        sourceTables: [{ table: 'facility_master', layer: 'L1', alias: 'fm', role: 'reference', fieldsUsed: [{ field: 'counterparty_id', type: 'BIGINT', description: 'Group key' }] }],
        outputDescription: '3 facilities for counterparty 8001',
        dependsOn: ['fac-s4', 'fac-s5'],
      },
      {
        id: 'cpty-s2', stepNumber: 2, stepType: 'CALCULATION', tier: 'counterparty',
        label: 'Exposure-Weighted LTV',
        description: 'Weight each facility LTV by its gross_exposure_usd and compute the weighted average across all facilities for this borrower.',
        ingredients: [
          { name: 'F-7001 LTV', field: 'ltv', table: 'metric_value_fact', layer: 'L2', sampleValue: 0.7341, stepType: 'CALCULATION', description: '73.41%' },
          { name: 'F-7001 Exposure', field: 'gross_exposure_usd', table: 'facility_exposure_snapshot', layer: 'L2', sampleValue: 20_000_000, stepType: 'SOURCING', description: '$20M weight' },
          { name: 'F-7002 LTV', field: 'ltv', table: 'metric_value_fact', layer: 'L2', sampleValue: 0.8654, stepType: 'CALCULATION', description: '86.54%' },
          { name: 'F-7002 Exposure', field: 'gross_exposure_usd', table: 'facility_exposure_snapshot', layer: 'L2', sampleValue: 50_000_000, stepType: 'SOURCING', description: '$50M weight' },
          { name: 'F-7003 LTV', field: 'ltv', table: 'metric_value_fact', layer: 'L2', sampleValue: 0.4706, stepType: 'CALCULATION', description: '47.06%' },
          { name: 'F-7003 Exposure', field: 'gross_exposure_usd', table: 'facility_exposure_snapshot', layer: 'L2', sampleValue: 15_000_000, stepType: 'SOURCING', description: '$15M weight' },
        ],
        sourceTables: [],
        formula: 'SUM(LTV × exposure) / SUM(exposure) = (0.7341×20M + 0.8654×50M + 0.4706×15M) / 85M = 76.48%',
        outputDescription: 'Counterparty LTV = 76.48%',
        dependsOn: ['fac-s4', 'fac-s5'],
      },
    ],
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    method: 'Exposure-Weighted Average',
    purpose: 'Book quality monitoring',
    calcTier: 'T3',
    description: 'Exposure-weighted LTV across all counterparties in the desk.',
    sourceTables: [
      {
        table: 'enterprise_business_taxonomy', layer: 'L1', alias: 'ebt', role: 'reference',
        fieldsUsed: [{ field: 'managed_segment_id', type: 'BIGINT', description: 'Desk identifier', isPK: true, metricRole: 'dimension' }, { field: 'segment_name', type: 'VARCHAR(200)', description: 'Desk name', metricRole: 'dimension' }],
      },
      {
        table: 'facility_master', layer: 'L1', alias: 'fm', role: 'reference',
        fieldsUsed: [{ field: 'lob_segment_id', type: 'BIGINT', description: 'Maps facility to desk', isFK: true, fkTarget: 'enterprise_business_taxonomy.managed_segment_id', metricRole: 'join_key' }],
      },
    ],
    crossLevelDeps: [{ fromTier: 'counterparty', fromTierLabel: 'Counterparty', stepIds: ['cpty-s2'] }],
    steps: [
      {
        id: 'desk-s1', stepNumber: 1, stepType: 'SOURCING', tier: 'desk',
        label: 'Map Facilities to Desk',
        description: 'Use facility_master.lob_segment_id to join to enterprise_business_taxonomy and identify which desk each facility belongs to.',
        ingredients: [{ name: 'LoB Segment ID', field: 'lob_segment_id', table: 'facility_master', layer: 'L1', sampleValue: 100, stepType: 'SOURCING', description: 'FK to taxonomy' }],
        sourceTables: [{ table: 'enterprise_business_taxonomy', layer: 'L1', alias: 'ebt', role: 'reference', fieldsUsed: [{ field: 'managed_segment_id', type: 'BIGINT', description: 'Desk ID' }] }],
        outputDescription: 'Desk = CRE Lending Desk (segment 100)',
        dependsOn: ['cpty-s2'],
      },
      {
        id: 'desk-s2', stepNumber: 2, stepType: 'CALCULATION', tier: 'desk',
        label: 'Desk Exposure-Weighted LTV',
        description: 'Weight each counterparty LTV by their total exposure and compute the desk-level average.',
        ingredients: [],
        sourceTables: [],
        formula: 'SUM(counterparty_LTV × counterparty_exposure) / SUM(counterparty_exposure)',
        outputDescription: 'Desk LTV = exposure-weighted average across all counterparties',
      },
    ],
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    method: 'Exposure-Weighted Average + Distribution',
    purpose: 'Portfolio health trending',
    calcTier: 'T3',
    description: 'Exposure-weighted average LTV across all desks in the portfolio, plus distribution buckets.',
    sourceTables: [
      {
        table: 'enterprise_business_taxonomy', layer: 'L1', alias: 'ebt_parent', role: 'reference',
        fieldsUsed: [{ field: 'parent_segment_id', type: 'BIGINT', description: 'Walk tree: desk → portfolio', isFK: true, fkTarget: 'enterprise_business_taxonomy.managed_segment_id', metricRole: 'join_key' }],
      },
    ],
    crossLevelDeps: [{ fromTier: 'desk', fromTierLabel: 'Desk', stepIds: ['desk-s2'] }],
    steps: [
      {
        id: 'port-s1', stepNumber: 1, stepType: 'SOURCING', tier: 'portfolio',
        label: 'Walk Hierarchy: Desk → Portfolio',
        description: 'Use enterprise_business_taxonomy.parent_segment_id to walk from desk (L3) to portfolio (L2) in the LoB tree.',
        ingredients: [{ name: 'Parent Segment ID', field: 'parent_segment_id', table: 'enterprise_business_taxonomy', layer: 'L1', sampleValue: 10, stepType: 'SOURCING', description: 'Portfolio parent' }],
        sourceTables: [{ table: 'enterprise_business_taxonomy', layer: 'L1', alias: 'ebt_parent', role: 'reference', fieldsUsed: [{ field: 'parent_segment_id', type: 'BIGINT', description: 'Parent pointer' }] }],
        outputDescription: 'Portfolio = CRE Portfolio (segment 10)',
        dependsOn: ['desk-s2'],
      },
      {
        id: 'port-s2', stepNumber: 2, stepType: 'CALCULATION', tier: 'portfolio',
        label: 'Portfolio Exposure-Weighted LTV + Buckets',
        description: 'Compute exposure-weighted average LTV across all desks in the portfolio. Also compute distribution buckets (<50%, 50-70%, 70-80%, 80-90%, >90%) to reveal hidden pockets of over-leveraged facilities.',
        ingredients: [],
        sourceTables: [],
        formula: 'SUM(desk_LTV × desk_exposure) / SUM(desk_exposure) + distribution buckets',
        outputDescription: 'Portfolio LTV = weighted average + bucket breakdown',
      },
    ],
  },
  {
    key: 'lob',
    label: 'Line of Business',
    icon: PieChart,
    method: 'Exposure-Weighted Average',
    purpose: 'Directional early warning',
    calcTier: 'T3',
    description: 'Exposure-weighted average LTV across all portfolios. A trend indicator — not a limit metric.',
    sourceTables: [
      {
        table: 'enterprise_business_taxonomy', layer: 'L1', alias: 'ebt_root', role: 'reference',
        fieldsUsed: [{ field: 'parent_segment_id', type: 'BIGINT', description: 'Walk tree: portfolio → LoB root', isFK: true, fkTarget: 'enterprise_business_taxonomy.managed_segment_id', metricRole: 'join_key' }],
      },
    ],
    crossLevelDeps: [{ fromTier: 'portfolio', fromTierLabel: 'Portfolio', stepIds: ['port-s2'] }],
    steps: [
      {
        id: 'lob-s1', stepNumber: 1, stepType: 'SOURCING', tier: 'lob',
        label: 'Walk Hierarchy: Portfolio → LoB',
        description: 'Continue up the enterprise_business_taxonomy tree from portfolio (L2) to LoB root (L1).',
        ingredients: [{ name: 'Root Segment ID', field: 'parent_segment_id', table: 'enterprise_business_taxonomy', layer: 'L1', sampleValue: 1, stepType: 'SOURCING', description: 'LoB root' }],
        sourceTables: [{ table: 'enterprise_business_taxonomy', layer: 'L1', alias: 'ebt_root', role: 'reference', fieldsUsed: [{ field: 'parent_segment_id', type: 'BIGINT', description: 'LoB root pointer' }] }],
        outputDescription: 'LoB = Commercial Real Estate',
        dependsOn: ['port-s2'],
      },
      {
        id: 'lob-s2', stepNumber: 2, stepType: 'CALCULATION', tier: 'lob',
        label: 'LoB Exposure-Weighted LTV',
        description: 'Compute exposure-weighted average LTV across all portfolios in this Line of Business. Used as a directional trend indicator, not a hard limit.',
        ingredients: [],
        sourceTables: [],
        formula: 'SUM(portfolio_LTV × portfolio_exposure) / SUM(portfolio_exposure)',
        outputDescription: 'LoB LTV = directional trend indicator',
      },
    ],
  },
];
