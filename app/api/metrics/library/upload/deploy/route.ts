/**
 * POST /api/metrics/library/upload/deploy
 *
 * Takes validated metrics (from the upload flow) and deploys them:
 * writes YAML, runs calc:sync, optionally generates demo data.
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { deployMetrics } from '@/lib/metric-library/deploy-engine';
import type { MetricWithSources } from '@/lib/metric-library/template-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const metrics: MetricWithSources[] = body.metrics;
    const generateDemo: boolean = body.generate_demo ?? false;
    const dryRun: boolean = body.dry_run ?? false;

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

    const result = await deployMetrics(metrics, {
      generateDemo,
      dryRun,
    });

    return jsonSuccess(result);
  } catch (err) {
    const { message, details, status, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  }
}
