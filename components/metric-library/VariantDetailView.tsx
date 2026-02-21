'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ExternalLink, Pencil, Check, X } from 'lucide-react';
import type { MetricVariant } from '@/lib/metric-library/types';
import { ROLLUP_HIERARCHY_LEVELS, ROLLUP_LEVEL_LABELS } from '@/lib/metric-library/types';
import {
  getTierConfig,
  CALCULATION_AUTHORITY_TIERS,
  INTEGRATION_PATTERN_LABELS,
} from '@/lib/metric-library/calculation-authority';
import { TypeBadge, StatusBadge, CalculationAuthorityBadge } from './badges';
import MetricLibraryLineageView from './MetricLibraryLineageView';
import { LibraryPageLoading, LibraryError } from './LibraryStates';

interface VariantDetailResponse {
  variant: MetricVariant;
  parent?: { metric_id: string; metric_name: string } | null;
}

const TABS = [
  { id: 'definition' as const, label: 'Definition & Formula' },
  { id: 'calculationAuthority' as const, label: 'Calculation Authority' },
  { id: 'sourceIngestion' as const, label: 'Source & Ingestion' },
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
              {v.calculation_authority_tier && (
                <CalculationAuthorityBadge
                  tier={v.calculation_authority_tier}
                  tierName={getTierConfig(v.calculation_authority_tier)?.name}
                />
              )}
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
            {!editing ? (
              <button
                type="button"
                onClick={() => {
                  setEditForm({ ...v });
                  setEditing(true);
                  setSaveError(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors disabled:opacity-50"
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors disabled:opacity-50"
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" aria-hidden />
                Open in Metrics Engine
              </Link>
            )}
          </div>
        </div>

        {saveError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            Saved successfully.
          </div>
        )}

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

        {tab === 'calculationAuthority' && (
          <section
            id="variant-tab-calculationAuthority"
            role="tabpanel"
            aria-labelledby="variant-tab-calculationAuthority-btn"
            className="space-y-6"
          >
            {(() => {
              const tier = editing ? editForm.calculation_authority_tier ?? v.calculation_authority_tier : v.calculation_authority_tier;
              const tierConfig = tier ? CALCULATION_AUTHORITY_TIERS[tier] : null;
              return (
                <>
                  {editing ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Calculation Authority tier</h2>
                      <div className="space-y-3">
                        <label htmlFor="calc-tier-current" className="block text-xs font-bold text-gray-500 uppercase">
                          Current tier
                        </label>
                        <select
                          id="calc-tier-current"
                          value={editForm.calculation_authority_tier ?? v.calculation_authority_tier ?? ''}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              calculation_authority_tier: (e.target.value || undefined) as MetricVariant['calculation_authority_tier'],
                            }))
                          }
                          className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          aria-describedby="calc-tier-current-desc"
                        >
                          <option value="">Not set</option>
                          <option value="T1">T1 — Always Source</option>
                          <option value="T2">T2 — Source + Calculate to Validate</option>
                          <option value="T3">T3 — Always Calculate</option>
                        </select>
                        <p id="calc-tier-current-desc" className="text-xs text-gray-500">
                          T1 = always sourced from GSIB; T2 = source + calculate to validate; T3 = always calculated in-platform.
                        </p>
                        <label htmlFor="calc-tier-future" className="block text-xs font-bold text-gray-500 uppercase mt-3">
                          Future tier (optional)
                        </label>
                        <select
                          id="calc-tier-future"
                          value={editForm.calculation_authority_tier_future ?? v.calculation_authority_tier_future ?? ''}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              calculation_authority_tier_future: (e.target.value || undefined) as MetricVariant['calculation_authority_tier_future'],
                            }))
                          }
                          className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Not set</option>
                          <option value="T1">T1</option>
                          <option value="T2">T2</option>
                          <option value="T3">T3</option>
                        </select>
                      </div>
                    </div>
                  ) : tierConfig ? (
                    <div
                      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
                      style={{ borderLeftWidth: 4, borderLeftColor: tierConfig.color }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl" aria-hidden>{tierConfig.icon}</span>
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                          {tierConfig.name} — {tierConfig.subtitle}
                        </h2>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{tierConfig.shortDescription}</p>
                    </div>
                  ) : null}
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">
                      Expected GSIB data source
                    </h2>
                    <p id="expected-gsib-desc" className="text-xs text-gray-500 mb-2">
                      Where we get this metric&apos;s data from the GSIB (system / database / feed). Drives where implementation pulls data.
                    </p>
                    {editing ? (
                      <input
                        id="expected-gsib-source"
                        type="text"
                        value={editForm.expected_gsib_data_source ?? v.expected_gsib_data_source ?? v.source_system ?? ''}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, expected_gsib_data_source: e.target.value || undefined }))
                        }
                        placeholder="e.g. Basel Engine, Risk DW, Spreading system"
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        aria-describedby="expected-gsib-desc"
                      />
                    ) : (
                      <p className="text-sm text-gray-700">
                        {v.expected_gsib_data_source ?? v.source_system ?? '—'}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                      <h2 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Classification rationale</h2>
                      {editing ? (
                        <textarea
                          value={editForm.calculation_authority_rationale ?? v.calculation_authority_rationale ?? ''}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, calculation_authority_rationale: e.target.value || undefined }))
                          }
                          rows={3}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {v.calculation_authority_rationale ?? '—'}
                        </p>
                      )}
                      <h2 className="text-sm font-bold text-gray-900 mt-4 mb-2 uppercase tracking-wide">Component data needed</h2>
                      {editing ? (
                        <textarea
                          value={editForm.calculation_authority_components ?? v.calculation_authority_components ?? ''}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, calculation_authority_components: e.target.value || undefined }))
                          }
                          rows={2}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {v.calculation_authority_components ?? '—'}
                        </p>
                      )}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                      <h2 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Future evolution</h2>
                      {editing ? (
                        <textarea
                          value={editForm.calculation_authority_future_evolution ?? v.calculation_authority_future_evolution ?? ''}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, calculation_authority_future_evolution: e.target.value || undefined }))
                          }
                          rows={3}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {v.calculation_authority_future_evolution ?? '—'}
                        </p>
                      )}
                      <h2 className="text-sm font-bold text-gray-900 mt-4 mb-2 uppercase tracking-wide">Migration path</h2>
                      {editing ? (
                        <input
                          type="text"
                          value={editForm.calculation_authority_migration_path ?? v.calculation_authority_migration_path ?? ''}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, calculation_authority_migration_path: e.target.value || undefined }))
                          }
                          placeholder="e.g. T1 → T2 when CDS data is ingested"
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-sm font-medium" style={v.calculation_authority_migration_path && tierConfig ? { color: tierConfig.color } : undefined}>
                          {v.calculation_authority_migration_path ?? '—'}
                        </p>
                      )}
                      {!editing && v.calculation_authority_tier_future && v.calculation_authority_tier !== v.calculation_authority_tier_future && (
                        <p className="text-xs text-amber-700 mt-2">
                          Future tier: {v.calculation_authority_tier_future}
                        </p>
                      )}
                    </div>
                  </div>
                  {!tier && !editing && (
                    <p className="text-gray-500 text-sm">No Calculation Authority tier set. Click Edit to add one.</p>
                  )}
                </>
              );
            })()}
          </section>
        )}

        {tab === 'sourceIngestion' && (
          <section
            id="variant-tab-sourceIngestion"
            role="tabpanel"
            aria-labelledby="variant-tab-sourceIngestion-btn"
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">How we get this metric</h2>
              <p id="integration-pattern-desc" className="text-xs text-gray-500 mb-3">
                Push = GSIB sends to us. Pull = we request from GSIB. This drives setup and validation.
              </p>
              {editing ? (
                <select
                  id="source-integration-pattern"
                  value={editForm.source_integration_pattern ?? v.source_integration_pattern ?? ''}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      source_integration_pattern: (e.target.value || undefined) as MetricVariant['source_integration_pattern'],
                    }))
                  }
                  className="block w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  aria-describedby="integration-pattern-desc"
                >
                  <option value="">Not set</option>
                  <option value="PUSH">GSIB sends to us (Push)</option>
                  <option value="PULL">We request from GSIB (Pull)</option>
                </select>
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {v.source_integration_pattern
                    ? INTEGRATION_PATTERN_LABELS[v.source_integration_pattern] ?? v.source_integration_pattern
                    : '—'}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Where</h2>
                <p className="text-xs text-gray-500 mb-2">
                  Source system and feed/endpoint. For Push: where we receive. For Pull: where we request.
                </p>
                {editing ? (
                  <>
                    <input
                      type="text"
                      value={editForm.expected_gsib_data_source ?? editForm.source_system ?? v.expected_gsib_data_source ?? v.source_system ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, expected_gsib_data_source: e.target.value || undefined, source_system: e.target.value || undefined }))
                      }
                      placeholder="Source system"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={editForm.source_endpoint_or_feed ?? v.source_endpoint_or_feed ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, source_endpoint_or_feed: e.target.value || undefined }))
                      }
                      placeholder="Endpoint, feed, view, or file path"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-700">{v.expected_gsib_data_source ?? v.source_system ?? '—'}</p>
                    {v.source_endpoint_or_feed && (
                      <p className="text-sm text-gray-600 mt-1 font-mono">{v.source_endpoint_or_feed}</p>
                    )}
                  </>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">How</h2>
                <p className="text-xs text-gray-500 mb-2">Delivery method, format, frequency, lag.</p>
                {editing ? (
                  <>
                    <input
                      type="text"
                      value={editForm.source_delivery_method ?? v.source_delivery_method ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, source_delivery_method: e.target.value || undefined }))
                      }
                      placeholder="e.g. API, File drop, Batch export"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={editForm.data_format ?? v.data_format ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, data_format: e.target.value || undefined }))}
                      placeholder="Format (JSON, CSV, etc.)"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={editForm.refresh_frequency ?? v.refresh_frequency ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, refresh_frequency: e.target.value || undefined }))}
                      placeholder="Frequency"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={editForm.data_lag ?? v.data_lag ?? ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, data_lag: e.target.value || undefined }))}
                      placeholder="Data lag"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </>
                ) : (
                  <dl className="text-sm space-y-1">
                    <dt className="text-gray-500">Delivery</dt>
                    <dd className="text-gray-900">{v.source_delivery_method ?? '—'}</dd>
                    <dt className="text-gray-500 mt-2">Format</dt>
                    <dd className="text-gray-900">{v.data_format ?? '—'}</dd>
                    <dt className="text-gray-500 mt-2">Frequency</dt>
                    <dd className="text-gray-900">{v.refresh_frequency ?? '—'}</dd>
                    <dt className="text-gray-500 mt-2">Lag</dt>
                    <dd className="text-gray-900">{v.data_lag ?? '—'}</dd>
                  </dl>
                )}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Right variant</h2>
              <p className="text-xs text-gray-500 mb-2">
                How the source system identifies this variant. When connecting, ensure you map to this variant (e.g. correct LGD type).
              </p>
              {editing ? (
                <input
                  type="text"
                  value={editForm.source_variant_identifier ?? v.source_variant_identifier ?? ''}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, source_variant_identifier: e.target.value || undefined }))
                  }
                  placeholder="e.g. LGD_TYPE=DT, column: downturn_lgd"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm font-mono text-gray-900">{v.source_variant_identifier ?? '—'}</p>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">What the source sends</h2>
              <p className="text-xs text-gray-500 mb-3">
                Use this to validate that the source is sending the right information. When hooking up, ensure the feed provides these fields; compare a sample to confirm you capture the right variant.
              </p>
              {(v.source_payload_spec?.length ?? 0) > 0 ? (
                <ul className="space-y-2">
                  {v.source_payload_spec!.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="font-mono font-medium text-gray-900">{f.field_name}</span>
                      {f.data_type && <span className="text-gray-500">({f.data_type})</span>}
                      {f.required && <span className="text-amber-600 text-xs">required</span>}
                      {f.description && <span className="text-gray-600">— {f.description}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  {v.source_field_name && (
                    <p className="text-sm text-gray-700">
                      Primary field: <code className="font-mono bg-gray-100 px-1 rounded">{v.source_field_name}</code>
                    </p>
                  )}
                  {(v.companion_fields?.length ?? 0) > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Companion: {v.companion_fields!.map((c) => (typeof c === 'string' ? c : (c as { field_name?: string }).field_name ?? String(c))).join(', ')}
                    </p>
                  )}
                  {!v.source_field_name && !(v.companion_fields?.length ?? 0) && <p className="text-gray-500 text-sm">—</p>}
                </>
              )}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-amber-800 mb-2 uppercase tracking-wide">Setup / validation notes</h2>
              <p className="text-xs text-amber-800 mb-2">
                Short checklist for connecting the source (e.g. confirm feed contains required fields).
              </p>
              {editing ? (
                <textarea
                  value={editForm.source_setup_validation_notes ?? v.source_setup_validation_notes ?? ''}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, source_setup_validation_notes: e.target.value || undefined }))
                  }
                  rows={3}
                  placeholder="e.g. When connecting: confirm feed contains downturn_lgd_pct and facility_id"
                  className="block w-full rounded-lg border border-amber-300 px-3 py-2 text-sm bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              ) : (
                <p className="text-sm text-amber-900 whitespace-pre-wrap">
                  {v.source_setup_validation_notes ?? '—'}
                </p>
              )}
            </div>

            {!editing && !v.source_integration_pattern && !v.expected_gsib_data_source && !v.source_system && (
              <p className="text-gray-500 text-sm">
                No source configuration set. Click Edit to configure how we receive this metric (Push vs Pull, where, and what to expect).
              </p>
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
