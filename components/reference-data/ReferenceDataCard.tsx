'use client';

import { useState, useRef, useCallback } from 'react';
import { ChevronRight, Database, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReferenceDataTableDef } from './referenceDataTables';
import ReferenceDataGrid from './ReferenceDataGrid';

interface ReferenceDataCardProps {
  table: ReferenceDataTableDef;
  rowCount: number | undefined;
  fieldCount: number | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  dbAvailable: boolean;
}

interface TableData {
  columns: string[];
  rows: Record<string, unknown>[];
  totalCount: number;
  limit: number;
  offset: number;
}

const SCD_COLORS: Record<string, { bg: string; text: string }> = {
  'SCD-0': { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  'SCD-1': { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  'SCD-2': { bg: 'bg-purple-500/10', text: 'text-purple-400' },
  Snapshot: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
};

export default function ReferenceDataCard({
  table,
  rowCount,
  fieldCount,
  isExpanded,
  onToggle,
  dbAvailable,
}: ReferenceDataCardProps) {
  const [data, setData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchData = useCallback(async (offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reference-data/${table.name}?limit=500&offset=${offset}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to fetch data');
        return;
      }
      setData({
        columns: json.columns,
        rows: json.rows,
        totalCount: json.totalCount,
        limit: json.limit,
        offset: json.offset,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, [table.name]);

  function handleToggle() {
    if (!isExpanded && !hasFetched.current && dbAvailable) {
      hasFetched.current = true;
      fetchData(0);
    }
    onToggle();
  }

  function handleRefresh() {
    fetchData(data?.offset ?? 0);
  }

  function handlePageChange(newOffset: number) {
    fetchData(newOffset);
  }

  const scdStyle = SCD_COLORS[table.scd] ?? SCD_COLORS['SCD-0'];
  const countDisplay = rowCount === undefined ? '...' : rowCount === -1 ? 'N/A' : rowCount.toLocaleString();

  return (
    <div className="border border-slate-800/60 rounded-lg bg-slate-900/40 overflow-hidden transition-colors hover:border-slate-700/60">
      {/* Collapsed header — always visible */}
      <button
        onClick={handleToggle}
        disabled={!dbAvailable}
        className="w-full flex items-center gap-3 px-4 py-3 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </motion.div>

        <Database className="w-4 h-4 text-slate-600 flex-shrink-0" />

        <span className="font-mono text-sm text-slate-200 group-hover:text-white transition-colors">
          {table.name}
        </span>

        {/* SCD badge */}
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${scdStyle.bg} ${scdStyle.text}`}>
          {table.scd}
        </span>

        {/* Importance dot */}
        {table.importance === 'core' && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Core table" />
        )}

        <span className="flex-1 text-xs text-slate-500 truncate">
          {table.description}
        </span>

        {/* Stats */}
        <span className="text-xs text-slate-600 tabular-nums flex-shrink-0">
          {fieldCount !== undefined && `${fieldCount} cols`}
        </span>
        <span className="text-xs text-slate-500 tabular-nums flex-shrink-0 min-w-[60px] text-right font-mono">
          {countDisplay} rows
        </span>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-slate-800/50">
              {/* Refresh button */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">
                  {table.description}
                </p>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-300 border border-slate-800/50 rounded transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Loading state */}
              {loading && !data && (
                <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading data from PostgreSQL...</span>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="flex items-center gap-2 py-6 px-4 text-sm text-red-400 bg-red-500/5 rounded-lg border border-red-500/10">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Data grid */}
              {data && !error && (
                <ReferenceDataGrid
                  columns={data.columns}
                  rows={data.rows}
                  totalCount={data.totalCount}
                  tableName={table.name}
                  limit={data.limit}
                  offset={data.offset}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
