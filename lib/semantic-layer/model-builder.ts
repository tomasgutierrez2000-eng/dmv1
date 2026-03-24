/**
 * Semantic Layer — Model Builder
 *
 * Builds the non-metric portions of the SemanticModel:
 * dimensions, hierarchies, measures, domains, glossary.
 * Also contains shared inference helpers for field classification.
 */

import type {
  SemanticMetric,
  SemanticDimension,
  SemanticHierarchy,
  SemanticMeasure,
  SemanticDomain,
  GlossaryEntry,
  AggregationType,
  RegulatoryRef,
  SemanticDataType,
} from './types';
import type { DataDictionary, RawDomain } from './loaders';

// ═══════════════════════════════════════════════════════════════
// Dimensions & Hierarchies
// ═══════════════════════════════════════════════════════════════

export function buildDimensionsAndHierarchies(): {
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
      source_table: 'l2.counterparty',
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

export function buildMeasures(metrics: SemanticMetric[]): SemanticMeasure[] {
  const measureMap = new Map<string, SemanticMeasure>();

  for (const metric of metrics) {
    // Extract measures from ingredient fields
    for (const field of metric.ingredient_fields) {
      if (field.role && field.role !== 'MEASURE') continue;
      const key = `${field.layer.toLowerCase()}.${field.table}.${field.field}`;
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

export function buildDomains(rawDomains: RawDomain[], metrics: SemanticMetric[]): SemanticDomain[] {
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

export function buildGlossary(dd: DataDictionary | null, metrics: SemanticMetric[]): GlossaryEntry[] {
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
      if (!fieldToConcepts.has(key)) fieldToConcepts.set(key, new Set());
      fieldToConcepts.get(key)!.add(metric.name);
      if (metric.regulatory_refs.length) {
        const existing = fieldToRefs.get(key) ?? [];
        fieldToRefs.set(key, [...existing, ...metric.regulatory_refs]);
      }
    }
    for (const st of metric.source_tables) {
      for (const f of st.fields) {
        const key = `${st.schema}.${st.table}.${f.name}`;
        if (!fieldToMetrics.has(key)) fieldToMetrics.set(key, new Set());
        fieldToMetrics.get(key)!.add(metric.id);
        if (f.role) fieldToRole.set(key, f.role);
        if (!fieldToConcepts.has(key)) fieldToConcepts.set(key, new Set());
        fieldToConcepts.get(key)!.add(metric.name);
        if (metric.regulatory_refs.length) {
          const existing = fieldToRefs.get(key) ?? [];
          fieldToRefs.set(key, [...existing, ...metric.regulatory_refs]);
        }
      }
    }
  }

  const entries: GlossaryEntry[] = [];
  const processLayer = (tables: DataDictionary['L1'], layer: 'L1' | 'L2' | 'L3') => {
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
// Inference Helpers (exported for testing and reuse)
// ═══════════════════════════════════════════════════════════════

export function fieldToName(field: string): string {
  return field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function inferDataType(field: string, explicitType?: string): SemanticDataType {
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

export function inferAggregation(field: string): AggregationType {
  if (field.endsWith('_amt') || field.endsWith('_count') || field.startsWith('number_of_')) return 'SUM';
  if (field.endsWith('_pct') || field.endsWith('_bps')) return 'WEIGHTED_AVG';
  return 'SUM';
}

export function inferUnit(field: string): string | undefined {
  if (field.endsWith('_amt')) return 'USD';
  if (field.endsWith('_pct')) return '%';
  if (field.endsWith('_bps')) return 'bps';
  return undefined;
}

export function inferSemanticType(
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

export function deduplicateRefs(refs: RegulatoryRef[]): RegulatoryRef[] {
  const seen = new Set<string>();
  return refs.filter(r => {
    const key = `${r.framework}|${r.section ?? ''}|${r.schedule ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
