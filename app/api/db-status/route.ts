import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { getDbStatus } from '@/lib/db-status';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const exact = req.nextUrl.searchParams.get('exact') === 'true';
    const result = await getDbStatus({ exact });
    return jsonSuccess(result);
  } catch (err) {
    const { message, details, status, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  }
}
