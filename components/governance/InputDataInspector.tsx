'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronDown, ChevronUp, TableProperties, Loader2,
  AlertTriangle, RefreshCw,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────── */

interface InputColumn {
  name: string;
  data_type: string;
  is_pk: boolean;
  is_fk: boolean;
  is_formula_ref: boolean;
  role?: string;
}

interface InputTableResult {
  schema: string;
  table: string;
  qualified_name: string;
  columns: InputColumn[];
  rows: Record<string, unknown>[];
  total_count: number;
  returned_count: number;
  truncated: boolean;
  highlighted_columns: string[];
  pk_columns: string[];
  duration_ms: number;
  error?: string;
}

interface InputDataResponse {
  tables: InputTableResult[];
  as_of_date: string;
  scope_applied: boolean;
  scope_description?: string;
}

interface InputDataInspectorProps {
  itemId: string;
  asOfDate: string | null;
  activeLevel: string;
  formulaSql: string;
  shouldFetch: boolean;
  onFetchComplete: () => void;
  scopedRow?: { dimension_key: string; level: string } | null;
  unitType?: string;
}

/* ── Constants ──────────────────────────────────────────────── */

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  l1: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300' },
  l2: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300' },
  l3: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300' },
};

/* ── Helpers ─────────────────────────────────────────────────── */

/** Sort columns: PK → formula-ref → FK → alpha */
function sortColumns(columns: InputColumn[]): InputColumn[] {
  return [...columns].sort((a, b) => {
    if (a.is_pk !== b.is_pk) return a.is_pk ? -1 : 1;
    if (a.is_formula_ref !== b.is_formula_ref) return a.is_formula_ref ? -1 : 1;
    if (a.is_fk !== b.is_fk) return a.is_fk ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/** Format a cell value for display */
function formatCellValue(value: unknown, dataType: string): string {
  if (value === null || value === undefined) return 'NULL';

  if (dataType.startsWith('NUMERIC') || dataType === 'BIGINT' || dataType === 'INTEGER') {
    const n = Number(value);
    if (!isNaN(n)) {
      return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }
  }

  if (dataType === 'BOOLEAN') {
    return value === true || value === 'Y' || value === 't' ? 'Y' : 'N';
  }

  if (dataType === 'DATE' || dataType.startsWith('TIMESTAMP')) {
    const s = String(value);
    return s.split('T')[0];
  }

  const s = String(value);
  if (s.length > 50) return s.slice(0, 47) + '...';
  return s;
}

/* ── Component ──────────────────────────────────────────────── */

export default function InputDataInspector({
  itemId,
  asOfDate,
  activeLevel,
  formulaSql,
  shouldFetch,
  onFetchComplete,
  scopedRow,
  unitType: _unitType,
}: InputDataInspectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<InputTableResult[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [scopeApplied, setScopeApplied] = useState(false);
  const [scopeDescription, setScopeDescription] = useState<string | null>(null);

  // Track previous fetch params to avoid redundant requests
  const lastFetchRef = useRef<string>('');

  const fetchInputData = useCallback(async (scope?: { dimension_key: string; level: string } | null) => {
    if (!itemId || !asOfDate) return;

    const fetchKey = `${itemId}|${asOfDate}|${activeLevel}|${formulaSql}|${scope?.dimension_key ?? ''}|${scope?.level ?? ''}`;
    if (fetchKey === lastFetchRef.current && tableData.length > 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/metrics/governance/input-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          as_of_date: asOfDate,
          level: activeLevel,
          formula_sql: formulaSql,
          scope: scope ?? undefined,
          max_rows_per_table: 50,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const response = data as InputDataResponse;
      setTableData(response.tables);
      setScopeApplied(response.scope_applied);
      setScopeDescription(response.scope_description ?? null);
      setActiveTab(0);
      lastFetchRef.current = fetchKey;

      // Auto-open on first successful fetch
      if (response.tables.length > 0 && !isOpen) {
        setIsOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load input data');
    } finally {
      setLoading(false);
    }
  }, [itemId, asOfDate, activeLevel, formulaSql, tableData.length, isOpen]);

  // React to shouldFetch trigger from parent
  useEffect(() => {
    if (shouldFetch) {
      fetchInputData(scopedRow);
      onFetchComplete();
    }
  }, [shouldFetch, scopedRow, fetchInputData, onFetchComplete]);

  // Clear data when key params change
  useEffect(() => {
    setTableData([]);
    setError(null);
    setScopeApplied(false);
    setScopeDescription(null);
    lastFetchRef.current = '';
  }, [itemId, activeLevel]);

  const handleRefresh = useCallback(() => {
    lastFetchRef.current = ''; // Force re-fetch
    fetchInputData(scopedRow);
  }, [fetchInputData, scopedRow]);

  const handleClearScope = useCallback(() => {
    lastFetchRef.current = ''; // Force re-fetch
    fetchInputData(null);
  }, [fetchInputData]);

  const activeTable = tableData[activeTab] ?? null;
  const sortedCols = activeTable ? sortColumns(activeTable.columns) : [];
  // Only show columns that exist in the result rows (API may return subset)
  const visibleCols = activeTable?.rows?.[0]
    ? sortedCols.filter(c => c.name in activeTable.rows[0])
    : sortedCols;

  return (
    <div className="border-t border-pwc-gray-light shrink-0">
      {/* Header bar — always visible */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-2 bg-pwc-black/40 hover:bg-pwc-black/60 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
        )}
        <TableProperties className="w-3.5 h-3.5 text-pwc-orange" />
        <span className="text-xs font-semibold text-gray-300">Input Data Inspector</span>

        {tableData.length > 0 && (
          <span className="text-[10px] text-gray-500">{tableData.length} tables</span>
        )}

        {scopeApplied && scopeDescription && (
          <span className="text-[10px] text-pwc-orange bg-pwc-orange/10 px-1.5 py-0.5 rounded">
            {scopeDescription}
          </span>
        )}

        {loading && <Loader2 className="w-3 h-3 text-gray-500 animate-spin ml-auto" />}

        {!loading && tableData.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
            className="ml-auto p-1 rounded text-gray-600 hover:text-gray-400 transition-colors"
            title="Refresh input data"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="max-h-80 flex flex-col overflow-hidden bg-pwc-gray">
          {/* Error state */}
          {error && (
            <div className="px-4 py-3 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Loading state */}
          {loading && tableData.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-pwc-orange animate-spin" />
              <span className="ml-2 text-xs text-gray-400">Querying ingredient tables...</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && tableData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-gray-500">
              <TableProperties className="w-6 h-6 mb-2 text-gray-600" />
              <p className="text-xs">No input data available for this metric</p>
            </div>
          )}

          {/* Table tabs + data grid */}
          {tableData.length > 0 && (
            <>
              {/* Table tabs */}
              <div className="flex items-center gap-1 px-4 py-1.5 border-b border-pwc-gray-light/50 overflow-x-auto shrink-0">
                {tableData.map((t, i) => {
                  const colors = LAYER_COLORS[t.schema] ?? LAYER_COLORS.l2;
                  return (
                    <button
                      key={t.qualified_name}
                      type="button"
                      onClick={() => setActiveTab(i)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-colors
                        ${activeTab === i
                          ? `${colors.bg} ${colors.text} border ${colors.border}`
                          : 'text-gray-400 hover:text-gray-300 hover:bg-pwc-gray-light/30'
                        }`}
                    >
                      <span className="font-semibold">{t.schema.toUpperCase()}</span>
                      <span className="ml-1">{t.table}</span>
                      <span className="ml-1 text-gray-500">({t.returned_count})</span>
                      {t.error && <span className="ml-1 text-red-400">!</span>}
                    </button>
                  );
                })}
              </div>

              {/* Data grid */}
              <div className="flex-1 overflow-auto min-h-0">
                {activeTable && !activeTable.error && activeTable.rows.length > 0 && (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-pwc-gray z-10">
                      <tr>
                        {visibleCols.map(col => (
                          <th
                            key={col.name}
                            className={`px-3 py-1.5 text-left font-medium whitespace-nowrap border-b border-pwc-gray-light/30
                              ${col.is_pk
                                ? 'text-blue-400'
                                : col.is_formula_ref
                                  ? 'text-pwc-orange'
                                  : 'text-gray-500'
                              }
                              ${col.is_formula_ref ? 'border-l-2 border-l-pwc-orange bg-pwc-orange/5' : ''}
                            `}
                            title={`${col.name} (${col.data_type})${col.role ? ` — ${col.role}` : ''}`}
                          >
                            {col.name}
                            {col.is_pk && (
                              <span className="ml-1 text-[9px] text-blue-500/60">PK</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeTable.rows.map((row, ridx) => (
                        <tr
                          key={ridx}
                          className="border-b border-pwc-gray-light/10 hover:bg-pwc-gray-light/5"
                        >
                          {visibleCols.map(col => {
                            const val = row[col.name];
                            const isNull = val === null || val === undefined;
                            return (
                              <td
                                key={col.name}
                                className={`px-3 py-1 font-mono whitespace-nowrap tabular-nums
                                  ${col.is_pk ? 'font-semibold text-blue-300' : ''}
                                  ${col.is_formula_ref ? 'bg-pwc-orange/5 border-l-2 border-l-pwc-orange' : ''}
                                  ${isNull ? 'text-gray-600 italic' : 'text-gray-300'}
                                `}
                                title={isNull ? 'NULL' : String(val)}
                              >
                                {formatCellValue(val, col.data_type)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Table-level error */}
                {activeTable?.error && (
                  <div className="px-4 py-4 text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{activeTable.error}</span>
                  </div>
                )}

                {/* Table-level empty */}
                {activeTable && !activeTable.error && activeTable.rows.length === 0 && (
                  <div className="px-4 py-6 text-center text-gray-500 text-xs">
                    No rows returned{scopeApplied ? ' for this scope' : ''}
                  </div>
                )}
              </div>

              {/* Footer */}
              {activeTable && (
                <div className="px-4 py-1.5 bg-pwc-black/30 border-t border-pwc-gray-light/30 flex items-center gap-3 text-[10px] text-gray-500 shrink-0">
                  <span>
                    {activeTable.returned_count} of {activeTable.total_count} rows
                  </span>
                  {activeTable.truncated && (
                    <span className="text-amber-400">truncated</span>
                  )}
                  {activeTable.duration_ms > 0 && (
                    <span>{activeTable.duration_ms}ms</span>
                  )}
                  {scopeApplied && (
                    <button
                      type="button"
                      onClick={handleClearScope}
                      className="text-pwc-orange hover:text-pwc-orange/80 ml-auto transition-colors"
                    >
                      Clear scope filter
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
