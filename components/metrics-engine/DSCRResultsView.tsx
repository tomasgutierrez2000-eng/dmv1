'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Database, ChevronDown, ChevronUp, Copy, Code2 } from 'lucide-react';
import {
  CALCULATION_DIMENSIONS,
  CALCULATION_DIMENSION_LABELS,
  type CalculationDimension,
} from '@/data/l3-metrics';

/* ── Types matching the deep-dive API response ── */
interface GroupedRow {
  dimension_value: string | number;
  metric_value: number;
}

interface ApiResult {
  ok: boolean;
  error?: string;
  sqlExecuted?: string;
  inputRowCounts?: Record<string, number>;
  asOfDateUsed?: string | null;
  result?: {
    type: 'grouped' | 'scalar';
    rows?: GroupedRow[];
    value?: number | null;
  };
}

/* ── Dimension labels for display ── */
const DIM_LABELS: Record<CalculationDimension, string> = {
  facility: 'Facility',
  counterparty: 'Counterparty',
  L3: 'Desk (L3)',
  L2: 'Portfolio (L2)',
  L1: 'Business Segment (L1)',
};

/* ── CRE product_node_ids: BL=3, BRIDGE=7 (cycle through 10 product nodes) ── */
function isCreFacility(facilityId: number): boolean {
  const productNode = ((facilityId - 1) % 10) + 1;
  return productNode === 3 || productNode === 7;
}

/* ── Python formula per dimension ── */
const PYTHON_FORMULAS: Record<CalculationDimension, string> = {
  facility: `# DSCR — Facility Level
# Source: L2.facility_financial_snapshot, L1.enterprise_product_taxonomy

import pandas as pd

def calculate_facility_dscr(ffs: pd.DataFrame, fm: pd.DataFrame, ept: pd.DataFrame) -> pd.DataFrame:
    """Compute DSCR per facility using product-branched numerator."""

    # Join facility_master → enterprise_product_taxonomy
    merged = ffs.merge(fm[['facility_id', 'product_node_id']], on='facility_id')
    merged = merged.merge(ept[['product_node_id', 'product_code']], on='product_node_id')

    # CRE products use NOI; C&I products use EBITDA
    merged['numerator'] = np.where(
        merged['product_code'].isin(['BL', 'BRIDGE']),
        merged['noi_amt'],        # CRE: Net Operating Income
        merged['ebitda_amt']      # C&I: Earnings Before Interest, Tax, Depreciation, Amortization
    )

    merged['dscr'] = merged['numerator'] / merged['total_debt_service_amt'].replace(0, np.nan)
    return merged[['facility_id', 'product_code', 'dscr']]`,

  counterparty: `# DSCR — Counterparty Weighted Average
# Rollup: exposure-weighted average across facilities per counterparty

def calculate_counterparty_dscr(facility_dscr: pd.DataFrame, fes: pd.DataFrame) -> pd.DataFrame:
    """Weighted average DSCR at counterparty level."""

    merged = facility_dscr.merge(fes[['facility_id', 'counterparty_id', 'gross_exposure_usd']])

    # Weight = facility DSCR * gross_exposure
    merged['weighted_dscr'] = merged['dscr'] * merged['gross_exposure_usd']
    merged['valid_weight'] = np.where(
        merged['total_debt_service_amt'] > 0, merged['gross_exposure_usd'], 0
    )

    grouped = merged.groupby('counterparty_id').agg(
        weighted_sum=('weighted_dscr', 'sum'),
        weight_total=('valid_weight', 'sum')
    )
    grouped['dscr'] = grouped['weighted_sum'] / grouped['weight_total'].replace(0, np.nan)
    return grouped[['dscr']]`,

  L3: `# DSCR — Desk (L3) Weighted Average
# Rollup: exposure-weighted average across facilities per L3 business segment

def calculate_desk_dscr(facility_dscr: pd.DataFrame, fes: pd.DataFrame,
                        fm: pd.DataFrame, ebt: pd.DataFrame) -> pd.DataFrame:
    """Weighted average DSCR at Desk (L3) level via enterprise_business_taxonomy."""

    merged = facility_dscr.merge(fes[['facility_id', 'gross_exposure_usd']])
    merged = merged.merge(fm[['facility_id', 'lob_segment_id']])
    merged = merged.merge(
        ebt[['managed_segment_id', 'segment_name']],
        left_on='lob_segment_id', right_on='managed_segment_id'
    )

    merged['weighted_dscr'] = merged['dscr'] * merged['gross_exposure_usd']
    grouped = merged.groupby('segment_name').agg(
        weighted_sum=('weighted_dscr', 'sum'),
        weight_total=('gross_exposure_usd', 'sum')
    )
    grouped['dscr'] = grouped['weighted_sum'] / grouped['weight_total'].replace(0, np.nan)
    return grouped[['dscr']]`,

  L2: `# DSCR — Portfolio (L2) Weighted Average
# Rollup: exposure-weighted average across facilities per L2 portfolio segment

def calculate_portfolio_dscr(facility_dscr: pd.DataFrame, fes: pd.DataFrame,
                             fm: pd.DataFrame, ebt: pd.DataFrame) -> pd.DataFrame:
    """Weighted average DSCR at Portfolio (L2) via parent_segment_id traversal."""

    merged = facility_dscr.merge(fes[['facility_id', 'gross_exposure_usd']])
    merged = merged.merge(fm[['facility_id', 'lob_segment_id']])

    # Resolve L2 parent: ebt.parent_segment_id → ebt_parent.segment_name
    merged = merged.merge(ebt[['managed_segment_id', 'parent_segment_id']],
                          left_on='lob_segment_id', right_on='managed_segment_id')
    merged = merged.merge(ebt[['managed_segment_id', 'segment_name']].rename(
        columns={'managed_segment_id': 'parent_id', 'segment_name': 'portfolio_name'}),
        left_on='parent_segment_id', right_on='parent_id')

    merged['weighted_dscr'] = merged['dscr'] * merged['gross_exposure_usd']
    grouped = merged.groupby('portfolio_name').agg(
        weighted_sum=('weighted_dscr', 'sum'),
        weight_total=('gross_exposure_usd', 'sum')
    )
    grouped['dscr'] = grouped['weighted_sum'] / grouped['weight_total'].replace(0, np.nan)
    return grouped[['dscr']]`,

  L1: `# DSCR — Business Segment (L1) Weighted Average
# Rollup: exposure-weighted average across facilities per L1 business segment

def calculate_segment_dscr(facility_dscr: pd.DataFrame, fes: pd.DataFrame,
                           fm: pd.DataFrame, ebt: pd.DataFrame) -> pd.DataFrame:
    """Weighted average DSCR at Business Segment (L1) via root ancestor."""

    merged = facility_dscr.merge(fes[['facility_id', 'gross_exposure_usd']])
    merged = merged.merge(fm[['facility_id', 'lob_segment_id']])

    # Resolve L1 root: ebt → parent → grandparent (root) segment_name
    merged = merged.merge(ebt[['managed_segment_id', 'parent_segment_id']],
                          left_on='lob_segment_id', right_on='managed_segment_id')
    merged = merged.merge(ebt[['managed_segment_id', 'parent_segment_id']].rename(
        columns={'managed_segment_id': 'p_id', 'parent_segment_id': 'root_segment_id'}),
        left_on='parent_segment_id', right_on='p_id')
    merged = merged.merge(ebt[['managed_segment_id', 'segment_name']].rename(
        columns={'managed_segment_id': 'root_id', 'segment_name': 'segment_name_l1'}),
        left_on='root_segment_id', right_on='root_id')

    merged['weighted_dscr'] = merged['dscr'] * merged['gross_exposure_usd']
    grouped = merged.groupby('segment_name_l1').agg(
        weighted_sum=('weighted_dscr', 'sum'),
        weight_total=('gross_exposure_usd', 'sum')
    )
    grouped['dscr'] = grouped['weighted_sum'] / grouped['weight_total'].replace(0, np.nan)
    return grouped[['dscr']]`,
};

/* ── Chart bar cap ── */
const MAX_CHART_BARS = 25;

interface DSCRResultsViewProps {
  onBack: () => void;
}

export default function DSCRResultsView({ onBack }: DSCRResultsViewProps) {
  const [dimension, setDimension] = useState<CalculationDimension>('facility');
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [showPython, setShowPython] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyPySuccess, setCopyPySuccess] = useState(false);

  const fetchResults = useCallback(async (dim: CalculationDimension) => {
    setLoading(true);
    try {
      const res = await fetch('/api/metrics/deep-dive/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metricId: 'C101', dimension: dim }),
      });
      const data: ApiResult = await res.json();
      setResult(data);
    } catch {
      setResult({ ok: false, error: 'Failed to reach calculation engine' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(dimension);
  }, [dimension, fetchResults]);

  const rows = result?.result?.rows ?? [];
  const sorted = [...rows].sort((a, b) => b.metric_value - a.metric_value);
  const nonZero = sorted.filter((r) => r.metric_value > 0);
  const chartRows = nonZero.length > MAX_CHART_BARS
    ? [...nonZero.slice(0, 15), ...nonZero.slice(-10)]
    : nonZero;
  const maxValue = Math.max(...chartRows.map((r) => r.metric_value), 0.01);

  const handleCopySql = () => {
    if (!result?.sqlExecuted) return;
    navigator.clipboard.writeText(result.sqlExecuted).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleCopyPython = () => {
    navigator.clipboard.writeText(PYTHON_FORMULAS[dimension]).then(() => {
      setCopyPySuccess(true);
      setTimeout(() => setCopyPySuccess(false), 2000);
    });
  };

  const isCre = (row: GroupedRow) =>
    dimension === 'facility' && isCreFacility(Number(row.dimension_value));

  /* ── Summary statistics ── */
  const stats = (() => {
    const vals = nonZero.map((r) => r.metric_value);
    if (vals.length === 0) return null;
    const sorted2 = [...vals].sort((a, b) => a - b);
    const distressed = vals.filter((v) => v < 1.0).length;
    const watch = vals.filter((v) => v >= 1.0 && v < 1.25).length;
    const healthy = vals.filter((v) => v >= 1.25).length;
    return {
      count: vals.length,
      min: sorted2[0],
      max: sorted2[sorted2.length - 1],
      median: sorted2[Math.floor(sorted2.length / 2)],
      distressed,
      watch,
      healthy,
    };
  })();

  return (
    <div className="max-w-4xl mx-auto" aria-live="polite">
      {/* ── Back nav ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* ── Header ── */}
      <header className="border-b border-white/10 pb-6 mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
            C101
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
            Ratio
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-2">DSCR Calculation Results</h1>
        <p className="text-sm text-gray-400">
          Exposure-weighted Debt Service Coverage Ratio with CRE/C&amp;I numerator branching.
          CRE products use NOI; C&amp;I products use EBITDA.
        </p>
      </header>

      {/* ── Dimension selector ── */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Rollup Level
        </p>
        <div className="flex flex-wrap gap-2">
          {CALCULATION_DIMENSIONS.map((dim) => (
            <button
              key={dim}
              type="button"
              onClick={() => setDimension(dim)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                dimension === dim
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-gray-200'
              }`}
            >
              {CALCULATION_DIMENSION_LABELS[dim] ?? dim}
            </button>
          ))}
        </div>
      </div>

      {/* ── Python Formula ── */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowPython(!showPython)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors mb-2"
        >
          <Code2 className="w-3.5 h-3.5" />
          {showPython ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Python Formula
        </button>
        {showPython && (
          <div className="relative bg-black/30 rounded-lg border border-white/5 p-4">
            <button
              type="button"
              onClick={handleCopyPython}
              className="absolute top-2 right-2 p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300"
              title="Copy Python"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            {copyPySuccess && (
              <span className="absolute top-2 right-10 text-xs text-emerald-400">Copied</span>
            )}
            <pre className="text-xs font-mono text-emerald-300/80 whitespace-pre-wrap break-all leading-relaxed">
              {PYTHON_FORMULAS[dimension]}
            </pre>
          </div>
        )}
      </div>

      {/* ── Loading state ── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="ml-3 text-sm text-gray-400">Calculating…</span>
        </div>
      )}

      {/* ── Error state ── */}
      {!loading && result && !result.ok && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {result.error}
        </div>
      )}

      {/* ── Results ── */}
      {!loading && result?.ok && rows.length > 0 && (
        <>
          {/* ── Summary stats ── */}
          {stats && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
              <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">Count</p>
                <p className="text-lg font-mono font-bold text-white">{stats.count}</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">Min</p>
                <p className="text-lg font-mono font-bold text-red-400">{stats.min.toFixed(2)}x</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">Median</p>
                <p className="text-lg font-mono font-bold text-white">{stats.median.toFixed(2)}x</p>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">Max</p>
                <p className="text-lg font-mono font-bold text-emerald-400">{stats.max.toFixed(2)}x</p>
              </div>
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400/70 mb-0.5">&lt; 1.0x</p>
                <p className="text-lg font-mono font-bold text-red-400">{stats.distressed}</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70 mb-0.5">Watch</p>
                <p className="text-lg font-mono font-bold text-amber-400">{stats.watch}</p>
              </div>
            </div>
          )}

          {/* ── Bar chart (capped) ── */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              {DIM_LABELS[dimension]} DSCR Distribution
              {nonZero.length > MAX_CHART_BARS && (
                <span className="text-gray-600 font-normal ml-2">
                  (showing top 15 + bottom 10 of {nonZero.length})
                </span>
              )}
            </p>
            <div className="space-y-1.5">
              {chartRows.map((row, i) => {
                const pct = maxValue > 0 ? (Math.abs(row.metric_value) / maxValue) * 100 : 0;
                const cre = isCre(row);
                // Show separator between top and bottom groups
                const showGap = nonZero.length > MAX_CHART_BARS && i === 15;
                return (
                  <React.Fragment key={String(row.dimension_value)}>
                    {showGap && (
                      <div className="flex items-center gap-3 py-1">
                        <div className="w-48" />
                        <div className="flex-1 border-t border-dashed border-white/10" />
                        <div className="w-16 text-center text-[10px] text-gray-600">···</div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-48 text-right text-sm truncate">
                        <span className="text-gray-300">
                          {row.dimension_value}
                        </span>
                        {dimension === 'facility' && (
                          <span
                            className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              cre
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {cre ? 'CRE' : 'C&I'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 h-6 bg-white/5 rounded-md overflow-hidden relative">
                        {/* 1.0x reference line */}
                        <div
                          className="absolute top-0 bottom-0 w-px bg-red-500/40 z-10"
                          style={{ left: `${(1.0 / maxValue) * 100}%` }}
                        />
                        <div
                          className={`h-full rounded-md transition-all duration-500 ${
                            row.metric_value < 1.0
                              ? 'bg-gradient-to-r from-red-500/70 to-red-400/50'
                              : row.metric_value < 1.25
                                ? 'bg-gradient-to-r from-amber-500/60 to-amber-400/40'
                                : cre
                                  ? 'bg-gradient-to-r from-amber-500/50 to-amber-400/30'
                                  : 'bg-gradient-to-r from-blue-500/60 to-blue-400/40'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-16 text-right">
                        <span
                          className={`text-sm font-mono font-medium ${
                            row.metric_value < 1.0
                              ? 'text-red-400'
                              : row.metric_value < 1.25
                                ? 'text-amber-400'
                                : 'text-white'
                          }`}
                        >
                          {row.metric_value.toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* ── Legend (facility only) ── */}
          {dimension === 'facility' && (
            <div className="flex items-center gap-4 mb-6 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-500/50" /> CRE (numerator = NOI)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-500/60" /> C&amp;I (numerator = EBITDA)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-500/70" /> Distressed (&lt; 1.0x)
              </span>
            </div>
          )}

          {/* ── Data table ── */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Detailed Results
            </p>
            <div className="overflow-x-auto rounded-lg border border-white/10 max-h-96 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0">
                  <tr className="border-b border-white/10 bg-[#0d1220]">
                    <th className="px-4 py-2.5 font-medium text-gray-400">
                      {DIM_LABELS[dimension]}
                    </th>
                    {dimension === 'facility' && (
                      <th className="px-4 py-2.5 font-medium text-gray-400">Product Type</th>
                    )}
                    <th className="px-4 py-2.5 font-medium text-gray-400 text-right">DSCR</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    const cre = isCre(row);
                    const zero = row.metric_value === 0;
                    return (
                      <tr
                        key={String(row.dimension_value)}
                        className={`border-b border-white/5 ${
                          zero ? 'opacity-40' : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="px-4 py-2 font-mono text-gray-300 text-xs">
                          {row.dimension_value}
                        </td>
                        {dimension === 'facility' && (
                          <td className="px-4 py-2">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded ${
                                cre
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              {cre ? 'CRE (NOI)' : 'C&I (EBITDA)'}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`font-mono font-medium text-xs ${
                              zero
                                ? 'text-gray-600'
                                : row.metric_value >= 1.25
                                  ? 'text-emerald-400'
                                  : row.metric_value >= 1.0
                                    ? 'text-amber-400'
                                    : 'text-red-400'
                            }`}
                          >
                            {row.metric_value.toFixed(4)}x
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">
              Color coding: <span className="text-emerald-400">≥ 1.25x</span> |{' '}
              <span className="text-amber-400">1.00–1.25x</span> |{' '}
              <span className="text-red-400">&lt; 1.00x</span>
            </p>
          </div>

          {/* ── SQL section ── */}
          {result.sqlExecuted && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowSql(!showSql)}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors mb-2"
              >
                {showSql ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Executed SQL
              </button>
              {showSql && (
                <div className="relative bg-black/30 rounded-lg border border-white/5 p-4">
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="absolute top-2 right-2 p-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300"
                    title="Copy SQL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {copySuccess && (
                    <span className="absolute top-2 right-10 text-xs text-emerald-400">Copied</span>
                  )}
                  <pre className="text-xs font-mono text-purple-300/80 whitespace-pre-wrap break-all leading-relaxed">
                    {result.sqlExecuted}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ── Metadata ── */}
          <div className="rounded-lg bg-white/[0.02] border border-white/5 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-3.5 h-3.5 text-gray-500" />
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Execution Metadata
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs">
              <div>
                <span className="text-gray-500">as_of_date:</span>{' '}
                <span className="text-gray-300 font-mono">{result.asOfDateUsed ?? '—'}</span>
              </div>
              {result.inputRowCounts &&
                Object.entries(result.inputRowCounts).map(([table, count]) => (
                  <div key={table}>
                    <span className="text-gray-500">{table.replace(/^L[12]\./, '')}:</span>{' '}
                    <span className="text-gray-300 font-mono">{count} rows</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && result?.ok && rows.length === 0 && (
        <div className="text-center py-16 text-gray-500 text-sm">
          No results returned for this dimension.
        </div>
      )}
    </div>
  );
}
