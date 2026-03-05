import AllocPctLineageWithDemo from './AllocPctLineageWithDemo';

export const metadata = {
  title: 'Counterparty Allocation % End-to-End Lineage',
  description:
    'Interactive visualization of Counterparty Allocation % metric — legal participation and economic allocation variants, data lineage, weighted-average rollup, and dashboard consumption with guided demo walkthrough',
};

export default function AllocPctLineagePage() {
  return <AllocPctLineageWithDemo />;
}
