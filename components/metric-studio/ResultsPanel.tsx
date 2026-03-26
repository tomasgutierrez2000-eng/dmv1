'use client';

import React, { useState, useCallback } from 'react';
import { useStudioStore } from '@/lib/metric-studio/canvas-state';
import { CHILD_LEVEL, type DrillLevel } from '@/lib/governance/drill-down';

// ---------- formatting ----------

function formatStudioValue(val: number): string {
  if (isNaN(val)) return 'N/A';
  const abs = Math.abs(val);
  if (abs === 0) return '0';
  if (abs < 0.01) return val.toExponential(2);
  if (abs < 1) return val.toFixed(4);
  if (abs < 1000) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return val.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// ---------- types ----------

interface ResultRow {
  dimension_key: string | number;
  metric_value: number;
  dimension_label?: string;
  [key: string]: unknown;
}

interface DrillState {
  loading: boolean;
  error: string | null;
  rows: ResultRow[];
}

const LEVELS = [
  { key: 'facility', label: 'Facility' },
  { key: 'counterparty', label: 'Counterparty' },
  { key: 'desk', label: 'Desk' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'business_segment', label: 'Segment' },
] as const;

// ---------- main component ----------

export function ResultsPanel({ visible }: { visible: boolean }) {
  const [activeLevel, setActiveLevel] = useState<string>('facility');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [drillData, setDrillData] = useState<Record<string, DrillState>>({});
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [levelResults, setLevelResults] = useState<Record<string, { rows: ResultRow[]; rowCount: number; durationMs: number } | null>>({});
  const [reconResults, setReconResults] = useState<Record<string, { sum: number; count: number } | null>>({});
  const [runningAll, setRunningAll] = useState(false);

  const executionResult = useStudioStore((s) => s.executionResult);
  const formulaSQL = useStudioStore((s) => s.formulaSQL);
  const highlightNodes = useStudioStore((s) => s.highlightNodes);

  const currentResult = executionResult as { ok: boolean; rows?: ResultRow[]; rowCount?: number; durationMs?: number; error?: string } | null;

  // Use execution result for facility level, levelResults for others
  const displayResult = activeLevel === 'facility' && currentResult?.ok
    ? { rows: currentResult.rows || [], rowCount: currentResult.rowCount || 0, durationMs: currentResult.durationMs || 0 }
    : levelResults[activeLevel] || null;

  const sortedRows = displayResult?.rows
    ? [...displayResult.rows].sort((a, b) =>
        sortDir === 'desc'
          ? (b.metric_value ?? 0) - (a.metric_value ?? 0)
          : (a.metric_value ?? 0) - (b.metric_value ?? 0)
      )
    : [];

  // Statistics
  const stats = displayResult?.rows && displayResult.rows.length > 0
    ? computeStats(displayResult.rows)
    : null;

  // Toggle drill-down
  const toggleDrill = useCallback(async (dimKey: string) => {
    const key = `${activeLevel}:${dimKey}`;
    if (expandedRows.has(key)) {
      setExpandedRows((prev) => { const next = new Set(prev); next.delete(key); return next; });
      return;
    }

    const childLevel = CHILD_LEVEL[activeLevel];
    if (!childLevel || childLevel === 'position') return;

    setExpandedRows((prev) => new Set(prev).add(key));
    setDrillData((prev) => ({ ...prev, [key]: { loading: true, error: null, rows: [] } }));

    try {
      const resp = await fetch('/api/metrics/governance/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: formulaSQL,
          level: childLevel,
          drill_down: { parent_level: activeLevel, parent_dim_key: String(dimKey) },
        }),
      });
      const data = await resp.json();
      if (data.ok !== false && data.rows) {
        setDrillData((prev) => ({ ...prev, [key]: { loading: false, error: null, rows: data.rows } }));
      } else {
        setDrillData((prev) => ({ ...prev, [key]: { loading: false, error: data.error || 'Failed', rows: [] } }));
      }
    } catch (err) {
      setDrillData((prev) => ({
        ...prev,
        [key]: { loading: false, error: err instanceof Error ? err.message : 'Network error', rows: [] },
      }));
    }
  }, [activeLevel, expandedRows, formulaSQL]);

  // Run all levels for reconciliation
  const runAllLevels = useCallback(async () => {
    if (!formulaSQL) return;
    setRunningAll(true);
    const results: Record<string, { rows: ResultRow[]; rowCount: number; durationMs: number } | null> = {};
    const recon: Record<string, { sum: number; count: number } | null> = {};

    for (const level of LEVELS) {
      try {
        const resp = await fetch('/api/metrics/governance/calculator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: formulaSQL, level: level.key }),
        });
        const data = await resp.json();
        if (data.ok !== false && data.rows) {
          results[level.key] = { rows: data.rows, rowCount: data.row_count || data.rows.length, durationMs: data.duration_ms || 0 };
          const sum = data.rows.reduce((s: number, r: ResultRow) => s + (Number(r.metric_value) || 0), 0);
          recon[level.key] = { sum, count: data.rows.length };
        } else {
          results[level.key] = null;
          recon[level.key] = null;
        }
      } catch {
        results[level.key] = null;
        recon[level.key] = null;
      }
    }

    setLevelResults(results);
    setReconResults(recon);
    setRunningAll(false);
  }, [formulaSQL]);

  // Row hover → highlight canvas nodes
  const handleRowHover = useCallback((dimKey: string | null) => {
    if (highlightNodes) {
      // For now, highlight all nodes when hovering any result row
      // Future: trace which specific tables contribute to this entity
      if (dimKey) {
        highlightNodes(useStudioStore.getState().nodes.map((n) => n.id));
      } else {
        highlightNodes([]);
      }
    }
  }, [highlightNodes]);

  // Export CSV
  const exportCSV = useCallback(() => {
    if (!sortedRows.length) return;
    const cols = Object.keys(sortedRows[0]);
    const csv = [cols.join(','), ...sortedRows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metric-studio-${activeLevel}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sortedRows, activeLevel]);

  if (!visible) return null;

  return (
    <div className="border-t border-slate-800 bg-[#0f1017] flex flex-col" style={{ height: '40%', minHeight: '200px' }}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-slate-800/50 flex items-center gap-3 shrink-0">
        {/* Level tabs */}
        <div className="flex items-center gap-0.5">
          {LEVELS.map((l) => (
            <button
              key={l.key}
              onClick={() => { setActiveLevel(l.key); setExpandedRows(new Set()); }}
              className={`px-2.5 py-1 text-[10px] rounded transition-colors ${
                activeLevel === l.key
                  ? 'bg-[#D04A02]/10 text-[#D04A02] border border-[#D04A02]/30'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              {l.label}
              {levelResults[l.key] && (
                <span className="ml-1 text-[8px] text-slate-600">{levelResults[l.key]?.rowCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <button
          onClick={runAllLevels}
          disabled={runningAll || !formulaSQL}
          className="px-2.5 py-1 text-[10px] rounded border border-slate-700 text-slate-400 hover:text-[#D04A02] hover:border-[#D04A02]/30 disabled:opacity-30 transition-colors"
        >
          {runningAll ? 'Running...' : 'Run All Levels'}
        </button>
        <button
          onClick={exportCSV}
          disabled={!sortedRows.length}
          className="px-2.5 py-1 text-[10px] rounded border border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Statistics bar */}
      {stats && (
        <div className="px-4 py-1.5 border-b border-slate-800/30 flex items-center gap-4 text-[9px] text-slate-500 shrink-0">
          <span>Avg: <span className="text-slate-300">{stats.avg.toFixed(2)}</span></span>
          <span>Med: <span className="text-slate-300">{stats.median.toFixed(2)}</span></span>
          <span>Min: <span className="text-slate-300">{stats.min.toFixed(2)}</span></span>
          <span>Max: <span className="text-slate-300">{stats.max.toFixed(2)}</span></span>
          {stats.outliers > 0 && (
            <span className="text-yellow-500">Outliers: {stats.outliers}</span>
          )}
          <span className="ml-auto">{displayResult?.rowCount ?? 0} rows</span>
          {displayResult?.durationMs != null && (
            <span>{displayResult.durationMs}ms</span>
          )}
        </div>
      )}

      {/* Results table */}
      <div className="flex-1 overflow-auto px-2">
        {!displayResult && !currentResult ? (
          <div className="flex items-center justify-center h-full text-xs text-slate-600">
            Run the formula to see results
          </div>
        ) : currentResult && !currentResult.ok ? (
          <div className="p-4 text-xs text-red-400 bg-red-950/20 border border-red-500/20 rounded m-2">
            {currentResult.error}
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-slate-600">
            No results at {activeLevel} level
          </div>
        ) : (
          <table className="w-full border-collapse text-[10px] font-mono">
            <thead>
              <tr className="sticky top-0 bg-[#0f1017] z-10">
                <th className="text-left px-2 py-1.5 text-slate-500 border-b border-slate-800 w-8"></th>
                <th className="text-left px-2 py-1.5 text-slate-500 border-b border-slate-800 font-medium">dimension_key</th>
                <th className="text-left px-2 py-1.5 text-slate-500 border-b border-slate-800 font-medium">label</th>
                <th
                  className="text-right px-2 py-1.5 text-slate-500 border-b border-slate-800 font-medium cursor-pointer hover:text-[#D04A02]"
                  onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                >
                  metric_value {sortDir === 'desc' ? '\u25BC' : '\u25B2'}
                </th>
                <th className="text-right px-2 py-1.5 text-slate-500 border-b border-slate-800 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.slice(0, 200).map((row) => {
                const key = `${activeLevel}:${row.dimension_key}`;
                const isExpanded = expandedRows.has(key);
                const drill = drillData[key];
                const childLevel = CHILD_LEVEL[activeLevel];

                return (
                  <React.Fragment key={String(row.dimension_key)}>
                    <tr
                      className="hover:bg-[#1a1a25] cursor-pointer"
                      onMouseEnter={() => handleRowHover(String(row.dimension_key))}
                      onMouseLeave={() => handleRowHover(null)}
                    >
                      <td className="px-2 py-1 text-slate-600 border-b border-slate-800/20">
                        {childLevel && childLevel !== 'position' && (
                          <button
                            onClick={() => toggleDrill(String(row.dimension_key))}
                            className="text-[10px] text-slate-500 hover:text-[#D04A02] w-4"
                          >
                            {isExpanded ? '\u25BE' : '\u25B8'}
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-1 text-slate-300 border-b border-slate-800/20">
                        {String(row.dimension_key)}
                      </td>
                      <td className="px-2 py-1 text-slate-400 border-b border-slate-800/20 truncate max-w-[200px]">
                        {row.dimension_label || ''}
                      </td>
                      <td className="px-2 py-1 text-right text-[#D04A02] border-b border-slate-800/20 font-medium">
                        {typeof row.metric_value === 'number' ? formatStudioValue(row.metric_value) : String(row.metric_value ?? '\u2014')}
                      </td>
                      <td className="px-2 py-1 text-right border-b border-slate-800/20">
                        <button className="text-[9px] text-slate-600 hover:text-[#D04A02] px-1.5 py-0.5 rounded border border-slate-800 hover:border-[#D04A02]/30">
                          Trace
                        </button>
                      </td>
                    </tr>
                    {/* Drill-down children */}
                    {isExpanded && drill && (
                      drill.loading ? (
                        <tr><td colSpan={5} className="px-6 py-2 text-[9px] text-slate-500 animate-pulse border-b border-slate-800/20">Loading {childLevel} data...</td></tr>
                      ) : drill.error ? (
                        <tr><td colSpan={5} className="px-6 py-2 text-[9px] text-red-400 border-b border-slate-800/20">{drill.error}</td></tr>
                      ) : drill.rows.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-2 text-[9px] text-slate-600 border-b border-slate-800/20">No child rows</td></tr>
                      ) : (
                        drill.rows.map((childRow) => (
                          <tr key={`${key}:${childRow.dimension_key}`} className="bg-[#0d0d15] hover:bg-[#151525]">
                            <td className="px-2 py-0.5 border-b border-slate-800/10"></td>
                            <td className="px-2 py-0.5 text-slate-400 border-b border-slate-800/10 pl-6 text-[9px]">
                              {String(childRow.dimension_key)}
                            </td>
                            <td className="px-2 py-0.5 text-slate-500 border-b border-slate-800/10 text-[9px] truncate max-w-[200px]">
                              {childRow.dimension_label || ''}
                            </td>
                            <td className="px-2 py-0.5 text-right text-slate-400 border-b border-slate-800/10 text-[9px]">
                              {typeof childRow.metric_value === 'number' ? formatStudioValue(childRow.metric_value) : String(childRow.metric_value ?? '\u2014')}
                            </td>
                            <td className="px-2 py-0.5 border-b border-slate-800/10"></td>
                          </tr>
                        ))
                      )
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Reconciliation strip */}
      {Object.keys(reconResults).length > 0 && (
        <ReconciliationStrip reconResults={reconResults} />
      )}
    </div>
  );
}

// ---------- reconciliation strip ----------

function ReconciliationStrip({ reconResults }: { reconResults: Record<string, { sum: number; count: number } | null> }) {
  const pairs = [
    ['facility', 'counterparty'],
    ['counterparty', 'desk'],
    ['desk', 'portfolio'],
    ['portfolio', 'business_segment'],
  ];

  return (
    <div className="px-4 py-1.5 border-t border-slate-800/50 flex items-center gap-3 text-[9px] shrink-0 bg-[#0a0a12]">
      <span className="text-slate-600 uppercase tracking-wider">Recon:</span>
      {pairs.map(([from, to]) => {
        const fromData = reconResults[from];
        const toData = reconResults[to];

        if (!fromData || !toData) {
          return (
            <span key={`${from}-${to}`} className="text-slate-700">
              {from.slice(0, 3)}&rarr;{to.slice(0, 3)} &mdash;
            </span>
          );
        }

        const delta = Math.abs(fromData.sum - toData.sum);
        const maxVal = Math.max(Math.abs(fromData.sum), Math.abs(toData.sum));
        const deltaPct = maxVal > 0 ? (delta / maxVal) * 100 : 0;
        const pass = deltaPct < 5;

        return (
          <span
            key={`${from}-${to}`}
            className={pass ? 'text-green-500' : 'text-red-400'}
            title={`${from}: sum=${fromData.sum.toFixed(2)} (${fromData.count} rows)\n${to}: sum=${toData.sum.toFixed(2)} (${toData.count} rows)\nDelta: ${deltaPct.toFixed(1)}%`}
          >
            {from.slice(0, 3)}&rarr;{to.slice(0, 3)} {'\u0394'}{deltaPct.toFixed(1)}% {pass ? '\u2713' : '\u2717'}
          </span>
        );
      })}
    </div>
  );
}

// ---------- stats helper ----------

function computeStats(rows: ResultRow[]): { avg: number; median: number; min: number; max: number; outliers: number } {
  const values = rows.map((r) => Number(r.metric_value)).filter((v) => !isNaN(v));
  if (values.length === 0) return { avg: 0, median: 0, min: 0, max: 0, outliers: 0 };

  values.sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const avg = sum / values.length;
  const median = values.length % 2 === 0
    ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
    : values[Math.floor(values.length / 2)];

  // IQR-based outlier detection
  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;
  const outliers = values.filter((v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr).length;

  return { avg, median, min: values[0], max: values[values.length - 1], outliers };
}
