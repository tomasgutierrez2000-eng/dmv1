/**
 * Semantic Layer — Source Loaders
 *
 * Reads raw data from the 4 source files:
 * 1. YAML metric definitions (scripts/calc_engine/metrics/)
 * 2. Catalogue items (data/metric-library/catalogue.json)
 * 3. Domains (data/metric-library/domains.json)
 * 4. Data dictionary (facility-summary-mvp/output/data-dictionary/data-dictionary.json)
 */

import fs from 'fs';
import path from 'path';
import { getProjectRoot, getDataDictionaryPath, getMetricLibraryDir } from '@/lib/config';
import type { CatalogueItem } from '@/lib/metric-library/types';

// ═══════════════════════════════════════════════════════════════
// YAML types (simplified — matches scripts/calc_engine/types)
// ═══════════════════════════════════════════════════════════════

export interface YamlField {
  name: string;
  role: 'MEASURE' | 'DIMENSION' | 'FILTER' | 'JOIN_KEY';
  description?: string;
}

export interface YamlSourceTable {
  schema: 'l1' | 'l2' | 'l3';
  table: string;
  alias: string;
  join_type: 'BASE' | 'INNER' | 'LEFT' | 'CROSS';
  join_on?: string;
  fields: YamlField[];
}

export interface YamlLevelFormula {
  aggregation_type: string;
  formula_text: string;
  formula_sql: string;
  weighting_field?: string;
}

export interface YamlRegulatoryRef {
  framework: string;
  section?: string;
  schedule?: string;
  description: string;
}

export interface YamlValidation {
  rule_id: string;
  type: string;
  description: string;
  severity: string;
  params?: Record<string, unknown>;
}

export interface YamlCatalogue {
  item_id?: string;
  abbreviation?: string;
  insight?: string;
  rollup_strategy?: string;
  primary_value_field?: string;
}

export interface YamlMetric {
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

export interface DDField {
  name: string;
  description?: string;
  data_type?: string;
  category?: string;
  pk_fk?: { is_pk?: boolean };
}

export interface DDTable {
  name: string;
  layer: string;
  category?: string;
  fields: DDField[];
}

export interface DataDictionary {
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
// Domain type
// ═══════════════════════════════════════════════════════════════

export interface RawDomain {
  domain_id: string;
  domain_name: string;
  description: string;
  icon: string;
  color: string;
  regulatory_relevance?: string[];
  primary_stakeholders?: string[];
}

// ═══════════════════════════════════════════════════════════════
// Source Loaders
// ═══════════════════════════════════════════════════════════════

export function loadYamlMetrics(): YamlMetric[] {
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

export function loadCatalogue(): CatalogueItem[] {
  try {
    const p = path.join(getMetricLibraryDir(), 'catalogue.json');
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as CatalogueItem[];
  } catch {
    return [];
  }
}

export function loadDomains(): RawDomain[] {
  try {
    const p = path.join(getMetricLibraryDir(), 'domains.json');
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as RawDomain[];
  } catch {
    return [];
  }
}

export function loadDataDictionary(): DataDictionary | null {
  try {
    const p = getDataDictionaryPath();
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as DataDictionary;
  } catch {
    return null;
  }
}
