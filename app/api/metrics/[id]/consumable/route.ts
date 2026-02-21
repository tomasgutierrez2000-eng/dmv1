import { NextRequest, NextResponse } from 'next/server';
import { getMergedMetrics } from '@/lib/metrics-store';
import { resolveAllowedDimensions } from '@/lib/metrics-calculation';
import type { CalculationDimension } from '@/data/l3-metrics';
import { CALCULATION_DIMENSION_LABELS, DIMENSION_TO_CONSUMPTION_LEVEL } from '@/data/l3-metrics';

export interface ConsumableMetricDetail {
  id: string;
  name: string;
  description: string;
  allowedLevels: { dimension: CalculationDimension; label: string; level: string }[];
  exampleUrls: Record<string, string>;
  rollupSummary: string;
  displayFormat?: string;
}

/** GET: single metric consumable info for "Add to dashboard" / API snippet. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: 'Metric id is required' }, { status: 400 });
  }
  const merged = getMergedMetrics();
  const metric = merged.find((m) => m.id === id.trim());
  if (!metric) {
    return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
  }

  const baseUrl = request.nextUrl.origin;
  const allowed = resolveAllowedDimensions(metric);
  const allowedLevels = allowed.map((dim) => ({
    dimension: dim,
    label: CALCULATION_DIMENSION_LABELS[dim],
    level: DIMENSION_TO_CONSUMPTION_LEVEL[dim],
  }));
  const exampleUrls: Record<string, string> = {};
  const safeId = id.trim();
  for (const { level } of allowedLevels) {
    exampleUrls[level] = `${baseUrl}/api/metrics/values?metricId=${encodeURIComponent(safeId)}&level=${level}&asOfDate=`;
  }

  const rollupSummary = getDefaultRollupSummary();

  const body: ConsumableMetricDetail = {
    id: metric.id,
    name: metric.name,
    description: metric.description ?? '',
    allowedLevels,
    exampleUrls,
    rollupSummary,
    displayFormat: metric.displayFormat,
  };

  return NextResponse.json(body);
}

function getDefaultRollupSummary(): string {
  return 'Facility → Counterparty: sum or weighted aggregate; Counterparty → Desk: commitment-weighted average; Desk → Portfolio → LOB: roll up by hierarchy.';
}
