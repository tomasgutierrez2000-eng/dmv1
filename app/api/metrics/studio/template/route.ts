/**
 * GET /api/metrics/studio/template?metricId=MET-029
 *
 * Load a pre-built metric DAG as Studio nodes + edges.
 * Server-side proxy that uses generateLineage() and getCatalogueItem()
 * (both require fs access) and returns React Flow-compatible nodes/edges.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { generateLineage } from '@/lib/lineage-generator';
import { getMergedMetrics } from '@/lib/metrics-store';
import type { StudioNode, StudioEdge, TableNodeData, TransformNodeData, OutputNodeData } from '@/lib/metric-studio/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const metricId = searchParams.get('metricId');

  if (!metricId) {
    return jsonError('metricId query parameter is required', { status: 400 });
  }

  // Find the L3 metric
  const metrics = getMergedMetrics();
  const metric = metrics.find(m => m.id === metricId);

  if (!metric) {
    return jsonError(`Metric ${metricId} not found`, { status: 404 });
  }

  // Generate lineage (uses metric.sourceFields or pre-defined nodes/edges)
  const enriched = generateLineage(metric);
  const lineageNodes = enriched.nodes ?? [];
  const lineageEdges = enriched.edges ?? [];

  if (lineageNodes.length === 0) {
    return jsonError(`Metric ${metricId} has no lineage nodes`, { status: 404, code: 'NO_LINEAGE' });
  }

  // Convert LineageNode/Edge to React Flow Studio nodes/edges
  const studioNodes: StudioNode[] = lineageNodes.map((n, i) => {
    const isOutput = n.layer === 'L3' && !lineageEdges.some(e => e.from === n.id);
    const isTransform = n.layer === 'transform';

    let data: TableNodeData | TransformNodeData | OutputNodeData;

    if (isOutput) {
      data = {
        type: 'output',
        metricName: metric.name,
        value: n.sampleValue ?? null,
        formattedValue: n.sampleValue,
        unitType: undefined,
        zoomLevel: 'analyst',
      };
    } else if (isTransform) {
      data = {
        type: 'transform',
        operation: 'aggregate',
        label: n.formula ?? n.field ?? 'Transform',
        condition: n.filterCriteria,
        zoomLevel: 'analyst',
      };
    } else {
      data = {
        type: 'table',
        tableName: n.table ?? n.field ?? 'unknown',
        layer: (n.layer === 'L1' ? 'l1' : n.layer === 'L2' ? 'l2' : 'l3') as 'l1' | 'l2' | 'l3',
        fields: n.fields ?? (n.field ? [n.field] : []),
        selectedFields: n.fields ?? (n.field ? [n.field] : []),
        zoomLevel: 'analyst',
      };
    }

    return {
      id: n.id,
      type: isOutput ? 'outputNode' : isTransform ? 'transformNode' : 'tableNode',
      position: { x: 0, y: i * 120 }, // Will be re-laid out by Dagre
      data,
    };
  });

  const studioEdges: StudioEdge[] = lineageEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.from,
    target: e.to,
    type: 'dataFlowEdge',
    data: { label: e.label },
  }));

  return jsonSuccess({
    metricId: metric.id,
    metricName: metric.name,
    formulaSQL: metric.formulaSQL ?? metric.formula ?? '',
    nodes: studioNodes,
    edges: studioEdges,
  });
}
