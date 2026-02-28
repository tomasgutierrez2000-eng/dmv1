import LibraryMainView from '@/components/metric-library/LibraryMainView';

export const metadata = {
  title: 'Data Catalogue',
  description: 'Browse and search data elements, metrics, definitions, and lineage',
};

export default function MetricLibraryPage() {
  return <LibraryMainView />;
}
