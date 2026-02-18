/**
 * Single source of truth for metrics: all metrics are stored in data/metrics-custom.json.
 * No separate "built-in" vs "custom" — one merged list.
 */

import fs from 'fs';
import path from 'path';
import type { L3Metric } from '@/data/l3-metrics';

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
  } catch {
    return [];
  }
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

/** All metrics (single source: JSON file). */
export function getMergedMetrics(): L3Metric[] {
  return readCustomMetrics();
}
