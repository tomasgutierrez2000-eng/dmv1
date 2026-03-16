/**
 * Data Catalogue — unified types for the metric/data-element catalogue.
 *
 * ARCHITECTURE:
 * - One CATALOGUE ITEM = one business concept (metric or raw data element).
 * - Each item has per-level definitions showing how it rolls up across the hierarchy.
 * - Rollup hierarchy: Facility → Counterparty → Desk → Portfolio → Business Segment.
 * - Flat structure: easy to map to DB rows or Python dicts.
 */

/** Canonical order for aggregation hierarchy. */
export const ROLLUP_HIERARCHY_LEVELS = ['facility', 'counterparty', 'desk', 'portfolio', 'lob'] as const;
export type RollupLevelKey = (typeof ROLLUP_HIERARCHY_LEVELS)[number];

/** Display labels for rollup levels. */
export const ROLLUP_LEVEL_LABELS: Record<RollupLevelKey, string> = {
  facility: 'Facility',
  counterparty: 'Counterparty',
  desk: 'Desk (L3)',
  portfolio: 'Portfolio (L2)',
  lob: 'Department / Business Segment (L1)',
};

export type MetricClass = 'SOURCED' | 'CALCULATED' | 'HYBRID';
export type UnitType = 'RATIO' | 'PERCENTAGE' | 'CURRENCY' | 'COUNT' | 'RATE' | 'ORDINAL' | 'DAYS' | 'INDEX';
export type Direction = 'HIGHER_BETTER' | 'LOWER_BETTER' | 'NEUTRAL';
export type CatalogueItemKind = 'DATA_ELEMENT' | 'METRIC';
export type SourcingType = 'Raw' | 'Calc' | 'Agg' | 'Avg';

export interface MetricDomain {
  domain_id: string;
  domain_name: string;
  domain_description: string;
  icon: string;
  color: string;
  regulatory_relevance?: string[];
  primary_stakeholders?: string[];
}

/** A source field reference — an atomic ingredient used to compose a metric. */
export interface IngredientField {
  layer: 'L1' | 'L2' | 'L3';
  table: string;
  field: string;
  description: string;
  data_type?: string;
  sample_value?: string;
}

/** Per-level definition: how the item is computed/available at one rollup level. */
export interface LevelDefinition {
  level: RollupLevelKey;
  dashboard_display_name: string;
  in_record: boolean;
  sourcing_type: SourcingType;
  level_logic: string;
  source_references: IngredientField[];
  /** Per-level formula text from the specification table (for traceability). */
  spec_formula?: string;
  /** Executable SQL for this rollup level (governance-editable). */
  formula_sql?: string;
}

/** Individual position (exposure) within a facility — for demo walkthrough. */
export interface DemoPosition {
  position_id: string;
  facility_id: string;
  product_code: string;
  balance_amount: number;
  description: string;
}

/** Curated demo data for interactive walkthrough examples. */
export interface DemoFacility {
  facility_id: string;
  facility_name: string;
  counterparty_id: string;
  counterparty_name: string;
  lob_segment_id: string;
  desk_name: string;
  portfolio_name: string;
  lob_name: string;
  committed_amt: number;
  collateral_value: number;
  ltv_pct: number;
  positions: DemoPosition[];
  /** DSCR-specific fields (optional — only present for DSCR demo data) */
  noi_amt?: number;
  debt_service_amt?: number;
  dscr_value?: number;
  cashflow_label?: string;
  /** Undrawn Exposure fields (optional — only present for UE demo data) */
  unfunded_amt?: number;
  bank_share_pct?: number;
  undrawn_exposure_amt?: number;
  /** External Rating fields (optional — only present for EXT_RATING demo data) */
  external_rating?: string;
  external_rating_notch?: number;
  /** Generic extra fields for auto-generated demo data (new metrics not yet in typed interface). */
  extra_fields?: Record<string, number | string>;
}

/** Demo data bundle stored per CatalogueItem. */
export interface DemoData {
  facilities: DemoFacility[];
}

// Re-export generic demo entity from metric-config for convenience.
export type { DemoEntity } from './metric-config';

/** The unified catalogue item — replaces ParentMetric + MetricVariant. */
export interface CatalogueItem {
  item_id: string;
  item_name: string;
  abbreviation: string;
  kind: CatalogueItemKind;
  definition: string;
  generic_formula: string;
  data_type: string;
  unit_type: UnitType;
  direction: Direction;
  metric_class: MetricClass;
  domain_ids: string[];
  regulatory_references?: string[];
  insight: string;
  ingredient_fields: IngredientField[];
  level_definitions: LevelDefinition[];
  number_of_instances: number;
  directly_displayed: boolean;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'IN_REVIEW' | 'APPROVED' | 'ACTIVE' | 'CHANGES_REQUESTED' | 'DEPRECATED' | 'RETIRED';
  executable_metric_id?: string | null;
  /** User ID of last person who edited the metric (for maker-checker). */
  last_editor_id?: string | null;
  /** Display name of last editor. */
  last_editor_name?: string | null;
  demo_data?: DemoData;
  /** Normalized data element name from the specification table. */
  normalized_de_name?: string;
  /** Physical data model column name (for sourced/hybrid metrics). */
  data_element_in_dm?: string | null;
  /** Alternate definition from specification document (for traceability). */
  spec_definition?: string;
  /** Documented differences between the specification and the implementation. */
  spec_discrepancy_notes?: string[];
  /** Tolerance (in %) for rollup reconciliation avg-diff check. Default 5. */
  reconciliation_tolerance_pct?: number;
  /** Evidence from calc:promote — records what was validated at promotion time. */
  validation_evidence?: {
    promoted_at: string;
    promoted_by: string;
    as_of_date: string;
    validation_results: Record<string, boolean>;
    db_row_counts?: Record<string, number>;
    prior_status?: string;
  };
}

/* ── Legacy types (kept for backward compat during migration) ── */

export type VariantStatus = 'ACTIVE' | 'DRAFT' | 'DEPRECATED';
export type VariantType = 'SOURCED' | 'CALCULATED';

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
