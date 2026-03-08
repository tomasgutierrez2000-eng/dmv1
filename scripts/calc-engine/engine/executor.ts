/**
 * GSIB Calculation Engine — PostgreSQL SQL Executor
 *
 * Manages a pg.Pool connection, binds :param parameters,
 * executes metric SQL with timeout and retry logic.
 */

import pg from 'pg';
import crypto from 'crypto';
import type { EngineConfig } from '../types';
import { RETRYABLE_ERROR_CODES } from '../config/defaults';

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
}

/**
 * Convert :param style bind parameters to $N style for pg.
 * Returns the transformed SQL text and ordered values array.
 *
 * Handles repeated :param references by reusing the same $N index.
 * Skips :param patterns inside single-quoted string literals.
 * Warns on unrecognized parameters (not in params dict).
 */
export function bindParams(
  sql: string,
  params: Record<string, unknown>
): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  const seen = new Map<string, number>();
  let idx = 0;
  const warnings: string[] = [];

  // Replace :param tokens, but skip:
  //   - single-quoted string literals ('...')
  //   - PostgreSQL cast operator (::type)
  const text = sql.replace(/'[^']*'|::(\w+)|:(\w+)/g, (match, castType, name) => {
    // If neither capture group matched, this is a quoted string — leave it alone
    if (!castType && !name) return match;
    // If this is a PostgreSQL cast (::TYPE), leave it alone
    if (castType) return match;

    // Reuse the same $N for repeated :param references
    if (seen.has(name)) {
      return `$${seen.get(name)}`;
    }

    if (!(name in params)) {
      warnings.push(`:${name}`);
    }

    idx++;
    seen.set(name, idx);
    values.push(params[name] ?? null);
    return `$${idx}`;
  });

  if (warnings.length > 0) {
    console.warn(`  [bind] Unrecognized parameters (will be NULL): ${warnings.join(', ')}`);
  }

  return { text, values };
}

/**
 * Compute SHA-256 hash of SQL text for reproducibility tracking.
 */
export function sqlHash(sql: string): string {
  return crypto.createHash('sha256').update(sql).digest('hex').slice(0, 16);
}

/**
 * SQL Executor wrapping a pg.Pool with retry and timeout logic.
 */
export class SqlExecutor {
  private pool: pg.Pool;
  private config: EngineConfig;

  constructor(config: EngineConfig) {
    this.config = config;
    this.pool = new pg.Pool({
      connectionString: config.databaseUrl,
      max: config.poolSize,
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 30_000,
    });
    // Suppress unhandled pool errors (connection resets)
    this.pool.on('error', () => {});
  }

  /**
   * Execute a SELECT query with bind parameters, timeout, and retry.
   */
  async query(
    sql: string,
    params: Record<string, unknown>
  ): Promise<QueryResult> {
    const { text, values } = bindParams(sql, params);
    const start = performance.now();

    for (let attempt = 1; attempt <= this.config.maxRetriesOnConnError; attempt++) {
      const client = await this.pool.connect();
      try {
        // Set per-statement timeout
        await client.query(`SET statement_timeout = ${this.config.statementTimeoutMs}`);

        const result = await client.query(text, values);
        const durationMs = Math.round(performance.now() - start);

        return {
          rows: result.rows,
          rowCount: result.rowCount ?? 0,
          durationMs,
        };
      } catch (err: unknown) {
        const code = getErrorCode(err);
        const isTransient =
          RETRYABLE_ERROR_CODES.has(code) ||
          String(err).includes('timeout');

        if (isTransient && attempt < this.config.maxRetriesOnConnError) {
          if (this.config.verbose) {
            console.warn(
              `  SQL executor: transient error (${code}), retrying (${attempt}/${this.config.maxRetriesOnConnError})...`
            );
          }
          await sleep(this.config.retryDelayMs);
          continue;
        }
        throw err;
      } finally {
        client.release();
      }
    }

    throw new Error('SqlExecutor: exhausted retries');
  }

  /**
   * Execute a write statement (INSERT, DELETE, UPDATE) — no retry on writes.
   */
  async execute(sql: string, values?: unknown[]): Promise<{ rowCount: number }> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, values);
      return { rowCount: result.rowCount ?? 0 };
    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple statements in a single transaction.
   */
  async transaction(fn: (client: pg.PoolClient) => Promise<void>): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await fn(client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get source row counts for the tables referenced by a metric.
   * Uses pg identifier quoting to prevent SQL injection.
   */
  async getSourceRowCounts(
    tables: Array<{ schema: string; table: string }>,
    asOfDate: string
  ): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const { schema, table } of tables) {
      const key = `${schema}.${table}`;
      const safeId = quoteIdentifier(schema) + '.' + quoteIdentifier(table);
      try {
        const result = await this.query(
          `SELECT COUNT(*) AS cnt FROM ${safeId} WHERE as_of_date = :as_of_date`,
          { as_of_date: asOfDate }
        );
        counts[key] = Number(result.rows[0]?.cnt ?? 0);
      } catch {
        // Table might not have as_of_date — try without filter
        try {
          const result = await this.query(
            `SELECT COUNT(*) AS cnt FROM ${safeId}`,
            {}
          );
          counts[key] = Number(result.rows[0]?.cnt ?? 0);
        } catch {
          counts[key] = -1; // Could not count
        }
      }
    }
    return counts;
  }

  /**
   * Check that the required calc engine tables exist in the database.
   */
  async healthCheck(): Promise<string[]> {
    const errors: string[] = [];
    const requiredTables = [
      'l3.calc_run',
      'l3.metric_result',
      'l3.calc_audit_log',
      'l3.calc_validation_result',
    ];
    for (const table of requiredTables) {
      try {
        await this.query(`SELECT 1 FROM ${table} LIMIT 0`, {});
      } catch {
        errors.push(`Table ${table} not accessible`);
      }
    }
    return errors;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Quote a PostgreSQL identifier (schema/table name) to prevent injection.
 */
function quoteIdentifier(name: string): string {
  // Double-quote the identifier, escaping any embedded double quotes
  return '"' + name.replace(/"/g, '""') + '"';
}

function getErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code: string }).code);
  }
  return '';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
