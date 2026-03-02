'use client';

import React, { useState } from 'react';
import {
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
  Building2,
  Play,
  Network,
  Workflow,
  Sparkles,
  RefreshCw,
  Search,
  Package,
  ArrowRight,
  FileText,
} from 'lucide-react';
import TableTraversalDemo from './TableTraversalDemo';

/* ────────────────────────────────────────────────────────────────────────────
 * STEP TYPE — every step is labeled SOURCING, CALCULATION, or HYBRID
 * ──────────────────────────────────────────────────────────────────────────── */

type StepType = 'SOURCING' | 'CALCULATION' | 'HYBRID';

const STEP_TYPE_STYLES: Record<StepType, { bg: string; text: string; border: string; label: string }> = {
  SOURCING:    { bg: 'bg-cyan-500/15',   text: 'text-cyan-300',    border: 'border-cyan-500/30',    label: 'Sourcing' },
  CALCULATION: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', label: 'Calculation' },
  HYBRID:      { bg: 'bg-amber-500/15',  text: 'text-amber-300',   border: 'border-amber-500/30',   label: 'Hybrid (Source + Aggregate)' },
};

function StepTypeBadge({ type }: { type: StepType }) {
  const s = STEP_TYPE_STYLES[type];
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${s.bg} ${s.text} ${s.border}`}>
      {type === 'SOURCING' && <Database className="w-2.5 h-2.5" aria-hidden />}
      {type === 'CALCULATION' && <Calculator className="w-2.5 h-2.5" aria-hidden />}
      {type === 'HYBRID' && <RefreshCw className="w-2.5 h-2.5" aria-hidden />}
      {s.label}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * ROLLUP LEVELS — Facility → Counterparty → Desk → Portfolio → LoB
 * ──────────────────────────────────────────────────────────────────────────── */

const ROLLUP_LEVELS = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Table2,
    desc: 'Direct Calculation — LTV = drawn_amount / collateral_value for one facility',
    method: 'Direct Ratio',
    purpose: 'Collateral coverage per loan',
    tier: 'T2',
    stepType: 'CALCULATION' as StepType,
    dashboardName: 'Facility LTV (%)',
    formula: 'LTV = drawn_amount / collateral_value',
    formulaDetail: 'drawn_amount from facility_exposure_snapshot, collateral_value = SUM(current_valuation_usd) from collateral_snapshot for same facility_id and as_of_date',
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    desc: 'Exposure-weighted average — blend facility LTVs by gross_exposure_usd',
    method: 'Exposure-Weighted Average',
    purpose: 'Obligor-level collateral adequacy',
    tier: 'T3',
    stepType: 'HYBRID' as StepType,
    dashboardName: 'Counterparty WAvg LTV (%)',
    formula: 'SUM(ltv × gross_exposure) / SUM(gross_exposure)',
    formulaDetail: 'For each facility under this counterparty, compute facility LTV, weight by gross_exposure_usd. Unsecured facilities excluded.',
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    desc: 'Exposure-weighted average across all secured facilities assigned to this L3 desk',
    method: 'Exposure-Weighted Average',
    purpose: 'Book-level collateral monitoring',
    tier: 'T3',
    stepType: 'HYBRID' as StepType,
    dashboardName: 'Desk WAvg LTV (%)',
    formula: 'SUM(ltv × gross_exposure) / SUM(gross_exposure)',
    formulaDetail: 'Same weighted average as counterparty, but grouping by L3 desk resolved via enterprise_business_taxonomy.',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    desc: 'Exposure-weighted average for all secured facilities within an L2 portfolio',
    method: 'Exposure-Weighted Average',
    purpose: 'ALCO collateral adequacy reporting',
    tier: 'T3',
    stepType: 'HYBRID' as StepType,
    dashboardName: 'Portfolio WAvg LTV (%)',
    formula: 'SUM(ltv × gross_exposure) / SUM(gross_exposure)',
    formulaDetail: 'Same weighted average, grouped by L2 portfolio via parent_segment_id traversal in enterprise_business_taxonomy.',
  },
  {
    key: 'lob',
    label: 'Line of Business',
    icon: PieChart,
    desc: 'Exposure-weighted average at L1 department level — board-level collateral coverage',
    method: 'Exposure-Weighted Average',
    purpose: 'Enterprise risk appetite monitoring',
    tier: 'T3',
    stepType: 'HYBRID' as StepType,
    dashboardName: 'Department WAvg LTV (%)',
    formula: 'SUM(ltv × gross_exposure) / SUM(gross_exposure)',
    formulaDetail: 'Same weighted average at the highest organizational level. Traverse enterprise_business_taxonomy to root (parent IS NULL).',
  },
] as const;

/* ────────────────────────────────────────────────────────────────────────────
 * SOURCE / REFERENCE TABLES per level — "ingredient fields"
 * ──────────────────────────────────────────────────────────────────────────── */

interface IngredientField {
  layer: 'L1' | 'L2';
  table: string;
  field: string;
  description: string;
  role: 'numerator' | 'denominator' | 'weight' | 'grouping_fk' | 'hierarchy';
  sampleValue: string;
}

const INGREDIENT_FIELDS: Record<string, IngredientField[]> = {
  facility: [
    { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount', description: 'Outstanding drawn balance', role: 'numerator', sampleValue: '$120,000,000' },
    { layer: 'L2', table: 'collateral_snapshot', field: 'current_valuation_usd', description: 'Collateral valuation in USD (summed by facility/date)', role: 'denominator', sampleValue: '$50,000,000' },
  ],
  counterparty: [
    { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount', description: 'Outstanding drawn balance', role: 'numerator', sampleValue: '$120,000,000' },
    { layer: 'L2', table: 'collateral_snapshot', field: 'current_valuation_usd', description: 'Collateral valuation in USD', role: 'denominator', sampleValue: '$50,000,000' },
    { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', description: 'Gross exposure in USD (weight)', role: 'weight', sampleValue: '$150,000,000' },
    { layer: 'L1', table: 'facility_master', field: 'counterparty_id', description: 'FK to counterparty for grouping', role: 'grouping_fk', sampleValue: '7890' },
  ],
  desk: [
    { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount', description: 'Outstanding drawn balance', role: 'numerator', sampleValue: '$120,000,000' },
    { layer: 'L2', table: 'collateral_snapshot', field: 'current_valuation_usd', description: 'Collateral valuation in USD', role: 'denominator', sampleValue: '$50,000,000' },
    { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', description: 'Gross exposure (weight)', role: 'weight', sampleValue: '$150,000,000' },
    { layer: 'L1', table: 'facility_master', field: 'lob_segment_id', description: 'FK to LoB taxonomy', role: 'grouping_fk', sampleValue: '301' },
    { layer: 'L1', table: 'enterprise_business_taxonomy', field: 'managed_segment_id', description: 'Resolve leaf node as lob_l3_name (Desk)', role: 'hierarchy', sampleValue: '301' },
  ],
  portfolio: [
    { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount', description: 'Outstanding drawn balance', role: 'numerator', sampleValue: '$120,000,000' },
    { layer: 'L2', table: 'collateral_snapshot', field: 'current_valuation_usd', description: 'Collateral valuation in USD', role: 'denominator', sampleValue: '$50,000,000' },
    { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', description: 'Gross exposure (weight)', role: 'weight', sampleValue: '$150,000,000' },
    { layer: 'L1', table: 'facility_master', field: 'lob_segment_id', description: 'FK to LoB taxonomy', role: 'grouping_fk', sampleValue: '301' },
    { layer: 'L1', table: 'enterprise_business_taxonomy', field: 'managed_segment_id', description: 'LoB hierarchy entry point', role: 'hierarchy', sampleValue: '301' },
    { layer: 'L1', table: 'enterprise_business_taxonomy', field: 'parent_segment_id', description: 'Traverse one level up to L2 (Portfolio)', role: 'hierarchy', sampleValue: '30' },
  ],
  lob: [
    { layer: 'L2', table: 'facility_exposure_snapshot', field: 'drawn_amount', description: 'Outstanding drawn balance', role: 'numerator', sampleValue: '$120,000,000' },
    { layer: 'L2', table: 'collateral_snapshot', field: 'current_valuation_usd', description: 'Collateral valuation in USD', role: 'denominator', sampleValue: '$50,000,000' },
    { layer: 'L2', table: 'facility_exposure_snapshot', field: 'gross_exposure_usd', description: 'Gross exposure (weight)', role: 'weight', sampleValue: '$150,000,000' },
    { layer: 'L1', table: 'facility_master', field: 'lob_segment_id', description: 'FK to LoB taxonomy', role: 'grouping_fk', sampleValue: '301' },
    { layer: 'L1', table: 'enterprise_business_taxonomy', field: 'managed_segment_id', description: 'LoB hierarchy entry point', role: 'hierarchy', sampleValue: '301' },
    { layer: 'L1', table: 'enterprise_business_taxonomy', field: 'parent_segment_id', description: 'Traverse to root (parent IS NULL) = L1 Department', role: 'hierarchy', sampleValue: 'NULL' },
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
 * JOIN CHAINS — FK traversal paths per level (how tables are traversed)
 * ──────────────────────────────────────────────────────────────────────────── */

interface JoinHop {
  from: string;
  fromLayer: 'L1' | 'L2';
  to: string;
  toLayer: 'L1' | 'L2';
  joinKey: string;
  note: string;
  stepType: StepType;
}

interface JoinChainData {
  hops: JoinHop[];
  aggregation: string;
  result: string;
  dependsOn?: string;
}

const JOIN_CHAINS: Record<string, JoinChainData> = {
  facility: {
    hops: [
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'collateral_snapshot', toLayer: 'L2', joinKey: 'facility_id + as_of_date', note: 'Look up collateral pledged against this facility', stepType: 'SOURCING' },
      { from: 'collateral_snapshot', fromLayer: 'L2', to: '(subquery: SUM by facility)', toLayer: 'L2', joinKey: 'GROUP BY facility_id, as_of_date', note: 'Aggregate multiple collateral items into one value', stepType: 'HYBRID' },
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Resolve facility identity and product type', stepType: 'SOURCING' },
    ],
    aggregation: 'Direct division: drawn_amount / collateral_value',
    result: 'One LTV ratio per facility (no cross-facility aggregation)',
  },
  counterparty: {
    hops: [
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'collateral_snapshot', toLayer: 'L2', joinKey: 'facility_id + as_of_date', note: 'Collateral for each facility', stepType: 'SOURCING' },
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get counterparty_id from facility master', stepType: 'SOURCING' },
      { from: 'facility_master', fromLayer: 'L1', to: 'counterparty', toLayer: 'L1', joinKey: 'counterparty_id', note: 'Resolve counterparty identity for grouping', stepType: 'SOURCING' },
    ],
    aggregation: 'Exposure-weighted average: SUM(facility_ltv × gross_exposure) / SUM(gross_exposure) grouped by counterparty_id',
    result: 'One weighted-average LTV per counterparty (unsecured excluded)',
    dependsOn: 'Requires facility-level LTV calculation first',
  },
  desk: {
    hops: [
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'collateral_snapshot', toLayer: 'L2', joinKey: 'facility_id + as_of_date', note: 'Collateral for each facility', stepType: 'SOURCING' },
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get lob_segment_id — this FK determines which desk the facility belongs to', stepType: 'SOURCING' },
      { from: 'facility_master', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'lob_segment_id = managed_segment_id', note: 'The leaf node in the taxonomy IS the L3 desk — all facilities sharing the same lob_segment_id belong to this desk', stepType: 'SOURCING' },
    ],
    aggregation: 'Exposure-weighted average: SUM(facility_ltv × gross_exposure) / SUM(gross_exposure) grouped by lob_l3_name',
    result: 'One weighted-average LTV per desk — groups all facilities whose lob_segment_id maps to the same taxonomy leaf',
    dependsOn: 'Requires facility-level LTV calculation first',
  },
  portfolio: {
    hops: [
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'collateral_snapshot', toLayer: 'L2', joinKey: 'facility_id + as_of_date', note: 'Collateral for each facility', stepType: 'SOURCING' },
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get lob_segment_id FK', stepType: 'SOURCING' },
      { from: 'facility_master', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'lob_segment_id = managed_segment_id', note: 'Enter LoB hierarchy at leaf', stepType: 'SOURCING' },
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id = managed_segment_id', note: 'Walk tree one level up: Desk → Portfolio (L2)', stepType: 'SOURCING' },
    ],
    aggregation: 'Exposure-weighted average: SUM(facility_ltv × gross_exposure) / SUM(gross_exposure) grouped by L2 portfolio',
    result: 'One weighted-average LTV per portfolio',
    dependsOn: 'Requires facility-level LTV calculation first',
  },
  lob: {
    hops: [
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'collateral_snapshot', toLayer: 'L2', joinKey: 'facility_id + as_of_date', note: 'Collateral for each facility', stepType: 'SOURCING' },
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get lob_segment_id FK', stepType: 'SOURCING' },
      { from: 'facility_master', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'lob_segment_id = managed_segment_id', note: 'Enter LoB hierarchy at leaf', stepType: 'SOURCING' },
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy (root)', toLayer: 'L1', joinKey: 'recursive parent_segment_id until parent IS NULL', note: 'Walk tree to root = L1 Department', stepType: 'SOURCING' },
    ],
    aggregation: 'Exposure-weighted average: SUM(facility_ltv × gross_exposure) / SUM(gross_exposure) grouped by L1 department',
    result: 'One weighted-average LTV per Line of Business',
    dependsOn: 'Requires facility-level LTV calculation first',
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * INPUT TABLES per level — distinct from calculation dimensions
 * Shown alongside the hierarchy pyramid (enhancement #4)
 * ──────────────────────────────────────────────────────────────────────────── */

interface InputTable {
  layer: 'L1' | 'L2';
  table: string;
  role: string;
  fields: string[];
}

const INPUT_TABLES: Record<string, InputTable[]> = {
  facility: [
    { layer: 'L2', table: 'facility_exposure_snapshot', role: 'Numerator source', fields: ['drawn_amount', 'gross_exposure_usd', 'facility_id', 'as_of_date'] },
    { layer: 'L2', table: 'collateral_snapshot', role: 'Denominator source', fields: ['current_valuation_usd', 'facility_id', 'as_of_date', 'collateral_asset_id'] },
  ],
  counterparty: [
    { layer: 'L2', table: 'facility_exposure_snapshot', role: 'Numerator + weight', fields: ['drawn_amount', 'gross_exposure_usd'] },
    { layer: 'L2', table: 'collateral_snapshot', role: 'Denominator source', fields: ['current_valuation_usd'] },
    { layer: 'L1', table: 'facility_master', role: 'Grouping FK', fields: ['facility_id', 'counterparty_id'] },
  ],
  desk: [
    { layer: 'L2', table: 'facility_exposure_snapshot', role: 'Numerator + weight', fields: ['drawn_amount', 'gross_exposure_usd'] },
    { layer: 'L2', table: 'collateral_snapshot', role: 'Denominator source', fields: ['current_valuation_usd'] },
    { layer: 'L1', table: 'facility_master', role: 'Grouping FK', fields: ['facility_id', 'lob_segment_id'] },
    { layer: 'L1', table: 'enterprise_business_taxonomy', role: 'Hierarchy resolution', fields: ['managed_segment_id', 'lob_l3_name'] },
  ],
  portfolio: [
    { layer: 'L2', table: 'facility_exposure_snapshot', role: 'Numerator + weight', fields: ['drawn_amount', 'gross_exposure_usd'] },
    { layer: 'L2', table: 'collateral_snapshot', role: 'Denominator source', fields: ['current_valuation_usd'] },
    { layer: 'L1', table: 'facility_master', role: 'Grouping FK', fields: ['facility_id', 'lob_segment_id'] },
    { layer: 'L1', table: 'enterprise_business_taxonomy', role: 'Hierarchy (leaf + parent)', fields: ['managed_segment_id', 'parent_segment_id', 'lob_l2_name'] },
  ],
  lob: [
    { layer: 'L2', table: 'facility_exposure_snapshot', role: 'Numerator + weight', fields: ['drawn_amount', 'gross_exposure_usd'] },
    { layer: 'L2', table: 'collateral_snapshot', role: 'Denominator source', fields: ['current_valuation_usd'] },
    { layer: 'L1', table: 'facility_master', role: 'Grouping FK', fields: ['facility_id', 'lob_segment_id'] },
    { layer: 'L1', table: 'enterprise_business_taxonomy', role: 'Hierarchy (root traversal)', fields: ['managed_segment_id', 'parent_segment_id', 'lob_l1_name'] },
  ],
};


/* ────────────────────────────────────────────────────────────────────────────
 * HELPER COMPONENTS
 * ──────────────────────────────────────────────────────────────────────────── */

function TierBadge({ tier }: { tier: string }) {
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
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${colors[tier] || ''}`} title={labels[tier]}>
      <ShieldCheck className="w-3 h-3 flex-shrink-0" aria-hidden />
      {labels[tier] || tier}
    </span>
  );
}

function SectionHeading({ icon: Icon, step, layerColor, title, subtitle }: {
  icon: React.ElementType;
  step: string;
  layerColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-10 h-10 rounded-xl ${layerColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" aria-hidden />
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
    <div className="flex flex-col items-center gap-1 py-3" aria-hidden>
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
    <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 px-4 py-3 flex items-start gap-3 mt-4">
      <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Eye className="w-3.5 h-3.5 text-orange-400" aria-hidden />
      </div>
      <div className="text-xs text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  numerator:   { bg: 'bg-rose-500/10',    text: 'text-rose-300' },
  denominator: { bg: 'bg-violet-500/10',  text: 'text-violet-300' },
  weight:      { bg: 'bg-amber-500/10',   text: 'text-amber-300' },
  grouping_fk: { bg: 'bg-blue-500/10',    text: 'text-blue-300' },
  hierarchy:   { bg: 'bg-purple-500/10',  text: 'text-purple-300' },
};

const ROLE_LABELS: Record<string, string> = {
  numerator: 'Numerator',
  denominator: 'Denominator',
  weight: 'Weight',
  grouping_fk: 'Grouping FK',
  hierarchy: 'Hierarchy',
};

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION: METRIC DEFINITION
 * ──────────────────────────────────────────────────────────────────────────── */

function MetricDefinition() {
  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-white" aria-hidden />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Loan-to-Value Ratio (LTV)</h3>
          <p className="text-xs text-gray-500">Metric ID: C104 | Class: CALCULATED | Direction: Lower Better</p>
        </div>
      </div>

      <div className="bg-black/40 rounded-lg p-4 mb-4 font-mono text-center">
        <div className="text-xs text-gray-500 mb-1">Generic Formula</div>
        <div className="text-lg text-emerald-400 font-bold">
          LTV = Exposure / Collateral Value &times; 100
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3">
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Rollup Philosophy</div>
          <div className="text-sm text-white font-medium">Exposure-Weighted Average</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3">
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Weighting Basis</div>
          <div className="text-sm text-white font-medium">By EAD (gross_exposure_usd)</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3">
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Domains</div>
          <div className="text-sm text-white font-medium">Financial Performance, Collateral Mgmt</div>
        </div>
      </div>

      <div className="text-xs text-gray-400 leading-relaxed">
        Exposure divided by Collateral Value. Provides insight into collateral coverage and downside protection.
        For unsecured facilities (or missing collateral valuation), LTV is null and excluded from weighted aggregates.
        Primarily relevant for CRE desks. A 20% property value decline pushes an 80% LTV facility into negative equity territory.
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION: SOURCE & REFERENCE TABLES
 * ──────────────────────────────────────────────────────────────────────────── */

function SourceTablesOverview() {
  const tables = [
    {
      layer: 'L2', name: 'facility_exposure_snapshot', role: 'Numerator + exposure weight',
      fields: ['drawn_amount', 'gross_exposure_usd', 'facility_id', 'as_of_date', 'counterparty_id', 'lob_segment_id'],
      desc: 'Point-in-time exposure data per facility — the "how much is lent" side of the ratio.',
      color: 'amber',
    },
    {
      layer: 'L2', name: 'collateral_snapshot', role: 'Denominator',
      fields: ['current_valuation_usd', 'facility_id', 'as_of_date', 'collateral_asset_id', 'valuation_amount'],
      desc: 'Collateral pledged against facilities — the "how much secures it" side. Multiple collateral items per facility are summed.',
      color: 'amber',
    },
    {
      layer: 'L1', name: 'facility_master', role: 'Dimensional anchor + FK chain',
      fields: ['facility_id', 'counterparty_id', 'lob_segment_id', 'product_type'],
      desc: 'Master reference for every loan — provides the FK links to counterparty and LoB taxonomy needed for rollups.',
      color: 'blue',
    },
    {
      layer: 'L1', name: 'enterprise_business_taxonomy', role: 'LoB hierarchy traversal',
      fields: ['managed_segment_id', 'parent_segment_id', 'lob_l3_name', 'lob_l2_name', 'lob_l1_name'],
      desc: 'Organizational tree: Desk (L3) → Portfolio (L2) → Department (L1). Self-join on parent_segment_id to walk up the hierarchy.',
      color: 'blue',
    },
    {
      layer: 'L1', name: 'counterparty', role: 'Borrower identity',
      fields: ['counterparty_id', 'counterparty_name', 'risk_rating'],
      desc: 'Counterparty master data — provides identity for counterparty-level grouping.',
      color: 'blue',
    },
  ];

  const layerColors: Record<string, { dot: string; label: string; border: string; bg: string }> = {
    amber: { dot: 'bg-amber-500', label: 'text-amber-300', border: 'border-amber-500/30', bg: 'bg-amber-500/5' },
    blue:  { dot: 'bg-blue-500',  label: 'text-blue-300',  border: 'border-blue-500/30',  bg: 'bg-blue-500/5' },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Legend:</span>
        <span className="flex items-center gap-1 text-[9px] text-amber-300"><span className="w-2 h-2 rounded-full bg-amber-500" />L2 — Snapshot (time-series)</span>
        <span className="flex items-center gap-1 text-[9px] text-blue-300"><span className="w-2 h-2 rounded-full bg-blue-500" />L1 — Reference (master data)</span>
      </div>
      {tables.map((t) => {
        const c = layerColors[t.color];
        return (
          <div key={t.name} className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              <code className={`text-sm font-bold font-mono ${c.label}`}>{t.layer}.{t.name}</code>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-gray-800">{t.role}</span>
            </div>
            <p className="text-[10px] text-gray-500 mb-2">{t.desc}</p>
            <div className="flex flex-wrap gap-1">
              {t.fields.map((f) => (
                <code key={f} className="text-[9px] font-mono text-gray-400 px-1.5 py-0.5 rounded bg-white/[0.04] border border-gray-800/50">
                  {f}
                </code>
              ))}
            </div>
          </div>
        );
      })}

      <InsightCallout>
        <strong>Two snapshot tables, three reference tables.</strong> The LTV calculation itself only needs{' '}
        <code className="text-amber-300">facility_exposure_snapshot</code> and <code className="text-amber-300">collateral_snapshot</code>.
        The reference tables (<code className="text-blue-300">facility_master</code>, <code className="text-blue-300">counterparty</code>,{' '}
        <code className="text-blue-300">enterprise_business_taxonomy</code>) provide the FK chains needed to group and roll up
        from facility to counterparty, desk, portfolio, and LoB.
      </InsightCallout>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION: JOIN MAP — "How the Tables Are Traversed"
 * ──────────────────────────────────────────────────────────────────────────── */

function JoinMapVisual() {
  const nodes = [
    { id: 'fes', label: 'facility_exposure_snapshot', layer: 'L2', x: 0, y: 0 },
    { id: 'cs',  label: 'collateral_snapshot',         layer: 'L2', x: 0, y: 1 },
    { id: 'fm',  label: 'facility_master',             layer: 'L1', x: 1, y: 0 },
    { id: 'cp',  label: 'counterparty',               layer: 'L1', x: 2, y: 0 },
    { id: 'ebt', label: 'enterprise_business_taxonomy', layer: 'L1', x: 1, y: 1 },
  ];

  const edges = [
    { from: 'fes', to: 'cs',  key: 'facility_id + as_of_date', label: 'Collateral lookup' },
    { from: 'fes', to: 'fm',  key: 'facility_id',               label: 'Master data' },
    { from: 'fm',  to: 'cp',  key: 'counterparty_id',          label: 'Borrower identity' },
    { from: 'fm',  to: 'ebt', key: 'lob_segment_id = managed_segment_id', label: 'LoB hierarchy entry' },
    { from: 'ebt', to: 'ebt', key: 'parent_segment_id (self-join)', label: 'Walk tree upward' },
  ];

  const layerStyle: Record<string, { border: string; bg: string; text: string }> = {
    L2: { border: 'border-amber-500/40', bg: 'bg-amber-500/10', text: 'text-amber-300' },
    L1: { border: 'border-blue-500/40',  bg: 'bg-blue-500/10',  text: 'text-blue-300' },
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Network className="w-4 h-4 text-cyan-400" aria-hidden />
        <span className="text-sm font-bold text-white">Table Traversal Map</span>
        <span className="text-[9px] text-gray-600">How each table connects via FK joins</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {nodes.map((n) => {
          const s = layerStyle[n.layer];
          return (
            <div key={n.id} className={`rounded-lg border ${s.border} ${s.bg} p-3`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Database className={`w-3 h-3 ${s.text}`} aria-hidden />
                <span className={`text-[9px] font-bold uppercase ${s.text}`}>{n.layer}</span>
              </div>
              <code className={`text-xs font-mono font-semibold ${s.text}`}>{n.label}</code>
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Join Edges</div>
        {edges.map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <span className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center text-[8px] font-bold text-gray-500 flex-shrink-0">{i + 1}</span>
            <code className="font-mono text-amber-300">{e.from === 'fes' ? 'facility_exposure_snapshot' : e.from === 'cs' ? 'collateral_snapshot' : e.from === 'fm' ? 'facility_master' : e.from === 'cp' ? 'counterparty' : 'enterprise_business_taxonomy'}</code>
            <ArrowRight className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <code className="font-mono text-blue-300">{e.to === 'fes' ? 'facility_exposure_snapshot' : e.to === 'cs' ? 'collateral_snapshot' : e.to === 'fm' ? 'facility_master' : e.to === 'cp' ? 'counterparty' : 'enterprise_business_taxonomy'}</code>
            <span className="text-gray-700">ON</span>
            <code className="font-mono text-emerald-400">{e.key}</code>
            <span className="text-gray-600 italic ml-1">({e.label})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION: JOIN CHAIN VISUAL per level
 * ──────────────────────────────────────────────────────────────────────────── */

function JoinChainVisual({ levelKey }: { levelKey: string }) {
  const chain = JOIN_CHAINS[levelKey];
  if (!chain) return null;

  return (
    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.03] p-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Workflow className="w-3.5 h-3.5 text-cyan-400" aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Join Path — Table Traversal</span>
      </div>

      <div className="space-y-1.5">
        {chain.hops.map((hop, i) => {
          const fromColor = hop.fromLayer === 'L2' ? 'text-amber-300' : 'text-blue-300';
          const toColor = hop.toLayer === 'L2' ? 'text-amber-300' : 'text-blue-300';
          return (
            <div key={i} className="flex items-center gap-2 text-[10px] flex-wrap">
              <span className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center text-[8px] font-bold text-gray-500 flex-shrink-0">{i + 1}</span>
              <code className={`font-mono ${fromColor}`}>{hop.from}</code>
              <span className="text-gray-600">&rarr;</span>
              <code className={`font-mono ${toColor}`}>{hop.to}</code>
              <span className="text-gray-700">ON</span>
              <code className="font-mono text-emerald-400">{hop.joinKey}</code>
              <StepTypeBadge type={hop.stepType} />
              {hop.note && <span className="text-gray-600 italic">({hop.note})</span>}
            </div>
          );
        })}
      </div>

      {chain.dependsOn && (
        <div className="mt-2 pt-2 border-t border-white/5 flex items-start gap-2 text-[10px]">
          <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
          <span className="text-amber-300 font-medium">{chain.dependsOn}</span>
        </div>
      )}

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
 * SECTION: INGREDIENT FIELDS TABLE per level
 * ──────────────────────────────────────────────────────────────────────────── */

function IngredientFieldsTable({ levelKey }: { levelKey: string }) {
  const fields = INGREDIENT_FIELDS[levelKey];
  if (!fields) return null;

  return (
    <div className="rounded-lg border border-gray-800 bg-black/20 p-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Package className="w-3.5 h-3.5 text-gray-400" aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ingredient Fields Required</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-gray-600 border-b border-gray-800">
              <th className="text-left py-1 pr-3 font-bold">Layer</th>
              <th className="text-left py-1 pr-3 font-bold">Table</th>
              <th className="text-left py-1 pr-3 font-bold">Field</th>
              <th className="text-left py-1 pr-3 font-bold">Role</th>
              <th className="text-left py-1 font-bold">Description</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => {
              const rc = ROLE_COLORS[f.role];
              return (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="py-1.5 pr-3">
                    <span className={`font-bold ${f.layer === 'L2' ? 'text-amber-300' : 'text-blue-300'}`}>{f.layer}</span>
                  </td>
                  <td className="py-1.5 pr-3">
                    <code className="font-mono text-gray-300">{f.table}</code>
                  </td>
                  <td className="py-1.5 pr-3">
                    <code className="font-mono text-white font-semibold">{f.field}</code>
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className={`px-1.5 py-0.5 rounded ${rc.bg} ${rc.text} font-bold`}>
                      {ROLE_LABELS[f.role]}
                    </span>
                  </td>
                  <td className="py-1.5 text-gray-500">{f.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION: INPUT TABLE SIDE PANEL (enhancement #4)
 * ──────────────────────────────────────────────────────────────────────────── */

function InputTablePanel({ levelKey }: { levelKey: string }) {
  const tables = INPUT_TABLES[levelKey];
  if (!tables) return null;

  return (
    <div className="rounded-lg border border-dashed border-gray-700 bg-gray-900/50 p-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Database className="w-3.5 h-3.5 text-gray-400" aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Input Tables (Data Sources)</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {tables.map((t, i) => (
          <div key={i} className={`rounded-lg border p-2.5 ${t.layer === 'L2' ? 'border-amber-500/20 bg-amber-500/[0.03]' : 'border-blue-500/20 bg-blue-500/[0.03]'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full ${t.layer === 'L2' ? 'bg-amber-500' : 'bg-blue-500'}`} />
              <code className={`text-[10px] font-mono font-bold ${t.layer === 'L2' ? 'text-amber-300' : 'text-blue-300'}`}>
                {t.layer}.{t.table}
              </code>
            </div>
            <div className="text-[9px] text-gray-500 mb-1">{t.role}</div>
            <div className="flex flex-wrap gap-1">
              {t.fields.map((f) => (
                <code key={f} className="text-[8px] font-mono text-gray-500 px-1 py-0.5 rounded bg-white/[0.03]">{f}</code>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION: ROLLUP PYRAMID — Hierarchy Overview (enhanced)
 * ──────────────────────────────────────────────────────────────────────────── */

function RollupPyramid({ expandedLevel, onToggle }: { expandedLevel: string | null; onToggle: (k: string) => void }) {
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
                  <Icon className={`w-4 h-4 ${expanded ? 'text-emerald-400' : 'text-gray-500'}`} aria-hidden />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{level.label}</span>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-gray-800">
                      {level.method}
                    </span>
                    <StepTypeBadge type={level.stepType} />
                  </div>
                  <div className="text-[10px] text-gray-500">{level.purpose}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TierBadge tier={level.tier} />
                {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" aria-hidden /> : <ChevronDown className="w-4 h-4 text-gray-500" aria-hidden />}
              </div>
            </div>

            {expanded && (
              <div className="mt-3 pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                <div className="bg-black/30 rounded-lg p-3 mb-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Formula</div>
                  <div className="text-sm font-mono text-emerald-400 text-center">{level.formula}</div>
                  <div className="text-[10px] text-gray-500 mt-2 text-center">{level.formulaDetail}</div>
                </div>

                {level.key !== 'facility' && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-2.5 mb-3 flex items-start gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden />
                    <div className="text-[10px] text-amber-300">
                      <strong>Cross-tier dependency:</strong> This level depends on facility-level LTV calculation.
                      Each facility&apos;s LTV (drawn_amount / collateral_value) must be computed first, then weighted by exposure and grouped at the {level.label} level.
                    </div>
                  </div>
                )}

                <InputTablePanel levelKey={level.key} />
                <JoinChainVisual levelKey={level.key} />
                <IngredientFieldsTable levelKey={level.key} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}


/* ────────────────────────────────────────────────────────────────────────────
 * SECTION: FACILITY CALCULATION EXAMPLE
 * ──────────────────────────────────────────────────────────────────────────── */

function FacilityCalcExample() {
  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">Live Calculation Example — Facility Level</div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <StepTypeBadge type="SOURCING" />
          <div className="mt-2">
            <div className="text-[9px] text-gray-500">FROM L2.facility_exposure_snapshot</div>
            <div className="text-xs text-gray-300 mt-1">drawn_amount</div>
            <div className="text-lg font-bold text-amber-300 font-mono mt-1">$120,000,000</div>
          </div>
        </div>

        <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
          <StepTypeBadge type="SOURCING" />
          <div className="mt-2">
            <div className="text-[9px] text-gray-500">FROM L2.collateral_snapshot (SUM)</div>
            <div className="text-xs text-gray-300 mt-1">current_valuation_usd</div>
            <div className="text-lg font-bold text-violet-300 font-mono mt-1">$50,000,000</div>
            <div className="text-[9px] text-gray-600 mt-0.5">3 collateral items summed via GROUP BY facility_id, as_of_date</div>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <StepTypeBadge type="CALCULATION" />
          <div className="mt-2">
            <div className="text-[9px] text-gray-500">LTV = drawn_amount / collateral_value</div>
            <div className="text-xs text-gray-300 mt-1">$120M / $50M</div>
            <div className="text-2xl font-bold text-red-400 font-mono mt-1">240%</div>
            <div className="text-[9px] text-red-400/80 mt-0.5">Above 100% = negative equity territory</div>
          </div>
        </div>
      </div>

      <InsightCallout>
        <strong>Collateral summing is a hidden aggregation.</strong> Even at the facility level, collateral_snapshot may contain
        multiple rows per facility (e.g., 3 properties pledged). The engine runs <code className="text-amber-300">SUM(current_valuation_usd)
        GROUP BY facility_id, as_of_date</code> before dividing. This makes facility-level LTV technically a HYBRID step (source + aggregate),
        though the primary operation is the ratio calculation.
      </InsightCallout>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * SECTION: DASHBOARD CONSUMPTION
 * ──────────────────────────────────────────────────────────────────────────── */

function DashboardConsumption() {
  const [selectedLevel, setSelectedLevel] = useState('portfolio');

  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-300">1</span>
            Select Dimension
          </div>
          <div className="space-y-1">
            {ROLLUP_LEVELS.map((level) => {
              const Icon = level.icon;
              const active = selectedLevel === level.key;
              return (
                <button
                  key={level.key}
                  onClick={() => setSelectedLevel(level.key)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    active
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                      : 'bg-white/[0.02] border border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                  {level.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-300">2</span>
            Dashboard Output
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <LayoutDashboard className="w-4 h-4 text-emerald-400" aria-hidden />
              <span className="text-xs font-bold text-white">Ready to Connect</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Metric</span><span className="text-white font-medium">LTV (%)</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Level</span><span className="text-white font-medium">{ROLLUP_LEVELS.find((l) => l.key === selectedLevel)?.label}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Display Name</span><span className="text-white font-medium">{ROLLUP_LEVELS.find((l) => l.key === selectedLevel)?.dashboardName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">L3 Table</span><span className="font-mono text-emerald-300">metric_value_fact</span></div>
              <div className="flex justify-between"><span className="text-gray-500">SQL Required</span><span className="text-emerald-400 font-bold">None</span></div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-emerald-400">
              <Zap className="w-3 h-3 flex-shrink-0" aria-hidden />
              <span>Platform handles the join &mdash; no SQL, no guesswork</span>
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
    <div className="rounded-xl border border-gray-800 bg-white/[0.01] p-4 mt-6">
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-3">Legend</div>
      <div className="flex flex-wrap gap-4">
        <span className="flex items-center gap-1.5 text-[10px] text-amber-300"><span className="w-2 h-2 rounded-full bg-amber-500" />L2 Snapshot (time-series data)</span>
        <span className="flex items-center gap-1.5 text-[10px] text-blue-300"><span className="w-2 h-2 rounded-full bg-blue-500" />L1 Reference (master data)</span>
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-300"><span className="w-2 h-2 rounded-full bg-emerald-500" />L3 Output (calculated)</span>
        <StepTypeBadge type="SOURCING" />
        <StepTypeBadge type="CALCULATION" />
        <StepTypeBadge type="HYBRID" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT
 * ──────────────────────────────────────────────────────────────────────────── */

export default function LTVLineageView() {
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);


  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-0">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-blue-400" aria-hidden />
            <h2 className="text-xl font-bold text-white">Deep-Dive: How LTV Rolls Up</h2>
          </div>
          <p className="text-sm text-gray-500">
            End-to-end data sourcing, table traversal, calculation, and rollup from Facility to Line of Business.
            Every step shows <em>where</em> the data comes from, <em>how</em> tables are joined, and <em>what type</em> of operation is performed.
          </p>
        </div>

        {/* STEP 1: METRIC DEFINITION */}
        <section>
          <SectionHeading
            icon={Calculator}
            step="Step 1 — Metric Definition"
            layerColor="bg-blue-600"
            title="Loan-to-Value Ratio (LTV)"
            subtitle="Exposure / Collateral Value — lower is better"
          />
          <MetricDefinition />
        </section>

        <FlowArrow label="Which tables provide the data?" />

        {/* STEP 2: SOURCE & REFERENCE TABLES */}
        <section>
          <SectionHeading
            icon={Database}
            step="Step 2 — Source & Reference Tables"
            layerColor="bg-amber-600"
            title="Data Tables Required"
            subtitle="Snapshot tables for values, reference tables for dimensional anchoring and hierarchy traversal"
          />
          <SourceTablesOverview />
        </section>

        <FlowArrow label="How are the tables connected?" />

        {/* STEP 3: JOIN MAP */}
        <section>
          <SectionHeading
            icon={Network}
            step="Step 3 — Table Traversal Map"
            layerColor="bg-cyan-600"
            title="How Tables Are Joined"
            subtitle="FK chain from exposure data through collateral, facility master, and LoB hierarchy"
          />
          <JoinMapVisual />
          <InsightCallout>
            <strong>Five tables, five join edges.</strong> The core LTV join starts from{' '}
            <code className="text-amber-300">facility_exposure_snapshot</code> and branches two ways:
            left to <code className="text-amber-300">collateral_snapshot</code> (for the denominator),
            and right through <code className="text-blue-300">facility_master</code> to{' '}
            <code className="text-blue-300">counterparty</code> and{' '}
            <code className="text-blue-300">enterprise_business_taxonomy</code> (for rollup grouping).
            The taxonomy table self-joins to walk from desk to portfolio to LoB.
          </InsightCallout>
        </section>

        <FlowArrow label="How is LTV calculated at the facility level?" />

        {/* STEP 4: CALCULATION */}
        <section>
          <SectionHeading
            icon={Zap}
            step="Step 4 — Facility-Level Calculation"
            layerColor="bg-emerald-600"
            title="LTV Calculation"
            subtitle="Direct ratio at facility level — T2 authority (source + validate)"
          />
          <FacilityCalcExample />
        </section>

        <FlowArrow label="How does it aggregate up the hierarchy?" />

        {/* STEP 5: HIERARCHY OVERVIEW */}
        <section>
          <SectionHeading
            icon={GitBranch}
            step="Step 5 — Hierarchy Overview & Rollup"
            layerColor="bg-emerald-600"
            title="Rollup Pyramid"
            subtitle="Click any level to see join paths, input tables, ingredient fields, and cross-tier dependencies"
          />

          <div className="mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <Link2 className="w-3 h-3" aria-hidden />
              Facility &rarr; Counterparty &rarr; Desk &rarr; Portfolio &rarr; LoB &mdash; click to expand
            </div>
          </div>
          <RollupPyramid expandedLevel={expandedLevel} onToggle={(k) => setExpandedLevel(expandedLevel === k ? null : k)} />

          <FlowArrow label="Watch how the tables connect for each dimension" />

          <TableTraversalDemo />
        </section>

        <FlowArrow label="Dashboard builder selects dimension" />

        {/* STEP 6: DASHBOARD */}
        <section>
          <SectionHeading
            icon={LayoutDashboard}
            step="Step 6 — Dashboard Consumption"
            layerColor="bg-pink-600"
            title="Self-Service Connection"
            subtitle="Pick the dimension, build — no SQL needed"
          />
          <DashboardConsumption />
        </section>

        <FooterLegend />
      </main>
    </div>
  );
}
