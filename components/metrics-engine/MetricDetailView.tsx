'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Edit, Layers, Hash, TrendingUp, Grid3x3, Zap, AlertTriangle, Table2, Tag } from 'lucide-react';
import { DASHBOARD_PAGES, DIMENSION_LABELS } from '@/data/l3-metrics';
import { metricWithLineage } from '@/lib/lineage-generator';
import LineageFlowView from '@/components/lineage/LineageFlowView';
import type { L3Metric, MetricType, DimensionInteraction } from '@/data/l3-metrics';

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
  source: 'builtin' | 'custom';
  onEdit: () => void;
  onBack: () => void;
  onDuplicate: () => void;
}

export default function MetricDetailView({ metric, source, onEdit, onBack, onDuplicate }: MetricDetailViewProps) {
  const withLineage = metricWithLineage(metric);
  const pageInfo = DASHBOARD_PAGES.find(p => p.id === metric.page);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          aria-label="Back to metrics list"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={onDuplicate}
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium"
            title={source === 'builtin' ? 'Create an editable copy as a custom metric' : 'Create a copy with a new ID'}
          >
            <Copy className="w-3.5 h-3.5" />
            {source === 'builtin' ? 'Copy as custom' : 'Duplicate'}
          </button>
        </div>
      </div>

      {source === 'builtin' && (
        <p className="mb-4 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm">
          Edits are saved as your custom version (overriding the built-in). To revert to the original, delete this metric from the list.
        </p>
      )}
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
              {source === 'custom' && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Custom
                </span>
              )}
              {pageInfo && (
                <span className="text-[10px] text-gray-500" style={{ color: pageInfo.color }}>
                  {pageInfo.shortName} · {metric.section}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white mt-1">{metric.name}</h1>
            {metric.description && (
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">{metric.description}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold font-mono text-emerald-400">{metric.sampleValue || '—'}</div>
            <div className="text-[10px] text-gray-500">{metric.displayFormat || 'Value'}</div>
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
          {metric.sourceFields.map((sf, i) => {
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

      {/* Step 2: Formula */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
          <span className="w-6 h-0.5 bg-gray-600 rounded" />
          Formula
        </h2>
        <div className="bg-black/20 rounded-lg px-4 py-3 border border-white/5">
          <div className="text-sm font-mono text-purple-300">{metric.formula}</div>
          {metric.formulaSQL && (
            <div className="text-xs font-mono text-gray-500 mt-2 pt-2 border-t border-white/5">
              SQL: {metric.formulaSQL}
            </div>
          )}
        </div>
      </section>

      {/* Step 3: Result */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
          <span className="w-6 h-0.5 bg-gray-600 rounded" />
          Result
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-lg font-mono font-semibold text-emerald-400">{metric.sampleValue || '—'}</span>
          <span className="text-xs text-gray-500">({metric.displayFormat || 'display format'})</span>
        </div>
      </section>

      {/* Step 4: Lineage */}
      {withLineage.nodes && withLineage.nodes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            Data lineage
          </h2>
          <div className="bg-black/10 rounded-lg p-4 border border-white/5">
            <LineageFlowView metric={withLineage} />
          </div>
        </section>
      )}

      {/* Dimensions */}
      {metric.dimensions && metric.dimensions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Dimensions</h2>
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
