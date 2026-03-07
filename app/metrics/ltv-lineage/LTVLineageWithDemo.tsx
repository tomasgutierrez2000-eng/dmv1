'use client';

import dynamic from 'next/dynamic';

const LTVLineageView = dynamic(
  () => import('@/components/metric-library/LTVLineageView').then((m) => m.default),
  { loading: () => <div className="min-h-[60vh] flex items-center justify-center text-pwc-gray-light">Loading lineage…</div>, ssr: false }
);

export default function LTVLineageWithDemo() {
  return <LTVLineageView />;
}
