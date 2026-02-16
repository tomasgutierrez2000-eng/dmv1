import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DICTIONARY_PATH = path.join(
  process.cwd(),
  'facility-summary-mvp',
  'output',
  'data-dictionary',
  'data-dictionary.json'
);

export async function GET() {
  try {
    if (!fs.existsSync(DATA_DICTIONARY_PATH)) {
      return NextResponse.json(
        { error: 'Data dictionary not found. Please upload and parse an Excel file first.' },
        { status: 404 }
      );
    }

    const dataDictionary = JSON.parse(
      fs.readFileSync(DATA_DICTIONARY_PATH, 'utf-8')
    );

    return NextResponse.json(dataDictionary);
  } catch (error) {
    console.error('Error reading data dictionary:', error);
    return NextResponse.json(
      { error: 'Failed to read data dictionary' },
      { status: 500 }
    );
  }
}
