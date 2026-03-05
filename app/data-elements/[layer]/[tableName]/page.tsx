import TableDetailView from '@/components/data-elements/TableDetailView';

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
  return (
    <TableDetailView
      layer={decodeURIComponent(layer)}
      tableName={decodeURIComponent(tableName)}
    />
  );
}
