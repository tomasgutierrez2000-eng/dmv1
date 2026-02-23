/**
 * Data Table Library — file-based store for tables and fields.
 * Path: data/data-table-library/*.json
 */

import fs from 'fs';
import path from 'path';
import type { DTLTable, DTLField } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'data-table-library');
const TABLES_PATH = path.join(DATA_DIR, 'tables.json');
const FIELDS_PATH = path.join(DATA_DIR, 'fields.json');

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(filePath: string, defaultValue: T): T {
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return defaultValue;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function getTables(layer?: string): DTLTable[] {
  const all = readJson<DTLTable[]>(TABLES_PATH, []);
  if (layer) return all.filter((t) => t.layer === layer);
  return all;
}

export function getTable(id: string): DTLTable | null {
  return getTables().find((t) => t.table_id === id) ?? null;
}

export function saveTable(table: DTLTable): void {
  const all = getTables();
  const idx = all.findIndex((t) => t.table_id === table.table_id);
  const updated = { ...table, updated_at: new Date().toISOString() };
  if (idx >= 0) all[idx] = updated;
  else all.push({ ...updated, created_at: new Date().toISOString() });
  writeJson(TABLES_PATH, all);
}

export function getFields(tableId?: string): DTLField[] {
  const all = readJson<DTLField[]>(FIELDS_PATH, []);
  if (tableId) return all.filter((f) => f.table_id === tableId);
  return all;
}

export function getField(id: string): DTLField | null {
  return getFields().find((f) => f.field_id === id) ?? null;
}

export function saveField(field: DTLField): void {
  const all = getFields();
  const idx = all.findIndex((f) => f.field_id === field.field_id);
  const updated = { ...field, updated_at: new Date().toISOString() };
  if (idx >= 0) all[idx] = updated;
  else all.push({ ...updated, created_at: new Date().toISOString() });
  writeJson(FIELDS_PATH, all);
}
