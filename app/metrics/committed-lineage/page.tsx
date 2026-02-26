import CommittedLineageView from '@/components/metric-library/CommittedLineageView';

export const metadata = {
  title: 'Committed Amount — End-to-End Lineage',
  description:
    'Visualization of Committed metric definition, Facility and Counterparty calculation paths, data lineage, and rollup hierarchy from facility to enterprise.',
};

export default function CommittedLineagePage() {
  return <CommittedLineageView />;
}
