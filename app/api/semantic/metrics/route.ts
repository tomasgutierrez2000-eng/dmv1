/**
 * Semantic API — Metrics Endpoint
 *
 * GET /api/semantic/metrics
 *   List/search metrics with filters: domain, metric_class, status, search, regulatory_framework, tags
 *
 * GET /api/semantic/metrics?id=EXP-001
 *   Get full detail for a single metric (includes level formulas, source tables, validations)
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, withErrorHandling } from '@/lib/api-response';
import { getSemanticModel } from '@/lib/semantic-layer/registry';
import { cached } from '@/lib/semantic-layer/api-utils';
import type { MetricSummary, SemanticMetric } from '@/lib/semantic-layer/types';

function metricToSummary(m: SemanticMetric, domainNames: Map<string, string>): MetricSummary {
  return {
    id: m.id,
    catalogue_id: m.catalogue_id,
    name: m.name,
    abbreviation: m.abbreviation,
    domain_id: m.domain_id,
    domain_name: domainNames.get(m.domain_id) ?? m.domain_id,
    metric_class: m.metric_class,
    direction: m.direction,
    unit_type: m.unit_type,
    status: m.status,
    description: m.description,
    insight: m.insight,
    depends_on: m.depends_on,
    available_levels: m.level_formulas.map(lf => lf.level),
    regulatory_frameworks: [...new Set(m.regulatory_refs.map(r => r.framework))],
    tag_list: m.tags,
    ingredient_count: m.ingredient_fields.length,
    validation_count: m.validations.length,
  };
}

export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const model = getSemanticModel();
    const { searchParams } = request.nextUrl;

    // Single metric detail
    const id = searchParams.get('id');
    if (id) {
      const metric = model.metrics.find(m => m.id === id || m.catalogue_id === id);
      if (!metric) {
        return jsonError('Metric not found', { status: 404, code: 'NOT_FOUND' });
      }
      return cached(jsonSuccess(metric));
    }

    // Domain name lookup
    const domainNames = new Map(model.domains.map(d => [d.id, d.name]));

    // Filter metrics
    let filtered = model.metrics;

    const domain = searchParams.get('domain');
    if (domain) {
      filtered = filtered.filter(m => m.domain_id === domain);
    }

    const metricClass = searchParams.get('metric_class');
    if (metricClass) {
      filtered = filtered.filter(m => m.metric_class === metricClass);
    }

    const status = searchParams.get('status');
    if (status) {
      filtered = filtered.filter(m => m.status === status);
    }

    const search = searchParams.get('search');
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(lower) ||
        m.id.toLowerCase().includes(lower) ||
        m.description.toLowerCase().includes(lower) ||
        (m.abbreviation?.toLowerCase().includes(lower)) ||
        (m.catalogue_id?.toLowerCase().includes(lower))
      );
    }

    const regulatory = searchParams.get('regulatory');
    if (regulatory) {
      const lower = regulatory.toLowerCase();
      filtered = filtered.filter(m =>
        m.regulatory_refs.some(r => r.framework.toLowerCase().includes(lower))
      );
    }

    const tags = searchParams.get('tags');
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim().toLowerCase());
      filtered = filtered.filter(m =>
        tagList.some(tag => m.tags.some(t => t.toLowerCase().includes(tag)))
      );
    }

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 500);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);
    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit);

    return cached(jsonSuccess({
      metrics: page.map(m => metricToSummary(m, domainNames)),
      total,
      limit,
      offset,
    }));
  });
}
