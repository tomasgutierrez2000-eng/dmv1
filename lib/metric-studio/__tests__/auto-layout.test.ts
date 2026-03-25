import { describe, it, expect, beforeEach } from 'vitest';
import { useStudioStore } from '../canvas-state';
import type { StudioNode, TableNodeData, TransformNodeData, OutputNodeData, DestinationNodeData } from '../types';

function makeTableNode(id: string, layer: 'l1' | 'l2', tableName: string): StudioNode {
  return {
    id,
    type: 'tableNode',
    position: { x: 0, y: 0 },
    data: {
      type: 'table',
      tableName,
      layer,
      fields: [],
      selectedFields: [],
      zoomLevel: 'analyst',
    } as TableNodeData,
  };
}

function makeTransformNode(id: string): StudioNode {
  return {
    id,
    type: 'transformNode',
    position: { x: 0, y: 0 },
    data: {
      type: 'transform',
      operation: 'aggregate',
      label: 'COMPUTE',
      zoomLevel: 'analyst',
    } as TransformNodeData,
  };
}

function makeOutputNode(id: string): StudioNode {
  return {
    id,
    type: 'outputNode',
    position: { x: 0, y: 0 },
    data: {
      type: 'output',
      metricName: 'Test Metric',
      zoomLevel: 'analyst',
    } as OutputNodeData,
  };
}

function makeDestinationNode(id: string, isGhost = false): StudioNode {
  return {
    id,
    type: 'destinationNode',
    position: { x: 0, y: 0 },
    data: {
      type: 'destination',
      tableName: isGhost ? 'unknown' : 'exposure_metric_cube',
      layer: 'l3',
      fields: [],
      isGhost,
      zoomLevel: 'analyst',
    } as DestinationNodeData,
  };
}

describe('autoLayout', () => {
  beforeEach(() => {
    useStudioStore.setState({
      nodes: [],
      edges: [],
      schema: null,
    });
  });

  it('does nothing when canvas is empty', () => {
    useStudioStore.getState().autoLayout();
    expect(useStudioStore.getState().nodes).toEqual([]);
  });

  it('positions L2 nodes in column 0', () => {
    const l2a = makeTableNode('l2a', 'l2', 'facility_exposure_snapshot');
    const l2b = makeTableNode('l2b', 'l2', 'facility_master');
    useStudioStore.setState({ nodes: [l2a, l2b] });

    useStudioStore.getState().autoLayout();
    const nodes = useStudioStore.getState().nodes;

    expect(nodes.find(n => n.id === 'l2a')?.position.x).toBe(0);
    expect(nodes.find(n => n.id === 'l2b')?.position.x).toBe(0);
    // Vertically stacked
    expect(nodes.find(n => n.id === 'l2a')?.position.y).toBe(0);
    expect(nodes.find(n => n.id === 'l2b')?.position.y).toBe(120);
  });

  it('positions transform nodes in column 1', () => {
    const t = makeTransformNode('t1');
    useStudioStore.setState({ nodes: [t] });

    useStudioStore.getState().autoLayout();
    const nodes = useStudioStore.getState().nodes;

    expect(nodes.find(n => n.id === 't1')?.position.x).toBe(300);
  });

  it('positions output nodes in column 2', () => {
    const o = makeOutputNode('o1');
    useStudioStore.setState({ nodes: [o] });

    useStudioStore.getState().autoLayout();
    const nodes = useStudioStore.getState().nodes;

    expect(nodes.find(n => n.id === 'o1')?.position.x).toBe(600);
  });

  it('positions destination nodes in column 3', () => {
    const d = makeDestinationNode('d1');
    useStudioStore.setState({ nodes: [d] });

    useStudioStore.getState().autoLayout();
    const nodes = useStudioStore.getState().nodes;

    expect(nodes.find(n => n.id === 'd1')?.position.x).toBe(900);
  });

  it('positions L1 above L2 when FK exists', () => {
    const l1 = makeTableNode('l1a', 'l1', 'currency_dim');
    const l2 = makeTableNode('l2a', 'l2', 'facility_exposure_snapshot');
    useStudioStore.setState({
      nodes: [l1, l2],
      schema: {
        tables: [],
        relationships: [{
          fromTable: 'facility_exposure_snapshot',
          fromColumn: 'currency_code',
          fromLayer: 'l2',
          toTable: 'currency_dim',
          toColumn: 'currency_code',
          toLayer: 'l1',
        }],
      },
    });

    useStudioStore.getState().autoLayout();
    const nodes = useStudioStore.getState().nodes;

    const l1Pos = nodes.find(n => n.id === 'l1a')?.position;
    const l2Pos = nodes.find(n => n.id === 'l2a')?.position;

    // L1 should be above L2 (lower y value)
    expect(l1Pos!.y).toBeLessThan(l2Pos!.y);
    // Same x column
    expect(l1Pos!.x).toBe(l2Pos!.x);
  });

  it('positions L1 above leftmost L2 when no FK match', () => {
    const l1 = makeTableNode('l1a', 'l1', 'orphan_dim');
    const l2 = makeTableNode('l2a', 'l2', 'facility_exposure_snapshot');
    useStudioStore.setState({
      nodes: [l1, l2],
      schema: { tables: [], relationships: [] },
    });

    useStudioStore.getState().autoLayout();
    const nodes = useStudioStore.getState().nodes;

    const l1Pos = nodes.find(n => n.id === 'l1a')?.position;
    const l2Pos = nodes.find(n => n.id === 'l2a')?.position;

    expect(l1Pos!.y).toBeLessThan(l2Pos!.y);
  });

  it('handles full end-to-end DAG layout', () => {
    const l1 = makeTableNode('l1', 'l1', 'currency_dim');
    const l2a = makeTableNode('l2a', 'l2', 'facility_exposure_snapshot');
    const l2b = makeTableNode('l2b', 'l2', 'facility_master');
    const t = makeTransformNode('t1');
    const o = makeOutputNode('o1');
    const d = makeDestinationNode('d1');

    useStudioStore.setState({
      nodes: [l1, l2a, l2b, t, o, d],
      schema: {
        tables: [],
        relationships: [{
          fromTable: 'facility_exposure_snapshot',
          fromColumn: 'currency_code',
          fromLayer: 'l2',
          toTable: 'currency_dim',
          toColumn: 'currency_code',
          toLayer: 'l1',
        }],
      },
    });

    useStudioStore.getState().autoLayout();
    const nodes = useStudioStore.getState().nodes;

    // L2 nodes should be leftmost (x=0)
    expect(nodes.find(n => n.id === 'l2a')?.position.x).toBe(0);
    // Transform should be right of L2
    expect(nodes.find(n => n.id === 't1')?.position.x).toBeGreaterThan(0);
    // Output should be right of transform
    expect(nodes.find(n => n.id === 'o1')?.position.x).toBeGreaterThan(
      nodes.find(n => n.id === 't1')!.position.x
    );
    // Destination should be rightmost
    expect(nodes.find(n => n.id === 'd1')?.position.x).toBeGreaterThan(
      nodes.find(n => n.id === 'o1')!.position.x
    );
    // L1 should be above its L2 target
    expect(nodes.find(n => n.id === 'l1')?.position.y).toBeLessThan(
      nodes.find(n => n.id === 'l2a')!.position.y
    );
  });
});
