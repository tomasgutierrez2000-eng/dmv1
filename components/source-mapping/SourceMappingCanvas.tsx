'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database, Link2, Plus, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

interface SourceSystem {
  source_system_id: string;
  name: string;
  environment: string;
}

interface SourceFeed {
  feed_id: string;
  source_system_id: string;
  feed_name: string;
  frequency?: string;
}

interface MappingRecord {
  mapping_id: string;
  metric_ref_type: string;
  metric_ref_id: string;
  target_field_ref?: string;
  source_path?: string;
  status: string;
}

type MetricOption = { id: string; name: string; type: 'parent' | 'variant' };
type SelectedMetric = { type: 'parent' | 'variant'; id: string } | null;

interface Props {
  sources: SourceSystem[];
  feeds: SourceFeed[];
  mappings: MappingRecord[];
  metrics: MetricOption[];
  selectedMetric: SelectedMetric;
  form: { source_path: string; target_field_ref: string; mapping_id: string };
  loading: boolean;
  onSelectMetric: (m: SelectedMetric) => void;
  onFormChange: (f: Props['form']) => void;
  onSubmitMapping: (e: React.FormEvent) => void;
  onRefresh: () => void;
  onAddSource?: (system: { source_system_id: string; name: string; environment: string }) => Promise<void>;
  onAddFeed?: (feed: { feed_id: string; source_system_id: string; feed_name: string; frequency?: string }) => Promise<void>;
  addSourceLoading?: boolean;
  addFeedLoading?: boolean;
}

export default function SourceMappingCanvas({
  sources,
  feeds,
  mappings,
  metrics,
  selectedMetric,
  form,
  loading,
  onSelectMetric,
  onFormChange,
  onSubmitMapping,
  onAddSource,
  onAddFeed,
  addSourceLoading = false,
  addFeedLoading = false,
}: Props) {
  const [showAddSource, setShowAddSource] = useState(false);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [sourceForm, setSourceForm] = useState({ source_system_id: '', name: '', environment: 'Production' });
  const [feedForm, setFeedForm] = useState({ feed_id: '', source_system_id: '', feed_name: '', frequency: '' });

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddSource || !sourceForm.source_system_id.trim() || !sourceForm.name.trim()) return;
    await onAddSource({ ...sourceForm, source_system_id: sourceForm.source_system_id.trim(), name: sourceForm.name.trim() });
    setSourceForm({ source_system_id: '', name: '', environment: 'Production' });
    setShowAddSource(false);
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddFeed || !feedForm.feed_id.trim() || !feedForm.source_system_id || !feedForm.feed_name.trim()) return;
    await onAddFeed({
      feed_id: feedForm.feed_id.trim(),
      source_system_id: feedForm.source_system_id,
      feed_name: feedForm.feed_name.trim(),
      frequency: feedForm.frequency.trim() || undefined,
    });
    setFeedForm({ feed_id: '', source_system_id: sources[0]?.source_system_id ?? '', feed_name: '', frequency: '' });
    setShowAddFeed(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
          <span>Loading source mapping…</span>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/overview" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              <div className="flex items-center gap-3">
                <Link2 className="w-6 h-6 text-purple-400" />
                <div>
                  <h1 className="text-xl font-semibold text-white">Source Mapping Canvas</h1>
                  <p className="text-xs text-slate-400">Register sources, then link metrics to your data model for full lineage</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-sm">Metric Library</span>
              </div>
            </div>
            <div className="p-3 max-h-80 overflow-y-auto">
              {metrics.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-slate-500 text-sm">No parents or variants in the library yet.</p>
                  <Link href="/metrics/library" className="inline-block mt-2 text-sm font-medium text-emerald-400 hover:text-emerald-300">
                    Add metrics in Metric Library →
                  </Link>
                </div>
              ) : (
                <ul className="space-y-1">
                  {metrics.map((m) => (
                    <li key={`${m.type}-${m.id}`}>
                      <button
                        type="button"
                        onClick={() => onSelectMetric(selectedMetric?.id === m.id ? null : { type: m.type, id: m.id })}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                          selectedMetric?.id === m.id ? 'bg-purple-500/20 text-purple-200' : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        {selectedMetric?.id === m.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-mono text-[10px] text-slate-500 w-16">{m.type}</span>
                        {m.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-sm">Source Registry</span>
              </div>
              {onAddSource && (
                <button
                  type="button"
                  onClick={() => setShowAddSource((v) => !v)}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300 px-2 py-1 rounded border border-amber-500/30 hover:border-amber-500/50"
                >
                  {showAddSource ? 'Cancel' : '+ Register source'}
                </button>
              )}
            </div>
            <div className="p-3 max-h-80 overflow-y-auto">
              {showAddSource && onAddSource && (
                <form onSubmit={handleAddSource} className="mb-4 p-3 rounded-lg bg-slate-800/80 border border-slate-600 space-y-2">
                  <h4 className="text-xs font-semibold text-white">Register source system</h4>
                  <input
                    type="text"
                    required
                    value={sourceForm.source_system_id}
                    onChange={(e) => setSourceForm((f) => ({ ...f, source_system_id: e.target.value }))}
                    placeholder="Source ID (e.g. SRC-LOANIQ)"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    aria-label="Source system ID"
                  />
                  <input
                    type="text"
                    required
                    value={sourceForm.name}
                    onChange={(e) => setSourceForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Display name (e.g. LoanIQ Production)"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    aria-label="Source system name"
                  />
                  <select
                    value={sourceForm.environment}
                    onChange={(e) => setSourceForm((f) => ({ ...f, environment: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    aria-label="Environment"
                  >
                    <option value="Production">Production</option>
                    <option value="UAT">UAT</option>
                    <option value="Development">Development</option>
                  </select>
                  <button type="submit" disabled={addSourceLoading} className="w-full py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">
                    {addSourceLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Save source system
                  </button>
                </form>
              )}
              {showAddFeed && onAddFeed && sources.length > 0 && (
                <form onSubmit={handleAddFeed} className="mb-4 p-3 rounded-lg bg-slate-800/80 border border-slate-600 space-y-2">
                  <h4 className="text-xs font-semibold text-white">Add feed</h4>
                  <select
                    required
                    value={feedForm.source_system_id}
                    onChange={(e) => setFeedForm((f) => ({ ...f, source_system_id: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    aria-label="Source system"
                  >
                    <option value="">Select source system</option>
                    {sources.map((s) => (
                      <option key={s.source_system_id} value={s.source_system_id}>{s.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={feedForm.feed_id}
                    onChange={(e) => setFeedForm((f) => ({ ...f, feed_id: e.target.value }))}
                    placeholder="Feed ID (e.g. LOANIQ-DAILY-POS)"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    aria-label="Feed ID"
                  />
                  <input
                    type="text"
                    required
                    value={feedForm.feed_name}
                    onChange={(e) => setFeedForm((f) => ({ ...f, feed_name: e.target.value }))}
                    placeholder="Feed name (e.g. Daily Position Extract)"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    aria-label="Feed name"
                  />
                  <input
                    type="text"
                    value={feedForm.frequency}
                    onChange={(e) => setFeedForm((f) => ({ ...f, frequency: e.target.value }))}
                    placeholder="Frequency (optional, e.g. Daily)"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    aria-label="Frequency"
                  />
                  <button type="submit" disabled={addFeedLoading} className="w-full py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">
                    {addFeedLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Save feed
                  </button>
                </form>
              )}
              {sources.length === 0 && !showAddSource ? (
                <div className="text-center py-6">
                  <p className="text-slate-500 text-sm">No source systems registered yet.</p>
                  <p className="text-slate-500 text-xs mt-1">Register your first source (e.g. LoanIQ, Murex) to start mapping.</p>
                  {onAddSource && (
                    <button
                      type="button"
                      onClick={() => setShowAddSource(true)}
                      className="mt-3 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium"
                    >
                      Register source system
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {onAddFeed && sources.length > 0 && !showAddFeed && (
                    <button
                      type="button"
                      onClick={() => { setShowAddFeed(true); setFeedForm((f) => ({ ...f, source_system_id: sources[0]?.source_system_id ?? '' })); }}
                      className="mb-2 w-full py-1.5 rounded border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 text-xs font-medium"
                    >
                      + Add feed
                    </button>
                  )}
                  <ul className="space-y-2">
                    {sources.map((s) => (
                      <li key={s.source_system_id} className="rounded-lg border border-slate-700/80 p-2">
                        <div className="font-medium text-sm text-white">{s.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{s.source_system_id} · {s.environment}</div>
                        {feeds.filter((f) => f.source_system_id === s.source_system_id).map((f) => (
                          <div key={f.feed_id} className="text-xs text-slate-400 mt-1 ml-2">↳ {f.feed_name}</div>
                        ))}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/80 p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create mapping
          </h3>
          {selectedMetric ? (
            <form onSubmit={onSubmitMapping} className="space-y-3">
              <div className="text-xs text-slate-400">
                Selected: <span className="font-mono text-purple-300">{selectedMetric.type} / {selectedMetric.id}</span>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Mapping ID</label>
                <input
                  type="text"
                  value={form.mapping_id}
                  onChange={(e) => onFormChange({ ...form, mapping_id: e.target.value })}
                  placeholder="e.g. MAP-001"
                  className="w-full max-w-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-white placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Source path</label>
                <input
                  type="text"
                  value={form.source_path}
                  onChange={(e) => onFormChange({ ...form, source_path: e.target.value })}
                  placeholder="System → Feed → Table → Field"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-white placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Target field ref (optional)</label>
                <input
                  type="text"
                  value={form.target_field_ref}
                  onChange={(e) => onFormChange({ ...form, target_field_ref: e.target.value })}
                  placeholder="reporting.facility_exposure.gross_exposure_usd"
                  className="w-full max-w-md px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-sm text-white placeholder-slate-500"
                />
              </div>
              <button type="submit" className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium">
                Save mapping
              </button>
            </form>
          ) : (
            <p className="text-slate-500 text-sm">Select a metric from the left panel.</p>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/80 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 font-semibold text-sm">Mappings ({mappings.length})</div>
          <div className="overflow-x-auto">
            {mappings.length === 0 ? (
              <p className="p-4 text-slate-500 text-sm">No mappings yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-700">
                    <th className="px-4 py-2">ID</th>
                    <th className="px-4 py-2">Metric ref</th>
                    <th className="px-4 py-2">Source path</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m) => (
                    <tr key={m.mapping_id} className="border-b border-slate-700/50">
                      <td className="px-4 py-2 font-mono text-purple-300">{m.mapping_id}</td>
                      <td className="px-4 py-2 font-mono text-slate-300">{m.metric_ref_type}/{m.metric_ref_id}</td>
                      <td className="px-4 py-2 text-slate-400 max-w-xs truncate">{m.source_path ?? '—'}</td>
                      <td className="px-4 py-2">{m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <p className="text-slate-500 text-sm mt-6">
          <Link href="/lineage" className="text-purple-400 hover:underline">L3 Lineage</Link>
          {' · '}
          <Link href="/metrics/library" className="text-purple-400 hover:underline">Metric Library</Link>
        </p>
      </main>
    </div>
  );
}
