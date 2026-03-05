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
  TrendingUp,
  BarChart3,
  Play,
  Workflow,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import {
  FACILITIES,
  COUNTERPARTIES,
  DESKS,
  PORTFOLIO_MIGRATION_SCORE,
  PORTFOLIO_TOTAL_EXPOSURE,
  RATING_SCALE,
  fmtExp,
  fmtScore,
  fmtNotch,
  dirSymbol,
  dirColor,
} from './demo/rrMigDemoRollupData';

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
  { name: 'Current Rating', field: 'rating_value', table: 'counterparty_rating_observation', layer: 'L2', value: '3', description: 'Current internal risk rating (1-5 scale)' },
  { name: 'Prior Rating', field: 'prior_rating_value', table: 'counterparty_rating_observation', layer: 'L2', value: '2', description: 'Previous internal risk rating before last review' },
  { name: 'Gross Exposure', field: 'gross_exposure_usd', table: 'facility_exposure_snapshot', layer: 'L2', value: '$20,000,000', description: 'Total credit exposure — used as weight for aggregation' },
];

const ROLLUP_LEVELS = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Table2,
    desc: 'Direct Calculation — notch change per facility',
    method: 'Direct Calculation',
    purpose: 'Per-loan migration tracking',
    tier: 'T3',
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    desc: 'Exposure-Weighted Average across all facilities for one borrower',
    method: 'EXP-WTD AVG',
    purpose: 'Obligor-level migration view',
    tier: 'T3',
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    desc: 'Exposure-Weighted Average across all facilities in desk',
    method: 'EXP-WTD AVG',
    purpose: 'Book credit quality monitoring',
    tier: 'T3',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    desc: 'Exposure-Weighted Average across desks',
    method: 'EXP-WTD AVG',
    purpose: 'Credit quality trending',
    tier: 'T3',
  },
  {
    key: 'lob',
    label: 'Business Segment',
    icon: PieChart,
    desc: 'Exposure-Weighted Average across portfolios in segment',
    method: 'EXP-WTD AVG',
    purpose: 'Executive credit quality reporting',
    tier: 'T3',
  },
] as const;

/** L1 reference tables used by Risk Rating Migration */
const L1_TABLES = [
  { table: 'facility_master', desc: 'Loan identity — links facility to counterparty and business unit', fields: ['facility_id (PK)', 'counterparty_id (FK)', 'lob_segment_id (FK)', 'facility_type_code'] },
  { table: 'counterparty', desc: 'Borrower identity — legal name, industry, internal rating FK', fields: ['counterparty_id (PK)', 'legal_name', 'industry_code'] },
  { table: 'enterprise_business_taxonomy', desc: 'Organizational hierarchy — desk \u2192 portfolio \u2192 business segment tree', fields: ['managed_segment_id (PK)', 'parent_segment_id (FK)', 'segment_name', 'segment_level'] },
];

/** L2 snapshot fields used by Risk Rating Migration */
const L2_FIELDS = [
  { field: 'rating_value', table: 'counterparty_rating_observation', desc: 'Current internal risk rating (1-5)', used: true },
  { field: 'prior_rating_value', table: 'counterparty_rating_observation', desc: 'Previous internal rating before review', used: true },
  { field: 'rating_type', table: 'counterparty_rating_observation', desc: 'INTERNAL or EXTERNAL filter', used: false },
  { field: 'rating_date', table: 'counterparty_rating_observation', desc: 'Date of rating assignment', used: false },
  { field: 'gross_exposure_usd', table: 'facility_exposure_snapshot', desc: 'Total credit exposure for weighting', used: true },
  { field: 'drawn_amount', table: 'facility_exposure_snapshot', desc: 'Funded balance', used: false },
];

/** L3 output tables that store Risk Rating Migration values */
const L3_OUTPUT_TABLES = [
  {
    table: 'metric_value_fact',
    desc: 'Generic metric storage — Migration Score at every aggregation level',
    fields: ['metric_id = RR_MIG', 'variant_id = RR_MIG_WTD', 'aggregation_level', 'facility_id | counterparty_id | lob_id', 'value', 'unit = NOTCH'],
    primary: true,
  },
  {
    table: 'credit_quality_summary',
    desc: 'Desk/portfolio-level credit quality dashboard — includes migration_score, downgrade_pct, upgrade_pct',
    fields: ['lob_node_id', 'migration_score', 'downgrade_pct', 'upgrade_pct', 'stable_pct'],
    primary: false,
  },
];

/** Join chain data for each rollup level */
interface JoinHop { from: string; fromLayer: 'L1' | 'L2'; to: string; toLayer: 'L1' | 'L2'; joinKey: string; note?: string }
interface JoinChainData { hops: JoinHop[]; aggregation: string; result: string }

const ROLLUP_JOIN_CHAINS: Record<string, JoinChainData> = {
  facility: {
    hops: [
      { from: 'counterparty_rating_observation', fromLayer: 'L2', to: 'counterparty', toLayer: 'L1', joinKey: 'counterparty_id', note: 'Link rating to borrower' },
      { from: 'counterparty', fromLayer: 'L1', to: 'facility_master', toLayer: 'L1', joinKey: 'counterparty_id', note: 'Get facility FK' },
      { from: 'facility_master', fromLayer: 'L1', to: 'facility_exposure_snapshot', toLayer: 'L2', joinKey: 'facility_id', note: 'Get exposure weight' },
    ],
    aggregation: 'Direct: (rating_value - prior_rating_value) applied per facility',
    result: 'One Notch Change value per facility',
  },
  counterparty: {
    hops: [
      { from: 'counterparty_rating_observation', fromLayer: 'L2', to: 'counterparty', toLayer: 'L1', joinKey: 'counterparty_id', note: 'Link rating to borrower' },
      { from: 'counterparty', fromLayer: 'L1', to: 'facility_master', toLayer: 'L1', joinKey: 'counterparty_id', note: 'Get facility FK' },
      { from: 'facility_master', fromLayer: 'L1', to: 'facility_exposure_snapshot', toLayer: 'L2', joinKey: 'facility_id', note: 'Get exposure weight' },
    ],
    aggregation: 'SUM(notch_change \u00d7 gross_exposure_usd) / SUM(gross_exposure_usd) GROUP BY counterparty_id',
    result: 'Weighted average migration score per borrower',
  },
  desk: {
    hops: [
      { from: 'counterparty_rating_observation', fromLayer: 'L2', to: 'counterparty', toLayer: 'L1', joinKey: 'counterparty_id', note: 'Link rating to borrower' },
      { from: 'counterparty', fromLayer: 'L1', to: 'facility_master', toLayer: 'L1', joinKey: 'counterparty_id', note: 'Get facility FK' },
      { from: 'facility_master', fromLayer: 'L1', to: 'facility_exposure_snapshot', toLayer: 'L2', joinKey: 'facility_id', note: 'Get exposure weight' },
      { from: 'facility_master', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'lob_segment_id \u2192 managed_segment_id', note: 'Resolve desk name' },
    ],
    aggregation: 'SUM(notch_change \u00d7 gross_exposure_usd) / SUM(gross_exposure_usd) GROUP BY desk',
    result: 'Weighted average migration score per desk',
  },
  portfolio: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id \u2192 managed_segment_id', note: 'Walk tree: desk \u2192 portfolio' },
    ],
    aggregation: 'SUM of child desk migration scores weighted by exposure',
    result: 'Weighted average migration score per portfolio',
  },
  lob: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id \u2192 managed_segment_id', note: 'Walk tree: portfolio \u2192 Business Segment root' },
    ],
    aggregation: 'SUM of child portfolio migration scores weighted by exposure',
    result: 'Weighted average migration score per Business Segment',
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

function TierBadge({ tier, className = '' }: { tier: string; className?: string }) {
  const colors: Record<string, string> = {
    T1: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    T2: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    T3: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };
  const labels: Record<string, string> = {
    T1: 'T1 \u2014 Always Source',
    T2: 'T2 \u2014 Source + Validate',
    T3: 'T3 \u2014 Always Calculate',
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

/** Helper to color-code a migration score */
function scoreColor(score: number): string {
  if (score < 0) return 'text-emerald-400';
  if (score > 0) return 'text-rose-400';
  return 'text-gray-400';
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 1 — METRIC DEFINITION CARD
 * ──────────────────────────────────────────────────────────────────────────── */

function MetricDefCard() {
  return (
    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
        <span className="text-sm font-bold text-rose-400">Risk Rating Migration (Derived)</span>
      </div>

      <div className="space-y-1.5 text-xs mb-3">
        <div className="flex justify-between"><span className="text-gray-500">Metric Class</span><span className="text-gray-300">DERIVED</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Unit Type</span><span className="text-gray-300">RATIO (Notch Change)</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Direction</span><span className="text-gray-300">LOWER_BETTER</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Rollup</span><span className="text-gray-300">Exposure-Weighted Average</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Domain</span><span className="text-gray-300">Credit Risk</span></div>
      </div>

      <div className="bg-black/30 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Current Rating</span>
          <span className="text-white font-mono font-bold">3</span>
        </div>
        <div className="flex items-center justify-center text-gray-600 text-sm my-1">&minus;</div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-gray-500">Prior Rating</span>
          <span className="text-white font-mono font-bold">2</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <code className="text-xs text-gray-400 font-mono">Current &minus; Prior = Notch Change</code>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" aria-hidden="true" />
          <span className="text-lg font-black text-rose-400 tabular-nums">+1 notch</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-1.5 text-[10px] text-gray-500">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong className="text-rose-300">T3:</strong> Always calculated by the platform. The bank never sends
          pre-computed Migration Scores — they are derived from rating_value and prior_rating_value, weighted by gross_exposure_usd.
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * INPUT FIELDS SECTION
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
          <code className="font-mono text-rose-400">{input.field}</code>
        </div>
        <div className="text-gray-500">{input.description}</div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FOUNDATIONAL RULE — EXPOSURE-WEIGHTED AVERAGE
 * ──────────────────────────────────────────────────────────────────────────── */

function FoundationalRule() {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-4 mb-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Scale className="w-4 h-4 text-rose-400" aria-hidden="true" />
        </div>
        <div>
          <div className="text-xs font-bold text-rose-300 mb-1.5">
            Foundational Rule: Ratio Metrics Require Weighting
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Migration scores are <strong className="text-white">ratios (notch changes)</strong>, not dollar amounts. Ratios
            cannot be simply summed — a +1 notch on a $10M facility is not the same as +1 on a $100M facility.
            Every rollup level must weight by gross exposure to produce a meaningful aggregate.
          </p>
          <div className="mt-2 bg-black/30 rounded-lg p-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex-1 text-center">
                <div className="text-rose-400 font-mono mb-1">
                  {'\u03A3'}(Notch &times; Exposure) / {'\u03A3'}(Exposure)
                </div>
                <div className="text-[9px] text-rose-400/60">Correct for ratios — exposure-weighted</div>
              </div>
              <div className="text-gray-600 text-lg">vs.</div>
              <div className="flex-1 text-center">
                <div className="text-amber-400 font-mono mb-1 opacity-70">
                  avg(Notch<sub>1</sub>, Notch<sub>2</sub>, ...)
                </div>
                <div className="text-[9px] text-amber-400/60">Wrong — ignores exposure concentration</div>
              </div>
            </div>
          </div>
          <PlainEnglish>
            If Facility A has +1 notch change on $20M and Facility B has -1 on $30M, the weighted
            average is (20-30)/50 = -0.20, not (1+(-1))/2 = 0.
            Compare this to currency metrics like Interest Income that can be simply summed.
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
                ? 'border-rose-500/40 bg-rose-500/10'
                : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.04] hover:border-gray-700'
            }`}
            style={{ marginLeft: `${i * 4}px`, marginRight: `${i * 4}px` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expanded ? 'bg-rose-500/20' : 'bg-white/5'}`}>
                  <Icon className={`w-4 h-4 ${expanded ? 'text-rose-400' : 'text-gray-500'}`} aria-hidden="true" />
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
              <code className="font-mono text-rose-400">{hop.joinKey}</code>
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
        <Sparkles className="w-3 h-3 text-rose-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-gray-500 font-medium">Result: </span>
          <span className="text-rose-300">{chain.result}</span>
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
        <div className="text-sm font-mono text-rose-400 text-center">
          Notch Change = rating_value &minus; prior_rating_value
        </div>
        <PlainEnglish>
          How many notches did this borrower&apos;s rating move? Subtract the prior rating from the current rating.
          Positive means deterioration (downgrade), negative means improvement (upgrade).
        </PlainEnglish>
      </div>
      <JoinChainVisual levelKey="facility" />

      {/* Sample facilities */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-6 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Facility</div>
          <div className="text-center">Prior &rarr; Current</div>
          <div className="text-center">Notch</div>
          <div className="text-center">Direction</div>
          <div className="text-right">Exposure</div>
          <div className="text-right">Weighted Contribution</div>
        </div>
        {FACILITIES.map((f) => (
          <div key={f.name} className="grid grid-cols-6 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-400 truncate">{f.name}</div>
            <div className="text-center text-gray-300 font-mono">{f.priorRating} &rarr; {f.currentRating}</div>
            <div className={`text-center font-mono font-bold ${f.notchChange > 0 ? 'text-rose-400' : f.notchChange < 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
              {fmtNotch(f.notchChange)}
            </div>
            <div className={`text-center font-medium ${dirColor(f.direction)}`}>
              {dirSymbol(f.direction)} {f.direction}
            </div>
            <div className="text-right text-gray-300 font-mono">{fmtExp(f.grossExposure)}</div>
            <div className={`text-right font-mono ${f.notchChange > 0 ? 'text-rose-400' : f.notchChange < 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
              {fmtNotch(f.notchChange)} &times; {fmtExp(f.grossExposure)}
            </div>
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
        A single borrower may have multiple facilities. The migration score at the counterparty level
        is the exposure-weighted average of notch changes across all of that borrower&apos;s facilities.
      </div>
      <JoinChainVisual levelKey="counterparty" />

      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-4 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Counterparty</div>
          <div className="text-right">Facilities</div>
          <div className="text-right">Total Exposure</div>
          <div className="text-right">Migration Score</div>
        </div>
        {COUNTERPARTIES.map((cp) => (
          <div key={cp.name} className="grid grid-cols-4 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-300 font-medium">{cp.name}</div>
            <div className="text-right text-gray-400 font-mono">{cp.facilityCount}</div>
            <div className="text-right text-gray-400 font-mono">{fmtExp(cp.totalExposure)}</div>
            <div className={`text-right font-mono font-bold ${scoreColor(cp.migrationScore)}`}>{fmtScore(cp.migrationScore)}</div>
          </div>
        ))}
      </div>

      {/* Detailed calculation */}
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Weighted Average Calculation</div>
        <div className="space-y-2">
          {COUNTERPARTIES.map((cp) => {
            const cpFacs = FACILITIES.filter((f) => f.counterpartyName === cp.name);
            return (
              <div key={cp.name} className="text-[10px] text-gray-400">
                <span className="text-gray-300 font-medium">{cp.name}:</span>{' '}
                ({cpFacs.map((f, i) => (
                  <span key={f.name}>
                    {i > 0 && ' + '}
                    <span className={f.notchChange > 0 ? 'text-rose-400' : f.notchChange < 0 ? 'text-emerald-400' : 'text-gray-400'}>
                      {fmtNotch(f.notchChange)}&times;{fmtExp(f.grossExposure)}
                    </span>
                  </span>
                ))}) / {fmtExp(cp.totalExposure)} ={' '}
                <span className={`font-bold ${scoreColor(cp.migrationScore)}`}>{fmtScore(cp.migrationScore)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <PlainEnglish>
        Unlike Interest Income which is simply added across a borrower&apos;s facilities,
        migration scores must be weighted by exposure. A downgrade on a large loan matters
        more than a downgrade on a small one.
      </PlainEnglish>
    </div>
  );
}

function DeskDetail() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 leading-relaxed">
        Migration score at the desk level is the exposure-weighted average across all facilities
        assigned to that desk — regardless of counterparty. This gives the desk head a single
        credit-quality indicator for their book.
      </div>
      <JoinChainVisual levelKey="desk" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DESKS.map((d) => {
          const color = d.migrationScore > 0 ? 'rose' : d.migrationScore < 0 ? 'emerald' : 'gray';
          return (
            <div key={d.name} className={`rounded-lg border border-${color}-500/20 bg-${color}-500/[0.04] p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className={`w-4 h-4 text-${color}-400`} aria-hidden="true" />
                <span className={`text-xs font-bold text-${color}-300`}>{d.name}</span>
              </div>
              <div className="text-xs text-gray-400">
                {d.facilityCount} facilities, {fmtExp(d.totalExposure)} exposure &rarr;{' '}
                <span className={`font-mono font-bold text-${color}-400`}>{fmtScore(d.migrationScore)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Desk-Level Weighted Averages</div>
        <div className="space-y-2">
          {DESKS.map((d) => {
            const deskFacs = FACILITIES.filter((f) => f.deskName === d.name);
            return (
              <div key={d.name} className="text-[10px] text-gray-400">
                <span className="text-gray-300 font-medium">{d.name}:</span>{' '}
                ({deskFacs.map((f, i) => (
                  <span key={f.name}>
                    {i > 0 && ' + '}
                    <span className={f.notchChange > 0 ? 'text-rose-400' : f.notchChange < 0 ? 'text-emerald-400' : 'text-gray-400'}>
                      {fmtNotch(f.notchChange)}&times;{fmtExp(f.grossExposure)}
                    </span>
                  </span>
                ))}) / {fmtExp(d.totalExposure)} ={' '}
                <span className={`font-bold ${scoreColor(d.migrationScore)}`}>{fmtScore(d.migrationScore)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PortfolioDetail() {
  return (
    <div className="space-y-3">
      <JoinChainVisual levelKey="portfolio" />
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Portfolio Total: Exposure-Weighted Average of All Desks</div>
        <div className="text-sm font-mono text-rose-400 text-center">
          {'\u03A3'}(Desk Score &times; Desk Exposure) / {'\u03A3'}(Desk Exposure)
        </div>
        <div className="mt-2 text-center">
          <span className="text-xs font-mono text-gray-400">
            ({DESKS.map((d, i) => (
              <span key={d.name}>
                {i > 0 && ' + '}
                {fmtScore(d.migrationScore)}&times;{fmtExp(d.totalExposure)}
              </span>
            ))}) / {fmtExp(PORTFOLIO_TOTAL_EXPOSURE)}
          </span>
          <span className="text-xs font-mono text-gray-600"> = </span>
          <span className={`text-sm font-mono font-black ${scoreColor(PORTFOLIO_MIGRATION_SCORE)}`}>{fmtScore(PORTFOLIO_MIGRATION_SCORE)}</span>
        </div>
        <PlainEnglish>
          The portfolio migration score is the exposure-weighted average across all desks.
          A score of {fmtScore(PORTFOLIO_MIGRATION_SCORE)} means the portfolio is showing net improvement —
          upgrades (weighted by exposure) outweigh downgrades.
        </PlainEnglish>
      </div>

      {/* Concentration view */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-4 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Desk</div>
          <div className="text-right">Migration Score</div>
          <div className="text-right">Exposure</div>
          <div className="text-right">% of Total</div>
        </div>
        {DESKS.map((d) => (
          <div key={d.name} className="grid grid-cols-4 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-300">{d.name}</div>
            <div className={`text-right font-mono font-bold ${scoreColor(d.migrationScore)}`}>{fmtScore(d.migrationScore)}</div>
            <div className="text-right text-gray-400 font-mono">{fmtExp(d.totalExposure)}</div>
            <div className="text-right text-gray-400 font-mono">{((d.totalExposure / PORTFOLIO_TOTAL_EXPOSURE) * 100).toFixed(1)}%</div>
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
        <div className="text-sm font-mono text-rose-400 text-center">
          {'\u03A3'} Portfolio Migration Scores (Exposure-Weighted)
        </div>
        <PlainEnglish>
          At the highest level, the migration score tells the CRO whether the institution&apos;s
          overall credit quality is improving or deteriorating. This feeds into CCAR stress testing,
          CECL reserve estimation, and Basel III RWA calculations.
        </PlainEnglish>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-3">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-blue-300 mb-1">Downstream Consumers</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Business Segment Migration Score feeds directly into:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="rounded bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-blue-300 font-bold">CCAR:</span>{' '}
                <span className="text-gray-400">Stress Testing Scenarios</span>
              </div>
              <div className="rounded bg-purple-500/10 border border-purple-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-purple-300 font-bold">CECL:</span>{' '}
                <span className="text-gray-400">Reserve Estimation</span>
              </div>
              <div className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-amber-300 font-bold">Basel III RWA:</span>{' '}
                <span className="text-gray-400">Risk-Weighted Assets</span>
              </div>
              <div className="rounded bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-rose-300 font-bold">OCC Exam:</span>{' '}
                <span className="text-gray-400">Exam Findings</span>
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
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
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
            <div className="text-[10px] text-gray-500 mb-1">{levelLabels[selectedLevel]} Migration Score</div>
            <div className={`text-2xl font-black tabular-nums mb-2 ${scoreColor(PORTFOLIO_MIGRATION_SCORE)}`}>
              {fmtScore(PORTFOLIO_MIGRATION_SCORE)}
            </div>
            <div className="text-[10px] text-gray-500">
              Across {FACILITIES.length} facilities, {COUNTERPARTIES.length} counterparties, {DESKS.length} desks
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                PORTFOLIO_MIGRATION_SCORE < 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : PORTFOLIO_MIGRATION_SCORE > 0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
              }`}>
                {PORTFOLIO_MIGRATION_SCORE < 0 ? 'Net Improvement' : PORTFOLIO_MIGRATION_SCORE > 0 ? 'Net Deterioration' : 'Stable'}
              </span>
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
            t.primary ? 'border-rose-500/30 bg-rose-500/[0.04]' : 'border-gray-800 bg-white/[0.02]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Database className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
            <code className="text-xs font-mono text-rose-300 font-bold">{t.table}</code>
            {t.primary && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
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
          <div className="w-3 h-3 rounded bg-rose-600" />
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
      <div className="mt-3 pt-3 border-t border-gray-800">
        <div className="text-[10px] text-gray-600 mb-2">
          Regulatory references: FR Y-9C, CCAR, CECL, Basel III
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-500">Upgrade (improvement)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-gray-500">Downgrade (deterioration)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-gray-500">Stable (no change)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT
 * ──────────────────────────────────────────────────────────────────────────── */

export interface RRMigLineageViewProps {
  demoExpandedLevel?: string | null;
  demoL2Filter?: string;
  onStartDemo?: () => void;
}

export default function RRMigLineageView({
  demoExpandedLevel,
  onStartDemo,
}: RRMigLineageViewProps = {}) {
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
              <h1 className="text-xl font-bold text-white">Risk Rating Migration End-to-End Lineage</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                From data model to dashboard — complete lineage with exposure-weighted average rollup
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
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-xs text-gray-400">Ratio (Weighted Avg)</span>
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
            title="Risk Rating Migration Configuration"
            subtitle="Formula: (Current_Rating - Prior_Rating) weighted by Gross_Exposure"
          />
          <div data-demo="step1-variant-weighted">
            <MetricDefCard />
          </div>

          {/* Input fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div data-demo="num-section-weighted">
              <InputFieldSection input={METRIC_INPUTS[0]} />
            </div>
            <div data-demo="den-section-weighted">
              <InputFieldSection input={METRIC_INPUTS[1]} />
            </div>
            <div data-demo="result-weighted">
              <InputFieldSection input={METRIC_INPUTS[2]} />
            </div>
          </div>

          <div className="mt-4">
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.06] p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Notch Change (This Facility)</div>
              <div className="text-2xl font-black text-rose-400 tabular-nums">+1 notch</div>
              <div className="text-[10px] text-gray-600 mt-1">Rating 3 &minus; Rating 2 = +1 (downgrade)</div>
            </div>
          </div>

          <InsightCallout>
            <strong>Direction matters.</strong> Positive notch change means deterioration (downgrade);
            negative means improvement (upgrade). LOWER_BETTER means the best portfolios have scores
            near zero or negative. A portfolio-wide score of {fmtScore(PORTFOLIO_MIGRATION_SCORE)} indicates
            net credit improvement.
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
            subtitle="Two snapshot tables provide the rating observations and exposure weights"
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
                  f.used ? 'bg-rose-500/5' : ''
                }`}
              >
                <code className={`font-mono ${f.used ? 'text-rose-400' : 'text-gray-500'}`}>{f.field}</code>
                <code className="font-mono text-amber-300 text-[10px]">{f.table}</code>
                <div className="text-gray-400 text-[10px]">{f.desc}</div>
                <div className="text-right">
                  {f.used && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 inline" />}
                </div>
              </div>
            ))}
          </div>

          {/* Rating scale reference */}
          <div className="mt-4 rounded-lg border border-gray-800 bg-white/[0.02] p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-3 h-3" aria-hidden="true" />
              Internal Rating Scale Reference
            </div>
            <div className="rounded-lg border border-gray-800 overflow-hidden">
              <div className="grid grid-cols-4 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
                <div>Grade</div>
                <div>Label</div>
                <div>PD Range</div>
                <div>Regulatory Class</div>
              </div>
              {RATING_SCALE.map((r) => (
                <div key={r.grade} className="grid grid-cols-4 text-xs px-3 py-1.5 border-t border-gray-800/50">
                  <div className="text-white font-mono font-bold">{r.grade}</div>
                  <div className="text-gray-300">{r.label}</div>
                  <div className="text-gray-400 font-mono text-[10px]">{r.pdRange}</div>
                  <div className={`text-[10px] ${r.grade <= 3 ? 'text-emerald-400' : r.grade === 4 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {r.regulatory}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <InsightCallout>
            <strong>Two tables, three fields.</strong> Migration Score needs{' '}
            <code className="text-amber-300">rating_value</code> and{' '}
            <code className="text-amber-300">prior_rating_value</code> from rating observations, plus{' '}
            <code className="text-amber-300">gross_exposure_usd</code> from exposure snapshots as the weighting factor.
            The non-highlighted fields serve other metrics (PD estimation, utilization analysis).
          </InsightCallout>
        </section>

        <FlowArrow label="Fields feed into calculation engine" />

        {/* ── STEP 4: CALCULATION ── */}
        <section data-demo="step4" aria-labelledby={`${headingPrefix}-step4`}>
          <SectionHeading
            id={`${headingPrefix}-step4`}
            icon={Zap}
            step="Step 4 — Calculation Engine"
            layerColor="bg-rose-600"
            title="Migration Score Calculation"
            subtitle="T3 authority — always calculated by the platform from raw rating observations"
          />
          <div data-demo="step4-variant-weighted">
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold text-rose-400">Risk Rating Migration (Derived)</span>
                </div>
                <TierBadge tier="T3" />
              </div>
              <div className="bg-black/30 rounded-lg p-3 mb-3">
                <div className="text-sm font-mono text-center space-y-1">
                  <div className="text-gray-400">
                    <code className="text-amber-300">rating_value</code> &minus;{' '}
                    <code className="text-amber-300">prior_rating_value</code>
                  </div>
                  <div className="text-gray-600">&darr;</div>
                  <div className="text-gray-300">
                    3 &minus; 2
                  </div>
                  <div className="text-gray-600">&darr;</div>
                  <div className="text-rose-400 font-bold text-lg">+1 notch (downgrade)</div>
                </div>
              </div>
              <div className="bg-black/30 rounded-lg p-3 mb-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Portfolio-Level Weighted Average</div>
                <div className="text-sm font-mono text-center space-y-1">
                  <div className="text-gray-400">
                    {'\u03A3'}(<code className="text-rose-300">notch_change</code> &times;{' '}
                    <code className="text-amber-300">gross_exposure_usd</code>) / {'\u03A3'}(<code className="text-amber-300">gross_exposure_usd</code>)
                  </div>
                  <div className="text-gray-600">&darr;</div>
                  <div className={`font-bold text-lg ${scoreColor(PORTFOLIO_MIGRATION_SCORE)}`}>{fmtScore(PORTFOLIO_MIGRATION_SCORE)}</div>
                </div>
              </div>
              <div className="flex items-start gap-1.5 text-[10px] text-gray-500">
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong className="text-rose-300">T3 (Always Calculate):</strong> The platform always derives Migration Scores
                  from the raw rating_value and prior_rating_value. The bank does not send pre-computed migration values.
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
            layerColor="bg-rose-600"
            title="Storage & Aggregation"
            subtitle="Exposure-weighted average at every level — ratio metrics cannot be summed"
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
              Rollup Hierarchy — Facility {'\u2192'} Counterparty {'\u2192'} Desk {'\u2192'} Portfolio {'\u2192'} Business Segment — click to expand
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
