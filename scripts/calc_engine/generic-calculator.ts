/**
 * Generic SQL Calculator — executes YAML formula_sql for any metric.
 *
 * Replaces both GenericYAMLCalculator and all 8 dedicated Python calculators.
 * All metrics now use their YAML formula_sql definitions exclusively.
 *
 * PostgreSQL primary, SQLite fallback (when DATABASE_URL is not set).
 */

import fs from 'fs';
import nodePath from 'path';
import { getProjectRoot } from '@/lib/config';
import { DataLoader, type TableData } from './data-loader';
import type { MetricDefinition, AggregationLevel, SourceTableDef } from './types';

export interface MetricLevelResult {
  rows: Record<string, unknown>[];
}

/**
 * Execute the YAML formula_sql for a given metric at a given rollup level.
 *
 * Tries PostgreSQL-direct first (if DATABASE_URL is set), falls back to
 * in-memory SQLite populated with sample data from the DataLoader.
 */
export async function executeMetricLevel(
  metric: MetricDefinition,
  level: AggregationLevel,
  loader: DataLoader,
  asOfDate: string,
): Promise<MetricLevelResult> {
  const levelDef = metric.levels[level];
  if (!levelDef?.formula_sql) {
    return { rows: [] };
  }

  // Try PostgreSQL-direct execution first
  try {
    const result = await loader.query(levelDef.formula_sql, { as_of_date: asOfDate });
    if (result && result.rows.length > 0) {
      return { rows: result.rows };
    }
  } catch {
    // Fall through to SQLite
  }

  // Fallback: in-memory SQLite
  return executeSqlite(levelDef.formula_sql, metric.source_tables, loader, asOfDate);
}

/**
 * Execute SQL in an in-memory SQLite database populated with sample data.
 */
async function executeSqlite(
  sql: string,
  sourceTables: SourceTableDef[],
  loader: DataLoader,
  asOfDate: string,
): Promise<MetricLevelResult> {
  const adapted = adaptSqlForSqlite(sql, asOfDate);

  // Initialize sql.js WASM
  const SQL = await initSqlJsEngine();
  const db = new SQL.Database();

  try {
    // Load source tables into SQLite
    const loaded = new Set<string>();
    for (const st of sourceTables) {
      if (loaded.has(st.table)) continue;
      loaded.add(st.table);
      try {
        const data = await loader.loadTable(st.schema.toUpperCase(), st.table);
        loadTableToSqlite(db, st.table, data);
      } catch {
        // Table may not exist in sample data — skip silently
      }
    }

    // Also load tables referenced in SQL but not in source_tables
    const referencedTables = extractTableRefs(sql);
    for (const ref of referencedTables) {
      if (loaded.has(ref.table)) continue;
      loaded.add(ref.table);
      try {
        const data = await loader.loadTable(ref.schema.toUpperCase(), ref.table);
        loadTableToSqlite(db, ref.table, data);
      } catch {
        // skip
      }
    }

    // Execute
    const stmt = db.prepare(adapted);
    const rows: Record<string, unknown>[] = [];
    while (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      const row: Record<string, unknown> = {};
      for (let i = 0; i < cols.length; i++) {
        row[cols[i]!] = vals[i];
      }
      rows.push(row);
    }
    stmt.free();
    return { rows };
  } finally {
    db.close();
  }
}

/**
 * Load a TableData into a SQLite table.
 */
function loadTableToSqlite(db: any, tableName: string, data: TableData): void {
  if (data.rows.length === 0) return;
  const { columns, rows } = data;

  // Infer types from first non-null value per column
  const colDefs = columns.map(col => {
    const firstVal = rows.find(r => r[col] != null)?.[col];
    const sqlType = typeof firstVal === 'number' ? 'REAL'
      : typeof firstVal === 'boolean' ? 'INTEGER'
      : 'TEXT';
    return `"${col}" ${sqlType}`;
  });

  db.run(`CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs.join(', ')})`);

  const placeholders = columns.map(() => '?').join(', ');
  const stmt = db.prepare(`INSERT INTO "${tableName}" VALUES (${placeholders})`);
  for (const row of rows) {
    const vals = columns.map(col => {
      const v = row[col];
      if (v === null || v === undefined) return null;
      if (typeof v === 'number' || typeof v === 'string') return v;
      if (typeof v === 'boolean') return v ? 1 : 0;
      return String(v);
    });
    stmt.run(vals);
  }
  stmt.free();
}

/**
 * Validate and sanitize a date string to prevent SQL injection.
 * Only allows YYYY-MM-DD format.
 */
function sanitizeDateParam(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD.`);
  }
  return date;
}

/**
 * Convert PostgreSQL-flavored YAML SQL to SQLite-compatible SQL.
 */
function adaptSqlForSqlite(sql: string, asOfDate: string): string {
  const safeDate = sanitizeDateParam(asOfDate);
  // Strip schema prefixes (l1., l2., l3.)
  let adapted = sql.replace(/\bl([123])\./g, '');
  // Replace :as_of_date bind parameter
  adapted = adapted.replace(/:as_of_date/g, `'${safeDate}'`);
  // CAST(x AS VARCHAR(...)) → CAST(x AS TEXT)
  adapted = adapted.replace(
    /CAST\((.+?)\s+AS\s+VARCHAR(?:\(\d+\))?\)/gi,
    'CAST($1 AS TEXT)'
  );
  return adapted;
}

/**
 * Extract table references from SQL like "l1.table_name" or "l2.table_name".
 */
function extractTableRefs(sql: string): Array<{ schema: string; table: string }> {
  const refs: Array<{ schema: string; table: string }> = [];
  const seen = new Set<string>();
  const regex = /\bl([123])\.(\w+)/g;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const schema = `l${match[1]}`;
    const table = match[2]!;
    const key = `${schema}.${table}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({ schema, table });
    }
  }
  return refs;
}

// ═══════════════════════════════════════════════════════════════
// sql.js WASM engine cache — avoid expensive WASM re-init per metric
// ═══════════════════════════════════════════════════════════════

let cachedSqlJs: { Database: new () => any } | null = null;

/**
 * Initialize sql.js WASM engine (cached across calls).
 * Matches pattern from lib/metrics-calculation/sql-runner.ts.
 */
async function initSqlJsEngine(): Promise<{ Database: new () => any }> {
  if (cachedSqlJs) return cachedSqlJs;

  const sqljsDir = findSqljsDistDir();
  const locateFile = (file: string) => nodePath.join(sqljsDir, file);

  try {
    const mod = await import('sql.js/dist/sql-wasm.js');
    const fn = (mod as { default?: unknown }).default ?? mod;
    if (typeof fn === 'function') {
      cachedSqlJs = await (fn as any)({ locateFile });
      return cachedSqlJs!;
    }
  } catch { /* fall through */ }

  try {
    const { createRequire } = await import('module');
    const req = createRequire(import.meta.url);
    const mod = req('sql.js') as { default?: unknown };
    const fn = mod.default ?? mod;
    if (typeof fn === 'function') {
      cachedSqlJs = await (fn as any)({ locateFile });
      return cachedSqlJs!;
    }
  } catch { /* fall through */ }

  const mod = await import('sql.js');
  const fn = (mod as { default?: unknown }).default ?? mod;
  if (typeof fn !== 'function') {
    throw new Error('Unable to initialize sql.js runtime');
  }
  cachedSqlJs = await (fn as any)({ locateFile });
  return cachedSqlJs!;
}

/**
 * Find sql.js dist directory (handles git worktrees).
 */
function findSqljsDistDir(): string {
  let dir = getProjectRoot();
  while (dir !== nodePath.dirname(dir)) {
    const candidate = nodePath.join(dir, 'node_modules', 'sql.js', 'dist');
    if (fs.existsSync(candidate)) return candidate;
    dir = nodePath.dirname(dir);
  }
  return nodePath.join(getProjectRoot(), 'node_modules', 'sql.js', 'dist');
}
