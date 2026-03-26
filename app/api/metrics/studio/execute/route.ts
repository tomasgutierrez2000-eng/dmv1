/**
 * POST /api/metrics/studio/execute
 *
 * Execute user-composed SQL against sql.js (demo) or PostgreSQL (production).
 * Separate from the governance trace API to avoid type mismatches.
 *
 * Security:
 * - SELECT-only validation (no INSERT/UPDATE/DELETE/DROP)
 * - Schema restriction (only l1.*, l2.*, l3.*)
 * - Statement timeout (5s for PG)
 * - Row limit (LIMIT 1000)
 * - Read-only transaction for PG
 */

import { NextRequest, NextResponse } from 'next/server';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { validateSQL } from '@/lib/metric-studio/formula-composer';
import { extractTablesFromSql, ALLOWED_SCHEMAS } from '@/lib/governance/sql-parser';
import type { StudioExecuteRequest, ExecutionSuccess } from '@/lib/metric-studio/types';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: StudioExecuteRequest;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', { status: 400 });
  }

  const { formula_sql, source_tables, execution_mode } = body;

  if (!formula_sql || typeof formula_sql !== 'string') {
    return jsonError('formula_sql is required', { status: 400 });
  }

  // Validate SQL safety
  const validationError = validateSQL(formula_sql);
  if (validationError) {
    return jsonError(validationError, { status: 400, code: 'INVALID_SQL' });
  }

  // Validate schema restriction
  const tables = extractTablesFromSql(formula_sql);
  const invalidSchemas = tables.filter(t => !ALLOWED_SCHEMAS.has(t.schema));
  if (invalidSchemas.length > 0) {
    return jsonError(
      `SQL references disallowed schemas: ${invalidSchemas.map(t => `${t.schema}.${t.table}`).join(', ')}`,
      { status: 400, code: 'INVALID_SCHEMA' }
    );
  }

  // Ensure LIMIT is present
  let execSql = formula_sql.trim();
  if (!/\bLIMIT\b/i.test(execSql)) {
    execSql += '\nLIMIT 1000';
  }

  const mode = execution_mode ?? 'sqljs';
  const startTime = Date.now();

  try {
    if (mode === 'postgresql') {
      return await executePG(execSql, startTime);
    } else {
      return await executeSqlJs(execSql, tables.map(t => `${t.schema}.${t.table}`), startTime);
    }
  } catch (err) {
    const normalized = normalizeCaughtError(err);
    return jsonError(normalized.message, {
      status: normalized.status,
      details: normalized.details,
      code: normalized.code,
    });
  }
}

async function executeSqlJs(
  sql: string,
  tableKeys: string[],
  startTime: number,
): Promise<NextResponse> {
  // Dynamic import to avoid bundling sql.js in the client
  const { runSqlMetric } = await import('@/lib/metrics-calculation/sql-runner');

  const result = await runSqlMetric({ rawSql: sql, tableKeys, asOfDate: null });

  if (!result.ok) {
    return jsonError(result.error, { status: 400, code: result.code, details: result.hint });
  }

  // Extract rows from the result structure
  const rows: Record<string, unknown>[] = result.result.type === 'grouped'
    ? result.result.rows.map(r => ({ dimension_key: r.dimension_value, metric_value: r.metric_value }))
    : [{ dimension_key: 'scalar', metric_value: result.result.value }];

  const response: ExecutionSuccess = {
    ok: true,
    rows,
    rowCount: rows.length,
    durationMs: Date.now() - startTime,
    warnings: result.warnings,
  };

  return jsonSuccess(response);
}

async function executePG(
  sql: string,
  startTime: number,
): Promise<NextResponse> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return jsonError('PostgreSQL not available — DATABASE_URL not set', {
      status: 503,
      code: 'DB_UNAVAILABLE',
    });
  }

  // Dynamic import for PG
  const pg = await import('pg');
  const Client = (pg as { default?: { Client: typeof pg.Client } }).default?.Client ?? pg.Client;
  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();

    // Security: read-only transaction + statement timeout
    await client.query('SET statement_timeout = \'5000\'');
    await client.query('SET TRANSACTION READ ONLY');
    await client.query('SET search_path TO l1, l2, l3, public');

    // Replace :as_of_date bind parameter with actual latest date from DB
    let execSql = sql;
    if (/:as_of_date\b/.test(execSql)) {
      const dateResult = await client.query(
        "SELECT MAX(as_of_date)::TEXT AS d FROM l2.facility_exposure_snapshot"
      );
      const latestDate = dateResult.rows?.[0]?.d ?? new Date().toISOString().slice(0, 10);
      execSql = execSql.replace(/:as_of_date\b/g, `'${latestDate}'`);
    }

    const result = await client.query(execSql);

    const response: ExecutionSuccess = {
      ok: true,
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
      durationMs: Date.now() - startTime,
    };

    return jsonSuccess(response);
  } finally {
    await client.end().catch(() => {});
  }
}
