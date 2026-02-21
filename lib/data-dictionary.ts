/**
 * Shared data dictionary types and read/write helpers.
 * Single source of truth for the viz cache used by GET /api/data-dictionary
 * and by data-model mutation APIs. Writes occur only on schema changes.
 */

import fs from 'fs';
import path from 'path';

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

const DATA_DICTIONARY_DIR = path.join(
  process.cwd(),
  'facility-summary-mvp',
  'output',
  'data-dictionary'
);
const DATA_DICTIONARY_PATH = path.join(DATA_DICTIONARY_DIR, 'data-dictionary.json');

export function getDataDictionaryPath(): string {
  return DATA_DICTIONARY_PATH;
}

export function getDataDictionaryDir(): string {
  return DATA_DICTIONARY_DIR;
}

export function readDataDictionary(): DataDictionary | null {
  if (!fs.existsSync(DATA_DICTIONARY_PATH)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(DATA_DICTIONARY_PATH, 'utf-8');
    return JSON.parse(raw) as DataDictionary;
  } catch {
    return null;
  }
}

export function writeDataDictionary(data: DataDictionary): void {
  if (!fs.existsSync(DATA_DICTIONARY_DIR)) {
    fs.mkdirSync(DATA_DICTIONARY_DIR, { recursive: true });
  }
  fs.writeFileSync(
    DATA_DICTIONARY_PATH,
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
