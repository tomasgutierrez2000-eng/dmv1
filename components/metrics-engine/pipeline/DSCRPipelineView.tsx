'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Database,
  ChevronDown,
  ChevronUp,
  Copy,
  Play,
} from 'lucide-react';
import {
  CALCULATION_DIMENSIONS,
  CALCULATION_DIMENSION_LABELS,
  type CalculationDimension,
} from '@/data/l3-metrics';
import {
  DIMENSION_PIPELINES,
  PIPELINE_TABLES,
  PYTHON_FORMULAS,
} from './dscrPipelineData';
import PipelineTableCard from './PipelineTableCard';
import PipelineStepCard from './PipelineStepCard';
import PipelineOutputCard from './PipelineOutputCard';
import PipelineEdges from './PipelineEdges';

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

/* ── CRE product_node_ids: BL=3, BRIDGE=7 ── */
function isCreFacility(facilityId: number): boolean {
  const productNode = ((facilityId - 1) % 10) + 1;
  return productNode === 3 || productNode === 7;
}

const MAX_CHART_BARS = 25;

const DIM_LABELS: Record<CalculationDimension, string> = {
  facility: 'Facility',
  counterparty: 'Counterparty',
  L3: 'Desk (L3)',
  L2: 'Portfolio (L2)',
  L1: 'Business Segment (L1)',
};

interface DSCRPipelineViewProps {
  onBack: () => void;
  onStartDemo?: () => void;
  /** Demo-driven step highlight */
  activeStepId?: string | null;
}

export default function DSCRPipelineView({ onBack, onStartDemo, activeStepId }: DSCRPipelineViewProps) {
  const [dimension, setDimension] = useState<CalculationDimension>('facility');
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showFullPython, setShowFullPython] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyPySuccess, setCopyPySuccess] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const flowContainerRef = useRef<HTMLDivElement>(null);

  const pipeline = DIMENSION_PIPELINES[dimension];

  /* ── Fetch calculation results ── */
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

  /* ── Stats ── */
  const stats = (() => {
    const vals = nonZero.map((r) => r.metric_value);
    if (vals.length === 0) return null;
    const sorted2 = [...vals].sort((a, b) => a - b);
    return {
      count: vals.length,
      min: sorted2[0],
      max: sorted2[sorted2.length - 1],
      median: sorted2[Math.floor(sorted2.length / 2)],
      distressed: vals.filter((v) => v < 1.0).length,
      watch: vals.filter((v) => v >= 1.0 && v < 1.25).length,
    };
  })();

  const isCre = (row: GroupedRow) =>
    dimension === 'facility' && isCreFacility(Number(row.dimension_value));

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

  // Effective hover = manual hover or demo-driven
  const effectiveHover = activeStepId ?? hoveredId;

  return (
    <div className="max-w-6xl mx-auto" aria-live="polite">
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
        <h1 className="text-2xl font-bold mb-2">DSCR Calculation Pipeline</h1>
        <p className="text-sm text-gray-400">
          Visual flow showing how Python code reads from database tables to compute the Debt Service Coverage Ratio.
          {pipeline.description && ` ${pipeline.description}.`}
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

      {/* ═══════════════════════════════════════════════════════════════════
       * PIPELINE FLOW — 3-column layout
       * ═══════════════════════════════════════════════════════════════════ */}
      <div
        ref={flowContainerRef}
        className="relative mb-6"
        data-pipeline="flow-container"
        key={dimension}
      >
        <div className="grid grid-cols-[220px_1fr_200px] gap-6 items-start">
          {/* ── LEFT: Source Tables ── */}
          <div className="space-y-3 sticky top-6 self-start">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Source Tables
            </p>
            {/* Always show facility-level tables for higher dims */}
            {dimension !== 'facility' && (
              <div
                data-pipeline="table-facility-dscr"
                className="rounded-lg border px-3 py-2.5 bg-emerald-950/60 border-emerald-500/40 opacity-70"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Prev
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">facility_dscr</span>
                </div>
                <p className="text-[10px] text-gray-500">From facility-level calculation</p>
              </div>
            )}
            {pipeline.tables.map((tid) => {
              const table = PIPELINE_TABLES[tid];
              if (!table) return null;
              return (
                <PipelineTableCard
                  key={tid}
                  table={table}
                  dimension={dimension}
                  isHighlighted={effectiveHover === tid}
                  onHover={setHoveredId}
                />
              );
            })}
          </div>

          {/* ── MIDDLE: Python Steps ── */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Python Pipeline
            </p>
            {pipeline.steps.map((step, i) => (
              <PipelineStepCard
                key={step.id}
                step={step}
                stepIndex={i}
                isActive={effectiveHover === step.id}
                onHover={setHoveredId}
              />
            ))}
          </div>

          {/* ── RIGHT: Output ── */}
          <div className="sticky top-6 self-start">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Output
            </p>
            <PipelineOutputCard
              dimension={dimension}
              resultCount={stats?.count ?? 0}
              medianValue={stats?.median ?? null}
              isHighlighted={false}
            />
          </div>
        </div>

        {/* SVG Edge overlay */}
        <PipelineEdges
          steps={pipeline.steps}
          tableIds={pipeline.tables}
          hoveredId={effectiveHover}
          containerRef={flowContainerRef}
        />
      </div>

      {/* ── Action bar: Demo + Full Python ── */}
      <div className="flex items-center gap-3 mb-6 border-t border-white/10 pt-4">
        {onStartDemo && (
          <button
            type="button"
            onClick={onStartDemo}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white transition-all"
          >
            <Play className="w-4 h-4" />
            Start Demo
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowFullPython(!showFullPython)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-gray-200 transition-all"
        >
          {showFullPython ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Full Python Code
        </button>

        <button
          type="button"
          onClick={() => setShowResults(!showResults)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-gray-200 transition-all"
        >
          {showResults ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Calculation Results
        </button>
      </div>

      {/* ── Full Python (collapsible) ── */}
      {showFullPython && (
        <div className="mb-6 relative bg-black/30 rounded-lg border border-white/5 p-4">
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

      {/* ═══════════════════════════════════════════════════════════════════
       * RESULTS SECTION (collapsible)
       * ═══════════════════════════════════════════════════════════════════ */}
      {showResults && (
        <>
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <span className="ml-3 text-sm text-gray-400">Calculating...</span>
            </div>
          )}

          {/* Error */}
          {!loading && result && !result.ok && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 mb-6">
              {result.error}
            </div>
          )}

          {/* Results content */}
          {!loading && result?.ok && rows.length > 0 && (
            <>
              {/* Summary stats */}
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

              {/* Bar chart */}
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
                    const showGap = nonZero.length > MAX_CHART_BARS && i === 15;
                    return (
                      <React.Fragment key={String(row.dimension_value)}>
                        {showGap && (
                          <div className="flex items-center gap-3 py-1">
                            <div className="w-48" />
                            <div className="flex-1 border-t border-dashed border-white/10" />
                            <div className="w-16 text-center text-[10px] text-gray-600">...</div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className="w-48 text-right text-sm truncate">
                            <span className="text-gray-300">{row.dimension_value}</span>
                            {dimension === 'facility' && (
                              <span
                                className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                  cre ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                                }`}
                              >
                                {cre ? 'CRE' : 'C&I'}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 h-6 bg-white/5 rounded-md overflow-hidden relative">
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

              {/* Legend */}
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

              {/* Data table */}
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
                            className={`border-b border-white/5 ${zero ? 'opacity-40' : 'hover:bg-white/5'}`}
                          >
                            <td className="px-4 py-2 font-mono text-gray-300 text-xs">
                              {row.dimension_value}
                            </td>
                            {dimension === 'facility' && (
                              <td className="px-4 py-2">
                                <span
                                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                                    cre ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
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
              </div>

              {/* SQL section */}
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

              {/* Metadata */}
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

          {/* Empty state */}
          {!loading && result?.ok && rows.length === 0 && (
            <div className="text-center py-16 text-gray-500 text-sm">
              No results returned for this dimension.
            </div>
          )}
        </>
      )}
    </div>
  );
}
