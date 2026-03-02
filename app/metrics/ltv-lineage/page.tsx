import LTVLineageView from '@/components/metric-library/LTVLineageView';

export const metadata = {
  title: 'LTV (Loan-to-Value %) — End-to-End Lineage',
  description:
    'Interactive visualization of LTV metric definition, data lineage with collateral aggregation and exposure weighting, step-by-step flow with SOURCING / CALCULATION / HYBRID classification, rollup hierarchy across facility → counterparty → desk → portfolio → LoB, and dashboard consumption',
};

export default function LTVLineagePage() {
  return <LTVLineageView />;
}
