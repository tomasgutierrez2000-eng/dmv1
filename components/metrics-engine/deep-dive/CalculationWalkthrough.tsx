'use client';

import React, { useMemo } from 'react';
import { GitBranch, Database, Calculator, Shuffle, ArrowRight } from 'lucide-react';
import type { CalculationDimension } from '@/data/l3-metrics';
import type { CrossTierResolution, TierStepGroup } from '@/lib/deep-dive/cross-tier-resolver';
import type { LineageStep, StepType } from '@/lib/deep-dive/lineage-parser';
import { STEP_TYPE_STYLES, LAYER_COLORS } from './shared-styles';

/* ── Step type icon ── */
function StepIcon({ type, tag }: { type: StepType; tag: string }) {
  if (tag === 'OUTPUT') return <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />;
  switch (type) {
    case 'SOURCING':
      return <Database className="w-3.5 h-3.5 text-blue-400" />;
    case 'CALCULATION':
      return <Calculator className="w-3.5 h-3.5 text-purple-400" />;
    case 'HYBRID':
      return <Shuffle className="w-3.5 h-3.5 text-amber-400" />;
    default:
      return <Database className="w-3.5 h-3.5 text-gray-400" />;
  }
}

/* ── Step type badge ── */
function StepTypeBadge({ type, tag }: { type: StepType; tag: string }) {
  const key = tag === 'OUTPUT' ? 'OUTPUT' : type;
  const style = STEP_TYPE_STYLES[key as keyof typeof STEP_TYPE_STYLES] ?? STEP_TYPE_STYLES.SOURCING;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}
    >
      <StepIcon type={type} tag={tag} />
      {style.label}
    </span>
  );
}

/* ── Single step card ── */
function StepCard({
  step,
  stepNumber,
  isDependency,
}: {
  step: LineageStep;
  stepNumber: number;
  isDependency: boolean;
}) {
  const isOutput = step.tag === 'OUTPUT';

  return (
    <div
      className={`relative flex gap-3 ${isDependency ? 'opacity-80' : ''}`}
      style={{
        animation: `fadeSlideIn 0.3s ease-out ${stepNumber * 0.06}s both`,
      }}
    >
      {/* Step number badge */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
            isOutput
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : isDependency
                ? 'bg-white/5 border-white/10 text-gray-500'
                : 'bg-white/5 border-white/20 text-gray-300'
          }`}
        >
          {stepNumber}
        </div>
        {/* Vertical connector line — will be overlapped by the next step */}
      </div>

      {/* Step content card */}
      <div
        className={`flex-1 rounded-lg border p-3 mb-1 ${
          isOutput
            ? 'bg-emerald-950/30 border-emerald-500/30'
            : step.type === 'HYBRID'
              ? 'bg-amber-950/20 border-amber-500/20'
              : step.tag === 'TRANSFORM'
                ? 'bg-purple-950/20 border-purple-500/20'
                : 'bg-white/[0.03] border-white/10'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-xs font-semibold text-white/90 leading-tight">
            {step.label}
          </span>
          <StepTypeBadge type={step.type} tag={step.tag} />
        </div>

        {/* Source step details */}
        {step.tag === 'SOURCE' && (
          <div className="space-y-1">
            {step.layer && step.table && step.field && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                    LAYER_COLORS[step.layer]?.bg ?? ''
                  } ${LAYER_COLORS[step.layer]?.text ?? 'text-gray-400'}`}
                >
                  {step.layer}
                </span>
                <code className="text-[11px] text-gray-300 font-mono">
                  {step.table}.{step.field}
                </code>
              </div>
            )}
            {step.description && (
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {step.description}
              </p>
            )}
            {step.joinConditions && step.joinConditions.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-gray-600">
                <span className="font-medium">Join:</span>
                {step.joinConditions.map((jc) => (
                  <code key={jc} className="px-1 py-0.5 rounded bg-white/5 text-gray-500 font-mono">
                    {jc}
                  </code>
                ))}
              </div>
            )}
            {step.sampleValue && (
              <div className="text-[10px] text-gray-600">
                <span className="font-medium">Sample:</span>{' '}
                <code className="text-gray-400 font-mono">{step.sampleValue}</code>
              </div>
            )}
          </div>
        )}

        {/* Hybrid step: show aggregation formula */}
        {step.type === 'HYBRID' && step.tag === 'SOURCE' && (
          <div className="mt-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
            <p className="text-[10px] text-amber-300/80">
              Aggregation required at sourcing — SUM / GROUP BY applied before join
            </p>
          </div>
        )}

        {/* Transform/calculation step details */}
        {step.tag === 'TRANSFORM' && (
          <div className="space-y-1">
            {step.formula && (
              <div className="px-2 py-1.5 rounded bg-black/20 border border-white/5">
                <code className="text-[11px] text-purple-300 font-mono break-all">
                  {step.formula}
                </code>
              </div>
            )}
            {step.grouping && (
              <div className="text-[10px] text-gray-600">
                <span className="font-medium">Group by:</span>{' '}
                <code className="text-gray-400 font-mono">{step.grouping}</code>
              </div>
            )}
            {step.nullGuard && (
              <div className="text-[10px] text-gray-600">
                <span className="font-medium">Guard:</span>{' '}
                <span className="text-gray-500">{step.nullGuard}</span>
              </div>
            )}
          </div>
        )}

        {/* Output step */}
        {isOutput && step.description && (
          <p className="text-[11px] text-emerald-400/70 mt-0.5">{step.description}</p>
        )}
      </div>
    </div>
  );
}

/* ── Tier section header ── */
function TierSectionHeader({
  tierGroup,
}: {
  tierGroup: TierStepGroup;
}) {
  const isDep = tierGroup.isDependencyTier;
  return (
    <div
      className={`flex items-center gap-2 mb-2 mt-4 first:mt-0 ${
        isDep ? 'opacity-70' : ''
      }`}
    >
      <div
        className={`flex-1 h-px ${
          isDep ? 'bg-white/10 border-dashed' : 'bg-purple-500/30'
        }`}
        style={isDep ? { backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 8px)' } : undefined}
      />
      <span
        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
          isDep
            ? 'text-gray-500 border-white/10 bg-white/5'
            : 'text-purple-300 border-purple-500/30 bg-purple-500/10'
        }`}
      >
        {isDep ? `${tierGroup.tierLabel}-Level Dependencies` : `${tierGroup.tierLabel}-Level Calculation`}
      </span>
      <div
        className={`flex-1 h-px ${
          isDep ? 'bg-white/10' : 'bg-purple-500/30'
        }`}
        style={isDep ? { backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 8px)' } : undefined}
      />
    </div>
  );
}

/* ── Ingredient summary panel ── */
function IngredientSummary({
  sourceTables,
}: {
  sourceTables: { layer: string; table: string; fields: string[] }[];
}) {
  if (sourceTables.length === 0) return null;

  return (
    <div className="mb-4 p-3 rounded-lg bg-white/[0.02] border border-white/5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
        All Ingredient Fields
      </p>
      <div className="flex flex-wrap gap-2">
        {sourceTables.map((st) => (
          <div
            key={`${st.layer}.${st.table}`}
            className={`px-2 py-1.5 rounded border text-[10px] ${
              LAYER_COLORS[st.layer]?.bg ?? 'bg-white/5'
            } ${LAYER_COLORS[st.layer]?.border ?? 'border-white/10'}`}
          >
            <span className={`font-bold ${LAYER_COLORS[st.layer]?.text ?? 'text-gray-400'}`}>
              {st.layer}.{st.table}
            </span>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {st.fields.map((f) => (
                <code key={f} className="text-gray-400 font-mono text-[9px]">
                  {f}
                </code>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ── */
interface CalculationWalkthroughProps {
  metricId: string;
  currentDimension: CalculationDimension;
  crossTierResolution: CrossTierResolution;
}

export default function CalculationWalkthrough({
  metricId,
  currentDimension,
  crossTierResolution,
}: CalculationWalkthroughProps) {
  const { tiers, allSourceTables } = crossTierResolution;

  // Flatten steps with global numbering
  const allSteps = useMemo(() => {
    let num = 0;
    return tiers.map((tierGroup) => ({
      ...tierGroup,
      numberedSteps: tierGroup.steps.map((step) => ({
        step,
        number: ++num,
      })),
    }));
  }, [tiers]);

  const totalSteps = allSteps.reduce((acc, t) => acc + t.numberedSteps.length, 0);

  if (totalSteps === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
        <GitBranch className="w-3.5 h-3.5" />
        Step-by-Step Calculation Flow
        <span className="text-[10px] text-gray-600 font-normal ml-1">
          ({totalSteps} steps)
        </span>
      </h2>

      {/* All ingredient fields summary */}
      <IngredientSummary sourceTables={allSourceTables} />

      {/* Step-by-step vertical flow */}
      <div className="relative">
        {/* Vertical connector line */}
        <div
          className="absolute left-[13px] top-4 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent"
          style={{ height: 'calc(100% - 32px)' }}
        />

        {allSteps.map((tierGroup) => (
          <div key={tierGroup.tier}>
            {/* Show tier section header when there are multiple tiers */}
            {allSteps.length > 1 && (
              <TierSectionHeader tierGroup={tierGroup} />
            )}

            {/* Dependency tier left border indicator */}
            <div
              className={
                tierGroup.isDependencyTier
                  ? 'border-l-2 border-dashed border-white/10 ml-[13px] pl-4'
                  : 'ml-0'
              }
            >
              <div className={tierGroup.isDependencyTier ? '-ml-[15px]' : ''}>
                {tierGroup.numberedSteps.map(({ step, number }) => (
                  <StepCard
                    key={`${tierGroup.tier}-${number}`}
                    step={step}
                    stepNumber={number}
                    isDependency={tierGroup.isDependencyTier}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
