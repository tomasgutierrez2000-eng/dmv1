#!/usr/bin/env tsx
/**
 * Sync YAML metric definitions → catalogue.json + visualization-configs.json
 *
 * Option C: YAML is source of truth. This script:
 * 1. CREATES new catalogue items from YAML if no match exists
 * 2. UPDATES existing catalogue items with level_definitions, ingredient_fields
 * 3. Generates visualization config presets when YAML specifies rollup_strategy
 *
 * Matching: catalogue item is matched when executable_metric_id or item_id
 * matches YAML metric_id, or when item_id matches a YAML legacy_metric_ids entry.
 *
 * Usage: npx tsx scripts/calc_engine/sync-yaml-to-catalogue.ts [--dry-run]
 */

import path from 'path';
import fs from 'fs';
import { loadMetricDefinitions } from './loader';
import { getMetricLibraryDir } from '../../lib/config';
import type { MetricDefinition } from './types';
import type { AggregationLevel } from './types';

const CATALOGUE_LEVELS = ['facility', 'counterparty', 'desk', 'portfolio', 'lob'] as const;
const YAML_TO_CATALOGUE: Record<string, (typeof CATALOGUE_LEVELS)[number]> = {
  facility: 'facility',
  counterparty: 'counterparty',
  desk: 'desk',
  portfolio: 'portfolio',
  business_segment: 'lob',
};

// ═══════════════════════════════════════════════════════════════
// Sourcing type mapping
// ═══════════════════════════════════════════════════════════════

function aggregationToSourcing(agg: string): 'Raw' | 'Calc' | 'Agg' | 'Avg' {
  switch (agg) {
    case 'RAW':
      return 'Raw';
    case 'WEIGHTED_AVG':
      return 'Avg';
    case 'SUM':
    case 'COUNT':
    case 'COUNT_DISTINCT':
    case 'MIN':
    case 'MAX':
    case 'MEDIAN':
      return 'Agg';
    default:
      return 'Calc';
  }
}

// ═══════════════════════════════════════════════════════════════
// Structured pseudocode generation from YAML source_tables + formula_sql
// ═══════════════════════════════════════════════════════════════

/**
 * Generate structured step-by-step pseudocode from the YAML metric definition.
 *
 * Produces numbered steps like:
 *   1. LOAD  l2.collateral_snapshot  (cs)
 *      WHERE cs.as_of_date = :as_of_date
 *   2. JOIN  l1.facility_master  (fm)
 *      ON    fm.facility_id = cs.facility_id
 *      AND   fm.is_active_flag = 'Y'
 *   3. GROUP BY cs.facility_id
 *   4. COMPUTE
 *      metric_value = SUM(current_valuation_usd) * ...
 */
function generateStructuredPseudocode(
  metric: MetricDefinition,
  yamlLevel: AggregationLevel,
): string | null {
  const formula = metric.levels[yamlLevel];
  if (!formula?.formula_sql) return null;

  const steps: string[] = [];
  let stepNum = 1;

  // Build source table steps (LOAD for BASE, JOIN/LEFT JOIN for others)
  for (const st of metric.source_tables) {
    const qualifiedName = `${st.schema}.${st.table}`;
    const filterFields = st.fields.filter((f) => f.role === 'FILTER');
    const filterLines = filterFields.map((f) => {
      if (f.name === 'as_of_date') return `${st.alias}.as_of_date = :as_of_date`;
      if (f.name === 'is_active_flag') return `${st.alias}.is_active_flag = 'Y'`;
      if (f.name === 'is_current_flag') return `${st.alias}.is_current_flag = 'Y'`;
      return `${st.alias}.${f.name} = <filter>`;
    });

    if (st.join_type === 'BASE') {
      let line = `${stepNum}. LOAD  ${qualifiedName}  (${st.alias})`;
      if (filterLines.length > 0) {
        line += '\n   WHERE ' + filterLines.join('\n   AND   ');
      }
      steps.push(line);
    } else {
      const joinKeyword = st.join_type === 'LEFT' ? 'LEFT JOIN' : 'JOIN';
      let line = `${stepNum}. ${joinKeyword}  ${qualifiedName}  (${st.alias})`;
      if (st.join_on) {
        line += '\n   ON    ' + st.join_on;
      }
      // Only add filters not already covered by join_on
      const joinOnStr = st.join_on ?? '';
      const extraFilters = filterLines.filter((fl) => {
        const fieldName = fl.split('.').pop()?.split(' ')[0] ?? '';
        return !joinOnStr.includes(fieldName);
      });
      if (extraFilters.length > 0) {
        line += '\n   AND   ' + extraFilters.join('\n   AND   ');
      }
      steps.push(line);
    }
    stepNum++;
  }

  // Extract GROUP BY from the outermost query in formula_sql
  // Only match GROUP BY that is NOT inside a subquery (parentheses)
  const sql = formula.formula_sql;
  let depth = 0;
  let outermostGroupBy: string | null = null;
  const lines = sql.split('\n');
  for (const line of lines) {
    for (const ch of line) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
    }
    if (depth === 0) {
      const gbMatch = line.match(/^\s*GROUP\s+BY\s+(.+)/i);
      if (gbMatch) {
        outermostGroupBy = gbMatch[1].trim();
      }
    }
  }
  if (outermostGroupBy) {
    steps.push(`${stepNum}. GROUP BY ${outermostGroupBy}`);
    stepNum++;
  }

  // Extract SELECT ... AS metric_value expression for COMPUTE step
  const selectMatch = sql.match(
    /,\s*([\s\S]*?)\s+AS\s+metric_value/i
  );
  if (selectMatch) {
    let expr = selectMatch[1].trim();
    // Clean up multi-line whitespace but preserve structure
    expr = expr.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
    steps.push(`${stepNum}. COMPUTE\n   metric_value = ${expr}`);
  } else {
    // Fallback: use formula_text as the compute description
    steps.push(`${stepNum}. COMPUTE\n   ${formula.formula_text.trim()}`);
  }

  return steps.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// Source references & level definitions
// ═══════════════════════════════════════════════════════════════

function buildSourceReferences(metric: MetricDefinition): Array<{ layer: 'L1' | 'L2' | 'L3'; table: string; field: string; description: string }> {
  const refs: Array<{ layer: 'L1' | 'L2' | 'L3'; table: string; field: string; description: string }> = [];
  const seen = new Set<string>();
  for (const st of metric.source_tables) {
    const layer = st.schema.toUpperCase() as 'L1' | 'L2' | 'L3';
    for (const f of st.fields) {
      const key = `${layer}.${st.table}.${f.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({
        layer,
        table: st.table,
        field: f.name,
        description: f.description ?? f.name,
      });
    }
  }
  return refs;
}

function buildLevelDefinition(
  metric: MetricDefinition,
  level: AggregationLevel,
  catalogueLevel: (typeof CATALOGUE_LEVELS)[number]
): {
  level: (typeof CATALOGUE_LEVELS)[number];
  dashboard_display_name: string;
  in_record: boolean;
  sourcing_type: 'Raw' | 'Calc' | 'Agg' | 'Avg';
  level_logic: string;
  source_references: Array<{ layer: 'L1' | 'L2' | 'L3'; table: string; field: string; description: string }>;
} {
  const formula = metric.levels[level];
  const sourcing = formula ? aggregationToSourcing(formula.aggregation_type) : 'Calc';
  // Prefer structured pseudocode; fall back to formula_text or description
  const levelLogic = generateStructuredPseudocode(metric, level)
    ?? formula?.formula_text
    ?? metric.description;
  const sourceRefs = buildSourceReferences(metric);

  return {
    level: catalogueLevel,
    dashboard_display_name: `${metric.name} (${catalogueLevel})`,
    in_record: !!formula?.formula_sql,
    sourcing_type: sourcing,
    level_logic: levelLogic,
    source_references: sourceRefs,
  };
}

// ═══════════════════════════════════════════════════════════════
// Ingredient fields derivation from YAML source_tables
// ═══════════════════════════════════════════════════════════════

/** Infer SQL data type from field name suffix (DDL naming convention). */
function inferDataType(fieldName: string): string {
  if (fieldName.endsWith('_amt')) return 'NUMERIC(20,4)';
  if (fieldName.endsWith('_pct')) return 'NUMERIC(10,6)';
  if (fieldName.endsWith('_value')) return 'NUMERIC(12,6)';
  if (fieldName.endsWith('_bps')) return 'NUMERIC(10,4)';
  if (fieldName.endsWith('_count')) return 'INTEGER';
  if (fieldName.endsWith('_rate')) return 'NUMERIC(10,6)';
  if (fieldName.endsWith('_flag')) return 'BOOLEAN';
  if (fieldName.endsWith('_date')) return 'DATE';
  if (fieldName.endsWith('_id')) return 'BIGINT';
  if (fieldName.endsWith('_code')) return 'VARCHAR(30)';
  if (fieldName.endsWith('_name') || fieldName.endsWith('_desc') || fieldName.endsWith('_text')) return 'VARCHAR(500)';
  return 'VARCHAR(64)';
}

/** Build ingredient_fields from YAML source_tables (MEASURE fields only). */
function buildIngredientFields(metric: MetricDefinition): Array<{
  layer: 'L1' | 'L2' | 'L3';
  table: string;
  field: string;
  description: string;
  data_type: string;
  sample_value: string;
}> {
  const fields: Array<{
    layer: 'L1' | 'L2' | 'L3';
    table: string;
    field: string;
    description: string;
    data_type: string;
    sample_value: string;
  }> = [];
  const seen = new Set<string>();

  for (const st of metric.source_tables) {
    const layer = st.schema.toUpperCase() as 'L1' | 'L2' | 'L3';
    for (const f of st.fields) {
      if (f.role !== 'MEASURE') continue;
      const key = `${layer}.${st.table}.${f.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      fields.push({
        layer,
        table: st.table,
        field: f.name,
        description: f.description ?? f.name,
        data_type: inferDataType(f.name),
        sample_value: '',
      });
    }
  }
  return fields;
}

// ═══════════════════════════════════════════════════════════════
// Regulatory reference formatting
// ═══════════════════════════════════════════════════════════════

function formatRegulatoryRef(ref: { framework: string; section?: string; schedule?: string; description: string }): string {
  const parts = [ref.framework];
  if (ref.schedule) parts.push(`Schedule ${ref.schedule}`);
  if (ref.section) parts.push(`Section ${ref.section}`);
  return parts.join(' ');
}

/** Map unit_type → default data_type for the catalogue item. */
function unitTypeToDataType(unitType: string): string {
  switch (unitType) {
    case 'CURRENCY': return 'NUMERIC(20,4)';
    case 'PERCENTAGE': return 'NUMERIC(10,6)';
    case 'RATIO': return 'NUMERIC(12,6)';
    case 'COUNT': return 'INTEGER';
    case 'RATE': return 'NUMERIC(10,6)';
    case 'BPS': return 'NUMERIC(10,4)';
    case 'DAYS': return 'INTEGER';
    case 'INDEX': return 'NUMERIC(12,6)';
    default: return 'NUMERIC(20,4)';
  }
}

/** Generate an abbreviation from metric name (e.g. "Interest Expense" → "INT_EXP"). */
function generateAbbreviation(metric: MetricDefinition): string {
  return metric.name
    .split(/\s+/)
    .map((w) => w.slice(0, 3).toUpperCase())
    .join('_');
}

// ═══════════════════════════════════════════════════════════════
// Catalogue item creation (NEW)
// ═══════════════════════════════════════════════════════════════

function createCatalogueItem(metric: MetricDefinition): CatalogueItem {
  const cat = metric.catalogue;
  const itemId = cat?.item_id ?? metric.legacy_metric_ids?.[0] ?? metric.metric_id;
  const abbreviation = cat?.abbreviation ?? generateAbbreviation(metric);

  return {
    item_id: itemId,
    item_name: metric.name,
    abbreviation,
    kind: 'METRIC',
    definition: metric.description,
    generic_formula: metric.levels.facility?.formula_text ?? metric.description,
    data_type: unitTypeToDataType(metric.unit_type),
    unit_type: metric.unit_type,
    direction: metric.direction,
    metric_class: metric.metric_class,
    domain_ids: [metric.domain],
    regulatory_references: metric.regulatory_references.map(formatRegulatoryRef),
    insight: cat?.insight ?? '',
    number_of_instances: Object.keys(metric.levels).length,
    directly_displayed: false,
    status: metric.status,
    executable_metric_id: metric.metric_id,
    normalized_de_name: metric.name,
    data_element_in_dm: cat?.primary_value_field ?? '',
    ingredient_fields: buildIngredientFields(metric),
    level_definitions: [],
    demo_data: { facilities: [] },
  };
}

// ═══════════════════════════════════════════════════════════════
// Visualization config preset generation
// ═══════════════════════════════════════════════════════════════

interface VizPreset {
  rollup_strategy?: string;
  metric_fields?: { primary_value: string };
  formula_decomposition?: {
    numerator: Array<{
      op: string;
      field: string;
      label: string;
      sample_value: number;
      source_table: string;
      source_layer: string;
    }>;
    denominator: never[];
    result_format: string;
    formula_display: string;
  };
  worked_example_columns?: Array<{
    field: string;
    header: string;
    format: string;
    is_result?: boolean;
    subtotal_fn?: string;
  }>;
}

function fieldToFormat(fieldName: string): string {
  if (fieldName.endsWith('_amt')) return 'currency';
  if (fieldName.endsWith('_pct')) return 'percentage';
  if (fieldName.endsWith('_bps')) return 'number';
  if (fieldName.endsWith('_count')) return 'number';
  return 'number';
}

function fieldToHeader(fieldName: string): string {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/ Amt$/, ' ($)')
    .replace(/ Pct$/, ' (%)')
    .replace(/ Bps$/, ' (bps)');
}

function buildVisualizationPreset(metric: MetricDefinition): VizPreset | null {
  const cat = metric.catalogue;
  if (!cat?.rollup_strategy && !cat?.primary_value_field) return null;

  const preset: VizPreset = {};

  if (cat.rollup_strategy) {
    preset.rollup_strategy = cat.rollup_strategy;
  }

  if (cat.primary_value_field) {
    preset.metric_fields = { primary_value: cat.primary_value_field };
  }

  // Auto-build formula_decomposition from MEASURE fields
  const measureFields = buildIngredientFields(metric);
  if (measureFields.length > 0) {
    preset.formula_decomposition = {
      numerator: measureFields.map((f) => ({
        op: '*',
        field: f.field,
        label: f.description,
        sample_value: 0,
        source_table: f.table,
        source_layer: f.layer,
      })),
      denominator: [],
      result_format: metric.unit_type === 'CURRENCY' ? 'currency'
        : metric.unit_type === 'PERCENTAGE' ? 'percentage'
        : metric.unit_type === 'RATIO' ? 'ratio'
        : 'number',
      formula_display: metric.levels.facility?.formula_text ?? metric.description,
    };

    // Auto-build worked_example_columns
    const columns: VizPreset['worked_example_columns'] = measureFields.map((f) => ({
      field: f.field,
      header: fieldToHeader(f.field),
      format: fieldToFormat(f.field),
      subtotal_fn: f.field.endsWith('_amt') ? 'sum' : 'none',
    }));

    // Add result column if primary_value_field specified
    if (cat.primary_value_field && !columns.some((c) => c.field === cat.primary_value_field)) {
      columns.push({
        field: cat.primary_value_field,
        header: fieldToHeader(cat.primary_value_field),
        format: fieldToFormat(cat.primary_value_field),
        is_result: true,
        subtotal_fn: 'sum',
      });
    } else {
      const resultCol = columns.find((c) => c.field === cat.primary_value_field);
      if (resultCol) resultCol.is_result = true;
    }

    preset.worked_example_columns = columns;
  }

  return preset;
}

// ═══════════════════════════════════════════════════════════════
// Matching
// ═══════════════════════════════════════════════════════════════

interface CatalogueItem {
  item_id: string;
  item_name?: string;
  abbreviation?: string;
  kind?: string;
  definition?: string;
  generic_formula?: string;
  ingredient_fields?: unknown[];
  level_definitions?: unknown[];
  executable_metric_id?: string | null;
  [key: string]: unknown;
}

function findMatchingCatalogueItem(
  catalogue: CatalogueItem[],
  metric: MetricDefinition
): CatalogueItem | undefined {
  // Also check catalogue.item_id from YAML overrides
  const catItemId = metric.catalogue?.item_id;
  return catalogue.find((item) => {
    if (item.executable_metric_id === metric.metric_id) return true;
    if (item.item_id === metric.metric_id) return true;
    if (catItemId && item.item_id === catItemId) return true;
    if (metric.legacy_metric_ids?.includes(item.item_id)) return true;
    if (metric.legacy_metric_ids?.includes(item.executable_metric_id as string)) return true;
    return false;
  });
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

function main(): void {
  const dryRun = process.argv.includes('--dry-run');

  const { metrics, errors } = loadMetricDefinitions();
  if (errors.length > 0) {
    console.error('YAML load errors:');
    errors.forEach((e) => console.error('  ', e));
    process.exit(1);
  }

  const active = metrics.filter((m) => m.status === 'ACTIVE' || m.status === 'DRAFT');
  if (active.length === 0) {
    console.log('No ACTIVE/DRAFT metrics to sync.');
    process.exit(0);
  }

  const cataloguePath = path.join(getMetricLibraryDir(), 'catalogue.json');
  if (!fs.existsSync(cataloguePath)) {
    console.error(`Catalogue not found: ${cataloguePath}`);
    process.exit(1);
  }

  const catalogue: CatalogueItem[] = JSON.parse(fs.readFileSync(cataloguePath, 'utf-8'));

  // Also load visualization configs
  const vizConfigPath = path.join(getMetricLibraryDir(), 'visualization-configs.json');
  let vizConfigs: Record<string, unknown> = {};
  if (fs.existsSync(vizConfigPath)) {
    vizConfigs = JSON.parse(fs.readFileSync(vizConfigPath, 'utf-8'));
  }

  let updated = 0;
  let created = 0;
  let vizUpdated = 0;

  for (const metric of active) {
    let item = findMatchingCatalogueItem(catalogue, metric);

    // CREATE if no match found
    if (!item) {
      item = createCatalogueItem(metric);
      catalogue.push(item);
      created++;
      if (dryRun) {
        console.log(`  [would create] ${item.item_id} ← ${metric.metric_id}`);
      } else {
        console.log(`  [created] ${item.item_id} ← ${metric.metric_id}`);
      }
    } else {
      updated++;
      if (dryRun) {
        console.log(`  [would update] ${item.item_id} ← ${metric.metric_id}`);
      }
    }

    // Update level definitions and formula
    const genericFormula = metric.levels.facility?.formula_text ?? metric.description;
    const levelDefs = CATALOGUE_LEVELS.map((catLevel) => {
      const yamlLevel = (Object.entries(YAML_TO_CATALOGUE).find(([, v]) => v === catLevel)?.[0] ??
        'facility') as AggregationLevel;
      return buildLevelDefinition(metric, yamlLevel, catLevel);
    });

    item.generic_formula = genericFormula;
    item.level_definitions = levelDefs;
    item.executable_metric_id = metric.metric_id;

    // Sync ingredient_fields if empty or missing
    const existingIngredients = item.ingredient_fields as unknown[] | undefined;
    if (!existingIngredients || existingIngredients.length === 0) {
      item.ingredient_fields = buildIngredientFields(metric);
    }

    // Generate visualization config preset if YAML specifies overrides
    const vizPreset = buildVisualizationPreset(metric);
    if (vizPreset) {
      const vizKey = item.item_id;
      vizConfigs[vizKey] = vizPreset;
      vizUpdated++;
    }
  }

  if (!dryRun && (updated > 0 || created > 0)) {
    fs.writeFileSync(cataloguePath, JSON.stringify(catalogue, null, 2) + '\n', 'utf-8');
  }

  if (!dryRun && vizUpdated > 0) {
    fs.writeFileSync(vizConfigPath, JSON.stringify(vizConfigs, null, 2) + '\n', 'utf-8');
  }

  const parts = [];
  if (updated > 0) parts.push(`${updated} updated`);
  if (created > 0) parts.push(`${created} created`);
  if (vizUpdated > 0) parts.push(`${vizUpdated} viz configs`);
  console.log(`Synced ${parts.join(', ')} from ${active.length} YAML metrics${dryRun ? ' (dry-run)' : ''}.`);
}

main();
