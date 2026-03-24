import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  readCustomMetrics,
  writeCustomMetrics,
  nextCustomMetricId,
  isReadOnlyFsError,
  getMergedMetrics,
} from '../metrics-store';
import type { L3Metric } from '@/data/l3-metrics';

const TEST_DIR = '/tmp/test-metrics-store';
const TEST_METRICS_PATH = path.join(TEST_DIR, 'metrics-custom.json');

// Mock config to control paths
vi.mock('@/lib/config', () => ({
  getMetricsCustomPath: () => '/tmp/test-metrics-store/metrics-custom.json',
  getProjectRoot: () => '/tmp/test-metrics-store',
}));

function makeMetric(id: string, name?: string): L3Metric {
  return {
    id,
    name: name || `Metric ${id}`,
    page: 'P1' as const,
    formula: `formula_${id}`,
    displayFormat: '',
    sampleValue: '',
    sourceFields: [],
    dimensions: [],
  };
}

beforeEach(() => {
  if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(TEST_METRICS_PATH)) fs.unlinkSync(TEST_METRICS_PATH);
  try { fs.rmSync(TEST_DIR, { recursive: true }); } catch { /* ok */ }
});

/* ────────────────── readCustomMetrics ────────────────── */

describe('readCustomMetrics', () => {
  it('returns empty array when file does not exist', () => {
    expect(readCustomMetrics()).toEqual([]);
  });

  it('reads valid metrics JSON', () => {
    const data = { version: 1, metrics: [makeMetric('C001')] };
    fs.writeFileSync(TEST_METRICS_PATH, JSON.stringify(data), 'utf-8');
    const result = readCustomMetrics();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('C001');
  });

  it('returns empty array when metrics field is not an array', () => {
    fs.writeFileSync(TEST_METRICS_PATH, '{"metrics": "not-array"}', 'utf-8');
    expect(readCustomMetrics()).toEqual([]);
  });

  it('returns empty array on malformed JSON', () => {
    fs.writeFileSync(TEST_METRICS_PATH, '{ broken', 'utf-8');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readCustomMetrics()).toEqual([]);
    warnSpy.mockRestore();
  });

  it('returns empty array on empty file', () => {
    fs.writeFileSync(TEST_METRICS_PATH, '', 'utf-8');
    expect(readCustomMetrics()).toEqual([]);
  });
});

/* ────────────────── writeCustomMetrics ────────────────── */

describe('writeCustomMetrics', () => {
  it('writes metrics to disk with version', () => {
    writeCustomMetrics([makeMetric('C001')]);
    const raw = fs.readFileSync(TEST_METRICS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe(1);
    expect(parsed.metrics[0].id).toBe('C001');
  });

  it('creates directory if missing', () => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
    writeCustomMetrics([]);
    expect(fs.existsSync(TEST_METRICS_PATH)).toBe(true);
  });
});

/* ────────────────── nextCustomMetricId ────────────────── */

describe('nextCustomMetricId', () => {
  it('returns C001 for empty list', () => {
    expect(nextCustomMetricId([])).toBe('C001');
  });

  it('increments from highest existing ID', () => {
    const metrics = [makeMetric('C003'), makeMetric('C001'), makeMetric('C005')];
    expect(nextCustomMetricId(metrics)).toBe('C006');
  });

  it('ignores non-C-prefixed IDs', () => {
    const metrics = [makeMetric('MET-001'), makeMetric('C002')];
    expect(nextCustomMetricId(metrics)).toBe('C003');
  });

  it('ignores C-prefixed IDs with non-numeric suffixes', () => {
    const metrics = [makeMetric('CUSTOM'), makeMetric('C010')];
    expect(nextCustomMetricId(metrics)).toBe('C011');
  });

  it('pads to 3 digits', () => {
    expect(nextCustomMetricId([makeMetric('C001')])).toBe('C002');
    expect(nextCustomMetricId([makeMetric('C099')])).toBe('C100');
  });
});

/* ────────────────── isReadOnlyFsError ────────────────── */

describe('isReadOnlyFsError', () => {
  it('detects EROFS', () => {
    const err = new Error('read-only');
    (err as NodeJS.ErrnoException).code = 'EROFS';
    expect(isReadOnlyFsError(err)).toBe(true);
  });

  it('detects EACCES', () => {
    const err = new Error('permission denied');
    (err as NodeJS.ErrnoException).code = 'EACCES';
    expect(isReadOnlyFsError(err)).toBe(true);
  });

  it('returns false for other errors', () => {
    const err = new Error('ENOENT');
    (err as NodeJS.ErrnoException).code = 'ENOENT';
    expect(isReadOnlyFsError(err)).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isReadOnlyFsError('string error')).toBe(false);
    expect(isReadOnlyFsError(null)).toBe(false);
  });
});

/* ────────────────── getMergedMetrics ────────────────── */

describe('getMergedMetrics', () => {
  it('returns custom metrics when available', () => {
    const data = { version: 1, metrics: [makeMetric('C001'), makeMetric('C002')] };
    fs.writeFileSync(TEST_METRICS_PATH, JSON.stringify(data), 'utf-8');
    const result = getMergedMetrics();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('C001');
  });

  it('falls back to YAML stubs when custom is empty', () => {
    // No custom file → readCustomMetrics returns [] → falls through to YAML
    // YAML dir doesn't exist in test env → returns []
    const result = getMergedMetrics();
    expect(Array.isArray(result)).toBe(true);
  });
});
