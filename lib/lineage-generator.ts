import type { L3Metric, LineageNode, LineageEdge, SourceField } from '@/data/l3-metrics';

/**
 * Generate nodes and edges for a metric that doesn't have pre-defined lineage.
 * Groups source fields by (layer, table) so that joins between tables are visually clear:
 * one node per table (with all its fields), then transform, then L3 output.
 */
export function generateLineage(metric: L3Metric): { nodes: LineageNode[]; edges: LineageEdge[] } {
  const sourceFields = metric.sourceFields ?? [];
  if (sourceFields.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];

  // Group by (layer, table) so we show one node per table — tells the "two tables" story
  const byTable = new Map<string, SourceField[]>();
  for (const sf of sourceFields) {
    const key = `${sf.layer}:${sf.table}`;
    if (!byTable.has(key)) byTable.set(key, []);
    byTable.get(key)!.push(sf);
  }

  byTable.forEach((fields, key) => {
    const [layer, table] = key.split(':') as [string, string];
    const fieldNames = fields.map(f => f.field);
    const id = `table-${layer}-${table}`.replace(/\s/g, '-');
    const first = fields[0];
    nodes.push({
      id,
      layer: layer as 'L1' | 'L2',
      table,
      field: fieldNames.length === 1 ? fieldNames[0] : fieldNames.join(', '),
      fields: fieldNames.length > 1 ? fieldNames : undefined,
      description: fieldNames.length === 1 ? first.description : `Fields: ${fieldNames.join(', ')}`,
      sampleValue: first.sampleValue,
    });
    edges.push({ from: id, to: 'transform-formula', label: fieldNames.length > 1 ? `${fieldNames.length} fields` : '→' });
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
