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
  PORTFOLIO_TOTAL_DRAWN,
  fmt,
  fmtM,
  fmtRate,
} from './demo/intIncomeDemoRollupData';

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
  { name: 'Drawn Amount', field: 'drawn_amount', table: 'facility_exposure_snapshot', layer: 'L2', value: '$120,000,000', description: 'Funded/outstanding balance on the facility' },
  { name: 'All-In Rate (%)', field: 'all_in_rate_pct', table: 'facility_pricing_snapshot', layer: 'L2', value: '6.25%', description: 'Total annualized interest rate (base + spread)' },
];

const ROLLUP_LEVELS = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Table2,
    desc: 'Direct Calculation — drawn amount × rate for one loan',
    method: 'Direct Calculation',
    purpose: 'Revenue attribution per loan',
    tier: 'T3',
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    desc: 'SUM — total interest income across all facilities for one borrower',
    method: 'SUM',
    purpose: 'Obligor-level revenue view',
    tier: 'T3',
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    desc: 'SUM — total interest income across all facilities assigned to desk',
    method: 'SUM',
    purpose: 'Book revenue monitoring',
    tier: 'T3',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    desc: 'SUM — total interest income across all desks in portfolio',
    method: 'SUM',
    purpose: 'Revenue trending & budgeting',
    tier: 'T3',
  },
  {
    key: 'lob',
    label: 'Business Segment',
    icon: PieChart,
    desc: 'SUM — total interest income across all portfolios in segment',
    method: 'SUM',
    purpose: 'Executive revenue reporting',
    tier: 'T3',
  },
] as const;

/** L1 reference tables used by Interest Income */
const L1_TABLES = [
  { table: 'facility_master', desc: 'Loan identity — facility type, maturity, counterparty FK, lob_segment_id', fields: ['facility_id (PK)', 'counterparty_id (FK)', 'lob_segment_id (FK)', 'facility_type_code'] },
  { table: 'counterparty', desc: 'Borrower identity — legal name, credit rating, industry', fields: ['counterparty_id (PK)', 'legal_name', 'industry_code'] },
  { table: 'enterprise_business_taxonomy', desc: 'Organizational hierarchy — desk → portfolio → business segment tree', fields: ['managed_segment_id (PK)', 'parent_segment_id (FK)', 'segment_name', 'segment_level'] },
];

/** L2 snapshot fields used by Interest Income */
const L2_FIELDS = [
  { field: 'drawn_amount', table: 'facility_exposure_snapshot', desc: 'Funded/outstanding balance', used: true },
  { field: 'committed_amount', table: 'facility_exposure_snapshot', desc: 'Total authorized credit line', used: false },
  { field: 'gross_exposure_usd', table: 'facility_exposure_snapshot', desc: 'Total exposure (drawn + undrawn)', used: false },
  { field: 'all_in_rate_pct', table: 'facility_pricing_snapshot', desc: 'All-in interest rate (base + spread)', used: true },
  { field: 'base_rate_pct', table: 'facility_pricing_snapshot', desc: 'Benchmark rate component (e.g., SOFR)', used: false },
  { field: 'spread_bps', table: 'facility_pricing_snapshot', desc: 'Credit spread above base rate', used: false },
];

/** L3 output tables that store Interest Income values */
const L3_OUTPUT_TABLES = [
  {
    table: 'metric_value_fact',
    desc: 'Generic metric storage — Interest Income at every aggregation level',
    fields: ['metric_id = INT_INCOME', 'variant_id = INT_INCOME_CALC', 'aggregation_level', 'facility_id | counterparty_id | lob_id', 'value', 'unit = USD'],
    primary: true,
  },
  {
    table: 'lob_revenue_summary',
    desc: 'Business Segment-level revenue summary — includes interest_income_amt for revenue roll-ups',
    fields: ['lob_node_id', 'interest_income_amt', 'net_interest_income_amt', 'fee_income_amt'],
    primary: false,
  },
];

/** Join chain data for each rollup level */
interface JoinHop { from: string; fromLayer: 'L1' | 'L2'; to: string; toLayer: 'L1' | 'L2'; joinKey: string; note?: string }
interface JoinChainData { hops: JoinHop[]; aggregation: string; result: string }

const ROLLUP_JOIN_CHAINS: Record<string, JoinChainData> = {
  facility: {
    hops: [
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_pricing_snapshot', toLayer: 'L2', joinKey: 'facility_id + as_of_date', note: 'Pair balance with rate' },
    ],
    aggregation: 'Direct multiplication: drawn_amount × all_in_rate_pct / 100',
    result: 'One Interest Income value per facility',
  },
  counterparty: {
    hops: [
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_pricing_snapshot', toLayer: 'L2', joinKey: 'facility_id + as_of_date', note: 'Pair balance with rate' },
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get counterparty FK' },
    ],
    aggregation: 'SUM(drawn_amount × all_in_rate_pct / 100) GROUP BY counterparty_id',
    result: 'Total Interest Income per borrower',
  },
  desk: {
    hops: [
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_pricing_snapshot', toLayer: 'L2', joinKey: 'facility_id + as_of_date', note: 'Pair balance with rate' },
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get lob_segment_id FK' },
      { from: 'facility_master', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'lob_segment_id → managed_segment_id', note: 'Resolve desk name' },
    ],
    aggregation: 'SUM(drawn_amount × all_in_rate_pct / 100) GROUP BY desk',
    result: 'Total Interest Income per desk',
  },
  portfolio: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id → managed_segment_id', note: 'Walk tree: desk → portfolio' },
    ],
    aggregation: 'SUM of child desk Interest Income values via parent_segment_id traversal',
    result: 'Total Interest Income per portfolio',
  },
  lob: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id → managed_segment_id', note: 'Walk tree: portfolio → Business Segment root' },
    ],
    aggregation: 'SUM of child portfolio Interest Income values via recursive parent_segment_id',
    result: 'Total Interest Income per Business Segment',
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

function TierBadge({ tier, className = '' }: { tier: string; className?: string }) {
  const colors: Record<string, string> = {
    T1: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    T2: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    T3: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
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
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
        <span className="text-sm font-bold text-emerald-400">Interest Income (Calculated)</span>
      </div>

      <div className="space-y-1.5 text-xs mb-3">
        <div className="flex justify-between"><span className="text-gray-500">Metric Class</span><span className="text-gray-300">CALCULATED</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Unit Type</span><span className="text-gray-300">CURRENCY (USD)</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Direction</span><span className="text-gray-300">HIGHER_BETTER</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Rollup</span><span className="text-gray-300">Additive SUM</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Domain</span><span className="text-gray-300">Financial Planning / Profitability</span></div>
      </div>

      <div className="bg-black/30 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Drawn Amount</span>
          <span className="text-white font-mono font-bold">$120,000,000</span>
        </div>
        <div className="flex items-center justify-center text-gray-600 text-sm my-1">&times;</div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-gray-500">All-In Rate</span>
          <span className="text-white font-mono font-bold">6.25%</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <code className="text-xs text-gray-400 font-mono">Drawn &times; Rate / 100</code>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span className="text-lg font-black text-emerald-400 tabular-nums">$7,500,000</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-1.5 text-[10px] text-gray-500">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong className="text-emerald-300">T3:</strong> Always calculated by the platform. The bank never sends
          pre-computed Interest Income — it is derived from drawn_amount and all_in_rate_pct.
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * INPUT FIELDS — NUMERATOR & RATE SECTIONS
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
          <code className="font-mono text-emerald-400">{input.field}</code>
        </div>
        <div className="text-gray-500">{input.description}</div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FOUNDATIONAL RULE — ADDITIVE SUM
 * ──────────────────────────────────────────────────────────────────────────── */

function FoundationalRule() {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 mb-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <DollarSign className="w-4 h-4 text-emerald-400" aria-hidden="true" />
        </div>
        <div>
          <div className="text-xs font-bold text-emerald-300 mb-1.5">
            Foundational Rule: Currency Metrics Are Additive
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Interest Income is a <strong className="text-white">dollar amount</strong>, not a ratio. Dollar amounts can always
            be summed directly at every level of the hierarchy — no weighting, no pooling, no special formulas needed.
          </p>
          <div className="mt-2 bg-black/30 rounded-lg p-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex-1 text-center">
                <div className="text-emerald-400 font-mono mb-1">
                  {'Σ'} Interest Income
                </div>
                <div className="text-[9px] text-emerald-400/60">Always correct for currency</div>
              </div>
              <div className="text-gray-600 text-lg">vs.</div>
              <div className="flex-1 text-center">
                <div className="text-amber-400 font-mono mb-1 opacity-70">
                  avg(DSCR<sub>1</sub>, DSCR<sub>2</sub>, ...)
                </div>
                <div className="text-[9px] text-amber-400/60">Wrong for ratios — needs weighting</div>
              </div>
            </div>
          </div>
          <PlainEnglish>
            If Loan A earns $7.5M in interest and Loan B earns $4.9M, the total is simply $12.4M.
            Compare this to DSCR or LTV where you need exposure-weighted averages.
            Currency metrics are the simplest to roll up — just add.
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
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.04] hover:border-gray-700'
            }`}
            style={{ marginLeft: `${i * 4}px`, marginRight: `${i * 4}px` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expanded ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                  <Icon className={`w-4 h-4 ${expanded ? 'text-emerald-400' : 'text-gray-500'}`} aria-hidden="true" />
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
              <code className="font-mono text-emerald-400">{hop.joinKey}</code>
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
        <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-gray-500 font-medium">Result: </span>
          <span className="text-emerald-300">{chain.result}</span>
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
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Formula (Applied Directly)</div>
        <div className="text-sm font-mono text-emerald-400 text-center">
          Interest Income = drawn_amount &times; all_in_rate_pct / 100
        </div>
        <PlainEnglish>
          How much interest does this one loan generate per year? Multiply the amount borrowed by the interest rate.
        </PlainEnglish>
      </div>
      <JoinChainVisual levelKey="facility" />

      {/* Sample facilities */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-4 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Facility</div>
          <div className="text-right">Drawn</div>
          <div className="text-right">Rate</div>
          <div className="text-right">Interest Income</div>
        </div>
        {FACILITIES.map((f) => (
          <div key={f.name} className="grid grid-cols-4 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-400 truncate">{f.name}</div>
            <div className="text-right text-gray-300 font-mono">{fmtM(f.drawnAmount)}</div>
            <div className="text-right text-amber-400 font-mono">{fmtRate(f.allInRatePct)}</div>
            <div className="text-right text-emerald-400 font-mono font-bold">{fmt(f.interestIncome)}</div>
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
        A single borrower may have multiple facilities. Interest Income at the counterparty level
        is simply the sum of all facility interest incomes for that borrower.
      </div>
      <JoinChainVisual levelKey="counterparty" />

      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-3 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Counterparty</div>
          <div className="text-right">Total Drawn</div>
          <div className="text-right">Interest Income</div>
        </div>
        {COUNTERPARTIES.map((cp) => (
          <div key={cp.name} className="grid grid-cols-3 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-300 font-medium">{cp.name}</div>
            <div className="text-right text-gray-400 font-mono">{fmtM(cp.totalDrawn)}</div>
            <div className="text-right text-emerald-400 font-mono font-bold">{fmt(cp.interestIncome)}</div>
          </div>
        ))}
      </div>

      <PlainEnglish>
        Unlike DSCR which requires careful pooled-ratio calculations at the counterparty level,
        Interest Income is simply added across all of a borrower&apos;s facilities.
      </PlainEnglish>
    </div>
  );
}

function DeskDetail() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 leading-relaxed">
        Interest Income at the desk level sums all facility interest incomes assigned to that desk.
        Unlike DSCR which must be segmented by product type, Interest Income can be freely summed
        across any product mix — a dollar earned is a dollar earned.
      </div>
      <JoinChainVisual levelKey="desk" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DESKS.map((d) => (
          <div key={d.name} className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span className="text-xs font-bold text-emerald-300">{d.name}</span>
            </div>
            <div className="text-xs text-gray-400">
              {d.facilityCount} facilities &rarr; <span className="text-emerald-400 font-mono font-bold">{fmt(d.interestIncome)}</span>
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
        <div className="text-sm font-mono text-emerald-400 text-center">
          {'Σ'} Desk Interest Income
        </div>
        <div className="mt-2 text-center">
          {DESKS.map((d, i) => (
            <span key={d.name} className="text-xs font-mono text-gray-400">
              {i > 0 && ' + '}
              {fmt(d.interestIncome)}
            </span>
          ))}
          <span className="text-xs font-mono text-gray-600"> = </span>
          <span className="text-sm font-mono font-black text-emerald-400">{fmt(PORTFOLIO_TOTAL)}</span>
        </div>
        <PlainEnglish>
          The portfolio total is the annualized gross interest revenue across all desks.
          Executives use this for revenue trending, budget vs. actual comparison, and concentration analysis.
        </PlainEnglish>
      </div>

      {/* Revenue concentration */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-3 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Desk</div>
          <div className="text-right">Interest Income</div>
          <div className="text-right">% of Total</div>
        </div>
        {DESKS.map((d) => (
          <div key={d.name} className="grid grid-cols-3 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-300">{d.name}</div>
            <div className="text-right text-emerald-400 font-mono">{fmt(d.interestIncome)}</div>
            <div className="text-right text-gray-400 font-mono">{((d.interestIncome / PORTFOLIO_TOTAL) * 100).toFixed(1)}%</div>
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
        <div className="text-sm font-mono text-emerald-400 text-center">
          {'Σ'} Portfolio Interest Income
        </div>
        <PlainEnglish>
          At the highest level, Interest Income tells the CRO how much gross lending revenue
          each business segment generates. This feeds into NIM analysis, CCAR revenue projections,
          and FR Y-9C reporting.
        </PlainEnglish>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-3">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-blue-300 mb-1">Downstream Consumers</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Business Segment Interest Income feeds directly into:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="rounded bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-blue-300 font-bold">NIM:</span>{' '}
                <span className="text-gray-400">Net Interest Margin</span>
              </div>
              <div className="rounded bg-purple-500/10 border border-purple-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-purple-300 font-bold">PPNR:</span>{' '}
                <span className="text-gray-400">Pre-Provision Net Revenue</span>
              </div>
              <div className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-amber-300 font-bold">RAROC:</span>{' '}
                <span className="text-gray-400">Risk-Adjusted Return</span>
              </div>
              <div className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-emerald-300 font-bold">CCAR:</span>{' '}
                <span className="text-gray-400">Revenue Projection</span>
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
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
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
            <div className="text-[10px] text-gray-500 mb-1">{levelLabels[selectedLevel]} Interest Income</div>
            <div className="text-2xl font-black text-emerald-400 tabular-nums mb-2">
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
            t.primary ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-gray-800 bg-white/[0.02]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            <code className="text-xs font-mono text-emerald-300 font-bold">{t.table}</code>
            {t.primary && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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
          <div className="w-3 h-3 rounded bg-emerald-600" />
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
        Regulatory references: FR Y-9C, CCAR Revenue Projection, FR Y-14Q
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT
 * ──────────────────────────────────────────────────────────────────────────── */

export interface IntIncomeLineageViewProps {
  demoExpandedLevel?: string | null;
  demoL2Filter?: string;
  onStartDemo?: () => void;
}

export default function IntIncomeLineageView({
  demoExpandedLevel,
  onStartDemo,
}: IntIncomeLineageViewProps = {}) {
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
              <h1 className="text-xl font-bold text-white">Interest Income End-to-End Lineage</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                From data model to dashboard — complete lineage with additive SUM rollup
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
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
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
            title="Interest Income Configuration"
            subtitle="Formula: Drawn_Amount x All_In_Rate_Pct / 100"
          />
          <div data-demo="step1-variant-calculated">
            <MetricDefCard />
          </div>

          {/* Input fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div data-demo="num-section-calculated">
              <InputFieldSection input={METRIC_INPUTS[0]} />
            </div>
            <div data-demo="den-section-calculated">
              <InputFieldSection input={METRIC_INPUTS[1]} />
            </div>
          </div>

          <div data-demo="result-calculated" className="mt-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Interest Income</div>
              <div className="text-2xl font-black text-emerald-400 tabular-nums">$7,500,000</div>
              <div className="text-[10px] text-gray-600 mt-1">$120,000,000 &times; 6.25% / 100</div>
            </div>
          </div>

          <InsightCallout>
            <strong>Annualized approximation.</strong> This is a first-order approximation suitable for portfolio analytics
            and NIM decomposition. Actual accounting interest income may differ due to day count conventions, accruals,
            and payment schedules.
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
            subtitle="Reference tables that identify the borrower, loan, and organizational hierarchy"
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
            <strong>Shared dimensional backbone.</strong> These reference tables are used by every metric in the system.
            The <code className="text-blue-300">enterprise_business_taxonomy</code> tree enables recursive rollup
            from desk through portfolio to business segment via <code className="text-blue-300">parent_segment_id</code>.
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
            subtitle="Two snapshot tables provide the balance and rate inputs"
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
                  f.used ? 'bg-emerald-500/5' : ''
                }`}
              >
                <code className={`font-mono ${f.used ? 'text-emerald-400' : 'text-gray-500'}`}>{f.field}</code>
                <code className="font-mono text-amber-300 text-[10px]">{f.table}</code>
                <div className="text-gray-400 text-[10px]">{f.desc}</div>
                <div className="text-right">
                  {f.used && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />}
                </div>
              </div>
            ))}
          </div>
          <InsightCallout>
            <strong>Two tables, two fields.</strong> Interest Income only needs{' '}
            <code className="text-amber-300">drawn_amount</code> from exposure snapshots and{' '}
            <code className="text-amber-300">all_in_rate_pct</code> from pricing snapshots.
            The non-highlighted fields serve other metrics (LTV, spread analysis, utilization).
          </InsightCallout>
        </section>

        <FlowArrow label="Fields feed into calculation engine" />

        {/* ── STEP 4: CALCULATION ── */}
        <section data-demo="step4" aria-labelledby={`${headingPrefix}-step4`}>
          <SectionHeading
            id={`${headingPrefix}-step4`}
            icon={Zap}
            step="Step 4 — Calculation Engine"
            layerColor="bg-emerald-600"
            title="Interest Income Calculation"
            subtitle="T3 authority — always calculated by the platform from raw components"
          />
          <div data-demo="step4-variant-calculated">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-400">Interest Income (Calculated)</span>
                </div>
                <TierBadge tier="T3" />
              </div>
              <div className="bg-black/30 rounded-lg p-3 mb-3">
                <div className="text-sm font-mono text-center space-y-1">
                  <div className="text-gray-400">
                    <code className="text-amber-300">drawn_amount</code> &times;{' '}
                    <code className="text-amber-300">all_in_rate_pct</code> / 100
                  </div>
                  <div className="text-gray-600">&darr;</div>
                  <div className="text-gray-300">
                    $120,000,000 &times; 6.25 / 100
                  </div>
                  <div className="text-gray-600">&darr;</div>
                  <div className="text-emerald-400 font-bold text-lg">$7,500,000</div>
                </div>
              </div>
              <div className="flex items-start gap-1.5 text-[10px] text-gray-500">
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong className="text-emerald-300">T3 (Always Calculate):</strong> The platform always derives Interest Income
                  from the raw drawn_amount and all_in_rate_pct. The bank does not send pre-computed values.
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
            layerColor="bg-emerald-600"
            title="Storage & Aggregation"
            subtitle="Additive SUM at every level — the simplest rollup pattern"
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
