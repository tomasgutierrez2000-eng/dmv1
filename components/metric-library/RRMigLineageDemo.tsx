'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDemoEngine, type DemoSideEffects, type GenericDemoStep } from './demo/useDemoEngine';
import DemoOverlay from './demo/DemoOverlay';
import DemoNarrationPanel from './demo/DemoNarrationPanel';
import DemoControlBar from './demo/DemoControlBar';
import {
  RR_MIG_DEMO_STEPS,
  resolveRRMigSelector,
  resolveRRMigField,
  type RRMigVariantKey,
} from './demo/rrMigDemoSteps';
import RRMigDemoFormulaAnimation from './demo/RRMigDemoFormulaAnimation';

/* ────────────────────────────────────────────────────────────────────────────
 * RRMigLineageDemo — main orchestrator
 *
 * Portal-rendered to document.body. Composes overlay, narration panel,
 * and control bar. Since Risk Rating Migration has only one variant
 * ("weighted"), it auto-selects on mount — no variant picker is shown.
 * ──────────────────────────────────────────────────────────────────────────── */

interface RRMigLineageDemoProps {
  onClose: () => void;
  onSideEffect: (fx: Partial<DemoSideEffects>) => void;
}

export default function RRMigLineageDemo({ onClose, onSideEffect }: RRMigLineageDemoProps) {
  const engine = useDemoEngine<RRMigVariantKey>({
    steps: RR_MIG_DEMO_STEPS,
    resolveSelector: resolveRRMigSelector,
    onClose,
    onSideEffect,
  });

  // Auto-select the single variant on mount (skip variant picker)
  useEffect(() => {
    if (!engine.selectedVariant) {
      engine.selectVariant('weighted');
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
          steps={RR_MIG_DEMO_STEPS as GenericDemoStep[]}
          resolveField={resolveRRMigField as <T>(field: T | ((v: string) => T), variant: string) => T}
          FormulaAnimation={RRMigDemoFormulaAnimation}
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
