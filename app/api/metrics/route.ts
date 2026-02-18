import { NextRequest, NextResponse } from 'next/server';
import { getMergedMetrics, readCustomMetrics, writeCustomMetrics, nextCustomMetricId } from '@/lib/metrics-store';
import type { L3Metric, DashboardPage, MetricType } from '@/data/l3-metrics';

export type MetricSource = 'builtin' | 'custom';

export interface MetricWithSource extends L3Metric {
  source: MetricSource;
}

const PAGES: DashboardPage[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
const METRIC_TYPES: MetricType[] = ['Aggregate', 'Ratio', 'Count', 'Derived', 'Status', 'Trend', 'Table', 'Categorical'];

function normalizeMetric(m: Partial<L3Metric>, id: string): L3Metric {
  return {
    id,
    name: m.name ?? '',
    page: PAGES.includes(m.page!) ? m.page! : 'P1',
    section: m.section ?? '',
    metricType: METRIC_TYPES.includes(m.metricType!) ? m.metricType! : 'Derived',
    formula: m.formula ?? '',
    formulaSQL: m.formulaSQL,
    description: m.description ?? '',
    displayFormat: m.displayFormat ?? '',
    sampleValue: m.sampleValue ?? '',
    sourceFields: Array.isArray(m.sourceFields) ? m.sourceFields : [],
    dimensions: Array.isArray(m.dimensions) ? m.dimensions : [],
    toggles: m.toggles,
    notes: m.notes,
    nodes: m.nodes,
    edges: m.edges,
  };
}

function validateMetric(m: Partial<L3Metric>): { ok: boolean; error?: string } {
  if (!m.name?.trim()) return { ok: false, error: 'name is required' };
  if (!m.formula?.trim()) return { ok: false, error: 'formula is required' };
  if (!Array.isArray(m.sourceFields) || m.sourceFields.length === 0)
    return { ok: false, error: 'at least one source field is required' };
  for (const sf of m.sourceFields) {
    if (!sf.layer || !sf.table?.trim() || !sf.field?.trim())
      return { ok: false, error: 'each source field must have layer, table, and field' };
    if (sf.layer !== 'L1' && sf.layer !== 'L2')
      return { ok: false, error: 'source field layer must be L1 or L2' };
  }
  if (m.page && !PAGES.includes(m.page as DashboardPage))
    return { ok: false, error: `page must be one of: ${PAGES.join(', ')}` };
  if (m.metricType && !METRIC_TYPES.includes(m.metricType as MetricType))
    return { ok: false, error: `metricType must be one of: ${METRIC_TYPES.join(', ')}` };
  return { ok: true };
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
