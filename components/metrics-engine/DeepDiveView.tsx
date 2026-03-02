'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, ChevronDown, ChevronUp, Code, Zap } from 'lucide-react';
import {
  CALCULATION_DIMENSIONS,
  CALCULATION_DIMENSION_LABELS,
  type CalculationDimension,
  type SourceField,
} from '@/data/l3-metrics';
import { resolveFormulaForDimension } from '@/lib/metrics-calculation/formula-resolver';
import { getFormulaForDimension } from '@/data/metrics_dimensions_filled';
import { resolveCrossTierDependencies, type DimensionData } from '@/lib/deep-dive/cross-tier-resolver';
import HierarchyOverview from './deep-dive/HierarchyOverview';
import CalculationWalkthrough from './deep-dive/CalculationWalkthrough';
import type { L3Metric } from '@/data/l3-metrics';

interface DeepDiveViewProps {
  metric: L3Metric;
  onBack: () => void;
}

interface MetricDimensionFormulaApiRow {
  metricId: string;
  dimension: CalculationDimension;
  formula: string;
  formulaSQL?: string;
  definition?: string;
  dashboardDisplayName?: string;
  laymanFormula?: string;
  lineageNarrative?: string;
  sourceFields?: SourceField[];
}

function normalizeMatchKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getAllowedDimensions(metric: L3Metric): CalculationDimension[] {
  if (metric.allowedDimensions?.length) return metric.allowedDimensions;
  return [...CALCULATION_DIMENSIONS];
}

export default function DeepDiveView({ metric, onBack }: DeepDiveViewProps) {
  const allowedDimensions = getAllowedDimensions(metric);
  const [dimension, setDimension] = useState<CalculationDimension>(allowedDimensions[0]);
  const [showSql, setShowSql] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [formulasFromApi, setFormulasFromApi] = useState<MetricDimensionFormulaApiRow[] | null>(null);

  useEffect(() => {
    fetch('/api/metrics-dimensions-filled', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { formulas?: MetricDimensionFormulaApiRow[] }) => setFormulasFromApi(data.formulas ?? null))
      .catch(() => setFormulasFromApi(null));
  }, []);

  const dimensionFormulaFromMetric = metric.formulasByDimension?.[dimension];
  const matchKeys = [metric.id, metric.name].filter(Boolean).map(normalizeMatchKey);
  const dimensionFormulaFromApi = formulasFromApi
    ? formulasFromApi.find(
        (r) =>
          r.dimension === dimension &&
          matchKeys.some((k) => k === normalizeMatchKey(String(r.metricId)))
      )
    : null;
  const dimensionFormulaFromStatic = getFormulaForDimension(metric.id, dimension);
  const resolvedFormula = resolveFormulaForDimension(metric, dimension, { allowLegacyFallback: true });
  const dimensionFormula = dimensionFormulaFromApi ?? dimensionFormulaFromMetric ?? dimensionFormulaFromStatic ?? resolvedFormula;
  const displayFormula = dimensionFormula?.formula ?? metric.formula;
  const displayFormulaSQL = dimensionFormula?.formulaSQL ?? metric.formulaSQL;
  const displayLaymanFormula = dimensionFormulaFromApi?.laymanFormula;
  const displayName = metric.displayNameByDimension?.[dimension] ?? dimensionFormulaFromApi?.dashboardDisplayName ?? metric.name;
  const displayDescription = dimensionFormulaFromApi?.definition ?? metric.description;

  useEffect(() => {
    if (!allowedDimensions.includes(dimension)) setDimension(allowedDimensions[0]);
  }, [allowedDimensions, dimension]);

  /* ── Build dimension data map for hierarchy/walkthrough components ── */
  const dimensionDataMap = useMemo(() => {
    const map = new Map<CalculationDimension, DimensionData>();
    if (!formulasFromApi) return map;
    const rows = formulasFromApi.filter((r) =>
      matchKeys.some((k) => k === normalizeMatchKey(String(r.metricId)))
    );
    for (const row of rows) {
      map.set(row.dimension, {
        lineageNarrative: row.lineageNarrative,
        sourceFields: row.sourceFields,
        formula: row.formula,
        formulaSQL: row.formulaSQL,
        definition: row.definition,
        laymanFormula: row.laymanFormula,
        dashboardDisplayName: row.dashboardDisplayName,
      });
    }
    return map;
  }, [formulasFromApi, matchKeys]);

  const crossTierResolution = useMemo(
    () => resolveCrossTierDependencies(metric.id, dimension, dimensionDataMap),
    [metric.id, dimension, dimensionDataMap]
  );

  const handleCopySql = () => {
    const sql = displayFormulaSQL;
    if (!sql) return;
    navigator.clipboard.writeText(sql).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

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
        </div>
        <h1 className="text-xl font-bold text-white">{displayName}</h1>
        {displayDescription && (
          <p className="text-sm text-gray-400 mt-2 leading-relaxed">{displayDescription}</p>
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
              aria-label={`Calculate metric at ${CALCULATION_DIMENSION_LABELS[dim]} level`}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                dimension === dim
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              {CALCULATION_DIMENSION_LABELS[dim]}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          Formula
        </h2>
        <div className="bg-black/20 rounded-lg px-4 py-3 border border-white/5">
          <p className="text-sm font-mono text-purple-300">{displayFormula}</p>
          {displayLaymanFormula && (
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              In plain English: {displayLaymanFormula}
            </p>
          )}
        </div>
      </section>

      {displayFormulaSQL && (
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
                {displayFormulaSQL}
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

      {/* Deep-dive: How this metric rolls up */}
      {dimensionDataMap.size > 0 && (
        <>
          <HierarchyOverview
            metricName={displayName}
            currentDimension={dimension}
            allDimensionData={dimensionDataMap}
          />
          <CalculationWalkthrough
            metricId={metric.id}
            currentDimension={dimension}
            crossTierResolution={crossTierResolution}
          />
        </>
      )}
    </div>
  );
}
