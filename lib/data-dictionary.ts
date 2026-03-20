/**
 * Shared data dictionary types and read/write helpers.
 * Single source of truth for the viz cache used by GET /api/data-dictionary
 * and by data-model mutation APIs. Writes occur only on schema changes.
 */

import fs from 'fs';
import path from 'path';
import { getDataDictionaryPath as getDataDictionaryPathConfig, getDataDictionaryDir as getDataDictionaryDirConfig } from '@/lib/config';

export interface DataDictionaryField {
  name: string;
  description?: string;
  category?: string;
  pk_fk?: {
    is_pk: boolean;
    is_composite?: boolean;
    fk_target?: { layer: string; table: string; field: string };
  };
  why_required?: string;
  simplification_note?: string;
  data_type?: string;
  formula?: string;
  source_tables?: Array<{ layer: string; table: string }>;
  source_fields?: string;
  dashboard_usage?: string;
  grain?: string;
  notes?: string;
}

export interface DataDictionaryTable {
  name: string;
  layer: 'L1' | 'L2' | 'L3';
  category: string;
  fields: DataDictionaryField[];
  data_owner?: string;
  data_steward?: string;
  retention_policy?: string;
  update_frequency?: string;
}

export interface DataDictionaryRelationship {
  from_table: string;
  from_field: string;
  to_table: string;
  to_field: string;
  from_layer: string;
  to_layer: string;
}

export interface DataDictionary {
  L1: DataDictionaryTable[];
  L2: DataDictionaryTable[];
  L3: DataDictionaryTable[];
  relationships: DataDictionaryRelationship[];
  derivation_dag: Record<string, string[]>;
}

export function getDataDictionaryPath(): string {
  return getDataDictionaryPathConfig();
}

export function getDataDictionaryDir(): string {
  return getDataDictionaryDirConfig();
}

export function readDataDictionary(): DataDictionary | null {
  const p = getDataDictionaryPath();
  if (!fs.existsSync(p)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw) as DataDictionary;
  } catch (err) {
    console.error(`[data-dictionary] Failed to parse ${p}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export function writeDataDictionary(data: DataDictionary): void {
  const dir = getDataDictionaryDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(
    getDataDictionaryPath(),
    JSON.stringify(data, null, 2),
    'utf-8'
  );
}

export function ensureEmptyDataDictionary(): DataDictionary {
  const existing = readDataDictionary();
  if (existing) return existing;
  const empty: DataDictionary = {
    L1: [],
    L2: [],
    L3: [],
    relationships: [],
    derivation_dag: {},
  };
  writeDataDictionary(empty);
  return empty;
}

/** Find table in dictionary by layer and name. */
export function findTable(
  dd: DataDictionary,
  layer: 'L1' | 'L2' | 'L3',
  tableName: string
): DataDictionaryTable | undefined {
  const arr = dd[layer];
  return arr.find((t) => t.name === tableName);
}

/** Get schema name for layer (l1, l2, l3). */
export function layerToSchema(layer: 'L1' | 'L2' | 'L3'): string {
  return layer.toLowerCase();
}
