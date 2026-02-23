import { NextRequest, NextResponse } from 'next/server';
import { getMappings } from '@/lib/source-mapping/store';

/**
 * GET /api/source-mapping/lineage?direction=backward&metric_ref_type=variant&metric_ref_id=CRE
 * GET /api/source-mapping/lineage?direction=forward&source_system_id=SRC-001
 * Backward: from metric to source path. Forward: from source to metrics.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const direction = searchParams.get('direction') ?? 'backward';
  const metric_ref_type = searchParams.get('metric_ref_type');
  const metric_ref_id = searchParams.get('metric_ref_id');
  const source_system_id = searchParams.get('source_system_id');

  if (direction === 'backward') {
    if (!metric_ref_type || !metric_ref_id) {
      return NextResponse.json({ error: 'backward requires metric_ref_type and metric_ref_id' }, { status: 400 });
    }
    const mappings = getMappings({ metric_ref_type, metric_ref_id });
    const nodes: Array<{ id: string; label: string; type: string }> = [];
    const edges: Array<{ from: string; to: string }> = [];
    const metricNodeId = `metric-${metric_ref_type}-${metric_ref_id}`;
    nodes.push({ id: metricNodeId, label: metric_ref_id, type: 'metric' });
    for (const m of mappings) {
      if (m.source_path) {
        const parts = m.source_path.split(' → ');
        let prev = metricNodeId;
        for (let i = parts.length - 1; i >= 0; i--) {
          const nid = `src-${m.mapping_id}-${i}`;
          nodes.push({ id: nid, label: parts[i].trim(), type: 'source' });
          edges.push({ from: nid, to: prev });
          prev = nid;
        }
      }
    }
    return NextResponse.json({ nodes, edges });
  }

  if (direction === 'forward') {
    if (!source_system_id) {
      return NextResponse.json({ error: 'forward requires source_system_id' }, { status: 400 });
    }
    const mappings = getMappings();
    const filtered = mappings.filter((m) => m.source_path?.includes(source_system_id));
    const nodes: Array<{ id: string; label: string; type: string }> = [];
    const edges: Array<{ from: string; to: string }> = [];
    const sysNodeId = `sys-${source_system_id}`;
    nodes.push({ id: sysNodeId, label: source_system_id, type: 'source_system' });
    for (const m of filtered) {
      const metricNodeId = `metric-${m.metric_ref_type}-${m.metric_ref_id}`;
      nodes.push({ id: metricNodeId, label: m.metric_ref_id, type: 'metric' });
      edges.push({ from: sysNodeId, to: metricNodeId });
    }
    return NextResponse.json({ nodes, edges });
  }

  return NextResponse.json({ error: 'direction must be backward or forward' }, { status: 400 });
}
