'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, Info } from 'lucide-react';
import type { CatalogueItem, MetricDomain } from '@/lib/metric-library/types';
import { KindBadge, TypeBadge, StatusBadge } from './badges';
import { DomainIcon } from './domain-icons';
import { LibraryPageLoading, LibraryError } from './LibraryStates';
import IngredientFieldsTable from './IngredientFieldsTable';
import LevelRollupTable from './LevelRollupTable';
import CatalogueLineageDiagram from './CatalogueLineageDiagram';

export default function CatalogueItemDetailView({ itemId }: { itemId: string }) {
  const [item, setItem] = useState<CatalogueItem | null>(null);
  const [domains, setDomains] = useState<MetricDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setError(null);
    setLoading(true);
    Promise.all([
      fetch(`/api/metrics/library/catalogue/${encodeURIComponent(itemId)}`).then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Item not found' : 'Failed to load');
        return r.json();
      }),
      fetch('/api/metrics/library/domains').then((r) => r.json()),
    ])
      .then(([itemData, domainsData]) => {
        setItem(itemData);
        setDomains(Array.isArray(domainsData) ? domainsData : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [itemId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LibraryPageLoading />;
  if (error || !item) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
        <LibraryError
          message={error ?? 'Item not found.'}
          onRetry={fetchData}
          backHref="/metrics/library"
          backLabel="Back to Catalogue"
        />
      </div>
    );
  }

  const itemDomains = domains.filter((d) => item.domain_ids.includes(d.domain_id));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Breadcrumb */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3">
        <ol className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
          <li>
            <Link href="/metrics/library" className="hover:text-purple-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded">
              Data Catalogue
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-gray-200 font-medium">{item.abbreviation}</li>
        </ol>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* ── Section 1: Header ── */}
        <header>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="font-mono text-lg font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg">
              {item.abbreviation}
            </span>
            <KindBadge kind={item.kind} />
            <TypeBadge type={item.metric_class} />
            <StatusBadge status={item.status} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{item.item_name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {itemDomains.map((d) => (
              <span
                key={d.domain_id}
                className="text-xs px-2 py-1 rounded-md inline-flex items-center gap-1.5"
                style={{ backgroundColor: d.color + '20', color: d.color }}
              >
                <DomainIcon iconKey={d.icon} className="w-3.5 h-3.5" />
                {d.domain_name}
              </span>
            ))}
            {item.regulatory_references?.map((ref) => (
              <span key={ref} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                {ref}
              </span>
            ))}
          </div>
        </header>

        {/* ── Section 2: Definition & Formula ── */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Definition</h2>
          <p className="text-sm text-gray-300 leading-relaxed">{item.definition}</p>

          <div className="bg-black/30 rounded-lg p-4 border border-gray-800">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Formula</div>
            <code className="text-sm font-mono text-purple-300">{item.generic_formula}</code>
          </div>

          {item.insight && (
            <div className="flex items-start gap-3 bg-blue-950/30 rounded-lg p-4 border border-blue-900/40">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-1">Insight</div>
                <p className="text-sm text-blue-200">{item.insight}</p>
              </div>
            </div>
          )}
        </section>

        {/* ── Section 3: Ingredient Fields ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Ingredient Fields ({item.ingredient_fields.length})
          </h2>
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <IngredientFieldsTable fields={item.ingredient_fields} />
          </div>
        </section>

        {/* ── Section 4: Level Rollup Table ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Level Rollup ({item.number_of_instances} level{item.number_of_instances !== 1 ? 's' : ''})
          </h2>
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
            <LevelRollupTable levels={item.level_definitions} />
          </div>
        </section>

        {/* ── Section 5: Lineage Diagram ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Data Lineage
          </h2>
          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
            <CatalogueLineageDiagram item={item} />
          </div>
        </section>

        {/* ── Section 6: Dashboard Preview Cards ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Dashboard Outputs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {item.level_definitions
              .filter((ld) => ld.in_record)
              .map((ld) => (
                <div
                  key={ld.level}
                  className="bg-gray-900 rounded-lg border border-gray-800 p-4 hover:border-gray-700 transition-colors"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    {ld.level}
                  </div>
                  <div className="text-sm font-semibold text-gray-200 mb-2">
                    {ld.dashboard_display_name}
                  </div>
                  <div className="text-3xl font-bold text-emerald-400 tabular-nums">—</div>
                  <div className="text-[10px] text-gray-500 mt-1">Connect data source to display values</div>
                </div>
              ))}
          </div>
        </section>

        {/* Back link */}
        <div className="pt-4 border-t border-gray-800">
          <Link
            href="/metrics/library"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-purple-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            Back to Data Catalogue
          </Link>
        </div>
      </div>
    </div>
  );
}
