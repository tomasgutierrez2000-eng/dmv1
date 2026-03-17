import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';

/**
 * POST /api/metrics/upload
 *
 * Accepts the 2-sheet metric upload template (Excel), parses it,
 * auto-derives aggregate SQL + metadata, and writes YAML metric files.
 *
 * Form fields:
 *   - file: Excel file (required)
 *
 * Returns:
 *   { created: string[], warnings: string[], errors: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return jsonError('No file provided. Use form field "file".', { status: 400 });
    }

    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      return jsonError('File must be an Excel file (.xlsx or .xls)', { status: 400 });
    }

    // Write to temp file for the parser
    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpPath = path.join(os.tmpdir(), `metric-upload-${Date.now()}.xlsx`);
    fs.writeFileSync(tmpPath, buffer);

    try {
      // Dynamic import to avoid bundling the calc engine in the client
      const { processTemplate } = await import(
        '@/scripts/calc_engine/template-upload'
      );

      const result = await processTemplate(tmpPath);

      return jsonSuccess(result, result.errors.length > 0 ? 207 : 200);
    } finally {
      // Clean up temp file
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  } catch (err) {
    const { message, details, status, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  }
}

/**
 * GET /api/metrics/upload
 *
 * Returns the blank upload template as a downloadable Excel file.
 */
export async function GET() {
  try {
    const { generateBlankTemplateBuffer } = await import(
      '@/scripts/calc_engine/template-upload'
    );

    const buf = await generateBlankTemplateBuffer();

    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="metrics-upload-template.xlsx"',
      },
    });
  } catch (err) {
    const { message, details, status, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  }
}
