'use client';

import React, { useMemo, useState } from 'react';
import type { MetricVariant } from '@/lib/metric-library/types';
import type { LineageNodeRef, LineageDataTier } from '@/lib/metric-library/types';

/** Normalized node for layout: id, display name, tier, optional table.field, description. */
interface LineageNode {
  id: string;
  name: string;
  tier: LineageDataTier | 'transform' | 'this' | 'downstream';
  table?: string;
  field?: string;
  description?: string;
  formula?: string;
}

const TIER_STYLE: Record<string, { bg: string; border: string; badge: string; label: string }> = {
  L1:          { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-800',   label: 'L1 Reference' },
  L2:          { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-800',  label: 'L2 Snapshot' },
  L3:          { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800', label: 'L3 Derived' },
  EXTERNAL:    { bg: 'bg-slate-100', border: 'border-slate-300', badge: 'bg-slate-200 text-slate-700', label: 'External' },
  transform:   { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800', label: 'Formula' },
  this:        { bg: 'bg-indigo-100', border: 'border-indigo-300', badge: 'bg-indigo-200 text-indigo-900', label: 'This Metric' },
  downstream:  { bg: 'bg-teal-50',  border: 'border-teal-200',  badge: 'bg-teal-100 text-teal-800',  label: 'Downstream' },
};

function normalizeUpstream(ref: LineageNodeRef | string): LineageNode {
  if (typeof ref === 'string') {
    return {
      id: `u-${ref.replace(/\W/g, '-').slice(0, 40)}`,
      name: ref,
      tier: 'L2', // default: treat as L2 when no structure
    };
  }
  const name = ref.node_name ?? 'Unknown';
  const tier: LineageNode['tier'] =
    ref.data_tier ?? (ref.node_type === 'EXTERNAL_SYSTEM' || ref.node_type === 'REFERENCE_DATA' ? 'EXTERNAL' : ref.node_type === 'METRIC_VARIANT' ? 'L3' : 'L2');
  return {
    id: ref.node_id || `u-${name.replace(/\W/g, '-').slice(0, 40)}`,
    name,
    tier,
    table: ref.table,
    field: ref.field,
    description: ref.description,
  };
}

function normalizeDownstream(ref: LineageNodeRef | string): LineageNode {
  if (typeof ref === 'string') {
    return {
      id: `d-${ref.replace(/\W/g, '-').slice(0, 40)}`,
      name: ref,
      tier: 'downstream',
    };
  }
  const name = ref.node_name ?? 'Unknown';
  return {
    id: ref.node_id || `d-${name.replace(/\W/g, '-').slice(0, 40)}`,
    name,
    tier: 'downstream',
    description: ref.description,
  };
}

/** Build nodes and column layout for the flow. For CALCULATED/HYBRID: L1 → L2 → Formula → This Metric → Downstream. For SOURCED: External → This Metric → Downstream. */
function buildLineage(v: MetricVariant): { nodes: LineageNode[]; columns: LineageNode[][] } {
  const upstreamRaw = (Array.isArray(v.upstream_inputs) ? v.upstream_inputs : []).filter(
    (x): x is string | LineageNodeRef => x != null && (typeof x === 'string' || (typeof x === 'object' && 'node_name' in x))
  );
  const downstreamRaw = (Array.isArray(v.downstream_consumers) ? v.downstream_consumers : []).filter(
    (x): x is string | LineageNodeRef => x != null && (typeof x === 'string' || (typeof x === 'object' && 'node_name' in x))
  );
  const isSourced = v.variant_type === 'SOURCED';

  const nodes: LineageNode[] = [];
  const upstreamNodes = upstreamRaw.map(normalizeUpstream);
  const downstreamNodes = downstreamRaw.map(normalizeDownstream);

  const thisNode: LineageNode = {
    id: 'this-metric',
    name: v.variant_name,
    tier: 'this',
    description: v.detailed_description ?? undefined,
    formula: v.formula_display,
  };

  // Transform node (formula) only for non-sourced
  let transformNode: LineageNode | null = null;
  if (!isSourced && (v.formula_display || upstreamNodes.length > 0)) {
    transformNode = {
      id: 'transform-formula',
      name: 'Calculation',
      tier: 'transform',
      formula: v.formula_display,
      description: 'Built from atomic and snapshot data above.',
    };
  }

  nodes.push(...upstreamNodes);
  if (transformNode) nodes.push(transformNode);
  nodes.push(thisNode);
  nodes.push(...downstreamNodes);

  // Group by tier for column layout
  const colOrder: (LineageNode['tier'])[] = isSourced
    ? ['EXTERNAL', 'this', 'downstream']
    : ['L1', 'L2', 'L3', 'transform', 'this', 'downstream'];
  const columns: LineageNode[][] = colOrder.map((tier) => nodes.filter((n) => n.tier === tier)).filter((col) => col.length > 0);

  return { nodes, columns };
}

export default function MetricLibraryLineageView({ variant }: { variant: MetricVariant }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { nodes, columns } = useMemo(() => buildLineage(variant), [variant]);
  const isSourced = variant.variant_type === 'SOURCED';

  const hasLineage = nodes.length > 1 || (nodes.length === 1 && nodes[0].id !== 'this-metric');
  if (!hasLineage) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-6 text-center text-gray-500">
        <p className="text-sm">No lineage defined for this variant.</p>
        <p className="mt-1 text-xs">Add upstream_inputs and downstream_consumers (with optional data_tier: L1, L2, L3, EXTERNAL) to show how this metric is built from atomic data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {isSourced
          ? 'This metric is sourced from an external system or reference data. Data flows into this variant and is consumed by the items below.'
          : 'This metric is calculated from L1/L2 atomic and snapshot data. The flow below shows how inputs are combined by the formula to produce this metric.'}
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-6 shadow-sm relative" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
        <div className="flex items-stretch gap-4 min-w-max">
          {columns.map((col, colIndex) => (
            <React.Fragment key={colIndex}>
              <div className="flex flex-col gap-3 min-w-[180px] max-w-[220px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {col[0]?.tier === 'L1' && 'L1 Atomic Data'}
                  {col[0]?.tier === 'L2' && 'L2 Snapshot / Attribution'}
                  {col[0]?.tier === 'L3' && 'L3 Derived Inputs'}
                  {col[0]?.tier === 'EXTERNAL' && 'Source / External'}
                  {col[0]?.tier === 'transform' && 'Formula'}
                  {col[0]?.tier === 'this' && 'This Metric'}
                  {col[0]?.tier === 'downstream' && 'Downstream Consumers'}
                </div>
                {col.map((node) => {
                  const style = TIER_STYLE[node.tier] ?? TIER_STYLE.L2;
                  const isHovered = hoveredId === node.id;
                  const isThis = node.tier === 'this';
                  return (
                    <div
                      key={node.id}
                      className={`rounded-lg border px-3 py-2.5 transition-all duration-150 ${style.bg} ${style.border} ${isHovered ? 'ring-2 ring-indigo-400 ring-offset-1 shadow-md' : ''} ${isThis ? 'ring-1 ring-indigo-300' : ''}`}
                      onMouseEnter={() => setHoveredId(node.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[9px] font-semibold px-1.5 py-px rounded ${style.badge}`}>
                          {style.label}
                        </span>
                        {node.table && (
                          <span className="text-[9px] text-gray-500 truncate font-mono" title={node.table}>
                            {node.table}
                            {node.field ? `.${node.field}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-900 truncate" title={node.name}>
                        {node.name}
                      </div>
                      {node.formula && (
                        <div className="mt-1.5 text-xs font-mono text-purple-700 bg-purple-50/80 rounded px-2 py-1 break-all" title={node.formula}>
                          {node.formula}
                        </div>
                      )}
                      {node.description && (isHovered || isThis) && (
                        <div className="mt-1.5 text-[11px] text-gray-600 leading-snug line-clamp-2">
                          {node.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {colIndex < columns.length - 1 && (
                <div className="flex flex-col justify-center flex-shrink-0" aria-hidden>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300">
                    <path d="M9 12h6m-3-3l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {columns.length > 3 && (
        <p className="text-xs text-gray-400 text-right mt-1">Scroll horizontally to see the full lineage</p>
      )}

      {!isSourced && (variant.numerator_field_refs?.length ?? 0) + (variant.denominator_field_refs?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Field references (L1/L2)</h3>
          <div className="flex flex-wrap gap-2">
            {variant.numerator_field_refs?.map((f, i) => (
              <span key={`num-${i}`} className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {f} <span className="text-blue-600">(numerator)</span>
              </span>
            ))}
            {variant.denominator_field_refs?.map((f, i) => (
              <span key={`den-${i}`} className="text-xs font-mono bg-amber-100 text-amber-800 px-2 py-1 rounded">
                {f} <span className="text-amber-600">(denominator)</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
