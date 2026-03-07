'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import {
  CALCULATION_DIMENSIONS,
  CALCULATION_DIMENSION_LABELS,
  type CalculationDimension,
} from '@/data/l3-metrics';
import {
  DIMENSION_PIPELINES,
  PIPELINE_TABLES,
  PYTHON_FORMULAS,
  PHASE_COLORS,
} from './undrawnExposurePipelineData';
import PipelineTableCard from './PipelineTableCard';
import PipelineStepCard from './PipelineStepCard';
import PipelineEdges from './PipelineEdges';

interface GroupedRow {
  dimension_value: string | number;
  metric_value: number;
}

interface ApiResult {
  ok: boolean;
  error?: string;
  sqlExecuted?: string;
  asOfDateUsed?: string | null;
  result?: {
    type: 'grouped' | 'scalar';
    rows?: GroupedRow[];
    value?: number | null;
  };
}

const DIM_LABELS: Record<CalculationDimension, string> = {
  facility: 'Facility',
  counterparty: 'Counterparty',
  L3: 'Desk (L3)',
  L2: 'Portfolio (L2)',
  L1: 'Business Segment (L1)',
};

function formatUndrawn(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

interface UndrawnExposurePipelineViewProps {
  onBack: () => void;
}

export default function UndrawnExposurePipelineView({ onBack }: UndrawnExposurePipelineViewProps) {
  const [dimension, setDimension] = useState<CalculationDimension>('facility');
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [showFullPython, setShowFullPython] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyPySuccess, setCopyPySuccess] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const flowContainerRef = useRef<HTMLDivElement>(null);

  const pipeline = DIMENSION_PIPELINES[dimension];

  const fetchResults = useCallback(async (dim: CalculationDimension) => {
    setLoading(true);
    try {
      const res = await fetch('/api/metrics/deep-dive/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metricId: 'C114', dimension: dim }),
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
  const total = rows.reduce((s, r) => s + r.metric_value, 0);

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

  return (
    <div className="max-w-6xl mx-auto" aria-live="polite">
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

      <header className="border-b border-white/10 pb-6 mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
            C114
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
            Aggregate
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Undrawn Exposure Calculation Pipeline</h1>
        <p className="text-sm text-gray-400">
          Python code at all levels: Facility (Calc), Counterparty (Calc), L3/L2/L1 (Agg).
          {pipeline.description && ` ${pipeline.description}.`}
        </p>
      </header>

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
                  ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-gray-200'
              }`}
            >
              {CALCULATION_DIMENSION_LABELS[dim] ?? dim}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={flowContainerRef}
        className="relative mb-6"
        data-pipeline="flow-container"
        key={dimension}
      >
        <div className="grid grid-cols-[220px_1fr_200px] gap-6 items-start">
          <div className="space-y-3 sticky top-6 self-start">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Source Tables
            </p>
            {dimension !== 'facility' && (
              <div
                data-pipeline="table-facility-undrawn"
                className="rounded-lg border px-3 py-2.5 bg-emerald-950/60 border-emerald-500/40 opacity-70"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Prev
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">undrawn_exposure_facility_level</span>
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
                  isHighlighted={hoveredId === tid}
                  onHover={setHoveredId}
                />
              );
            })}
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Python Pipeline
            </p>
            {pipeline.steps.map((step, i) => (
              <UndrawnPipelineStepCard
                key={step.id}
                step={step}
                stepIndex={i}
                isActive={hoveredId === step.id}
                onHover={setHoveredId}
                phaseColors={PHASE_COLORS}
              />
            ))}
          </div>

          <div className="sticky top-6 self-start">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Output
            </p>
            <div className="rounded-lg border px-4 py-4 bg-emerald-950/60 border-emerald-500/40">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  L3 Output
                </span>
              </div>
              <p className="text-sm font-bold text-white mb-1">Undrawn Exposure ($)</p>
              <p className="text-[10px] text-gray-400 mb-3">
                per {DIM_LABELS[dimension]}
              </p>
              {!loading && result?.ok && rows.length > 0 ? (
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Total</p>
                  <p className="text-2xl font-mono font-bold text-emerald-400">
                    {formatUndrawn(total)}
                  </p>
                  <p className="text-[10px] text-gray-500 text-center mt-2">
                    {rows.length} {DIM_LABELS[dimension].toLowerCase()}s
                  </p>
                </div>
              ) : loading ? (
                <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
              ) : (
                <p className="text-[10px] text-gray-500">—</p>
              )}
            </div>
          </div>
        </div>

        <PipelineEdges
          steps={pipeline.steps}
          tableIds={pipeline.tables}
          hoveredId={hoveredId}
          containerRef={flowContainerRef}
        />
      </div>

      <div className="flex items-center gap-3 mb-6 border-t border-white/10 pt-4">
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

      {showResults && (
        <>
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <span className="ml-3 text-sm text-gray-400">Calculating...</span>
            </div>
          )}

          {!loading && result && !result.ok && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 mb-6">
              {result.error}
            </div>
          )}

          {!loading && result?.ok && rows.length > 0 && (
            <div className="rounded-lg border border-white/10 overflow-hidden mb-6">
              <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  Undrawn Exposure — {DIM_LABELS[dimension]} Level
                  {result.asOfDateUsed && (
                    <span className="ml-2 text-xs text-gray-500">as of {result.asOfDateUsed}</span>
                  )}
                </span>
                {result.sqlExecuted && (
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copySuccess ? 'Copied' : 'Copy SQL'}
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#0a0e1a]">
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-2.5 font-medium text-gray-400 text-left">
                        {DIM_LABELS[dimension]}
                      </th>
                      <th className="px-4 py-2.5 font-medium text-gray-400 text-right">
                        Undrawn Exposure ($)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-2.5 font-mono text-gray-300">
                          {String(row.dimension_value)}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-emerald-300 text-right">
                          {formatUndrawn(row.metric_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sorted.length > 50 && (
                <p className="px-4 py-2 text-xs text-gray-500 border-t border-white/5">
                  Showing 50 of {sorted.length} rows
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Step card that accepts phaseColors from our pipeline data ── */
interface UndrawnPipelineStepCardProps {
  step: { id: string; phase: string; title: string; pythonCode: string; narration: string; sampleOutput?: { headers: string[]; rows: string[][] } };
  stepIndex: number;
  isActive: boolean;
  onHover: (id: string | null) => void;
  phaseColors: Record<string, { bg: string; border: string; text: string; badge: string }>;
}

function UndrawnPipelineStepCard({ step, isActive, onHover, phaseColors }: UndrawnPipelineStepCardProps) {
  const colors = phaseColors[step.phase] ?? phaseColors.READ;

  return (
    <div
      data-pipeline={`step-${step.id}`}
      className={`rounded-lg border px-3 py-3 transition-all duration-300 ${colors.bg} ${colors.border} ${
        isActive ? 'ring-1 ring-white/30 scale-[1.01]' : 'hover:ring-1 hover:ring-white/10'
      }`}
      onMouseEnter={() => onHover(step.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${colors.badge}`}>
          {step.phase}
        </span>
        <span className="text-xs font-semibold text-white">{step.title}</span>
      </div>
      <div className="bg-black/40 rounded-md px-2.5 py-2 mb-2 font-mono text-[10px] leading-relaxed overflow-x-auto text-emerald-300/80 whitespace-pre-wrap">
        {step.pythonCode}
      </div>
      <p className="text-[10px] text-gray-400 leading-relaxed">{step.narration}</p>
      {step.sampleOutput && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[9px] font-mono">
            <thead>
              <tr className="border-b border-white/10">
                {step.sampleOutput.headers.map((h) => (
                  <th key={h} className="px-1.5 py-1 text-left text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {step.sampleOutput.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-white/5">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-1.5 py-0.5 text-gray-300">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
