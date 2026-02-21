import { NextRequest, NextResponse } from 'next/server';
import { getVariants, getVariant, addVariant } from '@/lib/metric-library/store';
import { isReadOnlyFsError } from '@/lib/metrics-store';
import type { MetricVariant } from '@/lib/metric-library/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parent_metric_id = searchParams.get('parent') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const domain_id = searchParams.get('domain') ?? undefined;
  const executable_only = searchParams.get('executable_only') === 'true';

  const variants = getVariants({
    parent_metric_id,
    status,
    domain_id,
    executable_only,
  });
  return NextResponse.json(variants);
}

export async function POST(request: NextRequest) {
  let body: MetricVariant;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const variant_id = (body.variant_id ?? '').trim();
  const parent_metric_id = (body.parent_metric_id ?? '').trim();
  const variant_name = (body.variant_name ?? '').trim();
  if (!variant_id || !parent_metric_id || !variant_name) {
    return NextResponse.json(
      { error: 'variant_id, parent_metric_id, and variant_name are required' },
      { status: 400 }
    );
  }

  try {
    addVariant({
      ...body,
      variant_id,
      parent_metric_id,
      variant_name,
      status: body.status ?? 'DRAFT',
      version: body.version ?? 'v1.0',
      effective_date: body.effective_date ?? new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to add variant';
    if (isReadOnlyFsError(err)) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const variant = getVariant(variant_id);
  return NextResponse.json(variant ?? body);
}
