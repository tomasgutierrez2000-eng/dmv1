'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDemoEngine, type DemoSideEffects, type GenericDemoStep } from './demo/useDemoEngine';
import DemoOverlay from './demo/DemoOverlay';
import DemoNarrationPanel from './demo/DemoNarrationPanel';
import DemoControlBar from './demo/DemoControlBar';
import {
  COLL_MV_DEMO_STEPS,
  resolveCollMvSelector,
  resolveCollMvField,
  type CollMvVariantKey,
} from './demo/collMvDemoSteps';
import CollMvDemoFormulaAnimation from './demo/CollMvDemoFormulaAnimation';

/* ────────────────────────────────────────────────────────────────────────────
 * CollMvLineageDemo — main orchestrator
 *
 * Portal-rendered to document.body. Composes overlay, narration panel,
 * and control bar. Since Collateral MV has only one variant ("gross"),
 * it auto-selects on mount — no variant picker is shown.
 * ──────────────────────────────────────────────────────────────────────────── */

interface CollMvLineageDemoProps {
  onClose: () => void;
  onSideEffect: (fx: Partial<DemoSideEffects>) => void;
}

export default function CollMvLineageDemo({ onClose, onSideEffect }: CollMvLineageDemoProps) {
  const engine = useDemoEngine<CollMvVariantKey>({
    steps: COLL_MV_DEMO_STEPS,
    resolveSelector: resolveCollMvSelector,
    onClose,
    onSideEffect,
  });

  // Auto-select the single variant on mount (skip variant picker)
  useEffect(() => {
    if (!engine.selectedVariant) {
      engine.selectVariant('gross');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasVariant = engine.selectedVariant !== null;

  // Lock body scroll while demo is active, restore on close
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

      {/* Narration panel */}
      {hasVariant && engine.selectedVariant && (
        <DemoNarrationPanel
          currentStep={engine.currentStep}
          variant={engine.selectedVariant}
          totalSteps={engine.totalSteps}
          steps={COLL_MV_DEMO_STEPS as GenericDemoStep[]}
          resolveField={resolveCollMvField as <T>(field: T | ((v: string) => T), variant: string) => T}
          FormulaAnimation={CollMvDemoFormulaAnimation}
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

  // Portal to body so we sit above all page content
  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
