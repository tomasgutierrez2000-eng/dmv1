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
  Play,
  Network,
  Workflow,
  RefreshCw,
  Sparkles,
  Scale,
} from 'lucide-react';
import {
  FACILITIES,
  COUNTERPARTIES,
  fmtPct,
  fmtM,
} from './demo/allocPctDemoRollupData';

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

const LEGAL_INPUTS: InputField[] = [
  { name: 'Participation %', field: 'participation_pct', table: 'facility_counterparty_participation', layer: 'L1', value: '60.00%', description: 'Contractual share of the facility assigned to this counterparty' },
  { name: 'Committed Amount (weight)', field: 'committed_facility_amt', table: 'facility_master', layer: 'L1', value: '$100,000,000', description: 'Total committed facility amount used for weighted-average rollup' },
];

const ECONOMIC_INPUTS: InputField[] = [
  { name: 'Legal Participation %', field: 'legal_participation_pct', table: 'counterparty_allocation_snapshot', layer: 'L2', value: '60.00%', description: 'Contractual participation percent (sourced from L1 at snapshot time)' },
  { name: 'CRM Adjustment %', field: 'crm_adjustment_pct', table: 'counterparty_allocation_snapshot', layer: 'L2', value: '15.00%', description: 'Credit risk mitigation adjustment (CDS, sub-participation, guarantees)' },
  { name: 'Committed Amount (weight)', field: 'committed_facility_amt', table: 'facility_master', layer: 'L1', value: '$100,000,000', description: 'Total committed facility amount used for weighted-average rollup' },
];

const ROLLUP_LEVELS = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Table2,
    desc: 'Direct lookup (legal) or calculation (economic) for one facility-counterparty pair',
    method: 'Direct / Calc',
    purpose: 'Per-loan participation share',
    tier: 'T2',
    active: true,
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    desc: 'WEIGHTED_AVERAGE — weighted by committed_facility_amt across all facilities for one borrower',
    method: 'WTD_AVG',
    purpose: 'Obligor-level exposure concentration',
    tier: 'T3',
    active: true,
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    desc: 'N/A — Allocation % is a counterparty relationship metric, not rolled up by desk',
    method: 'N/A',
    purpose: 'Not applicable',
    tier: 'N/A',
    active: false,
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    desc: 'N/A — Relationship metric does not aggregate above counterparty level',
    method: 'N/A',
    purpose: 'Not applicable',
    tier: 'N/A',
    active: false,
  },
  {
    key: 'lob',
    label: 'Business Segment',
    icon: PieChart,
    desc: 'N/A — No meaningful aggregation of participation percentages at segment level',
    method: 'N/A',
    purpose: 'Not applicable',
    tier: 'N/A',
    active: false,
  },
] as const;

/** L1 reference tables used by Counterparty Allocation % */
const L1_TABLES = [
  { table: 'facility_master', desc: 'Loan identity — facility type, maturity, counterparty FK, committed_facility_amt', fields: ['facility_id (PK)', 'counterparty_id (FK)', 'lob_segment_id (FK)', 'committed_facility_amt'] },
  { table: 'facility_counterparty_participation', desc: 'Counterparty participation records — legal share of each facility', fields: ['facility_id (FK)', 'counterparty_id (FK)', 'participation_pct', 'is_primary_flag'], primary: true },
  { table: 'counterparty', desc: 'Borrower identity — legal name, credit rating, industry', fields: ['counterparty_id (PK)', 'legal_name', 'industry_code'] },
  { table: 'enterprise_business_taxonomy', desc: 'Organizational hierarchy — desk, portfolio, business segment tree', fields: ['managed_segment_id (PK)', 'parent_segment_id (FK)', 'segment_name', 'segment_level'] },
];

/** L2 snapshot fields used by Economic variant */
const L2_FIELDS = [
  { field: 'legal_participation_pct', table: 'counterparty_allocation_snapshot', desc: 'Contractual participation % (mirrored from L1)', used: true },
  { field: 'crm_adjustment_pct', table: 'counterparty_allocation_snapshot', desc: 'Credit risk mitigation reduction percentage', used: true },
  { field: 'economic_allocation_pct', table: 'counterparty_allocation_snapshot', desc: 'Net allocation after CRM adjustments', used: true },
  { field: 'crm_methodology', table: 'counterparty_allocation_snapshot', desc: 'CRM method: COMPREHENSIVE, SUBSTITUTION, or NONE', used: false },
  { field: 'as_of_date', table: 'counterparty_allocation_snapshot', desc: 'Snapshot observation date', used: false },
];

/** L3 output tables that store Allocation % values */
const L3_OUTPUT_TABLES = [
  {
    table: 'metric_value_fact',
    desc: 'Generic metric storage — Allocation % at facility and counterparty levels',
    fields: ['metric_id = ALLOC_PCT', 'variant_id = LEGAL | ECONOMIC', 'aggregation_level', 'facility_id | counterparty_id', 'value', 'unit = PERCENTAGE'],
    primary: true,
  },
];

/** Join chain data for each rollup level */
interface JoinHop { from: string; fromLayer: 'L1' | 'L2'; to: string; toLayer: 'L1' | 'L2'; joinKey: string; note?: string }
interface JoinChainData { hops: JoinHop[]; aggregation: string; result: string }

const ROLLUP_JOIN_CHAINS: Record<string, JoinChainData> = {
  facility: {
    hops: [
      { from: 'facility_counterparty_participation', fromLayer: 'L1', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get committed amount for weighting' },
    ],
    aggregation: 'Legal: direct lookup of participation_pct | Economic: legal_participation_pct − crm_adjustment_pct',
    result: 'One Allocation % value per (facility, counterparty) pair',
  },
  counterparty: {
    hops: [
      { from: 'facility_counterparty_participation', fromLayer: 'L1', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get committed_facility_amt for weighting' },
    ],
    aggregation: 'WTD_AVG: Σ(allocation_pct × committed_facility_amt) / Σ(committed_facility_amt) GROUP BY counterparty_id',
    result: 'Weighted average Allocation % per borrower',
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
    'N/A': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  const labels: Record<string, string> = {
    T1: 'T1 — Always Source',
    T2: 'T2 — Source + Validate',
    T3: 'T3 — Always Calculate',
    'N/A': 'N/A',
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
 * STEP 1 — METRIC DEFINITION CARD (Both Variants)
 * ──────────────────────────────────────────────────────────────────────────── */

function MetricDefCard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Legal Variant */}
      <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
          <span className="text-sm font-bold text-cyan-400">Legal Participation % (Observed)</span>
        </div>

        <div className="space-y-1.5 text-xs mb-3">
          <div className="flex justify-between"><span className="text-gray-500">Metric Class</span><span className="text-gray-300">OBSERVED</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Unit Type</span><span className="text-gray-300">PERCENTAGE</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Direction</span><span className="text-gray-300">NEUTRAL</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Rollup</span><span className="text-gray-300">WEIGHTED_AVERAGE</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Source</span><span className="text-gray-300">L1 Reference</span></div>
        </div>

        <div className="bg-black/30 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">participation_pct</span>
            <span className="text-white font-mono font-bold">60.00%</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <code className="text-xs text-gray-400 font-mono">Direct lookup from L1</code>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span className="text-lg font-black text-cyan-400 tabular-nums">60.00%</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-1.5 text-[10px] text-gray-500">
          <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong className="text-cyan-300">T2:</strong> Sourced from the bank&apos;s contractual participation records.
            Validated against facility totals (all participations must sum to 100%).
          </span>
        </div>
      </div>

      {/* Economic Variant */}
      <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-sm font-bold text-cyan-400">Economic Allocation % (Calculated)</span>
        </div>

        <div className="space-y-1.5 text-xs mb-3">
          <div className="flex justify-between"><span className="text-gray-500">Metric Class</span><span className="text-gray-300">CALCULATED</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Unit Type</span><span className="text-gray-300">PERCENTAGE</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Direction</span><span className="text-gray-300">NEUTRAL</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Rollup</span><span className="text-gray-300">WEIGHTED_AVERAGE</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Source</span><span className="text-gray-300">L2 Snapshot</span></div>
        </div>

        <div className="bg-black/30 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">legal_participation_pct</span>
            <span className="text-white font-mono font-bold">60.00%</span>
          </div>
          <div className="flex items-center justify-center text-gray-600 text-sm my-1">&minus;</div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-gray-500">crm_adjustment_pct</span>
            <span className="text-white font-mono font-bold">15.00%</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <code className="text-xs text-gray-400 font-mono">Legal &minus; CRM Adjustment</code>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span className="text-lg font-black text-cyan-400 tabular-nums">45.00%</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-1.5 text-[10px] text-gray-500">
          <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong className="text-cyan-300">T3:</strong> Always calculated by the platform. Economic allocation
            reflects risk transfer via CDS, sub-participations, or guarantees.
          </span>
        </div>
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
          <code className="font-mono text-cyan-400">{input.field}</code>
        </div>
        <div className="text-gray-500">{input.description}</div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FOUNDATIONAL RULE — WEIGHTED AVERAGE
 * ──────────────────────────────────────────────────────────────────────────── */

function FoundationalRule() {
  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] p-4 mb-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Scale className="w-4 h-4 text-cyan-400" aria-hidden="true" />
        </div>
        <div>
          <div className="text-xs font-bold text-cyan-300 mb-1.5">
            Foundational Rule: Percentage Metrics Use Weighted Averages
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Allocation % is a <strong className="text-white">percentage</strong>, not a dollar amount. Percentages cannot
            be simply averaged — they must be weighted by the underlying exposure (committed_facility_amt) to produce
            a meaningful aggregate figure.
          </p>
          <div className="mt-2 bg-black/30 rounded-lg p-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex-1 text-center">
                <div className="text-cyan-400 font-mono mb-1">
                  {'Σ'}(pct &times; weight) / {'Σ'}(weight)
                </div>
                <div className="text-[9px] text-cyan-400/60">Correct for percentages</div>
              </div>
              <div className="text-gray-600 text-lg">vs.</div>
              <div className="flex-1 text-center">
                <div className="text-amber-400 font-mono mb-1 opacity-70">
                  avg(pct<sub>1</sub>, pct<sub>2</sub>, ...)
                </div>
                <div className="text-[9px] text-amber-400/60">Wrong — ignores exposure size</div>
              </div>
            </div>
          </div>
          <PlainEnglish>
            If Facility A ($100M committed) has 60% participation and Facility B ($200M committed) has 35%,
            the weighted average is (60&times;100 + 35&times;200) / (100 + 200) = 43.33%, not (60 + 35) / 2 = 47.5%.
            Larger facilities have proportionally more influence on the aggregate.
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
                ? level.active
                  ? 'border-cyan-500/40 bg-cyan-500/10'
                  : 'border-gray-700 bg-white/[0.03]'
                : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.04] hover:border-gray-700'
            }`}
            style={{ marginLeft: `${i * 4}px`, marginRight: `${i * 4}px` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  expanded
                    ? level.active ? 'bg-cyan-500/20' : 'bg-white/5'
                    : 'bg-white/5'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    expanded && level.active ? 'text-cyan-400' : 'text-gray-500'
                  }`} aria-hidden="true" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${level.active ? 'text-white' : 'text-gray-500'}`}>{level.label}</span>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                      level.active
                        ? 'bg-white/5 text-gray-400 border-gray-800'
                        : 'bg-gray-800/50 text-gray-600 border-gray-800'
                    }`}>
                      {level.method}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500">{level.purpose}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {level.tier !== 'N/A' && <TierBadge tier={level.tier} />}
                {level.active ? (
                  expanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" aria-hidden="true" />
                  )
                ) : (
                  <span className="text-[9px] text-gray-600 font-medium">N/A</span>
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
              <code className="font-mono text-cyan-400">{hop.joinKey}</code>
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
        <Sparkles className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-gray-500 font-medium">Result: </span>
          <span className="text-cyan-300">{chain.result}</span>
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
    case 'portfolio':
    case 'lob':
      return <NALevelDetail />;
    default:
      return null;
  }
}

function FacilityDetail() {
  return (
    <div className="space-y-3">
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Facility-Level Allocation</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-[9px] font-bold text-cyan-300 mb-1">Legal Variant</div>
            <div className="text-sm font-mono text-cyan-400 text-center">
              Direct lookup: participation_pct
            </div>
          </div>
          <div>
            <div className="text-[9px] font-bold text-cyan-300 mb-1">Economic Variant</div>
            <div className="text-sm font-mono text-cyan-400 text-center">
              legal_participation_pct &minus; crm_adjustment_pct
            </div>
          </div>
        </div>
        <PlainEnglish>
          For one facility, what share does this counterparty hold? Legal = the contractual share.
          Economic = the share after credit risk mitigation (CDS, sub-participations, guarantees) is applied.
        </PlainEnglish>
      </div>
      <JoinChainVisual levelKey="facility" />

      {/* Sample facilities */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-6 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Facility</div>
          <div className="text-right">Committed</div>
          <div className="text-right">Legal %</div>
          <div className="text-right">CRM Adj</div>
          <div className="text-right">Economic %</div>
          <div className="text-right">CRM Method</div>
        </div>
        {FACILITIES.map((f) => (
          <div key={f.facilityId} className="grid grid-cols-6 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-400 truncate">{f.name}</div>
            <div className="text-right text-gray-300 font-mono">{fmtM(f.committedAmt)}</div>
            <div className="text-right text-cyan-400 font-mono">{fmtPct(f.legalPct)}</div>
            <div className="text-right text-amber-400 font-mono">{f.crmAdjPct > 0 ? fmtPct(f.crmAdjPct) : '—'}</div>
            <div className="text-right text-cyan-400 font-mono font-bold">{fmtPct(f.economicPct)}</div>
            <div className="text-right text-gray-500 text-[10px]">{f.crmMethod}</div>
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
        A single borrower may participate in multiple facilities with different allocation percentages.
        The counterparty-level Allocation % is the <strong className="text-white">weighted average</strong> across
        all facilities, weighted by committed_facility_amt.
      </div>
      <JoinChainVisual levelKey="counterparty" />

      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-5 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Counterparty</div>
          <div className="text-right">Facilities</div>
          <div className="text-right">Total Committed</div>
          <div className="text-right">Wtd Legal %</div>
          <div className="text-right">Wtd Economic %</div>
        </div>
        {COUNTERPARTIES.map((cp) => (
          <div key={cp.name} className="grid grid-cols-5 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-300 font-medium">{cp.name}</div>
            <div className="text-right text-gray-400 font-mono">{cp.facilityCount}</div>
            <div className="text-right text-gray-400 font-mono">{fmtM(cp.totalCommitted)}</div>
            <div className="text-right text-cyan-400 font-mono font-bold">{fmtPct(cp.wtdLegalPct)}</div>
            <div className="text-right text-cyan-400 font-mono font-bold">{fmtPct(cp.wtdEconomicPct)}</div>
          </div>
        ))}
      </div>

      <PlainEnglish>
        Unlike Interest Income where you simply add dollar amounts, Allocation % requires weighting
        by committed amounts. A 35% share of a $200M facility matters more than a 100% share of a $75M facility
        when computing the aggregate counterparty-level allocation.
      </PlainEnglish>
    </div>
  );
}

function NALevelDetail() {
  return (
    <div className="rounded-lg border border-gray-800/50 bg-white/[0.01] p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center flex-shrink-0">
          <Network className="w-4 h-4 text-gray-600" aria-hidden="true" />
        </div>
        <div>
          <div className="text-xs font-bold text-gray-500 mb-1">N/A — Relationship Metric</div>
          <p className="text-[10px] text-gray-600 leading-relaxed">
            Counterparty Allocation % is a relationship-level metric that describes how exposure is distributed
            among counterparties for a given facility. It does not aggregate meaningfully above the counterparty level.
            Desk, portfolio, and business segment views show this metric only as a drill-through to the underlying
            facility-counterparty pairs, never as a rolled-up aggregate.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * DASHBOARD CONSUMPTION
 * ──────────────────────────────────────────────────────────────────────────── */

function DashboardConsumption() {
  const [selectedLevel, setSelectedLevel] = useState('counterparty');
  const activeLevels = ['facility', 'counterparty'];
  const levelLabels: Record<string, string> = {
    facility: 'Facility',
    counterparty: 'Counterparty',
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
            {activeLevels.map((l) => (
              <button
                key={l}
                onClick={() => setSelectedLevel(l)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                  selectedLevel === l
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    : 'bg-white/[0.02] text-gray-400 border border-gray-800 hover:border-gray-700'
                }`}
              >
                {levelLabels[l]}
              </button>
            ))}
            <div className="px-3 py-2 rounded-lg text-xs text-gray-600 border border-gray-800/50 bg-gray-900/30">
              Desk / Portfolio / Business Segment — N/A
            </div>
          </div>
        </div>

        {/* Step 2: Preview */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-300">2</span>
            Dashboard Preview
          </div>
          <div className="rounded-xl border border-gray-700 bg-black/40 p-4">
            <div className="text-[10px] text-gray-500 mb-1">{levelLabels[selectedLevel]} Allocation %</div>
            <div className="text-2xl font-black text-cyan-400 tabular-nums mb-2">
              {selectedLevel === 'facility' ? '60.00%' : fmtPct(COUNTERPARTIES[0].wtdLegalPct)}
            </div>
            <div className="text-[10px] text-gray-500">
              {selectedLevel === 'facility'
                ? `${FACILITIES.length} facility-counterparty pairs`
                : `${COUNTERPARTIES.length} counterparties, ${FACILITIES.length} facilities`
              }
            </div>
            <div className="mt-3 pt-3 border-t border-gray-800">
              <div className="text-[9px] text-gray-600 mb-1.5">Rollup Method</div>
              <div className="space-y-1">
                {ROLLUP_LEVELS.map((r) => (
                  <div key={r.key} className="flex justify-between text-[10px]">
                    <span className={r.active ? 'text-gray-500' : 'text-gray-700'}>{r.label}</span>
                    <span className={`font-mono ${r.active ? 'text-gray-400' : 'text-gray-700'}`}>{r.method}</span>
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
      <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 md:grid-cols-4 gap-2">
        <TierBadge tier="T1" />
        <TierBadge tier="T2" />
        <TierBadge tier="T3" />
      </div>
      <div className="mt-3 pt-3 border-t border-gray-800 text-[10px] text-gray-600">
        Regulatory references: FR Y-14Q, Basel III CRE, Large Exposure Framework
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT
 * ──────────────────────────────────────────────────────────────────────────── */

export interface AllocPctLineageViewProps {
  demoExpandedLevel?: string | null;
  onStartDemo?: () => void;
}

export default function AllocPctLineageView({
  demoExpandedLevel,
  onStartDemo,
}: AllocPctLineageViewProps = {}) {
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
              <h1 className="text-xl font-bold text-white">Counterparty Allocation % End-to-End Lineage</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                From data model to dashboard — complete lineage with weighted-average rollup
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
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <span className="text-xs text-gray-400">Percentage (WTD_AVG)</span>
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
            title="Counterparty Allocation % Configuration"
            subtitle="Two variants: Legal Participation % (observed) and Economic Allocation % (calculated)"
          />
          <div data-demo="step1-variant-legal">
            <div data-demo="step1-variant-economic">
              <MetricDefCard />
            </div>
          </div>

          {/* Legal input fields */}
          <div className="mt-5 mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-2">Legal Variant Inputs</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-demo="num-section-legal">
            {LEGAL_INPUTS.map((input) => (
              <div key={input.field} data-demo={input.field === 'participation_pct' ? 'den-section-legal' : undefined}>
                <InputFieldSection input={input} />
              </div>
            ))}
          </div>

          <div data-demo="result-legal" className="mt-4">
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/[0.06] p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Legal Participation %</div>
              <div className="text-2xl font-black text-cyan-400 tabular-nums">60.00%</div>
              <div className="text-[10px] text-gray-600 mt-1">Direct lookup from facility_counterparty_participation</div>
            </div>
          </div>

          {/* Economic input fields */}
          <div className="mt-5 mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-2">Economic Variant Inputs</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-demo="num-section-economic">
            {ECONOMIC_INPUTS.map((input) => (
              <div key={input.field} data-demo={input.field === 'crm_adjustment_pct' ? 'den-section-economic' : undefined}>
                <InputFieldSection input={input} />
              </div>
            ))}
          </div>

          <div data-demo="result-economic" className="mt-4">
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/[0.06] p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Economic Allocation %</div>
              <div className="text-2xl font-black text-cyan-400 tabular-nums">45.00%</div>
              <div className="text-[10px] text-gray-600 mt-1">60.00% &minus; 15.00% = 45.00% (legal &minus; CRM adjustment)</div>
            </div>
          </div>

          <InsightCallout>
            <strong>Two views of the same relationship.</strong> Legal Participation % reflects the contractual
            share from syndication agreements. Economic Allocation % adjusts for credit risk mitigation
            (CDS, sub-participations, guarantees) to show the true economic exposure.
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
              <div key={t.table} className={`rounded-lg border p-3 ${
                t.primary
                  ? 'border-blue-400/40 bg-blue-500/[0.08]'
                  : 'border-blue-500/20 bg-blue-500/[0.04]'
              }`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                  <code className="text-xs font-mono text-blue-300 font-bold">L1.{t.table}</code>
                  {t.primary && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Key Table
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
          <InsightCallout>
            <strong>facility_counterparty_participation is the key table.</strong> Unlike most metrics that
            derive values from L2 snapshots, the Legal variant of Allocation % is sourced directly from this
            L1 reference table. The <code className="text-blue-300">participation_pct</code> field is
            the contractual share — it changes only when the syndication structure is modified.
          </InsightCallout>
        </section>

        <FlowArrow label="L1 participation records feed into L2 snapshot" />

        {/* ── STEP 3: L2 SNAPSHOT ── */}
        <section data-demo="step3" aria-labelledby={`${headingPrefix}-step3`}>
          <SectionHeading
            id={`${headingPrefix}-step3`}
            icon={Layers}
            step="Step 3 — L2 Snapshot Data"
            layerColor="bg-amber-600"
            title="Counterparty Allocation Snapshot"
            subtitle="Snapshot table capturing economic allocation with CRM adjustments"
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
                  f.used ? 'bg-cyan-500/5' : ''
                }`}
              >
                <code className={`font-mono ${f.used ? 'text-cyan-400' : 'text-gray-500'}`}>{f.field}</code>
                <code className="font-mono text-amber-300 text-[10px]">{f.table}</code>
                <div className="text-gray-400 text-[10px]">{f.desc}</div>
                <div className="text-right">
                  {f.used && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 inline" />}
                </div>
              </div>
            ))}
          </div>
          <InsightCallout>
            <strong>Economic variant only.</strong> The L2 snapshot is used exclusively by the Economic Allocation %
            variant. It captures the legal participation, applies CRM adjustments, and stores the resulting
            economic allocation. The Legal variant reads directly from L1 and does not use this snapshot.
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
            title="Allocation % Calculation"
            subtitle="Legal variant: direct observation (T2) | Economic variant: platform-calculated (T3)"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Legal */}
            <div data-demo="step4-variant-legal">
              <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                    <span className="text-xs font-bold text-cyan-400">Legal Participation % (Observed)</span>
                  </div>
                  <TierBadge tier="T2" />
                </div>
                <div className="bg-black/30 rounded-lg p-3 mb-3">
                  <div className="text-sm font-mono text-center space-y-1">
                    <div className="text-gray-400">
                      <code className="text-blue-300">participation_pct</code>
                    </div>
                    <div className="text-gray-600">&darr;</div>
                    <div className="text-cyan-400 font-bold text-lg">60.00%</div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-gray-500">
                  <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong className="text-cyan-300">T2 (Source + Validate):</strong> Sourced from the bank. Validated
                    that all counterparty participations for a facility sum to 100%.
                  </span>
                </div>
              </div>
            </div>

            {/* Economic */}
            <div data-demo="step4-variant-economic">
              <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span className="text-xs font-bold text-cyan-400">Economic Allocation % (Calculated)</span>
                  </div>
                  <TierBadge tier="T3" />
                </div>
                <div className="bg-black/30 rounded-lg p-3 mb-3">
                  <div className="text-sm font-mono text-center space-y-1">
                    <div className="text-gray-400">
                      <code className="text-amber-300">legal_participation_pct</code> &minus;{' '}
                      <code className="text-amber-300">crm_adjustment_pct</code>
                    </div>
                    <div className="text-gray-600">&darr;</div>
                    <div className="text-gray-300">
                      60.00% &minus; 15.00%
                    </div>
                    <div className="text-gray-600">&darr;</div>
                    <div className="text-cyan-400 font-bold text-lg">45.00%</div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-gray-500">
                  <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong className="text-cyan-300">T3 (Always Calculate):</strong> The platform always derives
                    Economic Allocation % from the legal participation minus CRM adjustments.
                  </span>
                </div>
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
            subtitle="Weighted average at facility/counterparty — N/A above counterparty level"
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
              Rollup Hierarchy — Facility {'→'} Counterparty {'→'} Desk (N/A) {'→'} Portfolio (N/A) {'→'} Business Segment (N/A) — click to expand
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
            subtitle="Pick the aggregation level — facility or counterparty only"
          />
          <DashboardConsumption />
        </section>

        {/* ── LEGEND ── */}
        <FooterLegend />
      </main>
    </div>
  );
}
