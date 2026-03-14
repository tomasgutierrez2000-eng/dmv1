/**
 * GET /api/calc-engine/list — List all available metrics from YAML definitions.
 *
 * Replaces the FastAPI /list endpoint from scripts/calc_engine/server.py.
 */

import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { loadMetricDefinitions } from '@/scripts/calc_engine/loader/yaml-loader';

export async function GET() {
  try {
    const { metrics } = loadMetricDefinitions();
    const list = metrics
      .filter(m => m.status === 'ACTIVE' || m.status === 'DRAFT')
      .map(m => ({
        metric_id: m.metric_id,
        catalogue_id: m.catalogue?.item_id ?? m.metric_id,
        name: m.name,
        domain: m.domain,
        status: m.status,
        levels: Object.keys(m.levels),
      }));

    return jsonSuccess(list);
  } catch (err) {
    const { message, status, details, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  }
}
