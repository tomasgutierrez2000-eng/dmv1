import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/api-response';
import { REFERENCE_TABLE_NAMES } from '@/components/reference-data/referenceDataTables';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 2000;
const DEFAULT_LIMIT = 500;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableName: string }> }
) {
  const { tableName } = await params;

  // Safelist validation — prevents arbitrary table access
  if (!REFERENCE_TABLE_NAMES.has(tableName)) {
    return jsonError(`Table "${tableName}" is not in the reference data safelist`, {
      status: 400,
      code: 'INVALID_TABLE',
    });
  }

  // Additional belt-and-suspenders: validate table name format
  if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
    return jsonError('Invalid table name format', { status: 400, code: 'INVALID_FORMAT' });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return jsonError('Database not configured', {
      status: 503,
      details: 'Set DATABASE_URL to browse live reference data.',
      code: 'NO_DATABASE',
    });
  }

  const url = new URL(request.url);
  const limit = Math.min(
    parseInt(url.searchParams.get('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
    MAX_LIMIT
  );
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

  try {
    const pg = await import('pg');
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      // Get total count
      const countResult = await client.query(`SELECT COUNT(*)::int AS cnt FROM l1.${tableName}`);
      const totalCount = countResult.rows[0].cnt;

      // Get rows
      const dataResult = await client.query(
        `SELECT * FROM l1.${tableName} ORDER BY 1 LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const columns = dataResult.fields.map((f) => f.name);
      const rows = dataResult.rows;

      return NextResponse.json({
        table: tableName,
        columns,
        rows,
        totalCount,
        limit,
        offset,
      });
    } finally {
      await client.end();
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    if (message.includes('Cannot find module') || message.includes('MODULE_NOT_FOUND')) {
      return jsonError('pg module not installed', {
        status: 503,
        details: 'Run: npm install pg',
        code: 'NO_PG',
      });
    }

    if (message.includes('does not exist')) {
      return jsonError(`Table l1.${tableName} does not exist in the database`, {
        status: 404,
        code: 'TABLE_NOT_FOUND',
      });
    }

    return jsonError('Database query failed', { status: 500, details: message });
  }
}
