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
  AlertTriangle,
  TrendingUp,
  Play,
  Network,
  Workflow,
  Search,
  Sparkles,
  RefreshCw,
  Scale,
  Building2,
  Percent,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ──────────────────────────────────────────────────────────────────────────── */

interface PositionData {
  positionId: string;
  facilityId: string;
  rateIndex: number;
  totalCommitment: number;
  bankSharePct: number;
  adjustedCommitment: number;
  contractWeight: number;
  contribution: number;
}

/* ────────────────────────────────────────────────────────────────────────────
 * SAMPLE DATA — Facility Level (3 positions under one facility)
 * ──────────────────────────────────────────────────────────────────────────── */

const FACILITY_POSITIONS: PositionData[] = [
  {
    positionId: 'P-1001',
    facilityId: 'F-5001',
    rateIndex: 5.25,
    totalCommitment: 60_000_000,
    bankSharePct: 0.50,
    adjustedCommitment: 30_000_000,
    contractWeight: 0.50,
    contribution: 2.625,
  },
  {
    positionId: 'P-1002',
    facilityId: 'F-5001',
    rateIndex: 5.50,
    totalCommitment: 30_000_000,
    bankSharePct: 0.50,
    adjustedCommitment: 15_000_000,
    contractWeight: 0.25,
    contribution: 1.375,
  },
  {
    positionId: 'P-1003',
    facilityId: 'F-5001',
    rateIndex: 4.75,
    totalCommitment: 10_000_000,
    bankSharePct: 0.50,
    adjustedCommitment: 5_000_000,
    contractWeight: 0.0833,
    contribution: 0.396,
  },
];

const FACILITY_WABR = 5.148; // Σ contributions (adjusted for rounding)

/* ────────────────────────────────────────────────────────────────────────────
 * SAMPLE DATA — Counterparty Level (2 facilities, 4 positions)
 * ──────────────────────────────────────────────────────────────────────────── */

const COUNTERPARTY_POSITIONS: PositionData[] = [
  { positionId: 'P-1001', facilityId: 'F-5001', rateIndex: 5.25, totalCommitment: 60_000_000, bankSharePct: 0.50, adjustedCommitment: 30_000_000, contractWeight: 0.375, contribution: 1.969 },
  { positionId: 'P-1002', facilityId: 'F-5001', rateIndex: 5.50, totalCommitment: 30_000_000, bankSharePct: 0.50, adjustedCommitment: 15_000_000, contractWeight: 0.1875, contribution: 1.031 },
  { positionId: 'P-1003', facilityId: 'F-5002', rateIndex: 4.75, totalCommitment: 40_000_000, bankSharePct: 1.00, adjustedCommitment: 40_000_000, contractWeight: 0.50, contribution: 2.375 },
  { positionId: 'P-1004', facilityId: 'F-5002', rateIndex: 4.25, totalCommitment: 0, bankSharePct: 1.00, adjustedCommitment: 0, contractWeight: 0, contribution: 0 },
];

const COUNTERPARTY_WABR = 5.042; // recalculated: (1.969+1.031+2.375) ÷ (0.375+0.1875+0.50) ≈ 5.042 (actually: sum of contributions where weight > 0)

/* ────────────────────────────────────────────────────────────────────────────
 * ROLLUP LEVELS
 * ──────────────────────────────────────────────────────────────────────────── */

const ROLLUP_LEVELS = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Table2,
    desc: 'Commitment-weighted average across positions within one facility',
    method: 'Weighted Average',
    purpose: 'Facility-level benchmark rate visibility',
    tier: 'T3',
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    desc: 'Commitment-weighted average across all positions for all facilities of an obligor',
    method: 'Weighted Average',
    purpose: 'Obligor-level rate assessment',
    tier: 'T3',
  },
  {
    key: 'desk',
    label: 'Desk (L3)',
    icon: Briefcase,
    desc: 'Commitment-weighted average across all positions in the L3 LoB segment',
    method: 'Weighted Average',
    purpose: 'Desk book pricing monitoring',
    tier: 'T3',
  },
  {
    key: 'portfolio',
    label: 'Portfolio (L2)',
    icon: FolderTree,
    desc: 'Commitment-weighted average across all positions in the L2 LoB segment',
    method: 'Weighted Average',
    purpose: 'Portfolio rate risk trending',
    tier: 'T3',
  },
  {
    key: 'lob',
    label: 'Line of Business (L1)',
    icon: PieChart,
    desc: 'Commitment-weighted average across all positions in the L1 LoB segment',
    method: 'Weighted Average',
    purpose: 'Enterprise rate environment monitoring',
    tier: 'T3',
  },
] as const;

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

function fmtDollar(n: number): string {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'K';
  return '$' + n.toLocaleString('en-US');
}

function fmtPct(n: number, decimals = 2): string {
  return n.toFixed(decimals) + '%';
}

function fmtWeight(n: number): string {
  return (n * 100).toFixed(2) + '%';
}

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
    <div className="mt-2 rounded-lg bg-white/[0.02] border border-white/5 px-3 py-2 text-[10px] text-gray-500 leading-relaxed italic">
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 1 — METRIC DEFINITION CARD
 * ──────────────────────────────────────────────────────────────────────────── */

function MetricDefinitionCard() {
  return (
    <div className="rounded-xl border border-teal-500/40 bg-teal-500/10 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
        <span className="text-sm font-bold text-teal-400">Weighted Average Base Rate (%)</span>
        <code className="text-[9px] font-mono text-gray-600 ml-auto">base_rate_pct</code>
      </div>

      {/* Definition */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Type</span>
          <span className="text-gray-300 font-medium">Decimal (Weighted Average)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Metric Type</span>
          <span className="text-gray-300 font-medium">Market Rate Indicator</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Display Format</span>
          <span className="text-gray-300 font-medium">0.00%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">KPI Instances</span>
          <span className="text-gray-300 font-medium">5 levels (Facility → L1)</span>
        </div>
      </div>

      {/* Formula */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Core Formula</div>
        <div className="bg-black/30 rounded-lg p-3">
          <div className="text-sm font-mono text-teal-400 text-center">
            {'Σ'}(rate_index {'×'} Contract_Weight)
          </div>
          <div className="text-xs font-mono text-gray-500 text-center mt-1">
            where Contract_Weight = Adjusted_Commitment / {'Σ'}(Adjusted_Commitment)
          </div>
          <div className="text-xs font-mono text-gray-500 text-center mt-1">
            and Adjusted_Commitment = total_commitment {'×'} bank_share_pct
          </div>
        </div>
      </div>

      {/* Key insight */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Insight Provided</div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Market interest rate impact across the portfolio. Reflects the effective benchmark rate
          weighted by the bank&apos;s economic exposure (adjusted for syndication share), not the
          full facility commitment.
        </p>
      </div>

      {/* Source tables */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Source Tables</div>
        <div className="flex flex-wrap gap-2">
          {[
            { table: 'position', layer: 'L2', color: 'amber' },
            { table: 'position_detail', layer: 'L2', color: 'amber' },
            { table: 'facility_master', layer: 'L1', color: 'blue' },
            { table: 'facility_lender_allocation', layer: 'L1', color: 'blue' },
            { table: 'enterprise_business_taxonomy', layer: 'L1', color: 'blue' },
          ].map((t) => (
            <span
              key={t.table}
              className={`text-[9px] font-mono px-2 py-1 rounded border ${
                t.color === 'amber'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-300'
              }`}
            >
              {t.layer}.{t.table}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 2 — L1 REFERENCE TABLES
 * ──────────────────────────────────────────────────────────────────────────── */

const L1_TABLES = [
  {
    name: 'facility_master',
    scd: 'SCD-2',
    desc: 'Master record for each credit facility',
    fields: ['facility_id (PK)', 'counterparty_id (FK)', 'lob_segment_id (FK)', 'committed_facility_amt', 'facility_type', 'maturity_date'],
    wabrRole: 'Central hub — joins positions to counterparty identity and LoB hierarchy. The facility_id FK from position table anchors the entire join chain.',
    sampleRow: 'F-5001 | Sunrise Properties | CRE Desk | $100M | TERM_LOAN',
    fks: ['counterparty_id → counterparty', 'lob_segment_id → enterprise_business_taxonomy'],
    isCore: true,
  },
  {
    name: 'facility_lender_allocation',
    scd: 'SCD-2',
    desc: 'Bank share of syndicated facilities — GSIB-critical for correct weighting',
    fields: ['lender_allocation_id (PK)', 'facility_id (FK)', 'legal_entity_id (FK)', 'bank_share_pct', 'bank_commitment_amt', 'allocation_role'],
    wabrRole: 'Provides bank_share_pct — the syndication share that adjusts total_commitment to reflect our bank\'s actual economic exposure. Without this, syndicated deals massively distort the weighted average.',
    sampleRow: 'F-5001 | OUR_BANK | 50% | $50M | LEAD',
    fks: ['facility_id → facility_master', 'legal_entity_id → legal_entity'],
    isCore: true,
  },
  {
    name: 'counterparty',
    scd: 'SCD-2',
    desc: 'Obligor / borrower master — the "who" behind each facility',
    fields: ['counterparty_id (PK)', 'legal_name', 'counterparty_type', 'country_code (FK)', 'industry_id (FK)'],
    wabrRole: 'Identifies the borrower for counterparty-level aggregation. The join path facility_master.counterparty_id → counterparty groups facilities by obligor.',
    sampleRow: '67890 | Sunrise Properties LLC | CORP | US | CRE',
    fks: ['country_code → country_dim', 'industry_id → industry_dim'],
    isCore: true,
  },
  {
    name: 'enterprise_business_taxonomy',
    scd: 'SCD-0',
    desc: 'LoB hierarchy — self-referencing tree for desk → portfolio → LoB rollup',
    fields: ['managed_segment_id (PK)', 'parent_segment_id (FK-self)', 'tree_level', 'description'],
    wabrRole: 'Rollup hierarchy — walks facility → desk (L3) → portfolio (L2) → LoB (L1) for aggregation. tree_level column determines the aggregation grain.',
    sampleRow: 'SEG-100 | SEG-010 | L3 | CRE Origination Desk',
    fks: ['parent_segment_id → enterprise_business_taxonomy (self-referencing)'],
    isCore: true,
  },
];

function ExpandableTableCard({
  name, scd, desc, fields, wabrRole, sampleRow, fks, isCore,
}: {
  name: string;
  scd: string;
  desc: string;
  fields: string[];
  wabrRole: string;
  sampleRow: string;
  fks: string[];
  isCore: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border transition-all ${isCore ? 'border-blue-500/30 bg-blue-500/[0.04]' : 'border-gray-800 bg-white/[0.02]'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className={`w-4 h-4 ${isCore ? 'text-blue-400' : 'text-gray-600'}`} aria-hidden="true" />
            <code className="text-xs font-mono font-bold text-blue-300">{name}</code>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{scd}</span>
            {isCore && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">WABR Core</span>}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
        <div className="text-[10px] text-gray-500 mt-1 ml-6">{desc}</div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3 ml-6">
          {/* WABR Role */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-teal-400 mb-1">Role in WABR Calculation</div>
            <p className="text-[10px] text-gray-400 leading-relaxed">{wabrRole}</p>
          </div>

          {/* Fields */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1">Key Columns</div>
            <div className="flex flex-wrap gap-1">
              {fields.map((f) => (
                <code key={f} className="text-[9px] font-mono text-gray-400 bg-white/[0.03] border border-gray-800 rounded px-1.5 py-0.5">{f}</code>
              ))}
            </div>
          </div>

          {/* Sample row */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1">Sample Row</div>
            <code className="text-[9px] font-mono text-emerald-400 bg-black/30 rounded px-2 py-1 block">{sampleRow}</code>
          </div>

          {/* FKs */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1">FK References</div>
            {fks.map((fk) => (
              <div key={fk} className="flex items-center gap-1.5 text-[10px]">
                <Link2 className="w-3 h-3 text-blue-400 flex-shrink-0" />
                <code className="font-mono text-gray-400">{fk}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function L1Tables() {
  return (
    <div className="space-y-2">
      {L1_TABLES.map((t) => (
        <ExpandableTableCard key={t.name} {...t} />
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 3 — L2 SOURCE DATA
 * ──────────────────────────────────────────────────────────────────────────── */

const L2_FIELDS = [
  { table: 'position', field: 'position_id', type: 'BIGINT (PK)', desc: 'Unique position identifier', role: 'Join key to position_detail' },
  { table: 'position', field: 'facility_id', type: 'BIGINT (FK)', desc: 'Links position to facility', role: 'Join to facility_master → counterparty & LoB' },
  { table: 'position', field: 'as_of_date', type: 'DATE', desc: 'Reporting snapshot date', role: 'Temporal filter for point-in-time reporting' },
  { table: 'position_detail', field: 'rate_index', type: 'NUMERIC(10,4)', desc: 'Benchmark interest rate (SOFR, Prime, etc.)', role: 'Numerator component — the rate being weighted' },
  { table: 'position_detail', field: 'total_commitment', type: 'NUMERIC(18,2)', desc: 'Full facility commitment for this position', role: 'Weight base — adjusted by bank_share_pct for GSIB' },
  { table: 'position_detail', field: 'interest_rate', type: 'NUMERIC(8,6)', desc: 'Contractual rate on the position', role: 'NOT used in WABR — this is the all-in rate, not the benchmark' },
];

/** Column-level metadata for X-Ray mode */
const COLUMN_META: Record<string, { type: string; desc: string; filter?: string; fk?: string }> = {
  'position.position_id': { type: 'BIGINT', desc: 'Unique position identifier — PK for the position table', fk: 'position_detail.position_id' },
  'position.facility_id': { type: 'BIGINT', desc: 'Links to facility master for borrower identity and LoB hierarchy', fk: 'facility_master.facility_id' },
  'position_detail.rate_index': { type: 'NUMERIC(10,4)', desc: 'Reference benchmark rate (e.g., SOFR 5.25%). This is the INDEX rate, not the contractual rate.' },
  'position_detail.total_commitment': { type: 'NUMERIC(18,2)', desc: 'Total commitment amount for this position detail row. Must be adjusted by bank_share_pct for syndicated facilities.' },
  'position_detail.interest_rate': { type: 'NUMERIC(8,6)', desc: 'Contractual interest rate — NOT used in WABR. Common mistake: confusing interest_rate with rate_index.' },
};

function L2FieldTable() {
  const [expandedField, setExpandedField] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[120px_140px_120px_1fr_auto] gap-2 text-[9px] font-bold uppercase tracking-wider text-gray-600 bg-white/[0.03] px-3 py-2 border-b border-gray-800">
        <div>Table</div>
        <div>Column</div>
        <div>Type</div>
        <div>Role in WABR</div>
        <div />
      </div>

      {L2_FIELDS.map((f) => {
        const key = `${f.table}.${f.field}`;
        const isExpanded = expandedField === key;
        const meta = COLUMN_META[key];
        const isRateIndex = f.field === 'rate_index';
        const isTotalCommitment = f.field === 'total_commitment';
        const isNotUsed = f.field === 'interest_rate';

        return (
          <div key={key}>
            <button
              onClick={() => setExpandedField(isExpanded ? null : key)}
              className={`w-full grid grid-cols-[120px_140px_120px_1fr_auto] gap-2 text-[10px] px-3 py-2 border-b border-gray-800/30 text-left transition-colors ${
                isNotUsed ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06]' : 'hover:bg-white/[0.02]'
              }`}
            >
              <code className="font-mono text-amber-300/70 truncate">{f.table}</code>
              <code className={`font-mono truncate ${isRateIndex ? 'text-teal-300 font-bold' : isTotalCommitment ? 'text-emerald-300 font-bold' : isNotUsed ? 'text-red-400 line-through' : 'text-gray-300'}`}>
                {f.field}
              </code>
              <span className="text-gray-600 font-mono truncate">{f.type}</span>
              <span className={`${isNotUsed ? 'text-red-400' : 'text-gray-400'} truncate`}>{f.role}</span>
              <ChevronDown className={`w-3 h-3 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && meta && (
              <div className="mx-3 my-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-2.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">L2 Snapshot</span>
                  <code className="text-[10px] font-mono text-amber-200">{key}</code>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[10px]">
                  <span className="text-gray-600 font-medium">Type</span>
                  <code className="text-gray-400 font-mono">{meta.type}</code>
                  <span className="text-gray-600 font-medium">Description</span>
                  <span className="text-gray-400">{meta.desc}</span>
                  {meta.fk && (
                    <>
                      <span className="text-gray-600 font-medium">FK</span>
                      <code className="text-blue-300 font-mono">{meta.fk}</code>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Warning callout */}
      <div className="px-3 py-2.5 bg-red-500/[0.04] text-[10px] text-red-400 flex items-center gap-2 border-t border-red-500/20">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          <strong>Common GSIB mistake:</strong> Using <code className="font-mono">interest_rate</code> instead of <code className="font-mono">rate_index</code>.
          The former is the contractual all-in rate; the latter is the benchmark index (SOFR, Prime) that this metric requires.
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 4 — CALCULATION ENGINE
 * ──────────────────────────────────────────────────────────────────────────── */

function PositionTable({ positions, title, result }: { positions: PositionData[]; title: string; result: number }) {
  const totalAdjusted = positions.reduce((s, p) => s + p.adjustedCommitment, 0);
  const totalWeight = positions.reduce((s, p) => s + p.contractWeight, 0);

  return (
    <div className="rounded-xl border border-teal-500/30 bg-teal-500/[0.04] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-teal-400" />
        <span className="text-xs font-bold text-teal-300">{title}</span>
      </div>

      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-7 text-[8px] font-bold uppercase tracking-wider text-gray-600 bg-white/[0.03] px-2 py-1.5">
          <div>Position</div>
          <div>Facility</div>
          <div className="text-right">rate_index</div>
          <div className="text-right">total_commit</div>
          <div className="text-right">bank_share</div>
          <div className="text-right">adj_commit</div>
          <div className="text-right">weight</div>
        </div>
        {positions.map((p) => (
          <div key={p.positionId} className="grid grid-cols-7 text-[10px] px-2 py-1.5 border-t border-gray-800/30">
            <code className="font-mono text-gray-400">{p.positionId}</code>
            <code className="font-mono text-gray-500">{p.facilityId}</code>
            <div className="text-right font-mono text-teal-300 font-bold">{fmtPct(p.rateIndex)}</div>
            <div className="text-right font-mono text-gray-400">{fmtDollar(p.totalCommitment)}</div>
            <div className="text-right font-mono text-blue-300">{fmtPct(p.bankSharePct * 100, 0)}</div>
            <div className="text-right font-mono text-emerald-400">{fmtDollar(p.adjustedCommitment)}</div>
            <div className="text-right font-mono text-gray-300">{fmtWeight(p.contractWeight)}</div>
          </div>
        ))}
        {/* Totals */}
        <div className="grid grid-cols-7 text-[10px] font-bold px-2 py-2 border-t border-white/10 bg-white/[0.02]">
          <div className="col-span-5 text-gray-500">Total</div>
          <div className="text-right font-mono text-emerald-300">{fmtDollar(totalAdjusted)}</div>
          <div className="text-right font-mono text-gray-300">{fmtWeight(totalWeight)}</div>
        </div>
      </div>

      {/* Contribution breakdown */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2">Weighted Contribution</div>
        {positions.filter(p => p.contractWeight > 0).map((p) => (
          <div key={p.positionId} className="flex items-center justify-between text-[10px] py-0.5">
            <span className="text-gray-500">
              <code className="font-mono text-teal-300">{fmtPct(p.rateIndex)}</code>
              {' × '}
              <code className="font-mono text-gray-400">{fmtWeight(p.contractWeight)}</code>
            </span>
            <span className="font-mono text-emerald-400">= {fmtPct(p.contribution, 3)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-xs font-bold mt-2 pt-2 border-t border-white/10">
          <span className="text-teal-300">Weighted Average Base Rate</span>
          <span className="text-xl font-black text-teal-400 tabular-nums">{fmtPct(result)}</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 5 — ROLLUP HIERARCHY
 * ──────────────────────────────────────────────────────────────────────────── */

interface JoinHop {
  from: string;
  fromLayer: 'L1' | 'L2' | 'L3';
  to: string;
  toLayer: 'L1' | 'L2' | 'L3';
  joinKey: string;
  note?: string;
}

interface JoinChainData {
  hops: JoinHop[];
  aggregation: string;
  result: string;
}

const ROLLUP_JOIN_CHAINS: Record<string, JoinChainData> = {
  facility: {
    hops: [
      { from: 'position', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Position → Facility identity' },
      { from: 'position', fromLayer: 'L2', to: 'position_detail', toLayer: 'L2', joinKey: 'position_id', note: 'Position → rate_index, total_commitment' },
      { from: 'facility_master', fromLayer: 'L1', to: 'facility_lender_allocation', toLayer: 'L1', joinKey: 'facility_id', note: 'Facility → bank_share_pct' },
    ],
    aggregation: 'Σ(rate_index × adjusted_weight) where weight = (total_commitment × bank_share_pct) / Σ(total_commitment × bank_share_pct) across all positions in facility',
    result: 'One weighted average base rate per facility',
  },
  counterparty: {
    hops: [
      { from: 'facility_master', fromLayer: 'L1', to: 'counterparty', toLayer: 'L1', joinKey: 'counterparty_id', note: 'Facility → Borrower' },
      { from: 'position', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Position → Facility' },
      { from: 'position', fromLayer: 'L2', to: 'position_detail', toLayer: 'L2', joinKey: 'position_id', note: 'Position → rate_index, total_commitment' },
      { from: 'facility_master', fromLayer: 'L1', to: 'facility_lender_allocation', toLayer: 'L1', joinKey: 'facility_id', note: 'Facility → bank_share_pct' },
    ],
    aggregation: 'Denominator widens: Σ(adjusted_commitment) across ALL positions for ALL facilities of this counterparty',
    result: 'One weighted average base rate per counterparty — positions from all their facilities contribute',
  },
  desk: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'facility_master', toLayer: 'L1', joinKey: 'lob_segment_id WHERE tree_level=L3', note: 'L3 LoB → Facilities' },
      { from: 'position', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Position → Facility' },
      { from: 'position', fromLayer: 'L2', to: 'position_detail', toLayer: 'L2', joinKey: 'position_id', note: 'Position → rate_index, total_commitment' },
      { from: 'facility_master', fromLayer: 'L1', to: 'facility_lender_allocation', toLayer: 'L1', joinKey: 'facility_id', note: 'Facility → bank_share_pct' },
    ],
    aggregation: 'Denominator widens: Σ(adjusted_commitment) across ALL positions for ALL facilities in this L3 segment',
    result: 'One weighted average base rate per L3 desk segment',
  },
  portfolio: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'facility_master', toLayer: 'L1', joinKey: 'lob_segment_id WHERE tree_level=L2', note: 'L2 LoB → Facilities' },
      { from: 'position', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Position → Facility' },
      { from: 'position', fromLayer: 'L2', to: 'position_detail', toLayer: 'L2', joinKey: 'position_id', note: 'Position → rate_index, total_commitment' },
      { from: 'facility_master', fromLayer: 'L1', to: 'facility_lender_allocation', toLayer: 'L1', joinKey: 'facility_id', note: 'Facility → bank_share_pct' },
    ],
    aggregation: 'Denominator widens: Σ(adjusted_commitment) across ALL positions for ALL facilities in this L2 segment',
    result: 'One weighted average base rate per L2 portfolio',
  },
  lob: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'facility_master', toLayer: 'L1', joinKey: 'lob_segment_id WHERE tree_level=L1', note: 'L1 LoB → Facilities' },
      { from: 'position', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Position → Facility' },
      { from: 'position', fromLayer: 'L2', to: 'position_detail', toLayer: 'L2', joinKey: 'position_id', note: 'Position → rate_index, total_commitment' },
      { from: 'facility_master', fromLayer: 'L1', to: 'facility_lender_allocation', toLayer: 'L1', joinKey: 'facility_id', note: 'Facility → bank_share_pct' },
    ],
    aggregation: 'Denominator widens: Σ(adjusted_commitment) across ALL positions for ALL facilities in this L1 segment',
    result: 'One weighted average base rate per Line of Business — enterprise rate environment indicator',
  },
};

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
              <span className="text-gray-600">{'\u2192'}</span>
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

/* ── Level detail panels ── */

function LevelDetail({ levelKey }: { levelKey: string }) {
  switch (levelKey) {
    case 'facility': return <FacilityDetail />;
    case 'counterparty': return <CounterpartyDetail />;
    case 'desk': return <DeskDetail />;
    case 'portfolio': return <PortfolioDetail />;
    case 'lob': return <LoBDetail />;
    default: return null;
  }
}

function FacilityDetail() {
  return (
    <div className="space-y-3">
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Formula</div>
        <div className="text-sm font-mono text-teal-400 text-center">
          WABR = {'Σ'}(rate_index {'×'} adjusted_weight)
        </div>
        <div className="text-xs font-mono text-gray-500 text-center mt-1">
          adjusted_weight = (total_commitment {'×'} bank_share_pct) / {'Σ'}(total_commitment {'×'} bank_share_pct)
        </div>
        <PlainEnglish>
          For one facility, look at every position (tranche/draw). Each position has a benchmark rate
          and a committed amount. Adjust the committed amount by how much of the syndication we own.
          Then weight each rate by that adjusted commitment share.
        </PlainEnglish>
      </div>
      <JoinChainVisual levelKey="facility" />
    </div>
  );
}

function CounterpartyDetail() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 leading-relaxed">
        The denominator widens to span <strong className="text-gray-300">all positions across all facilities</strong> for this counterparty.
        A counterparty with two facilities (a revolver at SOFR+100 and a term loan at Prime) produces a single
        blended rate reflecting their total exposure to our bank.
      </div>
      <JoinChainVisual levelKey="counterparty" />

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-amber-300 mb-1">Critical: Denominator Scope</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              The weight denominator must be <strong className="text-gray-300">all adjusted commitments across all facilities
              for the counterparty</strong>, not per-facility. If you scope per-facility, weights sum to 1.0 within
              each facility independently, and summing the resulting per-facility weighted rates produces a number
              that is not a valid weighted average (it can exceed any individual rate).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeskDetail() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 leading-relaxed">
        At the desk level, the L3 LoB segment determines which facilities are included.
        The <code className="text-blue-300">enterprise_business_taxonomy</code> lookup with <code className="text-emerald-300">tree_level=&quot;L3&quot;</code> scopes
        the universe of facilities, then all positions across those facilities contribute to a single weighted average.
      </div>
      <JoinChainVisual levelKey="desk" />

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-3">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-blue-300 mb-1">Rate Heterogeneity at Desk Level</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              A desk may have positions referencing different base rate indices (SOFR, Prime, EURIBOR).
              The weighted average blends these — which is intentional for a &quot;what is our effective benchmark exposure&quot;
              view, but should be noted as a blended figure. Consider showing the index breakdown alongside the WABR
              for desks with multiple rate indices.
            </p>
          </div>
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
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Same Formula, Wider Scope</div>
        <div className="text-sm font-mono text-teal-400 text-center">
          WABR = {'Σ'}(rate_index {'×'} adjusted_weight) across all positions in L2 segment
        </div>
        <PlainEnglish>
          The math does not change — only the universe of positions expands. At L2, you include
          all positions from all facilities mapped to any L3 segment that rolls up to this L2 node
          in the business taxonomy tree.
        </PlainEnglish>
      </div>
    </div>
  );
}

function LoBDetail() {
  return (
    <div className="space-y-3">
      <JoinChainVisual levelKey="lob" />
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Enterprise Rate Environment</div>
        <div className="text-sm font-mono text-teal-400 text-center">
          WABR = {'Σ'}(rate_index {'×'} adjusted_weight) across all positions in L1 segment
        </div>
        <PlainEnglish>
          At the Line of Business level, WABR shows the blended benchmark rate environment
          for the entire LoB. This is a monitoring metric — it tells you how interest rate
          movements are flowing through your book. A rising WABR across LoBs signals
          rate transmission is working; a flat WABR despite Fed hikes signals repricing lag.
        </PlainEnglish>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
        <div className="flex items-start gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-amber-300 mb-1">Rate Transmission Lag</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Fixed-rate facilities will not reprice until maturity or reset. The WABR at L1 may lag
              market rates significantly if the book has a high proportion of fixed-rate or long-dated
              positions. Track WABR alongside the benchmark curve to measure transmission velocity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RollupPyramid({ expandedLevel, onToggle }: { expandedLevel: string | null; onToggle: (key: string) => void }) {
  return (
    <div className="space-y-2">
      {ROLLUP_LEVELS.map((level, i) => {
        const expanded = expandedLevel === level.key;
        const Icon = level.icon;
        return (
          <button
            key={level.key}
            onClick={() => onToggle(level.key)}
            aria-expanded={expanded}
            className={`w-full rounded-xl border p-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
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
 * INTERACTIVE JOIN MAP
 * ──────────────────────────────────────────────────────────────────────────── */

interface JoinMapNode {
  id: string;
  label: string;
  layer: 'L1' | 'L2' | 'transform' | 'L3';
  fields: string[];
  col: number;
  row: number;
}

interface JoinMapEdge {
  from: string;
  to: string;
  joinKey: string;
  label?: string;
}

const JOIN_MAP_NODES: JoinMapNode[] = [
  { id: 'facility_master', label: 'facility_master', layer: 'L1', fields: ['facility_id (PK)', 'counterparty_id (FK)', 'lob_segment_id (FK)'], col: 0, row: 0 },
  { id: 'counterparty', label: 'counterparty', layer: 'L1', fields: ['counterparty_id (PK)', 'legal_name'], col: 0, row: 1 },
  { id: 'ebt', label: 'enterprise_business_taxonomy', layer: 'L1', fields: ['managed_segment_id (PK)', 'tree_level', 'parent_segment_id'], col: 0, row: 2 },
  { id: 'fla', label: 'facility_lender_allocation', layer: 'L1', fields: ['facility_id (FK)', 'bank_share_pct', 'allocation_role'], col: 0, row: 3 },
  { id: 'position', label: 'position', layer: 'L2', fields: ['position_id (PK)', 'facility_id (FK)', 'as_of_date'], col: 1, row: 0 },
  { id: 'position_detail', label: 'position_detail', layer: 'L2', fields: ['position_id (FK)', 'rate_index', 'total_commitment'], col: 1, row: 1 },
  { id: 'wabr_calc', label: 'WABR Formula', layer: 'transform', fields: ['adj_commit = commit × share', 'weight = adj / Σ(adj)', 'WABR = Σ(rate × weight)'], col: 2, row: 0 },
  { id: 'metric_value_fact', label: 'metric_value_fact', layer: 'L3', fields: ['metric_id=WABR', 'value', 'aggregation_level'], col: 3, row: 0 },
];

const JOIN_MAP_EDGES: JoinMapEdge[] = [
  { from: 'facility_master', to: 'position', joinKey: 'facility_id', label: 'Facility → Positions' },
  { from: 'position', to: 'position_detail', joinKey: 'position_id', label: 'Position → Detail' },
  { from: 'counterparty', to: 'facility_master', joinKey: 'counterparty_id', label: 'Borrower → Loans' },
  { from: 'ebt', to: 'facility_master', joinKey: 'lob_segment_id', label: 'LoB hierarchy' },
  { from: 'fla', to: 'facility_master', joinKey: 'facility_id', label: 'Bank share' },
  { from: 'position_detail', to: 'wabr_calc', joinKey: 'rate_index, total_commitment', label: 'Rate + Commitment' },
  { from: 'fla', to: 'wabr_calc', joinKey: 'bank_share_pct', label: 'Syndication share' },
  { from: 'wabr_calc', to: 'metric_value_fact', joinKey: 'WABR value', label: 'Store result' },
];

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  L1: { bg: 'bg-blue-950/60', border: 'border-blue-500/40', text: 'text-blue-300', badge: 'bg-blue-500/20 text-blue-300' },
  L2: { bg: 'bg-amber-950/60', border: 'border-amber-500/40', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-300' },
  transform: { bg: 'bg-purple-950/60', border: 'border-purple-500/40', text: 'text-purple-300', badge: 'bg-purple-500/20 text-purple-300' },
  L3: { bg: 'bg-emerald-950/60', border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
};

function InteractiveJoinMap() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodeById = React.useMemo(() => new Map(JOIN_MAP_NODES.map(n => [n.id, n])), []);

  const connectedNodes = React.useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const s = new Set([hoveredNode]);
    for (const e of JOIN_MAP_EDGES) {
      if (e.from === hoveredNode) s.add(e.to);
      if (e.to === hoveredNode) s.add(e.from);
    }
    return s;
  }, [hoveredNode]);

  const connectedEdges = React.useMemo(() => {
    if (!hoveredNode) return new Set<number>();
    const s = new Set<number>();
    JOIN_MAP_EDGES.forEach((e, i) => {
      if (e.from === hoveredNode || e.to === hoveredNode) s.add(i);
    });
    return s;
  }, [hoveredNode]);

  const NW = 180, NH = 76, CG = 80, RG = 16, P = 24;
  const COL_X = [P, P + NW + CG, P + 2 * (NW + CG), P + 3 * (NW + CG)];

  const getNodePos = (node: JoinMapNode) => {
    const x = COL_X[node.col];
    const y = P + node.row * (NH + RG);
    return { x, y };
  };

  const totalW = COL_X[3] + NW + P;
  const maxRow = Math.max(...JOIN_MAP_NODES.map(n => n.row));
  const totalH = P * 2 + (maxRow + 1) * NH + maxRow * RG;

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Network className="w-4 h-4 text-gray-400" aria-hidden="true" />
        <span className="text-xs font-bold text-white">Interactive Join Map</span>
        <span className="text-[9px] text-gray-600">Hover any table to trace connections</span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ width: totalW, minWidth: totalW }} className="relative">
          <div className="flex mb-2">
            {['L1 Reference', 'L2 Snapshot', 'Transform', 'L3 Output'].map((label, i) => (
              <div key={label} className="text-[9px] font-bold uppercase tracking-wider text-gray-600 text-center" style={{ position: 'absolute', left: COL_X[i], width: NW }}>
                {label}
              </div>
            ))}
          </div>

          <div style={{ width: totalW, height: totalH, position: 'relative', marginTop: 16 }}>
            <svg width={totalW} height={totalH} className="absolute inset-0 pointer-events-none">
              {JOIN_MAP_EDGES.map((edge, i) => {
                const fromNode = nodeById.get(edge.from)!;
                const toNode = nodeById.get(edge.to)!;
                if (!fromNode || !toNode) return null;
                const fp = getNodePos(fromNode);
                const tp = getNodePos(toNode);
                const fromRight = fromNode.col < toNode.col;
                const x1 = fromRight ? fp.x + NW : fp.x;
                const y1 = fp.y + NH / 2;
                const x2 = fromRight ? tp.x : tp.x + NW;
                const y2 = tp.y + NH / 2;
                const dx = Math.abs(x2 - x1) * 0.4;
                const isActive = connectedEdges.has(i);
                const isDim = hoveredNode && !isActive;
                const strokeColor = isActive ? '#14b8a6' : 'rgba(255,255,255,0.08)';
                return (
                  <g key={i}>
                    <path
                      d={`M${x1},${y1} C${x1 + (fromRight ? dx : -dx)},${y1} ${x2 + (fromRight ? -dx : dx)},${y2} ${x2},${y2}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isActive ? 2 : 1}
                      style={{ opacity: isDim ? 0.05 : 1, transition: 'all 0.2s' }}
                    />
                    {isActive && (
                      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" className="text-[8px] fill-gray-300 font-mono">
                        {edge.joinKey}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {JOIN_MAP_NODES.map(node => {
              const pos = getNodePos(node);
              const s = LAYER_COLORS[node.layer];
              const isDim = hoveredNode && !connectedNodes.has(node.id);
              const isActive = hoveredNode === node.id;
              return (
                <div
                  key={node.id}
                  className={`absolute rounded-lg border ${s.bg} ${s.border} transition-all duration-200 cursor-default ${
                    isDim ? 'opacity-15' : ''
                  } ${isActive ? 'scale-[1.04] z-10 shadow-lg ring-1 ring-white/20' : 'z-0'}`}
                  style={{ left: pos.x, top: pos.y, width: NW, height: NH }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <div className="px-2 py-1.5 h-full flex flex-col justify-center">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={`text-[7px] font-bold uppercase tracking-wider px-1 py-px rounded ${s.badge}`}>{node.layer === 'transform' ? 'Calc' : node.layer}</span>
                    </div>
                    <div className={`text-[10px] font-bold ${s.text} truncate`}>{node.label}</div>
                    <div className="text-[8px] text-gray-500 truncate mt-0.5">{node.fields.slice(0, 2).join(', ')}{node.fields.length > 2 ? '...' : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * QUERY PLAN
 * ──────────────────────────────────────────────────────────────────────────── */

interface QueryStep {
  step: number;
  action: string;
  pseudocode: string;
  sql: string;
  tables: string[];
  layer: string;
}

const WABR_QUERY_PLAN: QueryStep[] = [
  {
    step: 1,
    action: 'Scope positions for the aggregation level',
    pseudocode: 'Determine which positions are in scope based on aggregation level (facility, counterparty, L3/L2/L1)',
    sql: `-- Facility level example:
SELECT p.position_id, p.facility_id
FROM l2.position p
WHERE p.facility_id = :target_facility_id
  AND p.as_of_date = (SELECT MAX(as_of_date) FROM l2.position)`,
    tables: ['position'],
    layer: 'L2',
  },
  {
    step: 2,
    action: 'Pull rate_index and total_commitment',
    pseudocode: 'For each position in scope, get the benchmark rate and commitment from position_detail',
    sql: `SELECT pd.position_id, pd.rate_index, pd.total_commitment
FROM l2.position_detail pd
WHERE pd.position_id IN (... step 1 results ...)
  AND pd.as_of_date = (SELECT MAX(as_of_date) FROM l2.position_detail)`,
    tables: ['position_detail'],
    layer: 'L2',
  },
  {
    step: 3,
    action: 'Get bank share for syndication adjustment',
    pseudocode: 'For each facility, lookup our bank\'s share from the lender allocation table',
    sql: `SELECT fla.facility_id, fla.bank_share_pct
FROM l1.facility_lender_allocation fla
WHERE fla.facility_id IN (... distinct facility_ids from step 1 ...)
  AND fla.is_current_flag = 'Y'`,
    tables: ['facility_lender_allocation'],
    layer: 'L1',
  },
  {
    step: 4,
    action: 'Compute adjusted commitment and weights',
    pseudocode: 'Multiply total_commitment by bank_share_pct, then divide each by the total to get weights',
    sql: `WITH adjusted AS (
  SELECT pd.position_id, pd.rate_index,
         pd.total_commitment * fla.bank_share_pct AS adjusted_commitment
  FROM step_2 pd
  JOIN step_3 fla ON pd.facility_id = fla.facility_id
),
total AS (
  SELECT SUM(adjusted_commitment) AS total_adj FROM adjusted
)
SELECT a.position_id, a.rate_index, a.adjusted_commitment,
       a.adjusted_commitment / NULLIF(t.total_adj, 0) AS contract_weight
FROM adjusted a CROSS JOIN total t`,
    tables: [],
    layer: 'Transform',
  },
  {
    step: 5,
    action: 'Calculate weighted average base rate',
    pseudocode: 'Sum the product of rate_index and contract_weight across all positions',
    sql: `SELECT SUM(rate_index * contract_weight) AS weighted_avg_base_rate
FROM step_4_result`,
    tables: [],
    layer: 'Transform',
  },
  {
    step: 6,
    action: 'Store in L3 output',
    pseudocode: 'Write WABR value to metric_value_fact with metadata',
    sql: `INSERT INTO l3.metric_value_fact (metric_id, aggregation_level,
       entity_id, value, unit, as_of_date)
VALUES ('WABR', :level, :entity_id, :wabr_value, '%', CURRENT_DATE)`,
    tables: ['metric_value_fact'],
    layer: 'L3',
  },
];

function QueryPlanView() {
  const [showSql, setShowSql] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const layerColors: Record<string, { badge: string }> = {
    L1: { badge: 'bg-blue-500/20 text-blue-300' },
    L2: { badge: 'bg-amber-500/20 text-amber-300' },
    Transform: { badge: 'bg-purple-500/20 text-purple-300' },
    L3: { badge: 'bg-emerald-500/20 text-emerald-300' },
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white">Query Plan</span>
          <span className="text-[9px] text-gray-600">WABR — logical execution steps</span>
        </div>
        <button
          onClick={() => setShowSql(!showSql)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
            showSql
              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
              : 'bg-white/5 text-gray-500 border border-gray-700 hover:text-gray-300'
          }`}
        >
          {showSql ? 'Hide SQL' : 'Show SQL'}
        </button>
      </div>

      <div className="space-y-1.5">
        {WABR_QUERY_PLAN.map((step) => {
          const lc = layerColors[step.layer] || layerColors.Transform;
          const isExpanded = expandedStep === step.step;

          return (
            <div key={step.step}>
              <button
                onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                className="w-full text-left rounded-lg border border-gray-800 hover:border-gray-700 bg-white/[0.02] hover:bg-white/[0.03] p-2.5 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-bold text-gray-500 flex-shrink-0">{step.step}</span>
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${lc.badge}`}>{step.layer}</span>
                  <span className="text-xs text-gray-300 font-medium">{step.action}</span>
                  {step.tables.length > 0 && (
                    <div className="flex gap-1 ml-auto">
                      {step.tables.map(t => (
                        <code key={t} className="text-[8px] font-mono text-gray-600 px-1 py-0.5 rounded bg-white/[0.03]">{t}</code>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 ml-[30px]">{step.pseudocode}</div>
              </button>

              {(showSql || isExpanded) && (
                <div className="ml-[30px] mt-1 mb-2 rounded-lg bg-gray-950 border border-gray-800 p-3 overflow-x-auto">
                  <pre className="text-[10px] font-mono text-gray-400 leading-relaxed whitespace-pre-wrap"><code>{step.sql}</code></pre>
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
 * ANIMATED DATA FLOW
 * ──────────────────────────────────────────────────────────────────────────── */

interface FlowStep {
  layer: string;
  table: string;
  action: string;
  value: string;
  detail: string;
  color: string;
}

const WABR_FLOW_STEPS: FlowStep[] = [
  { layer: 'L1', table: 'facility_master', action: 'Identify facility', value: 'facility_id = F-5001', detail: 'Sunrise Towers Term Loan — CRE, $100M committed, Syndicated', color: 'blue' },
  { layer: 'L1', table: 'facility_lender_allocation', action: 'Get bank share', value: 'bank_share_pct = 50%', detail: 'Our bank is LEAD arranger with 50% share ($50M of $100M)', color: 'blue' },
  { layer: 'L2', table: 'position', action: 'Find positions', value: '3 positions: P-1001, P-1002, P-1003', detail: 'Three tranches under this facility, each with its own rate index', color: 'amber' },
  { layer: 'L2', table: 'position_detail', action: 'Pull rates & commitments', value: 'SOFR 5.25% ($60M), SOFR 5.50% ($30M), Prime 4.75% ($10M)', detail: 'rate_index and total_commitment for each position', color: 'amber' },
  { layer: 'Calc', table: 'Adjust for bank share', action: 'Compute adjusted commitments', value: '$30M, $15M, $5M (×50% bank share)', detail: 'total_commitment × bank_share_pct per position', color: 'purple' },
  { layer: 'Calc', table: 'Compute weights', action: 'Calculate contract weights', value: '60%, 30%, 10% of $50M total', detail: 'Each adjusted_commitment / Σ(adjusted_commitment)', color: 'purple' },
  { layer: 'Calc', table: 'Weighted average', action: 'Sum weighted rates', value: '5.25%×60% + 5.50%×30% + 4.75%×10% = 5.275%', detail: 'Σ(rate_index × contract_weight)', color: 'purple' },
  { layer: 'L3', table: 'metric_value_fact', action: 'Store result', value: 'WABR = 5.275% (facility level)', detail: 'metric_id=WABR, aggregation_level=FACILITY, entity_id=F-5001', color: 'emerald' },
  { layer: 'Dashboard', table: 'Rate Environment', action: 'Display on dashboard', value: 'Facility WABR: 5.275%', detail: 'Shown alongside spread_bps and all-in rate for full pricing picture', color: 'pink' },
];

function AnimatedDataFlow() {
  const [activeStep, setActiveStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = () => { setIsPlaying(true); setActiveStep(0); };
  const stop = () => { setIsPlaying(false); if (timerRef.current) clearTimeout(timerRef.current); };
  const reset = () => { stop(); setActiveStep(-1); };

  React.useEffect(() => {
    if (isPlaying && activeStep >= 0 && activeStep < WABR_FLOW_STEPS.length - 1) {
      timerRef.current = setTimeout(() => setActiveStep(s => s + 1), 2200);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    } else if (activeStep >= WABR_FLOW_STEPS.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, activeStep]);

  const flowColors: Record<string, { dot: string; border: string; bg: string; text: string }> = {
    blue: { dot: 'bg-blue-500', border: 'border-blue-500/40', bg: 'bg-blue-500/10', text: 'text-blue-300' },
    amber: { dot: 'bg-amber-500', border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-300' },
    purple: { dot: 'bg-purple-500', border: 'border-purple-500/40', bg: 'bg-purple-500/10', text: 'text-purple-300' },
    emerald: { dot: 'bg-emerald-500', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-300' },
    pink: { dot: 'bg-pink-500', border: 'border-pink-500/40', bg: 'bg-pink-500/10', text: 'text-pink-300' },
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <span className="text-xs font-bold text-white">Watch a Number Travel</span>
          <span className="text-[9px] text-gray-600">Syndicated facility — end-to-end WABR calculation</span>
        </div>
        <div className="flex items-center gap-2">
          {activeStep === -1 ? (
            <button onClick={play} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30 hover:bg-teal-500/25 transition-colors">
              <Play className="w-3 h-3" /> Play
            </button>
          ) : (
            <>
              {isPlaying ? (
                <button onClick={stop} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">Pause</button>
              ) : (
                <button onClick={play} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30">Resume</button>
              )}
              <button onClick={reset} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-gray-500 border border-gray-700">Reset</button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {WABR_FLOW_STEPS.map((step, i) => {
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
 * DENOMINATOR SCOPE COMPARISON — "The Key Insight"
 * ──────────────────────────────────────────────────────────────────────────── */

function DenominatorScopeComparison() {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-red-400" aria-hidden="true" />
        <span className="text-xs font-bold text-red-300">Critical: Denominator Scope at Each Level</span>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed mb-3">
        The weighted average formula is the same at every level. What changes is the <strong className="text-gray-300">scope
        of positions included in the denominator</strong>. Getting this wrong is the most common implementation error.
      </p>

      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <div className="grid grid-cols-3 text-[9px] font-bold uppercase tracking-wider text-gray-600 bg-white/[0.03] px-3 py-2">
          <div>Level</div>
          <div>Denominator Scope</div>
          <div>Weights Sum To</div>
        </div>
        {[
          { level: 'Facility', scope: 'All positions in that facility', sum: '1.0 within facility', correct: true },
          { level: 'Counterparty', scope: 'All positions across ALL facilities for that counterparty', sum: '1.0 across counterparty', correct: true },
          { level: 'L3 Desk', scope: 'All positions across ALL facilities in that L3 segment', sum: '1.0 across L3 segment', correct: true },
          { level: 'L2 Portfolio', scope: 'All positions across ALL facilities in that L2 segment', sum: '1.0 across L2 segment', correct: true },
          { level: 'L1 LoB', scope: 'All positions across ALL facilities in that L1 segment', sum: '1.0 across L1 segment', correct: true },
        ].map((row) => (
          <div key={row.level} className="grid grid-cols-3 text-[10px] px-3 py-2 border-t border-gray-800/30">
            <span className="text-gray-300 font-medium">{row.level}</span>
            <span className="text-teal-300">{row.scope}</span>
            <span className="text-emerald-400 font-mono">{row.sum}</span>
          </div>
        ))}
      </div>

      {/* Bad example */}
      <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/[0.06] p-3">
        <div className="text-[10px] font-bold text-red-300 mb-1">Wrong: Per-Facility Denominator at Higher Levels</div>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          If you scope the denominator per-facility when computing counterparty WABR, each facility&apos;s positions
          get weights summing to 1.0 independently. The sum of per-facility weighted averages can <strong className="text-red-300">exceed
          the maximum individual rate</strong>, which is mathematically impossible for a true weighted average.
          See the numeric example in the Counterparty rollup detail above.
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * GSIB SYNDICATION CALLOUT
 * ──────────────────────────────────────────────────────────────────────────── */

function SyndicationCallout() {
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.03] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="w-4 h-4 text-blue-400" aria-hidden="true" />
        <span className="text-xs font-bold text-blue-300">GSIB Syndication: Why bank_share_pct Matters</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Without adjustment */}
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3">
          <div className="text-[10px] font-bold text-red-300 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Without bank_share_pct
          </div>
          <div className="text-[10px] text-gray-400 space-y-1">
            <div>Facility A: $1B syndicated, SOFR 5.25%, we hold 5%</div>
            <div>Facility B: $10M bilateral, SOFR 4.50%, we hold 100%</div>
            <div className="pt-1 border-t border-white/5 font-mono">
              Weight A = 1000/1010 = <span className="text-red-400">99%</span>
            </div>
            <div className="font-mono">
              WABR = <span className="text-red-400">5.24%</span> {'\u2190'} dominated by a deal where we hold only 5%
            </div>
          </div>
        </div>

        {/* With adjustment */}
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
          <div className="text-[10px] font-bold text-emerald-300 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> With bank_share_pct
          </div>
          <div className="text-[10px] text-gray-400 space-y-1">
            <div>Facility A: $1B {'×'} 5% = <strong className="text-emerald-300">$50M</strong> adjusted</div>
            <div>Facility B: $10M {'×'} 100% = <strong className="text-emerald-300">$10M</strong> adjusted</div>
            <div className="pt-1 border-t border-white/5 font-mono">
              Weight A = 50/60 = <span className="text-emerald-400">83%</span>
            </div>
            <div className="font-mono">
              WABR = <span className="text-emerald-400">5.12%</span> {'\u2190'} reflects our actual economic exposure
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FOOTER LEGEND
 * ──────────────────────────────────────────────────────────────────────────── */

function FooterLegend() {
  return (
    <div className="mt-8 rounded-xl border border-gray-800 bg-white/[0.02] p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">Legend</div>
      <div className="flex flex-wrap gap-4 text-[10px]">
        {[
          { color: 'bg-blue-500', label: 'L1 Reference Data' },
          { color: 'bg-amber-500', label: 'L2 Snapshot Data' },
          { color: 'bg-purple-500', label: 'Transform / Calculation' },
          { color: 'bg-emerald-500', label: 'L3 Output / Storage' },
          { color: 'bg-teal-500', label: 'WABR Metric Accent' },
          { color: 'bg-pink-500', label: 'Dashboard Layer' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
            <span className="text-gray-400">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SIDEBAR NAV ITEMS
 * ──────────────────────────────────────────────────────────────────────────── */

const NAV_SECTIONS = [
  { id: 'definition', label: 'Definition', icon: Calculator, color: 'text-teal-400', step: '1' },
  { id: 'join-map', label: 'Join Map', icon: Network, color: 'text-cyan-400', step: null },
  { id: 'l1-reference', label: 'L1 Reference', icon: Database, color: 'text-blue-400', step: '2' },
  { id: 'l2-snapshot', label: 'L2 Snapshot', icon: Layers, color: 'text-amber-400', step: '3' },
  { id: 'syndication', label: 'Syndication', icon: Building2, color: 'text-blue-400', step: null },
  { id: 'query-plan', label: 'Query Plan', icon: Search, color: 'text-purple-400', step: null },
  { id: 'calculation', label: 'Calculation', icon: Zap, color: 'text-teal-400', step: '4' },
  { id: 'denominator', label: 'Denominator', icon: Scale, color: 'text-red-400', step: null },
  { id: 'data-flow', label: 'Data Flow', icon: Sparkles, color: 'text-amber-400', step: null },
  { id: 'rollup', label: 'Rollup', icon: GitBranch, color: 'text-emerald-400', step: '5' },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-pink-400', step: '6' },
] as const;

/* ────────────────────────────────────────────────────────────────────────────
 * SCROLL SPY HOOK
 * ──────────────────────────────────────────────────────────────────────────── */

function useActiveSection(): string {
  const [active, setActive] = useState<string>(NAV_SECTIONS[0].id);

  React.useEffect(() => {
    let rafId = 0;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        let current: string = NAV_SECTIONS[0].id;
        for (const s of NAV_SECTIONS) {
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
 * SIDEBAR NAV COMPONENT
 * ──────────────────────────────────────────────────────────────────────────── */

function SidebarNav({ activeSection }: { activeSection: string }) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) {
      const headerOffset = 80;
      const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <nav className="sticky top-[73px] h-[calc(100vh-73px)] w-48 flex-shrink-0 overflow-y-auto border-r border-gray-800/60 bg-[#0a0a0a]/80 backdrop-blur-sm py-4 px-2 hidden lg:block">
      <div className="space-y-0.5">
        {NAV_SECTIONS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                isActive
                  ? 'bg-white/[0.06] border border-gray-700/60'
                  : 'border border-transparent hover:bg-white/[0.03]'
              }`}
            >
              {/* Active indicator bar */}
              <div className={`w-0.5 h-5 rounded-full flex-shrink-0 transition-colors duration-150 ${isActive ? 'bg-teal-500' : 'bg-transparent group-hover:bg-gray-700'}`} />
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${isActive ? item.color : 'text-gray-600 group-hover:text-gray-500'}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <span className={`text-[11px] font-medium block truncate transition-colors ${isActive ? 'text-gray-200' : 'text-gray-500 group-hover:text-gray-400'}`}>
                  {item.label}
                </span>
              </div>
              {item.step && (
                <span className={`text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${
                  isActive ? 'bg-teal-500/20 text-teal-400' : 'bg-white/[0.03] text-gray-600'
                }`}>
                  {item.step}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Progress indicator */}
      <div className="mt-4 pt-3 border-t border-gray-800/60 px-2">
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-2">Progress</div>
        <div className="w-full h-1 rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full bg-teal-500/60 rounded-full transition-all duration-300"
            style={{ width: `${((NAV_SECTIONS.findIndex(s => s.id === activeSection) + 1) / NAV_SECTIONS.length) * 100}%` }}
          />
        </div>
        <div className="text-[9px] text-gray-600 mt-1 tabular-nums">
          {NAV_SECTIONS.findIndex(s => s.id === activeSection) + 1} / {NAV_SECTIONS.length}
        </div>
      </div>
    </nav>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT
 * ──────────────────────────────────────────────────────────────────────────── */

export default function WABRLineageView() {
  const [expandedLevel, setExpandedLevel] = useState<string | null>('facility');
  const headingPrefix = useId();
  const activeSection = useActiveSection();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800 shadow-lg">
        <div className="max-w-[1400px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Link
                href="/metrics/library"
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal-400 transition-colors mb-0.5 no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Data Catalogue
              </Link>
              <h1 className="text-lg font-bold text-white">Weighted Average Base Rate — End-to-End Lineage</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-gray-400">base_rate_pct</span>
              </div>
              <TierBadge tier="T3" />
            </div>
          </div>
        </div>
      </header>

      {/* ── LAYOUT: SIDEBAR + CONTENT ── */}
      <div className="flex max-w-[1400px] mx-auto">
        {/* Sidebar */}
        <SidebarNav activeSection={activeSection} />

        {/* Main content */}
        <main className="flex-1 min-w-0 px-6 lg:px-8 py-8 space-y-2">

          {/* ── STEP 1: METRIC DEFINITION ── */}
          <section id="section-definition" aria-labelledby={`${headingPrefix}-step1`}>
            <SectionHeading
              id={`${headingPrefix}-step1`}
              icon={Calculator}
              step="Step 1 — Metric Definition"
              layerColor="bg-teal-600"
              title="Weighted Average Base Rate (%)"
              subtitle="Commitment-weighted benchmark rate across positions — adjusted for bank syndication share"
            />
            <MetricDefinitionCard />
            <InsightCallout>
              <strong>Three components drive this metric:</strong> (1) <code className="text-teal-300">rate_index</code> from position_detail — the benchmark
              rate per position, (2) <code className="text-emerald-300">total_commitment</code> — the weight base, and (3) <code className="text-blue-300">bank_share_pct</code> from
              facility_lender_allocation — the GSIB syndication adjustment. The formula is simple; the join path and denominator scoping are where
              implementation errors occur.
            </InsightCallout>
          </section>

          <FlowArrow label="Metric definition determines source tables" />

          {/* ── JOIN MAP ── */}
          <section id="section-join-map" aria-labelledby={`${headingPrefix}-join-map`}>
            <SectionHeading
              id={`${headingPrefix}-join-map`}
              icon={Network}
              step="Data Plumbing"
              layerColor="bg-cyan-600"
              title="Table-to-Table Join Map"
              subtitle="Every FK relationship used to compute and roll up WABR — hover any table to trace connections"
            />
            <InteractiveJoinMap />
            <InsightCallout>
              <strong>4 layers, 8 tables, 8 join relationships.</strong> The critical path is
              <code className="text-amber-300"> position</code> {'\u2192'} <code className="text-amber-300">position_detail</code> for
              rate + commitment, with <code className="text-blue-300">facility_lender_allocation</code> injecting the bank share adjustment.
              The <code className="text-blue-300">facility_master</code> table is the central hub connecting L1 dimensions to L2 snapshots.
            </InsightCallout>
          </section>

          <FlowArrow label="L1 dimensions anchor L2 snapshots" />

          {/* ── STEP 2: L1 REFERENCE ── */}
          <section id="section-l1-reference" aria-labelledby={`${headingPrefix}-step2`}>
            <SectionHeading
              id={`${headingPrefix}-step2`}
              icon={Database}
              step="Step 2 — L1 Reference Data"
              layerColor="bg-blue-600"
              title="Dimensional Anchors"
              subtitle="Reference tables that identify facility identity, bank ownership share, and LoB hierarchy"
            />
            <L1Tables />
            <InsightCallout>
              <strong>facility_lender_allocation is the GSIB differentiator.</strong> Without it, you weight by total deal size
              regardless of your participation. For a GSIB with thousands of syndicated facilities, this distortion is massive.
              This table was added specifically to support issuer-side bank share tracking.
            </InsightCallout>
          </section>

          <FlowArrow label="Dimension keys join to snapshot data" />

          {/* ── STEP 3: L2 SNAPSHOT ── */}
          <section id="section-l2-snapshot" aria-labelledby={`${headingPrefix}-step3`}>
            <SectionHeading
              id={`${headingPrefix}-step3`}
              icon={Layers}
              step="Step 3 — L2 Snapshot Data"
              layerColor="bg-amber-600"
              title="Source Data Tables"
              subtitle="Two L2 tables provide rate and commitment — click any row for X-Ray column detail"
            />
            <L2FieldTable />
            <InsightCallout>
              <strong>rate_index vs interest_rate — the critical distinction.</strong> <code className="text-teal-300">rate_index</code> is the
              benchmark component (SOFR, Prime). <code className="text-red-400 line-through">interest_rate</code> is the all-in contractual rate
              (benchmark + spread). This metric requires the benchmark only. Using the wrong column is the most common implementation mistake.
            </InsightCallout>
          </section>

          <FlowArrow label="Fields feed into calculation engine" />

          {/* ── GSIB SYNDICATION ── */}
          <section id="section-syndication" aria-labelledby={`${headingPrefix}-syndication`}>
            <SectionHeading
              id={`${headingPrefix}-syndication`}
              icon={Building2}
              step="GSIB Context"
              layerColor="bg-blue-600"
              title="Syndication Share Adjustment"
              subtitle="Why raw total_commitment is wrong for a GSIB — the bank_share_pct correction"
            />
            <SyndicationCallout />
          </section>

          <FlowArrow label="Adjusted commitments feed into weighting" />

          {/* ── QUERY PLAN ── */}
          <section id="section-query-plan" aria-labelledby={`${headingPrefix}-query-plan`}>
            <SectionHeading
              id={`${headingPrefix}-query-plan`}
              icon={Search}
              step="Under the Hood"
              layerColor="bg-purple-600"
              title="How the Engine Thinks"
              subtitle="Logical query steps — click any step or toggle 'Show SQL' for the technical view"
            />
            <QueryPlanView />
          </section>

          <FlowArrow label="Query results feed into WABR formula" />

          {/* ── STEP 4: CALCULATION ── */}
          <section id="section-calculation" aria-labelledby={`${headingPrefix}-step4`}>
            <SectionHeading
              id={`${headingPrefix}-step4`}
              icon={Zap}
              step="Step 4 — Calculation Engine"
              layerColor="bg-teal-600"
              title="WABR Calculation"
              subtitle="Worked examples at Facility and Counterparty level — T3 authority (always calculated)"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PositionTable positions={FACILITY_POSITIONS} title="Facility Level — F-5001 (3 positions)" result={FACILITY_WABR} />
              <PositionTable positions={COUNTERPARTY_POSITIONS.filter(p => p.contractWeight > 0)} title="Counterparty Level — 2 facilities, cross-facility weights" result={COUNTERPARTY_WABR} />
            </div>
            <InsightCallout>
              <strong>T3 — Always Calculated.</strong> WABR is never sourced from the bank. The platform computes it from raw position data
              at every level. Notice how the counterparty-level denominator spans both facilities — positions from F-5001 and F-5002
              contribute to a single set of weights that sums to 1.0 across the counterparty.
            </InsightCallout>
          </section>

          <FlowArrow label="Results stored in L3 tables, then rolled up" />

          {/* ── DENOMINATOR SCOPE ── */}
          <section id="section-denominator" aria-labelledby={`${headingPrefix}-denominator`}>
            <SectionHeading
              id={`${headingPrefix}-denominator`}
              icon={Scale}
              step="Critical Rule"
              layerColor="bg-red-600"
              title="Denominator Scope at Each Level"
              subtitle="The single most common implementation error — getting the weight denominator wrong"
            />
            <DenominatorScopeComparison />
          </section>

          <FlowArrow label="Individual results aggregate up the hierarchy" />

          {/* ── ANIMATED DATA FLOW ── */}
          <section id="section-data-flow" aria-labelledby={`${headingPrefix}-data-flow`}>
            <SectionHeading
              id={`${headingPrefix}-data-flow`}
              icon={Sparkles}
              step="End-to-End Trace"
              layerColor="bg-amber-600"
              title="Watch a Number Travel"
              subtitle="Follow a syndicated facility's data through the entire WABR pipeline"
            />
            <AnimatedDataFlow />
          </section>

          <FlowArrow label="Results aggregate up the hierarchy" />

          {/* ── STEP 5: ROLLUP HIERARCHY ── */}
          <section id="section-rollup" aria-labelledby={`${headingPrefix}-step5`}>
            <SectionHeading
              id={`${headingPrefix}-step5`}
              icon={GitBranch}
              step="Step 5 — Rollup Hierarchy"
              layerColor="bg-emerald-600"
              title="Aggregation at Each Level"
              subtitle="Same formula, widening scope — click each level to see join path and aggregation method"
            />
            <div className="mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <Link2 className="w-3 h-3" aria-hidden="true" />
                Rollup Hierarchy — Facility {'\u2192'} Counterparty {'\u2192'} Desk {'\u2192'} Portfolio {'\u2192'} LoB — click to expand
              </div>
            </div>
            <RollupPyramid expandedLevel={expandedLevel} onToggle={(k) => setExpandedLevel(expandedLevel === k ? null : k)} />
            <InsightCallout>
              <strong>The formula never changes — only the scope widens.</strong> At every level above facility, the denominator
              expands to include all positions in the broader aggregation scope. The join path changes (adding LoB hierarchy lookups),
              but the math remains: <code className="text-teal-300">{'Σ'}(rate_index {'×'} adjusted_weight)</code>.
              The key insight: WABR is <strong>recomputed from raw position data</strong> at each level, not rolled up from the level below.
            </InsightCallout>
          </section>

          <FlowArrow label="Dashboard builder selects dimension" />

          {/* ── STEP 6: DASHBOARD ── */}
          <section id="section-dashboard" aria-labelledby={`${headingPrefix}-step6`}>
            <SectionHeading
              id={`${headingPrefix}-step6`}
              icon={LayoutDashboard}
              step="Step 6 — Dashboard Consumption"
              layerColor="bg-pink-600"
              title="Dashboard Display"
              subtitle="WABR appears at every level — displayed alongside spread and all-in rate for full pricing context"
            />
            <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { level: 'Facility', value: '5.275%', context: 'F-5001 Sunrise Term Loan', spread: '+175bps', allIn: '7.025%' },
                  { level: 'Counterparty', value: '5.042%', context: 'Sunrise Properties LLC (2 facilities)', spread: '+162bps avg', allIn: '6.662%' },
                  { level: 'L3 Desk', value: '5.18%', context: 'CRE Origination Desk (142 facilities)', spread: '+168bps avg', allIn: '6.86%' },
                ].map((card) => (
                  <div key={card.level} className="rounded-lg border border-gray-800 bg-black/30 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">{card.level}</div>
                    <div className="text-2xl font-black text-teal-400 tabular-nums mb-1">{card.value}</div>
                    <div className="text-[10px] text-gray-500 mb-2">{card.context}</div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-white/5">
                      <div>
                        <span className="text-gray-600">Spread</span>
                        <div className="text-amber-300 font-mono">{card.spread}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">All-In Rate</span>
                        <div className="text-emerald-300 font-mono">{card.allIn}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <PlainEnglish>
                WABR is most useful when shown alongside the spread (margin above the base rate) and the all-in rate
                (base rate + spread). Together, these three numbers tell the full pricing story: is revenue being driven
                by market rates moving, or by the bank pricing wider spreads?
              </PlainEnglish>
            </div>
          </section>

          {/* ── LEGEND ── */}
          <FooterLegend />
        </main>
      </div>
    </div>
  );
}
