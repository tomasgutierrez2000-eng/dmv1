/**
 * Semantic Layer — Registry
 *
 * Assembles a unified SemanticModel by reading existing data sources:
 * 1. YAML metric definitions (scripts/calc_engine/metrics/)
 * 2. Catalogue items (data/metric-library/catalogue.json)
 * 3. Domains (data/metric-library/domains.json)
 * 4. Data dictionary (facility-summary-mvp/output/data-dictionary/data-dictionary.json)
 *
 * This is a READ-ONLY facade — it does not modify any source files.
 * The model is built once and cached until invalidated.
 */

import fs from 'fs';
import path from 'path';
import { getProjectRoot, getDataDictionaryPath, getMetricLibraryDir } from '@/lib/config';
import type {
  SemanticModel,
  SemanticMetric,
  SemanticDimension,
  SemanticHierarchy,
  SemanticMeasure,
  SemanticDomain,
  GlossaryEntry,
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

// ═══════════════════════════════════════════════════════════════
// YAML types (simplified — matches scripts/calc_engine/types)
// ═══════════════════════════════════════════════════════════════

interface YamlField {
  name: string;
  role: 'MEASURE' | 'DIMENSION' | 'FILTER' | 'JOIN_KEY';
  description?: string;
}

interface YamlSourceTable {
  schema: 'l1' | 'l2' | 'l3';
  table: string;
  alias: string;
  join_type: 'BASE' | 'INNER' | 'LEFT' | 'CROSS';
  join_on?: string;
  fields: YamlField[];
}

interface YamlLevelFormula {
  aggregation_type: string;
  formula_text: string;
  formula_sql: string;
  weighting_field?: string;
}

interface YamlRegulatoryRef {
  framework: string;
  section?: string;
  schedule?: string;
  description: string;
}

interface YamlValidation {
  rule_id: string;
  type: string;
  description: string;
  severity: string;
  params?: Record<string, unknown>;
}

interface YamlCatalogue {
  item_id?: string;
  abbreviation?: string;
  insight?: string;
  rollup_strategy?: string;
  primary_value_field?: string;
}

interface YamlMetric {
  metric_id: string;
  name: string;
  version: string;
  status: string;
  domain: string;
  sub_domain: string;
  metric_class: string;
  direction: string;
  unit_type: string;
  display_format: string;
  description: string;
  regulatory_references: YamlRegulatoryRef[];
  source_tables: YamlSourceTable[];
  levels: Record<string, YamlLevelFormula>;
  depends_on: string[];
  validations: YamlValidation[];
  tags: string[];
  dashboard_pages: string[];
  catalogue?: YamlCatalogue;
}

// ═══════════════════════════════════════════════════════════════
// Data Dictionary types (minimal shape)
// ═══════════════════════════════════════════════════════════════

interface DDField {
  name: string;
  description?: string;
  data_type?: string;
  category?: string;
  pk_fk?: { is_pk?: boolean };
}

interface DDTable {
  name: string;
  layer: string;
  category?: string;
  fields: DDField[];
}

interface DataDictionary {
  L1: DDTable[];
  L2: DDTable[];
  L3?: DDTable[];
  relationships?: Array<{
    from_table: string;
    from_field: string;
    to_table: string;
    to_field: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// Cache
// ═══════════════════════════════════════════════════════════════

let _cachedModel: SemanticModel | null = null;
let _cacheBuiltAt = 0;
let _buildInProgress = false;
const CACHE_TTL_MS = 60_000; // 1 minute

/** Force-clear the cached model (e.g. after YAML or catalogue changes). */
export function invalidateSemanticCache(): void {
  _cachedModel = null;
  _cacheBuiltAt = 0;
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Get the unified semantic model. Builds from source files on first call,
 * then caches for CACHE_TTL_MS. Concurrent callers during a build
 * receive the stale cache (if any) rather than triggering a second build.
 */
export function getSemanticModel(): SemanticModel {
  const now = Date.now();
  if (_cachedModel && now - _cacheBuiltAt < CACHE_TTL_MS) {
    return _cachedModel;
  }

  // If another call is already rebuilding, return stale cache if available
  if (_buildInProgress && _cachedModel) {
    return _cachedModel;
  }

  _buildInProgress = true;
  try {
    _cachedModel = buildSemanticModel();
    _cacheBuiltAt = Date.now();
    return _cachedModel;
  } finally {
    _buildInProgress = false;
  }
}

// ═══════════════════════════════════════════════════════════════
// Builder
// ═══════════════════════════════════════════════════════════════

function buildSemanticModel(): SemanticModel {
  // Load raw sources
  const yamlMetrics = loadYamlMetrics();
  const catalogueItems = loadCatalogue();
  const domains = loadDomains();
  const dd = loadDataDictionary();

  // Index catalogue by item_id and executable_metric_id
  const catalogueById = new Map<string, CatalogueItem>();
  const catalogueByExecId = new Map<string, CatalogueItem>();
  for (const item of catalogueItems) {
    catalogueById.set(item.item_id, item);
    if (item.executable_metric_id) {
      catalogueByExecId.set(item.executable_metric_id, item);
    }
  }

  // Build semantic metrics from YAML (primary) + catalogue enrichment
  const metrics = yamlMetrics.map(yaml => buildSemanticMetric(yaml, catalogueById, catalogueByExecId));

  // Build dimensions and hierarchy from the known org structure
  const { dimensions, hierarchies } = buildDimensionsAndHierarchies();

  // Build measures from metric source fields
  const measures = buildMeasures(metrics);

  // Build semantic domains
  const semanticDomains = buildDomains(domains, metrics);

  // Build glossary from data dictionary + metric cross-references
  const glossary = buildGlossary(dd, metrics);

  return {
    metrics,
    dimensions,
    hierarchies,
    measures,
    domains: semanticDomains,
    glossary,
    meta: {
      version: '1.0.0',
      built_at: new Date().toISOString(),
      source_counts: {
        yaml_metrics: yamlMetrics.length,
        catalogue_items: catalogueItems.length,
        l3_metrics: 0, // not loaded separately — YAML is primary
        data_dictionary_tables: dd ? (dd.L1.length + dd.L2.length + (dd.L3?.length ?? 0)) : 0,
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Source Loaders
// ═══════════════════════════════════════════════════════════════

function loadYamlMetrics(): YamlMetric[] {
  const metricsDir = path.join(getProjectRoot(), 'scripts', 'calc_engine', 'metrics');
  if (!fs.existsSync(metricsDir)) return [];

  let parseYaml: ((s: string) => unknown) | null = null;
  try {
    parseYaml = require('yaml').parse; // eslint-disable-line
  } catch {
    return [];
  }

  const results: YamlMetric[] = [];
  const scanDir = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full);
      } else if (entry.name.endsWith('.yaml') && !entry.name.startsWith('_')) {
        try {
          const raw = fs.readFileSync(full, 'utf-8');
          const parsed = parseYaml!(raw) as YamlMetric;
          if (parsed?.metric_id && parsed?.levels) {
            results.push(parsed);
          } else {
            const missing = [
              !parsed?.metric_id && 'metric_id',
              !parsed?.levels && 'levels',
            ].filter(Boolean).join(', ');
            console.warn(`[semantic-layer] Skipping ${entry.name}: missing required fields (${missing})`);
          }
        } catch (err) {
          console.warn(`[semantic-layer] Failed to parse ${entry.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  };
  scanDir(metricsDir);
  results.sort((a, b) => a.metric_id.localeCompare(b.metric_id));
  return results;
}

function loadCatalogue(): CatalogueItem[] {
  try {
    const p = path.join(getMetricLibraryDir(), 'catalogue.json');
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as CatalogueItem[];
  } catch {
    return [];
  }
}

interface RawDomain {
  domain_id: string;
  domain_name: string;
  description: string;
  icon: string;
  color: string;
  regulatory_relevance?: string[];
  primary_stakeholders?: string[];
}

function loadDomains(): RawDomain[] {
  try {
    const p = path.join(getMetricLibraryDir(), 'domains.json');
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as RawDomain[];
  } catch {
    return [];
  }
}

function loadDataDictionary(): DataDictionary | null {
  try {
    const p = getDataDictionaryPath();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as DataDictionary;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Metric Builder
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

function buildSemanticMetric(
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

/** Extract ingredient fields from YAML source_tables (MEASURE and DIMENSION fields). */
function extractIngredientFields(sourceTables: YamlSourceTable[]): IngredientFieldRef[] {
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
function deriveAggregationRules(levelFormulas: LevelFormula[]): AggregationRule[] {
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

// ═══════════════════════════════════════════════════════════════
// Dimensions & Hierarchies
// ═══════════════════════════════════════════════════════════════

function buildDimensionsAndHierarchies(): {
  dimensions: SemanticDimension[];
  hierarchies: SemanticHierarchy[];
} {
  const dimensions: SemanticDimension[] = [
    {
      id: 'facility',
      name: 'Facility',
      description: 'Individual loan facility — the leaf level of the organizational hierarchy',
      source_table: 'l2.facility_master',
      source_field: 'facility_id',
      label_field: 'facility_name',
      hierarchy_id: 'org_hierarchy',
      hierarchy_depth: 0,
    },
    {
      id: 'counterparty',
      name: 'Counterparty',
      description: 'Legal entity or borrower that facilities are extended to',
      source_table: 'l1.counterparty',
      source_field: 'counterparty_id',
      label_field: 'legal_name',
      hierarchy_id: 'org_hierarchy',
      hierarchy_depth: 1,
    },
    {
      id: 'desk',
      name: 'Desk (L3)',
      description: 'Trading/origination desk — L3 organizational unit in enterprise_business_taxonomy',
      source_table: 'l1.enterprise_business_taxonomy',
      source_field: 'managed_segment_id',
      label_field: 'managed_segment_name',
      hierarchy_id: 'org_hierarchy',
      hierarchy_depth: 2,
    },
    {
      id: 'portfolio',
      name: 'Portfolio (L2)',
      description: 'Portfolio grouping — L2 organizational unit in enterprise_business_taxonomy',
      source_table: 'l1.enterprise_business_taxonomy',
      source_field: 'managed_segment_id',
      label_field: 'managed_segment_name',
      hierarchy_id: 'org_hierarchy',
      hierarchy_depth: 3,
    },
    {
      id: 'lob',
      name: 'Business Segment (L1)',
      description: 'Top-level line of business / business segment — L1 organizational unit',
      source_table: 'l1.enterprise_business_taxonomy',
      source_field: 'managed_segment_id',
      label_field: 'managed_segment_name',
      hierarchy_id: 'org_hierarchy',
      hierarchy_depth: 4,
    },
  ];

  const hierarchies: SemanticHierarchy[] = [
    {
      id: 'org_hierarchy',
      name: 'Organizational Hierarchy',
      description: 'Facility → Counterparty → Desk (L3) → Portfolio (L2) → Business Segment (L1)',
      levels: [
        { dimension_id: 'facility', depth: 0 },
        { dimension_id: 'counterparty', depth: 1 },
        { dimension_id: 'desk', depth: 2, filter: "tree_level = 'L3'" },
        { dimension_id: 'portfolio', depth: 3, filter: "tree_level = 'L2'" },
        { dimension_id: 'lob', depth: 4, filter: "tree_level = 'L1'" },
      ],
      source_table: 'l1.enterprise_business_taxonomy',
      parent_field: 'parent_segment_id',
    },
  ];

  return { dimensions, hierarchies };
}

// ═══════════════════════════════════════════════════════════════
// Measures
// ═══════════════════════════════════════════════════════════════

function buildMeasures(metrics: SemanticMetric[]): SemanticMeasure[] {
  const measureMap = new Map<string, SemanticMeasure>();

  // Extract measures from metric ingredient fields
  for (const metric of metrics) {
    for (const field of metric.ingredient_fields) {
      if (field.role && field.role !== 'MEASURE') continue;
      const key = `${field.layer.toLowerCase()}.${field.table}.${field.field}`;
      if (measureMap.has(key)) {
        // Add this metric to used_by
        const existing = measureMap.get(key)!;
        if (!existing.used_by_metrics?.includes(metric.id)) {
          existing.used_by_metrics = existing.used_by_metrics ?? [];
          existing.used_by_metrics.push(metric.id);
        }
        continue;
      }
      measureMap.set(key, {
        id: key,
        name: fieldToName(field.field),
        description: field.description,
        source_table: `${field.layer.toLowerCase()}.${field.table}`,
        source_field: field.field,
        data_type: inferDataType(field.field, field.data_type),
        default_aggregation: inferAggregation(field.field),
        unit: inferUnit(field.field),
        used_by_metrics: [metric.id],
      });
    }

    // Also extract MEASURE-role fields from source_tables
    for (const st of metric.source_tables) {
      for (const f of st.fields) {
        if (f.role !== 'MEASURE') continue;
        const key = `${st.schema}.${st.table}.${f.name}`;
        if (measureMap.has(key)) {
          const existing = measureMap.get(key)!;
          if (!existing.used_by_metrics?.includes(metric.id)) {
            existing.used_by_metrics = existing.used_by_metrics ?? [];
            existing.used_by_metrics.push(metric.id);
          }
          continue;
        }
        measureMap.set(key, {
          id: key,
          name: fieldToName(f.name),
          description: f.description,
          source_table: `${st.schema}.${st.table}`,
          source_field: f.name,
          data_type: inferDataType(f.name),
          default_aggregation: inferAggregation(f.name),
          unit: inferUnit(f.name),
          used_by_metrics: [metric.id],
        });
      }
    }
  }

  return Array.from(measureMap.values()).sort((a, b) => a.id.localeCompare(b.id));
}

// ═══════════════════════════════════════════════════════════════
// Domains
// ═══════════════════════════════════════════════════════════════

function buildDomains(rawDomains: RawDomain[], metrics: SemanticMetric[]): SemanticDomain[] {
  const countByDomain = new Map<string, number>();
  for (const m of metrics) {
    countByDomain.set(m.domain_id, (countByDomain.get(m.domain_id) ?? 0) + 1);
  }

  return rawDomains.map(d => ({
    id: d.domain_id,
    name: d.domain_name,
    description: d.description,
    icon: d.icon,
    color: d.color,
    regulatory_relevance: d.regulatory_relevance,
    primary_stakeholders: d.primary_stakeholders,
    metric_count: countByDomain.get(d.domain_id) ?? 0,
  }));
}

// ═══════════════════════════════════════════════════════════════
// Glossary
// ═══════════════════════════════════════════════════════════════

function buildGlossary(dd: DataDictionary | null, metrics: SemanticMetric[]): GlossaryEntry[] {
  if (!dd) return [];

  // Build reverse index: field key → metric IDs + regulatory refs + business concepts
  const fieldToMetrics = new Map<string, Set<string>>();
  const fieldToRefs = new Map<string, RegulatoryRef[]>();
  const fieldToRole = new Map<string, string>();
  const fieldToConcepts = new Map<string, Set<string>>();

  for (const metric of metrics) {
    for (const field of metric.ingredient_fields) {
      const key = `${field.layer.toLowerCase()}.${field.table}.${field.field}`;
      if (!fieldToMetrics.has(key)) fieldToMetrics.set(key, new Set());
      fieldToMetrics.get(key)!.add(metric.id);
      if (field.role) fieldToRole.set(key, field.role);
      // Track business concepts (metric names) this field feeds into
      if (!fieldToConcepts.has(key)) fieldToConcepts.set(key, new Set());
      fieldToConcepts.get(key)!.add(metric.name);
      // Accumulate regulatory refs from ingredient_fields path too
      if (metric.regulatory_refs.length) {
        const existing = fieldToRefs.get(key) ?? [];
        fieldToRefs.set(key, [...existing, ...metric.regulatory_refs]);
      }
    }
    // Also index source_tables fields
    for (const st of metric.source_tables) {
      for (const f of st.fields) {
        const key = `${st.schema}.${st.table}.${f.name}`;
        if (!fieldToMetrics.has(key)) fieldToMetrics.set(key, new Set());
        fieldToMetrics.get(key)!.add(metric.id);
        if (f.role) fieldToRole.set(key, f.role);
        // Track business concepts via source_tables path too
        if (!fieldToConcepts.has(key)) fieldToConcepts.set(key, new Set());
        fieldToConcepts.get(key)!.add(metric.name);
        // Accumulate regulatory refs from ALL metrics that use this field
        if (metric.regulatory_refs.length) {
          const existing = fieldToRefs.get(key) ?? [];
          fieldToRefs.set(key, [...existing, ...metric.regulatory_refs]);
        }
      }
    }
  }

  const entries: GlossaryEntry[] = [];
  const processLayer = (tables: DDTable[], layer: 'L1' | 'L2' | 'L3') => {
    for (const table of tables) {
      for (const field of table.fields) {
        const key = `${layer.toLowerCase()}.${table.name}.${field.name}`;
        const metricIds = fieldToMetrics.get(key);
        const role = fieldToRole.get(key);
        const concepts = fieldToConcepts.get(key);

        entries.push({
          field: field.name,
          table: table.name,
          layer,
          description: field.description ?? '',
          data_type: field.data_type,
          semantic_type: inferSemanticType(field.name, role, field.pk_fk?.is_pk),
          business_concept: concepts?.size ? Array.from(concepts).join(', ') : undefined,
          used_by_metrics: metricIds ? Array.from(metricIds) : [],
          regulatory_refs: deduplicateRefs(fieldToRefs.get(key) ?? []),
          default_aggregation: inferAggregation(field.name),
        });
      }
    }
  };

  processLayer(dd.L1, 'L1');
  processLayer(dd.L2, 'L2');
  if (dd.L3) processLayer(dd.L3, 'L3');

  return entries;
}

// ═══════════════════════════════════════════════════════════════
// Inference Helpers
// ═══════════════════════════════════════════════════════════════

function fieldToName(field: string): string {
  return field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function inferDataType(field: string, explicitType?: string): SemanticDataType {
  if (explicitType) {
    const lower = explicitType.toLowerCase();
    if (lower.includes('numeric') || lower.includes('decimal')) {
      if (field.endsWith('_pct')) return 'percentage';
      if (field.endsWith('_bps')) return 'bps';
      if (field.endsWith('_amt')) return 'currency';
      return 'ratio';
    }
    if (lower.includes('integer') || lower.includes('bigint')) return 'count';
  }
  if (field.endsWith('_amt')) return 'currency';
  if (field.endsWith('_pct')) return 'percentage';
  if (field.endsWith('_bps')) return 'bps';
  if (field.endsWith('_count') || field.startsWith('number_of_')) return 'count';
  if (field.endsWith('_value')) return 'ratio';
  return 'count';
}

function inferAggregation(field: string): AggregationType {
  if (field.endsWith('_amt') || field.endsWith('_count') || field.startsWith('number_of_')) return 'SUM';
  if (field.endsWith('_pct') || field.endsWith('_bps')) return 'WEIGHTED_AVG';
  return 'SUM';
}

function inferUnit(field: string): string | undefined {
  if (field.endsWith('_amt')) return 'USD';
  if (field.endsWith('_pct')) return '%';
  if (field.endsWith('_bps')) return 'bps';
  return undefined;
}

function inferSemanticType(
  field: string,
  role?: string,
  isPk?: boolean,
): GlossaryEntry['semantic_type'] {
  if (isPk || field.endsWith('_id')) return 'key';
  if (role === 'MEASURE') return 'measure';
  if (role === 'DIMENSION') return 'dimension';
  if (role === 'FILTER') return 'filter';
  if (field.endsWith('_amt') || field.endsWith('_pct') || field.endsWith('_bps') || field.endsWith('_value') || field.endsWith('_count')) return 'measure';
  if (field.endsWith('_code') || field.endsWith('_type') || field.endsWith('_name')) return 'dimension';
  if (field.endsWith('_flag') || field.endsWith('_date') || field.endsWith('_ts')) return 'filter';
  return 'attribute';
}

function deduplicateRefs(refs: RegulatoryRef[]): RegulatoryRef[] {
  const seen = new Set<string>();
  return refs.filter(r => {
    const key = `${r.framework}|${r.section ?? ''}|${r.schedule ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
