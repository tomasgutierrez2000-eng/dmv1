/**
 * Semantic API — Lineage Endpoint
 *
 * GET /api/semantic/lineage?metric=EXP-001
 *   Full source-to-output lineage DAG for a metric
 *
 * GET /api/semantic/lineage?metric=EXP-001&depth=dependencies
 *   Include upstream metric dependencies (depends_on chain)
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { getSemanticModel } from '@/lib/semantic-layer/registry';
import { cached } from '@/lib/semantic-layer/api-utils';
import type { SemanticMetric } from '@/lib/semantic-layer/types';

interface LineageNode {
  id: string;
  type: 'source_table' | 'field' | 'transform' | 'metric' | 'output';
  label: string;
  layer?: string;
  table?: string;
  field?: string;
  metadata?: Record<string, string>;
}

interface LineageEdge {
  from: string;
  to: string;
  label?: string;
}

function buildLineageDAG(metric: SemanticMetric, allMetrics: Map<string, SemanticMetric>, includeDepends: boolean) {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];
  const seenNodes = new Set<string>();
  const seenEdges = new Set<string>();

  const addNode = (n: LineageNode) => {
    if (!seenNodes.has(n.id)) {
      seenNodes.add(n.id);
      nodes.push(n);
    }
  };

  const addEdge = (e: LineageEdge) => {
    const key = `${e.from}→${e.to}`;
    if (!seenEdges.has(key)) {
      seenEdges.add(key);
      edges.push(e);
    }
  };

  // 1. Source tables and their fields
  for (const st of metric.source_tables) {
    const tableId = `${st.schema}.${st.table}`;
    addNode({
      id: tableId,
      type: 'source_table',
      label: `${st.schema.toUpperCase()}.${st.table}`,
      layer: st.schema.toUpperCase(),
      table: st.table,
    });

    for (const f of st.fields) {
      if (f.role === 'MEASURE' || f.role === 'DIMENSION' || f.role === 'FILTER') {
        const fieldId = `${tableId}.${f.name}`;
        addNode({
          id: fieldId,
          type: 'field',
          label: f.name,
          layer: st.schema.toUpperCase(),
          table: st.table,
          field: f.name,
          metadata: { role: f.role },
        });
        addEdge({ from: tableId, to: fieldId, label: f.role });
      }
    }
  }

  // 2. Transform node (the metric formula)
  const transformId = `transform:${metric.id}`;
  addNode({
    id: transformId,
    type: 'transform',
    label: metric.formula_template ?? metric.level_formulas[0]?.formula_text?.trim().split('\n')[0] ?? metric.name,
    metadata: {
      aggregation: metric.level_formulas.map(lf => `${lf.level}:${lf.aggregation_type}`).join(', '),
    },
  });

  // Connect source fields → transform
  for (const st of metric.source_tables) {
    for (const f of st.fields) {
      if (f.role === 'MEASURE' || f.role === 'DIMENSION' || f.role === 'FILTER') {
        addEdge({ from: `${st.schema}.${st.table}.${f.name}`, to: transformId, label: f.role === 'FILTER' ? 'FILTER' : undefined });
      }
    }
  }

  // 3. Output node (the metric result)
  const outputId = `metric:${metric.id}`;
  addNode({
    id: outputId,
    type: 'metric',
    label: `${metric.name} (${metric.abbreviation ?? metric.id})`,
    metadata: {
      unit_type: metric.unit_type,
      direction: metric.direction,
      domain: metric.domain_id,
    },
  });
  addEdge({ from: transformId, to: outputId });

  // 4. Upstream metric dependencies
  if (includeDepends && metric.depends_on.length > 0) {
    for (const depId of metric.depends_on) {
      const dep = allMetrics.get(depId);
      if (dep) {
        const depNodeId = `metric:${dep.id}`;
        addNode({
          id: depNodeId,
          type: 'metric',
          label: `${dep.name} (${dep.abbreviation ?? dep.id})`,
          metadata: { unit_type: dep.unit_type },
        });
        addEdge({ from: depNodeId, to: transformId, label: 'depends_on' });
      }
    }
  }

  return { nodes, edges };
}

export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const model = getSemanticModel();
    const { searchParams } = request.nextUrl;

    const metricId = searchParams.get('metric');
    if (!metricId) {
      return jsonError('metric parameter is required', { status: 400, code: 'MISSING_PARAM' });
    }

    const metric = model.metrics.find(m => m.id === metricId || m.catalogue_id === metricId);
    if (!metric) {
      return jsonError('Metric not found', { status: 404, code: 'NOT_FOUND' });
    }

    const depth = searchParams.get('depth');
    const includeDepends = depth === 'dependencies';
    const allMetrics = new Map(model.metrics.map(m => [m.id, m]));

    const dag = buildLineageDAG(metric, allMetrics, includeDepends);

    return cached(jsonSuccess({
      metric_id: metric.id,
      metric_name: metric.name,
      ...dag,
    }));
  });
}
