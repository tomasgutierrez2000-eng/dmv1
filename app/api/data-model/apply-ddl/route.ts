import { NextRequest, NextResponse } from 'next/server';
import { readDataDictionary } from '@/lib/data-dictionary';
import { generateL3Ddl, generateLayerDdl } from '@/lib/ddl-generator';
import path from 'path';
import fs from 'fs';

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

    const parts: string[] = [];
    for (const layer of ['L1', 'L2', 'L3'] as const) {
      if (dd[layer].length === 0) continue;
      const content =
        layer === 'L3' ? generateL3Ddl(dd) : generateLayerDdl(dd, layer);
      parts.push(`-- ${layer}\n${content}`);
    }
    const fullSql = parts.join('\n\n');

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

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json(
        {
          error: 'DATABASE_URL is not set. Set it in environment to execute DDL against PostgreSQL.',
          sql: fullSql,
        },
        { status: 503 }
      );
    }

    try {
      let pg: { Client: new (config: { connectionString: string }) => { connect(): Promise<void>; query(sql: string): Promise<void>; end(): Promise<void> } };
      try {
        pg = await import('pg');
      } catch {
        return NextResponse.json(
          {
            error: 'Optional dependency "pg" is not installed. Run: npm install pg. Then set DATABASE_URL to execute DDL.',
            sql: fullSql,
          },
          { status: 503 }
        );
      }
      const client = new pg.Client({ connectionString: databaseUrl });
      await client.connect();
      try {
        await client.query(fullSql);
        return NextResponse.json({
          success: true,
          dryRun: false,
          message: 'DDL executed successfully.',
        });
      } finally {
        await client.end();
      }
    } catch (pgError) {
      const message = pgError instanceof Error ? pgError.message : String(pgError);
      return NextResponse.json(
        { error: `Database execution failed: ${message}`, sql: fullSql },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Apply DDL error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply DDL.' },
      { status: 500 }
    );
  }
}
