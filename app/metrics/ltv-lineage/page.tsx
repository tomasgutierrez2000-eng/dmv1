import LTVLineageWithDemo from './LTVLineageWithDemo';

export const metadata = {
  title: 'LTV End-to-End Lineage',
  description:
    'Interactive visualization of LTV (Loan-to-Value) metric definition, data lineage, rollup hierarchy, and dashboard consumption — with guided demo walkthrough',
};

export default function LTVLineagePage() {
  return <LTVLineageWithDemo />;
}
