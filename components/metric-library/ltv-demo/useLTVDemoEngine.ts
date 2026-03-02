'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { LTV_DEMO_STEPS } from './ltvDemoSteps';

/* ────────────────────────────────────────────────────────────────────────────
 * useLTVDemoEngine — state management & scroll/measure logic for the LTV demo
 *
 * Simplified from the DSCR engine: no VariantKey, no variant picker step.
 * Step 0 is the welcome, step 1+ are the walkthrough.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface LTVDemoSideEffects {
  expandLevel: string | null;
  activeTable: string | null;
}

export interface LTVDemoEngineState {
  currentStep: number;
  targetRect: DOMRect | null;
  isTransitioning: boolean;
  totalSteps: number;
}

export interface LTVDemoEngineActions {
  goNext: () => void;
  goPrev: () => void;
  goToStep: (n: number) => void;
  restart: () => void;
  closeDemo: () => void;
}

interface UseLTVDemoEngineProps {
  onClose: () => void;
  onSideEffect: (fx: Partial<LTVDemoSideEffects>) => void;
}

export function useLTVDemoEngine({
  onClose,
  onSideEffect,
}: UseLTVDemoEngineProps): LTVDemoEngineState & LTVDemoEngineActions {
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

    const el = document.querySelector(step.targetSelector);
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

      // Apply side-effects
      if (step.onEnter) {
        const fx: Partial<LTVDemoSideEffects> = {};
        if (step.onEnter.expandLevel !== undefined) fx.expandLevel = step.onEnter.expandLevel;
        if (step.onEnter.activeTable !== undefined) fx.activeTable = step.onEnter.activeTable;
        onSideEffect(fx);
      }

      // Small delay to let React re-render side effects
      if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
      measureTimerRef.current = setTimeout(() => {
        const el = document.querySelector(step.targetSelector);
        if (el) {
          const prev = document.body.style.overflow;
          document.body.style.overflow = '';
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  /* ── initial measure on mount ────────────────────────────────────────── */

  useEffect(() => {
    // Measure step 0 on mount
    scrollAndMeasure(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── actions ─────────────────────────────────────────────────────────── */

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
    onSideEffect({ expandLevel: null, activeTable: null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Re-measure after scroll
    setTimeout(() => scrollAndMeasure(0), 600);
  }, [onSideEffect, scrollAndMeasure]);

  const closeDemo = useCallback(() => {
    onSideEffect({ expandLevel: null, activeTable: null });
    onClose();
  }, [onClose, onSideEffect]);

  /* ── re-measure on scroll/resize ─────────────────────────────────────── */

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

  /* ── keyboard navigation ─────────────────────────────────────────────── */

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

  /* ── cleanup ─────────────────────────────────────────────────────────── */

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
