import type { CalculationDimension, L3Metric } from '@/data/l3-metrics';
import type { RunMetricOutput } from './types';

export interface EscapeHatchContext {
  metric: L3Metric;
  dimension: CalculationDimension;
  asOfDate: string | null;
}

export type EscapeHatchCalculator = (ctx: EscapeHatchContext) => Promise<RunMetricOutput>;

const ESCAPE_HATCH_REGISTRY: Record<string, EscapeHatchCalculator> = {};

export function hasEscapeHatch(metric: L3Metric): boolean {
  return typeof metric.notes === 'string' && metric.notes.includes('calcFnId=');
}

export function getEscapeHatchId(metric: L3Metric): string | null {
  const notes = metric.notes;
  if (!notes) return null;
  const match = notes.match(/\bcalcFnId=([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

export async function runEscapeHatchCalculator(ctx: EscapeHatchContext): Promise<RunMetricOutput | null> {
  const fnId = getEscapeHatchId(ctx.metric);
  if (!fnId) return null;
  const fn = ESCAPE_HATCH_REGISTRY[fnId];
  if (!fn) {
    return {
      ok: false,
      error: `Unknown calcFnId: ${fnId}`,
      hint: 'Register this function in lib/metrics-calculation/escape-hatch.ts.',
    };
  }
  return fn(ctx);
}
