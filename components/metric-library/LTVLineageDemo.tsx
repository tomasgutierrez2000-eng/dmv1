'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLTVDemoEngine, type LTVDemoSideEffects } from './ltv-demo/useLTVDemoEngine';
import DemoOverlay from './demo/DemoOverlay';
import LTVDemoNarrationPanel from './ltv-demo/LTVDemoNarrationPanel';
import DemoControlBar from './demo/DemoControlBar';

/* ────────────────────────────────────────────────────────────────────────────
 * LTVLineageDemo — main orchestrator
 *
 * Portal-rendered to document.body. Composes overlay, narration panel,
 * and control bar. No variant picker — LTV has a single formula.
 * ──────────────────────────────────────────────────────────────────────────── */

interface LTVLineageDemoProps {
  onClose: () => void;
  onSideEffect: (fx: Partial<LTVDemoSideEffects>) => void;
}

export default function LTVLineageDemo({ onClose, onSideEffect }: LTVLineageDemoProps) {
  const engine = useLTVDemoEngine({ onClose, onSideEffect });

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
        visible={true}
      />

      {/* Narration panel */}
      <LTVDemoNarrationPanel
        currentStep={engine.currentStep}
        totalSteps={engine.totalSteps}
      />

      {/* Control bar — hasVariant is always true (no variant picker) */}
      <DemoControlBar
        currentStep={engine.currentStep}
        totalSteps={engine.totalSteps}
        hasVariant={true}
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
