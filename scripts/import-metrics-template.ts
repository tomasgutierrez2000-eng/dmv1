/**
 * Import metrics from the bulk upload template (metrics-upload-template.xlsx).
 *
 * Reads:
 *   - Metrics           → parent-metrics.json, variants.json, catalogue.json
 *   - IngredientFields   → catalogue.json (ingredient_fields)
 *   - DimensionSources   → catalogue.json (level_definitions[].source_references)
 *
 * Run:
 *   npx tsx scripts/import-metrics-template.ts [path-to-file]
 *   Default: metrics-upload-template.xlsx in project root.
 *
 * Behaviour:
 *   - Upserts by metric_id: existing records are updated, new ones are created.
 *   - Validates required fields and enum values.
 *   - Prints summary of created/updated/errors at the end.
 */

import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import {
  getParentMetrics,
  saveParentMetrics,
  getVariants as getAllVariants,
  saveVariants,
  getCatalogueItems,
  saveCatalogueItems,
} from '../lib/metric-library/store';
import type {
  ParentMetric,
  MetricVariant,
  CatalogueItem,
  IngredientField,
  LevelDefinition,
  MetricClass,
  UnitType,
  Direction,
  SourcingType,
  RollupLevelKey,
} from '../lib/metric-library/types';

// ── Enums ───────────────────────────────────────────────────────────────

const METRIC_CLASSES: MetricClass[] = ['SOURCED', 'CALCULATED', 'HYBRID'];
const UNIT_TYPES: UnitType[] = ['RATIO', 'PERCENTAGE', 'CURRENCY', 'COUNT', 'RATE', 'ORDINAL', 'DAYS', 'INDEX'];
const DIRECTIONS: Direction[] = ['HIGHER_BETTER', 'LOWER_BETTER', 'NEUTRAL'];
const SOURCING_TYPES: SourcingType[] = ['Raw', 'Calc', 'Agg', 'Avg'];
const WEIGHTING_VALUES = ['BY_EAD', 'BY_OUTSTANDING', 'BY_COMMITTED'] as const;
const DIMENSIONS: RollupLevelKey[] = ['facility', 'counterparty', 'desk', 'portfolio', 'lob'];

function pickEnum<T extends string>(value: string | undefined, allowed: readonly T[] | T[], fallback: T): T {
  if (!value) return fallback;
  const v = value.trim().toUpperCase().replace(/\s+/g, '_');
  if ((allowed as string[]).includes(v)) return v as T;
  // Try case-insensitive match for sourcing types (Raw, Calc, etc.)
  const match = (allowed as string[]).find((a) => a.toUpperCase() === v);
  if (match) return match as T;
  return fallback;
}

function pickSourcingType(value: string | undefined): SourcingType {
  if (!value) return 'Calc';
  const v = value.trim();
  const match = SOURCING_TYPES.find((s) => s.toLowerCase() === v.toLowerCase());
  return match ?? 'Calc';
}

function parseCommaList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function bool(v: unknown): boolean {
  const s = str(v).toUpperCase();
  return s === 'Y' || s === 'YES' || s === 'TRUE' || s === '1';
}

// ── Load workbook ───────────────────────────────────────────────────────

const excelPath =
  process.argv[2] || path.join(process.cwd(), 'metrics-upload-template.xlsx');

if (!fs.existsSync(excelPath)) {
  console.error('File not found:', excelPath);
  process.exit(1);
}

console.log('Reading:', excelPath);
const wb = XLSX.read(fs.readFileSync(excelPath), { type: 'buffer' });

function getSheet(name: string): Record<string, unknown>[] | null {
  const exact = wb.SheetNames.find((s) => s === name);
  const sheetName = exact ?? wb.SheetNames.find((s) => s.toLowerCase() === name.toLowerCase());
  if (!sheetName) return null;
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return null;
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
}

// ── Parse IngredientFields ──────────────────────────────────────────────

const ingredientRows = getSheet('IngredientFields') ?? [];
const ingredientsByMetric = new Map<string, IngredientField[]>();

for (const row of ingredientRows) {
  const metricId = str(row['metric_id']);
  if (!metricId) continue;
  const layer = str(row['layer']);
  if (layer !== 'L1' && layer !== 'L2' && layer !== 'L3') continue;
  const table = str(row['table']);
  const field = str(row['field']);
  if (!table || !field) continue;

  const ingredient: IngredientField = {
    layer: layer as 'L1' | 'L2' | 'L3',
    table,
    field,
    description: str(row['description']),
    data_type: str(row['data_type']) || undefined,
    sample_value: str(row['sample_value']) || str(row['sampleValue']) || undefined,
  };

  const list = ingredientsByMetric.get(metricId) ?? [];
  list.push(ingredient);
  ingredientsByMetric.set(metricId, list);
}

console.log(`IngredientFields: ${ingredientRows.length} rows for ${ingredientsByMetric.size} metrics`);

// ── Parse DimensionSources ──────────────────────────────────────────────

type DimSrcKey = `${string}:${RollupLevelKey}`;
const dimSourcesByMetricDim = new Map<DimSrcKey, IngredientField[]>();

const dimSrcRows = getSheet('DimensionSources') ?? [];
for (const row of dimSrcRows) {
  const metricId = str(row['metric_id']);
  const dim = str(row['dimension']).toLowerCase() as RollupLevelKey;
  if (!metricId || !DIMENSIONS.includes(dim)) continue;
  const layer = str(row['layer']);
  if (layer !== 'L1' && layer !== 'L2' && layer !== 'L3') continue;
  const table = str(row['table']);
  const field = str(row['field']);
  if (!table || !field) continue;

  const key: DimSrcKey = `${metricId}:${dim}`;
  const list = dimSourcesByMetricDim.get(key) ?? [];
  list.push({
    layer: layer as 'L1' | 'L2' | 'L3',
    table,
    field,
    description: str(row['description']),
  });
  dimSourcesByMetricDim.set(key, list);
}

console.log(`DimensionSources: ${dimSrcRows.length} rows for ${dimSourcesByMetricDim.size} metric-dimension combos`);

// ── Parse Metrics sheet ─────────────────────────────────────────────────

const metricsRows = getSheet('Metrics') ?? [];
if (metricsRows.length === 0) {
  console.error('No "Metrics" sheet found or sheet is empty.');
  process.exit(1);
}

const errors: { row: number; message: string }[] = [];
const created = { parents: [] as string[], variants: [] as string[], catalogue: [] as string[] };
const updated = { parents: [] as string[], variants: [] as string[], catalogue: [] as string[] };

// Load existing data
const existingParents = getParentMetrics();
const parentMap = new Map(existingParents.map((p) => [p.metric_id, p]));
const existingVariants = getAllVariants();
const variantMap = new Map(existingVariants.map((v) => [v.variant_id, v]));
const existingCatalogue = getCatalogueItems();
const catalogueMap = new Map(existingCatalogue.map((c) => [c.item_id, c]));

let rowNum = 0;
for (const row of metricsRows) {
  rowNum++;

  const metric_id = str(row['metric_id']);
  const metric_name = str(row['metric_name']);
  const definition = str(row['definition']);
  const generic_formula = str(row['generic_formula']);

  // Skip blank rows
  if (!metric_id && !metric_name) continue;

  // Validate required
  if (!metric_id) { errors.push({ row: rowNum, message: 'metric_id is required' }); continue; }
  if (!metric_name) { errors.push({ row: rowNum, message: `${metric_id}: metric_name is required` }); continue; }
  if (!definition) { errors.push({ row: rowNum, message: `${metric_id}: definition is required` }); continue; }
  if (!generic_formula) { errors.push({ row: rowNum, message: `${metric_id}: generic_formula is required` }); continue; }

  const metric_class = pickEnum(str(row['metric_class']), METRIC_CLASSES, 'CALCULATED');
  const unit_type = pickEnum(str(row['unit_type']), UNIT_TYPES, 'RATIO');
  const direction = pickEnum(str(row['direction']), DIRECTIONS, 'NEUTRAL');
  const domain_ids = parseCommaList(str(row['domain_ids']));
  const rollup_philosophy = str(row['rollup_philosophy']) || 'Not specified';
  const weighting_basis = str(row['weighting_basis']);
  const regulatory_references = parseCommaList(str(row['regulatory_references']));
  const display_format = str(row['display_format']);

  // ── Build per-dimension data ────────────────────────────────────────

  const rollup_logic: Record<string, string | undefined> = {};
  const level_definitions: LevelDefinition[] = [];

  for (const dim of DIMENSIONS) {
    const in_record = bool(row[`${dim}_in_record`]);
    const sourcing_type = pickSourcingType(str(row[`${dim}_sourcing_type`]));
    const level_logic = str(row[`${dim}_level_logic`]);
    const display_name = str(row[`${dim}_display_name`]);

    // Rollup logic for variant
    rollup_logic[dim] = level_logic || undefined;

    // Level definition for catalogue
    if (in_record || level_logic) {
      const dimSrcKey: DimSrcKey = `${metric_id}:${dim}`;
      level_definitions.push({
        level: dim,
        dashboard_display_name: display_name || `${dim.charAt(0).toUpperCase() + dim.slice(1)} ${metric_name}`,
        in_record,
        sourcing_type,
        level_logic,
        source_references: dimSourcesByMetricDim.get(dimSrcKey) ?? [],
      });
    }
  }

  // ── 1. Upsert ParentMetric ──────────────────────────────────────────

  const parent: ParentMetric = {
    metric_id,
    metric_name,
    definition,
    generic_formula,
    metric_class,
    unit_type,
    direction,
    rollup_philosophy,
    domain_ids: domain_ids.length > 0 ? domain_ids : ['CR'],
    regulatory_references: regulatory_references.length > 0 ? regulatory_references : undefined,
  };

  const existingParent = parentMap.get(metric_id);
  parentMap.set(metric_id, parent);
  if (existingParent) updated.parents.push(metric_id);
  else created.parents.push(metric_id);

  // ── 2. Upsert Variant ──────────────────────────────────────────────

  const variant: MetricVariant = {
    variant_id: metric_id,
    variant_name: metric_name,
    parent_metric_id: metric_id,
    variant_type: metric_class === 'SOURCED' ? 'SOURCED' : 'CALCULATED',
    status: 'ACTIVE',
    formula_display: generic_formula,
    rollup_logic,
    weighting_basis: weighting_basis
      ? (pickEnum(weighting_basis, WEIGHTING_VALUES, 'BY_EAD') as MetricVariant['weighting_basis'])
      : undefined,
  };

  const existingVariant = variantMap.get(metric_id);
  variantMap.set(metric_id, existingVariant ? { ...existingVariant, ...variant } : variant);
  if (existingVariant) updated.variants.push(metric_id);
  else created.variants.push(metric_id);

  // ── 3. Upsert CatalogueItem ────────────────────────────────────────

  const existingCat = catalogueMap.get(metric_id);
  const catalogueItem: CatalogueItem = {
    item_id: metric_id,
    item_name: metric_name,
    abbreviation: metric_id,
    kind: 'METRIC',
    definition,
    generic_formula,
    data_type: 'Decimal',
    unit_type,
    direction,
    metric_class,
    domain_ids: domain_ids.length > 0 ? domain_ids : ['CR'],
    regulatory_references: regulatory_references.length > 0 ? regulatory_references : undefined,
    insight: definition.split('.')[0] || definition,
    ingredient_fields: ingredientsByMetric.get(metric_id) ?? existingCat?.ingredient_fields ?? [],
    level_definitions: level_definitions.length > 0 ? level_definitions : existingCat?.level_definitions ?? [],
    number_of_instances: level_definitions.filter((l) => l.in_record).length,
    directly_displayed: true,
    status: 'ACTIVE',
    ...(existingCat?.demo_data ? { demo_data: existingCat.demo_data } : {}),
  };

  catalogueMap.set(metric_id, catalogueItem);
  if (existingCat) updated.catalogue.push(metric_id);
  else created.catalogue.push(metric_id);
}

// ── Write all stores ────────────────────────────────────────────────────

saveParentMetrics(Array.from(parentMap.values()));
saveVariants(Array.from(variantMap.values()));
saveCatalogueItems(Array.from(catalogueMap.values()));

// ── Summary ─────────────────────────────────────────────────────────────

console.log('\n═══ Import Summary ═══');
console.log(`parent-metrics.json : ${created.parents.length} created, ${updated.parents.length} updated  (total: ${parentMap.size})`);
console.log(`variants.json       : ${created.variants.length} created, ${updated.variants.length} updated  (total: ${variantMap.size})`);
console.log(`catalogue.json      : ${created.catalogue.length} created, ${updated.catalogue.length} updated  (total: ${catalogueMap.size})`);

if (created.parents.length > 0) {
  console.log(`  New metrics: ${created.parents.join(', ')}`);
}

if (errors.length > 0) {
  console.warn(`\n${errors.length} error(s):`);
  errors.forEach((e) => console.warn(`  Row ${e.row}: ${e.message}`));
}

console.log('\nDone.');
