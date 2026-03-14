/**
 * Semantic API — Dimensions Endpoint
 *
 * GET /api/semantic/dimensions
 *   List all dimensions and hierarchies
 *
 * GET /api/semantic/dimensions?metric=EXP-001
 *   List dimensions available for a specific metric, with aggregation type at each level
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { getSemanticModel } from '@/lib/semantic-layer/registry';
import { cached } from '@/lib/semantic-layer/api-utils';

export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const model = getSemanticModel();
    const { searchParams } = request.nextUrl;

    const metricId = searchParams.get('metric');

    if (metricId) {
      // Return dimensions for a specific metric with aggregation info
      const metric = model.metrics.find(m => m.id === metricId || m.catalogue_id === metricId);
      if (!metric) {
        return jsonError('Metric not found', { status: 404, code: 'NOT_FOUND' });
      }

      const dimMap = new Map(model.dimensions.map(d => [d.id, d]));
      const levels = metric.level_formulas.map(lf => {
        const dim = dimMap.get(lf.level);
        return {
          level: lf.level,
          dimension_name: dim?.name ?? lf.level,
          aggregation_type: lf.aggregation_type,
          formula_text: lf.formula_text.trim().split('\n')[0], // first line only
          has_sql: !!lf.formula_sql,
        };
      });

      return cached(jsonSuccess({
        metric_id: metric.id,
        metric_name: metric.name,
        levels,
        aggregation_rules: metric.aggregation_rules,
      }));
    }

    // Return all dimensions and hierarchies
    return cached(jsonSuccess({
      dimensions: model.dimensions,
      hierarchies: model.hierarchies,
    }));
  });
}
