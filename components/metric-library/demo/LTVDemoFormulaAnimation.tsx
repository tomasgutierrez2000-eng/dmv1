'use client';

import React, { useEffect, useState } from 'react';
import type { LTVVariantKey } from './ltvDemoSteps';
import {
  LTV_FACILITIES,
  ltvForVariant,
  bucketsForVariant,
  COUNTERPARTY_STANDARD_LTV,
  COUNTERPARTY_STRESSED_LTV,
  COUNTERPARTY_SECURED_EXPOSURE,
  fmt,
  fmtM,
  fmtPct,
} from './ltvDemoRollupData';

/* ────────────────────────────────────────────────────────────────────────────
 * LTVDemoFormulaAnimation — animated formula build-ups in the narration panel
 *
 * Each formulaKey corresponds to a different visualization:
 *   - ltv-numerator: drawn amount highlight
 *   - ltv-denominator: collateral value (standard) or haircut calc (stressed)
 *   - ltv-division: show the final division
 *   - unsecured-rule: wrong vs correct approach
 *   - rollup-facility: table of 3 facility LTVs
 *   - rollup-counterparty: exposure-weighted average
 *   - rollup-desk: single desk result
 *   - rollup-portfolio: distribution buckets
 * ──────────────────────────────────────────────────────────────────────────── */

interface Props {
  formulaKey: string;
  variant: string;
  stepIndex: number;
}

function useStaggeredReveal(count: number, stepIndex: number, delayMs = 200): boolean[] {
  const [visible, setVisible] = useState<boolean[]>(Array(count).fill(false));
  useEffect(() => {
    setVisible(Array(count).fill(false));
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < count; i++) {
      timers.push(
        setTimeout(() => {
          setVisible((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, (i + 1) * delayMs),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [stepIndex, count, delayMs]);
  return visible;
}

export default function LTVDemoFormulaAnimation({ formulaKey, variant, stepIndex }: Props) {
  const v = variant as LTVVariantKey;

  switch (formulaKey) {
    case 'ltv-numerator':
      return <NumeratorAnimation variant={v} stepIndex={stepIndex} />;
    case 'ltv-denominator':
      return <DenominatorAnimation variant={v} stepIndex={stepIndex} />;
    case 'ltv-division':
      return <DivisionAnimation variant={v} stepIndex={stepIndex} />;
    case 'unsecured-rule':
      return <UnsecuredRuleAnimation stepIndex={stepIndex} />;
    case 'rollup-facility':
      return <FacilityRollupAnimation variant={v} stepIndex={stepIndex} />;
    case 'rollup-counterparty':
      return <CounterpartyRollupAnimation variant={v} stepIndex={stepIndex} />;
    case 'rollup-desk':
      return <DeskRollupAnimation variant={v} stepIndex={stepIndex} />;
    case 'rollup-portfolio':
      return <PortfolioRollupAnimation variant={v} stepIndex={stepIndex} />;
    default:
      return null;
  }
}

/* ── Numerator animation ── */
function NumeratorAnimation({ variant: _v, stepIndex }: { variant: LTVVariantKey; stepIndex: number }) {
  const vis = useStaggeredReveal(1, stepIndex, 300);
  return (
    <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Numerator</div>
      <div className={`flex items-center justify-between text-xs transition-all duration-500 ${vis[0] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <span className="text-gray-300">Drawn Amount</span>
        <span className="font-mono text-teal-400 font-bold">$120,000,000</span>
      </div>
      <div className="text-[9px] text-gray-600 mt-1">Source: facility_exposure_snapshot.drawn_amount</div>
    </div>
  );
}

/* ── Denominator animation ── */
function DenominatorAnimation({ variant, stepIndex }: { variant: LTVVariantKey; stepIndex: number }) {
  const items = variant === 'standard' ? 1 : 3;
  const vis = useStaggeredReveal(items, stepIndex, 300);

  if (variant === 'standard') {
    return (
      <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-1.5">
        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Denominator</div>
        <div className={`flex items-center justify-between text-xs transition-all duration-500 ${vis[0] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <span className="text-gray-300">Collateral Value</span>
          <span className="font-mono text-teal-400 font-bold">$175,000,000</span>
        </div>
        <div className="text-[9px] text-gray-600 mt-1">Source: SUM(collateral_snapshot.current_valuation_usd)</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Denominator (Stressed)</div>
      <div className={`flex items-center justify-between text-xs transition-all duration-500 ${vis[0] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <span className="text-gray-300">Current Valuation</span>
        <span className="font-mono text-gray-400">$175,000,000</span>
      </div>
      <div className={`flex items-center justify-between text-xs transition-all duration-500 ${vis[1] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <span className="text-gray-300">\u2212 Haircut (14.3%)</span>
        <span className="font-mono text-red-400">\u2212$25,000,000</span>
      </div>
      <div className={`flex items-center justify-between text-xs pt-1.5 border-t border-white/10 transition-all duration-500 ${vis[2] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <span className="text-gray-200 font-medium">Stressed Value</span>
        <span className="font-mono text-orange-400 font-bold">$150,000,000</span>
      </div>
    </div>
  );
}

/* ── Division animation ── */
function DivisionAnimation({ variant, stepIndex }: { variant: LTVVariantKey; stepIndex: number }) {
  const vis = useStaggeredReveal(3, stepIndex, 400);
  const den = variant === 'standard' ? '$175,000,000' : '$150,000,000';
  const result = variant === 'standard' ? '68.6%' : '80.0%';
  const resultColor = variant === 'standard' ? 'text-teal-400' : 'text-orange-400';

  return (
    <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-2">
      <div className={`text-center text-sm font-mono transition-all duration-500 ${vis[0] ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-gray-300">$120,000,000</span>
      </div>
      <div className={`border-t border-white/20 mx-8 transition-all duration-500 ${vis[1] ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`text-center text-sm font-mono transition-all duration-500 ${vis[1] ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-gray-300">{den}</span>
      </div>
      <div className={`text-center text-lg font-bold font-mono transition-all duration-500 ${vis[2] ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} ${resultColor}`}>
        = {result}
      </div>
    </div>
  );
}

/* ── Unsecured rule animation ── */
function UnsecuredRuleAnimation({ stepIndex }: { stepIndex: number }) {
  const vis = useStaggeredReveal(2, stepIndex, 600);

  return (
    <div className="space-y-3">
      {/* Wrong approach */}
      <div className={`rounded-xl border border-red-500/30 bg-red-500/5 p-3 transition-all duration-500 ${vis[0] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <div className="text-[9px] font-bold uppercase tracking-wider text-red-400 mb-1.5">\u2717 Wrong: Include unsecured as 0%</div>
        <div className="text-xs text-gray-400 font-mono">
          avg(68.6%, 60.7%, <span className="text-red-400">0%</span>) = <span className="text-red-400">43.1%</span>
        </div>
        <div className="text-[9px] text-gray-600 mt-1">Misleading — makes portfolio look far riskier</div>
      </div>

      {/* Correct approach */}
      <div className={`rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 transition-all duration-500 ${vis[1] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5">\u2713 Correct: Exclude unsecured entirely</div>
        <div className="text-xs text-gray-400 font-mono">
          wavg(68.6%, 60.7%) = <span className="text-emerald-400">65.3%</span>
          <span className="text-gray-600 ml-1">[unsecured = NULL]</span>
        </div>
        <div className="text-[9px] text-gray-600 mt-1">Accurate — reflects only secured exposure</div>
      </div>
    </div>
  );
}

/* ── Facility rollup animation ── */
function FacilityRollupAnimation({ variant, stepIndex }: { variant: LTVVariantKey; stepIndex: number }) {
  const vis = useStaggeredReveal(LTV_FACILITIES.length, stepIndex, 250);

  return (
    <div className="rounded-xl bg-black/30 border border-white/10 p-3">
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-2">Facility LTV</div>
      <div className="space-y-1.5">
        {LTV_FACILITIES.map((fac, i) => {
          const ltv = ltvForVariant(fac, variant);
          return (
            <div
              key={fac.name}
              className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg transition-all duration-500 ${
                vis[i] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              } ${fac.isSecured ? 'bg-white/5' : 'bg-white/[0.02]'}`}
            >
              <div className="min-w-0">
                <div className={fac.isSecured ? 'text-gray-200' : 'text-gray-500'}>{fac.name}</div>
                <div className="text-[9px] text-gray-600">{fmtM(fac.exposure)} exposure</div>
              </div>
              <span className={`font-mono font-bold flex-shrink-0 ml-2 ${
                !fac.isSecured ? 'text-gray-600 italic' : ltv > 80 ? 'text-amber-400' : 'text-teal-400'
              }`}>
                {fmtPct(ltv)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Counterparty rollup animation ── */
function CounterpartyRollupAnimation({ variant, stepIndex }: { variant: LTVVariantKey; stepIndex: number }) {
  const vis = useStaggeredReveal(3, stepIndex, 400);
  const secured = LTV_FACILITIES.filter((f) => f.isSecured);
  const cptyLtv = variant === 'standard' ? COUNTERPARTY_STANDARD_LTV : COUNTERPARTY_STRESSED_LTV;

  return (
    <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-2">
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Counterparty: Apex Property Holdings</div>

      {/* Weighted sum */}
      <div className={`space-y-1 transition-all duration-500 ${vis[0] ? 'opacity-100' : 'opacity-0'}`}>
        {secured.map((fac) => (
          <div key={fac.name} className="flex items-center justify-between text-[10px] font-mono text-gray-400">
            <span>{fmtPct(ltvForVariant(fac, variant))} \u00d7 {fmtM(fac.exposure)}</span>
            <span>= {fmt(ltvForVariant(fac, variant) * fac.exposure / 100)}</span>
          </div>
        ))}
      </div>

      {/* Total secured exposure */}
      <div className={`flex items-center justify-between text-xs border-t border-white/10 pt-1.5 transition-all duration-500 ${vis[1] ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-gray-400">Total secured exposure</span>
        <span className="font-mono text-gray-300">{fmtM(COUNTERPARTY_SECURED_EXPOSURE)}</span>
      </div>

      {/* Result */}
      <div className={`text-center text-lg font-bold font-mono transition-all duration-500 ${vis[2] ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} ${variant === 'standard' ? 'text-teal-400' : 'text-orange-400'}`}>
        Counterparty LTV = {fmtPct(cptyLtv)}
      </div>
    </div>
  );
}

/* ── Desk rollup animation ── */
function DeskRollupAnimation({ variant, stepIndex }: { variant: LTVVariantKey; stepIndex: number }) {
  const vis = useStaggeredReveal(1, stepIndex, 400);
  const desk = variant === 'standard' ? { ltv: 65.3, exp: 205 } : { ltv: 78.3, exp: 205 };

  return (
    <div className={`rounded-xl bg-black/30 border border-white/10 p-3 transition-all duration-500 ${vis[0] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-2">Desk: NYC CRE</div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-300">Exposure-weighted LTV</span>
        <span className={`font-mono font-bold ${variant === 'standard' ? 'text-teal-400' : 'text-orange-400'}`}>
          {fmtPct(desk.ltv)}
        </span>
      </div>
      <div className="text-[9px] text-gray-600 mt-1">
        Secured exposure: ${desk.exp}M &middot; Grouped via enterprise_business_taxonomy (tree_level = 3)
      </div>
    </div>
  );
}

/* ── Portfolio rollup animation ── */
function PortfolioRollupAnimation({ variant, stepIndex }: { variant: LTVVariantKey; stepIndex: number }) {
  const buckets = bucketsForVariant(variant);
  const vis = useStaggeredReveal(buckets.length, stepIndex, 200);

  return (
    <div className="rounded-xl bg-black/30 border border-white/10 p-3">
      <div className="text-[9px] font-bold uppercase tracking-wider text-gray-600 mb-2">LTV Distribution</div>
      <div className="space-y-1">
        {buckets.map((b, i) => (
          <div
            key={b.range}
            className={`flex items-center justify-between text-[10px] px-2 py-1 rounded-lg bg-white/[0.03] transition-all duration-400 ${
              vis[i] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`font-mono font-bold ${b.color}`}>{b.range}</span>
              <span className="text-gray-600">{b.status}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 font-mono">
              <span>{b.count} loans</span>
              <span>${b.exposureM}M</span>
              <span>{b.pctOfTotal}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
