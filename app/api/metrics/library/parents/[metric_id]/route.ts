import { NextRequest } from 'next/server';
import { getParentMetric, getVariants } from '@/lib/metric-library/store';
import { jsonSuccess, jsonError } from '@/lib/api-response';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ metric_id: string }> }
) {
  const { metric_id } = await params;
  const parent = getParentMetric(metric_id);
  if (!parent) {
    return jsonError('Parent metric not found', { status: 404 });
  }
  const variants = getVariants({ parent_metric_id: metric_id });
  return jsonSuccess({ ...parent, variants });
}
