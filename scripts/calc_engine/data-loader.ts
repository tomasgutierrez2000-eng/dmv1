/**
 * Dual-mode data loader: PostgreSQL (if DATABASE_URL set) or sample JSON files.
 *
 * Port of scripts/calc_engine/data_loader.py to TypeScript.
 * Reuses existing infrastructure from lib/config.ts and sql-runner.ts.
 */

import fs from 'fs';
import pg from 'pg';
import { getSampleDataL1Path, getSampleDataL2Path } from '@/lib/config';

/** Row-based table data (no pandas dependency) */
export interface TableData {
  columns: string[];
  rows: Record<string, unknown>[];
}

/** Raw JSON format: { "L1.table_name": { columns: string[], rows: unknown[][] } } */
type SampleDataByTable = Record<string, { columns: string[]; rows: unknown[][] }>;

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export class DataLoader {
  private useDb: boolean;
  private forceJson: boolean;
  private cache = new Map<string, TableData>();
  private pool: pg.Pool | null = null;
  private jsonL1: SampleDataByTable | null = null;
  private jsonL2: SampleDataByTable | null = null;

  constructor(opts?: { forceJson?: boolean }) {
    this.forceJson = opts?.forceJson ?? false;
    this.useDb = Boolean(process.env.DATABASE_URL) && !this.forceJson;
  }

  // ── Public API ──────────────────────────────────────────────

  async loadTable(layer: string, table: string): Promise<TableData> {
    const cacheKey = `${layer}.${table}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const data = this.useDb
      ? await this.loadFromDb(layer, table)
      : this.loadFromJson(layer, table);

    this.cache.set(cacheKey, data);
    return data;
  }

  /**
   * Execute raw SQL against PostgreSQL with :named bind params.
   * Returns null if not in DB mode.
   */
  async query(sql: string, params?: Record<string, unknown>): Promise<TableData | null> {
    if (!this.useDb) return null;
    const pool = this.getPool();
    const { text, values } = convertBindParams(sql, params ?? {});
    const result = await pool.query(text, values);
    return {
      columns: result.fields.map(f => f.name),
      rows: result.rows as Record<string, unknown>[],
    };
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  // ── PostgreSQL ──────────────────────────────────────────────

  private getPool(): pg.Pool {
    if (!this.pool) {
      this.pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        idleTimeoutMillis: 60_000,
        connectionTimeoutMillis: 30_000,
      });
      this.pool.on('error', () => {}); // suppress unhandled pool errors
    }
    return this.pool;
  }

  private async loadFromDb(layer: string, table: string): Promise<TableData> {
    const schema = layer.toLowerCase();
    if (!IDENT_RE.test(schema) || !IDENT_RE.test(table)) {
      throw new Error(`Invalid identifier: ${schema}.${table}`);
    }
    const pool = this.getPool();
    const result = await pool.query(`SELECT * FROM ${schema}.${table}`);
    return {
      columns: result.fields.map(f => f.name),
      rows: result.rows as Record<string, unknown>[],
    };
  }

  // ── Sample JSON ─────────────────────────────────────────────

  private ensureJsonLoaded(layer: string): SampleDataByTable {
    if (layer.toUpperCase() === 'L1') {
      if (!this.jsonL1) {
        this.jsonL1 = readJson(getSampleDataL1Path());
      }
      return this.jsonL1;
    } else {
      if (!this.jsonL2) {
        this.jsonL2 = readJson(getSampleDataL2Path());
      }
      return this.jsonL2;
    }
  }

  private loadFromJson(layer: string, table: string): TableData {
    const data = this.ensureJsonLoaded(layer);
    const key = `${layer.toUpperCase()}.${table}`;
    const entry = data[key];
    if (!entry || !Array.isArray(entry.columns) || !Array.isArray(entry.rows)) {
      throw new Error(`Table not found in sample data: ${key}`);
    }

    // Convert column-array rows to Record<string, unknown> rows
    const columns = entry.columns;
    const rows: Record<string, unknown>[] = entry.rows.map(row => {
      const record: Record<string, unknown> = {};
      for (let i = 0; i < columns.length; i++) {
        record[columns[i]!] = row[i] ?? null;
      }
      return record;
    });

    return { columns, rows };
  }
}

/**
 * Convert :named bind parameters to $N style for pg.
 * Skips single-quoted strings and PostgreSQL ::cast operators.
 */
function convertBindParams(
  sql: string,
  params: Record<string, unknown>
): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  const seen = new Map<string, number>();
  let idx = 0;

  const text = sql.replace(/'[^']*'|::(\w+)|:(\w+)/g, (match, castType, name) => {
    if (!castType && !name) return match; // quoted string
    if (castType) return match; // ::cast
    if (seen.has(name)) return `$${seen.get(name)}`;
    idx++;
    seen.set(name, idx);
    values.push(params[name] ?? null);
    return `$${idx}`;
  });

  return { text, values };
}

function readJson(filePath: string): SampleDataByTable {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Sample data not found: ${filePath}\nRun: npx tsx scripts/l1/generate.ts (or l2)`
    );
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SampleDataByTable;
}
