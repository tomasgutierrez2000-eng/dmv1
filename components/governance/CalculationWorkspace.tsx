'use client';

import { useState, useCallback } from 'react';
import {
  Play, Loader2, Code2, AlertTriangle, ArrowUpDown,
  ChevronDown, ChevronRight, TrendingUp, TrendingDown,
} from 'lucide-react';

/* ── LTV Level Formulas (from RSK-009.yaml) ──────────────────── */

const LEVEL_FORMULAS: Record<string, { sql: string; description: string }> = {
  facility: {
    description: 'Aggregate collateral per facility, then compute LTV = committed_amt / SUM(collateral) × 100',
    sql: `SELECT
  fm.facility_id AS dimension_key,
  fm.committed_facility_amt
    / NULLIF(SUM(cs.current_valuation_usd), 0) * 100.0 AS metric_value
FROM l2.facility_master fm
INNER JOIN l2.collateral_snapshot cs
  ON cs.facility_id = fm.facility_id
  AND cs.as_of_date = :as_of_date
GROUP BY fm.facility_id, fm.committed_facility_amt`,
  },
  counterparty: {
    description: 'SUM(committed_amt) / SUM(collateral) × 100 per counterparty. Re-derives ratio from summed components.',
    sql: `SELECT
  fm.counterparty_id AS dimension_key,
  CASE WHEN SUM(fac.denominator_val) = 0 THEN NULL
       ELSE SUM(fac.numerator_val) / SUM(fac.denominator_val) * 100.0
  END AS metric_value
FROM (
  SELECT
    fm.facility_id,
    fm.committed_facility_amt AS numerator_val,
    SUM(cs.current_valuation_usd) AS denominator_val
  FROM l2.facility_master fm
  INNER JOIN l2.collateral_snapshot cs
    ON cs.facility_id = fm.facility_id
    AND cs.as_of_date = :as_of_date
  GROUP BY fm.facility_id, fm.committed_facility_amt
) fac
INNER JOIN l2.facility_master fm
  ON fm.facility_id = fac.facility_id
GROUP BY fm.counterparty_id`,
  },
  desk: {
    description: 'SUM(committed_amt) / SUM(collateral) × 100 per L3 desk segment.',
    sql: `SELECT
  ebt.managed_segment_id AS dimension_key,
  CASE WHEN SUM(fac.denominator_val) = 0 THEN NULL
       ELSE SUM(fac.numerator_val) / SUM(fac.denominator_val) * 100.0
  END AS metric_value
FROM (
  SELECT fm.facility_id, fm.committed_facility_amt AS numerator_val,
         SUM(cs.current_valuation_usd) AS denominator_val
  FROM l2.facility_master fm
  INNER JOIN l2.collateral_snapshot cs
    ON cs.facility_id = fm.facility_id AND cs.as_of_date = :as_of_date
  GROUP BY fm.facility_id, fm.committed_facility_amt
) fac
INNER JOIN l2.facility_master fm ON fm.facility_id = fac.facility_id
LEFT JOIN l1.enterprise_business_taxonomy ebt
  ON ebt.managed_segment_id = fm.lob_segment_id
GROUP BY ebt.managed_segment_id`,
  },
  portfolio: {
    description: 'SUM(committed_amt) / SUM(collateral) × 100 per L2 portfolio segment.',
    sql: `SELECT
  ebt_l2.managed_segment_id AS dimension_key,
  CASE WHEN SUM(fac.denominator_val) = 0 THEN NULL
       ELSE SUM(fac.numerator_val) / SUM(fac.denominator_val) * 100.0
  END AS metric_value
FROM (
  SELECT fm.facility_id, fm.committed_facility_amt AS numerator_val,
         SUM(cs.current_valuation_usd) AS denominator_val
  FROM l2.facility_master fm
  INNER JOIN l2.collateral_snapshot cs
    ON cs.facility_id = fm.facility_id AND cs.as_of_date = :as_of_date
  GROUP BY fm.facility_id, fm.committed_facility_amt
) fac
INNER JOIN l2.facility_master fm ON fm.facility_id = fac.facility_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fm.lob_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
GROUP BY ebt_l2.managed_segment_id`,
  },
  business_segment: {
    description: 'SUM(committed_amt) / SUM(collateral) × 100 per L1 business segment.',
    sql: `SELECT
  ebt_l1.managed_segment_id AS dimension_key,
  CASE WHEN SUM(fac.denominator_val) = 0 THEN NULL
       ELSE SUM(fac.numerator_val) / SUM(fac.denominator_val) * 100.0
  END AS metric_value
FROM (
  SELECT fm.facility_id, fm.committed_facility_amt AS numerator_val,
         SUM(cs.current_valuation_usd) AS denominator_val
  FROM l2.facility_master fm
  INNER JOIN l2.collateral_snapshot cs
    ON cs.facility_id = fm.facility_id AND cs.as_of_date = :as_of_date
  GROUP BY fm.facility_id, fm.committed_facility_amt
) fac
INNER JOIN l2.facility_master fm ON fm.facility_id = fac.facility_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fm.lob_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l1
  ON ebt_l1.managed_segment_id = ebt_l2.parent_segment_id
GROUP BY ebt_l1.managed_segment_id`,
  },
};

const LEVEL_TABS = [
  { key: 'facility', label: 'Facility' },
  { key: 'counterparty', label: 'Counterparty' },
  { key: 'desk', label: 'Desk' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'business_segment', label: 'Segment' },
];

interface ResultRow {
  dimension_key: unknown;
  metric_value: unknown;
  [key: string]: unknown;
}

interface CalculationWorkspaceProps {
  asOfDate: string | null;
  onResultsChange?: (level: string, rows: ResultRow[]) => void;
}

function ltvColor(val: number): string {
  if (val < 60) return 'text-emerald-400';
  if (val < 80) return 'text-amber-400';
  if (val < 100) return 'text-orange-400';
  return 'text-red-400';
}

function formatNumber(val: unknown): string {
  if (val === null || val === undefined) return 'N/A';
  const n = Number(val);
  if (isNaN(n)) return String(val);
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/**
 * Center pane: formula display, level selector, and live result table.
 */
export default function CalculationWorkspace({ asOfDate, onResultsChange }: CalculationWorkspaceProps) {
  const [activeLevel, setActiveLevel] = useState('facility');
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const formula = LEVEL_FORMULAS[activeLevel];

  const runCalculation = useCallback(async () => {
    if (!asOfDate) return;
    setLoading(true);
    setError(null);
    setRows([]);
    setDurationMs(null);

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
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const resultRows = (data.rows ?? []) as ResultRow[];
      setRows(resultRows);
      setDurationMs(data.duration_ms ?? null);
      onResultsChange?.(activeLevel, resultRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  }, [asOfDate, activeLevel, formula, onResultsChange]);

  const sortedRows = [...rows].sort((a, b) => {
    const va = Number(a.metric_value) || 0;
    const vb = Number(b.metric_value) || 0;
    return sortAsc ? va - vb : vb - va;
  });

  // Compute summary stats
  const values = rows.map(r => Number(r.metric_value)).filter(v => !isNaN(v) && v !== null);
  const avgLtv = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const highLtv = values.filter(v => v > 100).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Level tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-pwc-gray-light shrink-0 overflow-x-auto">
        {LEVEL_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setActiveLevel(tab.key); setRows([]); setError(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
              ${activeLevel === tab.key
                ? 'bg-pwc-orange/20 text-pwc-orange border border-pwc-orange/40'
                : 'text-gray-400 hover:text-gray-300 hover:bg-pwc-gray-light/30'
              }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Run button */}
        <button
          type="button"
          onClick={runCalculation}
          disabled={loading || !asOfDate}
          className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-pwc-orange text-white rounded-lg text-xs font-medium
                     hover:bg-pwc-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {loading ? 'Running...' : 'Run Calculation'}
        </button>
      </div>

      {/* Formula description */}
      <div className="px-4 py-2 border-b border-pwc-gray-light/50 shrink-0">
        <p className="text-xs text-gray-400">{formula.description}</p>
        <button
          type="button"
          onClick={() => setShowSql(!showSql)}
          className="flex items-center gap-1 mt-1 text-[10px] text-gray-500 hover:text-gray-400 transition-colors"
        >
          <Code2 className="w-3 h-3" />
          {showSql ? 'Hide SQL' : 'Show SQL'}
        </button>
        {showSql && (
          <pre className="mt-2 p-3 bg-pwc-black rounded-lg text-[11px] text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-48">
            {formula.sql}
          </pre>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {/* Error */}
        {error && (
          <div className="m-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Play className="w-8 h-8 mb-3 text-gray-600" />
            <p className="text-sm">Click &ldquo;Run Calculation&rdquo; to execute</p>
            {asOfDate && <p className="text-xs text-gray-600 mt-1">as_of_date: {asOfDate}</p>}
            {!asOfDate && <p className="text-xs text-amber-400 mt-1">Loading date...</p>}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-pwc-orange animate-spin" />
            <span className="ml-2 text-sm text-gray-400">Executing against PostgreSQL...</span>
          </div>
        )}

        {/* Results table */}
        {rows.length > 0 && (
          <>
            {/* Summary bar */}
            <div className="px-4 py-2 bg-pwc-black/30 border-b border-pwc-gray-light/30 flex items-center gap-4 text-xs text-gray-500 shrink-0">
              <span>{rows.length} results</span>
              {durationMs !== null && <span>{durationMs}ms</span>}
              {asOfDate && <span>as_of: {asOfDate}</span>}
              <span>Avg LTV: <span className={ltvColor(avgLtv)}>{avgLtv.toFixed(1)}%</span></span>
              {highLtv > 0 && (
                <span className="text-red-400">
                  {highLtv} &gt;100% LTV
                </span>
              )}
            </div>

            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-pwc-gray z-10">
                <tr className="text-gray-500 text-xs">
                  <th className="text-left px-4 py-2 font-medium">Dimension Key</th>
                  <th className="text-right px-4 py-2 font-medium">
                    <button
                      type="button"
                      onClick={() => setSortAsc(!sortAsc)}
                      className="flex items-center gap-1 ml-auto hover:text-gray-300 transition-colors"
                    >
                      LTV %
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  {/* Show additional columns if present */}
                  {rows[0] && Object.keys(rows[0]).filter(k => k !== 'dimension_key' && k !== 'metric_value').map(k => (
                    <th key={k} className="text-right px-4 py-2 font-medium">{k.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, idx) => {
                  const val = Number(row.metric_value);
                  const dimKey = String(row.dimension_key ?? '');
                  const isExpanded = expandedRow === dimKey;
                  const extraKeys = Object.keys(row).filter(k => k !== 'dimension_key' && k !== 'metric_value');

                  return (
                    <tr
                      key={idx}
                      onClick={() => setExpandedRow(isExpanded ? null : dimKey)}
                      className="border-b border-pwc-gray-light/20 hover:bg-pwc-gray-light/10 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2 font-mono text-gray-300 flex items-center gap-1.5">
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
                        {dimKey}
                      </td>
                      <td className={`px-4 py-2 text-right font-semibold tabular-nums ${isNaN(val) ? 'text-gray-500' : ltvColor(val)}`}>
                        {isNaN(val) ? 'N/A' : `${val.toFixed(1)}%`}
                        {!isNaN(val) && val > 100 && <TrendingUp className="w-3 h-3 inline ml-1 text-red-400" />}
                        {!isNaN(val) && val < 50 && <TrendingDown className="w-3 h-3 inline ml-1 text-emerald-400" />}
                      </td>
                      {extraKeys.map(k => (
                        <td key={k} className="px-4 py-2 text-right text-gray-400 tabular-nums">
                          {formatNumber(row[k])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
