'use client';

import React, { useEffect, useState } from 'react';
import {
  LTV_FACILITIES,
  LTV_COUNTERPARTIES,
  FACILITY_A_COLLATERAL,
  DESK_SEGMENTS,
  PORTFOLIO_BUCKETS,
  LOB_ENTRIES,
  exposureWeightedLTV,
  fmt,
  fmtM,
  fmtPct,
  ltvBandColor,
} from './ltvDemoRollupData';

/* ────────────────────────────────────────────────────────────────────────────
 * LTVDemoFormulaAnimation — animated formula build-ups in the narration panel
 *
 * Each formulaKey corresponds to a different visualization:
 *   - numerator-exposure: single exposure value appearing
 *   - collateral-waterfall: collateral items staggering in
 *   - haircut-waterfall: raw → haircut → eligible value per item
 *   - ltv-division: exposure ÷ collateral × 100 = result
 *   - foundational-rule-ltv: wrong (simple avg) vs correct (weighted avg)
 *   - rollup-facility: table of 3 facility LTVs
 *   - rollup-counterparty: exposure-weighted LTV build-up
 *   - rollup-desk: collateral-type segmented view
 *   - rollup-portfolio: EWA + distribution buckets
 *   - rollup-lob: trend indicator summary
 * ──────────────────────────────────────────────────────────────────────────── */

interface Props {
  formulaKey: string;
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

export default function LTVDemoFormulaAnimation({ formulaKey, stepIndex }: Props) {
  switch (formulaKey) {
    case 'numerator-exposure':
      return <NumeratorExposure stepIndex={stepIndex} />;
    case 'collateral-waterfall':
      return <CollateralWaterfall stepIndex={stepIndex} />;
    case 'haircut-waterfall':
      return <HaircutWaterfall stepIndex={stepIndex} />;
    case 'ltv-division':
      return <LTVDivision stepIndex={stepIndex} />;
    case 'foundational-rule-ltv':
      return <FoundationalRuleDemo stepIndex={stepIndex} />;
    case 'rollup-facility':
      return <RollupFacility stepIndex={stepIndex} />;
    case 'rollup-counterparty':
      return <RollupCounterparty stepIndex={stepIndex} />;
    case 'rollup-desk':
      return <RollupDesk stepIndex={stepIndex} />;
    case 'rollup-portfolio':
      return <RollupPortfolio stepIndex={stepIndex} />;
    case 'rollup-lob':
      return <RollupLoB stepIndex={stepIndex} />;
    default:
      return null;
  }
}

/* ── Numerator: Exposure ─────────────────────────────────────────────────── */

function NumeratorExposure({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(2, 400, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        LTV Numerator
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 font-mono">facility_exposure_snapshot</span>
        </div>
      </div>
      <div
        className="flex items-center justify-between text-sm font-bold transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'scale(1)' : 'scale(0.9)' }}
      >
        <span className="text-emerald-400">gross_exposure_usd</span>
        <span className="text-white font-mono">$15,000,000</span>
      </div>
    </div>
  );
}

/* ── Collateral Waterfall ────────────────────────────────────────────────── */

function CollateralWaterfall({ stepIndex }: { stepIndex: number }) {
  const items = FACILITY_A_COLLATERAL;
  const revealed = useStaggerReveal(items.length + 1, 500, stepIndex);

  const COLL_ICONS: Record<string, string> = {
    'Real Estate': '🏢',
    Cash: '💵',
    Receivables: '📄',
  };

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Collateral Items (from collateral_snapshot)
      </div>
      {items.map((c, i) => (
        <div
          key={c.name}
          className="flex items-center justify-between px-2 py-1.5 rounded text-xs transition-all duration-500"
          style={{
            opacity: revealed > i ? 1 : 0,
            transform: revealed > i ? 'translateX(0)' : 'translateX(16px)',
            background: revealed > i ? 'rgba(255,255,255,0.02)' : 'transparent',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span>{COLL_ICONS[c.type] || '📦'}</span>
            <div className="min-w-0">
              <div className="text-gray-300 truncate">{c.name}</div>
              <div className="text-[9px] text-gray-600">{c.type} · {c.mitigantGroup}</div>
            </div>
          </div>
          <span className="text-amber-400 font-mono flex-shrink-0 ml-2">{fmt(c.currentValue)}</span>
        </div>
      ))}
      <div
        className="flex justify-between text-xs font-mono font-bold pt-1 border-t border-gray-800 transition-all duration-500"
        style={{ opacity: revealed > items.length ? 1 : 0, transform: revealed > items.length ? 'scale(1)' : 'scale(0.95)' }}
      >
        <span className="text-gray-300">Total Collateral</span>
        <span className="text-amber-300">$25,200,000</span>
      </div>
    </div>
  );
}

/* ── Haircut Waterfall ───────────────────────────────────────────────────── */

function HaircutWaterfall({ stepIndex }: { stepIndex: number }) {
  const items = FACILITY_A_COLLATERAL;
  const revealed = useStaggerReveal(items.length + 1, 600, stepIndex);

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Haircut Application
      </div>
      {items.map((c, i) => (
        <div
          key={c.name}
          className="text-xs font-mono transition-all duration-500 px-2 py-1.5 rounded"
          style={{
            opacity: revealed > i ? 1 : 0,
            transform: revealed > i ? 'translateX(0)' : 'translateX(16px)',
            background: revealed > i ? 'rgba(255,255,255,0.02)' : 'transparent',
          }}
        >
          <div className="flex justify-between text-gray-400 mb-0.5">
            <span className="text-gray-300">{c.name}</span>
            <span className="text-[9px] text-gray-600">−{c.haircutPct}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-amber-400">{fmt(c.currentValue)}</span>
            <span className="text-gray-600">→</span>
            <span className={c.haircutPct > 0 ? 'text-emerald-400' : 'text-emerald-400'}>
              {fmt(c.eligibleValue)}
            </span>
          </div>
        </div>
      ))}
      <div
        className="flex justify-between text-xs font-mono font-bold pt-2 border-t border-gray-800 transition-all duration-500"
        style={{ opacity: revealed > items.length ? 1 : 0, transform: revealed > items.length ? 'scale(1)' : 'scale(0.95)' }}
      >
        <span className="text-gray-300">Total Eligible</span>
        <span className="text-emerald-300">$22,650,000</span>
      </div>
    </div>
  );
}

/* ── LTV Division ────────────────────────────────────────────────────────── */

function LTVDivision({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(4, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-4 space-y-2 text-center">
      <div
        className="text-sm font-mono text-emerald-400 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0 }}
      >
        $15,000,000
        <span className="text-[9px] text-gray-600 ml-1">exposure</span>
      </div>
      <div
        className="text-gray-600 text-lg transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        ÷
      </div>
      <div
        className="text-sm font-mono text-amber-400 transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        $25,200,000
        <span className="text-[9px] text-gray-600 ml-1">collateral</span>
      </div>
      <div
        className="text-gray-600 text-sm transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0 }}
      >
        × 100
      </div>
      <div
        className="pt-2 border-t border-gray-800 transition-all duration-700"
        style={{ opacity: revealed > 3 ? 1 : 0, transform: revealed > 3 ? 'scale(1)' : 'scale(0.8)' }}
      >
        <span className="text-[10px] text-gray-500">LTV =</span>
        <span className="text-2xl font-black text-emerald-400 ml-2 tabular-nums">59.5%</span>
        <div className="text-[9px] text-emerald-400/70 mt-1">Low Risk (below 60%)</div>
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
            <span>$50M loan</span><span>LTV = 95.0%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>$1M loan</span><span>LTV = 30.0%</span>
          </div>
        </div>
        <div
          className="mt-2 pt-2 border-t border-red-500/20 text-xs font-mono text-center transition-all duration-500"
          style={{ opacity: revealed > 1 ? 1 : 0 }}
        >
          Average = <span className="text-red-400 font-bold">62.5%</span>
          <span className="text-[9px] text-red-400/70 ml-1">(misleading!)</span>
        </div>
      </div>

      {/* Right way */}
      <div
        className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
          Correct: Exposure-Weighted Average
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between text-gray-400">
            <span>95% × $50M</span><span className="text-amber-400">= $47.5M</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>30% × $1M</span><span className="text-amber-400">= $0.3M</span>
          </div>
        </div>
        <div
          className="mt-2 pt-2 border-t border-emerald-500/20 text-xs font-mono text-center transition-all duration-500"
          style={{ opacity: revealed > 3 ? 1 : 0 }}
        >
          Σ / Σ Exposure = <span className="text-emerald-400 font-bold">93.7%</span>
          <span className="text-[9px] text-emerald-400/70 ml-1">(accurate)</span>
        </div>
      </div>
    </div>
  );
}

/* ── Rollup: Facility ────────────────────────────────────────────────────── */

function RollupFacility({ stepIndex }: { stepIndex: number }) {
  const facilities = LTV_FACILITIES;
  const revealed = useStaggerReveal(facilities.length, 400, stepIndex);

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
            <span className="text-emerald-400 text-[10px]">{fmtM(f.exposure)}</span>
            <span className="text-gray-600">/</span>
            <span className="text-amber-400 text-[10px]">{fmtM(f.collateralValue)}</span>
            <span className="text-gray-600">=</span>
            <span className={`font-bold ${ltvBandColor(f.ltv)}`}>{fmtPct(f.ltv)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Rollup: Counterparty ────────────────────────────────────────────────── */

function RollupCounterparty({ stepIndex }: { stepIndex: number }) {
  const facilities = LTV_FACILITIES;
  const totalLines = facilities.length + 1; // rows + result
  const revealed = useStaggerReveal(totalLines, 400, stepIndex);

  // Weighted LTV for these 3 facilities
  const totalExp = facilities.reduce((s, f) => s + f.exposure, 0);
  const weightedSum = facilities.reduce((s, f) => s + f.ltv * f.exposure, 0);
  const weightedLTV = weightedSum / totalExp;

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Exposure-Weighted Average
      </div>

      {facilities.map((f, i) => (
        <div
          key={f.name}
          className="flex items-center justify-between text-xs font-mono transition-all duration-500"
          style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateX(0)' : 'translateX(12px)' }}
        >
          <span className="text-gray-400">{f.name.split('(')[0].trim()}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={ltvBandColor(f.ltv)}>{fmtPct(f.ltv)}</span>
            <span className="text-gray-600">×</span>
            <span className="text-amber-400">{fmtM(f.exposure)}</span>
          </div>
        </div>
      ))}

      <div
        className="text-center pt-2 border-t border-gray-700 transition-all duration-700"
        style={{ opacity: revealed > facilities.length ? 1 : 0, transform: revealed > facilities.length ? 'scale(1)' : 'scale(0.85)' }}
      >
        <div className="text-[10px] text-gray-500 mb-1">
          Σ(LTV × Exposure) ÷ Σ(Exposure)
        </div>
        <div className={`text-xl font-black tabular-nums ${ltvBandColor(weightedLTV)}`}>
          {fmtPct(weightedLTV)}
        </div>
      </div>
    </div>
  );
}

/* ── Rollup: Desk ────────────────────────────────────────────────────────── */

function RollupDesk({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(DESK_SEGMENTS.length, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Collateral-Type Segmented LTV
      </div>

      {DESK_SEGMENTS.map((seg, i) => (
        <div
          key={seg.label}
          className={`rounded-lg border p-2.5 transition-all duration-500 ${seg.colorBg}`}
          style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateY(0)' : 'translateY(8px)' }}
        >
          <div className={`text-[10px] font-bold mb-1 ${seg.color}`}>{seg.label}</div>
          <div className="flex items-center justify-between text-xs font-mono text-gray-300">
            <span>{seg.collateralType}</span>
            <span className={`font-bold ${seg.color}`}>{fmtPct(seg.ltv)}</span>
          </div>
          <div className="text-[9px] text-gray-600 mt-0.5">{fmtM(seg.exposure)} exposure</div>
        </div>
      ))}
    </div>
  );
}

/* ── Rollup: Portfolio ───────────────────────────────────────────────────── */

function RollupPortfolio({ stepIndex }: { stepIndex: number }) {
  const cps = LTV_COUNTERPARTIES;
  const totalLines = cps.length + 1 + PORTFOLIO_BUCKETS.length; // counterparties + result + buckets
  const revealed = useStaggerReveal(totalLines, 350, stepIndex);
  const wtdAvg = exposureWeightedLTV(cps);

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-3">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Exposure-Weighted Average + Distribution
      </div>

      {/* Counterparty weighted */}
      {cps.map((cp, i) => (
        <div
          key={cp.name}
          className="flex items-center justify-between text-xs font-mono transition-all duration-500"
          style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateX(0)' : 'translateX(12px)' }}
        >
          <span className="text-gray-400">{cp.name}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={ltvBandColor(cp.ltv)}>{fmtPct(cp.ltv)}</span>
            <span className="text-gray-600">×</span>
            <span className="text-amber-400">{fmtM(cp.exposure)}</span>
          </div>
        </div>
      ))}

      {/* Weighted result */}
      <div
        className="text-center pt-2 border-t border-gray-700 transition-all duration-500"
        style={{ opacity: revealed > cps.length ? 1 : 0, transform: revealed > cps.length ? 'scale(1)' : 'scale(0.85)' }}
      >
        <div className={`text-lg font-black tabular-nums ${ltvBandColor(wtdAvg)}`}>
          Portfolio LTV: {fmtPct(wtdAvg)}
        </div>
      </div>

      {/* Distribution buckets */}
      <div className="space-y-1 pt-1">
        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
          Distribution Buckets
        </div>
        {PORTFOLIO_BUCKETS.map((b, i) => {
          const idx = cps.length + 1 + i;
          return (
            <div
              key={b.range}
              className={`flex items-center justify-between text-xs font-mono rounded px-2 py-1 transition-all duration-500 ${b.bg}`}
              style={{ opacity: revealed > idx ? 1 : 0, transform: revealed > idx ? 'translateX(0)' : 'translateX(12px)' }}
            >
              <div className="flex items-center gap-2">
                <span className={b.color}>{b.range}</span>
                <span className="text-[9px] text-gray-600">{b.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{b.count} fac</span>
                <span className="text-gray-400">{fmtM(b.exposure)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Rollup: LoB ─────────────────────────────────────────────────────────── */

function RollupLoB({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(LOB_ENTRIES.length + 1, 500, stepIndex);

  const TREND_ARROWS: Record<string, { icon: string; label: string }> = {
    up: { icon: '↑', label: 'Rising' },
    down: { icon: '↓', label: 'Falling' },
    flat: { icon: '→', label: 'Stable' },
  };

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Trend Indicator Across LoBs
      </div>

      <div
        className="grid grid-cols-3 gap-2 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0 }}
      >
        {LOB_ENTRIES.map((lob, i) => {
          const trend = TREND_ARROWS[lob.trend];
          return (
            <div
              key={lob.label}
              className={`rounded border p-2 text-center transition-all duration-500 ${lob.bg}`}
              style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateY(0)' : 'translateY(8px)' }}
            >
              <div className={`text-[9px] font-bold ${lob.color}`}>{lob.label}</div>
              <div className={`text-sm font-mono font-bold ${lob.color}`}>
                {fmtPct(lob.ltv)} {trend.icon}
              </div>
              <div className="text-[8px] text-gray-600">{lob.note}</div>
            </div>
          );
        })}
      </div>

      <div
        className="text-[10px] text-gray-500 leading-relaxed transition-all duration-500"
        style={{ opacity: revealed > LOB_ENTRIES.length ? 1 : 0 }}
      >
        Unlike DSCR, LTV is <span className="text-gray-300 font-semibold">directly comparable</span> across LoBs
        because the formula is always exposure ÷ collateral. However, the <span className="text-gray-300 font-semibold">collateral
        quality</span> differs: real estate is illiquid but stable; securities are liquid but volatile.
      </div>
    </div>
  );
}
