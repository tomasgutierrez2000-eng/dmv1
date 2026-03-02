'use client';

import React, { useEffect, useState } from 'react';
import {
  FACILITIES,
  DESK_COUNTERPARTIES,
  PORTFOLIO_BUCKETS,
  TAXONOMY_PATH,
  COUNTERPARTY_WEIGHTED_LTV,
  DESK_WEIGHTED_LTV,
  exposureWeightedLTV,
  fmt,
  fmtM,
  fmtPct,
} from './ltvDemoData';

/* ────────────────────────────────────────────────────────────────────────────
 * LTVDemoFormulaAnimation — animated formula build-ups & table traversal
 *
 * Formula keys:
 *   - ltv-formula-build:   numerator + denominator appearing
 *   - ltv-result:          big percentage with threshold gauge
 *   - taxonomy-tree:       animated hierarchy tree (L3 → L2 → L1)
 *   - ltv-division:        animated division
 *   - golden-rule:         wrong vs right comparison
 *   - rollup-facility:     table of 3 facility LTVs
 *   - rollup-counterparty: exposure-weighted build-up
 *   - rollup-desk:         3 counterparties weighted
 *   - rollup-portfolio:    distribution buckets
 *   - rollup-lob:          trend indicator
 * ──────────────────────────────────────────────────────────────────────────── */

interface Props {
  formulaKey: string;
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

/* ── main switch ─────────────────────────────────────────────────────────── */

export default function LTVDemoFormulaAnimation({ formulaKey, stepIndex }: Props) {
  switch (formulaKey) {
    case 'ltv-formula-build':
      return <LTVFormulaBuild stepIndex={stepIndex} />;
    case 'ltv-result':
      return <LTVResult stepIndex={stepIndex} />;
    case 'taxonomy-tree':
      return <TaxonomyTree stepIndex={stepIndex} />;
    case 'ltv-division':
      return <LTVDivision stepIndex={stepIndex} />;
    case 'golden-rule':
      return <GoldenRule stepIndex={stepIndex} />;
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

/* ── LTV Formula Build ────────────────────────────────────────────────────── */

function LTVFormulaBuild({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        LTV Formula
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-300">Drawn Amount</span>
        <span className="text-emerald-400 font-mono font-bold">$10,500,000</span>
      </div>
      <div
        className="flex items-center justify-center text-gray-600 text-lg transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        &divide;
      </div>
      <div
        className="flex items-center justify-between text-xs transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0, transform: revealed > 1 ? 'translateX(0)' : 'translateX(16px)' }}
      >
        <span className="text-gray-300">Collateral Value</span>
        <span className="text-amber-400 font-mono font-bold">$15,000,000</span>
      </div>
      <div
        className="pt-2 border-t border-gray-800 text-center transition-all duration-700"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'scale(1)' : 'scale(0.8)' }}
      >
        <span className="text-[10px] text-gray-500">LTV =</span>
        <span className="text-2xl font-black text-blue-400 ml-2 tabular-nums">70.0%</span>
      </div>
    </div>
  );
}

/* ── LTV Result with threshold gauge ──────────────────────────────────────── */

function LTVResult({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(2, 600, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-4 space-y-3">
      <div
        className="text-center transition-all duration-700"
        style={{ opacity: revealed > 0 ? 1 : 0, transform: revealed > 0 ? 'scale(1)' : 'scale(0.8)' }}
      >
        <div className="text-3xl font-black text-blue-400 tabular-nums">70.0%</div>
        <div className="text-[10px] text-gray-500 mt-1">Loan-to-Value</div>
      </div>
      {/* Threshold gauge */}
      <div
        className="transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        <div className="flex h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-500/40 flex-[75]" title="< 75% — Comfortable" />
          <div className="bg-amber-500/40 flex-[5]" title="75–80% — Watch" />
          <div className="bg-red-500/40 flex-[20]" title="> 80% — Elevated" />
        </div>
        {/* Marker at 70% */}
        <div className="relative h-4 mt-0.5">
          <div
            className="absolute w-0.5 h-3 bg-blue-400 rounded"
            style={{ left: '70%', transform: 'translateX(-50%)' }}
          />
          <div
            className="absolute text-[8px] text-blue-400 font-bold"
            style={{ left: '70%', transform: 'translateX(-50%)', top: '14px' }}
          >
            70%
          </div>
        </div>
        <div className="flex justify-between text-[8px] text-gray-600 mt-3">
          <span>0%</span>
          <span className="text-emerald-500">75%</span>
          <span className="text-amber-500">80%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

/* ── Taxonomy Tree ────────────────────────────────────────────────────────── */

function TaxonomyTree({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(TAXONOMY_PATH.length, 700, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-0">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-3">
        Hierarchy Traversal via parent_segment_id
      </div>
      {TAXONOMY_PATH.map((node, i) => (
        <div key={node.managed_segment_id}>
          {/* Node */}
          <div
            className="rounded-lg border p-2.5 transition-all duration-600"
            style={{
              opacity: revealed > i ? 1 : 0,
              transform: revealed > i ? 'translateY(0)' : 'translateY(12px)',
              borderColor: revealed > i
                ? i === 0 ? 'rgba(96,165,250,0.5)' : i === 1 ? 'rgba(168,85,247,0.5)' : 'rgba(251,146,60,0.5)'
                : 'rgba(55,65,81,0.3)',
              background: revealed > i
                ? i === 0 ? 'rgba(96,165,250,0.05)' : i === 1 ? 'rgba(168,85,247,0.05)' : 'rgba(251,146,60,0.05)'
                : 'transparent',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-[9px] font-bold uppercase tracking-wider ${
                  i === 0 ? 'text-blue-400' : i === 1 ? 'text-purple-400' : 'text-orange-400'
                }`}>
                  {node.level_label}
                </div>
                <div className="text-xs text-white font-semibold mt-0.5">{node.segment_name}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-gray-600 font-mono">{node.managed_segment_id}</div>
              </div>
            </div>
          </div>
          {/* Arrow between nodes */}
          {i < TAXONOMY_PATH.length - 1 && (
            <div
              className="flex flex-col items-center py-1 transition-all duration-500"
              style={{ opacity: revealed > i + 1 ? 1 : 0 }}
            >
              <div className="text-[8px] text-gray-600 font-mono">parent_segment_id</div>
              <div className="text-gray-600">&darr;</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── LTV Division (calc step) ─────────────────────────────────────────────── */

function LTVDivision({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(4, 400, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-4 space-y-2 text-center">
      <div
        className="text-xs font-mono transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0 }}
      >
        <span className="text-gray-500">drawn_amount =</span>{' '}
        <span className="text-emerald-400">$10,500,000</span>
      </div>
      <div
        className="text-gray-600 text-lg transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        &divide;
      </div>
      <div
        className="text-xs font-mono transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        <span className="text-gray-500">collateral_value =</span>{' '}
        <span className="text-amber-400">$15,000,000</span>
      </div>
      <div
        className="pt-2 border-t border-gray-800 transition-all duration-700"
        style={{ opacity: revealed > 2 ? 1 : 0, transform: revealed > 2 ? 'scale(1)' : 'scale(0.8)' }}
      >
        <span className="text-[10px] text-gray-500">LTV =</span>
        <span className="text-2xl font-black text-blue-400 ml-2 tabular-nums">70.0%</span>
      </div>
      {/* Source tables */}
      <div
        className="flex justify-center gap-3 pt-2 transition-all duration-500"
        style={{ opacity: revealed > 3 ? 1 : 0 }}
      >
        <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          facility_exposure_snapshot
        </span>
        <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
          collateral_snapshot
        </span>
      </div>
    </div>
  );
}

/* ── Golden Rule — wrong vs right ─────────────────────────────────────────── */

function GoldenRule({ stepIndex }: { stepIndex: number }) {
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
            <span>$100M loan</span><span>LTV = 85%</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>$5M loan</span><span>LTV = 40%</span>
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
          Correct: Exposure-Weighted
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between text-gray-400">
            <span>85% &times; $100M</span><span className="text-emerald-400">$85M</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>40% &times; $5M</span><span className="text-emerald-400">$2M</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Total Exposure</span><span className="text-amber-400">$105M</span>
          </div>
        </div>
        <div
          className="mt-2 pt-2 border-t border-emerald-500/20 text-xs font-mono text-center transition-all duration-500"
          style={{ opacity: revealed > 3 ? 1 : 0 }}
        >
          Weighted = <span className="text-emerald-400 font-bold">82.9%</span>
          <span className="text-[9px] text-emerald-400/70 ml-1">(accurate)</span>
        </div>
      </div>
    </div>
  );
}

/* ── Rollup: Facility ─────────────────────────────────────────────────────── */

function RollupFacility({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(FACILITIES.length, 400, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-2">
        Direct Calculation Per Facility
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
          <div className="text-gray-400 truncate min-w-0">
            <span className="text-gray-500 font-mono text-[10px]">{f.facilityId}</span>{' '}
            <span>{f.name}</span>
          </div>
          <div className="flex items-center gap-2 font-mono flex-shrink-0 ml-2">
            <span className="text-emerald-400 text-[10px]">{fmt(f.drawnAmount)}</span>
            <span className="text-gray-600">/</span>
            <span className="text-amber-400 text-[10px]">{fmt(f.collateralValue)}</span>
            <span className="text-gray-600">=</span>
            <span className={`font-bold ${f.ltv > 0.75 ? 'text-amber-400' : 'text-white'}`}>
              {fmtPct(f.ltv)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Rollup: Counterparty ─────────────────────────────────────────────────── */

function RollupCounterparty({ stepIndex }: { stepIndex: number }) {
  const totalLines = FACILITIES.length + 1; // rows + result
  const revealed = useStaggerReveal(totalLines, 400, stepIndex);
  const wtdLtv = COUNTERPARTY_WEIGHTED_LTV;

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Exposure-Weighted Average
      </div>

      {FACILITIES.map((f, i) => (
        <div
          key={f.facilityId}
          className="flex items-center justify-between text-xs font-mono transition-all duration-500"
          style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateX(0)' : 'translateX(12px)' }}
        >
          <span className="text-gray-400">{f.name}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-white">{fmtPct(f.ltv)}</span>
            <span className="text-gray-600">&times;</span>
            <span className="text-amber-400">{fmtM(f.exposure)}</span>
          </div>
        </div>
      ))}

      <div
        className="text-center pt-2 border-t border-gray-700 transition-all duration-700"
        style={{ opacity: revealed > FACILITIES.length ? 1 : 0, transform: revealed > FACILITIES.length ? 'scale(1)' : 'scale(0.85)' }}
      >
        <div className="text-[10px] text-gray-500 mb-1">
          &Sigma;(LTV &times; Exposure) &divide; &Sigma;(Exposure)
        </div>
        <div className="text-xl font-black text-white tabular-nums">
          {fmtPct(wtdLtv)}
        </div>
      </div>
    </div>
  );
}

/* ── Rollup: Desk ─────────────────────────────────────────────────────────── */

function RollupDesk({ stepIndex }: { stepIndex: number }) {
  const totalLines = DESK_COUNTERPARTIES.length + 1;
  const revealed = useStaggerReveal(totalLines, 400, stepIndex);
  const wtdLtv = DESK_WEIGHTED_LTV;

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        CRE Origination Desk — Weighted by Exposure
      </div>

      {DESK_COUNTERPARTIES.map((cp, i) => (
        <div
          key={cp.name}
          className="flex items-center justify-between text-xs font-mono transition-all duration-500"
          style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateX(0)' : 'translateX(12px)' }}
        >
          <span className="text-gray-400">{cp.name}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-white">{fmtPct(cp.ltv)}</span>
            <span className="text-gray-600">&times;</span>
            <span className="text-amber-400">{fmtM(cp.exposure)}</span>
          </div>
        </div>
      ))}

      <div
        className="text-center pt-2 border-t border-gray-700 transition-all duration-700"
        style={{ opacity: revealed > DESK_COUNTERPARTIES.length ? 1 : 0, transform: revealed > DESK_COUNTERPARTIES.length ? 'scale(1)' : 'scale(0.85)' }}
      >
        <div className="text-[10px] text-gray-500 mb-1">
          Desk Weighted Avg LTV
        </div>
        <div className="text-xl font-black text-white tabular-nums">
          {fmtPct(wtdLtv)}
        </div>
      </div>
    </div>
  );
}

/* ── Rollup: Portfolio (distribution buckets) ─────────────────────────────── */

function RollupPortfolio({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(PORTFOLIO_BUCKETS.length + 1, 400, stepIndex);
  const totalExp = PORTFOLIO_BUCKETS.reduce((s, b) => s + b.exposure, 0);
  const colorMap: Record<string, { bg: string; text: string; border: string; bar: string }> = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', bar: 'bg-emerald-500/40' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', bar: 'bg-blue-500/40' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', bar: 'bg-amber-500/40' },
    red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', bar: 'bg-red-500/40' },
  };

  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        CRE Portfolio — LTV Distribution
      </div>

      {PORTFOLIO_BUCKETS.map((b, i) => {
        const c = colorMap[b.color] || colorMap.blue;
        const pct = ((b.exposure / totalExp) * 100).toFixed(0);
        return (
          <div
            key={b.label}
            className={`rounded-lg border ${c.border} ${c.bg} p-2 transition-all duration-500`}
            style={{ opacity: revealed > i ? 1 : 0, transform: revealed > i ? 'translateY(0)' : 'translateY(8px)' }}
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`font-bold ${c.text}`}>{b.label}</span>
                <span className="text-gray-500">{b.count} facilities</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-gray-400">{fmtM(b.exposure)}</span>
                <span className={`font-bold ${c.text}`}>{pct}%</span>
              </div>
            </div>
            {/* Bar */}
            <div className="mt-1.5 h-1 rounded-full bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${c.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}

      <div
        className="text-center pt-2 border-t border-gray-700 transition-all duration-700"
        style={{ opacity: revealed > PORTFOLIO_BUCKETS.length ? 1 : 0 }}
      >
        <div className="text-[10px] text-gray-500 mb-1">Portfolio Weighted Avg LTV</div>
        <div className="text-xl font-black text-white tabular-nums">67.8%</div>
      </div>
    </div>
  );
}

/* ── Rollup: LoB ──────────────────────────────────────────────────────────── */

function RollupLoB({ stepIndex }: { stepIndex: number }) {
  const revealed = useStaggerReveal(3, 500, stepIndex);
  return (
    <div className="rounded-lg bg-white/[0.03] border border-gray-800 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-widest text-gray-600">
        Trend Indicator — Collateral Coverage
      </div>

      <div
        className="grid grid-cols-3 gap-2 transition-all duration-500"
        style={{ opacity: revealed > 0 ? 1 : 0 }}
      >
        <div className="rounded bg-blue-500/10 border border-blue-500/20 p-2 text-center">
          <div className="text-[9px] text-blue-300 font-bold">CRE</div>
          <div className="text-sm font-mono font-bold text-blue-400">67.8%</div>
          <div className="text-[8px] text-gray-600">$1.1B exposure</div>
        </div>
        <div className="rounded bg-purple-500/10 border border-purple-500/20 p-2 text-center">
          <div className="text-[9px] text-purple-300 font-bold">Lev Fin</div>
          <div className="text-sm font-mono font-bold text-purple-400">52.3%</div>
          <div className="text-[8px] text-gray-600">$440M exposure</div>
        </div>
        <div className="rounded bg-amber-500/10 border border-amber-500/20 p-2 text-center">
          <div className="text-[9px] text-amber-300 font-bold">Corp</div>
          <div className="text-sm font-mono font-bold text-amber-400">—</div>
          <div className="text-[8px] text-gray-600">Mostly unsecured</div>
        </div>
      </div>

      <div
        className="text-[10px] text-gray-500 leading-relaxed transition-all duration-500"
        style={{ opacity: revealed > 1 ? 1 : 0 }}
      >
        LTV is <span className="text-gray-300 font-semibold">most meaningful for secured lending</span> (CRE, Leveraged Finance).
        Unsecured portfolios show sparse or null LTV coverage.
      </div>

      <div
        className="rounded bg-blue-500/[0.04] border border-blue-500/20 p-2 text-[10px] text-gray-400 transition-all duration-500"
        style={{ opacity: revealed > 2 ? 1 : 0 }}
      >
        <span className="text-blue-300 font-bold">Usage:</span> Track quarterly trend. Ask &ldquo;Is
        collateral coverage improving or deteriorating?&rdquo; Compare period-over-period, not across
        business lines.
      </div>
    </div>
  );
}
