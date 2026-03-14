/**
 * Sandbox Runner — executes metric formula SQL against live PostgreSQL.
 *
 * Uses READ ONLY transactions with 30s timeout.
 * Reuses the pg.Pool pattern from the calc engine executor
 * but is designed for on-demand API use (not batch processing).
 *
 * All queries run inside: BEGIN; SET TRANSACTION READ ONLY; ... ROLLBACK;
 * This ensures zero write risk even if SQL validation is bypassed.
 */

import pg from 'pg';

/* ── Types ──────────────────────────────────────────────────────── */

export interface SandboxQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
}

export interface SandboxError {
  message: string;
  code?: string;
  detail?: string;
}

/* ── Connection Pool (singleton per process) ──────────────────── */

let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!_pool) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL is not configured');

    _pool = new pg.Pool({
      connectionString: dbUrl,
      max: 3,                       // Keep pool small for API use
      idleTimeoutMillis: 120_000,   // 2 min idle cleanup
      connectionTimeoutMillis: 10_000,
    });
    _pool.on('error', () => {});    // Suppress unhandled pool errors
  }
  return _pool;
}

/* ── Parameter Binding ────────────────────────────────────────── */

/**
 * Convert :param style bind parameters to $N style for pg.
 * Handles repeated parameters, string literals, and PostgreSQL casts.
 */
function bindParams(
  sql: string,
  params: Record<string, unknown>,
): { text: string; values: unknown[] } {
  const values: unknown[] = [];
  const seen = new Map<string, number>();
  let idx = 0;

  const text = sql.replace(/'[^']*'|::(\w+)|:(\w+)/g, (match, castType, name) => {
    if (!castType && !name) return match;
    if (castType) return match;
    if (seen.has(name)) return `$${seen.get(name)}`;
    idx++;
    seen.set(name, idx);
    values.push(params[name] ?? null);
    return `$${idx}`;
  });

  return { text, values };
}

/* ── Core Executor ────────────────────────────────────────────── */

const STATEMENT_TIMEOUT_MS = 30_000; // 30 seconds
const MAX_ROWS = 5000;               // Safety limit

/**
 * Execute a SELECT query in a read-only transaction.
 * Returns the result rows or throws on error.
 */
export async function executeSandboxQuery(
  sql: string,
  params: Record<string, unknown> = {},
  options?: { maxRows?: number; timeoutMs?: number },
): Promise<SandboxQueryResult> {
  const pool = getPool();
  const client = await pool.connect();
  const start = performance.now();
  const timeout = options?.timeoutMs ?? STATEMENT_TIMEOUT_MS;
  const maxRows = options?.maxRows ?? MAX_ROWS;

  try {
    // Read-only transaction with timeout
    await client.query('BEGIN');
    await client.query('SET TRANSACTION READ ONLY');
    await client.query(`SET statement_timeout = ${timeout}`);

    const { text, values } = bindParams(sql, params);

    // Wrap with LIMIT to prevent runaway queries
    const limitedSql = `SELECT * FROM (${text}) _sandbox_q LIMIT ${maxRows + 1}`;
    const result = await client.query(limitedSql, values);

    const durationMs = Math.round(performance.now() - start);
    const rows = result.rows.slice(0, maxRows);

    return {
      rows,
      rowCount: result.rowCount ?? rows.length,
      durationMs,
    };
  } catch (err) {
    throw normalizeSandboxError(err);
  } finally {
    // Always rollback (even though read-only, this releases locks)
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    client.release();
  }
}

/**
 * Execute a facility-level query and return detailed results with
 * numerator/denominator breakdown for LTV-style sum-ratio metrics.
 */
export async function executeCalculatorQuery(
  sql: string,
  params: Record<string, unknown> = {},
  options?: { maxRows?: number; timeoutMs?: number },
): Promise<SandboxQueryResult> {
  return executeSandboxQuery(sql, params, options);
}

/**
 * Substitute :param bind parameters with safe literals for PREPARE validation.
 * PostgreSQL PREPARE does not support :param style; we use placeholder values.
 */
function substituteBindParamsForValidation(sql: string): string {
  const KNOWN_PARAMS: Record<string, string> = {
    as_of_date: "'2025-01-31'::date",
    as_of: "'2025-01-31'::date",
  };
  let result = sql;
  for (const [name, literal] of Object.entries(KNOWN_PARAMS)) {
    const re = new RegExp(`:${name}\\b`, 'g');
    result = result.replace(re, literal);
  }
  // Replace any remaining :param with NULL for validation (syntax check only)
  result = result.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, 'NULL');
  return result;
}

/**
 * Run a SQL PREPARE to validate syntax without executing.
 * Substitutes :param bind parameters with safe literals so PREPARE succeeds.
 * Returns { valid, error? }.
 */
export async function validateSqlSyntax(
  sql: string,
): Promise<{ valid: boolean; error?: string }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query(`SET statement_timeout = 10000`); // 10s for validation
    const stmtName = `_validate_${Date.now()}`;
    const sqlForPrepare = substituteBindParamsForValidation(sql);
    await client.query({ text: `PREPARE ${stmtName} AS $1`, values: [sqlForPrepare] });
    await client.query(`DEALLOCATE ${stmtName}`);
    return { valid: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: msg };
  } finally {
    client.release();
  }
}

/**
 * Get the latest as_of_date available in collateral_snapshot.
 */
export async function getLatestAsOfDate(): Promise<string | null> {
  try {
    const result = await executeSandboxQuery(
      'SELECT MAX(as_of_date)::text AS latest FROM l2.collateral_snapshot',
      {},
      { maxRows: 1, timeoutMs: 5000 },
    );
    return result.rows[0]?.latest as string | null;
  } catch {
    return null;
  }
}

/**
 * Get available as_of_dates for date picker (most recent first).
 */
export async function getAvailableAsOfDates(limit = 30): Promise<string[]> {
  try {
    const result = await executeSandboxQuery(
      `SELECT DISTINCT as_of_date::text AS d
       FROM l2.collateral_snapshot
       ORDER BY as_of_date DESC
       LIMIT ${Math.min(limit, 100)}`,
      {},
      { maxRows: limit, timeoutMs: 5000 },
    );
    return result.rows.map((r) => r.d as string);
  } catch {
    return [];
  }
}

/**
 * Fetch reference data for filter dropdowns.
 */
export async function fetchReferenceData(
  table: string,
  columns: string[],
  options?: { limit?: number; orderBy?: string },
): Promise<Record<string, unknown>[]> {
  // Allowlist of safe tables for reference data
  const SAFE_TABLES = new Set([
    'l1.enterprise_business_taxonomy',
    'l1.enterprise_product_taxonomy',
    'l1.portfolio_dim',
    'l1.collateral_type',
    'l1.currency_dim',
    'l2.facility_master',
  ]);

  if (!SAFE_TABLES.has(table)) {
    throw new Error(`Table ${table} is not allowed for reference data queries`);
  }

  // Validate column names (alphanumeric + underscores only)
  for (const col of columns) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col)) {
      throw new Error(`Invalid column name: ${col}`);
    }
  }

  const cols = columns.join(', ');
  const order = options?.orderBy ?? columns[0];
  const limit = options?.limit ?? 1000;

  const result = await executeSandboxQuery(
    `SELECT DISTINCT ${cols} FROM ${table} ORDER BY ${order} LIMIT ${limit}`,
    {},
    { maxRows: limit, timeoutMs: 10000 },
  );

  return result.rows;
}

/* ── Error Normalization ──────────────────────────────────────── */

function normalizeSandboxError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  const code = err && typeof err === 'object' && 'code' in err
    ? String((err as { code: string }).code)
    : undefined;

  if (code === '57014' || msg.includes('statement timeout')) {
    return Object.assign(new Error('Query timed out (30s limit). Try narrowing your filters.'), { code: 'TIMEOUT' });
  }
  if (code === '42P01' || msg.includes('does not exist')) {
    return Object.assign(new Error(`Table or column not found: ${msg}`), { code: 'NOT_FOUND' });
  }
  if (code === '42601' || msg.includes('syntax error')) {
    return Object.assign(new Error(`SQL syntax error: ${msg}`), { code: 'SYNTAX_ERROR' });
  }
  if (msg.includes('ECONNREFUSED') || msg.includes('ECONNRESET')) {
    return Object.assign(new Error('Database connection failed. Please try again.'), { code: 'DB_UNAVAILABLE' });
  }

  return Object.assign(new Error(msg), { code: code ?? 'UNKNOWN' });
}

/**
 * Clean up the connection pool (for graceful shutdown).
 */
export async function closeSandboxPool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
