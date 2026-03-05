'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  COUNTERPARTIES,
  DESK_ROWS,
  NOTCH_TO_RATING,
  ratingColor,
  ratingBg,
} from './extRatingDemoRollupData';

/* ────────────────────────────────────────────────────────────────────────────
 * ExtRatingDemoFormulaAnimation
 *
 * Animated visualizations of the notch averaging process.
 * Each formulaKey triggers a different animation:
 *   - notch-scale: rating-to-notch mapping table
 *   - counterparty-lookup: direct rating retrieval
 *   - notch-average: arithmetic averaging with rounding
 *   - desk-rollup: side-by-side CRE vs Corp desk
 * ──────────────────────────────────────────────────────────────────────────── */

interface Props {
  formulaKey: string;
  stepIndex: number;
}

/* ── Stagger animation hook ─────────────────────────────────────────────── */

function useStaggerReveal(totalItems: number, delayMs: number, key: string | number) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < totalItems; i++) {
      timers.push(
        setTimeout(() => setVisibleCount(i + 1), delayMs * (i + 1))
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [totalItems, delayMs, key]);

  return visibleCount;
}

/* ── Notch Scale Animation ──────────────────────────────────────────────── */

function NotchScaleAnimation() {
  const highlightNotches = [7, 8]; // A- and BBB+ from demo data
  const scaleEntries = [
    { rating: 'AAA', notch: 1 },
    { rating: 'AA+', notch: 2 },
    { rating: 'AA',  notch: 3 },
    { rating: 'AA-', notch: 4 },
    { rating: 'A+',  notch: 5 },
    { rating: 'A',   notch: 6 },
    { rating: 'A-',  notch: 7 },
    { rating: 'BBB+',notch: 8 },
    { rating: 'BBB', notch: 9 },
    { rating: 'BBB-',notch: 10 },
    { rating: 'BB+', notch: 11 },
    { rating: 'BB',  notch: 12 },
  ];

  const visible = useStaggerReveal(scaleEntries.length, 80, 'notch-scale');

  return (
    <div className="rounded-xl border border-gray-800 bg-black/40 p-4">
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2">
        Rating → Notch Mapping (S&P Scale)
      </div>
      <div className="space-y-1">
        {scaleEntries.map((entry, i) => {
          const isHighlighted = highlightNotches.includes(entry.notch);
          return (
            <div
              key={entry.notch}
              className={`flex items-center justify-between px-3 py-1 rounded-lg transition-all duration-300 ${
                i < visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              } ${isHighlighted ? 'bg-blue-500/10 border border-blue-500/30' : ''}`}
            >
              <span className={`text-xs font-mono font-bold ${ratingColor(entry.notch)}`}>
                {entry.rating}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-[10px]">→</span>
                <span className={`text-xs font-mono ${isHighlighted ? 'text-blue-300 font-bold' : 'text-gray-500'}`}>
                  notch {entry.notch}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {visible >= scaleEntries.length && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20 text-[10px] text-blue-300">
          Demo counterparties: A- (notch 7) and BBB+ (notch 8)
        </div>
      )}
    </div>
  );
}

/* ── Counterparty Lookup Animation ──────────────────────────────────────── */

function CounterpartyLookupAnimation() {
  const visible = useStaggerReveal(COUNTERPARTIES.length, 400, 'cp-lookup');

  return (
    <div className="rounded-xl border border-gray-800 bg-black/40 p-4">
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2">
        Counterparty Rating Lookup
      </div>
      <div className="space-y-2">
        {COUNTERPARTIES.map((cp, i) => (
          <div
            key={cp.counterpartyId}
            className={`rounded-lg border border-gray-800 bg-white/[0.02] px-4 py-3 transition-all duration-500 ${
              i < visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-300 font-medium">{cp.counterpartyName}</span>
              <span className="text-[9px] text-gray-600 font-mono">{cp.counterpartyId}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-2 py-1 rounded-md ${ratingBg(cp.notch)} ${ratingColor(cp.notch)} text-sm font-bold font-mono`}>
                {cp.rating}
              </div>
              <span className="text-[10px] text-gray-500">notch {cp.notch}</span>
              <span className="text-[10px] text-gray-600">({cp.agency})</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                cp.isInvestmentGrade ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
              }`}>
                {cp.isInvestmentGrade ? 'IG' : 'Sub-IG'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Notch Average Animation ────────────────────────────────────────────── */

function NotchAverageAnimation() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),   // Show notches
      setTimeout(() => setPhase(2), 1000),  // Show sum
      setTimeout(() => setPhase(3), 1600),  // Show average
      setTimeout(() => setPhase(4), 2200),  // Show round
      setTimeout(() => setPhase(5), 2800),  // Show reverse lookup
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="rounded-xl border border-gray-800 bg-black/40 p-4 space-y-3">
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">
        Notch Averaging — CRE Lending Desk
      </div>

      {/* Step 1: Notch values */}
      <div className={`transition-opacity duration-300 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-center">
            <div className="text-[9px] text-gray-500">CP-01</div>
            <div className="text-sm font-mono font-bold text-yellow-400">8</div>
            <div className="text-[9px] text-gray-500">BBB+</div>
          </div>
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-center">
            <div className="text-[9px] text-gray-500">CP-02</div>
            <div className="text-sm font-mono font-bold text-green-400">7</div>
            <div className="text-[9px] text-gray-500">A-</div>
          </div>
        </div>
      </div>

      {/* Step 2: Sum */}
      <div className={`transition-opacity duration-300 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-xs font-mono text-gray-400">
          Sum of notches: <span className="text-gray-200">8 + 7 = 15</span>
        </div>
      </div>

      {/* Step 3: Average */}
      <div className={`transition-opacity duration-300 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-xs font-mono text-gray-400">
          Average: <span className="text-gray-200">15 / 2 = <span className="text-emerald-400 font-bold">7.5</span></span>
        </div>
      </div>

      {/* Step 4: Round */}
      <div className={`transition-opacity duration-300 ${phase >= 4 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="text-xs font-mono text-gray-400">
          Round: <span className="text-gray-200">ROUND(7.5) = <span className="text-emerald-400 font-bold">8</span></span>
        </div>
      </div>

      {/* Step 5: Reverse lookup */}
      <div className={`transition-opacity duration-300 ${phase >= 5 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">Reverse lookup: notch 8 →</span>
          <span className="px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400 text-sm font-bold font-mono">
            BBB+
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Desk Rollup Animation ──────────────────────────────────────────────── */

function DeskRollupAnimation() {
  const visible = useStaggerReveal(DESK_ROWS.length, 500, 'desk-rollup');

  return (
    <div className="rounded-xl border border-gray-800 bg-black/40 p-4">
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2">
        Desk-Level Rating Averages
      </div>
      <div className="space-y-2">
        {DESK_ROWS.map((desk, i) => (
          <div
            key={desk.segmentId}
            className={`rounded-lg border ${desk.colorBg} px-4 py-3 transition-all duration-500 ${
              i < visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-semibold ${desk.color}`}>{desk.deskName}</span>
              <span className={`px-2 py-1 rounded-md bg-black/30 text-sm font-bold font-mono ${ratingColor(desk.roundedNotch)}`}>
                {desk.avgRating}
              </span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              Counterparties: [{desk.notches.join(', ')}] → AVG = {desk.avgNotch.toFixed(1)} → ROUND = {desk.roundedNotch} → {desk.avgRating}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Dispatcher ────────────────────────────────────────────────────── */

export default function ExtRatingDemoFormulaAnimation({ formulaKey, stepIndex }: Props) {
  switch (formulaKey) {
    case 'notch-scale':
      return <NotchScaleAnimation key={stepIndex} />;
    case 'counterparty-lookup':
      return <CounterpartyLookupAnimation key={stepIndex} />;
    case 'notch-average':
      return <NotchAverageAnimation key={stepIndex} />;
    case 'desk-rollup':
      return <DeskRollupAnimation key={stepIndex} />;
    default:
      return null;
  }
}
