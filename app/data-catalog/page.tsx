'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database, Table2, ChevronRight, ChevronDown, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface DTLTable {
  table_id: string;
  table_name_business: string;
  table_name_technical: string;
  layer: string;
  source_of_origin?: string;
}

interface DTLField {
  field_id: string;
  table_id: string;
  field_name_technical: string;
  field_name_business?: string;
  data_type?: string;
  field_classification?: string;
}

const LAYERS = ['Raw Landing', 'Conformed/Curated', 'Reporting/Aggregated', 'Reference Data'] as const;
const FIELD_CLASSIFICATIONS = ['Sourced', 'Derived', 'Enriched', 'Configuration'] as const;

export default function DataCatalogPage() {
  const toast = useToast();
  const [tables, setTables] = useState<DTLTable[]>([]);
  const [fields, setFields] = useState<DTLField[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [layerFilter, setLayerFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddTable, setShowAddTable] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [addTableLoading, setAddTableLoading] = useState(false);
  const [addFieldLoading, setAddFieldLoading] = useState(false);
  const [tableForm, setTableForm] = useState({ table_id: '', table_name_business: '', table_name_technical: '', layer: 'Reporting/Aggregated' });
  const [fieldForm, setFieldForm] = useState({ field_id: '', field_name_technical: '', field_name_business: '', data_type: '', field_classification: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = layerFilter ? `/api/dtl/tables?layer=${encodeURIComponent(layerFilter)}` : '/api/dtl/tables';
      const [tRes, fRes] = await Promise.all([
        fetch(url),
        fetch('/api/dtl/fields'),
      ]);
      if (tRes.ok) setTables(await tRes.json());
      if (fRes.ok) setFields(await fRes.json());
    } finally {
      setLoading(false);
    }
  }, [layerFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedTable = selectedTableId ? tables.find((t) => t.table_id === selectedTableId) : null;
  const tableFields = selectedTableId ? fields.filter((f) => f.table_id === selectedTableId) : [];

  const handleAddTable = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableForm.table_id.trim() || !tableForm.table_name_business.trim() || !tableForm.table_name_technical.trim()) return;
    setAddTableLoading(true);
    try {
      const res = await fetch('/api/dtl/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: tableForm.table_id.trim(),
          table_name_business: tableForm.table_name_business.trim(),
          table_name_technical: tableForm.table_name_technical.trim(),
          layer: tableForm.layer,
        }),
      });
      if (res.ok) {
        load();
        setTableForm({ table_id: '', table_name_business: '', table_name_technical: '', layer: 'Reporting/Aggregated' });
        setShowAddTable(false);
        toast.toast({ type: 'success', title: 'Table added', description: `${tableForm.table_name_business} added to the catalog` });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.toast({ type: 'error', title: 'Could not add table', description: (err as { error?: string }).error || res.statusText });
      }
    } catch (e) {
      toast.toast({ type: 'error', title: 'Error', description: e instanceof Error ? e.message : 'Failed to add table' });
    } finally {
      setAddTableLoading(false);
    }
  }, [load, tableForm, toast]);

  const handleAddField = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableId || !fieldForm.field_id.trim() || !fieldForm.field_name_technical.trim()) return;
    setAddFieldLoading(true);
    try {
      const res = await fetch('/api/dtl/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_id: fieldForm.field_id.trim(),
          table_id: selectedTableId,
          field_name_technical: fieldForm.field_name_technical.trim(),
          field_name_business: fieldForm.field_name_business.trim() || undefined,
          data_type: fieldForm.data_type.trim() || undefined,
          field_classification: fieldForm.field_classification || undefined,
        }),
      });
      if (res.ok) {
        load();
        setFieldForm({ field_id: '', field_name_technical: '', field_name_business: '', data_type: '', field_classification: '' });
        setShowAddField(false);
        toast.toast({ type: 'success', title: 'Field added', description: `${fieldForm.field_name_technical} added` });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.toast({ type: 'error', title: 'Could not add field', description: (err as { error?: string }).error || res.statusText });
      }
    } catch (e) {
      toast.toast({ type: 'error', title: 'Error', description: e instanceof Error ? e.message : 'Failed to add field' });
    } finally {
      setAddFieldLoading(false);
    }
  }, [load, selectedTableId, fieldForm, toast]);

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
                <Database className="w-6 h-6 text-blue-400" />
                <div>
                  <h1 className="text-xl font-semibold text-white">Data Catalog & Lineage</h1>
                  <p className="text-xs text-slate-400">Catalog your tables and fields, then link them in Source Mapping for full lineage</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm text-slate-400">
            Layer:
            <select
              value={layerFilter}
              onChange={(e) => setLayerFilter(e.target.value)}
              className="rounded-lg bg-slate-800 border border-slate-600 text-white px-3 py-1.5 text-sm"
            >
              <option value="">All</option>
              <option value="Raw Landing">Raw Landing</option>
              <option value="Conformed/Curated">Conformed/Curated</option>
              <option value="Reporting/Aggregated">Reporting/Aggregated</option>
              <option value="Reference Data">Reference Data</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
              <span>Loading catalog…</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 rounded-xl border border-slate-700 bg-slate-900/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-sm">Tables ({tables.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTable((v) => !v)}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded border border-emerald-500/30 hover:border-emerald-500/50 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> {showAddTable ? 'Cancel' : 'Add table'}
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto p-2">
                {showAddTable && (
                  <form onSubmit={handleAddTable} className="mb-4 p-3 rounded-lg bg-slate-800/80 border border-slate-600 space-y-2">
                    <h4 className="text-xs font-semibold text-white">Add table to catalog</h4>
                    <input
                      type="text"
                      required
                      value={tableForm.table_id}
                      onChange={(e) => setTableForm((f) => ({ ...f, table_id: e.target.value }))}
                      placeholder="Table ID (e.g. TBL-001)"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      aria-label="Table ID"
                    />
                    <input
                      type="text"
                      required
                      value={tableForm.table_name_business}
                      onChange={(e) => setTableForm((f) => ({ ...f, table_name_business: e.target.value }))}
                      placeholder="Business name"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      aria-label="Business name"
                    />
                    <input
                      type="text"
                      required
                      value={tableForm.table_name_technical}
                      onChange={(e) => setTableForm((f) => ({ ...f, table_name_technical: e.target.value }))}
                      placeholder="Technical name (e.g. raw_facility_daily)"
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      aria-label="Technical name"
                    />
                    <select
                      value={tableForm.layer}
                      onChange={(e) => setTableForm((f) => ({ ...f, layer: e.target.value }))}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      aria-label="Layer"
                    >
                      {LAYERS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <button type="submit" disabled={addTableLoading} className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">
                      {addTableLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Save table
                    </button>
                  </form>
                )}
                {tables.length === 0 && !showAddTable ? (
                  <div className="text-center py-6">
                    <p className="text-slate-500 text-sm">No tables in the catalog yet.</p>
                    <p className="text-slate-500 text-xs mt-1">Add tables that exist in your warehouse or data model.</p>
                    <button
                      type="button"
                      onClick={() => setShowAddTable(true)}
                      className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add your first table
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {tables.map((t) => (
                      <li key={t.table_id}>
                        <button
                          type="button"
                          onClick={() => setSelectedTableId(selectedTableId === t.table_id ? null : t.table_id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${
                            selectedTableId === t.table_id ? 'bg-purple-500/20 text-purple-200' : 'hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          {selectedTableId === t.table_id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="font-mono text-[10px] text-slate-500">{t.table_id}</span>
                          {t.table_name_business}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 rounded-xl border border-slate-700 bg-slate-900/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <span className="font-semibold text-sm">{selectedTable ? selectedTable.table_name_business : 'Select a table'}</span>
                {selectedTable && (
                  <button
                    type="button"
                    onClick={() => { setShowAddField((v) => !v); setFieldForm((f) => ({ ...f, field_id: '', field_name_technical: '', field_name_business: '', data_type: '', field_classification: '' })); }}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded border border-emerald-500/30 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> {showAddField ? 'Cancel' : 'Add field'}
                  </button>
                )}
              </div>
              <div className="p-4 overflow-y-auto max-h-96">
                {!selectedTable ? (
                  <p className="text-slate-500 text-sm">Select a table to see and manage its fields.</p>
                ) : (
                  <>
                    <div className="text-xs text-slate-400 mb-3">
                      <span className="font-mono">{selectedTable.table_name_technical}</span>
                      {' · '}
                      {selectedTable.layer}
                      {selectedTable.source_of_origin && ` · ${selectedTable.source_of_origin}`}
                    </div>
                    {showAddField && (
                      <form onSubmit={handleAddField} className="mb-4 p-4 rounded-lg bg-slate-800/80 border border-slate-600 space-y-2">
                        <h4 className="text-xs font-semibold text-white">Add field to {selectedTable.table_name_business}</h4>
                        <input
                          type="text"
                          required
                          value={fieldForm.field_id}
                          onChange={(e) => setFieldForm((f) => ({ ...f, field_id: e.target.value }))}
                          placeholder="Field ID (e.g. table_id.field_name)"
                          className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                          aria-label="Field ID"
                        />
                        <input
                          type="text"
                          required
                          value={fieldForm.field_name_technical}
                          onChange={(e) => setFieldForm((f) => ({ ...f, field_name_technical: e.target.value }))}
                          placeholder="Technical name (e.g. gross_exposure_usd)"
                          className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                          aria-label="Technical name"
                        />
                        <input
                          type="text"
                          value={fieldForm.field_name_business}
                          onChange={(e) => setFieldForm((f) => ({ ...f, field_name_business: e.target.value }))}
                          placeholder="Business name (optional)"
                          className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                          aria-label="Business name"
                        />
                        <input
                          type="text"
                          value={fieldForm.data_type}
                          onChange={(e) => setFieldForm((f) => ({ ...f, data_type: e.target.value }))}
                          placeholder="Data type (e.g. DECIMAL(18,2))"
                          className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                          aria-label="Data type"
                        />
                        <select
                          value={fieldForm.field_classification}
                          onChange={(e) => setFieldForm((f) => ({ ...f, field_classification: e.target.value }))}
                          className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-600 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                          aria-label="Classification"
                        >
                          <option value="">— Classification —</option>
                          {FIELD_CLASSIFICATIONS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <button type="submit" disabled={addFieldLoading} className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">
                          {addFieldLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          Save field
                        </button>
                      </form>
                    )}
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Fields ({tableFields.length})</div>
                    {tableFields.length === 0 && !showAddField ? (
                      <p className="text-slate-500 text-sm">No fields yet. Add fields to describe the table columns.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-500 border-b border-slate-700">
                            <th className="py-2 pr-4">Technical name</th>
                            <th className="py-2 pr-4">Business name</th>
                            <th className="py-2 pr-4">Type</th>
                            <th className="py-2">Classification</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableFields.map((f) => (
                            <tr key={f.field_id} className="border-b border-slate-700/50">
                              <td className="py-2 pr-4 font-mono text-purple-300">{f.field_name_technical}</td>
                              <td className="py-2 pr-4 text-slate-300">{f.field_name_business ?? '—'}</td>
                              <td className="py-2 pr-4 text-slate-400">{f.data_type ?? '—'}</td>
                              <td className="py-2 text-slate-400">{f.field_classification ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-slate-500 text-sm mt-6">
          <Link href="/lineage" className="text-purple-400 hover:underline">L3 Lineage</Link>
          {' · '}
          <Link href="/metrics/library" className="text-purple-400 hover:underline">Metric Library</Link>
          {' · '}
          <Link href="/source-mapping" className="text-purple-400 hover:underline">Source Mapping</Link>
        </p>
      </main>
    </div>
  );
}
