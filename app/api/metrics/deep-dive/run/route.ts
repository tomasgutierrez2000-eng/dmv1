import { NextRequest, NextResponse } from 'next/server';
import {
  VALID_CALCULATION_DIMENSIONS,
  getMetricForCalculation,
  listMetricAsOfDates,
  resolveAllowedDimensions,
  runMetricCalculation,
} from '@/lib/metrics-calculation';
import { isDeepDiveMetric } from '@/lib/deep-dive/scope';
import type { CalculationDimension } from '@/data/l3-metrics';

/** POST: run metric calculation on L1/L2 sample data */
export async function POST(request: NextRequest) {
  let body: { metricId: string; dimension: CalculationDimension; asOfDate?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { metricId, dimension, asOfDate } = body;
  if (!metricId || typeof metricId !== 'string') {
    return NextResponse.json({ error: 'metricId is required' }, { status: 400 });
  }
  if (!isDeepDiveMetric(metricId)) {
    return NextResponse.json({ error: 'Deep dive is currently enabled for 8 metrics only (C100-C107).' }, { status: 400 });
  }
  if (!dimension || !VALID_CALCULATION_DIMENSIONS.includes(dimension)) {
    return NextResponse.json({ error: 'dimension must be one of: ' + VALID_CALCULATION_DIMENSIONS.join(', ') }, { status: 400 });
  }

  const metric = getMetricForCalculation(metricId);
  if (!metric) {
    return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
  }

  const allowed = resolveAllowedDimensions(metric);
  if (!allowed.includes(dimension)) {
    return NextResponse.json({ error: `Metric does not support dimension: ${dimension}` }, { status: 400 });
  }

  const result = await runMetricCalculation({
    metric,
    dimension,
    asOfDate: asOfDate ?? null,
  });
  return NextResponse.json(result);
}

/** GET: optional - return available as_of_dates for a metric (for UI selector) */
export async function GET(request: NextRequest) {
  const metricId = request.nextUrl.searchParams.get('metricId');
  const dimension = request.nextUrl.searchParams.get('dimension') as CalculationDimension | null;
  if (!metricId) {
    return NextResponse.json({ error: 'metricId required' }, { status: 400 });
  }
  if (!isDeepDiveMetric(metricId)) {
    return NextResponse.json({ error: 'Deep dive is currently enabled for 8 metrics only (C100-C107).' }, { status: 400 });
  }

  const metric = getMetricForCalculation(metricId);
  if (!metric) {
    return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
  }

  const dim = dimension && VALID_CALCULATION_DIMENSIONS.includes(dimension) ? dimension : ('L2' as CalculationDimension);
  const dates = listMetricAsOfDates(metric, dim);
  return NextResponse.json({ asOfDates: dates });
}
