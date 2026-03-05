'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDemoEngine, type DemoSideEffects, type GenericDemoStep } from './demo/useDemoEngine';
import DemoOverlay from './demo/DemoOverlay';
import DemoNarrationPanel from './demo/DemoNarrationPanel';
import DemoControlBar from './demo/DemoControlBar';
import {
  EXCPN_RT_DEMO_STEPS,
  resolveExcpnRtSelector,
  resolveExcpnRtField,
  type ExcpnRtVariantKey,
} from './demo/excpnRtDemoSteps';
import ExceptionRateDemoFormulaAnimation from './demo/ExceptionRateDemoFormulaAnimation';

/* ────────────────────────────────────────────────────────────────────────────
 * ExceptionRateLineageDemo — main orchestrator
 *
 * Portal-rendered to document.body. Composes overlay, narration panel,
 * and control bar. Auto-selects the "all_exceptions" variant on mount
 * (the lineage view shows both variants side-by-side so the user can
 * see the data; the demo walks through the selected variant's narration).
 * ──────────────────────────────────────────────────────────────────────────── */

interface ExceptionRateLineageDemoProps {
  onClose: () => void;
  onSideEffect: (fx: Partial<DemoSideEffects>) => void;
}

export default function ExceptionRateLineageDemo({ onClose, onSideEffect }: ExceptionRateLineageDemoProps) {
  const engine = useDemoEngine<ExcpnRtVariantKey>({
    steps: EXCPN_RT_DEMO_STEPS,
    resolveSelector: resolveExcpnRtSelector,
    onClose,
    onSideEffect,
  });

  // Auto-select the "all_exceptions" variant on mount (no variant picker)
  useEffect(() => {
    if (!engine.selectedVariant) {
      engine.selectVariant('all_exceptions');
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
          steps={EXCPN_RT_DEMO_STEPS as GenericDemoStep[]}
          resolveField={resolveExcpnRtField as <T>(field: T | ((v: string) => T), variant: string) => T}
          FormulaAnimation={ExceptionRateDemoFormulaAnimation}
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
