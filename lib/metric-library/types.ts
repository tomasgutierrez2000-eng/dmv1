/**
 * Metric Library — types for Domain, Parent Metric, and Metric Variant.
 * Aligned with Metric_Library_Requirements (GSIB).
 *
 * ARCHITECTURE (best practice):
 * - One PARENT METRIC = one business concept (e.g. DSCR, PD, LTV). There is exactly one parent per concept.
 * - Many METRIC VARIANTS live under each parent. Each variant is a specific implementation (e.g. "CRE DSCR (NOI)", "C&I DSCR (EBITDA)").
 * - Each variant defines how it rolls up across the aggregation hierarchy: Facility → Counterparty → Desk → Portfolio → LoB.
 *   Rollup is stored per variant in `rollup_logic` (facility, counterparty, desk, portfolio, lob) so different variants
 *   can have different rollup behavior (e.g. weighted average at desk, distribution at portfolio).
 */

/** Canonical order for aggregation hierarchy: Facility → Counterparty → Desk → Portfolio → LoB. Use for display and validation. */
export const ROLLUP_HIERARCHY_LEVELS = ['facility', 'counterparty', 'desk', 'portfolio', 'lob'] as const;
export type RollupLevelKey = (typeof ROLLUP_HIERARCHY_LEVELS)[number];

/** Display labels for rollup levels. */
export const ROLLUP_LEVEL_LABELS: Record<RollupLevelKey, string> = {
  facility: 'Facility',
  counterparty: 'Counterparty',
  desk: 'Desk',
  portfolio: 'Portfolio',
  lob: 'Line of Business',
};

export type MetricClass = 'SOURCED' | 'CALCULATED' | 'HYBRID';
export type UnitType = 'RATIO' | 'PERCENTAGE' | 'CURRENCY' | 'COUNT' | 'RATE' | 'ORDINAL' | 'DAYS' | 'INDEX';
export type Direction = 'HIGHER_BETTER' | 'LOWER_BETTER' | 'NEUTRAL';
export type VariantStatus = 'ACTIVE' | 'DRAFT' | 'DEPRECATED' | 'PROPOSED' | 'INACTIVE';
export type VariantType = 'SOURCED' | 'CALCULATED';

export interface MetricDomain {
  domain_id: string;
  domain_name: string;
  domain_description: string;
  icon: string;
  color: string;
  regulatory_relevance?: string[];
  primary_stakeholders?: string[];
}

export interface ParentMetric {
  metric_id: string;
  metric_name: string;
  definition: string;
  generic_formula: string;
  metric_class: MetricClass;
  unit_type: UnitType;
  direction: Direction;
  risk_appetite_relevant: boolean;
  rollup_philosophy: string;
  rollup_description: string;
  domain_ids: string[];
  variant_count?: number;
  regulatory_references?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface EdgeCase {
  scenario: string;
  handling: string;
  severity: 'CRITICAL' | 'IMPORTANT' | 'MINOR';
}

export interface ValidationRule {
  rule_id?: string;
  description: string;
  rule_type?: 'RANGE' | 'COMPLETENESS' | 'STALENESS' | 'CROSS_CHECK' | 'CONSISTENCY' | 'TREND';
  severity: 'ERROR' | 'WARNING' | 'INFO';
  parameters?: Record<string, unknown>;
  enabled?: boolean;
}

export interface RiskAppetiteThreshold {
  level: string;
  condition: string;
  threshold_value?: number;
  threshold_operator?: string;
  escalation_action?: string;
}

/** Data tier for lineage: L1 = reference/atomic, L2 = snapshot/attribution, L3 = derived metric, EXTERNAL = outside bank data. */
export type LineageDataTier = 'L1' | 'L2' | 'L3' | 'EXTERNAL';

export interface LineageNodeRef {
  node_id: string;
  node_name: string;
  node_type?: 'FIELD' | 'METRIC_VARIANT' | 'EXTERNAL_SYSTEM' | 'REFERENCE_DATA';
  /** When set, drives layout: L1/L2 shown as atomic inputs, L3 as derived, EXTERNAL as source system. */
  data_tier?: LineageDataTier;
  /** Optional table.field for FIELD nodes (e.g. "position.balance_amount", "facility_master.committed_amt"). */
  table?: string;
  field?: string;
  description?: string;
}

/** Per-level rollup description for Facility → Counterparty → Desk → Portfolio → LoB. Keys must follow ROLLUP_HIERARCHY_LEVELS. */
export interface RollupLevel {
  facility?: string;
  counterparty?: string;
  desk?: string;
  portfolio?: string;
  lob?: string;
}

export interface VariantVersionHistoryEntry {
  version_id: string;
  version: string;
  effective_date: string;
  end_date?: string;
  change_description: string;
  changed_by?: string;
  approved_by?: string;
  approval_date?: string;
  recalculation_status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export interface MetricVariant {
  variant_id: string;
  variant_name: string;
  parent_metric_id: string;
  variant_type: VariantType;
  status: VariantStatus;
  version: string;
  effective_date: string;
  supersedes_variant_id?: string;

  detailed_description?: string;
  formula_display: string;
  formula_specification?: string;
  numerator_field_refs?: string[];
  numerator_definition?: string;
  denominator_field_refs?: string[];
  denominator_definition?: string;
  product_scope?: string;
  product_scope_filter?: Record<string, unknown>;
  edge_cases?: EdgeCase[];

  rollup_logic?: RollupLevel;
  weighting_basis?: 'BY_EAD' | 'BY_OUTSTANDING' | 'BY_COMMITTED';

  used_by_dashboards?: string[];
  used_by_reports?: string[];
  used_by_filings?: string[];
  risk_appetite_thresholds?: RiskAppetiteThreshold[];

  validation_rules?: ValidationRule[];

  owner_team?: string;
  approver?: string;
  approval_date?: string;
  review_cycle?: 'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY' | 'AD_HOC';
  related_variant_ids?: string[];
  recalculation_triggers?: string[];
  regulatory_references?: string[];

  upstream_inputs?: LineageNodeRef[] | string[];
  downstream_consumers?: LineageNodeRef[] | string[];

  /** Links to L3Metric.id for CALCULATED variants — engine runs this metric. */
  executable_metric_id?: string | null;

  /** SOURCED-only: source system, field, methodology */
  source_system?: string;
  source_field_name?: string;
  source_methodology?: string;
  refresh_frequency?: string;
  data_lag?: string;
  data_format?: string;

  companion_fields?: string[];

  version_history?: VariantVersionHistoryEntry[];
  created_at?: string;
  updated_at?: string;
}

export interface LibrarySeed {
  domains: MetricDomain[];
  parent_metrics: ParentMetric[];
  variants: MetricVariant[];
}
