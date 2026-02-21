import type { L3Metric, LineageNode, LineageEdge, SourceField, CalculationDimension } from '@/data/l3-metrics';
import { CALCULATION_DIMENSION_LABELS } from '@/data/l3-metrics';

/** Build filter criteria string for lineage nodes from metric context and optional dimension. */
function lineageFilterCriteria(
  metric: L3Metric,
  calculationDimension?: CalculationDimension | null
): string | undefined {
  const parts: string[] = [];
  if (calculationDimension) {
    parts.push(`Dimension: ${CALCULATION_DIMENSION_LABELS[calculationDimension]}`);
  }
  if (metric.page) parts.push(`Page: ${metric.page}`);
  if (metric.section) parts.push(`Section: ${metric.section}`);
  return parts.length ? parts.join(' · ') : undefined;
}

/**
 * Generate nodes and edges for a metric that doesn't have pre-defined lineage.
 * Groups source fields by (layer, table) so that joins between tables are visually clear:
 * one node per table (with all its fields), then transform, then L3 output.
 * Optional calculationDimension is shown in transform/L3 node descriptions (at which grain the metric is calculated).
 * Filter criteria (dimension, page, section) are set on L2 and transform nodes so lineage shows how data is pulled.
 */
export function generateLineage(
  metric: L3Metric,
  calculationDimension?: CalculationDimension | null
): { nodes: LineageNode[]; edges: LineageEdge[] } {
  const sourceFields = metric.sourceFields ?? [];
  if (sourceFields.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];
  const dimLabel = calculationDimension ? CALCULATION_DIMENSION_LABELS[calculationDimension] : null;
  const filterCriteria = lineageFilterCriteria(metric, calculationDimension);

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
      filterCriteria,
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
    description: dimLabel ? `Calculation at ${dimLabel}` : 'Calculation',
    filterCriteria,
  });

  nodes.push({
    id: 'l3-output',
    layer: 'L3',
    table: 'metric',
    field: metric.name,
    sampleValue: metric.sampleValue || '—',
    formula: metric.formula,
    description: dimLabel ? `${metric.description || 'Result'} (at ${dimLabel})` : metric.description || 'Result',
  });

  edges.push({ from: 'transform-formula', to: 'l3-output', label: '→' });

  return { nodes, edges };
}

/** Return metric with lineage: use existing nodes/edges or generate from sourceFields. Optionally apply calculationDimension to transform/L3 descriptions and filterCriteria so lineage shows how data is pulled. */
export function metricWithLineage(
  metric: L3Metric,
  calculationDimension?: CalculationDimension | null
): L3Metric {
  const base = metric.nodes && metric.nodes.length > 0
    ? metric
    : (() => {
        const { nodes, edges } = generateLineage(metric, calculationDimension);
        return { ...metric, nodes, edges };
      })();

  if (!calculationDimension || !base.nodes) return base;

  const dimLabel = CALCULATION_DIMENSION_LABELS[calculationDimension];
  const overlayFilter = lineageFilterCriteria(metric, calculationDimension);

  // When dimension is set, overlay it on transform and L3 nodes and set filterCriteria on nodes that don't have it
  const nodes = base.nodes.map((n) => {
    if (n.layer === 'transform') {
      return {
        ...n,
        description: `Calculation at ${dimLabel}`,
        filterCriteria: n.filterCriteria ?? overlayFilter,
      };
    }
    if (n.layer === 'L3' && !base.edges?.some((e) => e.from === n.id)) {
      return { ...n, description: `${n.description || 'Result'} (at ${dimLabel})` };
    }
    if ((n.layer === 'L1' || n.layer === 'L2') && !n.filterCriteria && overlayFilter) {
      return { ...n, filterCriteria: overlayFilter };
    }
    return n;
  });
  return { ...base, nodes };
}
