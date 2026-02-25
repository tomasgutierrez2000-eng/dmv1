import { NextRequest, NextResponse } from 'next/server';
import { getMergedMetrics, readCustomMetrics, writeCustomMetrics, nextCustomMetricId, isReadOnlyFsError } from '@/lib/metrics-store';
import type { L3Metric, DashboardPage } from '@/data/l3-metrics';
import { normalizeMetric, PAGES, validateMetric } from '@/lib/metrics-calculation';
import { getParentMetric, upsertParentMetric, saveVariant } from '@/lib/metric-library/store';
import type { MetricVariant, ParentMetric } from '@/lib/metric-library/types';

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
  try {
    writeCustomMetrics(custom);
  } catch (err) {
    return NextResponse.json(
      { error: isReadOnlyFsError(err) ? 'Saving metrics is not available on this deployment (read-only filesystem). Use a local build or import/export to persist.' : 'Failed to write metrics.' },
      { status: 503 }
    );
  }

  // Also add to the Metric Library as a variant under the DSCR parent metric.
  try {
    const DSCR_PARENT_ID = 'DSCR';
    if (!getParentMetric(DSCR_PARENT_ID)) {
      const dscrParent: ParentMetric = {
        metric_id: DSCR_PARENT_ID,
        metric_name: 'Debt Service Coverage Ratio',
        definition: 'Measures the ability of cash flow to cover debt service obligations.',
        generic_formula: 'Cash Flow / Debt Service',
        metric_class: 'CALCULATED',
        unit_type: 'RATIO',
        direction: 'HIGHER_BETTER',
        rollup_philosophy: 'Weighted average by EAD at each level',
        domain_ids: ['credit_risk'],
      };
      upsertParentMetric(dscrParent);
    }

    const variant: MetricVariant = {
      variant_id: metric.id,
      variant_name: metric.name,
      parent_metric_id: DSCR_PARENT_ID,
      variant_type: 'CALCULATED',
      status: 'DRAFT',
      formula_display: metric.formula || '',
      rollup_logic: {
        facility: 'Raw calculated value',
        counterparty: 'SUM(dscr * facility_ead) / SUM(facility_ead)',
        desk: 'SUM(dscr * cpty_ead) / SUM(cpty_ead)',
        portfolio: 'SUM(dscr * desk_ead) / SUM(desk_ead)',
        lob: 'SUM(dscr * portfolio_ead) / SUM(portfolio_ead)',
      },
      weighting_basis: 'BY_EAD',
      executable_metric_id: metric.id,
    };
    saveVariant(variant);
  } catch {
    // Library write is best-effort; metric was already saved successfully.
  }

  return NextResponse.json({ ...metric, source: 'custom' });
}
