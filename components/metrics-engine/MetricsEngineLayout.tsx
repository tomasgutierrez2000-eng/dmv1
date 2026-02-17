'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Plus, Download, Upload, FileSpreadsheet, FileJson, FileCode,
  ChevronRight, Layers, Hash, TrendingUp, Zap,
} from 'lucide-react';
import { DASHBOARD_PAGES } from '@/data/l3-metrics';
import { metricWithLineage } from '@/lib/lineage-generator';
import MetricDetailView from './MetricDetailView';
import MetricForm from './MetricForm';
import type { L3Metric, DashboardPage } from '@/data/l3-metrics';

export interface MetricWithSource extends L3Metric {
  source: 'builtin' | 'custom';
}

export interface ImportResultState {
  created: string[];
  updated: string[];
  errors: { message: string; row?: number; sheet?: string }[];
}

type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
type MetricPayload = Partial<L3Metric>;

function getMetricTypeIcon(type: string): React.ReactNode {
  switch (type) {
    case 'Ratio': case 'Trend': return <TrendingUp className="w-3.5 h-3.5" />;
    case 'Derived': return <Zap className="w-3.5 h-3.5" />;
    default: return <Hash className="w-3.5 h-3.5" />;
  }
}

export interface MetricsEngineLayoutProps {
  metrics: MetricWithSource[];
  loading: boolean;
  filterPage: DashboardPage | 'all';
  setFilterPage: (v: DashboardPage | 'all') => void;
  search: string;
  setSearch: (v: string) => void;
  selectedId: string | null;
  setSelectedId: (v: string | null) => void;
  view: 'list' | 'detail' | 'edit' | 'create';
  setView: (v: 'list' | 'detail' | 'edit' | 'create') => void;
  importFileRef: React.RefObject<HTMLInputElement>;
  importResult: ImportResultState | null;
  setImportResult: (v: ImportResultState | null) => void;
  sections: Map<string, MetricWithSource[]>;
  filtered: MetricWithSource[];
  selectedMetric: MetricWithSource | null;
  selectedSource: 'builtin' | 'custom' | null;
  handleFilterPageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleExport: (format: 'json' | 'xlsx' | 'template') => void;
  handleImport: (e: InputChangeEvent) => void;
  handleSaveCreate: (payload: MetricPayload) => Promise<void>;
  handleSaveEdit: (payload: MetricPayload) => Promise<void>;
  duplicateMetric: L3Metric | null;
  onDuplicate: (metric: L3Metric) => void;
  onStartCreate: () => void;
  onCancelCreate: () => void;
}

export default function MetricsEngineLayout(props: MetricsEngineLayoutProps) {
  const {
    metrics, loading, filterPage, setFilterPage, search, setSearch,
    selectedId, setSelectedId, view, setView, importFileRef, importResult, setImportResult,
    sections, filtered, selectedMetric, selectedSource,
    handleFilterPageChange, handleExport, handleImport, handleSaveCreate, handleSaveEdit,
    duplicateMetric, onDuplicate, onStartCreate, onCancelCreate,
  } = props;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex">
      <aside className="w-64 flex-shrink-0 border-r border-white/[0.06] bg-[#080c16] flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <Link href="/overview" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-sm font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            Metrics Engine
          </h1>
        </div>
        <div className="p-3 border-b border-white/[0.04]">
          <select
            value={filterPage}
            onChange={handleFilterPageChange}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
          >
            <option value="all">All pages</option>
            {DASHBOARD_PAGES.map(p => (
              <option key={p.id} value={p.id}>{p.id}: {p.shortName}</option>
            ))}
          </select>
        </div>
        <div className="p-3 border-b border-white/[0.04]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search metrics..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">Loading...</div>
          ) : (
            <div className="space-y-0.5 px-2">
              {Array.from(sections.entries()).map(([section, list]) => (
                <div key={section} className="mb-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 px-2 mb-1">{section}</div>
                  {list.map(m => {
                    const withLineage = metricWithLineage(m);
                    const hasLineage = withLineage.nodes && withLineage.nodes.length > 0;
                    const isSelected = selectedId === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => { setSelectedId(m.id); setView('detail'); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${isSelected ? 'bg-purple-500/20 text-white' : 'hover:bg-white/[0.04] text-gray-300'}`}
                      >
                        <span className="text-[10px] font-mono text-gray-500 w-8 flex-shrink-0">{m.id}</span>
                        {m.source === 'custom' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Custom" />}
                        <span className="flex-1 truncate text-xs font-medium">{m.name}</span>
                        {hasLineage && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" title="Has lineage" />}
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ))}
              {filtered.length === 0 && !loading && <div className="px-4 py-6 text-center text-gray-500 text-sm">No metrics match</div>}
            </div>
          )}
        </div>
        <div className="p-3 border-t border-white/[0.04] space-y-2">
          <button onClick={onStartCreate} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-sm font-medium">
            <Plus className="w-4 h-4" /> Create metric
          </button>
          <div className="relative group">
            <button type="button" className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 text-xs">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <div className="hidden group-hover:block absolute bottom-full left-0 right-0 mb-1 py-1 rounded-lg bg-gray-900 border border-white/10 shadow-xl z-50">
              <button onClick={() => handleExport('template')} className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/5 hover:text-white">
                <FileCode className="w-3.5 h-3.5" /> Download template
              </button>
              <button onClick={() => handleExport('xlsx')} className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/5 hover:text-white">
                <FileSpreadsheet className="w-3.5 h-3.5" /> Export as Excel
              </button>
              <button onClick={() => handleExport('json')} className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/5 hover:text-white">
                <FileJson className="w-3.5 h-3.5" /> Export as JSON
              </button>
            </div>
          </div>
          <div>
            <input ref={importFileRef} type="file" accept=".json,.xlsx,.xls" className="hidden" onChange={handleImport} />
            <button type="button" onClick={() => importFileRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 text-xs">
              <Upload className="w-3.5 h-3.5" /> Import
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {importResult && (
          <div className="sticky top-0 z-20 px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
            <span className="text-sm text-amber-200">
              Import: {importResult.created.length} created, {importResult.updated.length} updated
              {(importResult.errors.length > 0) && `; ${importResult.errors.length} error(s)`}
            </span>
            <button onClick={() => setImportResult(null)} className="text-amber-300 hover:text-white text-sm">Dismiss</button>
          </div>
        )}
        <div className="px-6 py-6">
          {view === 'detail' && selectedMetric && (
            <MetricDetailView
              metric={selectedMetric}
              source={selectedSource ?? 'builtin'}
              onEdit={() => setView('edit')}
              onBack={() => setView('list')}
              onDuplicate={() => onDuplicate(selectedMetric)}
            />
          )}
          {view === 'edit' && selectedMetric && (
            <MetricForm metric={selectedMetric} isCreate={false} onSave={handleSaveEdit} onCancel={() => setView('detail')} />
          )}
          {view === 'create' && (
            <MetricForm
              metric={duplicateMetric ?? null}
              isCreate
              onSave={handleSaveCreate}
              onCancel={onCancelCreate}
            />
          )}
          {view === 'list' && (
            <>
              <header className="mb-6">
                <h2 className="text-lg font-bold text-white">All metrics</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {filtered.length} metric{filtered.length !== 1 ? 's' : ''}{filterPage !== 'all' && ` on ${filterPage}`} — click one to see how it is calculated
                </p>
              </header>
              <div className="space-y-4">
                {Array.from(sections.entries()).map(([section, list]) => (
                  <div key={section}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{section}</h3>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {list.map(m => {
                        const withLineage = metricWithLineage(m);
                        const hasLineage = withLineage.nodes && withLineage.nodes.length > 0;
                        return (
                          <button
                            key={m.id}
                            onClick={() => { setSelectedId(m.id); setView('detail'); }}
                            className="flex items-start gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] text-left transition-all"
                          >
                            <span className="text-gray-500 flex-shrink-0 mt-0.5">{getMetricTypeIcon(m.metricType)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono text-gray-500">{m.id}</span>
                                {(m as MetricWithSource).source === 'custom' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Custom</span>}
                                {hasLineage && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title="Has lineage" />}
                              </div>
                              <div className="text-sm font-medium text-white truncate mt-0.5">{m.name}</div>
                              <div className="text-[11px] text-gray-500 font-mono truncate mt-0.5">{m.formula}</div>
                            </div>
                            <div className="text-sm font-mono font-semibold text-emerald-400 flex-shrink-0">{m.sampleValue || '—'}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
