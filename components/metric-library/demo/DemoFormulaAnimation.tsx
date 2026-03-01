'use client';

import React, { useEffect, useState } from 'react';
import type { VariantKey } from './demoSteps';
import {
  facilitiesFor,
  counterpartiesFor,
  sumNumerators,
  sumDenominators,
  exposureWeightedDSCR,
  fmt,
  fmtM,
  DESK_CRE_POOLED,
  DESK_CI_POOLED,
} from './demoRollupData';

/* ────────────────────────────────────────────────────────────────────────────
 * DemoFormulaAnimation — animated formula build-ups in the narration panel
 *
 * Each formulaKey corresponds to a different visualization:
 *   - numerator-build: show components appearing one by one
 *   - numerator-total: show the sum with emphasis
 *   - denominator-build / denominator-total: same for denominator
 *   - dscr-division: show the final division
 *   - rollup-facility: table of 3 facility DSCRs
 *   - rollup-counterparty: pooled ratio build-up
 *   - rollup-desk: product-segmented side-by-side
 *   - rollup-portfolio: exposure-weighted average
 *   - rollup-lob: trend indicator summary
 * ──────────────────────────────────────────────────────────────────────────── */

interface Props {
  formulaKey: string;
  variant: string;
  /** Increments when step changes to reset animations */
  stepIndex: number;
}

/* CRE numerator components */
const CRE_NUM = [
  { op: '+', name: 'Gross Potential Rent', val: 2_400_000 },
  { op: '+', name: 'Other Income', val: 85_000 },
  { op: '\u2212', name: 'Vacancy & Credit Loss', val: 120_000 },
  { op: '\u2212', name: 'Operating Expenses', val: 780_000 },
];
const CI_NUM = [
  { op: '+', name: 'Net Income', val: 3_200_000 },
  { op: '+', name: 'Interest Expense (add-back)', val: 890_000 },
  { op: '+', name: 'Tax Provision (add-back)', val: 1_100_000 },
  { op: '+', name: 'Depreciation & Amortization', val: 450_000 },
];
const CRE_DEN = [
  { op: '+', name: 'Senior Interest', val: 720_000 },
  { op: '+', name: 'Senior Principal', val: 480_000 },
];
const CI_DEN = [
  { op: '+', name: 'Senior Interest', val: 720_000 },
  { op: '+', name: 'Senior Principal', val: 480_000 },
  { op: '+', name: 'Mezzanine / Sub Debt P&I', val: 180_000 },
];

function numComps(v: VariantKey) { return v === 'CRE' ? CRE_NUM : CI_NUM; }
function denComps(v: VariantKey) { return v === 'CRE' ? CRE_DEN : CI_DEN; }
function numTotal(v: VariantKey) { return v === 'CRE' ? 1_585_000 : 5_640_000; }
function denTotal(v: VariantKey) { return v === 'CRE' ? 1_200_000 : 1_380_000; }
function dscrResult(v: VariantKey) { return v === 'CRE' ? '1.32x' : '4.09x'; }
function numLabel(v: VariantKey) { return v === 'CRE' ? 'NOI' : 'EBITDA'; }
function denLabel(v: VariantKey) { return v === 'CRE' ? 'Senior DS' : 'Global DS'; }

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

/* ── row component ───────────────────────────────────────────────────────── */

function AnimRow({
  op, name, val, visible, isAdd,
}: { op: string; name: string; val: number; visible: boolean; isAdd: boolean }) {
  return (
    <div
      className="flex items-center justify-between text-xs transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(16px)',
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`flex-shrink-0 font-mono font-bold ${isAdd ? 'text-emerald-400' : 'text-red-400'}`}>
          {op}
        </span>
        <span className="text-gray-300 truncate">{name}</span>
      </div>
      <span className="text-gray-400 font-mono flex-shrink-0 ml-2">{fmt(val)}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export default function DemoFormulaAnimation({ formulaKey, variant, stepIndex }: Props) {
  const v = variant as VariantKey;
  switch (formulaKey) {
    case 'numerator-build':
      return <NumeratorBuild variant={v} stepIndex={stepIndex} />;
    case 'numerator-total':
      return <NumeratorTotal variant={v} stepIndex={stepIndex} />;
    case 'denominator-build':
      return <DenominatorBuild variant={v} stepIndex={stepIndex} />;
    case 'denominator-total':
      return <DenominatorTotal variant={v} stepIndex={stepIndex} />;
    case 'dscr-division':
      return <DSCRDivision variant={v} stepIndex={stepIndex} />;
    case 'foundational-rule':
      return <FoundationalRuleDemo stepIndex={stepIndex} />;
    case 'rollup-facility':
      return <RollupFacility variant={v} stepIndex={stepIndex} />;
    case 'rollup-counterparty':
      return <RollupCounterparty variant={v} stepIndex={stepIndex} />;
    case 'rollup-desk':
      return <RollupDesk variant={v} stepIndex={stepIndex} />;
    case 'rollup-portfolio':
      return <RollupPortfolio variant={v} stepIndex={stepIndex} />;
    case 'rollup-lob':
      return <RollupLoB variant={v} stepIndex={stepIndex} />;
    default:
      return null;
  }
}

/* ── Numerator build ─────────────────────────────────────────────────────── */

function NumeratorBuild({ variant, stepIndex }: { variant: VariantKey; stepIndex: number }) {
  const comps = numComps(variant);
  const revealed = useStaggerReveal(comps.length, 400, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        {numLabel(variant)} Components
      </div>
      {comps.map((c, i) => (
        <AnimRow key={c.name} op={c.op} name={c.name} val={c.val} visible={revealed > i} isAdd={c.op === '+'} />
      ))}
    </div>
  );
}

/* ── Numerator total ─────────────────────────────────────────────────────── */

function NumeratorTotal({ variant, stepIndex }: { variant: VariantKey; stepIndex: number }) {
  const revealed = useStaggerReveal(1, 300, stepIndex);
  const color = variant === 'CRE' ? 'text-blue-400' : 'text-purple-400';
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3">
      <div
        className="flex items-center justify-between text-sm font-bold transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'scale(1)' : 'scale(0.9)' }}
      >
        <span className={color}>{numLabel(variant)}</span>
        <span className="text-white font-mono">{fmt(numTotal(variant))}</span>
      </div>
    </div>
  );
}

/* ── Denominator build ───────────────────────────────────────────────────── */

function DenominatorBuild({ variant, stepIndex }: { variant: VariantKey; stepIndex: number }) {
  const comps = denComps(variant);
  const revealed = useStaggerReveal(comps.length, 400, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        {denLabel(variant)} Components
      </div>
      {comps.map((c, i) => (
        <AnimRow key={c.name} op={c.op} name={c.name} val={c.val} visible={revealed > i} isAdd />
      ))}
    </div>
  );
}

/* ── Denominator total ───────────────────────────────────────────────────── */

function DenominatorTotal({ variant, stepIndex }: { variant: VariantKey; stepIndex: number }) {
  const revealed = useStaggerReveal(1, 300, stepIndex);
  const color = variant === 'CRE' ? 'text-blue-400' : 'text-purple-400';
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3">
      <div
        className="flex items-center justify-between text-sm font-bold transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'scale(1)' : 'scale(0.9)' }}
      >
        <span className={color}>{denLabel(variant)}</span>
        <span className="text-white font-mono">{fmt(denTotal(variant))}</span>
      </div>
    </div>
  );
}

/* ── DSCR division ───────────────────────────────────────────────────────── */

function DSCRDivision({ variant, stepIndex }: { variant: VariantKey; stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  const color = variant === 'CRE' ? 'text-blue-400' : 'text-purple-400';
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-4 space-y-2 text-center">
      <div
        className="text-sm font-mono text-gray-300 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0 }}
      >
        {fmt(numTotal(variant))}
      </div>
      <div
        className="text-gray-600 text-lg transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        &divide;
      </div>
      <div
        className="text-sm font-mono text-gray-300 transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        {fmt(denTotal(variant))}
      </div>
      <div
        className="pt-2 border-t border-gray-800 transition-all duration-700"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'scale(1)' : 'scale(0.8)' }}
      >
        <span className="text-[10px] text-gray-500">DSCR =</span>
        <span className={`text-2xl font-black ${color} ml-2 tabular-nums`}>{dscrResult(variant)}</span>
      </div>
    </div>
  );
}

/* ── Foundational Rule — wrong vs right way ──────────────────────────────── */

function FoundationalRuleDemo({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(4, 500, stepIndex);
  return (
    <div className="space-y-3">
      {/* Wrong way */}
      <div
        className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest text-red-400 mb-2">
          Wrong: Simple Average
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between text-gray-400">
            <span>$100M loan</span><span>DSCR = 1.10x</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>$1M loan</span><span>DSCR = 3.00x</span>
          </div>
        </div>
        <div
          className="mt-2 pt-2 border-t border-red-500/20 text-xs font-mono text-center transition-all duration-500"
          style={{ opacity: revealed > 1 ? 1 : 0 }}
        >
          Average = <span className="text-red-400 font-bold">2.05x</span>
          <span className="text-[9px] text-red-400/70 ml-1">(misleading!)</span>
        </div>
      </div>

      {/* Right way */}
      <div
        className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
          Correct: Pool &amp; Divide
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between text-gray-400">
            <span>Total Income</span><span className="text-emerald-400">$113M</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Total Debt Svc</span><span className="text-amber-400">$101.3M</span>
          </div>
        </div>
        <div
          className="mt-2 pt-2 border-t border-emerald-500/20 text-xs font-mono text-center transition-all duration-500"
          style={{ opacity: revealed > 3 ? 1 : 0 }}
        >
          Pooled = <span className="text-emerald-400 font-bold">1.12x</span>
          <span className="text-[9px] text-emerald-400/70 ml-1">(accurate)</span>
        </div>
      </div>
    </div>
  );
}

/* ── Rollup: Facility ────────────────────────────────────────────────────── */

function RollupFacility({ variant, stepIndex }: { variant: VariantKey; stepIndex: number }) {
  const facilities = facilitiesFor(variant);
  const revealed = useStaggerReveal(facilities.length, 400, stepIndex);
  const nLabel = numLabel(variant);

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Direct Calculation Per Facility
      </div>
      {facilities.map((f, i) => (
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
            <span className="text-emerald-400 text-[10px]">{fmt(f.numerator)}</span>
            <span className="text-gray-600">/</span>
            <span className="text-amber-400 text-[10px]">{fmt(f.denominator)}</span>
            <span className="text-gray-600">=</span>
            <span className={`font-bold ${f.dscr < 1 ? 'text-red-400' : 'text-white'}`}>{f.dscr.toFixed(2)}x</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Rollup: Counterparty ────────────────────────────────────────────────── */

function RollupCounterparty({ variant, stepIndex }: { variant: VariantKey; stepIndex: number }) {
  const facilities = facilitiesFor(variant);
  const totalNum = sumNumerators(facilities);
  const totalDen = sumDenominators(facilities);
  const pooled = totalNum / totalDen;
  // lines: each facility num, separator, total num, each facility den, separator, total den, result
  const totalLines = facilities.length + 1 + facilities.length + 1 + 1;
  const revealed = useStaggerReveal(totalLines, 350, stepIndex);

  const numOffset = 0;
  const numTotalIdx = facilities.length;
  const denOffset = facilities.length + 1;
  const denTotalIdx = denOffset + facilities.length;
  const resultIdx = totalLines - 1;

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Pooled Ratio: Sum &amp; Divide
      </div>

      {/* Numerators */}
      <div className="space-y-1">
        <div className="text-[9px] text-gray-600 uppercase tracking-wider">{numLabel(variant)}</div>
        {facilities.map((f, i) => (
          <div
            key={`n-${f.name}`}
            className="flex justify-between text-xs font-mono transition-all duration-500"
            style={{ opacity: revealed > numOffset + i ? 1 : 0, transform: revealed > numOffset + i ? 'translateX(0)' : 'translateX(12px)' }}
          >
            <span className="text-gray-500">{f.name.split('(')[0].trim()}</span>
            <span className="text-emerald-400">{fmt(f.numerator)}</span>
          </div>
        ))}
        <div
          className="flex justify-between text-xs font-mono font-bold pt-1 border-t border-gray-800 transition-all duration-500"
          style={{ opacity: revealed > numTotalIdx ? 1 : 0, transform: revealed > numTotalIdx ? 'scale(1)' : 'scale(0.95)' }}
        >
          <span className="text-gray-300">Total</span>
          <span className="text-emerald-300">{fmt(totalNum)}</span>
        </div>
      </div>

      {/* Denominators */}
      <div className="space-y-1">
        <div className="text-[9px] text-gray-600 uppercase tracking-wider">{denLabel(variant)}</div>
        {facilities.map((f, i) => (
          <div
            key={`d-${f.name}`}
            className="flex justify-between text-xs font-mono transition-all duration-500"
            style={{ opacity: revealed > denOffset + i ? 1 : 0, transform: revealed > denOffset + i ? 'translateX(0)' : 'translateX(12px)' }}
          >
            <span className="text-gray-500">{f.name.split('(')[0].trim()}</span>
            <span className="text-amber-400">{fmt(f.denominator)}</span>
          </div>
        ))}
        <div
          className="flex justify-between text-xs font-mono font-bold pt-1 border-t border-gray-800 transition-all duration-500"
          style={{ opacity: revealed > denTotalIdx ? 1 : 0, transform: revealed > denTotalIdx ? 'scale(1)' : 'scale(0.95)' }}
        >
          <span className="text-gray-300">Total</span>
          <span className="text-amber-300">{fmt(totalDen)}</span>
        </div>
      </div>

      {/* Result */}
      <div
        className="text-center pt-2 border-t border-gray-700 transition-all duration-700"
        style={{ opacity: revealed > resultIdx ? 1 : 0, transform: revealed > resultIdx ? 'scale(1)' : 'scale(0.85)' }}
      >
        <div className="text-[10px] text-gray-500 mb-1">
          {fmt(totalNum)} &divide; {fmt(totalDen)}
        </div>
        <div className="text-xl font-black text-white tabular-nums">
          {pooled.toFixed(2)}x
        </div>
      </div>
    </div>
  );
}

/* ── Rollup: Desk ────────────────────────────────────────────────────────── */

function RollupDesk({ variant, stepIndex }: { variant: VariantKey; stepIndex: number }) {
  const revealed = useStaggerReveal(2, 600, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Product-Segmented DSCR
      </div>

      <div
        className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-2.5 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[10px] font-bold text-blue-300 mb-1">CRE DSCR</div>
        <div className="text-xs font-mono text-gray-300">
          {fmt(DESK_CRE_POOLED.totalNumerator)} &divide; {fmt(DESK_CRE_POOLED.totalDenominator)} ={' '}
          <span className="text-blue-400 font-bold">{DESK_CRE_POOLED.dscr.toFixed(2)}x</span>
        </div>
        <div className="text-[9px] text-gray-600 mt-0.5">CRE facilities only</div>
      </div>

      <div
        className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-2.5 transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[10px] font-bold text-purple-300 mb-1">C&I DSCR</div>
        <div className="text-xs font-mono text-gray-300">
          {fmt(DESK_CI_POOLED.totalNumerator)} &divide; {fmt(DESK_CI_POOLED.totalDenominator)} ={' '}
          <span className="text-purple-400 font-bold">{DESK_CI_POOLED.dscr.toFixed(2)}x</span>
        </div>
        <div className="text-[9px] text-gray-600 mt-0.5">C&I facilities only</div>
      </div>
    </div>
  );
}

/* ── Rollup: Portfolio ───────────────────────────────────────────────────── */

function RollupPortfolio({ variant, stepIndex }: { variant: VariantKey; stepIndex: number }) {
  const cps = counterpartiesFor(variant);
  const totalLines = cps.length + 1; // rows + result
  const revealed = useStaggerReveal(totalLines, 400, stepIndex);
  const wtdAvg = exposureWeightedDSCR(cps);

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Exposure-Weighted Average
      </div>

      {cps.map((cp, i) => (
        <div
          key={cp.name}
          className="flex items-center justify-between text-xs font-mono transition-all duration-500"
          style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateX(0)' : 'translateX(12px)' }}
        >
          <span className="text-gray-400">{cp.name}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-white">{cp.dscr.toFixed(2)}x</span>
            <span className="text-gray-600">&times;</span>
            <span className="text-amber-400">{fmtM(cp.exposure)}</span>
          </div>
        </div>
      ))}

      <div
        className="text-center pt-2 border-t border-gray-700 transition-all duration-700"
        style={{ opacity: revealed > cps.length ? 1 : 0, transform: revealed > cps.length ? 'scale(1)' : 'scale(0.85)' }}
      >
        <div className="text-[10px] text-gray-500 mb-1">
          &Sigma;(DSCR &times; Exposure) &divide; &Sigma;(Exposure)
        </div>
        <div className="text-xl font-black text-white tabular-nums">
          {wtdAvg.toFixed(2)}x
        </div>
      </div>
    </div>
  );
}

/* ── Rollup: LoB ─────────────────────────────────────────────────────────── */

function RollupLoB({ variant, stepIndex }: { variant: VariantKey; stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Trend Indicator (Not a Limit)
      </div>

      <div
        className="grid grid-cols-3 gap-2 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0 }}
      >
        <div className="rounded bg-blue-500/10 border border-blue-500/20 p-2 text-center">
          <div className="text-[9px] text-blue-300 font-bold">CRE</div>
          <div className="text-sm font-mono font-bold text-blue-400">1.29x</div>
          <div className="text-[8px] text-gray-600">NOI-based</div>
        </div>
        <div className="rounded bg-purple-500/10 border border-purple-500/20 p-2 text-center">
          <div className="text-[9px] text-purple-300 font-bold">Corporate</div>
          <div className="text-sm font-mono font-bold text-purple-400">2.64x</div>
          <div className="text-[8px] text-gray-600">EBITDA-based</div>
        </div>
        <div className="rounded bg-amber-500/10 border border-amber-500/20 p-2 text-center">
          <div className="text-[9px] text-amber-300 font-bold">Lev Fin</div>
          <div className="text-sm font-mono font-bold text-amber-400">1.85x</div>
          <div className="text-[8px] text-gray-600">Adj. EBITDA</div>
        </div>
      </div>

      <div
        className="text-[10px] text-gray-500 leading-relaxed transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        These DSCRs are <span className="text-gray-300 font-semibold">not directly comparable</span> across segments
        because the underlying numerator definitions differ.
      </div>

      <div
        className="rounded bg-blue-500/[0.04] border border-blue-500/20 p-2 text-[10px] text-gray-400 transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0 }}
      >
        <span className="text-blue-300 font-bold">Usage:</span> Trend monitoring only. Ask &ldquo;Is overall borrower quality
        improving or declining?&rdquo; &mdash; don&apos;t set hard limits at this level.
      </div>
    </div>
  );
}
