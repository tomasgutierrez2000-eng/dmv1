/**
 * POST /api/metrics/library/upload
 *
 * Upload a filled Excel template and optional Python calculator files.
 * Parses them, validates against the data dictionary, and returns a
 * validation report. Does NOT persist anything yet — the user reviews
 * the report and then calls /deploy.
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { parseMetricTemplate, linkSourceFieldsToMetrics } from '@/lib/metric-library/template-parser';
import { validateUpload } from '@/lib/metric-library/upload-validator';

/**
 * Convert a Python module filename (without .py) to a metric ID.
 * e.g. "exp_050" -> "EXP-050", "EXP-050" -> "EXP-050"
 */
function moduleNameToMetricId(name: string): string {
  // If already in METRIC-ID format (e.g. "EXP-050"), return as-is
  if (/^[A-Z]+-\d{3}$/.test(name)) return name;
  // Convert module_name format: exp_050 -> EXP-050
  const parts = name.split('_');
  if (parts.length >= 2) {
    const prefix = parts.slice(0, -1).join('_').toUpperCase();
    const num = parts[parts.length - 1];
    if (/^\d{3}$/.test(num)) {
      return `${prefix}-${num}`;
    }
  }
  // Fallback: uppercase the whole thing
  return name.toUpperCase();
}

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

    // Parse Python calculator files
    const pythonFiles = new Map<string, string>();
    const pyEntries = formData.getAll('python_files');
    for (const entry of pyEntries) {
      if (entry instanceof Blob) {
        const pyName = (entry as File).name ?? '';
        const content = await entry.text();
        const metricId = moduleNameToMetricId(pyName.replace(/\.py$/, ''));
        pythonFiles.set(metricId, content);
      }
    }

    // Validate against data dictionary
    const report = validateUpload(
      metricsWithSources,
      pythonFiles.size > 0 ? pythonFiles : undefined,
    );

    return jsonSuccess({
      validation: report,
      metrics: metricsWithSources,
      parse_errors: parsed.errors,
      python_files_parsed: Array.from(pythonFiles.keys()),
    });
  } catch (err) {
    const { message, details, status, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  }
}
