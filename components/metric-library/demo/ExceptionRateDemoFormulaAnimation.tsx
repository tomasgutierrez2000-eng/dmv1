'use client';

import React, { useEffect, useState } from 'react';
import {
  FACILITIES,
  COUNTERPARTIES,
  DESKS,
  PORTFOLIO_EXCEPTION_COUNT,
  PORTFOLIO_TOTAL_COUNT,
  PORTFOLIO_EXCEPTION_RATE,
  PORTFOLIO_MATERIAL_EXCEPTION_COUNT,
  PORTFOLIO_MATERIAL_EXCEPTION_RATE,
  fmtPct,
  fmtRatio,
} from './excpnRtDemoRollupData';

/* ────────────────────────────────────────────────────────────────────────────
 * ExceptionRateDemoFormulaAnimation — animated formula build-ups
 *
 * Each formulaKey corresponds to a different visualization:
 *   - exception-flag-build: show exception flag appearing
 *   - count-build: show facility count
 *   - divide-result: show the division result
 *   - foundational-rule: pooled division vs wrong approaches
 *   - rollup-facility: table of 5 facility exception statuses
 *   - rollup-counterparty: pool by borrower
 *   - rollup-desk: pool by desk
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

export default function ExceptionRateDemoFormulaAnimation({ formulaKey, variant, stepIndex }: Props) {
  const isMaterial = variant === 'material_exceptions';

  switch (formulaKey) {
    case 'exception-flag-build':
      return <ExceptionFlagBuild stepIndex={stepIndex} isMaterial={isMaterial} />;
    case 'count-build':
      return <CountBuild stepIndex={stepIndex} />;
    case 'divide-result':
      return <DivideResult stepIndex={stepIndex} isMaterial={isMaterial} />;
    case 'foundational-rule':
      return <FoundationalRuleDemo stepIndex={stepIndex} />;
    case 'rollup-facility':
      return <RollupFacility stepIndex={stepIndex} isMaterial={isMaterial} />;
    case 'rollup-counterparty':
      return <RollupCounterparty stepIndex={stepIndex} isMaterial={isMaterial} />;
    case 'rollup-desk':
      return <RollupDesk stepIndex={stepIndex} isMaterial={isMaterial} />;
    case 'rollup-portfolio':
      return <RollupPortfolio stepIndex={stepIndex} isMaterial={isMaterial} />;
    default:
      return null;
  }
}

/* ── Exception Flag build ────────────────────────────────────────────────── */

function ExceptionFlagBuild({ stepIndex, isMaterial }: { stepIndex: number; isMaterial: boolean }) {
  const revealed = useStaggerReveal(isMaterial ? 3 : 2, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Exception Flag
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-400">exception_flag</span>
        <span className="text-rose-400 font-mono font-bold">true</span>
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-400">exception_type</span>
        <span className="text-rose-300 font-mono">LTV_BREACH</span>
      </div>
      {isMaterial && (
        <div
          className="flex items-center justify-between text-xs font-bold transition-all duration-500"
          style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'translateX(0)' : 'translateX(16px)' }}
        >
          <span className="text-amber-400">exception_severity</span>
          <span className="text-white font-mono">MAJOR</span>
        </div>
      )}
      <div
        className="text-[9px] text-gray-600 mt-1 transition-all duration-500"
        style={{ opacity: revealed > (isMaterial ? 2 : 1) ? 1 : 0 }}
      >
        {isMaterial
          ? 'Only MAJOR and CRITICAL severity exceptions are counted'
          : 'Boolean flag set during credit approval — any active exception counts'}
      </div>
    </div>
  );
}

/* ── Count build ─────────────────────────────────────────────────────────── */

function CountBuild({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(2, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Total Facility Count
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-300">Active facilities in scope</span>
        <span className="text-gray-400 font-mono">COUNT(*)</span>
      </div>
      <div
        className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-gray-800 transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'scale(1)' : 'scale(0.95)' }}
      >
        <span className="text-rose-400">Total Count</span>
        <span className="text-white font-mono text-lg">5</span>
      </div>
    </div>
  );
}

/* ── Divide result ───────────────────────────────────────────────────────── */

function DivideResult({ stepIndex, isMaterial }: { stepIndex: number; isMaterial: boolean }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  const num = isMaterial ? 2 : 3;
  const rate = isMaterial ? '40.00%' : '60.00%';
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-4 space-y-2 text-center">
      <div
        className="text-sm font-mono text-gray-300 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0 }}
      >
        {num} exceptions
      </div>
      <div
        className="text-gray-600 text-lg transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        &divide; 5 facilities &times; 100
      </div>
      <div
        className="pt-2 border-t border-gray-800 transition-all duration-700"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'scale(1)' : 'scale(0.8)' }}
      >
        <span className="text-[10px] text-gray-500">Exception Rate =</span>
        <span className="text-2xl font-black text-rose-400 ml-2 tabular-nums">{rate}</span>
      </div>
    </div>
  );
}

/* ── Foundational Rule — Pooled Division vs wrong approaches ─────────────── */

function FoundationalRuleDemo({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  return (
    <div className="space-y-3">
      {/* The right way — Pooled Division */}
      <div
        className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest text-rose-400 mb-2">
          Count-Based Metrics: Pool the Counts
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between text-gray-400">
            <span>CRE Lending</span><span className="text-rose-400">2 / 3 = 66.67%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Corp Lending</span><span className="text-rose-400">1 / 2 = 50.00%</span>
          </div>
        </div>
        <div
          className="mt-2 pt-2 border-t border-rose-500/20 text-xs font-mono text-center transition-all duration-500"
          style={{ opacity: revealed > 1 ? 1 : 0 }}
        >
          Pool: (2+1) / (3+2) = <span className="text-rose-400 font-bold">3/5 = 60.00%</span>
          <span className="text-[9px] text-rose-400/70 ml-1">(exact!)</span>
        </div>
      </div>

      {/* Wrong way — simple average */}
      <div
        className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest text-red-400 mb-2">
          Wrong: Simple Average
        </div>
        <div className="text-[10px] text-gray-400 leading-relaxed">
          (66.67% + 50.00%) / 2 = <span className="text-red-300 font-semibold line-through">58.33%</span> &mdash;
          this ignores that CRE has 3 facilities and Corp has 2. Simple averaging produces incorrect results when groups
          have <span className="text-rose-300 font-semibold">different denominators</span>.
        </div>
      </div>
    </div>
  );
}

/* ── Rollup: Facility ────────────────────────────────────────────────────── */

function RollupFacility({ stepIndex, isMaterial }: { stepIndex: number; isMaterial: boolean }) {
  const revealed = useStaggerReveal(FACILITIES.length, 350, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Exception Status Per Facility
      </div>
      {FACILITIES.map((f, i) => {
        const isException = isMaterial
          ? f.hasException && (f.severity === 'MAJOR' || f.severity === 'CRITICAL')
          : f.hasException;
        return (
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
              {f.hasException && (
                <span className="text-[10px] text-gray-500">{f.exceptionType}{f.severity ? ` (${f.severity})` : ''}</span>
              )}
              <span className={`font-bold ${isException ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isException ? 'EXCEPTION' : 'COMPLIANT'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Rollup: Counterparty ────────────────────────────────────────────────── */

function RollupCounterparty({ stepIndex, isMaterial }: { stepIndex: number; isMaterial: boolean }) {
  const totalLines = COUNTERPARTIES.length * 2 + COUNTERPARTIES.length;
  const revealed = useStaggerReveal(totalLines, 300, stepIndex);
  let lineIdx = 0;

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Pool by Borrower
      </div>
      {COUNTERPARTIES.map((cp) => {
        const cpFacilities = FACILITIES.filter((f) => f.counterpartyName === cp.name);
        const startIdx = lineIdx;
        lineIdx += cpFacilities.length + 1;
        const excCount = isMaterial ? cp.materialExceptionCount : cp.exceptionCount;
        const rate = isMaterial ? cp.materialExceptionRate : cp.exceptionRate;
        return (
          <div key={cp.name} className="space-y-1">
            <div className="text-[10px] text-gray-500 font-bold">{cp.name}</div>
            {cpFacilities.map((f, i) => {
              const isException = isMaterial
                ? f.hasException && (f.severity === 'MAJOR' || f.severity === 'CRITICAL')
                : f.hasException;
              return (
                <div
                  key={f.name}
                  className="flex justify-between text-xs font-mono transition-all duration-500 pl-2"
                  style={{ opacity: revealed > startIdx + i ? 1 : 0, transform: revealed > startIdx + i ? 'translateX(0)' : 'translateX(12px)' }}
                >
                  <span className="text-gray-500">{f.name.split('(')[0].trim()}</span>
                  <span className={isException ? 'text-rose-400' : 'text-emerald-400/60'}>
                    {isException ? '1' : '0'}
                  </span>
                </div>
              );
            })}
            <div
              className="flex justify-between text-xs font-mono font-bold pt-1 border-t border-gray-800 transition-all duration-500 pl-2"
              style={{ opacity: revealed > startIdx + cpFacilities.length ? 1 : 0, transform: revealed > startIdx + cpFacilities.length ? 'scale(1)' : 'scale(0.95)' }}
            >
              <span className="text-gray-300">{fmtRatio(excCount, cp.totalCount)}</span>
              <span className="text-rose-300">{fmtPct(rate)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Rollup: Desk ────────────────────────────────────────────────────────── */

function RollupDesk({ stepIndex, isMaterial }: { stepIndex: number; isMaterial: boolean }) {
  const revealed = useStaggerReveal(DESKS.length, 600, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Pool by Trading Desk
      </div>
      {DESKS.map((d, i) => {
        const excCount = isMaterial ? d.materialExceptionCount : d.exceptionCount;
        const rate = isMaterial ? d.materialExceptionRate : d.exceptionRate;
        return (
          <div
            key={d.name}
            className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-2.5 transition-all duration-500"
            style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateY(0)' : 'translateY(8px)' }}
          >
            <div className="text-[10px] font-bold text-rose-300 mb-1">{d.name}</div>
            <div className="text-xs font-mono text-gray-300">
              {fmtRatio(excCount, d.totalCount)} &rarr;{' '}
              <span className="text-rose-400 font-bold">{fmtPct(rate)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Rollup: Portfolio ───────────────────────────────────────────────────── */

function RollupPortfolio({ stepIndex, isMaterial }: { stepIndex: number; isMaterial: boolean }) {
  const revealed = useStaggerReveal(DESKS.length + 1, 500, stepIndex);
  const excCount = isMaterial ? PORTFOLIO_MATERIAL_EXCEPTION_COUNT : PORTFOLIO_EXCEPTION_COUNT;
  const rate = isMaterial ? PORTFOLIO_MATERIAL_EXCEPTION_RATE : PORTFOLIO_EXCEPTION_RATE;
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Portfolio Total: Pool All Counts
      </div>
      {DESKS.map((d, i) => {
        const dExcCount = isMaterial ? d.materialExceptionCount : d.exceptionCount;
        const dRate = isMaterial ? d.materialExceptionRate : d.exceptionRate;
        return (
          <div
            key={d.name}
            className="flex items-center justify-between text-xs font-mono transition-all duration-500"
            style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateX(0)' : 'translateX(12px)' }}
          >
            <span className="text-gray-400">{d.name}</span>
            <span className="text-rose-400">{fmtRatio(dExcCount, d.totalCount)} = {fmtPct(dRate)}</span>
          </div>
        );
      })}
      <div
        className="text-center pt-2 border-t border-gray-700 transition-all duration-700"
        style={{ opacity: revealed > DESKS.length ? 1 : 0, transform: revealed > DESKS.length ? 'scale(1)' : 'scale(0.85)' }}
      >
        <div className="text-[10px] text-gray-500 mb-1">
          Exception Rate = {fmtRatio(excCount, PORTFOLIO_TOTAL_COUNT)}
        </div>
        <div className="text-xl font-black text-rose-400 tabular-nums">
          {fmtPct(rate)}
        </div>
      </div>
    </div>
  );
}
