'use client';

import { useState, useEffect, useCallback } from 'react';
import { Code2, Play, Loader2, AlertTriangle, FileCode } from 'lucide-react';

interface CalculatorSource {
  found: boolean;
  file: string | null;
  source: string | null;
}

interface RunResult {
  metric_id: string;
  dimension: string;
  row_count: number;
  rows: Record<string, unknown>[];
}

const DIMENSIONS = ['facility', 'counterparty', 'desk', 'portfolio', 'lob'] as const;

export default function PythonCalculatorSection({
  executableMetricId,
}: {
  executableMetricId?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<'source' | 'run'>('source');
  const [source, setSource] = useState<CalculatorSource | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const [dimension, setDimension] = useState<string>('facility');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Fetch calculator source on mount
  const fetchSource = useCallback(() => {
    if (!executableMetricId) return;
    setSourceLoading(true);
    setSourceError(null);
    fetch(`/api/metrics/library/calculator-source?metric_id=${encodeURIComponent(executableMetricId)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch calculator source');
        return r.json();
      })
      .then((data) => setSource(data.data ?? data))
      .catch((err) => setSourceError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setSourceLoading(false));
  }, [executableMetricId]);

  useEffect(() => {
    fetchSource();
  }, [fetchSource]);

  const runCalculator = useCallback(() => {
    if (!executableMetricId) return;
    setRunLoading(true);
    setRunError(null);
    setRunResult(null);
    fetch('/api/metrics/library/run-calculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric_id: executableMetricId, dimension }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRunResult(data.data ?? data);
      })
      .catch((err) => setRunError(err instanceof Error ? err.message : 'Execution failed'))
      .finally(() => setRunLoading(false));
  }, [executableMetricId, dimension]);

  // No executable metric linked
  if (!executableMetricId) {
    return (
      <div className="text-center py-12">
        <FileCode className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400">No Python calculator registered for this metric.</p>
        <p className="text-xs text-gray-500 mt-1">
          Add a calculator in <code className="text-gray-400">scripts/calc_engine/calculators/</code> and link via <code className="text-gray-400">executable_metric_id</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1.5" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'source'}
          onClick={() => setActiveTab('source')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'source'
              ? 'bg-purple-500 text-white shadow-md'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Source Code
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'run'}
          onClick={() => setActiveTab('run')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'run'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          Run Calculator
        </button>
      </div>

      {/* Source Code tab */}
      {activeTab === 'source' && (
        <div>
          {sourceLoading && (
            <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading calculator source...</span>
            </div>
          )}

          {sourceError && (
            <div className="flex items-center gap-2 text-red-400 py-4">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">{sourceError}</span>
            </div>
          )}

          {source && !sourceLoading && (
            <>
              {source.found && source.source ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-xs text-gray-400 font-mono">{source.file}</code>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      Calculator found
                    </span>
                  </div>
                  <div className="bg-black/40 rounded-lg border border-gray-800 overflow-x-auto">
                    <pre className="text-xs font-mono text-gray-300 p-4 leading-relaxed">
                      <code>{addLineNumbers(source.source)}</code>
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileCode className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    No Python calculator file found for metric <code className="text-purple-400">{executableMetricId}</code>.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    The metric is linked but no matching calculator class was found in <code className="text-gray-400">scripts/calc_engine/calculators/</code>.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Run Calculator tab */}
      {activeTab === 'run' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-400 font-medium">Dimension:</label>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
              className="bg-gray-800 text-gray-200 text-xs rounded-lg px-3 py-1.5 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {DIMENSIONS.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
            <button
              onClick={runCalculator}
              disabled={runLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {runLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {runLoading ? 'Running...' : 'Run'}
            </button>
          </div>

          {runError && (
            <div className="flex items-center gap-2 text-red-400 bg-red-950/30 rounded-lg p-3 border border-red-900/40">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{runError}</span>
            </div>
          )}

          {runResult && (
            <div>
              <div className="text-xs text-gray-400 mb-2">
                {runResult.row_count} row{runResult.row_count !== 1 ? 's' : ''} returned
                {' — '}
                <span className="text-purple-400">{runResult.dimension}</span> level
              </div>
              <div className="bg-black/40 rounded-lg border border-gray-800 overflow-x-auto">
                <ResultTable rows={runResult.rows} />
              </div>
            </div>
          )}

          {!runResult && !runError && !runLoading && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">Select a dimension and click Run to execute the calculator.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Add line numbers to source code for display. */
function addLineNumbers(source: string): string {
  const lines = source.split('\n');
  const pad = String(lines.length).length;
  return lines
    .map((line, i) => {
      const num = String(i + 1).padStart(pad, ' ');
      return `${num}  ${line}`;
    })
    .join('\n');
}

/** Render calculator results as a table. */
function ResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-gray-400 p-4">No results.</p>;
  }

  const columns = Object.keys(rows[0]);
  const displayRows = rows.slice(0, 50); // Cap at 50 for UI

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-700">
          {columns.map((col) => (
            <th key={col} className="py-2 px-3 text-left font-semibold text-gray-400 uppercase tracking-wider">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {displayRows.map((row, i) => (
          <tr key={i} className="border-b border-gray-800 hover:bg-white/5">
            {columns.map((col) => (
              <td key={col} className="py-1.5 px-3 text-gray-300 font-mono tabular-nums">
                {formatCellValue(row[col])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {rows.length > 50 && (
        <tfoot>
          <tr>
            <td colSpan={columns.length} className="py-2 px-3 text-gray-500 text-center">
              Showing 50 of {rows.length} rows
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return val.toLocaleString();
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return String(val);
}
