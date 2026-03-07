import dynamic from 'next/dynamic';

const WABRLineageView = dynamic(
  () => import('@/components/metric-library/WABRLineageView').then((m) => m.default),
  { loading: () => <div className="min-h-[60vh] flex items-center justify-center text-pwc-gray-light">Loading lineage…</div>, ssr: false }
);

export const metadata = {
  title: 'Weighted Average Base Rate — End-to-End Lineage',
  description:
    'Interactive visualization of WABR metric definition, data lineage with GSIB syndication adjustment, rollup hierarchy across facility → counterparty → desk → portfolio → LoB, and dashboard consumption',
};

export default function WABRLineagePage() {
  return <WABRLineageView />;
}
