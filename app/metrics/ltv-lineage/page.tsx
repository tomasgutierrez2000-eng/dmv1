import LTVLineageWithDemo from './LTVLineageWithDemo';

export const metadata = {
  title: 'LTV End-to-End Lineage',
  description:
    'Interactive visualization of LTV metric definition, data lineage, rollup hierarchy, and dashboard consumption — Standard vs Stressed side by side',
};

export default function LTVLineagePage() {
  return <LTVLineageWithDemo />;
}
