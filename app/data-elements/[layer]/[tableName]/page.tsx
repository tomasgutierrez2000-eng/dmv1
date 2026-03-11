import TableDetailView from '@/components/data-elements/TableDetailView';
import Breadcrumb from '@/components/ui/Breadcrumb';

export const metadata = {
  title: 'Table Detail',
  description: 'View table fields, relationships, and metric usage',
};

export default async function TableDetailPage({
  params,
}: {
  params: Promise<{ layer: string; tableName: string }>;
}) {
  const { layer, tableName } = await params;
  const decodedLayer = decodeURIComponent(layer);
  const decodedTable = decodeURIComponent(tableName);

  return (
    <>
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-3">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Data Elements', href: '/data-elements' },
          { label: decodedLayer.toUpperCase() },
          { label: decodedTable },
        ]} />
      </div>
      <TableDetailView layer={decodedLayer} tableName={decodedTable} />
    </>
  );
}
