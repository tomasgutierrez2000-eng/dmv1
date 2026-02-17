'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import MetricsEngineLayout, { type MetricWithSource, type ImportResultState } from './MetricsEngineLayout';
import type { L3Metric, DashboardPage } from '@/data/l3-metrics';

type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
type MetricPayload = Partial<L3Metric>;

export default function MetricsEngine() {
  const [metrics, setMetrics] = useState<MetricWithSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPage, setFilterPage] = useState<DashboardPage | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail' | 'edit' | 'create'>('list');
  const [duplicateMetric, setDuplicateMetric] = useState<L3Metric | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResultState | null>(null);

  const fetchMetrics = () => {
    setLoading(true);
    fetch('/api/metrics')
      .then(res => res.json())
      .then((data: MetricWithSource[]) => setMetrics(Array.isArray(data) ? data : []))
      .catch(() => setMetrics([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMetrics(); }, []);

  const filtered = useMemo(() => {
    let list = metrics;
    if (filterPage !== 'all') list = list.filter(m => m.page === filterPage);
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
  }, [metrics, filterPage, search]);

  const sections = useMemo(() => {
    const map = new Map<string, MetricWithSource[]>();
    for (const m of filtered) {
      const sec = m.section || 'Other';
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec)!.push(m);
    }
    return map;
  }, [filtered]);

  const selectedMetric = selectedId ? metrics.find(m => m.id === selectedId) ?? null : null;
  const selectedSource = selectedMetric ? (selectedMetric as MetricWithSource).source : null;

  const handleSaveCreate = async (payload: MetricPayload) => {
    const res = await fetch('/api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create');
    fetchMetrics();
    const created = await res.json();
    setSelectedId(created.id);
    setView('detail');
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

  const handleFilterPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterPage(e.target.value as DashboardPage | 'all');
  };

  const handleImport = (e: InputChangeEvent) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    fetch('/api/metrics/import', { method: 'POST', body: form })
      .then(res => res.json())
      .then(data => { setImportResult(data); fetchMetrics(); })
      .catch(() => setImportResult({ created: [], updated: [], errors: [{ message: 'Import failed' }] }));
    e.target.value = '';
  };

  return (
    <MetricsEngineLayout
      metrics={metrics}
      loading={loading}
      filterPage={filterPage}
      setFilterPage={setFilterPage}
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
      selectedSource={selectedSource}
      handleFilterPageChange={handleFilterPageChange}
      handleExport={handleExport}
      handleImport={handleImport}
      handleSaveCreate={handleSaveCreate}
      handleSaveEdit={handleSaveEdit}
      duplicateMetric={duplicateMetric}
      onDuplicate={(metric) => { setDuplicateMetric(metric); setView('create'); }}
      onStartCreate={() => { setDuplicateMetric(null); setSelectedId(null); setView('create'); }}
      onCancelCreate={() => { setDuplicateMetric(null); setView('list'); }}
    />
  );
}
