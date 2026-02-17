'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Info, Plus, Trash2, X } from 'lucide-react';
import { DASHBOARD_PAGES } from '@/data/l3-metrics';
import type { L3Metric, DashboardPage, MetricType, SourceField } from '@/data/l3-metrics';
import { deriveDimensionsFromSourceFields, suggestTogglesFromSourceFields } from '@/lib/metric-derivation';

const PAGES = DASHBOARD_PAGES.map(p => ({ id: p.id as DashboardPage, name: p.name }));
const METRIC_TYPES: MetricType[] = ['Aggregate', 'Ratio', 'Count', 'Derived', 'Status', 'Trend', 'Table', 'Categorical'];

function tableToAlias(tableName: string): string {
  const parts = tableName.split('_');
  if (parts.length >= 2) return parts.map((p) => p[0]).join('').toLowerCase();
  return tableName.slice(0, 3).toLowerCase();
}

interface TableDef {
  key: string;
  name: string;
  layer: 'L1' | 'L2';
  fields: { name: string }[];
}

interface DataModel {
  tables: Record<string, TableDef>;
}

interface MetricFormProps {
  metric?: L3Metric | null;
  isCreate: boolean;
  onSave: (metric: Partial<L3Metric>) => Promise<void>;
  onCancel: () => void;
}

export default function MetricForm({ metric, isCreate, onSave, onCancel }: MetricFormProps) {
  const [name, setName] = useState(metric?.name ?? '');
  const [description, setDescription] = useState(metric?.description ?? '');
  const [page, setPage] = useState<DashboardPage>(metric?.page ?? 'P1');
  const [section, setSection] = useState(metric?.section ?? '');
  const [metricType, setMetricType] = useState<MetricType>(metric?.metricType ?? 'Derived');
  const [formula, setFormula] = useState(metric?.formula ?? '');
  const [formulaSQL, setFormulaSQL] = useState(metric?.formulaSQL ?? '');
  const [displayFormat, setDisplayFormat] = useState(metric?.displayFormat ?? '');
  const [sampleValue, setSampleValue] = useState(metric?.sampleValue ?? '');
  const [sourceFields, setSourceFields] = useState<SourceField[]>(
    metric?.sourceFields?.length ? [...metric.sourceFields] : [{ layer: 'L2', table: '', field: '' }]
  );
  const [schema, setSchema] = useState<DataModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/l1-demo-model')
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setSchema(data))
      .catch(() => setSchema(null));
  }, []);

  const tablesByLayer = React.useMemo(() => {
    if (!schema?.tables) return { L1: [] as TableDef[], L2: [] as TableDef[] };
    const L1: TableDef[] = [];
    const L2: TableDef[] = [];
    for (const t of Object.values(schema.tables)) {
      if (t.layer === 'L1') L1.push(t);
      else if (t.layer === 'L2') L2.push(t);
    }
    return { L1, L2 };
  }, [schema]);

  const addSourceField = () => {
    setSourceFields(prev => [...prev, { layer: 'L2', table: '', field: '' }]);
  };

  const updateSourceField = (index: number, updates: Partial<SourceField>) => {
    setSourceFields(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const removeSourceField = (index: number) => {
    setSourceFields(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const filledSourceFields = useMemo(
    () => sourceFields.filter((sf) => sf.table && sf.field),
    [sourceFields]
  );

  const aggregateFunctions = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'COUNT_DISTINCT'] as const;
  const insertFormulaPart = (agg: string, fieldName: string) => {
    const expr = agg === 'COUNT_DISTINCT' ? `COUNT(DISTINCT ${fieldName})` : `${agg}(${fieldName})`;
    setFormula((prev) => (prev ? `${prev} + ${expr}` : expr));
    if (!formulaSQL && filledSourceFields.length > 0) {
      const first = filledSourceFields.find((sf) => sf.field === fieldName) ?? filledSourceFields[0];
      const alias = tableToAlias(first.table);
      const sqlExpr = agg === 'COUNT_DISTINCT' ? `COUNT(DISTINCT ${alias}.${fieldName})` : `${agg}(${alias}.${fieldName})`;
      setFormulaSQL((prev) => (prev ? `${prev} + ${sqlExpr}` : sqlExpr));
    }
  };

  const appendFieldToFormula = (fieldName: string) => {
    setFormula((prev) => (prev ? `${prev} + ${fieldName}` : fieldName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fields = sourceFields.filter(sf => sf.table && sf.field);
    if (fields.length === 0) {
      setError('Add at least one source field (layer, table, field).');
      return;
    }
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!formula.trim()) {
      setError('Formula is required.');
      return;
    }
    const derivedDimensions = deriveDimensionsFromSourceFields(fields, schema, 'GROUP_BY');
    const suggestedToggles = suggestTogglesFromSourceFields(fields, page);
    const dimensions = (metric?.dimensions?.length ? metric.dimensions : derivedDimensions);
    const toggles = (metric?.toggles?.length ? metric.toggles : suggestedToggles.length ? suggestedToggles : undefined);

    setSaving(true);
    try {
      await onSave({
        id: isCreate ? undefined : metric?.id,
        name: name.trim(),
        description: description.trim(),
        page,
        section: section.trim(),
        metricType,
        formula: formula.trim(),
        formulaSQL: formulaSQL.trim() || undefined,
        displayFormat: displayFormat.trim(),
        sampleValue: sampleValue.trim(),
        sourceFields: fields,
        dimensions,
        toggles,
        notes: metric?.notes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const isCopying = isCreate && metric?.name;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-6"
        aria-label="Go back"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-xl font-bold text-white mb-1">
        {isCreate ? (isCopying ? 'Create metric from copy' : 'Create metric') : `Edit ${metric?.id ?? ''}`}
      </h1>
      {isCopying && (
        <p className="text-sm text-gray-500 mb-6">
          Copying <span className="text-gray-400 font-medium">&quot;{metric.name}&quot;</span>. Change any field below, then save to create your custom metric.
        </p>
      )}
      {!isCopying && isCreate && (
        <p className="text-sm text-gray-500 mb-6">Define source fields and formula; dimensions and toggles are derived automatically on save.</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div id="form-error" className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm" role="alert">
            {error}
          </div>
        )}

        <section className="space-y-4" aria-labelledby="basic-heading">
          <h2 id="basic-heading" className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <span className="w-4 h-0.5 bg-gray-600 rounded" />
            Basic info
          </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm"
              placeholder="e.g. Gross Exposure"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Page</label>
            <select
              value={page}
              onChange={e => setPage(e.target.value as DashboardPage)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm"
            >
              {PAGES.map(p => (
                <option key={p.id} value={p.id}>{p.id}: {p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Section</label>
          <input
            type="text"
            value={section}
            onChange={e => setSection(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm"
            placeholder="e.g. Exposure Summary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Metric type</label>
          <select
            value={metricType}
            onChange={e => setMetricType(e.target.value as MetricType)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm"
          >
            {METRIC_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm resize-none"
            placeholder="Plain-language description"
          />
        </div>
        </section>

        {/* Source fields first so user can build formula from them */}
        <section className="space-y-3" aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <span className="w-4 h-0.5 bg-gray-600 rounded" />
            Source fields *
          </h2>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-gray-400 sr-only">Add or remove source fields</label>
            <button
              type="button"
              onClick={addSourceField}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add field
            </button>
          </div>
          <div className="space-y-3">
            {sourceFields.map((sf, i) => (
              <div
                key={i}
                className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5"
                role="group"
                aria-label={`Source field ${i + 1} of ${sourceFields.length}`}
              >
                <div className="w-16">
                  <label className="block text-[10px] text-gray-500 mb-0.5">Layer</label>
                  <select
                    value={sf.layer}
                    onChange={e => updateSourceField(i, { layer: e.target.value as 'L1' | 'L2', table: '', field: '' })}
                    className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs"
                  >
                    <option value="L1">L1</option>
                    <option value="L2">L2</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[10px] text-gray-500 mb-0.5">Table</label>
                  <select
                    value={sf.table}
                    onChange={e => updateSourceField(i, { table: e.target.value, field: '' })}
                    className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs"
                  >
                    <option value="">Select table</option>
                    {(tablesByLayer[sf.layer] || []).map(t => (
                      <option key={t.key} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-[10px] text-gray-500 mb-0.5">Field</label>
                  <select
                    value={sf.field}
                    onChange={e => updateSourceField(i, { field: e.target.value })}
                    className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs"
                  >
                    <option value="">Select field</option>
                    {(() => {
                      const tables = tablesByLayer[sf.layer] || [];
                      const table = tables.find(t => t.name === sf.table);
                      return (table?.fields || []).map(f => (
                        <option key={f.name} value={f.name}>{f.name}</option>
                      ));
                    })()}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeSourceField(i)}
                  className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title={`Remove source field ${i + 1}`}
                  aria-label={`Remove source field ${i + 1}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {!schema && (
            <p className="text-[10px] text-amber-400 mt-1">
              Load L1/L2 data (run generate:l1) to see table and field options.
            </p>
          )}
        </div>
        </section>

        {/* Formula: build from inputs (aggregates + fields) or type manually */}
        <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3" aria-labelledby="formula-heading">
          <h2 id="formula-heading" className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <span className="w-4 h-0.5 bg-gray-600 rounded" />
            Formula (human-readable) *
          </h2>
          {filledSourceFields.length === 0 ? (
            <p className="text-sm text-gray-500">
              Select at least one source field above, then return here to build your formula with the aggregate buttons or by typing.
            </p>
          ) : (
          <>
          <p className="text-[11px] text-gray-500">
            Click a chip to insert into the formula, or type in the box below.
          </p>
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Click to insert</p>
              <div className="flex flex-wrap gap-3">
                {aggregateFunctions.map((agg) => (
                  <div key={agg} className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-gray-500 w-16">{agg}:</span>
                    {filledSourceFields.map((sf) => (
                      <button
                        key={`${agg}-${sf.table}-${sf.field}`}
                        type="button"
                        onClick={() => insertFormulaPart(agg, sf.field)}
                        className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-xs font-mono border border-purple-500/30"
                        title={`Insert ${agg}(${sf.field})`}
                      >
                        {sf.field}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
                <span className="text-[10px] text-gray-500">Raw field:</span>
                {filledSourceFields.map((sf) => (
                  <button
                    key={`field-${sf.table}-${sf.field}`}
                    type="button"
                    onClick={() => appendFieldToFormula(sf.field)}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-mono border border-white/10"
                    title={`Insert ${sf.field}`}
                  >
                    {sf.field}
                  </button>
                ))}
              </div>
            </div>
          </>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={formula}
              onChange={e => setFormula(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm"
              placeholder="e.g. SUM(gross_exposure_usd)"
              required
              aria-invalid={!!error && !formula.trim()}
              aria-describedby={error ? 'form-error' : undefined}
            />
            {formula && (
              <button
                type="button"
                onClick={() => { setFormula(''); setFormulaSQL(''); }}
                className="px-2 py-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                title="Clear formula"
                aria-label="Clear formula"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Formula (SQL, optional)</label>
          <input
            type="text"
            value={formulaSQL}
            onChange={e => setFormulaSQL(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm"
            placeholder="e.g. SUM(fes.gross_exposure_usd) — can be auto-filled when you use builder"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Display format</label>
            <input
              type="text"
              value={displayFormat}
              onChange={e => setDisplayFormat(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm"
              placeholder="e.g. $#,##0.0M"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Sample value</label>
            <input
              type="text"
              value={sampleValue}
              onChange={e => setSampleValue(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm"
              placeholder="e.g. $4.2B"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200/90 text-sm">
          <Info className="w-4 h-4 shrink-0 text-blue-400" aria-hidden />
          <span>Lineage, dimensions, and toggles are set automatically from your source fields when you save.</span>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm"
          >
            {saving ? 'Saving…' : isCreate ? 'Create metric' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-white/20 bg-transparent hover:bg-white/5 text-gray-300 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
