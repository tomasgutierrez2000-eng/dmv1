import { NextRequest } from 'next/server';
import { getVariants, addVariant, getVariant } from '@/lib/metric-library/store';
import type { MetricVariant } from '@/lib/metric-library/types';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';

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
  return jsonSuccess(variants);
}

export async function POST(request: NextRequest) {
  let body: MetricVariant;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', { status: 400 });
  }

  const variant_id = (body.variant_id ?? '').trim();
  const parent_metric_id = (body.parent_metric_id ?? '').trim();
  const variant_name = (body.variant_name ?? '').trim();
  if (!variant_id || !parent_metric_id || !variant_name) {
    return jsonError('variant_id, parent_metric_id, and variant_name are required', { status: 400 });
  }

  try {
    addVariant({
      ...body,
      variant_id,
      parent_metric_id,
      variant_name,
      status: body.status ?? 'DRAFT',
    });
  } catch (err) {
    const normalized = normalizeCaughtError(err);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }

  const variant = getVariant(variant_id);
  return jsonSuccess(variant ?? body);
}
