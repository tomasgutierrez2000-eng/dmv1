'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDemoEngine, type DemoSideEffects, type GenericDemoStep } from './demo/useDemoEngine';
import DemoOverlay from './demo/DemoOverlay';
import DemoNarrationPanel from './demo/DemoNarrationPanel';
import DemoControlBar from './demo/DemoControlBar';
import LTVDemoVariantPicker from './demo/LTVDemoVariantPicker';
import { LTV_DEMO_STEPS, resolveSelector, resolveField, type LTVVariantKey } from './demo/ltvDemoSteps';
import LTVDemoFormulaAnimation from './demo/LTVDemoFormulaAnimation';

/* ────────────────────────────────────────────────────────────────────────────
 * LTVLineageDemo — main orchestrator
 *
 * Portal-rendered to document.body. Composes overlay, narration panel,
 * control bar, and variant picker. Communicates side-effects (expand
 * rollup level, set L2 filter) back to the parent via onSideEffect.
 * ──────────────────────────────────────────────────────────────────────────── */

interface LTVLineageDemoProps {
  onClose: () => void;
  onSideEffect: (fx: Partial<DemoSideEffects>) => void;
}

/** Map LTV's l2Filter onEnter value to variant-specific value */
function ltvResolveL2Filter(enterFilter: string, variant: LTVVariantKey): string {
  if (enterFilter === 'standard') return variant;
  return enterFilter;
}

export default function LTVLineageDemo({ onClose, onSideEffect }: LTVLineageDemoProps) {
  const engine = useDemoEngine<LTVVariantKey>({
    steps: LTV_DEMO_STEPS,
    resolveSelector,
    onClose,
    onSideEffect,
    defaultL2Filter: 'both',
    resolveL2Filter: ltvResolveL2Filter,
  });

  const showVariantPicker = engine.currentStep === 0 && !engine.selectedVariant;
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
      {/* Variant picker modal */}
      {showVariantPicker && (
        <LTVDemoVariantPicker
          onSelect={engine.selectVariant}
          onClose={engine.closeDemo}
        />
      )}

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
          steps={LTV_DEMO_STEPS as GenericDemoStep[]}
          resolveField={resolveField}
          FormulaAnimation={LTVDemoFormulaAnimation}
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
