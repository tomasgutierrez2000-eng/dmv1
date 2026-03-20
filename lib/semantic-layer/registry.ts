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

import type { SemanticModel } from './types';
import type { CatalogueItem } from '@/lib/metric-library/types';
import { loadYamlMetrics, loadCatalogue, loadDomains, loadDataDictionary } from './loaders';
import { buildSemanticMetric } from './metric-builder';
import { buildDimensionsAndHierarchies, buildMeasures, buildDomains, buildGlossary } from './model-builder';

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
// Builder Orchestrator
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
