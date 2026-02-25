'use client';

import { useState, useMemo } from 'react';
import { X, Database, Check, ChevronDown, ChevronRight, Download, Copy } from 'lucide-react';
import type { DataModel, TableDef } from '../../types/model';
import { generateDdl } from '../../utils/ddlExport';

interface Props {
  model: DataModel;
  onClose: () => void;
  onDownload: (sql: string, tableCount: number) => void;
}

type LayerKey = 'L1' | 'L2' | 'L3';

export default function DdlExportModal({ model, onClose, onDownload }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['L1', 'L2', 'L3']));
  const [copied, setCopied] = useState(false);

  // Group tables by layer, sorted alphabetically within each
  const tablesByLayer = useMemo(() => {
    const grouped: Record<LayerKey, TableDef[]> = { L1: [], L2: [], L3: [] };
    for (const t of Object.values(model.tables)) {
      grouped[t.layer]?.push(t);
    }
    for (const layer of Object.keys(grouped) as LayerKey[]) {
      grouped[layer].sort((a, b) => a.name.localeCompare(b.name));
    }
    return grouped;
  }, [model]);

  const allKeys = useMemo(
    () => Object.values(model.tables).map((t) => t.key),
    [model]
  );

  const allSelected = selected.size === allKeys.length && allKeys.length > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allKeys));
    }
  };

  const toggleLayer = (layer: LayerKey) => {
    const layerKeys = tablesByLayer[layer].map((t) => t.key);
    const allLayerSelected = layerKeys.every((k) => selected.has(k));
    const next = new Set(selected);
    for (const k of layerKeys) {
      if (allLayerSelected) {
        next.delete(k);
      } else {
        next.add(k);
      }
    }
    setSelected(next);
  };

  const toggleTable = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelected(next);
  };

  const toggleExpandLayer = (layer: string) => {
    const next = new Set(expandedLayers);
    if (next.has(layer)) {
      next.delete(layer);
    } else {
      next.add(layer);
    }
    setExpandedLayers(next);
  };

  const isLayerAllSelected = (layer: LayerKey) => {
    const keys = tablesByLayer[layer].map((t) => t.key);
    return keys.length > 0 && keys.every((k) => selected.has(k));
  };

  const isLayerPartial = (layer: LayerKey) => {
    const keys = tablesByLayer[layer].map((t) => t.key);
    const count = keys.filter((k) => selected.has(k)).length;
    return count > 0 && count < keys.length;
  };

  const layerSelectedCount = (layer: LayerKey) => {
    return tablesByLayer[layer].filter((t) => selected.has(t.key)).length;
  };

  const handleDownload = () => {
    const keys = Array.from(selected);
    const sql = generateDdl(model, keys);
    onDownload(sql, keys.length);
  };

  const handleCopy = async () => {
    const keys = Array.from(selected);
    const sql = generateDdl(model, keys);
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const layerLabels: Record<LayerKey, { label: string; color: string; bg: string; border: string }> = {
    L1: { label: 'L1 - Source / Reference', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    L2: { label: 'L2 - Staging / Enriched', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
    L3: { label: 'L3 - Analytics / Metrics', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-pwc-gray border border-pwc-gray-light rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col text-pwc-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-pwc-gray-light">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-pwc-orange" />
            <h2 className="text-lg font-semibold">Export DDL — Cloud SQL Studio (PostgreSQL)</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-pwc-gray-light text-pwc-gray-light hover:text-pwc-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Select All bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-pwc-gray-light bg-pwc-black/30">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox checked={allSelected} indeterminate={!allSelected && selected.size > 0} onChange={toggleAll} />
            <span className="text-sm font-medium">
              Select all tables ({allKeys.length})
            </span>
          </label>
          <span className="text-sm text-pwc-gray-light">
            {selected.size} of {allKeys.length} selected
          </span>
        </div>

        {/* Table list grouped by layer */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(['L1', 'L2', 'L3'] as LayerKey[]).map((layer) => {
            const tables = tablesByLayer[layer];
            if (tables.length === 0) return null;
            const expanded = expandedLayers.has(layer);
            const meta = layerLabels[layer];
            const selCount = layerSelectedCount(layer);

            return (
              <div key={layer} className={`rounded-lg border ${meta.border} overflow-hidden`}>
                {/* Layer header */}
                <div className={`flex items-center gap-2 px-3 py-2 ${meta.bg} cursor-pointer select-none`} onClick={() => toggleExpandLayer(layer)}>
                  <button
                    type="button"
                    className="p-0.5"
                    onClick={(e) => { e.stopPropagation(); toggleExpandLayer(layer); }}
                  >
                    {expanded ? <ChevronDown className="w-4 h-4 text-pwc-gray-light" /> : <ChevronRight className="w-4 h-4 text-pwc-gray-light" />}
                  </button>
                  <Checkbox
                    checked={isLayerAllSelected(layer)}
                    indeterminate={isLayerPartial(layer)}
                    onChange={() => toggleLayer(layer)}
                  />
                  <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                  <span className="text-xs text-pwc-gray-light ml-auto">
                    {selCount}/{tables.length}
                  </span>
                </div>

                {/* Tables in this layer */}
                {expanded && (
                  <div className="px-2 py-1 space-y-0.5">
                    {tables.map((t) => (
                      <label
                        key={t.key}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-pwc-black/30 cursor-pointer select-none"
                      >
                        <Checkbox checked={selected.has(t.key)} onChange={() => toggleTable(t.key)} />
                        <span className="text-sm text-pwc-white">{t.name}</span>
                        <span className="text-xs text-pwc-gray-light ml-auto">{t.fields.length} cols</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-pwc-gray-light">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-pwc-gray-light text-pwc-gray-light hover:bg-pwc-gray-light hover:text-pwc-black transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={selected.size === 0}
              className="px-4 py-2 rounded-lg border border-pwc-gray-light text-pwc-gray-light hover:bg-pwc-gray-light hover:text-pwc-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy SQL'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={selected.size === 0}
              className="px-4 py-2 rounded-lg bg-pwc-orange hover:bg-pwc-orange-light text-pwc-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Download .sql
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Styled checkbox with indeterminate state support. */
function Checkbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
        checked
          ? 'bg-pwc-orange border-pwc-orange'
          : indeterminate
            ? 'bg-pwc-orange/50 border-pwc-orange'
            : 'border-pwc-gray-light hover:border-pwc-orange/60'
      }`}
    >
      {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      {indeterminate && !checked && (
        <div className="w-2 h-0.5 bg-white rounded-full" />
      )}
    </button>
  );
}
