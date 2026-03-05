'use client';

import React, { useEffect, useState } from 'react';
import {
  FACILITIES,
  COUNTERPARTIES,
  DESKS,
  PORTFOLIO_TOTAL,
  fmt,
  fmtM,
  fmtPct,
  getParticipationMv,
} from './collMvDemoRollupData';

/* ────────────────────────────────────────────────────────────────────────────
 * CollMvDemoFormulaAnimation — animated formula build-ups
 *
 * Each formulaKey corresponds to a different visualization:
 *   - valuation-build: show collateral assets summing up
 *   - participation-build: show participation % split
 *   - sum-result: show the SUM result
 *   - foundational-rule: SUM + participation concept
 *   - rollup-facility: table of 5 facility collateral MVs
 *   - rollup-counterparty: participation-weighted by borrower
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

export default function CollMvDemoFormulaAnimation({ formulaKey, variant, stepIndex }: Props) {
  switch (formulaKey) {
    case 'valuation-build':
      return <ValuationBuild stepIndex={stepIndex} />;
    case 'participation-build':
      return <ParticipationBuild stepIndex={stepIndex} />;
    case 'sum-result':
      return <SumResult stepIndex={stepIndex} />;
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

/* ── Valuation build ───────────────────────────────────────────────────── */

function ValuationBuild({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(4, 400, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Collateral Assets (Facility A)
      </div>
      {['Property A-1: CRE Multifamily Complex', 'Property A-2: Adjacent Parking Structure', 'Property A-3: Retail Ground Floor'].map((label, i) => (
        <div
          key={label}
          className="flex items-center justify-between text-xs transition-all duration-500"
          style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateX(0)' : 'translateX(16px)' }}
        >
          <span className="text-gray-400">{label}</span>
          <span className="text-teal-400 font-mono font-bold">{['$55,000,000', '$40,000,000', '$25,000,000'][i]}</span>
        </div>
      ))}
      <div
        className="flex items-center justify-between text-xs font-bold pt-2 border-t border-gray-800 transition-all duration-500"
        style={{ opacity: revealed > 3 ? 1 : 0, transform: revealed > 3 ? 'scale(1)' : 'scale(0.95)' }}
      >
        <span className="text-teal-300">Facility A Total</span>
        <span className="text-white font-mono">$120,000,000</span>
      </div>
      <div
        className="text-[9px] text-gray-600 mt-1 transition-all duration-500"
        style={{ opacity: revealed > 3 ? 1 : 0 }}
      >
        3 collateral assets backing one CRE Multifamily facility
      </div>
    </div>
  );
}

/* ── Participation build ───────────────────────────────────────────────── */

function ParticipationBuild({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(4, 400, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Participation Split — Facility E ($50M)
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-400">Total Collateral MV</span>
        <span className="text-white font-mono font-bold">$50,000,000</span>
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-teal-400 font-mono font-bold flex-shrink-0">&times;</span>
          <span className="text-gray-300">Apex Properties</span>
        </div>
        <span className="text-teal-400 font-mono">60% &rarr; $30,000,000</span>
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-teal-400 font-mono font-bold flex-shrink-0">&times;</span>
          <span className="text-gray-300">TechForge Mfg</span>
        </div>
        <span className="text-teal-400 font-mono">40% &rarr; $20,000,000</span>
      </div>
      <div
        className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-gray-800 transition-all duration-500"
        style={{ opacity: revealed > 3 ? 1 : 0, transform: revealed > 3 ? 'scale(1)' : 'scale(0.95)' }}
      >
        <span className="text-amber-400">Check: 60% + 40%</span>
        <span className="text-white font-mono">= 100% ($50M total)</span>
      </div>
    </div>
  );
}

/* ── SUM result ────────────────────────────────────────────────────────── */

function SumResult({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-4 space-y-2 text-center">
      <div
        className="text-xs text-gray-500 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0 }}
      >
        3 collateral assets
      </div>
      <div
        className="text-sm font-mono text-gray-300 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0 }}
      >
        $55M + $40M + $25M
      </div>
      <div
        className="text-gray-600 text-lg transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        = SUM
      </div>
      <div
        className="pt-2 border-t border-gray-800 transition-all duration-700"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'scale(1)' : 'scale(0.8)' }}
      >
        <span className="text-[10px] text-gray-500">Collateral MV =</span>
        <span className="text-2xl font-black text-teal-400 ml-2 tabular-nums">$120,000,000</span>
      </div>
    </div>
  );
}

/* ── Foundational Rule — SUM + participation ──────────────────────────── */

function FoundationalRuleDemo({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  return (
    <div className="space-y-3">
      {/* The right way — SUM */}
      <div
        className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-3 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mb-2">
          Desk / Portfolio / Segment: Just Add
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between text-gray-400">
            <span>CRE Lending</span><span className="text-teal-400">$235,000,000</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>C&I Middle Market</span><span className="text-teal-400">$65,000,000</span>
          </div>
        </div>
        <div
          className="mt-2 pt-2 border-t border-teal-500/20 text-xs font-mono text-center transition-all duration-500"
          style={{ opacity: revealed > 1 ? 1 : 0 }}
        >
          Portfolio = <span className="text-teal-400 font-bold">$300,000,000</span>
          <span className="text-[9px] text-teal-400/70 ml-1">(exact!)</span>
        </div>
      </div>

      {/* Counterparty — participation weighted */}
      <div
        className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest text-amber-400 mb-2">
          Counterparty Level: Participation Weighting
        </div>
        <div className="text-[10px] text-gray-400 leading-relaxed">
          At the counterparty level, each facility&apos;s collateral MV is multiplied by{' '}
          <span className="text-amber-300 font-semibold">participation_pct</span> before summing.
          This prevents double-counting when a facility has multiple participating counterparties.
          The sum of all counterparty values still equals the portfolio total.
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
        SUM(current_valuation_usd) Per Facility
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
            <span className="text-gray-600 text-[10px]">{f.collateralCount} assets</span>
            <span className="text-gray-600">=</span>
            <span className="text-white font-bold">{fmtM(f.collateralMv)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Rollup: Counterparty (participation-weighted) ─────────────────────── */

function RollupCounterparty({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(12, 250, stepIndex);
  let lineIdx = 0;

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Participation-Weighted by Borrower
      </div>
      {COUNTERPARTIES.map((cp) => {
        const cpFacilities = FACILITIES.filter((f) =>
          f.counterpartyName === cp.name || f.participations?.some((p) => p.counterpartyName === cp.name)
        );
        const startIdx = lineIdx;
        lineIdx += cpFacilities.length + 1;
        return (
          <div key={cp.name} className="space-y-1">
            <div className="text-[10px] text-gray-500 font-bold">{cp.name}</div>
            {cpFacilities.map((f, i) => {
              const mv = getParticipationMv(f, cp.name);
              const pct = f.participations?.find((p) => p.counterpartyName === cp.name)?.pct ?? (f.counterpartyName === cp.name ? 100 : 0);
              return (
                <div
                  key={f.name}
                  className="flex justify-between text-xs font-mono transition-all duration-500 pl-2"
                  style={{ opacity: revealed > startIdx + i ? 1 : 0, transform: revealed > startIdx + i ? 'translateX(0)' : 'translateX(12px)' }}
                >
                  <span className="text-gray-500">{f.name.split('(')[0].trim()}</span>
                  <span className="text-teal-400">
                    {pct < 100 && <span className="text-amber-400">{fmtPct(pct)} &times; </span>}
                    {fmtM(mv)}
                  </span>
                </div>
              );
            })}
            <div
              className="flex justify-between text-xs font-mono font-bold pt-1 border-t border-gray-800 transition-all duration-500 pl-2"
              style={{ opacity: revealed > startIdx + cpFacilities.length ? 1 : 0, transform: revealed > startIdx + cpFacilities.length ? 'scale(1)' : 'scale(0.95)' }}
            >
              <span className="text-gray-300">Total</span>
              <span className="text-teal-300">{fmt(cp.collateralMv)}</span>
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
          className="rounded-lg bg-teal-500/5 border border-teal-500/20 p-2.5 transition-all duration-500"
          style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateY(0)' : 'translateY(8px)' }}
        >
          <div className="text-[10px] font-bold text-teal-300 mb-1">{d.name}</div>
          <div className="text-xs font-mono text-gray-300">
            {d.facilityCount} facilities &rarr;{' '}
            <span className="text-teal-400 font-bold">{fmt(d.collateralMv)}</span>
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
          <span className="text-teal-400">{fmt(d.collateralMv)}</span>
        </div>
      ))}
      <div
        className="text-center pt-2 border-t border-gray-700 transition-all duration-700"
        style={{ opacity: revealed > DESKS.length ? 1 : 0, transform: revealed > DESKS.length ? 'scale(1)' : 'scale(0.85)' }}
      >
        <div className="text-[10px] text-gray-500 mb-1">
          &Sigma; Collateral MV
        </div>
        <div className="text-xl font-black text-teal-400 tabular-nums">
          {fmt(PORTFOLIO_TOTAL)}
        </div>
      </div>
    </div>
  );
}
