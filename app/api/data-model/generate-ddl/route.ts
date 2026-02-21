import { NextResponse } from 'next/server';
import { readDataDictionary } from '@/lib/data-dictionary';
import { writeDdlFiles } from '@/lib/data-model-sync';

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

    const written = writeDdlFiles(dd);

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
