/**
 * Metric Library — simplified types for Domain, Parent Metric, and Metric Variant.
 *
 * ARCHITECTURE:
 * - One PARENT METRIC = one business concept (e.g. DSCR, PD, LTV).
 * - One canonical METRIC VARIANT per parent with correct GSIB rollup logic.
 * - Rollup hierarchy: Facility → Counterparty → Desk → Portfolio → LoB.
 */

/** Canonical order for aggregation hierarchy. */
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
export type VariantStatus = 'ACTIVE' | 'DRAFT' | 'DEPRECATED';
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
  rollup_philosophy: string;
  domain_ids: string[];
  regulatory_references?: string[];
}

/** Per-level rollup logic for Facility → Counterparty → Desk → Portfolio → LoB. */
export interface RollupLevel {
  facility?: string;
  counterparty?: string;
  desk?: string;
  portfolio?: string;
  lob?: string;
}

export interface MetricVariant {
  variant_id: string;
  variant_name: string;
  parent_metric_id: string;
  variant_type: VariantType;
  status: VariantStatus;
  formula_display: string;
  rollup_logic: RollupLevel;
  weighting_basis?: 'BY_EAD' | 'BY_OUTSTANDING' | 'BY_COMMITTED';
  source_table?: string;
  source_field?: string;
  executable_metric_id?: string | null;
}
