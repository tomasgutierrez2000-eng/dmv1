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
  Scale,
  Building2,
  TrendingUp,
  BarChart3,
  Play,
  Network,
  Workflow,
  Search,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ──────────────────────────────────────────────────────────────────────────── */

interface NumeratorComponent {
  name: string;
  op: '+' | '−';
  field: string;
  table: string;
  value: number;
}

interface DenominatorComponent {
  name: string;
  field: string;
  table: string;
  value: number;
}

interface VariantData {
  id: string;
  label: string;
  product: string;
  subProduct: string;
  purpose: string;
  numeratorLabel: string;
  denominatorLabel: string;
  formula: string;
  numerator: number;
  denominator: number;
  result: string;
  resultNum: number;
  colorBorder: string;
  colorBg: string;
  colorText: string;
  colorAccent: string;
  numeratorComponents: NumeratorComponent[];
  denominatorComponents: DenominatorComponent[];
  calcTierFacility: string;
  calcTierRollup: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * VARIANT DATA — LTV Standard vs Stressed
 *
 * Numerator: facility_exposure_snapshot.drawn_amount
 * Denominator: collateral_snapshot.current_valuation_usd (Standard)
 *              collateral_snapshot.current_valuation_usd × (1 - haircut_pct) (Stressed)
 *
 * Math verified:
 *   Standard: $120,000,000 / $175,000,000 × 100 = 68.6%
 *   Stressed: $120,000,000 / $150,000,000 × 100 = 80.0%
 *     ($175M × (1 - 0.143) = $150,025,000 ≈ $150M)
 * ──────────────────────────────────────────────────────────────────────────── */

const STANDARD: VariantData = {
  id: 'standard',
  label: 'Standard LTV',
  product: 'Secured Lending',
  subProduct: 'CRE Multifamily',
  purpose: 'Quarterly Monitoring',
  numeratorLabel: 'Drawn Amount',
  denominatorLabel: 'Collateral Value',
  formula: 'Drawn ÷ Collateral × 100',
  numerator: 120000000,
  denominator: 175000000,
  result: '68.6%',
  resultNum: 68.6,
  colorBorder: 'border-teal-500/40',
  colorBg: 'bg-teal-500/10',
  colorText: 'text-teal-400',
  colorAccent: 'bg-teal-500',
  numeratorComponents: [
    { name: 'Drawn Amount', op: '+', field: 'drawn_amount', table: 'facility_exposure_snapshot', value: 120000000 },
  ],
  denominatorComponents: [
    { name: 'Property A — Sunrise Towers', field: 'current_valuation_usd', table: 'collateral_snapshot', value: 125000000 },
    { name: 'Property B — Parking Structure', field: 'current_valuation_usd', table: 'collateral_snapshot', value: 50000000 },
  ],
  calcTierFacility: 'T3',
  calcTierRollup: 'T3',
};

const STRESSED: VariantData = {
  id: 'stressed',
  label: 'Stressed LTV',
  product: 'Secured Lending',
  subProduct: 'CRE Multifamily',
  purpose: 'Stress Testing (CCAR/DFAST)',
  numeratorLabel: 'Drawn Amount',
  denominatorLabel: 'Stressed Collateral',
  formula: 'Drawn ÷ Stressed Collateral × 100',
  numerator: 120000000,
  denominator: 150000000,
  result: '80.0%',
  resultNum: 80.0,
  colorBorder: 'border-orange-500/40',
  colorBg: 'bg-orange-500/10',
  colorText: 'text-orange-400',
  colorAccent: 'bg-orange-500',
  numeratorComponents: [
    { name: 'Drawn Amount', op: '+', field: 'drawn_amount', table: 'facility_exposure_snapshot', value: 120000000 },
  ],
  denominatorComponents: [
    { name: 'Property A — Sunrise Towers (14.3% haircut)', field: 'current_valuation_usd', table: 'collateral_snapshot', value: 107125000 },
    { name: 'Property B — Parking Structure (14.3% haircut)', field: 'current_valuation_usd', table: 'collateral_snapshot', value: 42850000 },
  ],
  calcTierFacility: 'T3',
  calcTierRollup: 'T3',
};

const ROLLUP_LEVELS = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Table2,
    desc: 'Direct Calculation — drawn amount ÷ collateral value for one loan',
    method: 'Direct Calculation',
    purpose: 'Covenant compliance, underwriting',
    tier: 'T3',
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    desc: 'Exposure-Weighted Average — weight facility LTVs by drawn amount (secured only)',
    method: 'Exposure-Weighted Average (Secured Only)',
    purpose: 'Obligor-level collateral assessment',
    tier: 'T3',
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    desc: 'Exposure-Weighted Average — across all secured facilities on the desk',
    method: 'Exposure-Weighted Average',
    purpose: 'Book quality monitoring',
    tier: 'T3',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    desc: 'Exposure-Weighted Average + Distribution buckets',
    method: 'Exposure-Weighted Average + Distribution',
    purpose: 'Portfolio health trending',
    tier: 'T3',
  },
  {
    key: 'lob',
    label: 'Line of Business',
    icon: PieChart,
    desc: 'Exposure-Weighted Average — directional early warning only',
    method: 'Exposure-Weighted Average',
    purpose: 'Directional early warning',
    tier: 'T3',
  },
] as const;

/** L2 fields in facility_exposure_snapshot — numerator source */
const L2_FIELDS_FES = [
  { field: 'drawn_amount', desc: 'Outstanding drawn balance', standard: true, stressed: true },
  { field: 'committed_amount', desc: 'Total committed facility amount', standard: false, stressed: false },
  { field: 'undrawn_amount', desc: 'Remaining undrawn commitment', standard: false, stressed: false },
];

/** L2 fields in collateral_snapshot — denominator source */
const L2_FIELDS_CS = [
  { field: 'current_valuation_usd', desc: 'Current market appraisal value', standard: true, stressed: true },
  { field: 'haircut_pct', desc: 'Stress haircut percentage (e.g. 14.3%)', standard: false, stressed: true },
  { field: 'eligible_collateral_amt', desc: 'Regulatory-eligible portion of valuation', standard: false, stressed: false },
  { field: 'collateral_type_code', desc: 'Asset class (RE, Securities, Equipment)', standard: true, stressed: true },
  { field: 'lien_priority', desc: 'First lien, second lien, etc.', standard: true, stressed: true },
];

/** L3 output tables that store LTV values */
const L3_OUTPUT_TABLES = [
  {
    table: 'metric_value_fact',
    desc: 'Generic metric storage — all LTV variants at every aggregation level (facility, counterparty, desk, portfolio, LoB)',
    fields: ['metric_id = LTV', 'variant_id', 'aggregation_level', 'facility_id | counterparty_id | lob_id', 'value', 'unit = %', 'display_format = 0.0%'],
    primary: true,
  },
  {
    table: 'lob_credit_quality_summary',
    desc: 'LoB-level credit quality — includes ltv_pct for LoB roll-ups',
    fields: ['lob_node_id', 'ltv_pct', 'avg_internal_risk_rating', 'pct_unsecured'],
    primary: false,
  },
  {
    table: 'lob_risk_ratio_summary',
    desc: 'LoB-level risk ratios — LTV alongside DSCR, FCCR, capital adequacy',
    fields: ['lob_node_id', 'ltv_pct', 'stressed_ltv_pct', 'dscr_value', 'capital_adequacy_ratio_pct'],
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
    desc: 'Facility-level analytics — ltv_pct and stressed_ltv_pct for drawer pop-ups',
    fields: ['facility_id', 'ltv_pct', 'stressed_ltv_pct', 'drawn_amount', 'collateral_value', 'counterparty_id'],
    primary: false,
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
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

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 1 — VARIANT DEFINITION CARD
 * ──────────────────────────────────────────────────────────────────────────── */

function VariantDefCard({ v }: { v: VariantData }) {
  return (
    <div className={`rounded-xl border ${v.colorBorder} ${v.colorBg} p-4`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2.5 h-2.5 rounded-full ${v.colorAccent}`} />
        <span className={`text-sm font-bold ${v.colorText}`}>{v.label}</span>
      </div>

      {/* Config */}
      <div className="space-y-1.5 text-xs">
        <Row label="Product" value={v.product} />
        <Row label="Sub-product" value={v.subProduct} />
        <Row label="Purpose" value={v.purpose} />
      </div>

      {/* Numerator */}
      <div data-demo={`num-section-${v.id}`} className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
          Numerator — {v.numeratorLabel}
        </div>
        <div className="space-y-1">
          {v.numeratorComponents.map((c, i) => (
            <div key={c.name} data-demo={`num-component-${v.id}-${i}`}>
              <ComponentRow name={c.name} op={c.op} value={c.value} field={c.field} table={c.table} />
            </div>
          ))}
        </div>
        <div data-demo={`num-total-${v.id}`} className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs font-bold">
          <span className={v.colorText}>{v.numeratorLabel}</span>
          <span className="text-white font-mono">{fmt(v.numerator)}</span>
        </div>
      </div>

      {/* Denominator */}
      <div data-demo={`den-section-${v.id}`} className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
          Denominator — {v.denominatorLabel}
        </div>
        <div className="space-y-1">
          {v.denominatorComponents.map((c, i) => (
            <div key={c.name} data-demo={`den-component-${v.id}-${i}`}>
              <ComponentRow name={c.name} op="+" value={c.value} field={c.field} table={c.table} />
            </div>
          ))}
        </div>
        <div data-demo={`den-total-${v.id}`} className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs font-bold">
          <span className={v.colorText}>{v.denominatorLabel}</span>
          <span className="text-white font-mono">{fmt(v.denominator)}</span>
        </div>
      </div>

      {/* Result */}
      <div data-demo={`result-${v.id}`} className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
        <code className="text-xs text-gray-400 font-mono">{v.formula}</code>
        <div className={`text-xl font-black ${v.colorText} tabular-nums`}>{v.result}</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-300 font-medium">{value}</span>
    </div>
  );
}

/* ── Column-level metadata for X-Ray mode ── */
const COLUMN_META: Record<string, { type: string; desc: string; filter?: string; fk?: string }> = {
  'facility_exposure_snapshot.drawn_amount': { type: 'DECIMAL(18,2)', desc: 'Outstanding drawn balance — how much the borrower has actually taken out', fk: 'facility_id → L1.facility_master' },
  'facility_exposure_snapshot.committed_amount': { type: 'DECIMAL(18,2)', desc: 'Total committed facility size — maximum the borrower can draw', fk: 'facility_id → L1.facility_master' },
  'collateral_snapshot.current_valuation_usd': { type: 'DECIMAL(18,2)', desc: 'Current appraised market value of collateral asset in USD', fk: 'collateral_asset_id → L1.collateral_asset_master' },
  'collateral_snapshot.haircut_pct': { type: 'DECIMAL(5,4)', desc: 'Stress haircut percentage — expected value loss under adverse scenario (e.g. 0.143 = 14.3%)', fk: 'collateral_asset_id → L1.collateral_asset_master' },
  'collateral_snapshot.eligible_collateral_amt': { type: 'DECIMAL(18,2)', desc: 'Regulatory-eligible portion of collateral value after Basel III eligibility rules', fk: 'collateral_asset_id → L1.collateral_asset_master' },
};

function ComponentRow({
  name,
  op,
  value,
  field,
  table,
}: {
  name: string;
  op: string;
  value: number;
  field: string;
  table: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = COLUMN_META[`${table}.${field}`];

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between text-xs group w-full text-left hover:bg-white/[0.03] rounded-lg px-1 py-0.5 -mx-1 transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={op === '+' ? 'text-emerald-400 flex-shrink-0' : 'text-red-400 flex-shrink-0'}>
            {op === '+' ? '+' : '−'}
          </span>
          <span className="text-gray-300 truncate">{name}</span>
          <svg className={`w-3 h-3 text-gray-600 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5l3 3 3-3" /></svg>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <code className="text-[9px] text-gray-600 font-mono hidden group-hover:inline transition-opacity" title={`L2.${table}.${field}`}>
            .{field}
          </code>
          <span className="text-gray-500 font-mono text-[10px]">{fmt(value)}</span>
        </div>
      </button>
      {expanded && meta && (
        <div className="ml-5 mt-1 mb-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-2.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">L2 Snapshot</span>
            <code className="text-[10px] font-mono text-amber-200">{table}.{field}</code>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[10px]">
            <span className="text-gray-600 font-medium">Type</span>
            <code className="text-gray-400 font-mono">{meta.type}</code>
            <span className="text-gray-600 font-medium">Description</span>
            <span className="text-gray-400">{meta.desc}</span>
            <span className="text-gray-600 font-medium">Sample</span>
            <span className="text-emerald-400 font-mono font-bold">{fmt(value)}</span>
            {meta.filter && (
              <>
                <span className="text-gray-600 font-medium">WHERE</span>
                <code className="text-purple-300 font-mono">{meta.filter}</code>
              </>
            )}
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
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 2 — L1 REFERENCE TABLES
 * ──────────────────────────────────────────────────────────────────────────── */

function ExpandableTableCard({
  name, scd, desc, fields, ltvRole, sampleRow, fks, isCore,
}: {
  name: string;
  scd: string;
  desc: string;
  fields: string[];
  ltvRole?: string;
  sampleRow?: Record<string, string>;
  fks?: { col: string; target: string }[];
  isCore?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const borderClass = isCore ? 'border-blue-500/30' : 'border-blue-500/20';
  const bgClass = isCore ? 'bg-blue-500/5' : 'bg-blue-500/[0.03]';

  return (
    <div className={`rounded-xl border ${borderClass} ${bgClass} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <code className={`text-xs font-bold font-mono ${isCore ? 'text-blue-300' : 'text-blue-300/80'}`}>L1.{name}</code>
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 ${isCore ? 'text-blue-400' : 'text-blue-400/70'}`}>
              {scd}
            </span>
          </div>
          <svg className={`w-3.5 h-3.5 text-gray-600 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5l3 3 3-3" /></svg>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">{desc}</p>
        {ltvRole && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">LTV Role</span>
            <span className="text-[9px] text-emerald-400/70">{ltvRole}</span>
          </div>
        )}
      </button>

      {/* Collapsed: show key fields only */}
      {!expanded && (
        <div className="px-3.5 pb-3 space-y-0.5">
          {fields.slice(0, 3).map((f) => (
            <div key={f} className={`text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.03] ${f.includes('(FK)') ? 'text-blue-400/70' : 'text-gray-400'}`}>
              {f}
            </div>
          ))}
          {fields.length > 3 && (
            <div className="text-[9px] text-gray-600 px-2 py-0.5">+{fields.length - 3} more columns...</div>
          )}
        </div>
      )}

      {/* Expanded: full schema */}
      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-white/5 pt-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">All Columns</div>
            <div className="space-y-0.5">
              {fields.map((f) => (
                <div key={f} className={`text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.03] ${
                  f.includes('(PK)') ? 'text-emerald-400 font-bold' : f.includes('(FK)') ? 'text-blue-400/70' : 'text-gray-400'
                }`}>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {fks && fks.length > 0 && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Foreign Key Relationships</div>
              {fks.map((fk, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  <code className="font-mono text-blue-300">{fk.col}</code>
                  <span className="text-gray-600">→</span>
                  <code className="font-mono text-blue-400/70">{fk.target}</code>
                </div>
              ))}
            </div>
          )}

          {sampleRow && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Sample Row</div>
              <div className="rounded-lg bg-black/30 p-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                {Object.entries(sampleRow).map(([k, v]) => (
                  <React.Fragment key={k}>
                    <code className="text-[9px] font-mono text-gray-600">{k}</code>
                    <code className="text-[9px] font-mono text-emerald-400">{v}</code>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type TableCardProps = { name: string; scd: string; desc: string; fields: string[]; ltvRole?: string; fks?: { col: string; target: string }[]; sampleRow?: Record<string, string> };

function L1Tables() {
  const coreTables: TableCardProps[] = [
    {
      name: 'facility_master',
      scd: 'SCD-2',
      desc: 'Facility identity — links to LoB, product, counterparty, and credit agreement',
      fields: ['facility_id (PK)', 'facility_name', 'facility_type', 'counterparty_id (FK)', 'credit_agreement_id (FK)', 'lob_segment_id (FK)', 'product_node_id (FK)', 'portfolio_id (FK)', 'currency_code (FK)', 'is_secured'],
      ltvRole: 'Central hub — links exposure data to borrower identity and collateral; is_secured flag determines LTV eligibility',
      fks: [
        { col: 'counterparty_id', target: 'counterparty(counterparty_id)' },
        { col: 'lob_segment_id', target: 'enterprise_business_taxonomy(managed_segment_id)' },
        { col: 'currency_code', target: 'currency_dim(currency_code)' },
      ],
      sampleRow: { facility_id: '12345', facility_name: 'Sunrise Towers CRE Loan', facility_type: 'CRE', is_secured: 'Y', counterparty_id: '67890', currency_code: 'USD' },
    },
    {
      name: 'counterparty',
      scd: 'SCD-2',
      desc: 'Borrower / obligor — risk ratings, industry, domicile',
      fields: ['counterparty_id (PK)', 'legal_name', 'counterparty_type', 'internal_risk_rating', 'industry_id (FK)', 'country_code (FK)', 'pd_annual', 'lgd_unsecured'],
      ltvRole: 'Borrower identity — LTV is weighted at counterparty level for obligor assessment',
      fks: [
        { col: 'industry_id', target: 'industry_dim(industry_id)' },
        { col: 'country_code', target: 'country_dim(country_code)' },
      ],
      sampleRow: { counterparty_id: '67890', legal_name: 'Sunrise Properties LLC', counterparty_type: 'CORPORATE', internal_risk_rating: 'BB+' },
    },
    {
      name: 'collateral_asset_master',
      scd: 'SCD-2',
      desc: 'Collateral identity — asset type, lien position, regulatory eligibility, facility linkage',
      fields: ['collateral_asset_id (PK)', 'facility_id (FK)', 'counterparty_id (FK)', 'collateral_type_code', 'lien_priority', 'asset_description', 'original_valuation_date', 'is_regulatory_eligible'],
      ltvRole: 'Collateral identity — links each asset to its facility and determines which valuations feed the LTV denominator',
      fks: [
        { col: 'facility_id', target: 'facility_master(facility_id)' },
        { col: 'counterparty_id', target: 'counterparty(counterparty_id)' },
      ],
      sampleRow: { collateral_asset_id: 'COL-001', facility_id: '12345', collateral_type_code: 'REAL_ESTATE', lien_priority: 'FIRST', asset_description: 'Sunrise Towers — 200-unit multifamily' },
    },
  ];

  const dimensionalTables: TableCardProps[] = [
    {
      name: 'enterprise_business_taxonomy',
      scd: 'SCD-1',
      desc: 'Line of Business hierarchy — self-referencing tree for LoB rollup',
      fields: ['managed_segment_id (PK)', 'segment_code', 'segment_name', 'parent_segment_id', 'tree_level'],
      ltvRole: 'Rollup hierarchy — walks facility → desk → portfolio → LoB for aggregation',
      sampleRow: { managed_segment_id: '100', segment_code: 'CRE_DESK', segment_name: 'CRE Lending Desk', parent_segment_id: '10', tree_level: '3' },
    },
    {
      name: 'enterprise_product_taxonomy',
      scd: 'SCD-1',
      desc: 'Product hierarchy — CRE, C&I, PF, FF, Consumer classification',
      fields: ['product_node_id (PK)', 'product_code', 'product_name', 'parent_node_id', 'tree_level'],
      ltvRole: 'Determines collateral type expectations and haircut calibration per product',
    },
    {
      name: 'scenario_dim',
      scd: 'SCD-1',
      desc: 'Stress test scenarios — Base, Severely Adverse, haircut calibrations',
      fields: ['scenario_id (PK)', 'scenario_code', 'scenario_name', 'scenario_type', 'shock_parameters_json'],
      ltvRole: 'Determines which haircut_pct to apply for Stressed LTV calculations',
    },
    {
      name: 'currency_dim',
      scd: 'SCD-0',
      desc: 'Currency reference — normalizes amounts across snapshots',
      fields: ['currency_code (PK)', 'currency_name', 'is_g10_currency'],
      ltvRole: 'Normalizes all exposure and collateral values to a base currency before LTV calculation',
    },
    {
      name: 'date_dim',
      scd: 'SCD-0',
      desc: 'Calendar / fiscal periods — temporal dimension for all snapshots',
      fields: ['date_id (PK)', 'calendar_date', 'calendar_quarter', 'fiscal_year', 'is_quarter_end'],
    },
    {
      name: 'metric_definition_dim',
      scd: 'SCD-1',
      desc: 'Metric catalog — defines LTV as a metric in the library',
      fields: ['metric_code = LTV', 'metric_name', 'unit_type = PERCENTAGE', 'direction = LOWER_BETTER'],
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
          <Database className="w-3 h-3" aria-hidden="true" />
          Core Master Tables
          <span className="text-[8px] text-gray-600 font-normal normal-case tracking-normal ml-1">Click to expand full schema</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {coreTables.map((t) => (
            <ExpandableTableCard key={t.name} {...t} isCore />
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
          <Layers className="w-3 h-3" aria-hidden="true" />
          Dimensional &amp; Classification Tables
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {dimensionalTables.map((t) => (
            <ExpandableTableCard key={t.name} {...t} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 3 — L2 FIELD HIGHLIGHTING
 * ──────────────────────────────────────────────────────────────────────────── */

function L2FieldTable({ activeVariant }: { activeVariant: 'both' | 'standard' | 'stressed' }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* facility_exposure_snapshot */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <code className="text-xs font-bold text-amber-300 font-mono">L2.facility_exposure_snapshot</code>
        </div>
        <p className="text-[10px] text-gray-600 mb-3">Facility-level exposure data, snapshotted quarterly — numerator source</p>

        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Measure Fields</div>
        <div className="space-y-1">
          {L2_FIELDS_FES.map(({ field, desc, standard, stressed }) => {
            const isActive =
              activeVariant === 'both' ? standard || stressed : activeVariant === 'standard' ? standard : stressed;
            const showStandard = standard && (activeVariant === 'both' || activeVariant === 'standard');
            const showStressed = stressed && (activeVariant === 'both' || activeVariant === 'stressed');
            return (
              <div
                key={field}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all duration-300 ${
                  isActive ? 'bg-white/5' : 'opacity-25'
                }`}
              >
                <div className="min-w-0">
                  <code className={`font-mono ${isActive ? 'text-gray-200' : 'text-gray-600'}`}>{field}</code>
                  <div className={`text-[9px] mt-0.5 ${isActive ? 'text-gray-500' : 'text-gray-700'}`}>{desc}</div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0 ml-2">
                  {showStandard && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Standard
                    </span>
                  )}
                  {showStressed && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Stressed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mt-3 mb-1.5">Join &amp; Context Fields</div>
        <div className="space-y-1">
          {[
            { field: 'facility_id', desc: 'FK → L1.facility_master' },
            { field: 'counterparty_id', desc: 'FK → L1.counterparty' },
            { field: 'currency_code', desc: 'FK → L1.currency_dim' },
            { field: 'as_of_date', desc: 'Snapshot date (DATE)' },
            { field: 'reporting_period', desc: 'e.g. Q4-2024 (VARCHAR 20)' },
          ].map((f) => (
            <div key={f.field} className="flex items-center justify-between px-3 py-1 rounded-lg text-xs bg-white/[0.02]">
              <div className="min-w-0">
                <code className="font-mono text-gray-400">{f.field}</code>
                <div className="text-[9px] text-gray-600 mt-0.5">{f.desc}</div>
              </div>
              <span className="text-[9px] text-gray-600 font-mono flex-shrink-0 ml-2">JOIN key</span>
            </div>
          ))}
        </div>
      </div>

      {/* collateral_snapshot */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <code className="text-xs font-bold text-amber-300 font-mono">L2.collateral_snapshot</code>
        </div>
        <p className="text-[10px] text-gray-600 mb-3">Collateral valuations &amp; stress haircuts — denominator source</p>

        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Measure Fields</div>
        <div className="space-y-1">
          {L2_FIELDS_CS.map(({ field, desc, standard, stressed }) => {
            const isActive =
              activeVariant === 'both' ? standard || stressed : activeVariant === 'standard' ? standard : stressed;
            const showStandard = standard && (activeVariant === 'both' || activeVariant === 'standard');
            const showStressed = stressed && (activeVariant === 'both' || activeVariant === 'stressed');
            return (
              <div
                key={field}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all duration-300 ${
                  isActive ? 'bg-white/5' : 'opacity-25'
                }`}
              >
                <div className="min-w-0">
                  <code className={`font-mono ${isActive ? 'text-gray-200' : 'text-gray-600'}`}>{field}</code>
                  <div className={`text-[9px] mt-0.5 ${isActive ? 'text-gray-500' : 'text-gray-700'}`}>{desc}</div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0 ml-2">
                  {showStandard && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Standard
                    </span>
                  )}
                  {showStressed && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Stressed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mt-3 mb-1.5">Join &amp; Context Fields</div>
        <div className="space-y-1">
          {[
            { field: 'collateral_asset_id', desc: 'FK → L1.collateral_asset_master' },
            { field: 'facility_id', desc: 'FK → L1.facility_master' },
            { field: 'currency_code', desc: 'FK → L1.currency_dim' },
            { field: 'as_of_date', desc: 'Snapshot date (DATE)' },
            { field: 'scenario_id', desc: 'FK → L1.scenario_dim (for stressed haircuts)' },
          ].map((f) => (
            <div key={f.field} className="flex items-center justify-between px-3 py-1 rounded-lg text-xs bg-white/[0.02]">
              <div className="min-w-0">
                <code className="font-mono text-gray-400">{f.field}</code>
                <div className="text-[9px] text-gray-600 mt-0.5">{f.desc}</div>
              </div>
              <span className="text-[9px] text-gray-600 font-mono flex-shrink-0 ml-2">JOIN key</span>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">Standard</span>
          <span className="text-[9px] text-gray-500 ml-1">uses current_valuation_usd only</span>
          <span className="mx-1 text-gray-700">|</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">Stressed</span>
          <span className="text-[9px] text-gray-500 ml-1">also applies haircut_pct</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 4 — TRANSFORM / CALCULATION ENGINE
 * ──────────────────────────────────────────────────────────────────────────── */

function TransformCard({ v }: { v: VariantData }) {
  return (
    <div className={`rounded-xl border ${v.colorBorder} ${v.colorBg} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${v.colorAccent}`} />
          <span className={`text-xs font-bold ${v.colorText}`}>{v.label}</span>
        </div>
        <TierBadge tier={v.calcTierFacility} />
      </div>

      <div className="bg-black/30 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">{v.numeratorLabel}</span>
          <span className="text-white font-mono font-bold">{fmt(v.numerator)}</span>
        </div>
        <div className="flex items-center justify-center text-gray-600 text-sm my-1">÷</div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-gray-500">{v.denominatorLabel}</span>
          <span className="text-white font-mono font-bold">{fmt(v.denominator)}</span>
        </div>
        <div className="flex items-center justify-center text-gray-600 text-sm my-1">× 100</div>
      </div>

      <div className="flex items-center justify-between">
        <code className="text-xs text-gray-400 font-mono">{v.formula}</code>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span className={`text-lg font-black ${v.colorText} tabular-nums`}>{v.result}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-1.5 text-[10px] text-gray-500">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          <strong className="text-emerald-300">T3:</strong> LTV is always calculated by the platform from raw exposure and collateral data.
          Banks do not submit pre-computed LTV values — the platform is the system of record.
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * PLAIN ENGLISH HELPER
 * ──────────────────────────────────────────────────────────────────────────── */

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
 * FOUNDATIONAL RULE CALLOUT
 * ──────────────────────────────────────────────────────────────────────────── */

function FoundationalRule() {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4 mb-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Scale className="w-4 h-4 text-red-400" aria-hidden="true" />
        </div>
        <div>
          <div className="text-xs font-bold text-red-300 mb-1.5">
            Foundational Rule: Exclude Unsecured Facilities from LTV Rollups
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Unsecured facilities have no collateral value, so LTV is <strong className="text-white">undefined</strong> (not zero).
            Including them as &ldquo;0% LTV&rdquo; or &ldquo;infinite LTV&rdquo; would corrupt every rollup level.
            The platform assigns <strong className="text-white">NULL</strong> to unsecured facilities and excludes them from
            all exposure-weighted averages. Only secured facilities participate in LTV aggregation.
          </p>
          <div className="mt-2 bg-black/30 rounded-lg p-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex-1 text-center">
                <div className="text-red-400 font-mono line-through mb-1 opacity-70">
                  LTV = Drawn / 0 = ∞ <span className="text-[9px]">(or set to 0%)</span>
                </div>
                <div className="text-[9px] text-red-400/60">Wrong — corrupts averages</div>
              </div>
              <div className="text-gray-600 text-lg">vs.</div>
              <div className="flex-1 text-center">
                <div className="text-emerald-400 font-mono mb-1">
                  LTV = NULL &mdash; excluded from rollups
                </div>
                <div className="text-[9px] text-emerald-400/60">Correct — report % unsecured separately</div>
              </div>
            </div>
          </div>
          <PlainEnglish>
            Think of it like calculating the average height of students in a room.
            If some students haven&apos;t been measured, you don&apos;t record them as 0 inches tall &mdash;
            you skip them and note how many weren&apos;t measured. Rating agencies like Moody&apos;s
            report &ldquo;secured-only LTV&rdquo; alongside &ldquo;% unsecured exposure&rdquo; for the same reason.
          </PlainEnglish>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 5 — ROLLUP PYRAMID
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
            className={`w-full rounded-xl border p-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
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
 * ROLLUP JOIN CHAIN — "Follow the Collateral Up"
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
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get loan identity' },
      { from: 'collateral_snapshot', fromLayer: 'L2', to: 'collateral_asset_master', toLayer: 'L1', joinKey: 'collateral_asset_id', note: 'Get collateral identity' },
      { from: 'collateral_asset_master', fromLayer: 'L1', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Link collateral → loan' },
    ],
    aggregation: 'Direct division: SUM(drawn_amount) ÷ SUM(current_valuation_usd) × 100',
    result: 'One LTV per facility (sum collateral if multiple assets)',
  },
  counterparty: {
    hops: [
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Exposure data → loan' },
      { from: 'facility_master', fromLayer: 'L1', to: 'counterparty', toLayer: 'L1', joinKey: 'counterparty_id', note: 'Loan → borrower' },
    ],
    aggregation: 'Exposure-weighted average: Σ(LTV × drawn_amount) ÷ Σ(drawn_amount) — secured facilities only',
    result: 'One weighted-average LTV per counterparty (unsecured excluded)',
  },
  desk: {
    hops: [
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Exposure data → loan' },
      { from: 'facility_master', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'lob_segment_id → managed_segment_id', note: 'Loan → desk (via LoB tree)' },
    ],
    aggregation: 'Exposure-weighted average across all secured facilities assigned to this desk',
    result: 'One weighted-average LTV per desk (may be NULL for unsecured-heavy desks)',
  },
  portfolio: {
    hops: [
      { from: 'counterparty (weighted LTV)', fromLayer: 'L1', to: 'facility_exposure_snapshot', toLayer: 'L2', joinKey: 'counterparty_id', note: 'Get exposure weights' },
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id → managed_segment_id', note: 'Walk tree: desk → portfolio' },
    ],
    aggregation: 'Exposure-weighted: Σ(LTV × secured_exposure) ÷ Σ(secured_exposure) across counterparties in portfolio',
    result: 'One weighted-average LTV per portfolio + distribution buckets',
  },
  lob: {
    hops: [
      { from: 'portfolio (weighted LTV)', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id', note: 'Walk tree: portfolio → LoB root' },
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Re-weight by total LoB secured exposure' },
    ],
    aggregation: 'Exposure-weighted average across all portfolios in LoB (directional only, secured facilities only)',
    result: 'One trend LTV per Line of Business — alongside % unsecured disclosure',
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
              <span className="text-gray-600">→</span>
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

/* ── FACILITY ── */
function FacilityDetail() {
  return (
    <div className="space-y-3">
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Formula (Applied Directly)</div>
        <div className="text-sm font-mono text-emerald-400 text-center">
          LTV = Drawn Amount / SUM(Collateral Value) × 100
        </div>
        <PlainEnglish>
          How much of the collateral&apos;s value is covered by the loan?
          An LTV of 68.6% means the loan is about two-thirds of what the collateral is worth.
          The remaining 31.4% is the bank&apos;s &ldquo;equity cushion.&rdquo;
        </PlainEnglish>
      </div>
      <JoinChainVisual levelKey="facility" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="rounded-lg bg-teal-500/10 border border-teal-500/20 p-2.5">
          <div className="text-[10px] font-bold text-teal-300 mb-1">Standard LTV</div>
          <div className="text-xs text-gray-300">Denominator = <strong className="text-teal-300">Current Market Value</strong> (latest appraisal)</div>
        </div>
        <div className="rounded-lg bg-orange-500/10 border border-orange-500/20 p-2.5">
          <div className="text-[10px] font-bold text-orange-300 mb-1">Stressed LTV</div>
          <div className="text-xs text-gray-300">Denominator = <strong className="text-orange-300">Value × (1 − haircut)</strong></div>
        </div>
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5">
          <div className="text-[10px] font-bold text-red-300 mb-1">Unsecured</div>
          <div className="text-xs text-gray-300">LTV = <strong className="text-red-300">NULL</strong> (no collateral → excluded)</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-600" aria-hidden="true" />
          <span><strong className="text-gray-300">Multiple collateral assets:</strong> A single facility may be secured by multiple assets (building + land + parking). The platform sums all current_valuation_usd values before dividing.</span>
        </div>
        <div className="flex items-start gap-2 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-600" aria-hidden="true" />
          <span><strong className="text-gray-300">Appraisal freshness:</strong> Collateral valuations may be months or years old. The as_of_date on collateral_snapshot indicates when the last appraisal was performed.</span>
        </div>
      </div>
    </div>
  );
}

/* ── COUNTERPARTY ── */
function CounterpartyDetail() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 leading-relaxed">
        A single borrower may have multiple facilities — some secured, some unsecured.
        Counterparty LTV uses an <strong className="text-gray-300">exposure-weighted average across secured facilities only</strong>.
        Unsecured facilities are excluded from both the numerator and denominator of the weighted average.
      </div>
      <JoinChainVisual levelKey="counterparty" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span className="text-xs font-bold text-emerald-300">Example: Sunrise Properties LLC</span>
          </div>
          <div className="text-[10px] text-gray-500 mb-2">3 facilities: 2 secured, 1 unsecured</div>
          <div className="bg-black/30 rounded-lg p-2.5 mb-2 space-y-1 text-xs font-mono">
            <div className="text-emerald-400">Fac A: LTV=68.6%, Drawn=$120M <span className="text-gray-600">(secured)</span></div>
            <div className="text-emerald-400">Fac B: LTV=60.7%, Drawn=$85M <span className="text-gray-600">(secured)</span></div>
            <div className="text-red-400/60">Fac C: LTV=NULL, Drawn=$45M <span className="text-gray-600">(unsecured → excluded)</span></div>
          </div>
          <div className="bg-black/30 rounded-lg p-2.5">
            <div className="text-xs font-mono text-emerald-400 text-center">
              (68.6% × $120M + 60.7% × $85M) ÷ ($120M + $85M) = 65.2%
            </div>
          </div>
          <PlainEnglish>
            The unsecured $45M loan is skipped entirely. Only the two secured loans count.
            The bigger loan ($120M at 68.6%) pulls the average up from the smaller loan ($85M at 60.7%).
          </PlainEnglish>
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-xs font-bold text-amber-300 mb-1">Cross-Collateralization</div>
              <p className="text-xs text-gray-400 leading-relaxed">
                When a single collateral asset secures multiple facilities, the platform must decide how to
                allocate collateral value. The two common approaches are:
              </p>
              <div className="mt-2 space-y-1.5 text-[10px]">
                <div className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5">
                  <span className="text-emerald-300 font-bold">Pro-rata allocation:</span>
                  <span className="text-gray-400"> Split collateral value proportional to each facility&apos;s drawn amount</span>
                </div>
                <div className="rounded bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5">
                  <span className="text-blue-300 font-bold">Full assignment:</span>
                  <span className="text-gray-400"> Assign full collateral value to the first-lien facility only</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── DESK ── */
function DeskDetail() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 leading-relaxed">
        At the desk level, LTV transitions from a borrower-specific metric to a <strong className="text-gray-300">book-level
        collateral coverage indicator</strong>. The desk-level LTV is meaningful primarily for desks that manage
        secured lending (CRE, asset-backed). For desks focused on unsecured corporate lending, the desk LTV
        may be NULL or cover only a small fraction of the book.
      </div>
      <JoinChainVisual levelKey="desk" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span className="text-xs font-bold text-emerald-300">Secured Coverage Ratio</span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Key Output
            </span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-2">
            Desk-level LTV is reported alongside the <strong className="text-gray-300">% secured disclosure</strong>:
            what fraction of the desk&apos;s total exposure is backed by collateral?
          </p>
          <div className="bg-black/30 rounded-lg p-2.5 space-y-1">
            <div className="text-xs font-mono text-gray-300">
              <span className="text-teal-400">Desk LTV:</span> 67.3% <span className="text-gray-600">(secured facilities only)</span>
            </div>
            <div className="text-xs font-mono text-gray-300">
              <span className="text-blue-400">% Secured:</span> 78% of total desk exposure
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span className="text-xs font-bold text-gray-300">Collateral Type Mix</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-2">
            Different collateral types have different risk profiles and haircut calibrations.
            A desk with 80% real estate collateral and 20% equity collateral will have a very different
            stressed LTV profile than one secured entirely by real estate.
          </p>
          <div className="bg-black/30 rounded-lg p-2.5 text-xs font-mono text-gray-400 space-y-0.5">
            <div>Real Estate: <span className="text-teal-400">haircut 10-20%</span></div>
            <div>Equipment: <span className="text-amber-400">haircut 20-35%</span></div>
            <div>Securities: <span className="text-orange-400">haircut 25-50%</span></div>
          </div>
        </div>
      </div>

      <PlainEnglish>
        A desk&apos;s LTV is like checking how much equity your company has across all its mortgaged properties.
        The key insight at this level is not just the LTV number, but also how much of your book is secured vs. unsecured.
      </PlainEnglish>
    </div>
  );
}

/* ── PORTFOLIO ── */
const LTV_BUCKETS = [
  { range: '< 50%', status: 'Conservative', count: 12, exposure: 650, color: 'text-emerald-300', bg: 'bg-emerald-500/10' },
  { range: '50 - 65%', status: 'Moderate', count: 18, exposure: 820, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { range: '65 - 80%', status: 'Standard', count: 15, exposure: 420, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { range: '80 - 100%', status: 'High Risk', count: 8, exposure: 180, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { range: '> 100%', status: 'Underwater', count: 2, exposure: 45, color: 'text-red-400', bg: 'bg-red-500/10' },
];

function PortfolioDetail() {
  const totalExposure = LTV_BUCKETS.reduce((s, b) => s + b.exposure, 0);

  return (
    <div className="space-y-3">
      <JoinChainVisual levelKey="portfolio" />
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Exposure-Weighted Average (Secured Only)</div>
        <div className="text-sm font-mono text-emerald-400 text-center">
          {'Σ'}(Facility LTV {'×'} Drawn Amount) / {'Σ'}(Drawn Amount) — WHERE is_secured = Y
        </div>
        <PlainEnglish>
          Bigger loans count more. A $100M loan at 80% LTV contributes more to the average than a $5M loan at 90%.
          Only secured facilities are included — unsecured exposure is reported separately as &ldquo;% unsecured.&rdquo;
        </PlainEnglish>
      </div>

      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" aria-hidden="true" />
          LTV Distribution Buckets (sample)
        </div>
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-5 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
            <div>Bucket</div>
            <div>Status</div>
            <div className="text-right">Count</div>
            <div className="text-right">Exposure ($M)</div>
            <div className="text-right">% of Total</div>
          </div>
          {LTV_BUCKETS.map((b) => (
            <div key={b.range} className={`grid grid-cols-5 text-xs px-3 py-1.5 border-t border-gray-800/50 ${b.bg}`}>
              <div className={`font-mono font-bold ${b.color}`}>{b.range}</div>
              <div className="text-gray-400">{b.status}</div>
              <div className="text-right text-gray-300 font-mono">{b.count}</div>
              <div className="text-right text-gray-300 font-mono">${b.exposure}M</div>
              <div className="text-right text-gray-400 font-mono">{((b.exposure / totalExposure) * 100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
        <PlainEnglish>
          Sort all secured loans by how much of the collateral is &ldquo;used up&rdquo; by the loan.
          The &gt;100% bucket (&ldquo;underwater&rdquo;) means the loan exceeds the collateral value — the bank would lose money if it had to seize and sell.
        </PlainEnglish>
      </div>

      <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-red-300 mb-1">Concentration Risk Warning</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              A portfolio with a healthy average LTV of 65% can still have a dangerous concentration
              of high-LTV loans in a single geography or property type. When property values decline,
              they tend to decline <strong className="text-gray-300">together</strong> within a market.
              Always cross-reference LTV distribution with geographic and collateral-type concentration reports.
            </p>
            <PlainEnglish>
              If all your high-LTV loans are on office buildings in the same city, a local downturn
              could push many of them underwater simultaneously. The average hides this clustering risk.
            </PlainEnglish>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── LOB ── */
function LoBDetail() {
  return (
    <div className="space-y-3">
      <JoinChainVisual levelKey="lob" />
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Exposure-Weighted Average (same as Portfolio)</div>
        <div className="text-sm font-mono text-emerald-400 text-center">
          {'Σ'}(Facility LTV {'×'} Secured Exposure) / {'Σ'}(Secured Exposure)
        </div>
        <PlainEnglish>
          This is a health thermometer for collateral coverage across the entire Line of Business.
          It tells you whether the overall equity cushion is growing or shrinking over time.
        </PlainEnglish>
      </div>

      <div className="space-y-2">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-xs font-bold text-amber-300 mb-1">Appraisal Staleness at Scale</div>
              <p className="text-xs text-gray-400 leading-relaxed mb-2">
                At the LoB level, collateral valuations may span a wide range of appraisal dates.
                A portfolio-wide LTV based on stale appraisals (e.g., pre-pandemic valuations for office
                properties) may significantly understate actual risk.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-[10px]">
                  <span className="text-emerald-300 font-bold">&lt; 6 months:</span>
                  <span className="text-gray-400"> Fresh — reliable</span>
                </div>
                <div className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-[10px]">
                  <span className="text-amber-300 font-bold">6-18 months:</span>
                  <span className="text-gray-400"> Aging — monitor</span>
                </div>
                <div className="rounded bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 text-[10px]">
                  <span className="text-red-300 font-bold">&gt; 18 months:</span>
                  <span className="text-gray-400"> Stale — re-appraisal needed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-3">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-xs font-bold text-blue-300 mb-1">Dual Reporting: Standard + Stressed</div>
              <p className="text-xs text-gray-400 leading-relaxed">
                At the LoB level, both Standard and Stressed LTV are reported side-by-side. The
                <strong className="text-gray-300"> gap between them</strong> indicates portfolio sensitivity to
                collateral value declines. A large gap (e.g., Standard 65% vs. Stressed 82%) signals
                that the portfolio is highly sensitive to property value drops.
              </p>
              <p className="text-[10px] text-gray-500 mt-1.5">
                On the dashboard, LoB LTV appears in the <strong className="text-gray-400">Collateral & Security</strong> group
                alongside % unsecured exposure and collateral type mix.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 6 — DASHBOARD CONSUMPTION
 * ──────────────────────────────────────────────────────────────────────────── */

function DashboardConsumption() {
  const [selectedVariant, setSelectedVariant] = useState<'standard' | 'stressed'>('standard');
  const [selectedLevel, setSelectedLevel] = useState('portfolio');

  const isStandard = selectedVariant === 'standard';

  return (
    <div className="rounded-xl border border-gray-800 bg-white/[0.02] p-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Step 1: Pick variant */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-300">1</span>
            Select Variant
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => setSelectedVariant('standard')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
                selectedVariant === 'standard'
                  ? 'bg-teal-500/15 border border-teal-500/40 text-teal-300'
                  : 'bg-white/[0.02] border border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              <span className="font-semibold">Standard LTV</span>
              <span className="block text-[10px] mt-0.5 opacity-70">Current Market Value {'•'} Quarterly</span>
            </button>
            <button
              onClick={() => setSelectedVariant('stressed')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
                selectedVariant === 'stressed'
                  ? 'bg-orange-500/15 border border-orange-500/40 text-orange-300'
                  : 'bg-white/[0.02] border border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              <span className="font-semibold">Stressed LTV</span>
              <span className="block text-[10px] mt-0.5 opacity-70">Haircut Applied {'•'} CCAR/DFAST</span>
            </button>
          </div>
        </div>

        {/* Step 2: Pick level */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-300">2</span>
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
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
                    active
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                      : 'bg-white/[0.02] border border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  {level.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Result */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-300">3</span>
            Dashboard Output
          </div>
          <div
            className={`rounded-xl border p-4 ${
              isStandard ? 'border-teal-500/30 bg-teal-500/5' : 'border-orange-500/30 bg-orange-500/5'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <LayoutDashboard className={`w-4 h-4 ${isStandard ? 'text-teal-400' : 'text-orange-400'}`} aria-hidden="true" />
              <span className="text-xs font-bold text-white">Ready to Connect</span>
            </div>
            <div className="space-y-2 text-xs">
              <Row label="Metric" value={isStandard ? 'Standard LTV' : 'Stressed LTV'} />
              <Row label="Level" value={selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} />
              <Row label="L3 Table" value="metric_value_fact" />
              <Row label="Direction" value="Lower is better" />
              <Row label="Unit" value="Percentage (%)" />
              <div className="flex justify-between">
                <span className="text-gray-500">SQL Required</span>
                <span className="text-emerald-400 font-bold">None</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-emerald-400">
              <Zap className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              <span>Platform handles the join — no SQL, no guesswork</span>
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

function L3OutputTables() {
  return (
    <div className="space-y-2">
      {L3_OUTPUT_TABLES.map((t) => (
        <div
          key={t.table}
          className={`rounded-xl border p-3 flex items-start gap-3 ${
            t.primary
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-gray-800 bg-white/[0.02]'
          }`}
        >
          <Database className={`w-4 h-4 flex-shrink-0 mt-0.5 ${t.primary ? 'text-emerald-400' : 'text-gray-500'}`} aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <code className={`text-xs font-bold font-mono ${t.primary ? 'text-emerald-300' : 'text-gray-300'}`}>
                L3.{t.table}
              </code>
              {t.primary && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Primary
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {t.fields.map((f) => (
                <code key={f} className="text-[9px] font-mono text-gray-500 px-1.5 py-0.5 rounded bg-white/[0.03]">
                  {f}
                </code>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * DATA PROVENANCE BREADCRUMB
 * ──────────────────────────────────────────────────────────────────────────── */

const BREADCRUMB_STEPS = [
  { id: 'step1', label: 'Definition', layer: 'User', color: 'purple', anchor: 'step1' },
  { id: 'join-map', label: 'Join Map', layer: 'Plumbing', color: 'cyan', anchor: 'join-map' },
  { id: 'step2', label: 'L1 Reference', layer: 'L1', color: 'blue', anchor: 'step2', tables: ['facility_master', 'counterparty', 'collateral_asset_master', 'enterprise_business_taxonomy'] },
  { id: 'step3', label: 'L2 Snapshot', layer: 'L2', color: 'amber', anchor: 'step3', tables: ['facility_exposure_snapshot', 'collateral_snapshot'] },
  { id: 'query-plan', label: 'Query Plan', layer: 'Engine', color: 'purple', anchor: 'query-plan' },
  { id: 'step4', label: 'Calculation', layer: 'Transform', color: 'emerald', anchor: 'step4' },
  { id: 'data-flow', label: 'Data Flow', layer: 'Trace', color: 'amber', anchor: 'data-flow' },
  { id: 'step5', label: 'Rollup & L3', layer: 'L3', color: 'emerald', anchor: 'step5', tables: ['metric_value_fact'] },
  { id: 'step6', label: 'Dashboard', layer: 'Output', color: 'pink', anchor: 'step6' },
  { id: 'audit-trail', label: 'Audit Trail', layer: 'Validation', color: 'emerald', anchor: 'audit-trail' },
] as const;

const CRUMB_COLORS: Record<string, { active: string; dot: string; text: string }> = {
  purple: { active: 'bg-purple-500/20 border-purple-500/40', dot: 'bg-purple-500', text: 'text-purple-300' },
  cyan: { active: 'bg-cyan-500/20 border-cyan-500/40', dot: 'bg-cyan-500', text: 'text-cyan-300' },
  blue: { active: 'bg-blue-500/20 border-blue-500/40', dot: 'bg-blue-500', text: 'text-blue-300' },
  amber: { active: 'bg-amber-500/20 border-amber-500/40', dot: 'bg-amber-500', text: 'text-amber-300' },
  emerald: { active: 'bg-emerald-500/20 border-emerald-500/40', dot: 'bg-emerald-500', text: 'text-emerald-300' },
  pink: { active: 'bg-pink-500/20 border-pink-500/40', dot: 'bg-pink-500', text: 'text-pink-300' },
};

function ProvenanceBreadcrumb({ activeSection }: { activeSection: string }) {
  const scrollTo = (anchor: string) => {
    const el = document.querySelector(`[data-demo="${anchor}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto py-1">
      {BREADCRUMB_STEPS.map((step, i) => {
        const isActive = activeSection === step.id;
        const c = CRUMB_COLORS[step.color];
        return (
          <React.Fragment key={step.id}>
            {i > 0 && (
              <svg className="w-3 h-3 text-gray-700 flex-shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 2l4 4-4 4" />
              </svg>
            )}
            <button
              onClick={() => scrollTo(step.anchor)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                isActive
                  ? `${c.active} ${c.text} border`
                  : 'text-gray-600 hover:text-gray-400 border border-transparent'
              }`}
              title={'tables' in step ? `Tables: ${step.tables?.join(', ')}` : step.label}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? c.dot : 'bg-gray-700'}`} />
              {step.label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function useActiveSection(): string {
  const [active, setActive] = useState('step1');

  React.useEffect(() => {
    let rafId = 0;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        let current = 'step1';
        for (const s of BREADCRUMB_STEPS) {
          const el = document.querySelector(`[data-demo="${s.anchor}"]`);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 200) current = s.id;
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
  variant?: 'standard' | 'stressed' | 'both';
  label?: string;
}

const JOIN_MAP_NODES: JoinMapNode[] = [
  // L1 column (col 0)
  { id: 'facility_master', label: 'facility_master', layer: 'L1', fields: ['facility_id (PK)', 'counterparty_id (FK)', 'is_secured'], col: 0, row: 0 },
  { id: 'counterparty', label: 'counterparty', layer: 'L1', fields: ['counterparty_id (PK)', 'legal_name', 'industry_id'], col: 0, row: 1 },
  { id: 'collateral_asset_master', label: 'collateral_asset_master', layer: 'L1', fields: ['collateral_asset_id (PK)', 'facility_id (FK)', 'collateral_type_code'], col: 0, row: 2 },
  { id: 'ebt', label: 'enterprise_business_taxonomy', layer: 'L1', fields: ['managed_segment_id (PK)', 'parent_segment_id', 'tree_level'], col: 0, row: 3 },
  // L2 column (col 1)
  { id: 'fes', label: 'facility_exposure_snapshot', layer: 'L2', fields: ['facility_id+as_of_date (PK)', 'drawn_amount', 'committed_amount'], col: 1, row: 0 },
  { id: 'cs', label: 'collateral_snapshot', layer: 'L2', fields: ['collateral_asset_id+as_of_date (PK)', 'current_valuation_usd', 'haircut_pct'], col: 1, row: 1 },
  { id: 'scenario', label: 'scenario_dim', layer: 'L1', fields: ['scenario_id (PK)', 'scenario_code', 'shock_parameters_json'], col: 1, row: 2 },
  // Transform column (col 2)
  { id: 'ltv_calc', label: 'LTV Formula', layer: 'transform', fields: ['Drawn ÷ Collateral × 100', 'T3: Always Calculate'], col: 2, row: 0 },
  { id: 'rollup_calc', label: 'Rollup Engine', layer: 'transform', fields: ['Exp-weighted avg (secured)', 'Exclude unsecured = NULL'], col: 2, row: 1 },
  // L3 column (col 3)
  { id: 'metric_value_fact', label: 'metric_value_fact', layer: 'L3', fields: ['metric_id=LTV', 'value', 'aggregation_level'], col: 3, row: 0 },
  { id: 'risk_appetite', label: 'risk_appetite_metric_state', layer: 'L3', fields: ['current_value', 'limit_value', 'status_code'], col: 3, row: 1 },
];

const JOIN_MAP_EDGES: JoinMapEdge[] = [
  // L1 → L2 joins
  { from: 'facility_master', to: 'fes', joinKey: 'facility_id', variant: 'both' },
  { from: 'collateral_asset_master', to: 'cs', joinKey: 'collateral_asset_id', variant: 'both' },
  { from: 'collateral_asset_master', to: 'facility_master', joinKey: 'facility_id', variant: 'both', label: 'Collateral → Loan' },
  { from: 'counterparty', to: 'facility_master', joinKey: 'counterparty_id', variant: 'both', label: 'Borrower → Loans' },
  { from: 'scenario', to: 'cs', joinKey: 'scenario_id', variant: 'stressed', label: 'Haircut calibration' },
  // L2 → Transform
  { from: 'fes', to: 'ltv_calc', joinKey: 'drawn_amount', variant: 'both', label: 'Numerator' },
  { from: 'cs', to: 'ltv_calc', joinKey: 'current_valuation_usd', variant: 'standard', label: 'Market value' },
  { from: 'cs', to: 'ltv_calc', joinKey: 'valuation × (1-haircut)', variant: 'stressed', label: 'Stressed value' },
  { from: 'fes', to: 'rollup_calc', joinKey: 'drawn_amount', variant: 'both', label: 'Exposure weights' },
  // L1 → Transform (rollup hierarchy)
  { from: 'ebt', to: 'rollup_calc', joinKey: 'parent_segment_id → tree_level', variant: 'both', label: 'LoB hierarchy' },
  // Transform → L3
  { from: 'ltv_calc', to: 'metric_value_fact', joinKey: 'LTV value', variant: 'both' },
  { from: 'rollup_calc', to: 'metric_value_fact', joinKey: 'Aggregated values', variant: 'both' },
  { from: 'rollup_calc', to: 'risk_appetite', joinKey: 'LoB-level LTV', variant: 'both' },
];

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  L1: { bg: 'bg-blue-950/60', border: 'border-blue-500/40', text: 'text-blue-300', badge: 'bg-blue-500/20 text-blue-300' },
  L2: { bg: 'bg-amber-950/60', border: 'border-amber-500/40', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-300' },
  transform: { bg: 'bg-purple-950/60', border: 'border-purple-500/40', text: 'text-purple-300', badge: 'bg-purple-500/20 text-purple-300' },
  L3: { bg: 'bg-emerald-950/60', border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
};

function InteractiveJoinMap() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [variantFilter, setVariantFilter] = useState<'both' | 'standard' | 'stressed'>('both');

  const nodeById = React.useMemo(() => new Map(JOIN_MAP_NODES.map(n => [n.id, n])), []);

  const connectedNodes = React.useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const s = new Set([hoveredNode]);
    for (const e of JOIN_MAP_EDGES) {
      const matchesVariant = e.variant === 'both' || variantFilter === 'both' || e.variant === variantFilter;
      if (!matchesVariant) continue;
      if (e.from === hoveredNode) s.add(e.to);
      if (e.to === hoveredNode) s.add(e.from);
    }
    return s;
  }, [hoveredNode, variantFilter]);

  const connectedEdges = React.useMemo(() => {
    if (!hoveredNode) return new Set<number>();
    const s = new Set<number>();
    JOIN_MAP_EDGES.forEach((e, i) => {
      const matchesVariant = e.variant === 'both' || variantFilter === 'both' || e.variant === variantFilter;
      if (!matchesVariant) return;
      if (e.from === hoveredNode || e.to === hoveredNode) s.add(i);
    });
    return s;
  }, [hoveredNode, variantFilter]);

  // Layout constants
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-gray-400" aria-hidden="true" />
          <span className="text-xs font-bold text-white">Interactive Join Map</span>
          <span className="text-[9px] text-gray-600">Hover any table to trace connections</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(['both', 'standard', 'stressed'] as const).map(f => {
            const activeStyles: Record<string, string> = {
              both: 'bg-white/10 text-white border border-gray-600',
              standard: 'bg-teal-500/20 text-teal-300 border border-teal-500/40',
              stressed: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
            };
            return (
              <button
                key={f}
                onClick={() => setVariantFilter(f)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                  variantFilter === f
                    ? activeStyles[f]
                    : 'text-gray-600 border border-transparent hover:text-gray-400'
                }`}
              >
                {f === 'both' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Column headers */}
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
            {/* SVG Edges */}
            <svg width={totalW} height={totalH} className="absolute inset-0 pointer-events-none">
              {JOIN_MAP_EDGES.map((edge, i) => {
                const matchesVariant = edge.variant === 'both' || variantFilter === 'both' || edge.variant === variantFilter;
                if (!matchesVariant) return null;
                const fromNode = nodeById.get(edge.from)!;
                const toNode = nodeById.get(edge.to)!;
                const fp = getNodePos(fromNode);
                const tp = getNodePos(toNode);
                const x1 = fp.x + NW, y1 = fp.y + NH / 2;
                const x2 = tp.x, y2 = tp.y + NH / 2;
                const dx = (x2 - x1) * 0.4;
                const isActive = connectedEdges.has(i);
                const isDim = hoveredNode && !isActive;
                const strokeColor = isActive
                  ? edge.variant === 'standard' ? '#14b8a6' : edge.variant === 'stressed' ? '#f97316' : '#10b981'
                  : 'rgba(255,255,255,0.08)';
                return (
                  <g key={i}>
                    <path
                      d={`M${x1},${y1} C${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isActive ? 2 : 1}
                      strokeDasharray={edge.variant !== 'both' && !isActive ? '4 4' : undefined}
                      style={{ opacity: isDim ? 0.05 : 1, transition: 'all 0.2s' }}
                    />
                    {isActive && (
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 - 8}
                        textAnchor="middle"
                        className="text-[8px] fill-gray-300 font-mono"
                      >
                        {edge.joinKey}
                      </text>
                    )}
                    {isActive && edge.label && (
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 + 10}
                        textAnchor="middle"
                        className="text-[7px] fill-gray-500"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Node cards */}
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

      {/* Active node detail tooltip */}
      {hoveredNode && (() => {
        const node = nodeById.get(hoveredNode);
        if (!node) return null;
        const inEdges = JOIN_MAP_EDGES.filter(e => e.to === hoveredNode && (e.variant === 'both' || variantFilter === 'both' || e.variant === variantFilter));
        const outEdges = JOIN_MAP_EDGES.filter(e => e.from === hoveredNode && (e.variant === 'both' || variantFilter === 'both' || e.variant === variantFilter));
        return (
          <div className="mt-3 rounded-lg border border-white/10 bg-gray-900/80 p-3 text-[10px]">
            <div className="flex items-center gap-2 mb-2">
              <code className={`font-bold font-mono ${LAYER_COLORS[node.layer].text}`}>{node.layer}.{node.label}</code>
              <span className="text-gray-600">|</span>
              <span className="text-gray-500">{node.fields.length} columns shown</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {inEdges.length > 0 && (
                <div>
                  <div className="text-gray-600 font-bold uppercase tracking-wider mb-1">Incoming joins ({inEdges.length})</div>
                  {inEdges.map((e, i) => (
                    <div key={i} className="flex items-center gap-1 text-gray-400">
                      <span className="text-emerald-400">←</span>
                      <code className="font-mono text-gray-300">{e.from}</code>
                      <span className="text-gray-600">ON</span>
                      <code className="font-mono text-amber-300">{e.joinKey}</code>
                    </div>
                  ))}
                </div>
              )}
              {outEdges.length > 0 && (
                <div>
                  <div className="text-gray-600 font-bold uppercase tracking-wider mb-1">Outgoing feeds ({outEdges.length})</div>
                  {outEdges.map((e, i) => (
                    <div key={i} className="flex items-center gap-1 text-gray-400">
                      <span className="text-blue-400">→</span>
                      <code className="font-mono text-gray-300">{e.to}</code>
                      <span className="text-gray-600">via</span>
                      <code className="font-mono text-amber-300">{e.joinKey}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * ANIMATED DATA FLOW — "Watch a Number Travel"
 * ──────────────────────────────────────────────────────────────────────────── */

interface FlowStep {
  layer: string;
  table: string;
  action: string;
  value: string;
  detail: string;
  color: string;
}

const LTV_FLOW_STEPS: FlowStep[] = [
  { layer: 'L1', table: 'facility_master', action: 'Identify facility', value: 'facility_id = 12345', detail: 'Sunrise Towers CRE Loan — Multifamily, $150M committed, is_secured = Y', color: 'blue' },
  { layer: 'L1', table: 'counterparty', action: 'Identify borrower', value: 'counterparty_id = 67890', detail: 'Sunrise Properties LLC — BB+ rated, CRE developer', color: 'blue' },
  { layer: 'L1', table: 'collateral_asset_master', action: 'Identify collateral', value: 'collateral_asset_id = COL-001, COL-002', detail: 'Two assets: Sunrise Towers (200-unit multifamily) + Parking Structure', color: 'blue' },
  { layer: 'L2', table: 'facility_exposure_snapshot', action: 'Pull drawn amount', value: 'drawn_amount = $120,000,000', detail: 'Q4-2024 snapshot: $120M drawn of $150M committed (80% utilization)', color: 'amber' },
  { layer: 'L2', table: 'collateral_snapshot', action: 'Pull collateral values', value: 'SUM(current_valuation_usd) = $175,000,000', detail: 'Property A: $125M (appraised 6 months ago) + Property B: $50M (appraised 3 months ago)', color: 'amber' },
  { layer: 'Calc', table: 'LTV Formula', action: 'Compute ratio', value: '$120,000,000 ÷ $175,000,000 × 100 = 68.6%', detail: 'T3 authority: platform always calculates from raw data — no bank-submitted LTV accepted', color: 'purple' },
  { layer: 'L3', table: 'metric_value_fact', action: 'Store result', value: 'LTV = 68.6% (facility level)', detail: 'metric_id=LTV, variant_id=STANDARD, aggregation_level=FACILITY, unit=%', color: 'emerald' },
  { layer: 'Rollup', table: 'Counterparty weighted avg', action: 'Weight by exposure', value: '(68.6%×$120M + 60.7%×$85M) ÷ ($120M+$85M) = 65.2%', detail: '2 secured facilities weighted by drawn amount; 1 unsecured excluded (NULL)', color: 'emerald' },
  { layer: 'Rollup', table: 'Portfolio weighted avg', action: 'Weight by exposure', value: 'Σ(LTV×exp) ÷ Σ(exp) = 64.8%', detail: 'Exposure-weighted across 45 secured counterparties in portfolio', color: 'emerald' },
  { layer: 'Dashboard', table: 'P5 — Collateral & Security', action: 'Display on dashboard', value: 'Portfolio Standard LTV: 64.8% (Moderate)', detail: 'RAG status: Green — below 70% threshold, 78% of book is secured', color: 'pink' },
];

function AnimatedDataFlow() {
  const [activeStep, setActiveStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = () => {
    setIsPlaying(true);
    setActiveStep(0);
  };

  const stop = () => {
    setIsPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const reset = () => {
    stop();
    setActiveStep(-1);
  };

  React.useEffect(() => {
    if (isPlaying && activeStep >= 0 && activeStep < LTV_FLOW_STEPS.length - 1) {
      timerRef.current = setTimeout(() => {
        setActiveStep(s => s + 1);
      }, 2200);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    } else if (activeStep >= LTV_FLOW_STEPS.length - 1) {
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
          <span className="text-[9px] text-gray-600">Standard LTV — end-to-end data flow</span>
        </div>
        <div className="flex items-center gap-2">
          {activeStep === -1 ? (
            <button onClick={play} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors">
              <Play className="w-3 h-3" /> Play
            </button>
          ) : (
            <>
              {isPlaying ? (
                <button onClick={stop} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors">
                  Pause
                </button>
              ) : (
                <button onClick={() => { setIsPlaying(true); }} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors">
                  <Play className="w-3 h-3" /> Resume
                </button>
              )}
              <button onClick={reset} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10 transition-colors">
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </>
          )}
          <span className="text-[9px] text-gray-600 font-mono">{activeStep >= 0 ? `${activeStep + 1}/${LTV_FLOW_STEPS.length}` : '—'}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-gray-800 mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-amber-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: activeStep >= 0 ? `${((activeStep + 1) / LTV_FLOW_STEPS.length) * 100}%` : '0%' }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {LTV_FLOW_STEPS.map((step, i) => {
          const isActive = i === activeStep;
          const isPast = i < activeStep;
          const fc = flowColors[step.color];

          return (
            <button
              key={i}
              onClick={() => { setActiveStep(i); setIsPlaying(false); }}
              className={`w-full text-left rounded-lg border p-2.5 transition-all duration-500 ${
                isActive
                  ? `${fc.border} ${fc.bg} scale-[1.01] shadow-lg`
                  : isPast
                    ? 'border-gray-800/50 bg-white/[0.01] opacity-60'
                    : 'border-gray-800/30 bg-transparent opacity-30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                  isActive ? `${fc.dot} text-white` : isPast ? 'bg-gray-700 text-gray-400' : 'bg-gray-800/50 text-gray-700'
                }`}>
                  {isPast ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-[9px] font-bold">{i + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isActive ? `${fc.bg} ${fc.text}` : 'bg-white/5 text-gray-600'
                    }`}>{step.layer}</span>
                    <code className={`text-[10px] font-mono ${isActive ? fc.text : 'text-gray-500'}`}>{step.table}</code>
                    <span className="text-[9px] text-gray-600">— {step.action}</span>
                  </div>
                  {(isActive || isPast) && (
                    <div className="mt-1">
                      <code className={`text-[10px] font-mono font-bold ${isActive ? 'text-white' : 'text-gray-400'}`}>{step.value}</code>
                      {isActive && <div className="text-[9px] text-gray-500 mt-0.5">{step.detail}</div>}
                    </div>
                  )}
                </div>

                {isActive && (
                  <div className={`w-2 h-2 rounded-full ${fc.dot} animate-pulse flex-shrink-0`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT
 * ──────────────────────────────────────────────────────────────────────────── */

export interface LTVLineageViewProps {
  /** Demo-controlled rollup level override */
  demoExpandedLevel?: string | null;
  /** Demo-controlled L2 filter override */
  demoL2Filter?: string;
  /** Show the guided demo button */
  onStartDemo?: () => void;
}

export default function LTVLineageView({
  demoExpandedLevel,
  demoL2Filter,
  onStartDemo,
}: LTVLineageViewProps = {}) {
  const [expandedLevelInternal, setExpandedLevelInternal] = useState<string | null>('facility');
  const [l2FilterInternal, setL2FilterInternal] = useState<'both' | 'standard' | 'stressed'>('both');
  const headingPrefix = useId();
  const activeSection = useActiveSection();

  // Demo overrides local state when active
  const expandedLevel = demoExpandedLevel !== undefined ? demoExpandedLevel : expandedLevelInternal;
  const l2Filter = (demoL2Filter !== undefined ? demoL2Filter : l2FilterInternal) as 'both' | 'standard' | 'stressed';
  const setExpandedLevel = (k: string | null) => setExpandedLevelInternal(k);
  const setL2Filter = (f: 'both' | 'standard' | 'stressed') => setL2FilterInternal(f);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ── HEADER ── */}
      <header data-demo="header" className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Link
                href="/metrics/library"
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-teal-400 transition-colors mb-1 no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
              >
                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                Metric Library
              </Link>
              <h1 className="text-xl font-bold text-white">LTV End-to-End Lineage</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                From drawn amount through collateral valuation to dashboard — Standard vs Stressed side by side
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
                <span className="text-xs text-gray-400">Standard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-xs text-gray-400">Stressed</span>
              </div>
            </div>
          </div>
          {/* Provenance Breadcrumb */}
          <ProvenanceBreadcrumb activeSection={activeSection} />
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
            title="LTV Formula Configuration"
            subtitle="Two variants of the same ratio — same numerator, different denominator treatment"
          />
          <InsightCallout>
            <strong>Same loan, different lens.</strong> Standard LTV uses the current appraised collateral value.
            Stressed LTV applies a haircut (e.g. 14.3%) to simulate market downturns — showing how much buffer
            remains if property values decline. Both share the same drawn amount numerator from{' '}
            <code className="text-amber-300">facility_exposure_snapshot</code>, but the denominator diverges:
            Standard reads <code className="text-teal-300">current_valuation_usd</code> directly, while Stressed
            multiplies by <code className="text-orange-300">(1 − haircut_pct)</code>.
          </InsightCallout>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div data-demo="step1-variant-standard"><VariantDefCard v={STANDARD} /></div>
            <div data-demo="step1-variant-stressed"><VariantDefCard v={STRESSED} /></div>
          </div>
        </section>

        <FlowArrow label="Components map to data model fields" />

        {/* ── JOIN MAP: THE PLUMBING DIAGRAM ── */}
        <section data-demo="join-map" aria-labelledby={`${headingPrefix}-join-map`}>
          <SectionHeading
            id={`${headingPrefix}-join-map`}
            icon={Network}
            step="Data Plumbing"
            layerColor="bg-cyan-600"
            title="Table-to-Table Join Map"
            subtitle="Every FK relationship used to compute and roll up LTV — hover any table to trace its connections"
          />
          <InteractiveJoinMap />
          <InsightCallout>
            <strong>7 tables, 3 layers, 1 self-referencing hierarchy.</strong> The{' '}
            <code className="text-blue-300">enterprise_business_taxonomy</code> table is unique — it joins to itself
            three times (desk → portfolio → LoB) via <code className="text-amber-300">parent_segment_id</code>.
            This single table provides the entire rollup dimension. The{' '}
            <code className="text-blue-300">collateral_snapshot</code> is joined via a subquery that aggregates
            multiple collateral assets per facility before computing LTV.
          </InsightCallout>
        </section>

        <FlowArrow label="L1 dimensions anchor L2 snapshots" />

        {/* ── STEP 2: L1 REFERENCE ── */}
        <section data-demo="step2" aria-labelledby={`${headingPrefix}-step2`}>
          <SectionHeading
            id={`${headingPrefix}-step2`}
            icon={Database}
            step="Step 2 — L1 Reference Data"
            layerColor="bg-blue-600"
            title="Dimensional Anchors"
            subtitle={'Reference tables that identify the "who," "what," and "where" — unchanged across variants'}
          />
          <L1Tables />
          <InsightCallout>
            <strong>6 dimensional tables anchor every LTV calculation.</strong>{' '}
            <code className="text-blue-300">facility_master</code> links exposure to collateral (via{' '}
            <code className="text-blue-300">collateral_asset_master</code>) and to the LoB hierarchy (via{' '}
            <code className="text-blue-300">enterprise_business_taxonomy</code>). The taxonomy table&apos;s
            self-referential <code className="text-amber-300">parent_segment_id</code> builds the tree:
            desk (level 3) → portfolio (level 2) → Line of Business (level 1). This hierarchy drives every rollup
            above counterparty.
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
            subtitle="Two snapshot tables — one for exposure (numerator), one for collateral (denominator)"
          />
          <div className="flex items-center gap-2 mb-4" role="group" aria-label="Filter by variant">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Highlight:</span>
            {(['both', 'standard', 'stressed'] as const).map((f) => {
              const activeStyles: Record<string, string> = {
                both: 'bg-white/10 text-white border border-gray-600',
                standard: 'bg-teal-500/20 text-teal-300 border border-teal-500/40',
                stressed: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
              };
              const labels: Record<string, string> = { both: 'Both Variants', standard: 'Standard Only', stressed: 'Stressed Only' };
              return (
                <button
                  key={f}
                  onClick={() => setL2Filter(f)}
                  aria-pressed={l2Filter === f}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
                    l2Filter === f
                      ? activeStyles[f]
                      : 'bg-white/[0.02] text-gray-500 border border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>
          <L2FieldTable activeVariant={l2Filter} />
          <InsightCallout>
            <strong>Same tables, different fields matter.</strong> Both variants pull from{' '}
            <code className="text-amber-300">facility_exposure_snapshot</code> (numerator) and{' '}
            <code className="text-amber-300">collateral_snapshot</code> (denominator). Standard only needs{' '}
            <code className="text-teal-300">current_valuation_usd</code>; Stressed also activates{' '}
            <code className="text-orange-300">haircut_pct</code> to compute the stress-adjusted denominator.
            Toggle above to see each variant&apos;s data path highlighted.
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
            title="LTV Calculation"
            subtitle="Division at facility level — T3 authority (always calculated by the platform)"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div data-demo="step4-variant-standard"><TransformCard v={STANDARD} /></div>
            <div data-demo="step4-variant-stressed"><TransformCard v={STRESSED} /></div>
          </div>
          <InsightCallout>
            <strong>T3 Calculation Authority at every level.</strong> Unlike DSCR (where the bank may supply a
            facility-level value), LTV is always computed by the platform from raw drawn amounts and collateral
            valuations. This ensures consistency: the same haircut schedule, the same collateral aggregation logic,
            and the same unsecured exclusion rule apply uniformly. Unsecured facilities receive{' '}
            <strong className="text-white">NULL</strong> — never 0% — and are excluded from all rollups.
          </InsightCallout>
        </section>

        <FlowArrow label="Results stored in L3 tables, then rolled up" />

        {/* ── ANIMATED DATA FLOW ── */}
        <section data-demo="data-flow" aria-labelledby={`${headingPrefix}-data-flow`}>
          <SectionHeading
            id={`${headingPrefix}-data-flow`}
            icon={Sparkles}
            step="End-to-End Trace"
            layerColor="bg-amber-600"
            title="Watch a Number Travel"
            subtitle="Follow a single secured facility's LTV through the entire pipeline — from raw tables to dashboard"
          />
          <AnimatedDataFlow />
        </section>

        <FlowArrow label="Individual results aggregate up the hierarchy" />

        {/* ── STEP 5: L3 OUTPUT + ROLLUP ── */}
        <section data-demo="step5" aria-labelledby={`${headingPrefix}-step5`}>
          <SectionHeading
            id={`${headingPrefix}-step5`}
            icon={GitBranch}
            step="Step 5 — L3 Output & Rollup Hierarchy"
            layerColor="bg-emerald-600"
            title="Storage & Aggregation"
            subtitle="Exposure-weighted average at every level — unsecured excluded throughout"
          />

          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <Database className="w-3 h-3" aria-hidden="true" />
              L3 Output Tables
            </div>
            <L3OutputTables />
          </div>

          <div data-demo="foundational-rule"><FoundationalRule /></div>

          <div className="mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <Link2 className="w-3 h-3" aria-hidden="true" />
              Rollup Hierarchy — Facility {'→'} Counterparty {'→'} Desk {'→'} Portfolio {'→'} LoB — click to expand
            </div>
          </div>
          <RollupPyramid expandedLevel={expandedLevel} onToggle={(k) => setExpandedLevel(expandedLevel === k ? null : k)} />
        </section>

        <FlowArrow label="Dashboard builder selects variant + dimension" />

        {/* ── STEP 6: DASHBOARD ── */}
        <section data-demo="step6" aria-labelledby={`${headingPrefix}-step6`}>
          <SectionHeading
            id={`${headingPrefix}-step6`}
            icon={LayoutDashboard}
            step="Step 6 — Dashboard Consumption"
            layerColor="bg-pink-600"
            title="Self-Service Connection"
            subtitle="Pick the metric, pick the dimension, build — no SQL needed"
          />
          <DashboardConsumption />
        </section>
      </main>
    </div>
  );
}
