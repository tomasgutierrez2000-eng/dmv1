'use client';

import React, { useState, useId } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Database,
  Calculator,
  LayoutDashboard,
  Briefcase,
  ArrowDown,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Eye,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Table2,
  Users,
  FolderTree,
  PieChart,
  Info,
  Layers,
  Link2,
  DollarSign,
  TrendingUp,
  BarChart3,
  Play,
  Network,
  Workflow,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  FACILITIES,
  COUNTERPARTIES,
  DESKS,
  PORTFOLIO_TOTAL,
  fmt,
  fmtM,
  fmtPct,
  getParticipationMv,
} from './demo/collMvDemoRollupData';

/* ────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ──────────────────────────────────────────────────────────────────────────── */

interface InputField {
  name: string;
  field: string;
  table: string;
  layer: 'L1' | 'L2';
  value: string;
  description: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * STATIC DATA
 * ──────────────────────────────────────────────────────────────────────────── */

const METRIC_INPUTS: InputField[] = [
  { name: 'Current Valuation (USD)', field: 'current_valuation_usd', table: 'collateral_snapshot', layer: 'L2', value: '$120,000,000', description: 'Sum of current market appraisals for all collateral assets linked to the facility' },
  { name: 'Participation %', field: 'participation_pct', table: 'facility_counterparty_participation', layer: 'L1', value: '100%', description: 'Counterparty ownership share in the facility (used at counterparty level only)' },
];

const ROLLUP_LEVELS = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Table2,
    desc: 'SUM — sum current_valuation_usd across all collateral assets for one facility',
    method: 'Aggregation',
    purpose: 'Collateral coverage per loan',
    tier: 'T3',
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    desc: 'MV × Participation% — participation-weighted sum across facilities',
    method: 'Calculation',
    purpose: 'Obligor-level collateral attribution',
    tier: 'T3',
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    desc: 'SUM — total collateral MV across all facilities assigned to desk',
    method: 'SUM',
    purpose: 'Book collateral monitoring',
    tier: 'T3',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    desc: 'SUM — total collateral MV across all desks in portfolio',
    method: 'SUM',
    purpose: 'Portfolio collateral coverage',
    tier: 'T3',
  },
  {
    key: 'lob',
    label: 'Business Segment',
    icon: PieChart,
    desc: 'SUM — total collateral MV across all portfolios in segment',
    method: 'SUM',
    purpose: 'Executive collateral reporting',
    tier: 'T3',
  },
] as const;

/** L1 reference tables used by Current Collateral Market Value */
const L1_TABLES = [
  { table: 'facility_master', desc: 'Loan identity — facility type, counterparty FK, lob_segment_id', fields: ['facility_id (PK)', 'counterparty_id (FK)', 'lob_segment_id (FK)', 'facility_active_flag'] },
  { table: 'facility_counterparty_participation', desc: 'Counterparty participation share per facility', fields: ['facility_participation_id (PK)', 'facility_id (FK)', 'counterparty_id (FK)', 'participation_pct'] },
  { table: 'counterparty', desc: 'Borrower identity — legal name, credit rating', fields: ['counterparty_id (PK)', 'counterparty_name', 'risk_rating'] },
  { table: 'enterprise_business_taxonomy', desc: 'Organizational hierarchy — desk → portfolio → business segment tree', fields: ['managed_segment_id (PK)', 'parent_segment_id (FK)', 'segment_name', 'segment_level'] },
];

/** L2 snapshot fields used by Current Collateral Market Value */
const L2_FIELDS = [
  { field: 'current_valuation_usd', table: 'collateral_snapshot', desc: 'Current market appraisal value', used: true },
  { field: 'original_valuation_usd', table: 'collateral_snapshot', desc: 'Value at origination/pledge date', used: false },
  { field: 'haircut_pct', table: 'collateral_snapshot', desc: 'Regulatory risk adjustment percentage', used: false },
  { field: 'eligible_value_usd', table: 'collateral_snapshot', desc: 'Post-haircut value for CRM purposes', used: false },
  { field: 'allocated_amount_usd', table: 'collateral_snapshot', desc: 'Amount allocated to this facility', used: false },
  { field: 'total_collateral_mv_usd', table: 'facility_exposure_snapshot', desc: 'Pre-computed SUM of current_valuation_usd (materialized aggregate)', used: true },
];

/** L3 output tables that store Collateral MV values */
const L3_OUTPUT_TABLES = [
  {
    table: 'metric_value_fact',
    desc: 'Generic metric storage — Collateral MV at every aggregation level',
    fields: ['metric_id = COLL_MV', 'variant_id = COLL_MV_CALC', 'aggregation_level', 'facility_id | counterparty_id | lob_id', 'value', 'unit = USD'],
    primary: true,
  },
  {
    table: 'crm_allocation_summary',
    desc: 'Credit Risk Mitigation summary — includes total collateral MV for capital relief calculations',
    fields: ['lob_node_id', 'total_collateral_mv', 'eligible_collateral_mv', 'crm_benefit_amt'],
    primary: false,
  },
];

/** Join chain data for each rollup level */
interface JoinHop { from: string; fromLayer: 'L1' | 'L2'; to: string; toLayer: 'L1' | 'L2'; joinKey: string; note?: string }
interface JoinChainData { hops: JoinHop[]; aggregation: string; result: string }

const ROLLUP_JOIN_CHAINS: Record<string, JoinChainData> = {
  facility: {
    hops: [
      { from: 'collateral_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'SUM per facility' },
    ],
    aggregation: 'SUM(current_valuation_usd) GROUP BY facility_id',
    result: 'One Collateral MV value per facility',
  },
  counterparty: {
    hops: [
      { from: 'facility_master', fromLayer: 'L1', to: 'facility_counterparty_participation', toLayer: 'L1', joinKey: 'facility_id', note: 'Get participation_pct' },
    ],
    aggregation: 'SUM(MV × participation_pct) GROUP BY counterparty_id',
    result: 'Total participation-weighted Collateral MV per borrower',
  },
  desk: {
    hops: [
      { from: 'collateral_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get lob_segment_id FK' },
      { from: 'facility_master', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'lob_segment_id → managed_segment_id', note: 'Resolve desk name' },
    ],
    aggregation: 'SUM(current_valuation_usd) GROUP BY desk',
    result: 'Total Collateral MV per desk',
  },
  portfolio: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id → managed_segment_id', note: 'Walk tree: desk → portfolio' },
    ],
    aggregation: 'SUM of child desk Collateral MV values via parent_segment_id traversal',
    result: 'Total Collateral MV per portfolio',
  },
  lob: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id → managed_segment_id', note: 'Walk tree: portfolio → Business Segment root' },
    ],
    aggregation: 'SUM of child portfolio Collateral MV values via recursive parent_segment_id',
    result: 'Total Collateral MV per Business Segment',
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

function TierBadge({ tier, className = '' }: { tier: string; className?: string }) {
  const colors: Record<string, string> = {
    T1: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    T2: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    T3: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  };
  const labels: Record<string, string> = {
    T1: 'T1 — Always Source',
    T2: 'T2 — Source + Validate',
    T3: 'T3 — Always Calculate',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${colors[tier] || ''} ${className}`}
      title={labels[tier]}
    >
      <ShieldCheck className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
      {labels[tier] || tier}
    </span>
  );
}

function SectionHeading({
  id,
  icon: Icon,
  step,
  layerColor,
  title,
  subtitle,
}: {
  id: string;
  icon: React.ElementType;
  step: string;
  layerColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4" id={id}>
      <div className={`w-10 h-10 rounded-xl ${layerColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{step}</span>
        <h3 className="text-base font-bold text-white leading-tight">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function FlowArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-3" aria-hidden="true">
      <div className="w-px h-6 bg-gradient-to-b from-gray-700 to-gray-600" />
      {label && (
        <span className="text-[9px] font-medium text-gray-500 bg-gray-900/80 px-2 py-0.5 rounded-full border border-gray-800">
          {label}
        </span>
      )}
      <ArrowDown className="w-4 h-4 text-gray-600" />
    </div>
  );
}

function InsightCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-pwc-orange/30 bg-pwc-orange/5 px-4 py-3 flex items-start gap-3 mt-4">
      <div className="w-6 h-6 rounded-lg bg-pwc-orange/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Eye className="w-3.5 h-3.5 text-pwc-orange" aria-hidden="true" />
      </div>
      <div className="text-xs text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}

function PlainEnglish({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 mt-1.5">
      <span className="text-[9px] font-bold text-gray-600 bg-white/5 px-1.5 py-0.5 rounded flex-shrink-0">
        Plain English
      </span>
      <span className="text-[10px] text-gray-500 italic leading-relaxed">{children}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 1 — METRIC DEFINITION CARD
 * ──────────────────────────────────────────────────────────────────────────── */

function MetricDefCard() {
  return (
    <div className="rounded-xl border border-teal-500/40 bg-teal-500/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
        <span className="text-sm font-bold text-teal-400">Current Collateral Market Value (Calculated)</span>
      </div>

      <div className="space-y-1.5 text-xs mb-3">
        <div className="flex justify-between"><span className="text-gray-500">Metric Class</span><span className="text-gray-300">CALCULATED</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Unit Type</span><span className="text-gray-300">CURRENCY (USD)</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Direction</span><span className="text-gray-300">HIGHER_BETTER</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Rollup</span><span className="text-gray-300">SUM (with participation at counterparty)</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Domain</span><span className="text-gray-300">Credit Risk / Credit Management</span></div>
      </div>

      <div className="bg-black/30 rounded-lg p-3 mb-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Sample: Facility A (3 collateral assets)</div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Asset 1 (Multifamily Complex)</span>
          <span className="text-white font-mono font-bold">$55,000,000</span>
        </div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Asset 2 (Industrial Warehouse)</span>
          <span className="text-white font-mono font-bold">$40,000,000</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Asset 3 (Parking Structure)</span>
          <span className="text-white font-mono font-bold">$25,000,000</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <code className="text-xs text-gray-400 font-mono">SUM(current_valuation_usd)</code>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400" aria-hidden="true" />
          <span className="text-lg font-black text-teal-400 tabular-nums">$120,000,000</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-1.5 text-[10px] text-gray-500">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong className="text-teal-300">T3:</strong> Always calculated by the platform. Collateral MV is derived
          by summing current_valuation_usd from collateral_snapshot for each facility.
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * INPUT FIELDS — VALUATION & PARTICIPATION SECTIONS
 * ──────────────────────────────────────────────────────────────────────────── */

function InputFieldSection({ input }: { input: InputField }) {
  const layerColor = input.layer === 'L1' ? 'text-blue-300' : 'text-amber-300';
  return (
    <div className="rounded-lg border border-gray-800 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-300">{input.name}</span>
        <span className="text-white font-mono font-bold text-sm">{input.value}</span>
      </div>
      <div className="space-y-1 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Source:</span>
          <code className={`font-mono ${layerColor}`}>{input.layer}.{input.table}</code>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Field:</span>
          <code className="font-mono text-teal-400">{input.field}</code>
        </div>
        <div className="text-gray-500">{input.description}</div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FOUNDATIONAL RULE — SUM WITH PARTICIPATION AT COUNTERPARTY
 * ──────────────────────────────────────────────────────────────────────────── */

function FoundationalRule() {
  return (
    <div className="rounded-xl border border-teal-500/30 bg-teal-500/[0.06] p-4 mb-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <DollarSign className="w-4 h-4 text-teal-400" aria-hidden="true" />
        </div>
        <div>
          <div className="text-xs font-bold text-teal-300 mb-1.5">
            Foundational Rule: Dual Rollup Behavior
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Collateral MV uses <strong className="text-white">simple SUM</strong> for organizational rollups
            (desk, portfolio, business segment), but <strong className="text-white">participation-weighted SUM</strong> at
            the counterparty level. When a facility has multiple counterparties, each counterparty&apos;s
            attributed MV equals MV &times; participation_pct.
          </p>
          <div className="mt-2 bg-black/30 rounded-lg p-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex-1 text-center">
                <div className="text-teal-400 font-mono mb-1">
                  {'Σ'} Collateral MV
                </div>
                <div className="text-[9px] text-teal-400/60">Desk / Portfolio / LoB</div>
              </div>
              <div className="text-gray-600 text-lg">vs.</div>
              <div className="flex-1 text-center">
                <div className="text-amber-400 font-mono mb-1">
                  {'Σ'}(MV &times; pct)
                </div>
                <div className="text-[9px] text-amber-400/60">Counterparty — participation-weighted</div>
              </div>
            </div>
          </div>
          <PlainEnglish>
            For organizational hierarchy (desk up to business segment), just add collateral values directly.
            But when attributing to counterparties, multiply by their participation share first —
            if Apex owns 60% of a $50M facility, they get $30M.
          </PlainEnglish>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * ROLLUP PYRAMID
 * ──────────────────────────────────────────────────────────────────────────── */

function RollupPyramid({
  expandedLevel,
  onToggle,
}: {
  expandedLevel: string | null;
  onToggle: (k: string) => void;
}) {
  return (
    <div className="space-y-2">
      {ROLLUP_LEVELS.map((level, i) => {
        const expanded = expandedLevel === level.key;
        const Icon = level.icon;
        return (
          <button
            key={level.key}
            data-demo={`rollup-${level.key}`}
            onClick={() => onToggle(level.key)}
            aria-expanded={expanded}
            className={`w-full rounded-xl border p-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
              expanded
                ? 'border-teal-500/40 bg-teal-500/10'
                : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.04] hover:border-gray-700'
            }`}
            style={{ marginLeft: `${i * 4}px`, marginRight: `${i * 4}px` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expanded ? 'bg-teal-500/20' : 'bg-white/5'}`}>
                  <Icon className={`w-4 h-4 ${expanded ? 'text-teal-400' : 'text-gray-500'}`} aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{level.label}</span>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-gray-800">
                      {level.method}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500">{level.purpose}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TierBadge tier={level.tier} />
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" aria-hidden="true" />
                )}
              </div>
            </div>

            {expanded && (
              <div className="mt-3 pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                <LevelDetail levelKey={level.key} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * JOIN CHAIN VISUAL
 * ──────────────────────────────────────────────────────────────────────────── */

function JoinChainVisual({ levelKey }: { levelKey: string }) {
  const chain = ROLLUP_JOIN_CHAINS[levelKey];
  if (!chain) return null;

  return (
    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.03] p-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Workflow className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Join Path</span>
      </div>

      <div className="space-y-1.5">
        {chain.hops.map((hop, i) => {
          const fromColor = hop.fromLayer === 'L2' ? 'text-amber-300' : 'text-blue-300';
          const toColor = hop.toLayer === 'L2' ? 'text-amber-300' : 'text-blue-300';
          return (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center text-[8px] font-bold text-gray-500 flex-shrink-0">{i + 1}</span>
              <code className={`font-mono ${fromColor}`}>{hop.from}</code>
              <span className="text-gray-600">&rarr;</span>
              <code className={`font-mono ${toColor}`}>{hop.to}</code>
              <span className="text-gray-700">ON</span>
              <code className="font-mono text-teal-400">{hop.joinKey}</code>
              {hop.note && <span className="text-gray-600 italic ml-1">({hop.note})</span>}
            </div>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-white/5 flex items-start gap-2 text-[10px]">
        <RefreshCw className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-gray-500 font-medium">Aggregation: </span>
          <span className="text-purple-300">{chain.aggregation}</span>
        </div>
      </div>

      <div className="mt-1.5 flex items-start gap-2 text-[10px]">
        <Sparkles className="w-3 h-3 text-teal-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-gray-500 font-medium">Result: </span>
          <span className="text-teal-300">{chain.result}</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * LEVEL-SPECIFIC DETAIL PANELS
 * ──────────────────────────────────────────────────────────────────────────── */

function LevelDetail({ levelKey }: { levelKey: string }) {
  switch (levelKey) {
    case 'facility':
      return <FacilityDetail />;
    case 'counterparty':
      return <CounterpartyDetail />;
    case 'desk':
      return <DeskDetail />;
    case 'portfolio':
      return <PortfolioDetail />;
    case 'lob':
      return <LoBDetail />;
    default:
      return null;
  }
}

function FacilityDetail() {
  return (
    <div className="space-y-3">
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Formula (Aggregation)</div>
        <div className="text-sm font-mono text-teal-400 text-center">
          Collateral MV = SUM(current_valuation_usd) per facility
        </div>
        <PlainEnglish>
          How much collateral backs this one loan? Add up the current market value of every pledged asset.
        </PlainEnglish>
      </div>
      <JoinChainVisual levelKey="facility" />

      {/* Sample facilities */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-3 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Facility</div>
          <div className="text-right">Assets</div>
          <div className="text-right">Collateral MV</div>
        </div>
        {FACILITIES.map((f) => (
          <div key={f.name} className="grid grid-cols-3 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-400 truncate">{f.name}</div>
            <div className="text-right text-gray-300 font-mono">{f.collateralCount}</div>
            <div className="text-right text-teal-400 font-mono font-bold">{fmtM(f.collateralMv)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CounterpartyDetail() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 leading-relaxed">
        A single borrower may participate in multiple facilities. Collateral MV at the counterparty level
        is the <strong className="text-white">participation-weighted sum</strong> across all facilities — each
        facility&apos;s MV is multiplied by the counterparty&apos;s participation percentage before summing.
      </div>
      <JoinChainVisual levelKey="counterparty" />

      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-3 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Counterparty</div>
          <div className="text-right">Facilities</div>
          <div className="text-right">Collateral MV</div>
        </div>
        {COUNTERPARTIES.map((cp) => (
          <div key={cp.name} className="grid grid-cols-3 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-300 font-medium">{cp.name}</div>
            <div className="text-right text-gray-400 font-mono">{cp.facilityCount}</div>
            <div className="text-right text-teal-400 font-mono font-bold">{fmtM(cp.collateralMv)}</div>
          </div>
        ))}
      </div>

      {/* Participation breakdown */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-2">
          Facility E Participation Split
        </div>
        <div className="text-xs text-gray-400 mb-2">
          Facility E ($50M total) is shared between two counterparties:
        </div>
        <div className="space-y-1.5">
          {FACILITIES[4].participations?.map((p) => (
            <div key={p.counterpartyName} className="flex items-center justify-between text-xs">
              <span className="text-gray-300">{p.counterpartyName}</span>
              <div className="flex items-center gap-3">
                <span className="text-amber-400 font-mono">{fmtPct(p.pct)}</span>
                <span className="text-gray-600">&times;</span>
                <span className="text-gray-400 font-mono">{fmtM(FACILITIES[4].collateralMv)}</span>
                <span className="text-gray-600">=</span>
                <span className="text-teal-400 font-mono font-bold">{fmtM(p.attributedMv)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PlainEnglish>
        Unlike Interest Income which simply sums across a borrower&apos;s facilities,
        Collateral MV must account for participation shares. If Apex owns 60% of a shared facility,
        they only get credit for 60% of the collateral value.
      </PlainEnglish>
    </div>
  );
}

function DeskDetail() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 leading-relaxed">
        Collateral MV at the desk level sums all facility collateral values assigned to that desk.
        At this level, participation weighting does not apply — each facility&apos;s full MV is counted once
        under its assigned desk.
      </div>
      <JoinChainVisual levelKey="desk" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DESKS.map((d) => (
          <div key={d.name} className="rounded-lg border border-teal-500/20 bg-teal-500/[0.04] p-3">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-4 h-4 text-teal-400" aria-hidden="true" />
              <span className="text-xs font-bold text-teal-300">{d.name}</span>
            </div>
            <div className="text-xs text-gray-400">
              {d.facilityCount} facilities &rarr; <span className="text-teal-400 font-mono font-bold">{fmtM(d.collateralMv)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortfolioDetail() {
  return (
    <div className="space-y-3">
      <JoinChainVisual levelKey="portfolio" />
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Portfolio Total: SUM of All Desks</div>
        <div className="text-sm font-mono text-teal-400 text-center">
          {'Σ'} Desk Collateral MV
        </div>
        <div className="mt-2 text-center">
          {DESKS.map((d, i) => (
            <span key={d.name} className="text-xs font-mono text-gray-400">
              {i > 0 && ' + '}
              {fmtM(d.collateralMv)}
            </span>
          ))}
          <span className="text-xs font-mono text-gray-600"> = </span>
          <span className="text-sm font-mono font-black text-teal-400">{fmt(PORTFOLIO_TOTAL)}</span>
        </div>
        <PlainEnglish>
          The portfolio total represents total collateral coverage across all desks.
          Executives use this for collateral adequacy trending, coverage ratios, and stress testing inputs.
        </PlainEnglish>
      </div>

      {/* Collateral concentration */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-3 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Desk</div>
          <div className="text-right">Collateral MV</div>
          <div className="text-right">% of Total</div>
        </div>
        {DESKS.map((d) => (
          <div key={d.name} className="grid grid-cols-3 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-300">{d.name}</div>
            <div className="text-right text-teal-400 font-mono">{fmtM(d.collateralMv)}</div>
            <div className="text-right text-gray-400 font-mono">{((d.collateralMv / PORTFOLIO_TOTAL) * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoBDetail() {
  return (
    <div className="space-y-3">
      <JoinChainVisual levelKey="lob" />
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Business Segment Total</div>
        <div className="text-sm font-mono text-teal-400 text-center">
          {'Σ'} Portfolio Collateral MV
        </div>
        <PlainEnglish>
          At the highest level, Collateral MV tells the CRO how much collateral value
          underpins each business segment. This feeds into LTV analysis, LGD estimation,
          Basel CRM capital relief, and CCAR stress testing.
        </PlainEnglish>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-3">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-blue-300 mb-1">Downstream Consumers</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Business Segment Collateral MV feeds directly into:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="rounded bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-blue-300 font-bold">LTV:</span>{' '}
                <span className="text-gray-400">Loan-to-Value (collateral is the denominator)</span>
              </div>
              <div className="rounded bg-purple-500/10 border border-purple-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-purple-300 font-bold">LGD:</span>{' '}
                <span className="text-gray-400">Loss Given Default estimation</span>
              </div>
              <div className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-amber-300 font-bold">Basel CRM:</span>{' '}
                <span className="text-gray-400">Credit Risk Mitigation capital relief</span>
              </div>
              <div className="rounded bg-teal-500/10 border border-teal-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-teal-300 font-bold">CCAR:</span>{' '}
                <span className="text-gray-400">Stress testing collateral adequacy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * DASHBOARD CONSUMPTION
 * ──────────────────────────────────────────────────────────────────────────── */

function DashboardConsumption() {
  const [selectedLevel, setSelectedLevel] = useState('portfolio');
  const levels = ['facility', 'counterparty', 'desk', 'portfolio', 'lob'];
  const levelLabels: Record<string, string> = {
    facility: 'Facility',
    counterparty: 'Counterparty',
    desk: 'Desk',
    portfolio: 'Portfolio',
    lob: 'Business Segment',
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Step 1: Pick level */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-300">1</span>
            Select Aggregation Level
          </div>
          <div className="space-y-1.5">
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => setSelectedLevel(l)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                  selectedLevel === l
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                    : 'bg-white/[0.02] text-gray-400 border border-gray-800 hover:border-gray-700'
                }`}
              >
                {levelLabels[l]}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Preview */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-300">2</span>
            Dashboard Preview
          </div>
          <div className="rounded-xl border border-gray-700 bg-black/40 p-4">
            <div className="text-[10px] text-gray-500 mb-1">{levelLabels[selectedLevel]} Collateral MV</div>
            <div className="text-2xl font-black text-teal-400 tabular-nums mb-2">
              {fmt(PORTFOLIO_TOTAL)}
            </div>
            <div className="text-[10px] text-gray-500">
              Across {FACILITIES.length} facilities, {COUNTERPARTIES.length} counterparties, {DESKS.length} desks
            </div>
            <div className="mt-3 pt-3 border-t border-gray-800">
              <div className="text-[9px] text-gray-600 mb-1.5">Rollup Method</div>
              <div className="space-y-1">
                {ROLLUP_LEVELS.map((r) => (
                  <div key={r.key} className="flex justify-between text-[10px]">
                    <span className="text-gray-500">{r.label}</span>
                    <span className="text-gray-400 font-mono">{r.method}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * L3 OUTPUT TABLES
 * ──────────────────────────────────────────────────────────────────────────── */

function L3OutputTablesView() {
  return (
    <div className="space-y-2">
      {L3_OUTPUT_TABLES.map((t) => (
        <div
          key={t.table}
          className={`rounded-lg border p-3 ${
            t.primary ? 'border-teal-500/30 bg-teal-500/[0.04]' : 'border-gray-800 bg-white/[0.02]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Database className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
            <code className="text-xs font-mono text-teal-300 font-bold">{t.table}</code>
            {t.primary && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Primary
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-400 mb-2">{t.desc}</div>
          <div className="flex flex-wrap gap-1">
            {t.fields.map((f) => (
              <span key={f} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-500 border border-gray-800">
                {f}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FOOTER LEGEND
 * ──────────────────────────────────────────────────────────────────────────── */

function FooterLegend() {
  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-5 mt-6">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Legend</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-600" />
          <span className="text-[10px] text-gray-400">L1 Reference</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-600" />
          <span className="text-[10px] text-gray-400">L2 Snapshot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-teal-600" />
          <span className="text-[10px] text-gray-400">L3 Output / Calc</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-pink-600" />
          <span className="text-[10px] text-gray-400">Dashboard</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 md:grid-cols-3 gap-2">
        <TierBadge tier="T1" />
        <TierBadge tier="T2" />
        <TierBadge tier="T3" />
      </div>
      <div className="mt-3 pt-3 border-t border-gray-800 text-[10px] text-gray-600">
        Regulatory references: FR Y-14Q, Basel III CRM, CCAR
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT
 * ──────────────────────────────────────────────────────────────────────────── */

export interface CollMvLineageViewProps {
  demoExpandedLevel?: string | null;
  onStartDemo?: () => void;
}

export default function CollMvLineageView({
  demoExpandedLevel,
  onStartDemo,
}: CollMvLineageViewProps = {}) {
  const [expandedLevelInternal, setExpandedLevelInternal] = useState<string | null>('facility');
  const headingPrefix = useId();

  const expandedLevel = demoExpandedLevel !== undefined ? demoExpandedLevel : expandedLevelInternal;
  const setExpandedLevel = (k: string | null) => setExpandedLevelInternal(k);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ── HEADER ── */}
      <header data-demo="header" className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Link
                href="/metrics/library"
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-400 transition-colors mb-1 no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Metric Library
              </Link>
              <h1 className="text-xl font-bold text-white">Current Collateral Market Value End-to-End Lineage</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                From data model to dashboard — complete lineage with SUM rollup and participation-weighted counterparty attribution
              </p>
            </div>
            <div className="flex items-center gap-4">
              {onStartDemo && (
                <button
                  onClick={onStartDemo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-pwc-orange/15 text-pwc-orange border border-pwc-orange/30 hover:bg-pwc-orange/25 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pwc-orange"
                >
                  <Play className="w-3.5 h-3.5" />
                  Guided Demo
                </button>
              )}
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span className="text-xs text-gray-400">Currency (SUM)</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-2">
        {/* ── STEP 1: METRIC DEFINITION ── */}
        <section data-demo="step1" aria-labelledby={`${headingPrefix}-step1`}>
          <SectionHeading
            id={`${headingPrefix}-step1`}
            icon={Calculator}
            step="Step 1 — Metric Definition"
            layerColor="bg-purple-600"
            title="Current Collateral Market Value Configuration"
            subtitle="Formula: SUM(current_valuation_usd) from collateral_snapshot per facility"
          />
          <div data-demo="step1-variant-gross">
            <MetricDefCard />
          </div>

          {/* Input fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div data-demo="num-section-gross">
              <InputFieldSection input={METRIC_INPUTS[0]} />
            </div>
            <div data-demo="den-section-gross">
              <InputFieldSection input={METRIC_INPUTS[1]} />
            </div>
          </div>

          <div data-demo="result-gross" className="mt-4">
            <div className="rounded-lg border border-teal-500/30 bg-teal-500/[0.06] p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Collateral MV (Facility A)</div>
              <div className="text-2xl font-black text-teal-400 tabular-nums">$120,000,000</div>
              <div className="text-[10px] text-gray-600 mt-1">$55M + $40M + $25M = $120M (3 collateral assets)</div>
            </div>
          </div>

          <InsightCallout>
            <strong>Point-in-time market value.</strong> Collateral valuations reflect the most recent appraisal
            and are subject to periodic revaluation. Haircuts and eligible values are separate fields used
            for regulatory CRM calculations.
          </InsightCallout>
        </section>

        <FlowArrow label="Input fields map to data model tables" />

        {/* ── STEP 2: L1 REFERENCE ── */}
        <section data-demo="step2" aria-labelledby={`${headingPrefix}-step2`}>
          <SectionHeading
            id={`${headingPrefix}-step2`}
            icon={Database}
            step="Step 2 — L1 Reference Data"
            layerColor="bg-blue-600"
            title="Dimensional Anchors"
            subtitle="Reference tables that identify the facility, counterparty participation, and organizational hierarchy"
          />
          <div className="space-y-2">
            {L1_TABLES.map((t) => (
              <div key={t.table} className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                  <code className="text-xs font-mono text-blue-300 font-bold">L1.{t.table}</code>
                </div>
                <div className="text-[10px] text-gray-400 mb-2">{t.desc}</div>
                <div className="flex flex-wrap gap-1">
                  {t.fields.map((f) => (
                    <span key={f} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-500 border border-gray-800">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <InsightCallout>
            <strong>Participation table is key.</strong> The{' '}
            <code className="text-blue-300">facility_counterparty_participation</code> table maps each
            counterparty&apos;s ownership share in a facility. Most facilities are 100% single-counterparty,
            but shared facilities require participation_pct for accurate attribution.
          </InsightCallout>
        </section>

        <FlowArrow label="Dimension keys join to snapshot data" />

        {/* ── STEP 3: L2 SNAPSHOT ── */}
        <section data-demo="step3" aria-labelledby={`${headingPrefix}-step3`}>
          <SectionHeading
            id={`${headingPrefix}-step3`}
            icon={Layers}
            step="Step 3 — L2 Snapshot Data"
            layerColor="bg-amber-600"
            title="Source Data Tables"
            subtitle="Collateral snapshot provides current and historical appraisal values"
          />
          <div className="rounded-lg border border-gray-800 overflow-hidden">
            <div className="grid grid-cols-4 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
              <div>Field</div>
              <div>Table</div>
              <div>Description</div>
              <div className="text-right">Used</div>
            </div>
            {L2_FIELDS.map((f) => (
              <div
                key={f.field}
                className={`grid grid-cols-4 text-xs px-3 py-1.5 border-t border-gray-800/50 ${
                  f.used ? 'bg-teal-500/5' : ''
                }`}
              >
                <code className={`font-mono ${f.used ? 'text-teal-400' : 'text-gray-500'}`}>{f.field}</code>
                <code className="font-mono text-amber-300 text-[10px]">{f.table}</code>
                <div className="text-gray-400 text-[10px]">{f.desc}</div>
                <div className="text-right">
                  {f.used && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 inline" />}
                </div>
              </div>
            ))}
          </div>
          <InsightCallout>
            <strong>One table, one field.</strong> Current Collateral MV only needs{' '}
            <code className="text-amber-300">current_valuation_usd</code> from collateral snapshots.
            The non-highlighted fields serve other metrics (eligible value for Basel CRM, haircuts for
            regulatory capital, allocated amounts for facility-level coverage).
          </InsightCallout>
        </section>

        <FlowArrow label="Fields feed into calculation engine" />

        {/* ── STEP 4: CALCULATION ── */}
        <section data-demo="step4" aria-labelledby={`${headingPrefix}-step4`}>
          <SectionHeading
            id={`${headingPrefix}-step4`}
            icon={Zap}
            step="Step 4 — Calculation Engine"
            layerColor="bg-teal-600"
            title="Collateral MV Calculation"
            subtitle="T3 authority — always calculated by the platform from raw appraisal values"
          />
          <div data-demo="step4-variant-gross">
            <div className="rounded-xl border border-teal-500/40 bg-teal-500/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  <span className="text-xs font-bold text-teal-400">Current Collateral Market Value (Calculated)</span>
                </div>
                <TierBadge tier="T3" />
              </div>
              <div className="bg-black/30 rounded-lg p-3 mb-3">
                <div className="text-sm font-mono text-center space-y-1">
                  <div className="text-gray-400">
                    SUM(<code className="text-amber-300">current_valuation_usd</code>) per facility
                  </div>
                  <div className="text-gray-600">&darr;</div>
                  <div className="text-gray-300">
                    $55,000,000 + $40,000,000 + $25,000,000
                  </div>
                  <div className="text-gray-600">&darr;</div>
                  <div className="text-teal-400 font-bold text-lg">$120,000,000</div>
                </div>
              </div>
              <div className="flex items-start gap-1.5 text-[10px] text-gray-500">
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong className="text-teal-300">T3 (Always Calculate):</strong> The platform always derives Collateral MV
                  from the raw current_valuation_usd values. The bank does not send pre-computed totals.
                </span>
              </div>
            </div>
          </div>
        </section>

        <FlowArrow label="Results stored in L3 tables, then rolled up" />

        {/* ── STEP 5: L3 OUTPUT + ROLLUP ── */}
        <section data-demo="step5" aria-labelledby={`${headingPrefix}-step5`}>
          <SectionHeading
            id={`${headingPrefix}-step5`}
            icon={GitBranch}
            step="Step 5 — L3 Output & Rollup Hierarchy"
            layerColor="bg-teal-600"
            title="Storage & Aggregation"
            subtitle="SUM at organizational levels, participation-weighted at counterparty"
          />

          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <Database className="w-3 h-3" aria-hidden="true" />
              L3 Output Tables
            </div>
            <L3OutputTablesView />
          </div>

          <div data-demo="foundational-rule"><FoundationalRule /></div>

          <div className="mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <Link2 className="w-3 h-3" aria-hidden="true" />
              Rollup Hierarchy — Facility {'→'} Counterparty {'→'} Desk {'→'} Portfolio {'→'} Business Segment — click to expand
            </div>
          </div>
          <RollupPyramid expandedLevel={expandedLevel} onToggle={(k) => setExpandedLevel(expandedLevel === k ? null : k)} />
        </section>

        <FlowArrow label="Aggregated values feed into dashboards" />

        {/* ── STEP 6: DASHBOARD ── */}
        <section data-demo="step6" aria-labelledby={`${headingPrefix}-step6`}>
          <SectionHeading
            id={`${headingPrefix}-step6`}
            icon={LayoutDashboard}
            step="Step 6 — Dashboard Consumption"
            layerColor="bg-pink-600"
            title="Self-Service Connection"
            subtitle="Pick the aggregation level, build — no SQL needed"
          />
          <DashboardConsumption />
        </section>

        {/* ── LEGEND ── */}
        <FooterLegend />
      </main>
    </div>
  );
}
