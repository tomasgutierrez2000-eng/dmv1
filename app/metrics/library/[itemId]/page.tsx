import CatalogueItemDetailView from '@/components/metric-library/CatalogueItemDetailView';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { getCatalogueItem } from '@/lib/metric-library/store';

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
  const decoded = decodeURIComponent(itemId);
  const item = getCatalogueItem(decoded);
  const name = item?.item_name ?? decoded;

  return (
    <>
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-3">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Metrics', href: '/metrics/library' },
          { label: 'Library', href: '/metrics/library' },
          { label: name },
        ]} />
      </div>
      <CatalogueItemDetailView itemId={decoded} />
    </>
  );
}
