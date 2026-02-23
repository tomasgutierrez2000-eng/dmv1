'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DEMO_STEPS, resolveSelector, type VariantKey } from './demoSteps';

/* ────────────────────────────────────────────────────────────────────────────
 * useDemoEngine — state management & scroll/measure logic for the DSCR demo
 * ──────────────────────────────────────────────────────────────────────────── */

export interface DemoEngineState {
  currentStep: number;
  selectedVariant: VariantKey | null;
  targetRect: DOMRect | null;
  isTransitioning: boolean;
  totalSteps: number;
}

export interface DemoEngineActions {
  selectVariant: (v: VariantKey) => void;
  goNext: () => void;
  goPrev: () => void;
  goToStep: (n: number) => void;
  restart: () => void;
  closeDemo: () => void;
}

export interface DemoSideEffects {
  expandLevel: string | null;
  l2Filter: 'both' | 'CRE' | 'CI';
}

interface UseDemoEngineProps {
  onClose: () => void;
  onSideEffect: (fx: Partial<DemoSideEffects>) => void;
}

export function useDemoEngine({ onClose, onSideEffect }: UseDemoEngineProps): DemoEngineState & DemoEngineActions {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<VariantKey | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const measureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);

  const totalSteps = DEMO_STEPS.length;

  /* ── measure target rect ───────────────────────────────────────────────── */

  const measureTarget = useCallback(
    (stepIndex: number, variant: VariantKey | null) => {
      const step = DEMO_STEPS[stepIndex];
      if (!step || !variant) {
        setTargetRect(null);
        return;
      }

      const selector = resolveSelector(step.targetSelector, variant);
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
    },
    [],
  );

  /* ── scroll to target & measure ────────────────────────────────────────── */

  const scrollAndMeasure = useCallback(
    (stepIndex: number, variant: VariantKey | null) => {
      setIsTransitioning(true);
      const step = DEMO_STEPS[stepIndex];
      if (!step || !variant) {
        setIsTransitioning(false);
        return;
      }

      // Apply side-effects first (expand rollup level, set L2 filter)
      if (step.onEnter) {
        const fx: Partial<DemoSideEffects> = {};
        if (step.onEnter.expandLevel !== undefined) fx.expandLevel = step.onEnter.expandLevel;
        if (step.onEnter.l2Filter !== undefined) {
          // Override with variant-specific filter for L2 step
          fx.l2Filter = step.onEnter.l2Filter === 'CRE' ? (variant === 'CRE' ? 'CRE' : 'CI') : step.onEnter.l2Filter;
        }
        onSideEffect(fx);
      }

      // Small delay to let React re-render side effects (e.g., expand level)
      if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
      measureTimerRef.current = setTimeout(() => {
        const selector = resolveSelector(step.targetSelector, variant);
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
          measureTarget(stepIndex, variant);
        }, 600);
      }, 120);
    },
    [measureTarget, onSideEffect],
  );

  /* ── actions ───────────────────────────────────────────────────────────── */

  const selectVariant = useCallback(
    (v: VariantKey) => {
      setSelectedVariant(v);
      setCurrentStep(1);
      scrollAndMeasure(1, v);
    },
    [scrollAndMeasure],
  );

  const goNext = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.min(prev + 1, totalSteps - 1);
      if (next !== prev) scrollAndMeasure(next, selectedVariant);
      return next;
    });
  }, [selectedVariant, scrollAndMeasure, totalSteps]);

  const goPrev = useCallback(() => {
    setCurrentStep((prev) => {
      const next = Math.max(prev - 1, 1); // don't go back to variant picker
      if (next !== prev) scrollAndMeasure(next, selectedVariant);
      return next;
    });
  }, [selectedVariant, scrollAndMeasure]);

  const goToStep = useCallback(
    (n: number) => {
      const clamped = Math.max(1, Math.min(n, totalSteps - 1));
      setCurrentStep(clamped);
      scrollAndMeasure(clamped, selectedVariant);
    },
    [selectedVariant, scrollAndMeasure, totalSteps],
  );

  const restart = useCallback(() => {
    setCurrentStep(0);
    setSelectedVariant(null);
    setTargetRect(null);
    onSideEffect({ expandLevel: null, l2Filter: 'both' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [onSideEffect]);

  const closeDemo = useCallback(() => {
    onSideEffect({ expandLevel: null, l2Filter: 'both' });
    onClose();
  }, [onClose, onSideEffect]);

  /* ── re-measure on scroll/resize ───────────────────────────────────────── */

  useEffect(() => {
    if (!selectedVariant || currentStep === 0) return;

    let ticking = false;
    const handleUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        measureTarget(currentStep, selectedVariant);
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [currentStep, selectedVariant, measureTarget]);

  /* ── keyboard navigation ───────────────────────────────────────────────── */

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (selectedVariant) goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (selectedVariant) goPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeDemo();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, closeDemo, selectedVariant]);

  /* ── cleanup ───────────────────────────────────────────────────────────── */

  useEffect(() => {
    return () => {
      if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return {
    currentStep,
    selectedVariant,
    targetRect,
    isTransitioning,
    totalSteps,
    selectVariant,
    goNext,
    goPrev,
    goToStep,
    restart,
    closeDemo,
  };
}
