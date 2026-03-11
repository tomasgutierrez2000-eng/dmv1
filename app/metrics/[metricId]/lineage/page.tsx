import DynamicMetricLineage from '@/components/metric-library/DynamicMetricLineage';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { getCatalogueItem, getCatalogueItems } from '@/lib/metric-library/store';
import { getMetricById } from '@/lib/metrics-calculation/registry';
import { generateLineage } from '@/lib/lineage-generator';
import type { L3Metric } from '@/data/l3-metrics';

interface PageProps {
  params: Promise<{ metricId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { metricId } = await params;
  const item = resolveItem(metricId);
  const name = item?.item_name ?? metricId;
  return {
    title: `${name} End-to-End Lineage`,
    description: `Interactive visualization of ${name} metric definition, data lineage, rollup hierarchy, and dashboard consumption.`,
  };
}

/** Resolve CatalogueItem by item_id OR abbreviation (case-insensitive). */
function resolveItem(metricId: string) {
  const byId = getCatalogueItem(metricId);
  if (byId) return byId;
  const all = getCatalogueItems();
  const upper = metricId.toUpperCase();
  return all.find(i => i.abbreviation.toUpperCase() === upper) ?? null;
}

/** Resolve L3Metric with lineage nodes/edges. */
function resolveL3Metric(executableMetricId: string | null | undefined): L3Metric | null {
  if (!executableMetricId) return null;
  const metric = getMetricById(executableMetricId);
  if (!metric) return null;
  if (!metric.nodes?.length) {
    const lineage = generateLineage(metric);
    return { ...metric, nodes: lineage.nodes, edges: lineage.edges };
  }
  return metric;
}

export default async function MetricLineagePage({ params }: PageProps) {
  const { metricId } = await params;
  const item = resolveItem(metricId);

  if (!item) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Metric Not Found</h1>
          <p className="text-gray-400">No catalogue item found for &quot;{metricId}&quot;</p>
        </div>
      </div>
    );
  }

  const l3Metric = resolveL3Metric(item.executable_metric_id);

  return (
    <>
      <div className="bg-[#0a0a0a] border-b border-white/10 px-6 py-3">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Metrics', href: '/metrics/library' },
          { label: item.item_name, href: `/metrics/library/${encodeURIComponent(item.item_id)}` },
          { label: 'Lineage' },
        ]} />
      </div>
      <DynamicMetricLineage item={item} l3Metric={l3Metric} />
    </>
  );
}
