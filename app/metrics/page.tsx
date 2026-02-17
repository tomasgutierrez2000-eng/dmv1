import MetricsEngine from '@/components/metrics-engine/MetricsEngine';

export const metadata = {
  title: 'Metrics Engine',
  description: 'View, edit, and manage L3 metrics with formula editing and lineage visualization',
};

export default function MetricsPage() {
  return <MetricsEngine />;
}
