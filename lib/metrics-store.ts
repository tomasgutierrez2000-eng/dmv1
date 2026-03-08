/**
 * Metrics source: when data/metrics_dimensions_filled.xlsx exists, it is the source of truth (replaces list).
 * Otherwise metrics are read from data/metrics-custom.json.
 */

import fs from 'fs';
import path from 'path';
import type { L3Metric } from '@/data/l3-metrics';
import { getMetricsCustomPath } from '@/lib/config';

export interface CustomMetricsFile {
  version?: number;
  metrics: L3Metric[];
}

function ensureDataDir(): void {
  const metricsPath = getMetricsCustomPath();
  const dir = path.dirname(metricsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readCustomMetrics(): L3Metric[] {
  const metricsPath = getMetricsCustomPath();
  if (!fs.existsSync(metricsPath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(getMetricsCustomPath(), 'utf-8');
    const data = JSON.parse(raw) as CustomMetricsFile;
    return Array.isArray(data.metrics) ? data.metrics : [];
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[metrics-store] readCustomMetrics parse failed:', err instanceof Error ? err.message : err);
    }
    return [];
  }
}

/** True if the error indicates a read-only filesystem (e.g. Vercel). */
export function isReadOnlyFsError(err: unknown): boolean {
  const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
  return code === 'EROFS' || code === 'EACCES';
}

export function writeCustomMetrics(metrics: L3Metric[]): void {
  ensureDataDir();
  const data: CustomMetricsFile = { version: 1, metrics };
  fs.writeFileSync(getMetricsCustomPath(), JSON.stringify(data, null, 2), 'utf-8');
}

/** Next id for new metrics (e.g. C001, C002). */
export function nextCustomMetricId(existing: L3Metric[]): string {
  const numericIds = existing
    .filter(m => m.id.startsWith('C') && /^C\d+$/.test(m.id))
    .map(m => parseInt(m.id.slice(1), 10))
    .filter(n => !Number.isNaN(n));
  const max = numericIds.length ? Math.max(...numericIds) : 0;
  return `C${String(max + 1).padStart(3, '0')}`;
}

/** All metrics from custom JSON. Upload metrics via /api/metrics/import or /api/metrics/library/import. */
export function getMergedMetrics(): L3Metric[] {
  return readCustomMetrics();
}
