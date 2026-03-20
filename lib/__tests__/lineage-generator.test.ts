import { describe, it, expect } from 'vitest';
import { generateLineage, metricWithLineage } from '../lineage-generator';
import type { L3Metric, SourceField } from '@/data/l3-metrics';

function makeMetric(overrides: Partial<L3Metric> = {}): L3Metric {
  return {
    id: 'C001',
    name: 'Test Metric',
    page: 'P1',
    section: 'Test',
    metricType: 'Ratio',
    formula: 'A / B',
    description: 'Test description',
    displayFormat: '%',
    sampleValue: '42%',
    sourceFields: [
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount', description: 'Drawn' },
      { layer: 'L2', table: 'facility_exposure_snapshot', field: 'committed_amount', description: 'Committed' },
      { layer: 'L1', table: 'facility_master', field: 'facility_id', description: 'FK' },
    ] as SourceField[],
    dimensions: [],
    ...overrides,
  } as L3Metric;
}

// ─── generateLineage ──────────────────────────────────────────────────

describe('generateLineage', () => {
  it('returns empty for metric with no sourceFields', () => {
    const m = makeMetric({ sourceFields: [] });
    const { nodes, edges } = generateLineage(m);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('groups fields by (layer, table)', () => {
    const m = makeMetric();
    const { nodes } = generateLineage(m);
    // 2 source tables (L2.fes and L1.fm) + transform + L3 output = 4
    const sourceNodes = nodes.filter(n => n.layer === 'L1' || n.layer === 'L2');
    expect(sourceNodes).toHaveLength(2);
  });

  it('creates transform and L3 output nodes', () => {
    const m = makeMetric();
    const { nodes } = generateLineage(m);
    expect(nodes.find(n => n.id === 'transform-formula')).toBeDefined();
    expect(nodes.find(n => n.id === 'l3-output')).toBeDefined();
  });

  it('creates edges from source tables to transform and transform to output', () => {
    const m = makeMetric();
    const { edges } = generateLineage(m);
    const toTransform = edges.filter(e => e.to === 'transform-formula');
    const toOutput = edges.filter(e => e.to === 'l3-output');
    expect(toTransform).toHaveLength(2); // 2 source tables
    expect(toOutput).toHaveLength(1);
  });

  it('multi-field table node shows comma-separated fields', () => {
    const m = makeMetric();
    const { nodes } = generateLineage(m);
    const fesNode = nodes.find(n => n.table === 'facility_exposure_snapshot');
    expect(fesNode?.field).toContain('drawn_amount');
    expect(fesNode?.field).toContain('committed_amount');
    expect(fesNode?.fields).toHaveLength(2);
  });

  it('single-field table node has no fields array', () => {
    const m = makeMetric();
    const { nodes } = generateLineage(m);
    const fmNode = nodes.find(n => n.table === 'facility_master');
    expect(fmNode?.fields).toBeUndefined();
  });

  it('applies calculationDimension to transform description', () => {
    const m = makeMetric();
    const { nodes } = generateLineage(m, 'counterparty');
    const transform = nodes.find(n => n.id === 'transform-formula');
    expect(transform?.description).toContain('Counterparty');
  });

  it('sets filterCriteria from metric context', () => {
    const m = makeMetric();
    const { nodes } = generateLineage(m, 'facility');
    const sourceNode = nodes.find(n => n.layer === 'L2');
    expect(sourceNode?.filterCriteria).toContain('Page: P1');
  });
});

// ─── metricWithLineage ────────────────────────────────────────────────

describe('metricWithLineage', () => {
  it('generates lineage for metric without pre-defined nodes', () => {
    const m = makeMetric();
    const result = metricWithLineage(m);
    expect(result.nodes).toBeDefined();
    expect(result.nodes!.length).toBeGreaterThan(0);
    expect(result.edges).toBeDefined();
  });

  it('preserves pre-defined lineage nodes', () => {
    const existingNodes = [
      { id: 'custom-1', layer: 'L2' as const, table: 'custom', field: 'f', description: '' },
    ];
    const m = makeMetric({ nodes: existingNodes });
    const result = metricWithLineage(m);
    expect(result.nodes).toBe(existingNodes);
  });

  it('overlays dimension on transform node description', () => {
    const m = makeMetric();
    const result = metricWithLineage(m, 'counterparty');
    const transform = result.nodes?.find(n => n.layer === 'transform');
    expect(transform?.description).toContain('Counterparty');
  });

  it('sets filterCriteria on L1/L2 nodes without existing criteria', () => {
    const m = makeMetric();
    const result = metricWithLineage(m, 'facility');
    const l2Node = result.nodes?.find(n => n.layer === 'L2');
    expect(l2Node?.filterCriteria).toBeDefined();
  });
});
