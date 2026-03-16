import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { getDbStatus } from '@/lib/db-status';
import { getDatabaseEntry, getDatabaseUrl, getAvailableDatabases } from '@/lib/db-registry';
import { readDataDictionary, writeDataDictionary, ensureEmptyDataDictionary } from '@/lib/data-dictionary';
import { runIntrospection } from '@/lib/introspect';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const exact = req.nextUrl.searchParams.get('exact') === 'true';
    const dbParam = req.nextUrl.searchParams.get('db');

    // Return available databases for dropdown population
    if (req.nextUrl.searchParams.get('list') === 'true') {
      const available = getAvailableDatabases();
      return jsonSuccess({ databases: available.map((d) => ({ id: d.id, label: d.label })) });
    }

    // Resolve database URL from registry
    let databaseUrl: string | undefined;
    let databaseId: string | undefined;
    let databaseLabel: string | undefined;

    if (dbParam) {
      const entry = getDatabaseEntry(dbParam);
      if (!entry) {
        return jsonError(`Unknown or unconfigured database: "${dbParam}"`, { status: 400, code: 'INVALID_DB' });
      }
      databaseUrl = getDatabaseUrl(entry);
      databaseId = entry.id;
      databaseLabel = entry.label;
    }

    const result = await getDbStatus({ exact, databaseUrl });

    if (databaseId) {
      result.databaseId = databaseId;
      result.databaseLabel = databaseLabel;
    }

    return jsonSuccess(result);
  } catch (err) {
    const { message, details, status, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  }
}

/**
 * POST /api/db-status — Re-introspect PostgreSQL and refresh the data dictionary,
 * then return the updated db-status. This eliminates field drift caused by stale DD.
 */
export async function POST(req: NextRequest) {
  try {
    const dbParam = req.nextUrl.searchParams.get('db');

    // Resolve database URL
    let databaseUrl: string | undefined;
    if (dbParam) {
      const entry = getDatabaseEntry(dbParam);
      if (!entry) {
        return jsonError(`Unknown or unconfigured database: "${dbParam}"`, { status: 400, code: 'INVALID_DB' });
      }
      databaseUrl = getDatabaseUrl(entry);
    }
    const connString = databaseUrl ?? process.env.DATABASE_URL;
    if (!connString) {
      return jsonError('No DATABASE_URL configured', { status: 503, code: 'NO_DB' });
    }

    // Re-introspect: read current DD, merge live schema, write back
    const dd = readDataDictionary() ?? ensureEmptyDataDictionary();
    const report = await runIntrospection(dd, connString);
    writeDataDictionary(dd);

    // Now re-run db-status with the freshly written DD
    const result = await getDbStatus({ exact: false, databaseUrl });

    return jsonSuccess({
      ...result,
      introspectionReport: {
        tablesAdded: report.tablesAdded.length,
        tablesRemoved: report.tablesRemoved.length,
        fieldsAdded: report.fieldsAdded.length,
        fieldsRemoved: report.fieldsRemoved.length,
        typesChanged: report.typesChanged.length,
      },
    });
  } catch (err) {
    const { message, details, status, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  }
}
