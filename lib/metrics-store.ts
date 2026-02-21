/**
 * Metrics source: when data/metrics_dimensions_filled.xlsx exists, it is the source of truth (replaces list).
 * Otherwise metrics are read from data/metrics-custom.json.
 */

import fs from 'fs';
import path from 'path';
import type { L3Metric } from '@/data/l3-metrics';
import { loadMetricsFromExcel } from './metrics-from-excel';
import { DEEP_DIVE_SEED_METRICS } from './deep-dive/seed-metrics';

const METRICS_PATH = path.join(process.cwd(), 'data', 'metrics-custom.json');

export interface CustomMetricsFile {
  version?: number;
  metrics: L3Metric[];
}

function ensureDataDir(): void {
  const dir = path.dirname(METRICS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readCustomMetrics(): L3Metric[] {
  if (!fs.existsSync(METRICS_PATH)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(METRICS_PATH, 'utf-8');
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
  fs.writeFileSync(METRICS_PATH, JSON.stringify(data, null, 2), 'utf-8');
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

/** All metrics: Excel (if present) + custom JSON merged by id. Custom metrics always appear. */
export function getMergedMetrics(): L3Metric[] {
  const fromExcel = loadMetricsFromExcel();
  const base = fromExcel && fromExcel.length > 0 ? fromExcel : [];
  const custom = readCustomMetrics();

  const byId = new Map<string, L3Metric>();
  for (const m of base) byId.set(m.id, m);
  for (const m of custom) byId.set(m.id, m);
  for (const m of DEEP_DIVE_SEED_METRICS) byId.set(m.id, m);
  return Array.from(byId.values());
}
