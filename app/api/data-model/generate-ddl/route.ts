import { NextResponse } from 'next/server';
import { readDataDictionary } from '@/lib/data-dictionary';
import { generateL3Ddl, generateLayerDdl } from '@/lib/ddl-generator';
import path from 'path';
import fs from 'fs';

/** Regenerate DDL files from current data dictionary (viz cache). */
export async function POST() {
  try {
    const dd = readDataDictionary();
    if (!dd) {
      return NextResponse.json(
        { error: 'Data dictionary not found. Load or create a model first.' },
        { status: 404 }
      );
    }

    const written: string[] = [];

    for (const layer of ['L1', 'L2', 'L3'] as const) {
      if (dd[layer].length === 0) continue;
      const sqlDir = path.join(process.cwd(), 'sql', layer.toLowerCase());
      if (!fs.existsSync(sqlDir)) {
        fs.mkdirSync(sqlDir, { recursive: true });
      }
      const ddlPath = path.join(sqlDir, '01_DDL_all_tables.sql');
      const content =
        layer === 'L3' ? generateL3Ddl(dd) : generateLayerDdl(dd, layer);
      fs.writeFileSync(ddlPath, content, 'utf-8');
      written.push(ddlPath);
    }

    return NextResponse.json({
      success: true,
      message: `Generated DDL for ${written.length} layer(s).`,
      files: written,
    });
  } catch (error) {
    console.error('Generate DDL error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate DDL.' },
      { status: 500 }
    );
  }
}
