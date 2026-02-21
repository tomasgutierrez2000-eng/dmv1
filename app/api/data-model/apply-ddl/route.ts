import { NextRequest, NextResponse } from 'next/server';
import { readDataDictionary } from '@/lib/data-dictionary';
import { buildFullDdl, executeDdl } from '@/lib/data-model-sync';

/**
 * Apply DDL: dry run returns SQL; execute runs against PostgreSQL when DATABASE_URL is set.
 * Requires optional dependency `pg` for execution.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun !== false;

    const dd = readDataDictionary();
    if (!dd) {
      return NextResponse.json(
        { error: 'Data dictionary not found. Load or create a model first.' },
        { status: 404 }
      );
    }

    const fullSql = buildFullDdl(dd);

    if (!fullSql.trim()) {
      return NextResponse.json({
        success: true,
        dryRun,
        message: 'No DDL to run. Add tables to the data model first.',
        sql: '',
      });
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        sql: fullSql,
        message: 'Dry run: SQL not executed. Set dryRun: false and DATABASE_URL to apply.',
      });
    }

    const result = await executeDdl(dd);
    if (result.ok) {
      return NextResponse.json({
        success: true,
        dryRun: false,
        message: 'DDL executed successfully.',
      });
    }
    const status = result.error?.includes('DATABASE_URL') || result.error?.includes('pg')
      ? 503
      : 500;
    return NextResponse.json(
      { error: result.error, sql: fullSql },
      { status }
    );
  } catch (error) {
    console.error('Apply DDL error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply DDL.' },
      { status: 500 }
    );
  }
}
