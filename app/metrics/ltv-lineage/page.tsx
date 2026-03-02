import LTVLineageWithDemo from './LTVLineageWithDemo';

export const metadata = {
  title: 'LTV End-to-End Lineage',
  description:
    'Interactive visualization of LTV (Loan-to-Value) metric definition, data lineage from 4 source tables, hierarchy traversal, rollup, and dashboard consumption',
};

export default function LTVLineagePage() {
  return <LTVLineageWithDemo />;
}
