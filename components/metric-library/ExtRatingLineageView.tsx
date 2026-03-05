'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Calculator,
  Briefcase,
  ArrowDown,
  CheckCircle2,
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
  AlertTriangle,
  Play,
  Sparkles,
  RefreshCw,
  ArrowRight,
  FileText,
  Star,
  Hash,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
 * STEP TYPE — every step is labeled SOURCING, CALCULATION, or HYBRID
 * ──────────────────────────────────────────────────────────────────────────── */

type StepType = 'SOURCING' | 'CALCULATION' | 'HYBRID';

const STEP_TYPE_STYLES: Record<StepType, { bg: string; text: string; border: string; label: string }> = {
  SOURCING:    { bg: 'bg-cyan-500/15',   text: 'text-cyan-300',    border: 'border-cyan-500/30',    label: 'Sourcing' },
  CALCULATION: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', label: 'Calculation' },
  HYBRID:      { bg: 'bg-amber-500/15',  text: 'text-amber-300',   border: 'border-amber-500/30',   label: 'Hybrid (Source + Average)' },
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
 * ROLLUP LEVELS — Counterparty → Desk → Portfolio → Business Segment
 *
 * Facility level is N/A for external ratings (ratings are assigned to
 * obligors/counterparties, not individual facilities).
 * ──────────────────────────────────────────────────────────────────────────── */

const ROLLUP_LEVELS = [
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    desc: 'Direct Lookup — retrieve the most recent external rating from counterparty_rating_observation',
    method: 'Direct Lookup',
    purpose: 'Obligor creditworthiness from external agency perspective',
    tier: 'T2',
    stepType: 'SOURCING' as StepType,
    dashboardName: 'External Rating',
    formula: 'rating_value FROM counterparty_rating_observation WHERE rating_type = \'EXTERNAL\' AND MAX(as_of_date)',
    formulaDetail: 'Look up the most recent external rating observation for each counterparty. If multiple agencies rated the same counterparty, select by MIN(priority_rank) from rating_source. JOIN rating_scale_dim to resolve display label.',
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    desc: 'Notch Average — convert each counterparty rating to a numeric notch, average, round, and reverse-lookup the rating label',
    method: 'Arithmetic Average of Rating Notches',
    purpose: 'Book-level credit quality indicator',
    tier: 'T3',
    stepType: 'CALCULATION' as StepType,
    dashboardName: 'Avg. External Rating',
    formula: 'ROUND(AVG(rating_notch)) → reverse lookup rating_value',
    formulaDetail: 'Collect distinct counterparties under this L3 desk via enterprise_business_taxonomy → facility_master. For each counterparty, look up rating_notch from rating_scale_dim. Average the notch values, round to nearest integer, reverse-lookup to display label using scale_type = EXTERNAL_SP.',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    desc: 'Notch Average — same as desk, but grouping by L2 portfolio including child L3 segments',
    method: 'Arithmetic Average of Rating Notches',
    purpose: 'ALCO credit quality reporting',
    tier: 'T3',
    stepType: 'CALCULATION' as StepType,
    dashboardName: 'External Rating (Avg.)',
    formula: 'ROUND(AVG(rating_notch)) → reverse lookup rating_value',
    formulaDetail: 'Same notch-averaging as desk, but grouping by L2 portfolio via parent_segment_id traversal. Includes all child L3 segments.',
  },
  {
    key: 'lob',
    label: 'Business Segment',
    icon: PieChart,
    desc: 'Notch Average — same as desk/portfolio, but at L1 department level including all descendant segments',
    method: 'Arithmetic Average of Rating Notches',
    purpose: 'Enterprise credit quality monitoring',
    tier: 'T3',
    stepType: 'CALCULATION' as StepType,
    dashboardName: 'External Rating (Avg.)',
    formula: 'ROUND(AVG(rating_notch)) → reverse lookup rating_value',
    formulaDetail: 'Same notch-averaging at the highest organizational level. Traverse enterprise_business_taxonomy to root (L1) and include all descendants.',
  },
] as const;

/* ────────────────────────────────────────────────────────────────────────────
 * NOTCH SCALE — S&P rating to numeric notch mapping (for reference display)
 * ──────────────────────────────────────────────────────────────────────────── */

const NOTCH_SCALE = [
  { rating: 'AAA',  notch: 1,  ig: true,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { rating: 'AA+',  notch: 2,  ig: true,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { rating: 'AA',   notch: 3,  ig: true,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { rating: 'AA-',  notch: 4,  ig: true,  color: 'text-emerald-300', bg: 'bg-emerald-500/10' },
  { rating: 'A+',   notch: 5,  ig: true,  color: 'text-green-400',   bg: 'bg-green-500/10' },
  { rating: 'A',    notch: 6,  ig: true,  color: 'text-green-400',   bg: 'bg-green-500/10' },
  { rating: 'A-',   notch: 7,  ig: true,  color: 'text-green-300',   bg: 'bg-green-500/10' },
  { rating: 'BBB+', notch: 8,  ig: true,  color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
  { rating: 'BBB',  notch: 9,  ig: true,  color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
  { rating: 'BBB-', notch: 10, ig: true,  color: 'text-yellow-300',  bg: 'bg-yellow-500/10' },
  { rating: 'BB+',  notch: 11, ig: false, color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  { rating: 'BB',   notch: 12, ig: false, color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  { rating: 'BB-',  notch: 13, ig: false, color: 'text-amber-300',   bg: 'bg-amber-500/10' },
  { rating: 'B+',   notch: 14, ig: false, color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  { rating: 'B',    notch: 15, ig: false, color: 'text-orange-400',  bg: 'bg-orange-500/10' },
  { rating: 'B-',   notch: 16, ig: false, color: 'text-orange-300',  bg: 'bg-orange-500/10' },
  { rating: 'CCC+', notch: 17, ig: false, color: 'text-red-400',     bg: 'bg-red-500/10' },
  { rating: 'CCC',  notch: 18, ig: false, color: 'text-red-400',     bg: 'bg-red-500/10' },
  { rating: 'CCC-', notch: 19, ig: false, color: 'text-red-300',     bg: 'bg-red-500/10' },
  { rating: 'CC',   notch: 20, ig: false, color: 'text-red-300',     bg: 'bg-red-500/10' },
  { rating: 'C',    notch: 21, ig: false, color: 'text-red-200',     bg: 'bg-red-500/10' },
  { rating: 'D',    notch: 22, ig: false, color: 'text-red-200',     bg: 'bg-red-500/10' },
];

/* ────────────────────────────────────────────────────────────────────────────
 * SOURCE / REFERENCE TABLES per level — "ingredient fields"
 * ──────────────────────────────────────────────────────────────────────────── */

interface IngredientField {
  layer: 'L1' | 'L2';
  table: string;
  field: string;
  description: string;
  role: 'rating_value' | 'notch' | 'filter' | 'grouping_fk' | 'hierarchy' | 'tiebreak';
  sampleValue: string;
}

const INGREDIENT_FIELDS: Record<string, IngredientField[]> = {
  counterparty: [
    { layer: 'L2', table: 'counterparty_rating_observation', field: 'rating_grade_id', description: 'FK to canonical rating grade', role: 'rating_value', sampleValue: '15' },
    { layer: 'L2', table: 'counterparty_rating_observation', field: 'rating_type', description: 'INTERNAL or EXTERNAL — filter for external', role: 'filter', sampleValue: 'EXTERNAL' },
    { layer: 'L2', table: 'counterparty_rating_observation', field: 'as_of_date', description: 'Select most recent observation', role: 'filter', sampleValue: '2025-03-31' },
    { layer: 'L1', table: 'rating_scale_dim', field: 'rating_value', description: 'Display label (e.g., BBB+)', role: 'rating_value', sampleValue: 'BBB+' },
    { layer: 'L1', table: 'rating_source', field: 'priority_rank', description: 'Agency precedence for tie-breaking', role: 'tiebreak', sampleValue: '1' },
  ],
  desk: [
    { layer: 'L2', table: 'counterparty_rating_observation', field: 'rating_grade_id', description: 'FK to canonical rating grade', role: 'rating_value', sampleValue: '15' },
    { layer: 'L2', table: 'counterparty_rating_observation', field: 'rating_type', description: 'Filter for EXTERNAL', role: 'filter', sampleValue: 'EXTERNAL' },
    { layer: 'L1', table: 'rating_scale_dim', field: 'rating_notch', description: 'Numeric notch for averaging', role: 'notch', sampleValue: '8' },
    { layer: 'L1', table: 'rating_scale_dim', field: 'rating_value', description: 'Reverse-lookup target', role: 'rating_value', sampleValue: 'BBB+' },
    { layer: 'L1', table: 'facility_master', field: 'lob_segment_id', description: 'FK to business taxonomy — desk resolution', role: 'grouping_fk', sampleValue: '303' },
    { layer: 'L1', table: 'facility_master', field: 'counterparty_id', description: 'FK to counterparty', role: 'grouping_fk', sampleValue: '67890' },
    { layer: 'L1', table: 'enterprise_business_taxonomy', field: 'managed_segment_id', description: 'L3 leaf segment node', role: 'hierarchy', sampleValue: '303' },
    { layer: 'L1', table: 'enterprise_business_taxonomy', field: 'tree_level', description: 'Filter for L3', role: 'hierarchy', sampleValue: 'L3' },
  ],
  portfolio: [
    { layer: 'L2', table: 'counterparty_rating_observation', field: 'rating_grade_id', description: 'FK to canonical rating grade', role: 'rating_value', sampleValue: '15' },
    { layer: 'L1', table: 'rating_scale_dim', field: 'rating_notch', description: 'Numeric notch for averaging', role: 'notch', sampleValue: '8' },
    { layer: 'L1', table: 'rating_scale_dim', field: 'rating_value', description: 'Reverse-lookup target', role: 'rating_value', sampleValue: 'BBB+' },
    { layer: 'L1', table: 'facility_master', field: 'lob_segment_id', description: 'FK to business taxonomy', role: 'grouping_fk', sampleValue: '303' },
    { layer: 'L1', table: 'enterprise_business_taxonomy', field: 'parent_segment_id', description: 'Traverse up from L3 to L2', role: 'hierarchy', sampleValue: '30' },
  ],
  lob: [
    { layer: 'L2', table: 'counterparty_rating_observation', field: 'rating_grade_id', description: 'FK to canonical rating grade', role: 'rating_value', sampleValue: '15' },
    { layer: 'L1', table: 'rating_scale_dim', field: 'rating_notch', description: 'Numeric notch for averaging', role: 'notch', sampleValue: '8' },
    { layer: 'L1', table: 'rating_scale_dim', field: 'rating_value', description: 'Reverse-lookup target', role: 'rating_value', sampleValue: 'BBB+' },
    { layer: 'L1', table: 'facility_master', field: 'lob_segment_id', description: 'FK to business taxonomy', role: 'grouping_fk', sampleValue: '303' },
    { layer: 'L1', table: 'enterprise_business_taxonomy', field: 'parent_segment_id', description: 'Recursive traversal to root (L1)', role: 'hierarchy', sampleValue: 'NULL' },
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
 * JOIN CHAINS — FK traversal paths per level
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
}

const JOIN_CHAINS: Record<string, JoinChainData> = {
  counterparty: {
    hops: [
      { from: 'counterparty_rating_observation', fromLayer: 'L2', to: 'rating_scale_dim', toLayer: 'L1', joinKey: 'rating_grade_id', note: 'Resolve rating grade to display label and notch', stepType: 'SOURCING' },
      { from: 'counterparty_rating_observation', fromLayer: 'L2', to: 'rating_source', toLayer: 'L1', joinKey: 'rating_source_id', note: 'Get agency priority for tie-breaking when multiple agencies rated same counterparty', stepType: 'SOURCING' },
    ],
    aggregation: 'Direct lookup — no aggregation, just filter for MAX(as_of_date) and rating_type = EXTERNAL',
    result: 'One external rating label per counterparty',
  },
  desk: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'facility_master', toLayer: 'L1', joinKey: 'lob_segment_id', note: 'Find all facilities in this L3 desk', stepType: 'SOURCING' },
      { from: 'facility_master', fromLayer: 'L1', to: 'counterparty_rating_observation', toLayer: 'L2', joinKey: 'counterparty_id', note: 'Get external rating observations for each distinct counterparty', stepType: 'SOURCING' },
      { from: 'counterparty_rating_observation', fromLayer: 'L2', to: 'rating_scale_dim', toLayer: 'L1', joinKey: 'rating_grade_id', note: 'Convert each rating to a numeric notch', stepType: 'CALCULATION' },
    ],
    aggregation: 'AVG(notch) → ROUND → reverse lookup rating_value from rating_scale_dim',
    result: 'One averaged external rating label per L3 desk',
  },
  portfolio: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'facility_master', toLayer: 'L1', joinKey: 'lob_segment_id (via parent_segment_id traversal)', note: 'Find all facilities in L2 portfolio (including child L3 segments)', stepType: 'SOURCING' },
      { from: 'facility_master', fromLayer: 'L1', to: 'counterparty_rating_observation', toLayer: 'L2', joinKey: 'counterparty_id', note: 'Get external ratings for distinct counterparties', stepType: 'SOURCING' },
      { from: 'counterparty_rating_observation', fromLayer: 'L2', to: 'rating_scale_dim', toLayer: 'L1', joinKey: 'rating_grade_id', note: 'Convert to notch and average', stepType: 'CALCULATION' },
    ],
    aggregation: 'AVG(notch) → ROUND → reverse lookup rating_value',
    result: 'One averaged external rating per L2 portfolio',
  },
  lob: {
    hops: [
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'facility_master', toLayer: 'L1', joinKey: 'lob_segment_id (recursive descendant traversal)', note: 'Find all facilities across all descendant L2/L3 segments', stepType: 'SOURCING' },
      { from: 'facility_master', fromLayer: 'L1', to: 'counterparty_rating_observation', toLayer: 'L2', joinKey: 'counterparty_id', note: 'Get external ratings for distinct counterparties', stepType: 'SOURCING' },
      { from: 'counterparty_rating_observation', fromLayer: 'L2', to: 'rating_scale_dim', toLayer: 'L1', joinKey: 'rating_grade_id', note: 'Convert to notch and average', stepType: 'CALCULATION' },
    ],
    aggregation: 'AVG(notch) → ROUND → reverse lookup rating_value',
    result: 'One averaged external rating per L1 Business Segment',
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * INPUT TABLES — source tables by function
 * ──────────────────────────────────────────────────────────────────────────── */

const INPUT_TABLES = {
  reference: [
    { name: 'rating_scale_dim', layer: 'L1', purpose: 'Master rating dimension — notch scale, display labels, investment grade flag' },
    { name: 'rating_source', layer: 'L1', purpose: 'Agency registry — priority ranking for multi-agency tie-breaking' },
    { name: 'facility_master', layer: 'L1', purpose: 'Facility identity — links facilities to counterparties and business segments' },
    { name: 'enterprise_business_taxonomy', layer: 'L1', purpose: 'Organizational hierarchy — desk/portfolio/LoB tree traversal' },
  ],
  snapshot: [
    { name: 'counterparty_rating_observation', layer: 'L2', purpose: 'Point-in-time external rating observations — rating_grade_id, rating_type, as_of_date' },
  ],
};

/* ────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────────── */

function SectionHeading({ icon: Icon, title, id }: { icon: React.ElementType; title: string; id?: string }) {
  return (
    <div id={id} className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 rounded-lg bg-white/5 border border-gray-800 flex items-center justify-center">
        <Icon className="w-4 h-4 text-gray-400" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-2">
      <ArrowDown className="w-4 h-4 text-gray-600" />
    </div>
  );
}

function InsightCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3 mt-3">
      <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
      </div>
      <div className="text-xs text-gray-300 leading-relaxed">{children}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Props
 * ──────────────────────────────────────────────────────────────────────────── */

interface ExtRatingLineageViewProps {
  onStartDemo?: () => void;
  demoExpandedLevel?: string | null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT
 * ──────────────────────────────────────────────────────────────────────────── */

export default function ExtRatingLineageView({ onStartDemo, demoExpandedLevel }: ExtRatingLineageViewProps) {
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  // Allow demo to override expanded level
  const effectiveExpandedLevel = demoExpandedLevel !== undefined ? demoExpandedLevel : expandedLevel;

  useEffect(() => {
    if (demoExpandedLevel !== undefined) {
      setExpandedLevel(demoExpandedLevel);
    }
  }, [demoExpandedLevel]);

  const toggleLevel = (key: string) => {
    setExpandedLevel((prev) => (prev === key ? null : key));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-0">
        {/* Header */}
        <div className="mb-4" data-demo="header">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-blue-400" aria-hidden />
            <h2 className="text-xl font-bold text-white">Deep-Dive: External Credit Rating Lineage</h2>
          </div>
          <p className="text-sm text-gray-500">
            End-to-end data sourcing, notch conversion, averaging, and rollup from Counterparty to Business Segment.
            External ratings are assigned at the obligor (counterparty) level — facility-level ratings do not exist.
          </p>
          {onStartDemo && (
            <button
              onClick={onStartDemo}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
            >
              <Play className="w-3.5 h-3.5" /> Start Guided Demo
            </button>
          )}
        </div>

        {/* Back link */}
        <div className="mb-6">
          <a
            href="/metrics/library"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            &larr; Back to Metric Library
          </a>
        </div>

        {/* ── Step 1: Metric Definition ──────────────────────────────────────── */}
        <section className="rounded-xl border border-gray-800 bg-white/[0.02] p-5 mb-4" data-demo="step1">
          <SectionHeading icon={Star} title="Step 1 — Metric Definition" />
          <div className="space-y-3 text-xs text-gray-400 leading-relaxed">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500 text-[10px] uppercase tracking-wider">Metric Name</span>
                <p className="text-gray-200 font-medium mt-0.5">External Credit Rating</p>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase tracking-wider">Type</span>
                <p className="text-gray-200 font-medium mt-0.5">String (Ordinal)</p>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase tracking-wider">Domain</span>
                <p className="text-gray-200 font-medium mt-0.5">Credit Risk</p>
              </div>
              <div>
                <span className="text-gray-500 text-[10px] uppercase tracking-wider">Regulatory</span>
                <p className="text-gray-200 font-medium mt-0.5">FR Y-14Q, Basel III, CCAR</p>
              </div>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] uppercase tracking-wider">Definition</span>
              <p className="text-gray-300 mt-0.5">
                Current external credit agency rating (S&P, Moody&apos;s, Fitch) assigned to the obligor.
                At counterparty level: direct lookup. At higher levels: notch-based arithmetic average with rounding.
              </p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-white/[0.02] px-4 py-3">
              <span className="text-gray-500 text-[10px] uppercase tracking-wider block mb-1">Aggregation Formula (Desk / Portfolio / LoB)</span>
              <code className="text-emerald-400 text-xs font-mono">
                ROUND(AVG(rating_notch)) → reverse lookup rating_value from rating_scale_dim
              </code>
            </div>
          </div>

          <InsightCallout>
            Unlike numeric metrics (LTV, DSCR, Interest Income), external ratings are <strong>ordinal strings</strong> (AAA, BB+, CCC).
            Averaging requires converting to numeric notches first, then converting back.
            The facility level is <strong>not applicable</strong> — ratings are assigned to obligors, not individual loans.
          </InsightCallout>
        </section>

        <FlowArrow />

        {/* ── Step 2: Notch Scale Reference ──────────────────────────────────── */}
        <section className="rounded-xl border border-gray-800 bg-white/[0.02] p-5 mb-4" data-demo="notch-scale">
          <SectionHeading icon={Hash} title="Step 2 — Rating-to-Notch Scale (rating_scale_dim)" />
          <p className="text-xs text-gray-400 mb-3">
            The <code className="text-cyan-400">rating_scale_dim</code> table maps every rating label to a standardized numeric notch (1 = best, 22 = worst).
            This enables arithmetic operations on ordinal ratings.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {/* Investment Grade */}
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Investment Grade</div>
              <div className="space-y-0.5">
                {NOTCH_SCALE.filter(n => n.ig).map(n => (
                  <div key={n.notch} className="flex items-center justify-between text-[10px] font-mono">
                    <span className={n.color}>{n.rating}</span>
                    <span className="text-gray-500">notch {n.notch}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Sub-Investment Grade */}
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-red-400 mb-2">Sub-Investment Grade</div>
              <div className="space-y-0.5">
                {NOTCH_SCALE.filter(n => !n.ig).map(n => (
                  <div key={n.notch} className="flex items-center justify-between text-[10px] font-mono">
                    <span className={n.color}>{n.rating}</span>
                    <span className="text-gray-500">notch {n.notch}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <InsightCallout>
            The notch scale is the bridge between string ratings and numeric averaging.
            A lower notch = better credit quality. The investment grade boundary falls between <strong>BBB- (10)</strong> and <strong>BB+ (11)</strong>.
          </InsightCallout>
        </section>

        <FlowArrow />

        {/* ── Step 3: Source Tables ───────────────────────────────────────────── */}
        <section className="rounded-xl border border-gray-800 bg-white/[0.02] p-5 mb-4" data-demo="step2">
          <SectionHeading icon={Database} title="Step 3 — Source Tables" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 mb-2">L1 Reference Tables</div>
              {INPUT_TABLES.reference.map(t => (
                <div key={t.name} className="rounded-lg border border-gray-800 bg-white/[0.02] px-3 py-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-cyan-500/70 border border-cyan-500/30 rounded px-1.5 py-0">{t.layer}</span>
                    <span className="text-xs font-mono text-gray-200">{t.name}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t.purpose}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-blue-400 mb-2">L2 Snapshot Tables</div>
              {INPUT_TABLES.snapshot.map(t => (
                <div key={t.name} className="rounded-lg border border-gray-800 bg-white/[0.02] px-3 py-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-blue-500/70 border border-blue-500/30 rounded px-1.5 py-0">{t.layer}</span>
                    <span className="text-xs font-mono text-gray-200">{t.name}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t.purpose}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FlowArrow />

        {/* ── Step 4: Averaging Mechanism ─────────────────────────────────────── */}
        <section className="rounded-xl border border-gray-800 bg-white/[0.02] p-5 mb-4" data-demo="step4">
          <SectionHeading icon={Calculator} title="Step 4 — Notch Averaging Mechanism" />
          <p className="text-xs text-gray-400 mb-3">
            At desk, portfolio, and business segment levels, external ratings are averaged using this pipeline:
          </p>
          <div className="space-y-2">
            {[
              { step: '1', label: 'Collect', desc: 'Identify distinct counterparties under this aggregation level', icon: Users },
              { step: '2', label: 'Lookup', desc: 'For each counterparty, retrieve external rating from counterparty_rating_observation', icon: Eye },
              { step: '3', label: 'Convert', desc: 'Map each rating to numeric notch via rating_scale_dim (e.g., BBB+ → 8, A- → 7)', icon: Hash },
              { step: '4', label: 'Average', desc: 'Compute arithmetic mean of notch values: AVG(8, 7) = 7.5', icon: Calculator },
              { step: '5', label: 'Round', desc: 'Round to nearest integer: ROUND(7.5) = 8', icon: CheckCircle2 },
              { step: '6', label: 'Reverse', desc: 'Look up the rating label for notch 8 in rating_scale_dim: 8 → "BBB+"', icon: ArrowRight },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3 rounded-lg border border-gray-800 bg-white/[0.02] px-3 py-2">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[9px] font-bold text-emerald-400">{s.step}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-200">{s.label}</span>
                  <p className="text-[10px] text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <FlowArrow />

        {/* ── Step 5: Facility Level N/A ──────────────────────────────────────── */}
        <section className="rounded-xl border border-gray-800/50 bg-white/[0.01] p-4 mb-4" data-demo="facility-na">
          <div className="flex items-center gap-2">
            <Table2 className="w-4 h-4 text-gray-600" />
            <span className="text-xs font-semibold text-gray-500">Facility Level</span>
            <span className="text-[9px] font-bold text-gray-600 border border-gray-700 rounded px-1.5 py-0">N/A</span>
          </div>
          <p className="text-[10px] text-gray-600 mt-1 ml-6">
            External credit ratings are assigned at the obligor (counterparty) level, not per individual loan/facility.
            All facilities under a counterparty inherit the same external rating.
          </p>
        </section>

        <FlowArrow />

        {/* ── Step 6: Rollup Levels ──────────────────────────────────────────── */}
        <section className="mb-4" data-demo="rollup-levels">
          <SectionHeading icon={Layers} title="Step 5 — Rollup Hierarchy" />
          <p className="text-xs text-gray-400 mb-3">
            Click each level to expand the detailed join chain, ingredient fields, and aggregation logic.
          </p>

          <div className="space-y-2">
            {ROLLUP_LEVELS.map((level, idx) => {
              const isExpanded = effectiveExpandedLevel === level.key;
              const LevelIcon = level.icon;
              const chain = JOIN_CHAINS[level.key];
              const fields = INGREDIENT_FIELDS[level.key];

              return (
                <div
                  key={level.key}
                  className="rounded-xl border border-gray-800 bg-white/[0.02] overflow-hidden"
                  data-demo={`rollup-${level.key}`}
                >
                  {/* Accordion header */}
                  <button
                    onClick={() => toggleLevel(level.key)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-gray-800 flex items-center justify-center flex-shrink-0">
                      <LevelIcon className="w-4 h-4 text-gray-400" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-200">{level.label}</span>
                        <StepTypeBadge type={level.stepType} />
                        <span className="text-[9px] text-gray-600 border border-gray-700 rounded px-1.5 py-0">{level.tier}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">{level.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-gray-600 font-mono">{level.dashboardName}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-800 space-y-4">
                      {/* Formula */}
                      <div className="mt-3 rounded-lg border border-gray-800 bg-black/30 px-4 py-3">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Formula</span>
                        <code className="block text-xs text-emerald-400 font-mono mt-1">{level.formula}</code>
                        <p className="text-[10px] text-gray-500 mt-1">{level.formulaDetail}</p>
                      </div>

                      {/* Join chain */}
                      {chain && (
                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2">Join Chain</div>
                          <div className="space-y-1.5">
                            {chain.hops.map((hop, hopIdx) => (
                              <div key={hopIdx} className="flex items-start gap-2 text-[10px]">
                                <Link2 className="w-3 h-3 text-gray-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="text-cyan-400 font-mono">{hop.from}</span>
                                  <span className="text-gray-600 mx-1">→</span>
                                  <span className="text-blue-400 font-mono">{hop.to}</span>
                                  <span className="text-gray-600 ml-1">ON {hop.joinKey}</span>
                                  <p className="text-gray-500">{hop.note}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 text-[10px] text-gray-500">
                            <span className="text-gray-400 font-medium">Aggregation:</span> {chain.aggregation}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            <span className="text-gray-400 font-medium">Result:</span> {chain.result}
                          </div>
                        </div>
                      )}

                      {/* Ingredient fields table */}
                      {fields && fields.length > 0 && (
                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2">Ingredient Fields</div>
                          <div className="rounded-lg border border-gray-800 overflow-hidden">
                            <table className="w-full text-[10px]">
                              <thead>
                                <tr className="bg-white/[0.02]">
                                  <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Layer</th>
                                  <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Table.Field</th>
                                  <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Role</th>
                                  <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Sample</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fields.map((f, fi) => (
                                  <tr key={fi} className="border-t border-gray-800/50">
                                    <td className="px-2 py-1.5">
                                      <span className={`text-[8px] font-bold border rounded px-1 py-0 ${f.layer === 'L2' ? 'text-blue-400 border-blue-500/30' : 'text-cyan-400 border-cyan-500/30'}`}>
                                        {f.layer}
                                      </span>
                                    </td>
                                    <td className="px-2 py-1.5 font-mono text-gray-300">{f.table}.{f.field}</td>
                                    <td className="px-2 py-1.5 text-gray-500">{f.role}</td>
                                    <td className="px-2 py-1.5 font-mono text-gray-500">{f.sampleValue}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <FlowArrow />

        {/* ── Step 7: Dashboard Consumption ───────────────────────────────────── */}
        <section className="rounded-xl border border-gray-800 bg-white/[0.02] p-5 mb-4" data-demo="step6">
          <SectionHeading icon={Eye} title="Step 6 — Dashboard Consumption" />
          <div className="space-y-2">
            {ROLLUP_LEVELS.map((level) => (
              <div key={level.key} className="flex items-center justify-between rounded-lg border border-gray-800 bg-white/[0.02] px-3 py-2">
                <div className="flex items-center gap-2">
                  <level.icon className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-300">{level.label}</span>
                </div>
                <span className="text-xs font-mono text-gray-400">{level.dashboardName}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-3">
            Users select an aggregation level on the dashboard. The platform handles the notch conversion,
            averaging, rounding, and reverse-lookup behind the scenes.
          </p>
        </section>
      </main>
    </div>
  );
}
