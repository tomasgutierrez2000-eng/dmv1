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
  { key: 'facility', label: 'Facility', icon: Table2, desc: 'Raw calculated value', tier: 'T2' },
  { key: 'counterparty', label: 'Counterparty', icon: Users, desc: 'Wtd avg by EAD across facilities', tier: 'T3' },
  { key: 'desk', label: 'Desk', icon: Briefcase, desc: 'Wtd avg by EAD across counterparties', tier: 'T3' },
  { key: 'portfolio', label: 'Portfolio', icon: FolderTree, desc: 'Wtd avg by EAD across desks', tier: 'T3' },
  { key: 'lob', label: 'Line of Business', icon: PieChart, desc: 'Wtd avg by EAD across portfolios', tier: 'T3' },
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
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
          Numerator — {v.numeratorLabel}
        </div>
        <div className="space-y-1">
          {v.numeratorComponents.map((c) => (
            <ComponentRow key={c.name} name={c.name} op={c.op} value={c.value} field={c.field} table={c.table} />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs font-bold">
          <span className={v.colorText}>{v.numeratorLabel}</span>
          <span className="text-white font-mono">{fmt(v.numerator)}</span>
        </div>
      </div>

      {/* Denominator */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
          Denominator — {v.denominatorLabel}
        </div>
        <div className="space-y-1">
          {v.denominatorComponents.map((c) => (
            <ComponentRow key={c.name} name={c.name} op="+" value={c.value} field={c.field} table={c.table} />
          ))}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs font-bold">
          <span className={v.colorText}>{v.denominatorLabel}</span>
          <span className="text-white font-mono">{fmt(v.denominator)}</span>
        </div>
      </div>

      {/* Result */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
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

/** Single numerator or denominator component — shows name, op, value, and source field traceability */
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
  return (
    <div className="flex items-center justify-between text-xs group">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={op === '+' ? 'text-emerald-400 flex-shrink-0' : 'text-red-400 flex-shrink-0'}>
          {op === '+' ? '+' : '−'}
        </span>
        <span className="text-gray-300 truncate">{name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <code className="text-[9px] text-gray-600 font-mono hidden group-hover:inline transition-opacity" title={`L2.${table}.${field}`}>
          .{field}
        </code>
        <span className="text-gray-500 font-mono text-[10px]">{fmt(value)}</span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * STEP 2 — L1 REFERENCE TABLES
 * ──────────────────────────────────────────────────────────────────────────── */

function L1Tables() {
  const coreTables = [
    {
      name: 'facility_master',
      scd: 'SCD-2',
      desc: 'Facility identity — links to LoB, product, counterparty, and credit agreement',
      fields: ['facility_id (PK)', 'facility_name', 'facility_type', 'counterparty_id (FK)', 'credit_agreement_id (FK)', 'lob_segment_id (FK)', 'product_node_id (FK)', 'portfolio_id (FK)', 'currency_code (FK)'],
    },
    {
      name: 'counterparty',
      scd: 'SCD-2',
      desc: 'Borrower / obligor — risk ratings, industry, domicile',
      fields: ['counterparty_id (PK)', 'legal_name', 'counterparty_type', 'internal_risk_rating', 'industry_id (FK)', 'country_code (FK)', 'pd_annual', 'lgd_unsecured'],
    },
    {
      name: 'credit_agreement_master',
      scd: 'SCD-2',
      desc: 'Credit agreement — links borrower and lender entities',
      fields: ['credit_agreement_id (PK)', 'borrower_counterparty_id (FK)', 'lender_legal_entity_id (FK)', 'agreement_type', 'currency_code (FK)'],
    },
  ];

  const dimensionalTables = [
    {
      name: 'enterprise_business_taxonomy',
      scd: 'SCD-1',
      desc: 'Line of Business hierarchy — self-referencing tree for LoB rollup',
      fields: ['managed_segment_id (PK)', 'segment_code', 'segment_name', 'parent_segment_id', 'tree_level'],
    },
    {
      name: 'enterprise_product_taxonomy',
      scd: 'SCD-1',
      desc: 'Product hierarchy — CRE, C&I, PF, FF, Consumer classification',
      fields: ['product_node_id (PK)', 'product_code', 'product_name', 'parent_node_id', 'tree_level'],
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {coreTables.map((t) => (
            <div key={t.name} className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-xs font-bold text-blue-300 font-mono">L1.{t.name}</code>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {t.scd}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mb-2">{t.desc}</p>
              <div className="space-y-0.5">
                {t.fields.map((f) => (
                  <div key={f} className={`text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.03] ${f.includes('(FK)') ? 'text-blue-400/70' : 'text-gray-400'}`}>
                    {f}
                  </div>
                ))}
              </div>
            </div>
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
            <div key={t.name} className="rounded-xl border border-blue-500/20 bg-blue-500/[0.03] p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-xs font-bold text-blue-300/80 font-mono">L1.{t.name}</code>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400/70 border border-blue-500/15">
                  {t.scd}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mb-2">{t.desc}</p>
              <div className="space-y-0.5">
                {t.fields.map((f) => (
                  <div key={f} className="text-[10px] font-mono text-gray-400 px-2 py-0.5 rounded bg-white/[0.03]">
                    {f}
                  </div>
                ))}
              </div>
            </div>
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
        const isFirst = i === 0;
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
                  <Icon className={`w-4 h-4 ${expanded ? 'text-emerald-400' : 'text-gray-500'}`} aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{level.label}</div>
                  <div className="text-[10px] text-gray-500">{level.desc}</div>
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
              <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-3">
                <RollupDetail variant="CRE" isFirst={isFirst} levelIndex={i} />
                <RollupDetail variant="CI" isFirst={isFirst} levelIndex={i} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function RollupDetail({ variant, isFirst, levelIndex }: { variant: 'CRE' | 'CI'; isFirst: boolean; levelIndex: number }) {
  const isCRE = variant === 'CRE';
  const borderColor = isCRE ? 'border-blue-500/20' : 'border-purple-500/20';
  const bgColor = isCRE ? 'bg-blue-500/10' : 'bg-purple-500/10';
  const textColor = isCRE ? 'text-blue-300' : 'text-purple-300';
  const label = isCRE ? 'CRE DSCR' : 'C&I DSCR';
  const result = isCRE ? '1.32x' : '4.09x';

  return (
    <div className={`rounded-lg ${bgColor} border ${borderColor} p-2.5`}>
      <div className={`text-[10px] font-bold ${textColor} mb-1`}>{label}</div>
      {isFirst ? (
        <div className="text-xs text-gray-300">
          <span className={`font-mono ${textColor}`}>{result}</span> — direct from calculation
        </div>
      ) : (
        <div className="text-xs text-gray-300">
          <span className={`font-mono ${textColor}`}>{'Σ'}(DSCR {'×'} EAD) / {'Σ'}(EAD)</span>
          <div className="mt-1 text-[10px] text-gray-500">
            Exposure-weighted average across {levelIndex === 1 ? 'facilities' : ROLLUP_LEVELS[levelIndex - 1].label.toLowerCase() + 's'}
          </div>
        </div>
      )}
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
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Rollup Formula</div>
          <div className="text-gray-400 font-mono text-[11px] leading-relaxed">
            {'Σ'}(DSCR{'ᵢ'} {'×'} EAD{'ᵢ'}) / {'Σ'}(EAD{'ᵢ'})
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            Exposure-weighted average applied at every aggregation level above facility
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN EXPORT
 * ──────────────────────────────────────────────────────────────────────────── */

export default function DSCRLineageView() {
  const [expandedLevel, setExpandedLevel] = useState<string | null>('facility');
  const [l2Filter, setL2Filter] = useState<'both' | 'CRE' | 'CI'>('both');
  const headingPrefix = useId();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-gray-800 shadow-lg">
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
              <h1 className="text-xl font-bold text-white">DSCR End-to-End Lineage</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                From user definition through data model to dashboard — two product variants side by side
              </p>
            </div>
            <div className="flex items-center gap-4">
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
        </div>
      </header>

      {/* ── BODY ── */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-2">
        {/* ── STEP 1: USER DEFINITION ── */}
        <section aria-labelledby={`${headingPrefix}-step1`}>
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
            <VariantDefCard v={CRE} />
            <VariantDefCard v={CI} />
          </div>
        </section>

        <FlowArrow label="Components map to data model fields" />

        {/* ── STEP 2: L1 REFERENCE ── */}
        <section aria-labelledby={`${headingPrefix}-step2`}>
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
        <section aria-labelledby={`${headingPrefix}-step3`}>
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
            {(['both', 'CRE', 'CI'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setL2Filter(f)}
                aria-pressed={l2Filter === f}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
                  l2Filter === f
                    ? f === 'CRE'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : f === 'CI'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-white/10 text-white border border-gray-600'
                    : 'bg-white/[0.02] text-gray-500 border border-gray-800 hover:border-gray-700'
                }`}
              >
                {f === 'both' ? 'Both Variants' : f === 'CRE' ? 'CRE Only' : 'C&I Only'}
              </button>
            ))}
          </div>
          <L2FieldTable activeVariant={l2Filter} />
          <InsightCallout>
            <strong>Same tables, different paths.</strong> Both CRE and C&I pull from{' '}
            <code className="text-amber-300">facility_financial_snapshot</code> and{' '}
            <code className="text-amber-300">cash_flow</code>. The product type determines which fields are active.
            Toggle above to see each variant&apos;s data path highlighted independently.
          </InsightCallout>
        </section>

        <FlowArrow label="Fields feed into calculation engine" />

        {/* ── STEP 4: CALCULATION ── */}
        <section aria-labelledby={`${headingPrefix}-step4`}>
          <SectionHeading
            id={`${headingPrefix}-step4`}
            icon={Zap}
            step="Step 4 — Calculation Engine"
            layerColor="bg-emerald-600"
            title="DSCR Calculation"
            subtitle="Formula applied at facility level — T2 authority (source + validate)"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TransformCard v={CRE} />
            <TransformCard v={CI} />
          </div>
          <InsightCallout>
            <strong>T2 Calculation Authority at facility level.</strong> The GSIB sends their own DSCR value AND the platform independently
            recalculates from raw components. If the values differ beyond tolerance, reconciliation flags are raised.
            All rollups above facility are <strong>T3 (always calculated)</strong> by the platform — the bank never provides aggregated DSCR.
          </InsightCallout>
        </section>

        <FlowArrow label="Results stored in L3 tables, then rolled up" />

        {/* ── STEP 5: L3 OUTPUT + ROLLUP ── */}
        <section aria-labelledby={`${headingPrefix}-step5`}>
          <SectionHeading
            id={`${headingPrefix}-step5`}
            icon={GitBranch}
            step="Step 5 — L3 Output & Rollup Hierarchy"
            layerColor="bg-emerald-600"
            title="Storage & Aggregation"
            subtitle={'Σ(DSCR × EAD) / Σ(EAD) — exposure-weighted average at each level'}
          />

          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <Database className="w-3 h-3" aria-hidden="true" />
              L3 Output Tables
            </div>
            <L3OutputTables />
          </div>

          <div className="mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <Link2 className="w-3 h-3" aria-hidden="true" />
              Rollup Hierarchy — click to expand
            </div>
          </div>
          <RollupPyramid expandedLevel={expandedLevel} onToggle={(k) => setExpandedLevel(expandedLevel === k ? null : k)} />
        </section>

        <FlowArrow label="Dashboard builder selects variant + dimension" />

        {/* ── STEP 6: DASHBOARD ── */}
        <section aria-labelledby={`${headingPrefix}-step6`}>
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

        {/* ── LEGEND ── */}
        <FooterLegend />
      </main>
    </div>
  );
}
