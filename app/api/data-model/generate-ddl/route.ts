import { readDataDictionary } from '@/lib/data-dictionary';
import { writeDdlFiles } from '@/lib/data-model-sync';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';

/** Regenerate DDL files from current data dictionary (viz cache). */
export async function POST() {
  try {
    const dd = readDataDictionary();
    if (!dd) {
      return jsonError('Data dictionary not found. Load or create a model first.', { status: 404 });
    }

    const written = writeDdlFiles(dd);

    return jsonSuccess({
      success: true,
      message: `Generated DDL for ${written.length} layer(s).`,
      files: written,
    });
  } catch (error) {
    console.error('Generate DDL error:', error);
    const normalized = normalizeCaughtError(error);
    return jsonError(normalized.message, { status: normalized.status, details: normalized.details, code: normalized.code });
  }
}
