'use client';

import React, { useEffect, useState } from 'react';
import {
  FACILITIES,
  COUNTERPARTIES,
  fmtPct,
  fmtM,
  pctForVariant,
  wtdPctForVariant,
  type AllocPctVariant,
} from './allocPctDemoRollupData';

/* ────────────────────────────────────────────────────────────────────────────
 * AllocPctDemoFormulaAnimation — animated formula build-ups
 *
 * Each formulaKey corresponds to a different visualization:
 *   - legal-build: show participation_pct appearing
 *   - weight-build: show committed amount weighting
 *   - crm-build: show CRM adjustment components
 *   - legal-result: show legal participation result
 *   - economic-result: show subtraction result
 *   - foundational-rule: weighted avg vs wrong approaches
 *   - rollup-facility-legal / rollup-facility-economic
 *   - rollup-cp-legal / rollup-cp-economic
 * ──────────────────────────────────────────────────────────────────────────── */

interface Props {
  formulaKey: string;
  variant: string;
  stepIndex: number;
}

/* ── stagger reveal hook ─────────────────────────────────────────────────── */

function useStaggerReveal(totalItems: number, delayMs: number, key: string | number) {
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    setRevealed(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < totalItems; i++) {
      timers.push(setTimeout(() => setRevealed(i + 1), delayMs * (i + 1)));
    }
    return () => timers.forEach(clearTimeout);
  }, [totalItems, delayMs, key]);
  return revealed;
}

/* ────────────────────────────────────────────────────────────────────────── */

export default function AllocPctDemoFormulaAnimation({ formulaKey, variant, stepIndex }: Props) {
  const v = (variant || 'legal') as AllocPctVariant;
  switch (formulaKey) {
    case 'legal-build':
      return <LegalBuild stepIndex={stepIndex} />;
    case 'input2-build':
      return v === 'legal' ? <WeightBuild stepIndex={stepIndex} /> : <CRMBuild stepIndex={stepIndex} />;
    case 'weight-build':
      return <WeightBuild stepIndex={stepIndex} />;
    case 'crm-build':
      return <CRMBuild stepIndex={stepIndex} />;
    case 'alloc-result':
      return v === 'legal' ? <LegalResult stepIndex={stepIndex} /> : <EconomicResult stepIndex={stepIndex} />;
    case 'legal-result':
      return <LegalResult stepIndex={stepIndex} />;
    case 'economic-result':
      return <EconomicResult stepIndex={stepIndex} />;
    case 'foundational-rule':
      return <FoundationalRuleDemo stepIndex={stepIndex} />;
    case 'rollup-facility':
      return <RollupFacility stepIndex={stepIndex} variant={v} />;
    case 'rollup-counterparty':
      return <RollupCounterparty stepIndex={stepIndex} variant={v} />;
    default:
      return null;
  }
}

/* ── Legal Participation build ───────────────────────────────────────────── */

function LegalBuild({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Legal Participation
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-400">Facility</span>
        <span className="text-gray-500 font-mono">Syndicated Revolver ($100M)</span>
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-400">Counterparty</span>
        <span className="text-gray-500 font-mono">Apex Properties</span>
      </div>
      <div
        className="flex items-center justify-between text-xs font-bold transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-cyan-400">participation_pct</span>
        <span className="text-white font-mono">60.00%</span>
      </div>
      <div
        className="text-[9px] text-gray-600 mt-1 transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0 }}
      >
        Bank committed to fund 60% of the $100M facility — up to $60M
      </div>
    </div>
  );
}

/* ── Weight build ────────────────────────────────────────────────────────── */

function WeightBuild({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 400, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Weighting Basis
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-300">Committed Amount</span>
        <span className="text-white font-mono font-bold">$100,000,000</span>
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-400">Participation</span>
        <span className="text-cyan-400 font-mono">60.00%</span>
      </div>
      <div
        className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-gray-800 transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'scale(1)' : 'scale(0.95)' }}
      >
        <span className="text-cyan-300">Weighted Contribution</span>
        <span className="text-white font-mono">60 × $100M</span>
      </div>
    </div>
  );
}

/* ── CRM Adjustment build ────────────────────────────────────────────────── */

function CRMBuild({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(4, 400, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        CRM Adjustment Components
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-300">Legal Participation</span>
        <span className="text-cyan-400 font-mono">60.00%</span>
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-rose-400 font-mono font-bold">−</span>
          <span className="text-gray-300">CDS Protection</span>
        </div>
        <span className="text-rose-400 font-mono">15.00%</span>
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-500 text-[10px]">Methodology: COMPREHENSIVE</span>
      </div>
      <div
        className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-gray-800 transition-all duration-500"
        style={{ opacity: revealed > 3 ? 1 : 0, transform: revealed > 3 ? 'scale(1)' : 'scale(0.95)' }}
      >
        <span className="text-cyan-300">Economic Allocation</span>
        <span className="text-white font-mono">45.00%</span>
      </div>
    </div>
  );
}

/* ── Legal Result ────────────────────────────────────────────────────────── */

function LegalResult({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(2, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-4 space-y-2 text-center">
      <div
        className="text-sm font-mono text-gray-300 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0 }}
      >
        participation_pct
      </div>
      <div
        className="pt-2 border-t border-gray-800 transition-all duration-700"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'scale(1)' : 'scale(0.8)' }}
      >
        <span className="text-[10px] text-gray-500">Legal Participation =</span>
        <span className="text-2xl font-black text-cyan-400 ml-2 tabular-nums">60.00%</span>
      </div>
    </div>
  );
}

/* ── Economic Result ─────────────────────────────────────────────────────── */

function EconomicResult({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-4 space-y-2 text-center">
      <div
        className="text-sm font-mono text-gray-300 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0 }}
      >
        60.00%
      </div>
      <div
        className="text-gray-600 text-lg transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        &minus; 15.00%
      </div>
      <div
        className="pt-2 border-t border-gray-800 transition-all duration-700"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'scale(1)' : 'scale(0.8)' }}
      >
        <span className="text-[10px] text-gray-500">Economic Allocation =</span>
        <span className="text-2xl font-black text-cyan-400 ml-2 tabular-nums">45.00%</span>
      </div>
    </div>
  );
}

/* ── Foundational Rule — Weighted Average vs wrong approaches ────────────── */

function FoundationalRuleDemo({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  return (
    <div className="space-y-3">
      <div
        className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest text-cyan-400 mb-2">
          Correct: Exposure-Weighted Average
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between text-gray-400">
            <span>Facility A ($100M)</span><span className="text-cyan-400">60.00%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Facility C ($200M)</span><span className="text-cyan-400">35.00%</span>
          </div>
        </div>
        <div
          className="mt-2 pt-2 border-t border-cyan-500/20 text-xs font-mono text-center transition-all duration-500"
          style={{ opacity: revealed > 1 ? 1 : 0 }}
        >
          (60×100 + 35×200) / 300 = <span className="text-cyan-400 font-bold">43.33%</span>
          <span className="text-[9px] text-cyan-400/70 ml-1">(size-weighted)</span>
        </div>
      </div>

      <div
        className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest text-rose-400 mb-2">
          Wrong: Simple Average
        </div>
        <div className="text-[10px] text-gray-400 leading-relaxed">
          (60% + 35%) / 2 = <span className="text-rose-300 font-semibold line-through">47.50%</span>
          <span className="text-gray-500 ml-2">— ignores that the $200M facility is twice as large</span>
        </div>
      </div>
    </div>
  );
}

/* ── Rollup: Facility ────────────────────────────────────────────────────── */

function RollupFacility({ stepIndex, variant }: { stepIndex: number; variant: AllocPctVariant }) {
  const revealed = useStaggerReveal(FACILITIES.length, 350, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        {variant === 'legal' ? 'Legal Participation Per Facility' : 'Economic Allocation Per Facility'}
      </div>
      {FACILITIES.map((f, i) => (
        <div
          key={f.name}
          className="flex items-center justify-between px-2 py-1.5 rounded text-xs transition-all duration-500"
          style={{
            opacity: revealed > i ? 1 : 0,
            transform: revealed > i ? 'translateX(0)' : 'translateX(16px)',
            background: revealed > i ? 'rgba(255,255,255,0.02)' : 'transparent',
          }}
        >
          <span className="text-gray-400 truncate">{f.name}</span>
          <div className="flex items-center gap-2 font-mono flex-shrink-0 ml-2">
            <span className="text-gray-500 text-[10px]">{fmtM(f.committedAmt)}</span>
            {variant === 'economic' && f.crmAdjPct > 0 && (
              <span className="text-rose-400 text-[10px]">−{fmtPct(f.crmAdjPct)}</span>
            )}
            <span className="text-cyan-400 font-bold">{fmtPct(pctForVariant(f, variant))}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Rollup: Counterparty ────────────────────────────────────────────────── */

function RollupCounterparty({ stepIndex, variant }: { stepIndex: number; variant: AllocPctVariant }) {
  const totalLines = COUNTERPARTIES.length * 3;
  const revealed = useStaggerReveal(totalLines, 300, stepIndex);
  let lineIdx = 0;

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Weighted Average by Counterparty
      </div>
      {COUNTERPARTIES.map((cp) => {
        const cpFacilities = FACILITIES.filter((f) => f.counterpartyName === cp.name);
        const startIdx = lineIdx;
        lineIdx += cpFacilities.length + 1;
        return (
          <div key={cp.name} className="space-y-1">
            <div className="text-[10px] text-gray-500 font-bold">{cp.name}</div>
            {cpFacilities.map((f, i) => (
              <div
                key={f.name}
                className="flex justify-between text-xs font-mono transition-all duration-500 pl-2"
                style={{ opacity: revealed > startIdx + i ? 1 : 0, transform: revealed > startIdx + i ? 'translateX(0)' : 'translateX(12px)' }}
              >
                <span className="text-gray-500">{f.name.split('(')[0].trim()}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{fmtM(f.committedAmt)}</span>
                  <span className="text-cyan-400">{fmtPct(pctForVariant(f, variant))}</span>
                </div>
              </div>
            ))}
            <div
              className="flex justify-between text-xs font-mono font-bold pt-1 border-t border-gray-800 transition-all duration-500 pl-2"
              style={{ opacity: revealed > startIdx + cpFacilities.length ? 1 : 0, transform: revealed > startIdx + cpFacilities.length ? 'scale(1)' : 'scale(0.95)' }}
            >
              <span className="text-gray-300">Wtd Avg</span>
              <span className="text-cyan-300">{fmtPct(wtdPctForVariant(cp, variant))}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
