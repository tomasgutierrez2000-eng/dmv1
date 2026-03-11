import { NextRequest } from 'next/server';
import { getVariantByExecutableMetricId, getParentMetric } from '@/lib/metric-library/store';
import { jsonSuccess, jsonError } from '@/lib/api-response';

/** Resolve library variant (and parent) by L3 metric id (executable_metric_id). For deep-links from dashboard/engine. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ metric_id: string }> }
) {
  const { metric_id } = await params;
  const variant = getVariantByExecutableMetricId(metric_id);
  if (!variant) {
    return jsonError('No library variant found for this metric', { status: 404 });
  }
  const parent = getParentMetric(variant.parent_metric_id);
  return jsonSuccess({ variant, parent });
}
