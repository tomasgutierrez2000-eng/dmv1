import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { getSchemaBundle, getSchemaSummary } from '@/lib/schema-bundle';

export const dynamic = 'force-dynamic';

/**
 * GET /api/schema/bundle
 * Returns the full merged schema (data dictionary + L3 tables + L3 metrics).
 * Query: ?summary=true returns a short summary for system prompts (fewer tokens).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const summaryOnly = searchParams.get('summary') === 'true';

    if (summaryOnly) {
      const summary = getSchemaSummary();
      return jsonSuccess(summary);
    }

    const bundle = getSchemaBundle();
    return jsonSuccess(bundle);
  } catch (error) {
    console.error('[schema/bundle]', error);
    const normalized = normalizeCaughtError(error);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
}
