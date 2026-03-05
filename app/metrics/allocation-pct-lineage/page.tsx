import AllocPctLineageWithDemo from './AllocPctLineageWithDemo';

export const metadata = {
  title: 'Counterparty Allocation % End-to-End Lineage',
  description:
    'Interactive visualization of Counterparty Allocation % metric — raw lookup lineage from facility_counterparty_participation at facility and counterparty levels',
};

export default function AllocPctLineagePage() {
  return <AllocPctLineageWithDemo />;
}
