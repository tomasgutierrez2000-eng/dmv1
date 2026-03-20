/**
 * Semantic Layer — Metric Builder
 *
 * Transforms a single YAML metric + optional catalogue enrichment
 * into a unified SemanticMetric.
 */

import type {
  SemanticMetric,
  AggregationRule,
  AggregationType,
  LevelFormula,
  IngredientFieldRef,
  RegulatoryRef,
  SemanticValidationRule,
  SourceTableRef,
  SemanticDataType,
} from './types';
import type { CatalogueItem } from '@/lib/metric-library/types';
import type { YamlMetric, YamlSourceTable } from './loaders';

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const UNIT_TYPE_MAP: Record<string, SemanticDataType> = {
  CURRENCY: 'currency',
  PERCENTAGE: 'percentage',
  RATIO: 'ratio',
  COUNT: 'count',
  RATE: 'rate',
  BPS: 'bps',
  DAYS: 'days',
  INDEX: 'index',
  ORDINAL: 'ordinal',
};

/** Map YAML level names to canonical hierarchy level names. */
const LEVEL_NAME_MAP: Record<string, string> = {
  facility: 'facility',
  counterparty: 'counterparty',
  desk: 'desk',
  portfolio: 'portfolio',
  business_segment: 'lob',
};

// ═══════════════════════════════════════════════════════════════
// Public
// ═══════════════════════════════════════════════════════════════

export function buildSemanticMetric(
  yaml: YamlMetric,
  catalogueById: Map<string, CatalogueItem>,
  catalogueByExecId: Map<string, CatalogueItem>,
): SemanticMetric {
  // Find matching catalogue item
  const catIdFromYaml = yaml.catalogue?.item_id;
  const cat = catIdFromYaml
    ? catalogueById.get(catIdFromYaml)
    : catalogueByExecId.get(yaml.metric_id);

  // Build level formulas
  const levelFormulas: LevelFormula[] = Object.entries(yaml.levels).map(([level, lf]) => ({
    level: LEVEL_NAME_MAP[level] ?? level,
    aggregation_type: lf.aggregation_type as AggregationType,
    formula_text: lf.formula_text,
    formula_sql: lf.formula_sql,
    weighting_field: lf.weighting_field,
  }));

  // Derive aggregation rules from level formulas
  const aggregationRules = deriveAggregationRules(levelFormulas);

  // Build source table refs
  const sourceTables: SourceTableRef[] = (yaml.source_tables ?? []).map(st => ({
    schema: st.schema,
    table: st.table,
    alias: st.alias,
    join_type: st.join_type,
    join_on: st.join_on,
    fields: st.fields.map(f => ({
      name: f.name,
      role: f.role,
      description: f.description,
    })),
  }));

  // Build ingredient fields — prefer catalogue if available, else derive from source_tables
  // Deduplicate by layer.table.field key
  const ingredientFields: IngredientFieldRef[] = (() => {
    const raw = cat?.ingredient_fields?.length
      ? cat.ingredient_fields.map(f => ({
          layer: f.layer,
          table: f.table,
          field: f.field,
          description: f.description,
          data_type: f.data_type,
        }))
      : extractIngredientFields(yaml.source_tables);
    const seen = new Set<string>();
    return raw.filter(f => {
      const key = `${f.layer}.${f.table}.${f.field}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  // Build regulatory refs
  const regulatoryRefs: RegulatoryRef[] = (yaml.regulatory_references ?? []).map(r => ({
    framework: r.framework,
    section: r.section,
    schedule: r.schedule,
    description: r.description,
  }));

  // Build validations
  const validations: SemanticValidationRule[] = (yaml.validations ?? []).map(v => ({
    rule_id: v.rule_id,
    type: v.type as SemanticValidationRule['type'],
    description: v.description,
    severity: v.severity as SemanticValidationRule['severity'],
    params: v.params,
  }));

  return {
    id: yaml.metric_id,
    catalogue_id: cat?.item_id ?? catIdFromYaml,
    name: cat?.item_name ?? yaml.name,
    abbreviation: cat?.abbreviation ?? yaml.catalogue?.abbreviation,
    description: yaml.description,
    definition: cat?.definition,
    insight: cat?.insight ?? yaml.catalogue?.insight,
    domain_id: yaml.domain,
    sub_domain: yaml.sub_domain,
    metric_class: yaml.metric_class as SemanticMetric['metric_class'],
    direction: yaml.direction as SemanticMetric['direction'],
    unit_type: UNIT_TYPE_MAP[yaml.unit_type] ?? 'count',
    display_format: yaml.display_format,
    status: (yaml.status === 'ACTIVE' ? 'ACTIVE' : yaml.status === 'DEPRECATED' ? 'DEPRECATED' : 'DRAFT') as SemanticMetric['status'],
    source_tables: sourceTables,
    ingredient_fields: ingredientFields,
    depends_on: yaml.depends_on ?? [],
    level_formulas: levelFormulas,
    aggregation_rules: aggregationRules,
    rollup_strategy: yaml.catalogue?.rollup_strategy,
    regulatory_refs: regulatoryRefs,
    validations,
    tags: yaml.tags ?? [],
    formula_template: cat?.generic_formula,
    primary_value_field: yaml.catalogue?.primary_value_field,
  };
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/** Extract ingredient fields from YAML source_tables (MEASURE and DIMENSION fields). */
export function extractIngredientFields(sourceTables: YamlSourceTable[]): IngredientFieldRef[] {
  const fields: IngredientFieldRef[] = [];
  const seen = new Set<string>();
  for (const st of sourceTables) {
    for (const f of st.fields) {
      if (f.role === 'MEASURE' || f.role === 'DIMENSION') {
        const key = `${st.schema}.${st.table}.${f.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          fields.push({
            layer: st.schema.toUpperCase() as IngredientFieldRef['layer'],
            table: st.table,
            field: f.name,
            description: f.description ?? f.name,
            role: f.role,
          });
        }
      }
    }
  }
  return fields;
}

/** Derive abstract aggregation rules from level formulas (consecutive pairs). */
export function deriveAggregationRules(levelFormulas: LevelFormula[]): AggregationRule[] {
  const canonicalOrder = ['facility', 'counterparty', 'desk', 'portfolio', 'lob'];
  const sorted = [...levelFormulas].sort(
    (a, b) => canonicalOrder.indexOf(a.level) - canonicalOrder.indexOf(b.level)
  );

  const rules: AggregationRule[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i];
    const to = sorted[i + 1];
    rules.push({
      from_level: from.level,
      to_level: to.level,
      type: to.aggregation_type,
      weight_measure: to.weighting_field,
      description: to.formula_text?.trim().split('\n')[0],
    });
  }
  return rules;
}
