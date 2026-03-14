/**
 * Semantic Layer — Core Types
 *
 * Unified type system for the semantic layer that sits between raw L1/L2/L3
 * tables and consumers (dashboards, agents, APIs). Designed for:
 * - Agent intelligence (structured discovery of metrics and dimensions)
 * - Multi-tenancy (per-bank overrides of formulas and physical schemas)
 * - Governance (regulatory traceability, validation, audit)
 *
 * These types compose a SemanticModel — the single source of truth for
 * "what does this data mean in business terms?"
 */

// ═══════════════════════════════════════════════════════════════
// Aggregation
// ═══════════════════════════════════════════════════════════════

export type AggregationType =
  | 'RAW'
  | 'SUM'
  | 'AVG'
  | 'WEIGHTED_AVG'
  | 'COUNT'
  | 'COUNT_DISTINCT'
  | 'MIN'
  | 'MAX'
  | 'MEDIAN'
  | 'LAST'
  | 'CUSTOM';

/** How a metric aggregates when rolling up from one hierarchy level to the next. */
export interface AggregationRule {
  from_level: string;
  to_level: string;
  type: AggregationType;
  /** For WEIGHTED_AVG: the measure to weight by (e.g. 'bank_share_pct'). */
  weight_measure?: string;
  /** For CUSTOM: the full SQL override from YAML. */
  custom_sql?: string;
  /** Human-readable description of the aggregation logic. */
  description?: string;
}

// ═══════════════════════════════════════════════════════════════
// Dimensions & Hierarchies
// ═══════════════════════════════════════════════════════════════

/** A dimension is a way to slice/filter data (e.g. counterparty, region, product). */
export interface SemanticDimension {
  id: string;
  name: string;
  description?: string;
  /** Physical source table for this dimension's values. */
  source_table: string;
  /** Physical field that holds the dimension key. */
  source_field: string;
  /** Physical field used for display labels (e.g. legal_name for counterparty). */
  label_field?: string;
  /** ID of the hierarchy this dimension participates in, if any. */
  hierarchy_id?: string;
  /** Depth within its hierarchy (0 = leaf, higher = more aggregated). */
  hierarchy_depth?: number;
}

/** A hierarchy defines how dimensions nest for rollup. */
export interface SemanticHierarchy {
  id: string;
  name: string;
  description?: string;
  /** Levels ordered from leaf (index 0) to root (index N). */
  levels: HierarchyLevel[];
  /** Physical table that stores the tree (e.g. enterprise_business_taxonomy). */
  source_table?: string;
  /** Self-referential parent field (e.g. parent_segment_id). */
  parent_field?: string;
}

export interface HierarchyLevel {
  dimension_id: string;
  depth: number;
  /** SQL filter to isolate this level from the tree table (e.g. "tree_level = 'L3'"). */
  filter?: string;
}

// ═══════════════════════════════════════════════════════════════
// Measures
// ═══════════════════════════════════════════════════════════════

export type SemanticDataType = 'currency' | 'ratio' | 'percentage' | 'count' | 'bps' | 'rate' | 'days' | 'index' | 'ordinal';

/** A measure is a numeric field with aggregation semantics. */
export interface SemanticMeasure {
  id: string;
  name: string;
  description?: string;
  /** Physical source: schema.table (e.g. 'l2.facility_master'). */
  source_table: string;
  /** Physical column name. */
  source_field: string;
  data_type: SemanticDataType;
  default_aggregation: AggregationType;
  /** Display unit (e.g. 'USD', '%', 'bps'). */
  unit?: string;
  /** Metrics that use this measure as an input. */
  used_by_metrics?: string[];
}

// ═══════════════════════════════════════════════════════════════
// Metrics
// ═══════════════════════════════════════════════════════════════

export type MetricStatus = 'ACTIVE' | 'DRAFT' | 'DEPRECATED';

/** Regulatory reference attached to a metric for traceability. */
export interface RegulatoryRef {
  framework: string;
  section?: string;
  schedule?: string;
  description: string;
}

/** Validation rule that can execute post-computation. */
export interface SemanticValidationRule {
  rule_id: string;
  type: 'NOT_NULL' | 'NON_NEGATIVE' | 'THRESHOLD' | 'RECONCILIATION' | 'PERIOD_OVER_PERIOD' | 'CUSTOM_SQL';
  description: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  params?: Record<string, unknown>;
}

/** Per-level formula: the compiled SQL + aggregation type for one hierarchy level. */
export interface LevelFormula {
  level: string;
  aggregation_type: AggregationType;
  formula_text: string;
  formula_sql: string;
  weighting_field?: string;
}

/** Source table reference from YAML. */
export interface SourceTableRef {
  schema: 'l1' | 'l2' | 'l3';
  table: string;
  alias: string;
  join_type: 'BASE' | 'INNER' | 'LEFT' | 'CROSS';
  join_on?: string;
  fields: Array<{
    name: string;
    role: 'MEASURE' | 'DIMENSION' | 'FILTER' | 'JOIN_KEY';
    description?: string;
  }>;
}

/**
 * A SemanticMetric is the core business concept.
 * It unifies data from YAML definitions, catalogue items, and L3 metrics.
 */
export interface SemanticMetric {
  /** Primary ID — YAML metric_id (e.g. 'EXP-001'). */
  id: string;
  /** Catalogue item_id when linked (e.g. 'MET-011'). */
  catalogue_id?: string;
  /** L3 metric id when linked (e.g. 'C001'). */
  l3_metric_id?: string;

  name: string;
  abbreviation?: string;
  description: string;
  definition?: string;
  insight?: string;

  // Classification
  domain_id: string;
  sub_domain?: string;
  metric_class: 'SOURCED' | 'CALCULATED' | 'HYBRID';
  direction: 'HIGHER_BETTER' | 'LOWER_BETTER' | 'NEUTRAL';
  unit_type: SemanticDataType;
  display_format?: string;
  status: MetricStatus;

  // Source lineage
  source_tables: SourceTableRef[];
  /** Atomic ingredient fields from L1/L2. */
  ingredient_fields: IngredientFieldRef[];
  /** IDs of other metrics this metric depends on (e.g. DSCR depends on NOI, Debt Service). */
  depends_on: string[];

  // Aggregation
  /** How this metric rolls up at each hierarchy level. */
  level_formulas: LevelFormula[];
  /** Abstract aggregation rules (derived from level_formulas). */
  aggregation_rules: AggregationRule[];
  /** Rollup strategy label (e.g. 'direct-sum', 'sum-ratio', 'weighted-avg'). */
  rollup_strategy?: string;

  // Governance
  regulatory_refs: RegulatoryRef[];
  validations: SemanticValidationRule[];
  tags: string[];

  // Execution
  /** Generic formula template (e.g. 'SUM({net_operating_income}) / SUM({debt_service})'). */
  formula_template?: string;
  /** Primary output field name in result. */
  primary_value_field?: string;
}

/** Reference to an atomic ingredient field from L1/L2 tables. */
export interface IngredientFieldRef {
  layer: 'L1' | 'L2' | 'L3';
  table: string;
  field: string;
  description: string;
  data_type?: string;
  role?: 'MEASURE' | 'DIMENSION' | 'FILTER' | 'JOIN_KEY';
}

// ═══════════════════════════════════════════════════════════════
// Domains
// ═══════════════════════════════════════════════════════════════

export interface SemanticDomain {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  regulatory_relevance?: string[];
  primary_stakeholders?: string[];
  /** Number of metrics in this domain. */
  metric_count?: number;
}

// ═══════════════════════════════════════════════════════════════
// Multi-Tenancy
// ═══════════════════════════════════════════════════════════════

/** Per-tenant overrides layered on top of the base semantic model. */
export interface TenantConfig {
  tenant_id: string;
  tenant_name: string;
  /** Per-metric overrides (keyed by metric id). */
  metric_overrides: Record<string, {
    formula_template?: string;
    aggregation_rules?: AggregationRule[];
    validations?: SemanticValidationRule[];
    level_formulas?: LevelFormula[];
  }>;
  /** Physical schema mapping: semantic table name → tenant's physical location. */
  schema_mapping: Record<string, {
    physical_schema: string;
    physical_table: string;
    field_mapping: Record<string, string>;
  }>;
  /** Which metric domains this tenant uses (empty = all). */
  enabled_domains: string[];
}

// ═══════════════════════════════════════════════════════════════
// Glossary Entry
// ═══════════════════════════════════════════════════════════════

/** Business glossary entry for a raw field — enriched with semantic context. */
export interface GlossaryEntry {
  field: string;
  table: string;
  layer: 'L1' | 'L2' | 'L3';
  description: string;
  data_type?: string;
  semantic_type: 'measure' | 'dimension' | 'attribute' | 'filter' | 'key';
  /** Business concept this field represents. */
  business_concept?: string;
  /** Metrics that use this field as an ingredient. */
  used_by_metrics: string[];
  /** Regulatory references that mention this field. */
  regulatory_refs: RegulatoryRef[];
  /** Default aggregation when this field is used as a measure. */
  default_aggregation?: AggregationType;
}

// ═══════════════════════════════════════════════════════════════
// The Unified Semantic Model
// ═══════════════════════════════════════════════════════════════

/** The complete semantic model — single source of truth for all business meaning. */
export interface SemanticModel {
  metrics: SemanticMetric[];
  dimensions: SemanticDimension[];
  hierarchies: SemanticHierarchy[];
  measures: SemanticMeasure[];
  domains: SemanticDomain[];
  glossary: GlossaryEntry[];

  /** Metadata about the model itself. */
  meta: {
    version: string;
    built_at: string;
    source_counts: {
      yaml_metrics: number;
      catalogue_items: number;
      l3_metrics: number;
      data_dictionary_tables: number;
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// Query Types (for the Semantic API)
// ═══════════════════════════════════════════════════════════════

export interface MetricQuery {
  domain?: string;
  metric_class?: 'SOURCED' | 'CALCULATED' | 'HYBRID';
  status?: MetricStatus;
  search?: string;
  regulatory_framework?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface MetricSummary {
  id: string;
  catalogue_id?: string;
  name: string;
  abbreviation?: string;
  domain_id: string;
  domain_name: string;
  metric_class: string;
  direction: string;
  unit_type: string;
  status: string;
  description: string;
  insight?: string;
  depends_on: string[];
  available_levels: string[];
  regulatory_frameworks: string[];
  tag_list: string[];
  ingredient_count: number;
  validation_count: number;
}
