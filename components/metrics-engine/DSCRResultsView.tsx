'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Database, ChevronDown, ChevronUp, Copy } from 'lucide-react';
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

/* ── Product codes classified as CRE (matches seed-metrics.ts) ── */
const CRE_PRODUCT_CODES = ['BL', 'BRIDGE'];

/* ── Dimension labels for display ── */
const DIM_LABELS: Record<CalculationDimension, string> = {
  facility: 'Facility',
  counterparty: 'Counterparty',
  L3: 'Desk (L3)',
  L2: 'Portfolio (L2)',
  L1: 'Business Segment (L1)',
};

interface DSCRResultsViewProps {
  onBack: () => void;
}

export default function DSCRResultsView({ onBack }: DSCRResultsViewProps) {
  const [dimension, setDimension] = useState<CalculationDimension>('facility');
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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
  const maxValue = Math.max(...rows.map((r) => Math.abs(r.metric_value)), 0.01);

  const handleCopySql = () => {
    if (!result?.sqlExecuted) return;
    navigator.clipboard.writeText(result.sqlExecuted).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  /* For facility dimension, infer CRE vs C&I from dimension_value (facility_id).
     Facility 3 → product_node_id 3 → BL (CRE), Facility 7 → product_node_id 7 → BRIDGE (CRE).
     This mapping matches the sample data in enterprise_product_taxonomy. */
  const CRE_FACILITY_IDS = new Set([3, 7]);
  const isCre = (row: GroupedRow) =>
    dimension === 'facility' && CRE_FACILITY_IDS.has(Number(row.dimension_value));

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
          {/* ── Bar chart ── */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              {DIM_LABELS[dimension]} DSCR Distribution
            </p>
            <div className="space-y-2">
              {rows
                .sort((a, b) => b.metric_value - a.metric_value)
                .map((row) => {
                  const pct = maxValue > 0 ? (Math.abs(row.metric_value) / maxValue) * 100 : 0;
                  const cre = isCre(row);
                  const zero = row.metric_value === 0;
                  return (
                    <div key={String(row.dimension_value)} className="flex items-center gap-3">
                      <div className="w-48 text-right text-sm truncate">
                        <span className={zero ? 'text-gray-600' : 'text-gray-300'}>
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
                      <div className="flex-1 h-7 bg-white/5 rounded-md overflow-hidden">
                        <div
                          className={`h-full rounded-md transition-all duration-500 ${
                            zero
                              ? 'bg-gray-700/50'
                              : cre
                                ? 'bg-gradient-to-r from-amber-500/60 to-amber-400/40'
                                : 'bg-gradient-to-r from-blue-500/60 to-blue-400/40'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="w-16 text-right">
                        <span
                          className={`text-sm font-mono ${
                            zero ? 'text-gray-600' : 'text-white'
                          }`}
                        >
                          {row.metric_value.toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* ── Legend (facility only) ── */}
          {dimension === 'facility' && (
            <div className="flex items-center gap-4 mb-6 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-500/60" /> CRE (numerator = NOI)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-500/60" /> C&amp;I (numerator = EBITDA)
              </span>
            </div>
          )}

          {/* ── Data table ── */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Detailed Results
            </p>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
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
                  {rows
                    .sort((a, b) => b.metric_value - a.metric_value)
                    .map((row) => {
                      const cre = isCre(row);
                      const zero = row.metric_value === 0;
                      return (
                        <tr
                          key={String(row.dimension_value)}
                          className={`border-b border-white/5 ${
                            zero ? 'opacity-40' : 'hover:bg-white/5'
                          }`}
                        >
                          <td className="px-4 py-2.5 font-mono text-gray-300">
                            {row.dimension_value}
                          </td>
                          {dimension === 'facility' && (
                            <td className="px-4 py-2.5">
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
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={`font-mono font-medium ${
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
