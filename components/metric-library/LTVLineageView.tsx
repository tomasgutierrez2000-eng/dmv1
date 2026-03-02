'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Database,
  Calculator,
  LayoutDashboard,
  Briefcase,
  ArrowDown,
  ShieldCheck,
  Eye,
  ChevronDown,
  ChevronUp,
  Table2,
  Users,
  FolderTree,
  PieChart,
  Info,
  Layers,
  Link2,
  Scale,
  Building2,
  Play,
  Shield,
  TrendingDown,
} from 'lucide-react';
import {
  LTV_FACILITIES,
  LTV_COUNTERPARTIES,
  FACILITY_A_COLLATERAL,
  DESK_SEGMENTS,
  PORTFOLIO_BUCKETS,
  LOB_ENTRIES,
  fmt,
  fmtM,
  fmtPct,
  ltvBandColor,
  ltvBandLabel,
  exposureWeightedLTV,
  type CollateralItem,
} from './ltv-demo/ltvDemoRollupData';

/* ────────────────────────────────────────────────────────────────────────────
 * TYPES & DATA
 * ──────────────────────────────────────────────────────────────────────────── */

/** L2 fields in facility_exposure_snapshot */
const L2_FIELDS_FES = [
  { field: 'gross_exposure_usd', desc: 'Total facility exposure (LTV numerator)', used: true },
  { field: 'drawn_amount', desc: 'Currently drawn portion of commitment', used: true },
  { field: 'undrawn_amount', desc: 'Committed but undrawn (off-balance sheet)', used: false },
  { field: 'ead_amount', desc: 'Exposure at Default (regulatory EAD)', used: false },
  { field: 'currency_code', desc: 'Reporting currency (ISO)', used: false },
  { field: 'as_of_date', desc: 'Snapshot date', used: true },
];

/** L2 fields in collateral_snapshot */
const L2_FIELDS_CS = [
  { field: 'current_valuation_usd', desc: 'Current mark-to-market or appraisal value', used: true },
  { field: 'original_valuation_usd', desc: 'Original appraisal value at loan origination', used: false },
  { field: 'haircut_pct', desc: 'Regulatory haircut percentage applied to collateral', used: true },
  { field: 'eligible_value_usd', desc: 'Value after haircut — recognized for CRM', used: true },
  { field: 'allocated_amount_usd', desc: 'Portion allocated to this specific facility', used: true },
  { field: 'mitigant_group_code', desc: 'M1 = Eligible for CRM, M2 = Ineligible', used: true },
  { field: 'mitigant_subtype', desc: 'Collateral type: Cash, Real Estate, Securities, Receivables', used: true },
  { field: 'as_of_date', desc: 'Snapshot date', used: true },
];

/** L1 reference tables */
const L1_TABLES = [
  {
    table: 'facility_master',
    layer: 'L1',
    desc: 'Master record for every loan facility — type, committed amount, maturity, product classification',
    fields: ['facility_id', 'facility_type_code', 'committed_amount', 'maturity_date', 'origination_date', 'counterparty_id', 'lob_node_id'],
    ltvRole: 'Links exposure to borrower and business hierarchy via foreign keys',
  },
  {
    table: 'counterparty',
    layer: 'L1',
    desc: 'Borrower identity — legal entity, credit rating, industry, domicile',
    fields: ['counterparty_id', 'legal_name', 'pd_annual', 'internal_risk_rating', 'industry_code', 'country_code'],
    ltvRole: 'Identifies who the borrower is; enables counterparty-level rollup',
  },
  {
    table: 'collateral_asset_master',
    layer: 'L1',
    desc: 'Collateral identity — asset type, property location, appraisal method, last appraisal date',
    fields: ['collateral_id', 'asset_type_code', 'property_address', 'appraisal_method', 'last_appraisal_date'],
    ltvRole: 'Defines WHAT the collateral is — unique to LTV; not needed by DSCR',
  },
  {
    table: 'enterprise_business_taxonomy',
    layer: 'L1',
    desc: 'Organizational hierarchy — Line of Business → Portfolio → Desk mapping',
    fields: ['lob_node_id', 'lob_name', 'portfolio_name', 'desk_name', 'hierarchy_level'],
    ltvRole: 'Provides the rollup path: Desk → Portfolio → LoB',
  },
];

/** L3 output tables */
const L3_OUTPUT_TABLES = [
  {
    table: 'metric_value_fact',
    desc: 'Generic metric storage — LTV values at every aggregation level',
    fields: ['metric_id = LTV', 'variant_id', 'aggregation_level', 'facility_id | counterparty_id | lob_id', 'value', 'unit = %', 'display_format = 0.0%'],
    primary: true,
  },
  {
    table: 'lob_risk_ratio_summary',
    desc: 'LoB-level risk ratios — LTV alongside DSCR, FCCR, capital adequacy',
    fields: ['lob_node_id', 'ltv_pct', 'dscr_value', 'fccr_value', 'capital_adequacy_ratio_pct'],
    primary: false,
  },
  {
    table: 'risk_appetite_metric_state',
    desc: 'Executive dashboard — LTV vs. risk appetite limits with RAG status & velocity',
    fields: ['metric_id = LTV', 'current_value', 'limit_value', 'inner_threshold_value', 'status_code', 'velocity_30d_pct'],
    primary: false,
  },
  {
    table: 'facility_detail_snapshot',
    desc: 'Facility-level analytics — ltv_pct for drawer pop-ups and drill-down',
    fields: ['facility_id', 'ltv_pct', 'committed_amt', 'collateral_value', 'counterparty_id'],
    primary: false,
  },
];

/** Rollup levels */
const ROLLUP_LEVELS = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Table2,
    desc: 'Direct Calculation — exposure / SUM(collateral) for one loan',
    method: 'Direct Calculation',
    purpose: 'Underwriting, collateral monitoring',
    tier: 'T2',
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    desc: 'Exposure-Weighted Average across all facilities for this borrower',
    method: 'Exposure-Weighted Average',
    purpose: 'Obligor-level collateral assessment',
    tier: 'T3',
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    desc: 'EWA + Collateral Type Segmentation — split by RE, Cash, Securities',
    method: 'EWA + Collateral Segmentation',
    purpose: 'Book quality & collateral mix',
    tier: 'T3',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    desc: 'Exposure-Weighted Average + Distribution buckets (< 60%, 60–80%, 80–100%, > 100%)',
    method: 'EWA + Distribution',
    purpose: 'Portfolio risk trending',
    tier: 'T3',
  },
  {
    key: 'lob',
    label: 'Line of Business',
    icon: PieChart,
    desc: 'Exposure-Weighted Average — collateral coverage trend indicator',
    method: 'Exposure-Weighted Average',
    purpose: 'Systemic collateral monitoring',
    tier: 'T3',
  },
] as const;

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
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${colors[tier] || ''} ${className}`} title={labels[tier]}>
      <ShieldCheck className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
      {labels[tier] || tier}
    </span>
  );
}

function SectionHeading({ id, icon: Icon, step, layerColor, title, subtitle }: {
  id: string; icon: React.ElementType; step: string; layerColor: string; title: string; subtitle: string;
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
        <span className="text-[9px] font-medium text-gray-500 bg-gray-900/80 px-2 py-0.5 rounded-full border border-gray-800">{label}</span>
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
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] px-3 py-2 text-xs text-gray-400 leading-relaxed mt-2">
      <span className="text-blue-400 font-bold text-[10px]">Plain English:</span>{' '}
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * COLLATERAL DETAIL CARD
 * ──────────────────────────────────────────────────────────────────────────── */

const COLL_ICONS: Record<string, string> = { 'Real Estate': '🏢', Cash: '💵', Receivables: '📄' };

function CollateralCard({ item }: { item: CollateralItem }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{COLL_ICONS[item.type] || '📦'}</span>
        <div>
          <div className="text-xs font-bold text-gray-200">{item.name}</div>
          <div className="text-[9px] text-gray-600">{item.type} · {item.mitigantGroup === 'M1' ? 'Eligible (M1)' : 'Ineligible (M2)'}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <div className="text-gray-600">Current Value</div>
          <div className="text-amber-400 font-mono font-bold">{fmt(item.currentValue)}</div>
        </div>
        <div>
          <div className="text-gray-600">Haircut</div>
          <div className="text-red-400 font-mono font-bold">{item.haircutPct}%</div>
        </div>
        <div>
          <div className="text-gray-600">Eligible Value</div>
          <div className="text-emerald-400 font-mono font-bold">{fmt(item.eligibleValue)}</div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT
 * ──────────────────────────────────────────────────────────────────────────── */

interface LTVLineageViewProps {
  onStartDemo?: () => void;
  demoExpandedLevel?: string | null;
}

export default function LTVLineageView({ onStartDemo, demoExpandedLevel }: LTVLineageViewProps) {
  /* ── state ──────────────────────────────────────────────────────────────── */
  const [expandedLevelInternal, setExpandedLevelInternal] = useState<string | null>(null);

  // Demo can override expanded level
  const expandedLevel = demoExpandedLevel !== undefined ? demoExpandedLevel : expandedLevelInternal;

  const toggleLevel = useCallback((key: string) => {
    if (demoExpandedLevel !== undefined) return; // demo is controlling
    setExpandedLevelInternal((prev) => (prev === key ? null : key));
  }, [demoExpandedLevel]);

  /* ── active section tracking for breadcrumb ────────────────────────────── */
  const [activeSection, setActiveSection] = useState('step1');
  useEffect(() => {
    const anchors = ['step1', 'join-map', 'step2', 'step3', 'query-plan', 'step4', 'data-flow', 'step5', 'step6'];
    const handleScroll = () => {
      for (let i = anchors.length - 1; i >= 0; i--) {
        const el = document.getElementById(anchors[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 160) {
            setActiveSection(anchors[i]);
            return;
          }
        }
      }
      setActiveSection(anchors[0]);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ── render ─────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200">
      {/* ── Header ── */}
      <header data-demo="header" className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/metrics/library" className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors flex-shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Metric Lineage</div>
              <h1 className="text-lg font-bold text-white truncate">LTV End-to-End Lineage</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* LTV color legend */}
            <div className="hidden sm:flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-gray-500">Exposure</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-gray-500">Collateral</span>
              </span>
            </div>
            {onStartDemo && (
              <button onClick={onStartDemo} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-pwc-orange hover:bg-pwc-orange-light text-white transition-colors">
                <Play className="w-3.5 h-3.5" /> Guided Demo
              </button>
            )}
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="max-w-5xl mx-auto px-6 pb-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'step1', label: 'Definition', color: 'purple' },
            { id: 'join-map', label: 'Join Map', color: 'cyan' },
            { id: 'step2', label: 'L1 Reference', color: 'blue' },
            { id: 'step3', label: 'L2 Snapshot', color: 'amber' },
            { id: 'query-plan', label: 'Query Plan', color: 'purple' },
            { id: 'step4', label: 'Calculation', color: 'emerald' },
            { id: 'data-flow', label: 'Data Flow', color: 'amber' },
            { id: 'step5', label: 'Rollup & L3', color: 'emerald' },
            { id: 'step6', label: 'Dashboard', color: 'pink' },
          ].map((crumb) => {
            const isActive = activeSection === crumb.id;
            return (
              <button
                key={crumb.id}
                onClick={() => document.getElementById(crumb.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                  isActive
                    ? `text-${crumb.color}-400 bg-${crumb.color}-500/10`
                    : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? `bg-${crumb.color}-400` : 'bg-gray-700'}`} />
                {crumb.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-0">

        {/* ════════════════════════════════════════════════════════════════════
         * STEP 1 — METRIC DEFINITION
         * ════════════════════════════════════════════════════════════════════ */}
        <section data-demo="step1" className="pb-8">
          <SectionHeading
            id="step1"
            icon={Scale}
            step="Step 1 — Metric Definition"
            layerColor="bg-purple-600"
            title="LTV: Exposure ÷ Collateral Value × 100"
            subtitle="A single formula measuring how much of the loan is covered by pledged assets"
          />

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-bold text-emerald-400">Loan-to-Value Ratio</span>
              <TierBadge tier="T2" className="ml-auto" />
            </div>

            {/* Config */}
            <div className="grid grid-cols-3 gap-3 text-xs mb-4">
              <div><span className="text-gray-500">Unit</span><div className="text-gray-300 font-medium">Percentage (%)</div></div>
              <div><span className="text-gray-500">Direction</span><div className="text-gray-300 font-medium">Lower is Better</div></div>
              <div><span className="text-gray-500">Weighting</span><div className="text-gray-300 font-medium">By Exposure (EAD)</div></div>
            </div>

            {/* Numerator */}
            <div data-demo="num-section" className="pt-3 border-t border-white/5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                Numerator — Exposure
              </div>
              <div className="flex items-center justify-between text-xs px-1 py-1 rounded bg-white/[0.02]">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 flex-shrink-0 font-mono">→</span>
                  <span className="text-gray-300">gross_exposure_usd</span>
                  <code className="text-[9px] text-gray-600 font-mono">facility_exposure_snapshot</code>
                </div>
                <span className="text-white font-mono font-bold">$15,000,000</span>
              </div>
              <PlainEnglish>
                The total amount the bank has lent for this facility — a single value from one table.
              </PlainEnglish>
            </div>

            {/* Denominator — Collateral */}
            <div data-demo="den-section" className="mt-4 pt-3 border-t border-white/5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                Denominator — Collateral Value
              </div>
              <div className="space-y-2">
                {FACILITY_A_COLLATERAL.map((c) => (
                  <CollateralCard key={c.name} item={c} />
                ))}
              </div>
              <div data-demo="den-total" className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-xs font-bold">
                <span className="text-amber-400">Total Collateral Value</span>
                <span className="text-white font-mono">$25,200,000</span>
              </div>
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className="text-gray-500">Total Eligible (after haircuts)</span>
                <span className="text-emerald-400 font-mono">$22,650,000</span>
              </div>
              <PlainEnglish>
                Three different collateral items secure this loan. Each has a different risk profile and haircut. Real estate is stable but slow to liquidate; cash is instant; receivables are uncertain.
              </PlainEnglish>
            </div>

            {/* Result */}
            <div data-demo="result" className="mt-4 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <code className="text-xs text-gray-400 font-mono">$15,000,000 ÷ $25,200,000 × 100</code>
                <div className="text-2xl font-black text-emerald-400 tabular-nums">59.5%</div>
              </div>
              <div className="text-[10px] text-emerald-400/70 text-right mt-1">Low Risk (below 60%)</div>

              {/* Threshold bands */}
              <div className="mt-4 grid grid-cols-4 gap-1">
                {[
                  { range: '< 60%', label: 'Low Risk', color: 'emerald', active: true },
                  { range: '60–80%', label: 'Moderate', color: 'yellow', active: false },
                  { range: '80–100%', label: 'High Risk', color: 'amber', active: false },
                  { range: '> 100%', label: 'Underwater', color: 'red', active: false },
                ].map((band) => (
                  <div
                    key={band.range}
                    className={`rounded-lg border p-2 text-center text-[10px] ${
                      band.active
                        ? `border-${band.color}-500/40 bg-${band.color}-500/10 text-${band.color}-400 font-bold`
                        : 'border-gray-800 bg-gray-800/30 text-gray-600'
                    }`}
                  >
                    <div>{band.range}</div>
                    <div className="text-[8px]">{band.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <InsightCallout>
            Unlike DSCR where the numerator is complex (NOI or EBITDA with 4+ components), LTV has a simple numerator (just exposure) but a complex denominator (multiple collateral pieces with different haircuts and eligibility rules).
            The collateral waterfall — from raw value through haircuts to eligible value — is where the real complexity lives.
          </InsightCallout>
        </section>

        <FlowArrow label="data plumbing" />

        {/* ════════════════════════════════════════════════════════════════════
         * JOIN MAP
         * ════════════════════════════════════════════════════════════════════ */}
        <section data-demo="join-map" className="pb-8">
          <SectionHeading
            id="join-map"
            icon={Link2}
            step="Data Plumbing"
            layerColor="bg-cyan-600"
            title="How Tables Connect for LTV"
            subtitle="Foreign key relationships that the calculation engine traverses"
          />

          <div className="rounded-xl border border-gray-800 bg-white/[0.01] p-5">
            <div className="text-xs text-gray-500 mb-4">4 layers · 6 core tables · 8 join relationships</div>
            <div className="space-y-3">
              {[
                { from: 'facility_master', to: 'facility_exposure_snapshot', key: 'facility_id', label: '1:N — each facility has periodic exposure snapshots' },
                { from: 'facility_master', to: 'collateral_snapshot', key: 'facility_id', label: '1:N — each facility can have multiple collateral items, each snapshotted' },
                { from: 'counterparty', to: 'facility_master', key: 'counterparty_id', label: '1:N — one borrower can have multiple facilities' },
                { from: 'enterprise_business_taxonomy', to: 'facility_master', key: 'lob_node_id', label: '1:N — org hierarchy groups facilities into desks/portfolios/LoBs' },
                { from: 'collateral_asset_master', to: 'collateral_snapshot', key: 'collateral_id', label: '1:N — one collateral asset has periodic valuation snapshots' },
              ].map((join) => (
                <div key={join.key + join.from} className="flex items-start gap-3 text-xs">
                  <div className="flex items-center gap-1 flex-shrink-0 min-w-[180px]">
                    <code className="text-blue-300 font-mono text-[10px]">{join.from}</code>
                    <span className="text-gray-600">→</span>
                    <code className="text-amber-300 font-mono text-[10px]">{join.to}</code>
                  </div>
                  <div>
                    <code className="text-purple-300 font-mono text-[10px]">ON {join.key}</code>
                    <div className="text-gray-600 text-[10px] mt-0.5">{join.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <InsightCallout>
            The critical difference vs DSCR: LTV requires a JOIN to <code className="text-amber-300">collateral_snapshot</code> which is a one-to-many relationship (one facility → many collateral items).
            DSCR joins to <code className="text-amber-300">facility_financial_snapshot</code> which is typically one-to-one per period. This makes LTV&apos;s denominator aggregation more complex.
          </InsightCallout>
        </section>

        <FlowArrow label="reference data" />

        {/* ════════════════════════════════════════════════════════════════════
         * STEP 2 — L1 REFERENCE DATA
         * ════════════════════════════════════════════════════════════════════ */}
        <section data-demo="step2" className="pb-8">
          <SectionHeading
            id="step2"
            icon={Database}
            step="Step 2 — L1 Reference Data"
            layerColor="bg-blue-600"
            title="Where the Data Lives: Reference Tables"
            subtitle="Slowly-changing dimensional data — the 'address book' of the bank"
          />

          <div className="space-y-3">
            {L1_TABLES.map((t) => (
              <div key={t.table} className="rounded-xl border border-blue-500/20 bg-blue-500/[0.03] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {t.layer}
                  </span>
                  <code className="text-xs font-mono text-blue-200 font-bold">{t.table}</code>
                  {t.table === 'collateral_asset_master' && (
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      LTV-Unique
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mb-2">{t.desc}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {t.fields.map((f) => (
                    <code key={f} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                      {f}
                    </code>
                  ))}
                </div>
                <div className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                  <Scale className="w-3 h-3" />
                  <span className="text-gray-500">LTV role:</span> {t.ltvRole}
                </div>
              </div>
            ))}
          </div>

          <InsightCallout>
            LTV uses the same core L1 tables as DSCR (facility_master, counterparty, enterprise_business_taxonomy) <strong>plus</strong> collateral_asset_master.
            This shared reference layer is what enables cross-metric consistency — the same organizational hierarchy groups LTV, DSCR, and every other risk metric.
          </InsightCallout>
        </section>

        <FlowArrow label="snapshot data" />

        {/* ════════════════════════════════════════════════════════════════════
         * STEP 3 — L2 SNAPSHOT DATA
         * ════════════════════════════════════════════════════════════════════ */}
        <section data-demo="step3" className="pb-8">
          <SectionHeading
            id="step3"
            icon={Layers}
            step="Step 3 — L2 Snapshot Data"
            layerColor="bg-amber-600"
            title="Where the Numbers Come From"
            subtitle="Point-in-time financial readings — the 'photos' of the loan's collateral position"
          />

          {/* facility_exposure_snapshot */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">L2</span>
              <code className="text-xs font-mono text-amber-200 font-bold">facility_exposure_snapshot</code>
              <span className="text-[9px] text-emerald-400 ml-auto">← LTV Numerator</span>
            </div>
            <div className="space-y-1">
              {L2_FIELDS_FES.map((f) => (
                <div key={f.field} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${f.used ? 'bg-emerald-500/5 border border-emerald-500/20' : 'opacity-50'}`}>
                  <div className="flex items-center gap-2">
                    <code className={`font-mono text-[10px] ${f.used ? 'text-emerald-300' : 'text-gray-500'}`}>{f.field}</code>
                    {f.used && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </div>
                  <span className="text-gray-500 text-[10px]">{f.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* collateral_snapshot */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">L2</span>
              <code className="text-xs font-mono text-amber-200 font-bold">collateral_snapshot</code>
              <span className="text-[9px] text-amber-400 ml-auto">← LTV Denominator</span>
            </div>
            <div className="space-y-1">
              {L2_FIELDS_CS.map((f) => (
                <div key={f.field} className={`flex items-center justify-between text-xs px-2 py-1 rounded ${f.used ? 'bg-amber-500/5 border border-amber-500/20' : 'opacity-50'}`}>
                  <div className="flex items-center gap-2">
                    <code className={`font-mono text-[10px] ${f.used ? 'text-amber-300' : 'text-gray-500'}`}>{f.field}</code>
                    {f.used && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  </div>
                  <span className="text-gray-500 text-[10px]">{f.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <PlainEnglish>
            The numerator (exposure) comes from one table. The denominator (collateral) comes from a different table and may have multiple rows per facility — one for each collateral item. The highlighted fields are the ones LTV actually reads.
          </PlainEnglish>
        </section>

        <FlowArrow label="query plan" />

        {/* ════════════════════════════════════════════════════════════════════
         * QUERY PLAN
         * ════════════════════════════════════════════════════════════════════ */}
        <section data-demo="query-plan" className="pb-8">
          <SectionHeading
            id="query-plan"
            icon={Info}
            step="Under the Hood"
            layerColor="bg-purple-600"
            title="Logical Query Plan for LTV"
            subtitle="The sequence of operations the calculation engine performs"
          />

          <div className="rounded-xl border border-gray-800 bg-white/[0.01] p-5 space-y-3">
            {[
              { step: 1, sql: 'SELECT gross_exposure_usd FROM facility_exposure_snapshot WHERE facility_id = ? AND as_of_date = ?', desc: 'Fetch the exposure for this facility at the reporting date' },
              { step: 2, sql: 'SELECT current_valuation_usd, haircut_pct, mitigant_group_code FROM collateral_snapshot WHERE facility_id = ? AND as_of_date = ?', desc: 'Fetch ALL collateral items pledged against this facility' },
              { step: 3, sql: 'SUM(current_valuation_usd) AS total_collateral_value', desc: 'Aggregate across multiple collateral pieces (1:N join)' },
              { step: 4, sql: 'gross_exposure_usd / total_collateral_value * 100 AS ltv_pct', desc: 'Divide exposure by total collateral, multiply by 100' },
              { step: 5, sql: 'INSERT INTO metric_value_fact (metric_id, value, aggregation_level, ...)', desc: 'Persist facility-level LTV to the output fact table' },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-purple-300">{s.step}</span>
                </div>
                <div>
                  <code className="text-[10px] font-mono text-purple-200 leading-relaxed block">{s.sql}</code>
                  <p className="text-[10px] text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <FlowArrow label="calculation" />

        {/* ════════════════════════════════════════════════════════════════════
         * STEP 4 — CALCULATION ENGINE
         * ════════════════════════════════════════════════════════════════════ */}
        <section data-demo="step4" className="pb-8">
          <SectionHeading
            id="step4"
            icon={Calculator}
            step="Step 4 — Calculation Engine"
            layerColor="bg-emerald-600"
            title="The Math in Action"
            subtitle="Per-facility LTV calculation with T2 authority validation"
          />

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <div className="text-xs text-gray-400 mb-4">
              For each facility, the engine:
            </div>
            <div className="space-y-3">
              {/* Step visualization */}
              <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] items-center gap-2">
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-center">
                  <div className="text-[9px] text-gray-500">EXPOSURE</div>
                  <div className="text-sm font-mono font-bold text-emerald-400">$15M</div>
                </div>
                <span className="text-gray-600 text-lg">÷</span>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-center">
                  <div className="text-[9px] text-gray-500">COLLATERAL</div>
                  <div className="text-sm font-mono font-bold text-amber-400">$25.2M</div>
                  <div className="text-[8px] text-gray-600">3 items summed</div>
                </div>
                <span className="text-gray-600 text-lg">× 100</span>
                <div className="rounded-lg bg-white/5 border border-gray-700 p-2 text-center">
                  <div className="text-[9px] text-gray-500">LTV</div>
                  <div className="text-sm font-mono font-bold text-emerald-400">59.5%</div>
                </div>
              </div>
            </div>

            {/* T2 Authority */}
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <TierBadge tier="T2" />
                <span className="text-xs text-gray-400">Source + Validate</span>
              </div>
              <div className="text-xs text-gray-400 leading-relaxed">
                At the facility level, the bank provides their LTV calculation. The platform independently recalculates from the raw collateral snapshot.
                Differences trigger reconciliation — especially important because collateral appraisals can be subjective.
              </div>
            </div>
          </div>

          <InsightCallout>
            Collateral valuation is the most disputed data point in credit risk. Property values depend on appraisal methodology, comparable sales, and market conditions.
            The dual-calculation approach catches both data errors and methodological differences.
          </InsightCallout>
        </section>

        <FlowArrow label="data flow" />

        {/* ════════════════════════════════════════════════════════════════════
         * ANIMATED DATA FLOW
         * ════════════════════════════════════════════════════════════════════ */}
        <section data-demo="data-flow" className="pb-8">
          <SectionHeading
            id="data-flow"
            icon={TrendingDown}
            step="End-to-End Trace"
            layerColor="bg-amber-600"
            title="Following One Facility Through the Pipeline"
            subtitle="Facility A (Multifamily) — $15M exposure, $25.2M collateral → 59.5% LTV"
          />

          <div className="rounded-xl border border-gray-800 bg-white/[0.01] p-5">
            <div className="flex flex-col items-center gap-0">
              {[
                { label: 'L1: facility_master', detail: 'facility_id = FAC-2024-00847', color: 'blue' },
                { label: 'L2: facility_exposure_snapshot', detail: 'gross_exposure_usd = $15,000,000', color: 'amber' },
                { label: 'L2: collateral_snapshot (3 rows)', detail: 'SUM(current_valuation_usd) = $25,200,000', color: 'amber' },
                { label: 'Transform: LTV Calculation', detail: '$15M ÷ $25.2M × 100 = 59.5%', color: 'emerald' },
                { label: 'L3: metric_value_fact', detail: 'metric_id=LTV, value=59.5, unit=%', color: 'emerald' },
                { label: 'Rollup Engine', detail: 'Weighted into counterparty, desk, portfolio, LoB', color: 'red' },
                { label: 'Dashboard', detail: 'LTV = 59.5% · Low Risk · Band: < 60%', color: 'pink' },
              ].map((node, i, arr) => (
                <React.Fragment key={node.label}>
                  <div className={`w-full rounded-lg border border-${node.color}-500/20 bg-${node.color}-500/5 px-4 py-2 flex items-center justify-between`}>
                    <span className={`text-xs font-bold text-${node.color}-400`}>{node.label}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{node.detail}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-px h-4 bg-gray-700" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        <FlowArrow label="rollup & output" />

        {/* ════════════════════════════════════════════════════════════════════
         * STEP 5 — L3 OUTPUT & ROLLUP HIERARCHY
         * ════════════════════════════════════════════════════════════════════ */}
        <section data-demo="step5" className="pb-8">
          <SectionHeading
            id="step5"
            icon={Building2}
            step="Step 5 — L3 Output & Rollup Hierarchy"
            layerColor="bg-emerald-600"
            title="How LTV Flows Up the Organization"
            subtitle="From individual loan to Line of Business — the aggregation chain"
          />

          {/* L3 Output Tables */}
          <div className="mb-6">
            <h4 className="text-sm font-bold text-gray-400 mb-3">L3 Output Tables</h4>
            <div className="space-y-2">
              {L3_OUTPUT_TABLES.map((t) => (
                <div key={t.table} className={`rounded-lg border p-3 ${t.primary ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-gray-800 bg-white/[0.01]'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">L3</span>
                    <code className="text-xs font-mono text-emerald-200 font-bold">{t.table}</code>
                    {t.primary && <span className="text-[8px] font-bold text-emerald-400 ml-auto">PRIMARY</span>}
                  </div>
                  <p className="text-[10px] text-gray-400 mb-1">{t.desc}</p>
                  <div className="flex flex-wrap gap-1">
                    {t.fields.map((f) => (
                      <code key={f} className="text-[9px] font-mono px-1 py-0.5 rounded bg-gray-800 text-gray-500">{f}</code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Foundational Rule */}
          <div data-demo="foundational-rule" className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 mb-6">
            <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              The Golden Rule of LTV Rollups
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed mb-3">
              <strong className="text-red-300">NEVER</strong> take the simple average of individual LTVs. A simple average ignores loan size and masks concentration risk.
              Always use <strong className="text-emerald-300">exposure-weighted average</strong>: Σ(LTV_i × Exposure_i) ÷ Σ(Exposure_i)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
                <div className="text-[9px] font-bold text-red-400 mb-1">WRONG: Simple Average</div>
                <div className="text-xs font-mono text-gray-400">(95% + 30%) ÷ 2</div>
                <div className="text-lg font-black text-red-400 tabular-nums">62.5%</div>
                <div className="text-[9px] text-red-400/70">misleading!</div>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                <div className="text-[9px] font-bold text-emerald-400 mb-1">CORRECT: Exposure-Weighted</div>
                <div className="text-xs font-mono text-gray-400">(95%×$50M + 30%×$1M) ÷ $51M</div>
                <div className="text-lg font-black text-emerald-400 tabular-nums">93.7%</div>
                <div className="text-[9px] text-emerald-400/70">accurate</div>
              </div>
            </div>
          </div>

          {/* Rollup Pyramid */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-gray-400 mb-3">Rollup Hierarchy</h4>
            {ROLLUP_LEVELS.map((level) => {
              const isExpanded = expandedLevel === level.key;
              const Icon = level.icon;
              return (
                <div key={level.key}>
                  <button
                    data-demo={`rollup-${level.key}`}
                    onClick={() => toggleLevel(level.key)}
                    className={`w-full rounded-xl border p-4 flex items-center justify-between text-left transition-colors ${
                      isExpanded ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-gray-800 bg-white/[0.01] hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isExpanded ? 'bg-emerald-500/20' : 'bg-gray-800'}`}>
                        <Icon className={`w-4 h-4 ${isExpanded ? 'text-emerald-400' : 'text-gray-500'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          {level.label}
                          <TierBadge tier={level.tier} />
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{level.desc}</div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-2 ml-4 rounded-xl border border-gray-800 bg-white/[0.01] p-4 space-y-3">
                      <LevelDetail levelKey={level.key} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <FlowArrow label="dashboard" />

        {/* ════════════════════════════════════════════════════════════════════
         * STEP 6 — DASHBOARD CONSUMPTION
         * ════════════════════════════════════════════════════════════════════ */}
        <section data-demo="step6" className="pb-16">
          <SectionHeading
            id="step6"
            icon={LayoutDashboard}
            step="Step 6 — Dashboard Consumption"
            layerColor="bg-pink-600"
            title="The Finish Line"
            subtitle="Every LTV value on the dashboard traces back through the complete lineage chain"
          />

          <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-5">
            <div className="text-xs text-gray-400 mb-4">
              A dashboard user selects their aggregation level and time period. The platform handles all collateral joins, haircut applications, exposure-weighted calculations, and distribution bucketing behind the scenes.
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Level selector mock */}
              <div className="rounded-lg border border-gray-800 bg-white/[0.02] p-3">
                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">Aggregation Level</div>
                <div className="space-y-1">
                  {['Facility', 'Counterparty', 'Desk', 'Portfolio', 'LoB'].map((l) => (
                    <div key={l} className="text-xs text-gray-400 px-2 py-1 rounded hover:bg-white/5 cursor-default">{l}</div>
                  ))}
                </div>
              </div>

              {/* Dashboard output mock */}
              <div className="rounded-lg border border-gray-800 bg-white/[0.02] p-3">
                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">Dashboard Output</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Portfolio LTV</span>
                    <span className="text-yellow-400 font-mono font-bold">72.8%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Risk Band</span>
                    <span className="text-yellow-400">Moderate (60–80%)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Underwater Exposure</span>
                    <span className="text-red-400 font-mono font-bold">{fmtM(180_000_000)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Facilities Tracked</span>
                    <span className="text-gray-300">42</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <InsightCallout>
            This is the power of end-to-end lineage: every LTV value on the dashboard can be traced backwards through the rollup hierarchy, through the calculation engine, through the collateral and exposure snapshots, all the way back to the original reference data. Full auditability.
          </InsightCallout>
        </section>
      </main>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * LEVEL DETAIL — expanded content for each rollup level
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
    <>
      <div className="text-xs text-gray-400 leading-relaxed">
        At the individual loan level, LTV is calculated directly: <strong className="text-white">Exposure ÷ SUM(Collateral Value) × 100</strong>. The key complexity: one facility may have multiple collateral items.
      </div>
      <div className="space-y-1.5">
        {LTV_FACILITIES.map((f) => (
          <div key={f.name} className="flex items-center justify-between px-2 py-1.5 rounded bg-white/[0.02] text-xs">
            <span className="text-gray-400">{f.name}</span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-emerald-400 text-[10px]">{fmtM(f.exposure)}</span>
              <span className="text-gray-600">/</span>
              <span className="text-amber-400 text-[10px]">{fmtM(f.collateralValue)}</span>
              <span className="text-gray-600">=</span>
              <span className={`font-bold ${ltvBandColor(f.ltv)}`}>{fmtPct(f.ltv)}</span>
            </div>
          </div>
        ))}
      </div>
      <PlainEnglish>
        Facility C (Retail) has LTV of 113.6% — it&apos;s &quot;underwater.&quot; The loan exceeds the collateral value by $3M. If the borrower defaults, the bank cannot fully recover.
      </PlainEnglish>
    </>
  );
}

function CounterpartyDetail() {
  const totalExp = LTV_FACILITIES.reduce((s, f) => s + f.exposure, 0);
  const weightedSum = LTV_FACILITIES.reduce((s, f) => s + f.ltv * f.exposure, 0);
  const weightedLTV = weightedSum / totalExp;
  const simpleAvg = LTV_FACILITIES.reduce((s, f) => s + f.ltv, 0) / LTV_FACILITIES.length;

  return (
    <>
      <div className="text-xs text-gray-400 leading-relaxed">
        Borrower-level LTV uses exposure-weighted average: <strong className="text-white">Σ(LTV_i × Exposure_i) ÷ Σ(Exposure_i)</strong>
      </div>
      <div className="space-y-1.5">
        {LTV_FACILITIES.map((f) => (
          <div key={f.name} className="flex items-center justify-between text-xs font-mono px-2 py-1 rounded bg-white/[0.02]">
            <span className="text-gray-400">{f.name.split('(')[0].trim()}</span>
            <div className="flex items-center gap-2">
              <span className={ltvBandColor(f.ltv)}>{fmtPct(f.ltv)}</span>
              <span className="text-gray-600">×</span>
              <span className="text-amber-400">{fmtM(f.exposure)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-xs font-bold">
        <span className="text-gray-300">Weighted LTV</span>
        <span className={`font-mono ${ltvBandColor(weightedLTV)}`}>{fmtPct(weightedLTV)}</span>
      </div>
      <PlainEnglish>
        Simple average would be {fmtPct(simpleAvg)} — the weighted result ({fmtPct(weightedLTV)}) is much higher because the $25M underwater loan dominates the calculation.
      </PlainEnglish>
    </>
  );
}

function DeskDetail() {
  return (
    <>
      <div className="text-xs text-gray-400 leading-relaxed">
        LTV at the desk level adds collateral type segmentation — showing how much of the coverage is backed by real estate vs cash vs other assets.
      </div>
      <div className="space-y-2">
        {DESK_SEGMENTS.map((seg) => (
          <div key={seg.label} className={`rounded-lg border p-3 ${seg.colorBg}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-xs font-bold ${seg.color}`}>{seg.label}</div>
                <div className="text-[10px] text-gray-500">{seg.collateralType} · {fmtM(seg.exposure)} exposure</div>
              </div>
              <span className={`text-lg font-bold font-mono ${seg.color}`}>{fmtPct(seg.ltv)}</span>
            </div>
          </div>
        ))}
      </div>
      <PlainEnglish>
        A CRE desk with 74.2% LTV backed by real estate is qualitatively different from a corporate desk at 58.1% backed by receivables — even though the corporate desk looks &quot;safer,&quot; receivables are harder to liquidate.
      </PlainEnglish>
    </>
  );
}

function PortfolioDetail() {
  const wtdAvg = exposureWeightedLTV(LTV_COUNTERPARTIES);
  return (
    <>
      <div className="text-xs text-gray-400 leading-relaxed">
        Portfolio LTV uses exposure-weighted average plus distribution buckets to reveal hidden pockets of risk.
      </div>
      <div className="flex items-center justify-between mb-3 p-2 rounded-lg bg-white/[0.02]">
        <span className="text-xs text-gray-400">Portfolio-Weighted LTV</span>
        <span className={`text-lg font-black font-mono ${ltvBandColor(wtdAvg)}`}>{fmtPct(wtdAvg)}</span>
      </div>
      <div className="space-y-1.5">
        {PORTFOLIO_BUCKETS.map((b) => (
          <div key={b.range} className={`flex items-center justify-between text-xs font-mono rounded px-2 py-1.5 ${b.bg}`}>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${b.color}`}>{b.range}</span>
              <span className="text-gray-600 text-[10px]">{b.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-500">{b.count} facilities</span>
              <span className="text-gray-400">{fmtM(b.exposure)}</span>
            </div>
          </div>
        ))}
      </div>
      <PlainEnglish>
        The &quot;underwater&quot; bucket (&gt; 100%) shows 4 facilities with {fmtM(180_000_000)} exposure where loans exceed collateral value. This is the most watched metric in CRE portfolios.
      </PlainEnglish>
    </>
  );
}

function LoBDetail() {
  const TREND_ARROWS: Record<string, string> = { up: '↑', down: '↓', flat: '→' };
  return (
    <>
      <div className="text-xs text-gray-400 leading-relaxed">
        At the LoB level, LTV serves as a collateral coverage trend indicator. Unlike DSCR, LTV is directly comparable across LoBs because the formula is consistent.
      </div>
      <div className="grid grid-cols-3 gap-2">
        {LOB_ENTRIES.map((lob) => (
          <div key={lob.label} className={`rounded-lg border p-3 text-center ${lob.bg}`}>
            <div className={`text-[10px] font-bold ${lob.color}`}>{lob.label}</div>
            <div className={`text-lg font-mono font-bold ${lob.color}`}>
              {fmtPct(lob.ltv)} {TREND_ARROWS[lob.trend]}
            </div>
            <div className="text-[8px] text-gray-600">{lob.note}</div>
          </div>
        ))}
      </div>
      <PlainEnglish>
        CRE LTV trending upward (↑) may signal a weakening real estate market. The CRO monitors this to detect systemic exposure to property value declines before they become losses.
      </PlainEnglish>
    </>
  );
}
