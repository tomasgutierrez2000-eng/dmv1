import type { L3Metric } from '@/data/l3-metrics';
import { getMergedMetrics } from '@/lib/metrics-store';

export function listMetrics(): L3Metric[] {
  return getMergedMetrics();
}

export function getMetricById(metricId: string): L3Metric | undefined {
  const metrics = getMergedMetrics();
  return metrics.find((m) => m.id === metricId);
}
