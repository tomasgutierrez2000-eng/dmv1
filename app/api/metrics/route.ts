import { NextRequest, NextResponse } from 'next/server';
import { getMergedMetrics, readCustomMetrics, writeCustomMetrics, nextCustomMetricId } from '@/lib/metrics-store';
import type { L3Metric, DashboardPage } from '@/data/l3-metrics';
import { normalizeMetric, PAGES, validateMetric } from '@/lib/metrics-calculation';

export type MetricSource = 'builtin' | 'custom';

export interface MetricWithSource extends L3Metric {
  source: MetricSource;
}

/** GET: all metrics (single source). Query: ?page=P1 | ?id=M007 */
export async function GET(request: NextRequest) {
  const merged = getMergedMetrics();
  const withSource: MetricWithSource[] = merged.map(m => ({ ...m, source: 'custom' as MetricSource }));

  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page');
  const id = searchParams.get('id');
  let result: MetricWithSource[] = withSource;
  if (id) result = withSource.filter(m => m.id === id);
  else if (page && PAGES.includes(page as DashboardPage)) result = withSource.filter(m => m.page === page);

  return NextResponse.json(result);
}

/** POST: create a new custom metric */
export async function POST(request: NextRequest) {
  let body: Partial<L3Metric>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateMetric(body);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const custom = readCustomMetrics();
  const customIds = new Set(custom.map(m => m.id));

  let id = (body.id ?? '').trim();
  if (!id) id = nextCustomMetricId(custom);
  if (customIds.has(id)) {
    return NextResponse.json({ error: `A custom metric with id "${id}" already exists. Use PUT to update.` }, { status: 400 });
  }

  const metric = normalizeMetric(body, id);
  custom.push(metric);
  writeCustomMetrics(custom);
  return NextResponse.json({ ...metric, source: 'custom' });
}
