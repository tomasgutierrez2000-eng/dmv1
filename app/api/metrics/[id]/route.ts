import { NextRequest, NextResponse } from 'next/server';
import { getMergedMetrics, readCustomMetrics, writeCustomMetrics } from '@/lib/metrics-store';
import type { L3Metric, DashboardPage, MetricType } from '@/data/l3-metrics';

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

/** GET one metric (merged: custom overrides built-in) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const merged = getMergedMetrics();
  const metric = merged.find(m => m.id === id);
  if (!metric) return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
  const customIds = new Set(readCustomMetrics().map(m => m.id));
  const source = customIds.has(id) ? 'custom' : 'builtin';
  return NextResponse.json({ ...metric, source });
}

/** PUT: update a custom metric */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: Partial<L3Metric>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateMetric({ ...body, id });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const custom = readCustomMetrics();
  const index = custom.findIndex(m => m.id === id);
  const existing = index >= 0 ? custom[index] : null;
  const metric = normalizeMetric({ ...existing, ...body }, id);
  if (index >= 0) {
    custom[index] = metric;
  } else {
    custom.push(metric);
  }
  writeCustomMetrics(custom);
  return NextResponse.json({ ...metric, source: 'custom' });
}

/** DELETE: remove a custom metric */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const custom = readCustomMetrics();
  const filtered = custom.filter(m => m.id !== id);
  if (filtered.length === custom.length) {
    return NextResponse.json({ error: 'Metric not found or is built-in (only custom metrics can be deleted)' }, { status: 404 });
  }
  writeCustomMetrics(filtered);
  return new NextResponse(null, { status: 204 });
}
