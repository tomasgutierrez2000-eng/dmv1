import { NextRequest, NextResponse } from 'next/server';
import { getVariant, saveVariant, getParentMetric } from '@/lib/metric-library/store';
import type { MetricVariant } from '@/lib/metric-library/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ variant_id: string }> }
) {
  const { variant_id } = await params;
  const variant = getVariant(variant_id);
  if (!variant) {
    return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  }
  const parent = variant.parent_metric_id ? getParentMetric(variant.parent_metric_id) : null;
  return NextResponse.json({
    variant,
    parent: parent ? { metric_id: parent.metric_id, metric_name: parent.metric_name } : null,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ variant_id: string }> }
) {
  const { variant_id } = await params;
  const existing = getVariant(variant_id);
  if (!existing) {
    return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  }

  let body: Partial<MetricVariant>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updated: MetricVariant = {
    ...existing,
    ...body,
    variant_id: existing.variant_id,
    updated_at: new Date().toISOString(),
  };
  saveVariant(updated);
  return NextResponse.json(updated);
}
