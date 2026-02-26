import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { tableKeyToDbTable } from '@/lib/db-table-mapping';

const L1_SAMPLE_DATA_PATH = path.join(process.cwd(), 'scripts/l1/output/sample-data.json');
const L2_SAMPLE_DATA_PATH = path.join(process.cwd(), 'scripts/l2/output/sample-data.json');
const L3_SAMPLE_DATA_PATH = path.join(process.cwd(), 'scripts/l3/output/l3-sample-data.json');

/** Escape a value for use in SQL VALUES. Matches scripts/l1/generate.ts. */
function escapeSql(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString().slice(0, 10)}'`;
  return "'" + String(val).replace(/'/g, "''") + "'";
}

/**
 * GET /api/sample-data/export-sql?tableKey=L1.facility_master
 * Returns a .sql file with INSERT statements for the table's sample data.
 */
export async function GET(request: NextRequest) {
  const tableKey = request.nextUrl.searchParams.get('tableKey');
  if (!tableKey) {
    return NextResponse.json({ error: 'Missing tableKey' }, { status: 400 });
  }

  const dbTable = tableKeyToDbTable(tableKey);
  if (!dbTable) {
    return NextResponse.json({ error: 'Invalid tableKey' }, { status: 400 });
  }

  let entry: { columns: string[]; rows: unknown[][] };

  if (tableKey.startsWith('L3.')) {
    if (!fs.existsSync(L3_SAMPLE_DATA_PATH)) {
      return NextResponse.json(
        { error: 'L3 sample data not found. Run scripts to generate L3 sample data.' },
        { status: 404 }
      );
    }
    try {
      const raw = fs.readFileSync(L3_SAMPLE_DATA_PATH, 'utf-8');
      const data = JSON.parse(raw) as Record<string, { columns?: string[]; rows?: unknown[][] }>;
      const e = data[tableKey];
      if (!e || !Array.isArray(e.columns) || !Array.isArray(e.rows)) {
        return NextResponse.json(
          { error: `No sample data for table ${tableKey}` },
          { status: 404 }
        );
      }
      entry = { columns: e.columns, rows: e.rows };
    } catch (err) {
      console.error('L3 sample data read error:', err);
      return NextResponse.json(
        { error: 'Sample data unavailable' },
        { status: 500 }
      );
    }
  } else {
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
      const e = data[tableKey];
      if (!e || !Array.isArray(e.columns) || !Array.isArray(e.rows)) {
        return NextResponse.json(
          { error: `No sample data for table ${tableKey}` },
          { status: 404 }
        );
      }
      entry = { columns: e.columns, rows: e.rows };
    } catch (err) {
      console.error('Sample data read error:', err);
      return NextResponse.json(
        { error: 'Sample data unavailable' },
        { status: 500 }
      );
    }
  }

  const { columns, rows } = entry;
  const lines: string[] = [
    `-- Sample data for ${dbTable}`,
    `-- Exported: ${new Date().toISOString()}`,
    `-- Rows: ${rows.length}`,
    '',
  ];

  for (const row of rows) {
    const values = row.map((val) => escapeSql(val));
    lines.push(`INSERT INTO ${dbTable} (${columns.join(', ')}) VALUES (${values.join(', ')});`);
  }

  const sql = lines.join('\n');
  const filename = `${tableKey.replace('.', '_')}_data.sql`;

  return new NextResponse(sql, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
