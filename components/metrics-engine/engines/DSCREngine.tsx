'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Code, ChevronDown, Layers } from 'lucide-react';
import LineageFlowView from '@/components/lineage/LineageFlowView';
import type { L3Metric } from '@/data/l3-metrics';
import {
  dscrConfigToLineage,
  dscrConfigToMetric,
  type DSCRVariantConfig,
} from './dscr-lineage';

/** Status colors for DSCR result (PASS / WATCH / FAIL) — semantic, kept for clarity. */
const STATUS_COLOR = {
  pass: 'text-emerald-400',
  watch: 'text-amber-400',
  fail: 'text-red-400',
  na: 'text-gray-500',
} as const;
const STATUS_BG = {
  pass: 'bg-emerald-500/15 border-emerald-500/40',
  watch: 'bg-amber-500/15 border-amber-500/40',
  fail: 'bg-red-500/15 border-red-500/40',
  na: 'bg-white/5 border-white/10',
} as const;

const PRODUCTS = [
  {
    code: 'CRE',
    label: 'Commercial Real Estate',
    subs: ['Multifamily', 'Office', 'Retail', 'Industrial', 'Hotel', 'Healthcare', 'Construction'],
  },
  {
    code: 'CI',
    label: 'Corporate / C&I',
    subs: ['Investment Grade', 'Middle Market', 'Small Business', 'Leveraged Finance'],
  },
  {
    code: 'PF',
    label: 'Project Finance',
    subs: ['Infrastructure', 'Energy', 'Renewables', 'Transport'],
  },
  {
    code: 'FF',
    label: 'Fund Finance',
    subs: ['Subscription Line', 'NAV Facility', 'Hybrid'],
  },
  {
    code: 'CONS',
    label: 'Consumer / Mortgage',
    subs: ['Residential', 'Auto', 'Personal'],
  },
];

const PURPOSES = [
  'Origination',
  'Annual Review',
  'Quarterly Monitoring',
  'Covenant Compliance',
  'Risk Rating Update',
  'CCAR / Stress Testing',
  'CECL / Allowance',
  'Loan Modification',
  'Portfolio Reporting',
  'Regulatory Exam',
];

const SCENARIOS = [
  { id: 'BASE', label: 'Base Case', desc: 'No stress overlay' },
  { id: 'RATE100', label: 'Rate +100bps', desc: 'Interest rate stress' },
  { id: 'RATE200', label: 'Rate +200bps', desc: 'Standard rate stress' },
  { id: 'NOI10', label: 'Income -10%', desc: 'Mild income decline' },
  { id: 'NOI20', label: 'Income -20%', desc: 'Moderate decline' },
  { id: 'CCAR_BL', label: 'CCAR Baseline', desc: 'Fed baseline scenario' },
  { id: 'CCAR_ADV', label: 'CCAR Adverse', desc: 'Fed adverse scenario' },
];

const NUMERATOR_COMPONENTS: Record<string, { code: string; name: string; op: string; source: string; default: boolean }[]> = {
  CRE: [
    { code: 'GPR', name: 'Gross Potential Rent', op: 'ADD', source: 'property_income_snapshot.gross_potential_rent', default: true },
    { code: 'OTHER_INC', name: 'Other Income', op: 'ADD', source: 'property_income_snapshot.other_income', default: true },
    { code: 'VCL', name: 'Vacancy & Credit Loss', op: 'SUBTRACT', source: 'property_income_snapshot.vacancy_credit_loss_amt', default: true },
    { code: 'OPEX', name: 'Operating Expenses', op: 'SUBTRACT', source: 'property_income_snapshot.operating_expenses', default: true },
    { code: 'REPL_RES', name: 'Replacement Reserves', op: 'SUBTRACT', source: 'property_income_snapshot.replacement_reserves', default: false },
  ],
  CI: [
    { code: 'NET_INC', name: 'Net Income', op: 'ADD', source: 'counterparty_financial_line_item.NET_INCOME', default: true },
    { code: 'INT_EXP', name: 'Interest Expense (Add-back)', op: 'ADD', source: 'counterparty_financial_line_item.INTEREST_EXPENSE', default: true },
    { code: 'TAX_PROV', name: 'Tax Provision (Add-back)', op: 'ADD', source: 'counterparty_financial_line_item.TAX_PROVISION', default: true },
    { code: 'DEP_AMORT', name: 'Depreciation & Amortization', op: 'ADD', source: 'counterparty_financial_line_item.DEPRECIATION_AMORTIZATION', default: true },
  ],
  PF: [
    { code: 'PROJ_REV', name: 'Project Revenue', op: 'ADD', source: 'counterparty_financial_line_item.REVENUE', default: true },
    { code: 'PROJ_OPEX', name: 'Operating Costs', op: 'SUBTRACT', source: 'counterparty_financial_line_item.OPERATING_EXPENSES', default: true },
  ],
};

const DENOMINATOR_COMPONENTS: { code: string; name: string; scope: 'SENIOR' | 'GLOBAL'; source: string; default: boolean }[] = [
  { code: 'SR_INT', name: 'Senior Interest', scope: 'SENIOR', source: 'cash_flow.interest', default: true },
  { code: 'SR_PRIN', name: 'Senior Principal', scope: 'SENIOR', source: 'cash_flow.principal', default: true },
  { code: 'MEZZ_DS', name: 'Mezzanine / Sub Debt P&I', scope: 'GLOBAL', source: 'counterparty_debt_schedule.debt_service', default: false },
];

const SAMPLE_DATA: Record<string, Record<string, number>> = {
  CRE: { GPR: 2400000, OTHER_INC: 85000, VCL: 120000, OPEX: 780000, REPL_RES: 75000 },
  CI: { NET_INC: 3200000, INT_EXP: 890000, TAX_PROV: 1100000, DEP_AMORT: 450000 },
  PF: { PROJ_REV: 5000000, PROJ_OPEX: 1200000 },
};
const SAMPLE_DENOM: Record<string, number> = { SR_INT: 720000, SR_PRIN: 480000, MEZZ_DS: 180000 };

function Toggle({
  enabled,
  onChange,
  disabled,
}: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`w-9 h-5 rounded-full border-0 relative transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed bg-white/20' : 'cursor-pointer'
      } ${enabled ? 'bg-purple-500' : 'bg-white/20'}`}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-[left] duration-200"
        style={{ left: enabled ? '1.125rem' : '0.125rem' }}
      />
    </button>
  );
}

export interface DSCREngineProps {
  onBack: () => void;
  onSaveMetric?: (payload: Partial<L3Metric>) => Promise<void>;
}

export default function DSCREngine({ onBack, onSaveMetric }: DSCREngineProps) {
  const [step, setStep] = useState(0);
  const [product, setProduct] = useState<typeof PRODUCTS[0] | null>(null);
  const [subProduct, setSubProduct] = useState<string | null>(null);
  const [purpose, setPurpose] = useState('Origination');
  const [scenarios, setScenarios] = useState(['BASE']);
  const [denomScope, setDenomScope] = useState<'SENIOR' | 'GLOBAL'>('SENIOR');
  const [numToggles, setNumToggles] = useState<Record<string, boolean>>({});
  const [denToggles, setDenToggles] = useState<Record<string, boolean>>({});
  const [showResult, setShowResult] = useState(false);
  const [showReviewCode, setShowReviewCode] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const prodCode = product?.code || 'CRE';
  const numComps = NUMERATOR_COMPONENTS[prodCode] || NUMERATOR_COMPONENTS.CRE;
  const denComps = DENOMINATOR_COMPONENTS;

  useEffect(() => {
    if (product) {
      const t: Record<string, boolean> = {};
      numComps.forEach((c) => {
        t[c.code] = c.default;
      });
      setNumToggles(t);
      const d: Record<string, boolean> = {};
      denComps.forEach((c) => {
        d[c.code] = c.default;
      });
      setDenToggles(d);
    }
  }, [product, numComps, denComps]);

  useEffect(() => {
    if (denomScope === 'GLOBAL') {
      setDenToggles((prev) => {
        const next = { ...prev };
        denComps.filter((c) => c.scope === 'GLOBAL').forEach((c) => {
          next[c.code] = true;
        });
        return next;
      });
    } else {
      setDenToggles((prev) => {
        const next = { ...prev };
        denComps.filter((c) => c.scope === 'GLOBAL').forEach((c) => {
          next[c.code] = false;
        });
        return next;
      });
    }
  }, [denomScope, denComps]);

  const numData = SAMPLE_DATA[prodCode] || SAMPLE_DATA.CRE;

  const computeNumerator = () => {
    let total = 0;
    numComps.forEach((c) => {
      if (numToggles[c.code]) {
        const v = numData[c.code] || 0;
        total += c.op === 'SUBTRACT' ? -v : v;
      }
    });
    return total;
  };

  const computeDenominator = () => {
    let total = 0;
    denComps.forEach((c) => {
      if (denToggles[c.code]) {
        total += SAMPLE_DENOM[c.code] || 0;
      }
    });
    return total;
  };

  const numerator = computeNumerator();
  const denominator = computeDenominator();
  const dscr = denominator > 0 ? numerator / denominator : null;

  const genVariantCode = () => {
    const sub = (subProduct || '').replace(/\s/g, '').substring(0, 4).toUpperCase();
    const numType =
      numToggles.REPL_RES ? 'NCF' : prodCode === 'CRE' ? 'NOI' : 'EBITDA';
    const scenLabel =
      scenarios.includes('BASE') && scenarios.length === 1 ? 'BASE' : scenarios.filter((s) => s !== 'BASE').join('_');
    return `DSCR-${prodCode}-${sub || 'GEN'}-${numType}-${denomScope}-${scenLabel}`;
  };

  const numeratorLabel = prodCode === 'CRE' ? (numToggles.REPL_RES ? 'NCF' : 'NOI') : 'EBITDA';
  const denominatorLabel = denomScope === 'SENIOR' ? 'Senior DS' : 'Global DS';

  const getThresholdStatus = (v: number | null): { label: string; kind: keyof typeof STATUS_COLOR } => {
    if (v == null) return { label: 'N/A', kind: 'na' };
    if (v >= 1.25) return { label: 'PASS', kind: 'pass' };
    if (v >= 1.0) return { label: 'WATCH', kind: 'watch' };
    return { label: 'FAIL', kind: 'fail' };
  };

  const status = getThresholdStatus(dscr);

  const variantCode = genVariantCode();
  const variantConfig: DSCRVariantConfig = useMemo(() => {
    const formula = `${numeratorLabel} ÷ ${denominatorLabel} = $${numerator.toLocaleString()} ÷ $${denominator.toLocaleString()}`;
    return {
      variantCode,
      variantName: saveName.trim() || variantCode,
      productLabel: product?.label || 'CRE',
      subProduct: subProduct || '',
      purpose,
      numeratorLabel,
      denominatorLabel,
      scenarios,
      formula,
      numeratorSources: numComps.filter((c) => numToggles[c.code]).map((c) => ({ name: c.name, source: c.source })),
      denominatorSources: denComps.filter((c) => denToggles[c.code]).map((c) => ({ name: c.name, source: c.source })),
      dscrValue: dscr,
      sampleValue: dscr != null ? `${dscr.toFixed(2)}x` : '—',
    };
  }, [
    variantCode,
    saveName,
    product,
    subProduct,
    purpose,
    numeratorLabel,
    denominatorLabel,
    scenarios,
    numerator,
    denominator,
    dscr,
    numComps,
    denComps,
    numToggles,
    denToggles,
  ]);

  const lineageMetric: L3Metric | null = useMemo(() => {
    const { nodes, edges } = dscrConfigToLineage(variantConfig);
    return {
      id: variantConfig.variantCode,
      name: variantConfig.variantName,
      page: 'P5',
      section: 'Stress & DSCR',
      metricType: 'Ratio',
      formula: variantConfig.formula,
      description: variantConfig.productLabel,
      displayFormat: '0.00x',
      sampleValue: variantConfig.sampleValue,
      sourceFields: [],
      dimensions: [],
      nodes,
      edges,
    } as L3Metric;
  }, [variantConfig]);

  const handleSaveMetric = async () => {
    if (!onSaveMetric) return;
    setSaveError(null);
    setSaving(true);
    try {
      const payload = dscrConfigToMetric({ ...variantConfig, variantName: saveName.trim() || variantConfig.variantCode });
      await onSaveMetric(payload);
      setShowResult(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save metric');
    } finally {
      setSaving(false);
    }
  };

  const STEPS = ['Product', 'Components', 'Scenario', 'Review & Calculate'];

  return (
    <div className="max-w-4xl mx-auto" role="region" aria-label="DSCR Variant Builder">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to metrics list"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>
      </div>

      <header className="border-b border-white/10 pb-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-0.5">
              Calculator engine
            </div>
            <h1 className="text-xl font-bold text-white">DSCR Variant Builder</h1>
            <p className="text-sm text-gray-500 mt-1">
              Build and save DSCR metric variants with configurable numerator, denominator, and scenarios.
            </p>
          </div>
          {dscr !== null && (
            <div
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${STATUS_BG[status.kind]} ${STATUS_COLOR[status.kind]}`}
            >
              <span className="text-[10px] text-gray-400">LIVE DSCR</span>
              <span className="text-xl font-bold tabular-nums">{dscr.toFixed(2)}x</span>
              <span className="text-[10px] font-bold">{status.label}</span>
            </div>
          )}
        </div>
      </header>

      <div className="mb-6" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="flex-1 flex flex-col items-center gap-1.5"
              aria-current={step === i ? 'step' : undefined}
            >
              <div
                className={`w-full h-0.5 rounded transition-colors ${
                  i <= step ? 'bg-purple-500' : 'bg-white/10'
                }`}
              />
              <span
                className={`text-[10px] uppercase tracking-wider ${
                  i <= step ? 'text-white' : 'text-gray-500'
                } ${step === i ? 'font-semibold' : 'font-normal'}`}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <section className="mb-8" aria-labelledby="dscr-step-product-heading">
          <h2 id="dscr-step-product-heading" className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
            <span className="w-6 h-0.5 bg-gray-600 rounded" aria-hidden />
            Select product type
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Product type determines which income components are available for the numerator.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PRODUCTS.map((p) => (
              <button
                key={p.code}
                type="button"
                onClick={() => { setProduct(p); setSubProduct(null); }}
                aria-pressed={product?.code === p.code}
                className={`p-4 rounded-xl border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                  product?.code === p.code
                    ? 'border-purple-500/50 bg-purple-500/20 text-white'
                    : 'border-white/[0.06] bg-white/[0.02] text-gray-300 hover:border-white/10 hover:bg-white/[0.04]'
                }`}
              >
                <div className="text-sm font-semibold">{p.label}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{p.subs.length} sub-products</div>
              </button>
            ))}
          </div>
          {product && (
            <div className="mt-6 p-3 rounded-lg bg-white/[0.04] border border-white/10">
              <p className="text-xs font-medium text-gray-400 mb-2">Sub-product</p>
              <div className="flex flex-wrap gap-2">
                {product.subs.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubProduct(s)}
                    aria-pressed={subProduct === s}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                      subProduct === s
                        ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {product && (
            <div className="mt-4 p-3 rounded-lg bg-white/[0.04] border border-white/10">
              <p className="text-xs font-medium text-gray-400 mb-2">Calculation purpose</p>
              <div className="flex flex-wrap gap-2">
                {PURPOSES.slice(0, 6).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPurpose(p)}
                    aria-pressed={purpose === p}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                      purpose === p
                        ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          {product && subProduct && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-6 px-6 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-semibold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              Continue to Components →
            </button>
          )}
        </section>
      )}

      {step === 1 && (
        <section className="mb-8" aria-labelledby="dscr-step-components-heading">
          <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
            <div>
              <h2 id="dscr-step-components-heading" className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-2">
                <span className="w-6 h-0.5 bg-gray-600 rounded" aria-hidden />
                Configure formula components
              </h2>
              <p className="text-sm text-gray-400">
                {product?.label} → {subProduct} → {purpose}
                <span className="ml-2 font-mono text-purple-400">{genVariantCode()}</span>
              </p>
            </div>
            <div className="flex gap-2" role="group" aria-label="Denominator scope">
              <button
                type="button"
                onClick={() => setDenomScope('SENIOR')}
                aria-pressed={denomScope === 'SENIOR'}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                  denomScope === 'SENIOR'
                    ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                Senior only
              </button>
              <button
                type="button"
                onClick={() => setDenomScope('GLOBAL')}
                aria-pressed={denomScope === 'GLOBAL'}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                  denomScope === 'GLOBAL'
                    ? 'bg-purple-500/30 text-purple-200 border border-purple-500/50'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                Global (all debt)
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-950/40">
                <span className="text-xs font-bold text-emerald-300">Numerator</span>
                <span className="ml-auto text-sm font-mono font-semibold text-emerald-300 tabular-nums">
                  ${numerator.toLocaleString()}
                </span>
              </div>
              <div className="space-y-2">
                {numComps.map((c) => (
                  <div
                    key={c.code}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      numToggles[c.code]
                        ? 'border-emerald-500/40 bg-emerald-950/30'
                        : 'border-white/10 bg-transparent opacity-60'
                    }`}
                  >
                    <Toggle
                      enabled={numToggles[c.code]}
                      onChange={(v) => setNumToggles((prev) => ({ ...prev, [c.code]: v }))}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-semibold ${numToggles[c.code] ? 'text-white' : 'text-gray-400'}`}>
                        {c.op === 'SUBTRACT' ? '−' : '+'} {c.name}
                      </div>
                      <div className="text-[10px] font-mono text-gray-500 mt-0.5">Source: {c.source}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-950/40">
                <span className="text-xs font-bold text-amber-300">Denominator</span>
                <span className="ml-auto text-sm font-mono font-semibold text-amber-300 tabular-nums">
                  ${denominator.toLocaleString()}
                </span>
              </div>
              <div className="space-y-2">
                {denComps.map((c) => {
                  const visible = c.scope === 'SENIOR' || denomScope === 'GLOBAL';
                  if (!visible) return null;
                  return (
                    <div
                      key={c.code}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        denToggles[c.code]
                          ? 'border-amber-500/40 bg-amber-950/30'
                          : 'border-white/10 bg-transparent opacity-60'
                      }`}
                    >
                      <Toggle
                        enabled={denToggles[c.code]}
                        onChange={(v) => setDenToggles((prev) => ({ ...prev, [c.code]: v }))}
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13px] font-semibold ${denToggles[c.code] ? 'text-white' : 'text-gray-400'}`}>
                          + {c.name}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500 mt-0.5">Source: {c.source}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="px-5 py-2.5 rounded-lg border border-white/10 bg-transparent text-gray-400 hover:text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-semibold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              Continue to Scenarios →
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="mb-8" aria-labelledby="dscr-step-scenarios-heading">
          <h2 id="dscr-step-scenarios-heading" className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
            <span className="w-6 h-0.5 bg-gray-600 rounded" aria-hidden />
            Select stress scenarios
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Base case is always included. Each additional scenario produces a parallel DSCR calculation.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SCENARIOS.map((s) => {
              const sel = scenarios.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (s.id === 'BASE') return;
                    setScenarios((prev) => (sel ? prev.filter((x) => x !== s.id) : [...prev, s.id]));
                  }}
                  aria-pressed={sel}
                  disabled={s.id === 'BASE'}
                  className={`p-3 rounded-xl border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 ${
                    s.id === 'BASE' ? 'opacity-70 cursor-default' : 'cursor-pointer'
                  } ${
                    sel
                      ? 'border-purple-500/50 bg-purple-500/20 text-white'
                      : 'border-white/[0.06] bg-white/[0.02] text-gray-300 hover:border-white/10 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="text-[13px] font-semibold">{s.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{s.desc}</div>
                  {s.id === 'BASE' && <div className="text-[9px] text-gray-500 mt-1 italic">Always included</div>}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-lg border border-white/10 bg-transparent text-gray-400 hover:text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-semibold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              Review & Calculate →
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="mb-8" aria-labelledby="dscr-step-review-heading">
          <h2 id="dscr-step-review-heading" className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
            <span className="w-6 h-0.5 bg-gray-600 rounded" aria-hidden />
            Review variant configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-5 rounded-xl border border-white/10 bg-white/[0.04]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 mb-3">
                Variant definition
              </div>
              <div className="font-mono text-xs mb-4 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300">
                {variantCode}
              </div>
              <div className="space-y-0 divide-y divide-white/10">
                {[
                  ['Product', `${product?.label} → ${subProduct}`],
                  ['Purpose', purpose],
                  ['Numerator', numeratorLabel],
                  ['Denominator', `${denomScope} debt service`],
                  ['Scenarios', scenarios.join(', ')],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between py-2 first:pt-0">
                    <span className="text-[11px] text-gray-500">{k}</span>
                    <span className="text-xs font-medium text-white">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`p-5 rounded-xl border ${STATUS_BG[status.kind]}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 mb-3">
                Calculation result (base case)
              </div>
              <div className="text-center py-5">
                <div className={`text-4xl font-black tabular-nums ${STATUS_COLOR[status.kind]}`}>
                  {dscr?.toFixed(2) ?? '—'}x
                </div>
                <span className={`inline-block mt-2 px-3 py-1 rounded text-xs font-bold ${STATUS_COLOR[status.kind]} ${status.kind !== 'na' ? 'bg-white/10' : ''}`}>
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          <details className="group mb-6 rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden">
            <summary className="flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-300 cursor-pointer list-none focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded-xl [&::-webkit-details-marker]:hidden">
              <Code className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
              Review / code
              <ChevronDown className="w-3.5 h-3.5 ml-auto transition-transform group-open:rotate-180 flex-shrink-0" aria-hidden />
            </summary>
            <div className="px-4 pb-4 pt-0 border-t border-white/10">
              <pre className="text-[11px] font-mono p-3 rounded-lg bg-black/20 overflow-x-auto whitespace-pre-wrap text-gray-300">
                {`Variant: ${variantCode}
Formula: ${numeratorLabel} ÷ ${denominatorLabel}
Numerator: ${numComps.filter((c) => numToggles[c.code]).map((c) => c.name).join(', ')}
Denominator: ${denComps.filter((c) => denToggles[c.code]).map((c) => c.name).join(', ')}
Sources: ${[
                  ...numComps.filter((c) => numToggles[c.code]).map((c) => c.source),
                  ...denComps.filter((c) => denToggles[c.code]).map((c) => c.source),
                ].join(', ')}`}
              </pre>
            </div>
          </details>

          {lineageMetric?.nodes && lineageMetric.nodes.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                Data lineage (this variant)
              </h2>
              <p className="text-[11px] text-gray-500 mb-3">
                Same view as in the metric visualization. Each component is mapped to one L2 atomic element (table.column), e.g. facility_financial_snapshot.noi_amt, cash_flow.amount. Lineage updates with your component choices.
              </p>
              <div className="rounded-lg p-4 border border-white/10 bg-black/10">
                <LineageFlowView metric={lineageMetric} />
              </div>
            </section>
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mb-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-purple-400 mb-2">
              Save as metric
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              Save this DSCR variant to the catalog with the generated name (or customize below). It will appear in the metrics list with full lineage.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex-1 min-w-[200px]">
                <span className="text-[11px] text-gray-500 block mb-1">
                  Metric name (optional — defaults to variant code)
                </span>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={variantCode}
                  aria-label="Metric name for saved variant"
                  className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.04] text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                />
              </label>
              <button
                type="button"
                onClick={handleSaveMetric}
                disabled={!onSaveMetric || saving}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
              >
                {saving ? 'Saving…' : 'Save metric with generated name'}
              </button>
            </div>
            {saveError && (
              <p className="mt-2 text-xs text-red-400" role="alert">
                {saveError}
              </p>
            )}
          </div>

          {showResult && (
            <div className="p-4 rounded-lg border border-emerald-500/40 bg-emerald-950/30 mb-4" role="status">
              <div className="text-sm font-semibold text-emerald-400 mb-1">Metric saved</div>
              <p className="text-xs text-emerald-300/90 leading-relaxed">
                Variant <strong>{saveName.trim() || variantCode}</strong> has been saved to the catalog. You can find it in the metrics list and view its lineage there.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-lg border border-white/10 bg-transparent text-gray-400 hover:text-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            >
              ← Back
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
