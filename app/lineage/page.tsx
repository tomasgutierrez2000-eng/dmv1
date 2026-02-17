import LineageExplorer from '@/components/lineage/LineageExplorer';

export const metadata = {
  title: 'L3 Metric Lineage Explorer',
  description: 'Trace how derived banking metrics are built from atomic data elements',
};

export default function LineagePage() {
  return <LineageExplorer />;
}
