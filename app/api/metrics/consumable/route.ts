import { NextRequest, NextResponse } from 'next/server';
import { getMergedMetrics } from '@/lib/metrics-store';
import { resolveAllowedDimensions } from '@/lib/metrics-calculation';
import type { CalculationDimension } from '@/data/l3-metrics';
import { CALCULATION_DIMENSION_LABELS, DIMENSION_TO_CONSUMPTION_LEVEL } from '@/data/l3-metrics';

export interface ConsumableMetricItem {
  id: string;
  name: string;
  description: string;
  allowedLevels: { dimension: CalculationDimension; label: string; level: string }[];
  exampleUrl: string;
  rollupSummary?: string;
}

/** GET: list all metrics with consumable info (allowed levels, example API URL). */
export async function GET(request: NextRequest) {
  const merged = getMergedMetrics();
  const baseUrl = request.nextUrl.origin;

  const metrics: ConsumableMetricItem[] = merged.map((m) => {
    const allowed = resolveAllowedDimensions(m);
    const allowedLevels = allowed.map((dim) => ({
      dimension: dim,
      label: CALCULATION_DIMENSION_LABELS[dim],
      level: DIMENSION_TO_CONSUMPTION_LEVEL[dim],
    }));
    const firstLevel = allowedLevels[0]?.level ?? 'facility';
    const exampleUrl = `${baseUrl}/api/metrics/values?metricId=${encodeURIComponent(m.id)}&level=${firstLevel}&asOfDate=`;
    return {
      id: m.id,
      name: m.name,
      description: m.description ?? '',
      allowedLevels,
      exampleUrl,
      rollupSummary: getDefaultRollupSummary(),
    };
  });

  return NextResponse.json({ metrics });
}

function getDefaultRollupSummary(): string {
  return 'Facility → Counterparty: sum or weighted aggregate; Counterparty → Desk: commitment-weighted average; Desk → Portfolio → LOB: roll up by hierarchy.';
}
