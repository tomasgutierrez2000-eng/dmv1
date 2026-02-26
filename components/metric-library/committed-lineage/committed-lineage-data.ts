import {
  Database,
  Building2,
  Users,
  LayoutDashboard,
  Briefcase,
  FolderTree,
  Globe,
  Calculator,
  Network,
  Layers,
  Search,
  Zap,
  Sparkles,
  GitBranch,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ──────────────────────────────────────────────────────────────────────────── */

export interface FacilityCommittedData {
  facilityId: number;
  facilityName: string;
  currencyCode: string;
  currencySymbol: string;
  totalCommitment: number;
  fxRate: number;
  fxPair: string;
  totalCommitmentUsd: number;
  bankSharePct: number;
  allocationRole: string;
  committedAmountUsd: number;
  lobSegmentId: number;
}

export interface CounterpartyExposureData {
  counterpartyId: number;
  counterpartyName: string;
  roleCode: string;
  isRiskBearing: boolean;
  facilityId: number;
  facilityName: string;
  attributionPct: number;
  attributedExposureUsd: number;
}

export interface ComponentMeta {
  field: string;
  table: string;
  type: string;
  desc: string;
  where?: string;
  fk?: string;
  sampleValue: string;
}

export interface AuditSourceColumn {
  column: string;
  value: number | string;
  type: string;
  desc: string;
}

export interface AuditFormulaStep {
  step: number;
  label: string;
  operation: string;
  result: number;
}

export interface AuditL2Source {
  table: string;
  role: 'source' | 'reference';
  columns: AuditSourceColumn[];
  whereFilters: string[];
  fkJoins: { from: string; to: string; key: string; note: string }[];
  formulaSteps: AuditFormulaStep[];
}

export interface AuditTrailNode {
  id: string;
  level: 'dashboard' | 'lob' | 'counterparty' | 'facility' | 'l2_source';
  label: string;
  sublabel?: string;
  committedUsd?: number;
  displayValue: string;
  method?: string;
  methodLabel?: string;
  formula?: string;
  tier?: string;
  layerColor: string;
  icon: React.ElementType;
  children?: AuditTrailNode[];
  l2Source?: AuditL2Source;
}

export interface AuditRunContext {
  runVersionId: string;
  asOfDate: string;
  reportingPeriod: string;
  calculationTier: string;
  l1Freshness: string;
  l2Freshness: string;
  l3Freshness: string;
  auditCitation: string;
}

export interface RollupLevel {
  key: string;
  label: string;
  icon: React.ElementType;
  method: string;
  tier: string;
  color: string;
  joinPath: string[];
  description: string;
}

export interface RoleCodeEntry {
  code: string;
  name: string;
  isRiskBearing: boolean;
  description: string;
}

export interface FKRelationship {
  from: string;
  to: string;
  joinKey: string;
  why: string;
  cardinality: string;
}

export interface QueryPlanStep {
  step: number;
  layer: string;
  action: string;
  tables: string[];
  sql: string;
}

export interface FlowStep {
  layer: string;
  table: string;
  action: string;
  value: string;
  detail: string;
  color: string;
}

export interface BreadcrumbStep {
  id: string;
  label: string;
  layer: string;
  color: string;
  anchor: string;
  tables?: string[];
}

export interface L1TableDef {
  tableName: string;
  scd: string;
  role: string;
  columns: { name: string; type: string; pk?: boolean; fk?: string; nullable?: boolean }[];
  sampleRow: Record<string, string | number>;
}

/* ────────────────────────────────────────────────────────────────────────────
 * SAMPLE DATA — from scripts/l1/output/sample-data.json & l2/output/sample-data.json
 * Snapshot date: 2025-01-31
 * ──────────────────────────────────────────────────────────────────────────── */

export const FACILITY_DATA: FacilityCommittedData[] = [
  {
    facilityId: 1,
    facilityName: 'Meridian Aerospace — USD Revolver 2027',
    currencyCode: 'USD',
    currencySymbol: '$',
    totalCommitment: 250_000_000,
    fxRate: 1.0,
    fxPair: 'USD/USD',
    totalCommitmentUsd: 250_000_000,
    bankSharePct: 0.60,
    allocationRole: 'LEAD_ARRANGER',
    committedAmountUsd: 150_000_000,
    lobSegmentId: 1,
  },
  {
    facilityId: 2,
    facilityName: 'Northbridge Pharma — Term Loan B',
    currencyCode: 'EUR',
    currencySymbol: '€',
    totalCommitment: 500_000_000,
    fxRate: 1.085,
    fxPair: 'EUR/USD',
    totalCommitmentUsd: 542_500_000,
    bankSharePct: 1.0,
    allocationRole: 'SOLE_LENDER',
    committedAmountUsd: 542_500_000,
    lobSegmentId: 2,
  },
  {
    facilityId: 3,
    facilityName: 'Pacific Ridge — Multi-Currency RCF',
    currencyCode: 'GBP',
    currencySymbol: '£',
    totalCommitment: 1_000_000_000,
    fxRate: 1.265,
    fxPair: 'GBP/USD',
    totalCommitmentUsd: 1_265_000_000,
    bankSharePct: 0.45,
    allocationRole: 'CO_LENDER',
    committedAmountUsd: 569_250_000,
    lobSegmentId: 3,
  },
];

export const COUNTERPARTY_DATA: CounterpartyExposureData[] = [
  {
    counterpartyId: 1,
    counterpartyName: 'Meridian Aerospace Holdings Inc.',
    roleCode: 'BORROWER',
    isRiskBearing: true,
    facilityId: 1,
    facilityName: 'F-1 Meridian Revolver',
    attributionPct: 1.0,
    attributedExposureUsd: 150_000_000,
  },
  {
    counterpartyId: 2,
    counterpartyName: 'Northbridge Pharmaceuticals Corp.',
    roleCode: 'BORROWER',
    isRiskBearing: true,
    facilityId: 2,
    facilityName: 'F-2 Northbridge Term Loan',
    attributionPct: 1.0,
    attributedExposureUsd: 542_500_000,
  },
  {
    counterpartyId: 3,
    counterpartyName: 'Pacific Ridge Energy LLC',
    roleCode: 'CO_BORROWER',
    isRiskBearing: true,
    facilityId: 3,
    facilityName: 'F-3 Pacific Ridge RCF',
    attributionPct: 0.60,
    attributedExposureUsd: 341_550_000,
  },
  {
    counterpartyId: 7,
    counterpartyName: 'Summit Capital Partners LLC',
    roleCode: 'CO_BORROWER',
    isRiskBearing: true,
    facilityId: 3,
    facilityName: 'F-3 Pacific Ridge RCF',
    attributionPct: 0.40,
    attributedExposureUsd: 227_700_000,
  },
  {
    counterpartyId: 99,
    counterpartyName: 'Administrative Agent for F-3',
    roleCode: 'AGENT',
    isRiskBearing: false,
    facilityId: 3,
    facilityName: 'F-3 Pacific Ridge RCF',
    attributionPct: 0,
    attributedExposureUsd: 0,
  },
];

export const TOTAL_COMMITTED_USD = 1_261_750_000;

/* ────────────────────────────────────────────────────────────────────────────
 * ROLE CODES — from counterparty_role_dim sample data
 * ──────────────────────────────────────────────────────────────────────────── */

export const ROLE_CODES: RoleCodeEntry[] = [
  { code: 'BORROWER', name: 'Borrower', isRiskBearing: true, description: 'Primary obligor — direct credit exposure to the bank' },
  { code: 'GUARANTOR', name: 'Guarantor', isRiskBearing: true, description: 'Provides credit support — contingent exposure if borrower defaults' },
  { code: 'PARTICIPANT', name: 'Participant', isRiskBearing: true, description: 'Co-lender in syndication — holds funded share of facility' },
  { code: 'ISSUER', name: 'Issuer', isRiskBearing: true, description: 'Issues debt securities — direct obligor on bonds/notes' },
  { code: 'SUBORDINATE', name: 'Subordinate Lender', isRiskBearing: true, description: 'Junior tranche holder — bears first-loss risk' },
  { code: 'AGENT', name: 'Administrative Agent', isRiskBearing: false, description: 'Facilitates deal mechanics — no credit risk, earns fee income only' },
  { code: 'LEAD_ARRANGER', name: 'Lead Arranger', isRiskBearing: false, description: 'Originates and distributes — syndication role, not a hold position' },
  { code: 'TRUSTEE', name: 'Trustee', isRiskBearing: false, description: 'Fiduciary for bondholders — administrative role, no economic exposure' },
  { code: 'SERVICER', name: 'Servicer', isRiskBearing: false, description: 'Processes payments and reporting — operational role only' },
  { code: 'SPONSOR', name: 'Sponsor', isRiskBearing: false, description: 'Equity investor in borrower — not a direct credit counterparty to bank' },
];

/* ────────────────────────────────────────────────────────────────────────────
 * ROLLUP LEVELS — 6 levels (Facility → … → Enterprise)
 * ──────────────────────────────────────────────────────────────────────────── */

export const ROLLUP_LEVELS: RollupLevel[] = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Building2,
    method: 'Summation (Direct Calc)',
    tier: 'T3',
    color: 'amber',
    joinPath: ['position.facility_id', 'facility_master.facility_id'],
    description: 'Per-facility committed amount: total_commitment × fx_rate × bank_share_pct. Each DISTINCT facility_id produces one value.',
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    method: 'Summation (Attributed)',
    tier: 'T3',
    color: 'emerald',
    joinPath: [
      'exposure_counterparty_attribution.counterparty_id',
      'counterparty.counterparty_id',
      'counterparty_hierarchy.ultimate_parent_id',
    ],
    description: 'SUM(attributed_exposure_usd) GROUP BY ultimate_parent_id WHERE is_risk_bearing_flag = \'Y\'. Pre-computed values include FX, bank_share_pct, and attribution_pct.',
  },
  {
    key: 'desk',
    label: 'L3 Desk',
    icon: Briefcase,
    method: 'Summation',
    tier: 'T3',
    color: 'emerald',
    joinPath: [
      'facility_master.lob_segment_id',
      'enterprise_business_taxonomy.managed_segment_id (tree_level=L3)',
    ],
    description: 'SUM of facility-level committed amounts where the facility\'s lob_segment_id maps to a L3 desk in the enterprise taxonomy.',
  },
  {
    key: 'portfolio',
    label: 'L2 Portfolio',
    icon: FolderTree,
    method: 'Summation',
    tier: 'T3',
    color: 'emerald',
    joinPath: [
      'enterprise_business_taxonomy.parent_segment_id (L3→L2)',
    ],
    description: 'SUM across L3 children via parent_segment_id. Each L2 portfolio aggregates all desks beneath it.',
  },
  {
    key: 'lob',
    label: 'L1 Line of Business',
    icon: FolderTree,
    method: 'Summation',
    tier: 'T3',
    color: 'emerald',
    joinPath: [
      'enterprise_business_taxonomy.parent_segment_id (L2→L1)',
    ],
    description: 'SUM via L1→L2→L3 hierarchy traversal. GCB, CB, GBM — the top-level business segments.',
  },
  {
    key: 'enterprise',
    label: 'L0 Enterprise',
    icon: Globe,
    method: 'Summation (Grand Total)',
    tier: 'T3',
    color: 'pink',
    joinPath: [
      'SUM across all L1 segments (GCB + CB + GBM)',
      '3-level traversal: L1→L2→L3 hierarchy',
    ],
    description: 'Grand total across all lines of business. The single enterprise-wide committed exposure number.',
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * BREADCRUMB STEPS — 13 navigation items
 * ──────────────────────────────────────────────────────────────────────────── */

export const BREADCRUMB_STEPS: BreadcrumbStep[] = [
  { id: 'definition', label: 'Definition', layer: 'Metric', color: 'teal', anchor: 'definition' },
  { id: 'join-map', label: 'Join Map', layer: 'Plumbing', color: 'cyan', anchor: 'join-map', tables: ['facility_master', 'position_detail', 'fx_rate'] },
  { id: 'l1-reference', label: 'L1 Reference', layer: 'L1', color: 'blue', anchor: 'l1-reference', tables: ['facility_master', 'facility_lender_allocation', 'fx_rate'] },
  { id: 'l2-snapshot', label: 'L2 Snapshot', layer: 'L2', color: 'amber', anchor: 'l2-snapshot', tables: ['position_detail', 'exposure_counterparty_attribution'] },
  { id: 'syndication', label: 'Syndication', layer: 'Context', color: 'blue', anchor: 'syndication' },
  { id: 'fx-sensitivity', label: 'FX Impact', layer: 'Context', color: 'amber', anchor: 'fx-sensitivity' },
  { id: 'risk-bearing', label: 'Risk-Bearing', layer: 'Context', color: 'red', anchor: 'risk-bearing' },
  { id: 'query-plan', label: 'Query Plan', layer: 'Engine', color: 'purple', anchor: 'query-plan' },
  { id: 'calculation', label: 'Calculation', layer: 'Calc', color: 'emerald', anchor: 'calculation' },
  { id: 'data-flow', label: 'Data Flow', layer: 'Trace', color: 'amber', anchor: 'data-flow' },
  { id: 'rollup', label: 'Rollup', layer: 'Hierarchy', color: 'emerald', anchor: 'rollup' },
  { id: 'dashboard', label: 'Dashboard', layer: 'Output', color: 'pink', anchor: 'dashboard' },
  { id: 'audit-trail', label: 'Audit Trail', layer: 'Validate', color: 'emerald', anchor: 'audit-trail' },
];

/* ────────────────────────────────────────────────────────────────────────────
 * FK RELATIONSHIPS — for FKExplorer
 * ──────────────────────────────────────────────────────────────────────────── */

export const FK_RELATIONSHIPS: FKRelationship[] = [
  {
    from: 'position',
    to: 'facility_master',
    joinKey: 'facility_id',
    why: 'Links each position back to its parent facility — essential to know which deal this exposure belongs to.',
    cardinality: '1:N — one facility has many positions',
  },
  {
    from: 'position_detail',
    to: 'position',
    joinKey: 'position_id',
    why: 'Retrieves the total_commitment for each position from the detail snapshot table.',
    cardinality: '1:1 — one detail record per position per snapshot',
  },
  {
    from: 'facility_master',
    to: 'fx_rate',
    joinKey: 'currency_code → from_currency_code',
    why: 'Resolves the facility\'s native currency to USD for cross-currency aggregation. Without this join, EUR and GBP commitments cannot be summed.',
    cardinality: '1:1 — one rate per currency pair per date',
  },
  {
    from: 'facility_lender_allocation',
    to: 'facility_master',
    joinKey: 'facility_id',
    why: 'Provides the bank\'s syndication share (bank_share_pct). For syndicated facilities, the bank only holds a fraction of the total commitment.',
    cardinality: '1:1 — one allocation per facility per entity',
  },
  {
    from: 'exposure_counterparty_attribution',
    to: 'facility_master',
    joinKey: 'facility_id',
    why: 'Links attributed exposure back to the facility for counterparty-level aggregation. The attribution already includes FX and bank share.',
    cardinality: 'N:1 — multiple counterparties may share one facility',
  },
  {
    from: 'exposure_counterparty_attribution',
    to: 'counterparty',
    joinKey: 'counterparty_id',
    why: 'Identifies which counterparty bears the risk for this attributed amount.',
    cardinality: '1:1 — one attribution row per counterparty-facility pair',
  },
  {
    from: 'counterparty',
    to: 'counterparty_role_dim',
    joinKey: 'counterparty_role_code',
    why: 'Determines if the counterparty role is risk-bearing (BORROWER, GUARANTOR) or administrative (AGENT, TRUSTEE). Non-risk-bearing roles are excluded from committed amount.',
    cardinality: '1:1 — one role lookup per counterparty relationship',
  },
  {
    from: 'counterparty',
    to: 'counterparty_hierarchy',
    joinKey: 'counterparty_id',
    why: 'Resolves to ultimate_parent_id for counterparty-level rollup. Subsidiaries aggregate under their parent entity.',
    cardinality: '1:1 — one hierarchy entry per counterparty per snapshot',
  },
  {
    from: 'facility_master',
    to: 'enterprise_business_taxonomy',
    joinKey: 'lob_segment_id → managed_segment_id',
    why: 'Maps each facility to a business unit (L3 desk → L2 portfolio → L1 LoB) for hierarchical rollup of committed amounts.',
    cardinality: '1:1 — one taxonomy node per facility',
  },
  {
    from: 'metric_value_fact',
    to: 'facility_master',
    joinKey: 'facility_id',
    why: 'Stores the computed committed amount in the L3 output table, indexed by facility for drill-down.',
    cardinality: '1:1 — one metric value per facility per metric per snapshot',
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * L1 TABLE DEFINITIONS — from scripts/l1/l1-definitions.ts
 * ──────────────────────────────────────────────────────────────────────────── */

export const L1_TABLES: L1TableDef[] = [
  {
    tableName: 'facility_master',
    scd: 'SCD-2',
    role: 'Central hub — identifies the deal, its currency, and LoB hierarchy linkage. Every metric calculation starts here.',
    columns: [
      { name: 'facility_id', type: 'BIGINT', pk: true },
      { name: 'credit_agreement_id', type: 'BIGINT', fk: 'credit_agreement_master' },
      { name: 'counterparty_id', type: 'BIGINT', fk: 'counterparty' },
      { name: 'currency_code', type: 'VARCHAR(20)', fk: 'currency_dim' },
      { name: 'facility_name', type: 'VARCHAR(200)' },
      { name: 'facility_type', type: 'VARCHAR(50)' },
      { name: 'committed_facility_amt', type: 'DECIMAL(18,2)' },
      { name: 'lob_segment_id', type: 'BIGINT', fk: 'enterprise_business_taxonomy' },
      { name: 'portfolio_id', type: 'BIGINT', fk: 'portfolio_dim' },
    ],
    sampleRow: { facility_id: 3, facility_name: 'Pacific Ridge — Multi-Currency RCF', currency_code: 'GBP', committed_facility_amt: '1,000,000,000', lob_segment_id: 3 },
  },
  {
    tableName: 'facility_lender_allocation',
    scd: 'SCD-2',
    role: 'Bank syndication share — determines what percentage of the total commitment belongs to our bank. Critical for GSIB with syndicated portfolios.',
    columns: [
      { name: 'lender_allocation_id', type: 'BIGINT', pk: true },
      { name: 'facility_id', type: 'BIGINT', fk: 'facility_master' },
      { name: 'legal_entity_id', type: 'BIGINT', fk: 'legal_entity' },
      { name: 'bank_share_pct', type: 'DECIMAL(10,4)' },
      { name: 'bank_commitment_amt', type: 'DECIMAL(18,2)' },
      { name: 'allocation_role', type: 'VARCHAR(50)' },
      { name: 'is_lead_flag', type: 'CHAR(1)' },
    ],
    sampleRow: { lender_allocation_id: 3, facility_id: 3, bank_share_pct: 0.45, allocation_role: 'CO_LENDER', is_lead_flag: 'N' },
  },
  {
    tableName: 'fx_rate',
    scd: 'Snapshot',
    role: 'Currency conversion — converts facility commitments from native currency to USD for cross-portfolio aggregation. Rates sourced daily from Bloomberg.',
    columns: [
      { name: 'fx_rate_id', type: 'BIGINT', pk: true },
      { name: 'as_of_date', type: 'DATE' },
      { name: 'from_currency_code', type: 'VARCHAR(20)', fk: 'currency_dim' },
      { name: 'to_currency_code', type: 'VARCHAR(20)', fk: 'currency_dim' },
      { name: 'rate', type: 'DECIMAL(18,10)' },
      { name: 'rate_type', type: 'VARCHAR(50)' },
      { name: 'provider', type: 'VARCHAR(100)' },
    ],
    sampleRow: { fx_rate_id: 3, from_currency_code: 'GBP', to_currency_code: 'USD', rate: 1.265, rate_type: 'SPOT', as_of_date: '2025-01-31', provider: 'BLOOMBERG' },
  },
  {
    tableName: 'counterparty_role_dim',
    scd: 'SCD-0',
    role: 'Risk-bearing filter — determines which counterparty roles generate credit exposure. Agents, trustees, and servicers are excluded from committed amount.',
    columns: [
      { name: 'counterparty_role_code', type: 'VARCHAR(20)', pk: true },
      { name: 'role_name', type: 'VARCHAR(200)' },
      { name: 'is_risk_bearing_flag', type: 'CHAR(1)' },
    ],
    sampleRow: { counterparty_role_code: 'CO_BORROWER', role_name: 'Co-Borrower', is_risk_bearing_flag: 'Y' },
  },
  {
    tableName: 'counterparty_hierarchy',
    scd: 'Snapshot',
    role: 'Ultimate parent resolution — rolls subsidiary counterparties up to their parent entity for group-level exposure aggregation.',
    columns: [
      { name: 'counterparty_id', type: 'BIGINT', pk: true, fk: 'counterparty' },
      { name: 'as_of_date', type: 'DATE', pk: true },
      { name: 'immediate_parent_id', type: 'BIGINT', fk: 'counterparty' },
      { name: 'ultimate_parent_id', type: 'BIGINT', fk: 'counterparty' },
      { name: 'ownership_pct', type: 'DECIMAL(10,4)' },
    ],
    sampleRow: { counterparty_id: 3, ultimate_parent_id: 3, ownership_pct: 1.0, as_of_date: '2025-01-31' },
  },
  {
    tableName: 'enterprise_business_taxonomy',
    scd: 'SCD-1',
    role: 'LoB hierarchy — defines the Desk (L3) → Portfolio (L2) → LoB (L1) → Enterprise (L0) tree for rollup aggregation.',
    columns: [
      { name: 'managed_segment_id', type: 'BIGINT', pk: true },
      { name: 'segment_code', type: 'VARCHAR(50)' },
      { name: 'segment_name', type: 'VARCHAR(200)' },
      { name: 'tree_level', type: 'INTEGER' },
      { name: 'parent_segment_id', type: 'BIGINT', fk: 'enterprise_business_taxonomy' },
    ],
    sampleRow: { managed_segment_id: 7, segment_code: 'CRED', segment_name: 'Credit', tree_level: 3, parent_segment_id: 3 },
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * L2 FIELD METADATA — for X-Ray mode
 * ──────────────────────────────────────────────────────────────────────────── */

export const L2_FIELD_META: Record<string, ComponentMeta> = {
  'position_detail.total_commitment': {
    field: 'total_commitment',
    table: 'position_detail',
    type: 'DECIMAL(18,2)',
    desc: 'Total committed amount in facility native currency — the contractual maximum the bank has agreed to fund.',
    where: 'position_id links via position.facility_id',
    fk: 'position_id → position.position_id',
    sampleValue: '£1,000,000,000',
  },
  'position_detail.position_id': {
    field: 'position_id',
    table: 'position_detail',
    type: 'BIGINT',
    desc: 'Unique identifier for the position snapshot — bridges position table to position_detail.',
    fk: 'position_id → position.position_id → facility_master.facility_id',
    sampleValue: 'P-3',
  },
  'position_detail.as_of_date': {
    field: 'as_of_date',
    table: 'position_detail',
    type: 'DATE',
    desc: 'Snapshot date for the position detail record — determines which business day the commitment is measured.',
    sampleValue: '2025-01-31',
  },
  'exposure_counterparty_attribution.attributed_exposure_usd': {
    field: 'attributed_exposure_usd',
    table: 'exposure_counterparty_attribution',
    type: 'DECIMAL(18,2)',
    desc: 'Pre-computed committed exposure in USD, already including FX conversion, bank_share_pct, and attribution_pct. Used for counterparty-level aggregation.',
    where: "counterparty_role_code = role via counterparty_role_dim, is_risk_bearing_flag = 'Y'",
    fk: 'counterparty_id → counterparty, facility_id → facility_master',
    sampleValue: '$341,550,000',
  },
  'exposure_counterparty_attribution.attribution_pct': {
    field: 'attribution_pct',
    table: 'exposure_counterparty_attribution',
    type: 'DECIMAL(10,4)',
    desc: 'Percentage of the facility committed amount attributed to this counterparty. For single-borrower deals = 100%. For co-borrowers, splits pro-rata.',
    sampleValue: '0.60 (60%)',
  },
  'exposure_counterparty_attribution.counterparty_role_code': {
    field: 'counterparty_role_code',
    table: 'exposure_counterparty_attribution',
    type: 'VARCHAR(20)',
    desc: 'The role this counterparty plays on the facility — joins to counterparty_role_dim for risk-bearing filter.',
    fk: 'counterparty_role_code → counterparty_role_dim.counterparty_role_code',
    sampleValue: 'CO_BORROWER',
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * FACILITY PATH COMPONENT METADATA — for X-Ray mode
 * ──────────────────────────────────────────────────────────────────────────── */

export const FACILITY_PATH_COMPONENTS: ComponentMeta[] = [
  {
    field: 'total_commitment',
    table: 'L2.position_detail',
    type: 'DECIMAL(18,2)',
    desc: 'Total committed amount in facility native currency',
    where: "position_id via L2.position WHERE facility_id = {n}",
    fk: 'position_id → position.position_id',
    sampleValue: '£1,000,000,000 (F-3)',
  },
  {
    field: 'rate (fx_rate)',
    table: 'L1.fx_rate',
    type: 'DECIMAL(18,10)',
    desc: 'Spot FX rate converting from facility currency to USD',
    where: "from_currency_code = facility currency, to_currency_code = 'USD', rate_type = 'SPOT', as_of_date = '2025-01-31'",
    fk: 'from_currency_code → currency_dim.currency_code',
    sampleValue: '1.2650 (GBP/USD)',
  },
  {
    field: 'bank_share_pct',
    table: 'L1.facility_lender_allocation',
    type: 'DECIMAL(10,4)',
    desc: 'Bank\'s percentage share of the syndicated facility',
    where: 'facility_id = {n}, current allocation',
    fk: 'facility_id → facility_master.facility_id',
    sampleValue: '0.45 (45% CO_LENDER)',
  },
];

export const COUNTERPARTY_PATH_COMPONENTS: ComponentMeta[] = [
  {
    field: 'attributed_exposure_usd',
    table: 'L2.exposure_counterparty_attribution',
    type: 'DECIMAL(18,2)',
    desc: 'Pre-computed committed exposure in USD — already includes FX conversion, bank_share_pct, AND attribution_pct',
    where: 'counterparty_id = {n}, facility_id = {n}',
    fk: 'counterparty_id → counterparty, facility_id → facility_master',
    sampleValue: '$341,550,000 (CP-3, F-3)',
  },
  {
    field: 'is_risk_bearing_flag',
    table: 'L1.counterparty_role_dim',
    type: 'CHAR(1)',
    desc: 'Filter: only risk-bearing roles (BORROWER, GUARANTOR, etc.) contribute to committed amount. AGENT, TRUSTEE excluded.',
    where: "counterparty_role_code = role, is_risk_bearing_flag = 'Y'",
    sampleValue: "Y (CO_BORROWER)",
  },
  {
    field: 'ultimate_parent_id',
    table: 'L1.counterparty_hierarchy',
    type: 'BIGINT',
    desc: 'GROUP BY ultimate_parent_id for parent-entity rollup. Subsidiaries aggregate under their ultimate parent.',
    where: "counterparty_id = {n}, as_of_date = '2025-01-31'",
    fk: 'counterparty_id → counterparty.counterparty_id',
    sampleValue: '3 (Pacific Ridge = own parent)',
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * QUERY PLAN STEPS
 * ──────────────────────────────────────────────────────────────────────────── */

export const QUERY_PLAN_STEPS: QueryPlanStep[] = [
  {
    step: 1,
    layer: 'L2',
    action: 'Scope facilities for aggregation',
    tables: ['position'],
    sql: `SELECT DISTINCT p.facility_id
FROM l2.position p
WHERE p.as_of_date = '2025-01-31'`,
  },
  {
    step: 2,
    layer: 'L2',
    action: 'Pull total commitment per facility',
    tables: ['position_detail'],
    sql: `SELECT pd.position_id, pd.total_commitment
FROM l2.position_detail pd
JOIN l2.position p ON pd.position_id = p.position_id
WHERE p.as_of_date = '2025-01-31'`,
  },
  {
    step: 3,
    layer: 'L1',
    action: 'Get FX rate for currency conversion',
    tables: ['fx_rate', 'facility_master'],
    sql: `SELECT fm.facility_id, fx.rate
FROM l1.facility_master fm
JOIN l1.fx_rate fx
  ON fm.currency_code = fx.from_currency_code
  AND fx.to_currency_code = 'USD'
  AND fx.rate_type = 'SPOT'
  AND fx.as_of_date = '2025-01-31'`,
  },
  {
    step: 4,
    layer: 'L1',
    action: 'Get bank syndication share',
    tables: ['facility_lender_allocation'],
    sql: `SELECT fla.facility_id, fla.bank_share_pct
FROM l1.facility_lender_allocation fla
WHERE fla.facility_id IN (1, 2, 3)`,
  },
  {
    step: 5,
    layer: 'Transform',
    action: 'Compute facility-level committed amount (USD)',
    tables: [],
    sql: `-- Facility path:
committed_usd = total_commitment × fx_rate × bank_share_pct

-- F-1: $250M × 1.0000 × 0.60 = $150,000,000
-- F-2: €500M × 1.0850 × 1.00 = $542,500,000
-- F-3: £1,000M × 1.2650 × 0.45 = $569,250,000`,
  },
  {
    step: 6,
    layer: 'L2 + L1',
    action: 'Counterparty path: pull attributed exposure, filter risk-bearing',
    tables: ['exposure_counterparty_attribution', 'counterparty_role_dim'],
    sql: `SELECT eca.counterparty_id,
       SUM(eca.attributed_exposure_usd) AS committed_usd
FROM l2.exposure_counterparty_attribution eca
JOIN l1.counterparty_role_dim crd
  ON eca.counterparty_role_code = crd.counterparty_role_code
WHERE crd.is_risk_bearing_flag = 'Y'
GROUP BY eca.counterparty_id`,
  },
  {
    step: 7,
    layer: 'L3',
    action: 'Store in output table',
    tables: ['metric_value_fact'],
    sql: `INSERT INTO l3.metric_value_fact
  (metric_id, aggregation_level, entity_id,
   metric_value, as_of_date, run_version_id)
VALUES
  ('COMMITTED_USD', 'FACILITY', 3,
   569250000, '2025-01-31', 'RUN-2025Q1-v4.0.0')`,
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * ANIMATED DATA FLOW STEPS — tracing F-3 Pacific Ridge
 * ──────────────────────────────────────────────────────────────────────────── */

export const COMMITTED_FLOW_STEPS: FlowStep[] = [
  { layer: 'L1', table: 'facility_master', action: 'Identify facility F-3', value: 'GBP · £1,000M · lob=3', detail: 'facility_id=3, currency_code=GBP, committed_facility_amt=1,000,000,000', color: 'blue' },
  { layer: 'L1', table: 'fx_rate', action: 'Lookup FX conversion rate', value: 'GBP/USD = 1.2650', detail: "rate_type='SPOT', as_of_date='2025-01-31', provider='BLOOMBERG'", color: 'blue' },
  { layer: 'L1', table: 'facility_lender_allocation', action: 'Get bank syndication share', value: '45% (CO_LENDER)', detail: 'bank_share_pct=0.45, allocation_role=CO_LENDER', color: 'blue' },
  { layer: 'L2', table: 'position_detail', action: 'Read total commitment', value: '£1,000,000,000', detail: 'total_commitment from position_detail via position.facility_id=3', color: 'amber' },
  { layer: 'Calc', table: 'Transform', action: 'Convert to USD', value: '$1,265,000,000', detail: '£1,000,000,000 × 1.2650 = $1,265,000,000', color: 'purple' },
  { layer: 'Calc', table: 'Transform', action: 'Apply bank share', value: '$569,250,000', detail: '$1,265,000,000 × 45% = $569,250,000', color: 'purple' },
  { layer: 'L2', table: 'exposure_counterparty_attribution', action: 'Split across co-borrowers', value: 'CP-3: $341.6M · CP-7: $227.7M', detail: 'CP-3 (60%): $341,550,000 · CP-7 (40%): $227,700,000 · Agent: excluded', color: 'amber' },
  { layer: 'L3', table: 'metric_value_fact', action: 'Store facility-level result', value: '$569,250,000', detail: "metric_id='COMMITTED_USD', level='FACILITY', entity_id=3", color: 'emerald' },
  { layer: 'Dashboard', table: 'Dashboard', action: 'Display committed amount', value: '$569.3M', detail: 'Facility F-3 Pacific Ridge — Multi-Currency RCF', color: 'pink' },
];

/* ────────────────────────────────────────────────────────────────────────────
 * AUDIT RUN CONTEXT
 * ──────────────────────────────────────────────────────────────────────────── */

export const AUDIT_RUN: AuditRunContext = {
  runVersionId: 'RUN-2025Q1-v4.0.0',
  asOfDate: '2025-01-31',
  reportingPeriod: 'Q1 2025',
  calculationTier: 'T3',
  l1Freshness: '2025-01-31T23:59:59Z',
  l2Freshness: '2025-02-01T04:30:00Z',
  l3Freshness: '2025-02-01T06:30:00Z',
  auditCitation: 'COMMITTED_ENTERPRISE_2025Q1_RUN-v4.0.0_20250201-063000',
};

/* ────────────────────────────────────────────────────────────────────────────
 * AUDIT TRAIL TREE — full recursive structure
 * Dashboard → LoB → Counterparty → Facility → L2 Source
 * ──────────────────────────────────────────────────────────────────────────── */

export const AUDIT_TRAIL: AuditTrailNode = {
  id: 'dashboard',
  level: 'dashboard',
  label: 'Enterprise Committed Amount',
  sublabel: 'Total committed exposure across all lines of business',
  committedUsd: 1_261_750_000,
  displayValue: '$1,261,750,000',
  method: 'summation',
  methodLabel: 'Grand Total Summation',
  formula: 'SUM across all L1 Lines of Business',
  tier: 'T3',
  layerColor: 'pink',
  icon: LayoutDashboard,
  children: [
    {
      id: 'lob-gcb',
      level: 'lob',
      label: 'GCB — Global Consumer Banking',
      sublabel: 'L1 segment_id=1 · 1 facility',
      committedUsd: 150_000_000,
      displayValue: '$150,000,000',
      method: 'summation',
      methodLabel: 'Summation',
      formula: 'SUM committed_usd WHERE lob_segment_id ∈ GCB hierarchy',
      tier: 'T3',
      layerColor: 'emerald',
      icon: FolderTree,
      children: [
        {
          id: 'cpty-meridian',
          level: 'counterparty',
          label: 'CP-1 Meridian Aerospace Holdings',
          sublabel: 'BORROWER · ultimate_parent_id=1 · 100% ownership',
          committedUsd: 150_000_000,
          displayValue: '$150,000,000',
          method: 'summation',
          methodLabel: 'Summation (single facility)',
          formula: 'SUM(attributed_exposure_usd) WHERE ultimate_parent_id=1 AND is_risk_bearing=Y',
          tier: 'T3',
          layerColor: 'emerald',
          icon: Users,
          children: [
            {
              id: 'fac-1',
              level: 'facility',
              label: 'F-1 Meridian Aerospace — USD Revolver 2027',
              sublabel: 'USD · facility_id=1 · LEAD_ARRANGER 60%',
              committedUsd: 150_000_000,
              displayValue: '$150,000,000',
              method: 'direct',
              methodLabel: 'Direct Calculation',
              formula: 'total_commitment × fx_rate × bank_share_pct',
              tier: 'T3',
              layerColor: 'amber',
              icon: Building2,
              children: [
                {
                  id: 'fac-1-pd',
                  level: 'l2_source',
                  label: 'L2.position_detail',
                  sublabel: 'Source — total commitment',
                  displayValue: '$250,000,000',
                  layerColor: 'blue',
                  icon: Database,
                  l2Source: {
                    table: 'position_detail',
                    role: 'source',
                    columns: [
                      { column: 'total_commitment', value: 250_000_000, type: 'DECIMAL(18,2)', desc: 'Contractual max — $250M USD revolver' },
                      { column: 'position_id', value: 1, type: 'BIGINT', desc: 'Links to position table for facility mapping' },
                    ],
                    whereFilters: [
                      "position_id = 1 (via position.facility_id = 1)",
                      "as_of_date = '2025-01-31'",
                    ],
                    fkJoins: [
                      { from: 'position_detail.position_id', to: 'position.position_id', key: 'position_id', note: 'Get position context' },
                      { from: 'position.facility_id', to: 'facility_master.facility_id', key: 'facility_id', note: 'Map to facility identity' },
                    ],
                    formulaSteps: [
                      { step: 1, label: 'Total Commitment (USD)', operation: 'Start', result: 250_000_000 },
                      { step: 2, label: '× FX Rate (USD/USD)', operation: '$250,000,000 × 1.0000', result: 250_000_000 },
                      { step: 3, label: '× Bank Share (60%)', operation: '$250,000,000 × 0.60', result: 150_000_000 },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'lob-cb',
      level: 'lob',
      label: 'CB — Commercial Banking',
      sublabel: 'L1 segment_id=2 · 1 facility',
      committedUsd: 542_500_000,
      displayValue: '$542,500,000',
      method: 'summation',
      methodLabel: 'Summation',
      formula: 'SUM committed_usd WHERE lob_segment_id ∈ CB hierarchy',
      tier: 'T3',
      layerColor: 'emerald',
      icon: FolderTree,
      children: [
        {
          id: 'cpty-northbridge',
          level: 'counterparty',
          label: 'CP-2 Northbridge Pharmaceuticals',
          sublabel: 'BORROWER · ultimate_parent_id=2 · 100% ownership',
          committedUsd: 542_500_000,
          displayValue: '$542,500,000',
          method: 'summation',
          methodLabel: 'Summation (single facility)',
          formula: 'SUM(attributed_exposure_usd) WHERE ultimate_parent_id=2 AND is_risk_bearing=Y',
          tier: 'T3',
          layerColor: 'emerald',
          icon: Users,
          children: [
            {
              id: 'fac-2',
              level: 'facility',
              label: 'F-2 Northbridge Pharma — Term Loan B',
              sublabel: 'EUR · facility_id=2 · SOLE_LENDER 100%',
              committedUsd: 542_500_000,
              displayValue: '$542,500,000',
              method: 'direct',
              methodLabel: 'Direct Calculation',
              formula: 'total_commitment × fx_rate × bank_share_pct',
              tier: 'T3',
              layerColor: 'amber',
              icon: Building2,
              children: [
                {
                  id: 'fac-2-pd',
                  level: 'l2_source',
                  label: 'L2.position_detail',
                  sublabel: 'Source — total commitment (EUR, requires FX)',
                  displayValue: '$542,500,000',
                  layerColor: 'blue',
                  icon: Database,
                  l2Source: {
                    table: 'position_detail',
                    role: 'source',
                    columns: [
                      { column: 'total_commitment', value: 500_000_000, type: 'DECIMAL(18,2)', desc: 'Contractual max — €500M term loan' },
                      { column: 'position_id', value: 2, type: 'BIGINT', desc: 'Links to position table for facility mapping' },
                    ],
                    whereFilters: [
                      "position_id = 2 (via position.facility_id = 2)",
                      "as_of_date = '2025-01-31'",
                    ],
                    fkJoins: [
                      { from: 'position_detail.position_id', to: 'position.position_id', key: 'position_id', note: 'Get position context' },
                      { from: 'position.facility_id', to: 'facility_master.facility_id', key: 'facility_id', note: 'Map to facility identity' },
                      { from: 'facility_master.currency_code', to: 'fx_rate.from_currency_code', key: 'currency_code', note: 'Resolve EUR → USD conversion' },
                    ],
                    formulaSteps: [
                      { step: 1, label: 'Total Commitment (EUR)', operation: 'Start', result: 500_000_000 },
                      { step: 2, label: '× FX Rate (EUR/USD)', operation: '€500,000,000 × 1.0850', result: 542_500_000 },
                      { step: 3, label: '× Bank Share (100%)', operation: '$542,500,000 × 1.00', result: 542_500_000 },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'lob-gbm',
      level: 'lob',
      label: 'GBM — Global Banking & Markets',
      sublabel: 'L1 segment_id=3 · 1 facility, 2 co-borrowers',
      committedUsd: 569_250_000,
      displayValue: '$569,250,000',
      method: 'summation',
      methodLabel: 'Summation',
      formula: 'SUM committed_usd WHERE lob_segment_id ∈ GBM hierarchy',
      tier: 'T3',
      layerColor: 'emerald',
      icon: FolderTree,
      children: [
        {
          id: 'cpty-pacific',
          level: 'counterparty',
          label: 'CP-3 Pacific Ridge Energy LLC',
          sublabel: 'CO_BORROWER · ultimate_parent_id=3 · F-3 60% attribution',
          committedUsd: 341_550_000,
          displayValue: '$341,550,000',
          method: 'summation',
          methodLabel: 'Summation (attributed)',
          formula: 'SUM(attributed_exposure_usd) WHERE ultimate_parent_id=3 AND is_risk_bearing=Y',
          tier: 'T3',
          layerColor: 'emerald',
          icon: Users,
          children: [
            {
              id: 'fac-3-cp3',
              level: 'facility',
              label: 'F-3 Pacific Ridge RCF (CP-3 share)',
              sublabel: 'GBP · facility_id=3 · CO_BORROWER 60% attribution',
              committedUsd: 341_550_000,
              displayValue: '$341,550,000',
              method: 'attributed',
              methodLabel: 'Pre-Computed Attribution',
              formula: '$569,250,000 × 60% = $341,550,000',
              tier: 'T3',
              layerColor: 'amber',
              icon: Building2,
              children: [
                {
                  id: 'fac-3-cp3-eca',
                  level: 'l2_source',
                  label: 'L2.exposure_counterparty_attribution',
                  sublabel: 'Pre-computed — includes FX, bank_share, attribution',
                  displayValue: '$341,550,000',
                  layerColor: 'blue',
                  icon: Database,
                  l2Source: {
                    table: 'exposure_counterparty_attribution',
                    role: 'source',
                    columns: [
                      { column: 'attributed_exposure_usd', value: 341_550_000, type: 'DECIMAL(18,2)', desc: 'Pre-computed: £1B × 1.265 (GBP/USD) × 45% (bank share) × 60% (CP-3 attribution)' },
                      { column: 'attribution_pct', value: 0.60, type: 'DECIMAL(10,4)', desc: '60% co-borrower share of F-3' },
                      { column: 'counterparty_role_code', value: 'CO_BORROWER', type: 'VARCHAR(20)', desc: 'Risk-bearing role — included in committed amount' },
                    ],
                    whereFilters: [
                      'counterparty_id = 3',
                      'facility_id = 3',
                      "is_risk_bearing_flag = 'Y' (via counterparty_role_dim)",
                      "as_of_date = '2025-01-31'",
                    ],
                    fkJoins: [
                      { from: 'exposure_counterparty_attribution.counterparty_id', to: 'counterparty.counterparty_id', key: 'counterparty_id', note: 'Identify risk-bearing counterparty' },
                      { from: 'exposure_counterparty_attribution.facility_id', to: 'facility_master.facility_id', key: 'facility_id', note: 'Link back to facility F-3' },
                      { from: 'counterparty.counterparty_role_code', to: 'counterparty_role_dim.counterparty_role_code', key: 'counterparty_role_code', note: 'Check is_risk_bearing_flag = Y' },
                    ],
                    formulaSteps: [
                      { step: 1, label: 'Facility Commitment (GBP)', operation: 'Start', result: 1_000_000_000 },
                      { step: 2, label: '× FX Rate (GBP/USD)', operation: '£1,000,000,000 × 1.2650', result: 1_265_000_000 },
                      { step: 3, label: '× Bank Share (45%)', operation: '$1,265,000,000 × 0.45', result: 569_250_000 },
                      { step: 4, label: '× Attribution (60%)', operation: '$569,250,000 × 0.60', result: 341_550_000 },
                    ],
                  },
                },
              ],
            },
          ],
        },
        {
          id: 'cpty-summit',
          level: 'counterparty',
          label: 'CP-7 Summit Capital Partners LLC',
          sublabel: 'CO_BORROWER · ultimate_parent_id=7 · F-3 40% attribution',
          committedUsd: 227_700_000,
          displayValue: '$227,700,000',
          method: 'summation',
          methodLabel: 'Summation (attributed)',
          formula: 'SUM(attributed_exposure_usd) WHERE ultimate_parent_id=7 AND is_risk_bearing=Y',
          tier: 'T3',
          layerColor: 'emerald',
          icon: Users,
          children: [
            {
              id: 'fac-3-cp7',
              level: 'facility',
              label: 'F-3 Pacific Ridge RCF (CP-7 share)',
              sublabel: 'GBP · facility_id=3 · CO_BORROWER 40% attribution',
              committedUsd: 227_700_000,
              displayValue: '$227,700,000',
              method: 'attributed',
              methodLabel: 'Pre-Computed Attribution',
              formula: '$569,250,000 × 40% = $227,700,000',
              tier: 'T3',
              layerColor: 'amber',
              icon: Building2,
              children: [
                {
                  id: 'fac-3-cp7-eca',
                  level: 'l2_source',
                  label: 'L2.exposure_counterparty_attribution',
                  sublabel: 'Pre-computed — includes FX, bank_share, attribution',
                  displayValue: '$227,700,000',
                  layerColor: 'blue',
                  icon: Database,
                  l2Source: {
                    table: 'exposure_counterparty_attribution',
                    role: 'source',
                    columns: [
                      { column: 'attributed_exposure_usd', value: 227_700_000, type: 'DECIMAL(18,2)', desc: 'Pre-computed: £1B × 1.265 (GBP/USD) × 45% (bank share) × 40% (CP-7 attribution)' },
                      { column: 'attribution_pct', value: 0.40, type: 'DECIMAL(10,4)', desc: '40% co-borrower share of F-3' },
                      { column: 'counterparty_role_code', value: 'CO_BORROWER', type: 'VARCHAR(20)', desc: 'Risk-bearing role — included in committed amount' },
                    ],
                    whereFilters: [
                      'counterparty_id = 7',
                      'facility_id = 3',
                      "is_risk_bearing_flag = 'Y' (via counterparty_role_dim)",
                      "as_of_date = '2025-01-31'",
                    ],
                    fkJoins: [
                      { from: 'exposure_counterparty_attribution.counterparty_id', to: 'counterparty.counterparty_id', key: 'counterparty_id', note: 'Identify risk-bearing counterparty' },
                      { from: 'exposure_counterparty_attribution.facility_id', to: 'facility_master.facility_id', key: 'facility_id', note: 'Link back to facility F-3' },
                      { from: 'counterparty.counterparty_role_code', to: 'counterparty_role_dim.counterparty_role_code', key: 'counterparty_role_code', note: 'Check is_risk_bearing_flag = Y' },
                    ],
                    formulaSteps: [
                      { step: 1, label: 'Facility Commitment (GBP)', operation: 'Start', result: 1_000_000_000 },
                      { step: 2, label: '× FX Rate (GBP/USD)', operation: '£1,000,000,000 × 1.2650', result: 1_265_000_000 },
                      { step: 3, label: '× Bank Share (45%)', operation: '$1,265,000,000 × 0.45', result: 569_250_000 },
                      { step: 4, label: '× Attribution (40%)', operation: '$569,250,000 × 0.40', result: 227_700_000 },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
