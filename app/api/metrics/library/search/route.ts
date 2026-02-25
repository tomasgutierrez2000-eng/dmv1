import { NextRequest, NextResponse } from 'next/server';
import {
  getDomains,
  getParentMetrics,
  getVariants,
} from '@/lib/metric-library/store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  if (!q) {
    return NextResponse.json({ parents: [], variants: [] });
  }

  const parents = getParentMetrics();
  const variants = getVariants();
  const domains = getDomains();

  const matchParent = (p: { metric_id: string; metric_name: string; definition?: string; generic_formula?: string }) =>
    p.metric_id.toLowerCase().includes(q) ||
    p.metric_name.toLowerCase().includes(q) ||
    (p.definition ?? '').toLowerCase().includes(q) ||
    (p.generic_formula ?? '').toLowerCase().includes(q);

  const matchVariant = (v: { variant_id: string; variant_name: string; formula_display?: string }) =>
    v.variant_id.toLowerCase().includes(q) ||
    v.variant_name.toLowerCase().includes(q) ||
    (v.formula_display ?? '').toLowerCase().includes(q);

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
