import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import {
  getProjectRoot,
  getDataDictionaryDir,
  getDataDictionaryPath,
  getMetricsCustomPath,
  getMetricLibraryDir,
  getModelGapsPath,
  getMetricsExcelPath,
  getSampleDataL1Path,
  getSampleDataL2Path,
  getSqlLayerDir,
  resetProjectRoot,
} from '../config';

beforeEach(() => {
  resetProjectRoot();
});

afterEach(() => {
  resetProjectRoot();
  delete process.env.DATA_MODEL_ROOT;
  delete process.env.DATA_DICTIONARY_DIR;
  delete process.env.METRICS_CUSTOM_PATH;
  delete process.env.METRIC_LIBRARY_DIR;
  delete process.env.MODEL_GAPS_PATH;
  delete process.env.METRICS_EXCEL_PATH;
  delete process.env.SAMPLE_DATA_L1_PATH;
  delete process.env.SAMPLE_DATA_L2_PATH;
});

/* ────────────────── getProjectRoot ────────────────── */

describe('getProjectRoot', () => {
  it('defaults to cwd when DATA_MODEL_ROOT is not set', () => {
    expect(getProjectRoot()).toBe(process.cwd());
  });

  it('uses DATA_MODEL_ROOT when set', () => {
    process.env.DATA_MODEL_ROOT = '/custom/root';
    resetProjectRoot();
    expect(getProjectRoot()).toBe(path.resolve('/custom/root'));
  });

  it('ignores empty/whitespace DATA_MODEL_ROOT', () => {
    process.env.DATA_MODEL_ROOT = '   ';
    resetProjectRoot();
    expect(getProjectRoot()).toBe(process.cwd());
  });

  it('caches after first call', () => {
    const first = getProjectRoot();
    process.env.DATA_MODEL_ROOT = '/different';
    // Should still return cached value (no resetProjectRoot)
    expect(getProjectRoot()).toBe(first);
  });
});

/* ────────────────── Path functions with env overrides ────────────────── */

describe('path functions — defaults', () => {
  it('getDataDictionaryDir returns default path', () => {
    const result = getDataDictionaryDir();
    expect(result).toContain('facility-summary-mvp');
    expect(result).toContain('data-dictionary');
  });

  it('getDataDictionaryPath appends filename', () => {
    expect(getDataDictionaryPath()).toMatch(/data-dictionary\.json$/);
  });

  it('getMetricsCustomPath returns data/metrics-custom.json', () => {
    expect(getMetricsCustomPath()).toMatch(/data[/\\]metrics-custom\.json$/);
  });

  it('getMetricLibraryDir returns data/metric-library', () => {
    expect(getMetricLibraryDir()).toMatch(/data[/\\]metric-library$/);
  });

  it('getModelGapsPath returns data/model-gaps.json', () => {
    expect(getModelGapsPath()).toMatch(/data[/\\]model-gaps\.json$/);
  });

  it('getMetricsExcelPath returns xlsx path', () => {
    expect(getMetricsExcelPath()).toMatch(/metrics_dimensions_filled\.xlsx$/);
  });

  it('getSampleDataL1Path returns l1 output path', () => {
    expect(getSampleDataL1Path()).toMatch(/l1[/\\]output[/\\]sample-data\.json$/);
  });

  it('getSampleDataL2Path returns l2 output path', () => {
    expect(getSampleDataL2Path()).toMatch(/l2[/\\]output[/\\]sample-data\.json$/);
  });

  it('getSqlLayerDir returns sql/layer path', () => {
    expect(getSqlLayerDir('l1')).toMatch(/sql[/\\]l1$/);
    expect(getSqlLayerDir('l3')).toMatch(/sql[/\\]l3$/);
  });
});

describe('path functions — env overrides', () => {
  it('DATA_DICTIONARY_DIR overrides default', () => {
    process.env.DATA_DICTIONARY_DIR = '/override/dd';
    expect(getDataDictionaryDir()).toBe(path.resolve('/override/dd'));
  });

  it('METRICS_CUSTOM_PATH overrides default', () => {
    process.env.METRICS_CUSTOM_PATH = '/override/metrics.json';
    expect(getMetricsCustomPath()).toBe(path.resolve('/override/metrics.json'));
  });

  it('METRIC_LIBRARY_DIR overrides default', () => {
    process.env.METRIC_LIBRARY_DIR = '/override/lib';
    expect(getMetricLibraryDir()).toBe(path.resolve('/override/lib'));
  });

  it('MODEL_GAPS_PATH overrides default', () => {
    process.env.MODEL_GAPS_PATH = '/override/gaps.json';
    expect(getModelGapsPath()).toBe(path.resolve('/override/gaps.json'));
  });

  it('METRICS_EXCEL_PATH overrides default', () => {
    process.env.METRICS_EXCEL_PATH = '/override/excel.xlsx';
    expect(getMetricsExcelPath()).toBe(path.resolve('/override/excel.xlsx'));
  });

  it('SAMPLE_DATA_L1_PATH overrides default', () => {
    process.env.SAMPLE_DATA_L1_PATH = '/override/l1.json';
    expect(getSampleDataL1Path()).toBe(path.resolve('/override/l1.json'));
  });

  it('SAMPLE_DATA_L2_PATH overrides default', () => {
    process.env.SAMPLE_DATA_L2_PATH = '/override/l2.json';
    expect(getSampleDataL2Path()).toBe(path.resolve('/override/l2.json'));
  });

  it('empty env vars are ignored', () => {
    process.env.DATA_DICTIONARY_DIR = '';
    expect(getDataDictionaryDir()).toContain('facility-summary-mvp');
  });

  it('whitespace-only env vars are ignored', () => {
    process.env.METRICS_CUSTOM_PATH = '   ';
    expect(getMetricsCustomPath()).toMatch(/metrics-custom\.json$/);
  });
});

/* ────────────────── resetProjectRoot ────────────────── */

describe('resetProjectRoot', () => {
  it('clears cache so new env value takes effect', () => {
    getProjectRoot(); // cache cwd
    process.env.DATA_MODEL_ROOT = '/new/root';
    resetProjectRoot();
    expect(getProjectRoot()).toBe(path.resolve('/new/root'));
  });
});
