/**
 * Semantic API — Glossary Endpoint
 *
 * GET /api/semantic/glossary
 *   List all glossary entries (fields with business context)
 *
 * GET /api/semantic/glossary?field=committed_facility_amt
 *   Search by field name
 *
 * GET /api/semantic/glossary?table=facility_master
 *   Filter by table
 *
 * GET /api/semantic/glossary?type=measure
 *   Filter by semantic type (measure, dimension, attribute, filter, key)
 *
 * GET /api/semantic/glossary?used_by=EXP-001
 *   Filter to fields used by a specific metric
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, withErrorHandling } from '@/lib/api-response';
import { getSemanticModel } from '@/lib/semantic-layer/registry';
import { cached } from '@/lib/semantic-layer/api-utils';

export function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const model = getSemanticModel();
    const { searchParams } = request.nextUrl;

    let entries = model.glossary;

    // Filter by field name (substring match)
    const field = searchParams.get('field');
    if (field) {
      const lower = field.toLowerCase();
      entries = entries.filter(e => e.field.toLowerCase().includes(lower));
    }

    // Filter by table
    const table = searchParams.get('table');
    if (table) {
      const lower = table.toLowerCase();
      entries = entries.filter(e => e.table.toLowerCase().includes(lower));
    }

    // Filter by layer
    const layer = searchParams.get('layer');
    if (layer) {
      entries = entries.filter(e => e.layer === layer.toUpperCase());
    }

    // Filter by semantic type
    const type = searchParams.get('type');
    if (type) {
      entries = entries.filter(e => e.semantic_type === type);
    }

    // Filter by metric usage
    const usedBy = searchParams.get('used_by');
    if (usedBy) {
      entries = entries.filter(e => e.used_by_metrics.includes(usedBy));
    }

    // Full-text search across field name, description, table
    const search = searchParams.get('search');
    if (search) {
      const lower = search.toLowerCase();
      entries = entries.filter(e =>
        e.field.toLowerCase().includes(lower) ||
        e.table.toLowerCase().includes(lower) ||
        e.description.toLowerCase().includes(lower) ||
        (e.business_concept?.toLowerCase().includes(lower))
      );
    }

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 1000);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);
    const total = entries.length;
    const page = entries.slice(offset, offset + limit);

    // Summary mode: compact entries for token-efficient agent prompts
    const summary = searchParams.get('summary') === 'true';
    const output = summary
      ? page.map(e => ({
          field: e.field,
          table: e.table,
          layer: e.layer,
          semantic_type: e.semantic_type,
          description: e.description,
          used_by_metrics: e.used_by_metrics,
        }))
      : page;

    return cached(jsonSuccess({
      entries: output,
      total,
      limit,
      offset,
    }));
  });
}
