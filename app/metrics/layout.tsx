import { redirect } from 'next/navigation';

// Metrics engine is dormant — all /metrics/* routes redirect to home.
// Remove this layout to re-enable the metrics engine.
export default function MetricsLayout() {
  redirect('/');
}
