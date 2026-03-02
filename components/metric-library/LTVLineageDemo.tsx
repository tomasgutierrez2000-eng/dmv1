'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import DemoOverlay from './demo/DemoOverlay';
import DemoControlBar from './demo/DemoControlBar';
import LTVDemoNarrationPanel from './ltv-demo/LTVDemoNarrationPanel';
import { LTV_DEMO_STEPS, resolveSelector } from './ltv-demo/ltvDemoSteps';

/* ────────────────────────────────────────────────────────────────────────────
 * LTVLineageDemo — main orchestrator for the LTV guided demo
 *
 * Simplified vs DSCR: no variant picker since LTV has a single formula.
 * Portal-rendered to document.body. Composes overlay, narration panel,
 * and control bar. Communicates side-effects (expand rollup level)
 * back to the parent via onSideEffect.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface LTVDemoSideEffects {
  expandLevel: string | null;
}

interface LTVLineageDemoProps {
  onClose: () => void;
  onSideEffect: (fx: Partial<LTVDemoSideEffects>) => void;
}

/* ── useLTVDemoEngine — simplified demo engine (no variant) ──────────────── */

function useLTVDemoEngine({ onClose, onSideEffect }: LTVLineageDemoProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const measureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);

  const totalSteps = LTV_DEMO_STEPS.length;

  /* ── measure target rect ───────────────────────────────────────────────── */

  const measureTarget = useCallback((stepIndex: number) => {
    const step = LTV_DEMO_STEPS[stepIndex];
    if (!step) {
      setTargetRect(null);
      return;
    }

    const selector = resolveSelector(step.targetSelector);
    const el = document.querySelector(selector);
    if (!el) {
      setTargetRect(null);
      setIsTransitioning(false);
      return;
    }

    rafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      setIsTransitioning(false);
    });
  }, []);

  /* ── scroll to target & measure ────────────────────────────────────────── */

  const scrollAndMeasure = useCallback(
    (stepIndex: number) => {
      setIsTransitioning(true);
      const step = LTV_DEMO_STEPS[stepIndex];
      if (!step) {
        setIsTransitioning(false);
        return;
      }

      // Apply side-effects first (expand rollup level)
      if (step.onEnter) {
        const fx: Partial<LTVDemoSideEffects> = {};
        if (step.onEnter.expandLevel !== undefined) fx.expandLevel = step.onEnter.expandLevel;
        onSideEffect(fx);
      }

      // Small delay to let React re-render side effects
      if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
      measureTimerRef.current = setTimeout(() => {
        const selector = resolveSelector(step.targetSelector);
        const el = document.querySelector(selector);
        if (el) {
          // Temporarily allow scroll for programmatic scrollIntoView
          const prev = document.body.style.overflow;
          document.body.style.overflow = '';
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Re-lock after scroll starts
          requestAnimationFrame(() => {
            document.body.style.overflow = prev || 'hidden';
          });
        }
        // Wait for scroll to settle
        measureTimerRef.current = setTimeout(() => {
          measureTarget(stepIndex);
        }, 600);
      }, 120);
    },
    [measureTarget, onSideEffect],
  );

  /* ── actions ───────────────────────────────────────────────────────────── */

  const goNext = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, totalSteps - 1);
      if (next !== prev) scrollAndMeasure(next);
      return next;
    });
  }, [scrollAndMeasure, totalSteps]);

  const goPrev = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.max(prev - 1, 0);
      if (next !== prev) scrollAndMeasure(next);
      return next;
    });
  }, [scrollAndMeasure]);

  const goToStep = useCallback(
    (n: number) => {
      const clamped = Math.max(0, Math.min(n, totalSteps - 1));
      setCurrentStep(clamped);
      scrollAndMeasure(clamped);
    },
    [scrollAndMeasure, totalSteps],
  );

  const restart = useCallback(() => {
    setCurrentStep(0);
    setTargetRect(null);
    onSideEffect({ expandLevel: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [onSideEffect]);

  const closeDemo = useCallback(() => {
    onSideEffect({ expandLevel: null });
    onClose();
  }, [onClose, onSideEffect]);

  /* ── initial measure on mount ───────────────────────────────────────────── */

  useEffect(() => {
    // Start measuring step 0 after mount
    const t = setTimeout(() => scrollAndMeasure(0), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── re-measure on scroll/resize ───────────────────────────────────────── */

  useEffect(() => {
    let ticking = false;
    const handleUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        measureTarget(currentStep);
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [currentStep, measureTarget]);

  /* ── keyboard navigation ───────────────────────────────────────────────── */

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeDemo();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, closeDemo]);

  /* ── cleanup ───────────────────────────────────────────────────────────── */

  useEffect(() => {
    return () => {
      if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    currentStep,
    targetRect,
    isTransitioning,
    totalSteps,
    goNext,
    goPrev,
    goToStep,
    restart,
    closeDemo,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */

export default function LTVLineageDemo({ onClose, onSideEffect }: LTVLineageDemoProps) {
  const engine = useLTVDemoEngine({ onClose, onSideEffect });

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
        visible={true}
      />

      {/* Narration panel */}
      <LTVDemoNarrationPanel
        currentStep={engine.currentStep}
        totalSteps={engine.totalSteps}
      />

      {/* Control bar — offset by 340px for narration panel */}
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

  // Portal to body so we sit above all page content
  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
