'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, Columns3, Key, Link2, ArrowLeftRight } from 'lucide-react';
import type { DataDictionary } from '@/lib/data-dictionary';
import type { CatalogueItem } from '@/lib/metric-library/types';
import { buildIncomingReferences, buildOutgoingReferences, buildMetricUsage, countPKs, countFKs } from '@/lib/data-elements/utils';
import { LayerBadge, CategoryBadge } from './badges';
import { DataElementsPageLoading, DataElementsError } from './DataElementsStates';
import FieldsTable from './FieldsTable';
import RelationshipsPanel from './RelationshipsPanel';
import RelationshipMiniGraph from './RelationshipMiniGraph';
import MetricUsagePanel from './MetricUsagePanel';

interface TableDetailViewProps {
  layer: string;
  tableName: string;
}

export default function TableDetailView({ layer, tableName }: TableDetailViewProps) {
  const [dd, setDd] = useState<DataDictionary | null>(null);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setError(null);
    setLoading(true);
    Promise.all([
      fetch('/api/data-dictionary').then((r) => {
        if (!r.ok) throw new Error('Failed to load data dictionary');
        return r.json();
      }),
      fetch('/api/metrics/library/catalogue')
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([ddData, catData]) => {
        setDd(ddData);
        setCatalogue(Array.isArray(catData) ? catData : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const table = useMemo(() => {
    if (!dd) return null;
    const layerKey = layer as 'L1' | 'L2' | 'L3';
    const tables = dd[layerKey];
    if (!tables) return null;
    return tables.find((t) => t.name === tableName) ?? null;
  }, [dd, layer, tableName]);

  const outgoing = useMemo(() => (dd ? buildOutgoingReferences(dd, layer, tableName) : []), [dd, layer, tableName]);
  const incoming = useMemo(() => (dd ? buildIncomingReferences(dd, layer, tableName) : []), [dd, layer, tableName]);
  const metricUsage = useMemo(() => buildMetricUsage(tableName, layer, catalogue), [tableName, layer, catalogue]);

  if (loading) return <DataElementsPageLoading />;
  if (error || !table) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
        <DataElementsError
          message={error ?? `Table "${layer}.${tableName}" not found.`}
          onRetry={fetchData}
          backHref="/data-elements"
          backLabel="Back to Data Elements"
        />
      </div>
    );
  }

  const pkCount = countPKs(table);
  const fkCount = countFKs(table);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Breadcrumb */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3">
        <ol className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
          <li>
            <Link href="/data-elements" className="hover:text-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
              Data Elements Library
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-gray-300">{layer}</li>
          <li aria-hidden>/</li>
          <li className="text-gray-200 font-medium font-mono">{tableName}</li>
        </ol>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Section 1: Header */}
        <header>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <LayerBadge layer={layer} dark size="lg" />
            <CategoryBadge category={table.category} />
          </div>
          <h1 className="text-3xl font-bold text-white font-mono mb-3">{table.name}</h1>
          <div className="flex items-center gap-4 flex-wrap text-sm text-gray-400">
            <span className="inline-flex items-center gap-1.5">
              <Columns3 className="w-4 h-4" aria-hidden />
              {table.fields.length} field{table.fields.length !== 1 ? 's' : ''}
            </span>
            {pkCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-yellow-500">
                <Key className="w-4 h-4" aria-hidden />
                {pkCount} PK{pkCount !== 1 ? 's' : ''}
              </span>
            )}
            {fkCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-indigo-400">
                <Link2 className="w-4 h-4" aria-hidden />
                {fkCount} FK{fkCount !== 1 ? 's' : ''}
              </span>
            )}
            {incoming.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <ArrowLeftRight className="w-4 h-4" aria-hidden />
                {incoming.length} incoming reference{incoming.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </header>

        {/* Section 2: Fields Table */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Fields ({table.fields.length})
          </h2>
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <FieldsTable fields={table.fields} layer={layer} tableName={tableName} />
          </div>
        </section>

        {/* Section 3 & 4: Relationships */}
        {(outgoing.length > 0 || incoming.length > 0) && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Relationships ({outgoing.length + incoming.length})
            </h2>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
              <RelationshipsPanel outgoing={outgoing} incoming={incoming} />
            </div>
          </section>
        )}

        {/* Section 5: Mini-Graph */}
        {(outgoing.length > 0 || incoming.length > 0) && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
              Relationship Graph
            </h2>
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 flex justify-center">
              <RelationshipMiniGraph
                tableName={tableName}
                layer={layer}
                outgoing={outgoing}
                incoming={incoming}
              />
            </div>
          </section>
        )}

        {/* Section 6: Metric Usage */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Metric Usage ({metricUsage.length})
          </h2>
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <MetricUsagePanel usage={metricUsage} />
          </div>
        </section>

        {/* Back link */}
        <div className="pt-4 border-t border-gray-800">
          <Link
            href="/data-elements"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            Back to Data Elements Library
          </Link>
        </div>
      </div>
    </div>
  );
}
