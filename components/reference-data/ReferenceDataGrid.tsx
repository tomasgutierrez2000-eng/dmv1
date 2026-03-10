'use client';

import { useState, useMemo } from 'react';
import { Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface ReferenceDataGridProps {
  columns: string[];
  rows: Record<string, unknown>[];
  totalCount: number;
  tableName: string;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
}

type SortDir = 'asc' | 'desc';

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return value.split('T')[0];
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString() : value.toString();
  }
  return String(value);
}

function isNull(value: unknown): boolean {
  return value === null || value === undefined;
}

export default function ReferenceDataGrid({
  columns,
  rows,
  totalCount,
  limit,
  offset,
  onPageChange,
}: ReferenceDataGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filtered = useMemo(() => {
    let result = rows;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
        })
      );
    }
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortCol];
        const bVal = b[sortCol];
        if (isNull(aVal) && isNull(bVal)) return 0;
        if (isNull(aVal)) return 1;
        if (isNull(bVal)) return -1;
        let cmp: number;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, searchQuery, sortCol, sortDir, columns]);

  function toggleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-amber-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-amber-400" />
    );
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalCount / limit);
  const showingFrom = offset + 1;
  const showingTo = Math.min(offset + filtered.length, totalCount);

  return (
    <div className="space-y-3">
      {/* Search + Pagination Info */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Filter rows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-800/50 border border-slate-700/50 rounded-md text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
          />
        </div>
        <div className="text-xs text-slate-500">
          {totalCount === 0
            ? 'No rows'
            : `Showing ${showingFrom}-${showingTo} of ${totalCount.toLocaleString()} rows`}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800/80">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => toggleSort(col)}
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-300 transition-colors whitespace-nowrap select-none"
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-600 text-sm">
                  {searchQuery ? 'No matching rows' : 'No rows in this table'}
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col}
                      className={`px-3 py-1.5 font-mono text-xs whitespace-nowrap ${
                        isNull(row[col]) ? 'text-slate-700 italic' : 'text-slate-300'
                      }`}
                    >
                      {isNull(row[col]) ? 'NULL' : formatCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => onPageChange(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 bg-slate-800/50 border border-slate-700/50 rounded-md hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            Previous
          </button>
          <span className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(offset + limit)}
            disabled={offset + limit >= totalCount}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 bg-slate-800/50 border border-slate-700/50 rounded-md hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
