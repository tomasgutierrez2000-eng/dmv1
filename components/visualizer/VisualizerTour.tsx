'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

const TOUR_STORAGE_KEY = 'visualizer_tour_completed';

const STEPS: { id: string; message: string }[] = [
  { id: 'layers', message: 'Show or hide layers: L1 (raw), L2 (enriched), L3 (metrics).' },
  { id: 'view-presets', message: 'Switch between compact view (dense) and detailed view (more info per table).' },
  { id: 'layout-mode', message: 'Choose layout: domain overview (grouped) or snowflake (centered).' },
  { id: 'relationships', message: 'Show relationship lines and choose primary (FK→PK) or secondary (derived).' },
  { id: 'categories', message: 'Filter tables by category. Check categories to limit which tables appear.' },
  { id: 'l3-categories', message: 'When L3 is on, filter by L3 category (e.g. exposure, risk).' },
  { id: 'search', message: 'Search by table or field name to find and highlight tables.' },
  { id: 'tables-list', message: 'Click a table to select it and see details in the panel.' },
];

function getTargetRect(stepId: string): DOMRect | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(`[data-tour="${stepId}"]`);
  return el ? el.getBoundingClientRect() : null;
}

export function getTourCompleted(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(TOUR_STORAGE_KEY) === 'true';
}

export function setTourCompleted(value: boolean): void {
  if (typeof localStorage === 'undefined') return;
  if (value) localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  else localStorage.removeItem(TOUR_STORAGE_KEY);
}

export function resetTourForReplay(): void {
  setTourCompleted(false);
}

interface VisualizerTourProps {
  /** When true, show the tour (e.g. model is loaded and tour not completed). */
  active: boolean;
  /** Callback when tour is skipped or finished. Can be used to re-check active. */
  onClose?: () => void;
  /** Ensure sidebar is open when tour runs (call setSidebarOpen(true) when tour starts). */
  onStart?: () => void;
}

export default function VisualizerTour({ active, onClose, onStart }: VisualizerTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  const step = STEPS[stepIndex];
  const stepId = step?.id ?? '';
  const isLast = stepIndex === STEPS.length - 1;

  const measure = useCallback(() => {
    const rect = getTargetRect(stepId);
    setTargetRect(rect);
  }, [stepId]);

  const onStartCalledRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!active) {
      onStartCalledRef.current = false;
      return;
    }
    if (!step) return;
    if (!onStartCalledRef.current) {
      onStartCalledRef.current = true;
      onStart?.();
    }
    const t = requestAnimationFrame(() => {
      measure();
    });
    return () => cancelAnimationFrame(t);
  }, [active, step?.id, onStart, measure]);

  useEffect(() => {
    if (!active) return;
    const handleResize = () => measure();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [active, measure]);

  const finish = useCallback(() => {
    setTourCompleted(true);
    onClose?.();
  }, [onClose]);

  const goNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [isLast, finish]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const skipButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, finish]);

  useEffect(() => {
    if (active && mounted) {
      const t = requestAnimationFrame(() => {
        skipButtonRef.current?.focus({ preventScroll: true });
      });
      return () => cancelAnimationFrame(t);
    }
  }, [active, mounted]);

  if (!mounted || !active || typeof document === 'undefined') return null;
  if (typeof document !== 'undefined' && !document.body) return null;

  const rect = targetRect;
  const hasTarget = rect && rect.width > 0 && rect.height > 0;

  const overlay = (
    <div
      className="fixed inset-0 z-[100] pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Visualizer tour"
      aria-describedby="visualizer-tour-step-message"
    >
      {/* Backdrop - dimmed; clicks on backdrop do nothing (user must use Skip/Next) */}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      {/* Highlight cutout around target */}
      {hasTarget && (
        <div
          className="absolute border-2 border-blue-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] pointer-events-none transition-[left,top,width,height] duration-150"
          style={{
            left: rect.x - 4,
            top: rect.y - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}

      {/* Tooltip card with arrow - positioned near target */}
      {(() => {
        const cardW = 320;
        const cardH = 140;
        const pad = 12;
        const arrowW = 12;
        const arrowH = 8;
        let left = typeof window !== 'undefined' ? window.innerWidth / 2 - cardW / 2 : 0;
        let top = typeof window !== 'undefined' ? window.innerHeight / 2 - cardH / 2 : 0;
        let arrowLeft = cardW / 2 - arrowW / 2;
        let arrowTop = -arrowH;
        let arrowRotate = 0;
        if (hasTarget && rect) {
          left = rect.left + rect.width / 2 - cardW / 2;
          top = rect.bottom + pad;
          if (top + cardH > (typeof window !== 'undefined' ? window.innerHeight : 800) - 20) {
            top = rect.top - cardH - pad;
            arrowTop = cardH;
            arrowRotate = 180;
          }
          if (left < 20) left = 20;
          if (typeof window !== 'undefined' && left + cardW > window.innerWidth - 20) left = window.innerWidth - cardW - 20;
        }
        return (
          <div
            className="absolute z-10 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-80 pointer-events-auto"
            style={{ left: Math.round(left), top: Math.round(top) }}
          >
            {hasTarget && (
              <div
                className="absolute w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-white"
                style={{
                  left: arrowLeft,
                  top: arrowTop,
                  transform: `rotate(${arrowRotate}deg)`,
                }}
              />
            )}
            <p id="visualizer-tour-step-message" className="text-sm text-gray-800 mb-4">{step?.message}</p>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">
                {stepIndex + 1} of {STEPS.length}
              </span>
              <div className="flex gap-2">
                <button
                  ref={skipButtonRef}
                  type="button"
                  onClick={skip}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Skip tour"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  aria-label={isLast ? 'Finish tour' : 'Next step'}
                >
                  {isLast ? 'Done' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  return portalTarget ? createPortal(overlay, portalTarget) : null;
}
