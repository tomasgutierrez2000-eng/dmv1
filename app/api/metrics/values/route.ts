import { NextRequest } from 'next/server';
import { getMergedMetrics } from '@/lib/metrics-store';
import {
  CONSUMPTION_LEVELS,
  CONSUMPTION_LEVEL_TO_DIMENSION,
  type ConsumptionLevel,
} from '@/data/l3-metrics';
import {
  getMetricValueRowsFromDb,
  type MetricValueRow,
} from '@/lib/metrics-value-store';
import { jsonSuccess, jsonError } from '@/lib/api-response';

const DEFAULT_RUN_VERSION = 'default';

/**
 * GET /api/metrics/values
 * Pure L3 reader — returns pre-calculated metric values from l3.metric_value_fact.
 * Query params: level (required), metricId (optional), asOfDate, runVersion,
 * facilityId, counterpartyId, deskId, portfolioId, lobId (optional filters).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const metricId = searchParams.get('metricId');
  const level = searchParams.get('level') as ConsumptionLevel | null;
  const asOfDate = searchParams.get('asOfDate') || undefined;
  const runVersion = searchParams.get('runVersion') || DEFAULT_RUN_VERSION;
  const facilityId = searchParams.get('facilityId') || undefined;
  const counterpartyId = searchParams.get('counterpartyId') || undefined;
  const deskId = searchParams.get('deskId') || undefined;
  const portfolioId = searchParams.get('portfolioId') || undefined;
  const lobId = searchParams.get('lobId') || undefined;

  if (!level || !CONSUMPTION_LEVELS.includes(level)) {
    return jsonError(`level is required and must be one of: ${CONSUMPTION_LEVELS.join(', ')}`, { status: 400 });
  }

  const trimmedMetricId = typeof metricId === 'string' ? metricId.trim() : '';
  const asOfDateUsed = asOfDate ?? '';

  // Build a metadata lookup from merged metrics (C001-style + Excel/JSON)
  const merged = getMergedMetrics();
  const metaMap = new Map(merged.map((m) => [m.id, { id: m.id, name: m.name, displayFormat: m.displayFormat }]));

  const applyFilters = (rows: MetricValueRow[]): MetricValueRow[] => {
    let out = rows;
    if (facilityId !== undefined) out = out.filter((r) => r.facility_id === facilityId);
    if (counterpartyId !== undefined) out = out.filter((r) => r.counterparty_id === counterpartyId);
    if (deskId !== undefined) out = out.filter((r) => r.desk_id === deskId);
    if (portfolioId !== undefined) out = out.filter((r) => r.portfolio_id === portfolioId);
    if (lobId !== undefined) out = out.filter((r) => r.lob_id === lobId);
    return out;
  };

  // Query L3 directly
  const dbRows = await getMetricValueRowsFromDb({
    level,
    runVersion,
    asOfDate: asOfDateUsed,
    ...(trimmedMetricId && { metricId: trimmedMetricId }),
  });
  const rows = dbRows ?? [];

  // Single metric
  if (trimmedMetricId) {
    const meta = metaMap.get(trimmedMetricId) ?? { id: trimmedMetricId, name: trimmedMetricId };
    return jsonSuccess({
      metric: meta,
      level,
      asOfDate: rows[0]?.as_of_date ?? asOfDateUsed,
      runVersion,
      rows: applyFilters(rows),
    });
  }

  // All metrics at this level — group by metric_id
  const byMetric = new Map<string, MetricValueRow[]>();
  for (const row of rows) {
    const list = byMetric.get(row.metric_id) ?? [];
    list.push(row);
    byMetric.set(row.metric_id, list);
  }

  const results = Array.from(byMetric.entries()).map(([mid, mRows]) => ({
    metric: metaMap.get(mid) ?? { id: mid, name: mid },
    rows: applyFilters(mRows),
  }));

  const firstAsOf = results[0]?.rows?.[0]?.as_of_date ?? asOfDateUsed;
  return jsonSuccess({
    level,
    asOfDate: firstAsOf,
    runVersion,
    metrics: results,
  });
}
