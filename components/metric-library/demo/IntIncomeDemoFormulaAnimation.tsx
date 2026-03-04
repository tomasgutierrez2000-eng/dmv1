'use client';

import React, { useEffect, useState } from 'react';
import {
  FACILITIES,
  COUNTERPARTIES,
  DESKS,
  PORTFOLIO_TOTAL,
  fmt,
  fmtM,
  fmtRate,
} from './intIncomeDemoRollupData';

/* ────────────────────────────────────────────────────────────────────────────
 * IntIncomeDemoFormulaAnimation — animated formula build-ups
 *
 * Each formulaKey corresponds to a different visualization:
 *   - drawn-build: show drawn amount appearing
 *   - rate-build: show rate components appearing
 *   - multiply-result: show the multiplication result
 *   - foundational-rule: additive vs wrong approaches
 *   - rollup-facility: table of 5 facility interest incomes
 *   - rollup-counterparty: sum by borrower
 *   - rollup-desk: sum by desk
 *   - rollup-portfolio: grand total
 * ──────────────────────────────────────────────────────────────────────────── */

interface Props {
  formulaKey: string;
  variant: string;
  /** Increments when step changes to reset animations */
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

export default function IntIncomeDemoFormulaAnimation({ formulaKey, variant, stepIndex }: Props) {
  switch (formulaKey) {
    case 'drawn-build':
      return <DrawnBuild stepIndex={stepIndex} />;
    case 'rate-build':
      return <RateBuild stepIndex={stepIndex} />;
    case 'multiply-result':
      return <MultiplyResult stepIndex={stepIndex} />;
    case 'foundational-rule':
      return <FoundationalRuleDemo stepIndex={stepIndex} />;
    case 'rollup-facility':
      return <RollupFacility stepIndex={stepIndex} />;
    case 'rollup-counterparty':
      return <RollupCounterparty stepIndex={stepIndex} />;
    case 'rollup-desk':
      return <RollupDesk stepIndex={stepIndex} />;
    case 'rollup-portfolio':
      return <RollupPortfolio stepIndex={stepIndex} />;
    default:
      return null;
  }
}

/* ── Drawn Amount build ──────────────────────────────────────────────────── */

function DrawnBuild({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(2, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Drawn Amount
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-400">Committed Facility</span>
        <span className="text-gray-500 font-mono">$150,000,000</span>
      </div>
      <div
        className="flex items-center justify-between text-xs font-bold transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-emerald-400">Drawn (Funded) Balance</span>
        <span className="text-white font-mono">$120,000,000</span>
      </div>
      <div
        className="text-[9px] text-gray-600 mt-1 transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        80% utilization — borrower has drawn $120M of their $150M credit line
      </div>
    </div>
  );
}

/* ── Rate build ──────────────────────────────────────────────────────────── */

function RateBuild({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 400, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        All-In Rate Components
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400 font-mono font-bold flex-shrink-0">+</span>
          <span className="text-gray-300">Base Rate (SOFR)</span>
        </div>
        <span className="text-gray-400 font-mono">4.50%</span>
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-emerald-400 font-mono font-bold flex-shrink-0">+</span>
          <span className="text-gray-300">Spread (175 bps)</span>
        </div>
        <span className="text-gray-400 font-mono">1.75%</span>
      </div>
      <div
        className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-gray-800 transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'scale(1)' : 'scale(0.95)' }}
      >
        <span className="text-amber-400">All-In Rate</span>
        <span className="text-white font-mono">6.25%</span>
      </div>
    </div>
  );
}

/* ── Multiply result ─────────────────────────────────────────────────────── */

function MultiplyResult({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-4 space-y-2 text-center">
      <div
        className="text-sm font-mono text-gray-300 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0 }}
      >
        $120,000,000
      </div>
      <div
        className="text-gray-600 text-lg transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        &times; 6.25%
      </div>
      <div
        className="pt-2 border-t border-gray-800 transition-all duration-700"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'scale(1)' : 'scale(0.8)' }}
      >
        <span className="text-[10px] text-gray-500">Interest Income =</span>
        <span className="text-2xl font-black text-emerald-400 ml-2 tabular-nums">$7,500,000</span>
      </div>
    </div>
  );
}

/* ── Foundational Rule — SUM vs wrong approaches ─────────────────────────── */

function FoundationalRuleDemo({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  return (
    <div className="space-y-3">
      {/* The right way — SUM */}
      <div
        className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
          Currency Metrics: Just Add
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between text-gray-400">
            <span>Facility A</span><span className="text-emerald-400">$7,500,000</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Facility B</span><span className="text-emerald-400">$4,887,500</span>
          </div>
        </div>
        <div
          className="mt-2 pt-2 border-t border-emerald-500/20 text-xs font-mono text-center transition-all duration-500"
          style={{ opacity: revealed > 1 ? 1 : 0 }}
        >
          Total = <span className="text-emerald-400 font-bold">$12,387,500</span>
          <span className="text-[9px] text-emerald-400/70 ml-1">(exact!)</span>
        </div>
      </div>

      {/* Comparison with ratio metrics */}
      <div
        className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest text-amber-400 mb-2">
          Contrast: Ratio Metrics Need Weighting
        </div>
        <div className="text-[10px] text-gray-400 leading-relaxed">
          DSCR, LTV, and spread are <span className="text-amber-300 font-semibold">ratios</span> — you can&apos;t
          simply average them. They need exposure-weighted averages or pooled calculations.
          Interest Income is a <span className="text-emerald-300 font-semibold">dollar amount</span> — pure addition
          is always correct.
        </div>
      </div>
    </div>
  );
}

/* ── Rollup: Facility ────────────────────────────────────────────────────── */

function RollupFacility({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(FACILITIES.length, 350, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Direct Calculation Per Facility
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
            <span className="text-emerald-400 text-[10px]">{fmtM(f.drawnAmount)}</span>
            <span className="text-gray-600">&times;</span>
            <span className="text-amber-400 text-[10px]">{fmtRate(f.allInRatePct)}</span>
            <span className="text-gray-600">=</span>
            <span className="text-white font-bold">{fmt(f.interestIncome)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Rollup: Counterparty ────────────────────────────────────────────────── */

function RollupCounterparty({ stepIndex }: { stepIndex: number }) {
  const totalLines = COUNTERPARTIES.length * 2 + COUNTERPARTIES.length; // facilities + totals
  const revealed = useStaggerReveal(totalLines, 300, stepIndex);
  let lineIdx = 0;

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        SUM by Borrower
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
                <span className="text-emerald-400">{fmt(f.interestIncome)}</span>
              </div>
            ))}
            <div
              className="flex justify-between text-xs font-mono font-bold pt-1 border-t border-gray-800 transition-all duration-500 pl-2"
              style={{ opacity: revealed > startIdx + cpFacilities.length ? 1 : 0, transform: revealed > startIdx + cpFacilities.length ? 'scale(1)' : 'scale(0.95)' }}
            >
              <span className="text-gray-300">Total</span>
              <span className="text-emerald-300">{fmt(cp.interestIncome)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Rollup: Desk ────────────────────────────────────────────────────────── */

function RollupDesk({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(DESKS.length, 600, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        SUM by Trading Desk
      </div>
      {DESKS.map((d, i) => (
        <div
          key={d.name}
          className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2.5 transition-all duration-500"
          style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateY(0)' : 'translateY(8px)' }}
        >
          <div className="text-[10px] font-bold text-emerald-300 mb-1">{d.name}</div>
          <div className="text-xs font-mono text-gray-300">
            {d.facilityCount} facilities &rarr;{' '}
            <span className="text-emerald-400 font-bold">{fmt(d.interestIncome)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Rollup: Portfolio ───────────────────────────────────────────────────── */

function RollupPortfolio({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(DESKS.length + 1, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Portfolio Total: SUM of All Desks
      </div>
      {DESKS.map((d, i) => (
        <div
          key={d.name}
          className="flex items-center justify-between text-xs font-mono transition-all duration-500"
          style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateX(0)' : 'translateX(12px)' }}
        >
          <span className="text-gray-400">{d.name}</span>
          <span className="text-emerald-400">{fmt(d.interestIncome)}</span>
        </div>
      ))}
      <div
        className="text-center pt-2 border-t border-gray-700 transition-all duration-700"
        style={{ opacity: revealed > DESKS.length ? 1 : 0, transform: revealed > DESKS.length ? 'scale(1)' : 'scale(0.85)' }}
      >
        <div className="text-[10px] text-gray-500 mb-1">
          &Sigma; Interest Income
        </div>
        <div className="text-xl font-black text-emerald-400 tabular-nums">
          {fmt(PORTFOLIO_TOTAL)}
        </div>
      </div>
    </div>
  );
}
