'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Calculator,
  Database,
  Layers,
  Link2,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Search,
  Zap,
  Eye,
  ArrowDown,
  Play,
  Pause,
  ShieldCheck,
  Users,
  Sparkles,
  BarChart3,
  TrendingUp,
  Info,
  Workflow,
  RefreshCw,
  PieChart,
  FolderTree,
  Briefcase,
  Copy,
  Check,
} from 'lucide-react';

import type { StepType, TierSourceConfig, LineageStep, JoinChainData, SourceTableMeta } from '../lineage-types';
import type {
  ComponentMeta,
  FKRelationship,
  L1TableDef,
  QueryPlanStep,
  FlowStep,
  AuditTrailNode,
  BreadcrumbStep,
  JoinNode,
  JoinEdge,
  FacilityLTVData,
  RollupLevel,
} from './ltv-lineage-data';
import {
  FACILITY_DATA,
  COUNTERPARTY_WEIGHTED_LTV,
  LTV_BUCKETS,
  ROLLUP_LEVELS,
  BREADCRUMB_STEPS,
  FK_RELATIONSHIPS,
  L1_TABLES,
  L2_FIELD_META,
  LTV_NUMERATOR_COMPONENTS,
  LTV_DENOMINATOR_COMPONENTS,
  LTV_WEIGHT_COMPONENTS,
  JOIN_NODES,
  JOIN_EDGES,
  ROLLUP_JOIN_CHAINS,
  QUERY_PLAN_STEPS,
  LTV_FLOW_STEPS,
  AUDIT_TRAIL,
  TIER_STEP_CONFIGS,
} from './ltv-lineage-data';

/* ────────────────────────────────────────────────────────────────────────────
 * FORMATTING HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

export function fmtDollar(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP TYPE BADGE — the core new UI primitive
 * ──────────────────────────────────────────────────────────────────────────── */

const STEP_TYPE_CONFIG: Record<StepType, { bg: string; text: string; border: string; icon: React.ElementType; label: string }> = {
  SOURCING: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30', icon: Database, label: 'Sourcing' },
  CALCULATION: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', icon: Calculator, label: 'Calculation' },
  HYBRID: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', icon: Zap, label: 'Hybrid' },
};

export function StepTypeBadge({ type, size = 'sm' }: { type: StepType; size?: 'sm' | 'xs' }) {
  const c = STEP_TYPE_CONFIG[type];
  const Icon = c.icon;
  const textSize = size === 'xs' ? 'text-[8px]' : 'text-[9px]';
  const iconSize = size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  return (
    <span className={`inline-flex items-center gap-1 ${textSize} font-bold px-1.5 py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`}>
      <Icon className={`${iconSize} flex-shrink-0`} aria-hidden="true" />
      {c.label}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * TIER BADGE
 * ──────────────────────────────────────────────────────────────────────────── */

const tierMeta: Record<string, { label: string; bg: string; text: string; border: string }> = {
  T1: { label: 'T1 · Always Source', bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
  T2: { label: 'T2 · Source + Validate', bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  T3: { label: 'T3 · Always Calculate', bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
};

export function TierBadge({ tier }: { tier: string }) {
  const m = tierMeta[tier] || tierMeta.T3;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border ${m.bg} ${m.text} ${m.border}`}>
      <ShieldCheck className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
      {m.label}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION HEADING
 * ──────────────────────────────────────────────────────────────────────────── */

export function SectionHeading({
  id, icon: Icon, step, layerColor, title, subtitle,
}: {
  id: string; icon: React.ElementType; step: string; layerColor: string; title: string; subtitle: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-5 rounded-full ${layerColor}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{step}</span>
      </div>
      <h2 id={id} className="text-base font-bold text-white flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-500" aria-hidden="true" />
        {title}
      </h2>
      <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FLOW ARROW
 * ──────────────────────────────────────────────────────────────────────────── */

export function FlowArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-3 px-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.02] border border-gray-800/50">
        <ArrowDown className="w-3 h-3 text-gray-600" aria-hidden="true" />
        <span className="text-[9px] text-gray-600 font-medium">{label}</span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * INSIGHT CALLOUT & PLAIN ENGLISH
 * ──────────────────────────────────────────────────────────────────────────── */

export function InsightCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.03] p-4 mt-4">
      <div className="flex items-start gap-2.5">
        <Eye className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-gray-400 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function PlainEnglish({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-gray-800/30">
      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mr-1.5">Plain English:</span>
      <span className="text-[10px] text-gray-400 leading-relaxed">{children}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * COMPONENT ROW — X-Ray mode for formula inputs
 * ──────────────────────────────────────────────────────────────────────────── */

function ComponentRow({ meta, op }: { meta: ComponentMeta; op: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b border-gray-800/30 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-[10px] font-bold text-teal-400 w-4">{op}</span>
        <code className="text-xs font-mono text-amber-300 flex-1">{meta.field}</code>
        <StepTypeBadge type={meta.stepType} size="xs" />
        <span className="text-[10px] text-gray-600 font-mono">{meta.table}</span>
        <ChevronDown className={`w-3 h-3 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mx-3 mb-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-3 space-y-2 text-[10px]">
          <div className="grid grid-cols-[80px_1fr] gap-1.5">
            <span className="text-gray-600 font-bold uppercase">Type</span>
            <code className="text-gray-400 font-mono">{meta.type}</code>
            <span className="text-gray-600 font-bold uppercase">Desc</span>
            <span className="text-gray-400">{meta.desc}</span>
            {meta.where && (
              <>
                <span className="text-gray-600 font-bold uppercase">WHERE</span>
                <code className="text-purple-300 font-mono">{meta.where}</code>
              </>
            )}
            {meta.fk && (
              <>
                <span className="text-gray-600 font-bold uppercase">FK</span>
                <code className="text-blue-300 font-mono">{meta.fk}</code>
              </>
            )}
            <span className="text-gray-600 font-bold uppercase">Sample</span>
            <span className="text-emerald-400 font-mono font-bold">{meta.sampleValue}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 1: METRIC DEFINITION CARD
 * ──────────────────────────────────────────────────────────────────────────── */

export function MetricDefinitionCard() {
  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-teal-500/15 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">LTV (Loan-to-Value %)</h3>
          <code className="text-[10px] font-mono text-teal-300">ltv_pct</code>
        </div>
        <div className="ml-auto"><TierBadge tier="T2" /></div>
      </div>

      {/* Formula bar */}
      <div className="bg-black/30 rounded-lg p-3 mb-4">
        <div className="text-xs font-mono text-teal-400 text-center">
          LTV = drawn_amount {'/'} SUM(collateral_value)
        </div>
        <div className="text-[9px] text-gray-600 text-center mt-1">
          Rollup: <strong className="text-gray-400">Exposure-Weighted Average</strong> at all levels above facility {'·'} Display: percentage
        </div>
      </div>

      {/* Numerator / Denominator / Weight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Numerator */}
        <div className="rounded-lg border border-teal-500/20 bg-teal-500/[0.03] p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-teal-300">Numerator: Drawn Amount</span>
            <StepTypeBadge type="SOURCING" size="xs" />
          </div>
          <div className="text-[10px] text-gray-500 mb-2">The outstanding loan balance</div>
          <div className="rounded-lg border border-gray-800 bg-black/20 overflow-hidden">
            {LTV_NUMERATOR_COMPONENTS.map((c) => (
              <ComponentRow key={c.field} meta={c} op="=" />
            ))}
          </div>
        </div>

        {/* Denominator */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-amber-300">Denominator: Collateral Value</span>
            <StepTypeBadge type="HYBRID" size="xs" />
          </div>
          <div className="text-[10px] text-gray-500 mb-2">SUM of all pledged collateral items</div>
          <div className="rounded-lg border border-gray-800 bg-black/20 overflow-hidden">
            {LTV_DENOMINATOR_COMPONENTS.map((c) => (
              <ComponentRow key={c.field} meta={c} op="=" />
            ))}
          </div>
        </div>

        {/* Weight */}
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-emerald-300">Weight: Gross Exposure</span>
            <StepTypeBadge type="SOURCING" size="xs" />
          </div>
          <div className="text-[10px] text-gray-500 mb-2">Used for rollup weighting</div>
          <div className="rounded-lg border border-gray-800 bg-black/20 overflow-hidden">
            {LTV_WEIGHT_COMPONENTS.map((c) => (
              <ComponentRow key={c.field} meta={c} op="w" />
            ))}
          </div>
        </div>
      </div>

      {/* Collateral sourcing callout */}
      <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-3">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-amber-300 mb-1">HYBRID Step: Collateral Aggregation</div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Unlike most metric inputs that are read directly from a single row, collateral values require
              a <strong className="text-amber-300">subquery aggregation</strong>. A facility may be secured by multiple
              collateral items (real estate, equipment, cash deposits, guarantees). The engine runs{' '}
              <code className="text-purple-300">SUM(current_valuation_usd) GROUP BY facility_id</code>{' '}
              before the LTV division can occur. This makes it a <strong className="text-amber-300">HYBRID</strong> step:
              both sourcing (reading N rows) and calculation (SUM aggregation).
            </p>
          </div>
        </div>
      </div>

      {/* Source table chips */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-2">Source Tables</div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { name: 'facility_master', layer: 'L1', color: 'blue' },
            { name: 'counterparty', layer: 'L1', color: 'blue' },
            { name: 'collateral_asset_master', layer: 'L1', color: 'blue' },
            { name: 'enterprise_business_taxonomy', layer: 'L1', color: 'blue' },
            { name: 'facility_exposure_snapshot', layer: 'L2', color: 'amber' },
            { name: 'collateral_snapshot', layer: 'L2', color: 'amber' },
          ].map((t) => (
            <span key={t.name} className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
              t.color === 'blue' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
            }`}>
              {t.layer}.{t.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 2: INTERACTIVE JOIN MAP
 * ──────────────────────────────────────────────────────────────────────────── */

const nodeColor: Record<string, { fill: string; stroke: string; text: string }> = {
  blue: { fill: '#1e3a5f', stroke: '#3b82f6', text: '#93c5fd' },
  amber: { fill: '#4a3520', stroke: '#f59e0b', text: '#fcd34d' },
  purple: { fill: '#3b1f5e', stroke: '#a855f7', text: '#c4b5fd' },
  emerald: { fill: '#1a3a2a', stroke: '#10b981', text: '#6ee7b7' },
};

export function InteractiveJoinMap() {
  const [hovered, setHovered] = useState<string | null>(null);

  const isHighlighted = (nodeId: string) => {
    if (!hovered) return true;
    if (nodeId === hovered) return true;
    return JOIN_EDGES.some(e => (e.from === hovered && e.to === nodeId) || (e.to === hovered && e.from === nodeId));
  };

  const isEdgeHighlighted = (edge: JoinEdge) => {
    if (!hovered) return true;
    return edge.from === hovered || edge.to === hovered;
  };

  const getNodePos = (id: string) => {
    const n = JOIN_NODES.find(n => n.id === id);
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-4 overflow-x-auto">
      <svg viewBox="0 0 880 320" className="w-full min-w-[700px]" style={{ maxHeight: 320 }}>
        {/* Layer labels */}
        {[
          { label: 'L1 Reference', x: 80, color: '#3b82f6' },
          { label: 'L2 Snapshot', x: 330, color: '#f59e0b' },
          { label: 'Transform', x: 560, color: '#a855f7' },
          { label: 'L3 Output', x: 770, color: '#10b981' },
        ].map(l => (
          <text key={l.label} x={l.x} y={20} fill={l.color} fontSize={10} fontWeight="bold" textAnchor="middle" opacity={0.6}>
            {l.label}
          </text>
        ))}

        {/* Edges */}
        {JOIN_EDGES.map((edge, i) => {
          const from = getNodePos(edge.from);
          const to = getNodePos(edge.to);
          const highlighted = isEdgeHighlighted(edge);
          return (
            <g key={i} opacity={highlighted ? 1 : 0.15}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={highlighted ? '#6b7280' : '#374151'} strokeWidth={highlighted ? 1.5 : 0.5} strokeDasharray={highlighted ? 'none' : '4 4'} />
              <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 5} fill="#6b7280" fontSize={7} textAnchor="middle">{edge.label}</text>
            </g>
          );
        })}

        {/* Nodes */}
        {JOIN_NODES.map(node => {
          const c = nodeColor[node.color];
          const highlighted = isHighlighted(node.id);
          const w = node.layer === 'Transform' ? 160 : 150;
          const lines = node.label.split('\n');
          const h = lines.length > 1 ? 36 : 28;
          return (
            <g key={node.id} opacity={highlighted ? 1 : 0.2} onMouseEnter={() => setHovered(node.id)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
              <rect x={node.x - w / 2} y={node.y - h / 2} width={w} height={h} rx={6} fill={c.fill} stroke={c.stroke} strokeWidth={highlighted ? 1.5 : 0.5} />
              {lines.map((line, li) => (
                <text key={li} x={node.x} y={node.y + (li - (lines.length - 1) / 2) * 11 + 3} fill={c.text} fontSize={lines.length > 1 ? 7.5 : 9} fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FK EXPLORER
 * ──────────────────────────────────────────────────────────────────────────── */

export function FKExplorer() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-bold text-white">FK Relationships ({FK_RELATIONSHIPS.length})</span>
        <span className="text-[9px] text-gray-600">Click any to see why this join exists</span>
      </div>
      <div className="space-y-1">
        {FK_RELATIONSHIPS.map((fk, i) => (
          <div key={i}>
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[10px] transition-colors ${
                expanded === i ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/[0.02] border border-transparent'
              }`}
            >
              <code className="font-mono text-amber-300">{fk.from}</code>
              <span className="text-gray-600">{'→'}</span>
              <code className="font-mono text-blue-300">{fk.to}</code>
              <span className="text-gray-700 ml-1">ON</span>
              <code className="font-mono text-emerald-400">{fk.joinKey}</code>
              <ChevronDown className={`w-3 h-3 text-gray-600 ml-auto transition-transform ${expanded === i ? 'rotate-180' : ''}`} />
            </button>
            {expanded === i && (
              <div className="ml-6 mt-1 mb-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.03] p-3 space-y-1.5">
                <div className="text-[10px] text-gray-400">{fk.why}</div>
                <div className="text-[9px] text-gray-600"><span className="font-bold uppercase">Cardinality:</span> {fk.cardinality}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * L1 TABLES
 * ──────────────────────────────────────────────────────────────────────────── */

function ExpandableTableCard({ table }: { table: L1TableDef }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
        <Database className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-blue-300 font-bold">{table.tableName}</code>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{table.scd}</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5 truncate">{table.role}</div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {expanded && (
        <div className="border-t border-gray-800/30 px-4 py-3 space-y-3">
          <div className="rounded-lg bg-black/30 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[9px] font-bold uppercase tracking-wider text-gray-600 px-3 py-1.5 bg-white/[0.03]">
              <div>Column</div><div>Type</div><div>Key</div>
            </div>
            {table.columns.map(col => (
              <div key={col.name} className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] px-3 py-1.5 border-t border-gray-800/20">
                <code className="font-mono text-gray-300">{col.name}</code>
                <code className="font-mono text-gray-600">{col.type}</code>
                <div className="flex gap-1">
                  {col.pk && <span className="text-[8px] px-1 rounded bg-yellow-500/10 text-yellow-400">PK</span>}
                  {col.fk && <span className="text-[8px] px-1 rounded bg-blue-500/10 text-blue-400" title={col.fk}>FK</span>}
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1">Sample Row</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(table.sampleRow).map(([k, v]) => (
                <div key={k} className="text-[10px]">
                  <span className="text-gray-600">{k}=</span>
                  <span className="text-emerald-400 font-mono">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function L1Tables() {
  return (
    <div className="space-y-2">
      {L1_TABLES.map(t => <ExpandableTableCard key={t.tableName} table={t} />)}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * L2 FIELD TABLE
 * ──────────────────────────────────────────────────────────────────────────── */

export function L2FieldTable() {
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const renderFields = (tableName: string, fields: string[]) => (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-3 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-3.5 h-3.5 text-amber-400" />
        <code className="text-xs font-mono text-amber-300 font-bold">L2.{tableName}</code>
      </div>
      <div className="rounded-lg border border-gray-800 bg-black/20 overflow-hidden">
        {fields.map(fieldKey => {
          const meta = L2_FIELD_META[fieldKey];
          if (!meta) return null;
          const isExpanded = expandedField === fieldKey;
          return (
            <div key={fieldKey} className="border-b border-gray-800/20 last:border-0">
              <button
                onClick={() => setExpandedField(isExpanded ? null : fieldKey)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.02]"
              >
                <code className="text-[10px] font-mono text-amber-300 flex-1">{meta.field}</code>
                <StepTypeBadge type={meta.stepType} size="xs" />
                <code className="text-[9px] font-mono text-gray-600">{meta.type}</code>
                <Eye className="w-3 h-3 text-gray-600" />
              </button>
              {isExpanded && (
                <div className="mx-3 mb-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-2.5 space-y-1.5 text-[10px]">
                  <div><span className="text-gray-600 font-bold">DESC: </span><span className="text-gray-400">{meta.desc}</span></div>
                  {meta.where && <div><span className="text-gray-600 font-bold">WHERE: </span><code className="text-purple-300">{meta.where}</code></div>}
                  {meta.fk && <div><span className="text-gray-600 font-bold">FK: </span><code className="text-blue-300">{meta.fk}</code></div>}
                  <div><span className="text-gray-600 font-bold">SAMPLE: </span><span className="text-emerald-400 font-mono">{meta.sampleValue}</span></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      {renderFields('facility_exposure_snapshot', [
        'facility_exposure_snapshot.drawn_amount',
        'facility_exposure_snapshot.gross_exposure_usd',
        'facility_exposure_snapshot.facility_id',
        'facility_exposure_snapshot.as_of_date',
      ])}
      {renderFields('collateral_snapshot', [
        'collateral_snapshot.current_valuation_usd',
        'collateral_snapshot.facility_id',
        'collateral_snapshot.collateral_asset_id',
        'collateral_snapshot.as_of_date',
      ])}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * QUERY PLAN VIEW
 * ──────────────────────────────────────────────────────────────────────────── */

export function QueryPlanView() {
  const [showSql, setShowSql] = useState<number | null>(null);
  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-4">
      <div className="space-y-2">
        {QUERY_PLAN_STEPS.map((step) => (
          <div key={step.step} className="rounded-lg border border-gray-800 bg-black/20 overflow-hidden">
            <button onClick={() => setShowSql(showSql === step.step ? null : step.step)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
              <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-400 flex-shrink-0">{step.step}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">{step.action}</span>
                  <StepTypeBadge type={step.stepType} size="xs" />
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">{step.tables.join(', ')}</div>
              </div>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${step.layer === 'L2' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : step.layer === 'Calc' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                {step.layer}
              </span>
              <ChevronDown className={`w-3 h-3 text-gray-600 transition-transform ${showSql === step.step ? 'rotate-180' : ''}`} />
            </button>
            {showSql === step.step && (
              <div className="border-t border-gray-800/30 px-4 py-3">
                <pre className="text-[10px] font-mono text-purple-300 whitespace-pre-wrap leading-relaxed">{step.sql}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FACILITY CALC TABLE — shows LTV for each facility with collateral breakdown
 * ──────────────────────────────────────────────────────────────────────────── */

export function FacilityCalcTable() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 text-[9px] font-bold uppercase tracking-wider text-gray-600 px-4 py-2 bg-white/[0.03]">
        <div>Facility</div><div className="text-right">Drawn</div><div className="text-right">Collateral</div><div className="text-right">LTV</div>
      </div>
      {FACILITY_DATA.map(f => (
        <div key={f.facilityId} className="border-t border-gray-800/30">
          <button onClick={() => setExpanded(expanded === f.facilityId ? null : f.facilityId)} className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors">
            <div>
              <div className="text-xs text-white font-medium">{f.facilityName}</div>
              <div className="text-[10px] text-gray-500">{f.facilityId} {'·'} {f.collateralItems.length} collateral item{f.collateralItems.length > 1 ? 's' : ''}</div>
            </div>
            <div className="text-xs font-mono text-gray-300 text-right">{fmtDollar(f.drawnAmount)}</div>
            <div className="text-xs font-mono text-gray-300 text-right">{fmtDollar(f.totalCollateralValue)}</div>
            <div className={`text-xs font-mono font-bold text-right ${f.ltv > 0.8 ? 'text-red-400' : f.ltv > 0.7 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {fmtPct(f.ltv)}
            </div>
          </button>
          {expanded === f.facilityId && (
            <div className="px-4 pb-3 space-y-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Collateral Breakdown (HYBRID: SUM aggregation)</div>
              <div className="rounded-lg bg-black/30 overflow-hidden">
                {f.collateralItems.map(ci => (
                  <div key={ci.collateralId} className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800/20 last:border-0 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{ci.collateralId}</span>
                      <span className="text-gray-300">{ci.type}</span>
                    </div>
                    <span className="font-mono text-amber-300">{fmtDollar(ci.valuation)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] text-[10px] font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300">SUM</span>
                    <StepTypeBadge type="HYBRID" size="xs" />
                  </div>
                  <span className="font-mono text-amber-300">{fmtDollar(f.totalCollateralValue)}</span>
                </div>
              </div>
              <div className="bg-black/30 rounded-lg p-2.5">
                <div className="text-[10px] font-mono text-center">
                  <span className="text-gray-400">LTV = </span>
                  <span className="text-teal-400">{fmtDollar(f.drawnAmount)}</span>
                  <span className="text-gray-400"> / </span>
                  <span className="text-amber-300">{fmtDollar(f.totalCollateralValue)}</span>
                  <span className="text-gray-400"> = </span>
                  <span className={`font-bold ${f.ltv > 0.8 ? 'text-red-400' : f.ltv > 0.7 ? 'text-amber-400' : 'text-emerald-400'}`}>{fmtPct(f.ltv)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      {/* Counterparty weighted */}
      <div className="border-t-2 border-gray-700 px-4 py-3 bg-white/[0.03]">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white">Counterparty Weighted LTV</span>
            <span className="text-[10px] text-gray-500 ml-2">SUM(LTV {'×'} exposure) / SUM(exposure)</span>
          </div>
          <span className="text-sm font-black font-mono text-teal-400">{fmtPct(COUNTERPARTY_WEIGHTED_LTV)}</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * ANIMATED DATA FLOW
 * ──────────────────────────────────────────────────────────────────────────── */

export function AnimatedDataFlow() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const advance = useCallback(() => {
    setStep(s => {
      if (s >= LTV_FLOW_STEPS.length - 1) { setPlaying(false); return s; }
      return s + 1;
    });
  }, []);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(advance, 1800);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [playing, advance]);

  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => { setStep(0); setPlaying(true); }} className="px-3 py-1 rounded-full bg-teal-500/15 text-teal-300 text-[10px] font-bold border border-teal-500/30 hover:bg-teal-500/25 transition-colors flex items-center gap-1.5">
          <Play className="w-3 h-3" /> Play
        </button>
        <button onClick={() => setPlaying(false)} className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-[10px] font-bold border border-gray-700 hover:bg-white/10 transition-colors flex items-center gap-1.5" disabled={!playing}>
          <Pause className="w-3 h-3" /> Pause
        </button>
        <span className="text-[9px] text-gray-600 ml-2">Step {step + 1} of {LTV_FLOW_STEPS.length}</span>
      </div>
      <div className="space-y-1.5">
        {LTV_FLOW_STEPS.map((s, i) => {
          const visible = i <= step;
          const active = i === step;
          return (
            <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500 ${visible ? (active ? 'bg-teal-500/10 border border-teal-500/20' : 'bg-white/[0.02] border border-transparent') : 'opacity-0 translate-y-2'}`}>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${s.color === 'amber' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : s.color === 'blue' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : s.color === 'purple' ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'}`}>{s.layer}</span>
              <StepTypeBadge type={s.stepType} size="xs" />
              <span className="text-[10px] text-gray-300 flex-1">{s.action}</span>
              <span className="text-[10px] font-mono font-bold text-teal-400">{s.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * ENHANCED ROLLUP PYRAMID — with source tables alongside each tier
 * ──────────────────────────────────────────────────────────────────────────── */

function SourceTableSideCard({ table }: { table: SourceTableMeta }) {
  const isL1 = table.layer === 'L1';
  const borderColor = isL1 ? 'border-blue-500/20' : 'border-amber-500/20';
  const bgColor = isL1 ? 'bg-blue-500/[0.04]' : 'bg-amber-500/[0.04]';
  const textColor = isL1 ? 'text-blue-300' : 'text-amber-300';
  const layerBg = isL1 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-2 text-[9px]`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`px-1 py-0.5 rounded border text-[7px] font-bold ${layerBg}`}>{table.layer}</span>
        <code className={`font-mono font-bold ${textColor}`}>{table.alias || table.table}</code>
      </div>
      <div className="space-y-0.5">
        {table.fieldsUsed.slice(0, 3).map(f => (
          <div key={f.field} className="flex items-center gap-1 text-[8px]">
            <code className="font-mono text-gray-400">.{f.field}</code>
            {f.metricRole && <span className="text-gray-600">({f.metricRole})</span>}
          </div>
        ))}
        {table.fieldsUsed.length > 3 && <div className="text-gray-600">+{table.fieldsUsed.length - 3} more</div>}
      </div>
      {table.aggregation && (
        <div className="mt-1 pt-1 border-t border-white/5 flex items-center gap-1">
          <StepTypeBadge type="HYBRID" size="xs" />
          <span className="text-[7px] text-amber-300 truncate">{table.aggregation.split(' ')[0]}</span>
        </div>
      )}
    </div>
  );
}

function CrossLevelDependencyBlock({ config }: { config: TierSourceConfig }) {
  const [expanded, setExpanded] = useState(false);
  if (!config.crossLevelDeps || config.crossLevelDeps.length === 0) return null;

  return (
    <div className="mb-3">
      {config.crossLevelDeps.map((dep) => {
        const depTier = TIER_STEP_CONFIGS.find(t => t.key === dep.fromTier);
        const depSteps = depTier?.steps.filter(s => dep.stepIds.includes(s.id)) || [];
        return (
          <div key={dep.fromTier} className="rounded-lg border border-purple-500/20 bg-purple-500/[0.03] p-3">
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-[10px] w-full text-left">
              <span className="text-purple-400 font-bold">Prerequisites from {dep.fromTierLabel} Level</span>
              <span className="text-gray-600">({depSteps.length} steps)</span>
              <ChevronDown className={`w-3 h-3 text-gray-600 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
              <div className="mt-2 space-y-1">
                {depSteps.map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-[9px] px-2 py-1 rounded bg-white/[0.02]">
                    <span className="text-gray-500 font-mono w-3">{s.stepNumber}</span>
                    <StepTypeBadge type={s.stepType} size="xs" />
                    <span className="text-gray-300">{s.label}</span>
                    <span className="text-gray-600 ml-auto font-mono">{s.outputDescription}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TierStepsList({ config }: { config: TierSourceConfig }) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <CrossLevelDependencyBlock config={config} />
      <div className="space-y-1.5">
        {config.steps.map(step => (
          <div key={step.id} className="rounded-lg border border-gray-800 bg-black/20 overflow-hidden">
            <button onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors">
              <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-bold text-gray-400 flex-shrink-0">{step.stepNumber}</span>
              <StepTypeBadge type={step.stepType} />
              <span className="text-xs text-white font-medium flex-1">{step.label}</span>
              <span className="text-[9px] font-mono text-gray-500">{step.outputDescription}</span>
              <ChevronDown className={`w-3 h-3 text-gray-600 transition-transform ${expandedStep === step.id ? 'rotate-180' : ''}`} />
            </button>
            {expandedStep === step.id && (
              <div className="border-t border-gray-800/30 px-3 py-3 space-y-3">
                <p className="text-[10px] text-gray-400 leading-relaxed">{step.description}</p>
                {step.formula && (
                  <div className="bg-black/30 rounded-lg p-2.5">
                    <div className="text-[10px] font-mono text-emerald-400">{step.formula}</div>
                  </div>
                )}
                {step.ingredients.length > 0 && (
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1">Ingredients</div>
                    <div className="space-y-1">
                      {step.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] px-2 py-1.5 rounded bg-white/[0.02]">
                          <StepTypeBadge type={ing.stepType} size="xs" />
                          <span className="text-gray-300 font-medium">{ing.name}</span>
                          <code className="font-mono text-gray-500 text-[9px]">{ing.table}.{ing.field}</code>
                          <span className="font-mono text-teal-400 ml-auto">{typeof ing.sampleValue === 'number' && ing.sampleValue < 1 ? fmtPct(ing.sampleValue) : fmtDollar(ing.sampleValue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {step.sourceTables.length > 0 && (
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1">Source Tables</div>
                    <div className="flex flex-wrap gap-1.5">
                      {step.sourceTables.map((st, i) => (
                        <span key={i} className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${st.layer === 'L1' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                          {st.layer}.{st.table}
                          {st.aggregation && ' (SUM)'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EnhancedRollupPyramid({
  expandedLevel,
  onToggle,
}: {
  expandedLevel: string | null;
  onToggle: (k: string) => void;
}) {
  return (
    <div className="space-y-2">
      {TIER_STEP_CONFIGS.map((tier, i) => {
        const expanded = expandedLevel === tier.key;
        const Icon = tier.icon;
        return (
          <div key={tier.key} data-demo={`rollup-${tier.key}`} style={{ marginLeft: `${i * 4}px`, marginRight: `${i * 4}px` }}>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              {/* Main tier button */}
              <button
                onClick={() => onToggle(tier.key)}
                aria-expanded={expanded}
                className={`w-full rounded-xl border p-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  expanded
                    ? 'border-teal-500/40 bg-teal-500/10'
                    : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.04] hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expanded ? 'bg-teal-500/20' : 'bg-white/5'}`}>
                      <Icon className={`w-4 h-4 ${expanded ? 'text-teal-400' : 'text-gray-500'}`} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{tier.label}</span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-gray-800">{tier.method}</span>
                      </div>
                      <div className="text-[10px] text-gray-500">{tier.purpose}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TierBadge tier={tier.calcTier} />
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </div>
              </button>

              {/* Source tables sidebar */}
              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <div className="text-[8px] font-bold uppercase tracking-wider text-gray-600">Source Tables</div>
                {tier.sourceTables.map((st, j) => (
                  <SourceTableSideCard key={j} table={st} />
                ))}
                {tier.crossLevelDeps && tier.crossLevelDeps.length > 0 && (
                  <div className="rounded-lg border border-purple-500/20 bg-purple-500/[0.04] p-1.5 text-[8px]">
                    <span className="text-purple-400 font-bold">Depends on:</span>
                    {tier.crossLevelDeps.map(d => (
                      <div key={d.fromTier} className="text-purple-300 mt-0.5">{d.fromTierLabel} ({d.stepIds.length} steps)</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Expanded detail with step-by-step flow */}
            {expanded && (
              <div className="mt-3 ml-4 pl-4 border-l-2 border-teal-500/20" onClick={(e) => e.stopPropagation()}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Step-by-Step Flow — {tier.label} Level
                </div>
                <TierStepsList config={tier} />

                {/* Join Chain */}
                {ROLLUP_JOIN_CHAINS[tier.key] && (
                  <div className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.03] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Workflow className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Join Path</span>
                    </div>
                    <div className="space-y-1.5">
                      {ROLLUP_JOIN_CHAINS[tier.key].hops.map((hop, hi) => (
                        <div key={hi} className="flex items-center gap-2 text-[10px]">
                          <span className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center text-[8px] font-bold text-gray-500 flex-shrink-0">{hi + 1}</span>
                          <code className={`font-mono ${hop.fromLayer === 'L2' ? 'text-amber-300' : 'text-blue-300'}`}>{hop.from}</code>
                          <span className="text-gray-600">{'→'}</span>
                          <code className={`font-mono ${hop.toLayer === 'L2' ? 'text-amber-300' : 'text-blue-300'}`}>{hop.to}</code>
                          <span className="text-gray-700">ON</span>
                          <code className="font-mono text-emerald-400">{hop.joinKey}</code>
                          {hop.note && <span className="text-gray-600 italic ml-1">({hop.note})</span>}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-start gap-2 text-[10px]">
                      <RefreshCw className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div><span className="text-gray-500 font-medium">Aggregation: </span><span className="text-purple-300">{ROLLUP_JOIN_CHAINS[tier.key].aggregation}</span></div>
                    </div>
                    <div className="mt-1.5 flex items-start gap-2 text-[10px]">
                      <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div><span className="text-gray-500 font-medium">Result: </span><span className="text-emerald-300">{ROLLUP_JOIN_CHAINS[tier.key].result}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * LTV FOUNDATIONAL RULE
 * ──────────────────────────────────────────────────────────────────────────── */

export function LTVFoundationalRule() {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-bold text-red-300 mb-2">The Golden Rule of LTV Rollups</div>
          <p className="text-xs text-gray-400 leading-relaxed mb-3">
            NEVER take the simple average of individual facility LTVs. Just like DSCR, a simple average ignores loan size.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-red-500/20 bg-black/30 p-3">
              <div className="text-[10px] font-bold text-red-400 mb-1">WRONG: Simple Average</div>
              <code className="text-[10px] font-mono text-red-300">avg(73.41%, 86.54%, 47.06%) = 69.00%</code>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-black/30 p-3">
              <div className="text-[10px] font-bold text-emerald-400 mb-1">CORRECT: Exposure-Weighted</div>
              <code className="text-[10px] font-mono text-emerald-300">{'Σ'}(LTV {'×'} exp) / {'Σ'}(exp) = 76.48%</code>
            </div>
          </div>
          <PlainEnglish>
            The $50M facility at 86.54% LTV has much more influence than the $15M facility at 47.06%.
            Weighting by exposure size gives the true picture.
          </PlainEnglish>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * LTV DISTRIBUTION BUCKETS
 * ──────────────────────────────────────────────────────────────────────────── */

export function LTVDistributionBuckets() {
  const totalExposure = LTV_BUCKETS.reduce((s, b) => s + b.exposure, 0);
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
        <BarChart3 className="w-3 h-3" aria-hidden="true" />
        LTV Distribution Buckets (sample)
      </div>
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-5 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Bucket</div><div>Status</div><div className="text-right">Count</div><div className="text-right">Exposure ($M)</div><div className="text-right">% of Total</div>
        </div>
        {LTV_BUCKETS.map((b) => (
          <div key={b.range} className={`grid grid-cols-5 text-xs px-3 py-1.5 border-t border-gray-800/50 ${b.bg}`}>
            <div className={`font-mono font-bold ${b.color}`}>{b.range}</div>
            <div className="text-gray-400">{b.status}</div>
            <div className="text-right text-gray-300 font-mono">{b.count}</div>
            <div className="text-right text-gray-300 font-mono">${b.exposure}M</div>
            <div className="text-right text-gray-400 font-mono">{((b.exposure / totalExposure) * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * LINEAGE AUDIT TRAIL
 * ──────────────────────────────────────────────────────────────────────────── */

function AuditNode({ node, depth = 0 }: { node: AuditTrailNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const Icon = node.icon;

  return (
    <div className={depth > 0 ? 'ml-4 pl-4 border-l border-gray-800/50' : ''}>
      <button
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
          hasChildren ? 'hover:bg-white/[0.02] cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className={`w-6 h-6 rounded-lg ${node.layerColor} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-3 h-3 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white font-medium">{node.label}</div>
          {node.sublabel && <div className="text-[10px] text-gray-500">{node.sublabel}</div>}
        </div>
        {node.method && <span className="text-[9px] text-gray-500">{node.method}</span>}
        <span className={`text-xs font-mono font-bold ${
          parseFloat(node.displayValue) > 80 ? 'text-red-400' : parseFloat(node.displayValue) > 70 ? 'text-amber-400' : 'text-emerald-400'
        }`}>{node.displayValue}</span>
        {node.tier && <TierBadge tier={node.tier} />}
        {hasChildren && <ChevronDown className={`w-3 h-3 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />}
      </button>
      {node.formula && expanded && (
        <div className="ml-9 mb-1 text-[9px] font-mono text-gray-500">{node.formula}</div>
      )}
      {expanded && node.children?.map(child => (
        <AuditNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function LineageAuditTrail() {
  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-4">
      <AuditNode node={AUDIT_TRAIL} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * PROVENANCE BREADCRUMB
 * ──────────────────────────────────────────────────────────────────────────── */

export function useActiveSection(): string {
  const [active, setActive] = useState('definition');
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('section-', '');
            setActive(id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );
    BREADCRUMB_STEPS.forEach(s => {
      const el = document.getElementById(`section-${s.anchor}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return active;
}

export function ProvenanceBreadcrumb({ activeSection }: { activeSection: string }) {
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-500', cyan: 'bg-cyan-500', blue: 'bg-blue-500',
    amber: 'bg-amber-500', purple: 'bg-purple-500', emerald: 'bg-emerald-500', red: 'bg-red-500',
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {BREADCRUMB_STEPS.map(s => {
        const isActive = activeSection === s.anchor;
        return (
          <a
            key={s.id}
            href={`#section-${s.anchor}`}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-medium transition-all no-underline ${
              isActive ? 'bg-white/10 text-white border border-gray-600' : 'bg-white/[0.02] text-gray-500 border border-transparent hover:border-gray-700'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${colorMap[s.color] || 'bg-gray-500'}`} />
            {s.label}
          </a>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FOOTER LEGEND
 * ──────────────────────────────────────────────────────────────────────────── */

export function FooterLegend() {
  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-4 mt-6">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">Legend</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px]">
        <div className="space-y-2">
          <div className="text-gray-500 font-bold">Step Types</div>
          <div className="flex items-center gap-2"><StepTypeBadge type="SOURCING" size="xs" /><span className="text-gray-400">Read from table</span></div>
          <div className="flex items-center gap-2"><StepTypeBadge type="CALCULATION" size="xs" /><span className="text-gray-400">Formula/compute</span></div>
          <div className="flex items-center gap-2"><StepTypeBadge type="HYBRID" size="xs" /><span className="text-gray-400">Source + aggregate</span></div>
        </div>
        <div className="space-y-2">
          <div className="text-gray-500 font-bold">Data Layers</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-gray-400">L1 Reference</span></div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-gray-400">L2 Snapshot</span></div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-gray-400">L3 Calculated</span></div>
        </div>
        <div className="space-y-2">
          <div className="text-gray-500 font-bold">Calc Authority</div>
          <div className="flex items-center gap-2"><TierBadge tier="T2" /><span className="text-gray-400">Source + Validate</span></div>
          <div className="flex items-center gap-2"><TierBadge tier="T3" /><span className="text-gray-400">Always Calculate</span></div>
        </div>
        <div className="space-y-2">
          <div className="text-gray-500 font-bold">LTV Health</div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-gray-400">{'< 70%'} (strong)</span></div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-gray-400">70-80% (adequate)</span></div>
          <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-gray-400">{'> 80%'} (elevated)</span></div>
        </div>
      </div>
    </div>
  );
}
