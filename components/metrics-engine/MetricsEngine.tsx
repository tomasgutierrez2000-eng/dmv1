'use client';

import React, { useState, useRef } from 'react';
import MetricsEngineLayout, { ENGINE_PREFIX, type MetricWithSource, type ImportResultState } from './MetricsEngineLayout';
import type { L3Metric } from '@/data/l3-metrics';

type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
type MetricPayload = Partial<L3Metric>;

/** Only the DSCR calculator lives in the engine. All metrics are browsed in the Metric Library. */
const DSCR_ENGINE_ID = `${ENGINE_PREFIX}dscr`;

export default function MetricsEngine() {
  const [selectedId, setSelectedId] = useState<string | null>(DSCR_ENGINE_ID);
  const [view, setView] = useState<'list' | 'detail' | 'edit' | 'create'>('detail');
  const [duplicateMetric, setDuplicateMetric] = useState<L3Metric | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResultState | null>(null);
  const [replaceAllCustom, setReplaceAllCustom] = useState(false);

  const fetchMetrics = () => {
    // No-op: engine no longer lists metrics; library is the source of truth.
  };

  const sections = new Map<string, MetricWithSource[]>();
  const filtered: MetricWithSource[] = [];
  const selectedMetric: MetricWithSource | null = null;
  const loading = false;
  const search = '';
  const setSearch = () => {};


  const handleSaveCreate = async (payload: MetricPayload) => {
    const res = await fetch('/api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create');
    fetchMetrics();
    const created = await res.json();
    setSelectedId(created.id);
    setView('detail');
  };

  /** Save from calculator engine: persist metric and refetch, but stay on engine (no navigation). */
  const handleSaveCreateFromEngine = async (payload: MetricPayload) => {
    const res = await fetch('/api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create');
    fetchMetrics();
  };

  const handleSaveEdit = async (payload: MetricPayload) => {
    if (!selectedId) return;
    const res = await fetch(`/api/metrics/${selectedId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update');
    fetchMetrics();
    setView('detail');
  };

  const handleExport = (format: 'json' | 'xlsx' | 'template') => {
    window.open(`/api/metrics/export?format=${format === 'template' ? 'template' : format}`, '_blank');
  };

  const handleImport = (e: InputChangeEvent) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    if (replaceAllCustom) form.append('replace', 'true');
    fetch('/api/metrics/import', { method: 'POST', body: form })
      .then(res => res.json())
      .then(data => { setImportResult(data); fetchMetrics(); })
      .catch(() => setImportResult({ created: [], updated: [], errors: [{ message: 'Import failed' }] }));
    e.target.value = '';
  };

  return (
    <MetricsEngineLayout
      loading={loading}
      search={search}
      setSearch={setSearch}
      selectedId={selectedId}
      setSelectedId={setSelectedId}
      view={view}
      setView={setView}
      importFileRef={importFileRef}
      importResult={importResult}
      setImportResult={setImportResult}
      sections={sections}
      filtered={filtered}
      selectedMetric={selectedMetric}
      handleExport={handleExport}
      handleImport={handleImport}
      replaceAllCustom={replaceAllCustom}
      setReplaceAllCustom={setReplaceAllCustom}
      handleSaveCreate={handleSaveCreate}
      handleSaveEdit={handleSaveEdit}
      handleSaveCreateFromEngine={handleSaveCreateFromEngine}
      duplicateMetric={duplicateMetric}
      onStartCreate={() => { setDuplicateMetric(null); setSelectedId(null); setView('create'); }}
      onCancelCreate={() => { setDuplicateMetric(null); setView('list'); }}
    />
  );
}
