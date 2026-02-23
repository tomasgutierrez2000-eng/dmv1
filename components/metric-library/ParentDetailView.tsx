'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { MetricDomain } from '@/lib/metric-library/types';
import { TypeBadge, StatusBadge } from './badges';
import { DomainIcon } from './domain-icons';
import { LibraryPageLoading, LibraryError } from './LibraryStates';

interface ParentDetail {
  metric_id: string;
  metric_name: string;
  definition: string;
  generic_formula: string;
  metric_class: string;
  unit_type: string;
  direction: string;
  risk_appetite_relevant: boolean;
  rollup_philosophy: string;
  rollup_description: string;
  domain_ids: string[];
  variant_count?: number;
  variants: VariantSummary[];
}

interface VariantSummary {
  variant_id: string;
  variant_name: string;
  variant_type: string;
  status: string;
  formula_display?: string;
  detailed_description?: string;
  source_system?: string;
  refresh_frequency?: string;
  executable_metric_id?: string | null;
  used_by_dashboards?: string[];
  used_by_reports?: string[];
}

const TABS = [
  { id: 'variants' as const, label: 'Variants' },
  { id: 'rollup' as const, label: 'Rollup Philosophy' },
  { id: 'domains' as const, label: 'Domains' },
];

export default function ParentDetailView({ parentId }: { parentId: string }) {
  const [data, setData] = useState<ParentDetail | null>(null);
  const [domains, setDomains] = useState<MetricDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('variants');

  const fetchData = useCallback(() => {
    setError(null);
    setLoading(true);
    Promise.all([
      fetch(`/api/metrics/library/parents/${encodeURIComponent(parentId)}`).then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Parent metric not found' : 'Failed to load');
        return r.json();
      }),
      fetch('/api/metrics/library/domains').then((r) => r.json()),
    ])
      .then(([detail, d]) => {
        setData(detail);
        setDomains(Array.isArray(d) ? d : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [parentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LibraryPageLoading />;
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <LibraryError
          message={error ?? 'Parent metric not found.'}
          onRetry={fetchData}
          backHref="/metrics/library"
          backLabel="Back to Library"
        />
      </div>
    );
  }

  const m = data;
  const variantCount = m.variants?.length ?? m.variant_count ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/metrics/library" className="hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
              Metric Library
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-gray-900 font-medium" aria-current="page">
            {m.metric_name}
          </li>
        </ol>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{m.metric_name}</h1>
              <TypeBadge type={m.metric_class} />
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  m.direction === 'HIGHER_BETTER'
                    ? 'bg-green-50 text-green-600'
                    : m.direction === 'LOWER_BETTER'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-gray-50 text-gray-500'
                }`}
              >
                {m.direction === 'HIGHER_BETTER' ? '↑ Higher Better' : m.direction === 'LOWER_BETTER' ? '↓ Lower Better' : 'Neutral'}
              </span>
            </div>
            <p className="text-gray-600 text-sm max-w-3xl">{m.definition}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-3xl font-bold text-gray-900 tabular-nums">{variantCount}</div>
            <div className="text-xs text-gray-500">Variants</div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          One parent metric, multiple variants. Each variant defines how it rolls up across Facility → Counterparty → Desk → Portfolio → LoB.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-1">Generic Formula</div>
            <div className="font-mono text-sm text-gray-900 break-words">{m.generic_formula}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-1">Unit</div>
            <div className="text-lg font-bold text-gray-900">{m.unit_type}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-1">Rollup Philosophy</div>
            <div className="text-sm text-gray-700">{(m.rollup_philosophy ?? m.rollup_description ?? '').split('.')[0] || '—'}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm transition-shadow hover:shadow-md">
            <div className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-1">Risk Appetite</div>
            <div className={`text-sm font-bold ${m.risk_appetite_relevant ? 'text-green-600' : 'text-gray-400'}`}>
              {m.risk_appetite_relevant ? 'Yes — Linked' : 'No'}
            </div>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Parent metric sections"
          className="flex gap-1 border-b border-gray-200 mb-6"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`parent-tab-${t.id}`}
              id={`parent-tab-${t.id}-btn`}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.id === 'variants' ? `Variants (${variantCount})` : t.label}
            </button>
          ))}
        </div>

        {tab === 'variants' && (
          <section
            id="parent-tab-variants"
            role="tabpanel"
            aria-labelledby="parent-tab-variants-btn"
            className="space-y-3"
          >
            <p className="text-sm text-gray-500 mb-2">
              Click any variant to see its full definition, formula, rollup logic, data lineage, validation rules, usage, and governance.
            </p>
            {(m.variants ?? []).length > 0 ? (
              (m.variants ?? []).map((v) => (
                <Link
                  key={v.variant_id}
                  href={`/metrics/library/${encodeURIComponent(parentId)}/${encodeURIComponent(v.variant_id)}`}
                  className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-200 hover:shadow-md cursor-pointer transition-all duration-200 block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 no-underline"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-gray-900">{v.variant_name}</span>
                        <TypeBadge type={v.variant_type} />
                        <StatusBadge status={v.status} />
                      </div>
                      <code className="text-xs text-gray-400 font-mono">{v.variant_id}</code>
                      <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{v.detailed_description ?? v.formula_display ?? '—'}</p>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                        {v.source_system && (
                          <span>Source: <span className="font-medium text-gray-700">{v.source_system}</span></span>
                        )}
                        {v.refresh_frequency && (
                          <span>Refresh: <span className="font-medium text-gray-700">{v.refresh_frequency}</span></span>
                        )}
                        {((v.used_by_dashboards?.length ?? 0) + (v.used_by_reports?.length ?? 0)) > 0 && (
                          <span>Used by: <span className="font-medium text-gray-700">{(v.used_by_dashboards?.length ?? 0) + (v.used_by_reports?.length ?? 0)} dashboards/reports</span></span>
                        )}
                        {v.executable_metric_id && (
                          <span className="font-medium text-green-600">Runnable in Engine</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-blue-500" aria-hidden />
                  </div>
                </Link>
              ))
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
                <p className="text-gray-700 font-medium">No variants yet</p>
                <p className="mt-1 text-sm text-gray-500">
                  Create variants by importing an Excel file from the library page, or check back once the data team has added them.
                </p>
              </div>
            )}
          </section>
        )}

        {tab === 'rollup' && (
          <section
            id="parent-tab-rollup"
            role="tabpanel"
            aria-labelledby="parent-tab-rollup-btn"
            className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm"
          >
            <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Rollup Philosophy</h2>
            <p className="text-sm text-gray-700">{m.rollup_description || m.rollup_philosophy || 'Not specified.'}</p>
          </section>
        )}

        {tab === 'domains' && (
          <section
            id="parent-tab-domains"
            role="tabpanel"
            aria-labelledby="parent-tab-domains-btn"
            className="flex flex-wrap gap-3"
          >
            {(m.domain_ids ?? []).length > 0 ? (
              (m.domain_ids ?? []).map((dId) => {
                const domain = domains.find((d) => d.domain_id === dId);
                return domain ? (
                  <div
                    key={dId}
                    className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-2 shadow-sm transition-shadow hover:shadow-md"
                    style={{ borderLeftWidth: 4, borderLeftColor: domain.color }}
                  >
                    <DomainIcon iconKey={domain.icon} className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    <span className="font-medium text-gray-900">{domain.domain_name}</span>
                  </div>
                ) : null;
              })
            ) : (
              <p className="text-gray-500">No domains assigned.</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
