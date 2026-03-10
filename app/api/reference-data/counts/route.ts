import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api-response';
import { REFERENCE_DATA_TABLES } from '@/components/reference-data/referenceDataTables';

export const dynamic = 'force-dynamic';

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return jsonError('Database not configured', {
      status: 503,
      details: 'Set DATABASE_URL to browse live reference data.',
      code: 'NO_DATABASE',
    });
  }

  try {
    const pg = await import('pg');
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      // Build a single UNION ALL query for all curated tables
      const parts = REFERENCE_DATA_TABLES.map(
        (t) => `SELECT '${t.name}' AS table_name, COUNT(*)::int AS cnt FROM l1.${t.name}`
      );
      const sql = parts.join('\nUNION ALL\n');
      const result = await client.query(sql);

      const counts: Record<string, number> = {};
      for (const row of result.rows) {
        counts[row.table_name] = row.cnt;
      }

      return NextResponse.json(counts);
    } finally {
      await client.end();
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);

    // Handle missing pg module
    if (message.includes('Cannot find module') || message.includes('MODULE_NOT_FOUND')) {
      return jsonError('pg module not installed', {
        status: 503,
        details: 'Run: npm install pg',
        code: 'NO_PG',
      });
    }

    // Handle table not existing (some curated tables may not be in this DB yet)
    if (message.includes('does not exist')) {
      // Fall back to querying tables one at a time
      return await countTablesIndividually(databaseUrl);
    }

    return jsonError('Database query failed', { status: 500, details: message });
  }
}

/** Fallback: query each table individually, skipping missing ones. */
async function countTablesIndividually(databaseUrl: string) {
  try {
    const pg = await import('pg');
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();

    try {
      const counts: Record<string, number> = {};
      for (const t of REFERENCE_DATA_TABLES) {
        try {
          const result = await client.query(`SELECT COUNT(*)::int AS cnt FROM l1.${t.name}`);
          counts[t.name] = result.rows[0].cnt;
        } catch {
          // Table doesn't exist in DB — skip
          counts[t.name] = -1;
        }
      }
      return NextResponse.json(counts);
    } finally {
      await client.end();
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return jsonError('Database query failed', { status: 500, details: message });
  }
}
