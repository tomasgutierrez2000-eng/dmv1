'use client';

import { useState, useMemo } from 'react';
import { X, FileCode, ChevronDown, ChevronRight, Download, Package } from 'lucide-react';
import type { DataModel, TableDef } from '../../types/model';

interface Props {
  model: DataModel;
  onClose: () => void;
  onSuccess: (tableKey: string) => void;
  onError: (message: string) => void;
}

type LayerKey = 'L1' | 'L2' | 'L3';

export default function SampleDataSqlExportModal({ model, onClose, onSuccess, onError }: Props) {
  const [selectedTableKey, setSelectedTableKey] = useState<string | null>(null);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['L1', 'L2', 'L3']));
  const [downloading, setDownloading] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

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

  const toggleExpandLayer = (layer: string) => {
    const next = new Set(expandedLayers);
    if (next.has(layer)) {
      next.delete(layer);
    } else {
      next.add(layer);
    }
    setExpandedLayers(next);
  };

  const handleDownload = async () => {
    if (!selectedTableKey) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/sample-data/export-sql?tableKey=${encodeURIComponent(selectedTableKey)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error ?? res.statusText;
        onError(msg);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename = match ? match[1].trim() : `${selectedTableKey.replace('.', '_')}_data.sql`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      onSuccess(selectedTableKey);
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const res = await fetch('/api/sample-data/export-package');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        onError(body?.error ?? res.statusText);
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename = match ? match[1].trim() : `credit-data-warehouse-${new Date().toISOString().slice(0, 10)}.zip`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      onSuccess('all');
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'ZIP export failed');
    } finally {
      setDownloadingZip(false);
    }
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
        <div className="flex items-center justify-between p-4 border-b border-pwc-gray-light">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-pwc-orange" />
            <h2 className="text-lg font-semibold">Export table data as SQL</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-pwc-gray-light text-pwc-gray-light hover:text-pwc-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-pwc-gray-light space-y-2">
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="w-full px-4 py-2.5 rounded-lg bg-pwc-orange hover:bg-pwc-orange-light text-pwc-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            <Package className="w-4 h-4" />
            {downloadingZip ? 'Generating ZIP...' : 'Download All — DDL + Data (ZIP)'}
          </button>
          <p className="text-xs text-pwc-gray-light text-center">
            DDL (all layers) + L1/L2 sample data + load script. L3 tables created empty (derived by calc engine).
          </p>
          <div className="border-t border-pwc-gray-light pt-2 mt-2">
            <p className="text-sm text-pwc-gray-light">
              Or select a single table below to download its data as SQL:
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(['L1', 'L2', 'L3'] as LayerKey[]).map((layer) => {
            const tables = tablesByLayer[layer];
            if (tables.length === 0) return null;
            const expanded = expandedLayers.has(layer);
            const meta = layerLabels[layer];

            return (
              <div key={layer} className={`rounded-lg border ${meta.border} overflow-hidden`}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 ${meta.bg} cursor-pointer select-none`}
                  onClick={() => toggleExpandLayer(layer)}
                >
                  <button
                    type="button"
                    className="p-0.5"
                    onClick={(e) => { e.stopPropagation(); toggleExpandLayer(layer); }}
                  >
                    {expanded ? <ChevronDown className="w-4 h-4 text-pwc-gray-light" /> : <ChevronRight className="w-4 h-4 text-pwc-gray-light" />}
                  </button>
                  <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                </div>

                {expanded && (
                  <div className="px-2 py-1 space-y-0.5">
                    {tables.map((t) => (
                      <label
                        key={t.key}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer select-none ${
                          selectedTableKey === t.key ? 'bg-pwc-orange/20 border border-pwc-orange/50' : 'hover:bg-pwc-black/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="sample-data-table"
                          checked={selectedTableKey === t.key}
                          onChange={() => setSelectedTableKey(t.key)}
                          className="w-4 h-4 text-pwc-orange border-pwc-gray-light focus:ring-pwc-orange"
                        />
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

        <div className="flex items-center justify-between gap-2 p-4 border-t border-pwc-gray-light">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-pwc-gray-light text-pwc-gray-light hover:bg-pwc-gray-light hover:text-pwc-black transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!selectedTableKey || downloading}
            className="px-4 py-2 rounded-lg bg-pwc-orange hover:bg-pwc-orange-light text-pwc-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Downloading…' : 'Download .sql'}
          </button>
        </div>
      </div>
    </div>
  );
}
