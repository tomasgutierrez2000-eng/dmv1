import DSCRLineageWithDemo from './DSCRLineageWithDemo';

export const metadata = {
  title: 'DSCR End-to-End Lineage',
  description:
    'Interactive visualization of DSCR metric definition, data lineage, rollup hierarchy, and dashboard consumption — CRE vs C&I side by side',
};

export default function DSCRLineagePage() {
  return <DSCRLineageWithDemo />;
}
