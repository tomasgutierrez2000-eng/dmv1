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
  Eye,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Table2,
  Users,
  FolderTree,
  PieChart,
  Info,
  Link2,
  Play,
  Network,
  Workflow,
  Sparkles,
} from 'lucide-react';
import {
  FACILITIES,
  COUNTERPARTIES,
  fmtPct,
  fmtM,
  facilitiesForCounterparty,
} from './demo/allocPctDemoRollupData';

/* ────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ──────────────────────────────────────────────────────────────────────────── */

interface InputField {
  name: string;
  field: string;
  table: string;
  layer: 'L1';
  value: string;
  description: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * STATIC DATA
 * ──────────────────────────────────────────────────────────────────────────── */

const INPUTS: InputField[] = [
  { name: 'Participation %', field: 'participation_pct', table: 'facility_counterparty_participation', layer: 'L1', value: '60.00%', description: 'Counterparty share of the facility' },
  { name: 'Facility ID', field: 'facility_id', table: 'facility_master', layer: 'L1', value: 'F-201', description: 'FK linking to facility master' },
  { name: 'Counterparty ID', field: 'counterparty_id', table: 'facility_master', layer: 'L1', value: 'CP-01', description: 'FK linking facility to counterparty' },
];

const ROLLUP_LEVELS = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Table2,
    desc: 'Raw lookup of participation_pct for one facility-counterparty pair',
    method: 'Raw',
    purpose: 'Per-facility counterparty share',
    tier: 'T2',
    active: true,
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    desc: 'Raw lookup — each facility retains its own participation_pct',
    method: 'Raw',
    purpose: 'Counterparty share across facilities',
    tier: 'T2',
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
  { table: 'facility_master', desc: 'Loan identity — facility type, maturity, counterparty FK', fields: ['facility_id (PK)', 'counterparty_id (FK)', 'lob_segment_id (FK)', 'committed_facility_amt'] },
  { table: 'facility_counterparty_participation', desc: 'Counterparty participation records — share of each facility', fields: ['facility_id (FK)', 'counterparty_id (FK)', 'participation_pct', 'is_primary_flag'], primary: true },
  { table: 'counterparty', desc: 'Borrower identity — legal name, credit rating, industry', fields: ['counterparty_id (PK)', 'legal_name', 'industry_code'] },
];

/** L3 output tables that store Allocation % values */
const L3_OUTPUT_TABLES = [
  {
    table: 'metric_value_fact',
    desc: 'Generic metric storage — Allocation % at facility and counterparty levels',
    fields: ['metric_id = ALLOC_PCT', 'aggregation_level', 'facility_id | counterparty_id', 'value', 'unit = PERCENTAGE'],
    primary: true,
  },
];

/** Join chain data for each rollup level */
interface JoinHop { from: string; fromLayer: 'L1'; to: string; toLayer: 'L1'; joinKey: string; note?: string }
interface JoinChainData { hops: JoinHop[]; aggregation: string; result: string }

const ROLLUP_JOIN_CHAINS: Record<string, JoinChainData> = {
  facility: {
    hops: [
      { from: 'facility_master', fromLayer: 'L1', to: 'facility_counterparty_participation', toLayer: 'L1', joinKey: 'facility_id, counterparty_id', note: 'Lookup participation_pct' },
    ],
    aggregation: 'Raw: direct lookup of participation_pct WHERE facility_id AND counterparty_id',
    result: 'One Allocation % value per (facility, counterparty) pair',
  },
  counterparty: {
    hops: [
      { from: 'facility_master', fromLayer: 'L1', to: 'facility_counterparty_participation', toLayer: 'L1', joinKey: 'facility_id, counterparty_id', note: 'Lookup participation_pct per facility' },
    ],
    aggregation: 'Raw: for each counterparty, list participation_pct per facility',
    result: 'Allocation % per facility for each counterparty',
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
 * STEP 1 — METRIC DEFINITION CARD
 * ──────────────────────────────────────────────────────────────────────────── */

function MetricDefCard() {
  return (
    <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-4 max-w-lg">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
        <span className="text-sm font-bold text-cyan-400">Counterparty Share or Allocation (%)</span>
      </div>

      <div className="space-y-1.5 text-xs mb-3">
        <div className="flex justify-between"><span className="text-gray-500">Metric Class</span><span className="text-gray-300">SOURCED</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Unit Type</span><span className="text-gray-300">PERCENTAGE</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Direction</span><span className="text-gray-300">NEUTRAL</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Rollup</span><span className="text-gray-300">Raw (facility &amp; counterparty only)</span></div>
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
          Exposure allocated to specific counterparty representing their share of the facility
          which the client can draw on. Concentration KPI measuring obligor dependency risk.
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * INPUT FIELDS SECTION
 * ──────────────────────────────────────────────────────────────────────────── */

function InputFieldSection({ input }: { input: InputField }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-300">{input.name}</span>
        <span className="text-white font-mono font-bold text-sm">{input.value}</span>
      </div>
      <div className="space-y-1 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Source:</span>
          <code className="font-mono text-blue-300">{input.layer}.{input.table}</code>
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
        {chain.hops.map((hop, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <span className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center text-[8px] font-bold text-gray-500 flex-shrink-0">{i + 1}</span>
            <code className="font-mono text-blue-300">{hop.from}</code>
            <span className="text-gray-600">&rarr;</span>
            <code className="font-mono text-blue-300">{hop.to}</code>
            <span className="text-gray-700">ON</span>
            <code className="font-mono text-cyan-400">{hop.joinKey}</code>
            {hop.note && <span className="text-gray-600 italic ml-1">({hop.note})</span>}
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-white/5 flex items-start gap-2 text-[10px]">
        <Sparkles className="w-3 h-3 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-gray-500 font-medium">Aggregation: </span>
          <span className="text-cyan-300">{chain.aggregation}</span>
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
        <div className="text-sm font-mono text-cyan-400 text-center">
          Raw lookup: participation_pct
        </div>
        <PlainEnglish>
          For each facility, look up the counterparty&apos;s participation_pct from
          facility_counterparty_participation WHERE facility_id AND counterparty_id match.
        </PlainEnglish>
      </div>
      <JoinChainVisual levelKey="facility" />

      {/* Sample facilities */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-4 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
          <div>Facility</div>
          <div>Counterparty</div>
          <div className="text-right">Committed</div>
          <div className="text-right">Allocation %</div>
        </div>
        {FACILITIES.map((f) => (
          <div key={f.facilityId} className="grid grid-cols-4 text-xs px-3 py-1.5 border-t border-gray-800/50">
            <div className="text-gray-400 truncate">{f.name}</div>
            <div className="text-gray-400">{f.counterpartyName}</div>
            <div className="text-right text-gray-300 font-mono">{fmtM(f.committedAmt)}</div>
            <div className="text-right text-cyan-400 font-mono font-bold">{fmtPct(f.participationPct)}</div>
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
        A single counterparty may participate in multiple facilities with different allocation percentages.
        At the counterparty level, each facility&apos;s participation_pct is displayed as a <strong className="text-white">raw lookup</strong> —
        no weighted average is applied.
      </div>
      <JoinChainVisual levelKey="counterparty" />

      {/* Show facilities grouped by counterparty */}
      {COUNTERPARTIES.map((cp) => {
        const cpFacilities = facilitiesForCounterparty(cp.name);
        return (
          <div key={cp.name} className="rounded-lg border border-gray-800 overflow-hidden">
            <div className="bg-white/[0.03] px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300">{cp.name}</span>
              <span className="text-[10px] text-gray-500">{cp.facilityCount} facilities | {fmtM(cp.totalCommitted)} total committed</span>
            </div>
            <div className="grid grid-cols-3 text-[9px] font-bold uppercase tracking-wider text-gray-500 px-3 py-1">
              <div>Facility</div>
              <div className="text-right">Committed</div>
              <div className="text-right">Allocation %</div>
            </div>
            {cpFacilities.map((f) => (
              <div key={f.facilityId} className="grid grid-cols-3 text-xs px-3 py-1.5 border-t border-gray-800/50">
                <div className="text-gray-400 truncate">{f.name}</div>
                <div className="text-right text-gray-300 font-mono">{fmtM(f.committedAmt)}</div>
                <div className="text-right text-cyan-400 font-mono font-bold">{fmtPct(f.participationPct)}</div>
              </div>
            ))}
          </div>
        );
      })}
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
  const [selectedLevel, setSelectedLevel] = useState('facility');
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
              {fmtPct(FACILITIES[0].participationPct)}
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-600" />
          <span className="text-[10px] text-gray-400">L1 Reference</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-600" />
          <span className="text-[10px] text-gray-400">L3 Output</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-pink-600" />
          <span className="text-[10px] text-gray-400">Dashboard</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 md:grid-cols-3 gap-2">
        <TierBadge tier="T1" />
        <TierBadge tier="T2" />
      </div>
      <div className="mt-3 pt-3 border-t border-gray-800 text-[10px] text-gray-600">
        Regulatory references: FR Y-14Q, Large Exposure Framework
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
                From data model to dashboard — raw lookup at facility and counterparty levels
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
                <span className="text-xs text-gray-400">Percentage (Raw)</span>
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
            title="Counterparty Share or Allocation (%) Configuration"
            subtitle="Raw sourced metric — participation_pct from facility_counterparty_participation"
          />
          <MetricDefCard />

          {/* Input fields */}
          <div className="mt-5 mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-2">Input Fields</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-demo="num-section">
            {INPUTS.map((input) => (
              <div key={input.field}>
                <InputFieldSection input={input} />
              </div>
            ))}
          </div>

          <div data-demo="result" className="mt-4">
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/[0.06] p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Allocation %</div>
              <div className="text-2xl font-black text-cyan-400 tabular-nums">60.00%</div>
              <div className="text-[10px] text-gray-600 mt-1">Direct lookup from facility_counterparty_participation</div>
            </div>
          </div>

          <InsightCallout>
            Allocation % is a direct raw lookup — no calculation required. The value represents the
            counterparty&apos;s share of the facility which they can draw on.
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
            subtitle="Reference tables that identify the facility and counterparty participation"
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
            <strong>facility_counterparty_participation is the key table.</strong> Allocation % is sourced
            directly from this L1 reference table. The <code className="text-blue-300">participation_pct</code> field
            stores the counterparty&apos;s share — it changes only when the participation structure is modified.
          </InsightCallout>
        </section>

        <FlowArrow label="Results stored in L3 tables" />

        {/* ── STEP 3: L3 OUTPUT + ROLLUP ── */}
        <section data-demo="step5" aria-labelledby={`${headingPrefix}-step5`}>
          <SectionHeading
            id={`${headingPrefix}-step5`}
            icon={GitBranch}
            step="Step 3 — L3 Output & Rollup Hierarchy"
            layerColor="bg-emerald-600"
            title="Storage & Aggregation"
            subtitle="Raw at facility and counterparty — N/A above counterparty level"
          />

          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <Database className="w-3 h-3" aria-hidden="true" />
              L3 Output Tables
            </div>
            <L3OutputTablesView />
          </div>

          <div className="mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <Link2 className="w-3 h-3" aria-hidden="true" />
              Rollup Hierarchy — Facility {'→'} Counterparty {'→'} Desk (N/A) {'→'} Portfolio (N/A) {'→'} Business Segment (N/A) — click to expand
            </div>
          </div>
          <RollupPyramid expandedLevel={expandedLevel} onToggle={(k) => setExpandedLevel(expandedLevel === k ? null : k)} />
        </section>

        <FlowArrow label="Values feed into dashboards" />

        {/* ── STEP 4: DASHBOARD ── */}
        <section data-demo="step6" aria-labelledby={`${headingPrefix}-step6`}>
          <SectionHeading
            id={`${headingPrefix}-step6`}
            icon={LayoutDashboard}
            step="Step 4 — Dashboard Consumption"
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
