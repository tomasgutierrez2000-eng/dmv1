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

function tableKeyToSqliteName(tableKey: string): string {
  return tableKey.replace('.', '_').toLowerCase();
}

function adaptSql(sql: string): string {
  let normalized = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
  const firstStmt = normalized.split(';')[0]?.trim() ?? normalized;
  if (!firstStmt.toLowerCase().startsWith('select')) return normalized;
  normalized = firstStmt;
  normalized = normalized.replace(/\bL1\.(\w+)/g, 'l1_$1');
  normalized = normalized.replace(/\bL2\.(\w+)/g, 'l2_$1');
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
let _cacheTs = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

function loadSampleData(tableKeys: string[]): { data: SampleDataByTable; error?: string } {
  const data: SampleDataByTable = {};
  const needsL1 = tableKeys.some((k) => k.startsWith('L1.'));
  const needsL2 = tableKeys.some((k) => k.startsWith('L2.'));
  const now = Date.now();
  const cacheStale = now - _cacheTs > CACHE_TTL_MS;

  const l1Path = getSampleDataL1Path();
  const l2Path = getSampleDataL2Path();
  try {
    if (needsL1) {
      if (!_cachedL1 || cacheStale) {
        if (!fs.existsSync(l1Path)) {
          return { data: {}, error: `L1 sample data not found at ${l1Path}. Run: npx tsx scripts/l1/generate.ts` };
        }
        _cachedL1 = JSON.parse(fs.readFileSync(l1Path, 'utf-8')) as SampleDataByTable;
        _cacheTs = now;
      }
    }
    if (needsL2) {
      if (!_cachedL2 || cacheStale) {
        if (!fs.existsSync(l2Path)) {
          return { data: {}, error: `L2 sample data not found at ${l2Path}. Run: npx tsx scripts/l2/generate.ts` };
        }
        _cachedL2 = JSON.parse(fs.readFileSync(l2Path, 'utf-8')) as SampleDataByTable;
        _cacheTs = now;
      }
    }
  } catch {
    return { data: {}, error: 'Failed to read sample data files' };
  }

  const all = { ...(_cachedL1 ?? {}), ...(_cachedL2 ?? {}) };
  for (const key of tableKeys) {
    const entry = all[key];
    if (!entry || !Array.isArray(entry.columns) || !Array.isArray(entry.rows)) {
      return { data: {}, error: `No sample data for table: ${key}` };
    }
    data[key] = entry;
  }
  return { data };
}

export function getDistinctAsOfDates(tableKeys: string[]): string[] {
  const { data } = loadSampleData(tableKeys.filter((k) => k.startsWith('L2.')));
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
  const { data: sampleData, error: loadError } = loadSampleData(tableKeys);
  if (loadError) {
    return {
      ok: false,
      error: loadError,
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

  try {
    const SQL = await initSqlJsEngine();
    const db = new SQL.Database();

    try {
      for (const tableKey of tableKeys) {
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
