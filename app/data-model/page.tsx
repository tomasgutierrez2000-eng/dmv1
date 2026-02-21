'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Database, Key, Link2, ChevronRight, ChevronDown, Layers, Search, RefreshCw, AlertCircle, Plus, Trash2, FileCode, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface FieldDefinition {
  name: string;
  description: string;
  category: string;
  pk_fk?: {
    is_pk: boolean;
    is_composite: boolean;
    fk_target?: {
      layer: string;
      table: string;
      field: string;
    };
  };
  why_required?: string;
  simplification_note?: string;
  data_type?: string;
  formula?: string;
  source_tables?: Array<{ layer: string; table: string }>;
  source_fields?: string;
  dashboard_usage?: string;
  grain?: string;
  notes?: string;
}

interface ParsedTableDefinition {
  name: string;
  layer: 'L1' | 'L2' | 'L3';
  category: string;
  fields: FieldDefinition[];
}

interface DataDictionary {
  L1: ParsedTableDefinition[];
  L2: ParsedTableDefinition[];
  L3: ParsedTableDefinition[];
  relationships: Array<{
    from_table: string;
    from_field: string;
    to_table: string;
    to_field: string;
    from_layer: string;
    to_layer: string;
  }>;
  derivation_dag: Record<string, string[]>;
}

interface TableDefinition {
  id: string;
  name: string;
  layer: 'L1' | 'L2' | 'L3';
  fields: string[];
  primaryKey: string;
  foreignKeys: { field: string; references: string; table: string }[];
  description?: string;
  category?: string;
}

interface AddTablePayload {
  layer: 'L1' | 'L2' | 'L3';
  name: string;
  category: string;
  fields: Array<{
    name: string;
    data_type?: string;
    pk_fk?: { is_pk: boolean; fk_target?: { layer: string; table: string; field: string } };
  }>;
}

const layerColors = {
  L1: { bg: '#D04A02', border: '#D04A02', text: '#ffffff', badge: 'bg-pwc-orange/20 text-pwc-orange' },
  L2: { bg: '#E87722', border: '#E87722', text: '#ffffff', badge: 'bg-pwc-orange-light/20 text-pwc-orange-light' },
  L3: { bg: '#6B7280', border: '#6B7280', text: '#ffffff', badge: 'bg-pwc-gray/50 text-pwc-gray-light' },
};

// Transform parsed data dictionary to visualization format
const transformDataDictionary = (dataDict: DataDictionary): TableDefinition[] => {
  const tables: TableDefinition[] = [];
  const allTables = [...dataDict.L1, ...dataDict.L2, ...dataDict.L3];

  allTables.forEach((table) => {
    // Extract primary key fields
    const pkFields = table.fields
      .filter((f) => f.pk_fk?.is_pk)
      .map((f) => f.name);
    const primaryKey = pkFields.length > 0 ? pkFields.join(', ') : 'N/A';

    // Extract foreign keys from relationships
    const foreignKeys = dataDict.relationships
      .filter((rel) => rel.from_table === table.name)
      .map((rel) => ({
        field: rel.from_field,
        references: rel.to_field,
        table: rel.to_table,
      }));

    // Get all field names
    const fieldNames = table.fields.map((f) => {
      let name = f.name;
      if (f.pk_fk?.is_pk) name += ' (PK)';
      if (f.pk_fk?.fk_target) name += ' (FK)';
      return name;
    });

    // Get description from first field or table category
    const description = table.fields[0]?.description || table.category || '';

    tables.push({
      id: table.name,
      name: table.name,
      layer: table.layer,
      fields: fieldNames,
      primaryKey,
      foreignKeys,
      description,
      category: table.category,
    });
  });

  return tables;
};

/** Get raw table from data dictionary by table name (id). */
function getTableFromDict(
  dataDict: DataDictionary | null,
  tableId: string
): ParsedTableDefinition & { layer: 'L1' | 'L2' | 'L3' } | null {
  if (!dataDict) return null;
  for (const layer of ['L1', 'L2', 'L3'] as const) {
    const t = dataDict[layer].find((x) => x.name === tableId);
    if (t) return { ...t, layer };
  }
  return null;
}

export default function DataModelPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [expandedLayers, setExpandedLayers] = useState<Set<'L1' | 'L2' | 'L3'>>(new Set(['L1', 'L2', 'L3']));
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'layers' | 'relationships'>('layers');
  const [tableDefinitions, setTableDefinitions] = useState<TableDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataDictionary, setDataDictionary] = useState<DataDictionary | null>(null);

  const [addTableOpen, setAddTableOpen] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<{ type: 'table' | 'field'; tableId?: string; layer?: 'L1' | 'L2' | 'L3'; fieldName?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generateDdlLoading, setGenerateDdlLoading] = useState(false);
  const [applyDdlLoading, setApplyDdlLoading] = useState(false);

  const [addTableForm, setAddTableForm] = useState<{
    layer: 'L1' | 'L2' | 'L3';
    name: string;
    category: string;
    fields: Array<{ name: string; data_type: string; is_pk: boolean }>;
  }>({ layer: 'L1', name: '', category: '', fields: [{ name: '', data_type: 'VARCHAR(64)', is_pk: true }] });

  const [addFieldForm, setAddFieldForm] = useState<{ name: string; data_type: string; is_pk: boolean }>({ name: '', data_type: 'VARCHAR(64)', is_pk: false });

  const loadDataDictionary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/data-dictionary');
      if (!response.ok) {
        if (response.status === 404) {
          setError('No data dictionary found. Use the Interactive Visualizer and load the L1 demo to explore the bank data model.');
        } else {
          setError('Failed to load data dictionary');
        }
        setLoading(false);
        return;
      }
      const data: DataDictionary = await response.json();
      setDataDictionary(data);
      setTableDefinitions(transformDataDictionary(data));
      setError(null);
    } catch (err) {
      setError('Error loading data dictionary');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataDictionary();
  }, [loadDataDictionary]);

  const handleAddTable = async (payload: AddTablePayload) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/data-model/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || res.statusText);
        return;
      }
      setAddTableOpen(false);
      await loadDataDictionary();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveTable = async (layer: 'L1' | 'L2' | 'L3', tableName: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/data-model/tables/${layer}/${encodeURIComponent(tableName)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || res.statusText);
        return;
      }
      setRemoveConfirm(null);
      if (selectedTable === tableName) setSelectedTable(null);
      await loadDataDictionary();
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddField = async (layer: 'L1' | 'L2' | 'L3', tableName: string, field: { name: string; data_type?: string; pk_fk?: { is_pk: boolean; fk_target?: { layer: string; table: string; field: string } } }) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/data-model/tables/${layer}/${encodeURIComponent(tableName)}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(field),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || res.statusText);
        return;
      }
      setAddFieldOpen(false);
      await loadDataDictionary();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveField = async (layer: 'L1' | 'L2' | 'L3', tableName: string, fieldName: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/data-model/tables/${layer}/${encodeURIComponent(tableName)}/fields/${encodeURIComponent(fieldName)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || res.statusText);
        return;
      }
      setRemoveConfirm(null);
      await loadDataDictionary();
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateDdl = async () => {
    setGenerateDdlLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/data-model/generate-ddl', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || res.statusText);
        return;
      }
      setActionError(null);
    } finally {
      setGenerateDdlLoading(false);
    }
  };

  const handleApplyDdl = async (dryRun: boolean) => {
    if (!dryRun && !confirm('Run DDL against the database? This may create or alter tables.')) return;
    setApplyDdlLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/data-model/apply-ddl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data.error || res.statusText);
        return;
      }
      if (data.sql) setActionError(null);
    } finally {
      setApplyDdlLoading(false);
    }
  };

  const filteredTables = useMemo(() => {
    if (!searchQuery) return tableDefinitions;
    const query = searchQuery.toLowerCase();
    return tableDefinitions.filter(
      (table) =>
        table.name.toLowerCase().includes(query) ||
        table.description?.toLowerCase().includes(query) ||
        table.fields.some((f) => f.toLowerCase().includes(query))
    );
  }, [searchQuery, tableDefinitions]);

  const tablesByLayer = useMemo(() => {
    const grouped = { L1: [] as TableDefinition[], L2: [] as TableDefinition[], L3: [] as TableDefinition[] };
    filteredTables.forEach((table) => {
      grouped[table.layer].push(table);
    });
    return grouped;
  }, [filteredTables]);

  const toggleLayer = (layer: 'L1' | 'L2' | 'L3') => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  const toggleTable = (tableId: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  const selectedTableData = tableDefinitions.find((t) => t.id === selectedTable);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-pwc-orange" />
          <p className="text-gray-600">Loading bank data model...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f9fafb', color: '#111827' }}>
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold" style={{ color: '#111827' }}>Bank Data Model</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2">No Data Dictionary Found</h3>
                <p className="text-yellow-800 mb-4">{error}</p>
                <Link
                  href="/visualizer"
                  className="inline-block px-4 py-2 bg-pwc-orange text-pwc-white rounded-lg hover:bg-pwc-orange-light transition-colors"
                >
                  Open Interactive Visualizer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb', color: '#111827' }}>
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#111827' }}>Bank Data Model</h1>
              <p className="mt-2 text-sm" style={{ color: '#4b5563' }}>
                {tableDefinitions.length} tables from parsed Excel workbook
              </p>
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => setAddTableOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm flex items-center space-x-2"
                title="Add a new table to the data model"
              >
                <Plus className="w-4 h-4" />
                <span>Add table</span>
              </button>
              <button
                onClick={handleGenerateDdl}
                disabled={generateDdlLoading}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm flex items-center space-x-2 disabled:opacity-60"
                title="Regenerate SQL DDL files from current model"
              >
                {generateDdlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
                <span>Generate DDL</span>
              </button>
              <button
                onClick={() => handleApplyDdl(true)}
                disabled={applyDdlLoading}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm flex items-center space-x-2 disabled:opacity-60"
                title="Dry run: show SQL that would be applied"
              >
                {applyDdlLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                <span>Apply to DB (dry run)</span>
              </button>
              <button
                onClick={loadDataDictionary}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm flex items-center space-x-2"
                title="Refresh bank data model"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <div className="flex items-center space-x-2">
                <Link
                  href="/visualizer"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center space-x-2"
                >
                  <Link2 className="w-4 h-4" />
                  <span>Interactive Visualizer</span>
                </Link>
                <Link
                  href="/overview"
                  className="px-4 py-2 bg-pwc-gray text-pwc-white rounded-lg hover:bg-pwc-gray-light text-sm"
                >
                  Overview
                </Link>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-pwc-gray-light" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tables..."
                className="pl-10 pr-4 py-2 w-full border border-pwc-gray-light rounded-lg focus:ring-2 focus:ring-pwc-orange focus:border-pwc-orange"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('layers')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  viewMode === 'layers'
                    ? 'bg-pwc-orange text-pwc-white'
                    : 'bg-pwc-gray text-pwc-gray-light hover:bg-pwc-gray-light'
                }`}
              >
                <Layers className="w-4 h-4 inline mr-2" />
                Layers
              </button>
              <button
                onClick={() => setViewMode('relationships')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  viewMode === 'relationships'
                    ? 'bg-pwc-orange text-pwc-white'
                    : 'bg-pwc-gray text-pwc-gray-light hover:bg-pwc-gray-light'
                }`}
              >
                <Link2 className="w-4 h-4 inline mr-2" />
                Relationships
              </button>
            </div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm">{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="text-red-600 hover:text-red-800 font-medium">Dismiss</button>
          </div>
        </div>
      )}

      {addTableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !actionLoading && setAddTableOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Add table</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const payload = {
                  layer: addTableForm.layer,
                  name: addTableForm.name.trim(),
                  category: addTableForm.category.trim() || 'Uncategorized',
                  fields: addTableForm.fields.filter((f) => f.name.trim()).map((f) => ({
                    name: f.name.trim(),
                    data_type: f.data_type || undefined,
                    pk_fk: { is_pk: f.is_pk },
                  })),
                };
                if (payload.fields.length === 0) {
                  setActionError('Add at least one field.');
                  return;
                }
                handleAddTable(payload);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Layer</label>
                <select
                  value={addTableForm.layer}
                  onChange={(e) => setAddTableForm((f) => ({ ...f, layer: e.target.value as 'L1' | 'L2' | 'L3' }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="L1">L1 - Master Data</option>
                  <option value="L2">L2 - Snapshots & Events</option>
                  <option value="L3">L3 - Roll-ups</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table name</label>
                <input
                  type="text"
                  value={addTableForm.name}
                  onChange={(e) => setAddTableForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. my_table"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={addTableForm.category}
                  onChange={(e) => setAddTableForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Uncategorized"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Fields</label>
                  <button
                    type="button"
                    onClick={() => setAddTableForm((f) => ({ ...f, fields: [...f.fields, { name: '', data_type: 'VARCHAR(64)', is_pk: false }] }))}
                    className="text-sm text-emerald-600 hover:text-emerald-700"
                  >
                    + Add field
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {addTableForm.fields.map((field, i) => (
                    <div key={i} className="flex gap-2 items-center border border-gray-200 rounded p-2">
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => setAddTableForm((f) => ({
                          ...f,
                          fields: f.fields.map((ff, j) => (j === i ? { ...ff, name: e.target.value } : ff)),
                        }))}
                        placeholder="Field name"
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      <select
                        value={field.data_type}
                        onChange={(e) => setAddTableForm((f) => ({
                          ...f,
                          fields: f.fields.map((ff, j) => (j === i ? { ...ff, data_type: e.target.value } : ff)),
                        }))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="VARCHAR(64)">VARCHAR(64)</option>
                        <option value="VARCHAR(500)">VARCHAR(500)</option>
                        <option value="NUMERIC(20,4)">NUMERIC(20,4)</option>
                        <option value="DATE">DATE</option>
                        <option value="TIMESTAMP">TIMESTAMP</option>
                        <option value="INTEGER">INTEGER</option>
                        <option value="BOOLEAN">BOOLEAN</option>
                      </select>
                      <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={field.is_pk}
                          onChange={(e) => setAddTableForm((f) => ({
                            ...f,
                            fields: f.fields.map((ff, j) => (j === i ? { ...ff, is_pk: e.target.checked } : ff)),
                          }))}
                        />
                        PK
                      </label>
                      {addTableForm.fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setAddTableForm((f) => ({ ...f, fields: f.fields.filter((_, j) => j !== i) }))}
                          className="text-red-600 hover:text-red-800 p-1"
                          aria-label="Remove field"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAddTableOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" disabled={actionLoading}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2" disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Add table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'layers' ? (
          <div className="space-y-6">
            {(['L1', 'L2', 'L3'] as const).map((layer) => {
              const tables = tablesByLayer[layer];
              const isExpanded = expandedLayers.has(layer);
              const colors = layerColors[layer];

              return (
                <div key={layer} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleLayer(layer)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: colors.border }}
                      ></div>
                      <h2 className="text-xl font-bold">
                        {layer} - {layer === 'L1' ? 'Master Data' : layer === 'L2' ? 'Snapshots & Events' : 'Roll-ups'}
                      </h2>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-pwc-gray/50 text-pwc-gray-light">
                        {tables.length} tables
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tables.map((table) => {
                          const isTableExpanded = expandedTables.has(table.id);
                          const hasFKs = table.foreignKeys.length > 0;

                          return (
                            <div
                              key={table.id}
                              className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                                selectedTable === table.id
                                  ? 'ring-4 ring-yellow-400 border-yellow-500'
                                  : `border-${colors.border}`
                              }`}
                              style={{
                                backgroundColor: colors.bg,
                                borderColor: selectedTable === table.id ? '#fbbf24' : colors.border,
                              }}
                              onClick={() => setSelectedTable(table.id === selectedTable ? null : table.id)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <Database className="w-4 h-4" style={{ color: colors.text }} />
                                  <h3 className="font-bold text-sm" style={{ color: colors.text }}>
                                    {table.name}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors.badge}`}>
                                    {table.layer}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setRemoveConfirm({ type: 'table', tableId: table.id, layer: table.layer }); }}
                                    className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white"
                                    title="Remove table"
                                    aria-label="Remove table"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {table.description && (
                                <p className="text-xs text-gray-600 mb-3">{table.description}</p>
                              )}

                              <div className="space-y-2 text-xs">
                                <div className="flex items-center space-x-1">
                                  <Key className="w-3 h-3 text-gray-500" />
                                  <span className="font-mono text-pwc-gray-light">{table.primaryKey}</span>
                                </div>
                                {hasFKs && (
                                  <div className="flex items-center space-x-1">
                                    <Link2 className="w-3 h-3 text-gray-500" />
                                    <span className="text-pwc-gray-light">
                                      {table.foreignKeys.length} relationship{table.foreignKeys.length > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTable(table.id);
                                }}
                                className="mt-3 text-xs text-pwc-orange hover:text-pwc-orange-light font-medium"
                              >
                                {isTableExpanded ? 'Hide' : 'Show'} fields ({table.fields.length})
                              </button>

                              {isTableExpanded && (
                                <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                                  {table.fields.map((field, idx) => (
                                    <div
                                      key={idx}
                                      className="text-xs font-mono bg-white bg-opacity-70 p-1.5 rounded border border-gray-200"
                                    >
                                      {field}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">Table Relationships</h2>
            {dataDictionary && dataDictionary.relationships.length > 0 ? (
              <div className="space-y-4">
                {dataDictionary.relationships.map((rel, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Database className="w-5 h-5" style={{ color: layerColors[rel.from_layer as 'L1' | 'L2' | 'L3'].text }} />
                        <span className="font-bold">{rel.from_table}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${layerColors[rel.from_layer as 'L1' | 'L2' | 'L3'].badge}`}>
                          {rel.from_layer}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="font-mono text-sm font-semibold text-pwc-orange">{rel.from_field}</span>
                        <ChevronRight className="w-4 h-4 text-pwc-gray-light" />
                        <span className="font-mono text-sm">{rel.to_field}</span>
                        <span className="text-gray-500">in</span>
                        <span className="font-semibold text-gray-900">{rel.to_table}</span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${layerColors[rel.to_layer as 'L1' | 'L2' | 'L3'].badge}`}>
                          {rel.to_layer}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No relationships found in parsed data dictionary.</p>
            )}
          </div>
        )}

        {selectedTableData && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">{selectedTableData.name}</h2>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-pwc-gray-light hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className={`inline-block px-3 py-1 rounded text-sm mb-4 ${layerColors[selectedTableData.layer].badge}`}>
              {selectedTableData.layer}
            </div>

            {selectedTableData.description && (
              <p className="text-gray-600 mb-6">{selectedTableData.description}</p>
            )}

            {selectedTableData.category && (
              <p className="text-sm text-gray-500 mb-4">Category: {selectedTableData.category}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center space-x-2">
                  <Key className="w-4 h-4" />
                  <span>Primary Key</span>
                </h3>
                <p className="text-sm font-mono bg-gray-50 p-3 rounded border">{selectedTableData.primaryKey}</p>
              </div>

              {selectedTableData.foreignKeys.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center space-x-2">
                    <Link2 className="w-4 h-4" />
                    <span>Relationships ({selectedTableData.foreignKeys.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {selectedTableData.foreignKeys.map((fk, idx) => (
                      <div
                        key={idx}
                        className="text-sm bg-gray-50 p-3 rounded border border-gray-200 cursor-pointer hover:bg-gray-100"
                        onClick={() => setSelectedTable(fk.table)}
                      >
                        <div className="font-mono font-semibold text-pwc-orange">{fk.field}</div>
                        <div className="text-gray-600 mt-1">
                          → <span className="font-semibold">{fk.references}</span> in{' '}
                          <span className="font-semibold text-purple-600">{fk.table}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>All Fields ({selectedTableData.fields.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setAddFieldOpen(true)}
                  className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add field
                </button>
              </div>
              {addFieldOpen && selectedTableData && (() => {
                const raw = getTableFromDict(dataDictionary, selectedTableData.id);
                if (!raw) return null;
                return (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!addFieldForm.name.trim()) { setActionError('Field name required'); return; }
                      handleAddField(raw.layer, raw.name, {
                        name: addFieldForm.name.trim(),
                        data_type: addFieldForm.data_type || undefined,
                        pk_fk: addFieldForm.is_pk ? { is_pk: true } : undefined,
                      });
                    }}
                    className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap items-end gap-2"
                  >
                    <input
                      type="text"
                      value={addFieldForm.name}
                      onChange={(e) => setAddFieldForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Field name"
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    />
                    <select
                      value={addFieldForm.data_type}
                      onChange={(e) => setAddFieldForm((f) => ({ ...f, data_type: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    >
                      <option value="VARCHAR(64)">VARCHAR(64)</option>
                      <option value="NUMERIC(20,4)">NUMERIC(20,4)</option>
                      <option value="DATE">DATE</option>
                      <option value="TIMESTAMP">TIMESTAMP</option>
                      <option value="INTEGER">INTEGER</option>
                    </select>
                    <label className="flex items-center gap-1 text-sm">
                      <input type="checkbox" checked={addFieldForm.is_pk} onChange={(e) => setAddFieldForm((f) => ({ ...f, is_pk: e.target.checked }))} />
                      PK
                    </label>
                    <button type="submit" className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:opacity-60" disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Add'}
                    </button>
                    <button type="button" onClick={() => setAddFieldOpen(false)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-100">Cancel</button>
                  </form>
                );
              })()}
              <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {selectedTableData && (() => {
                  const raw = getTableFromDict(dataDictionary, selectedTableData.id);
                  if (!raw) return selectedTableData.fields.map((field, idx) => (
                    <div key={idx} className="text-xs font-mono bg-gray-50 p-2 rounded border border-gray-200">{field}</div>
                  ));
                  return raw.fields.map((f) => (
                    <div key={f.name} className="text-xs font-mono bg-gray-50 p-2 rounded border border-gray-200 flex items-center justify-between gap-2">
                      <span>{f.name}{f.pk_fk?.is_pk ? ' (PK)' : ''}{f.pk_fk?.fk_target ? ' (FK)' : ''}</span>
                      <button
                        type="button"
                        onClick={() => setRemoveConfirm({ type: 'field', tableId: raw.name, layer: raw.layer, fieldName: f.name })}
                        className="text-red-600 hover:text-red-800 p-0.5"
                        title="Remove field"
                        aria-label={`Remove ${f.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>
            {selectedTableData && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setRemoveConfirm({ type: 'table', tableId: selectedTableData.id, layer: selectedTableData.layer })}
                  className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove this table
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {removeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !actionLoading && setRemoveConfirm(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-2">
              {removeConfirm.type === 'table' ? 'Remove table?' : 'Remove field?'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {removeConfirm.type === 'table'
                ? `"${removeConfirm.tableId}" will be removed from the data model and DDL will be regenerated.`
                : `"${removeConfirm.fieldName}" will be removed from "${removeConfirm.tableId}".`}
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRemoveConfirm(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" disabled={actionLoading}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (removeConfirm.type === 'table' && removeConfirm.layer && removeConfirm.tableId) {
                    handleRemoveTable(removeConfirm.layer, removeConfirm.tableId);
                  } else if (removeConfirm.type === 'field' && removeConfirm.layer && removeConfirm.tableId && removeConfirm.fieldName) {
                    handleRemoveField(removeConfirm.layer, removeConfirm.tableId, removeConfirm.fieldName);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
