'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ExternalLink, Pencil, Check, X } from 'lucide-react';
import type { MetricVariant } from '@/lib/metric-library/types';
import { ROLLUP_HIERARCHY_LEVELS, ROLLUP_LEVEL_LABELS } from '@/lib/metric-library/types';
import { TypeBadge, StatusBadge } from './badges';
import { LibraryPageLoading, LibraryError } from './LibraryStates';

interface VariantDetailResponse {
  variant: MetricVariant;
  parent?: { metric_id: string; metric_name: string } | null;
}

export default function VariantDetailView({ parentId, variantId }: { parentId: string; variantId: string }) {
  const [data, setData] = useState<VariantDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editForm, setEditForm] = useState<Partial<MetricVariant>>({});

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
            <p className="text-gray-600 text-sm max-w-3xl">{v.formula_display ?? '—'}</p>
            <code className="block mt-2 text-xs bg-gray-800 text-green-400 px-3 py-1.5 rounded font-mono w-fit">
              {v.variant_id}
            </code>
          </div>
          <div className="text-right text-xs text-gray-500 flex flex-col gap-1 flex-shrink-0">
            {parent && (
              <div>Parent: <span className="font-semibold text-gray-700">{parent.metric_name}</span></div>
            )}
            {v.source_table && <div>Source: <span className="font-medium">{v.source_table}.{v.source_field ?? '*'}</span></div>}
            {!editing ? (
              <button
                type="button"
                onClick={() => {
                  setEditForm({ ...v });
                  setEditing(true);
                  setSaveError(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                aria-label="Edit variant"
              >
                <Pencil className="w-4 h-4" aria-hidden />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    setSaveError(null);
                    setSaving(true);
                    try {
                      const res = await fetch(`/api/metrics/library/variants/${encodeURIComponent(variantId)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...v, ...editForm }),
                      });
                      if (!res.ok) {
                        const errBody = await res.json().catch(() => ({}));
                        throw new Error(typeof errBody.error === 'string' ? errBody.error : 'Save failed');
                      }
                      const updated = await res.json();
                      setData((d) => (d ? { ...d, variant: updated } : null));
                      setEditing(false);
                      setEditForm({});
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 3000);
                    } catch (err) {
                      setSaveError(err instanceof Error ? err.message : 'Save failed');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors disabled:opacity-50"
                  aria-label="Save changes"
                >
                  <Check className="w-4 h-4" aria-hidden />
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setEditing(false);
                    setEditForm({});
                    setSaveError(null);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors disabled:opacity-50"
                  aria-label="Cancel editing"
                >
                  <X className="w-4 h-4" aria-hidden />
                  Cancel
                </button>
              </div>
            )}
            {v.executable_metric_id && (
              <Link
                href={`/metrics/deep-dive/${encodeURIComponent(v.executable_metric_id)}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" aria-hidden />
                Open in Metrics Engine
              </Link>
            )}
          </div>
        </div>

        {saveError && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div role="status" aria-live="polite" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Saved successfully.
          </div>
        )}

        <div className="space-y-6">
          {/* Formula */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Formula</h2>
            {editing ? (
              <textarea
                value={editForm.formula_display ?? v.formula_display ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, formula_display: e.target.value }))}
                rows={2}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus-visible:outline-none"
              />
            ) : (
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 whitespace-pre-wrap overflow-x-auto">
                {v.formula_display || '—'}
              </div>
            )}
          </div>

          {/* Source info */}
          {(v.source_table || v.source_field || v.weighting_basis) && (
            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Source & Weighting</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                {v.source_table && (
                  <div>
                    <dt className="text-gray-500">Source Table</dt>
                    <dd className="font-mono text-gray-900 mt-0.5">{v.source_table}</dd>
                  </div>
                )}
                {v.source_field && (
                  <div>
                    <dt className="text-gray-500">Source Field</dt>
                    <dd className="font-mono text-gray-900 mt-0.5">{v.source_field}</dd>
                  </div>
                )}
                {v.weighting_basis && (
                  <div>
                    <dt className="text-gray-500">Weighting Basis</dt>
                    <dd className="font-medium text-gray-900 mt-0.5">{v.weighting_basis.replace('BY_', 'By ')}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Rollup */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">Rollup</h2>
            <p className="text-xs text-gray-500 mb-4">Facility → Counterparty → Desk → Portfolio → LoB.</p>
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
                    <div className={`flex-1 border rounded-lg p-3 ${i < levels.length - 1 ? 'mb-3' : ''} border-gray-200 bg-gray-50/50`}>
                      <div className="text-xs font-bold text-gray-900 uppercase mb-1">
                        {ROLLUP_LEVEL_LABELS[level] ?? level}
                      </div>
                      <div className="text-sm text-gray-600">{rollupLogic![level] ?? '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm py-2">No rollup logic specified.</p>
            )}
          </div>

          {/* Executable link */}
          {v.executable_metric_id && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="text-xs font-bold text-amber-800 uppercase mb-1">Run in Engine</h3>
              <p className="text-sm text-amber-700 mb-3">
                This variant is linked to metric <code className="font-mono bg-amber-100/50 px-1 rounded">{v.executable_metric_id}</code>.
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
        </div>
      </main>
    </div>
  );
}
