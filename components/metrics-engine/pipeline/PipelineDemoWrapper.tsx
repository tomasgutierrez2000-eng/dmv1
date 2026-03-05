'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { CalculationDimension } from '@/data/l3-metrics';
import DSCRPipelineView from './DSCRPipelineView';
import { useDemoEngine } from '@/components/metric-library/demo/useDemoEngine';
import type { DemoSideEffects } from '@/components/metric-library/demo/useDemoEngine';
import DemoOverlay from '@/components/metric-library/demo/DemoOverlay';
import DemoNarrationPanel from '@/components/metric-library/demo/DemoNarrationPanel';
import DemoControlBar from '@/components/metric-library/demo/DemoControlBar';
import { buildPipelineDemoSteps, resolvePipelineSelector } from './PipelineDemoSteps';

/* ═══════════════════════════════════════════════════════════════════════════
 * PipelineDemoWrapper — manages the optional step-by-step demo overlay
 * on top of DSCRPipelineView.
 *
 * Follows the DSCRLineageWithDemo.tsx pattern.
 * ═══════════════════════════════════════════════════════════════════════════ */

interface PipelineDemoWrapperProps {
  onBack: () => void;
}

export default function PipelineDemoWrapper({ onBack }: PipelineDemoWrapperProps) {
  const [demoActive, setDemoActive] = useState(false);
  const [demoDimension, setDemoDimension] = useState<CalculationDimension>('facility');

  // Build steps for the chosen dimension
  const demoSteps = useMemo(() => buildPipelineDemoSteps(demoDimension), [demoDimension]);

  const handleClose = useCallback(() => {
    setDemoActive(false);
    // Unlock body scroll
    document.body.style.overflow = '';
  }, []);

  const handleSideEffect = useCallback((_fx: Partial<DemoSideEffects>) => {
    // No side effects needed for pipeline demo
  }, []);

  const resolveField = useCallback(<T,>(field: T | ((v: string) => T), variant: string): T => {
    return typeof field === 'function' ? (field as (v: string) => T)(variant) : field;
  }, []);

  const demo = useDemoEngine<CalculationDimension>({
    steps: demoSteps,
    resolveSelector: resolvePipelineSelector,
    onClose: handleClose,
    onSideEffect: handleSideEffect,
  });

  const handleStartDemo = useCallback(() => {
    setDemoActive(true);
    // Auto-select the current dimension as the "variant" to kick off the demo
    // Small delay to let the overlay render first
    setTimeout(() => {
      demo.selectVariant(demoDimension);
    }, 100);
  }, [demo, demoDimension]);

  // Extract active step's target for pipeline highlighting
  const activeStepId = demoActive && demo.currentStep > 0
    ? demoSteps[demo.currentStep]?.id?.replace('step-', '').replace('table-', '') ?? null
    : null;

  return (
    <>
      <DSCRPipelineView
        onBack={onBack}
        onStartDemo={handleStartDemo}
        activeStepId={demoActive ? activeStepId : null}
      />

      {/* Demo overlay */}
      {demoActive && (
        <>
          <DemoOverlay
            targetRect={demo.targetRect}
            isTransitioning={demo.isTransitioning}
            visible={demo.currentStep > 0}
          />

          <DemoNarrationPanel
            currentStep={demo.currentStep}
            variant={demoDimension}
            totalSteps={demo.totalSteps}
            steps={demoSteps as unknown as import('@/components/metric-library/demo/useDemoEngine').GenericDemoStep[]}
            resolveField={resolveField}
          />

          <DemoControlBar
            currentStep={demo.currentStep}
            totalSteps={demo.totalSteps}
            hasVariant={demo.selectedVariant !== null}
            onPrev={demo.goPrev}
            onNext={demo.goNext}
            onRestart={demo.restart}
            onClose={demo.closeDemo}
          />
        </>
      )}
    </>
  );
}
