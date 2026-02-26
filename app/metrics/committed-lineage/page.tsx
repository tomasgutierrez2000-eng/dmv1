import CommittedAmountLineageView from '@/components/metric-library/CommittedAmountLineageView';

export const metadata = {
  title: 'Committed Amount (USD) — End-to-End Lineage',
  description:
    'Interactive visualization of Committed Amount metric definition, data lineage with FX conversion and syndication share, rollup hierarchy across facility → counterparty → desk → portfolio → LoB → enterprise, and dashboard consumption',
};

export default function CommittedAmountLineagePage() {
  return <CommittedAmountLineageView />;
}
