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
  // ─────────────────────────────────────────────────────────────
  // P1 — Executive Summary
  // ─────────────────────────────────────────────────────────────
  {
    id: 'M001', name: 'Executive Summary Bullets', page: 'P1', section: 'Header',
    metricType: 'Status', formula: 'Narrative generation from top KPI deltas',
    description: 'Auto-generated bullet points summarizing key changes since last period.',
    displayFormat: 'Text', sampleValue: '3 bullets',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L2', table: 'position', field: 'pd_estimate' },
    ],
    dimensions: [{ dimension: 'as_of_date', interaction: 'FILTER' }],
  },
  {
    id: 'M004', name: 'Current Value', page: 'P1', section: 'KPI Cards',
    metricType: 'Aggregate', formula: 'Value of the selected metric at current as_of_date',
    description: 'Current value of any tracked executive metric (exposure, PD, utilization, etc.).',
    displayFormat: '$#,##0 or #0.0%', sampleValue: '$4.2B',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', sampleValue: '$4.2B' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'metric_id', interaction: 'FILTER' },
    ],
  },
  {
    id: 'M005', name: 'Limit Value', page: 'P1', section: 'KPI Cards',
    metricType: 'Aggregate', formula: 'limit_amount from limit_rule for the metric',
    description: 'The regulatory or internal limit threshold for a given metric.',
    displayFormat: '$#,##0', sampleValue: '$5.0B',
    sourceFields: [
      { layer: 'L1', table: 'limit_rule', field: 'limit_amount', sampleValue: '$5.0B' },
    ],
    dimensions: [
      { dimension: 'metric_id', interaction: 'FILTER' },
    ],
  },
  {
    id: 'M007', name: 'Utilization %', page: 'P1', section: 'KPI Cards',
    metricType: 'Ratio',
    formula: 'current_value ÷ limit_value × 100',
    formulaSQL: 'SUM(fes.gross_exposure_usd) / lr.limit_amount * 100',
    description: 'How much of the limit is being used. Key early-warning indicator shown on every executive KPI card.',
    displayFormat: '#0.0%', sampleValue: '84.0%',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', sampleValue: '$4.2B', description: 'Current aggregate exposure' },
      { layer: 'L1', table: 'limit_rule', field: 'limit_amount', sampleValue: '$5.0B', description: 'Approved limit' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'metric_id', interaction: 'FILTER' },
    ],
    nodes: [
      { id: 'l2-fes-gross-u', layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', dataType: 'DECIMAL(18,2)', sampleValue: '$4.2B', description: 'Sum of all facility gross exposures' },
      { id: 'l1-lr-limit',    layer: 'L1', table: 'limit_rule',                  field: 'limit_amount',       dataType: 'DECIMAL(18,2)', sampleValue: '$5.0B', description: 'Board-approved limit' },
      { id: 'tx-divide',      layer: 'transform', table: '',                     field: 'current ÷ limit',    formula: 'SUM(exposure) / limit × 100', sampleValue: '84.0%', description: 'Utilization percentage' },
      { id: 'l3-util',        layer: 'L3', table: 'executive_kpi',               field: 'utilization_pct',    dataType: 'DECIMAL(5,2)', sampleValue: '84.0%', formula: 'exposure ÷ limit × 100', description: 'Utilization Rate' },
    ],
    edges: [
      { from: 'l2-fes-gross-u', to: 'tx-divide', label: '÷' },
      { from: 'l1-lr-limit',    to: 'tx-divide', label: '÷' },
      { from: 'tx-divide',      to: 'l3-util',   label: '× 100' },
    ],
  },
  {
    id: 'M008', name: 'Velocity (30d / MoM)', page: 'P1', section: 'KPI Cards',
    metricType: 'Derived',
    formula: '(value[T] − value[T-30d]) ÷ value[T-30d] × 100',
    formulaSQL: '(curr.value - prior.value) / prior.value * 100',
    description: '30-day rate of change for the metric. Shows momentum and direction of movement.',
    displayFormat: '+#0.0%', sampleValue: '+2.3%',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd [T]', sampleValue: '$4.2B' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd [T-30d]', sampleValue: '$4.1B' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'metric_id', interaction: 'FILTER' },
    ],
    nodes: [
      { id: 'l2-curr', layer: 'L2', table: 'facility_exposure_snapshot', field: 'value [T]',     sampleValue: '$4.2B', description: 'Current period value' },
      { id: 'l2-prior', layer: 'L2', table: 'facility_exposure_snapshot', field: 'value [T-30d]', sampleValue: '$4.1B', description: 'Prior period value' },
      { id: 'tx-delta', layer: 'transform', table: '', field: 'Δ value',  formula: 'current − prior', sampleValue: '+$0.1B', description: 'Absolute change' },
      { id: 'l3-vel',   layer: 'L3', table: 'executive_kpi', field: 'velocity_30d', sampleValue: '+2.3%', formula: 'Δ ÷ prior × 100', description: '30-day velocity' },
    ],
    edges: [
      { from: 'l2-curr',  to: 'tx-delta', label: '−' },
      { from: 'l2-prior', to: 'tx-delta', label: '−' },
      { from: 'tx-delta', to: 'l3-vel',   label: '÷' },
      { from: 'l2-prior', to: 'l3-vel',   label: '÷' },
    ],
  },
  {
    id: 'M009', name: 'Immediate Action Required', page: 'P1', section: 'KPI Cards',
    metricType: 'Status', formula: 'CASE WHEN utilization > outer_threshold THEN "BREACH" ...',
    description: 'Flag indicating if the metric requires immediate attention based on threshold comparison.',
    displayFormat: 'Badge', sampleValue: 'WARNING',
    sourceFields: [
      { layer: 'L1', table: 'limit_threshold', field: 'outer_threshold_pct', sampleValue: '95%' },
      { layer: 'L1', table: 'limit_threshold', field: 'inner_threshold_pct', sampleValue: '85%' },
    ],
    dimensions: [{ dimension: 'metric_id', interaction: 'FILTER' }],
  },
  {
    id: 'M013', name: '12-Month Metric Value Trend', page: 'P1', section: 'Trend Sparkline',
    metricType: 'Trend', formula: 'SELECT value FROM kpi_history WHERE as_of_date >= T-12M ORDER BY as_of_date',
    description: '12-month sparkline trend for the selected KPI metric.',
    displayFormat: 'Sparkline', sampleValue: '12 data points',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'metric_id', interaction: 'FILTER' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // P2 — Exposure Composition
  // ─────────────────────────────────────────────────────────────
  {
    id: 'M017', name: 'Gross Exposure', page: 'P2', section: 'Exposure Summary',
    metricType: 'Aggregate',
    formula: 'SUM(gross_exposure_usd)',
    formulaSQL: 'SUM(fes.gross_exposure_usd)',
    description: 'Total gross exposure across all facilities before collateral netting. Primary measure of portfolio size.',
    displayFormat: '$#,##0.0M', sampleValue: '$4.2B',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', sampleValue: '$178.3M per facility', description: 'Gross exposure per facility per month' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
      { dimension: 'lob_segment_id', interaction: 'GROUP_BY' },
      { dimension: 'product_node_id', interaction: 'GROUP_BY' },
    ],
    toggles: ['exposure_calc'],
    nodes: [
      { id: 'l1-fm',       layer: 'L1', table: 'facility_master',            field: 'facility_id',         sampleValue: 'FAC-*', description: 'All active facilities' },
      { id: 'l2-fes',      layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd',  sampleValue: '$178.3M', description: 'Per-facility gross exposure' },
      { id: 'tx-sum',      layer: 'transform', table: '',                    field: 'SUM()',                formula: 'SUM across all facilities', sampleValue: '$4.2B', description: 'Aggregate sum' },
      { id: 'l3-gross',    layer: 'L3', table: 'exposure_summary',           field: 'total_gross_exposure', sampleValue: '$4.2B', formula: 'SUM(gross_exposure_usd)', description: 'Total Gross Exposure' },
    ],
    edges: [
      { from: 'l1-fm',  to: 'l2-fes',  label: 'JOIN' },
      { from: 'l2-fes', to: 'tx-sum',  label: 'SUM' },
      { from: 'tx-sum', to: 'l3-gross', label: '→' },
    ],
  },
  {
    id: 'M018', name: 'Total Committed Exposure', page: 'P2', section: 'Exposure Summary',
    metricType: 'Aggregate', formula: 'SUM(committed_facility_amt)',
    formulaSQL: 'SUM(fm.committed_facility_amt)',
    description: 'Total committed amount across all facilities — the maximum potential exposure.',
    displayFormat: '$#,##0.0M', sampleValue: '$6.1B',
    sourceFields: [
      { layer: 'L1', table: 'facility_master', field: 'committed_facility_amt', sampleValue: '$250.0M' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    toggles: ['exposure_calc'],
  },
  {
    id: 'M019', name: 'Total Outstanding Exposure', page: 'P2', section: 'Exposure Summary',
    metricType: 'Aggregate', formula: 'SUM(drawn_amount)',
    formulaSQL: 'SUM(fes.drawn_amount)',
    description: 'Total drawn/outstanding balance across all facilities.',
    displayFormat: '$#,##0.0M', sampleValue: '$3.8B',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount', sampleValue: '$162.5M' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    toggles: ['exposure_calc'],
  },
  {
    id: 'M020', name: 'Net Exposure', page: 'P2', section: 'Exposure Summary',
    metricType: 'Aggregate',
    formula: 'SUM(gross_exposure) − SUM(allocated_collateral)',
    formulaSQL: 'SUM(fes.gross_exposure_usd) - SUM(cs.allocated_amount_usd)',
    description: 'Residual exposure after subtracting all allocated collateral. The unsecured portion.',
    displayFormat: '$#,##0.0M', sampleValue: '$2.1B',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', sampleValue: '$4.2B (agg)', description: 'Total gross exposure' },
      { layer: 'L2', table: 'collateral_snapshot', field: 'allocated_amount_usd', sampleValue: '$2.1B (agg)', description: 'Total allocated collateral' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
      { dimension: 'lob_segment_id', interaction: 'GROUP_BY' },
    ],
    toggles: ['exposure_calc'],
    nodes: [
      { id: 'l2-gross',     layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd',   sampleValue: '$4.2B', description: 'Aggregate gross exposure' },
      { id: 'l1-cam',       layer: 'L1', table: 'collateral_asset_master',    field: 'latest_valuation_usd', sampleValue: '$2.6B', description: 'Collateral pool valuation' },
      { id: 'l2-cs',        layer: 'L2', table: 'collateral_snapshot',        field: 'allocated_amount_usd', sampleValue: '$2.1B', description: 'Allocated (post-haircut) collateral' },
      { id: 'tx-subtract',  layer: 'transform', table: '',                    field: 'gross − collateral',   formula: 'SUM(gross) − SUM(allocated)', sampleValue: '$2.1B', description: 'Netting calculation' },
      { id: 'l3-net',       layer: 'L3', table: 'exposure_summary',           field: 'net_exposure_usd',     sampleValue: '$2.1B', formula: 'gross − allocated', description: 'Net Exposure' },
    ],
    edges: [
      { from: 'l1-cam',      to: 'l2-cs',       label: 'haircut' },
      { from: 'l2-gross',    to: 'tx-subtract',  label: '−' },
      { from: 'l2-cs',       to: 'tx-subtract',  label: '−' },
      { from: 'tx-subtract', to: 'l3-net',       label: '→' },
    ],
  },
  {
    id: 'M021', name: 'Coverage Ratio', page: 'P2', section: 'Exposure Summary',
    metricType: 'Ratio',
    formula: 'SUM(allocated_collateral) ÷ SUM(gross_exposure) × 100',
    formulaSQL: 'SUM(cs.allocated_amount_usd) / SUM(fes.gross_exposure_usd) * 100',
    description: 'Portfolio-level coverage ratio — what percentage of gross exposure is protected by collateral.',
    displayFormat: '#0.0%', sampleValue: '50.0%',
    sourceFields: [
      { layer: 'L2', table: 'collateral_snapshot', field: 'allocated_amount_usd', sampleValue: '$2.1B' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', sampleValue: '$4.2B' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    nodes: [
      { id: 'l2-cs-cv',    layer: 'L2', table: 'collateral_snapshot',        field: 'allocated_amount_usd', sampleValue: '$2.1B', description: 'Total allocated collateral' },
      { id: 'l2-fes-cv',   layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd',   sampleValue: '$4.2B', description: 'Total gross exposure' },
      { id: 'tx-div-cv',   layer: 'transform', table: '',                    field: 'collateral ÷ gross',   formula: 'SUM(alloc) / SUM(gross) × 100', sampleValue: '50.0%', description: 'Coverage ratio calculation' },
      { id: 'l3-cov',      layer: 'L3', table: 'exposure_summary',           field: 'coverage_ratio_pct',   sampleValue: '50.0%', formula: 'alloc ÷ gross', description: 'Coverage Ratio' },
    ],
    edges: [
      { from: 'l2-cs-cv',  to: 'tx-div-cv', label: '÷' },
      { from: 'l2-fes-cv', to: 'tx-div-cv', label: '÷' },
      { from: 'tx-div-cv', to: 'l3-cov',    label: '× 100' },
    ],
  },
  {
    id: 'M022', name: '% Covered by Collateral', page: 'P2', section: 'Coverage Breakdown',
    metricType: 'Ratio', formula: 'SUM(allocated WHERE mitigant_group=M1) ÷ SUM(gross_exposure) × 100',
    description: 'Percentage of exposure covered specifically by collateral (M1 mitigants).',
    displayFormat: '#0.0%', sampleValue: '38.2%',
    sourceFields: [
      { layer: 'L2', table: 'collateral_snapshot', field: 'allocated_amount_usd', sampleValue: '$1.6B' },
      { layer: 'L2', table: 'collateral_snapshot', field: 'mitigant_group_code', sampleValue: 'M1' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', sampleValue: '$4.2B' },
    ],
    dimensions: [{ dimension: 'as_of_date', interaction: 'GROUP_BY' }],
  },
  {
    id: 'M023', name: '% Covered by Guarantee', page: 'P2', section: 'Coverage Breakdown',
    metricType: 'Ratio', formula: 'SUM(allocated WHERE mitigant_group=M2) ÷ SUM(gross_exposure) × 100',
    description: 'Percentage of exposure covered by guarantees (M2 mitigants).',
    displayFormat: '#0.0%', sampleValue: '11.8%',
    sourceFields: [
      { layer: 'L2', table: 'collateral_snapshot', field: 'allocated_amount_usd', sampleValue: '$0.5B' },
      { layer: 'L2', table: 'collateral_snapshot', field: 'mitigant_group_code', sampleValue: 'M2' },
    ],
    dimensions: [{ dimension: 'as_of_date', interaction: 'GROUP_BY' }],
  },
  {
    id: 'M025', name: 'Exposure by Sector', page: 'P2', section: 'Composition Charts',
    metricType: 'Aggregate', formula: 'SUM(gross_exposure_usd) GROUP BY industry_code',
    description: 'Exposure distribution across industry sectors.',
    displayFormat: '$#,##0.0M', sampleValue: 'TMT: $890M',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L1', table: 'counterparty', field: 'industry_id' },
      { layer: 'L1', table: 'industry_dim', field: 'industry_name' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'industry_code', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'AVAILABLE' },
    ],
    toggles: ['exposure_calc'],
  },
  {
    id: 'M026', name: 'Top 10 Counterparty Exposure Table', page: 'P2', section: 'Counterparty Tables',
    metricType: 'Table', formula: 'SUM(gross_exposure_usd) GROUP BY counterparty_id ORDER BY DESC LIMIT 10',
    description: 'Top 10 counterparties by total exposure with breakdown by product and risk metrics.',
    displayFormat: 'Table', sampleValue: 'Top: Meridian $356M',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L1', table: 'counterparty', field: 'legal_name' },
      { layer: 'L2', table: 'position', field: 'pd_estimate' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
      { dimension: 'product_node_id', interaction: 'AVAILABLE' },
    ],
    toggles: ['exposure_calc', 'product_grouping'],
  },
  {
    id: 'M029', name: 'Counterparty Count by Risk Rating', page: 'P2', section: 'Risk Distribution',
    metricType: 'Count', formula: 'COUNT(DISTINCT counterparty_id) GROUP BY rating_bucket',
    description: 'Distribution of counterparties across risk rating buckets.',
    displayFormat: '#,##0', sampleValue: 'BBB: 42',
    sourceFields: [
      { layer: 'L1', table: 'counterparty', field: 'internal_risk_rating' },
      { layer: 'L1', table: 'counterparty', field: 'external_rating_sp' },
      { layer: 'L1', table: 'rating_scale_dim', field: 'rating_bucket' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'rating_grade_id', interaction: 'GROUP_BY' },
    ],
    toggles: ['risk_rating'],
  },
  {
    id: 'M030', name: 'Probability of Default', page: 'P2', section: 'Risk Metrics',
    metricType: 'Derived',
    formula: 'SUM(pd_estimate × ead_amount) ÷ SUM(ead_amount)',
    formulaSQL: 'SUM(p.pd_estimate * fs.ead_amount) / NULLIF(SUM(fs.ead_amount), 0)',
    description: 'Exposure-weighted average PD across the portfolio. Key credit quality indicator.',
    displayFormat: '#0.00%', sampleValue: '0.72%',
    sourceFields: [
      { layer: 'L2', table: 'position', field: 'pd_estimate', sampleValue: '0.45%', description: 'Per-position PD' },
      { layer: 'L2', table: 'position_detail', field: 'funded_amount', sampleValue: '$162.5M', description: 'For EAD weighting' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'counterparty_id', interaction: 'AVAILABLE' },
      { dimension: 'rating_grade_id', interaction: 'GROUP_BY' },
    ],
    toggles: ['risk_rating'],
    nodes: [
      { id: 'l1-ctp-pd',      layer: 'L1', table: 'counterparty',  field: 'pd_annual',     sampleValue: '0.45%', description: 'Source-system PD' },
      { id: 'l2-pos-pd',      layer: 'L2', table: 'position',      field: 'pd_estimate',   sampleValue: '0.45%', description: 'Calibrated PD per position' },
      { id: 'l2-ead',         layer: 'L2', table: 'position_detail', field: 'ead_amount',   sampleValue: '$178.3M', description: 'Per-facility EAD as weight' },
      { id: 'tx-weighted',    layer: 'transform', table: '',        field: 'PD × EAD',      formula: 'pd_estimate × ead_amount', sampleValue: '$0.80M', description: 'Weighted PD contribution' },
      { id: 'tx-sum-ead',     layer: 'transform', table: '',        field: 'SUM(EAD)',       formula: 'SUM(ead_amount)', sampleValue: '$4.2B', description: 'Total EAD for weighting' },
      { id: 'l3-wavg-pd',     layer: 'L3', table: 'exposure_summary', field: 'weighted_avg_pd', sampleValue: '0.72%', formula: 'Σ(PD×EAD) ÷ Σ(EAD)', description: 'Weighted Avg PD' },
    ],
    edges: [
      { from: 'l1-ctp-pd',   to: 'l2-pos-pd',   label: 'calibrated' },
      { from: 'l2-pos-pd',   to: 'tx-weighted',  label: '×' },
      { from: 'l2-ead',      to: 'tx-weighted',  label: '×' },
      { from: 'l2-ead',      to: 'tx-sum-ead',   label: 'SUM' },
      { from: 'tx-weighted', to: 'l3-wavg-pd',   label: '÷' },
      { from: 'tx-sum-ead',  to: 'l3-wavg-pd',   label: '÷' },
    ],
  },
  {
    id: 'M031', name: 'Loss Given Default', page: 'P2', section: 'Risk Metrics',
    metricType: 'Derived', formula: 'SUM(lgd_estimate × ead_amount) ÷ SUM(ead_amount)',
    description: 'Exposure-weighted average LGD across the portfolio.',
    displayFormat: '#0.0%', sampleValue: '38.5%',
    sourceFields: [
      { layer: 'L2', table: 'position', field: 'lgd_estimate', sampleValue: '35%' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'counterparty_id', interaction: 'AVAILABLE' },
    ],
  },
  {
    id: 'M032', name: 'Expected Loss', page: 'P2', section: 'Risk Metrics',
    metricType: 'Derived',
    formula: 'SUM(PD × LGD × EAD)',
    formulaSQL: 'SUM(p.pd_estimate * p.lgd_estimate * pd.ead_amount)',
    description: 'Portfolio-level expected loss — the statistical mean loss across all facilities.',
    displayFormat: '$#,##0.0M', sampleValue: '$12.1M',
    sourceFields: [
      { layer: 'L2', table: 'position', field: 'pd_estimate', sampleValue: '0.45%' },
      { layer: 'L2', table: 'position', field: 'lgd_estimate', sampleValue: '35%' },
      { layer: 'L2', table: 'position_detail', field: 'funded_amount', sampleValue: '$162.5M' },
      { layer: 'L2', table: 'position_detail', field: 'unfunded_amount', sampleValue: '$87.5M' },
      { layer: 'L2', table: 'position_detail', field: 'ccf', sampleValue: '18%' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
      { dimension: 'lob_segment_id', interaction: 'GROUP_BY' },
    ],
    nodes: [
      { id: 'l2-pd-el',     layer: 'L2', table: 'position',        field: 'pd_estimate',   sampleValue: '0.45%', description: 'Per-position PD' },
      { id: 'l2-lgd-el',    layer: 'L2', table: 'position',        field: 'lgd_estimate',  sampleValue: '35%', description: 'Per-position LGD' },
      { id: 'l2-funded-el', layer: 'L2', table: 'position_detail',  field: 'funded_amount', sampleValue: '$162.5M', description: 'Drawn amount' },
      { id: 'l2-unfund-el', layer: 'L2', table: 'position_detail',  field: 'unfunded_amount', sampleValue: '$87.5M', description: 'Undrawn amount' },
      { id: 'l2-ccf-el',    layer: 'L2', table: 'position_detail',  field: 'ccf',           sampleValue: '18%', description: 'Credit conversion factor' },
      { id: 'tx-ead-el',    layer: 'transform', table: '',          field: 'EAD',            formula: 'funded + unfunded × CCF', sampleValue: '$178.3M', description: 'Exposure at Default' },
      { id: 'tx-el',        layer: 'transform', table: '',          field: 'PD × LGD × EAD', formula: 'per-facility EL', sampleValue: '$0.28M', description: 'Expected loss per facility' },
      { id: 'l3-el-total',  layer: 'L3', table: 'exposure_summary', field: 'total_expected_loss', sampleValue: '$12.1M', formula: 'SUM(PD × LGD × EAD)', description: 'Portfolio Expected Loss' },
    ],
    edges: [
      { from: 'l2-funded-el', to: 'tx-ead-el', label: '+' },
      { from: 'l2-unfund-el', to: 'tx-ead-el', label: '× CCF' },
      { from: 'l2-ccf-el',    to: 'tx-ead-el', label: '×' },
      { from: 'l2-pd-el',     to: 'tx-el',     label: '×' },
      { from: 'l2-lgd-el',    to: 'tx-el',     label: '×' },
      { from: 'tx-ead-el',    to: 'tx-el',     label: '×' },
      { from: 'tx-el',        to: 'l3-el-total', label: 'SUM' },
    ],
  },
  {
    id: 'M033', name: 'Counterparty Exposure Trend (12M)', page: 'P2', section: 'Trends',
    metricType: 'Trend', formula: 'SUM(gross_exposure_usd) per month for T-12M..T',
    description: '12-month time series of aggregate exposure for trend analysis.',
    displayFormat: 'Line Chart', sampleValue: '12 monthly points',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'as_of_date' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'FILTER' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // P3 — Concentration & Limits
  // ─────────────────────────────────────────────────────────────
  {
    id: 'M034', name: 'Limit Utilization %', page: 'P3', section: 'Limit Summary',
    metricType: 'Ratio',
    formula: 'exposure ÷ limit_amount × 100',
    formulaSQL: 'SUM(fes.gross_exposure_usd) / lr.limit_amount * 100',
    description: 'Percentage of each limit that is currently utilized. Supports drill-down by sector, LoB, and counterparty.',
    displayFormat: '#0.0%', sampleValue: '78.3%',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', sampleValue: '$890M' },
      { layer: 'L1', table: 'limit_rule', field: 'limit_amount', sampleValue: '$1.1B' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'lob_segment_id', interaction: 'GROUP_BY' },
      { dimension: 'industry_code', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'AVAILABLE' },
      { dimension: 'limit_status_code', interaction: 'AVAILABLE' },
    ],
    toggles: ['exposure_calc'],
    nodes: [
      { id: 'l2-exp-lim',   layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', sampleValue: '$890M', description: 'Aggregated exposure for the limit scope' },
      { id: 'l1-limit',     layer: 'L1', table: 'limit_rule',                 field: 'limit_amount',       sampleValue: '$1.1B', description: 'Approved limit amount' },
      { id: 'l1-threshold', layer: 'L1', table: 'limit_threshold',            field: 'inner_threshold_pct', sampleValue: '85%',   description: 'Warning threshold' },
      { id: 'tx-util',      layer: 'transform', table: '',                    field: 'exposure ÷ limit',   formula: 'exposure / limit × 100', sampleValue: '78.3%', description: 'Utilization calc' },
      { id: 'l3-lim-util',  layer: 'L3', table: 'concentration_summary',      field: 'limit_utilization_pct', sampleValue: '78.3%', formula: 'exposure ÷ limit × 100', description: 'Limit Utilization %' },
    ],
    edges: [
      { from: 'l2-exp-lim',   to: 'tx-util',     label: '÷' },
      { from: 'l1-limit',     to: 'tx-util',     label: '÷' },
      { from: 'l1-threshold', to: 'l3-lim-util', label: 'threshold check' },
      { from: 'tx-util',      to: 'l3-lim-util', label: '→' },
    ],
  },
  {
    id: 'M037', name: 'Sector Concentration ($)', page: 'P3', section: 'Sector View',
    metricType: 'Aggregate', formula: 'SUM(gross_exposure_usd) GROUP BY industry_code',
    description: 'Dollar exposure per industry sector — identifies concentration hotspots.',
    displayFormat: '$#,##0.0M', sampleValue: 'TMT: $890M',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L1', table: 'counterparty', field: 'industry_id' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'industry_code', interaction: 'GROUP_BY' },
      { dimension: 'risk_tier_code', interaction: 'AVAILABLE' },
    ],
    toggles: ['exposure_calc'],
  },
  {
    id: 'M039', name: 'Total Headroom ($)', page: 'P3', section: 'Limit Summary',
    metricType: 'Derived',
    formula: 'limit_amount − SUM(gross_exposure_usd)',
    formulaSQL: 'lr.limit_amount - SUM(fes.gross_exposure_usd)',
    description: 'Remaining capacity before hitting the limit. Negative = breach.',
    displayFormat: '$#,##0.0M', sampleValue: '$210M',
    sourceFields: [
      { layer: 'L1', table: 'limit_rule', field: 'limit_amount', sampleValue: '$1.1B' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', sampleValue: '$890M' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'lob_segment_id', interaction: 'GROUP_BY' },
    ],
  },
  {
    id: 'M040', name: 'Total Limit Breaches', page: 'P3', section: 'Breach Summary',
    metricType: 'Count', formula: 'COUNT(*) WHERE utilization_pct > 100%',
    description: 'Number of limits currently in breach (utilization exceeds 100%).',
    displayFormat: '#,##0', sampleValue: '3',
    sourceFields: [
      { layer: 'L1', table: 'limit_rule', field: 'limit_amount' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L1', table: 'limit_threshold', field: 'outer_threshold_pct' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'limit_status_code', interaction: 'GROUP_BY' },
    ],
  },
  {
    id: 'M041', name: 'Overdraft Amount ($)', page: 'P3', section: 'Breach Summary',
    metricType: 'Aggregate', formula: 'SUM(exposure − limit) WHERE exposure > limit',
    description: 'Total dollar amount in excess of limits across all breaches.',
    displayFormat: '$#,##0.0M', sampleValue: '$42.5M',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L1', table: 'limit_rule', field: 'limit_amount' },
    ],
    dimensions: [{ dimension: 'as_of_date', interaction: 'FILTER' }],
  },

  // ─────────────────────────────────────────────────────────────
  // P4 — Legal Entity & Data Quality
  // ─────────────────────────────────────────────────────────────
  {
    id: 'M050', name: 'Total Legal Entities', page: 'P4', section: 'Entity Summary',
    metricType: 'Count', formula: 'COUNT(DISTINCT legal_entity_id)',
    description: 'Count of distinct legal entities in the portfolio.',
    displayFormat: '#,##0', sampleValue: '24',
    sourceFields: [
      { layer: 'L1', table: 'counterparty', field: 'legal_entity_id' },
    ],
    dimensions: [
      { dimension: 'legal_entity_id', interaction: 'GROUP_BY' },
      { dimension: 'bl_classification', interaction: 'AVAILABLE' },
    ],
  },
  {
    id: 'M051', name: 'Cross-Entity Exposure ($)', page: 'P4', section: 'Entity Summary',
    metricType: 'Aggregate', formula: 'SUM(exposure) WHERE entity_count > 1 per counterparty',
    description: 'Total exposure attributed to counterparties that appear under multiple legal entities.',
    displayFormat: '$#,##0.0M', sampleValue: '$1.2B',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L1', table: 'counterparty', field: 'legal_entity_id' },
    ],
    dimensions: [
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
      { dimension: 'legal_entity_id', interaction: 'AVAILABLE' },
    ],
    toggles: ['exposure_calc'],
  },
  {
    id: 'M053', name: 'Data Quality Score %', page: 'P4', section: 'Data Quality',
    metricType: 'Ratio',
    formula: '(total_fields − fields_with_issues) ÷ total_fields × 100',
    formulaSQL: '(COUNT(*) - COUNT(CASE WHEN has_dq_issue THEN 1 END)) / COUNT(*) * 100',
    description: 'Percentage of data fields passing all quality checks. Measures data integrity across the model.',
    displayFormat: '#0.0%', sampleValue: '94.2%',
    sourceFields: [
      { layer: 'L2', table: 'data_quality_observation', field: 'total_checks' },
      { layer: 'L2', table: 'data_quality_observation', field: 'failed_checks' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'lob_segment_id', interaction: 'AVAILABLE' },
      { dimension: 'legal_entity_id', interaction: 'AVAILABLE' },
    ],
    toggles: ['lob_vs_le'],
  },

  // ─────────────────────────────────────────────────────────────
  // P5 — Trends & Stress
  // ─────────────────────────────────────────────────────────────
  {
    id: 'M060', name: 'Stress Test Coverage', page: 'P5', section: 'Stress Summary',
    metricType: 'Ratio',
    formula: 'COUNT(facilities_tested) ÷ COUNT(total_facilities) × 100',
    description: 'Percentage of facilities covered by at least one stress scenario.',
    displayFormat: '#0.0%', sampleValue: '87.5%',
    sourceFields: [
      { layer: 'L2', table: 'stress_test_result', field: 'facility_id' },
      { layer: 'L1', table: 'facility_master', field: 'facility_id' },
    ],
    dimensions: [
      { dimension: 'scenario_id', interaction: 'AVAILABLE' },
      { dimension: 'as_of_date', interaction: 'FILTER' },
    ],
  },
  {
    id: 'M061', name: '# Stress Testing Scenario Failures', page: 'P5', section: 'Stress Summary',
    metricType: 'Count', formula: 'COUNT(*) WHERE stress_result = FAIL',
    description: 'Number of facility-scenario pairs that failed stress testing criteria.',
    displayFormat: '#,##0', sampleValue: '12',
    sourceFields: [
      { layer: 'L2', table: 'stress_test_result', field: 'stress_result' },
      { layer: 'L2', table: 'stress_test_result', field: 'scenario_id' },
    ],
    dimensions: [
      { dimension: 'scenario_id', interaction: 'AVAILABLE' },
    ],
  },
  {
    id: 'M062', name: 'Estimated Loss for Stress Failures', page: 'P5', section: 'Stress Summary',
    metricType: 'Aggregate', formula: 'SUM(stressed_loss) WHERE stress_result = FAIL',
    description: 'Total estimated loss across all failed stress scenarios.',
    displayFormat: '$#,##0.0M', sampleValue: '$89.3M',
    sourceFields: [
      { layer: 'L2', table: 'stress_test_result', field: 'stressed_loss_amount' },
    ],
    dimensions: [
      { dimension: 'scenario_id', interaction: 'AVAILABLE' },
    ],
  },
  {
    id: 'M064', name: '# Regulatory Threshold Breaches', page: 'P5', section: 'Threshold Breaches',
    metricType: 'Count', formula: 'COUNT(*) WHERE breach_type = REGULATORY',
    description: 'Count of regulatory threshold breaches requiring reporting.',
    displayFormat: '#,##0', sampleValue: '2',
    sourceFields: [
      { layer: 'L1', table: 'limit_threshold', field: 'threshold_type' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'risk_tier_code', interaction: 'AVAILABLE' },
    ],
  },
  {
    id: 'M066', name: 'Stress + Net Exposure over Time', page: 'P5', section: 'Trends',
    metricType: 'Trend', formula: 'SUM(net_exposure) with stress overlay per month',
    description: 'Time series combining net exposure trend with stressed loss overlay.',
    displayFormat: 'Combo Chart', sampleValue: '12 months',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L2', table: 'collateral_snapshot', field: 'allocated_amount_usd' },
      { layer: 'L2', table: 'stress_test_result', field: 'stressed_loss_amount' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'scenario_id', interaction: 'FILTER' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // P6 — Facility & Events
  // ─────────────────────────────────────────────────────────────
  {
    id: 'M071', name: 'Total Active Facilities', page: 'P6', section: 'Facility Summary',
    metricType: 'Count', formula: 'COUNT(DISTINCT facility_id) WHERE status = ACTIVE',
    description: 'Count of currently active facilities in the portfolio.',
    displayFormat: '#,##0', sampleValue: '847',
    sourceFields: [
      { layer: 'L1', table: 'facility_master', field: 'facility_id' },
      { layer: 'L1', table: 'facility_master', field: 'facility_status', sampleValue: 'ACTIVE' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'AVAILABLE' },
      { dimension: 'product_node_id', interaction: 'AVAILABLE' },
    ],
  },
  {
    id: 'M072', name: '# Facilities Maturing in 90 Days', page: 'P6', section: 'Pipeline',
    metricType: 'Count', formula: 'COUNT(*) WHERE maturity_date BETWEEN T AND T+90',
    description: 'Facilities approaching maturity in the next 90 days — key for renewal pipeline.',
    displayFormat: '#,##0', sampleValue: '23',
    sourceFields: [
      { layer: 'L1', table: 'facility_master', field: 'maturity_date' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'AVAILABLE' },
    ],
  },
  {
    id: 'M073', name: '# Facilities with Amendments in Progress', page: 'P6', section: 'Pipeline',
    metricType: 'Count', formula: 'COUNT(DISTINCT facility_id) WHERE amendment_status NOT IN (COMPLETED, CANCELLED)',
    description: 'Facilities currently undergoing amendments (pending approval, in review, etc.).',
    displayFormat: '#,##0', sampleValue: '15',
    sourceFields: [
      { layer: 'L2', table: 'amendment_event', field: 'amendment_status' },
      { layer: 'L2', table: 'amendment_event', field: 'facility_id' },
    ],
    dimensions: [
      { dimension: 'amendment_type_code', interaction: 'GROUP_BY' },
    ],
  },
  {
    id: 'M075', name: 'Estimated Exposure (Underwriting)', page: 'P6', section: 'Pipeline',
    metricType: 'Aggregate',
    formula: 'SUM(committed_facility_amt) WHERE status = UNDERWRITING',
    description: 'Total exposure in the underwriting pipeline — upcoming commitments not yet active.',
    displayFormat: '$#,##0.0M', sampleValue: '$320M',
    sourceFields: [
      { layer: 'L1', table: 'facility_master', field: 'committed_facility_amt' },
      { layer: 'L1', table: 'facility_master', field: 'facility_status', sampleValue: 'UNDERWRITING' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'counterparty_id', interaction: 'AVAILABLE' },
    ],
    toggles: ['exposure_calc'],
  },
  {
    id: 'M078', name: 'Facility Count by Month', page: 'P6', section: 'Timeline',
    metricType: 'Count',
    formula: 'COUNT(*) GROUP BY MONTH(effective_date) or MONTH(maturity_date)',
    description: 'Monthly distribution of facility originations or maturities — togglable between effective and maturity date.',
    displayFormat: 'Bar Chart', sampleValue: 'Feb: 12',
    sourceFields: [
      { layer: 'L1', table: 'facility_master', field: 'effective_date' },
      { layer: 'L1', table: 'facility_master', field: 'maturity_date' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'timeline_type', interaction: 'TOGGLE' },
    ],
    toggles: ['facility_timeline'],
  },
  {
    id: 'M080', name: 'CA Count by Amendment Type & Status', page: 'P6', section: 'Amendment Analysis',
    metricType: 'Count', formula: 'COUNT(*) GROUP BY amendment_type, amendment_status',
    description: 'Cross-tabulation of credit agreement amendments by type and current status.',
    displayFormat: 'Heatmap', sampleValue: 'Commitment Increase / Pending: 5',
    sourceFields: [
      { layer: 'L2', table: 'amendment_event', field: 'amendment_type' },
      { layer: 'L2', table: 'amendment_event', field: 'amendment_status' },
    ],
    dimensions: [
      { dimension: 'amendment_type_code', interaction: 'GROUP_BY' },
      { dimension: 'as_of_date', interaction: 'FILTER' },
    ],
  },
  {
    id: 'M082', name: 'Facility Summary Table', page: 'P6', section: 'Detail Table',
    metricType: 'Table',
    formula: 'SELECT facility details with exposure, risk, collateral, and amendment info',
    description: 'Full facility-level detail table with all key attributes — the primary drill-down view.',
    displayFormat: 'Interactive Table', sampleValue: '847 rows',
    sourceFields: [
      { layer: 'L1', table: 'facility_master', field: 'facility_id' },
      { layer: 'L1', table: 'counterparty', field: 'legal_name' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L2', table: 'position', field: 'pd_estimate' },
      { layer: 'L2', table: 'collateral_snapshot', field: 'allocated_amount_usd' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'facility_id', interaction: 'FILTER' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
      { dimension: 'amendment_type_code', interaction: 'AVAILABLE' },
      { dimension: 'timeline_type', interaction: 'AVAILABLE' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // P7 — Portfolio Analysis
  // ─────────────────────────────────────────────────────────────
  {
    id: 'M083', name: 'Total Deteriorated Deals', page: 'P7', section: 'Portfolio Health',
    metricType: 'Count', formula: 'COUNT(*) WHERE credit_status IN (WATCH, NON_PERFORMING, DEFAULT)',
    description: 'Number of facilities classified as deteriorated (watch list, non-performing, or default).',
    displayFormat: '#,##0', sampleValue: '18',
    sourceFields: [
      { layer: 'L2', table: 'position', field: 'credit_status_code' },
      { layer: 'L1', table: 'credit_status_dim', field: 'status_category' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
  },
  {
    id: 'M084', name: 'Total Exposure of Deteriorated Deals', page: 'P7', section: 'Portfolio Health',
    metricType: 'Aggregate', formula: 'SUM(gross_exposure_usd) WHERE credit_status IN (WATCH, NP, DEFAULT)',
    description: 'Total exposure concentration in deteriorated facilities.',
    displayFormat: '$#,##0.0M', sampleValue: '$287M',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
      { layer: 'L2', table: 'position', field: 'credit_status_code' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    toggles: ['exposure_calc'],
  },
  {
    id: 'M085', name: '% Deteriorated Deals', page: 'P7', section: 'Portfolio Health',
    metricType: 'Ratio', formula: 'deteriorated_count ÷ total_count × 100',
    description: 'Share of the portfolio that is deteriorated.',
    displayFormat: '#0.0%', sampleValue: '2.1%',
    sourceFields: [
      { layer: 'L2', table: 'position', field: 'credit_status_code' },
    ],
    dimensions: [{ dimension: 'as_of_date', interaction: 'GROUP_BY' }],
  },
  {
    id: 'M087', name: '# Internal Rating Downgrades', page: 'P7', section: 'Rating Migration',
    metricType: 'Count', formula: 'COUNT(*) WHERE current_rating < prior_rating',
    description: 'Counterparties whose internal risk rating worsened since last period.',
    displayFormat: '#,##0', sampleValue: '7',
    sourceFields: [
      { layer: 'L1', table: 'counterparty', field: 'internal_risk_rating' },
      { layer: 'L2', table: 'counterparty_rating_observation', field: 'prior_rating_value' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'FILTER' },
      { dimension: 'rating_grade_id', interaction: 'GROUP_BY' },
    ],
  },
  {
    id: 'M091', name: 'Delinquency Rate', page: 'P7', section: 'Delinquency',
    metricType: 'Ratio',
    formula: 'COUNT(days_past_due > 30) ÷ COUNT(total) × 100',
    formulaSQL: 'COUNT(CASE WHEN pd.days_past_due > 30 THEN 1 END) / COUNT(*) * 100',
    description: 'Percentage of facilities with payments more than 30 days past due.',
    displayFormat: '#0.0%', sampleValue: '1.8%',
    sourceFields: [
      { layer: 'L2', table: 'position_detail', field: 'days_past_due', sampleValue: '0-180', description: 'Days past due per facility' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
  },
  {
    id: 'M095', name: 'Utilization %', page: 'P7', section: 'Portfolio Metrics',
    metricType: 'Ratio',
    formula: 'SUM(drawn_amount) ÷ SUM(committed_facility_amt) × 100',
    formulaSQL: 'SUM(fes.drawn_amount) / NULLIF(SUM(fm.committed_facility_amt), 0) * 100',
    description: 'Portfolio-level utilization — how much of total commitment is drawn.',
    displayFormat: '#0.0%', sampleValue: '62.3%',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount', sampleValue: '$3.8B' },
      { layer: 'L1', table: 'facility_master', field: 'committed_facility_amt', sampleValue: '$6.1B' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    nodes: [
      { id: 'l2-drawn-p7',    layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount',          sampleValue: '$3.8B', description: 'Total drawn across portfolio' },
      { id: 'l1-commit-p7',   layer: 'L1', table: 'facility_master',            field: 'committed_facility_amt', sampleValue: '$6.1B', description: 'Total committed' },
      { id: 'tx-util-p7',     layer: 'transform', table: '',                    field: 'drawn ÷ committed',     formula: 'SUM(drawn) / SUM(committed) × 100', sampleValue: '62.3%', description: 'Portfolio utilization' },
      { id: 'l3-util-p7',     layer: 'L3', table: 'portfolio_analysis',         field: 'utilization_pct',        sampleValue: '62.3%', formula: 'drawn ÷ committed × 100', description: 'Portfolio Utilization' },
    ],
    edges: [
      { from: 'l2-drawn-p7',  to: 'tx-util-p7', label: '÷' },
      { from: 'l1-commit-p7', to: 'tx-util-p7', label: '÷' },
      { from: 'tx-util-p7',   to: 'l3-util-p7', label: '× 100' },
    ],
  },
  {
    id: 'M096', name: 'Historical Exposure (5-Year)', page: 'P7', section: 'Portfolio Trends',
    metricType: 'Trend', formula: 'SUM(gross_exposure_usd) per month for T-60M..T',
    description: '5-year monthly exposure history for long-term trend analysis.',
    displayFormat: 'Line Chart', sampleValue: '60 points',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'FILTER' },
    ],
    toggles: ['exposure_calc'],
  },
  {
    id: 'M098', name: 'Current Avg Spread + Base Rate + All-In Rate', page: 'P7', section: 'Profitability',
    metricType: 'Derived',
    formula: 'WAVG(all_in_rate_pct, drawn_amount) and WAVG(interest_rate_spread_bps, drawn_amount)',
    description: 'Exposure-weighted average spread, base rate, and all-in rate across the portfolio.',
    displayFormat: '#0.00%', sampleValue: '5.82%',
    sourceFields: [
      { layer: 'L1', table: 'facility_master', field: 'all_in_rate_pct', sampleValue: '6.08%' },
      { layer: 'L1', table: 'facility_master', field: 'interest_rate_spread_bps', sampleValue: '175 bps' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount', sampleValue: '$162.5M' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    toggles: ['exposure_calc'],
  },
  {
    id: 'M100', name: 'Coverage Rate %', page: 'P7', section: 'Portfolio Metrics',
    metricType: 'Ratio',
    formula: 'SUM(allocated_collateral) ÷ SUM(gross_exposure) × 100',
    formulaSQL: 'SUM(cs.allocated_amount_usd) / NULLIF(SUM(fes.gross_exposure_usd), 0) * 100',
    description: 'Portfolio-level collateral coverage percentage.',
    displayFormat: '#0.0%', sampleValue: '50.0%',
    sourceFields: [
      { layer: 'L2', table: 'collateral_snapshot', field: 'allocated_amount_usd', sampleValue: '$2.1B' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', sampleValue: '$4.2B' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
    ],
    toggles: ['exposure_calc'],
  },
  {
    id: 'M101', name: 'Delinquency Rate %', page: 'P7', section: 'Portfolio Metrics',
    metricType: 'Ratio', formula: 'SUM(delinquent_exposure) ÷ SUM(total_exposure) × 100',
    description: 'Share of portfolio exposure that is delinquent (30+ DPD).',
    displayFormat: '#0.0%', sampleValue: '1.4%',
    sourceFields: [
      { layer: 'L2', table: 'position_detail', field: 'days_past_due' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
    ],
    toggles: ['exposure_calc'],
  },
  {
    id: 'M104', name: 'Financial Ratios (DSCR, FCF, LTV, CRV)', page: 'P7', section: 'Financial Analysis',
    metricType: 'Derived', formula: 'Various: DSCR = NOI/DebtService, LTV = LoanBal/AssetVal, etc.',
    description: 'Suite of financial coverage and leverage ratios for facility-level analysis.',
    displayFormat: '#0.0x / #0.0%', sampleValue: 'DSCR: 1.8x',
    sourceFields: [
      { layer: 'L2', table: 'facility_profitability_snapshot', field: 'net_operating_income' },
      { layer: 'L2', table: 'facility_profitability_snapshot', field: 'debt_service_amount' },
      { layer: 'L1', table: 'collateral_asset_master', field: 'latest_valuation_usd' },
    ],
    dimensions: [
      { dimension: 'as_of_date', interaction: 'GROUP_BY' },
      { dimension: 'facility_id', interaction: 'GROUP_BY' },
      { dimension: 'counterparty_id', interaction: 'GROUP_BY' },
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
