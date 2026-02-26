'use client';

import { useState, useMemo, useRef } from 'react';
import { Download, Upload, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { RELEASE_ENTRIES, type ReleaseEntry } from '@/lib/release-tracker-data';

type SortField = 'date' | 'layer' | 'table' | 'field' | 'changeType';
type SortDir = 'asc' | 'desc';

const LAYERS = ['L1', 'L2', 'L3', 'Metric Library'] as const;
const CHANGE_TYPES = ['Added', 'Removed', 'Moved'] as const;

const LAYER_COLORS: Record<string, string> = {
  L1: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  L2: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  L3: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Metric Library': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

const CHANGE_COLORS: Record<string, string> = {
  Added: 'bg-green-500/15 text-green-400 border-green-500/30',
  Removed: 'bg-red-500/15 text-red-400 border-red-500/30',
  Moved: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
};

export default function ReleaseTracker() {
  const [entries, setEntries] = useState<ReleaseEntry[]>(RELEASE_ENTRIES);
  const [layerFilter, setLayerFilter] = useState<Set<string>>(new Set());
  const [changeTypeFilter, setChangeTypeFilter] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let result = entries;
    if (layerFilter.size > 0) {
      result = result.filter((e) => layerFilter.has(e.layer));
    }
    if (changeTypeFilter.size > 0) {
      result = result.filter((e) => changeTypeFilter.has(e.changeType));
    }
    result = [...result].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [entries, layerFilter, changeTypeFilter, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function toggleFilter(set: Set<string>, value: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  async function handleUpload(file: File) {
    setUploadStatus(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/release-tracker', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setUploadStatus(`Error: ${data.error}`);
        return;
      }
      if (data.entries?.length) {
        setEntries((prev) => [...data.entries, ...prev]);
      }
      const parts: string[] = [`${data.imported} entries imported`];
      if (data.errors?.length) parts.push(`${data.errors.length} rows skipped`);
      setUploadStatus(parts.join(', '));
    } catch {
      setUploadStatus('Upload failed — check file format');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" aria-hidden />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-slate-300" aria-hidden />
      : <ArrowDown className="w-3.5 h-3.5 text-slate-300" aria-hidden />;
  }

  // Summary counts
  const addedCount = filtered.filter((e) => e.changeType === 'Added').length;
  const removedCount = filtered.filter((e) => e.changeType === 'Removed').length;
  const movedCount = filtered.filter((e) => e.changeType === 'Moved').length;

  return (
    <div className="space-y-4">
      {/* Toolbar: filters + actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Layer filters */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-slate-500" aria-hidden />
          {LAYERS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toggleFilter(layerFilter, l, setLayerFilter)}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                layerFilter.size === 0 || layerFilter.has(l)
                  ? LAYER_COLORS[l]
                  : 'bg-slate-800/50 text-slate-500 border-slate-700/50'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Change type filters */}
        <div className="flex items-center gap-1.5 ml-2">
          {CHANGE_TYPES.map((ct) => (
            <button
              key={ct}
              type="button"
              onClick={() => toggleFilter(changeTypeFilter, ct, setChangeTypeFilter)}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                changeTypeFilter.size === 0 || changeTypeFilter.has(ct)
                  ? CHANGE_COLORS[ct]
                  : 'bg-slate-800/50 text-slate-500 border-slate-700/50'
              }`}
            >
              {ct}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Summary badges */}
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <span>{filtered.length} entries</span>
          <span className="text-slate-600">|</span>
          <span className="text-green-400">{addedCount} added</span>
          <span className="text-red-400">{removedCount} removed</span>
          {movedCount > 0 && <span className="text-sky-400">{movedCount} moved</span>}
        </div>

        {/* Download */}
        <a
          href="/api/release-tracker"
          download
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" aria-hidden />
          Download Excel
        </a>

        {/* Upload */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-xs font-medium text-slate-200 transition-colors flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" aria-hidden />
          Upload Excel
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = '';
          }}
        />
      </div>

      {/* Upload status */}
      {uploadStatus && (
        <div className={`text-xs px-3 py-2 rounded border ${
          uploadStatus.startsWith('Error')
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-green-500/10 border-green-500/30 text-green-400'
        }`}>
          {uploadStatus}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-700">
              {([
                ['date', 'Date'],
                ['layer', 'Layer'],
                ['table', 'Table'],
                ['field', 'Field'],
                ['changeType', 'Change'],
              ] as [SortField, string][]).map(([key, label]) => (
                <th
                  key={key}
                  className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 select-none"
                  onClick={() => toggleSort(key)}
                  aria-sort={sortField === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <div className="flex items-center gap-1">
                    <span>{label}</span>
                    <SortIcon field={key} />
                  </div>
                </th>
              ))}
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Rationale
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((entry, i) => (
              <tr
                key={`${entry.date}-${entry.table}-${entry.field}-${i}`}
                className="hover:bg-slate-800/40 transition-colors"
              >
                <td className="px-3 py-2 text-slate-300 whitespace-nowrap font-mono text-xs">
                  {entry.date}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${LAYER_COLORS[entry.layer]}`}>
                    {entry.layer}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-200 font-mono text-xs">
                  {entry.table}
                </td>
                <td className="px-3 py-2 text-slate-300 font-mono text-xs">
                  {entry.field}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${CHANGE_COLORS[entry.changeType]}`}>
                    {entry.changeType}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-400 text-xs max-w-md">
                  {entry.rationale}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500 text-sm">
                  No entries match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
