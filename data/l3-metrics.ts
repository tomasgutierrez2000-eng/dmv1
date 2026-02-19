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
  icon: string;
  description: string;
}

export type MetricType = 'Aggregate' | 'Ratio' | 'Count' | 'Derived' | 'Status' | 'Trend' | 'Table' | 'Categorical';

export type DimensionInteraction = 'FILTER' | 'GROUP_BY' | 'AVAILABLE' | 'TOGGLE';

/** Dimension at which the metric is calculated (grain): counterparty, facility, or layer (L1/L2/L3). */
export type CalculationDimension = 'counterparty' | 'facility' | 'L1' | 'L2' | 'L3';

export const CALCULATION_DIMENSIONS: CalculationDimension[] = ['counterparty', 'facility', 'L1', 'L2', 'L3'];

export const CALCULATION_DIMENSION_LABELS: Record<CalculationDimension, string> = {
  counterparty: 'Counterparty',
  facility: 'Facility',
  L1: 'L1 (Reference)',
  L2: 'L2 (Snapshot)',
  L3: 'L3 (Derived)',
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
  { id: 'P1', name: 'Executive Summary',      shortName: 'Executive',      color: '#ef4444', bgColor: 'bg-red-500/10',     borderColor: 'border-red-500/30',     icon: '📊', description: 'High-level KPIs, limit utilization, velocity, and action items' },
  { id: 'P2', name: 'Exposure Composition',    shortName: 'Exposure',       color: '#3b82f6', bgColor: 'bg-blue-500/10',    borderColor: 'border-blue-500/30',    icon: '💰', description: 'Gross/net exposure breakdowns, coverage, counterparty analysis' },
  { id: 'P3', name: 'Concentration & Limits',  shortName: 'Concentration',  color: '#10b981', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', icon: '🎯', description: 'Limit utilization, sector concentration, headroom, breaches' },
  { id: 'P4', name: 'Legal Entity & DQ',       shortName: 'Legal / DQ',     color: '#8b5cf6', bgColor: 'bg-purple-500/10',  borderColor: 'border-purple-500/30',  icon: '⚖️', description: 'Legal entity structure, cross-entity exposure, data quality' },
  { id: 'P5', name: 'Trends & Stress',         shortName: 'Stress',         color: '#06b6d4', bgColor: 'bg-cyan-500/10',    borderColor: 'border-cyan-500/30',    icon: '📈', description: 'Stress testing, threshold breaches, anomaly detection' },
  { id: 'P6', name: 'Facility & Events',       shortName: 'Facilities',     color: '#f59e0b', bgColor: 'bg-amber-500/10',   borderColor: 'border-amber-500/30',   icon: '🏗️', description: 'Facility lifecycle, amendments, events, pipeline' },
  { id: 'P7', name: 'Portfolio Analysis',       shortName: 'Portfolio',      color: '#ec4899', bgColor: 'bg-pink-500/10',    borderColor: 'border-pink-500/30',    icon: '📋', description: 'Deterioration, rating migration, delinquency, profitability' },
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
    name: 'LoB vs LE Toggle',
    values: ['Line of Business', 'Legal Entity'],
    defaultValue: 'Line of Business',
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
  lob_segment_id: 'Line of Business',
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
