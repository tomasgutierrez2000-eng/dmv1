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
 * VARIANT DATA — matches DSCREngine.tsx sample data & dscr-lineage.ts mapping
 *
 * CRE numerator sources: property_income_snapshot → L2.facility_financial_snapshot
 * C&I numerator sources: counterparty_financial_line_item → L2.facility_financial_snapshot
 * Denominator sources:   cash_flow → L2.cash_flow; counterparty_debt_schedule → L2.facility_financial_snapshot
 *
 * Math verified:
 *   CRE: 2,400,000 + 85,000 - 120,000 - 780,000 = 1,585,000 / 1,200,000 = 1.32x
 *   C&I: 3,200,000 + 890,000 + 1,100,000 + 450,000 = 5,640,000 / 1,380,000 = 4.09x
 * ──────────────────────────────────────────────────────────────────────────── */

const CRE: VariantData = {
  id: 'CRE',
  label: 'CRE DSCR (NOI)',
  product: 'Commercial Real Estate',
  subProduct: 'Multifamily',
  purpose: 'Quarterly Monitoring',
  numeratorLabel: 'NOI',
  denominatorLabel: 'Senior DS',
  formula: 'NOI ÷ Senior DS',
  numerator: 1585000,
  denominator: 1200000,
  result: '1.32x',
  resultNum: 1.32,
  colorBorder: 'border-blue-500/40',
  colorBg: 'bg-blue-500/10',
  colorText: 'text-blue-400',
  colorAccent: 'bg-blue-500',
  numeratorComponents: [
    { name: 'Gross Potential Rent', op: '+', field: 'revenue_amt', table: 'facility_financial_snapshot', value: 2400000 },
    { name: 'Other Income', op: '+', field: 'revenue_amt', table: 'facility_financial_snapshot', value: 85000 },
    { name: 'Vacancy & Credit Loss', op: '−', field: 'revenue_amt', table: 'facility_financial_snapshot', value: 120000 },
    { name: 'Operating Expenses', op: '−', field: 'operating_expense_amt', table: 'facility_financial_snapshot', value: 780000 },
  ],
  denominatorComponents: [
    { name: 'Senior Interest', field: 'amount', table: 'cash_flow', value: 720000 },
    { name: 'Senior Principal', field: 'amount', table: 'cash_flow', value: 480000 },
  ],
  calcTierFacility: 'T2',
  calcTierRollup: 'T3',
};

const CI: VariantData = {
  id: 'CI',
  label: 'C&I DSCR (EBITDA)',
  product: 'Corporate / C&I',
  subProduct: 'Middle Market',
  purpose: 'Annual Review',
  numeratorLabel: 'EBITDA',
  denominatorLabel: 'Global DS',
  formula: 'EBITDA ÷ Global DS',
  numerator: 5640000,
  denominator: 1380000,
  result: '4.09x',
  resultNum: 4.09,
  colorBorder: 'border-purple-500/40',
  colorBg: 'bg-purple-500/10',
  colorText: 'text-purple-400',
  colorAccent: 'bg-purple-500',
  numeratorComponents: [
    { name: 'Net Income', op: '+', field: 'ebitda_amt', table: 'facility_financial_snapshot', value: 3200000 },
    { name: 'Interest Expense (Add-back)', op: '+', field: 'interest_expense_amt', table: 'facility_financial_snapshot', value: 890000 },
    { name: 'Tax Provision (Add-back)', op: '+', field: 'ebitda_amt', table: 'facility_financial_snapshot', value: 1100000 },
    { name: 'Depreciation & Amortization', op: '+', field: 'ebitda_amt', table: 'facility_financial_snapshot', value: 450000 },
  ],
  denominatorComponents: [
    { name: 'Senior Interest', field: 'amount', table: 'cash_flow', value: 720000 },
    { name: 'Senior Principal', field: 'amount', table: 'cash_flow', value: 480000 },
    { name: 'Mezzanine / Sub Debt P&I', field: 'total_debt_service_amt', table: 'facility_financial_snapshot', value: 180000 },
  ],
  calcTierFacility: 'T2',
  calcTierRollup: 'T3',
};

const ROLLUP_LEVELS = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Table2,
    desc: 'Direct Calculation — raw formula applied to one borrower',
    method: 'Direct Calculation',
    purpose: 'Covenant compliance, underwriting',
    tier: 'T2',
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    desc: 'Pooled Ratio — sum cash flows / sum debt service across facilities',
    method: 'Pooled Ratio',
    purpose: 'Obligor-level credit assessment',
    tier: 'T3',
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    desc: 'Product-Segmented Pooled Ratio — pool within product type, report side-by-side',
    method: 'Product-Segmented Pooled Ratio',
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

/** L2 fields in facility_financial_snapshot — which variant uses which */
const L2_FIELDS_FFS = [
  { field: 'revenue_amt', desc: 'Revenue / Gross Potential Rent', cre: true, ci: false },
  { field: 'operating_expense_amt', desc: 'Operating Expenses', cre: true, ci: false },
  { field: 'noi_amt', desc: 'Net Operating Income (T2 reconciliation)', cre: true, ci: false },
  { field: 'ebitda_amt', desc: 'EBITDA components (Net Inc, Tax, D&A)', cre: false, ci: true },
  { field: 'interest_expense_amt', desc: 'Interest Expense (EBITDA add-back)', cre: false, ci: true },
  { field: 'principal_payment_amt', desc: 'Principal payment amount (debt service breakout)', cre: true, ci: true },
  { field: 'total_debt_service_amt', desc: 'Total Debt Service (Mezz/Sub)', cre: false, ci: true },
];

/** L3 output tables that store DSCR values */
const L3_OUTPUT_TABLES = [
  {
    table: 'metric_value_fact',
    desc: 'Generic metric storage — all DSCR variants at every aggregation level (facility, counterparty, desk, portfolio, LoB)',
    fields: ['metric_id = DSCR', 'variant_id', 'aggregation_level', 'facility_id | counterparty_id | lob_id', 'value', 'unit = x', 'display_format = 0.00x'],
    primary: true,
  },
  {
    table: 'lob_credit_quality_summary',
    desc: 'LoB-level credit quality — includes dscr_value for LoB roll-ups',
    fields: ['lob_node_id', 'dscr_value', 'avg_internal_risk_rating'],
    primary: false,
  },
  {
    table: 'lob_risk_ratio_summary',
    desc: 'LoB-level risk ratios — DSCR alongside FCCR, LTV, capital adequacy',
    fields: ['lob_node_id', 'dscr_value', 'fccr_value', 'ltv_pct', 'capital_adequacy_ratio_pct'],
    primary: false,
  },
  {
    table: 'risk_appetite_metric_state',
    desc: 'Executive dashboard — DSCR vs. risk appetite limits with RAG status & velocity',
    fields: ['metric_id = DSCR', 'current_value', 'limit_value', 'inner_threshold_value', 'status_code', 'velocity_30d_pct'],
    primary: false,
  },
  {
    table: 'facility_detail_snapshot',
    desc: 'Facility-level analytics — coverage_ratio_pct (DSCR-derived) for drawer pop-ups',
    fields: ['facility_id', 'coverage_ratio_pct', 'committed_amt', 'utilized_amt', 'counterparty_id'],
    primary: false,
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return '$' + n.toLocaleString('en-US');
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
      <div data-demo={`num-section-${v.id.toLowerCase()}`} className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
          Numerator — {v.numeratorLabel}
        </div>
        <div className="space-y-1">
          {v.numeratorComponents.map((c, i) => (
            <div key={c.name} data-demo={`num-component-${v.id.toLowerCase()}-${i}`}>
              <ComponentRow name={c.name} op={c.op} value={c.value} field={c.field} table={c.table} />
            </div>
          ))}
        </div>
        <div data-demo={`num-total-${v.id.toLowerCase()}`} className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs font-bold">
          <span className={v.colorText}>{v.numeratorLabel}</span>
          <span className="text-white font-mono">{fmt(v.numerator)}</span>
        </div>
      </div>

      {/* Denominator */}
      <div data-demo={`den-section-${v.id.toLowerCase()}`} className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
          Denominator — {v.denominatorLabel}
        </div>
        <div className="space-y-1">
          {v.denominatorComponents.map((c, i) => (
            <div key={c.name} data-demo={`den-component-${v.id.toLowerCase()}-${i}`}>
              <ComponentRow name={c.name} op="+" value={c.value} field={c.field} table={c.table} />
            </div>
          ))}
        </div>
        <div data-demo={`den-total-${v.id.toLowerCase()}`} className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs font-bold">
          <span className={v.colorText}>{v.denominatorLabel}</span>
          <span className="text-white font-mono">{fmt(v.denominator)}</span>
        </div>
      </div>

      {/* Result */}
      <div data-demo={`result-${v.id.toLowerCase()}`} className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
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
  'facility_financial_snapshot.revenue_amt': { type: 'DECIMAL(18,2)', desc: 'Revenue / Gross Potential Rent from property or business operations', fk: 'facility_id → L1.facility_master' },
  'facility_financial_snapshot.operating_expense_amt': { type: 'DECIMAL(18,2)', desc: 'Operating expenses — maintenance, insurance, property tax, management fees', fk: 'facility_id → L1.facility_master' },
  'facility_financial_snapshot.noi_amt': { type: 'DECIMAL(18,2)', desc: 'Net Operating Income — revenue minus operating expenses (T2 reconciliation)', fk: 'facility_id → L1.facility_master' },
  'facility_financial_snapshot.ebitda_amt': { type: 'DECIMAL(18,2)', desc: 'EBITDA — earnings before interest, taxes, depreciation & amortization', fk: 'facility_id → L1.facility_master' },
  'facility_financial_snapshot.interest_expense_amt': { type: 'DECIMAL(18,2)', desc: 'Interest expense (EBITDA add-back component)', fk: 'facility_id → L1.facility_master' },
  'facility_financial_snapshot.total_debt_service_amt': { type: 'DECIMAL(18,2)', desc: 'Total debt service — all principal + interest across all tranches', fk: 'facility_id → L1.facility_master' },
  'cash_flow.amount': { type: 'DECIMAL(18,2)', desc: 'Individual cash flow amount (interest or principal payment)', filter: "cash_flow_type IN ('INTEREST', 'PRINCIPAL')", fk: 'facility_id → L1.facility_master' },
};

/** Single numerator or denominator component — shows name, op, value, and source field traceability.
 *  Click to expand "X-Ray mode" showing column type, description, filter, and FK lineage. */
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

/** Expandable L1 table card with DSCR-relevant column highlighting, FK detail, and sample data */
function ExpandableTableCard({
  name, scd, desc, fields, dscrRole, sampleRow, fks, isCore,
}: {
  name: string;
  scd: string;
  desc: string;
  fields: string[];
  dscrRole?: string;
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
        {dscrRole && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">DSCR Role</span>
            <span className="text-[9px] text-emerald-400/70">{dscrRole}</span>
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
          {/* All columns */}
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

          {/* FK relationships */}
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

          {/* Sample data row */}
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

type TableCardProps = { name: string; scd: string; desc: string; fields: string[]; dscrRole?: string; fks?: { col: string; target: string }[]; sampleRow?: Record<string, string> };

function L1Tables() {
  const coreTables: TableCardProps[] = [
    {
      name: 'facility_master',
      scd: 'SCD-2',
      desc: 'Facility identity — links to LoB, product, counterparty, and credit agreement',
      fields: ['facility_id (PK)', 'facility_name', 'facility_type', 'counterparty_id (FK)', 'credit_agreement_id (FK)', 'lob_segment_id (FK)', 'product_node_id (FK)', 'portfolio_id (FK)', 'currency_code (FK)'],
      dscrRole: 'Central hub — joins L2 financial data to borrower identity and LoB hierarchy',
      fks: [
        { col: 'counterparty_id', target: 'counterparty(counterparty_id)' },
        { col: 'lob_segment_id', target: 'enterprise_business_taxonomy(managed_segment_id)' },
        { col: 'currency_code', target: 'currency_dim(currency_code)' },
      ],
      sampleRow: { facility_id: '12345', facility_name: 'Sunrise Towers CRE Loan', facility_type: 'CRE', counterparty_id: '67890', currency_code: 'USD' },
    },
    {
      name: 'counterparty',
      scd: 'SCD-2',
      desc: 'Borrower / obligor — risk ratings, industry, domicile',
      fields: ['counterparty_id (PK)', 'legal_name', 'counterparty_type', 'internal_risk_rating', 'industry_id (FK)', 'country_code (FK)', 'pd_annual', 'lgd_unsecured'],
      dscrRole: 'Borrower identity — DSCR is pooled at counterparty level for obligor assessment',
      fks: [
        { col: 'industry_id', target: 'industry_dim(industry_id)' },
        { col: 'country_code', target: 'country_dim(country_code)' },
      ],
      sampleRow: { counterparty_id: '67890', legal_name: 'Sunrise Properties LLC', counterparty_type: 'CORPORATE', internal_risk_rating: 'BB+' },
    },
    {
      name: 'credit_agreement_master',
      scd: 'SCD-2',
      desc: 'Credit agreement — links borrower and lender entities',
      fields: ['credit_agreement_id (PK)', 'borrower_counterparty_id (FK)', 'lender_legal_entity_id (FK)', 'agreement_type', 'currency_code (FK)'],
      dscrRole: 'Links multiple facilities under one agreement for covenant-level DSCR',
      fks: [
        { col: 'borrower_counterparty_id', target: 'counterparty(counterparty_id)' },
        { col: 'currency_code', target: 'currency_dim(currency_code)' },
      ],
      sampleRow: { credit_agreement_id: '9001', agreement_type: 'TERM_LOAN', borrower_counterparty_id: '67890' },
    },
  ];

  const dimensionalTables: TableCardProps[] = [
    {
      name: 'enterprise_business_taxonomy',
      scd: 'SCD-1',
      desc: 'Line of Business hierarchy — self-referencing tree for LoB rollup',
      fields: ['managed_segment_id (PK)', 'segment_code', 'segment_name', 'parent_segment_id', 'tree_level'],
      dscrRole: 'Rollup hierarchy — walks facility → desk → portfolio → LoB for aggregation',
      sampleRow: { managed_segment_id: '100', segment_code: 'CRE_DESK', segment_name: 'CRE Lending Desk', parent_segment_id: '10', tree_level: '3' },
    },
    {
      name: 'enterprise_product_taxonomy',
      scd: 'SCD-1',
      desc: 'Product hierarchy — CRE, C&I, PF, FF, Consumer classification',
      fields: ['product_node_id (PK)', 'product_code', 'product_name', 'parent_node_id', 'tree_level'],
      dscrRole: 'Determines which DSCR variant (NOI vs EBITDA) applies to a facility',
    },
    {
      name: 'scenario_dim',
      scd: 'SCD-1',
      desc: 'Stress test scenarios — Base, Rate+100bps, NOI−10%, etc.',
      fields: ['scenario_id (PK)', 'scenario_code', 'scenario_name', 'scenario_type', 'shock_parameters_json'],
    },
    {
      name: 'currency_dim',
      scd: 'SCD-0',
      desc: 'Currency reference — normalizes amounts across snapshots',
      fields: ['currency_code (PK)', 'currency_name', 'is_g10_currency'],
      dscrRole: 'Normalizes all financial amounts to a base currency before DSCR calculation',
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
      desc: 'Metric catalog — defines DSCR as a metric in the library',
      fields: ['metric_code = DSCR', 'metric_name', 'unit_type = RATIO', 'direction = HIGHER_BETTER'],
    },
  ];

  return (
    <div className="space-y-4">
      {/* Core master tables */}
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

      {/* Dimensional / classification tables */}
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

function L2FieldTable({ activeVariant }: { activeVariant: 'both' | 'CRE' | 'CI' }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* facility_financial_snapshot */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <code className="text-xs font-bold text-amber-300 font-mono">L2.facility_financial_snapshot</code>
        </div>
        <p className="text-[10px] text-gray-600 mb-3">Facility-level financial data, snapshotted quarterly (DECIMAL 18,2 measures)</p>

        {/* Measure fields — variant-filterable */}
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Measure Fields</div>
        <div className="space-y-1">
          {L2_FIELDS_FFS.map(({ field, desc, cre, ci }) => {
            const isActive =
              activeVariant === 'both' ? cre || ci : activeVariant === 'CRE' ? cre : ci;
            const showCRE = cre && (activeVariant === 'both' || activeVariant === 'CRE');
            const showCI = ci && (activeVariant === 'both' || activeVariant === 'CI');
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
                  {showCRE && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      CRE
                    </span>
                  )}
                  {showCI && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      C&I
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Join / contextual fields */}
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mt-3 mb-1.5">Join &amp; Context Fields</div>
        <div className="space-y-1">
          {[
            { field: 'facility_id', desc: 'FK \u2192 L1.facility_master' },
            { field: 'counterparty_id', desc: 'FK \u2192 L1.counterparty' },
            { field: 'currency_code', desc: 'FK \u2192 L1.currency_dim' },
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

      {/* cash_flow */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-amber-400" aria-hidden="true" />
          <code className="text-xs font-bold text-amber-300 font-mono">L2.cash_flow</code>
        </div>
        <p className="text-[10px] text-gray-600 mb-3">Individual cash flow events — interest &amp; principal payments</p>
        <div className="space-y-1">
          {[
            { field: 'amount', desc: 'Cash flow amount (DECIMAL 18,2)', filter: 'type = interest', measure: true },
            { field: 'amount', desc: 'Cash flow amount (DECIMAL 18,2)', filter: 'type = principal', measure: true },
            { field: 'cash_flow_type', desc: 'Filter dimension', filter: 'interest | principal', measure: false },
            { field: 'cash_flow_date', desc: 'Time dimension', filter: 'DATE', measure: false },
            { field: 'facility_id', desc: 'FK \u2192 L1.facility_master', filter: 'JOIN key', measure: false },
            { field: 'counterparty_id', desc: 'FK \u2192 L1.counterparty', filter: 'JOIN key', measure: false },
            { field: 'currency_code', desc: 'FK \u2192 L1.currency_dim', filter: 'JOIN key', measure: false },
            { field: 'maturity_bucket_id', desc: 'FK \u2192 L1.maturity_bucket_dim', filter: 'optional', measure: false },
          ].map((f, i) => (
            <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${f.measure ? 'bg-white/5' : 'bg-white/[0.02]'}`}>
              <div className="min-w-0">
                <code className={`font-mono ${f.measure ? 'text-gray-200' : 'text-gray-400'}`}>{f.field}</code>
                <div className="text-[9px] text-gray-500 mt-0.5">{f.desc}</div>
              </div>
              <span className="text-[9px] text-gray-600 font-mono flex-shrink-0 ml-2">{f.filter}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">CRE</span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">C&I</span>
          <span className="text-[9px] text-gray-500 ml-1">Both variants use this table for debt service</span>
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
          <strong className="text-amber-300">T2:</strong> Bank sends their DSCR + platform recalculates from raw components.
          Differences beyond tolerance trigger reconciliation flags.
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
            Foundational Rule: Never Average Pre-Computed Ratios
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            At every level above the facility, DSCR must be <strong className="text-white">re-derived</strong> by
            summing the Cash Flow Available for Debt Service (numerator) independently from Total Debt Service
            (denominator) and dividing only at the level being displayed. You never take facility DSCRs and
            average them.
          </p>
          <div className="mt-2 bg-black/30 rounded-lg p-3">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex-1 text-center">
                <div className="text-red-400 font-mono line-through mb-1 opacity-70">
                  avg(DSCR<sub>1</sub>, DSCR<sub>2</sub>, ... DSCR<sub>n</sub>)
                </div>
                <div className="text-[9px] text-red-400/60">Wrong</div>
              </div>
              <div className="text-gray-600 text-lg">vs.</div>
              <div className="flex-1 text-center">
                <div className="text-emerald-400 font-mono mb-1">
                  {'Σ'} Cash Flow / {'Σ'} Debt Service
                </div>
                <div className="text-[9px] text-emerald-400/60">Correct</div>
              </div>
            </div>
          </div>
          <PlainEnglish>
            Think of it like calculating a school&apos;s GPA: you don&apos;t average GPAs from each classroom.
            You add up all grade points and all credit hours from every student, then divide once.
            Rating agencies like S&P calculate pooled DSCR across mortgage portfolios the same way &mdash;
            aggregate NOI divided by aggregate debt service, not an average of individual property DSCRs.
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
 * ROLLUP JOIN CHAIN — "Follow the Money Up"
 *
 * Shows the specific FK join path at each rollup level with animated
 * hop indicators, table names, and join predicates.
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
      { from: 'facility_financial_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get loan identity' },
      { from: 'cash_flow', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Get debt payments' },
    ],
    aggregation: 'Direct division: Numerator ÷ Denominator',
    result: 'One DSCR per facility (no aggregation needed)',
  },
  counterparty: {
    hops: [
      { from: 'facility_financial_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Financial data → loan' },
      { from: 'facility_master', fromLayer: 'L1', to: 'counterparty', toLayer: 'L1', joinKey: 'counterparty_id', note: 'Loan → borrower' },
    ],
    aggregation: 'Pool: SUM(numerator) across all facilities for this counterparty, then SUM(denominator), then divide once',
    result: 'One pooled DSCR per counterparty',
  },
  desk: {
    hops: [
      { from: 'facility_financial_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Financial data → loan' },
      { from: 'facility_master', fromLayer: 'L1', to: 'counterparty', toLayer: 'L1', joinKey: 'counterparty_id', note: 'Loan → borrower' },
      { from: 'facility_master', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'lob_segment_id → managed_segment_id', note: 'Loan → desk (via LoB tree)' },
    ],
    aggregation: 'Segment by product type (CRE vs C&I), then pool within each segment',
    result: 'Separate pooled DSCR per product type per desk',
  },
  portfolio: {
    hops: [
      { from: 'counterparty (pooled DSCR)', fromLayer: 'L1', to: 'facility_exposure_snapshot', toLayer: 'L2', joinKey: 'counterparty_id', note: 'Get exposure weights' },
      { from: 'enterprise_business_taxonomy', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id → managed_segment_id', note: 'Walk tree: desk → portfolio' },
    ],
    aggregation: 'Exposure-weighted: Σ(DSCR × exposure) ÷ Σ(exposure) across counterparties in portfolio',
    result: 'One weighted-average DSCR per portfolio + distribution buckets',
  },
  lob: {
    hops: [
      { from: 'portfolio (weighted DSCR)', fromLayer: 'L1', to: 'enterprise_business_taxonomy', toLayer: 'L1', joinKey: 'parent_segment_id', note: 'Walk tree: portfolio → LoB root' },
      { from: 'facility_exposure_snapshot', fromLayer: 'L2', to: 'facility_master', toLayer: 'L1', joinKey: 'facility_id', note: 'Re-weight by total LoB exposure' },
    ],
    aggregation: 'Exposure-weighted average across all portfolios in LoB (directional only)',
    result: 'One trend DSCR per Line of Business — monitoring, not a limit',
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

      {/* Hop chain */}
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

      {/* Aggregation method */}
      <div className="mt-2 pt-2 border-t border-white/5 flex items-start gap-2 text-[10px]">
        <RefreshCw className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-gray-500 font-medium">Aggregation: </span>
          <span className="text-purple-300">{chain.aggregation}</span>
        </div>
      </div>

      {/* Result */}
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
      {/* Formula */}
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Formula (Applied Directly)</div>
        <div className="text-sm font-mono text-emerald-400 text-center">
          DSCR = Cash Flow Available for Debt Service / Total Debt Service
        </div>
        <PlainEnglish>
          How much income does this one borrower generate, versus how much they owe in loan payments?
          A DSCR of 1.5x means they earn $1.50 for every $1.00 of debt payments.
        </PlainEnglish>
      </div>
      <JoinChainVisual levelKey="facility" />

      {/* Variant-specific numerators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5">
          <div className="text-[10px] font-bold text-blue-300 mb-1">CRE</div>
          <div className="text-xs text-gray-300">Numerator = <strong className="text-blue-300">NOI</strong> (Net Operating Income from property)</div>
        </div>
        <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-2.5">
          <div className="text-[10px] font-bold text-purple-300 mb-1">C&I / Corporate</div>
          <div className="text-xs text-gray-300">Numerator = <strong className="text-purple-300">EBITDA</strong> (with institution-defined adjustments)</div>
        </div>
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5">
          <div className="text-[10px] font-bold text-amber-300 mb-1">Project Finance</div>
          <div className="text-xs text-gray-300">Numerator = <strong className="text-amber-300">Distributable Cash Flow</strong></div>
        </div>
      </div>

      {/* Governance notes */}
      <div className="space-y-1.5">
        <div className="flex items-start gap-2 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-600" aria-hidden="true" />
          <span><strong className="text-gray-300">Temporal lag:</strong> Financial data is quarterly or annual. DSCR at any point reflects the most recent financial spread, not a real-time value.</span>
        </div>
        <div className="flex items-start gap-2 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-600" aria-hidden="true" />
          <span><strong className="text-gray-300">Covenant vs. monitoring DSCR:</strong> These may already diverge at facility level if the credit agreement definition differs from the institution&apos;s credit policy definition.</span>
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
        This is the first aggregation point and where most GSIB implementation errors originate.
        A single counterparty may have multiple facilities &mdash; the critical question is whether those
        facilities share the same borrower cash flow or have independent cash flow bases.
      </div>
      <JoinChainVisual levelKey="counterparty" />

      {/* Two scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Scenario A */}
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span className="text-xs font-bold text-emerald-300">Scenario A: Single Obligor, Multiple Facilities</span>
          </div>
          <div className="text-[10px] text-gray-500 mb-2">Most common in corporate lending (e.g., revolver + term loan)</div>
          <div className="bg-black/30 rounded-lg p-2.5 mb-2">
            <div className="text-xs font-mono text-emerald-400 text-center">
              Borrower EBITDA / (DS<sub>facility1</sub> + DS<sub>facility2</sub> + ...)
            </div>
          </div>
          <PlainEnglish>
            One company&apos;s income covers all its loans. You use the same income number in the numerator
            and add up all loan payments in the denominator.
          </PlainEnglish>
        </div>

        {/* Scenario B */}
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-3">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-blue-400" aria-hidden="true" />
            <span className="text-xs font-bold text-blue-300">Scenario B: Multiple Independent Cash Flows</span>
          </div>
          <div className="text-[10px] text-gray-500 mb-2">Common in CRE and project finance (e.g., multiple properties)</div>
          <div className="bg-black/30 rounded-lg p-2.5 mb-2">
            <div className="text-xs font-mono text-blue-400 text-center">
              {'Σ'} Property NOIs / {'Σ'} Property Debt Service
            </div>
          </div>
          <div className="text-[9px] text-blue-400/70 text-center mb-2">
            &ldquo;Global DSCR&rdquo; &mdash; assesses total debt capacity across all assets
          </div>
          <PlainEnglish>
            Add up all rental income from every property. Add up all the mortgage payments.
            Then divide. Each property earns independently, so you pool them all.
          </PlainEnglish>
        </div>
      </div>

      {/* Role-based attribution */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-amber-300 mb-1">Role-Based Attribution</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              When a facility has multiple counterparties (borrower, guarantor, co-obligor), DSCR cannot be
              assigned at full value to each. The <strong className="text-gray-300">primary obligor carries the full facility DSCR</strong>.
              Guarantors carry a pro-rata or exposure-weighted share depending on the guarantee structure.
              This attribution must be resolved before rolling up to the desk level.
            </p>
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
        At the desk level, DSCR transitions from a borrower-specific metric to a <strong className="text-gray-300">portfolio health
        indicator</strong> for that book of business. The challenge is product heterogeneity &mdash; a desk may hold CRE loans
        (NOI-based), corporate loans (EBITDA-based), and project finance (distributable cash flow). These numerators
        were constructed differently, so they are not directly comparable.
      </div>
      <JoinChainVisual levelKey="desk" />

      {/* Two approaches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Approach 1 — Preferred */}
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span className="text-xs font-bold text-emerald-300">Product-Segmented DSCR</span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Preferred
            </span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-2">
            Report DSCR separately by product type. Don&apos;t pool across definitionally incompatible numerators.
            This is what model risk and internal audit functions prefer.
          </p>
          <div className="bg-black/30 rounded-lg p-2.5">
            <div className="text-xs font-mono text-gray-300 space-y-1">
              <div><span className="text-blue-400">CRE DSCR:</span> {'Σ'} NOI / {'Σ'} DS <span className="text-gray-600">(CRE facilities only)</span></div>
              <div><span className="text-purple-400">C&I DSCR:</span> {'Σ'} EBITDA / {'Σ'} DS <span className="text-gray-600">(C&I facilities only)</span></div>
            </div>
          </div>
        </div>

        {/* Approach 2 — Alternative */}
        <div className="rounded-lg border border-gray-700 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span className="text-xs font-bold text-gray-300">Normalized DSCR</span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Adds Model Risk
            </span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mb-2">
            Apply a single normalized cash flow definition across all facilities to enable pooling.
            Requires a policy decision on which definition to use. The normalized value will deviate
            from the covenant definition for some facilities.
          </p>
          <div className="bg-black/30 rounded-lg p-2.5">
            <div className="text-xs font-mono text-gray-400">
              {'Σ'} Normalized CF / {'Σ'} DS <span className="text-gray-600">(all facilities, one definition)</span>
            </div>
          </div>
        </div>
      </div>

      <PlainEnglish>
        Comparing NOI-based DSCR and EBITDA-based DSCR is like comparing apples and oranges.
        It&apos;s better to show separate scores per product type than to blend them into one number.
        Most GSIBs use the segmented approach at the desk level and only blend at higher levels
        where granularity is intentionally sacrificed for executive visibility.
      </PlainEnglish>
    </div>
  );
}

/* ── PORTFOLIO ── */
const DSCR_BUCKETS = [
  { range: '< 1.0x', status: 'Critical', count: 3, exposure: 45, color: 'text-red-400', bg: 'bg-red-500/10' },
  { range: '1.0 - 1.25x', status: 'Watch', count: 8, exposure: 180, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { range: '1.25 - 1.5x', status: 'Adequate', count: 15, exposure: 420, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { range: '1.5 - 2.0x', status: 'Good', count: 22, exposure: 890, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { range: '> 2.0x', status: 'Strong', count: 12, exposure: 650, color: 'text-emerald-300', bg: 'bg-emerald-500/10' },
];

function PortfolioDetail() {
  const totalExposure = DSCR_BUCKETS.reduce((s, b) => s + b.exposure, 0);

  return (
    <div className="space-y-3">
      <JoinChainVisual levelKey="portfolio" />
      {/* Formula */}
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Exposure-Weighted Average</div>
        <div className="text-sm font-mono text-emerald-400 text-center">
          {'Σ'}(Counterparty DSCR {'×'} Counterparty Exposure) / {'Σ'}(Counterparty Exposure)
        </div>
        <PlainEnglish>
          Bigger loans count more. A $100M borrower&apos;s DSCR matters more than a $1M borrower&apos;s.
          This is a pragmatic compromise at the portfolio level because the pure pooled ratio becomes hard
          to interpret when spanning dozens of industries, borrower types, and product definitions.
        </PlainEnglish>
      </div>

      {/* DSCR Distribution Buckets */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" aria-hidden="true" />
          DSCR Distribution Buckets (sample)
        </div>
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-5 text-[9px] font-bold uppercase tracking-wider text-gray-500 bg-white/[0.03] px-3 py-1.5">
            <div>Bucket</div>
            <div>Status</div>
            <div className="text-right">Count</div>
            <div className="text-right">Exposure ($M)</div>
            <div className="text-right">% of Total</div>
          </div>
          {DSCR_BUCKETS.map((b) => (
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
          Sort all borrowers into health grades and show how much money sits in each grade.
          This bucket breakdown should appear alongside the headline weighted average on the dashboard.
        </PlainEnglish>
      </div>

      {/* Simpson's Paradox */}
      <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-red-300 mb-1">Simpson&apos;s Paradox Warning</div>
            <p className="text-xs text-gray-400 leading-relaxed">
              A portfolio with a healthy weighted average DSCR can still contain a significant sub-segment
              with DSCR below 1.0x. High-quality borrowers with large exposure can mask concentrations
              of weakness. <strong className="text-gray-300">This is exactly why the distribution buckets exist</strong> &mdash;
              they reveal what the average hides.
            </p>
            <PlainEnglish>
              A few large, healthy loans can make the whole portfolio look fine even if many smaller loans
              are struggling. Always look at the buckets, not just the average.
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
      {/* Formula */}
      <div className="bg-black/30 rounded-lg p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Exposure-Weighted Average (same as Portfolio)</div>
        <div className="text-sm font-mono text-emerald-400 text-center">
          {'Σ'}(Counterparty DSCR {'×'} Exposure) / {'Σ'}(Exposure)
        </div>
        <PlainEnglish>
          This is a health thermometer, not a speed limit. It tells you which direction
          the Line of Business is moving &mdash; toward or away from covenant thresholds.
        </PlainEnglish>
      </div>

      {/* Two governance complications */}
      <div className="space-y-2">
        {/* Definitional inconsistency */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-xs font-bold text-amber-300 mb-1">Definitional Inconsistency Across LoBs</div>
              <p className="text-xs text-gray-400 leading-relaxed mb-2">
                When a CRO asks for enterprise-wide DSCR across all LoBs, the metric is <strong className="text-gray-300">not
                directly comparable</strong> across segments:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="rounded bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 text-[10px]">
                  <span className="text-blue-300 font-bold">CRE:</span>
                  <span className="text-gray-400"> NOI-based DSCR</span>
                </div>
                <div className="rounded bg-purple-500/10 border border-purple-500/20 px-2.5 py-1.5 text-[10px]">
                  <span className="text-purple-300 font-bold">Large Corporate:</span>
                  <span className="text-gray-400"> EBITDA-based DSCR</span>
                </div>
                <div className="rounded bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-[10px]">
                  <span className="text-amber-300 font-bold">Leveraged Finance:</span>
                  <span className="text-gray-400"> Adjusted EBITDA with add-backs</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                Most GSIBs report LoB-segmented DSCR values side by side, or add a disclaimer that LoB-level
                DSCRs are computed on non-comparable bases.
              </p>
            </div>
          </div>
        </div>

        {/* Not a limit metric */}
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] p-3">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-xs font-bold text-blue-300 mb-1">Monitoring Metric, Not a Limit Metric</div>
              <p className="text-xs text-gray-400 leading-relaxed">
                LoB-level limits are set on <strong className="text-gray-300">exposure, concentration, and capital</strong> &mdash; not
                DSCR. At this level, DSCR is used to identify trend deterioration, benchmark against prior periods,
                and flag whether overall borrower quality is improving or declining.
              </p>
              <p className="text-[10px] text-gray-500 mt-1.5">
                On the dashboard, LoB DSCR should appear in the <strong className="text-gray-400">Risk Profile</strong> group as a trend
                indicator, not in the Exposure Details group with a limit and breach status.
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
  const [selectedVariant, setSelectedVariant] = useState<'CRE' | 'CI'>('CRE');
  const [selectedLevel, setSelectedLevel] = useState('portfolio');

  const isCRE = selectedVariant === 'CRE';

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
              onClick={() => setSelectedVariant('CRE')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
                selectedVariant === 'CRE'
                  ? 'bg-blue-500/15 border border-blue-500/40 text-blue-300'
                  : 'bg-white/[0.02] border border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              <span className="font-semibold">CRE DSCR (NOI)</span>
              <span className="block text-[10px] mt-0.5 opacity-70">Multifamily {'•'} Quarterly</span>
            </button>
            <button
              onClick={() => setSelectedVariant('CI')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
                selectedVariant === 'CI'
                  ? 'bg-purple-500/15 border border-purple-500/40 text-purple-300'
                  : 'bg-white/[0.02] border border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              <span className="font-semibold">C&I DSCR (EBITDA)</span>
              <span className="block text-[10px] mt-0.5 opacity-70">Middle Market {'•'} Annual</span>
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
              isCRE ? 'border-blue-500/30 bg-blue-500/5' : 'border-purple-500/30 bg-purple-500/5'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <LayoutDashboard className={`w-4 h-4 ${isCRE ? 'text-blue-400' : 'text-purple-400'}`} aria-hidden="true" />
              <span className="text-xs font-bold text-white">Ready to Connect</span>
            </div>
            <div className="space-y-2 text-xs">
              <Row label="Metric" value={isCRE ? 'CRE DSCR (NOI)' : 'C&I DSCR (EBITDA)'} />
              <Row label="Level" value={selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} />
              <Row label="L3 Table" value="metric_value_fact" />
              <Row label="Join Logic" value="Auto-resolved" />
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
 *
 * Persistent trail in the header showing the full L1 → L2 → Transform → L3
 * lineage path. Highlights the current section based on scroll position.
 * ──────────────────────────────────────────────────────────────────────────── */

const BREADCRUMB_STEPS = [
  { id: 'step1', label: 'Definition', layer: 'User', color: 'purple', anchor: 'step1' },
  { id: 'join-map', label: 'Join Map', layer: 'Plumbing', color: 'cyan', anchor: 'join-map' },
  { id: 'step2', label: 'L1 Reference', layer: 'L1', color: 'blue', anchor: 'step2', tables: ['facility_master', 'counterparty', 'enterprise_business_taxonomy'] },
  { id: 'step3', label: 'L2 Snapshot', layer: 'L2', color: 'amber', anchor: 'step3', tables: ['facility_financial_snapshot', 'cash_flow'] },
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
 * INTERACTIVE JOIN MAP ("The Plumbing Diagram")
 *
 * Shows the complete FK join chain from L1 → L2 → Transform → L3
 * with hover highlighting, join key annotations, and variant-aware paths.
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
  variant?: 'CRE' | 'CI' | 'both';
  label?: string;
}

const JOIN_MAP_NODES: JoinMapNode[] = [
  // L1 column (col 0)
  { id: 'facility_master', label: 'facility_master', layer: 'L1', fields: ['facility_id (PK)', 'counterparty_id (FK)', 'facility_type'], col: 0, row: 0 },
  { id: 'counterparty', label: 'counterparty', layer: 'L1', fields: ['counterparty_id (PK)', 'legal_name', 'industry_id'], col: 0, row: 1 },
  { id: 'ebt', label: 'enterprise_business_taxonomy', layer: 'L1', fields: ['managed_segment_id (PK)', 'parent_segment_id', 'tree_level'], col: 0, row: 2 },
  { id: 'currency_dim', label: 'currency_dim', layer: 'L1', fields: ['currency_code (PK)', 'currency_name'], col: 0, row: 3 },
  // L2 column (col 1)
  { id: 'ffs', label: 'facility_financial_snapshot', layer: 'L2', fields: ['facility_id+as_of_date (PK)', 'revenue_amt', 'noi_amt', 'ebitda_amt', 'total_debt_service_amt'], col: 1, row: 0 },
  { id: 'cash_flow', label: 'cash_flow', layer: 'L2', fields: ['cash_flow_id (PK)', 'facility_id (FK)', 'amount', 'cash_flow_type'], col: 1, row: 1 },
  { id: 'fes', label: 'facility_exposure_snapshot', layer: 'L2', fields: ['facility_id+as_of_date (PK)', 'drawn_amount', 'committed_amount'], col: 1, row: 2 },
  // Transform column (col 2)
  { id: 'dscr_calc', label: 'DSCR Formula', layer: 'transform', fields: ['Numerator ÷ Denominator', 'T2: Source + Validate'], col: 2, row: 0 },
  { id: 'rollup_calc', label: 'Rollup Engine', layer: 'transform', fields: ['Pooled ratio (Cpty)', 'Exp-weighted avg (Port)'], col: 2, row: 1 },
  // L3 column (col 3)
  { id: 'metric_value_fact', label: 'metric_value_fact', layer: 'L3', fields: ['metric_id=DSCR', 'value', 'aggregation_level'], col: 3, row: 0 },
  { id: 'risk_appetite', label: 'risk_appetite_metric_state', layer: 'L3', fields: ['current_value', 'limit_value', 'status_code'], col: 3, row: 1 },
];

const JOIN_MAP_EDGES: JoinMapEdge[] = [
  // L1 → L2 joins
  { from: 'facility_master', to: 'ffs', joinKey: 'facility_id', variant: 'both' },
  { from: 'facility_master', to: 'cash_flow', joinKey: 'facility_id', variant: 'both' },
  { from: 'facility_master', to: 'fes', joinKey: 'facility_id', variant: 'both' },
  { from: 'counterparty', to: 'facility_master', joinKey: 'counterparty_id', variant: 'both', label: 'Borrower → Loans' },
  { from: 'currency_dim', to: 'ffs', joinKey: 'currency_code', variant: 'both' },
  { from: 'currency_dim', to: 'cash_flow', joinKey: 'currency_code', variant: 'both' },
  // L2 → Transform
  { from: 'ffs', to: 'dscr_calc', joinKey: 'noi_amt, revenue_amt', variant: 'CRE', label: 'NOI path' },
  { from: 'ffs', to: 'dscr_calc', joinKey: 'ebitda_amt, interest_expense_amt', variant: 'CI', label: 'EBITDA path' },
  { from: 'cash_flow', to: 'dscr_calc', joinKey: 'SUM(amount)', variant: 'both', label: 'Debt service' },
  { from: 'fes', to: 'rollup_calc', joinKey: 'drawn_amount', variant: 'both', label: 'Exposure weights' },
  // L1 → Transform (rollup hierarchy)
  { from: 'ebt', to: 'rollup_calc', joinKey: 'parent_segment_id → tree_level', variant: 'both', label: 'LoB hierarchy' },
  // Transform → L3
  { from: 'dscr_calc', to: 'metric_value_fact', joinKey: 'DSCR value', variant: 'both' },
  { from: 'rollup_calc', to: 'metric_value_fact', joinKey: 'Aggregated values', variant: 'both' },
  { from: 'rollup_calc', to: 'risk_appetite', joinKey: 'LoB-level DSCR', variant: 'both' },
];

const LAYER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  L1: { bg: 'bg-blue-950/60', border: 'border-blue-500/40', text: 'text-blue-300', badge: 'bg-blue-500/20 text-blue-300' },
  L2: { bg: 'bg-amber-950/60', border: 'border-amber-500/40', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-300' },
  transform: { bg: 'bg-purple-950/60', border: 'border-purple-500/40', text: 'text-purple-300', badge: 'bg-purple-500/20 text-purple-300' },
  L3: { bg: 'bg-emerald-950/60', border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
};

function InteractiveJoinMap() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [variantFilter, setVariantFilter] = useState<'both' | 'CRE' | 'CI'>('both');

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
          {(['both', 'CRE', 'CI'] as const).map(f => {
            const activeStyles: Record<string, string> = {
              both: 'bg-white/10 text-white border border-gray-600',
              CRE: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
              CI: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
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
                {f === 'both' ? 'All' : f === 'CI' ? 'C&I' : f}
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
                  ? edge.variant === 'CRE' ? '#3b82f6' : edge.variant === 'CI' ? '#a855f7' : '#10b981'
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
 *
 * Step-by-step animation showing a single facility's data flowing
 * from L1 master → L2 snapshot → Transform → L3 output → rollup chain.
 * ──────────────────────────────────────────────────────────────────────────── */

interface FlowStep {
  layer: string;
  table: string;
  action: string;
  value: string;
  detail: string;
  color: string;
}

const CRE_FLOW_STEPS: FlowStep[] = [
  { layer: 'L1', table: 'facility_master', action: 'Identify facility', value: 'facility_id = 12345', detail: 'Sunrise Towers CRE Loan — Multifamily, $50M committed', color: 'blue' },
  { layer: 'L1', table: 'counterparty', action: 'Identify borrower', value: 'counterparty_id = 67890', detail: 'Sunrise Properties LLC — BB+ rated, CRE developer', color: 'blue' },
  { layer: 'L2', table: 'facility_financial_snapshot', action: 'Pull income data', value: 'noi_amt = $1,585,000', detail: 'Q4-2024 snapshot: GPR $2.4M + Other $85K − Vacancy $120K − OpEx $780K', color: 'amber' },
  { layer: 'L2', table: 'cash_flow', action: 'Sum debt payments', value: 'SUM(amount) = $1,200,000', detail: 'Interest: $720K + Principal: $480K (WHERE type IN INTEREST, PRINCIPAL)', color: 'amber' },
  { layer: 'Calc', table: 'DSCR Formula', action: 'Compute ratio', value: '$1,585,000 ÷ $1,200,000 = 1.32x', detail: 'T2 authority: platform recalculates, bank value matches → validated', color: 'purple' },
  { layer: 'L3', table: 'metric_value_fact', action: 'Store result', value: 'DSCR = 1.32x (facility level)', detail: 'metric_id=DSCR, variant_id=CRE_NOI, aggregation_level=FACILITY', color: 'emerald' },
  { layer: 'Rollup', table: 'Counterparty pool', action: 'Pool with siblings', value: '(1.585M + 2.1M + 0.89M) ÷ (1.2M + 1.4M + 0.95M) = 1.29x', detail: '3 facilities pooled: Multifamily 1.32x + Office 1.50x + Retail 0.94x', color: 'emerald' },
  { layer: 'Rollup', table: 'Portfolio weighted avg', action: 'Weight by exposure', value: 'Σ(DSCR×exp) ÷ Σ(exp) = 1.45x', detail: 'Exposure-weighted across 60 counterparties in portfolio', color: 'emerald' },
  { layer: 'Dashboard', table: 'P5 — Trends & Stress', action: 'Display on dashboard', value: 'Portfolio CRE DSCR: 1.45x (Adequate)', detail: 'RAG status: Green — above 1.25x threshold, velocity +2% MoM', color: 'pink' },
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
    if (isPlaying && activeStep >= 0 && activeStep < CRE_FLOW_STEPS.length - 1) {
      timerRef.current = setTimeout(() => {
        setActiveStep(s => s + 1);
      }, 2200);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    } else if (activeStep >= CRE_FLOW_STEPS.length - 1) {
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
          <span className="text-[9px] text-gray-600">CRE Facility — end-to-end data flow</span>
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
          <span className="text-[9px] text-gray-600 font-mono">{activeStep >= 0 ? `${activeStep + 1}/${CRE_FLOW_STEPS.length}` : '—'}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-gray-800 mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-amber-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: activeStep >= 0 ? `${((activeStep + 1) / CRE_FLOW_STEPS.length) * 100}%` : '0%' }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {CRE_FLOW_STEPS.map((step, i) => {
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
                {/* Step indicator */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                  isActive ? `${fc.dot} text-white` : isPast ? 'bg-gray-700 text-gray-400' : 'bg-gray-800/50 text-gray-700'
                }`}>
                  {isPast ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-[9px] font-bold">{i + 1}</span>
                  )}
                </div>

                {/* Content */}
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

                {/* Animated dot for active step */}
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
 * QUERY PLAN VIEW — "How the Engine Thinks"
 *
 * Shows the logical steps the calculation engine takes in pseudocode,
 * with an expandable SQL toggle for technical users.
 * ──────────────────────────────────────────────────────────────────────────── */

interface QueryStep {
  step: number;
  action: string;
  pseudocode: string;
  sql: string;
  tables: string[];
  layer: string;
}

const CRE_QUERY_PLAN: QueryStep[] = [
  {
    step: 1,
    action: 'Identify target facilities',
    pseudocode: 'Find all CRE facilities for the current reporting period',
    sql: `SELECT f.facility_id, f.facility_type, f.counterparty_id
FROM l1.facility_master f
JOIN l1.enterprise_product_taxonomy p ON f.product_node_id = p.product_node_id
WHERE p.product_code = 'CRE'
  AND f.is_active = 'Y'`,
    tables: ['facility_master', 'enterprise_product_taxonomy'],
    layer: 'L1',
  },
  {
    step: 2,
    action: 'Pull financial snapshot',
    pseudocode: 'For each facility, get the latest quarterly financial data',
    sql: `SELECT ffs.facility_id, ffs.revenue_amt, ffs.operating_expense_amt, ffs.noi_amt
FROM l2.facility_financial_snapshot ffs
WHERE ffs.facility_id IN (... step 1 results ...)
  AND ffs.as_of_date = (SELECT MAX(as_of_date) FROM l2.facility_financial_snapshot)`,
    tables: ['facility_financial_snapshot'],
    layer: 'L2',
  },
  {
    step: 3,
    action: 'Compute NOI (numerator)',
    pseudocode: 'Calculate Net Operating Income: revenue − vacancy − operating expenses',
    sql: `-- NOI = revenue_amt - operating_expense_amt (pre-computed in snapshot)
-- If not pre-computed:
-- GPR + other_income - vacancy_loss - operating_expenses = NOI
SELECT facility_id, noi_amt AS numerator
FROM step_2_result`,
    tables: ['facility_financial_snapshot'],
    layer: 'Transform',
  },
  {
    step: 4,
    action: 'Sum debt service (denominator)',
    pseudocode: 'Sum all interest + principal payments for each facility in the period',
    sql: `SELECT cf.facility_id,
       SUM(cf.amount) AS denominator
FROM l2.cash_flow cf
WHERE cf.facility_id IN (... step 1 results ...)
  AND cf.cash_flow_type IN ('INTEREST', 'PRINCIPAL')
  AND cf.cash_flow_date BETWEEN '2024-10-01' AND '2024-12-31'
GROUP BY cf.facility_id`,
    tables: ['cash_flow'],
    layer: 'L2',
  },
  {
    step: 5,
    action: 'Calculate DSCR',
    pseudocode: 'Divide numerator by denominator for each facility',
    sql: `SELECT s3.facility_id,
       s3.numerator,
       s4.denominator,
       s3.numerator / NULLIF(s4.denominator, 0) AS dscr_value
FROM step_3_result s3
JOIN step_4_result s4 ON s3.facility_id = s4.facility_id`,
    tables: [],
    layer: 'Transform',
  },
  {
    step: 6,
    action: 'Store in L3 output',
    pseudocode: 'Write DSCR value to metric_value_fact with metadata',
    sql: `INSERT INTO l3.metric_value_fact (metric_id, variant_id, aggregation_level,
       entity_id, value, unit, as_of_date)
VALUES ('DSCR', 'CRE_NOI', 'FACILITY', facility_id, dscr_value, 'x', CURRENT_DATE)`,
    tables: ['metric_value_fact'],
    layer: 'L3',
  },
];

function QueryPlanView() {
  const [showSql, setShowSql] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const layerColors: Record<string, { badge: string; text: string }> = {
    L1: { badge: 'bg-blue-500/20 text-blue-300', text: 'text-blue-300' },
    L2: { badge: 'bg-amber-500/20 text-amber-300', text: 'text-amber-300' },
    Transform: { badge: 'bg-purple-500/20 text-purple-300', text: 'text-purple-300' },
    L3: { badge: 'bg-emerald-500/20 text-emerald-300', text: 'text-emerald-300' },
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white">Query Plan</span>
          <span className="text-[9px] text-gray-600">CRE DSCR — logical execution steps</span>
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
        {CRE_QUERY_PLAN.map((step) => {
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

              {/* SQL detail */}
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
 * CRE vs C&I SCHEMA DIFF
 *
 * Side-by-side view showing how the same physical tables serve different
 * logical roles depending on the DSCR product variant.
 * ──────────────────────────────────────────────────────────────────────────── */

const SCHEMA_DIFF_ROWS: {
  table: string;
  column: string;
  crePath: string | null;
  ciPath: string | null;
  creFilter?: string;
  ciFilter?: string;
}[] = [
  { table: 'facility_financial_snapshot', column: 'revenue_amt', crePath: 'Numerator (GPR + Other Income)', ciPath: null },
  { table: 'facility_financial_snapshot', column: 'operating_expense_amt', crePath: 'Numerator (subtracted from revenue)', ciPath: null },
  { table: 'facility_financial_snapshot', column: 'noi_amt', crePath: 'T2 reconciliation check', ciPath: null },
  { table: 'facility_financial_snapshot', column: 'ebitda_amt', crePath: null, ciPath: 'Numerator (Net Inc + Tax + D&A)' },
  { table: 'facility_financial_snapshot', column: 'interest_expense_amt', crePath: null, ciPath: 'Numerator (EBITDA add-back)' },
  { table: 'facility_financial_snapshot', column: 'total_debt_service_amt', crePath: null, ciPath: 'Denominator (mezz/sub debt)' },
  { table: 'cash_flow', column: 'amount', crePath: 'Denominator (senior DS only)', ciPath: 'Denominator (global DS)', creFilter: "type IN ('INTEREST','PRINCIPAL')", ciFilter: "type IN ('INTEREST','PRINCIPAL','MEZZANINE')" },
  { table: 'cash_flow', column: 'cash_flow_type', crePath: 'Filter: senior tranches only', ciPath: 'Filter: all tranches' },
  { table: 'facility_master', column: 'facility_type', crePath: "WHERE = 'CRE'", ciPath: "WHERE = 'C&I'" },
  { table: 'facility_master', column: 'counterparty_id', crePath: 'Join → counterparty', ciPath: 'Join → counterparty' },
];

function SchemaDiffView() {
  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-4 text-[9px] font-bold uppercase tracking-wider text-gray-600 bg-white/[0.03] px-3 py-2 border-b border-gray-800">
        <div>Table</div>
        <div>Column</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />CRE Path</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" />C&I Path</div>
      </div>
      {/* Rows */}
      {SCHEMA_DIFF_ROWS.map((row, i) => (
        <div key={i} className="grid grid-cols-4 text-[10px] px-3 py-2 border-b border-gray-800/30 hover:bg-white/[0.02] transition-colors">
          <code className="font-mono text-amber-300/70 truncate">{row.table}</code>
          <code className="font-mono text-gray-300 truncate">{row.column}</code>
          <div>
            {row.crePath ? (
              <span className="text-blue-300">{row.crePath}</span>
            ) : (
              <span className="text-gray-700 italic">Not used</span>
            )}
            {row.creFilter && <div className="text-[8px] font-mono text-blue-400/50 mt-0.5">{row.creFilter}</div>}
          </div>
          <div>
            {row.ciPath ? (
              <span className="text-purple-300">{row.ciPath}</span>
            ) : (
              <span className="text-gray-700 italic">Not used</span>
            )}
            {row.ciFilter && <div className="text-[8px] font-mono text-purple-400/50 mt-0.5">{row.ciFilter}</div>}
          </div>
        </div>
      ))}
      {/* Summary */}
      <div className="px-3 py-2.5 bg-white/[0.02] text-[10px] text-gray-500 flex items-center gap-2">
        <Info className="w-3 h-3 flex-shrink-0" />
        Same physical tables, different logical paths. The product type determines which columns activate and which WHERE filters apply.
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FK EXPLORER — "Why Does This Join Exist?"
 *
 * For each FK relationship used in the DSCR path, shows a "why" card
 * with cardinality, pattern, and plain-English explanation.
 * ──────────────────────────────────────────────────────────────────────────── */

const FK_RELATIONSHIPS: {
  from: string;
  to: string;
  joinKey: string;
  why: string;
  cardinality: string;
  pattern: string;
}[] = [
  {
    from: 'facility_financial_snapshot',
    to: 'facility_master',
    joinKey: 'facility_id',
    why: 'Links periodic financial data back to the loan\'s master record. This join lets us know WHICH loan generated $1,585,000 of NOI. Without it, we\'d have financial numbers floating without identity.',
    cardinality: 'Many snapshots (quarterly) → One facility (master)',
    pattern: 'SCD-0 (L1) joined to Snapshot (L2)',
  },
  {
    from: 'cash_flow',
    to: 'facility_master',
    joinKey: 'facility_id',
    why: 'Connects each individual payment (interest, principal) to the loan it belongs to. This is how we sum up debt service per facility.',
    cardinality: 'Many events → One facility',
    pattern: 'Event (L2) joined to SCD-0 (L1)',
  },
  {
    from: 'facility_master',
    to: 'counterparty',
    joinKey: 'counterparty_id',
    why: 'Identifies who the borrower is. Without this, we can\'t pool DSCR across loans for the same company. This is the join that enables counterparty-level aggregation.',
    cardinality: 'Many facilities → One counterparty',
    pattern: 'Master (L1) joined to Master (L1)',
  },
  {
    from: 'facility_master',
    to: 'enterprise_business_taxonomy',
    joinKey: 'lob_segment_id → managed_segment_id',
    why: 'Places each loan into the organizational hierarchy (desk → portfolio → LoB). This is the join that enables the entire rollup chain from facility to Line of Business.',
    cardinality: 'Many facilities → One segment node (tree)',
    pattern: 'Master (L1) joined to Hierarchy (L1, self-referencing)',
  },
  {
    from: 'facility_financial_snapshot',
    to: 'currency_dim',
    joinKey: 'currency_code',
    why: 'Normalizes all financial amounts to a common currency before computing DSCR. Without this, comparing NOI in EUR to debt service in USD would produce meaningless ratios.',
    cardinality: 'Many snapshots → One currency',
    pattern: 'Snapshot (L2) joined to Dimension (L1)',
  },
  {
    from: 'facility_exposure_snapshot',
    to: 'facility_master',
    joinKey: 'facility_id',
    why: 'Provides exposure amounts (drawn, committed) needed for exposure-weighted rollups at portfolio and LoB levels. DSCR × exposure = the weight in the weighted average.',
    cardinality: 'Many snapshots → One facility',
    pattern: 'Snapshot (L2) joined to Master (L1)',
  },
];

function FKExplorer() {
  const [expandedFk, setExpandedFk] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-bold text-white">FK Relationship Explorer</span>
        <span className="text-[9px] text-gray-600">Click any join to understand why it exists</span>
      </div>

      <div className="space-y-1.5">
        {FK_RELATIONSHIPS.map((fk, i) => {
          const isExpanded = expandedFk === i;
          return (
            <div key={i}>
              <button
                onClick={() => setExpandedFk(isExpanded ? null : i)}
                className={`w-full text-left rounded-lg border p-2.5 transition-all ${
                  isExpanded
                    ? 'border-blue-500/30 bg-blue-500/[0.06]'
                    : 'border-gray-800 bg-white/[0.02] hover:border-gray-700 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2 text-[10px]">
                  <code className="font-mono text-amber-300">{fk.from}</code>
                  <span className="text-gray-600">→</span>
                  <code className="font-mono text-blue-300">{fk.to}</code>
                  <span className="text-gray-700 ml-1">ON</span>
                  <code className="font-mono text-emerald-400">{fk.joinKey}</code>
                  <svg className={`w-3 h-3 text-gray-600 ml-auto flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5l3 3 3-3" /></svg>
                </div>
              </button>

              {isExpanded && (
                <div className="ml-4 mt-1 mb-2 rounded-lg border border-blue-500/20 bg-blue-500/[0.03] p-3 space-y-2">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1">Why This Join Exists</div>
                    <p className="text-[10px] text-gray-300 leading-relaxed">{fk.why}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-0.5">Cardinality</div>
                      <div className="text-[10px] text-gray-400">{fk.cardinality}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-0.5">Pattern</div>
                      <div className="text-[10px] text-gray-400">{fk.pattern}</div>
                    </div>
                  </div>
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
 * LINEAGE AUDIT TRAIL — "Prove It"
 *
 * Given a dashboard number (Portfolio CRE DSCR = 1.45x), trace backwards
 * through every rollup level to the exact L2 source rows. This is the
 * worksheet that bank examiners, internal audit, and model risk managers
 * request during regulatory reviews.
 *
 * Structure: Dashboard → Portfolio → Counterparty → Facility → L2 Source
 * ──────────────────────────────────────────────────────────────────────────── */

interface AuditSourceColumn {
  column: string;
  value: number;
  type: string;
  desc: string;
}

interface AuditFormulaStep {
  step: number;
  label: string;
  operation: string;
  result: number;
}

interface AuditL2Source {
  table: string;
  role: 'numerator' | 'denominator';
  columns: AuditSourceColumn[];
  whereFilters: string[];
  fkJoins: { from: string; to: string; key: string; note: string }[];
  formulaSteps: AuditFormulaStep[];
}

interface AuditTrailNode {
  id: string;
  level: 'dashboard' | 'portfolio' | 'counterparty' | 'facility' | 'l2_source';
  label: string;
  sublabel?: string;
  dscr?: number;
  displayValue: string;
  method?: string;
  methodLabel?: string;
  formula?: string;
  numerator?: number;
  denominator?: number;
  exposure?: number;
  tier?: string;
  layerColor: string;
  icon: React.ElementType;
  children?: AuditTrailNode[];
  l2Source?: AuditL2Source;
}

interface AuditRunContext {
  runVersionId: string;
  asOfDate: string;
  reportingPeriod: string;
  calculationTier: string;
  l1Freshness: string;
  l2Freshness: string;
  l3Freshness: string;
  auditCitation: string;
}

/* ── Audit run metadata ── */

const AUDIT_RUN: AuditRunContext = {
  runVersionId: 'RUN-2024Q4-v3.2.1',
  asOfDate: '2024-12-31',
  reportingPeriod: 'Q4 2024',
  calculationTier: 'T3',
  l1Freshness: '2024-12-31T23:59:59Z',
  l2Freshness: '2025-01-03T06:15:22Z',
  l3Freshness: '2025-01-03T08:42:11Z',
  auditCitation: 'DSCR_CRE_PORTFOLIO_2024Q4_RUN-v3.2.1_20250103-084211',
};

/* ── Full audit trail tree ── */

const AUDIT_TRAIL: AuditTrailNode = {
  id: 'dashboard',
  level: 'dashboard',
  label: 'Portfolio CRE DSCR',
  sublabel: 'P5 — Trends & Stress Testing Dashboard',
  dscr: 1.45,
  displayValue: '1.45x',
  method: 'weighted_avg',
  methodLabel: 'Exposure-Weighted Average',
  formula: 'Σ(counterparty DSCR × exposure) ÷ Σ(exposure)',
  tier: 'T3',
  layerColor: 'pink',
  icon: LayoutDashboard,
  children: [
    {
      id: 'cpty-sunrise',
      level: 'counterparty',
      label: 'Sunrise Properties LLC',
      sublabel: 'Counterparty ID: 67890 · BB+ rated · CRE developer',
      dscr: 1.29,
      displayValue: '1.29x',
      method: 'pooled',
      methodLabel: 'Pooled Ratio',
      formula: 'Σ(NOI across facilities) ÷ Σ(Debt Service across facilities)',
      numerator: 4_575_000,
      denominator: 3_550_000,
      exposure: 100_000_000,
      tier: 'T3',
      layerColor: 'emerald',
      icon: Users,
      children: [
        {
          id: 'fac-a',
          level: 'facility',
          label: 'Facility A — Sunrise Towers',
          sublabel: 'Multifamily · facility_id: 12345 · Committed: $50M',
          dscr: 1.32,
          displayValue: '1.32x',
          method: 'direct',
          methodLabel: 'Direct Calculation',
          formula: 'NOI ÷ Senior Debt Service',
          numerator: 1_585_000,
          denominator: 1_200_000,
          exposure: 50_000_000,
          tier: 'T2',
          layerColor: 'amber',
          icon: Building2,
          children: [
            {
              id: 'fac-a-ffs',
              level: 'l2_source',
              label: 'L2.facility_financial_snapshot',
              sublabel: 'Numerator source — NOI components',
              displayValue: '$1,585,000',
              layerColor: 'blue',
              icon: Database,
              l2Source: {
                table: 'facility_financial_snapshot',
                role: 'numerator',
                columns: [
                  { column: 'revenue_amt', value: 2_400_000, type: 'DECIMAL(18,2)', desc: 'Gross Potential Rent — 200 units × $1,000/mo × 12' },
                  { column: 'other_income_amt', value: 85_000, type: 'DECIMAL(18,2)', desc: 'Parking ($45K) + laundry ($25K) + late fees ($15K)' },
                  { column: 'vacancy_loss_amt', value: 120_000, type: 'DECIMAL(18,2)', desc: 'Vacancy & credit loss — 5% of GPR' },
                  { column: 'operating_expense_amt', value: 780_000, type: 'DECIMAL(18,2)', desc: 'Property tax ($280K) + insurance ($95K) + maintenance ($210K) + mgmt fees ($195K)' },
                  { column: 'noi_amt', value: 1_585_000, type: 'DECIMAL(18,2)', desc: 'Net Operating Income — T2 reconciliation value' },
                ],
                whereFilters: [
                  "facility_id = 12345",
                  "as_of_date = '2024-12-31'",
                  "snapshot_type = 'QUARTERLY'",
                  "reporting_period = 'Q4-2024'",
                ],
                fkJoins: [
                  { from: 'facility_financial_snapshot.facility_id', to: 'facility_master.facility_id', key: 'facility_id', note: 'Links financial data → loan identity' },
                  { from: 'facility_financial_snapshot.counterparty_id', to: 'counterparty.counterparty_id', key: 'counterparty_id', note: 'Links financial data → borrower' },
                  { from: 'facility_financial_snapshot.currency_code', to: 'currency_dim.currency_code', key: 'currency_code', note: 'Normalizes to USD' },
                ],
                formulaSteps: [
                  { step: 1, label: 'Gross Potential Rent', operation: 'Start', result: 2_400_000 },
                  { step: 2, label: '+ Other Income', operation: '$2,400,000 + $85,000', result: 2_485_000 },
                  { step: 3, label: '− Vacancy & Credit Loss', operation: '$2,485,000 − $120,000', result: 2_365_000 },
                  { step: 4, label: '− Operating Expenses', operation: '$2,365,000 − $780,000', result: 1_585_000 },
                ],
              },
            },
            {
              id: 'fac-a-cf',
              level: 'l2_source',
              label: 'L2.cash_flow',
              sublabel: 'Denominator source — debt service payments',
              displayValue: '$1,200,000',
              layerColor: 'blue',
              icon: Database,
              l2Source: {
                table: 'cash_flow',
                role: 'denominator',
                columns: [
                  { column: 'amount (INTEREST)', value: 720_000, type: 'DECIMAL(18,2)', desc: 'Senior interest — 4.8% on $15M outstanding balance' },
                  { column: 'amount (PRINCIPAL)', value: 480_000, type: 'DECIMAL(18,2)', desc: 'Scheduled principal — 25-year amortization schedule' },
                ],
                whereFilters: [
                  "facility_id = 12345",
                  "cash_flow_type IN ('INTEREST', 'PRINCIPAL')",
                  "cash_flow_date BETWEEN '2024-01-01' AND '2024-12-31'",
                  "currency_code = 'USD'",
                ],
                fkJoins: [
                  { from: 'cash_flow.facility_id', to: 'facility_master.facility_id', key: 'facility_id', note: 'Links payments → loan identity' },
                ],
                formulaSteps: [
                  { step: 1, label: 'Senior Interest', operation: 'SUM WHERE type = INTEREST', result: 720_000 },
                  { step: 2, label: '+ Senior Principal', operation: '$720,000 + $480,000', result: 1_200_000 },
                ],
              },
            },
          ],
        },
        {
          id: 'fac-b',
          level: 'facility',
          label: 'Facility B — Meridian Plaza',
          sublabel: 'Office · facility_id: 12346 · Committed: $30M',
          dscr: 1.50,
          displayValue: '1.50x',
          method: 'direct',
          methodLabel: 'Direct Calculation',
          formula: 'NOI ÷ Senior Debt Service',
          numerator: 2_100_000,
          denominator: 1_400_000,
          exposure: 30_000_000,
          tier: 'T2',
          layerColor: 'amber',
          icon: Building2,
          children: [
            {
              id: 'fac-b-ffs',
              level: 'l2_source',
              label: 'L2.facility_financial_snapshot',
              sublabel: 'Numerator source — NOI components',
              displayValue: '$2,100,000',
              layerColor: 'blue',
              icon: Database,
              l2Source: {
                table: 'facility_financial_snapshot',
                role: 'numerator',
                columns: [
                  { column: 'revenue_amt', value: 3_100_000, type: 'DECIMAL(18,2)', desc: 'Gross Potential Rent — 45,000 sq ft Class A office' },
                  { column: 'operating_expense_amt', value: 1_000_000, type: 'DECIMAL(18,2)', desc: 'OPEX — NNN pass-through with base year stop' },
                  { column: 'noi_amt', value: 2_100_000, type: 'DECIMAL(18,2)', desc: 'Net Operating Income' },
                ],
                whereFilters: ["facility_id = 12346", "as_of_date = '2024-12-31'"],
                fkJoins: [{ from: 'facility_financial_snapshot.facility_id', to: 'facility_master.facility_id', key: 'facility_id', note: 'Links financial data → loan identity' }],
                formulaSteps: [
                  { step: 1, label: 'Gross Potential Rent', operation: 'Start', result: 3_100_000 },
                  { step: 2, label: '− Operating Expenses', operation: '$3,100,000 − $1,000,000', result: 2_100_000 },
                ],
              },
            },
            {
              id: 'fac-b-cf',
              level: 'l2_source',
              label: 'L2.cash_flow',
              sublabel: 'Denominator source — debt service payments',
              displayValue: '$1,400,000',
              layerColor: 'blue',
              icon: Database,
              l2Source: {
                table: 'cash_flow',
                role: 'denominator',
                columns: [
                  { column: 'amount (INTEREST)', value: 840_000, type: 'DECIMAL(18,2)', desc: 'Senior interest — 5.25% fixed rate' },
                  { column: 'amount (PRINCIPAL)', value: 560_000, type: 'DECIMAL(18,2)', desc: 'Scheduled principal — 20-year amortization' },
                ],
                whereFilters: ["facility_id = 12346", "cash_flow_type IN ('INTEREST', 'PRINCIPAL')", "cash_flow_date BETWEEN '2024-01-01' AND '2024-12-31'"],
                fkJoins: [{ from: 'cash_flow.facility_id', to: 'facility_master.facility_id', key: 'facility_id', note: 'Links payments → loan identity' }],
                formulaSteps: [
                  { step: 1, label: 'Senior Interest', operation: 'SUM WHERE type = INTEREST', result: 840_000 },
                  { step: 2, label: '+ Senior Principal', operation: '$840,000 + $560,000', result: 1_400_000 },
                ],
              },
            },
          ],
        },
        {
          id: 'fac-c',
          level: 'facility',
          label: 'Facility C — Eastgate Commons',
          sublabel: 'Retail · facility_id: 12347 · Committed: $20M',
          dscr: 0.94,
          displayValue: '0.94x',
          method: 'direct',
          methodLabel: 'Direct Calculation',
          formula: 'NOI ÷ Senior Debt Service',
          numerator: 890_000,
          denominator: 950_000,
          exposure: 20_000_000,
          tier: 'T2',
          layerColor: 'amber',
          icon: Building2,
          children: [
            {
              id: 'fac-c-ffs',
              level: 'l2_source',
              label: 'L2.facility_financial_snapshot',
              sublabel: 'Numerator source — NOI components',
              displayValue: '$890,000',
              layerColor: 'blue',
              icon: Database,
              l2Source: {
                table: 'facility_financial_snapshot',
                role: 'numerator',
                columns: [
                  { column: 'revenue_amt', value: 1_200_000, type: 'DECIMAL(18,2)', desc: 'Gross Potential Rent — strip mall, 12 tenants' },
                  { column: 'operating_expense_amt', value: 310_000, type: 'DECIMAL(18,2)', desc: 'OPEX — CAM charges partially recovered' },
                  { column: 'noi_amt', value: 890_000, type: 'DECIMAL(18,2)', desc: 'Net Operating Income — below breakeven after DS' },
                ],
                whereFilters: ["facility_id = 12347", "as_of_date = '2024-12-31'"],
                fkJoins: [{ from: 'facility_financial_snapshot.facility_id', to: 'facility_master.facility_id', key: 'facility_id', note: 'Links financial data → loan identity' }],
                formulaSteps: [
                  { step: 1, label: 'Gross Potential Rent', operation: 'Start', result: 1_200_000 },
                  { step: 2, label: '− Operating Expenses', operation: '$1,200,000 − $310,000', result: 890_000 },
                ],
              },
            },
            {
              id: 'fac-c-cf',
              level: 'l2_source',
              label: 'L2.cash_flow',
              sublabel: 'Denominator source — debt service payments',
              displayValue: '$950,000',
              layerColor: 'blue',
              icon: Database,
              l2Source: {
                table: 'cash_flow',
                role: 'denominator',
                columns: [
                  { column: 'amount (INTEREST)', value: 570_000, type: 'DECIMAL(18,2)', desc: 'Senior interest — 6.1% (originated at higher rate)' },
                  { column: 'amount (PRINCIPAL)', value: 380_000, type: 'DECIMAL(18,2)', desc: 'Scheduled principal — 20-year amortization' },
                ],
                whereFilters: ["facility_id = 12347", "cash_flow_type IN ('INTEREST', 'PRINCIPAL')", "cash_flow_date BETWEEN '2024-01-01' AND '2024-12-31'"],
                fkJoins: [{ from: 'cash_flow.facility_id', to: 'facility_master.facility_id', key: 'facility_id', note: 'Links payments → loan identity' }],
                formulaSteps: [
                  { step: 1, label: 'Senior Interest', operation: 'SUM WHERE type = INTEREST', result: 570_000 },
                  { step: 2, label: '+ Senior Principal', operation: '$570,000 + $380,000', result: 950_000 },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      id: 'cpty-other',
      level: 'counterparty',
      label: '59 other counterparties',
      sublabel: 'Aggregated — expand individual counterparties in production',
      dscr: 1.52,
      displayValue: '1.52x',
      method: 'pooled',
      methodLabel: 'Pooled Ratio (aggregated)',
      formula: 'Σ(NOI) ÷ Σ(DS) across remaining 59 counterparties',
      exposure: 850_000_000,
      tier: 'T3',
      layerColor: 'emerald',
      icon: Users,
    },
  ],
};

/* ── L2 Source Detail — terminal node showing exact table rows ── */

function L2SourceDetail({ source }: { source: AuditL2Source }) {
  const roleColor = source.role === 'numerator'
    ? { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', label: 'Numerator Source' }
    : { badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30', label: 'Denominator Source' };

  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.03] p-3 space-y-3">
      {/* Role badge */}
      <div className="flex items-center gap-2">
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${roleColor.badge}`}>{roleColor.label}</span>
        <code className="text-[10px] font-mono text-blue-300">L2.{source.table}</code>
      </div>

      {/* Column values */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Source Columns</div>
        <div className="rounded-lg bg-black/30 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[9px] font-bold uppercase tracking-wider text-gray-600 px-2.5 py-1.5 bg-white/[0.03]">
            <div>Column</div>
            <div>Type</div>
            <div className="text-right">Value</div>
          </div>
          {source.columns.map((col, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] px-2.5 py-1.5 border-t border-gray-800/30">
              <div>
                <code className="font-mono text-blue-300">{col.column}</code>
                <div className="text-[9px] text-gray-600 mt-0.5">{col.desc}</div>
              </div>
              <div className="text-gray-600 font-mono">{col.type}</div>
              <div className="text-right font-mono font-bold text-emerald-400">{fmt(col.value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WHERE filters */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">WHERE Clause (Row Selection)</div>
        <div className="flex flex-wrap gap-1.5">
          {source.whereFilters.map((f, i) => (
            <code key={i} className="text-[9px] font-mono text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded px-2 py-1">{f}</code>
          ))}
        </div>
      </div>

      {/* FK joins */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">FK Joins Traversed</div>
        <div className="space-y-1">
          {source.fkJoins.map((fk, i) => (
            <div key={i} className="flex items-start gap-2 text-[10px]">
              <Link2 className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <code className="font-mono text-amber-300">{fk.from}</code>
                  <span className="text-gray-600">→</span>
                  <code className="font-mono text-blue-300">{fk.to}</code>
                  <span className="text-gray-700">ON</span>
                  <code className="font-mono text-emerald-400">{fk.key}</code>
                </div>
                <div className="text-[9px] text-gray-600 italic mt-0.5">{fk.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formula execution steps */}
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Formula Execution</div>
        <div className="space-y-1">
          {source.formulaSteps.map((s) => (
            <div key={s.step} className="flex items-center gap-2 text-[10px]">
              <span className="w-5 h-5 rounded-full bg-purple-500/15 flex items-center justify-center text-[8px] font-bold text-purple-300 flex-shrink-0">{s.step}</span>
              <span className="text-gray-500">{s.label}</span>
              <span className="text-gray-700 font-mono text-[9px]">{s.operation}</span>
              <span className="text-gray-700">=</span>
              <span className="font-mono font-bold text-emerald-400">{fmt(s.result)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Audit Run Panel — sticky sidebar with run metadata ── */

function AuditRunPanel() {
  const [copied, setCopied] = useState(false);

  const copyRef = () => {
    navigator.clipboard?.writeText(AUDIT_RUN.auditCitation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const l2 = new Date(AUDIT_RUN.l2Freshness);
  const l3 = new Date(AUDIT_RUN.l3Freshness);
  const deltaH = ((l3.getTime() - l2.getTime()) / 3_600_000).toFixed(1);

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-bold text-white">Audit Context</span>
      </div>

      <div className="space-y-2.5 text-[10px]">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-0.5">Run Version</div>
          <code className="text-emerald-300 font-mono">{AUDIT_RUN.runVersionId}</code>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-0.5">As-Of Date</div>
          <span className="text-gray-300 font-mono">{AUDIT_RUN.asOfDate}</span>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-0.5">Reporting Period</div>
          <span className="text-gray-300 font-mono">{AUDIT_RUN.reportingPeriod}</span>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1">Rollup Authority</div>
          <TierBadge tier={AUDIT_RUN.calculationTier} />
        </div>

        {/* Data freshness */}
        <div className="border-t border-white/5 pt-2.5">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Data Freshness</div>
          <div className="space-y-1 font-mono">
            {[
              { layer: 'L1', color: 'text-blue-400', ts: AUDIT_RUN.l1Freshness },
              { layer: 'L2', color: 'text-amber-400', ts: AUDIT_RUN.l2Freshness },
              { layer: 'L3', color: 'text-emerald-400', ts: AUDIT_RUN.l3Freshness },
            ].map(d => (
              <div key={d.layer} className="flex items-center gap-2">
                <span className={`w-5 ${d.color} font-bold`}>{d.layer}</span>
                <span className="text-gray-500 text-[9px]">
                  {new Date(d.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                  {new Date(d.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <div className="text-[9px] text-gray-600 italic pl-7">Δ {deltaH}h L2→L3 processing</div>
          </div>
        </div>

        {/* Citation */}
        <div className="border-t border-white/5 pt-2.5">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-1">Audit Citation</div>
          <button
            onClick={copyRef}
            className="w-full text-left bg-black/40 rounded-lg px-2.5 py-2 hover:bg-black/60 transition-colors group"
          >
            <code className="text-[8px] font-mono text-gray-400 break-all leading-relaxed">{AUDIT_RUN.auditCitation}</code>
            <div className="flex items-center gap-1 mt-1.5 text-[9px]">
              {copied ? (
                <><CheckCircle2 className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Copied to clipboard</span></>
              ) : (
                <span className="text-gray-600 group-hover:text-gray-400">Click to copy reference</span>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Audit Trail Node — recursive expandable card ── */

function AuditTrailNodeCard({
  node,
  depth,
  expandedNodes,
  onToggle,
}: {
  node: AuditTrailNode;
  depth: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = (node.children && node.children.length > 0) || !!node.l2Source;
  const Icon = node.icon;

  const dscrStatusColor = (v?: number) => {
    if (v === undefined) return 'text-gray-400';
    return v >= 1.25 ? 'text-emerald-400' : v >= 1.0 ? 'text-amber-400' : 'text-red-400';
  };

  const colorMap: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-300', dot: 'bg-pink-500' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-300', dot: 'bg-amber-500' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', dot: 'bg-blue-500' },
  };
  const c = colorMap[node.layerColor] || colorMap.emerald;

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }} className="mt-2">
      {/* Connector line */}
      {depth > 0 && (
        <div className="flex items-center gap-1.5 mb-1 ml-2">
          <div className={`w-3 h-px ${c.dot}`} />
          <ArrowDown className="w-2.5 h-2.5 text-gray-700" />
        </div>
      )}

      {/* Node card */}
      <button
        onClick={() => hasChildren && onToggle(node.id)}
        aria-expanded={hasChildren ? isExpanded : undefined}
        className={`w-full text-left rounded-xl border p-3.5 transition-all duration-200 ${
          isExpanded
            ? `${c.border} ${c.bg}`
            : 'border-gray-800 bg-white/[0.02] hover:bg-white/[0.04] hover:border-gray-700'
        } ${!hasChildren ? 'cursor-default' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isExpanded ? c.bg : 'bg-white/5'}`}>
              <Icon className={`w-4 h-4 ${isExpanded ? c.text : 'text-gray-500'}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white">{node.label}</span>
                <span className={`text-base font-black font-mono tabular-nums ${node.dscr !== undefined ? dscrStatusColor(node.dscr) : c.text}`}>
                  {node.displayValue}
                </span>
                {node.methodLabel && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-gray-800">
                    {node.methodLabel}
                  </span>
                )}
                {node.tier && <TierBadge tier={node.tier} />}
              </div>
              {node.sublabel && <div className="text-[10px] text-gray-500 mt-0.5">{node.sublabel}</div>}
            </div>
          </div>
          {hasChildren && (
            isExpanded
              ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
              : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
          )}
        </div>

        {/* Formula + numerator/denominator (always visible when relevant) */}
        {node.formula && (
          <div className="mt-2 ml-11 text-xs font-mono text-gray-400">{node.formula}</div>
        )}
        {node.numerator !== undefined && node.denominator !== undefined && (
          <div className="mt-1 ml-11 flex items-center gap-4 text-[10px] text-gray-500 font-mono">
            <span>Num: <span className="text-emerald-400/70">{fmt(node.numerator)}</span></span>
            <span>Den: <span className="text-purple-300/70">{fmt(node.denominator)}</span></span>
            {node.exposure !== undefined && <span>Exp: <span className="text-blue-300/70">{fmt(node.exposure)}</span></span>}
          </div>
        )}
      </button>

      {/* Expanded children */}
      {isExpanded && (
        <div className="mt-1">
          {/* L2 source detail for terminal nodes */}
          {node.l2Source && (
            <div className="ml-6 mt-2">
              <L2SourceDetail source={node.l2Source} />
            </div>
          )}

          {/* Recursive children */}
          {node.children?.map(child => (
            <AuditTrailNodeCard
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Lineage Audit Trail component ── */

function LineageAuditTrail() {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set(['dashboard']));

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collectIds = (node: AuditTrailNode): string[] => {
    const ids = [node.id];
    node.children?.forEach(c => ids.push(...collectIds(c)));
    return ids;
  };

  const expandAll = () => setExpandedNodes(new Set(collectIds(AUDIT_TRAIL)));
  const collapseAll = () => setExpandedNodes(new Set(['dashboard']));

  // Build active path for reverse breadcrumb
  const buildPath = (node: AuditTrailNode, target: Set<string>, path: string[] = []): string[] => {
    const current = [...path, node.id];
    if (target.has(node.id) && (!node.children || node.children.every(c => !target.has(c.id)))) return current;
    for (const child of node.children || []) {
      if (target.has(child.id)) {
        const found = buildPath(child, target, current);
        if (found.length > current.length) return found;
      }
    }
    return current;
  };
  const activePath = buildPath(AUDIT_TRAIL, expandedNodes);

  const pathColors: Record<string, string> = {
    dashboard: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    portfolio: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    counterparty: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    facility: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    l2_source: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  };

  // Find node by id in tree
  const findNode = (id: string, node: AuditTrailNode = AUDIT_TRAIL): AuditTrailNode | null => {
    if (node.id === id) return node;
    for (const child of node.children || []) {
      const found = findNode(id, child);
      if (found) return found;
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
      {/* Left: Audit trail tree */}
      <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">Lineage Audit Trail</span>
            <span className="text-[9px] text-gray-600">Click any node to drill down</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={expandAll} aria-label="Expand all audit trail nodes" className="px-2 py-0.5 rounded text-[9px] font-bold text-gray-500 border border-gray-800 hover:text-gray-300 hover:border-gray-700 transition-colors">
              Expand All
            </button>
            <button onClick={collapseAll} aria-label="Collapse audit trail to dashboard level" className="px-2 py-0.5 rounded text-[9px] font-bold text-gray-500 border border-gray-800 hover:text-gray-300 hover:border-gray-700 transition-colors">
              Collapse
            </button>
          </div>
        </div>

        {/* Reverse breadcrumb — audit path */}
        <div className="flex items-center gap-1 mb-4 pb-3 border-b border-white/5 overflow-x-auto">
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-gray-600 flex-shrink-0">
            <ArrowDown className="w-3 h-3" />
            <span>Trace:</span>
          </div>
          {activePath.map((nodeId, i) => {
            const n = findNode(nodeId);
            if (!n) return null;
            const cls = pathColors[n.level] || pathColors.counterparty;
            return (
              <React.Fragment key={nodeId}>
                {i > 0 && <ArrowDown className="w-2.5 h-2.5 text-gray-700 flex-shrink-0" />}
                <button
                  onClick={() => {
                    const next = new Set(expandedNodes);
                    next.add(nodeId);
                    setExpandedNodes(next);
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium whitespace-nowrap border flex-shrink-0 ${cls}`}
                >
                  {n.label.length > 25 ? n.label.slice(0, 25) + '...' : n.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Tree */}
        <AuditTrailNodeCard
          node={AUDIT_TRAIL}
          depth={0}
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
        />
      </div>

      {/* Right: Metadata sidebar */}
      <div className="lg:sticky lg:top-[140px] lg:self-start">
        <AuditRunPanel />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * FOOTER LEGEND
 * ──────────────────────────────────────────────────────────────────────────── */

function FooterLegend() {
  return (
    <div className="pt-8 pb-12 border-t border-gray-800 mt-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Flow Steps</div>
          <div className="space-y-1.5">
            {[
              { color: 'bg-purple-600', label: '1. User Definition' },
              { color: 'bg-blue-600', label: '2. L1 Reference' },
              { color: 'bg-amber-600', label: '3. L2 Snapshot' },
              { color: 'bg-emerald-600', label: '4. Calculation' },
              { color: 'bg-emerald-600', label: '5. L3 Output + Rollup' },
              { color: 'bg-pink-600', label: '6. Dashboard' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded ${s.color} flex-shrink-0`} />
                <span className="text-gray-400">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Variant Colors</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-blue-500 flex-shrink-0" />
              <span className="text-gray-400">CRE (NOI path)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-purple-500 flex-shrink-0" />
              <span className="text-gray-400">C&I (EBITDA path)</span>
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Calculation Authority</div>
          <div className="space-y-1.5">
            <TierBadge tier="T1" />
            <TierBadge tier="T2" />
            <TierBadge tier="T3" />
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Aggregation by Level</div>
          <div className="space-y-1">
            {[
              { level: 'Facility', method: 'Direct calc' },
              { level: 'Counterparty', method: 'Pooled ratio' },
              { level: 'Desk', method: 'Segmented pooled' },
              { level: 'Portfolio', method: 'Wtd avg + buckets' },
              { level: 'LoB', method: 'Wtd avg (monitoring)' },
            ].map((r) => (
              <div key={r.level} className="flex justify-between text-[10px]">
                <span className="text-gray-500">{r.level}</span>
                <span className="text-gray-400 font-mono">{r.method}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT
 * ──────────────────────────────────────────────────────────────────────────── */

export interface DSCRLineageViewProps {
  /** Demo-controlled rollup level override */
  demoExpandedLevel?: string | null;
  /** Demo-controlled L2 filter override */
  demoL2Filter?: 'both' | 'CRE' | 'CI';
  /** Show the guided demo button */
  onStartDemo?: () => void;
}

export default function DSCRLineageView({
  demoExpandedLevel,
  demoL2Filter,
  onStartDemo,
}: DSCRLineageViewProps = {}) {
  const [expandedLevelInternal, setExpandedLevelInternal] = useState<string | null>('facility');
  const [l2FilterInternal, setL2FilterInternal] = useState<'both' | 'CRE' | 'CI'>('both');
  const headingPrefix = useId();
  const activeSection = useActiveSection();

  // Demo overrides local state when active
  const expandedLevel = demoExpandedLevel !== undefined ? demoExpandedLevel : expandedLevelInternal;
  const l2Filter = demoL2Filter !== undefined ? demoL2Filter : l2FilterInternal;
  const setExpandedLevel = (k: string | null) => setExpandedLevelInternal(k);
  const setL2Filter = (f: 'both' | 'CRE' | 'CI') => setL2FilterInternal(f);

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
                Data Catalogue
              </Link>
              <h1 className="text-xl font-bold text-white">DSCR End-to-End Lineage</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                From user definition through data model to dashboard — two product variants side by side
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
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs text-gray-400">CRE (NOI)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-xs text-gray-400">C&I (EBITDA)</span>
              </div>
            </div>
          </div>
          {/* Provenance Breadcrumb */}
          <ProvenanceBreadcrumb activeSection={activeSection} />
        </div>
      </header>

      {/* ── BODY ── */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-2">
        {/* ── STEP 1: USER DEFINITION ── */}
        <section data-demo="step1" aria-labelledby={`${headingPrefix}-step1`}>
          <SectionHeading
            id={`${headingPrefix}-step1`}
            icon={Calculator}
            step="Step 1 — User Definition"
            layerColor="bg-purple-600"
            title="Metric Configuration"
            subtitle="User selects product, components, and formula in the DSCR Engine"
          />
          <InsightCallout>
            <strong>Same engine, different products.</strong> The user toggles numerator and denominator components to define exactly how DSCR
            is calculated for their product type. CRE uses property income (NOI), C&I uses financial statements (EBITDA).
            The formula, data sources, and rollup logic are automatically resolved. Hover any component to see the source field it maps to.
          </InsightCallout>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div data-demo="step1-variant-cre"><VariantDefCard v={CRE} /></div>
            <div data-demo="step1-variant-ci"><VariantDefCard v={CI} /></div>
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
            subtitle="Every FK relationship used to compute and roll up DSCR — hover any table to trace its connections"
          />
          <InteractiveJoinMap />
          <InsightCallout>
            <strong>4 layers, 11 tables, 14 join relationships.</strong> Every DSCR value can be traced through this exact join graph.
            Toggle between CRE and C&I to see how the same tables serve different calculation paths.
            The <code className="text-blue-300">facility_master</code> table is the central hub — it connects L1 dimensions to L2 snapshots via <code className="text-amber-300">facility_id</code>.
          </InsightCallout>

          {/* FK Explorer */}
          <div className="mt-4">
            <FKExplorer />
          </div>
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
            subtitle={'Reference tables that identify the “who” and “what” — unchanged across variants'}
          />
          <L1Tables />
          <InsightCallout>
            <strong>9 dimensional tables anchor every DSCR calculation.</strong> <code className="text-blue-300">facility_master</code> links
            to LoB (<code className="text-blue-300">enterprise_business_taxonomy</code>), product (<code className="text-blue-300">enterprise_product_taxonomy</code>),
            and counterparty via FK chains. These hierarchies enable the rollup from facility to LoB. Stress scenarios come from{' '}
            <code className="text-blue-300">scenario_dim</code>; all amounts are normalized through <code className="text-blue-300">currency_dim</code>.
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
            subtitle="Same two tables serve both variants — different fields activate per product"
          />
          <div className="flex items-center gap-2 mb-4" role="group" aria-label="Filter by variant">
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Highlight:</span>
            {(['both', 'CRE', 'CI'] as const).map((f) => {
              const activeStyles: Record<string, string> = {
                both: 'bg-white/10 text-white border border-gray-600',
                CRE: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
                CI: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
              };
              const labels: Record<string, string> = { both: 'Both Variants', CRE: 'CRE Only', CI: 'C&I Only' };
              return (
                <button
                  key={f}
                  onClick={() => setL2Filter(f)}
                  aria-pressed={l2Filter === f}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
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
            <strong>Same tables, different paths.</strong> Both CRE and C&I pull from{' '}
            <code className="text-amber-300">facility_financial_snapshot</code> and{' '}
            <code className="text-amber-300">cash_flow</code>. The product type determines which fields are active.
            Toggle above to see each variant&apos;s data path highlighted independently.
          </InsightCallout>

          {/* CRE vs C&I Schema Diff */}
          <div className="mt-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <Scale className="w-3 h-3" aria-hidden="true" />
              CRE vs C&I Column Usage Comparison
            </div>
            <SchemaDiffView />
          </div>
        </section>

        <FlowArrow label="Fields feed into calculation engine" />

        {/* ── QUERY PLAN ── */}
        <section data-demo="query-plan" aria-labelledby={`${headingPrefix}-query-plan`}>
          <SectionHeading
            id={`${headingPrefix}-query-plan`}
            icon={Search}
            step="Under the Hood"
            layerColor="bg-purple-600"
            title="How the Engine Thinks"
            subtitle="Logical query steps the calculation engine follows — click any step or toggle 'Show SQL' for the technical view"
          />
          <QueryPlanView />
        </section>

        <FlowArrow label="Query results feed into DSCR formula" />

        {/* ── STEP 4: CALCULATION ── */}
        <section data-demo="step4" aria-labelledby={`${headingPrefix}-step4`}>
          <SectionHeading
            id={`${headingPrefix}-step4`}
            icon={Zap}
            step="Step 4 — Calculation Engine"
            layerColor="bg-emerald-600"
            title="DSCR Calculation"
            subtitle="Formula applied at facility level — T2 authority (source + validate)"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div data-demo="step4-variant-cre"><TransformCard v={CRE} /></div>
            <div data-demo="step4-variant-ci"><TransformCard v={CI} /></div>
          </div>
          <InsightCallout>
            <strong>T2 Calculation Authority at facility level.</strong> The GSIB sends their own DSCR value AND the platform independently
            recalculates from raw components. If the values differ beyond tolerance, reconciliation flags are raised.
            All rollups above facility are <strong>T3 (always calculated)</strong> by the platform — the bank never provides aggregated DSCR.
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
            subtitle="Follow a single CRE facility's data through the entire pipeline — from raw table to dashboard"
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
            subtitle="Different aggregation at each level — from pooled ratio to exposure-weighted average"
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

        <FlowArrow label="Can we trace this number back to source?" />

        {/* ── LINEAGE AUDIT TRAIL ── */}
        <section data-demo="audit-trail" aria-labelledby={`${headingPrefix}-audit-trail`}>
          <SectionHeading
            id={`${headingPrefix}-audit-trail`}
            icon={Search}
            step="Regulatory Validation"
            layerColor="bg-emerald-600"
            title="Lineage Audit Trail"
            subtitle={'Trace any dashboard value back through every rollup level to exact L2 source rows — the worksheet regulators ask for'}
          />
          <LineageAuditTrail />
          <InsightCallout>
            <strong>This is what examiners need.</strong> When a regulator points to &ldquo;Portfolio CRE DSCR = 1.45x&rdquo; on your dashboard
            and asks &ldquo;prove it,&rdquo; this audit trail provides the complete chain of custody: which counterparties contributed,
            how they were pooled, which facilities were included, which L2 tables were queried, what WHERE filters were applied,
            and the exact formula execution with intermediate values at every step. The audit citation provides a unique reference
            for compliance documentation. Notice Facility C (Retail) at <strong className="text-red-400">0.94x</strong> — below 1.0x,
            meaning debt service exceeds income. This facility drags the counterparty pooled DSCR down from what it would be with
            just Facilities A and B.
          </InsightCallout>
        </section>

        {/* ── LEGEND ── */}
        <FooterLegend />
      </main>
    </div>
  );
}
