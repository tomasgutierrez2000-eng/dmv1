import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { getDbStatus } from '@/lib/db-status';
import { getDatabaseEntry, getDatabaseUrl, getAvailableDatabases } from '@/lib/db-registry';

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
