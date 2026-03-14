'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch, Loader2, CheckCircle2, XCircle, Play,
  BarChart3, AlertTriangle,
} from 'lucide-react';

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
}

const LEVELS = [
  { key: 'facility', label: 'Facility', short: 'Fac' },
  { key: 'counterparty', label: 'Counterparty', short: 'CP' },
  { key: 'desk', label: 'Desk', short: 'Desk' },
  { key: 'portfolio', label: 'Portfolio', short: 'Port' },
  { key: 'business_segment', label: 'Segment', short: 'Seg' },
];

function ltvColor(val: number): string {
  if (val < 60) return 'text-emerald-400';
  if (val < 80) return 'text-amber-400';
  if (val < 100) return 'text-orange-400';
  return 'text-red-400';
}

function computeWeightedAvg(rows: ResultRow[]): number | null {
  const vals = rows.map(r => Number(r.metric_value)).filter(v => !isNaN(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Right pane: shows rollup results across all levels and reconciliation status.
 */
export default function RollupResultsPane({ asOfDate, activeResults }: RollupResultsPaneProps) {
  const [levelResults, setLevelResults] = useState<Map<string, LevelResult>>(new Map());
  const [runningAll, setRunningAll] = useState(false);

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

  // Run all levels for reconciliation
  const runAllLevels = useCallback(async () => {
    if (!asOfDate) return;
    setRunningAll(true);

    // Import level formulas inline to avoid circular deps
    const LEVEL_SQLS: Record<string, string> = {
      facility: `SELECT fm.facility_id AS dimension_key, fm.committed_facility_amt / NULLIF(SUM(cs.current_valuation_usd), 0) * 100.0 AS metric_value FROM l2.facility_master fm INNER JOIN l2.collateral_snapshot cs ON cs.facility_id = fm.facility_id AND cs.as_of_date = :as_of_date GROUP BY fm.facility_id, fm.committed_facility_amt`,
      counterparty: `SELECT fm.counterparty_id AS dimension_key, CASE WHEN SUM(fac.denominator_val) = 0 THEN NULL ELSE SUM(fac.numerator_val) / SUM(fac.denominator_val) * 100.0 END AS metric_value FROM (SELECT fm.facility_id, fm.committed_facility_amt AS numerator_val, SUM(cs.current_valuation_usd) AS denominator_val FROM l2.facility_master fm INNER JOIN l2.collateral_snapshot cs ON cs.facility_id = fm.facility_id AND cs.as_of_date = :as_of_date GROUP BY fm.facility_id, fm.committed_facility_amt) fac INNER JOIN l2.facility_master fm ON fm.facility_id = fac.facility_id GROUP BY fm.counterparty_id`,
      desk: `SELECT ebt.managed_segment_id AS dimension_key, CASE WHEN SUM(fac.denominator_val) = 0 THEN NULL ELSE SUM(fac.numerator_val) / SUM(fac.denominator_val) * 100.0 END AS metric_value FROM (SELECT fm.facility_id, fm.committed_facility_amt AS numerator_val, SUM(cs.current_valuation_usd) AS denominator_val FROM l2.facility_master fm INNER JOIN l2.collateral_snapshot cs ON cs.facility_id = fm.facility_id AND cs.as_of_date = :as_of_date GROUP BY fm.facility_id, fm.committed_facility_amt) fac INNER JOIN l2.facility_master fm ON fm.facility_id = fac.facility_id LEFT JOIN l1.enterprise_business_taxonomy ebt ON ebt.managed_segment_id = fm.lob_segment_id GROUP BY ebt.managed_segment_id`,
      portfolio: `SELECT ebt_l2.managed_segment_id AS dimension_key, CASE WHEN SUM(fac.denominator_val) = 0 THEN NULL ELSE SUM(fac.numerator_val) / SUM(fac.denominator_val) * 100.0 END AS metric_value FROM (SELECT fm.facility_id, fm.committed_facility_amt AS numerator_val, SUM(cs.current_valuation_usd) AS denominator_val FROM l2.facility_master fm INNER JOIN l2.collateral_snapshot cs ON cs.facility_id = fm.facility_id AND cs.as_of_date = :as_of_date GROUP BY fm.facility_id, fm.committed_facility_amt) fac INNER JOIN l2.facility_master fm ON fm.facility_id = fac.facility_id LEFT JOIN l1.enterprise_business_taxonomy ebt_l3 ON ebt_l3.managed_segment_id = fm.lob_segment_id LEFT JOIN l1.enterprise_business_taxonomy ebt_l2 ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id GROUP BY ebt_l2.managed_segment_id`,
      business_segment: `SELECT ebt_l1.managed_segment_id AS dimension_key, CASE WHEN SUM(fac.denominator_val) = 0 THEN NULL ELSE SUM(fac.numerator_val) / SUM(fac.denominator_val) * 100.0 END AS metric_value FROM (SELECT fm.facility_id, fm.committed_facility_amt AS numerator_val, SUM(cs.current_valuation_usd) AS denominator_val FROM l2.facility_master fm INNER JOIN l2.collateral_snapshot cs ON cs.facility_id = fm.facility_id AND cs.as_of_date = :as_of_date GROUP BY fm.facility_id, fm.committed_facility_amt) fac INNER JOIN l2.facility_master fm ON fm.facility_id = fac.facility_id LEFT JOIN l1.enterprise_business_taxonomy ebt_l3 ON ebt_l3.managed_segment_id = fm.lob_segment_id LEFT JOIN l1.enterprise_business_taxonomy ebt_l2 ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id LEFT JOIN l1.enterprise_business_taxonomy ebt_l1 ON ebt_l1.managed_segment_id = ebt_l2.parent_segment_id GROUP BY ebt_l1.managed_segment_id`,
    };

    const results = await Promise.allSettled(
      LEVELS.map(async (lvl) => {
        const res = await fetch('/api/metrics/governance/calculator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: LEVEL_SQLS[lvl.key],
            as_of_date: asOfDate,
            level: lvl.key,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        return { level: lvl.key, rows: data.rows, durationMs: data.duration_ms };
      }),
    );

    const newResults = new Map<string, LevelResult>();
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
  }, [asOfDate]);

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
          {runningAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          Run All
        </button>
      </div>

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
                    <span className={`text-lg font-bold tabular-nums ${avg !== null ? ltvColor(avg) : 'text-gray-500'}`}>
                      {avg !== null ? `${avg.toFixed(1)}%` : 'N/A'}
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

        {/* Reconciliation */}
        {hasAllResults && (
          <div className="rounded-lg border border-pwc-gray-light/50 bg-pwc-black/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-gray-300">Reconciliation</span>
            </div>

            <div className="space-y-1.5">
              {LEVELS.slice(0, -1).map((lvl, i) => {
                const currentResult = levelResults.get(lvl.key);
                const nextResult = levelResults.get(LEVELS[i + 1].key);
                const currentAvg = currentResult?.rows ? computeWeightedAvg(currentResult.rows) : null;
                const nextAvg = nextResult?.rows ? computeWeightedAvg(nextResult.rows) : null;

                // Simple reconciliation: check if averages are within tolerance
                const tolerance = 5.0; // 5% tolerance for average comparison
                const delta = currentAvg !== null && nextAvg !== null ? Math.abs(currentAvg - nextAvg) : null;
                const pass = delta !== null && delta < tolerance;

                return (
                  <div key={lvl.key} className="flex items-center gap-2 text-[10px]">
                    {pass ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : delta !== null ? (
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    ) : (
                      <XCircle className="w-3 h-3 text-gray-600" />
                    )}
                    <span className="text-gray-400">
                      {lvl.short} → {LEVELS[i + 1].short}
                    </span>
                    {delta !== null && (
                      <span className={pass ? 'text-emerald-400' : 'text-amber-400'}>
                        {pass ? 'OK' : `Δ${delta.toFixed(1)}%`}
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
              const highLtv = vals.filter(v => v > 100).length;

              return (
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-gray-600">Total Facilities</span>
                    <span className="block text-gray-300 font-semibold">{vals.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Median LTV</span>
                    <span className={`block font-semibold ${median !== null ? ltvColor(median) : 'text-gray-500'}`}>
                      {median !== null ? `${median.toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">LTV &gt; 100%</span>
                    <span className={`block font-semibold ${highLtv > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {highLtv} facilities
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Range</span>
                    <span className="block text-gray-300 font-semibold">
                      {sorted.length > 0
                        ? `${sorted[0].toFixed(0)}% – ${sorted[sorted.length - 1].toFixed(0)}%`
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
