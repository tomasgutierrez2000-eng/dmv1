/**
 * Shared types and helpers for quality control modules.
 */

import type { V2GeneratorOutput } from '../v2/generators';
import type { TableData } from '../v2/types';

/* ────────────────── Types ────────────────── */

export interface QualityControlResult {
  errors: string[];
  warnings: string[];
}

export interface FullQualityControlResult extends QualityControlResult {
  group1_fk: QualityControlResult;
  group2_drift: QualityControlResult;
  group3_arithmetic: QualityControlResult;
  group4_consistency: QualityControlResult;
  group5_story: QualityControlResult;
  group6_crossTable: QualityControlResult;
  group7_temporal: QualityControlResult;
  group8_distribution: QualityControlResult;
  group9_realism: QualityControlResult;
  group10_antiSynthetic: QualityControlResult;
  group11_reconciliation: QualityControlResult;
}

/* ────────────────── Helpers ────────────────── */

export function merge(...results: QualityControlResult[]): QualityControlResult {
  return {
    errors: results.flatMap(r => r.errors),
    warnings: results.flatMap(r => r.warnings),
  };
}

/** Sample up to `max` rows to avoid O(n*m) explosion on large tables. */
export function sampleRows(rows: Record<string, unknown>[], max: number): Record<string, unknown>[] {
  if (rows.length <= max) return rows;
  const step = Math.ceil(rows.length / max);
  const result: Record<string, unknown>[] = [];
  for (let i = 0; i < rows.length; i += step) {
    result.push(rows[i]);
  }
  return result;
}

/** Find a table in the output by name. */
export function findTable(output: V2GeneratorOutput, tableName: string): TableData | undefined {
  return output.tables.find(t => t.table === tableName);
}

/** Extract numeric values for a field across all rows. */
export function extractNumericField(rows: Record<string, unknown>[], field: string): number[] {
  return rows
    .filter(r => field in r && r[field] !== null && r[field] !== undefined && typeof r[field] === 'number')
    .map(r => r[field] as number);
}

/** Standard deviation. Returns 0 for arrays with fewer than 2 elements. */
export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}
