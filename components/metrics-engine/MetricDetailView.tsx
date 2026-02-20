'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Layers, Hash, TrendingUp, Grid3x3, Zap, AlertTriangle, Table2, Tag } from 'lucide-react';
import {
  DIMENSION_LABELS,
  CALCULATION_DIMENSIONS,
  type CalculationDimension,
} from '@/data/l3-metrics';
import { metricWithLineage } from '@/lib/lineage-generator';
import { resolveFormulaForDimension } from '@/lib/metrics-calculation/formula-resolver';
import { getFormulaForDimension } from '@/data/metrics_dimensions_filled';
import LineageFlowView from '@/components/lineage/LineageFlowView';
import type { L3Metric, MetricType, DimensionInteraction, SourceField } from '@/data/l3-metrics';

const LAYER_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  L1:        { bg: 'bg-blue-950/60',    border: 'border-blue-500/40',    text: 'text-blue-300' },
  L2:        { bg: 'bg-amber-950/60',   border: 'border-amber-500/40',   text: 'text-amber-300' },
  L3:        { bg: 'bg-emerald-950/60', border: 'border-emerald-500/40', text: 'text-emerald-300' },
  transform: { bg: 'bg-purple-950/60',  border: 'border-purple-500/40',  text: 'text-purple-300' },
};

const DIM_STYLE: Record<DimensionInteraction, string> = {
  FILTER: 'bg-blue-500/20 text-blue-300',
  GROUP_BY: 'bg-emerald-500/20 text-emerald-300',
  AVAILABLE: 'bg-gray-500/20 text-gray-400',
  TOGGLE: 'bg-amber-500/20 text-amber-300',
};

const METRIC_TYPE_ICON: Record<MetricType, React.ReactNode> = {
  Aggregate: <Hash className="w-4 h-4" />,
  Ratio: <TrendingUp className="w-4 h-4" />,
  Count: <Grid3x3 className="w-4 h-4" />,
  Derived: <Zap className="w-4 h-4" />,
  Status: <AlertTriangle className="w-4 h-4" />,
  Trend: <TrendingUp className="w-4 h-4" />,
  Table: <Table2 className="w-4 h-4" />,
  Categorical: <Tag className="w-4 h-4" />,
};

const DIMENSION_BAR_LABELS: Record<CalculationDimension, string> = {
  facility: 'Facility',
  counterparty: 'Counterparty',
  L3: 'L3-Desk',
  L2: 'L2-Portfolio',
  L1: 'L1-LoB',
};

interface MetricDetailViewProps {
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

/** Dimensions at which this metric can be calculated. Defaults to all if not specified. */
function getAllowedDimensions(metric: L3Metric): CalculationDimension[] {
  if (metric.allowedDimensions && metric.allowedDimensions.length > 0) {
    return metric.allowedDimensions;
  }
  return [...CALCULATION_DIMENSIONS];
}

export default function MetricDetailView({ metric, onBack }: MetricDetailViewProps) {
  const allowedDimensions = getAllowedDimensions(metric);
  const [selectedDimension, setSelectedDimension] = useState<CalculationDimension>(allowedDimensions[0]);

  // Keep selected dimension in sync when metric changes or when it's no longer allowed
  useEffect(() => {
    if (allowedDimensions.includes(selectedDimension)) return;
    setSelectedDimension(allowedDimensions[0]);
  }, [metric.id, allowedDimensions, selectedDimension]);

  const [formulasFromApi, setFormulasFromApi] = useState<MetricDimensionFormulaApiRow[] | null>(null);
  useEffect(() => {
    fetch('/api/metrics-dimensions-filled', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { formulas?: MetricDimensionFormulaApiRow[] }) => setFormulasFromApi(data.formulas ?? null))
      .catch(() => setFormulasFromApi(null));
  }, []);

  const dimensionFormulaFromMetric = metric.formulasByDimension?.[selectedDimension];
  const matchKeys = [metric.id, metric.name].filter(Boolean).map(normalizeMatchKey);
  const dimensionFormulaFromApi = formulasFromApi
    ? formulasFromApi.find(
        (r) =>
          r.dimension === selectedDimension &&
          matchKeys.some((k) => k === normalizeMatchKey(String(r.metricId)))
      )
    : null;
  const dimensionFormulaFromStatic = getFormulaForDimension(metric.id, selectedDimension);
  const resolvedFormula = resolveFormulaForDimension(metric, selectedDimension, { allowLegacyFallback: true });
  const dimensionFormula = dimensionFormulaFromApi ?? dimensionFormulaFromMetric ?? dimensionFormulaFromStatic ?? resolvedFormula;
  const displayFormula = dimensionFormula?.formula ?? metric.formula;
  const displayFormulaSQL = dimensionFormula?.formulaSQL ?? metric.formulaSQL;
  const displayLaymanFormula = dimensionFormulaFromApi?.laymanFormula;
  const displayName = metric.displayNameByDimension?.[selectedDimension] ?? dimensionFormulaFromApi?.dashboardDisplayName ?? metric.name;
  const displayDescription = dimensionFormulaFromApi?.definition ?? metric.description;
  const displaySourceFields = dimensionFormulaFromApi?.sourceFields?.length ? dimensionFormulaFromApi.sourceFields : metric.sourceFields;
  const displayLineageNarrative = dimensionFormulaFromApi?.lineageNarrative;
  const withLineage = metricWithLineage(
    {
      ...metric,
      name: displayName,
      description: displayDescription,
      formula: displayFormula,
      formulaSQL: displayFormulaSQL,
      sourceFields: displaySourceFields,
    },
    selectedDimension
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:rounded"
          aria-label="Back to metrics list"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>
      </div>

      <header className="border-b border-white/10 pb-6 mb-6">
        <div className="flex items-start gap-4">
          <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 text-gray-400" aria-hidden>
            {METRIC_TYPE_ICON[metric.metricType]}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
                {metric.id}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">{displayName}</h1>
            {displayDescription && (
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">{displayDescription}</p>
            )}
            {/* Dimension selector: formula and lineage update when changed */}
            {allowedDimensions.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-white/[0.04] border border-white/10" role="group" aria-labelledby="dimension-label">
                <p id="dimension-label" className="text-xs font-medium text-gray-400 mb-2">
                  View formula at
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                  {allowedDimensions.map((dim) => (
                    <button
                      key={dim}
                      type="button"
                      onClick={() => setSelectedDimension(dim)}
                      aria-pressed={selectedDimension === dim}
                      aria-label={`Show formula at ${DIMENSION_BAR_LABELS[dim]} level`}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                        selectedDimension === dim
                          ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {DIMENSION_BAR_LABELS[dim]}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Formula and lineage below update for the selected level.
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Step 1: Inputs */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
          <span className="w-6 h-0.5 bg-gray-600 rounded" />
          Inputs (source fields)
        </h2>
        <div className="flex flex-wrap gap-2">
          {displaySourceFields.map((sf, i) => {
            const s = LAYER_STYLE[sf.layer];
            return (
              <div
                key={i}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${s.border} ${s.bg}`}
              >
                <span className={`text-[10px] font-bold ${s.text}`}>{sf.layer}</span>
                <span className="text-sm font-mono text-white">{sf.table}.{sf.field}</span>
                {sf.sampleValue && (
                  <span className="text-xs font-mono text-emerald-400">{sf.sampleValue}</span>
                )}
                {sf.description && (
                  <span className="text-[10px] text-gray-500 max-w-[200px] truncate" title={sf.description}>
                    {sf.description}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Step 2: Formula (for selected dimension) */}
      <section className="mb-8" aria-labelledby="formula-heading" role="region">
        <h2 id="formula-heading" className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2 flex-wrap">
          <span className="w-6 h-0.5 bg-gray-600 rounded" aria-hidden />
          Formula
          {allowedDimensions.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300 normal-case">
              {DIMENSION_BAR_LABELS[selectedDimension]}
            </span>
          )}
        </h2>
        <div className="bg-black/20 rounded-lg px-4 py-3 border border-white/5">
          <div className="text-sm font-mono text-purple-300 break-words">{displayFormula}</div>
          {displayLaymanFormula && (
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              In plain English: {displayLaymanFormula}
            </p>
          )}
          {displayFormulaSQL && (
            <div className="text-xs font-mono text-gray-500 mt-2 pt-2 border-t border-white/5 break-all">
              SQL: {displayFormulaSQL}
            </div>
          )}
          {allowedDimensions.length > 1 && (
            <p className="text-[11px] text-gray-500 mt-2 pt-2 border-t border-white/5">
              Use the dimension selector above to see the formula for another level.
            </p>
          )}
        </div>
      </section>

      {/* Step 3: Lineage */}
      {withLineage.nodes && withLineage.nodes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            Data lineage
          </h2>
          <div className="bg-black/10 rounded-lg p-4 border border-white/5">
            <LineageFlowView metric={withLineage} />
          </div>
          {displayLineageNarrative && (
            <details className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <summary className="cursor-pointer select-none text-xs text-gray-400 hover:text-gray-300">
                Show lineage notes
              </summary>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed whitespace-pre-wrap">
                {displayLineageNarrative}
              </p>
            </details>
          )}
        </section>
      )}

      {/* Dimensions */}
      {metric.dimensions && metric.dimensions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Dimensions in Dashboard</h2>
          <div className="flex flex-wrap gap-1.5">
            {metric.dimensions.map((d, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${DIM_STYLE[d.interaction]}`}
              >
                {DIMENSION_LABELS[d.dimension] || d.dimension} ({d.interaction})
              </span>
            ))}
          </div>
        </section>
      )}

      {metric.toggles && metric.toggles.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Toggles</h2>
          <div className="flex flex-wrap gap-1.5">
            {metric.toggles.map(t => (
              <span key={t} className="px-2 py-1 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300">
                {t}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
