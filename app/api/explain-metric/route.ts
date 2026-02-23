import { NextRequest, NextResponse } from 'next/server';
import { getMetric } from '@/data/l3-metrics';
import { getVariant, getParentMetric } from '@/lib/metric-library/store';

/**
 * GET /api/explain-metric?metric_id=M007 | ?variant_id=CRE
 * "Explain This Number" — lineage summary for any metric (L3 or Metric Library variant).
 * Returns structured payload for <2s render; Accuracy Assurance data appended when available.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const metric_id = searchParams.get('metric_id');
  const variant_id = searchParams.get('variant_id');

  if (metric_id) {
    const metric = getMetric(metric_id);
    if (!metric) {
      return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
    }
    const sourceFields = metric.sourceFields ?? [];
    const sourceLineage =
      sourceFields.length > 0
        ? sourceFields.map((s) => `${s.layer} ${s.table}.${s.field}`).join(' → ')
        : null;
    return NextResponse.json({
      metric_identity: {
        name: metric.name,
        id: metric.id,
        classification: 'CALCULATED',
        criticality_tier: 'Tier 3',
      },
      value_context: {
        value_display: metric.sampleValue,
        as_of_date: null,
        scope: metric.page ? `Page ${metric.page}, ${metric.section}` : null,
        record_count: null,
      },
      source_lineage: sourceLineage
        ? `Sources: ${sourceLineage}. (L3 display-only; full source chain from Source Mapping Engine when available.)`
        : null,
      calculation_lineage: `${metric.formula} = ${metric.sampleValue}`,
      quality_status: { status: 'green', issues: [] },
      last_reconciliation: null,
      governance: { metric_owner: null, last_reviewed: null, next_review: null },
    });
  }

  if (variant_id) {
    const variant = getVariant(variant_id);
    if (!variant) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }
    const parent = getParentMetric(variant.parent_metric_id);
    const classification = parent?.metric_class ?? variant.variant_type;
    const sourceLineage =
      variant.source_system && variant.source_field_name
        ? `Sourced from ${variant.source_system}, field ${variant.source_field_name}. Refresh: ${variant.refresh_frequency ?? '—'}.`
        : null;
    return NextResponse.json({
      metric_identity: {
        name: variant.variant_name,
        id: variant.variant_id,
        classification,
        criticality_tier: parent?.metric_criticality ?? null,
      },
      value_context: {
        value_display: null,
        as_of_date: variant.effective_date,
        scope: variant.product_scope ?? null,
        record_count: null,
      },
      source_lineage: sourceLineage,
      calculation_lineage: variant.formula_display ?? null,
      quality_status: { status: 'green', issues: [] },
      last_reconciliation: null,
      governance: {
        metric_owner: variant.owner_team ?? null,
        last_reviewed: variant.last_full_review_date ?? null,
        next_review: variant.next_scheduled_review_date ?? null,
      },
    });
  }

  return NextResponse.json({ error: 'Provide metric_id or variant_id' }, { status: 400 });
}
