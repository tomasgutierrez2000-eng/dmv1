import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const L1_SAMPLE_DATA_PATH = path.join(process.cwd(), 'scripts/l1/output/sample-data.json');
const L2_SAMPLE_DATA_PATH = path.join(process.cwd(), 'scripts/l2/output/sample-data.json');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ layer: string }> }
) {
  const { layer } = await params;
  const layerUpper = (layer || '').toUpperCase();
  if (layerUpper !== 'L1' && layerUpper !== 'L2') {
    return NextResponse.json({ error: 'Invalid layer. Use L1 or L2.' }, { status: 400 });
  }

  const samplePath = layerUpper === 'L2' ? L2_SAMPLE_DATA_PATH : L1_SAMPLE_DATA_PATH;
  if (!fs.existsSync(samplePath)) {
    return NextResponse.json(
      { error: `Sample data not generated for ${layerUpper}. Run: npx tsx scripts/${layerUpper.toLowerCase()}/generate.ts` },
      { status: 404 }
    );
  }

  const data = JSON.parse(fs.readFileSync(samplePath, 'utf-8')) as Record<
    string,
    { columns: string[]; rows: unknown[][] }
  >;
  const filtered: Record<string, { columns: string[]; rows: unknown[][] }> = {};
  const prefix = `${layerUpper}.`;
  for (const [tableKey, entry] of Object.entries(data)) {
    if (tableKey.startsWith(prefix) && entry?.columns) {
      filtered[tableKey] = {
        columns: entry.columns,
        rows: entry.rows ?? [],
      };
    }
  }

  return NextResponse.json(filtered);
}
