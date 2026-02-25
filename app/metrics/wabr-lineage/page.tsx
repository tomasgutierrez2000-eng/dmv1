import WABRLineageView from '@/components/metric-library/WABRLineageView';

export const metadata = {
  title: 'Weighted Average Base Rate — End-to-End Lineage',
  description:
    'Interactive visualization of WABR metric definition, data lineage with GSIB syndication adjustment, rollup hierarchy across facility → counterparty → desk → portfolio → LoB, and dashboard consumption',
};

export default function WABRLineagePage() {
  return <WABRLineageView />;
}
