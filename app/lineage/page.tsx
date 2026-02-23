import LineageExplorer from '@/components/lineage/LineageExplorer';

export const metadata = {
  title: 'L3 Metric Lineage',
  description:
    'Explore how derived banking metrics are built from atomic data: 106+ metrics across 7 dashboard pages with interactive lineage DAGs.',
};

export default function LineagePage() {
  return <LineageExplorer />;
}
