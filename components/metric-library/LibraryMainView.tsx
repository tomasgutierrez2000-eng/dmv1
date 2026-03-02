'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, BookOpen, ChevronLeft, Database, Activity } from 'lucide-react';
import type { MetricDomain, CatalogueItem, CatalogueItemKind } from '@/lib/metric-library/types';
import { KindBadge, TypeBadge, SourcingBadge } from './badges';
import { DomainIcon } from './domain-icons';
import { LibraryLoading, LibraryError, LibraryEmpty } from './LibraryStates';

export default function LibraryMainView() {
  const [domains, setDomains] = useState<MetricDomain[]>([]);
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedKind, setSelectedKind] = useState<CatalogueItemKind | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(() => {
    setError(null);
    setLoading(true);
    Promise.all([
      fetch('/api/metrics/library/domains').then((r) => r.json()),
      fetch('/api/metrics/library/catalogue').then((r) => r.json()),
    ])
      .then(([d, c]) => {
        setDomains(Array.isArray(d) ? d : []);
        setItems(Array.isArray(c) ? c : []);
      })
      .catch(() => setError('Could not load the data catalogue.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side filtering
  let filtered = items;
  if (selectedKind) {
    filtered = filtered.filter((item) => item.kind === selectedKind);
  }
  if (selectedDomain) {
    filtered = filtered.filter((item) => item.domain_ids?.includes(selectedDomain));
  }
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.item_id.toLowerCase().includes(q) ||
        item.item_name.toLowerCase().includes(q) ||
        item.abbreviation.toLowerCase().includes(q) ||
        item.definition.toLowerCase().includes(q) ||
        item.ingredient_fields.some(
          (f) => f.table.toLowerCase().includes(q) || f.field.toLowerCase().includes(q)
        )
    );
  }

  const metricCount = items.filter((i) => i.kind === 'METRIC').length;
  const deCount = items.filter((i) => i.kind === 'DATA_ELEMENT').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/overview"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0" aria-hidden />
              Overview
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Data Catalogue</h1>
          </div>
          {!loading && !error && (
            <p className="text-sm text-gray-500 mt-1">
              {items.length} item{items.length !== 1 ? 's' : ''} · {metricCount} Metric{metricCount !== 1 ? 's' : ''} · {deCount} Data Element{deCount !== 1 ? 's' : ''}
            </p>
          )}

          {/* Search */}
          <div className="mt-4 relative">
            <label htmlFor="catalogue-search" className="sr-only">
              Search catalogue
            </label>
            <input
              id="catalogue-search"
              type="search"
              placeholder="Search by name, abbreviation, definition, or source field…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Kind filter */}
        <div className="flex gap-2 mb-4" role="group" aria-label="Filter by kind">
          <button
            type="button"
            onClick={() => setSelectedKind(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              !selectedKind ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            aria-pressed={!selectedKind}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setSelectedKind('METRIC')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              selectedKind === 'METRIC' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            aria-pressed={selectedKind === 'METRIC'}
          >
            <Activity className="w-3.5 h-3.5" aria-hidden />
            Metrics
          </button>
          <button
            type="button"
            onClick={() => setSelectedKind('DATA_ELEMENT')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 inline-flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              selectedKind === 'DATA_ELEMENT' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            aria-pressed={selectedKind === 'DATA_ELEMENT'}
          >
            <Database className="w-3.5 h-3.5" aria-hidden />
            Data Elements
          </button>
        </div>

        {/* Domain filter */}
        <div className="flex gap-2 mb-6 flex-wrap" role="group" aria-label="Filter by domain">
          <button
            type="button"
            onClick={() => setSelectedDomain(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              !selectedDomain ? 'bg-gray-900 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            aria-pressed={!selectedDomain}
          >
            All Domains
          </button>
          {domains.map((d) => (
            <button
              key={d.domain_id}
              type="button"
              onClick={() => setSelectedDomain(d.domain_id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                selectedDomain === d.domain_id ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              style={selectedDomain === d.domain_id ? { backgroundColor: d.color } : {}}
              aria-pressed={selectedDomain === d.domain_id}
            >
              <DomainIcon iconKey={d.icon} className="w-4 h-4 flex-shrink-0" />
              <span>{d.domain_name}</span>
            </button>
          ))}
        </div>

        {error && <LibraryError message={error} onRetry={fetchData} backHref="/overview" backLabel="Back to Overview" />}
        {!error && loading && <LibraryLoading />}
        {!error && !loading && filtered.length === 0 && (
          <LibraryEmpty
            icon={BookOpen}
            title="No items found"
            description={
              items.length === 0
                ? 'No catalogue items have been added yet.'
                : 'No items match your search or filter.'
            }
            action={
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedDomain(null); setSelectedKind(null); }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Clear filters
              </button>
            }
          />
        )}

        {!error && !loading && filtered.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-4" aria-live="polite">
              Showing {filtered.length} item{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-3">
              {filtered.map((item) => (
                <Link
                  key={item.item_id}
                  href={`/metrics/library/${encodeURIComponent(item.item_id)}`}
                  className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-200 hover:shadow-md cursor-pointer transition-all duration-200 block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 no-underline"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-mono text-sm font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {item.abbreviation}
                        </span>
                        <h2 className="text-lg font-bold text-gray-900 truncate">{item.item_name}</h2>
                        <KindBadge kind={item.kind} />
                        <TypeBadge type={item.metric_class} />
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{item.definition}</p>
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg font-mono truncate max-w-full">
                          {item.generic_formula}
                        </code>
                        <div className="flex gap-1 flex-wrap">
                          {item.domain_ids.map((dId) => {
                            const domain = domains.find((d) => d.domain_id === dId);
                            return domain ? (
                              <span key={dId} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
                                <DomainIcon iconKey={domain.icon} className="w-3 h-3 flex-shrink-0" />
                                {domain.domain_name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {item.level_definitions
                          .filter((ld) => ld.in_record)
                          .map((ld) => (
                            <SourcingBadge key={ld.level} type={ld.sourcing_type} />
                          ))}
                        <span className="text-xs text-gray-400">
                          {item.ingredient_fields.length} ingredient{item.ingredient_fields.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end justify-center">
                      <div className="text-2xl font-bold text-gray-900 tabular-nums">{item.number_of_instances}</div>
                      <div className="text-xs text-gray-500">levels</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
