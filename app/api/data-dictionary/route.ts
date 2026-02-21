import { NextResponse } from 'next/server';
import { readDataDictionary, getDataDictionaryPath } from '@/lib/data-dictionary';
import fs from 'fs';

export async function GET() {
  try {
    if (!fs.existsSync(getDataDictionaryPath())) {
      return NextResponse.json(
        { error: 'Data dictionary not found. Please upload and parse an Excel file first.' },
        { status: 404 }
      );
    }

    const dataDictionary = readDataDictionary();
    if (!dataDictionary) {
      return NextResponse.json(
        { error: 'Failed to read data dictionary' },
        { status: 500 }
      );
    }

    return NextResponse.json(dataDictionary);
  } catch (error) {
    console.error('Error reading data dictionary:', error);
    return NextResponse.json(
      { error: 'Failed to read data dictionary' },
      { status: 500 }
    );
  }
}
