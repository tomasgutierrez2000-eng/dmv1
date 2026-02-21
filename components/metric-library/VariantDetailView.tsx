'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import type { MetricVariant } from '@/lib/metric-library/types';
import { ROLLUP_HIERARCHY_LEVELS, ROLLUP_LEVEL_LABELS } from '@/lib/metric-library/types';
import { TypeBadge, StatusBadge } from './badges';
import MetricLibraryLineageView from './MetricLibraryLineageView';
import { LibraryPageLoading, LibraryError } from './LibraryStates';

interface VariantDetailResponse {
  variant: MetricVariant;
  parent?: { metric_id: string; metric_name: string } | null;
}

const TABS = [
  { id: 'definition' as const, label: 'Definition & Formula' },
  { id: 'rollup' as const, label: 'Rollup Logic' },
  { id: 'lineage' as const, label: 'Data Lineage' },
  { id: 'validation' as const, label: 'Validation Rules' },
  { id: 'usage' as const, label: 'Where Used' },
  { id: 'governance' as const, label: 'Governance' },
] as const;

function validationSeverityStyle(severity: string): string {
  switch (severity) {
    case 'ERROR':
      return 'bg-red-50 border border-red-200';
    case 'WARNING':
      return 'bg-amber-50 border border-amber-200';
    case 'INFO':
      return 'bg-slate-50 border border-slate-200';
    default:
      return 'bg-gray-50 border border-gray-200';
  }
}

function validationDotStyle(severity: string): string {
  switch (severity) {
    case 'ERROR':
      return 'bg-red-500';
    case 'WARNING':
      return 'bg-amber-400';
    case 'INFO':
      return 'bg-slate-400';
    default:
      return 'bg-gray-400';
  }
}

function validationTextStyle(severity: string): string {
  switch (severity) {
    case 'ERROR':
      return 'text-red-600';
    case 'WARNING':
      return 'text-amber-600';
    case 'INFO':
      return 'text-slate-600';
    default:
      return 'text-gray-600';
  }
}

export default function VariantDetailView({ parentId, variantId }: { parentId: string; variantId: string }) {
  const [data, setData] = useState<VariantDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('definition');

  const fetchData = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch(`/api/metrics/library/variants/${encodeURIComponent(variantId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Variant not found' : 'Failed to load');
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [variantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LibraryPageLoading />;
  if (error || !data?.variant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <LibraryError
          message={error ?? 'Variant not found.'}
          onRetry={fetchData}
          backHref={`/metrics/library/${encodeURIComponent(parentId)}`}
          backLabel="Back to parent metric"
        />
      </div>
    );
  }

  const v = data.variant;
  const parent = data.parent;

  const rollupLogic = v.rollup_logic as Record<string, string> | undefined;
  const levels = rollupLogic ? [...ROLLUP_HIERARCHY_LEVELS] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
          <li>
            <Link href="/metrics/library" className="hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
              Metric Library
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link
              href={`/metrics/library/${encodeURIComponent(parentId)}`}
              className="hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              {parent?.metric_name ?? parentId}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-gray-900 font-medium" aria-current="page">
            {v.variant_name}
          </li>
        </ol>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-start justify-between gap-6 mb-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{v.variant_name}</h1>
              <TypeBadge type={v.variant_type} />
              <StatusBadge status={v.status} />
            </div>
            <p className="text-gray-600 text-sm max-w-3xl">{v.detailed_description ?? v.formula_display ?? '—'}</p>
            <code className="block mt-2 text-xs bg-gray-800 text-green-400 px-3 py-1.5 rounded font-mono w-fit">
              {v.variant_id}
            </code>
          </div>
          <div className="text-right text-xs text-gray-500 flex flex-col gap-1 flex-shrink-0">
            {parent && (
              <div>Parent: <span className="font-semibold text-gray-700">{parent.metric_name}</span></div>
            )}
            {v.source_system && <div>Source: <span className="font-medium">{v.source_system}</span></div>}
            {v.refresh_frequency && <div>Refresh: <span className="font-medium">{v.refresh_frequency}</span></div>}
            {v.executable_metric_id && (
              <Link
                href={`/metrics/deep-dive/${encodeURIComponent(v.executable_metric_id)}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" aria-hidden />
                Open in Metrics Engine
              </Link>
            )}
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Variant detail sections"
          className="flex gap-1 border-b border-gray-200 mb-6 -mb-px flex-wrap"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`variant-tab-${t.id}`}
              id={`variant-tab-${t.id}-btn`}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'definition' && (
          <section
            id="variant-tab-definition"
            role="tabpanel"
            aria-labelledby="variant-tab-definition-btn"
            className="space-y-6"
          >
            {v.detailed_description && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Description</h2>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{v.detailed_description}</p>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Formula</h2>
              <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm text-green-400 whitespace-pre-wrap overflow-x-auto">
                {v.formula_display || '—'}
              </div>
            </div>
            {(v.companion_fields?.length ?? 0) > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Companion Metadata Fields</h2>
                <p className="text-xs text-gray-500 mb-3">These fields must be ingested alongside the primary value for full context.</p>
                <div className="flex flex-wrap gap-2">
                  {v.companion_fields!.map((f, i) => {
                    const label = typeof f === 'string' ? f : (f as { field_name?: string; display_name?: string }).field_name ?? (f as { display_name?: string }).display_name ?? String(f);
                    return (
                      <span key={typeof f === 'string' ? f : `f-${i}`} className="bg-gray-100 text-gray-700 text-xs font-mono px-2.5 py-1 rounded border border-gray-200">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {tab === 'rollup' && (
          <section
            id="variant-tab-rollup"
            role="tabpanel"
            aria-labelledby="variant-tab-rollup-btn"
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
          >
            <h2 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">Aggregation Hierarchy</h2>
            <p className="text-xs text-gray-500 mb-4">How this variant rolls up: Facility → Counterparty → Desk → Portfolio → LoB.</p>
            {levels.length > 0 ? (
              <div className="space-y-0">
                {levels.map((level, i) => (
                  <div key={level} className="flex items-stretch">
                    <div className="flex flex-col items-center w-10 mr-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm ${
                          ['bg-gray-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-600'][i]
                        }`}
                      >
                        {['F', 'C', 'D', 'P', 'L'][i]}
                      </div>
                      {i < levels.length - 1 && <div className="w-0.5 flex-1 bg-gradient-to-b from-gray-300 to-gray-200 my-1 min-h-[4px]" />}
                    </div>
                    <div className={`flex-1 border rounded-xl p-3 ${i < levels.length - 1 ? 'mb-3' : ''} border-gray-200 bg-gray-50/50`}>
                      <div className="text-xs font-bold text-gray-900 uppercase mb-1">
                        {ROLLUP_LEVEL_LABELS[level] ?? level}
                      </div>
                      <div className="text-sm text-gray-600">{rollupLogic![level] ?? '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm py-4">No rollup logic specified.</p>
            )}
          </section>
        )}

        {tab === 'lineage' && (
          <section
            id="variant-tab-lineage"
            role="tabpanel"
            aria-labelledby="variant-tab-lineage-btn"
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
          >
            <h2 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">Data Lineage</h2>
            <p className="text-xs text-gray-500 mb-4">How this metric is built from L1/L2 atomic data and where it is consumed.</p>
            <MetricLibraryLineageView variant={v} />
          </section>
        )}

        {tab === 'validation' && (
          <section
            id="variant-tab-validation"
            role="tabpanel"
            aria-labelledby="variant-tab-validation-btn"
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
          >
            <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Validation Rules</h2>
            {(v.validation_rules?.length ?? 0) > 0 ? (
              <ul className="space-y-2">
                {v.validation_rules!.map((r, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${validationSeverityStyle(r.severity)}`}
                  >
                    <span
                      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${validationDotStyle(r.severity)}`}
                      aria-hidden
                    />
                    <span className="text-sm text-gray-800 flex-1">{r.description}</span>
                    <span className={`text-xs font-bold flex-shrink-0 ${validationTextStyle(r.severity)}`}>
                      {r.severity}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No validation rules defined.</p>
            )}
          </section>
        )}

        {tab === 'usage' && (
          <section
            id="variant-tab-usage"
            role="tabpanel"
            aria-labelledby="variant-tab-usage-btn"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Dashboards & Reports</h2>
              {(v.used_by_dashboards?.length ?? v.used_by_reports?.length ?? 0) > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {[...(v.used_by_dashboards ?? []), ...(v.used_by_reports ?? [])].map((u, i) => (
                    <li key={i} className="flex items-center gap-2 py-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" aria-hidden />
                      <span className="text-sm text-gray-700">{u}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Regulatory References</h2>
              {(v.regulatory_references?.length ?? 0) > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {v.regulatory_references!.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 py-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" aria-hidden />
                      <span className="text-sm text-gray-700">{r}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
            </div>
          </section>
        )}

        {tab === 'governance' && (
          <section
            id="variant-tab-governance"
            role="tabpanel"
            aria-labelledby="variant-tab-governance-btn"
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
          >
            <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Governance & Version</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div><dt className="text-gray-500">Owner Team</dt><dd className="font-medium text-gray-900 mt-0.5">{v.owner_team ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Approver</dt><dd className="font-medium text-gray-900 mt-0.5">{v.approver ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Version</dt><dd className="font-medium text-gray-900 mt-0.5">{v.version ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Effective Date</dt><dd className="font-medium text-gray-900 mt-0.5">{v.effective_date ?? '—'}</dd></div>
              <div><dt className="text-gray-500">Review Cycle</dt><dd className="font-medium text-gray-900 mt-0.5">{v.review_cycle ?? '—'}</dd></div>
            </dl>
            {v.executable_metric_id && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <h3 className="text-xs font-bold text-amber-800 uppercase mb-1">Run in Engine</h3>
                <p className="text-sm text-amber-700 mb-3">
                  This variant is linked to metric <code className="font-mono bg-amber-100/50 px-1 rounded">{v.executable_metric_id}</code>. Use the Metrics Engine to edit the formula and run calculations.
                </p>
                <Link
                  href={`/metrics/deep-dive/${encodeURIComponent(v.executable_metric_id)}`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                  Open in Metrics Engine
                </Link>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
