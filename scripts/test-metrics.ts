/**
 * Test metrics engine: merge logic, lineage generation, derivation.
 * Run: npx tsx scripts/test-metrics.ts
 */

import path from 'path';
import fs from 'fs';
import { getMergedMetrics, readCustomMetrics, nextCustomMetricId } from '../lib/metrics-store';
import { metricWithLineage } from '../lib/lineage-generator';
import { deriveDimensionsFromSourceFields, suggestTogglesFromSourceFields } from '../lib/metric-derivation';
import type { L3Metric, SourceField } from '../data/l3-metrics';

const dataDir = path.join(process.cwd(), 'data');
const customPath = path.join(dataDir, 'metrics-custom.json');

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('  OK:', message);
}

function main() {
  console.log('Metrics engine tests\n');

  // 1) getMergedMetrics: without custom file, returns built-in only (or built-in + custom from file if it exists)
  const merged = getMergedMetrics();
  assert(Array.isArray(merged), 'getMergedMetrics returns an array');
  assert(merged.length >= 1, 'getMergedMetrics returns at least one metric (built-in catalog)');
  const firstId = merged[0].id;
  assert(!!firstId && !!merged[0].name && !!merged[0].formula, 'each merged metric has id, name, formula');

  // 2) metricWithLineage: generates nodes/edges from sourceFields when metric has no nodes
  const metricWithoutLineage: L3Metric = {
    id: 'TEST',
    name: 'Test',
    page: 'P1',
    section: 'Test',
    metricType: 'Aggregate',
    formula: 'SUM(gross_exposure_usd)',
    description: '',
    displayFormat: '',
    sampleValue: '',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
    ],
    dimensions: [],
  };
  const withLineage = metricWithLineage(metricWithoutLineage);
  assert(!!withLineage.nodes && withLineage.nodes.length >= 2, 'metricWithLineage adds nodes (source + transform + L3)');
  assert(!!withLineage.edges && withLineage.edges.length >= 1, 'metricWithLineage adds edges');
  const nodes = withLineage.nodes!;
  const hasTransform = nodes.some((n) => n.layer === 'transform');
  assert(hasTransform, 'lineage includes transform node');
  const hasL3 = nodes.some((n) => n.layer === 'L3');
  assert(hasL3, 'lineage includes L3 output node');

  // 3) metricWithLineage: empty sourceFields yields no nodes
  const emptySource: L3Metric = { ...metricWithoutLineage, sourceFields: [] };
  const emptyLineage = metricWithLineage(emptySource);
  assert(
    (!emptyLineage.nodes || emptyLineage.nodes.length === 0) && (!emptyLineage.edges || emptyLineage.edges.length === 0),
    'metricWithLineage with no sourceFields yields empty nodes/edges'
  );

  // 4) deriveDimensionsFromSourceFields: returns array (fallback when no schema)
  const sourceFields: SourceField[] = [
    { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd' },
  ];
  const dimensions = deriveDimensionsFromSourceFields(sourceFields, null, 'GROUP_BY');
  assert(Array.isArray(dimensions) && dimensions.length >= 1, 'deriveDimensionsFromSourceFields returns at least one dimension');
  assert(dimensions.every((d) => d.dimension && d.interaction), 'each dimension has dimension and interaction');

  // 5) suggestTogglesFromSourceFields: exposure-related fields suggest exposure_calc on P2
  const toggles = suggestTogglesFromSourceFields(sourceFields, 'P2');
  assert(Array.isArray(toggles), 'suggestTogglesFromSourceFields returns an array');

  // 6) nextCustomMetricId
  const nextId = nextCustomMetricId([]);
  assert(nextId === 'C001', 'nextCustomMetricId with no existing returns C001');
  const nextId2 = nextCustomMetricId([{ ...metricWithoutLineage, id: 'C001' }]);
  assert(nextId2 === 'C002', 'nextCustomMetricId with C001 returns C002');

  console.log('\nAll metrics engine tests passed.');
}

main();
