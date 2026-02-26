'use client';

import React, { useState } from 'react';
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
  Scale,
  Search,
  Zap,
  Eye,
  ArrowDown,
  Play,
  Pause,
  ShieldCheck,
  Copy,
  Check,
  DollarSign,
  Users,
  Sparkles,
} from 'lucide-react';
import type {
  FacilityCommittedData,
  CounterpartyExposureData,
  ComponentMeta,
  AuditTrailNode,
  AuditL2Source,
  AuditRunContext,
  RollupLevel,
  RoleCodeEntry,
  FKRelationship,
  QueryPlanStep,
  FlowStep,
  BreadcrumbStep,
  L1TableDef,
} from './committed-lineage-data';
import {
  FACILITY_DATA,
  COUNTERPARTY_DATA,
  TOTAL_COMMITTED_USD,
  ROLE_CODES,
  ROLLUP_LEVELS,
  BREADCRUMB_STEPS,
  FK_RELATIONSHIPS,
  L1_TABLES,
  L2_FIELD_META,
  FACILITY_PATH_COMPONENTS,
  COUNTERPARTY_PATH_COMPONENTS,
  QUERY_PLAN_STEPS,
  COMMITTED_FLOW_STEPS,
  AUDIT_RUN,
  AUDIT_TRAIL,
} from './committed-lineage-data';

/* ────────────────────────────────────────────────────────────────────────────
 * FORMATTING HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

export function fmtDollar(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtFull(n: number): string {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function fmtPct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export function fmtFx(n: number): string {
  return n.toFixed(4);
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
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${m.bg} ${m.text} ${m.border}`}>
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
 * INSIGHT CALLOUT
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

export function PlainEnglish({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-gray-800/30">
      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mr-1.5">Plain English:</span>
      <span className="text-[10px] text-gray-400 leading-relaxed">{children}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * COMPONENT ROW — X-Ray mode for metric definition card
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-teal-500/15 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Committed Amount (USD)</h3>
          <code className="text-[10px] font-mono text-teal-300">committed_amount_usd</code>
        </div>
        <div className="ml-auto"><TierBadge tier="T3" /></div>
      </div>

      {/* Formula bar */}
      <div className="bg-black/30 rounded-lg p-3 mb-4">
        <div className="text-xs font-mono text-teal-400 text-center">
          committed_usd = total_commitment {'×'} fx_rate {'×'} bank_share_pct
        </div>
        <div className="text-[9px] text-gray-600 text-center mt-1">
          Aggregation: <strong className="text-gray-400">Summation</strong> at all levels {'·'} Display: USD dollar amount
        </div>
      </div>

      {/* Two paths side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Facility Path */}
        <div className="rounded-lg border border-teal-500/20 bg-teal-500/[0.03] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold text-teal-300">Facility Path (Direct Calc)</span>
          </div>
          <div className="text-[10px] text-gray-500 mb-2">3 components multiplied — click any to X-Ray the source</div>
          <div className="rounded-lg border border-gray-800 bg-black/20 overflow-hidden">
            {FACILITY_PATH_COMPONENTS.map((c, i) => (
              <ComponentRow key={c.field} meta={c} op={i === 0 ? '=' : '×'} />
            ))}
          </div>
          <div className="mt-2 text-right">
            <span className="text-[10px] text-gray-500">F-1 result: </span>
            <span className="text-sm font-black font-mono text-teal-400">$150,000,000</span>
          </div>
        </div>

        {/* Counterparty Path */}
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300">Counterparty Path (Pre-Computed)</span>
          </div>
          <div className="text-[10px] text-gray-500 mb-2">attributed_exposure_usd already includes FX + bank_share + attribution</div>
          <div className="rounded-lg border border-gray-800 bg-black/20 overflow-hidden">
            {COUNTERPARTY_PATH_COMPONENTS.map((c, i) => (
              <ComponentRow key={c.field} meta={c} op={i === 0 ? '=' : '→'} />
            ))}
          </div>
          <div className="mt-2 text-right">
            <span className="text-[10px] text-gray-500">All CPs: </span>
            <span className="text-sm font-black font-mono text-emerald-400">$1,261,750,000</span>
          </div>
        </div>
      </div>

      {/* Source table chips */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-2">Source Tables</div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { name: 'facility_master', layer: 'L1', color: 'blue' },
            { name: 'facility_lender_allocation', layer: 'L1', color: 'blue' },
            { name: 'fx_rate', layer: 'L1', color: 'blue' },
            { name: 'counterparty_role_dim', layer: 'L1', color: 'blue' },
            { name: 'counterparty_hierarchy', layer: 'L1', color: 'blue' },
            { name: 'enterprise_business_taxonomy', layer: 'L1', color: 'blue' },
            { name: 'position_detail', layer: 'L2', color: 'amber' },
            { name: 'exposure_counterparty_attribution', layer: 'L2', color: 'amber' },
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
 * SECTION 2: INTERACTIVE JOIN MAP + FK EXPLORER
 * ──────────────────────────────────────────────────────────────────────────── */

interface JoinNode { id: string; label: string; layer: string; x: number; y: number; color: string; }
interface JoinEdge { from: string; to: string; label: string; }

const JOIN_NODES: JoinNode[] = [
  // L1 (blue)
  { id: 'fm', label: 'facility_master', layer: 'L1', x: 80, y: 60, color: 'blue' },
  { id: 'fla', label: 'facility_lender_allocation', layer: 'L1', x: 80, y: 120, color: 'blue' },
  { id: 'fx', label: 'fx_rate', layer: 'L1', x: 80, y: 180, color: 'blue' },
  { id: 'crd', label: 'counterparty_role_dim', layer: 'L1', x: 80, y: 240, color: 'blue' },
  { id: 'ch', label: 'counterparty_hierarchy', layer: 'L1', x: 80, y: 300, color: 'blue' },
  { id: 'ebt', label: 'enterprise_business_taxonomy', layer: 'L1', x: 80, y: 360, color: 'blue' },
  // L2 (amber)
  { id: 'pd', label: 'position_detail', layer: 'L2', x: 320, y: 90, color: 'amber' },
  { id: 'eca', label: 'exposure_counterparty_attribution', layer: 'L2', x: 320, y: 240, color: 'amber' },
  // Transform (purple)
  { id: 'calc', label: 'Committed Amount Formula', layer: 'Transform', x: 550, y: 165, color: 'purple' },
  // L3 (emerald)
  { id: 'mvf', label: 'metric_value_fact', layer: 'L3', x: 750, y: 165, color: 'emerald' },
];

const JOIN_EDGES: JoinEdge[] = [
  { from: 'pd', to: 'fm', label: 'facility_id' },
  { from: 'fla', to: 'fm', label: 'facility_id' },
  { from: 'fm', to: 'fx', label: 'currency_code' },
  { from: 'eca', to: 'fm', label: 'facility_id' },
  { from: 'eca', to: 'crd', label: 'role_code' },
  { from: 'eca', to: 'ch', label: 'counterparty_id' },
  { from: 'fm', to: 'ebt', label: 'lob_segment_id' },
  { from: 'pd', to: 'calc', label: 'total_commitment' },
  { from: 'calc', to: 'mvf', label: 'committed_usd' },
  { from: 'eca', to: 'calc', label: 'attributed_usd' },
];

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
      <svg viewBox="0 0 850 420" className="w-full min-w-[700px]" style={{ maxHeight: 420 }}>
        {/* Layer labels */}
        {[
          { label: 'L1 Reference', x: 80, color: '#3b82f6' },
          { label: 'L2 Snapshot', x: 320, color: '#f59e0b' },
          { label: 'Transform', x: 550, color: '#a855f7' },
          { label: 'L3 Output', x: 750, color: '#10b981' },
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
              <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={highlighted ? '#6b7280' : '#374151'}
                strokeWidth={highlighted ? 1.5 : 0.5}
                strokeDasharray={highlighted ? 'none' : '4 4'}
              />
              <text
                x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 5}
                fill="#6b7280" fontSize={7} textAnchor="middle"
              >
                {edge.label}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {JOIN_NODES.map(node => {
          const c = nodeColor[node.color];
          const highlighted = isHighlighted(node.id);
          const w = node.layer === 'Transform' ? 140 : 160;
          return (
            <g
              key={node.id}
              opacity={highlighted ? 1 : 0.2}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={node.x - w / 2} y={node.y - 14} width={w} height={28}
                rx={6} fill={c.fill} stroke={c.stroke} strokeWidth={highlighted ? 1.5 : 0.5}
              />
              <text x={node.x} y={node.y + 4} fill={c.text} fontSize={9} fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

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
                <div className="text-[9px] text-gray-600">
                  <span className="font-bold uppercase">Cardinality:</span> {fk.cardinality}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 3: L1 TABLES
 * ──────────────────────────────────────────────────────────────────────────── */

function ExpandableTableCard({ table }: { table: L1TableDef }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
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
          {/* Columns */}
          <div className="rounded-lg bg-black/30 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[9px] font-bold uppercase tracking-wider text-gray-600 px-3 py-1.5 bg-white/[0.03]">
              <div>Column</div>
              <div>Type</div>
              <div>Key</div>
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
          {/* Sample row */}
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
 * SECTION 4: L2 FIELD TABLE
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
      {renderFields('position_detail', [
        'position_detail.total_commitment',
        'position_detail.position_id',
        'position_detail.as_of_date',
      ])}
      {renderFields('exposure_counterparty_attribution', [
        'exposure_counterparty_attribution.attributed_exposure_usd',
        'exposure_counterparty_attribution.attribution_pct',
        'exposure_counterparty_attribution.counterparty_role_code',
      ])}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 5: SYNDICATION CALLOUT
 * ──────────────────────────────────────────────────────────────────────────── */

export function SyndicationCallout() {
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.03] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-bold text-blue-300">GSIB Syndication: Why bank_share_pct Matters</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3">
          <div className="text-[10px] font-bold text-red-300 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Without bank_share_pct
          </div>
          <div className="text-[10px] text-gray-400 space-y-1">
            <div>F-3 Pacific Ridge: £1,000M {'×'} 1.265</div>
            <div className="pt-1 border-t border-white/5 font-mono">
              Committed = <span className="text-red-400">$1,265,000,000</span>
            </div>
            <div className="text-[9px] text-red-400/70">{'←'} overstated by $695.75M — we only hold 45%</div>
          </div>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
          <div className="text-[10px] font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> With bank_share_pct
          </div>
          <div className="text-[10px] text-gray-400 space-y-1">
            <div>F-3: £1,000M {'×'} 1.265 {'×'} <strong className="text-emerald-300">45%</strong></div>
            <div className="pt-1 border-t border-white/5 font-mono">
              Committed = <span className="text-emerald-400">$569,250,000</span>
            </div>
            <div className="text-[9px] text-emerald-400/70">{'←'} reflects actual bank economic exposure</div>
          </div>
        </div>
      </div>
      <PlainEnglish>
        For a GSIB with thousands of syndicated facilities, failing to apply bank_share_pct inflates total committed
        exposure by the ratio of total deal sizes to the bank&apos;s actual participation. A 5% share of a $10B deal
        should report $500M, not $10B.
      </PlainEnglish>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 6: FX SENSITIVITY CALLOUT
 * ──────────────────────────────────────────────────────────────────────────── */

export function FxSensitivityCallout() {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="w-4 h-4 text-red-400" />
        <span className="text-xs font-bold text-red-300">Critical: FX Rate Sensitivity</span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed mb-3">
        Committed amounts denominated in foreign currencies change in USD terms when FX rates move &mdash;
        even when the underlying credit exposure is unchanged. This is <strong className="text-gray-300">market risk driving
        credit metric volatility</strong>.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
          <div className="text-[10px] font-bold text-amber-300 mb-2">Current Rate (2025-01-31)</div>
          <div className="text-[10px] text-gray-400 space-y-1">
            <div>F-2 Northbridge: {'€'}500M {'×'} <strong className="text-amber-300">1.0850</strong> (EUR/USD)</div>
            <div className="pt-1 border-t border-white/5 font-mono">
              Committed = <span className="text-amber-400">$542,500,000</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3">
          <div className="text-[10px] font-bold text-red-300 mb-2">After 5% EUR Depreciation</div>
          <div className="text-[10px] text-gray-400 space-y-1">
            <div>F-2 Northbridge: {'€'}500M {'×'} <strong className="text-red-300">1.0308</strong> (EUR/USD)</div>
            <div className="pt-1 border-t border-white/5 font-mono">
              Committed = <span className="text-red-400">$515,375,000</span>
            </div>
            <div className="text-[9px] text-red-400 font-bold mt-1">{'Δ'} = -$27,125,000 swing — no credit event</div>
          </div>
        </div>
      </div>
      <PlainEnglish>
        Currency movements change your committed exposure in USD even when the borrower&apos;s creditworthiness
        hasn&apos;t changed. A 5% EUR depreciation reduces Northbridge&apos;s committed amount by $27M. Regulators
        require daily FX re-translation for accurate exposure reporting.
      </PlainEnglish>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 7: RISK-BEARING CALLOUT
 * ──────────────────────────────────────────────────────────────────────────── */

export function RiskBearingCallout() {
  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-bold text-white">Counterparty Role Risk-Bearing Filter</span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed mb-3">
        Only counterparties in risk-bearing roles generate credit exposure. Administrative roles (Agent, Trustee, Servicer) are
        excluded from committed amount calculations via <code className="text-purple-300">counterparty_role_dim.is_risk_bearing_flag</code>.
      </p>
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-[100px_1fr_60px] text-[9px] font-bold uppercase tracking-wider text-gray-600 bg-white/[0.03] px-3 py-2">
          <div>Role Code</div>
          <div>Description</div>
          <div className="text-center">Risk?</div>
        </div>
        {ROLE_CODES.map(role => (
          <div
            key={role.code}
            className={`grid grid-cols-[100px_1fr_60px] text-[10px] px-3 py-2 border-t border-gray-800/30 ${
              !role.isRiskBearing ? 'opacity-50 line-through decoration-red-500/50' : ''
            }`}
          >
            <code className={`font-mono font-bold ${role.isRiskBearing ? 'text-emerald-400' : 'text-red-400'}`}>{role.code}</code>
            <span className="text-gray-400">{role.description}</span>
            <div className="text-center">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                role.isRiskBearing
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
              }`}>
                {role.isRiskBearing ? 'Y' : 'N'}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-400">
            <strong className="text-amber-300">F-3 Example:</strong> Pacific Ridge RCF has an Administrative Agent role excluded
            from committed amount. Only the two CO_BORROWER roles (CP-3, CP-7) are included. Without this filter,
            the agent&apos;s non-economic relationship would inflate counterparty-level exposure.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 8: QUERY PLAN VIEW
 * ──────────────────────────────────────────────────────────────────────────── */

export function QueryPlanView() {
  const [showSql, setShowSql] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const layerColors: Record<string, string> = {
    L1: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    L2: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Transform: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    'L2 + L1': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    L3: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white">Execution Plan</span>
        </div>
        <button
          onClick={() => setShowSql(!showSql)}
          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
            showSql ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-gray-500 border border-gray-700'
          }`}
        >
          {showSql ? 'Hide SQL' : 'Show SQL'}
        </button>
      </div>
      <div className="space-y-1.5">
        {QUERY_PLAN_STEPS.map(step => {
          const isExpanded = expandedStep === step.step;
          const c = layerColors[step.layer] || layerColors.L1;
          return (
            <div key={step.step}>
              <button
                onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-purple-500/15 flex items-center justify-center text-[9px] font-bold text-purple-300 flex-shrink-0">
                  {step.step}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${c}`}>{step.layer}</span>
                <span className="text-xs text-gray-300 flex-1">{step.action}</span>
                {step.tables.length > 0 && (
                  <div className="flex gap-1">
                    {step.tables.map(t => (
                      <code key={t} className="text-[8px] font-mono text-gray-500">{t}</code>
                    ))}
                  </div>
                )}
              </button>
              {(isExpanded || showSql) && (
                <div className="ml-8 mt-1 mb-2">
                  <pre className="text-[9px] font-mono text-gray-500 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                    {step.sql}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 9: CALCULATION ENGINE
 * ──────────────────────────────────────────────────────────────────────────── */

export function FacilityCalcTable() {
  return (
    <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.03] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-teal-400" />
        <span className="text-xs font-bold text-teal-300">Facility Path — Direct Calculation</span>
        <TierBadge tier="T3" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-800 overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-white/[0.03]">
              {['Facility', 'Ccy', 'total_commitment', 'fx_rate', 'commitment_usd', 'bank_share_pct', 'committed_usd'].map(h => (
                <th key={h} className="px-2.5 py-2 text-left font-bold uppercase tracking-wider text-gray-600">{h}</th>
              ))}
            </tr>
            <tr className="bg-black/20">
              {['facility_master', '', 'position_detail', 'fx_rate', 'Calculated', 'facility_lender_alloc', 'Calculated'].map((s, i) => (
                <td key={i} className="px-2.5 py-1 font-mono text-[8px] text-gray-700">{s}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {FACILITY_DATA.map(f => (
              <tr key={f.facilityId} className="border-t border-gray-800/30">
                <td className="px-2.5 py-2 text-gray-300 font-medium">F-{f.facilityId}</td>
                <td className="px-2.5 py-2 text-gray-500 font-mono">{f.currencyCode}</td>
                <td className="px-2.5 py-2 text-amber-300 font-mono">{f.currencySymbol}{(f.totalCommitment / 1e6).toFixed(0)}M</td>
                <td className="px-2.5 py-2 text-blue-300 font-mono">{fmtFx(f.fxRate)}</td>
                <td className="px-2.5 py-2 text-purple-300 font-mono">{fmtDollar(f.totalCommitmentUsd)}</td>
                <td className="px-2.5 py-2 text-blue-300 font-mono">{fmtPct(f.bankSharePct)}</td>
                <td className="px-2.5 py-2 text-teal-400 font-mono font-bold">{fmtDollar(f.committedAmountUsd)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-teal-500/30 bg-teal-500/[0.05]">
              <td colSpan={6} className="px-2.5 py-2 text-right text-gray-400 font-bold">TOTAL (3 facilities)</td>
              <td className="px-2.5 py-2 text-teal-400 font-mono font-black">{fmtDollar(TOTAL_COMMITTED_USD)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Step-by-step */}
      <div className="mt-3 bg-black/30 rounded-lg p-3 font-mono text-[10px] space-y-1">
        {FACILITY_DATA.map(f => (
          <div key={f.facilityId} className="text-gray-400">
            <span className="text-gray-300">F-{f.facilityId}:</span>{' '}
            {f.currencySymbol}{(f.totalCommitment / 1e6).toFixed(0)}M ({f.currencyCode}) {'×'} {fmtFx(f.fxRate)} ({f.fxPair}) {'×'} {fmtPct(f.bankSharePct)} ({f.allocationRole}) = <span className="text-teal-400">{fmtFull(f.committedAmountUsd)}</span>
          </div>
        ))}
        <div className="border-t border-gray-700 pt-1 text-teal-400 font-bold">
          TOTAL (3 DISTINCT facilities): {fmtFull(TOTAL_COMMITTED_USD)}
        </div>
      </div>
    </div>
  );
}

export function CounterpartyCalcTable() {
  const riskBearing = COUNTERPARTY_DATA.filter(c => c.isRiskBearing);
  const excluded = COUNTERPARTY_DATA.filter(c => !c.isRiskBearing);

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-bold text-emerald-300">Counterparty Path — Pre-Computed Attribution</span>
        <TierBadge tier="T3" />
      </div>

      <div className="rounded-lg border border-gray-800 overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-white/[0.03]">
              {['CP', 'Name', 'Role', 'Risk?', 'Facility', 'attr_pct', 'attr_usd'].map(h => (
                <th key={h} className="px-2.5 py-2 text-left font-bold uppercase tracking-wider text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {riskBearing.map(c => {
              const isF3 = c.facilityId === 3;
              return (
                <tr key={`${c.counterpartyId}-${c.facilityId}`} className={`border-t border-gray-800/30 ${isF3 ? 'bg-emerald-500/[0.03]' : ''}`}>
                  <td className="px-2.5 py-2 text-gray-300 font-medium">CP-{c.counterpartyId}</td>
                  <td className="px-2.5 py-2 text-gray-400 text-[9px]">{c.counterpartyName}</td>
                  <td className="px-2.5 py-2"><code className={`font-mono ${isF3 ? 'text-emerald-300 font-bold' : 'text-gray-400'}`}>{c.roleCode}</code></td>
                  <td className="px-2.5 py-2"><span className="text-[9px] px-1 rounded bg-emerald-500/15 text-emerald-400">Y</span></td>
                  <td className="px-2.5 py-2 text-gray-400 font-mono">{isF3 ? <strong className="text-emerald-300">F-3</strong> : `F-${c.facilityId}`}</td>
                  <td className="px-2.5 py-2 font-mono">{isF3 ? <strong className="text-emerald-300">{fmtPct(c.attributionPct)}</strong> : <span className="text-gray-400">{fmtPct(c.attributionPct)}</span>}</td>
                  <td className="px-2.5 py-2 font-mono">{isF3 ? <strong className="text-emerald-400">{fmtDollar(c.attributedExposureUsd)}</strong> : <span className="text-emerald-400">{fmtDollar(c.attributedExposureUsd)}</span>}</td>
                </tr>
              );
            })}
            {/* Excluded agent row */}
            {excluded.map(c => (
              <tr key={`${c.counterpartyId}-excluded`} className="border-t border-gray-800/30 opacity-40 line-through decoration-red-500/50">
                <td className="px-2.5 py-2 text-gray-500">—</td>
                <td className="px-2.5 py-2 text-gray-500 text-[9px]">{c.counterpartyName}</td>
                <td className="px-2.5 py-2"><code className="font-mono text-red-400">{c.roleCode}</code></td>
                <td className="px-2.5 py-2"><span className="text-[9px] px-1 rounded bg-red-500/15 text-red-400">N</span></td>
                <td className="px-2.5 py-2 text-gray-500 font-mono">F-{c.facilityId}</td>
                <td className="px-2.5 py-2 text-gray-500">—</td>
                <td className="px-2.5 py-2 text-gray-500">$0</td>
              </tr>
            ))}
            <tr className="border-t-2 border-emerald-500/30 bg-emerald-500/[0.05]">
              <td colSpan={6} className="px-2.5 py-2 text-right text-gray-400 font-bold">TOTAL (risk-bearing only)</td>
              <td className="px-2.5 py-2 text-emerald-400 font-mono font-black">{fmtDollar(TOTAL_COMMITTED_USD)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Aggregation step */}
      <div className="mt-3 bg-black/30 rounded-lg p-3 font-mono text-[10px] space-y-1">
        <div className="text-gray-600 text-[9px] uppercase font-bold mb-1">After GROUP BY counterparty_hierarchy.ultimate_parent_id:</div>
        {riskBearing.map(c => (
          <div key={`${c.counterpartyId}-agg`} className="text-gray-400">
            CP-{c.counterpartyId} (ultimate_parent={c.counterpartyId}): <span className="text-emerald-400">{fmtFull(c.attributedExposureUsd)}</span>
          </div>
        ))}
        <div className="border-t border-gray-700 pt-1 text-emerald-400 font-bold">
          TOTAL (risk-bearing only): {fmtFull(TOTAL_COMMITTED_USD)}
        </div>
      </div>

      {/* Cross-check */}
      <div className="mt-3 rounded-lg border border-teal-500/20 bg-teal-500/[0.04] p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
          <span className="text-[10px] font-bold text-teal-300">Cross-Check: F-3 Multi-Borrower Split</span>
        </div>
        <div className="text-[10px] text-gray-400">
          F-3 facility committed = $569,250,000. CP-3 (60%) = $341,550,000 + CP-7 (40%) = $227,700,000 = <strong className="text-teal-400">$569,250,000</strong>. Matches facility-level figure exactly.
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 10: ANIMATED DATA FLOW
 * ──────────────────────────────────────────────────────────────────────────── */

const flowColors: Record<string, { border: string; bg: string; dot: string; text: string }> = {
  blue: { border: 'border-blue-500/40', bg: 'bg-blue-500/10', dot: 'bg-blue-500', text: 'text-blue-400' },
  amber: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', dot: 'bg-amber-500', text: 'text-amber-400' },
  purple: { border: 'border-purple-500/40', bg: 'bg-purple-500/10', dot: 'bg-purple-500', text: 'text-purple-400' },
  emerald: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  pink: { border: 'border-pink-500/40', bg: 'bg-pink-500/10', dot: 'bg-pink-500', text: 'text-pink-400' },
};

export function AnimatedDataFlow() {
  const [activeStep, setActiveStep] = useState(-1);
  const [playing, setPlaying] = useState(false);

  React.useEffect(() => {
    if (!playing) return;
    if (activeStep >= COMMITTED_FLOW_STEPS.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setActiveStep(s => s + 1), 1800);
    return () => clearTimeout(t);
  }, [playing, activeStep]);

  const play = () => { if (activeStep < 0) setActiveStep(0); setPlaying(true); };
  const pause = () => setPlaying(false);
  const reset = () => { setPlaying(false); setActiveStep(-1); };

  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white">F-3 Pacific Ridge — Data Journey</span>
        </div>
        <div className="flex items-center gap-1.5">
          {activeStep < 0 ? (
            <button onClick={play} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <Play className="w-3 h-3 inline mr-1" />Play
            </button>
          ) : (
            <>
              {playing ? (
                <button onClick={pause} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Pause className="w-3 h-3 inline mr-1" />Pause
                </button>
              ) : (
                <button onClick={play} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30">Resume</button>
              )}
              <button onClick={reset} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-gray-500 border border-gray-700">Reset</button>
            </>
          )}
        </div>
      </div>
      <div className="space-y-1">
        {COMMITTED_FLOW_STEPS.map((step, i) => {
          const isActive = i === activeStep;
          const isPast = i < activeStep;
          const c = flowColors[step.color] || flowColors.blue;
          return (
            <div
              key={i}
              className={`rounded-lg border p-3 transition-all duration-300 ${
                isActive ? `${c.border} ${c.bg} scale-[1.01]` : isPast ? 'border-gray-800/50 bg-white/[0.01] opacity-60' : 'border-gray-800/30 bg-transparent opacity-30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isPast || isActive ? c.dot : 'bg-gray-800'}`} />
                <span className="text-[8px] font-bold uppercase tracking-wider text-gray-600 w-16">{step.layer}</span>
                <code className="text-[10px] font-mono text-gray-500 w-40 truncate">{step.table}</code>
                <span className="text-xs text-gray-300 font-medium">{step.action}</span>
              </div>
              {(isActive || isPast) && (
                <div className="ml-[22px] mt-1.5">
                  <div className={`text-xs font-mono font-bold ${c.text}`}>{step.value}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{step.detail}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 11: ROLLUP PYRAMID
 * ──────────────────────────────────────────────────────────────────────────── */

function JoinChainVisual({ joinPath }: { joinPath: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {joinPath.map((step, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-gray-700">{'→'}</span>}
          <code className="text-[9px] font-mono text-gray-400 bg-black/30 px-2 py-0.5 rounded">{step}</code>
        </React.Fragment>
      ))}
    </div>
  );
}

function CounterpartyDetail() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 leading-relaxed">
        This is the first aggregation point and where multi-borrower attribution becomes critical.
        A single facility may have multiple counterparties &mdash; the question is how the committed amount splits.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-300">Scenario A: Single Borrower</span>
          </div>
          <div className="text-[10px] text-gray-500 mb-2">F-1 (Meridian) and F-2 (Northbridge) — one borrower per facility</div>
          <div className="bg-black/30 rounded-lg p-2.5 mb-2">
            <div className="text-xs font-mono text-emerald-400 text-center">
              attribution_pct = 100% &rarr; full committed amount to single CP
            </div>
          </div>
          <PlainEnglish>
            One borrower, one deal. The entire bank-share committed amount is attributed to that single counterparty.
          </PlainEnglish>
        </div>
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-blue-300">Scenario B: Multi-Borrower Syndicated</span>
          </div>
          <div className="text-[10px] text-gray-500 mb-2">F-3 (Pacific Ridge) — two CO_BORROWERs sharing 60/40</div>
          <div className="bg-black/30 rounded-lg p-2.5 mb-2">
            <div className="text-xs font-mono text-blue-400 text-center">
              CP-3: 60% {'×'} $569.25M = $341.55M<br />
              CP-7: 40% {'×'} $569.25M = $227.70M
            </div>
          </div>
          <PlainEnglish>
            Two co-borrowers share one facility. The committed amount splits by their attribution percentage.
            The AGENT role is excluded (not risk-bearing).
          </PlainEnglish>
        </div>
      </div>
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-amber-300 mb-1">Role-Based Exclusion</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              The AGENT on F-3 is excluded because <code className="text-purple-300">counterparty_role_dim.is_risk_bearing_flag = &apos;N&apos;</code>.
              Without this filter, the agent&apos;s zero-risk administrative relationship would create a spurious counterparty entry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RollupPyramid({ expandedLevel, onToggle }: { expandedLevel: string | null; onToggle: (key: string) => void }) {
  return (
    <div className="space-y-1.5">
      {ROLLUP_LEVELS.map(level => {
        const isExpanded = expandedLevel === level.key;
        const Icon = level.icon;
        const colorMap: Record<string, { bg: string; border: string; text: string }> = {
          amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300' },
          emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300' },
          pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-300' },
        };
        const c = colorMap[level.color] || colorMap.emerald;

        return (
          <div key={level.key}>
            <button
              onClick={() => onToggle(level.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                isExpanded ? `${c.border} ${c.bg} border` : 'border border-gray-800 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isExpanded ? c.text : 'text-gray-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{level.label}</span>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-gray-800">
                    {level.method}
                  </span>
                  <TierBadge tier={level.tier} />
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {isExpanded && (
              <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-800/50 space-y-2 pb-2">
                <div className="text-xs text-gray-400 leading-relaxed">{level.description}</div>
                <JoinChainVisual joinPath={level.joinPath} />
                {level.key === 'counterparty' && <CounterpartyDetail />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION 13: LINEAGE AUDIT TRAIL
 * ──────────────────────────────────────────────────────────────────────────── */

function L2SourceDetail({ source }: { source: AuditL2Source }) {
  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.03] p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border bg-amber-500/20 text-amber-300 border-amber-500/30">Source</span>
        <code className="text-[10px] font-mono text-blue-300">L2.{source.table}</code>
      </div>

      {/* Columns */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Source Columns</div>
        <div className="rounded-lg bg-black/30 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[9px] font-bold uppercase tracking-wider text-gray-600 px-2.5 py-1.5 bg-white/[0.03]">
            <div>Column</div>
            <div>Type</div>
            <div className="text-right">Value</div>
          </div>
          {source.columns.map((col, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] px-2.5 py-1.5 border-t border-gray-800/30">
              <div>
                <code className="font-mono text-blue-300">{col.column}</code>
                <div className="text-[9px] text-gray-600 mt-0.5">{col.desc}</div>
              </div>
              <div className="text-gray-600 font-mono">{col.type}</div>
              <div className="text-right font-mono font-bold text-emerald-400">
                {typeof col.value === 'number' && col.value > 1000 ? fmtFull(col.value) : String(col.value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WHERE */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">WHERE Clause (Row Selection)</div>
        <div className="flex flex-wrap gap-1.5">
          {source.whereFilters.map((f, i) => (
            <code key={i} className="text-[9px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded px-2 py-1">{f}</code>
          ))}
        </div>
      </div>

      {/* FK Joins */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">FK Joins Traversed</div>
        <div className="space-y-1">
          {source.fkJoins.map((fk, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <Link2 className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <code className="font-mono text-amber-300">{fk.from}</code>
                  <span className="text-gray-600">{'→'}</span>
                  <code className="font-mono text-blue-300">{fk.to}</code>
                  <span className="text-gray-700">ON</span>
                  <code className="font-mono text-emerald-400">{fk.key}</code>
                </div>
                <div className="text-[9px] text-gray-600 italic mt-0.5">{fk.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formula */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Formula Execution</div>
        <div className="space-y-1">
          {source.formulaSteps.map(s => (
            <div key={s.step} className="flex items-center gap-2 text-[10px]">
              <span className="w-5 h-5 rounded-full bg-purple-500/15 flex items-center justify-center text-[8px] font-bold text-purple-300 flex-shrink-0">{s.step}</span>
              <span className="text-gray-500">{s.label}</span>
              <span className="text-gray-700 font-mono text-[9px]">{s.operation}</span>
              <span className="text-gray-700">=</span>
              <span className="font-mono font-bold text-emerald-400">{fmtFull(s.result)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditTrailNodeCard({
  node, depth, expandedNodes, onToggle,
}: {
  node: AuditTrailNode; depth: number; expandedNodes: Set<string>; onToggle: (id: string) => void;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = (node.children && node.children.length > 0) || !!node.l2Source;
  const Icon = node.icon;

  const colorMap: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-300', dot: 'bg-pink-500' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', dot: 'bg-amber-500' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', dot: 'bg-blue-500' },
  };
  const c = colorMap[node.layerColor] || colorMap.emerald;

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }} className="mt-2">
      {depth > 0 && (
        <div className="flex items-center gap-1.5 mb-1 ml-2">
          <div className={`w-3 h-px ${c.dot}`} />
          <ArrowDown className="w-2.5 h-2.5 text-gray-700" />
        </div>
      )}
      <button
        onClick={() => hasChildren && onToggle(node.id)}
        aria-expanded={hasChildren ? isExpanded : undefined}
        className={`w-full text-left rounded-xl border p-3.5 transition-all duration-200 ${
          isExpanded ? `${c.border} ${c.bg}` : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.04] hover:border-gray-700'
        } ${!hasChildren ? 'cursor-default' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isExpanded ? c.bg : 'bg-white/5'}`}>
              <Icon className={`w-4 h-4 ${isExpanded ? c.text : 'text-gray-500'}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white">{node.label}</span>
                <span className={`text-base font-black font-mono tabular-nums ${c.text}`}>{node.displayValue}</span>
                {node.methodLabel && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-gray-800">{node.methodLabel}</span>
                )}
                {node.tier && <TierBadge tier={node.tier} />}
              </div>
              {node.sublabel && <div className="text-[10px] text-gray-500 mt-0.5">{node.sublabel}</div>}
            </div>
          </div>
          {hasChildren && (isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />)}
        </div>
        {node.formula && <div className="mt-2 ml-11 text-xs font-mono text-gray-400">{node.formula}</div>}
      </button>
      {isExpanded && (
        <div className="mt-1">
          {node.l2Source && (
            <div className="ml-6 mt-2"><L2SourceDetail source={node.l2Source} /></div>
          )}
          {node.children?.map(child => (
            <AuditTrailNodeCard key={child.id} node={child} depth={depth + 1} expandedNodes={expandedNodes} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AuditRunPanel() {
  const [copied, setCopied] = useState(false);
  const copyRef = () => {
    navigator.clipboard?.writeText(AUDIT_RUN.auditCitation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const l2 = new Date(AUDIT_RUN.l2Freshness);
  const l3 = new Date(AUDIT_RUN.l3Freshness);
  const deltaH = ((l3.getTime() - l2.getTime()) / 3_600_000).toFixed(1);

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-bold text-white">Audit Context</span>
      </div>
      <div className="space-y-2.5 text-[10px]">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-0.5">Run Version</div>
          <code className="text-emerald-300 font-mono">{AUDIT_RUN.runVersionId}</code>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-0.5">As-Of Date</div>
          <span className="text-gray-300 font-mono">{AUDIT_RUN.asOfDate}</span>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-0.5">Reporting Period</div>
          <span className="text-gray-300 font-mono">{AUDIT_RUN.reportingPeriod}</span>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-0.5">Calculation Tier</div>
          <TierBadge tier={AUDIT_RUN.calculationTier} />
        </div>
        {/* Data freshness */}
        <div className="pt-2 border-t border-white/5">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Data Freshness</div>
          {[
            { label: 'L1 Reference', ts: AUDIT_RUN.l1Freshness, color: 'bg-blue-500' },
            { label: 'L2 Snapshot', ts: AUDIT_RUN.l2Freshness, color: 'bg-amber-500' },
            { label: 'L3 Output', ts: AUDIT_RUN.l3Freshness, color: 'bg-emerald-500' },
          ].map(d => (
            <div key={d.label} className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${d.color}`} />
              <span className="text-gray-500 w-20">{d.label}</span>
              <span className="text-gray-400 font-mono text-[9px]">{new Date(d.ts).toLocaleString()}</span>
            </div>
          ))}
          <div className="text-[9px] text-gray-600 mt-1">{'Δ'} {deltaH}h L2{'→'}L3 processing</div>
        </div>
        {/* Citation */}
        <div className="pt-2 border-t border-white/5">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1">Audit Citation</div>
          <div className="flex items-center gap-2">
            <code className="text-[8px] font-mono text-gray-400 break-all flex-1">{AUDIT_RUN.auditCitation}</code>
            <button onClick={copyRef} className="flex-shrink-0 p-1 rounded hover:bg-white/5 transition-colors" title="Copy citation">
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-gray-600" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LineageAuditTrail() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set(['dashboard']));

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collectIds = (node: AuditTrailNode): string[] => {
    const ids = [node.id];
    node.children?.forEach(c => ids.push(...collectIds(c)));
    return ids;
  };

  const expandAll = () => setExpandedNodes(new Set(collectIds(AUDIT_TRAIL)));
  const collapseAll = () => setExpandedNodes(new Set(['dashboard']));

  // Build active path for reverse breadcrumb
  const buildPath = (node: AuditTrailNode, target: Set<string>, path: string[] = []): string[] => {
    const current = [...path, node.id];
    if (target.has(node.id) && (!node.children || node.children.every(c => !target.has(c.id)))) return current;
    for (const child of node.children || []) {
      if (target.has(child.id)) {
        const found = buildPath(child, target, current);
        if (found.length > current.length) return found;
      }
    }
    return current;
  };
  const activePath = buildPath(AUDIT_TRAIL, expandedNodes);

  const pathColors: Record<string, string> = {
    dashboard: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    lob: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    counterparty: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    facility: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    l2_source: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  };

  const findNode = (id: string, node: AuditTrailNode = AUDIT_TRAIL): AuditTrailNode | null => {
    if (node.id === id) return node;
    for (const child of node.children || []) {
      const found = findNode(id, child);
      if (found) return found;
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
      <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">Lineage Audit Trail</span>
            <span className="text-[9px] text-gray-600">Click any node to drill down</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={expandAll} className="px-2 py-0.5 rounded text-[9px] font-bold text-gray-500 border border-gray-800 hover:text-gray-300 hover:border-gray-700 transition-colors">Expand All</button>
            <button onClick={collapseAll} className="px-2 py-0.5 rounded text-[9px] font-bold text-gray-500 border border-gray-800 hover:text-gray-300 hover:border-gray-700 transition-colors">Collapse</button>
          </div>
        </div>

        {/* Reverse breadcrumb */}
        <div className="flex items-center gap-1 mb-4 pb-3 border-b border-white/5 overflow-x-auto">
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-gray-600 flex-shrink-0">
            <ArrowDown className="w-3 h-3" />
            <span>Trace:</span>
          </div>
          {activePath.map((nodeId, i) => {
            const n = findNode(nodeId);
            if (!n) return null;
            const cls = pathColors[n.level] || pathColors.counterparty;
            return (
              <React.Fragment key={nodeId}>
                {i > 0 && <ArrowDown className="w-2.5 h-2.5 text-gray-700 flex-shrink-0" />}
                <button
                  onClick={() => {
                    const next = new Set(expandedNodes);
                    next.add(nodeId);
                    setExpandedNodes(next);
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium whitespace-nowrap border flex-shrink-0 ${cls}`}
                >
                  {n.label.length > 25 ? n.label.slice(0, 25) + '...' : n.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <AuditTrailNodeCard node={AUDIT_TRAIL} depth={0} expandedNodes={expandedNodes} onToggle={toggleNode} />
      </div>

      <div className="lg:sticky lg:top-[140px] lg:self-start">
        <AuditRunPanel />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * PROVENANCE BREADCRUMB (DSCR pattern)
 * ──────────────────────────────────────────────────────────────────────────── */

const breadcrumbColors: Record<string, string> = {
  teal: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  amber: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  red: 'bg-red-500/20 text-red-300 border-red-500/40',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  pink: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
};

export function ProvenanceBreadcrumb({ activeSection }: { activeSection: string }) {
  const scrollTo = (anchor: string) => {
    const el = document.getElementById(`section-${anchor}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1">
      {BREADCRUMB_STEPS.map((step, i) => {
        const isActive = activeSection === step.id;
        const c = breadcrumbColors[step.color] || breadcrumbColors.teal;
        return (
          <React.Fragment key={step.id}>
            {i > 0 && <span className="text-gray-700 text-[8px] flex-shrink-0">{'→'}</span>}
            <button
              onClick={() => scrollTo(step.anchor)}
              className={`flex-shrink-0 px-2 py-0.5 rounded text-[9px] font-medium border transition-all ${
                isActive ? c : 'text-gray-600 border-transparent hover:border-gray-800'
              }`}
            >
              {step.label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * useActiveSection HOOK (scroll spy)
 * ──────────────────────────────────────────────────────────────────────────── */

export function useActiveSection(): string {
  const [active, setActive] = useState<string>(BREADCRUMB_STEPS[0].id);

  React.useEffect(() => {
    let rafId = 0;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        let current: string = BREADCRUMB_STEPS[0].id;
        for (const s of BREADCRUMB_STEPS) {
          const el = document.getElementById(`section-${s.id}`);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 120) current = s.id;
          }
        }
        setActive(current);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return active;
}

/* ────────────────────────────────────────────────────────────────────────────
 * FOOTER LEGEND
 * ──────────────────────────────────────────────────────────────────────────── */

export function FooterLegend() {
  return (
    <div className="pt-8 pb-12 border-t border-gray-800 mt-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Flow Steps</div>
          <div className="space-y-1.5">
            {[
              { color: 'bg-teal-600', label: '1. Metric Definition' },
              { color: 'bg-blue-600', label: '2. L1 Reference' },
              { color: 'bg-amber-600', label: '3. L2 Snapshot' },
              { color: 'bg-emerald-600', label: '4. Calculation' },
              { color: 'bg-emerald-600', label: '5. Rollup Hierarchy' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded ${s.color} flex-shrink-0`} />
                <span className="text-gray-400">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Calculation Paths</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-teal-500 flex-shrink-0" />
              <span className="text-gray-400">Facility (Direct)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500 flex-shrink-0" />
              <span className="text-gray-400">Counterparty (Attributed)</span>
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Calculation Authority</div>
          <div className="space-y-1.5">
            <TierBadge tier="T1" />
            <TierBadge tier="T2" />
            <TierBadge tier="T3" />
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Aggregation by Level</div>
          <div className="space-y-1">
            {ROLLUP_LEVELS.map(r => (
              <div key={r.key} className="flex justify-between text-[10px]">
                <span className="text-gray-500">{r.label}</span>
                <span className="text-gray-400 font-mono">{r.method.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
