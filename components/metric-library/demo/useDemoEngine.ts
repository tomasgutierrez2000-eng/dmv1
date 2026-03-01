'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/* ────────────────────────────────────────────────────────────────────────────
 * useDemoEngine — generic state management & scroll/measure logic for
 * lineage demos (DSCR, LTV, etc.)
 *
 * Accepts steps + resolveSelector as parameters so the same engine can
 * drive any metric's demo.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Generic step shape — variant-aware fields use string union V */
export interface GenericDemoStep<V extends string = string> {
  id: string;
  phase: number;
  phaseLabel: string;
  title: string | ((v: V) => string);
  narration: string | ((v: V) => string);
  targetSelector: string;
  highlightSelector?: string;
  insight?: string | ((v: V) => string);
  formulaKey?: string;
  onEnter?: {
    expandLevel?: string | null;
    l2Filter?: string;
  };
}

export interface DemoEngineState<V extends string = string> {
  currentStep: number;
  selectedVariant: V | null;
  targetRect: DOMRect | null;
  isTransitioning: boolean;
  totalSteps: number;
}

export interface DemoEngineActions<V extends string = string> {
  selectVariant: (v: V) => void;
  goNext: () => void;
  goPrev: () => void;
  goToStep: (n: number) => void;
  restart: () => void;
  closeDemo: () => void;
}

export interface DemoSideEffects {
  expandLevel: string | null;
  l2Filter: string;
}

interface UseDemoEngineProps<V extends string = string> {
  steps: GenericDemoStep<V>[];
  resolveSelector: (selector: string, variant: V) => string;
  onClose: () => void;
  onSideEffect: (fx: Partial<DemoSideEffects>) => void;
  /** Default l2Filter value used on restart/close (default: 'both') */
  defaultL2Filter?: string;
  /** Map variant-specific l2Filter overrides when onEnter.l2Filter is set.
   *  If not provided, the raw onEnter.l2Filter value is used as-is. */
  resolveL2Filter?: (enterFilter: string, variant: V) => string;
}

export function useDemoEngine<V extends string = string>({
  steps,
  resolveSelector: resolveSel,
  onClose,
  onSideEffect,
  defaultL2Filter = 'both',
  resolveL2Filter,
}: UseDemoEngineProps<V>): DemoEngineState<V> & DemoEngineActions<V> {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<V | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const measureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);

  const totalSteps = steps.length;

  /* ── measure target rect ───────────────────────────────────────────────── */

  const measureTarget = useCallback(
    (stepIndex: number, variant: V | null) => {
      const step = steps[stepIndex];
      if (!step || !variant) {
        setTargetRect(null);
        return;
      }

      const selector = resolveSel(step.targetSelector, variant);
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
    [steps, resolveSel],
  );

  /* ── scroll to target & measure ────────────────────────────────────────── */

  const scrollAndMeasure = useCallback(
    (stepIndex: number, variant: V | null) => {
      setIsTransitioning(true);
      const step = steps[stepIndex];
      if (!step || !variant) {
        setIsTransitioning(false);
        return;
      }

      // Apply side-effects first (expand rollup level, set L2 filter)
      if (step.onEnter) {
        const fx: Partial<DemoSideEffects> = {};
        if (step.onEnter.expandLevel !== undefined) fx.expandLevel = step.onEnter.expandLevel;
        if (step.onEnter.l2Filter !== undefined) {
          fx.l2Filter = resolveL2Filter
            ? resolveL2Filter(step.onEnter.l2Filter, variant)
            : step.onEnter.l2Filter;
        }
        onSideEffect(fx);
      }

      // Small delay to let React re-render side effects (e.g., expand level)
      if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
      measureTimerRef.current = setTimeout(() => {
        const selector = resolveSel(step.targetSelector, variant);
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
    [steps, resolveSel, measureTarget, onSideEffect, resolveL2Filter],
  );

  /* ── actions ───────────────────────────────────────────────────────────── */

  const selectVariant = useCallback(
    (v: V) => {
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
    onSideEffect({ expandLevel: null, l2Filter: defaultL2Filter });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [onSideEffect, defaultL2Filter]);

  const closeDemo = useCallback(() => {
    onSideEffect({ expandLevel: null, l2Filter: defaultL2Filter });
    onClose();
  }, [onClose, onSideEffect, defaultL2Filter]);

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
