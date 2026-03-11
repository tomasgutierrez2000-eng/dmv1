import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { readDataDictionary, getDataDictionaryPath } from '@/lib/data-dictionary';
import fs from 'fs';

export async function GET() {
  try {
    if (!fs.existsSync(getDataDictionaryPath())) {
      return jsonError('Data dictionary not found. Please upload and parse an Excel file first.', { status: 404 });
    }

    const dataDictionary = readDataDictionary();
    if (!dataDictionary) {
      return jsonError('Failed to read data dictionary');
    }

    return jsonSuccess(dataDictionary);
  } catch (error) {
    console.error('Error reading data dictionary:', error);
    const normalized = normalizeCaughtError(error);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
}
