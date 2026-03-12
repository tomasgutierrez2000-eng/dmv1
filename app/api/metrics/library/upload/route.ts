/**
 * POST /api/metrics/library/upload
 *
 * Upload a filled Excel template. Parses it, validates against the data
 * dictionary, and returns a validation report. Does NOT persist anything yet —
 * the user reviews the report and then calls /deploy.
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { parseMetricTemplate, linkSourceFieldsToMetrics } from '@/lib/metric-library/template-parser';
import { validateUpload } from '@/lib/metric-library/upload-validator';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return jsonError('No file uploaded', { status: 400 });
    }

    const name = (file as File).name ?? 'upload.xlsx';
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      return jsonError('Invalid file type. Please upload an .xlsx file.', { status: 400 });
    }

    // Parse the Excel file
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseMetricTemplate(buffer);

    // Check for parse errors
    if (parsed.errors.length > 0 && parsed.metrics.length === 0) {
      return jsonError('Failed to parse template', {
        status: 400,
        details: parsed.errors.map((e) => `${e.sheet} row ${e.row}: ${e.message}`).join('; '),
      });
    }

    // Link source fields to metrics
    const metricsWithSources = linkSourceFieldsToMetrics(parsed);

    // Validate against data dictionary
    const report = validateUpload(metricsWithSources);

    return jsonSuccess({
      validation: report,
      metrics: metricsWithSources,
      parse_errors: parsed.errors,
    });
  } catch (err) {
    const { message, details, status, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  }
}
