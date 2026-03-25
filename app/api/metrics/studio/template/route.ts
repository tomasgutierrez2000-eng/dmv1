/**
 * GET /api/metrics/studio/template?metricId=MET-029
 *
 * Load a pre-built metric DAG as Studio nodes + edges.
 * Server-side proxy that uses generateLineage() and getCatalogueItem()
 * (both require fs access) and returns React Flow-compatible nodes/edges.
 *
 * Enhanced: includes L3 DestinationNode showing where the metric result lands,
 * and edge flow types for layer-aware styling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jsonSuccess, jsonError } from '@/lib/api-response';
import { generateLineage } from '@/lib/lineage-generator';
import { getMergedMetrics } from '@/lib/metrics-store';
import { readDataDictionary } from '@/lib/data-dictionary';
import { resolveL3Destination } from '@/lib/metric-studio/l3-mapping';
import type {
  StudioNode, StudioEdge, TableNodeData, TransformNodeData,
  OutputNodeData, DestinationNodeData, EdgeFlowType,
} from '@/lib/metric-studio/types';

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
  let outputNodeId: string | null = null;

  const studioNodes: StudioNode[] = lineageNodes.map((n, i) => {
    const isOutput = n.layer === 'L3' && !lineageEdges.some(e => e.from === n.id);
    const isTransform = n.layer === 'transform';

    let data: TableNodeData | TransformNodeData | OutputNodeData;

    if (isOutput) {
      outputNodeId = n.id;
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
      position: { x: 0, y: i * 120 },
      data,
    };
  });

  // Determine edge flow types based on source/target node layers
  const nodeLayerMap = new Map<string, string>();
  for (const n of lineageNodes) {
    nodeLayerMap.set(n.id, n.layer);
  }

  const studioEdges: StudioEdge[] = lineageEdges.map((e, i) => {
    const sourceLayer = nodeLayerMap.get(e.from);
    let flowType: EdgeFlowType | undefined;
    if (sourceLayer === 'L1') flowType = 'dim-lookup';
    else if (sourceLayer === 'L2') flowType = 'source';

    return {
      id: `e-${i}`,
      source: e.from,
      target: e.to,
      type: 'dataFlowEdge',
      data: { label: e.label, flowType },
    };
  });

  // --- L3 Destination Node ---
  let l3Destination: { table: string; column?: string } | undefined;

  const l3TableName = resolveL3Destination(metricId);
  const destNodeId = 'l3-destination';

  if (l3TableName) {
    // Look up L3 table fields from data dictionary
    const dd = readDataDictionary();
    const l3Table = dd?.L3?.find(t => t.name === l3TableName);

    const destData: DestinationNodeData = {
      type: 'destination',
      tableName: l3TableName,
      layer: 'l3',
      targetColumn: 'metric_value',
      fields: l3Table?.fields?.map(f => ({ name: f.name, dataType: f.data_type })) ?? [],
      category: l3Table?.category,
      isGhost: false,
      zoomLevel: 'analyst',
    };

    studioNodes.push({
      id: destNodeId,
      type: 'destinationNode',
      position: { x: 0, y: studioNodes.length * 120 },
      data: destData,
    });

    l3Destination = { table: l3TableName, column: 'metric_value' };
  } else {
    // Ghost node — L3 destination unknown
    const destData: DestinationNodeData = {
      type: 'destination',
      tableName: 'unknown',
      layer: 'l3',
      fields: [],
      isGhost: true,
      zoomLevel: 'analyst',
    };

    studioNodes.push({
      id: destNodeId,
      type: 'destinationNode',
      position: { x: 0, y: studioNodes.length * 120 },
      data: destData,
    });
  }

  // Edge from output → destination
  if (outputNodeId) {
    studioEdges.push({
      id: `e-dest`,
      source: outputNodeId,
      target: destNodeId,
      type: 'dataFlowEdge',
      data: { label: 'writes to', flowType: 'output' },
    });
  }

  return jsonSuccess({
    metricId: metric.id,
    metricName: metric.name,
    formulaSQL: metric.formulaSQL ?? metric.formula ?? '',
    nodes: studioNodes,
    edges: studioEdges,
    l3Destination,
  });
}
