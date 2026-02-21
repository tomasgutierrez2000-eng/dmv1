import VariantDetailView from '@/components/metric-library/VariantDetailView';

export const metadata = {
  title: 'Variant — Metric Library',
  description: 'Metric variant definition, lineage, and governance',
};

type Params = { parentId: string; variantId: string };

export default function VariantDetailPage({ params }: { params: Params }) {
  return <VariantDetailView parentId={params.parentId} variantId={params.variantId} />;
}
