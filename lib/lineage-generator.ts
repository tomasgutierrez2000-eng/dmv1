import type { L3Metric, LineageNode, LineageEdge, SourceField } from '@/data/l3-metrics';

/**
 * Generate nodes and edges for a metric that doesn't have pre-defined lineage.
 * One node per source field (L1/L2), one transform node (formula), one L3 output node.
 */
export function generateLineage(metric: L3Metric): { nodes: LineageNode[]; edges: LineageEdge[] } {
  const sourceFields = metric.sourceFields ?? [];
  if (sourceFields.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];

  sourceFields.forEach((sf: SourceField, i: number) => {
    const id = `src-${i}-${sf.layer}-${sf.table}-${sf.field}`.replace(/\s/g, '-');
    nodes.push({
      id,
      layer: sf.layer,
      table: sf.table,
      field: sf.field,
      description: sf.description,
      sampleValue: sf.sampleValue,
    });
    edges.push({ from: id, to: 'transform-formula', label: '→' });
  });

  nodes.push({
    id: 'transform-formula',
    layer: 'transform',
    table: '',
    field: 'Formula',
    formula: metric.formula,
    sampleValue: metric.sampleValue || '—',
    description: 'Calculation',
  });

  nodes.push({
    id: 'l3-output',
    layer: 'L3',
    table: 'metric',
    field: metric.name,
    sampleValue: metric.sampleValue || '—',
    formula: metric.formula,
    description: metric.description || 'Result',
  });

  edges.push({ from: 'transform-formula', to: 'l3-output', label: '→' });

  return { nodes, edges };
}

/** Return metric with lineage: use existing nodes/edges or generate from sourceFields. */
export function metricWithLineage(metric: L3Metric): L3Metric {
  if (metric.nodes && metric.nodes.length > 0) {
    return metric;
  }
  const { nodes, edges } = generateLineage(metric);
  return { ...metric, nodes, edges };
}
