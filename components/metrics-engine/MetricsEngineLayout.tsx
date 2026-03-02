'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Download, Upload, FileSpreadsheet, FileJson, FileCode,
  ChevronRight, Layers, Calculator, BarChart3, Copy, Check, ExternalLink,
} from 'lucide-react';
import { CALCULATION_DIMENSION_LABELS } from '@/data/l3-metrics';
import { CONSUMPTION_LEVELS, DIMENSION_TO_CONSUMPTION_LEVEL } from '@/data/l3-metrics';
import type { CalculationDimension } from '@/data/l3-metrics';
import MetricDetailView from './MetricDetailView';
import MetricForm from './MetricForm';
import DSCREngine from './engines/DSCREngine';
import ConsumeApiIntegrationGuide from './ConsumeApiIntegrationGuide';
import type { L3Metric } from '@/data/l3-metrics';

const CALCULATION_ENGINES = [
  { id: 'dscr', name: 'DSCR', description: 'Variant builder' },
] as const;
export const ENGINE_PREFIX = 'engine:';

export interface MetricWithSource extends L3Metric {
  source: 'builtin' | 'custom';
}

export interface ImportResultState {
  created: string[];
  updated: string[];
  errors: { message: string; row?: number; sheet?: string }[];
  replaced?: boolean;
  count?: number;
}

type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
type MetricPayload = Partial<L3Metric>;

export interface MetricsEngineLayoutProps {
  loading: boolean;
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
  handleExport: (format: 'json' | 'xlsx' | 'template') => void;
  handleImport: (e: InputChangeEvent) => void;
  replaceAllCustom: boolean;
  setReplaceAllCustom: (v: boolean) => void;
  handleSaveCreate: (payload: MetricPayload) => Promise<void>;
  handleSaveEdit: (payload: MetricPayload) => Promise<void>;
  /** When saving from a calculator engine, persist without navigating away. */
  handleSaveCreateFromEngine?: (payload: MetricPayload) => Promise<void>;
  duplicateMetric: L3Metric | null;
  onStartCreate: () => void;
  onCancelCreate: () => void;
}

const CONSUME_LEVEL_OPTIONS: { value: CalculationDimension; label: string; level: string }[] = [
  { value: 'facility', label: CALCULATION_DIMENSION_LABELS.facility, level: DIMENSION_TO_CONSUMPTION_LEVEL.facility },
  { value: 'counterparty', label: CALCULATION_DIMENSION_LABELS.counterparty, level: DIMENSION_TO_CONSUMPTION_LEVEL.counterparty },
  { value: 'L3', label: CALCULATION_DIMENSION_LABELS.L3, level: DIMENSION_TO_CONSUMPTION_LEVEL.L3 },
  { value: 'L2', label: CALCULATION_DIMENSION_LABELS.L2, level: DIMENSION_TO_CONSUMPTION_LEVEL.L2 },
  { value: 'L1', label: CALCULATION_DIMENSION_LABELS.L1, level: DIMENSION_TO_CONSUMPTION_LEVEL.L1 },
];

export default function MetricsEngineLayout(props: MetricsEngineLayoutProps) {
  const {
    loading, search, setSearch,
    selectedId, setSelectedId, view, setView, importFileRef, importResult, setImportResult,
    sections, filtered, selectedMetric,
    handleExport, handleImport,
    replaceAllCustom, setReplaceAllCustom,
    handleSaveCreate, handleSaveEdit,
    handleSaveCreateFromEngine,
    duplicateMetric, onStartCreate, onCancelCreate,
  } = props;

  const [consumeLevel, setConsumeLevel] = useState<string>(CONSUMPTION_LEVELS[0]);
  const [copyConsumeSuccess, setCopyConsumeSuccess] = useState<'all' | 'consumable' | 'allDims' | null>(null);
  const [showApiRef, setShowApiRef] = useState(false);

  const consumeAllUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/metrics/values?level=${encodeURIComponent(consumeLevel)}&asOfDate=`
      : '';
  const consumableListUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/metrics/consumable`
      : '';
  const valuesApiBaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/metrics/values` : '';

  const copyConsumeAll = () => {
    navigator.clipboard.writeText(consumeAllUrl).then(() => {
      setCopyConsumeSuccess('all');
      setTimeout(() => setCopyConsumeSuccess(null), 2000);
    }).catch(() => setCopyConsumeSuccess(null));
  };
  const copyConsumableList = () => {
    navigator.clipboard.writeText(consumableListUrl).then(() => {
      setCopyConsumeSuccess('consumable');
      setTimeout(() => setCopyConsumeSuccess(null), 2000);
    }).catch(() => setCopyConsumeSuccess(null));
  };
  const copyAllDimensionsUrls = () => {
    const base = valuesApiBaseUrl || '';
    const block = CONSUMPTION_LEVELS.map(
      (lev) => `${lev}: ${base}?level=${lev}&asOfDate=`
    ).join('\n');
    const toCopy = `// URLs for each dimension — use one per dashboard section\n${block}`;
    navigator.clipboard.writeText(toCopy).then(() => {
      setCopyConsumeSuccess('allDims');
      setTimeout(() => setCopyConsumeSuccess(null), 2000);
    }).catch(() => setCopyConsumeSuccess(null));
  };

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
            Metric Deep Dive
          </h1>
          <p className="text-[11px] text-gray-500 mt-1">Create & edit definitions</p>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain py-2">
          <div className="px-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 px-2 mb-1">
              Calculator
            </div>
            {CALCULATION_ENGINES.map((eng) => {
              const engineId = `${ENGINE_PREFIX}${eng.id}`;
              const isSelected = selectedId === engineId;
              return (
                <button
                  key={eng.id}
                  onClick={() => { setSelectedId(engineId); setView('detail'); }}
                  aria-current={isSelected ? 'page' : undefined}
                  aria-label={`Open ${eng.name} ${eng.description}`}
                  title={`${eng.name} — ${eng.description}`}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${isSelected ? 'bg-purple-500/20 text-white' : 'hover:bg-white/[0.04] text-gray-300'}`}
                >
                  <Calculator className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" aria-hidden />
                  <span className="flex-1 truncate text-xs font-medium">{eng.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" aria-hidden />
                </button>
              );
            })}
          </div>
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
          <label className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 cursor-pointer hover:text-gray-300">
            <input
              type="checkbox"
              checked={replaceAllCustom}
              onChange={e => setReplaceAllCustom(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/40"
            />
            Replace all custom
          </label>
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
              {importResult.replaced
                ? `Replaced ${importResult.count ?? 0} custom metrics`
                : `Import: ${importResult.created.length} created, ${importResult.updated.length} updated`}
              {(importResult.errors?.length > 0) && `; ${importResult.errors.length} error(s)`}
            </span>
            <button onClick={() => setImportResult(null)} className="text-amber-300 hover:text-white text-sm">Dismiss</button>
          </div>
        )}
        <div className="px-6 py-6">
          {view === 'detail' && selectedId?.startsWith(ENGINE_PREFIX) && (
            <DSCREngine
              onBack={() => { setSelectedId(null); setView('list'); }}
              onSaveMetric={handleSaveCreateFromEngine ?? handleSaveCreate}
            />
          )}
          {view === 'detail' && selectedMetric && !selectedId?.startsWith(ENGINE_PREFIX) && (
            <MetricDetailView
              metric={selectedMetric}
              onBack={() => setView('list')}
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
                <h2 className="text-lg font-bold text-white">Calculator engine</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Use <strong className="text-purple-300">DSCR</strong> in the sidebar to build variants. Saved metrics are added to the Data Catalogue.
                </p>
              </header>

              <section
                className="mb-8 p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20"
                aria-labelledby="consume-api-section-heading"
              >
                <h2 id="consume-api-section-heading" className="text-sm font-semibold text-emerald-300 flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4" aria-hidden />
                  Consume API
                </h2>
                <p className="text-xs text-gray-400 mb-2">
                  Get all metrics at a specific dimension for your dashboard. Copy the API URL and call it with optional <code className="px-1 py-0.5 rounded bg-white/10 text-[10px]">asOfDate=</code>.
                </p>
                <div className="mb-4 p-3 rounded-lg bg-white/[0.04] border border-white/10" role="status">
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    <strong className="text-emerald-400/90">Dashboard with many dimensions?</strong> Use the same API with <code className="px-1 rounded bg-white/10">level=facility</code>, <code className="px-1 rounded bg-white/10">level=counterparty</code>, <code className="px-1 rounded bg-white/10">level=desk</code>, <code className="px-1 rounded bg-white/10">level=portfolio</code>, or <code className="px-1 rounded bg-white/10">level=lob</code> for each section. One call per dimension — no calculations in your app.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-4 mb-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider" id="consume-dimension-label">Dimension</span>
                    <select
                      value={consumeLevel}
                      onChange={(e) => setConsumeLevel(e.target.value)}
                      aria-labelledby="consume-dimension-label"
                      className="rounded-lg bg-white/10 border border-white/20 text-sm text-white px-3 py-2 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0e1a]"
                    >
                      {CONSUME_LEVEL_OPTIONS.map((opt) => (
                        <option key={opt.level} value={opt.level} className="bg-gray-900 text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={copyConsumeAll}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-200 text-sm font-medium border border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {copyConsumeSuccess === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copyConsumeSuccess === 'all' ? 'Copied' : 'Consume API'}
                    </button>
                    <button
                      type="button"
                      onClick={copyConsumableList}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      {copyConsumeSuccess === 'consumable' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      Copy consumable list URL
                    </button>
                    <button
                      type="button"
                      onClick={copyAllDimensionsUrls}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      title="Copy one URL per dimension (facility, counterparty, desk, portfolio, lob) for multi-section dashboards"
                    >
                      {copyConsumeSuccess === 'allDims' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copyConsumeSuccess === 'allDims' ? 'Copied' : 'Copy all dimensions'}
                    </button>
                  </div>
                </div>
                <div className="rounded-lg bg-black/20 border border-white/10 px-3 py-2">
                  <p className="text-[10px] text-gray-500 mb-1">All metrics at this dimension (GET)</p>
                  <code className="text-xs font-mono text-emerald-300/90 break-all">
                    {consumeAllUrl}
                  </code>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <a
                    href={consumeAllUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e1a] rounded px-1 py-0.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                    Try it (open JSON in new tab)
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowApiRef((v) => !v)}
                    aria-expanded={showApiRef}
                    className="text-xs text-gray-500 hover:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e1a] rounded px-1 py-0.5"
                  >
                    {showApiRef ? 'Hide' : 'Show'} API reference
                  </button>
                </div>
                {showApiRef && (
                  <details open className="mt-3 rounded-lg bg-black/30 border border-white/10 overflow-hidden">
                    <summary className="px-3 py-2 text-xs font-medium text-gray-400 cursor-pointer list-none">
                      Query params & response
                    </summary>
                    <div className="px-3 py-2 pt-0 text-[11px] text-gray-400 space-y-2 border-t border-white/10">
                      <p><strong className="text-gray-300">Params:</strong> <code>level</code> (required), <code>asOfDate</code> (optional, e.g. 2025-01-15), <code>runVersion</code>, <code>facilityId</code>, <code>counterpartyId</code>, <code>portfolioId</code>, <code>deskId</code>, <code>lobId</code> (optional filters).</p>
                      <p><strong className="text-gray-300">All metrics response:</strong> <code>{`{ level, asOfDate, runVersion, metrics: [ { metric: { id, name, displayFormat }, rows: [ { facility_id?, counterparty_id?, ..., value } ] } ], errors? }`}</code></p>
                      <p><strong className="text-gray-300">Single metric</strong> (add <code>metricId=ID</code>): <code>{`{ metric, level, asOfDate, runVersion, rows }`}</code></p>
                    </div>
                  </details>
                )}
                <p className="text-[11px] text-gray-500 mt-2">
                  Omit <code className="px-1 rounded bg-white/10">metricId</code> to receive every metric at the selected level. For a single metric, open the metric and use &quot;Consume API&quot; there. &quot;Consumable list&quot; returns metadata only (metric list and allowed levels); use the URL above for values.
                </p>
                <details className="mt-4 group">
                  <summary className="cursor-pointer list-none flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e1a] rounded py-1 pr-2">
                    <span className="inline-block transition-transform group-open:rotate-90">▶</span>
                    Dashboard integration guide (copy-paste snippets)
                  </summary>
                  <div className="mt-3 pl-4 border-l-2 border-emerald-500/30">
                    <ConsumeApiIntegrationGuide
                      valuesApiBaseUrl={valuesApiBaseUrl}
                      singleMetricExample={{ metricId: 'C101', level: consumeLevel }}
                    />
                  </div>
                </details>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
