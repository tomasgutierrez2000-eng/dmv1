'use client';

import { useState, useCallback } from 'react';
import {
  Play, Loader2, Code2, AlertTriangle, ArrowUpDown, Pencil, Search,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import FormulaEditor from './FormulaEditor';
import DrillDownRow from './DrillDownRow';
import InputDataInspector from './InputDataInspector';
import type { CatalogueItem, LevelDefinition } from '@/lib/metric-library/types';
import {
  CHILD_LEVEL, drillLevelToTab, formatMetricValue, formatNumber,
  type DrillLevel, type DrillDownNode,
} from '@/lib/governance/drill-down';

/** Map tab key to catalogue level_definitions level key. */
const TAB_TO_LEVEL: Record<string, string> = {
  facility: 'facility',
  counterparty: 'counterparty',
  desk: 'desk',
  portfolio: 'portfolio',
  business_segment: 'lob',
};

/* ── LTV fallback formulas (when item has no formula_sql) ──────────────────── */

const LTV_FALLBACK_FORMULAS: Record<string, { sql: string; description: string }> = {
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

export function getFormulasForItem(item: CatalogueItem | null | undefined): Record<string, { sql: string; description: string }> {
  if (!item?.level_definitions?.length) return LTV_FALLBACK_FORMULAS;
  const result: Record<string, { sql: string; description: string }> = {};
  for (const tab of LEVEL_TABS) {
    const levelKey = TAB_TO_LEVEL[tab.key] ?? tab.key;
    const def = item.level_definitions.find((d: LevelDefinition) => d.level === levelKey);
    const fallback = LTV_FALLBACK_FORMULAS[tab.key];
    if (def?.formula_sql?.trim()) {
      result[tab.key] = {
        sql: def.formula_sql,
        description: (def.level_logic || def.dashboard_display_name || fallback?.description) ?? '',
      };
    } else if (fallback) {
      result[tab.key] = fallback;
    }
  }
  return Object.keys(result).length > 0 ? result : LTV_FALLBACK_FORMULAS;
}

interface ResultRow {
  dimension_key: unknown;
  metric_value: unknown;
  [key: string]: unknown;
}

interface CalculationWorkspaceProps {
  asOfDate: string | null;
  itemId?: string;
  item?: CatalogueItem | null;
  onResultsChange?: (level: string, rows: ResultRow[]) => void;
  onFormulaSave?: (level: string, sql: string) => void;
}

/** Color based on metric value, unit type, and direction. */
function metricColor(
  val: number,
  unitType?: string,
  direction?: string,
): string {
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

/**
 * Center pane: formula display, level selector, and live result table.
 */
export default function CalculationWorkspace({
  asOfDate,
  itemId,
  item,
  onResultsChange,
  onFormulaSave,
}: CalculationWorkspaceProps) {
  const [activeLevel, setActiveLevel] = useState('facility');
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);

  // Drill-down state
  const [drillDownMap, setDrillDownMap] = useState<Map<string, DrillDownNode>>(new Map());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Input Data Inspector state
  const [inspectorShouldFetch, setInspectorShouldFetch] = useState(false);
  const [inspectorScopedRow, setInspectorScopedRow] = useState<{
    dimension_key: string; level: string;
  } | null>(null);

  const levelFormulas = getFormulasForItem(item);
  const formula = levelFormulas[activeLevel] ?? LTV_FALLBACK_FORMULAS[activeLevel];
  const metricColorFn = (v: number) => metricColor(v, item?.unit_type, item?.direction);

  const runCalculation = useCallback(async () => {
    if (!asOfDate) return;
    setLoading(true);
    setError(null);
    setRows([]);
    setDurationMs(null);
    setDrillDownMap(new Map());
    setExpandedPaths(new Set());

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

      // Trigger input data inspector refresh
      setInspectorShouldFetch(true);
      setInspectorScopedRow(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setLoading(false);
    }
  }, [asOfDate, activeLevel, formula, onResultsChange]);

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

      const res = await fetch('/api/metrics/governance/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: childFormula?.sql ?? formula.sql,
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

  /** Scope the Input Data Inspector to a specific result row. */
  const handleScopeToRow = useCallback((dimKey: string) => {
    setInspectorScopedRow({ dimension_key: dimKey, level: activeLevel });
    setInspectorShouldFetch(true);
  }, [activeLevel]);

  const sortedRows = [...rows].sort((a, b) => {
    const va = Number(a.metric_value) || 0;
    const vb = Number(b.metric_value) || 0;
    return sortAsc ? va - vb : vb - va;
  });

  // Compute summary stats
  const values = rows.map(r => Number(r.metric_value)).filter(v => !isNaN(v) && v !== null);
  const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
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
            onClick={() => { setActiveLevel(tab.key); setRows([]); setError(null); setDrillDownMap(new Map()); setExpandedPaths(new Set()); }}
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
          <pre className="mt-2 p-3 bg-pwc-black rounded-lg text-[11px] text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-48">
            {formula.sql}
          </pre>
        )}
      </div>

      {/* Formula Editor Modal */}
      {showFormulaEditor && itemId && (
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
                <span>Avg: <span className={metricColorFn(avgValue)}>{formatMetricValue(avgValue, item?.unit_type)}</span></span>
                {highPctCount > 0 && (
                  <span className="text-red-400">
                    {highPctCount} &gt;100%
                  </span>
                )}
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
                        key={idx}
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
                      />
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Input Data Inspector (collapsible bottom panel) */}
        {rows.length > 0 && (
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
