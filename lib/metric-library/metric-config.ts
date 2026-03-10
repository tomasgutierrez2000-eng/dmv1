/**
 * MetricVisualizationConfig — unified configuration schema that drives
 * all auto-generated visualizations, demos, and lineage pages.
 *
 * This is the "plug-and-play" layer: define a config (or let config-builder
 * auto-generate one from CatalogueItem + L3Metric), and every visualization
 * component renders without any metric-specific code.
 */

import type { RollupLevelKey, IngredientField } from './types';

// ═══════════════════════════════════════════════════════════════
// Rollup Strategy
// ═══════════════════════════════════════════════════════════════

/** How the metric aggregates at higher rollup levels. */
export type RollupStrategy =
  | 'sum-ratio'      // SUM(numerator) / SUM(denominator) — e.g. LTV
  | 'weighted-avg'   // Σ(metric × weight) / Σ(weight) — e.g. DSCR
  | 'direct-sum'     // SUM(values) — e.g. Committed Amount
  | 'count'          // COUNT(*) — e.g. # Facilities
  | 'min'
  | 'max'
  | 'avg';

// ═══════════════════════════════════════════════════════════════
// Formula Decomposition (for animation)
// ═══════════════════════════════════════════════════════════════

/** One component of a formula's numerator or denominator. */
export interface FormulaComponent {
  /** Arithmetic operator applied to this component. */
  op: '+' | '-' | '*' | '/';
  /** Source field name (from ingredient_fields). */
  field: string;
  /** Human-readable label shown in animation. */
  label: string;
  /** Sample numeric value for the animation. */
  sample_value: number;
  /** Source table (e.g. "facility_master"). */
  source_table: string;
  /** Layer the source belongs to. */
  source_layer: 'L1' | 'L2' | 'L3';
}

/** Full decomposition of a formula into animatable parts. */
export interface FormulaDecomposition {
  /** Components building the numerator (or the whole formula for non-ratio metrics). */
  numerator: FormulaComponent[];
  /** Components building the denominator (empty for non-ratio metrics). */
  denominator: FormulaComponent[];
  /** How to format the final result. */
  result_format: 'percentage' | 'ratio' | 'currency' | 'count' | 'bps' | 'days' | 'index';
  /** Optional: the symbolic formula string (e.g. "SUM(committed) / SUM(collateral) × 100"). */
  formula_display?: string;
}

// ═══════════════════════════════════════════════════════════════
// Value Formatting & Color Bands
// ═══════════════════════════════════════════════════════════════

/** A threshold-based color band for metric values. */
export interface ColorBand {
  /** Values >= this threshold get this color (bands are evaluated top-down). */
  threshold: number;
  /** Tailwind color class without prefix (e.g. "red-400", "amber-400"). */
  color: string;
  /** Optional label (e.g. "Critical", "Watch", "Healthy"). */
  label?: string;
}

/** How to display and color-code metric values. */
export interface ValueFormatConfig {
  format: 'percentage' | 'ratio' | 'currency' | 'count' | 'bps' | 'days' | 'index';
  decimals: number;
  prefix?: string;
  suffix?: string;
  /** Color bands ordered from highest threshold to lowest. */
  color_bands: ColorBand[];
  direction: 'HIGHER_BETTER' | 'LOWER_BETTER' | 'NEUTRAL';
}

// ═══════════════════════════════════════════════════════════════
// Worked Example Table
// ═══════════════════════════════════════════════════════════════

/** Column definition for the worked example table. */
export interface WorkedExampleColumn {
  /** Key into DemoEntity.fields (e.g. "committed_amt", "ltv_pct"). */
  field: string;
  /** Column header label. */
  header: string;
  /** Display format for cell values. */
  format: 'currency' | 'percentage' | 'ratio' | 'text' | 'number';
  /** True = highlight this column as the final metric result. */
  is_result?: boolean;
  /** How to aggregate in subtotal/grand-total rows. */
  subtotal_fn?: 'sum' | 'weighted-avg' | 'count' | 'none';
  /** For weighted-avg subtotals: the weight field key. */
  weight_field?: string;
}

// ═══════════════════════════════════════════════════════════════
// Table Traversal Demo
// ═══════════════════════════════════════════════════════════════

/** One field in a traversal table definition. */
export interface TraversalTableField {
  name: string;
  sample_value: string;
  is_pk?: boolean;
  is_fk?: boolean;
}

/** A table shown in the table traversal demo. */
export interface TraversalTableDef {
  /** Unique key for this table in the traversal. */
  id: string;
  /** SQL table name (e.g. "facility_exposure_snapshot"). */
  name: string;
  layer: 'L1' | 'L2' | 'L3';
  fields: TraversalTableField[];
}

/** One step in a dimension's table traversal. */
export interface TraversalStep {
  /** Kind of step for visual styling. */
  kind: 'source' | 'join' | 'calc' | 'output';
  /** Which table to highlight during this step. */
  highlight_table: string;
  /** Fields to highlight within the table. */
  highlight_fields?: string[];
  /** Narration text (supports {{field}}, {{table}} template vars). */
  narration: string;
  /** Optional join condition description. */
  join_condition?: string;
}

/** Full traversal configuration for the demo. */
export interface TraversalConfig {
  /** Table definitions keyed by table ID. */
  tables: Record<string, TraversalTableDef>;
  /** Per-dimension traversal step sequences. */
  dimension_paths: Partial<Record<RollupLevelKey, TraversalStep[]>>;
}

// ═══════════════════════════════════════════════════════════════
// Demo Entity (generic — replaces metric-specific DemoFacility)
// ═══════════════════════════════════════════════════════════════

/** Generic demo entity for worked examples and hierarchy pyramid. */
export interface DemoEntity {
  entity_id: string;
  entity_name: string;
  counterparty_id: string;
  counterparty_name: string;
  desk_name?: string;
  desk_segment_id?: string;
  portfolio_name?: string;
  lob_name?: string;

  /**
   * Generic field values — keys match WorkedExampleColumn.field.
   * E.g. { committed_amt: 50000000, collateral_value: 75000000, ltv_pct: 66.7 }
   */
  fields: Record<string, number | string>;

  /** Optional sub-positions for position-level drill-down. */
  positions?: Array<{
    position_id: string;
    product_code: string;
    balance_amount: number;
    description: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// MetricVisualizationConfig (the main interface)
// ═══════════════════════════════════════════════════════════════

/** Maps demo entity fields to their role in the metric formula. */
export interface MetricFieldMapping {
  /** Field key for the primary metric value (e.g. "ltv_pct", "dscr_value"). */
  primary_value: string;
  /** Field key for the numerator input (e.g. "committed_amt"). */
  numerator_value?: string;
  /** Field key for the denominator input (e.g. "collateral_value"). */
  denominator_value?: string;
  /** Field key used as weight for weighted-avg rollup (e.g. "committed_amt"). */
  weight_value?: string;
}

/**
 * The full visualization config for a metric.
 * Either auto-generated by config-builder.ts from CatalogueItem + L3Metric,
 * or manually defined as a preset in visualization-configs.json.
 */
export interface MetricVisualizationConfig {
  // ── Identity ──
  item_id: string;
  abbreviation: string;

  // ── Calculation ──
  rollup_strategy: RollupStrategy;
  metric_fields: MetricFieldMapping;
  /** Field used as weight for weighted-avg strategy. */
  weight_field?: string;

  // ── Display ──
  value_format: ValueFormatConfig;
  formula_decomposition: FormulaDecomposition;
  worked_example_columns: WorkedExampleColumn[];

  // ── Demos ──
  /** Table traversal config (auto-generated from sourceFields if not provided). */
  traversal_config?: TraversalConfig;
  /** Per-level insight callouts (auto-generated from level_logic if not provided). */
  insights?: Partial<Record<RollupLevelKey, string>>;
  /** Pre-built demo entities (converted from DemoFacility if legacy data). */
  demo_entities?: DemoEntity[];

  // ── Feature Flags ──
  /** Which visualization sections to show (all true by default). */
  features?: {
    show_lineage_dag?: boolean;
    show_hierarchy_pyramid?: boolean;
    show_table_traversal?: boolean;
    show_formula_animation?: boolean;
    show_worked_examples?: boolean;
    show_step_walkthrough?: boolean;
    show_spotlight_demo?: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/** Get color class for a metric value based on config bands. */
export function getValueColor(value: number, config: ValueFormatConfig): string {
  const bands = config.direction === 'HIGHER_BETTER'
    ? [...config.color_bands].sort((a, b) => a.threshold - b.threshold) // ascending: low = bad
    : [...config.color_bands].sort((a, b) => b.threshold - a.threshold); // descending: high = bad

  for (const band of bands) {
    if (config.direction === 'LOWER_BETTER' && value >= band.threshold) {
      return `text-${band.color}`;
    }
    if (config.direction === 'HIGHER_BETTER' && value <= band.threshold) {
      return `text-${band.color}`;
    }
  }
  // Default: no color band matched — use the "healthy" color
  return 'text-gray-200';
}

/** Format a metric value according to config. */
export function formatMetricValue(value: number, config: ValueFormatConfig): string {
  const formatted = value.toFixed(config.decimals);
  const prefix = config.prefix ?? '';
  const suffix = config.suffix ?? '';
  return `${prefix}${formatted}${suffix}`;
}

/** Compute aggregated metric value at a rollup level using the configured strategy. */
export function computeRollup(
  entities: DemoEntity[],
  config: MetricVisualizationConfig,
): number {
  const { rollup_strategy, metric_fields } = config;
  const vals = entities.map(e => Number(e.fields[metric_fields.primary_value]) || 0);

  switch (rollup_strategy) {
    case 'direct-sum':
      return vals.reduce((s, v) => s + v, 0);

    case 'count':
      return entities.length;

    case 'avg':
      return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;

    case 'min':
      return vals.length > 0 ? Math.min(...vals) : 0;

    case 'max':
      return vals.length > 0 ? Math.max(...vals) : 0;

    case 'sum-ratio': {
      const numField = metric_fields.numerator_value;
      const denField = metric_fields.denominator_value;
      if (!numField || !denField) return 0;
      const numSum = entities.reduce((s, e) => s + (Number(e.fields[numField]) || 0), 0);
      const denSum = entities.reduce((s, e) => s + (Number(e.fields[denField]) || 0), 0);
      if (denSum === 0) return 0;
      const raw = numSum / denSum;
      // If result_format is percentage, multiply by 100
      return config.formula_decomposition.result_format === 'percentage' ? raw * 100 : raw;
    }

    case 'weighted-avg': {
      const weightField = metric_fields.weight_value ?? config.weight_field;
      if (!weightField) return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      let weightedSum = 0;
      let totalWeight = 0;
      for (const e of entities) {
        const v = Number(e.fields[metric_fields.primary_value]) || 0;
        const w = Number(e.fields[weightField]) || 0;
        weightedSum += v * w;
        totalWeight += w;
      }
      return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    default:
      return 0;
  }
}
