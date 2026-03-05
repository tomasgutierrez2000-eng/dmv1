'use client';

import React, { useEffect, useState } from 'react';
import {
  FACILITIES,
  COUNTERPARTIES,
  DESKS,
  PORTFOLIO_MIGRATION_SCORE,
  RATING_SCALE,
  fmtExp,
  fmtScore,
  fmtNotch,
  dirSymbol,
  dirColor,
} from './rrMigDemoRollupData';

/* ────────────────────────────────────────────────────────────────────────────
 * RRMigDemoFormulaAnimation — animated formula build-ups
 *
 * Each formulaKey corresponds to a different visualization:
 *   - current-rating-build: show current rating with scale context
 *   - prior-rating-build: show prior rating and notch change calculation
 *   - notch-result: show the notch change result with exposure weight
 *   - foundational-rule: weighted average vs wrong approaches
 *   - rollup-facility: table of 5 facility migration details
 *   - rollup-counterparty: weighted average by borrower
 *   - rollup-desk: weighted average by desk
 *   - rollup-portfolio: grand weighted average
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

export default function RRMigDemoFormulaAnimation({ formulaKey, variant, stepIndex }: Props) {
  switch (formulaKey) {
    case 'current-rating-build':
      return <CurrentRatingBuild stepIndex={stepIndex} />;
    case 'prior-rating-build':
      return <PriorRatingBuild stepIndex={stepIndex} />;
    case 'notch-result':
      return <NotchResult stepIndex={stepIndex} />;
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

/* ── Current Rating build ─────────────────────────────────────────────────── */

function CurrentRatingBuild({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(RATING_SCALE.length + 1, 300, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Internal Rating Scale
      </div>
      {RATING_SCALE.map((r, i) => (
        <div
          key={r.grade}
          className="flex items-center justify-between text-xs transition-all duration-500"
          style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateX(0)' : 'translateX(16px)' }}
        >
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${r.grade === 3 ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40' : 'bg-white/5 text-gray-400'}`}>
              {r.grade}
            </span>
            <span className={r.grade === 3 ? 'text-rose-300 font-bold' : 'text-gray-400'}>{r.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-600 font-mono text-[10px]">{r.pdRange}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${r.regulatory === 'Pass' ? 'bg-emerald-500/10 text-emerald-400' : r.regulatory === 'Special Mention' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {r.regulatory}
            </span>
          </div>
        </div>
      ))}
      <div
        className="text-[9px] text-gray-600 mt-1 pt-2 border-t border-gray-800 transition-all duration-500"
        style={{ opacity: revealed > RATING_SCALE.length ? 1 : 0 }}
      >
        Current Rating = <span className="text-rose-300 font-bold">3 (Moderate Risk)</span> &mdash; PD range 0.50 &ndash; 2.00%
      </div>
    </div>
  );
}

/* ── Prior Rating build ───────────────────────────────────────────────────── */

function PriorRatingBuild({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(4, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Rating Change Calculation
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-400">Prior Rating</span>
        <span className="text-emerald-400 font-mono font-bold">2 (Low Risk)</span>
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-400">Current Rating</span>
        <span className="text-rose-400 font-mono font-bold">3 (Moderate Risk)</span>
      </div>
      <div
        className="flex items-center justify-between text-xs font-bold pt-1.5 border-t border-gray-800 transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'scale(1)' : 'scale(0.95)' }}
      >
        <span className="text-rose-400">Notch Change (Current &minus; Prior)</span>
        <span className="text-white font-mono">3 &minus; 2 = +1</span>
      </div>
      <div
        className="text-[9px] text-rose-400/80 mt-1 transition-all duration-500"
        style={{ opacity: revealed > 3 ? 1 : 0 }}
      >
        &darr; One-notch downgrade &mdash; borrower moved from &ldquo;Low Risk&rdquo; to &ldquo;Moderate Risk&rdquo;
      </div>
    </div>
  );
}

/* ── Notch result ──────────────────────────────────────────────────────────── */

function NotchResult({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(4, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-4 space-y-2 text-center">
      <div
        className="text-sm font-mono text-gray-300 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0 }}
      >
        Notch Change = +1
      </div>
      <div
        className="text-gray-600 text-lg transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        &times; $20,000,000 exposure
      </div>
      <div
        className="pt-2 border-t border-gray-800 transition-all duration-700"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'scale(1)' : 'scale(0.8)' }}
      >
        <span className="text-[10px] text-gray-500">Weighted Contribution =</span>
        <span className="text-2xl font-black text-rose-400 ml-2 tabular-nums">+$20M</span>
      </div>
      <div
        className="text-[10px] text-gray-500 transition-all duration-500"
        style={{ opacity: revealed > 3 ? 1 : 0 }}
      >
        This downgrade adds +$20M to the numerator of the portfolio migration score
      </div>
    </div>
  );
}

/* ── Foundational Rule — Weighted Average vs wrong approaches ─────────────── */

function FoundationalRuleDemo({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  return (
    <div className="space-y-3">
      {/* The right way — weighted average */}
      <div
        className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
          Correct: Exposure-Weighted Average
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between text-gray-400">
            <span>CRE Desk (+0.44 &times; $45M)</span><span className="text-rose-400">+$20.0M</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Corp Desk (&minus;0.64 &times; $55M)</span><span className="text-emerald-400">&minus;$35.0M</span>
          </div>
        </div>
        <div
          className="mt-2 pt-2 border-t border-emerald-500/20 text-xs font-mono text-center transition-all duration-500"
          style={{ opacity: revealed > 1 ? 1 : 0 }}
        >
          Score = &minus;$15M / $100M = <span className="text-emerald-400 font-bold">&minus;0.15</span>
          <span className="text-[9px] text-emerald-400/70 ml-1">(correct!)</span>
        </div>
      </div>

      {/* Wrong way — simple average */}
      <div
        className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest text-rose-400 mb-2">
          Wrong: Simple Average
        </div>
        <div className="text-[10px] text-gray-400 leading-relaxed">
          avg(+0.44, &minus;0.64) = <span className="text-rose-300 font-semibold line-through">&minus;0.10</span>{' '}
          &mdash; ignores that Corp Lending has 22% more exposure. Simple averaging
          treats a $10M downgrade the same as a $30M upgrade.{' '}
          <span className="text-rose-300 font-semibold">CCAR and Basel III require exposure weighting.</span>
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
        Per-Facility Rating Changes
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
            <span className="text-gray-500 text-[10px]">{f.priorRating}&rarr;{f.currentRating}</span>
            <span className={`text-[10px] font-bold ${dirColor(f.direction)}`}>
              {dirSymbol(f.direction)} {fmtNotch(f.notchChange)}
            </span>
            <span className="text-gray-600">&times;</span>
            <span className="text-amber-400 text-[10px]">{fmtExp(f.grossExposure)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Rollup: Counterparty ────────────────────────────────────────────────── */

function RollupCounterparty({ stepIndex }: { stepIndex: number }) {
  const totalLines = COUNTERPARTIES.length * 3 + COUNTERPARTIES.length;
  const revealed = useStaggerReveal(totalLines, 250, stepIndex);
  let lineIdx = 0;

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Exposure-Weighted Average by Borrower
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
                <span className={dirColor(f.direction)}>{fmtNotch(f.notchChange)} &times; {fmtExp(f.grossExposure)}</span>
              </div>
            ))}
            <div
              className="flex justify-between text-xs font-mono font-bold pt-1 border-t border-gray-800 transition-all duration-500 pl-2"
              style={{ opacity: revealed > startIdx + cpFacilities.length ? 1 : 0, transform: revealed > startIdx + cpFacilities.length ? 'scale(1)' : 'scale(0.95)' }}
            >
              <span className="text-gray-300">Wtd Avg</span>
              <span className={cp.migrationScore >= 0 ? 'text-rose-300' : 'text-emerald-300'}>{fmtScore(cp.migrationScore)}</span>
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
        Exposure-Weighted Average by Desk
      </div>
      {DESKS.map((d, i) => {
        const scoreColor = d.migrationScore >= 0 ? 'rose' : 'emerald';
        return (
          <div
            key={d.name}
            className={`rounded-lg bg-${scoreColor}-500/5 border border-${scoreColor}-500/20 p-2.5 transition-all duration-500`}
            style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateY(0)' : 'translateY(8px)' }}
          >
            <div className={`text-[10px] font-bold text-${scoreColor}-300 mb-1`}>{d.name}</div>
            <div className="text-xs font-mono text-gray-300">
              {d.facilityCount} facilities, {fmtExp(d.totalExposure)} &rarr;{' '}
              <span className={`text-${scoreColor}-400 font-bold`}>{fmtScore(d.migrationScore)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Rollup: Portfolio ───────────────────────────────────────────────────── */

function RollupPortfolio({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(DESKS.length + 1, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Portfolio Total: Exposure-Weighted Average
      </div>
      {DESKS.map((d, i) => (
        <div
          key={d.name}
          className="flex items-center justify-between text-xs font-mono transition-all duration-500"
          style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateX(0)' : 'translateX(12px)' }}
        >
          <span className="text-gray-400">{d.name} ({fmtExp(d.totalExposure)})</span>
          <span className={d.migrationScore >= 0 ? 'text-rose-400' : 'text-emerald-400'}>{fmtScore(d.migrationScore)}</span>
        </div>
      ))}
      <div
        className="text-center pt-2 border-t border-gray-700 transition-all duration-700"
        style={{ opacity: revealed > DESKS.length ? 1 : 0, transform: revealed > DESKS.length ? 'scale(1)' : 'scale(0.85)' }}
      >
        <div className="text-[10px] text-gray-500 mb-1">
          &Sigma; (Notch &times; Exposure) / &Sigma; Exposure
        </div>
        <div className="text-xl font-black text-emerald-400 tabular-nums">
          {fmtScore(PORTFOLIO_MIGRATION_SCORE)}
        </div>
        <div className="text-[9px] text-emerald-400/70 mt-0.5">Net portfolio improvement</div>
      </div>
    </div>
  );
}
