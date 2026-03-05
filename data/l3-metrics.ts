/**
 * L3 Metric Catalog — Full specification extracted from the L3 data dictionary.
 *
 * 106+ metrics across 7 dashboard pages (P1–P7), with formulas,
 * source field lineage, dimension interactions, and toggle support.
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type DashboardPage = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7';

export interface PageInfo {
  id: DashboardPage;
  name: string;
  shortName: string;
  color: string;
  bgColor: string;
  borderColor: string;
  /** Lucide icon name for display (e.g. BarChart3, Wallet). */
  icon: string;
  description: string;
}

export type MetricType = 'Aggregate' | 'Ratio' | 'Count' | 'Derived' | 'Status' | 'Trend' | 'Table' | 'Categorical';

export type DimensionInteraction = 'FILTER' | 'GROUP_BY' | 'AVAILABLE' | 'TOGGLE';

/** Dimension at which the metric is calculated (grain): counterparty, facility, or layer (L1/L2/L3). */
export type CalculationDimension = 'counterparty' | 'facility' | 'L1' | 'L2' | 'L3';

export const CALCULATION_DIMENSIONS: CalculationDimension[] = ['counterparty', 'facility', 'L1', 'L2', 'L3'];

/** Business-facing labels for aggregation levels (Facility, Counterparty, Desk, Portfolio, Business Segment). */
export const CALCULATION_DIMENSION_LABELS: Record<CalculationDimension, string> = {
  counterparty: 'Counterparty',
  facility: 'Facility',
  L1: 'Business Segment',
  L2: 'Portfolio',
  L3: 'Desk',
};

/** API level param for consumption API: facility | counterparty | desk | portfolio | lob */
export type ConsumptionLevel = 'facility' | 'counterparty' | 'desk' | 'portfolio' | 'lob';

export const CONSUMPTION_LEVELS: ConsumptionLevel[] = ['facility', 'counterparty', 'desk', 'portfolio', 'lob'];

/** Map CalculationDimension to ConsumptionLevel for the values/consumable API. */
export const DIMENSION_TO_CONSUMPTION_LEVEL: Record<CalculationDimension, ConsumptionLevel> = {
  facility: 'facility',
  counterparty: 'counterparty',
  L3: 'desk',
  L2: 'portfolio',
  L1: 'lob',
};

/** Map ConsumptionLevel (API param) back to CalculationDimension. */
export const CONSUMPTION_LEVEL_TO_DIMENSION: Record<ConsumptionLevel, CalculationDimension> = {
  facility: 'facility',
  counterparty: 'counterparty',
  desk: 'L3',
  portfolio: 'L2',
  lob: 'L1',
};

export interface DimensionUsage {
  dimension: string;
  interaction: DimensionInteraction;
}

export interface SourceField {
  layer: 'L1' | 'L2';
  table: string;
  field: string;
  description?: string;
  sampleValue?: string;
}

export interface LineageNode {
  id: string;
  layer: 'L1' | 'L2' | 'L3' | 'transform';
  table: string;
  field: string;
  /** When set, this node represents a table with multiple fields (for grouped lineage). */
  fields?: string[];
  dataType?: string;
  sampleValue?: string;
  description?: string;
  formula?: string;
  /** Optional filter context (e.g. "Product: CRE · Sub-product: Multifamily · Scenarios: BASE") so lineage shows how data is pulled. */
  filterCriteria?: string;
}

export interface LineageEdge {
  from: string;
  to: string;
  label?: string;
}

export interface L3Metric {
  id: string;
  name: string;
  page: DashboardPage;
  section: string;
  metricType: MetricType;
  formula: string;
  formulaSQL?: string;
  description: string;
  displayFormat: string;
  sampleValue: string;
  sourceFields: SourceField[];
  dimensions: DimensionUsage[];
  /** Dimensions at which this metric can be calculated (grain). If omitted, all are allowed. */
  allowedDimensions?: CalculationDimension[];
  /** Formula (and optional formulaSQL) per calculation dimension. Overrides metrics_dimensions_filled when set. */
  formulasByDimension?: Partial<Record<CalculationDimension, { formula: string; formulaSQL?: string }>>;
  /** Display name when viewing the metric at each dimension (e.g. "Counterparty # Loans"). */
  displayNameByDimension?: Partial<Record<CalculationDimension, string>>;
  toggles?: string[];
  notes?: string;
  // Detailed lineage — only populated for key metrics with visual DAGs
  nodes?: LineageNode[];
  edges?: LineageEdge[];
}

export interface ToggleDef {
  id: string;
  name: string;
  values: [string, string];
  defaultValue: string;
  affectedMetrics: string[];
  impactDescription: string;
  pages: DashboardPage[];
}

// ═══════════════════════════════════════════════════════════════
// Dashboard Pages
// ═══════════════════════════════════════════════════════════════

export const DASHBOARD_PAGES: PageInfo[] = [
  { id: 'P1', name: 'Executive Summary',      shortName: 'Executive',      color: '#ef4444', bgColor: 'bg-red-500/10',     borderColor: 'border-red-500/30',     icon: 'BarChart3', description: 'High-level KPIs, limit utilization, velocity, and action items' },
  { id: 'P2', name: 'Exposure Composition',    shortName: 'Exposure',       color: '#3b82f6', bgColor: 'bg-blue-500/10',    borderColor: 'border-blue-500/30',    icon: 'Wallet', description: 'Gross/net exposure breakdowns, coverage, counterparty analysis' },
  { id: 'P3', name: 'Concentration & Limits',  shortName: 'Concentration',  color: '#10b981', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', icon: 'Target', description: 'Limit utilization, sector concentration, headroom, breaches' },
  { id: 'P4', name: 'Legal Entity & DQ',       shortName: 'Legal / DQ',     color: '#8b5cf6', bgColor: 'bg-purple-500/10',  borderColor: 'border-purple-500/30',  icon: 'Scale', description: 'Legal entity structure, cross-entity exposure, data quality' },
  { id: 'P5', name: 'Trends & Stress',         shortName: 'Stress',         color: '#06b6d4', bgColor: 'bg-cyan-500/10',    borderColor: 'border-cyan-500/30',    icon: 'TrendingUp', description: 'Stress testing, threshold breaches, anomaly detection' },
  { id: 'P6', name: 'Facility & Events',       shortName: 'Facilities',     color: '#f59e0b', bgColor: 'bg-amber-500/10',   borderColor: 'border-amber-500/30',   icon: 'Building2', description: 'Facility lifecycle, amendments, events, pipeline' },
  { id: 'P7', name: 'Portfolio Analysis',       shortName: 'Portfolio',      color: '#ec4899', bgColor: 'bg-pink-500/10',    borderColor: 'border-pink-500/30',    icon: 'ClipboardList', description: 'Deterioration, rating migration, delinquency, profitability' },
];

export const PAGE_MAP = new Map(DASHBOARD_PAGES.map(p => [p.id, p]));

// ═══════════════════════════════════════════════════════════════
// Toggle Definitions (from spec Image 4)
// ═══════════════════════════════════════════════════════════════

export const TOGGLES: ToggleDef[] = [
  {
    id: 'exposure_calc',
    name: 'Exposure Calc Toggle',
    values: ['Gross', 'Net'],
    defaultValue: 'Gross',
    affectedMetrics: ['M017', 'M018', 'M019', 'M020', 'M024', 'M025', 'M026', 'M027', 'M029', 'M034', 'M035', 'M037', 'M044', 'M045', 'M051', 'M057', 'M058', 'M075', 'M084', 'M093', 'M094', 'M096', 'M097', 'M098', 'M099', 'M100', 'M101', 'M102'],
    impactDescription: 'Switches measure between gross_exposure_amt and net_exposure_amt. Does NOT change record count or exposure values.',
    pages: ['P2', 'P3', 'P4', 'P6', 'P7'],
  },
  {
    id: 'product_grouping',
    name: 'Product Grouping Toggle',
    values: ['Product', 'FR 2590 Category'],
    defaultValue: 'Product',
    affectedMetrics: ['M024', 'M026'],
    impactDescription: 'Switches GROUP BY dimension between product_node_id (7+ types) and fr2590_category_code (5 categories: G-1 through G-5). Many-to-one mapping.',
    pages: ['P2'],
  },
  {
    id: 'risk_rating',
    name: 'Risk Rating Toggle',
    values: ['Internal', 'External'],
    defaultValue: 'Internal',
    affectedMetrics: ['M027', 'M030'],
    impactDescription: 'Switches grouping between internal_risk_rating (1-5) and external_risk_rating (CCC-AAA). Does NOT change total count or exposure values.',
    pages: ['P2'],
  },
  {
    id: 'lob_vs_le',
    name: 'Business Segment vs LE Toggle',
    values: ['Business Segment', 'Legal Entity'],
    defaultValue: 'Business Segment',
    affectedMetrics: ['M059'],
    impactDescription: 'Switches dimension_type between LOB and LEGAL_ENTITY in data_quality_score_summary.',
    pages: ['P4'],
  },
  {
    id: 'facility_timeline',
    name: 'Facility Effective/Liquidation Toggle',
    values: ['Effective Date', 'Maturity Date'],
    defaultValue: 'Effective Date',
    affectedMetrics: ['M078'],
    impactDescription: 'Switches timeline_type between EFFECTIVE and MATURITY. Changes chart title dynamically: "New Facilities" vs "Maturing Facilities".',
    pages: ['P6'],
  },
];

// ═══════════════════════════════════════════════════════════════
// Dimension labels
// ═══════════════════════════════════════════════════════════════

export const DIMENSION_LABELS: Record<string, string> = {
  as_of_date: 'As-of Date',
  counterparty_id: 'Counterparty',
  legal_entity_id: 'Legal Entity',
  lob_segment_id: 'Business Segment',
  product_node_id: 'Product',
  facility_id: 'Facility',
  scenario_id: 'Scenario',
  region_code: 'Region',
  industry_code: 'Industry',
  risk_tier_code: 'Risk Tier',
  limit_status_code: 'Limit Status',
  rating_grade_id: 'Rating Grade',
  risk_mitigant_subtype: 'Risk Mitigant',
  amendment_type_code: 'Amendment Type',
  bl_classification: 'Classification',
  metric_id: 'Metric',
  timeline_type: 'Timeline Type',
};

// ═══════════════════════════════════════════════════════════════
// L3 Metric Catalog — Full list organized by dashboard page
// ═══════════════════════════════════════════════════════════════

export const L3_METRICS: L3Metric[] = [
  {
    id: 'C001',
    name: 'Undrawn Exposure',
    page: 'P2',
    section: 'Exposure Breakdown',
    metricType: 'Aggregate',
    formula: 'SUM(unfunded_amount per position) * bank_share',
    formulaSQL: `SELECT
  fm.facility_id,
  SUM(p.unfunded_amount) * fm.bank_share AS undrawn_exposure
FROM facility_master fm
JOIN positions p ON p.facility_id = fm.facility_id
WHERE fm.facility_active_flag = 'Y'
GROUP BY fm.facility_id, fm.bank_share`,
    description: 'Committed but not yet drawn portion of credit exposure in USD. Reflects contingent funding risk — the maximum additional drawdown the bank may be called upon to fund.',
    displayFormat: '$,.0f',
    sampleValue: '$15,000,000',
    sourceFields: [
      { layer: 'L2', table: 'positions', field: 'unfunded_amount', description: 'Unfunded/undrawn amount per position' },
      { layer: 'L2', table: 'positions', field: 'position_id', description: 'Position identifier for iteration' },
      { layer: 'L1', table: 'facility_master', field: 'facility_id', description: 'Primary key — grain of calculation' },
      { layer: 'L1', table: 'facility_master', field: 'facility_active_flag', description: 'Active facility filter' },
      { layer: 'L1', table: 'facility_master', field: 'bank_share', description: "Bank's participation share (0.0-1.0)" },
      { layer: 'L1', table: 'facility_master', field: 'counterparty_id', description: 'FK to counterparty — grouping key' },
      { layer: 'L1', table: 'facility_master', field: 'lob_segment_id', description: 'FK to business taxonomy — desk/portfolio/lob rollup' },
      { layer: 'L1', table: 'facility_counterparty_participation', field: 'participation_pct', description: 'Counterparty participation percentage in facility' },
      { layer: 'L1', table: 'enterprise_business_taxonomy', field: 'managed_segment_id', description: 'Hierarchy node PK' },
      { layer: 'L1', table: 'enterprise_business_taxonomy', field: 'parent_segment_id', description: 'FK for recursive hierarchy traversal' },
      { layer: 'L1', table: 'enterprise_business_taxonomy', field: 'tree_level', description: 'Hierarchy depth label (L1/L2/L3)' },
    ],
    dimensions: [
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
      { dimension: 'lob_segment_id', interaction: 'GROUP_BY' },
      { dimension: 'product_node_id', interaction: 'FILTER' },
    ],
    allowedDimensions: ['facility', 'counterparty', 'L3', 'L2', 'L1'],
    formulasByDimension: {
      facility: {
        formula: 'SUM(unfunded_amount per position) * bank_share',
        formulaSQL: `SELECT
  fm.facility_id,
  SUM(p.unfunded_amount) * fm.bank_share AS undrawn_exposure
FROM facility_master fm
JOIN positions p ON p.facility_id = fm.facility_id
WHERE fm.facility_active_flag = 'Y'
GROUP BY fm.facility_id, fm.bank_share`,
      },
      counterparty: {
        formula: 'SUM(participation_pct * Facility Undrawn Exposure) per counterparty',
        formulaSQL: `SELECT
  fm.counterparty_id,
  SUM(fac_ue.undrawn_exposure * fcp.participation_pct) AS undrawn_exposure
FROM (
  SELECT fm2.facility_id, SUM(p.unfunded_amount) * fm2.bank_share AS undrawn_exposure
  FROM facility_master fm2
  JOIN positions p ON p.facility_id = fm2.facility_id
  WHERE fm2.facility_active_flag = 'Y'
  GROUP BY fm2.facility_id, fm2.bank_share
) fac_ue
JOIN facility_master fm ON fm.facility_id = fac_ue.facility_id
JOIN facility_counterparty_participation fcp
  ON fcp.facility_id = fac_ue.facility_id AND fcp.counterparty_id = fm.counterparty_id
GROUP BY fm.counterparty_id`,
      },
      L3: {
        formula: 'SUM(Facility Undrawn Exposure) per L3 desk',
        formulaSQL: `SELECT
  ebt.managed_segment_id,
  SUM(fac_ue.undrawn_exposure) AS undrawn_exposure
FROM (
  SELECT fm2.facility_id, fm2.lob_segment_id,
         SUM(p.unfunded_amount) * fm2.bank_share AS undrawn_exposure
  FROM facility_master fm2
  JOIN positions p ON p.facility_id = fm2.facility_id
  WHERE fm2.facility_active_flag = 'Y'
  GROUP BY fm2.facility_id, fm2.lob_segment_id, fm2.bank_share
) fac_ue
JOIN enterprise_business_taxonomy ebt
  ON ebt.managed_segment_id = fac_ue.lob_segment_id AND ebt.tree_level = 'L3'
GROUP BY ebt.managed_segment_id`,
      },
      L2: {
        formula: 'SUM(Facility Undrawn Exposure) per L2 portfolio',
        formulaSQL: `SELECT
  ebt_l2.managed_segment_id,
  SUM(fac_ue.undrawn_exposure) AS undrawn_exposure
FROM (
  SELECT fm2.facility_id, fm2.lob_segment_id,
         SUM(p.unfunded_amount) * fm2.bank_share AS undrawn_exposure
  FROM facility_master fm2
  JOIN positions p ON p.facility_id = fm2.facility_id
  WHERE fm2.facility_active_flag = 'Y'
  GROUP BY fm2.facility_id, fm2.lob_segment_id, fm2.bank_share
) fac_ue
JOIN enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fac_ue.lob_segment_id
JOIN enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id AND ebt_l2.tree_level = 'L2'
GROUP BY ebt_l2.managed_segment_id`,
      },
      L1: {
        formula: 'SUM(Facility Undrawn Exposure) per L1 business segment',
        formulaSQL: `SELECT
  ebt_l1.managed_segment_id,
  SUM(fac_ue.undrawn_exposure) AS undrawn_exposure
FROM (
  SELECT fm2.facility_id, fm2.lob_segment_id,
         SUM(p.unfunded_amount) * fm2.bank_share AS undrawn_exposure
  FROM facility_master fm2
  JOIN positions p ON p.facility_id = fm2.facility_id
  WHERE fm2.facility_active_flag = 'Y'
  GROUP BY fm2.facility_id, fm2.lob_segment_id, fm2.bank_share
) fac_ue
JOIN enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fac_ue.lob_segment_id
JOIN enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
JOIN enterprise_business_taxonomy ebt_l1
  ON ebt_l1.managed_segment_id = ebt_l2.parent_segment_id AND ebt_l1.tree_level = 'L1'
GROUP BY ebt_l1.managed_segment_id`,
      },
    },
    displayNameByDimension: {
      facility: 'Facility Undrawn Exposure ($)',
      counterparty: 'Counterparty Undrawn Exposure ($)',
      L3: 'Desk Undrawn Exposure ($)',
      L2: 'Portfolio Undrawn Exposure ($)',
      L1: 'Business Segment Undrawn Exposure ($)',
    },
    nodes: [
      {
        id: 'src-positions', layer: 'L2', table: 'positions', field: 'unfunded_amount',
        fields: ['unfunded_amount', 'position_id', 'facility_id'],
        description: 'Position-level unfunded (undrawn) amounts per facility',
        sampleValue: '15000000',
      },
      {
        id: 'src-facility', layer: 'L1', table: 'facility_master', field: 'facility_id',
        fields: ['facility_id', 'bank_share', 'facility_active_flag', 'counterparty_id', 'lob_segment_id'],
        description: 'Facility master — bank share, active flag, hierarchy keys',
        sampleValue: 'F-201',
      },
      {
        id: 'src-participation', layer: 'L1', table: 'facility_counterparty_participation', field: 'participation_pct',
        fields: ['participation_pct', 'facility_id', 'counterparty_id'],
        description: 'Counterparty participation percentages per facility',
        sampleValue: '0.50',
      },
      {
        id: 'src-taxonomy', layer: 'L1', table: 'enterprise_business_taxonomy', field: 'managed_segment_id',
        fields: ['managed_segment_id', 'parent_segment_id', 'tree_level', 'segment_name'],
        description: 'Business hierarchy for desk/portfolio/Business Segment rollup',
        sampleValue: 'SEG-L3-CRE',
      },
      {
        id: 'calc-fac', layer: 'transform', table: '', field: 'facility_undrawn_exposure',
        formula: 'SUM(unfunded_amount per position) * bank_share',
        description: 'Aggregate position unfunded amounts and apply bank share',
        filterCriteria: 'WHERE facility_active_flag = Y AND MAX(as_of_date)',
      },
      {
        id: 'calc-rollup', layer: 'transform', table: '', field: 'rollup_undrawn_exposure',
        formula: 'SUM(facility_undrawn_exposure) per hierarchy level',
        description: 'Roll up facility values via counterparty → desk → portfolio → Business Segment',
      },
      {
        id: 'output', layer: 'L3', table: 'l3_exposure_breakdown', field: 'undrawn_exposure',
        description: 'Undrawn Exposure ($) — contingent funding risk',
        sampleValue: '$15,000,000',
      },
    ],
    edges: [
      { from: 'src-positions', to: 'calc-fac', label: 'SUM per facility_id' },
      { from: 'src-facility', to: 'calc-fac', label: 'bank_share × filter' },
      { from: 'calc-fac', to: 'calc-rollup', label: 'facility-level values' },
      { from: 'src-participation', to: 'calc-rollup', label: 'counterparty pct' },
      { from: 'src-taxonomy', to: 'calc-rollup', label: 'hierarchy traversal' },
      { from: 'calc-rollup', to: 'output' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

export function metricsByPage(page: DashboardPage): L3Metric[] {
  return L3_METRICS.filter(m => m.page === page);
}

export function getMetric(id: string): L3Metric | undefined {
  return L3_METRICS.find(m => m.id === id);
}

export function metricsWithLineage(): L3Metric[] {
  return L3_METRICS.filter(m => m.nodes && m.nodes.length > 0);
}

export function getTogglesForMetric(metricId: string): ToggleDef[] {
  return TOGGLES.filter(t => t.affectedMetrics.includes(metricId));
}

export function getTogglesForPage(page: DashboardPage): ToggleDef[] {
  return TOGGLES.filter(t => t.pages.includes(page));
}
