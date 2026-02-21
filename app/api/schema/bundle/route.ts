import { NextRequest, NextResponse } from 'next/server';
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
      return NextResponse.json(summary);
    }

    const bundle = getSchemaBundle();
    return NextResponse.json(bundle);
  } catch (error) {
    console.error('[schema/bundle]', error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Failed to build schema bundle',
        ...(process.env.NODE_ENV === 'development' && { details }),
      },
      { status: 500 }
    );
  }
}
