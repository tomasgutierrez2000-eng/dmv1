import { NextRequest, NextResponse } from 'next/server';
import { getParentMetric, getVariants, refreshParentVariantCounts } from '@/lib/metric-library/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ metric_id: string }> }
) {
  const { metric_id } = await params;
  refreshParentVariantCounts();
  const parent = getParentMetric(metric_id);
  if (!parent) {
    return NextResponse.json({ error: 'Parent metric not found' }, { status: 404 });
  }
  const variants = getVariants({ parent_metric_id: metric_id });
  return NextResponse.json({ ...parent, variants });
}
