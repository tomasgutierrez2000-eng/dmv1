/**
 * Schema bundle: single merged view of data model (schema-only, no row data).
 * Used by GET /api/schema/bundle and by the data-model agent tools.
 *
 * Provider registry: add new sources by appending to SCHEMA_PROVIDERS.
 */

import {
  readDataDictionary,
  type DataDictionary,
  type DataDictionaryTable,
  type DataDictionaryRelationship,
} from '@/lib/data-dictionary';
import { L3_TABLES, type L3TableDef } from '@/data/l3-tables';
import {
  L3_METRICS,
  DASHBOARD_PAGES,
  type L3Metric,
  type DashboardPage,
} from '@/data/l3-metrics';

// ─── Bundle type (merged from all providers) ─────────────────────────────────

export interface SchemaBundle {
  dataDictionary: DataDictionary | null;
  l3Tables: L3TableDef[];
  l3Metrics: L3Metric[];
}

export interface SchemaSummary {
  layers: string[];
  categories: string[];
  tableCountByLayer: Record<string, number>;
  tableNamesByLayer: Record<string, string[]>;
  relationshipCount: number;
  l3TableCount: number;
  l3MetricCount: number;
  dashboardPages: { id: DashboardPage; name: string }[];
  oneLiner: {
    L1: string;
    L2: string;
    L3: string;
  };
}

// ─── Providers (each returns a slice; add new sources here) ──────────────────

function provideDataDictionary(): DataDictionary | null {
  return readDataDictionary();
}

function provideL3Tables(): L3TableDef[] {
  return [...L3_TABLES];
}

function provideL3Metrics(): L3Metric[] {
  return [...L3_METRICS];
}

/** Build the full schema bundle by calling all providers. */
export function getSchemaBundle(): SchemaBundle {
  return {
    dataDictionary: provideDataDictionary(),
    l3Tables: provideL3Tables(),
    l3Metrics: provideL3Metrics(),
  };
}

/** Build a short summary for the agent system prompt (low token count). */
export function getSchemaSummary(): SchemaSummary {
  const bundle = getSchemaBundle();
  const dd = bundle.dataDictionary;

  const layers = ['L1', 'L2', 'L3'];
  const categories: string[] = [];
  const tableNamesByLayer: Record<string, string[]> = { L1: [], L2: [], L3: [] };
  let relationshipCount = 0;

  if (dd) {
    for (const layer of layers) {
      const arr = dd[layer as 'L1' | 'L2' | 'L3'];
      if (arr) {
        tableNamesByLayer[layer] = arr.map((t) => t.name);
        for (const t of arr) {
          if (t.category && !categories.includes(t.category)) {
            categories.push(t.category);
          }
        }
      }
    }
    relationshipCount = dd.relationships?.length ?? 0;
  }

  // L3 table categories from code
  const l3Categories = [...new Set(bundle.l3Tables.map((t) => t.category))];
  l3Categories.forEach((c) => {
    if (c && !categories.includes(c)) categories.push(c);
  });

  const tableCountByLayer: Record<string, number> = {
    L1: tableNamesByLayer.L1.length,
    L2: tableNamesByLayer.L2.length,
    L3: tableNamesByLayer.L3.length,
  };

  return {
    layers,
    categories: categories.sort(),
    tableCountByLayer,
    tableNamesByLayer,
    relationshipCount,
    l3TableCount: bundle.l3Tables.length,
    l3MetricCount: bundle.l3Metrics.length,
    dashboardPages: DASHBOARD_PAGES.map((p) => ({ id: p.id, name: p.name })),
    oneLiner: {
      L1: 'Reference/dimension and master data (e.g. facility_master, counterparty, currency_dim).',
      L2: 'Snapshot and event data (e.g. facility exposure snapshots, collateral, amendments).',
      L3: 'Derived metrics and cubes (e.g. exposure_metric_cube, limit_utilization); populated from L1/L2 and transforms.',
    },
  };
}

/** Find a table in the bundle by layer and name. */
export function findTableInBundle(
  bundle: SchemaBundle,
  layer: 'L1' | 'L2' | 'L3',
  tableName: string
): DataDictionaryTable | undefined {
  const dd = bundle.dataDictionary;
  if (!dd) return undefined;
  const arr = dd[layer];
  return arr?.find((t) => t.name.toLowerCase() === tableName.toLowerCase());
}

/** Get relationships involving a given table (optional filter). */
export function getRelationshipsForTable(
  bundle: SchemaBundle,
  tableName?: string,
  layer?: string
): DataDictionaryRelationship[] {
  const dd = bundle.dataDictionary;
  if (!dd?.relationships) return [];
  let rels = dd.relationships;
  if (tableName) {
    const tn = tableName.toLowerCase();
    rels = rels.filter(
      (r) =>
        r.from_table.toLowerCase() === tn || r.to_table.toLowerCase() === tn
    );
  }
  if (layer) {
    const l = layer.toUpperCase();
    rels = rels.filter(
      (r) => r.from_layer === l || r.to_layer === l
    );
  }
  return rels;
}
