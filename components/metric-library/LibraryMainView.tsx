'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { MetricDomain } from '@/lib/metric-library/types';

interface ParentWithCount {
  metric_id: string;
  metric_name: string;
  definition: string;
  generic_formula: string;
  metric_class: string;
  direction: string;
  risk_appetite_relevant: boolean;
  domain_ids: string[];
  variant_count: number;
}

const TypeBadge = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    SOURCED: 'bg-sky-100 text-sky-800 border border-sky-300',
    CALCULATED: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    HYBRID: 'bg-amber-100 text-amber-800 border border-amber-300',
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${colors[type] ?? 'bg-gray-100 text-gray-700'}`}>
      {type}
    </span>
  );
};

export default function LibraryMainView() {
  const [domains, setDomains] = useState<MetricDomain[]>([]);
  const [parents, setParents] = useState<ParentWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/metrics/library/domains').then((r) => r.json()),
      fetch('/api/metrics/library/parents').then((r) => r.json()),
    ]).then(([d, p]) => {
      setDomains(Array.isArray(d) ? d : []);
      setParents(Array.isArray(p) ? p : []);
      setLoading(false);
    });
  }, []);

  const filtered = selectedDomain
    ? parents.filter((p) => p.domain_ids?.includes(selectedDomain))
    : parents;
  const searched = searchQuery.trim()
    ? filtered.filter(
        (p) =>
          p.metric_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.metric_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.definition ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filtered;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <Link href="/metrics" className="text-sm text-gray-500 hover:text-blue-600">
              ← Metrics Engine
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Metric Library</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {parents.length} Parent Metrics · {parents.reduce((s, p) => s + (p.variant_count ?? 0), 0)} Variants
          </p>
          <div className="mt-4 relative">
            <input
              type="text"
              placeholder="Search metrics and variants..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedDomain(null);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => {
              setSelectedDomain(null);
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !selectedDomain && !searchQuery ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Metrics
          </button>
          {domains.map((d) => (
            <button
              key={d.domain_id}
              onClick={() => {
                setSelectedDomain(d.domain_id);
                setSearchQuery('');
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                selectedDomain === d.domain_id ? 'text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              style={selectedDomain === d.domain_id ? { backgroundColor: d.color } : {}}
            >
              <span>{d.icon}</span> {d.domain_name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : searched.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            No metrics found. Run migration to import existing metrics:{' '}
            <button
              type="button"
              onClick={() => fetch('/api/metrics/library/migrate', { method: 'POST' }).then(() => window.location.reload())}
              className="text-blue-600 hover:underline ml-1"
            >
              Migrate now
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {searched.map((m) => (
              <Link
                key={m.metric_id}
                href={`/metrics/library/${encodeURIComponent(m.metric_id)}`}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all block"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-lg font-bold text-gray-900">{m.metric_name}</h3>
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
                      {m.risk_appetite_relevant && (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">Risk Appetite</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{m.definition}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{m.generic_formula}</code>
                      <div className="flex gap-1">
                        {(m.domain_ids ?? []).map((dId) => {
                          const domain = domains.find((d) => d.domain_id === dId);
                          return domain ? (
                            <span key={dId} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              {domain.icon} {domain.domain_name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-center ml-6 flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-900">{m.variant_count ?? 0}</div>
                    <div className="text-xs text-gray-500">variants</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
