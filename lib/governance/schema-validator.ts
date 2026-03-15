/**
 * Schema-aware SQL validation — checks that table and column references
 * in formula SQL actually exist in the data dictionary.
 *
 * Complements the safety checks in validation.ts (which only checks keywords)
 * and the PostgreSQL PREPARE check (which only checks syntax).
 */

import { readDataDictionary } from '@/lib/data-dictionary';
import type { DataDictionary, DataDictionaryTable } from '@/lib/data-dictionary';

export interface SchemaValidationResult {
  valid: boolean;
  unknownTables: string[];
  unknownColumns: { table: string; column: string }[];
  warnings: string[];
}

/** Cache the data dictionary to avoid re-reading on every validation call. */
let _ddCache: DataDictionary | null = null;
let _ddCacheTs = 0;
const DD_CACHE_TTL_MS = 120_000; // 2 minutes

function getCachedDataDictionary(): DataDictionary | null {
  const now = Date.now();
  if (_ddCache && now - _ddCacheTs < DD_CACHE_TTL_MS) return _ddCache;
  const dd = readDataDictionary();
  if (dd) {
    _ddCache = dd;
    _ddCacheTs = now;
  }
  return dd;
}

/** Build a lookup map: "l1.table_name" → Set of field names. */
function buildTableFieldMap(dd: DataDictionary): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const addLayer = (tables: DataDictionaryTable[]) => {
    for (const t of tables) {
      const key = `${t.layer.toLowerCase()}.${t.name}`;
      const fields = new Set(t.fields.map((f) => f.name));
      map.set(key, fields);
    }
  };
  addLayer(dd.L1);
  addLayer(dd.L2);
  addLayer(dd.L3);
  return map;
}

/** Extract table references from SQL: matches l1.table, l2.table, l3.table patterns. */
function extractTableReferences(sql: string): string[] {
  const pattern = /\b([Ll][123])\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
  const tables = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    tables.add(`${match[1].toLowerCase()}.${match[2].toLowerCase()}`);
  }
  return Array.from(tables);
}

/**
 * Extract column references that follow a table alias pattern.
 * Looks for alias.column_name patterns where alias is established via
 * FROM/JOIN ... AS alias or FROM/JOIN ... alias patterns.
 *
 * This is a best-effort heuristic — it won't catch all cases but
 * catches the most common patterns used in metric formulas.
 */
function extractAliasedColumnReferences(sql: string): Map<string, string[]> {
  // Build alias → table mapping
  const aliasMap = new Map<string, string>();

  // Pattern: FROM/JOIN l1.table_name alias or FROM/JOIN l1.table_name AS alias
  const aliasPattern = /(?:FROM|JOIN)\s+([Ll][123])\.([a-zA-Z_][a-zA-Z0-9_]*)\s+(?:AS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
  let match: RegExpExecArray | null;
  while ((match = aliasPattern.exec(sql)) !== null) {
    const table = `${match[1].toLowerCase()}.${match[2].toLowerCase()}`;
    const alias = match[3].toLowerCase();
    // Skip keywords that look like aliases
    if (['on', 'where', 'and', 'or', 'join', 'left', 'inner', 'group', 'order', 'having', 'limit', 'set'].includes(alias)) continue;
    aliasMap.set(alias, table);
  }

  // Now find alias.column_name references
  const result = new Map<string, string[]>();
  const colPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  while ((match = colPattern.exec(sql)) !== null) {
    const alias = match[1].toLowerCase();
    const column = match[2].toLowerCase();
    // Skip schema-qualified table references (l1, l2, l3)
    if (/^l[123]$/.test(alias)) continue;
    const table = aliasMap.get(alias);
    if (table) {
      const cols = result.get(table) ?? [];
      cols.push(column);
      result.set(table, cols);
    }
  }

  return result;
}

/**
 * Validate formula SQL against the data dictionary schema.
 * Returns unknown tables, unknown columns, and warnings.
 */
export function validateFormulaSchema(sql: string): SchemaValidationResult {
  const dd = getCachedDataDictionary();
  if (!dd) {
    return {
      valid: true, // Can't validate without data dictionary — pass through
      unknownTables: [],
      unknownColumns: [],
      warnings: ['Data dictionary not available — schema validation skipped'],
    };
  }

  const tableFieldMap = buildTableFieldMap(dd);
  const referencedTables = extractTableReferences(sql);
  const unknownTables: string[] = [];
  const warnings: string[] = [];

  for (const table of referencedTables) {
    if (!tableFieldMap.has(table)) {
      unknownTables.push(table);
    }
  }

  // Check column references (best-effort via alias resolution)
  const aliasedColumns = extractAliasedColumnReferences(sql);
  const unknownColumns: { table: string; column: string }[] = [];

  for (const [table, columns] of aliasedColumns) {
    const knownFields = tableFieldMap.get(table);
    if (!knownFields) continue; // Table already flagged as unknown
    for (const col of columns) {
      if (!knownFields.has(col)) {
        // Check if it might be a computed alias or function
        if (col === 'metric_value' || col === 'dimension_key') continue;
        unknownColumns.push({ table, column: col });
      }
    }
  }

  if (unknownTables.length > 0) {
    warnings.push(`Unknown table(s): ${unknownTables.join(', ')}`);
  }
  if (unknownColumns.length > 0) {
    const colList = unknownColumns.map((c) => `${c.table}.${c.column}`).join(', ');
    warnings.push(`Possibly unknown column(s): ${colList}`);
  }

  return {
    valid: unknownTables.length === 0,
    unknownTables,
    unknownColumns,
    warnings,
  };
}
