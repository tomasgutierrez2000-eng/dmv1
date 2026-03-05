'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDemoEngine, type DemoSideEffects, type GenericDemoStep } from './demo/useDemoEngine';
import DemoOverlay from './demo/DemoOverlay';
import DemoNarrationPanel from './demo/DemoNarrationPanel';
import DemoControlBar from './demo/DemoControlBar';
import {
  ALLOC_PCT_DEMO_STEPS,
  resolveAllocPctSelector,
  resolveAllocPctField,
  type AllocPctVariantKey,
} from './demo/allocPctDemoSteps';
import AllocPctDemoFormulaAnimation from './demo/AllocPctDemoFormulaAnimation';

/* ────────────────────────────────────────────────────────────────────────────
 * AllocPctLineageDemo — main orchestrator
 *
 * Portal-rendered to document.body. Composes overlay, narration panel,
 * and control bar. Has two variants ('legal', 'economic') so it shows
 * the variant picker in the welcome phase.
 * ──────────────────────────────────────────────────────────────────────────── */

interface AllocPctLineageDemoProps {
  onClose: () => void;
  onSideEffect: (fx: Partial<DemoSideEffects>) => void;
}

export default function AllocPctLineageDemo({ onClose, onSideEffect }: AllocPctLineageDemoProps) {
  const engine = useDemoEngine<AllocPctVariantKey>({
    steps: ALLOC_PCT_DEMO_STEPS,
    resolveSelector: resolveAllocPctSelector,
    onClose,
    onSideEffect,
  });

  const hasVariant = engine.selectedVariant !== null;

  // Lock body scroll while demo is active
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const content = (
    <>
      {/* Spotlight overlay */}
      <DemoOverlay
        targetRect={engine.targetRect}
        isTransitioning={engine.isTransitioning}
        visible={hasVariant}
      />

      {/* Variant picker — shown during welcome step (step 0) when no variant selected */}
      {!hasVariant && (
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/80">
          <div className="bg-[#111] border border-gray-700 rounded-2xl p-8 max-w-lg mx-4 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Choose a Variant</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Counterparty Allocation % has two views. Pick one to start the guided walkthrough.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => engine.selectVariant('legal')}
                className="text-left p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors"
              >
                <div className="text-sm font-bold text-cyan-300 mb-1">Legal Participation %</div>
                <div className="text-xs text-gray-400">Contractual share from the loan syndication agreement. Directly sourced — no calculation.</div>
              </button>
              <button
                onClick={() => engine.selectVariant('economic')}
                className="text-left p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors"
              >
                <div className="text-sm font-bold text-cyan-300 mb-1">Economic Allocation %</div>
                <div className="text-xs text-gray-400">Effective exposure share after credit risk mitigation (CDS, sub-participations, guarantees).</div>
              </button>
            </div>
            <button
              onClick={engine.closeDemo}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Narration panel */}
      {hasVariant && engine.selectedVariant && (
        <DemoNarrationPanel
          currentStep={engine.currentStep}
          variant={engine.selectedVariant}
          totalSteps={engine.totalSteps}
          steps={ALLOC_PCT_DEMO_STEPS as GenericDemoStep[]}
          resolveField={resolveAllocPctField as <T>(field: T | ((v: string) => T), variant: string) => T}
          FormulaAnimation={AllocPctDemoFormulaAnimation}
        />
      )}

      {/* Control bar */}
      <DemoControlBar
        currentStep={engine.currentStep}
        totalSteps={engine.totalSteps}
        hasVariant={hasVariant}
        onPrev={engine.goPrev}
        onNext={engine.goNext}
        onRestart={engine.restart}
        onClose={engine.closeDemo}
      />
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
