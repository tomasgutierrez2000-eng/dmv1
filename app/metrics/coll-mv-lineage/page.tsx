import CollMvLineageWithDemo from './CollMvLineageWithDemo';

export const metadata = {
  title: 'Current Collateral Market Value End-to-End Lineage',
  description:
    'Interactive visualization of Current Collateral Market Value metric definition, data lineage, SUM rollup hierarchy with participation weighting, and dashboard consumption — with guided demo walkthrough',
};

export default function CollMvLineagePage() {
  return <CollMvLineageWithDemo />;
}
