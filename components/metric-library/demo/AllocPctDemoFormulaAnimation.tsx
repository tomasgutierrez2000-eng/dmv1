'use client';

import React, { useEffect, useState } from 'react';
import {
  FACILITIES,
  COUNTERPARTIES,
  fmtPct,
  fmtM,
  facilitiesForCounterparty,
} from './allocPctDemoRollupData';

/* ────────────────────────────────────────────────────────────────────────────
 * AllocPctDemoFormulaAnimation — animated formula build-ups
 *
 * Single variant — participation_pct raw lookup.
 * formulaKey values:
 *   - legal-build: show participation_pct appearing
 *   - alloc-result: show allocation result
 *   - rollup-facility: show per-facility allocations
 *   - rollup-counterparty: show per-counterparty facility breakdown
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

export default function AllocPctDemoFormulaAnimation({ formulaKey, stepIndex }: Props) {
  switch (formulaKey) {
    case 'legal-build':
      return <ParticipationBuild stepIndex={stepIndex} />;
    case 'alloc-result':
      return <AllocationResult stepIndex={stepIndex} />;
    case 'rollup-facility':
      return <RollupFacility stepIndex={stepIndex} />;
    case 'rollup-counterparty':
      return <RollupCounterparty stepIndex={stepIndex} />;
    default:
      return null;
  }
}

/* ── Participation build ───────────────────────────────────────────────── */

function ParticipationBuild({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Allocation % Lookup
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
        Counterparty share of the facility — raw lookup from facility_counterparty_participation
      </div>
    </div>
  );
}

/* ── Allocation Result ────────────────────────────────────────────────── */

function AllocationResult({ stepIndex }: { stepIndex: number }) {
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
        <span className="text-[10px] text-gray-500">Allocation % =</span>
        <span className="text-2xl font-black text-cyan-400 ml-2 tabular-nums">60.00%</span>
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
        Allocation % Per Facility
      </div>
      {FACILITIES.map((f, i) => (
        <div
          key={f.facilityId}
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
            <span className="text-cyan-400 font-bold">{fmtPct(f.participationPct)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Rollup: Counterparty ────────────────────────────────────────────────── */

function RollupCounterparty({ stepIndex }: { stepIndex: number }) {
  const totalLines = COUNTERPARTIES.reduce((sum, cp) => sum + facilitiesForCounterparty(cp.name).length + 1, 0);
  const revealed = useStaggerReveal(totalLines, 300, stepIndex);
  let lineIdx = 0;

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Allocation % by Counterparty
      </div>
      {COUNTERPARTIES.map((cp) => {
        const cpFacilities = facilitiesForCounterparty(cp.name);
        const startIdx = lineIdx;
        lineIdx += cpFacilities.length + 1;
        return (
          <div key={cp.name} className="space-y-1">
            <div className="text-[10px] text-gray-500 font-bold">{cp.name}</div>
            {cpFacilities.map((f, i) => (
              <div
                key={f.facilityId}
                className="flex justify-between text-xs font-mono transition-all duration-500 pl-2"
                style={{ opacity: revealed > startIdx + i ? 1 : 0, transform: revealed > startIdx + i ? 'translateX(0)' : 'translateX(12px)' }}
              >
                <span className="text-gray-500">{f.name.split('(')[0].trim()}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{fmtM(f.committedAmt)}</span>
                  <span className="text-cyan-400">{fmtPct(f.participationPct)}</span>
                </div>
              </div>
            ))}
            <div
              className="text-[9px] text-gray-600 pt-1 border-t border-gray-800 transition-all duration-500 pl-2"
              style={{ opacity: revealed > startIdx + cpFacilities.length ? 1 : 0 }}
            >
              Each facility retains its own allocation % — no aggregation
            </div>
          </div>
        );
      })}
    </div>
  );
}
