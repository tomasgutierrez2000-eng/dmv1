'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, ChevronDown, ChevronUp, Database, Code, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import {
  CALCULATION_DIMENSIONS,
  DASHBOARD_PAGES,
  type CalculationDimension,
} from '@/data/l3-metrics';
import { resolveFormulaForDimension } from '@/lib/metrics-calculation/formula-resolver';
import type { L3Metric } from '@/data/l3-metrics';

type RunResult =
  | { ok: true; inputRowCounts: Record<string, number>; sqlExecuted: string; result: { type: 'scalar'; value: number | null } | { type: 'grouped'; rows: { dimension_value: string | number; metric_value: number }[] }; asOfDateUsed: string | null }
  | { ok: false; error: string; hint?: string; sqlExecuted?: string; inputRowCounts?: Record<string, number> };

function formatValue(value: number | null, displayFormat: string): string {
  if (value === null || value === undefined) return '—';
  if (displayFormat.includes('$') && displayFormat.includes('M')) {
    const millions = value / 1_000_000;
    return `$${millions.toFixed(1)}M`;
  }
  if (displayFormat.includes('%')) return `${Number(value).toFixed(2)}%`;
  if (displayFormat.includes(',')) return value.toLocaleString();
  return String(value);
}

interface DeepDiveViewProps {
  metric: L3Metric;
  onBack: () => void;
}

const DEEP_DIVE_LEVEL_LABELS: Record<CalculationDimension, string> = {
  facility: 'Facility',
  counterparty: 'Counterparty',
  L3: 'L3 Desk',
  L2: 'L2 Portfolio',
  L1: 'L1 Department',
};

function getAllowedDimensions(metric: L3Metric): CalculationDimension[] {
  if (metric.allowedDimensions?.length) return metric.allowedDimensions;
  return [...CALCULATION_DIMENSIONS];
}

export default function DeepDiveView({ metric, onBack }: DeepDiveViewProps) {
  const allowedDimensions = getAllowedDimensions(metric);
  const [dimension, setDimension] = useState<CalculationDimension>(allowedDimensions[0]);
  const [asOfDate, setAsOfDate] = useState<string | null>(null);
  const [asOfDates, setAsOfDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const cacheRef = useRef<Map<string, RunResult>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const latestResultRef = useRef<RunResult | null>(null);

  const resolvedFormula = resolveFormulaForDimension(metric, dimension, { allowLegacyFallback: true });
  const displayFormula = resolvedFormula?.formula ?? metric.formula;
  const displayFormulaSQL = resolvedFormula?.formulaSQL ?? metric.formulaSQL;
  const needsAsOfDate = Boolean(displayFormulaSQL?.includes(':as_of_date'));

  const cacheKey = `${metric.id}\t${dimension}\t${asOfDate ?? ''}`;

  useEffect(() => {
    latestResultRef.current = runResult;
  }, [runResult]);

  const run = useCallback(async () => {
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setRunResult(cached);
      setLoading(false);
      setIsRefreshing(false);
      return;
    }
    const hasPriorResult = latestResultRef.current != null;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(!hasPriorResult);
    setIsRefreshing(hasPriorResult);
    try {
      const res = await fetch('/api/metrics/deep-dive/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metricId: metric.id, dimension, asOfDate: asOfDate || undefined }),
        signal: abortRef.current.signal,
      });
      const data: RunResult = await res.json();
      if (!res.ok) {
        setRunResult({ ok: false, error: (data as { error?: string }).error ?? 'Request failed', hint: (data as { hint?: string }).hint });
        setLoading(false);
        setIsRefreshing(false);
        return;
      }
      if (data.ok) cacheRef.current.set(cacheKey, data);
      setRunResult(data);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setRunResult({ ok: false, error: (e as Error).message || 'Network error' });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [metric.id, dimension, asOfDate, cacheKey]);

  useEffect(() => {
    if (!allowedDimensions.includes(dimension)) setDimension(allowedDimensions[0]);
  }, [allowedDimensions, dimension]);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => {
    if (!needsAsOfDate) return;
    setDatesLoading(true);
    fetch(`/api/metrics/deep-dive/run?metricId=${encodeURIComponent(metric.id)}&dimension=${encodeURIComponent(dimension)}`)
      .then((r) => r.json())
      .then((d: { asOfDates?: string[] }) => {
        const list = d.asOfDates ?? [];
        setAsOfDates(list);
        if (list.length) setAsOfDate((prev) => (prev === null ? list[0]! : prev));
      })
      .catch(() => setAsOfDates([]))
      .finally(() => setDatesLoading(false));
    // Intentionally omit asOfDate: we only want to load date options when dimension/metric change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric.id, dimension, needsAsOfDate]);

  const handleCopySql = () => {
    const sql = runResult?.ok ? runResult.sqlExecuted : displayFormulaSQL;
    if (!sql) return;
    navigator.clipboard.writeText(sql).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const pageInfo = DASHBOARD_PAGES.find((p) => p.id === metric.page);

  return (
    <div className="max-w-4xl mx-auto" aria-live="polite">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded"
          aria-label="Back to metric"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <Link
          href="/metrics"
          className="ml-auto text-sm text-gray-400 hover:text-purple-400 transition-colors"
        >
          Open in catalogue
        </Link>
      </div>

      <header className="border-b border-white/10 pb-6 mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
            {metric.id}
          </span>
          {pageInfo && (
            <span className="text-[10px] text-gray-500" style={{ color: pageInfo.color }}>
              {pageInfo.shortName} · {metric.section}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-white">{metric.name}</h1>
        {metric.description && (
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">{metric.description}</p>
        )}
      </header>

      <section className="mb-6 p-4 rounded-xl bg-white/[0.04] border border-white/10">
        <p className="text-xs font-medium text-gray-400 mb-3">Calculate at dimension</p>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {allowedDimensions.map((dim) => (
            <button
              key={dim}
              type="button"
              onClick={() => setDimension(dim)}
              aria-pressed={dimension === dim}
              aria-label={`Calculate metric at ${DEEP_DIVE_LEVEL_LABELS[dim]} level`}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                dimension === dim
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              {DEEP_DIVE_LEVEL_LABELS[dim]}
            </button>
          ))}
        </div>
        {needsAsOfDate && (
          <div className="mt-3">
            <label className="text-xs text-gray-500 block mb-1">As-of date</label>
            {datesLoading ? (
              <p className="text-xs text-gray-500">Loading available dates…</p>
            ) : asOfDates.length > 0 ? (
              <select
                value={asOfDate ?? asOfDates[0] ?? ''}
                onChange={(e) => setAsOfDate(e.target.value || null)}
                aria-label="Select as-of date for calculation"
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-w-[160px]"
              >
                {asOfDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-amber-300">No as-of dates found in sample data.</p>
            )}
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          Formula
        </h2>
        <div className="bg-black/20 rounded-lg px-4 py-3 border border-white/5">
          <p className="text-sm font-mono text-purple-300">{displayFormula}</p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
          <Database className="w-3.5 h-3.5" />
          Result (live from L1/L2 sample data)
          {isRefreshing && <span className="text-[10px] text-cyan-300 normal-case">Updating…</span>}
        </h2>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden" aria-busy={loading || isRefreshing}>
          {loading && (
            <div className="p-8 flex items-center justify-center gap-2 text-gray-400">
              <RefreshCw className="w-4 h-4 animate-spin" aria-hidden />
              <span>Running calculation…</span>
            </div>
          )}
          {!loading && runResult?.ok && (
            <div className="p-6">
              {runResult.result.type === 'scalar' && (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                    {formatValue(runResult.result.value, metric.displayFormat || '')}
                  </span>
                  <span className="text-xs text-gray-500">{metric.displayFormat || 'value'}</span>
                </div>
              )}
              {runResult.result.type === 'grouped' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">
                    Per {DEEP_DIVE_LEVEL_LABELS[dimension]} ({runResult.result.rows.length} rows)
                  </p>
                  <div className="max-h-64 overflow-auto rounded-lg border border-white/10">
                    <table className="w-full min-w-[420px] text-xs sm:text-sm">
                      <thead className="sticky top-0 bg-[#0a0e1a] border-b border-white/10">
                        <tr>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Dimension</th>
                          <th className="text-right py-2 px-3 text-gray-400 font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runResult.result.rows.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-b border-white/5">
                            <td className="py-2 px-3 font-mono text-gray-300 whitespace-nowrap">{String(row.dimension_value)}</td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-400">
                              {formatValue(row.metric_value, metric.displayFormat || '')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {runResult.result.rows.length === 0 && (
                      <p className="text-xs text-gray-500 p-3">No rows returned for this level and filter.</p>
                    )}
                    {runResult.result.rows.length > 50 && (
                      <p className="text-xs text-gray-500 p-2 border-t border-white/5">
                        Showing 50 of {runResult.result.rows.length}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {runResult.inputRowCounts && Object.keys(runResult.inputRowCounts).length > 0 && (
                <p className="text-[11px] text-gray-500 mt-3 pt-3 border-t border-white/5">
                  Input rows: {Object.entries(runResult.inputRowCounts).map(([k, n]) => `${k}: ${n}`).join(', ')}
                </p>
              )}
              {runResult.asOfDateUsed && (
                <p className="text-[11px] text-gray-500 mt-1">As-of date used: {runResult.asOfDateUsed}</p>
              )}
            </div>
          )}
          {!loading && runResult && !runResult.ok && (
            <div className="p-6 flex items-start gap-3 text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{runResult.error}</p>
                {runResult.hint && <p className="text-sm text-amber-200/70 mt-1">{runResult.hint}</p>}
                <button
                  type="button"
                  onClick={() => run()}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-sm font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {(displayFormulaSQL || (runResult?.ok && runResult.sqlExecuted)) && (
        <section className="mb-6">
          <button
            type="button"
            onClick={() => setShowSql((s) => !s)}
            aria-expanded={showSql}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded mb-2"
          >
            <Code className="w-3.5 h-3.5" />
            {showSql ? 'Hide SQL' : 'Show SQL'}
            {showSql ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showSql && (
            <div className="relative rounded-lg bg-black/30 border border-white/10 overflow-hidden">
              <pre className="p-4 text-xs font-mono text-gray-400 overflow-x-auto whitespace-pre-wrap">
                {runResult?.ok ? runResult.sqlExecuted : displayFormulaSQL}
              </pre>
              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1.5 rounded bg-white/10 hover:bg-white/15 text-gray-400 text-xs font-medium"
              >
                <Copy className="w-3 h-3" />
                {copySuccess ? 'Copied' : 'Copy SQL'}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
