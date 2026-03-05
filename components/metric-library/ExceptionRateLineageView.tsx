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
  TrendingDown,
  BarChart3,
  Play,
  Workflow,
  RefreshCw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  FACILITIES,
  COUNTERPARTIES,
  DESKS,
  PORTFOLIO_EXCEPTION_COUNT,
  PORTFOLIO_TOTAL_COUNT,
  PORTFOLIO_EXCEPTION_RATE,
  PORTFOLIO_MATERIAL_EXCEPTION_COUNT,
  PORTFOLIO_MATERIAL_EXCEPTION_RATE,
  fmtPct,
  fmtCount,
  fmtRatio,
} from './demo/excpnRtDemoRollupData';

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
  { name: 'Exception Flag', field: 'exception_flag', table: 'facility_credit_approval', layer: 'L2', value: 'true', description: 'Boolean — whether facility has an active policy exception' },
  { name: 'Exception Severity', field: 'exception_severity', table: 'facility_credit_approval', layer: 'L2', value: 'MAJOR', description: 'Severity classification: MINOR, MAJOR, or CRITICAL' },
  { name: 'Facility Count', field: 'COUNT(*)', table: 'facility_master', layer: 'L1', value: '5', description: 'Total number of active facilities in scope' },
];

const ROLLUP_LEVELS = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Table2,
    desc: 'Direct Count — each facility is 100% (exception) or 0% (compliant)',
    method: 'Direct Count',
    purpose: 'Policy compliance per loan',
    tier: 'T3',
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    desc: 'Pooled Division — re-pool counts across all facilities for one borrower',
    method: 'Pool Counts',
    purpose: 'Borrower exception concentration',
    tier: 'T3',
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    desc: 'Pooled Division — re-pool counts across all facilities assigned to desk',
    method: 'Pool Counts',
    purpose: 'Desk-level compliance monitoring',
    tier: 'T3',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    desc: 'Pooled Division — re-pool counts across all desks in portfolio',
    method: 'Pool Counts',
    purpose: 'Credit governance reporting',
    tier: 'T3',
  },
  {
    key: 'lob',
    label: 'Business Segment',
    icon: PieChart,
    desc: 'Pooled Division — re-pool counts across all portfolios in segment',
    method: 'Pool Counts',
    purpose: 'Board-level risk appetite',
    tier: 'T3',
  },
] as const;

/** L1 reference tables used by Exception Rate */
const L1_TABLES = [
  { table: 'facility_master', desc: 'Loan identity — facility type, maturity, counterparty FK, lob_segment_id', fields: ['facility_id (PK)', 'counterparty_id (FK)', 'lob_segment_id (FK)', 'facility_type_code'] },
  { table: 'counterparty', desc: 'Borrower identity — legal name, credit rating, industry', fields: ['counterparty_id (PK)', 'legal_name', 'industry_code'] },
  { table: 'enterprise_business_taxonomy', desc: 'Organizational hierarchy — desk → portfolio → business segment tree', fields: ['managed_segment_id (PK)', 'parent_segment_id (FK)', 'segment_name', 'segment_level'] },
];

/** L2 snapshot fields used by Exception Rate */
const L2_FIELDS = [
  { field: 'exception_flag', table: 'facility_credit_approval', desc: 'Boolean — whether facility has an active policy exception', used: true },
  { field: 'exception_type_code', table: 'facility_credit_approval', desc: 'Type of exception: LTV_BREACH, DSCR_BREACH, COVENANT_WAIVER, etc.', used: false },
  { field: 'exception_severity', table: 'facility_credit_approval', desc: 'Severity: MINOR, MAJOR, or CRITICAL — used for material variant', used: true },
  { field: 'approval_authority', table: 'facility_credit_approval', desc: 'Who approved the exception — credit committee, CRO, etc.', used: false },
  { field: 'exception_status', table: 'facility_credit_approval', desc: 'Current status: ACTIVE, CURED, EXPIRED', used: false },
];

/** L3 output tables that store Exception Rate values */
const L3_OUTPUT_TABLES = [
  {
    table: 'metric_value_fact',
    desc: 'Generic metric storage — Exception Rate at every aggregation level',
    fields: ['metric_id = EXCPN_RT', 'variant_id = ALL_EXCPN | MATERIAL_EXCPN', 'aggregation_level', 'facility_id | counterparty_id | lob_id', 'value', 'unit = PCT'],
    primary: true,
  },
  {
    table: 'credit_governance_summary',
    desc: 'Credit Risk domain summary — exception counts and rates for governance reporting',
    fields: ['lob_node_id', 'exception_count', 'total_facility_count', 'exception_rate_pct', 'material_exception_count', 'material_exception_rate_pct'],
    primary: false,
  },
];

/** Join chain data for each rollup level */
interface JoinHop { from: string; fromLayer: 'L1' | 'L2'; to: string; toLayer: 'L1' | 'L2'; joinKey: string; note?: string }
interface JoinChainData { hops: JoinHop[]; aggregation: string; result: string }

const ROLLUP_JOIN_CHAINS: Record<string, JoinChainData> = {
  facility: {
    hops: [
      { from: 'facility_credit_approval', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id + as_of_date', note: 'Get facility identity' },
    ],
    aggregation: 'Direct flag read: exception_flag = true → 100%, false → 0%',
    result: 'One exception status per facility (binary)',
  },
  counterparty: {
    hops: [
      { from: 'facility_credit_approval', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id + as_of_date', note: 'Get counterparty FK' },
      { from: 'facility_master', fromLayer: 'L1', to: 'counterparty', toLayer: 'L1', joinKey: 'counterparty_id', note: 'Resolve borrower name' },
    ],
    aggregation: 'COUNT(exception_flag=true) / COUNT(*) × 100 GROUP BY counterparty_id',
    result: 'Pooled exception rate per borrower',
  },
  desk: {
    hops: [
      { from: 'facility_credit_approval', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id + as_of_date', note: 'Get lob_segment_id FK' },
      { from: 'facility_master', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'lob_segment_id → managed_segment_id', note: 'Resolve desk name' },
    ],
    aggregation: 'COUNT(exception_flag=true) / COUNT(*) × 100 GROUP BY desk',
    result: 'Pooled exception rate per desk',
  },
  portfolio: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id → managed_segment_id', note: 'Walk tree: desk → portfolio' },
    ],
    aggregation: 'SUM(exception_count) / SUM(total_count) × 100 via parent_segment_id traversal',
    result: 'Pooled exception rate per portfolio',
  },
  lob: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id → managed_segment_id', note: 'Walk tree: portfolio → Business Segment root' },
    ],
    aggregation: 'SUM(exception_count) / SUM(total_count) × 100 via recursive parent_segment_id',
    result: 'Pooled exception rate per Business Segment',
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
    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
        <span className="text-sm font-bold text-rose-400">Exception Rate (Calculated)</span>
      </div>

      <div className="space-y-1.5 text-xs mb-3">
        <div className="flex justify-between"><span className="text-gray-500">Metric Class</span><span className="text-gray-300">CALCULATED</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Unit Type</span><span className="text-gray-300">PERCENTAGE</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Direction</span><span className="text-gray-300">LOWER_BETTER</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Rollup</span><span className="text-gray-300">Pooled Division</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Domain</span><span className="text-gray-300">Credit Risk (CR)</span></div>
      </div>

      <div className="bg-black/30 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Exception Count</span>
          <span className="text-white font-mono font-bold">3</span>
        </div>
        <div className="flex items-center justify-center text-gray-600 text-sm my-1">&divide;</div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-gray-500">Total Count</span>
          <span className="text-white font-mono font-bold">5</span>
        </div>
        <div className="flex items-center justify-center text-gray-600 text-sm my-1">&times; 100</div>
      </div>

      <div className="flex items-center justify-between">
        <code className="text-xs text-gray-400 font-mono">Exception_Count / Total_Count &times; 100</code>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-rose-400" aria-hidden="true" />
          <span className="text-lg font-black text-rose-400 tabular-nums">60.00%</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-1.5 text-[10px] text-gray-500">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong className="text-rose-300">T3:</strong> Always calculated by the platform. Exception Rate
          is derived from exception_flag and COUNT(*) — never sourced as a pre-computed value.
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * INPUT FIELDS — NUMERATOR & DENOMINATOR SECTIONS
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
 * FOUNDATIONAL RULE — POOLED DIVISION
 * ──────────────────────────────────────────────────────────────────────────── */

function FoundationalRule() {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-4 mb-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4 text-rose-400" aria-hidden="true" />
        </div>
        <div>
          <div className="text-xs font-bold text-rose-300 mb-1.5">
            Foundational Rule: Percentage Metrics Use Pooled Division
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Exception Rate is a <strong className="text-white">ratio</strong>, not a dollar amount. You cannot average
            rates directly — you must re-pool numerator and denominator counts at every level of the hierarchy.
          </p>
          <div className="mt-2 bg-black/30 rounded-lg p-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex-1 text-center">
                <div className="text-rose-400 font-mono mb-1">
                  (2 + 1) / (3 + 2) = 60%
                </div>
                <div className="text-[9px] text-rose-400/60">Correct: pool counts, then divide</div>
              </div>
              <div className="text-gray-600 text-lg">vs.</div>
              <div className="flex-1 text-center">
                <div className="text-amber-400 font-mono mb-1 opacity-70">
                  (66.67% + 50%) / 2 = 58.33%
                </div>
                <div className="text-[9px] text-amber-400/60">Wrong: averaging rates ignores volume</div>
              </div>
            </div>
          </div>
          <PlainEnglish>
            If CRE Lending has 2 exceptions in 3 facilities (66.67%) and Corp Lending has 1 exception in 2 facilities
            (50.00%), the portfolio rate is NOT the average of those two percentages. Re-pool: 3 total exceptions /
            5 total facilities = 60.00%. This is the same pooled-division pattern used by LTV and DSCR.
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
 * SEVERITY BADGE
 * ──────────────────────────────────────────────────────────────────────────── */

function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return <span className="text-gray-600 text-[9px]">—</span>;
  const styles: Record<string, string> = {
    MINOR: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    MAJOR: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    CRITICAL: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };
  return (
    <span className={`inline-flex items-center text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${styles[severity] ?? 'bg-gray-700 text-gray-400 border-gray-600'}`}>
      {severity}
    </span>
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
          Exception Rate = exception_flag = true ? 100% : 0%
        </div>
        <PlainEnglish>
          At the individual loan level, it is binary — either the loan has an active policy exception (100%) or it does not (0%).
        </PlainEnglish>
      </div>
      <JoinChainVisual levelKey="facility" />

      {/* Sample facilities */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-5 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div className="col-span-2">Facility</div>
          <div>Status</div>
          <div>Type</div>
          <div>Severity</div>
        </div>
        {FACILITIES.map((f) => (
          <div key={f.name} className="grid grid-cols-5 text-xs px-3 py-1.5 border-t border-gray-800/50 items-center">
            <div className="col-span-2 text-gray-400 truncate text-[10px]">{f.name}</div>
            <div>
              {f.hasException ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-400">
                  <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                  Exception
                </span>
              ) : (
                <span className="text-[9px] text-emerald-400 font-medium">Compliant</span>
              )}
            </div>
            <div className="text-[9px] font-mono text-gray-500">{f.exceptionType ?? '—'}</div>
            <div><SeverityBadge severity={f.severity} /></div>
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
        A single borrower may have multiple facilities. Exception Rate at the counterparty level pools all exception
        counts across that borrower&apos;s facilities — do not average the individual facility rates.
      </div>
      <JoinChainVisual levelKey="counterparty" />

      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-4 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Counterparty</div>
          <div className="text-right">All Exceptions</div>
          <div className="text-right">Ratio</div>
          <div className="text-right">Material Rate</div>
        </div>
        {COUNTERPARTIES.map((cp) => (
          <div key={cp.name} className="grid grid-cols-4 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-300 font-medium">{cp.name}</div>
            <div className="text-right text-rose-400 font-mono font-bold">{fmtPct(cp.exceptionRate)}</div>
            <div className="text-right text-gray-500 font-mono text-[10px]">{fmtRatio(cp.exceptionCount, cp.totalCount)}</div>
            <div className="text-right text-orange-400 font-mono">{fmtPct(cp.materialExceptionRate)}</div>
          </div>
        ))}
      </div>

      <PlainEnglish>
        Apex Properties: 2 exceptions across 3 facilities = 66.67%. Meridian Corp: 1 exception across 2 facilities = 50.00%.
        This is pooled counting — not an average of the per-facility rates.
      </PlainEnglish>
    </div>
  );
}

function DeskDetail() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 leading-relaxed">
        A trading desk manages a group of facilities. Exception Rate at the desk level pools all facilities
        assigned to that desk. Unlike Interest Income (which can be freely summed), Exception Rate must always
        re-pool the raw counts — never average the desk rates to get a portfolio rate.
      </div>
      <JoinChainVisual levelKey="desk" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {DESKS.map((d) => (
          <div key={d.name} className="rounded-lg border border-rose-500/20 bg-rose-500/[0.04] p-3">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-rose-400" aria-hidden="true" />
              <span className="text-xs font-bold text-rose-300">{d.name}</span>
            </div>
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-500">All Exceptions</span>
                <span className="text-rose-400 font-mono font-bold">{fmtPct(d.exceptionRate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ratio</span>
                <span className="text-gray-400 font-mono">{fmtRatio(d.exceptionCount, d.totalCount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Material Rate</span>
                <span className="text-orange-400 font-mono">{fmtPct(d.materialExceptionRate)}</span>
              </div>
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
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
          Portfolio Total: Pooled Division of All Desks
        </div>
        <div className="text-sm font-mono text-rose-400 text-center">
          SUM(exception counts) / SUM(facility counts) &times; 100
        </div>
        <div className="mt-2 text-center text-xs font-mono text-gray-400">
          ({DESKS.map((d) => fmtCount(d.exceptionCount)).join(' + ')}) / ({DESKS.map((d) => fmtCount(d.totalCount)).join(' + ')}) &times; 100
          <span className="text-gray-600"> = </span>
          <span className="text-sm font-black text-rose-400">{fmtPct(PORTFOLIO_EXCEPTION_RATE)}</span>
        </div>
        <div className="mt-2 text-center text-xs font-mono text-gray-500">
          Material: ({DESKS.map((d) => fmtCount(d.materialExceptionCount)).join(' + ')}) / ({DESKS.map((d) => fmtCount(d.totalCount)).join(' + ')}) &times; 100
          <span className="text-gray-600"> = </span>
          <span className="text-sm font-black text-orange-400">{fmtPct(PORTFOLIO_MATERIAL_EXCEPTION_RATE)}</span>
        </div>
        <PlainEnglish>
          The portfolio totals are computed by summing all desk exception counts and total counts, then dividing.
          Never average the desk rates — always re-pool the raw counts.
        </PlainEnglish>
      </div>

      {/* Desk breakdown */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-4 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Desk</div>
          <div className="text-right">All Exc. Rate</div>
          <div className="text-right">Material Rate</div>
          <div className="text-right">Facilities</div>
        </div>
        {DESKS.map((d) => (
          <div key={d.name} className="grid grid-cols-4 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-300">{d.name}</div>
            <div className="text-right text-rose-400 font-mono">{fmtPct(d.exceptionRate)}</div>
            <div className="text-right text-orange-400 font-mono">{fmtPct(d.materialExceptionRate)}</div>
            <div className="text-right text-gray-400 font-mono">{fmtCount(d.totalCount)}</div>
          </div>
        ))}
        <div className="grid grid-cols-4 text-xs px-3 py-2 border-t border-rose-500/20 bg-rose-500/[0.04]">
          <div className="text-rose-300 font-bold">Portfolio</div>
          <div className="text-right text-rose-400 font-mono font-bold">{fmtPct(PORTFOLIO_EXCEPTION_RATE)}</div>
          <div className="text-right text-orange-400 font-mono font-bold">{fmtPct(PORTFOLIO_MATERIAL_EXCEPTION_RATE)}</div>
          <div className="text-right text-gray-400 font-mono font-bold">{fmtCount(PORTFOLIO_TOTAL_COUNT)}</div>
        </div>
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
          SUM(exception counts) / SUM(facility counts) &times; 100
        </div>
        <PlainEnglish>
          At the highest level, Exception Rate tells the CRO and Board Risk Committee what proportion of the
          bank&apos;s loan book was approved outside standard credit policy. This feeds into CCAR stress
          testing, OCC regulatory examinations, and Internal Audit exception tracking.
        </PlainEnglish>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-3">
        <div className="flex items-start gap-2">
          <TrendingDown className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-blue-300 mb-1">Downstream Consumers</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Business Segment Exception Rate feeds directly into:
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="rounded bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-rose-300 font-bold">OCC:</span>{' '}
                <span className="text-gray-400">Examiner Exception Review</span>
              </div>
              <div className="rounded bg-orange-500/10 border border-orange-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-orange-300 font-bold">CCAR:</span>{' '}
                <span className="text-gray-400">Credit Standards Assessment</span>
              </div>
              <div className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-amber-300 font-bold">Audit:</span>{' '}
                <span className="text-gray-400">Exception Tracking &amp; Aging</span>
              </div>
              <div className="rounded bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 text-[10px]">
                <span className="text-blue-300 font-bold">Board:</span>{' '}
                <span className="text-gray-400">Risk Appetite Reporting</span>
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
  const [selectedVariant, setSelectedVariant] = useState<'all_exceptions' | 'material_exceptions'>('all_exceptions');
  const levels = ['facility', 'counterparty', 'desk', 'portfolio', 'lob'];
  const levelLabels: Record<string, string> = {
    facility: 'Facility',
    counterparty: 'Counterparty',
    desk: 'Desk',
    portfolio: 'Portfolio',
    lob: 'Business Segment',
  };

  const displayRate = selectedVariant === 'all_exceptions' ? PORTFOLIO_EXCEPTION_RATE : PORTFOLIO_MATERIAL_EXCEPTION_RATE;

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

          <div className="mt-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-300">2</span>
              Select Variant
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedVariant('all_exceptions')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs transition-all border ${
                  selectedVariant === 'all_exceptions'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-white/[0.02] text-gray-400 border-gray-800 hover:border-gray-700'
                }`}
              >
                All Exceptions
              </button>
              <button
                onClick={() => setSelectedVariant('material_exceptions')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs transition-all border ${
                  selectedVariant === 'material_exceptions'
                    ? 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                    : 'bg-white/[0.02] text-gray-400 border-gray-800 hover:border-gray-700'
                }`}
              >
                Material Only
              </button>
            </div>
          </div>
        </div>

        {/* Step 3: Preview */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-300">3</span>
            Dashboard Preview
          </div>
          <div className="rounded-xl border border-gray-700 bg-black/40 p-4">
            <div className="text-[10px] text-gray-500 mb-1">
              {levelLabels[selectedLevel]} Exception Rate — {selectedVariant === 'all_exceptions' ? 'All' : 'Material'}
            </div>
            <div className={`text-2xl font-black tabular-nums mb-2 ${selectedVariant === 'all_exceptions' ? 'text-rose-400' : 'text-orange-400'}`}>
              {fmtPct(displayRate)}
            </div>
            <div className="text-[10px] text-gray-500">
              {selectedVariant === 'all_exceptions'
                ? `${PORTFOLIO_EXCEPTION_COUNT} exceptions / ${PORTFOLIO_TOTAL_COUNT} facilities`
                : `${PORTFOLIO_MATERIAL_EXCEPTION_COUNT} material exceptions / ${PORTFOLIO_TOTAL_COUNT} facilities`}
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
      <div className="mt-3 pt-3 border-t border-gray-800 text-[10px] text-gray-600">
        Regulatory references: OCC Comptroller&apos;s Handbook, CCAR Credit Standards Assessment, Internal Audit Exception Tracking
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT
 * ──────────────────────────────────────────────────────────────────────────── */

export interface ExceptionRateLineageViewProps {
  demoExpandedLevel?: string | null;
  onStartDemo?: () => void;
}

export default function ExceptionRateLineageView({
  demoExpandedLevel,
  onStartDemo,
}: ExceptionRateLineageViewProps = {}) {
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
              <h1 className="text-xl font-bold text-white">Exception Rate End-to-End Lineage</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                From data model to dashboard — complete lineage with Pooled Division rollup
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
                <span className="text-xs text-gray-400">Percentage (Pool Counts)</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-2">
        {/* ── STEP 1: METRIC DEFINITION ── */}
        <section aria-labelledby={`${headingPrefix}-step1`}>
          <SectionHeading
            id={`${headingPrefix}-step1`}
            icon={Calculator}
            step="Step 1 — Metric Definition"
            layerColor="bg-rose-600"
            title="Exception Rate Configuration"
            subtitle="Formula: Exception_Count / Total_Facility_Count × 100 — two variants: All Exceptions and Material Exceptions"
          />

          {/* Variant sections side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div data-demo="step1-variant-all_exceptions">
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 h-full">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold text-rose-400">All Exceptions</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Counts every facility with <code className="text-amber-300">exception_flag = true</code>,
                  regardless of severity. Broadest view of policy deviations.
                </p>
                <div className="mt-2 bg-black/20 rounded p-2 text-center">
                  <span className="text-sm font-black text-rose-400">{fmtPct(PORTFOLIO_EXCEPTION_RATE)}</span>
                  <span className="text-[9px] text-gray-600 ml-2">{PORTFOLIO_EXCEPTION_COUNT} / {PORTFOLIO_TOTAL_COUNT}</span>
                </div>
              </div>
            </div>
            <div data-demo="step1-variant-material_exceptions">
              <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 h-full">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-xs font-bold text-orange-400">Material Exceptions</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Counts only <code className="text-amber-300">MAJOR</code> or <code className="text-amber-300">CRITICAL</code> severity
                  exceptions. The view regulators and credit committees focus on.
                </p>
                <div className="mt-2 bg-black/20 rounded p-2 text-center">
                  <span className="text-sm font-black text-orange-400">{fmtPct(PORTFOLIO_MATERIAL_EXCEPTION_RATE)}</span>
                  <span className="text-[9px] text-gray-600 ml-2">{PORTFOLIO_MATERIAL_EXCEPTION_COUNT} / {PORTFOLIO_TOTAL_COUNT}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Full metric def card */}
          <div className="mt-4">
            <MetricDefCard />
          </div>

          {/* Input fields: numerator (exception flag) and denominator (facility count) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div data-demo="num-section-all_exceptions">
              <InputFieldSection input={METRIC_INPUTS[0]} />
            </div>
            <div data-demo="num-section-material_exceptions">
              <InputFieldSection input={METRIC_INPUTS[1]} />
            </div>
            <div data-demo="den-section-all_exceptions" data-also-demo="den-section-material_exceptions">
              <InputFieldSection input={METRIC_INPUTS[2]} />
            </div>
          </div>

          {/* Invisible anchor for den-section-material_exceptions (same card, dual anchor) */}
          <div data-demo="den-section-material_exceptions" className="sr-only" aria-hidden="true" />

          {/* Result cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div data-demo="result-all_exceptions">
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.06] p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">All Exceptions — Exception Rate</div>
                <div className="text-2xl font-black text-rose-400 tabular-nums">{fmtPct(PORTFOLIO_EXCEPTION_RATE)}</div>
                <div className="text-[10px] text-gray-600 mt-1">{PORTFOLIO_EXCEPTION_COUNT} exceptions / {PORTFOLIO_TOTAL_COUNT} facilities × 100</div>
              </div>
            </div>
            <div data-demo="result-material_exceptions">
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/[0.06] p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">Material Exceptions — Exception Rate</div>
                <div className="text-2xl font-black text-orange-400 tabular-nums">{fmtPct(PORTFOLIO_MATERIAL_EXCEPTION_RATE)}</div>
                <div className="text-[10px] text-gray-600 mt-1">{PORTFOLIO_MATERIAL_EXCEPTION_COUNT} material exceptions / {PORTFOLIO_TOTAL_COUNT} facilities × 100</div>
              </div>
            </div>
          </div>

          <InsightCallout>
            <strong>Count-based, not dollar-weighted.</strong> Exception Rate treats every loan equally — a $5M
            facility and a $500M facility each count as one. This is intentional: the metric measures{' '}
            <em>policy adherence</em>, not exposure magnitude. Compare to LTV or DSCR which require
            exposure-weighted averages.
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
            The same counterparty record groups Exception Rate, LTV, DSCR, and Interest Income.
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
            subtitle="facility_credit_approval snapshot provides exception status and severity"
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
          <InsightCallout>
            <strong>One table, two fields.</strong> Exception Rate only needs{' '}
            <code className="text-amber-300">exception_flag</code> (for All Exceptions) and{' '}
            <code className="text-amber-300">exception_severity</code> (for the Material variant filter).
            The other fields — exception_type_code, approval_authority, exception_status — serve audit
            trail queries and exception management workflows.
          </InsightCallout>
        </section>

        <FlowArrow label="Fields feed into calculation engine" />

        {/* ── STEP 4: CALCULATION ── */}
        <section aria-labelledby={`${headingPrefix}-step4`}>
          <SectionHeading
            id={`${headingPrefix}-step4`}
            icon={Zap}
            step="Step 4 — Calculation Engine"
            layerColor="bg-rose-600"
            title="Exception Rate Calculation"
            subtitle="T3 authority — always calculated by the platform from raw exception flags and counts"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div data-demo="step4-variant-all_exceptions">
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-xs font-bold text-rose-400">All Exceptions</span>
                  </div>
                  <TierBadge tier="T3" />
                </div>
                <div className="bg-black/30 rounded-lg p-3 mb-3">
                  <div className="text-sm font-mono text-center space-y-1">
                    <div className="text-gray-400">
                      <code className="text-amber-300">COUNT(exception_flag = true)</code>
                    </div>
                    <div className="text-gray-600">&divide;</div>
                    <div className="text-gray-400">
                      <code className="text-amber-300">COUNT(*)</code>
                      <span className="text-gray-600 text-xs"> &times; 100</span>
                    </div>
                    <div className="text-gray-600">&darr;</div>
                    <div className="text-gray-300">3 / 5 &times; 100</div>
                    <div className="text-gray-600">&darr;</div>
                    <div className="text-rose-400 font-bold text-lg">60.00%</div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-gray-500">
                  <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong className="text-rose-300">All:</strong> Counts every active exception flag regardless of severity.
                  </span>
                </div>
              </div>
            </div>

            <div data-demo="step4-variant-material_exceptions">
              <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <span className="text-xs font-bold text-orange-400">Material Exceptions</span>
                  </div>
                  <TierBadge tier="T3" />
                </div>
                <div className="bg-black/30 rounded-lg p-3 mb-3">
                  <div className="text-sm font-mono text-center space-y-1">
                    <div className="text-gray-400 text-[10px]">
                      <code className="text-amber-300">COUNT(flag=true AND severity IN (MAJOR,CRITICAL))</code>
                    </div>
                    <div className="text-gray-600">&divide;</div>
                    <div className="text-gray-400">
                      <code className="text-amber-300">COUNT(*)</code>
                      <span className="text-gray-600 text-xs"> &times; 100</span>
                    </div>
                    <div className="text-gray-600">&darr;</div>
                    <div className="text-gray-300">2 / 5 &times; 100</div>
                    <div className="text-gray-600">&darr;</div>
                    <div className="text-orange-400 font-bold text-lg">40.00%</div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-gray-500">
                  <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong className="text-orange-300">Material:</strong> Facility C&apos;s MINOR covenant waiver is excluded —
                    only MAJOR (F-201) and CRITICAL (F-205) count.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FlowArrow label="Results stored in L3 tables, then rolled up" />

        {/* ── STEP 5: L3 OUTPUT + ROLLUP ── */}
        <section aria-labelledby={`${headingPrefix}-step5`}>
          <SectionHeading
            id={`${headingPrefix}-step5`}
            icon={GitBranch}
            step="Step 5 — L3 Output & Rollup Hierarchy"
            layerColor="bg-rose-600"
            title="Storage & Aggregation"
            subtitle="Pooled Division at every level — re-pool counts, never average rates"
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
            subtitle="Pick the aggregation level and variant — no SQL needed"
          />
          <DashboardConsumption />
        </section>

        {/* ── LEGEND ── */}
        <FooterLegend />
      </main>
    </div>
  );
}
