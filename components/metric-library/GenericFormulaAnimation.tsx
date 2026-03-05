'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type {
  FormulaDecomposition,
  FormulaComponent,
  MetricVisualizationConfig,
  DemoEntity,
  ValueFormatConfig,
} from '@/lib/metric-library/metric-config';
import { computeRollup, formatMetricValue, getValueColor } from '@/lib/metric-library/metric-config';
import type { RollupLevelKey } from '@/lib/metric-library/types';

/* ═══════════════════════════════════════════════════════════════════════════
 * TYPES
 * ═══════════════════════════════════════════════════════════════════════════ */

type AnimationPhase =
  | 'numerator-build'
  | 'denominator-build'
  | 'division'
  | 'result'
  | 'rollup';

interface GenericFormulaAnimationProps {
  config: MetricVisualizationConfig;
  entities: DemoEntity[];
  /** Which phase to render. If omitted, renders all phases in sequence. */
  phase?: AnimationPhase;
  /** For rollup phase: which level are we rolling up to? */
  rollupLevel?: RollupLevelKey;
  /** Auto-play the build-up animation. */
  autoPlay?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * HELPERS
 * ═══════════════════════════════════════════════════════════════════════════ */

const LAYER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  L1: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/30' },
  L2: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30' },
  L3: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30' },
};

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatSampleValue(v: number, field: string): string {
  if (field.endsWith('_amt') || field.endsWith('_value') || field.endsWith('_amount')) return formatCurrency(v);
  if (field.endsWith('_pct')) return `${v.toFixed(1)}%`;
  if (field.endsWith('_ratio')) return `${v.toFixed(2)}x`;
  return v.toLocaleString();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * COMPONENT BUILD ANIMATION — shows components appearing one by one
 * ═══════════════════════════════════════════════════════════════════════════ */

function ComponentBuild({
  components,
  title,
  total,
  isActive,
  delay = 0,
}: {
  components: FormulaComponent[];
  title: string;
  total: number;
  isActive: boolean;
  delay?: number;
}) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!isActive) { setVisibleCount(0); return; }
    setVisibleCount(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i <= components.length; i++) {
      timers.push(setTimeout(() => setVisibleCount(i + 1), delay + i * 400));
    }
    return () => timers.forEach(clearTimeout);
  }, [isActive, components.length, delay]);

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{title}</div>
      <div className="space-y-1.5">
        {components.map((comp, i) => {
          const visible = i < visibleCount;
          const lc = LAYER_COLORS[comp.source_layer] ?? LAYER_COLORS.L2;
          return (
            <div
              key={`${comp.field}-${i}`}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-500 ${
                visible
                  ? `${lc.bg} ${lc.border} opacity-100 translate-y-0`
                  : 'bg-transparent border-transparent opacity-0 translate-y-2'
              }`}
            >
              <span className={`text-xs font-bold font-mono ${lc.text}`}>
                {i === 0 ? '' : comp.op}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-300">{comp.label}</span>
                <span className="text-[9px] text-gray-600 ml-2">{comp.source_table}</span>
              </div>
              <span className="text-xs font-mono font-bold text-white">
                {formatSampleValue(comp.sample_value, comp.field)}
              </span>
            </div>
          );
        })}

        {/* Total row */}
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all duration-500 ${
            visibleCount > components.length
              ? 'bg-white/5 border-white/20 opacity-100'
              : 'opacity-0'
          }`}
        >
          <span className="text-xs font-bold text-gray-400">= Total</span>
          <span className="text-sm font-mono font-bold text-emerald-400">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * DIVISION ANIMATION — shows numerator / denominator = result
 * ═══════════════════════════════════════════════════════════════════════════ */

function DivisionAnimation({
  numTotal,
  denTotal,
  resultValue,
  valueFormat,
  isActive,
}: {
  numTotal: number;
  denTotal: number;
  resultValue: number;
  valueFormat: ValueFormatConfig;
  isActive: boolean;
}) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isActive) { setPhase(0); return; }
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isActive]);

  const colorClass = getValueColor(resultValue, valueFormat);

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {/* Numerator */}
      <div className={`text-lg font-mono font-bold text-white transition-all duration-500 ${phase >= 1 ? 'opacity-100' : 'opacity-30'}`}>
        {formatCurrency(numTotal)}
      </div>

      {/* Division line */}
      <div className={`w-32 h-px bg-gray-500 transition-all duration-500 ${phase >= 2 ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`} />

      {/* Denominator */}
      <div className={`text-lg font-mono font-bold text-white transition-all duration-500 ${phase >= 2 ? 'opacity-100' : 'opacity-30'}`}>
        {formatCurrency(denTotal)}
      </div>

      {/* Equals */}
      <div className={`flex items-center gap-2 mt-2 transition-all duration-500 ${phase >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        <span className="text-gray-500 text-xl">=</span>
        <span className={`text-2xl font-mono font-bold ${colorClass}`}>
          {formatMetricValue(resultValue, valueFormat)}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ROLLUP ANIMATION — shows aggregation at higher levels
 * ═══════════════════════════════════════════════════════════════════════════ */

function RollupAnimation({
  config,
  entities,
  rollupLevel,
}: {
  config: MetricVisualizationConfig;
  entities: DemoEntity[];
  rollupLevel: RollupLevelKey;
}) {
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowResult(true), 800);
    return () => clearTimeout(t);
  }, [rollupLevel]);

  const rollupVal = computeRollup(entities, config);
  const strategy = config.rollup_strategy;
  const colorClass = getValueColor(rollupVal, config.value_format);

  const strategyLabel: Record<string, string> = {
    'sum-ratio': 'SUM(num) / SUM(den)',
    'weighted-avg': 'Σ(value × weight) / Σ(weight)',
    'direct-sum': 'SUM(values)',
    'count': 'COUNT(*)',
    'avg': 'AVG(values)',
    'min': 'MIN(values)',
    'max': 'MAX(values)',
  };

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-3">
        Rollup to {rollupLevel} — {entities.length} entities
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-gray-400">Strategy:</span>
        <code className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-1 rounded">
          {strategyLabel[strategy] ?? strategy}
        </code>
      </div>

      {/* Entity pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {entities.slice(0, 8).map((e, i) => {
          const val = Number(e.fields[config.metric_fields.primary_value]) || 0;
          const vc = getValueColor(val, config.value_format);
          return (
            <div
              key={e.entity_id}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-gray-800 transition-all duration-300"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="text-[9px] text-gray-500">{e.entity_name.slice(0, 12)}</span>
              <span className={`text-[10px] font-mono font-bold ${vc}`}>
                {formatMetricValue(val, config.value_format)}
              </span>
            </div>
          );
        })}
        {entities.length > 8 && (
          <span className="text-[9px] text-gray-600 self-center">+{entities.length - 8} more</span>
        )}
      </div>

      {/* Result */}
      <div className={`flex items-center gap-2 transition-all duration-500 ${showResult ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-gray-500 text-lg">=</span>
        <span className={`text-xl font-mono font-bold ${colorClass}`}>
          {formatMetricValue(rollupVal, config.value_format)}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════ */

export default function GenericFormulaAnimation({
  config,
  entities,
  phase: externalPhase,
  rollupLevel,
  autoPlay = true,
}: GenericFormulaAnimationProps) {
  const decomp = config.formula_decomposition;
  const hasRatio = decomp.denominator.length > 0;

  // Auto-sequence phases if no external phase is specified
  const phases: AnimationPhase[] = useMemo(() => {
    const p: AnimationPhase[] = ['numerator-build'];
    if (hasRatio) p.push('denominator-build', 'division');
    p.push('result');
    if (rollupLevel && rollupLevel !== 'facility') p.push('rollup');
    return p;
  }, [hasRatio, rollupLevel]);

  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(0);
  const currentPhase = externalPhase ?? phases[currentPhaseIdx];

  // Auto-advance phases
  useEffect(() => {
    if (externalPhase || !autoPlay) return;
    const delays = {
      'numerator-build': decomp.numerator.length * 400 + 800,
      'denominator-build': decomp.denominator.length * 400 + 800,
      'division': 1500,
      'result': 1000,
      'rollup': 2000,
    };
    const delay = delays[phases[currentPhaseIdx]] ?? 1000;
    if (currentPhaseIdx < phases.length - 1) {
      const t = setTimeout(() => setCurrentPhaseIdx(i => i + 1), delay);
      return () => clearTimeout(t);
    }
  }, [currentPhaseIdx, externalPhase, autoPlay, phases, decomp]);

  // Compute totals for the example entity
  const example = entities[0];
  const numTotal = decomp.numerator.reduce((s, c) => {
    const val = example ? Number(example.fields[c.field]) || c.sample_value : c.sample_value;
    return s + val;
  }, 0);
  const denTotal = decomp.denominator.reduce((s, c) => {
    const val = example ? Number(example.fields[c.field]) || c.sample_value : c.sample_value;
    return s + val;
  }, 0);
  const resultValue = hasRatio && denTotal > 0
    ? (decomp.result_format === 'percentage' ? (numTotal / denTotal) * 100 : numTotal / denTotal)
    : numTotal;

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-white">Formula Animation</span>
        {/* Phase indicator */}
        <div className="flex items-center gap-1.5">
          {phases.map((p, i) => (
            <button
              key={p}
              onClick={() => setCurrentPhaseIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === (externalPhase ? phases.indexOf(externalPhase) : currentPhaseIdx)
                  ? 'bg-purple-500 scale-125'
                  : i < (externalPhase ? phases.indexOf(externalPhase) : currentPhaseIdx)
                    ? 'bg-gray-600'
                    : 'bg-gray-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Formula display */}
      {decomp.formula_display && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-white/[0.03] border border-gray-800">
          <code className="text-xs font-mono text-gray-300">{decomp.formula_display}</code>
        </div>
      )}

      {/* Phase-based rendering */}
      <div className="space-y-4">
        {currentPhase === 'numerator-build' && (
          <ComponentBuild
            components={decomp.numerator}
            title={hasRatio ? 'Numerator' : 'Components'}
            total={numTotal}
            isActive={true}
          />
        )}

        {currentPhase === 'denominator-build' && hasRatio && (
          <ComponentBuild
            components={decomp.denominator}
            title="Denominator"
            total={denTotal}
            isActive={true}
          />
        )}

        {currentPhase === 'division' && hasRatio && (
          <DivisionAnimation
            numTotal={numTotal}
            denTotal={denTotal}
            resultValue={resultValue}
            valueFormat={config.value_format}
            isActive={true}
          />
        )}

        {currentPhase === 'result' && (
          <div className="flex flex-col items-center gap-2 py-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Result</span>
            <span className={`text-3xl font-mono font-bold ${getValueColor(resultValue, config.value_format)}`}>
              {formatMetricValue(resultValue, config.value_format)}
            </span>
            {example && (
              <span className="text-[10px] text-gray-600">for {example.entity_name}</span>
            )}
          </div>
        )}

        {currentPhase === 'rollup' && rollupLevel && (
          <RollupAnimation
            config={config}
            entities={entities}
            rollupLevel={rollupLevel}
          />
        )}
      </div>
    </div>
  );
}
