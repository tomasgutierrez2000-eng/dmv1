/**
 * GSIB Calculation Engine — Metric Definition Types
 *
 * These types represent the parsed YAML metric definitions.
 * Each metric YAML file is validated against a JSON Schema (loader/schema.ts)
 * and deserialized into these TypeScript interfaces.
 */

export type MetricStatus = 'ACTIVE' | 'DRAFT' | 'DEPRECATED' | 'RETIRED';
export type MetricClass = 'SOURCED' | 'CALCULATED' | 'HYBRID';
export type Direction = 'HIGHER_BETTER' | 'LOWER_BETTER' | 'NEUTRAL';
export type UnitType =
  | 'CURRENCY'
  | 'PERCENTAGE'
  | 'RATIO'
  | 'COUNT'
  | 'RATE'
  | 'BPS'
  | 'DAYS'
  | 'INDEX'
  | 'ORDINAL';

export type AggregationLevel =
  | 'facility'
  | 'counterparty'
  | 'desk'
  | 'portfolio'
  | 'business_segment';

export const AGGREGATION_LEVELS: AggregationLevel[] = [
  'facility',
  'counterparty',
  'desk',
  'portfolio',
  'business_segment',
];

export type AggregationType =
  | 'RAW'
  | 'SUM'
  | 'WEIGHTED_AVG'
  | 'COUNT'
  | 'COUNT_DISTINCT'
  | 'MIN'
  | 'MAX'
  | 'MEDIAN'
  | 'CUSTOM';

export type FieldRole = 'MEASURE' | 'DIMENSION' | 'FILTER' | 'JOIN_KEY';
export type JoinType = 'BASE' | 'INNER' | 'LEFT' | 'CROSS';

export type ValidationRuleType =
  | 'NOT_NULL'
  | 'NON_NEGATIVE'
  | 'THRESHOLD'
  | 'RECONCILIATION'
  | 'PERIOD_OVER_PERIOD'
  | 'CUSTOM_SQL';

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INFO';

/** Regulatory reference for traceability */
export interface RegulatoryReference {
  framework: string;
  section?: string;
  schedule?: string;
  category?: string;
  description: string;
}

/** Source field within a source table */
export interface SourceFieldDef {
  name: string;
  role: FieldRole;
  description?: string;
}

/** Source table reference with join info */
export interface SourceTableDef {
  schema: 'l1' | 'l2' | 'l3';
  table: string;
  alias: string;
  join_type: JoinType;
  join_on?: string;
  fields: SourceFieldDef[];
}

/** Per-level formula definition */
export interface LevelFormula {
  aggregation_type: AggregationType;
  formula_text: string;
  formula_sql: string;
  weighting_field?: string;
}

/** Validation rule attached to a metric */
export interface ValidationRule {
  rule_id: string;
  type: ValidationRuleType;
  description: string;
  severity: ValidationSeverity;
  params?: Record<string, unknown>;
  custom_sql?: string;
}

/** Output target configuration */
export interface OutputTarget {
  table: string;
  additional_tables?: Array<{
    schema: string;
    table: string;
    column: string;
  }>;
}

/** Complete metric definition parsed from YAML */
export interface MetricDefinition {
  // Identification
  metric_id: string;
  name: string;
  version: string;
  owner: string;
  status: MetricStatus;
  effective_date: string;
  supersedes: string | null;

  // Classification
  domain: string;
  sub_domain: string;
  metric_class: MetricClass;
  direction: Direction;
  unit_type: UnitType;
  display_format: string;
  description: string;

  // Regulatory
  regulatory_references: RegulatoryReference[];

  // Sources
  source_tables: SourceTableDef[];

  // Formulas per level
  levels: Record<AggregationLevel, LevelFormula>;

  // Dependencies
  depends_on: string[];

  // Output
  output: OutputTarget;

  // Validation
  validations: ValidationRule[];

  // Metadata
  tags: string[];
  dashboard_pages: string[];
  legacy_metric_ids: string[];

  // Computed at load time (not in YAML)
  _file_path?: string;
  _loaded_at?: string;
}
