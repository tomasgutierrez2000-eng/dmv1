'use client';

import React, { useEffect } from 'react';
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
 * and control bar. Single variant ('default') — no variant picker needed.
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

  // Auto-select the single variant on mount
  useEffect(() => {
    if (engine.selectedVariant === null) {
      engine.selectVariant('default');
    }
  }, [engine]);

  // Lock body scroll while demo is active
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const hasVariant = engine.selectedVariant !== null;

  const content = (
    <>
      {/* Spotlight overlay */}
      <DemoOverlay
        targetRect={engine.targetRect}
        isTransitioning={engine.isTransitioning}
        visible={hasVariant}
      />

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
