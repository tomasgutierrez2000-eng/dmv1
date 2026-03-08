/**
 * Resolved paths for data model and file I/O.
 * Env overrides allow deployed/read-only environments to point to alternate locations.
 * All paths are resolved once at first use (lazy).
 */

import path from 'path';
import fs from 'fs';

let _projectRoot: string | null = null;

/**
 * Project root directory. Defaults to process.cwd(); override with DATA_MODEL_ROOT.
 */
export function getProjectRoot(): string {
  if (_projectRoot !== null) return _projectRoot;
  const env = process.env.DATA_MODEL_ROOT;
  _projectRoot = env && env.trim() ? path.resolve(env) : process.cwd();
  return _projectRoot;
}

/**
 * Directory containing data-dictionary.json. Override with DATA_DICTIONARY_DIR (full path).
 */
export function getDataDictionaryDir(): string {
  const env = process.env.DATA_DICTIONARY_DIR;
  if (env && env.trim()) return path.resolve(env);
  return path.join(getProjectRoot(), 'facility-summary-mvp', 'output', 'data-dictionary');
}

/**
 * Full path to data-dictionary.json.
 */
export function getDataDictionaryPath(): string {
  return path.join(getDataDictionaryDir(), 'data-dictionary.json');
}

/**
 * Path to metrics-custom.json. Override with METRICS_CUSTOM_PATH.
 */
export function getMetricsCustomPath(): string {
  const env = process.env.METRICS_CUSTOM_PATH;
  if (env && env.trim()) return path.resolve(env);
  return path.join(getProjectRoot(), 'data', 'metrics-custom.json');
}

/**
 * Directory for metric-library JSON files (domains, catalogue, etc.). Override with METRIC_LIBRARY_DIR.
 */
export function getMetricLibraryDir(): string {
  const env = process.env.METRIC_LIBRARY_DIR;
  if (env && env.trim()) return path.resolve(env);
  return path.join(getProjectRoot(), 'data', 'metric-library');
}

/**
 * Path to model-gaps.json. Override with MODEL_GAPS_PATH.
 */
export function getModelGapsPath(): string {
  const env = process.env.MODEL_GAPS_PATH;
  if (env && env.trim()) return path.resolve(env);
  return path.join(getProjectRoot(), 'data', 'model-gaps.json');
}

/**
 * Path to metrics Excel file. Override with METRICS_EXCEL_PATH.
 */
export function getMetricsExcelPath(): string {
  const env = process.env.METRICS_EXCEL_PATH;
  if (env && env.trim()) return path.resolve(env);
  return path.join(getProjectRoot(), 'data', 'metrics_dimensions_filled.xlsx');
}

/**
 * Path to L1 sample data JSON. Override with SAMPLE_DATA_L1_PATH.
 */
export function getSampleDataL1Path(): string {
  const env = process.env.SAMPLE_DATA_L1_PATH;
  if (env && env.trim()) return path.resolve(env);
  return path.join(getProjectRoot(), 'scripts', 'l1', 'output', 'sample-data.json');
}

/**
 * Path to L2 sample data JSON. Override with SAMPLE_DATA_L2_PATH.
 */
export function getSampleDataL2Path(): string {
  const env = process.env.SAMPLE_DATA_L2_PATH;
  if (env && env.trim()) return path.resolve(env);
  return path.join(getProjectRoot(), 'scripts', 'l2', 'output', 'sample-data.json');
}

/**
 * SQL directory for a layer (l1, l2, l3). Uses getProjectRoot().
 */
export function getSqlLayerDir(layer: 'l1' | 'l2' | 'l3'): string {
  return path.join(getProjectRoot(), 'sql', layer);
}

/** Reset cached project root (for tests). */
export function resetProjectRoot(): void {
  _projectRoot = null;
}
