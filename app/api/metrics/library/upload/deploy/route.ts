/**
 * POST /api/metrics/library/upload/deploy
 *
 * Takes validated metrics (from the upload flow) and deploys them:
 * writes YAML, runs calc:sync, auto-populates demo data from live DB.
 * Optionally deploys Python calculator files alongside the metrics.
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { deployMetrics } from '@/lib/metric-library/deploy-engine';
import type { MetricWithSources } from '@/lib/metric-library/template-parser';

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
    const body = await request.json();
    const metrics: MetricWithSources[] = body.metrics;
    const dryRun: boolean = body.dry_run ?? false;
    const rawPythonFiles: Record<string, { content: string; filename: string }> | undefined =
      body.python_files;

    if (!Array.isArray(metrics) || metrics.length === 0) {
      return jsonError('No metrics provided', { status: 400 });
    }

    // Validate metric IDs are safe for file paths
    for (const m of metrics) {
      if (!m.metric_id || !/^[A-Z]+-\d{3}$/.test(m.metric_id)) {
        return jsonError(`Invalid metric_id: ${m.metric_id}`, { status: 400 });
      }
      if (!m.domain || !/^[a-z_]+$/.test(m.domain)) {
        return jsonError(`Invalid domain: ${m.domain}`, { status: 400 });
      }
    }

    // Build Python files map if provided
    let pythonFiles: Map<string, { content: string; mode: 'full' | 'simple' }> | undefined;
    if (rawPythonFiles && Object.keys(rawPythonFiles).length > 0) {
      pythonFiles = new Map();
      for (const [filename, info] of Object.entries(rawPythonFiles)) {
        const metricId = moduleNameToMetricId(filename.replace(/\.py$/, ''));
        // Determine mode from the matching metric's calculator_mode, or detect from content
        const metric = metrics.find((m) => m.metric_id === metricId);
        const calcMode = metric?.calculator_mode;
        let mode: 'full' | 'simple' = 'full';
        if (calcMode === 'simple') {
          mode = 'simple';
        } else if (!calcMode || calcMode === '') {
          // Auto-detect from content: if it extends BaseCalculator, it's full mode
          mode = /class\s+\w+\s*\(\s*BaseCalculator\s*\)/.test(info.content) ? 'full' : 'simple';
        }
        pythonFiles.set(metricId, { content: info.content, mode });
      }
    }

    const result = await deployMetrics(metrics, { dryRun, pythonFiles });

    return jsonSuccess(result);
  } catch (err) {
    const { message, details, status, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  }
}
