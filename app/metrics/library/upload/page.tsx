import MetricUploadView from '@/components/metric-library/MetricUploadView';

export const metadata = {
  title: 'Upload Metrics',
  description: 'Upload new metrics to the data model using an Excel template',
};

export default function MetricUploadPage() {
  return <MetricUploadView />;
}
