import LineageExplorer from '@/components/lineage/LineageExplorer';

// L3 lineage page is display-only: uses data/l3-metrics and data/l3-tables only.
// It does not use the L1/L2 model store or /api/l1-demo-model or /api/sample-data.

export const metadata = {
  title: 'L3 Metric Lineage Explorer',
  description: 'Trace how derived banking metrics are built from atomic data elements',
};

export default function LineagePage() {
  return <LineageExplorer />;
}
