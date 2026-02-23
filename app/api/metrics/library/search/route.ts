import { NextRequest, NextResponse } from 'next/server';
import {
  getDomains,
  getParentMetrics,
  getVariants,
} from '@/lib/metric-library/store';
import type { ParentMetric, MetricVariant } from '@/lib/metric-library/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const classification = searchParams.get('classification') ?? '';
  const domain_id = searchParams.get('domain_id') ?? '';
  const status = searchParams.get('status') ?? '';
  const criticality = searchParams.get('criticality') ?? '';

  let parents = getParentMetrics(domain_id || undefined);
  let variants = getVariants();

  if (classification) {
    parents = parents.filter((p) => p.metric_class === classification);
    const parentIds = new Set(parents.map((p) => p.metric_id));
    variants = variants.filter((v) => parentIds.has(v.parent_metric_id));
  }
  if (criticality) {
    parents = parents.filter((p) => (p as ParentMetric & { metric_criticality?: string }).metric_criticality === criticality);
    const parentIds = new Set(parents.map((p) => p.metric_id));
    variants = variants.filter((v) => parentIds.has(v.parent_metric_id));
  }
  if (status) {
    variants = variants.filter((v) => v.status === status);
    const parentIds = new Set(variants.map((v) => v.parent_metric_id));
    parents = parents.filter((p) => parentIds.has(p.metric_id));
  }

  const domains = getDomains();

  const matchParent = (p: { metric_id: string; metric_name: string; definition?: string; generic_formula?: string }) =>
    !q ||
    p.metric_id.toLowerCase().includes(q) ||
    p.metric_name.toLowerCase().includes(q) ||
    (p.definition ?? '').toLowerCase().includes(q) ||
    (p.generic_formula ?? '').toLowerCase().includes(q);

  const matchVariant = (v: { variant_id: string; variant_name: string; formula_display?: string; detailed_description?: string }) =>
    !q ||
    v.variant_id.toLowerCase().includes(q) ||
    v.variant_name.toLowerCase().includes(q) ||
    (v.formula_display ?? '').toLowerCase().includes(q) ||
    (v.detailed_description ?? '').toLowerCase().includes(q);

  const matchedParents = parents.filter(matchParent);
  const matchedVariants = variants.filter(matchVariant);

  return NextResponse.json({
    parents: matchedParents.map((p) => ({
      ...p,
      domain_names: (p.domain_ids ?? [])
        .map((did) => domains.find((d) => d.domain_id === did)?.domain_name)
        .filter(Boolean),
    })),
    variants: matchedVariants.map((v) => {
      const parent = parents.find((p) => p.metric_id === v.parent_metric_id);
      return {
        ...v,
        parent_metric_name: parent?.metric_name,
      };
    }),
  });
}
