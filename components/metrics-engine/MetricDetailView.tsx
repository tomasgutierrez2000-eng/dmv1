'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Layers, Hash, TrendingUp, Grid3x3, Zap, AlertTriangle, Table2, Tag, BarChart3, Copy, Check, ExternalLink } from 'lucide-react';
import {
  DIMENSION_LABELS,
  CALCULATION_DIMENSIONS,
  CALCULATION_DIMENSION_LABELS,
  type CalculationDimension,
} from '@/data/l3-metrics';
import { metricWithLineage } from '@/lib/lineage-generator';
import { resolveFormulaForDimension } from '@/lib/metrics-calculation/formula-resolver';
import { getFormulaForDimension } from '@/data/metrics_dimensions_filled';
import LineageFlowView from '@/components/lineage/LineageFlowView';
import MetricValuesWidget from '@/components/dashboard/MetricValuesWidget';
import ConsumeApiIntegrationGuide from './ConsumeApiIntegrationGuide';
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

interface ConsumableDetail {
  id: string;
  name: string;
  description: string;
  allowedLevels: { dimension: CalculationDimension; label: string; level: string }[];
  exampleUrls: Record<string, string>;
  rollupSummary: string;
  displayFormat?: string;
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
  const [selectedDimension, setSelectedDimension] = useState<CalculationDimension>(
    allowedDimensions[0] ?? CALCULATION_DIMENSIONS[0]
  );

  // Keep selected dimension in sync when metric changes or when it's no longer allowed
  useEffect(() => {
    if (allowedDimensions.includes(selectedDimension)) return;
    setSelectedDimension(allowedDimensions[0] ?? CALCULATION_DIMENSIONS[0]);
  }, [metric.id, allowedDimensions, selectedDimension]);

  const [formulasFromApi, setFormulasFromApi] = useState<MetricDimensionFormulaApiRow[] | null>(null);
  useEffect(() => {
    fetch('/api/metrics-dimensions-filled', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { formulas?: MetricDimensionFormulaApiRow[] }) => setFormulasFromApi(data.formulas ?? null))
      .catch(() => setFormulasFromApi(null));
  }, []);

  const [showConsume, setShowConsume] = useState(false);
  const [consumableDetail, setConsumableDetail] = useState<ConsumableDetail | null>(null);
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [libraryLink, setLibraryLink] = useState<{ parentId: string; variantId: string } | null>(null);
  useEffect(() => {
    if (!metric.id) return;
    fetch(`/api/metrics/library/variants/by-executable/${encodeURIComponent(metric.id)}`, { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { variant?: { parent_metric_id: string; variant_id: string }; parent?: { metric_id: string } } | null) => {
        if (data?.variant?.parent_metric_id && data?.variant?.variant_id) {
          setLibraryLink({
            parentId: data.variant.parent_metric_id,
            variantId: data.variant.variant_id,
          });
        } else {
          setLibraryLink(null);
        }
      })
      .catch(() => setLibraryLink(null));
  }, [metric.id]);
  useEffect(() => {
    if (!showConsume || !metric.id) return;
    fetch(`/api/metrics/${encodeURIComponent(metric.id)}/consumable`, { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : null)
      .then((data: ConsumableDetail | null) => {
        setConsumableDetail(data ?? null);
        if (data?.allowedLevels?.length) {
          setSelectedLevels(new Set(data.allowedLevels.map((l) => l.level)));
        }
      })
      .catch(() => setConsumableDetail(null));
  }, [showConsume, metric.id]);

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };
  const exampleUrl = (() => {
    if (!consumableDetail?.exampleUrls || selectedLevels.size === 0) return '';
    const first = consumableDetail.allowedLevels.find((l) => selectedLevels.has(l.level));
    return first ? consumableDetail.exampleUrls[first.level] ?? '' : consumableDetail.exampleUrls[consumableDetail.allowedLevels[0]!.level] ?? '';
  })();
  const copySnippet = () => {
    const url = exampleUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/metrics/values?metricId=${encodeURIComponent(metric.id)}&level=facility&asOfDate=`;
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess('url');
      setTimeout(() => setCopySuccess(null), 2000);
    }).catch(() => { setCopySuccess(null); });
  };
  const widgetConfig = {
    metricId: metric.id,
    variantId: undefined as string | undefined,
    level: Array.from(selectedLevels)[0] || 'facility',
    displayFormat: metric.displayFormat,
  };
  const copyWidgetConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(widgetConfig, null, 2)).then(() => {
      setCopySuccess('widget');
      setTimeout(() => setCopySuccess(null), 2000);
    }).catch(() => { setCopySuccess(null); });
  };

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
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:rounded"
          aria-label="Back to metrics list"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>
        <div className="flex items-center gap-2">
          {libraryLink && (
            <Link
              href={`/metrics/library/${encodeURIComponent(libraryLink.parentId)}/${encodeURIComponent(libraryLink.variantId)}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              <Layers className="w-4 h-4" />
              View in Library
            </Link>
          )}
          <button
            type="button"
            onClick={() => setShowConsume((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            aria-expanded={showConsume}
          >
            <BarChart3 className="w-4 h-4" />
            {showConsume ? 'Hide' : 'Consume API'}
          </button>
        </div>
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
                      aria-label={`Show formula at ${CALCULATION_DIMENSION_LABELS[dim]} level`}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                        selectedDimension === dim
                          ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {CALCULATION_DIMENSION_LABELS[dim]}
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
              {CALCULATION_DIMENSION_LABELS[selectedDimension]}
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
        <section className="mb-8">
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

      {/* Consume this metric: variant + levels + API snippet */}
      {showConsume && (
        <section className="mb-8 p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20" aria-labelledby="consume-api-heading">
          <h2 id="consume-api-heading" className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90 mb-3 flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" />
            Consume API
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Choose a dimension and copy the API URL to consume this metric in your dashboard.
          </p>
          {consumableDetail && (
            <>
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Levels (select at least one)</p>
                <div className="flex flex-wrap gap-2">
                  {consumableDetail.allowedLevels.map(({ level, label }) => (
                    <label key={level} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLevels.has(level)}
                        onChange={() => toggleLevel(level)}
                        className="rounded border-gray-500 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                      />
                      <span className="text-sm text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mb-4 p-3 rounded-lg bg-black/20 border border-white/5">
                <p className="text-[10px] font-semibold uppercase text-gray-500 mb-1">Rollup</p>
                <p className="text-xs text-gray-400 leading-relaxed">{consumableDetail.rollupSummary}</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase text-gray-500 mb-1">API URL</p>
                  <code className="text-xs font-mono text-emerald-300/90 break-all block pr-2">
                    {exampleUrl || 'Select a level above'}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copySnippet}
                    disabled={!exampleUrl}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {copySuccess === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copySuccess === 'url' ? 'Copied' : 'Consume API'}
                  </button>
                  {exampleUrl && (
                    <a
                      href={exampleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      title="Open URL in new tab to see JSON response"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Try it
                    </a>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">
                Optional: add <code className="px-1 rounded bg-white/10">asOfDate=YYYY-MM-DD</code> or filter params (<code>facilityId</code>, <code>counterpartyId</code>, etc.) to the URL.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <p className="text-[10px] font-semibold uppercase text-gray-500">Widget config</p>
                <button
                  type="button"
                  onClick={copyWidgetConfig}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/10"
                >
                  {copySuccess === 'widget' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copySuccess === 'widget' ? 'Copied' : 'Copy config JSON'}
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[10px] font-semibold uppercase text-gray-500 mb-2">Live preview (from API)</p>
                <MetricValuesWidget
                  config={
                    selectedLevels.size > 0
                      ? {
                          metricId: metric.id,
                          level: Array.from(selectedLevels)[0] as 'facility' | 'counterparty' | 'desk' | 'portfolio' | 'lob',
                        }
                      : null
                  }
                  maxRows={5}
                />
              </div>
              <details className="mt-4 pt-4 border-t border-white/10 group">
                <summary className="cursor-pointer list-none flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 rounded py-1">
                  <span className="inline-block transition-transform group-open:rotate-90" aria-hidden>▶</span>
                  Dashboard integration guide (copy-paste snippets)
                </summary>
                <div className="mt-3 pl-4 border-l-2 border-emerald-500/20">
                  <ConsumeApiIntegrationGuide
                    valuesApiBaseUrl={typeof window !== 'undefined' ? `${window.location.origin}/api/metrics/values` : ''}
                    singleMetricExample={{
                      metricId: metric.id,
                      level: Array.from(selectedLevels)[0] || 'facility',
                    }}
                  />
                </div>
              </details>
            </>
          )}
          {showConsume && !consumableDetail && (
            <p className="text-sm text-gray-500">Loading consumable options…</p>
          )}
        </section>
      )}
    </div>
  );
}
