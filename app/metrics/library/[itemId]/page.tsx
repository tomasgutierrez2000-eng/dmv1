import CatalogueItemDetailView from '@/components/metric-library/CatalogueItemDetailView';

export const metadata = {
  title: 'Catalogue Item Detail',
  description: 'View data element or metric definition, lineage, and rollup logic',
};

export default async function CatalogueItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  return <CatalogueItemDetailView itemId={decodeURIComponent(itemId)} />;
}
