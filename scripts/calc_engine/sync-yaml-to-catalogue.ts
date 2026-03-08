#!/usr/bin/env tsx
/**
 * Sync YAML metric definitions → catalogue.json
 *
 * Option C: YAML is source of truth. This script updates the metric library
 * catalogue with generic_formula and level_definitions derived from YAML.
 *
 * Matching: catalogue item is updated when executable_metric_id or item_id
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
  const levelLogic = formula?.formula_text ?? metric.description;
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

interface CatalogueItem {
  item_id: string;
  item_name?: string;
  abbreviation?: string;
  kind?: string;
  definition?: string;
  generic_formula?: string;
  level_definitions?: unknown[];
  executable_metric_id?: string | null;
  [key: string]: unknown;
}

function findMatchingCatalogueItem(
  catalogue: CatalogueItem[],
  metric: MetricDefinition
): CatalogueItem | undefined {
  return catalogue.find((item) => {
    if (item.executable_metric_id === metric.metric_id) return true;
    if (item.item_id === metric.metric_id) return true;
    if (metric.legacy_metric_ids?.includes(item.item_id)) return true;
    if (metric.legacy_metric_ids?.includes(item.executable_metric_id as string)) return true;
    return false;
  });
}

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
  let updated = 0;

  for (const metric of active) {
    const item = findMatchingCatalogueItem(catalogue, metric);
    if (!item) {
      if (dryRun) {
        console.log(`  [skip] ${metric.metric_id} — no matching catalogue item`);
      }
      continue;
    }

    const genericFormula = metric.levels.facility?.formula_text ?? metric.description;
    const levelDefs = CATALOGUE_LEVELS.map((catLevel) => {
      const yamlLevel = (Object.entries(YAML_TO_CATALOGUE).find(([, v]) => v === catLevel)?.[0] ??
        'facility') as AggregationLevel;
      return buildLevelDefinition(metric, yamlLevel, catLevel);
    });

    item.generic_formula = genericFormula;
    item.level_definitions = levelDefs;
    item.executable_metric_id = metric.metric_id;
    updated++;

    if (dryRun) {
      console.log(`  [would update] ${item.item_id} ← ${metric.metric_id}`);
    }
  }

  if (!dryRun && updated > 0) {
    fs.writeFileSync(cataloguePath, JSON.stringify(catalogue, null, 2) + '\n', 'utf-8');
  }

  console.log(`Synced ${updated} catalogue items from ${active.length} YAML metrics${dryRun ? ' (dry-run)' : ''}.`);
}

main();
