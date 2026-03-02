'use client';

import React, { useRef, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import type { GenericDemoStep } from './useDemoEngine';

/* ────────────────────────────────────────────────────────────────────────────
 * DemoNarrationPanel — fixed right-side panel with narration, formulas, insights
 *
 * 340px wide, stretches from top to 72px above bottom (control bar).
 * Content fades in/out on step changes via key-driven remounting.
 *
 * Generic: accepts steps + resolveField so it works for any metric demo.
 * ──────────────────────────────────────────────────────────────────────────── */

interface DemoNarrationPanelProps {
  currentStep: number;
  variant: string;
  totalSteps: number;
  steps: GenericDemoStep[];
  resolveField: <T>(field: T | ((v: string) => T), variant: string) => T;
  /** Optional formula animation component — receives formulaKey, variant, stepIndex */
  FormulaAnimation?: React.ComponentType<{ formulaKey: string; variant: string; stepIndex: number }>;
}

/** Phase color mapping */
const PHASE_COLORS: Record<number, string> = {
  1: 'text-gray-400',
  2: 'text-blue-400',
  3: 'text-amber-400',
  4: 'text-emerald-400',
  5: 'text-red-400',
  6: 'text-pink-400',
};

const PHASE_BG: Record<number, string> = {
  1: 'bg-gray-500/10',
  2: 'bg-blue-500/10',
  3: 'bg-amber-500/10',
  4: 'bg-emerald-500/10',
  5: 'bg-red-500/10',
  6: 'bg-pink-500/10',
};

export default function DemoNarrationPanel({
  currentStep,
  variant,
  totalSteps,
  steps,
  resolveField,
  FormulaAnimation,
}: DemoNarrationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll narration content to top when step changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [currentStep]);

  const step = steps[currentStep];
  if (!step) return null;

  const title = resolveField(step.title, variant);
  const narration = resolveField(step.narration, variant);
  const insight = step.insight ? resolveField(step.insight, variant) : null;
  const phaseColor = PHASE_COLORS[step.phase] || 'text-gray-400';
  const phaseBg = PHASE_BG[step.phase] || 'bg-gray-500/10';

  return (
    <div className="fixed top-0 right-0 bottom-[72px] w-[340px] z-[52] bg-[#0a0a0a]/95 backdrop-blur-xl border-l border-gray-800 flex flex-col">
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${phaseColor} ${phaseBg}`}
          >
            {step.phaseLabel}
          </span>
        </div>
        <div className="text-[10px] text-gray-600 font-mono">
          Step {currentStep} of {totalSteps - 1}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4" key={currentStep}>
        <div className="animate-fade-in space-y-4">
          {/* Title */}
          <h3 className="text-base font-bold text-white leading-tight">{title}</h3>

          {/* Narration */}
          <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
            {narration}
          </div>

          {/* Formula animation */}
          {step.formulaKey && FormulaAnimation && (
            <FormulaAnimation
              formulaKey={step.formulaKey}
              variant={variant}
              stepIndex={currentStep}
            />
          )}

          {/* Insight callout */}
          {insight && (
            <div className="rounded-xl border border-pwc-orange/30 bg-pwc-orange/5 px-4 py-3 flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-pwc-orange/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5 text-pwc-orange" />
              </div>
              <div className="text-xs text-gray-300 leading-relaxed">{insight}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Keyboard hints ── */}
      <div className="px-5 py-3 border-t border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3 text-[9px] text-gray-600">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-gray-800 font-mono">&rarr;</kbd> Next
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-gray-800 font-mono">&larr;</kbd> Prev
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-gray-800 font-mono">Esc</kbd> Close
          </span>
        </div>
      </div>

      {/* Fade-in animation style */}
      <style jsx>{`
        .animate-fade-in {
          animation: demoFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes demoFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
