import { NextRequest, NextResponse } from 'next/server';
import { getMergedMetrics } from '@/lib/metrics-store';
import {
  getMetricForCalculation,
  resolveAllowedDimensions,
  runMetricCalculation,
} from '@/lib/metrics-calculation';
import {
  CONSUMPTION_LEVELS,
  CONSUMPTION_LEVEL_TO_DIMENSION,
  type ConsumptionLevel,
} from '@/data/l3-metrics';
import {
  buildMetricValueRowsFromRunOutput,
  getMetricValueRowsFromDb,
  type MetricValueRow,
} from '@/lib/metrics-value-store';

const DEFAULT_RUN_VERSION = 'default';

/**
 * GET /api/metrics/values
 * Query params: level (required), metricId (optional — if omitted, returns all metrics at level),
 * variantId, asOfDate, runVersion, facilityId, counterpartyId, deskId, portfolioId, lobId (optional).
 * Returns pre-calculated metric values; when no SQL store is configured, runs calculation on demand.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const metricId = searchParams.get('metricId');
  const variantId = searchParams.get('variantId') || undefined;
  const level = searchParams.get('level') as ConsumptionLevel | null;
  const asOfDate = searchParams.get('asOfDate') || undefined;
  const runVersion = searchParams.get('runVersion') || DEFAULT_RUN_VERSION;
  const facilityId = searchParams.get('facilityId') || undefined;
  const counterpartyId = searchParams.get('counterpartyId') || undefined;
  const deskId = searchParams.get('deskId') || undefined;
  const portfolioId = searchParams.get('portfolioId') || undefined;
  const lobId = searchParams.get('lobId') || undefined;

  if (!level || !CONSUMPTION_LEVELS.includes(level)) {
    return NextResponse.json(
      { error: `level is required and must be one of: ${CONSUMPTION_LEVELS.join(', ')}` },
      { status: 400 }
    );
  }

  const dimension = CONSUMPTION_LEVEL_TO_DIMENSION[level];
  const trimmedMetricId = typeof metricId === 'string' ? metricId.trim() : '';

  const applyFilters = (rows: MetricValueRow[]): MetricValueRow[] => {
    let out = rows;
    if (facilityId !== undefined) out = out.filter((r) => r.facility_id === facilityId);
    if (counterpartyId !== undefined) out = out.filter((r) => r.counterparty_id === counterpartyId);
    if (deskId !== undefined) out = out.filter((r) => r.desk_id === deskId);
    if (portfolioId !== undefined) out = out.filter((r) => r.portfolio_id === portfolioId);
    if (lobId !== undefined) out = out.filter((r) => r.lob_id === lobId);
    return out;
  };

  // All metrics at this dimension (no metricId)
  if (!trimmedMetricId) {
    const merged = getMergedMetrics();
    const metricsAtLevel = merged.filter((m) => resolveAllowedDimensions(m).includes(dimension));
    const asOfDateUsed = asOfDate ?? '';

    const dbRows = await getMetricValueRowsFromDb({
      level,
      runVersion,
      asOfDate: asOfDateUsed,
    });
    if (dbRows !== null && dbRows.length > 0) {
      const byMetric = new Map<string, MetricValueRow[]>();
      for (const row of dbRows) {
        const list = byMetric.get(row.metric_id) ?? [];
        list.push(row);
        byMetric.set(row.metric_id, list);
      }
      const results = metricsAtLevel.map((metric) => ({
        metric: { id: metric.id, name: metric.name, displayFormat: metric.displayFormat },
        rows: applyFilters(byMetric.get(metric.id) ?? []),
      }));
      const firstAsOf = results[0]?.rows?.[0]?.as_of_date ?? asOfDateUsed;
      return NextResponse.json({
        level,
        asOfDate: firstAsOf,
        runVersion,
        metrics: results,
      });
    }

    const results: { metric: { id: string; name: string; displayFormat?: string }; rows: MetricValueRow[] }[] = [];
    const errors: { metricId: string; error: string }[] = [];

    for (const metric of metricsAtLevel) {
      const runOutput = await runMetricCalculation({
        metric,
        dimension,
        asOfDate: asOfDate ?? null,
      });
      if (!runOutput.ok) {
        errors.push({ metricId: metric.id, error: runOutput.error || 'Calculation failed' });
        continue;
      }
      const runAsOf = runOutput.asOfDateUsed ?? asOfDate ?? '';
      const rows = buildMetricValueRowsFromRunOutput(
        metric.id,
        dimension,
        runAsOf,
        runVersion,
        runOutput,
        variantId
      );
      results.push({
        metric: { id: metric.id, name: metric.name, displayFormat: metric.displayFormat },
        rows: applyFilters(rows),
      });
    }

    const firstAsOf = results[0]?.rows?.[0]?.as_of_date ?? asOfDate ?? '';
    return NextResponse.json({
      level,
      asOfDate: firstAsOf,
      runVersion,
      metrics: results,
      ...(errors.length > 0 && { errors }),
    });
  }

  // Single metric
  const metric = getMetricForCalculation(trimmedMetricId);
  if (!metric) {
    return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
  }

  const allowed = resolveAllowedDimensions(metric);
  if (!allowed.includes(dimension)) {
    return NextResponse.json(
      { error: `Metric does not support level: ${level}` },
      { status: 400 }
    );
  }

  const asOfDateUsed = asOfDate ?? '';
  const dbRows = await getMetricValueRowsFromDb({
    level,
    runVersion,
    asOfDate: asOfDateUsed,
    metricId: trimmedMetricId,
  });
  if (dbRows !== null && dbRows.length > 0) {
    return NextResponse.json({
      metric: {
        id: metric.id,
        name: metric.name,
        displayFormat: metric.displayFormat,
      },
      level,
      asOfDate: asOfDateUsed,
      runVersion,
      rows: applyFilters(dbRows),
    });
  }

  const runOutput = await runMetricCalculation({
    metric,
    dimension,
    asOfDate: asOfDate ?? null,
  });

  if (!runOutput.ok) {
    return NextResponse.json(
      { error: runOutput.error, hint: runOutput.hint },
      { status: 422 }
    );
  }

  const runAsOf = runOutput.asOfDateUsed ?? asOfDate ?? '';
  const rows: MetricValueRow[] = buildMetricValueRowsFromRunOutput(
    trimmedMetricId,
    dimension,
    runAsOf,
    runVersion,
    runOutput,
    variantId
  );

  return NextResponse.json({
    metric: {
      id: metric.id,
      name: metric.name,
      displayFormat: metric.displayFormat,
    },
    level,
    asOfDate: runAsOf,
    runVersion,
    rows: applyFilters(rows),
  });
}
