import { NextRequest, NextResponse } from 'next/server';
import { getVariant, getVariants } from '@/lib/metric-library/store';
import type { LineageNodeRef } from '@/lib/metric-library/types';

/**
 * GET /api/metrics/library/variants/[variant_id]/dependencies
 * Returns upstream (what this metric depends on) and downstream (what depends on this metric).
 * Used for dependency graph navigation per Data Lineage & Source Mapping Platform.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ variant_id: string }> }
) {
  const { variant_id } = await params;
  const variant = getVariant(variant_id);
  if (!variant) {
    return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  }

  const upstreamRaw = (Array.isArray(variant.upstream_inputs) ? variant.upstream_inputs : []) as (LineageNodeRef | string)[];
  const upstream = upstreamRaw
    .filter((x): x is LineageNodeRef | string => x != null)
    .map((x) =>
      typeof x === 'string'
        ? { node_id: `ref-${x}`, node_name: x }
        : { node_id: x.node_id ?? x.node_name, node_name: x.node_name, node_type: x.node_type, data_tier: x.data_tier, table: x.table, field: x.field, description: x.description }
    );

  // Downstream: use variant.downstream_consumers if set; else find variants that reference this one in upstream_inputs
  let downstream: Array<{ node_id: string; node_name: string; variant_id?: string }> = [];
  const downstreamRaw = (Array.isArray(variant.downstream_consumers) ? variant.downstream_consumers : []) as (LineageNodeRef | string)[];
  if (downstreamRaw.length > 0) {
    downstream = downstreamRaw
      .filter((x): x is LineageNodeRef | string => x != null)
      .map((x) =>
        typeof x === 'string'
          ? { node_id: `ref-${x}`, node_name: x }
          : { node_id: x.node_id ?? x.node_name, node_name: x.node_name }
      );
  } else {
    const all = getVariants();
    for (const v of all) {
      if (v.variant_id === variant_id) continue;
      const inputs = (Array.isArray(v.upstream_inputs) ? v.upstream_inputs : []) as (LineageNodeRef | string)[];
      const refsThis = inputs.some((ref) => {
        if (typeof ref === 'string') return ref === variant_id;
        return (ref.node_id === variant_id || ref.node_name === variant.variant_name) ?? false;
      });
      if (refsThis) {
        downstream.push({ node_id: v.variant_id, node_name: v.variant_name, variant_id: v.variant_id });
      }
    }
  }

  return NextResponse.json({
    variant_id,
    variant_name: variant.variant_name,
    upstream,
    downstream,
  });
}
