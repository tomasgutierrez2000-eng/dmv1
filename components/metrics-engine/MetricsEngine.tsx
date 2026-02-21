'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import MetricsEngineLayout, { ENGINE_PREFIX, type MetricWithSource, type ImportResultState } from './MetricsEngineLayout';
import type { L3Metric } from '@/data/l3-metrics';
import { isDeepDiveMetric } from '@/lib/deep-dive/scope';

type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
type MetricPayload = Partial<L3Metric>;

export default function MetricsEngine() {
  const [metrics, setMetrics] = useState<MetricWithSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail' | 'edit' | 'create'>('list');
  const [duplicateMetric, setDuplicateMetric] = useState<L3Metric | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResultState | null>(null);
  const [replaceAllCustom, setReplaceAllCustom] = useState(false);

  const fetchMetrics = () => {
    setLoading(true);
    fetch('/api/metrics')
      .then(res => res.json())
      .then((data: MetricWithSource[]) => setMetrics(Array.isArray(data) ? data : []))
      .catch(() => setMetrics([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMetrics(); }, []);

  const deepDiveMetrics = useMemo(
    () => metrics.filter((m) => isDeepDiveMetric(m.id)),
    [metrics]
  );

  const filtered = useMemo(() => {
    let list = deepDiveMetrics;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.formula.toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [deepDiveMetrics, search]);

  const sections = useMemo(() => {
    const map = new Map<string, MetricWithSource[]>();
    for (const m of filtered) {
      const sec = m.section || 'Other';
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(m);
    }
    return map;
  }, [filtered]);

  const selectedMetric = selectedId ? deepDiveMetrics.find(m => m.id === selectedId) ?? null : null;

  useEffect(() => {
    if (!selectedId) return;
    if (selectedId.startsWith(ENGINE_PREFIX)) return;
    if (!deepDiveMetrics.some((m) => m.id === selectedId)) {
      setSelectedId(null);
      setView('list');
    }
  }, [selectedId, deepDiveMetrics]);

  // Keep navigation predictable when switching views on long pages.
  useEffect(() => {
    if (view === 'detail' || view === 'edit' || view === 'create') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [view, selectedId]);

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
