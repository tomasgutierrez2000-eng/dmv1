/**
 * Config Builder — auto-generates MetricVisualizationConfig from
 * CatalogueItem + optional L3Metric data.
 *
 * This is the "zero-config" path: metrics that don't have a preset
 * in visualization-configs.json get a fully functional config
 * inferred from their catalogue and metric definitions.
 */

import type { CatalogueItem, DemoFacility, RollupLevelKey } from './types';
import type { L3Metric } from '@/data/l3-metrics';
import type {
  MetricVisualizationConfig,
  RollupStrategy,
  ValueFormatConfig,
  FormulaDecomposition,
  FormulaComponent,
  ColorBand,
  WorkedExampleColumn,
  TraversalConfig,
  TraversalTableDef,
  TraversalStep,
  DemoEntity,
  MetricFieldMapping,
} from './metric-config';

// ═══════════════════════════════════════════════════════════════
// Preset loader
// ═══════════════════════════════════════════════════════════════

import presetsJson from '@/data/metric-library/visualization-configs.json';

function loadPresets(): Record<string, Partial<MetricVisualizationConfig>> {
  return presetsJson as Record<string, Partial<MetricVisualizationConfig>>;
}

// ═══════════════════════════════════════════════════════════════
// Main builder
// ═══════════════════════════════════════════════════════════════

/**
 * Build a MetricVisualizationConfig from a CatalogueItem and optional L3Metric.
 * Uses preset overrides from visualization-configs.json if available.
 */
export function buildVisualizationConfig(
  item: CatalogueItem,
  metric?: L3Metric | null,
): MetricVisualizationConfig {
  const presets = loadPresets();
  const preset = presets[item.item_id] ?? presets[item.abbreviation] ?? {};

  const rollupStrategy = preset.rollup_strategy ?? inferRollupStrategy(item);
  const metricFields = preset.metric_fields ?? inferMetricFields(item, rollupStrategy);
  const valueFormat = preset.value_format ?? inferValueFormat(item);
  const formulaDecomp = preset.formula_decomposition ?? inferFormulaDecomposition(item);
  const columns = preset.worked_example_columns ?? inferWorkedExampleColumns(item, metricFields);
  const traversal = preset.traversal_config ?? inferTraversalConfig(item, metric);
  const insights = preset.insights ?? inferInsights(item, rollupStrategy);
  const entities = preset.demo_entities ?? convertDemoData(item, metricFields);

  return {
    item_id: item.item_id,
    abbreviation: item.abbreviation,
    rollup_strategy: rollupStrategy,
    metric_fields: metricFields,
    weight_field: preset.weight_field ?? (rollupStrategy === 'weighted-avg' ? metricFields.weight_value : undefined),
    value_format: valueFormat,
    formula_decomposition: formulaDecomp,
    worked_example_columns: columns,
    traversal_config: traversal,
    insights,
    demo_entities: entities,
    features: preset.features ?? {
      show_lineage_dag: true,
      show_hierarchy_pyramid: true,
      show_table_traversal: true,
      show_formula_animation: true,
      show_worked_examples: true,
      show_step_walkthrough: true,
      show_spotlight_demo: true,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Inference functions
// ═══════════════════════════════════════════════════════════════

function inferRollupStrategy(item: CatalogueItem): RollupStrategy {
  const types = item.level_definitions.map(d => d.sourcing_type);

  // If any level uses Avg, it's weighted-avg
  if (types.includes('Avg')) return 'weighted-avg';

  // If we have both Calc and Agg, it's typically a ratio aggregated upward
  if (types.includes('Calc') && types.includes('Agg')) return 'sum-ratio';

  // Pure Agg = direct sum
  if (types.every(t => t === 'Agg' || t === 'Raw')) return 'direct-sum';

  // Calc-only = sum-ratio (formula at each level)
  if (types.every(t => t === 'Calc')) return 'sum-ratio';

  // Default to direct-sum for data elements
  if (item.kind === 'DATA_ELEMENT') return 'direct-sum';

  return 'sum-ratio';
}

function inferMetricFields(item: CatalogueItem, strategy: RollupStrategy): MetricFieldMapping {
  // Try to detect from known field patterns in demo_data
  const abbr = item.abbreviation.toLowerCase();

  // Check for known patterns
  if (abbr === 'ltv') {
    return {
      primary_value: 'ltv_pct',
      numerator_value: 'committed_amt',
      denominator_value: 'collateral_value',
    };
  }
  if (abbr === 'dscr') {
    return {
      primary_value: 'dscr_value',
      numerator_value: 'noi_amt',
      denominator_value: 'debt_service_amt',
      weight_value: 'committed_amt',
    };
  }

  // Generic inference from formula and ingredient fields
  const fields = item.ingredient_fields;

  if (strategy === 'sum-ratio' && fields.length >= 2) {
    return {
      primary_value: `${abbr.toLowerCase()}_value`,
      numerator_value: fields[0].field,
      denominator_value: fields[1].field,
    };
  }

  if (strategy === 'weighted-avg') {
    const amtField = fields.find(f => f.field.endsWith('_amt'));
    return {
      primary_value: `${abbr.toLowerCase()}_value`,
      weight_value: amtField?.field ?? fields[0]?.field,
    };
  }

  return {
    primary_value: fields[0]?.field ?? `${abbr.toLowerCase()}_value`,
  };
}

function inferValueFormat(item: CatalogueItem): ValueFormatConfig {
  const direction = item.direction;

  switch (item.unit_type) {
    case 'PERCENTAGE':
      return {
        format: 'percentage',
        decimals: 1,
        suffix: '%',
        direction,
        color_bands: direction === 'LOWER_BETTER'
          ? [
              { threshold: 100, color: 'red-400', label: 'Critical' },
              { threshold: 80, color: 'amber-400', label: 'Watch' },
              { threshold: 0, color: 'emerald-400', label: 'Healthy' },
            ]
          : [
              { threshold: 0, color: 'red-400', label: 'Critical' },
              { threshold: 50, color: 'amber-400', label: 'Watch' },
              { threshold: 80, color: 'emerald-400', label: 'Healthy' },
            ],
      };

    case 'RATIO':
      return {
        format: 'ratio',
        decimals: 2,
        suffix: 'x',
        direction,
        color_bands: direction === 'HIGHER_BETTER'
          ? [
              { threshold: 0, color: 'red-400', label: 'Critical' },
              { threshold: 1.0, color: 'amber-400', label: 'Watch' },
              { threshold: 1.25, color: 'emerald-400', label: 'Healthy' },
            ]
          : [
              { threshold: 2.0, color: 'red-400', label: 'Critical' },
              { threshold: 1.5, color: 'amber-400', label: 'Watch' },
              { threshold: 0, color: 'emerald-400', label: 'Healthy' },
            ],
      };

    case 'CURRENCY':
      return {
        format: 'currency',
        decimals: 0,
        prefix: '$',
        direction,
        color_bands: [],
      };

    case 'COUNT':
      return {
        format: 'count',
        decimals: 0,
        direction,
        color_bands: [],
      };

    case 'RATE':
      return {
        format: 'bps',
        decimals: 1,
        suffix: ' bps',
        direction,
        color_bands: [],
      };

    case 'DAYS':
      return {
        format: 'days',
        decimals: 0,
        suffix: ' days',
        direction,
        color_bands: [],
      };

    default:
      return {
        format: 'index',
        decimals: 2,
        direction,
        color_bands: [],
      };
  }
}

function inferFormulaDecomposition(item: CatalogueItem): FormulaDecomposition {
  const fields = item.ingredient_fields;

  // Parse the generic formula to detect ratio patterns
  const formula = item.generic_formula;
  const isRatio = formula.includes('/') || formula.includes('÷');

  if (isRatio && fields.length >= 2) {
    // Split fields into numerator and denominator groups
    // Heuristic: first half = numerator, second half = denominator
    const mid = Math.ceil(fields.length / 2);
    const numFields = fields.slice(0, mid);
    const denFields = fields.slice(mid);

    return {
      numerator: numFields.map((f, i) => ({
        op: i === 0 ? '+' as const : '+' as const,
        field: f.field,
        label: f.description || f.field.replace(/_/g, ' '),
        sample_value: parseSampleValue(f.sample_value),
        source_table: f.table,
        source_layer: f.layer,
      })),
      denominator: denFields.map((f, i) => ({
        op: i === 0 ? '+' as const : '+' as const,
        field: f.field,
        label: f.description || f.field.replace(/_/g, ' '),
        sample_value: parseSampleValue(f.sample_value),
        source_table: f.table,
        source_layer: f.layer,
      })),
      result_format: item.unit_type === 'PERCENTAGE' ? 'percentage' : 'ratio',
      formula_display: formula,
    };
  }

  // Non-ratio: all fields are components of a single calculation
  return {
    numerator: fields.map((f, i) => ({
      op: i === 0 ? '+' as const : '+' as const,
      field: f.field,
      label: f.description || f.field.replace(/_/g, ' '),
      sample_value: parseSampleValue(f.sample_value),
      source_table: f.table,
      source_layer: f.layer,
    })),
    denominator: [],
    result_format: item.unit_type === 'CURRENCY' ? 'currency' : 'count',
    formula_display: formula,
  };
}

function inferWorkedExampleColumns(
  item: CatalogueItem,
  metricFields: MetricFieldMapping,
): WorkedExampleColumn[] {
  const columns: WorkedExampleColumn[] = [];

  // Add numerator/denominator columns if they exist
  if (metricFields.numerator_value) {
    const field = item.ingredient_fields.find(f => f.field === metricFields.numerator_value);
    columns.push({
      field: metricFields.numerator_value,
      header: field?.description || metricFields.numerator_value.replace(/_/g, ' '),
      format: detectFieldFormat(metricFields.numerator_value),
      subtotal_fn: 'sum',
    });
  }

  if (metricFields.denominator_value) {
    const field = item.ingredient_fields.find(f => f.field === metricFields.denominator_value);
    columns.push({
      field: metricFields.denominator_value,
      header: field?.description || metricFields.denominator_value.replace(/_/g, ' '),
      format: detectFieldFormat(metricFields.denominator_value),
      subtotal_fn: 'sum',
    });
  }

  // If no numerator/denominator, add all ingredient fields
  if (columns.length === 0) {
    for (const f of item.ingredient_fields.slice(0, 4)) {
      columns.push({
        field: f.field,
        header: f.description || f.field.replace(/_/g, ' '),
        format: detectFieldFormat(f.field),
        subtotal_fn: 'sum',
      });
    }
  }

  // Add the result column
  columns.push({
    field: metricFields.primary_value,
    header: item.abbreviation,
    format: item.unit_type === 'PERCENTAGE' ? 'percentage'
      : item.unit_type === 'RATIO' ? 'ratio'
      : item.unit_type === 'CURRENCY' ? 'currency'
      : 'number',
    is_result: true,
    subtotal_fn: 'none',
  });

  return columns;
}

function inferTraversalConfig(
  item: CatalogueItem,
  metric?: L3Metric | null,
): TraversalConfig | undefined {
  const sourceFields = metric?.sourceFields ?? [];
  if (sourceFields.length === 0 && item.ingredient_fields.length === 0) return undefined;

  // Build table definitions from source fields
  const tables: Record<string, TraversalTableDef> = {};
  const allFields = [
    ...sourceFields.map(f => ({ ...f, layer: f.layer as 'L1' | 'L2' | 'L3' })),
    ...item.ingredient_fields.filter(
      f => !sourceFields.some(sf => sf.table === f.table && sf.field === f.field),
    ),
  ];

  for (const f of allFields) {
    const tableId = f.table.replace(/[^a-z0-9_]/gi, '_');
    if (!tables[tableId]) {
      tables[tableId] = {
        id: tableId,
        name: f.table,
        layer: f.layer as 'L1' | 'L2' | 'L3',
        fields: [],
      };
    }
    if (!tables[tableId].fields.some(ef => ef.name === f.field)) {
      tables[tableId].fields.push({
        name: f.field,
        sample_value: ('sampleValue' in f ? f.sampleValue : ('sample_value' in f ? f.sample_value : '')) ?? '',
        is_pk: f.field.endsWith('_id'),
        is_fk: f.field.endsWith('_id') && !f.field.startsWith(f.table.replace('_master', '').replace('_snapshot', '')),
      });
    }
  }

  // Add a calc table for the output
  const calcTableId = 'calc_output';
  tables[calcTableId] = {
    id: calcTableId,
    name: `${item.abbreviation.toLowerCase()}_calculation`,
    layer: 'L3',
    fields: [
      { name: 'result', sample_value: item.abbreviation, is_pk: false, is_fk: false },
    ],
  };

  // Build facility-level traversal steps
  const tableIds = Object.keys(tables).filter(id => id !== calcTableId);
  const facilitySteps: TraversalStep[] = tableIds.map((tid, i) => ({
    kind: i === 0 ? 'source' as const : 'join' as const,
    highlight_table: tid,
    highlight_fields: tables[tid].fields.map(f => f.name),
    narration: i === 0
      ? `Start by reading ${tables[tid].name} to get the source data.`
      : `Join to ${tables[tid].name} for additional fields.`,
    join_condition: i > 0 ? `facility_id` : undefined,
  }));
  facilitySteps.push({
    kind: 'calc',
    highlight_table: calcTableId,
    narration: `Apply the formula: ${item.generic_formula}`,
  });

  const dimensionPaths: Partial<Record<RollupLevelKey, TraversalStep[]>> = {
    facility: facilitySteps,
  };

  // Higher levels reuse facility steps + aggregation
  const higherLevels: RollupLevelKey[] = ['counterparty', 'desk', 'portfolio', 'lob'];
  for (const level of higherLevels) {
    const levelDef = item.level_definitions.find(d => d.level === level);
    if (!levelDef) continue;
    dimensionPaths[level] = [
      ...facilitySteps.slice(0, -1),
      {
        kind: 'calc',
        highlight_table: calcTableId,
        narration: `Aggregate: ${levelDef.level_logic.slice(0, 120)}`,
      },
    ];
  }

  return { tables, dimension_paths: dimensionPaths };
}

function inferInsights(
  item: CatalogueItem,
  strategy: RollupStrategy,
): Partial<Record<RollupLevelKey, string>> {
  const abbr = item.abbreviation;
  const insights: Partial<Record<RollupLevelKey, string>> = {};

  const strategyDesc: Record<RollupStrategy, string> = {
    'sum-ratio': `The ${abbr} formula is applied at each level — only the scope of facilities included changes.`,
    'weighted-avg': `At higher levels, ${abbr} uses exposure-weighted averaging to properly reflect the economic mix.`,
    'direct-sum': `${abbr} is simply summed across all entities at each level.`,
    'count': `${abbr} counts distinct entities at each scope level.`,
    'min': `${abbr} takes the minimum value across all entities in scope.`,
    'max': `${abbr} takes the maximum value across all entities in scope.`,
    'avg': `${abbr} takes the simple average across all entities in scope.`,
  };

  const base = strategyDesc[strategy];
  const levels: RollupLevelKey[] = ['facility', 'counterparty', 'desk', 'portfolio', 'lob'];
  const scopeLabels: Record<RollupLevelKey, string> = {
    facility: 'a single facility',
    counterparty: 'all facilities under the counterparty',
    desk: 'all facilities assigned to the desk',
    portfolio: 'all desks within the portfolio',
    lob: 'the entire business segment',
  };

  for (const level of levels) {
    insights[level] = `${base} At ${level} level, scope covers ${scopeLabels[level]}.`;
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════
// Demo data conversion
// ═══════════════════════════════════════════════════════════════

/** Convert legacy DemoFacility[] to DemoEntity[]. */
export function convertDemoData(
  item: CatalogueItem,
  metricFields: MetricFieldMapping,
): DemoEntity[] | undefined {
  if (!item.demo_data?.facilities?.length) return undefined;
  return item.demo_data.facilities.map(f => demoFacilityToEntity(f, metricFields));
}

/** Convert a single legacy DemoFacility to a generic DemoEntity. */
export function demoFacilityToEntity(
  f: DemoFacility,
  metricFields: MetricFieldMapping,
): DemoEntity {
  // Build the generic fields map from all known DemoFacility properties
  const fields: Record<string, number | string> = {
    committed_amt: f.committed_amt,
    collateral_value: f.collateral_value,
    ltv_pct: f.ltv_pct,
  };

  // Add optional DSCR fields
  if (f.noi_amt !== undefined) fields.noi_amt = f.noi_amt;
  if (f.debt_service_amt !== undefined) fields.debt_service_amt = f.debt_service_amt;
  if (f.dscr_value !== undefined) fields.dscr_value = f.dscr_value;
  if (f.cashflow_label !== undefined) fields.cashflow_label = f.cashflow_label;

  // Add optional Undrawn Exposure fields
  if (f.unfunded_amt !== undefined) fields.unfunded_amt = f.unfunded_amt;
  if (f.bank_share_pct !== undefined) fields.bank_share_pct = f.bank_share_pct;
  if (f.undrawn_exposure_amt !== undefined) fields.undrawn_exposure_amt = f.undrawn_exposure_amt;

  // Add optional External Rating fields
  if (f.external_rating !== undefined) fields.external_rating = f.external_rating;
  if (f.external_rating_notch !== undefined) fields.external_rating_notch = f.external_rating_notch;

  // Pass through auto-generated extra_fields (from Python calc-engine demo generator)
  if (f.extra_fields) {
    for (const [key, val] of Object.entries(f.extra_fields)) {
      if (!(key in fields)) {
        fields[key] = val;
      }
    }
  }

  return {
    entity_id: f.facility_id,
    entity_name: f.facility_name,
    counterparty_id: f.counterparty_id,
    counterparty_name: f.counterparty_name,
    desk_name: f.desk_name,
    desk_segment_id: f.lob_segment_id,
    portfolio_name: f.portfolio_name,
    lob_name: f.lob_name,
    fields,
    positions: f.positions?.map(p => ({
      position_id: p.position_id,
      product_code: p.product_code,
      balance_amount: p.balance_amount,
      description: p.description,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function parseSampleValue(val?: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[$,%x]/g, '').replace(/,/g, '');
  return parseFloat(cleaned) || 0;
}

function detectFieldFormat(field: string): 'currency' | 'percentage' | 'ratio' | 'number' {
  if (field.endsWith('_amt') || field.endsWith('_value') || field.endsWith('_amount')) return 'currency';
  if (field.endsWith('_pct') || field.endsWith('_percent')) return 'percentage';
  if (field.endsWith('_ratio')) return 'ratio';
  return 'number';
}
