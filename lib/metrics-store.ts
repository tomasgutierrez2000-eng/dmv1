/**
 * Persist custom L3 metrics to a JSON file.
 * Built-in metrics live in data/l3-metrics.ts and are never written here.
 */

import fs from 'fs';
import path from 'path';
import { L3_METRICS } from '@/data/l3-metrics';
import type { L3Metric } from '@/data/l3-metrics';

const METRICS_CUSTOM_PATH = path.join(process.cwd(), 'data', 'metrics-custom.json');

export interface CustomMetricsFile {
  version?: number;
  metrics: L3Metric[];
}

const DEFAULT_FILE: CustomMetricsFile = { version: 1, metrics: [] };

function ensureDataDir(): void {
  const dir = path.dirname(METRICS_CUSTOM_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readCustomMetrics(): L3Metric[] {
  if (!fs.existsSync(METRICS_CUSTOM_PATH)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(METRICS_CUSTOM_PATH, 'utf-8');
    const data = JSON.parse(raw) as CustomMetricsFile;
    return Array.isArray(data.metrics) ? data.metrics : [];
  } catch {
    return [];
  }
}

export function writeCustomMetrics(metrics: L3Metric[]): void {
  ensureDataDir();
  const data: CustomMetricsFile = { version: 1, metrics };
  fs.writeFileSync(METRICS_CUSTOM_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/** Next id for new custom metrics (e.g. C001, C002). */
export function nextCustomMetricId(existing: L3Metric[]): string {
  const customIds = existing
    .filter(m => m.id.startsWith('C') && /^C\d+$/.test(m.id))
    .map(m => parseInt(m.id.slice(1), 10))
    .filter(n => !Number.isNaN(n));
  const max = customIds.length ? Math.max(...customIds) : 0;
  return `C${String(max + 1).padStart(3, '0')}`;
}

/** Merged list: built-in + custom, with custom overriding built-in when same id. */
export function getMergedMetrics(): L3Metric[] {
  const byId = new Map(L3_METRICS.map(m => [m.id, m]));
  for (const m of readCustomMetrics()) {
    byId.set(m.id, m);
  }
  return Array.from(byId.values());
}
