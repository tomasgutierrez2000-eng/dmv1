/**
 * Semantic Layer — Regulatory Index
 *
 * Provides structured lookup from regulatory frameworks to metrics to source fields.
 * Enables traceability: "FR Y-14Q Schedule H → which metrics? → which source fields?"
 */

import type { SemanticMetric, RegulatoryRef, IngredientFieldRef } from './types';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface RegulatoryMetricLink {
  metric_id: string;
  metric_name: string;
  abbreviation?: string;
  domain_id: string;
  /** The specific regulatory reference on this metric. */
  reference: RegulatoryRef;
  /** Source fields that feed into this metric. */
  source_fields: IngredientFieldRef[];
}

export interface RegulatoryFrameworkSummary {
  framework: string;
  /** Unique sections/schedules referenced. */
  sections: string[];
  /** Count of metrics linked to this framework. */
  metric_count: number;
  /** All metrics linked to this framework. */
  metrics: RegulatoryMetricLink[];
}

export interface FieldRegulatoryLink {
  framework: string;
  metric_id: string;
  metric_name: string;
  reference: RegulatoryRef;
}

export interface RegulatoryIndex {
  frameworks: RegulatoryFrameworkSummary[];
  /** Total unique framework count. */
  framework_count: number;
  /** Total metric-to-framework links. */
  total_links: number;
}

// Internal field index — associated via WeakMap so it doesn't leak into JSON serialization
const _fieldIndexes = new WeakMap<RegulatoryIndex, Map<string, FieldRegulatoryLink[]>>();

// ═══════════════════════════════════════════════════════════════
// Builder
// ═══════════════════════════════════════════════════════════════

/**
 * Build the regulatory index from semantic metrics.
 */
export function buildRegulatoryIndex(metrics: SemanticMetric[]): RegulatoryIndex {
  const frameworkMap = new Map<string, RegulatoryMetricLink[]>();
  const frameworkSections = new Map<string, Set<string>>();
  let totalLinks = 0;

  for (const metric of metrics) {
    for (const ref of metric.regulatory_refs) {
      const fw = ref.framework;
      if (!frameworkMap.has(fw)) {
        frameworkMap.set(fw, []);
        frameworkSections.set(fw, new Set());
      }

      frameworkMap.get(fw)!.push({
        metric_id: metric.id,
        metric_name: metric.name,
        abbreviation: metric.abbreviation,
        domain_id: metric.domain_id,
        reference: ref,
        source_fields: metric.ingredient_fields,
      });

      if (ref.section) frameworkSections.get(fw)!.add(ref.section);
      if (ref.schedule) frameworkSections.get(fw)!.add(ref.schedule);

      totalLinks++;
    }
  }

  const frameworks: RegulatoryFrameworkSummary[] = Array.from(frameworkMap.entries())
    .map(([framework, metrics]) => ({
      framework,
      sections: Array.from(frameworkSections.get(framework) ?? []).sort(),
      metric_count: metrics.length,
      metrics,
    }))
    .sort((a, b) => b.metric_count - a.metric_count);

  // Build field → regulatory link index for O(1) lookups
  const fieldIndex = new Map<string, FieldRegulatoryLink[]>();
  for (const fw of frameworks) {
    for (const link of fw.metrics) {
      for (const sf of link.source_fields) {
        const key = `${sf.table}.${sf.field}`;
        if (!fieldIndex.has(key)) fieldIndex.set(key, []);
        fieldIndex.get(key)!.push({
          framework: fw.framework,
          metric_id: link.metric_id,
          metric_name: link.metric_name,
          reference: link.reference,
        });
      }
    }
  }

  const index: RegulatoryIndex = {
    frameworks,
    framework_count: frameworks.length,
    total_links: totalLinks,
  };

  // Associate field index internally — not on the public interface
  _fieldIndexes.set(index, fieldIndex);

  return index;
}

/**
 * Lookup: given a framework (and optional section), return all linked metrics + their source fields.
 */
export function lookupByFramework(
  index: RegulatoryIndex,
  framework: string,
  section?: string,
): RegulatoryMetricLink[] {
  const lower = framework.toLowerCase();
  const fw = index.frameworks.find(f => f.framework.toLowerCase().includes(lower));
  if (!fw) return [];

  if (!section) return fw.metrics;

  const sectionLower = section.toLowerCase();
  return fw.metrics.filter(m =>
    m.reference.section?.toLowerCase().includes(sectionLower) ||
    m.reference.schedule?.toLowerCase().includes(sectionLower)
  );
}

/**
 * Lookup: given a source field, return all regulatory frameworks that reference it.
 * Uses pre-built field index for O(1) lookup.
 */
export function lookupByField(
  index: RegulatoryIndex,
  table: string,
  field: string,
): FieldRegulatoryLink[] {
  const fieldIndex = _fieldIndexes.get(index);
  return fieldIndex?.get(`${table}.${field}`) ?? [];
}
