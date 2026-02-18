import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { tableKeyToDbTable } from '@/lib/db-table-mapping';

const L1_SAMPLE_DATA_PATH = path.join(process.cwd(), 'scripts/l1/output/sample-data.json');
const L2_SAMPLE_DATA_PATH = path.join(process.cwd(), 'scripts/l2/output/sample-data.json');
const L3_SAMPLE_DATA_PATH = path.join(process.cwd(), 'scripts/l3/output/l3-sample-data.json');

export async function GET(request: NextRequest) {
  const tableKey = request.nextUrl.searchParams.get('tableKey');
  if (!tableKey) {
    return NextResponse.json({ error: 'Missing tableKey' }, { status: 400 });
  }

  if (!tableKeyToDbTable(tableKey)) {
    return NextResponse.json({ error: 'Invalid tableKey' }, { status: 400 });
  }

  if (tableKey.startsWith('L3.')) {
    if (!fs.existsSync(L3_SAMPLE_DATA_PATH)) {
      return NextResponse.json(
        { error: 'L3 sample data not found. See scripts/l3/output/l3-sample-data.json' },
        { status: 404 }
      );
    }
    try {
      const raw = fs.readFileSync(L3_SAMPLE_DATA_PATH, 'utf-8');
      const data = JSON.parse(raw) as Record<string, { columns?: string[]; rows?: unknown[][] }>;
      const entry = data[tableKey];
      if (!entry || !Array.isArray(entry.columns) || !Array.isArray(entry.rows)) {
        return NextResponse.json(
          { error: `No sample data for table ${tableKey}` },
          { status: 404 }
        );
      }
      return NextResponse.json({
        tableKey,
        columns: entry.columns,
        rows: entry.rows,
        source: 'file',
      });
    } catch (err) {
      console.error('L3 sample data read error:', err);
      return NextResponse.json(
        { error: 'Sample data unavailable' },
        { status: 500 }
      );
    }
  }

  const isL2 = tableKey.startsWith('L2.');
  const samplePath = isL2 ? L2_SAMPLE_DATA_PATH : L1_SAMPLE_DATA_PATH;
  const hint = isL2 ? 'npx tsx scripts/l2/generate.ts' : 'npx tsx scripts/l1/generate.ts';

  if (!fs.existsSync(samplePath)) {
    return NextResponse.json(
      { error: `Sample data not generated. Run: ${hint}` },
      { status: 404 }
    );
  }

  try {
    const raw = fs.readFileSync(samplePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, { columns?: string[]; rows?: unknown[][] }>;
    const entry = data[tableKey];
    if (!entry || !Array.isArray(entry.columns) || !Array.isArray(entry.rows)) {
      return NextResponse.json(
        { error: `No sample data for table ${tableKey}` },
        { status: 404 }
      );
    }
    return NextResponse.json({
      tableKey,
      columns: entry.columns,
      rows: entry.rows,
      source: 'file',
    });
  } catch (err) {
    console.error('Sample data read error:', err);
    return NextResponse.json(
      { error: 'Sample data unavailable' },
      { status: 500 }
    );
  }
}
