'use client';

import React from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
 * DemoControlBar — floating bottom navigation bar
 *
 * Fixed at the bottom of the viewport, offset right by the narration panel
 * width. Contains close, progress bar, step counter, restart, prev, next.
 * ──────────────────────────────────────────────────────────────────────────── */

interface DemoControlBarProps {
  currentStep: number;
  totalSteps: number;
  hasVariant: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRestart: () => void;
  onClose: () => void;
}

export default function DemoControlBar({
  currentStep,
  totalSteps,
  hasVariant,
  onPrev,
  onNext,
  onRestart,
  onClose,
}: DemoControlBarProps) {
  const isFirst = currentStep <= 1;
  const isLast = currentStep >= totalSteps - 1;
  // Progress starts from step 1 (step 0 is variant picker)
  const progress = hasVariant ? ((currentStep) / (totalSteps - 1)) * 100 : 0;

  return (
    <div
      className={`fixed bottom-0 left-0 z-[52] h-[72px] bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-gray-800 flex items-center px-5 gap-4 ${hasVariant ? 'right-[340px]' : 'right-0'}`}
      role="navigation"
      aria-label="Demo navigation"
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"
        title="Close demo (Esc)"
        aria-label="Close demo"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar + step counter */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0">
        {/* Progress bar */}
        <div className="w-full h-1 rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pwc-orange to-pwc-orange-light transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Step counter */}
        <div className="text-[10px] text-gray-500 font-mono">
          {hasVariant ? `Step ${currentStep} of ${totalSteps - 1}` : 'Select variant to begin'}
        </div>
      </div>

      {/* Nav buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Restart */}
        <button
          onClick={onRestart}
          className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          title="Restart demo"
          aria-label="Restart demo"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Previous */}
        <button
          onClick={onPrev}
          disabled={!hasVariant || isFirst}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous step"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>

        {/* Next / Finish */}
        <button
          onClick={isLast ? onClose : onNext}
          disabled={!hasVariant}
          className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold bg-pwc-orange hover:bg-pwc-orange-light text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={isLast ? 'Finish demo' : 'Next step'}
        >
          {isLast ? 'Finish' : 'Next'}
          {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
