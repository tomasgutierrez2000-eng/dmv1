import ExtRatingLineageWithDemo from './ExtRatingLineageWithDemo';

export const metadata = {
  title: 'External Rating End-to-End Lineage',
  description:
    'Interactive visualization of External Credit Rating data lineage — from counterparty-level sourcing through notch-based averaging at desk, portfolio, and business segment levels',
};

export default function ExtRatingLineagePage() {
  return <ExtRatingLineageWithDemo />;
}
