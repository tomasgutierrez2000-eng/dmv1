'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SourceMappingCanvas from '@/components/source-mapping/SourceMappingCanvas';
import { useToast } from '@/components/ui/Toast';

type MetricOption = { id: string; name: string; type: 'parent' | 'variant' };
type SelectedMetric = { type: 'parent' | 'variant'; id: string } | null;

export default function SourceMappingPage() {
  const toast = useToast();
  const [sources, setSources] = useState<Array<{ source_system_id: string; name: string; environment: string }>>([]);
  const [feeds, setFeeds] = useState<Array<{ feed_id: string; source_system_id: string; feed_name: string }>>([]);
  const [mappings, setMappings] = useState<Array<{ mapping_id: string; metric_ref_type: string; metric_ref_id: string; source_path?: string; status: string }>>([]);
  const [metrics, setMetrics] = useState<MetricOption[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<SelectedMetric>(null);
  const [form, setForm] = useState({ source_path: '', target_field_ref: '', mapping_id: '' });
  const [loading, setLoading] = useState(true);
  const [addSourceLoading, setAddSourceLoading] = useState(false);
  const [addFeedLoading, setAddFeedLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, fRes, mRes] = await Promise.all([
        fetch('/api/source-mapping/sources'),
        fetch('/api/source-mapping/feeds'),
        fetch('/api/source-mapping/mappings'),
      ]);
      if (sRes.ok) setSources(await sRes.json());
      if (fRes.ok) setFeeds(await fRes.json());
      if (mRes.ok) setMappings(await mRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    async function loadMetrics() {
      const [pRes, vRes] = await Promise.all([
        fetch('/api/metrics/library/parents'),
        fetch('/api/metrics/library/variants'),
      ]);
      const list: MetricOption[] = [];
      if (pRes.ok) {
        const parents = await pRes.json();
        (Array.isArray(parents) ? parents : []).forEach((p: { metric_id: string; metric_name: string }) =>
          list.push({ id: p.metric_id, name: p.metric_name, type: 'parent' })
        );
      }
      if (vRes.ok) {
        const variants = await vRes.json();
        (Array.isArray(variants) ? variants : []).forEach((v: { variant_id: string; variant_name: string }) =>
          list.push({ id: v.variant_id, name: v.variant_name, type: 'variant' })
        );
      }
      setMetrics(list);
    }
    loadMetrics();
  }, [load]);

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMetric || !form.mapping_id.trim()) return;
    try {
      const res = await fetch('/api/source-mapping/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapping_id: form.mapping_id.trim(),
          metric_ref_type: selectedMetric.type,
          metric_ref_id: selectedMetric.id,
          target_field_ref: form.target_field_ref.trim() || undefined,
          source_path: form.source_path.trim() || undefined,
          status: 'Draft',
        }),
      });
      if (res.ok) {
        setForm({ source_path: '', target_field_ref: '', mapping_id: '' });
        setSelectedMetric(null);
        load();
        toast.toast({ type: 'success', title: 'Mapping saved', description: `${form.mapping_id} linked to ${selectedMetric.id}` });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.toast({ type: 'error', title: 'Could not save mapping', description: (err as { error?: string }).error || res.statusText });
      }
    } catch (e) {
      toast.toast({ type: 'error', title: 'Error', description: e instanceof Error ? e.message : 'Failed to save mapping' });
    }
  };

  const handleAddSource = useCallback(async (system: { source_system_id: string; name: string; environment: string }) => {
    setAddSourceLoading(true);
    try {
      const res = await fetch('/api/source-mapping/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(system),
      });
      if (res.ok) {
        load();
        toast.toast({ type: 'success', title: 'Source registered', description: `${system.name} added to the registry` });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.toast({ type: 'error', title: 'Could not register source', description: (err as { error?: string }).error || res.statusText });
      }
    } catch (e) {
      toast.toast({ type: 'error', title: 'Error', description: e instanceof Error ? e.message : 'Failed to register source' });
    } finally {
      setAddSourceLoading(false);
    }
  }, [load, toast]);

  const handleAddFeed = useCallback(async (feed: { feed_id: string; source_system_id: string; feed_name: string; frequency?: string }) => {
    setAddFeedLoading(true);
    try {
      const res = await fetch('/api/source-mapping/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feed),
      });
      if (res.ok) {
        load();
        toast.toast({ type: 'success', title: 'Feed added', description: `${feed.feed_name} added` });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.toast({ type: 'error', title: 'Could not add feed', description: (err as { error?: string }).error || res.statusText });
      }
    } catch (e) {
      toast.toast({ type: 'error', title: 'Error', description: e instanceof Error ? e.message : 'Failed to add feed' });
    } finally {
      setAddFeedLoading(false);
    }
  }, [load, toast]);

  return (
    <SourceMappingCanvas
      sources={sources}
      feeds={feeds}
      mappings={mappings}
      metrics={metrics}
      selectedMetric={selectedMetric}
      form={form}
      loading={loading}
      onSelectMetric={setSelectedMetric}
      onFormChange={setForm}
      onSubmitMapping={handleCreateMapping}
      onRefresh={load}
      onAddSource={handleAddSource}
      onAddFeed={handleAddFeed}
      addSourceLoading={addSourceLoading}
      addFeedLoading={addFeedLoading}
    />
  );
}
