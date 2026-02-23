'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDemoEngine, type DemoSideEffects } from './demo/useDemoEngine';
import DemoOverlay from './demo/DemoOverlay';
import DemoNarrationPanel from './demo/DemoNarrationPanel';
import DemoControlBar from './demo/DemoControlBar';
import DemoVariantPicker from './demo/DemoVariantPicker';

/* ────────────────────────────────────────────────────────────────────────────
 * DSCRLineageDemo — main orchestrator
 *
 * Portal-rendered to document.body. Composes overlay, narration panel,
 * control bar, and variant picker. Communicates side-effects (expand
 * rollup level, set L2 filter) back to the parent via onSideEffect.
 * ──────────────────────────────────────────────────────────────────────────── */

interface DSCRLineageDemoProps {
  onClose: () => void;
  onSideEffect: (fx: Partial<DemoSideEffects>) => void;
}

export default function DSCRLineageDemo({ onClose, onSideEffect }: DSCRLineageDemoProps) {
  const engine = useDemoEngine({ onClose, onSideEffect });

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
        <DemoVariantPicker
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
        />
      )}

      {/* Control bar — full-width when variant picker is showing, offset when narration panel is visible */}
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
