import type { SpineTable, BranchGroup, L2Group, SectionId } from './types';

/* ═══════════════════════════════════════════════════════════════════════════
 * Section navigation
 * ═══════════════════════════════════════════════════════════════════════════ */

export const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: 'spine', label: 'The Spine', icon: 'Waypoints' },
  { id: 'branches', label: 'Supporting Dimensions', icon: 'GitBranch' },
  { id: 'l2-snapshots', label: 'Snapshots & Events', icon: 'Camera' },
  { id: 'l3-derived', label: 'Derived Layer', icon: 'Layers' },
  { id: 'rollup', label: 'The Rollup', icon: 'Triangle' },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * Section 1 — The Spine (4 core tables)
 * ═══════════════════════════════════════════════════════════════════════════ */

export const SPINE_TABLES: SpineTable[] = [
  {
    tableName: 'counterparty',
    layer: 'L1',
    label: 'Counterparty',
    subtitle: 'The borrower or issuer',
    keyFields: [
      { name: 'counterparty_id', type: 'pk' },
      { name: 'legal_name', type: 'field' },
      { name: 'entity_type_code', type: 'fk' },
      { name: 'country_code', type: 'fk' },
      { name: 'industry_id', type: 'fk' },
    ],
    fkTo: 'credit_agreement_master',
    fkLabel: 'borrower_counterparty_id',
  },
  {
    tableName: 'credit_agreement_master',
    layer: 'L1',
    label: 'Credit Agreement',
    subtitle: 'The legal contract',
    keyFields: [
      { name: 'credit_agreement_id', type: 'pk' },
      { name: 'borrower_counterparty_id', type: 'fk' },
      { name: 'origination_date', type: 'field' },
      { name: 'maturity_date', type: 'field' },
      { name: 'currency_code', type: 'fk' },
    ],
    fkTo: 'facility_master',
    fkLabel: 'credit_agreement_id',
  },
  {
    tableName: 'facility_master',
    layer: 'L1',
    label: 'Facility',
    subtitle: 'The loan or credit facility',
    keyFields: [
      { name: 'facility_id', type: 'pk' },
      { name: 'credit_agreement_id', type: 'fk' },
      { name: 'counterparty_id', type: 'fk' },
      { name: 'committed_amount', type: 'field' },
      { name: 'portfolio_id', type: 'fk' },
    ],
    fkTo: 'facility_exposure_snapshot',
    fkLabel: 'facility_id',
  },
  {
    tableName: 'facility_exposure_snapshot',
    layer: 'L2',
    label: 'Exposure Snapshot',
    subtitle: 'Daily exposure readings',
    keyFields: [
      { name: 'facility_id', type: 'pk' },
      { name: 'as_of_date', type: 'pk' },
      { name: 'drawn_amount', type: 'field' },
      { name: 'undrawn_amount', type: 'field' },
      { name: 'committed_amount', type: 'field' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * Section 2 — Supporting Dimensions (11 branch groups)
 * ═══════════════════════════════════════════════════════════════════════════ */

export const BRANCH_GROUPS: BranchGroup[] = [
  {
    id: 'identity',
    label: 'Identity & Hierarchy',
    icon: 'Users',
    color: '#a855f7',
    spineAttachment: 'counterparty',
    tables: [
      { name: 'legal_entity', label: 'Legal Entity', description: 'Bank\'s own legal entities' },
      { name: 'counterparty_hierarchy', label: 'CP Hierarchy', description: 'Parent/subsidiary relationships' },
      { name: 'control_relationship', label: 'Control Relationship', description: 'Corporate control links' },
      { name: 'entity_type_dim', label: 'Entity Type', description: 'Entity classification' },
      { name: 'sccl_counterparty_group', label: 'SCCL Group', description: 'Single counterparty credit limit groups' },
    ],
  },
  {
    id: 'geography',
    label: 'Geography',
    icon: 'Globe',
    color: '#06b6d4',
    spineAttachment: 'counterparty',
    tables: [
      { name: 'country_dim', label: 'Country', description: 'Country lookup' },
      { name: 'region_dim', label: 'Region', description: 'Geographic regions' },
      { name: 'currency_dim', label: 'Currency', description: 'Currency codes and names' },
    ],
  },
  {
    id: 'ratings',
    label: 'Ratings',
    icon: 'Star',
    color: '#f59e0b',
    spineAttachment: 'counterparty',
    tables: [
      { name: 'rating_grade_dim', label: 'Rating Grade', description: 'Credit rating grades' },
      { name: 'rating_source', label: 'Rating Source', description: 'Rating agencies (S&P, Moody\'s, etc.)' },
      { name: 'rating_scale_dim', label: 'Rating Scale', description: 'Rating scale definitions' },
      { name: 'rating_mapping', label: 'Rating Mapping', description: 'Cross-agency mapping' },
    ],
  },
  {
    id: 'credit-status',
    label: 'Credit Status',
    icon: 'AlertTriangle',
    color: '#ef4444',
    spineAttachment: 'credit_agreement_master',
    tables: [
      { name: 'credit_status_dim', label: 'Credit Status', description: 'Current/watchlist/default statuses' },
      { name: 'credit_event_type_dim', label: 'Event Type', description: 'Types of credit events' },
      { name: 'default_definition_dim', label: 'Default Definition', description: 'Default criteria' },
      { name: 'amendment_status_dim', label: 'Amendment Status', description: 'Amendment workflow statuses' },
      { name: 'amendment_type_dim', label: 'Amendment Type', description: 'Amendment classifications' },
    ],
  },
  {
    id: 'collateral',
    label: 'Collateral & CRM',
    icon: 'Shield',
    color: '#10b981',
    spineAttachment: 'facility_master',
    tables: [
      { name: 'collateral_type', label: 'Collateral Type', description: 'Types of collateral' },
      { name: 'collateral_asset_master', label: 'Collateral Asset', description: 'Individual collateral assets' },
      { name: 'collateral_link', label: 'Collateral Link', description: 'Asset-to-facility links' },
      { name: 'crm_protection_master', label: 'CRM Protection', description: 'Credit risk mitigants' },
      { name: 'crm_type_dim', label: 'CRM Type', description: 'Mitigant classifications' },
    ],
  },
  {
    id: 'organization',
    label: 'Organization & Portfolio',
    icon: 'Building2',
    color: '#8b5cf6',
    spineAttachment: 'facility_master',
    tables: [
      { name: 'portfolio_dim', label: 'Portfolio', description: 'Portfolio groupings' },
      { name: 'org_unit_dim', label: 'Org Unit', description: 'Organizational units / desks' },
      { name: 'enterprise_business_taxonomy', label: 'Business Taxonomy', description: 'Business segment hierarchy' },
      { name: 'enterprise_product_taxonomy', label: 'Product Taxonomy', description: 'Product type hierarchy' },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing & Market',
    icon: 'TrendingUp',
    color: '#ec4899',
    spineAttachment: 'facility_master',
    tables: [
      { name: 'pricing_tier_dim', label: 'Pricing Tier', description: 'Pricing tier classifications' },
      { name: 'interest_rate_index_dim', label: 'Rate Index', description: 'SOFR, LIBOR, etc.' },
      { name: 'ledger_account_dim', label: 'Ledger Account', description: 'GL account mapping' },
    ],
  },
  {
    id: 'netting',
    label: 'Netting & Margin',
    icon: 'Link2',
    color: '#14b8a6',
    spineAttachment: 'counterparty',
    tables: [
      { name: 'netting_agreement', label: 'Netting Agreement', description: 'Master netting agreements' },
      { name: 'netting_set', label: 'Netting Set', description: 'Groups of netted exposures' },
      { name: 'csa_master', label: 'CSA Master', description: 'Credit support annexes' },
      { name: 'margin_agreement', label: 'Margin Agreement', description: 'Margin call terms' },
    ],
  },
  {
    id: 'limits',
    label: 'Limits & Thresholds',
    icon: 'Gauge',
    color: '#f97316',
    spineAttachment: 'counterparty',
    tables: [
      { name: 'limit_rule', label: 'Limit Rule', description: 'Limit definitions and caps' },
      { name: 'limit_threshold', label: 'Limit Threshold', description: 'Threshold triggers' },
      { name: 'metric_threshold', label: 'Metric Threshold', description: 'Metric-level thresholds' },
    ],
  },
  {
    id: 'regulatory',
    label: 'Regulatory',
    icon: 'BookOpen',
    color: '#6366f1',
    spineAttachment: 'facility_exposure_snapshot',
    tables: [
      { name: 'regulatory_mapping', label: 'Reg Mapping', description: 'Regulatory report field mapping' },
      { name: 'report_cell_definition', label: 'Report Cell Def', description: 'Report cell templates' },
      { name: 'fr2590_category_dim', label: 'FR 2590 Category', description: 'FR 2590 report categories' },
      { name: 'regulatory_jurisdiction', label: 'Jurisdiction', description: 'Regulatory jurisdictions' },
    ],
  },
  {
    id: 'time',
    label: 'Calendar & Time',
    icon: 'Calendar',
    color: '#64748b',
    spineAttachment: 'facility_exposure_snapshot',
    tables: [
      { name: 'date_dim', label: 'Date', description: 'Calendar dimension' },
      { name: 'reporting_calendar_dim', label: 'Reporting Calendar', description: 'Reporting periods' },
      { name: 'maturity_bucket_dim', label: 'Maturity Bucket', description: 'Maturity time bands' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * Section 3 — L2 Snapshots & Events (5 groups)
 * ═══════════════════════════════════════════════════════════════════════════ */

export const L2_GROUPS: L2Group[] = [
  {
    id: 'core-exposure',
    label: 'Core Exposure',
    icon: 'BarChart3',
    color: '#059669',
    description: 'Primary exposure readings and position data',
    tables: [
      { name: 'facility_exposure_snapshot', label: 'Facility Exposure', description: 'Daily facility-level exposure' },
      { name: 'position', label: 'Position', description: 'Instrument-level positions' },
      { name: 'position_detail', label: 'Position Detail', description: 'Position breakdowns' },
      { name: 'exposure_counterparty_attribution', label: 'CP Attribution', description: 'Counterparty-level exposure' },
      { name: 'netting_set_exposure_snapshot', label: 'Netting Exposure', description: 'Netting set aggregation' },
    ],
  },
  {
    id: 'financial-snapshots',
    label: 'Financial Snapshots',
    icon: 'DollarSign',
    color: '#059669',
    description: 'Financial metrics and performance data',
    tables: [
      { name: 'facility_financial_snapshot', label: 'Facility Financials', description: 'Raw financial inputs (DSCR, LTV inputs)' },
      { name: 'facility_pricing_snapshot', label: 'Facility Pricing', description: 'Pricing and rate data' },
      { name: 'facility_delinquency_snapshot', label: 'Delinquency', description: 'Past-due status' },
      { name: 'facility_profitability_snapshot', label: 'Profitability', description: 'Revenue and cost metrics' },
      { name: 'facility_risk_snapshot', label: 'Risk Snapshot', description: 'PD, LGD, EAD parameters' },
      { name: 'counterparty_financial_snapshot', label: 'CP Financials', description: 'Counterparty-level financials' },
    ],
  },
  {
    id: 'events',
    label: 'Credit Events',
    icon: 'AlertCircle',
    color: '#059669',
    description: 'Credit events, amendments, and approvals',
    tables: [
      { name: 'credit_event', label: 'Credit Event', description: 'Defaults, downgrades, restructures' },
      { name: 'credit_event_facility_link', label: 'Event → Facility', description: 'Links events to facilities' },
      { name: 'amendment_event', label: 'Amendment', description: 'Contract amendments' },
      { name: 'exception_event', label: 'Exception', description: 'Exception events' },
      { name: 'facility_credit_approval', label: 'Credit Approval', description: 'Approval workflow' },
    ],
  },
  {
    id: 'collateral-snapshots',
    label: 'Collateral Valuations',
    icon: 'Shield',
    color: '#059669',
    description: 'Collateral and rating snapshots',
    tables: [
      { name: 'collateral_snapshot', label: 'Collateral Snapshot', description: 'Collateral mark-to-market values' },
      { name: 'counterparty_rating_observation', label: 'Rating Observation', description: 'Rating history' },
      { name: 'financial_metric_observation', label: 'Metric Observation', description: 'Observed metric values' },
    ],
  },
  {
    id: 'risk-limits',
    label: 'Risk & Stress Testing',
    icon: 'Activity',
    color: '#059669',
    description: 'Risk flags, stress testing, and limit utilization',
    tables: [
      { name: 'risk_flag', label: 'Risk Flag', description: 'Dashboard risk alerts' },
      { name: 'stress_test_result', label: 'Stress Test', description: 'Stress test outcomes' },
      { name: 'stress_test_breach', label: 'Stress Breach', description: 'Stress test breaches' },
      { name: 'limit_contribution_snapshot', label: 'Limit Contribution', description: 'Limit usage per facility' },
      { name: 'limit_utilization_event', label: 'Limit Utilization', description: 'Limit breach events' },
      { name: 'deal_pipeline_fact', label: 'Deal Pipeline', description: 'Deal pipeline stages' },
      { name: 'cash_flow', label: 'Cash Flow', description: 'Cash flow events' },
      { name: 'data_quality_score_snapshot', label: 'DQ Score', description: 'Data quality scores' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * Layer color scheme (dark theme)
 * ═══════════════════════════════════════════════════════════════════════════ */

export const LAYER_COLORS = {
  L1: { bg: 'bg-blue-950/60', border: 'border-blue-500/40', text: 'text-blue-300', accent: '#3b82f6', badge: 'bg-blue-500/20 text-blue-300' },
  L2: { bg: 'bg-emerald-950/60', border: 'border-emerald-500/40', text: 'text-emerald-300', accent: '#059669', badge: 'bg-emerald-500/20 text-emerald-300' },
  L3: { bg: 'bg-violet-950/60', border: 'border-violet-500/40', text: 'text-violet-300', accent: '#7c3aed', badge: 'bg-violet-500/20 text-violet-300' },
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
 * Spine attachment color mapping
 * ═══════════════════════════════════════════════════════════════════════════ */

export const SPINE_COLORS: Record<string, string> = {
  counterparty: '#3b82f6',
  credit_agreement_master: '#3b82f6',
  facility_master: '#3b82f6',
  facility_exposure_snapshot: '#059669',
};
