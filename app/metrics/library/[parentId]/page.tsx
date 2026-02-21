import ParentDetailView from '@/components/metric-library/ParentDetailView';

export const metadata = {
  title: 'Parent Metric — Metric Library',
  description: 'Parent metric detail and variants',
};

type Params = { parentId: string };

export default function ParentMetricPage({ params }: { params: Params }) {
  return <ParentDetailView parentId={params.parentId} />;
}
