'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play, Loader2, Code2, AlertTriangle, ArrowUpDown, Pencil, Search,
  Download, XCircle, Timer, Filter,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import FormulaEditor from './FormulaEditor';
import DrillDownRow from './DrillDownRow';
import InputDataInspector from './InputDataInspector';
import type { CatalogueItem } from '@/lib/metric-library/types';
import {
  CHILD_LEVEL, drillLevelToTab, formatMetricValue, formatNumber,
  type DrillLevel, type DrillDownNode,
} from '@/lib/governance/drill-down';
import {
  LEVEL_TABS,
  highlightSql,
  getFormulasForItem,
  exportResultsToCSV,
  computeStats,
  classifyError,
  metricColor,
  type ClassifiedError,
  type ResultRow,
} from './calculation-workspace-utils';

// Re-export for external consumers
export { getFormulasForItem } from './calculation-workspace-utils';

interface CalculationWorkspaceProps {
  asOfDate: string | null;
  itemId?: string;
  item?: CatalogueItem | null;
  activeLevel?: string;
  onLevelChange?: (level: string) => void;
  onResultsChange?: (level: string, rows: ResultRow[]) => void;
  onFormulaSave?: (level: string, sql: string) => void;
}

/**
 * Center pane: formula display, level selector, and live result table.
 */
export default function CalculationWorkspace({
  asOfDate,
  itemId,
  item,
  activeLevel: externalLevel,
  onLevelChange,
  onResultsChange,
  onFormulaSave,
}: CalculationWorkspaceProps) {
  const [internalLevel, setInternalLevel] = useState('facility');
  const activeLevel = externalLevel ?? internalLevel;
  const setActiveLevel = (level: string) => {
    setInternalLevel(level);
    onLevelChange?.(level);
  };
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [totalRowCount, setTotalRowCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [classifiedError, setClassifiedError] = useState<ClassifiedError | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [filterText, setFilterText] = useState('');

  // Drill-down state
  const [drillDownMap, setDrillDownMap] = useState<Map<string, DrillDownNode>>(new Map());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Input Data Inspector state
  const [inspectorShouldFetch, setInspectorShouldFetch] = useState(false);
  const [inspectorScopedRow, setInspectorScopedRow] = useState<{
    dimension_key: string; level: string;
  } | null>(null);

  // Abort controller for cancellation
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const levelFormulas = getFormulasForItem(item);
  const formula = levelFormulas[activeLevel];
  const metricColorFn = (v: number) => metricColor(v, item?.unit_type, item?.direction);

  // Detect Mac platform for shortcut label
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const shortcutLabel = isMac ? '⌘↵' : 'Ctrl↵';

  // Keyboard shortcut ref (populated after runCalculation is defined)
  const runCalcRef = useRef<() => void>();

  const cancelCalculation = useCallback(() => {
    abortRef.current?.abort();
    if (timerRef.current) clearInterval(timerRef.current);
    setLoading(false);
    setElapsedSec(0);
  }, []);

  const runCalculation = useCallback(async () => {
    if (!asOfDate || !formula) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setClassifiedError(null);
    setRows([]);
    setTotalRowCount(null);
    setDurationMs(null);
    setDrillDownMap(new Map());
    setExpandedPaths(new Set());
    setElapsedSec(0);
    setFilterText('');

    // Elapsed timer
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    // Timeout after 30s
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch('/api/metrics/governance/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: formula.sql,
          as_of_date: asOfDate,
          level: activeLevel,
          max_rows: 1000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        setClassifiedError(classifyError(data.error || `HTTP ${res.status}`, res.status));
        return;
      }

      const resultRows = (data.rows ?? []) as ResultRow[];
      setRows(resultRows);
      setTotalRowCount(data.total_count ?? resultRows.length);
      setDurationMs(data.duration_ms ?? null);
      onResultsChange?.(activeLevel, resultRows);

      // Trigger input data inspector refresh
      setInspectorShouldFetch(true);
      setInspectorScopedRow(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setClassifiedError({ message: 'Calculation timed out after 30 seconds', code: 'TIMEOUT', severity: 'warning',
          hint: 'Try simplifying the formula or narrowing the date range. Complex JOINs with large datasets may exceed the time limit.' });
      } else {
        setClassifiedError(classifyError(err));
      }
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
      setElapsedSec(0);
    }
  }, [asOfDate, activeLevel, formula, onResultsChange]);

  // Keyboard shortcut: Cmd/Ctrl+Enter to run
  runCalcRef.current = runCalculation;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runCalcRef.current?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /** Fetch child-level data for a drill-down expansion. */
  const fetchDrillDown = useCallback(async (
    pathKey: string,
    parentLevel: DrillLevel,
    parentDimKey: string,
  ) => {
    const childLevel = CHILD_LEVEL[parentLevel];
    if (!childLevel || !asOfDate) return;

    // Set loading state
    setDrillDownMap(prev => {
      const next = new Map(prev);
      next.set(pathKey, {
        parentLevel,
        parentDimKey,
        childLevel,
        rows: [],
        loading: true,
        error: null,
      });
      return next;
    });

    try {
      // Get the child-level formula SQL (for position level, API uses direct query)
      const childTabKey = drillLevelToTab(childLevel);
      const childFormula = childTabKey ? levelFormulas[childTabKey] : null;
      const drillSql = childFormula?.sql ?? (childLevel === 'position' ? formula.sql : null);

      if (!drillSql) {
        throw new Error(`No formula defined for ${childLevel} level — cannot drill down`);
      }

      const res = await fetch('/api/metrics/governance/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: drillSql,
          as_of_date: asOfDate,
          level: childLevel,
          max_rows: 200,
          drill_down: {
            parent_level: parentLevel,
            parent_dim_key: parentDimKey,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setDrillDownMap(prev => {
        const next = new Map(prev);
        next.set(pathKey, {
          parentLevel,
          parentDimKey,
          childLevel,
          rows: data.rows ?? [],
          loading: false,
          error: null,
        });
        return next;
      });
    } catch (err) {
      setDrillDownMap(prev => {
        const next = new Map(prev);
        next.set(pathKey, {
          parentLevel,
          parentDimKey,
          childLevel,
          rows: [],
          loading: false,
          error: err instanceof Error ? err.message : 'Drill-down failed',
        });
        return next;
      });
    }
  }, [asOfDate, levelFormulas, formula]);

  /** Toggle expand/collapse for a dimension row. */
  const toggleExpand = useCallback((pathKey: string, level: DrillLevel, dimKey: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(pathKey)) {
        next.delete(pathKey);
      } else {
        next.add(pathKey);
        // Fetch if not already loaded
        if (!drillDownMap.has(pathKey)) {
          fetchDrillDown(pathKey, level, dimKey);
        }
      }
      return next;
    });
  }, [drillDownMap, fetchDrillDown]);

  const router = useRouter();

  /** Navigate to Calculation Trace for a specific entity. */
  const handleTraceRow = useCallback((dimKey: string) => {
    if (!itemId) return;
    const params = new URLSearchParams({
      level: activeLevel,
      key: dimKey,
      ...(asOfDate ? { date: asOfDate } : {}),
    });
    router.push(`/metrics/library/${encodeURIComponent(itemId)}/trace?${params.toString()}`);
  }, [itemId, activeLevel, asOfDate, router]);

  /** Scope the Input Data Inspector to a specific result row. */
  const handleScopeToRow = useCallback((dimKey: string) => {
    setInspectorScopedRow({ dimension_key: dimKey, level: activeLevel });
    setInspectorShouldFetch(true);
  }, [activeLevel]);

  // Apply text filter then sort
  const filteredRows = filterText
    ? rows.filter(r => String(r.dimension_key ?? '').toLowerCase().includes(filterText.toLowerCase()))
    : rows;
  const sortedRows = [...filteredRows].sort((a, b) => {
    const va = Number(a.metric_value) || 0;
    const vb = Number(b.metric_value) || 0;
    return sortAsc ? va - vb : vb - va;
  });

  // Compute summary stats
  const values = rows
    .filter(r => r.metric_value != null && r.metric_value !== '')
    .map(r => Number(r.metric_value))
    .filter(v => Number.isFinite(v));
  const stats = computeStats(values);
  const isPctType = item?.unit_type === 'PERCENTAGE' || item?.unit_type === 'RATIO' || item?.unit_type === 'RATE';
  const highPctCount = isPctType ? values.filter(v => v > 100).length : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Level tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-pwc-gray-light shrink-0 overflow-x-auto">
        {LEVEL_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setActiveLevel(tab.key); setRows([]); setClassifiedError(null); setDrillDownMap(new Map()); setExpandedPaths(new Set()); setFilterText(''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
              ${activeLevel === tab.key
                ? 'bg-pwc-orange/20 text-pwc-orange border border-pwc-orange/40'
                : 'text-gray-400 hover:text-gray-300 hover:bg-pwc-gray-light/30'
              }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Run / Cancel button */}
        {loading ? (
          <button
            type="button"
            onClick={cancelCalculation}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium
                       hover:bg-red-500 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancel{elapsedSec > 0 ? ` (${elapsedSec}s)` : ''}
          </button>
        ) : (
          <button
            type="button"
            onClick={runCalculation}
            disabled={!asOfDate || !formula}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-pwc-orange text-white rounded-lg text-xs font-medium
                       hover:bg-pwc-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={!asOfDate ? 'Select a date first' : !formula ? 'No formula defined for this level' : `Run Calculation (${shortcutLabel})`}
          >
            <Play className="w-3.5 h-3.5" />
            Run
            <kbd className="ml-1 px-1 py-0.5 text-[9px] bg-white/20 rounded font-mono">{shortcutLabel}</kbd>
          </button>
        )}
      </div>

      {/* Formula description */}
      <div className="px-4 py-2 border-b border-pwc-gray-light/50 shrink-0">
        {formula ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-400 flex-1 min-w-0">{formula.description}</p>
              {itemId && onFormulaSave && (
                <button
                  type="button"
                  onClick={() => setShowFormulaEditor(true)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] text-pwc-orange hover:bg-pwc-orange/10 rounded transition-colors shrink-0"
                >
                  <Pencil className="w-3 h-3" />
                  Edit formula
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              className="flex items-center gap-1 mt-1 text-[10px] text-gray-500 hover:text-gray-400 transition-colors"
            >
              <Code2 className="w-3 h-3" />
              {showSql ? 'Hide SQL' : 'Show SQL'}
            </button>
            {showSql && (
              <pre
                className="mt-2 p-3 bg-pwc-black rounded-lg text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-48"
                dangerouslySetInnerHTML={{ __html: highlightSql(formula.sql) }}
              />
            )}
          </>
        ) : (
          <p className="text-xs text-amber-400">No formula defined for this level. Use the Formula Editor to create one.</p>
        )}
      </div>

      {/* Formula Editor Modal */}
      {showFormulaEditor && itemId && formula && (
        <Modal
          open={showFormulaEditor}
          onClose={() => setShowFormulaEditor(false)}
          title="Edit formula"
          panelClassName="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          <div className="flex-1 overflow-y-auto">
            <FormulaEditor
              currentSql={formula.sql}
              level={activeLevel}
              itemId={itemId}
              asOfDate={asOfDate}
              onAccept={(sql) => {
                onFormulaSave?.(activeLevel, sql);
                setShowFormulaEditor(false);
              }}
              onCancel={() => setShowFormulaEditor(false)}
            />
          </div>
        </Modal>
      )}

      {/* Results + Input Data Inspector */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Results table area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Error — classified by type */}
          {classifiedError && (
            <div className={`m-4 px-3 py-2 rounded-lg text-sm flex flex-col gap-1 ${
              classifiedError.severity === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : classifiedError.severity === 'warning' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
            }`}>
              <div className="flex items-center gap-2">
                {classifiedError.severity === 'error' ? <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  : classifiedError.severity === 'warning' ? <Timer className="w-4 h-4 flex-shrink-0" />
                  : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                <span className="font-medium">{classifiedError.code === 'FORMULA_INVALID' ? 'Formula Error' : classifiedError.message}</span>
              </div>
              {classifiedError.code === 'FORMULA_INVALID' && (
                <pre className="text-xs font-mono mt-1 p-2 rounded bg-black/30 whitespace-pre-wrap">{classifiedError.message}</pre>
              )}
              {classifiedError.hint && (
                <p className="text-xs opacity-80">{classifiedError.hint}</p>
              )}
              <button type="button" onClick={runCalculation}
                className="self-start mt-1 px-2 py-0.5 text-xs rounded bg-white/10 hover:bg-white/20 transition-colors">
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !classifiedError && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Play className="w-8 h-8 mb-3 text-gray-600" />
              <p className="text-sm">Click &ldquo;Run Calculation&rdquo; to execute</p>
              {asOfDate && <p className="text-xs text-gray-600 mt-1">as_of_date: {asOfDate}</p>}
              {!asOfDate && <p className="text-xs text-amber-400 mt-1">Loading date...</p>}
            </div>
          )}

          {/* Loading with elapsed timer */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="w-6 h-6 text-pwc-orange animate-spin" />
              <span className="text-sm text-gray-400">
                Executing against PostgreSQL...
                {elapsedSec >= 5 && <span className="text-amber-400 ml-1">({elapsedSec}s)</span>}
              </span>
              {elapsedSec >= 10 && (
                <span className="text-xs text-amber-400/70 animate-pulse">Still running — complex queries may take up to 30s</span>
              )}
            </div>
          )}

          {/* Results table */}
          {rows.length > 0 && (
            <>
              {/* Summary bar with export & stats */}
              <div className="px-4 py-2 bg-pwc-black/30 border-b border-pwc-gray-light/30 shrink-0 space-y-1.5">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{rows.length}{totalRowCount && totalRowCount > rows.length ? ` of ${totalRowCount}` : ''} results</span>
                  {totalRowCount && totalRowCount > rows.length && (
                    <span className="text-amber-400">(truncated)</span>
                  )}
                  {durationMs !== null && <span>{durationMs}ms</span>}
                  {asOfDate && <span>as_of: {asOfDate}</span>}
                  {stats && (
                    <>
                      <span>Avg: <span className={metricColorFn(stats.mean)}>{formatMetricValue(stats.mean, item?.unit_type)}</span></span>
                      <span>Med: <span className={metricColorFn(stats.median)}>{formatMetricValue(stats.median, item?.unit_type)}</span></span>
                    </>
                  )}
                  {highPctCount > 0 && (
                    <span className="text-red-400">{highPctCount} &gt;100%</span>
                  )}
                  {stats && stats.outliers > 0 && (
                    <span className="text-amber-400" title={`${stats.outliers} values more than 2 std dev from mean`}>
                      {stats.outliers} outlier{stats.outliers !== 1 ? 's' : ''}
                    </span>
                  )}
                  {/* Export button */}
                  <button
                    type="button"
                    onClick={() => exportResultsToCSV(rows, {
                      metricId: itemId, level: activeLevel, asOfDate,
                      timestamp: new Date().toISOString(),
                    })}
                    className="ml-auto flex items-center gap-1 px-2 py-0.5 text-gray-400 hover:text-pwc-white hover:bg-pwc-gray-light/30 rounded transition-colors"
                    title="Export results as CSV"
                  >
                    <Download className="w-3 h-3" />
                    CSV
                  </button>
                </div>
                {/* Extended stats row */}
                {stats && (
                  <div className="flex items-center gap-3 text-[10px] text-gray-600">
                    <span>Min: {formatMetricValue(stats.min, item?.unit_type)}</span>
                    <span>P25: {formatMetricValue(stats.p25, item?.unit_type)}</span>
                    <span>P75: {formatMetricValue(stats.p75, item?.unit_type)}</span>
                    <span>Max: {formatMetricValue(stats.max, item?.unit_type)}</span>
                    <span>StdDev: {formatNumber(stats.stdDev)}</span>
                  </div>
                )}
                {/* Filter input */}
                <div className="flex items-center gap-2">
                  <Filter className="w-3 h-3 text-gray-600" />
                  <input
                    type="text"
                    placeholder="Filter by dimension key..."
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none border-b border-transparent focus:border-pwc-orange/40 transition-colors"
                  />
                  {filterText && (
                    <span className="text-[10px] text-gray-500">{filteredRows.length} matches</span>
                  )}
                </div>
              </div>

              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-pwc-gray z-10">
                  <tr className="text-gray-500 text-xs">
                    <th className="text-left px-4 py-2 font-medium">
                      <span className="flex items-center gap-1">
                        Dimension Key
                        <span title="Click row icon to inspect input data">
                          <Search className="w-3 h-3 text-gray-600" />
                        </span>
                      </span>
                    </th>
                    <th className="text-right px-4 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => setSortAsc(!sortAsc)}
                        className="flex items-center gap-1 ml-auto hover:text-gray-300 transition-colors"
                      >
                        {item?.abbreviation ?? 'Value'}{isPctType ? ' %' : ''}
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    {/* Show additional columns if present */}
                    {rows[0] && Object.keys(rows[0]).filter(k => k !== 'dimension_key' && k !== 'metric_value' && k !== 'dimension_label').map(k => (
                      <th key={k} className="text-right px-4 py-2 font-medium">{k.replace(/_/g, ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, idx) => {
                    const topExtraKeys = Object.keys(row).filter(
                      k => k !== 'dimension_key' && k !== 'metric_value' && k !== 'dimension_label'
                    );

                    return (
                      <DrillDownRow
                        key={`${activeLevel}:${String(row.dimension_key ?? idx)}`}
                        level={activeLevel as DrillLevel}
                        row={row}
                        depth={0}
                        pathPrefix=""
                        drillDownMap={drillDownMap}
                        expandedPaths={expandedPaths}
                        onToggleExpand={toggleExpand}
                        metricColorFn={metricColorFn}
                        extraKeys={topExtraKeys}
                        unitType={item?.unit_type}
                        onScopeToRow={handleScopeToRow}
                        onTraceRow={handleTraceRow}
                      />
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Input Data Inspector (collapsible bottom panel) */}
        {rows.length > 0 && formula && (
          <InputDataInspector
            itemId={itemId ?? ''}
            asOfDate={asOfDate}
            activeLevel={activeLevel}
            formulaSql={formula.sql}
            shouldFetch={inspectorShouldFetch}
            onFetchComplete={() => setInspectorShouldFetch(false)}
            scopedRow={inspectorScopedRow}
            unitType={item?.unit_type}
          />
        )}
      </div>
    </div>
  );
}
