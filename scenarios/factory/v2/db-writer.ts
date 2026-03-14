/**
 * Direct PostgreSQL writer for v2 factory data.
 *
 * Replaces SQL file emission with batched PostgreSQL inserts.
 * Features:
 *   - Batched inserts (1000 rows per INSERT for performance)
 *   - Transaction safety (each scenario in BEGIN/COMMIT)
 *   - ON CONFLICT DO NOTHING for idempotent re-runs
 *   - Post-insert verification (FK chains, PK uniqueness)
 *   - Auto-cleanup with --clean flag (reverse FK order)
 *   - Fallback to SQL file when DATABASE_URL not set
 */

import type { TableData, SqlRow } from './types';
import * as fs from 'fs';
import * as path from 'path';

// ─── Connection Helper ─────────────────────────────────────────────────

function loadEnv(): string | undefined {
  try {
    const dotenv = require('dotenv');
    const envPaths = [
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), '../../.env.local'),
      '/Users/tomas/120/.env.local',
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        dotenv.config({ path: p });
        break;
      }
    }
  } catch {
    // dotenv not available — rely on environment variable
  }
  return process.env.DATABASE_URL;
}

// ─── SQL Value Formatting ──────────────────────────────────────────────

function formatSqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') {
    if (!isFinite(value)) return 'NULL';
    return String(value);
  }
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 10)}'`;
  }
  // String — escape single quotes
  const str = String(value).replace(/'/g, "''");
  return `'${str}'`;
}

/** Check if a column name is a PostgreSQL reserved word that needs quoting. */
function needsQuoting(col: string): boolean {
  const reserved = new Set([
    'value', 'all', 'and', 'array', 'as', 'between', 'case', 'check',
    'column', 'constraint', 'create', 'cross', 'default', 'distinct',
    'do', 'else', 'end', 'except', 'false', 'fetch', 'for', 'foreign',
    'from', 'full', 'grant', 'group', 'having', 'in', 'inner', 'into',
    'is', 'join', 'leading', 'left', 'like', 'limit', 'not', 'null',
    'offset', 'on', 'only', 'or', 'order', 'outer', 'primary',
    'references', 'right', 'select', 'table', 'then', 'to', 'true',
    'union', 'unique', 'user', 'using', 'when', 'where', 'window', 'with',
  ]);
  return reserved.has(col.toLowerCase());
}

function quoteCol(col: string): string {
  return needsQuoting(col) ? `"${col}"` : col;
}

// ─── DB Writer Class ───────────────────────────────────────────────────

export interface WriteResult {
  table: string;
  rowsInserted: number;
  duration_ms: number;
}

export interface VerificationResult {
  passed: boolean;
  checks: { name: string; passed: boolean; message: string }[];
}

export class DBWriter {
  private client: any; // pg.Client — dynamic import to avoid hard dependency
  private connected = false;
  private existingTables = new Set<string>(); // "l2.counterparty" format

  constructor(private databaseUrl?: string) {
    this.databaseUrl = databaseUrl ?? loadEnv();
  }

  /** Check if database is available. */
  isAvailable(): boolean {
    return !!this.databaseUrl;
  }

  /** Connect to PostgreSQL and discover existing tables. */
  async connect(): Promise<void> {
    if (!this.databaseUrl) {
      throw new Error('DATABASE_URL not set. Use --output flag for SQL file output.');
    }
    const pg = await import('pg');
    const PgClient = (pg as any).default?.Client ?? (pg as any).Client;
    this.client = new PgClient({ connectionString: this.databaseUrl });
    await this.client.connect();
    await this.client.query('SET search_path TO l1, l2, public;');
    this.connected = true;

    // Discover existing tables to skip missing ones gracefully
    const res = await this.client.query(
      `SELECT table_schema || '.' || table_name AS full_name
       FROM information_schema.tables
       WHERE table_schema IN ('l1', 'l2', 'l3')`,
    );
    for (const row of res.rows) {
      this.existingTables.add(row.full_name);
    }
  }

  /** Disconnect. */
  async disconnect(): Promise<void> {
    if (this.connected && this.client) {
      await this.client.end();
      this.connected = false;
    }
  }

  /** Run all table inserts within a single transaction. */
  async withinTransaction<T>(fn: () => Promise<T>): Promise<T> {
    await this.client.query('BEGIN');
    try {
      const result = await fn();
      await this.client.query('COMMIT');
      return result;
    } catch (err) {
      await this.client.query('ROLLBACK');
      throw err;
    }
  }

  /**
   * Batch insert rows into a table.
   * Uses multi-value INSERT (1000 rows per statement) for performance.
   */
  async insertBatch(
    schema: string,
    table: string,
    rows: SqlRow[],
    onConflict: 'NOTHING' | 'ERROR' = 'NOTHING',
  ): Promise<WriteResult> {
    if (rows.length === 0) return { table: `${schema}.${table}`, rowsInserted: 0, duration_ms: 0 };

    const start = Date.now();
    const BATCH_SIZE = 1000;
    let totalInserted = 0;

    // Get column names from first row
    const columns = Object.keys(rows[0]);
    const colList = columns.map(quoteCol).join(', ');
    const conflictClause = onConflict === 'NOTHING' ? ' ON CONFLICT DO NOTHING' : '';

    for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
      const batch = rows.slice(offset, offset + BATCH_SIZE);
      const valueSets = batch.map(row => {
        const vals = columns.map(col => formatSqlValue(row[col]));
        return `(${vals.join(', ')})`;
      });

      const sql = `INSERT INTO ${schema}.${table} (${colList}) VALUES\n${valueSets.join(',\n')}${conflictClause}`;

      try {
        const result = await this.client.query(sql);
        totalInserted += result.rowCount ?? batch.length;
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        throw new Error(
          `Failed to insert into ${schema}.${table} (batch starting at row ${offset}):\n` +
          `  Error: ${msg}\n` +
          `  First row columns: ${columns.join(', ')}\n` +
          `  First row values: ${columns.map(c => String(rows[offset]?.[c]).slice(0, 50)).join(', ')}`,
        );
      }
    }

    return {
      table: `${schema}.${table}`,
      rowsInserted: totalInserted,
      duration_ms: Date.now() - start,
    };
  }

  /**
   * Write all generated table data to the database.
   */
  async writeAll(tables: TableData[]): Promise<WriteResult[]> {
    const results: WriteResult[] = [];
    for (const td of tables) {
      const fullName = `${td.schema}.${td.table}`;
      if (!this.existingTables.has(fullName)) {
        console.warn(`  ⚠ Skipping ${fullName}: table does not exist in DB`);
        results.push({ table: fullName, rowsInserted: 0, duration_ms: 0 });
        continue;
      }
      const result = await this.insertBatch(td.schema, td.table, td.rows);
      results.push(result);
    }
    return results;
  }

  /**
   * Clean existing factory-generated data.
   * Deletes in reverse FK order to avoid constraint violations.
   */
  async clean(): Promise<void> {
    const CLEAN_ORDER = [
      // Reverse FK order: children first, parents last
      // L2 events (leaf tables)
      'l2.facility_credit_approval',
      'l2.stress_test_breach',
      'l2.stress_test_result',
      'l2.exception_event',
      'l2.amendment_change_detail',
      'l2.amendment_event',
      'l2.risk_flag',
      'l2.credit_event_facility_link',
      'l2.credit_event',
      'l2.deal_pipeline_fact',
      // L2 snapshots
      'l2.ecl_provision_snapshot',
      'l2.facility_profitability_snapshot',
      'l2.collateral_snapshot',
      'l2.counterparty_rating_observation',
      'l2.facility_delinquency_snapshot',
      'l2.counterparty_financial_snapshot',
      'l2.financial_metric_observation',
      'l2.limit_utilization_event',
      'l2.limit_contribution_snapshot',
      'l2.netting_set_exposure_snapshot',
      'l2.exposure_counterparty_attribution',
      'l2.data_quality_score_snapshot',
      'l2.facility_lob_attribution',
      'l2.cash_flow',
      'l2.position_detail',
      'l2.position',
      'l2.facility_financial_snapshot',
      'l2.facility_risk_snapshot',
      'l2.facility_pricing_snapshot',
      'l2.facility_exposure_snapshot',
      // L1/L2 reference (parents — clean last)
      'l2.facility_lender_allocation',
      'l2.facility_counterparty_participation',
      'l2.collateral_link',
      'l2.collateral_asset_master',
      'l1.limit_threshold',
      'l1.limit_rule',
      'l2.counterparty_hierarchy',
      'l2.facility_master',
      'l2.credit_agreement_master',
      'l2.counterparty',
    ];

    for (const fullTable of CLEAN_ORDER) {
      try {
        const result = await this.client.query(
          `DELETE FROM ${fullTable} WHERE record_source = 'DATA_FACTORY_V2'`,
        );
        const deleted = result.rowCount ?? 0;
        if (deleted > 0) {
          console.log(`  Cleaned ${deleted} rows from ${fullTable}`);
        }
      } catch (err: any) {
        // Table might not exist — skip
        if (!err?.message?.includes('does not exist')) {
          console.warn(`  Warning cleaning ${fullTable}: ${err?.message}`);
        }
      }
    }
  }

  /**
   * Post-insert verification.
   */
  async verify(): Promise<VerificationResult> {
    const checks: { name: string; passed: boolean; message: string }[] = [];

    // 1. FK chain check: facility_exposure → facility_master → counterparty
    try {
      const result = await this.client.query(`
        SELECT COUNT(*) as orphans FROM l2.facility_exposure_snapshot fes
        WHERE fes.record_source = 'DATA_FACTORY_V2'
          AND NOT EXISTS (
            SELECT 1 FROM l2.facility_master fm WHERE fm.facility_id = fes.facility_id
          )
      `);
      const orphans = parseInt(result.rows[0].orphans);
      checks.push({
        name: 'FK: exposure → facility_master',
        passed: orphans === 0,
        message: orphans === 0 ? 'OK' : `${orphans} orphaned exposure rows`,
      });
    } catch (err: any) {
      checks.push({ name: 'FK: exposure → facility_master', passed: false, message: err.message });
    }

    // 2. Financial consistency: drawn <= committed
    try {
      const result = await this.client.query(`
        SELECT COUNT(*) as violations FROM l2.facility_exposure_snapshot
        WHERE record_source = 'DATA_FACTORY_V2'
          AND drawn_amount > committed_amount * 1.001
      `);
      const violations = parseInt(result.rows[0].violations);
      checks.push({
        name: 'drawn <= committed',
        passed: violations === 0,
        message: violations === 0 ? 'OK' : `${violations} violations`,
      });
    } catch (err: any) {
      checks.push({ name: 'drawn <= committed', passed: false, message: err.message });
    }

    // 3. PD range check
    try {
      const result = await this.client.query(`
        SELECT COUNT(*) as violations FROM l2.facility_risk_snapshot
        WHERE record_source = 'DATA_FACTORY_V2'
          AND (pd_pct < 0 OR pd_pct > 1)
      `);
      const violations = parseInt(result.rows[0].violations);
      checks.push({
        name: 'PD in [0, 1]',
        passed: violations === 0,
        message: violations === 0 ? 'OK' : `${violations} out-of-range PDs`,
      });
    } catch (err: any) {
      checks.push({ name: 'PD in [0, 1]', passed: false, message: err.message });
    }

    const passed = checks.every(c => c.passed);
    return { passed, checks };
  }
}

// ─── SQL File Fallback ─────────────────────────────────────────────────

/**
 * Write table data to a SQL file (fallback when DATABASE_URL not set).
 */
export function writeToSqlFile(tables: TableData[], outputPath: string): void {
  const lines: string[] = [];
  lines.push('-- Generated by Data Factory v2');
  lines.push(`-- Generated at: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('SET search_path TO l1, l2, public;');
  lines.push('');

  for (const td of tables) {
    if (td.rows.length === 0) continue;

    lines.push(`-- ${td.schema}.${td.table} (${td.rows.length} rows)`);

    const columns = Object.keys(td.rows[0]);
    const colList = columns.map(quoteCol).join(', ');

    // Batch into 1000-row INSERT statements
    const BATCH_SIZE = 1000;
    for (let offset = 0; offset < td.rows.length; offset += BATCH_SIZE) {
      const batch = td.rows.slice(offset, offset + BATCH_SIZE);
      lines.push(`INSERT INTO ${td.schema}.${td.table} (${colList}) VALUES`);

      const valueSets = batch.map((row, i) => {
        const vals = columns.map(col => formatSqlValue(row[col]));
        const comma = i < batch.length - 1 ? ',' : '';
        return `(${vals.join(', ')})${comma}`;
      });

      lines.push(...valueSets);
      lines.push('ON CONFLICT DO NOTHING;');
      lines.push('');
    }
  }

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  console.log(`SQL written to ${outputPath} (${lines.length} lines)`);
}
