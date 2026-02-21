'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { MetricVariant } from '@/lib/metric-library/types';
import { ROLLUP_HIERARCHY_LEVELS } from '@/lib/metric-library/types';

interface VariantDetailResponse {
  variant: MetricVariant;
  parent?: { metric_id: string; metric_name: string } | null;
}

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    DRAFT: 'bg-amber-100 text-amber-800',
    DEPRECATED: 'bg-gray-200 text-gray-500',
    INACTIVE: 'bg-gray-200 text-gray-500',
    PROPOSED: 'bg-blue-100 text-blue-700',
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors[status] ?? colors.DRAFT}`}>{status}</span>;
};

const TypeBadge = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    SOURCED: 'bg-sky-100 text-sky-800 border border-sky-300',
    CALCULATED: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded ${colors[type] ?? ''}`}>{type}</span>;
};

const TABS = [
  { id: 'definition', label: 'Definition & Formula' },
  { id: 'rollup', label: 'Rollup Logic' },
  { id: 'lineage', label: 'Data Lineage' },
  { id: 'validation', label: 'Validation Rules' },
  { id: 'usage', label: 'Where Used' },
  { id: 'governance', label: 'Governance' },
] as const;

export default function VariantDetailView({ parentId, variantId }: { parentId: string; variantId: string }) {
  const [data, setData] = useState<VariantDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('definition');

  useEffect(() => {
    fetch(`/api/metrics/library/variants/${encodeURIComponent(variantId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [variantId]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  if (!data?.variant) return <div className="min-h-screen bg-gray-50 p-6">Variant not found.</div>;

  const v = data.variant;
  const parent = data.parent;

  const upstream = Array.isArray(v.upstream_inputs)
    ? v.upstream_inputs.map((x) => (typeof x === 'string' ? x : (x as { node_name: string }).node_name))
    : [];
  const downstream = Array.isArray(v.downstream_consumers)
    ? v.downstream_consumers.map((x) => (typeof x === 'string' ? x : (x as { node_name: string }).node_name))
    : [];
  const rollupLogic = v.rollup_logic as Record<string, string> | undefined;
  const levels = rollupLogic ? [...ROLLUP_HIERARCHY_LEVELS] : [];
  const ROLLUP_LABELS: Record<string, string> = {
    facility: 'Facility',
    counterparty: 'Counterparty',
    desk: 'Desk',
    portfolio: 'Portfolio',
    lob: 'Line of Business',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/metrics/library" className="hover:text-blue-600">Metric Library</Link>
          <span>/</span>
          <Link href={`/metrics/library/${encodeURIComponent(parentId)}`} className="hover:text-blue-600">
            {parent?.metric_name ?? parentId}
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{v.variant_name}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{v.variant_name}</h1>
              <TypeBadge type={v.variant_type} />
              <StatusBadge status={v.status} />
            </div>
            <p className="text-gray-600 text-sm max-w-3xl">{v.detailed_description ?? v.formula_display}</p>
            <code className="block mt-2 text-xs bg-gray-800 text-green-400 px-3 py-1.5 rounded font-mono">{v.variant_id}</code>
          </div>
          <div className="text-right text-xs text-gray-500 flex flex-col gap-1">
            {parent && <div>Parent: <span className="font-semibold text-gray-700">{parent.metric_name}</span></div>}
            {v.source_system && <div>Source: <span className="font-medium">{v.source_system}</span></div>}
            {v.refresh_frequency && <div>Refresh: <span className="font-medium">{v.refresh_frequency}</span></div>}
            {v.executable_metric_id && (
              <Link
                href={`/metrics/deep-dive/${encodeURIComponent(v.executable_metric_id)}`}
                className="text-blue-600 hover:underline font-medium"
              >
                Open in Metrics Engine →
              </Link>
            )}
          </div>
        </div>

        <div className="flex gap-1 border-b border-gray-200 mb-6 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'definition' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Formula</h3>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 whitespace-pre-wrap">
                {v.formula_display || '—'}
              </div>
            </div>
            {(v.companion_fields?.length ?? 0) > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Companion Metadata Fields</h3>
                <div className="flex flex-wrap gap-2">
                  {v.companion_fields!.map((f) => (
                    <span key={f} className="bg-gray-100 text-gray-700 text-xs font-mono px-2.5 py-1 rounded border border-gray-200">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'rollup' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wide">Aggregation Hierarchy</h3>
            <p className="text-xs text-gray-500 mb-4">How this variant rolls up: Facility → Counterparty → Desk → Portfolio → LoB.</p>
            {levels.length > 0 ? (
              <div className="space-y-0">
                {levels.map((level, i) => (
                  <div key={level} className="flex items-stretch">
                    <div className="flex flex-col items-center w-10 mr-4">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          ['bg-gray-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-600'][i]
                        }`}
                      >
                        {['F', 'C', 'D', 'P', 'L'][i]}
                      </div>
                      {i < levels.length - 1 && <div className="w-0.5 flex-1 bg-gray-300 my-1" />}
                    </div>
                    <div className={`flex-1 border rounded-lg p-3 ${i < levels.length - 1 ? 'mb-3' : ''} border-gray-200`}>
                      <div className="text-xs font-bold text-gray-900 uppercase mb-1">
                        {ROLLUP_LABELS[level] ?? level}
                      </div>
                      <div className="text-sm text-gray-600">{rollupLogic![level] ?? '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No rollup logic specified.</p>
            )}
          </div>
        )}

        {tab === 'lineage' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Data Lineage</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Upstream Inputs</div>
                {upstream.length > 0 ? (
                  upstream.map((u, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-sm text-gray-700">{u}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">—</p>
                )}
              </div>
              <div className="flex items-center justify-center">
                <div className="bg-blue-600 text-white rounded-lg px-4 py-3 text-center shadow-lg">
                  <div className="text-xs font-bold uppercase opacity-80">This Metric</div>
                  <div className="text-sm font-bold mt-1">{v.variant_name}</div>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Downstream Consumers</div>
                {downstream.length > 0 ? (
                  downstream.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm text-gray-700">{d}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">—</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'validation' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Validation Rules</h3>
            {(v.validation_rules?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {v.validation_rules!.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${
                      r.severity === 'ERROR' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                    }`}
                  >
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${r.severity === 'ERROR' ? 'bg-red-500' : 'bg-amber-400'}`}
                    />
                    <span className="text-sm text-gray-800 flex-1">{r.description}</span>
                    <span className={`text-xs font-bold ${r.severity === 'ERROR' ? 'text-red-600' : 'text-amber-600'}`}>
                      {r.severity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No validation rules defined.</p>
            )}
          </div>
        )}

        {tab === 'usage' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Dashboards & Reports</h3>
              {(v.used_by_dashboards?.length ?? v.used_by_reports?.length ?? 0) > 0 ? (
                [...(v.used_by_dashboards ?? []), ...(v.used_by_reports ?? [])].map((u, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-sm text-gray-700">{u}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Regulatory References</h3>
              {(v.regulatory_references?.length ?? 0) > 0 ? (
                v.regulatory_references!.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="text-sm text-gray-700">{r}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
            </div>
          </div>
        )}

        {tab === 'governance' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide">Governance & Version</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div><span className="text-gray-500">Owner Team:</span> <span className="font-medium text-gray-900">{v.owner_team ?? '—'}</span></div>
              <div><span className="text-gray-500">Approver:</span> <span className="font-medium text-gray-900">{v.approver ?? '—'}</span></div>
              <div><span className="text-gray-500">Version:</span> <span className="font-medium text-gray-900">{v.version ?? '—'}</span></div>
              <div><span className="text-gray-500">Effective Date:</span> <span className="font-medium text-gray-900">{v.effective_date ?? '—'}</span></div>
              <div><span className="text-gray-500">Review Cycle:</span> <span className="font-medium text-gray-900">{v.review_cycle ?? '—'}</span></div>
            </div>
            {v.executable_metric_id && (
              <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-xs font-bold text-amber-800 uppercase mb-1">Run in Engine</div>
                <div className="text-sm text-amber-700">
                  This variant is linked to metric <code className="font-mono">{v.executable_metric_id}</code>. Use the Metrics Engine to edit the formula and run calculations.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
