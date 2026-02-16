import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { tableKeyToDbTable } from '@/lib/db-table-mapping';

const SAMPLE_DATA_PATH = path.join(process.cwd(), 'scripts/l1/output/sample-data.json');

export async function GET(request: NextRequest) {
  const tableKey = request.nextUrl.searchParams.get('tableKey');
  if (!tableKey) {
    return NextResponse.json({ error: 'Missing tableKey' }, { status: 400 });
  }

  if (!tableKeyToDbTable(tableKey)) {
    return NextResponse.json({ error: 'Invalid tableKey' }, { status: 400 });
  }

  // Serves from generated sample-data.json. To use a live DB, install 'pg', set DATABASE_URL,
  // and add a separate API route that queries the database.
  if (!fs.existsSync(SAMPLE_DATA_PATH)) {
    return NextResponse.json(
      { error: 'Sample data not generated. Run: npx tsx scripts/l1/generate.ts' },
      { status: 404 }
    );
  }

  const data = JSON.parse(fs.readFileSync(SAMPLE_DATA_PATH, 'utf-8'));
  const entry = data[tableKey];
  if (!entry) {
    return NextResponse.json(
      { error: `No sample data for table ${tableKey}` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    tableKey,
    columns: entry.columns ?? [],
    rows: entry.rows ?? [],
    source: 'file',
  });
}
