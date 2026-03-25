import { describe, it, expect } from 'vitest';
import { buildFKGraph, findShortestPath, findAllPaths, abbreviateTable, pathToString } from '@/lib/metric-studio/fk-graph';
import type { DataDictionaryRelationship } from '@/lib/data-dictionary';

const SAMPLE_RELS: DataDictionaryRelationship[] = [
  { from_table: 'facility_master', from_field: 'counterparty_id', to_table: 'counterparty', to_field: 'counterparty_id', from_layer: 'L2', to_layer: 'L2' },
  { from_table: 'facility_master', from_field: 'credit_agreement_id', to_table: 'credit_agreement_master', to_field: 'credit_agreement_id', from_layer: 'L2', to_layer: 'L2' },
  { from_table: 'credit_agreement_master', from_field: 'borrower_counterparty_id', to_table: 'counterparty', to_field: 'counterparty_id', from_layer: 'L2', to_layer: 'L2' },
  { from_table: 'facility_exposure_snapshot', from_field: 'facility_id', to_table: 'facility_master', to_field: 'facility_id', from_layer: 'L2', to_layer: 'L2' },
  { from_table: 'facility_risk_snapshot', from_field: 'facility_id', to_table: 'facility_master', to_field: 'facility_id', from_layer: 'L2', to_layer: 'L2' },
  { from_table: 'facility_master', from_field: 'lob_segment_id', to_table: 'enterprise_business_taxonomy', to_field: 'managed_segment_id', from_layer: 'L2', to_layer: 'L1' },
  // Self-referencing FK (should be filtered)
  { from_table: 'enterprise_business_taxonomy', from_field: 'parent_segment_id', to_table: 'enterprise_business_taxonomy', to_field: 'managed_segment_id', from_layer: 'L1', to_layer: 'L1' },
];

describe('buildFKGraph', () => {
  it('builds bidirectional adjacency list from relationships', () => {
    const graph = buildFKGraph(SAMPLE_RELS);
    // facility_master should have edges to counterparty, credit_agreement_master, ebt
    // AND reverse edges from fes, frs
    const fmEdges = graph.get('facility_master') ?? [];
    expect(fmEdges.length).toBeGreaterThanOrEqual(4);
  });

  it('filters out self-referencing FKs', () => {
    const graph = buildFKGraph(SAMPLE_RELS);
    const ebtEdges = graph.get('enterprise_business_taxonomy') ?? [];
    // Should NOT have edge to itself
    const selfRef = ebtEdges.filter(e => e.toTable === 'enterprise_business_taxonomy');
    expect(selfRef.length).toBe(0);
  });
});

describe('findShortestPath', () => {
  it('finds direct path between adjacent tables', () => {
    const graph = buildFKGraph(SAMPLE_RELS);
    const path = findShortestPath(graph, 'facility_master', 'counterparty');
    expect(path).not.toBeNull();
    expect(path!.length).toBe(1);
    expect(path![0].toTable).toBe('counterparty');
  });

  it('finds multi-hop path through bridge table', () => {
    const graph = buildFKGraph(SAMPLE_RELS);
    const path = findShortestPath(graph, 'facility_exposure_snapshot', 'counterparty');
    expect(path).not.toBeNull();
    // fes → fm → counterparty = 2 hops
    expect(path!.length).toBe(2);
  });

  it('returns empty array for same table', () => {
    const graph = buildFKGraph(SAMPLE_RELS);
    const path = findShortestPath(graph, 'counterparty', 'counterparty');
    expect(path).toEqual([]);
  });

  it('returns null for unconnected tables', () => {
    const graph = buildFKGraph(SAMPLE_RELS);
    const path = findShortestPath(graph, 'facility_master', 'nonexistent_table');
    expect(path).toBeNull();
  });
});

describe('findAllPaths', () => {
  it('finds multiple paths between tables', () => {
    const graph = buildFKGraph(SAMPLE_RELS);
    // fm → counterparty has two paths: direct and via cam
    const paths = findAllPaths(graph, 'facility_master', 'counterparty');
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it('respects max depth', () => {
    const graph = buildFKGraph(SAMPLE_RELS);
    const paths = findAllPaths(graph, 'facility_exposure_snapshot', 'enterprise_business_taxonomy', 2);
    // fes → fm → ebt = 2 hops, should be found within maxDepth=2
    // but longer paths should be excluded
    for (const path of paths) {
      expect(path.length).toBeLessThanOrEqual(2);
    }
  });
});

describe('abbreviateTable', () => {
  it('abbreviates multi-word table names', () => {
    expect(abbreviateTable('facility_exposure_snapshot')).toBe('fes');
    expect(abbreviateTable('facility_master')).toBe('fm');
    expect(abbreviateTable('counterparty')).toBe('cou');
  });
});

describe('pathToString', () => {
  it('formats path as arrow-separated table names', () => {
    const graph = buildFKGraph(SAMPLE_RELS);
    const path = findShortestPath(graph, 'facility_exposure_snapshot', 'counterparty');
    const str = pathToString(path!);
    expect(str).toContain('→');
    expect(str).toContain('facility_exposure_snapshot');
    expect(str).toContain('counterparty');
  });

  it('returns (direct) for empty path', () => {
    expect(pathToString([])).toBe('(direct)');
  });
});
