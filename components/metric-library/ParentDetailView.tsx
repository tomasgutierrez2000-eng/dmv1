'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { MetricDomain } from '@/lib/metric-library/types';

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
}

const TypeBadge = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    SOURCED: 'bg-sky-100 text-sky-800 border border-sky-300',
    CALCULATED: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    HYBRID: 'bg-amber-100 text-amber-800 border border-amber-300',
  };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded ${colors[type] ?? ''}`}>{type}</span>;
};

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

export default function ParentDetailView({ parentId }: { parentId: string }) {
  const [data, setData] = useState<ParentDetail | null>(null);
  const [domains, setDomains] = useState<MetricDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'variants' | 'rollup' | 'domains'>('variants');

  useEffect(() => {
    Promise.all([
      fetch(`/api/metrics/library/parents/${encodeURIComponent(parentId)}`).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/metrics/library/domains').then((r) => r.json()),
    ]).then(([detail, d]) => {
      setData(detail ?? null);
      setDomains(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, [parentId]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  if (!data) return <div className="min-h-screen bg-gray-50 p-6">Parent metric not found.</div>;

  const m = data;
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/metrics/library" className="hover:text-blue-600">Metric Library</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{m.metric_name}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{m.metric_name}</h1>
              <TypeBadge type={m.metric_class} />
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  m.direction === 'HIGHER_BETTER' ? 'bg-green-100 text-green-700' : m.direction === 'LOWER_BETTER' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {m.direction === 'HIGHER_BETTER' ? '↑ Higher Better' : m.direction === 'LOWER_BETTER' ? '↓ Lower Better' : 'Neutral'}
              </span>
            </div>
            <p className="text-gray-600 text-sm max-w-3xl">{m.definition}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{m.variants?.length ?? m.variant_count ?? 0}</div>
            <div className="text-xs text-gray-500">Variants</div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          One parent metric, multiple variants. Each variant defines how it rolls up across Facility → Counterparty → Desk → Portfolio → LoB.
        </p>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-500 uppercase font-bold mb-1">Generic Formula</div>
            <div className="font-mono text-sm text-gray-900">{m.generic_formula}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-500 uppercase font-bold mb-1">Unit</div>
            <div className="text-lg font-bold text-gray-900">{m.unit_type}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-500 uppercase font-bold mb-1">Rollup Philosophy</div>
            <div className="text-sm text-gray-700">{(m.rollup_philosophy ?? m.rollup_description ?? '').split('.')[0]}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-500 uppercase font-bold mb-1">Risk Appetite</div>
            <div className={`text-sm font-bold ${m.risk_appetite_relevant ? 'text-green-600' : 'text-gray-400'}`}>
              {m.risk_appetite_relevant ? 'Yes — Linked' : 'No'}
            </div>
          </div>
        </div>

        <div className="flex gap-1 border-b border-gray-200 mb-4">
          {(['variants', 'rollup', 'domains'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'variants' ? `Variants (${m.variants?.length ?? 0})` : t === 'rollup' ? 'Rollup Philosophy' : 'Domains'}
            </button>
          ))}
        </div>

        {tab === 'variants' && (
          <div className="space-y-3">
            {(m.variants ?? []).map((v) => (
              <Link
                key={v.variant_id}
                href={`/metrics/library/${encodeURIComponent(parentId)}/${encodeURIComponent(v.variant_id)}`}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all block"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{v.variant_name}</span>
                      <TypeBadge type={v.variant_type} />
                      <StatusBadge status={v.status} />
                    </div>
                    <code className="text-xs text-gray-400 font-mono">{v.variant_id}</code>
                    <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{v.detailed_description ?? v.formula_display}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      {v.source_system && <span>Source: <span className="font-medium text-gray-700">{v.source_system}</span></span>}
                      {v.refresh_frequency && <span>Refresh: <span className="font-medium text-gray-700">{v.refresh_frequency}</span></span>}
                      {v.executable_metric_id && <span className="font-medium text-green-600">Runnable in Engine</span>}
                    </div>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </Link>
            ))}
            {(!m.variants || m.variants.length === 0) && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">No variants yet.</div>
            )}
          </div>
        )}

        {tab === 'rollup' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide">Rollup Philosophy</h3>
            <p className="text-sm text-gray-700">{m.rollup_description || m.rollup_philosophy || 'Not specified.'}</p>
          </div>
        )}

        {tab === 'domains' && (
          <div className="flex flex-wrap gap-3">
            {(m.domain_ids ?? []).map((dId) => {
              const domain = domains.find((d) => d.domain_id === dId);
              return domain ? (
                <div key={dId} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-2">
                  <span className="text-xl">{domain.icon}</span>
                  <span className="font-medium text-gray-900">{domain.domain_name}</span>
                </div>
              ) : null;
            })}
            {(m.domain_ids ?? []).length === 0 && <p className="text-gray-500">No domains assigned.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
