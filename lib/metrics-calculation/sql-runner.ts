import fs from 'fs';
import path from 'path';
import { getSampleDataL1Path, getSampleDataL2Path, getProjectRoot } from '@/lib/config';
import type { RunMetricOutput } from './types';

function getRunTimeoutMs(): number {
  const env = process.env.METRIC_RUN_TIMEOUT_MS;
  if (env != null && env !== '') {
    const n = parseInt(env, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 10_000;
}

export type SampleDataByTable = Record<string, { columns: string[]; rows: unknown[][] }>;

function findSqljsDistDir(): string {
  // Walk up from project root to find node_modules/sql.js/dist (handles git worktrees)
  let dir = getProjectRoot();
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', 'sql.js', 'dist');
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return path.join(getProjectRoot(), 'node_modules', 'sql.js', 'dist');
}
const SQLJS_DIST_DIR = findSqljsDistDir();

async function initSqlJsEngine() {
  const locateFile = (file: string) => path.join(SQLJS_DIST_DIR, file);

  try {
    const mod = await import('sql.js/dist/sql-wasm.js');
    const initSqlJs = (mod as { default?: unknown }).default ?? mod;
    if (typeof initSqlJs === 'function') {
      return await (initSqlJs as (opts: { locateFile: (file: string) => string }) => Promise<{ Database: new () => any }> )({
        locateFile,
      });
    }
  } catch {
    // fall through
  }

  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const mod = require('sql.js') as { default?: unknown };
    const initSqlJs = mod.default ?? mod;
    if (typeof initSqlJs === 'function') {
      return await (initSqlJs as (opts: { locateFile: (file: string) => string }) => Promise<{ Database: new () => any }> )({
        locateFile,
      });
    }
  } catch {
    // fall through
  }

  const mod = await import('sql.js');
  const initSqlJs = (mod as { default?: unknown }).default ?? mod;
  if (typeof initSqlJs !== 'function') {
    throw new Error('Unable to initialize sql.js runtime');
  }
  return await (initSqlJs as (opts: { locateFile: (file: string) => string }) => Promise<{ Database: new () => any }> )({
    locateFile,
  });
}

/** Module-level cache for the sql.js WASM engine (heavy to init, safe to reuse). */
let _sqlEngine: { Database: new () => any } | null = null;

async function getSqlJsEngine(): Promise<{ Database: new () => any }> {
  if (_sqlEngine) return _sqlEngine;
  _sqlEngine = await initSqlJsEngine();
  return _sqlEngine;
}

function tableKeyToSqliteName(tableKey: string): string {
  return tableKey.replace('.', '_').toLowerCase();
}

/**
 * Replace GREATEST/LEAST two-arg calls with CASE WHEN, handling nested parentheses.
 * e.g. GREATEST(COALESCE(a, 0), COALESCE(b, 0)) → CASE WHEN (...) > (...) THEN (...) ELSE (...) END
 */
function replaceBalancedTwoArg(sql: string, funcName: string, op: string): string {
  const pattern = new RegExp(`\\b${funcName}\\s*\\(`, 'gi');
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(sql)) !== null) {
    result += sql.slice(lastIndex, match.index);
    const startAfterParen = match.index + match[0].length;
    // Walk forward tracking parenthesis depth to find the matching close paren
    let depth = 1;
    let commaPos = -1;
    let i = startAfterParen;
    for (; i < sql.length && depth > 0; i++) {
      if (sql[i] === '(') depth++;
      else if (sql[i] === ')') { depth--; if (depth === 0) break; }
      else if (sql[i] === ',' && depth === 1 && commaPos === -1) commaPos = i;
    }
    if (depth === 0 && commaPos !== -1) {
      const arg1 = sql.slice(startAfterParen, commaPos).trim();
      const arg2 = sql.slice(commaPos + 1, i).trim();
      result += `CASE WHEN (${arg1}) ${op} (${arg2}) THEN (${arg1}) ELSE (${arg2}) END`;
      lastIndex = i + 1;
    } else {
      // Couldn't parse — leave original text
      result += match[0];
      lastIndex = startAfterParen;
    }
  }
  result += sql.slice(lastIndex);
  return result;
}

function adaptSql(sql: string): string {
  let normalized = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
  const firstStmt = normalized.split(';')[0]?.trim() ?? normalized;
  const lower = firstStmt.toLowerCase();
  if (!lower.startsWith('select') && !lower.startsWith('with')) return normalized;
  normalized = firstStmt;

  // Schema prefixes: l1.table → l1_table
  normalized = normalized.replace(/\b[Ll]1\.(\w+)/g, 'l1_$1');
  normalized = normalized.replace(/\b[Ll]2\.(\w+)/g, 'l2_$1');
  normalized = normalized.replace(/\b[Ll]3\.(\w+)/g, 'l3_$1');

  // PostgreSQL type casts: strip ::type (SQLite doesn't support them)
  normalized = normalized.replace(/::(date|numeric|text|integer|bigint|boolean|varchar(\(\d+\))?|real|float|double precision)/gi, '');

  // GREATEST(a, b) → CASE WHEN (a) > (b) THEN (a) ELSE (b) END
  // Uses balanced-paren extraction to handle nested function calls
  normalized = replaceBalancedTwoArg(normalized, 'GREATEST', '>');
  // LEAST(a, b) → CASE WHEN (a) < (b) THEN (a) ELSE (b) END
  normalized = replaceBalancedTwoArg(normalized, 'LEAST', '<');

  // DATE_TRUNC('month', x) → strftime('%Y-%m-01', x)
  normalized = normalized.replace(/DATE_TRUNC\s*\(\s*'month'\s*,\s*([^)]+)\)/gi,
    "strftime('%Y-%m-01', $1)");
  // DATE_TRUNC('year', x) → strftime('%Y-01-01', x)
  normalized = normalized.replace(/DATE_TRUNC\s*\(\s*'year'\s*,\s*([^)]+)\)/gi,
    "strftime('%Y-01-01', $1)");

  // EXTRACT(YEAR FROM x) → CAST(strftime('%Y', x) AS INTEGER)
  normalized = normalized.replace(/EXTRACT\s*\(\s*YEAR\s+FROM\s+([^)]+)\)/gi,
    "CAST(strftime('%Y', $1) AS INTEGER)");
  // EXTRACT(MONTH FROM x) → CAST(strftime('%m', x) AS INTEGER)
  normalized = normalized.replace(/EXTRACT\s*\(\s*MONTH\s+FROM\s+([^)]+)\)/gi,
    "CAST(strftime('%m', $1) AS INTEGER)");

  // CURRENT_DATE → date('now')
  normalized = normalized.replace(/\bCURRENT_DATE\b/gi, "date('now')");

  // Boolean literals: TRUE/true → 1, FALSE/false → 0
  normalized = normalized.replace(/\bTRUE\b/gi, '1');
  normalized = normalized.replace(/\bFALSE\b/gi, '0');

  return normalized;
}

function inferColumnType(colValues: unknown[]): string {
  const first = colValues.find((v) => v != null);
  if (first === null || first === undefined) return 'TEXT';
  if (typeof first === 'number') return 'REAL';
  if (typeof first === 'boolean') return 'INTEGER';
  return 'TEXT';
}

/** Module-level cache to avoid re-reading large JSON files on every metric run. */
let _cachedL1: SampleDataByTable | null = null;
let _cachedL2: SampleDataByTable | null = null;
let _cacheL1Ts = 0;
let _cacheL2Ts = 0;
let _cacheL1Mtime = 0;
let _cacheL2Mtime = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

function getFileMtimeMs(filePath: string): number {
  try { return fs.statSync(filePath).mtimeMs; } catch { return 0; }
}

function loadSampleData(tableKeys: string[]): { data: SampleDataByTable; missingTables: string[] } {
  const data: SampleDataByTable = {};
  const now = Date.now();

  // Always load both files so we can fall back across layers
  const l1Path = getSampleDataL1Path();
  const l2Path = getSampleDataL2Path();
  try {
    const l1Mtime = getFileMtimeMs(l1Path);
    if (!_cachedL1 || now - _cacheL1Ts > CACHE_TTL_MS || l1Mtime !== _cacheL1Mtime) {
      if (fs.existsSync(l1Path)) {
        _cachedL1 = JSON.parse(fs.readFileSync(l1Path, 'utf-8')) as SampleDataByTable;
        _cacheL1Ts = now;
        _cacheL1Mtime = l1Mtime;
      }
    }
    const l2Mtime = getFileMtimeMs(l2Path);
    if (!_cachedL2 || now - _cacheL2Ts > CACHE_TTL_MS || l2Mtime !== _cacheL2Mtime) {
      if (fs.existsSync(l2Path)) {
        _cachedL2 = JSON.parse(fs.readFileSync(l2Path, 'utf-8')) as SampleDataByTable;
        _cacheL2Ts = now;
        _cacheL2Mtime = l2Mtime;
      }
    }
  } catch {
    return { data: {}, missingTables: tableKeys };
  }

  const all = { ...(_cachedL1 ?? {}), ...(_cachedL2 ?? {}) };
  const missingTables: string[] = [];
  for (const key of tableKeys) {
    let entry = all[key];
    // Fall back: if L2.table not found, try L1.table (and vice versa)
    if (!entry || !Array.isArray(entry.columns)) {
      const tableName = key.replace(/^L[12]\./, '');
      const altKey = key.startsWith('L2.') ? `L1.${tableName}` : `L2.${tableName}`;
      entry = all[altKey];
    }
    if (!entry || !Array.isArray(entry.columns) || !Array.isArray(entry.rows)) {
      missingTables.push(key);
      continue; // Skip missing tables instead of failing entirely
    }
    data[key] = entry;
  }
  return { data, missingTables };
}

export function getDistinctAsOfDates(tableKeys: string[]): string[] {
  const { data } = loadSampleData(tableKeys.filter((k) => k.startsWith('L2.') || k.startsWith('L1.')));
  const dates = new Set<string>();
  for (const entry of Object.values(data)) {
    const colIdx = entry.columns.indexOf('as_of_date');
    if (colIdx < 0) continue;
    for (const row of entry.rows) {
      const val = row[colIdx];
      if (val != null && typeof val === 'string') dates.add(val);
    }
  }
  return Array.from(dates).sort().reverse();
}

export async function runSqlMetric(input: {
  rawSql: string;
  tableKeys: string[];
  asOfDate: string | null;
}): Promise<RunMetricOutput> {
  const { rawSql, tableKeys } = input;
  const { data: sampleData, missingTables } = loadSampleData(tableKeys);
  // If ALL tables are missing, fail early
  if (missingTables.length === tableKeys.length && tableKeys.length > 0) {
    return {
      ok: false,
      error: `No sample data for tables: ${missingTables.join(', ')}`,
      code: 'SAMPLE_DATA_MISSING',
      hint: 'Generate L1/L2 sample data (npm run generate:l1, npm run generate:l2) or set SAMPLE_DATA_L1_PATH / SAMPLE_DATA_L2_PATH.',
    };
  }

  let dateToUse = input.asOfDate;
  if (!dateToUse) {
    const dates = getDistinctAsOfDates(tableKeys);
    dateToUse = dates.length > 0 ? dates[0]! : null;
  }

  const sqlExecuted = adaptSql(rawSql);
  const inputRowCounts: Record<string, number> = {};
  for (const key of tableKeys) {
    inputRowCounts[key] = sampleData[key]?.rows?.length ?? 0;
  }
  const warnings = missingTables.length > 0
    ? [`Missing sample data for: ${missingTables.join(', ')} (empty stub tables used)`]
    : undefined;

  try {
    const SQL = await getSqlJsEngine();
    const db = new SQL.Database();

    try {
      // Create empty stub tables for missing sample data (allows LEFT JOINs to succeed)
      for (const missing of missingTables) {
        const sqlName = tableKeyToSqliteName(missing);
        db.run(`CREATE TABLE "${sqlName}" (_stub INTEGER)`);
        inputRowCounts[missing] = 0;
      }

      for (const tableKey of tableKeys) {
        if (missingTables.includes(tableKey)) continue; // already created as stub
        const entry = sampleData[tableKey]!;
        const sqlName = tableKeyToSqliteName(tableKey);
        const columns = entry.columns;
        const rows = entry.rows;

        const seen = new Map<string, number>();
        const uniqueNames = columns.map((col) => {
          const safe = col.replace(/[^a-zA-Z0-9_]/g, '_');
          const next = (seen.get(safe) ?? 0) + 1;
          seen.set(safe, next);
          return next === 1 ? safe : `${safe}_${next}`;
        });

        const colDefs = uniqueNames.map((name, i) => {
          const colVals = rows.map((r) => r[i]);
          return `"${name}" ${inferColumnType(colVals)}`;
        });
        db.run(`CREATE TABLE "${sqlName}" (${colDefs.join(', ')})`);

        const placeholders = uniqueNames.map(() => '?').join(', ');
        const stmt = db.prepare(`INSERT INTO "${sqlName}" VALUES (${placeholders})`);
        for (const row of rows) {
          const vals: (string | number | null)[] = columns.map((_, i) => {
            const v = row[i];
            if (v === null || v === undefined) return null;
            if (typeof v === 'number' || typeof v === 'string') return v;
            return String(v);
          });
          stmt.run(vals);
        }
        stmt.free();
      }

      const runTimeoutMs = getRunTimeoutMs();
      const startedAt = Date.now();
      const statement = db.prepare(sqlExecuted);
      statement.bind({ ':as_of_date': dateToUse ?? '' });
      const cols = statement.getColumnNames();
      const values: unknown[][] = [];
      while (statement.step()) {
        values.push(statement.get());
        if (Date.now() - startedAt > runTimeoutMs) {
          statement.free();
          return {
            ok: false,
            error: `SQL execution exceeded timeout (${runTimeoutMs}ms)`,
            code: 'TIMEOUT',
            sqlExecuted,
            inputRowCounts,
            hint: 'Increase METRIC_RUN_TIMEOUT_MS in env for slower runs.',
          };
        }
      }
      statement.free();

      if (cols.length === 0 || values.length === 0) {
        return {
          ok: true,
          inputRowCounts,
          sqlExecuted,
          result: { type: 'scalar', value: null },
          asOfDateUsed: dateToUse,
          warnings,
        };
      }

      if (cols.length === 1 && values.length === 1) {
        const value = values[0]?.[0];
        const scalar = typeof value === 'number' && !Number.isNaN(value) ? value : null;
        return {
          ok: true,
          inputRowCounts,
          sqlExecuted,
          result: { type: 'scalar', value: scalar },
          asOfDateUsed: dateToUse,
          warnings,
        };
      }

      const groupedRows = values.map((row) => {
        const dimensionValue = row[0];
        const metricValue = row[1];
        return {
          dimension_value:
            typeof dimensionValue === 'string' || typeof dimensionValue === 'number'
              ? dimensionValue
              : String(dimensionValue ?? ''),
          metric_value: typeof metricValue === 'number' ? metricValue : Number(metricValue) || 0,
        };
      });

      return {
        ok: true,
        inputRowCounts,
        sqlExecuted,
        result: { type: 'grouped', rows: groupedRows },
        asOfDateUsed: dateToUse,
        warnings,
      };
    } finally {
      try {
        db.close();
      } catch {
        // ignore best-effort close
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Runner failed: ${msg}`,
      code: 'RUNNER_FAILED',
      sqlExecuted,
      inputRowCounts,
      hint: 'Check that formulaSQL uses only L1/L2 tables and :as_of_date.',
    };
  }
}
