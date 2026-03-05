import MetricWizard from '@/components/metric-library/MetricWizard';

export const metadata = {
  title: 'New Metric — Metric Library',
  description: 'Create a new metric with auto-generated visualizations, demos, and lineage.',
};

export default function NewMetricPage() {
  return <MetricWizard />;
}
