'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GitBranch, Loader2, CheckCircle2, XCircle, Play,
  BarChart3, AlertTriangle, Download, Clock,
} from 'lucide-react';
import { formatMetricValue } from '@/lib/governance/drill-down';

interface ResultRow {
  dimension_key: unknown;
  metric_value: unknown;
  [key: string]: unknown;
}

interface LevelResult {
  level: string;
  rows: ResultRow[];
  loading: boolean;
  error: string | null;
  durationMs: number | null;
}

interface RollupResultsPaneProps {
  asOfDate: string | null;
  /** Results passed from the center pane when individual levels are run */
  activeResults?: { level: string; rows: ResultRow[] };
  /** Formulas per level for Run All (from catalogue). Falls back to LTV if not provided. */
  levelFormulas?: Record<string, { sql: string; description: string }>;
  /** Catalogue item for metric-agnostic labels and rollup strategy */
  item?: {
    unit_type?: string; direction?: string; abbreviation?: string;
    reconciliation_tolerance_pct?: number; rollup_strategy?: string;
    item_id?: string;
  } | null;
}

const LEVELS = [
  { key: 'facility', label: 'Facility', short: 'Fac' },
  { key: 'counterparty', label: 'Counterparty', short: 'CP' },
  { key: 'desk', label: 'Desk', short: 'Desk' },
  { key: 'portfolio', label: 'Portfolio', short: 'Port' },
  { key: 'business_segment', label: 'Segment', short: 'Seg' },
];

function metricColor(val: number, unitType?: string, direction?: string): string {
  if (unitType === 'PERCENTAGE' || unitType === 'RATIO') {
    if (direction === 'LOWER_BETTER') {
      if (val < 60) return 'text-emerald-400';
      if (val < 80) return 'text-amber-400';
      if (val < 100) return 'text-orange-400';
      return 'text-red-400';
    }
    if (direction === 'HIGHER_BETTER') {
      if (val >= 100) return 'text-emerald-400';
      if (val >= 80) return 'text-amber-400';
      if (val >= 60) return 'text-orange-400';
      return 'text-red-400';
    }
  }
  return 'text-gray-300';
}

function computeWeightedAvg(rows: ResultRow[]): number | null {
  const vals = rows.map(r => Number(r.metric_value)).filter(v => !isNaN(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Right pane: shows rollup results across all levels and reconciliation status.
 */
/* Formulas come from catalogue via levelFormulas prop — no hardcoded fallbacks */

export default function RollupResultsPane({
  asOfDate,
  activeResults,
  levelFormulas,
  item,
}: RollupResultsPaneProps) {
  const [levelResults, setLevelResults] = useState<Map<string, LevelResult>>(new Map());
  const [runningAll, setRunningAll] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [restoredFromCache, setRestoredFromCache] = useState(false);
  const tolerance = item?.reconciliation_tolerance_pct ?? 5.0;
  const colorFn = (v: number) => metricColor(v, item?.unit_type, item?.direction);
  const cacheKey = item?.item_id ? `rollup_cache_${item.item_id}` : null;

  // Restore cached results on mount
  useEffect(() => {
    if (!cacheKey) return;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { results: [string, LevelResult][]; timestamp: string };
        const map = new Map<string, LevelResult>(parsed.results);
        setLevelResults(map);
        setRestoredFromCache(true);
      }
    } catch { /* ignore parse errors */ }
  }, [cacheKey]);

  // Update when center pane pushes results
  useEffect(() => {
    if (activeResults) {
      setLevelResults(prev => {
        const next = new Map(prev);
        next.set(activeResults.level, {
          level: activeResults.level,
          rows: activeResults.rows,
          loading: false,
          error: null,
          durationMs: null,
        });
        return next;
      });
    }
  }, [activeResults]);

  // Run all levels for reconciliation — with per-level progress tracking
  const runAllLevels = useCallback(async () => {
    if (!asOfDate) return;
    setRunningAll(true);
    setCompletedCount(0);
    setRestoredFromCache(false);

    const newResults = new Map<string, LevelResult>();

    const results = await Promise.allSettled(
      LEVELS.map(async (lvl) => {
        const sql = levelFormulas?.[lvl.key]?.sql;
        if (!sql) return { level: lvl.key, rows: [], durationMs: null };
        const res = await fetch('/api/metrics/governance/calculator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql,
            as_of_date: asOfDate,
            level: lvl.key,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        setCompletedCount(c => c + 1);
        return { level: lvl.key, rows: data.rows, durationMs: data.duration_ms };
      }),
    );

    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        newResults.set(LEVELS[i].key, {
          level: LEVELS[i].key,
          rows: r.value.rows,
          loading: false,
          error: null,
          durationMs: r.value.durationMs,
        });
      } else {
        newResults.set(LEVELS[i].key, {
          level: LEVELS[i].key,
          rows: [],
          loading: false,
          error: r.reason?.message ?? 'Failed',
          durationMs: null,
        });
      }
    });
    setLevelResults(newResults);
    setRunningAll(false);

    // Cache results in sessionStorage
    if (cacheKey) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          results: Array.from(newResults.entries()),
          timestamp: new Date().toISOString(),
        }));
      } catch { /* storage full — ignore */ }
    }
  }, [asOfDate, levelFormulas, cacheKey]);

  const hasAllResults = LEVELS.every(l => levelResults.has(l.key));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-pwc-gray-light shrink-0">
        <GitBranch className="w-4 h-4 text-pwc-orange" />
        <h3 className="text-sm font-semibold text-pwc-white">Rollup Results</h3>
        <button
          type="button"
          onClick={runAllLevels}
          disabled={runningAll || !asOfDate}
          className="ml-auto flex items-center gap-1 px-2.5 py-1 bg-pwc-orange/20 text-pwc-orange rounded text-[10px] font-medium
                     hover:bg-pwc-orange/30 disabled:opacity-50 transition-colors"
        >
          {runningAll ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              {completedCount}/{LEVELS.length}
            </>
          ) : (
            <>
              <Play className="w-3 h-3" />
              Run All
            </>
          )}
        </button>
      </div>

      {/* Cache restoration banner */}
      {restoredFromCache && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border-b border-blue-500/20 text-[10px] text-blue-400">
          <Clock className="w-3 h-3" />
          Restored from session cache
          <button type="button" onClick={runAllLevels} className="ml-auto underline hover:text-blue-300">Re-run</button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Level summary cards */}
        {LEVELS.map(lvl => {
          const result = levelResults.get(lvl.key);
          const avg = result?.rows ? computeWeightedAvg(result.rows) : null;
          const count = result?.rows?.length ?? 0;

          return (
            <div key={lvl.key} className="rounded-lg border border-pwc-gray-light/50 bg-pwc-black/30 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-300">{lvl.label}</span>
                {result?.loading && <Loader2 className="w-3 h-3 text-gray-500 animate-spin" />}
                {result?.error && <XCircle className="w-3 h-3 text-red-400" />}
              </div>

              {result?.error && (
                <p className="text-[10px] text-red-400">{result.error}</p>
              )}

              {result && !result.error && count > 0 && (
                <div className="flex items-center gap-3">
                  <div>
                    <span className={`text-lg font-bold tabular-nums ${avg !== null ? colorFn(avg) : 'text-gray-500'}`}>
                      {avg !== null ? formatMetricValue(avg, item?.unit_type) : 'N/A'}
                    </span>
                    <span className="text-[10px] text-gray-600 ml-1">avg</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <BarChart3 className="w-3 h-3" />
                    {count} results
                  </div>
                  {result.durationMs !== null && (
                    <span className="text-[10px] text-gray-600">{result.durationMs}ms</span>
                  )}
                </div>
              )}

              {!result && (
                <span className="text-[10px] text-gray-600">Not yet calculated</span>
              )}
            </div>
          );
        })}

        {/* Reconciliation — enhanced with sum-based checks */}
        {hasAllResults && (
          <div className="rounded-lg border border-pwc-gray-light/50 bg-pwc-black/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-gray-300">Reconciliation</span>
              <span className="text-[9px] text-gray-600 ml-auto">
                {item?.rollup_strategy === 'direct-sum' ? 'Sum-based' : 'Avg-diff'} ({tolerance}% tol.)
              </span>
            </div>

            <div className="space-y-1.5">
              {LEVELS.slice(0, -1).map((lvl, i) => {
                const currentResult = levelResults.get(lvl.key);
                const nextResult = levelResults.get(LEVELS[i + 1].key);
                const currentVals = (currentResult?.rows ?? []).map(r => Number(r.metric_value)).filter(v => !isNaN(v));
                const nextVals = (nextResult?.rows ?? []).map(r => Number(r.metric_value)).filter(v => !isNaN(v));

                let pass = false;
                let delta: number | null = null;
                let detail = '';

                if (item?.rollup_strategy === 'direct-sum') {
                  // Sum-based reconciliation: SUM at lower level should equal SUM at upper level
                  const currentSum = currentVals.reduce((a, b) => a + b, 0);
                  const nextSum = nextVals.reduce((a, b) => a + b, 0);
                  if (currentVals.length > 0 && nextVals.length > 0) {
                    const denom = Math.max(Math.abs(currentSum), Math.abs(nextSum), 1);
                    delta = Math.abs(currentSum - nextSum) / denom * 100;
                    pass = delta < tolerance;
                    detail = `Σ${lvl.short}: ${formatMetricValue(currentSum, item?.unit_type)} | Σ${LEVELS[i + 1].short}: ${formatMetricValue(nextSum, item?.unit_type)}`;
                  }
                } else {
                  // Avg-diff reconciliation (default)
                  const currentAvg = currentVals.length > 0 ? currentVals.reduce((a, b) => a + b, 0) / currentVals.length : null;
                  const nextAvg = nextVals.length > 0 ? nextVals.reduce((a, b) => a + b, 0) / nextVals.length : null;
                  if (currentAvg !== null && nextAvg !== null) {
                    delta = Math.abs(currentAvg - nextAvg);
                    pass = delta < tolerance;
                  }
                }

                return (
                  <div key={lvl.key} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-[10px]">
                      {delta !== null ? (
                        pass ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        : delta < tolerance * 5 ? <AlertTriangle className="w-3 h-3 text-amber-400" />
                        : <XCircle className="w-3 h-3 text-red-400" />
                      ) : (
                        <XCircle className="w-3 h-3 text-gray-600" />
                      )}
                      <span className="text-gray-400">
                        {lvl.short} → {LEVELS[i + 1].short}
                      </span>
                      {delta !== null && (
                        <span className={pass ? 'text-emerald-400' : 'text-amber-400'}>
                          {pass ? 'OK' : `Δ${item?.rollup_strategy === 'direct-sum' ? delta.toFixed(1) + '%' : formatMetricValue(delta, item?.unit_type)}`}
                        </span>
                      )}
                    </div>
                    {detail && !pass && (
                      <span className="text-[9px] text-gray-600 ml-5">
                        {detail}
                        {delta !== null && delta >= 1 && delta < 5 && ' (FX-driven difference expected for multi-currency)'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary statistics */}
        {levelResults.has('facility') && (
          <div className="rounded-lg border border-pwc-gray-light/50 bg-pwc-black/30 p-3">
            <span className="text-xs font-semibold text-gray-300 block mb-2">Summary</span>
            {(() => {
              const facResult = levelResults.get('facility');
              const vals = (facResult?.rows ?? []).map(r => Number(r.metric_value)).filter(v => !isNaN(v));
              const sorted = [...vals].sort((a, b) => a - b);
              const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : null;
              const isPctType = item?.unit_type === 'PERCENTAGE' || item?.unit_type === 'RATIO' || item?.unit_type === 'RATE';
              const highPctCount = isPctType ? vals.filter(v => v > 100).length : 0;

              return (
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-gray-600">Total Facilities</span>
                    <span className="block text-gray-300 font-semibold">{vals.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Median</span>
                    <span className={`block font-semibold ${median !== null ? colorFn(median) : 'text-gray-500'}`}>
                      {median !== null ? formatMetricValue(median, item?.unit_type) : 'N/A'}
                    </span>
                  </div>
                  {isPctType && (
                    <div>
                      <span className="text-gray-600">&gt; 100%</span>
                      <span className={`block font-semibold ${highPctCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {highPctCount} facilities
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Range</span>
                    <span className="block text-gray-300 font-semibold">
                      {sorted.length > 0
                        ? `${formatMetricValue(sorted[0], item?.unit_type)} – ${formatMetricValue(sorted[sorted.length - 1], item?.unit_type)}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
