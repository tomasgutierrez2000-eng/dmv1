'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, RefreshCw, CheckCircle2 } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ──────────────────────────────────────────────────────────────────────────── */

export interface FlowStep {
  layer: string;         // e.g. "L1", "L2", "Calc", "Rollup", "Output"
  table: string;         // e.g. "position", "facility_master"
  action: string;        // short description
  value: string;         // the key value being shown
  detail: string;        // longer explanation
  color: 'blue' | 'amber' | 'purple' | 'emerald' | 'pink' | 'cyan' | 'red';
}

interface LevelStepWalkthroughProps {
  steps: FlowStep[];
  title: string;
  subtitle?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * COLOR MAP
 * ──────────────────────────────────────────────────────────────────────────── */

const FLOW_COLORS: Record<string, { dot: string; border: string; bg: string; text: string }> = {
  blue:    { dot: 'bg-blue-500',    border: 'border-blue-500/40',    bg: 'bg-blue-500/10',    text: 'text-blue-300' },
  amber:   { dot: 'bg-amber-500',   border: 'border-amber-500/40',   bg: 'bg-amber-500/10',   text: 'text-amber-300' },
  purple:  { dot: 'bg-purple-500',  border: 'border-purple-500/40',  bg: 'bg-purple-500/10',  text: 'text-purple-300' },
  emerald: { dot: 'bg-emerald-500', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-300' },
  pink:    { dot: 'bg-pink-500',    border: 'border-pink-500/40',    bg: 'bg-pink-500/10',    text: 'text-pink-300' },
  cyan:    { dot: 'bg-cyan-500',    border: 'border-cyan-500/40',    bg: 'bg-cyan-500/10',    text: 'text-cyan-300' },
  red:     { dot: 'bg-red-500',     border: 'border-red-500/40',     bg: 'bg-red-500/10',     text: 'text-red-300' },
};

/* ────────────────────────────────────────────────────────────────────────────
 * COMPONENT
 * ──────────────────────────────────────────────────────────────────────────── */

export default function LevelStepWalkthrough({ steps, title, subtitle }: LevelStepWalkthroughProps) {
  const [activeStep, setActiveStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = () => {
    setIsPlaying(true);
    setActiveStep(0);
  };

  const stop = () => {
    setIsPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const reset = () => {
    stop();
    setActiveStep(-1);
  };

  useEffect(() => {
    if (isPlaying && activeStep >= 0 && activeStep < steps.length - 1) {
      timerRef.current = setTimeout(() => {
        setActiveStep((s) => s + 1);
      }, 2200);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    } else if (activeStep >= steps.length - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, activeStep, steps.length]);

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-white truncate">{title}</span>
          {subtitle && <span className="text-[9px] text-gray-600 truncate hidden sm:inline">{subtitle}</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {activeStep === -1 ? (
            <button
              onClick={play}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
            >
              <Play className="w-3 h-3" /> Play
            </button>
          ) : (
            <>
              {isPlaying ? (
                <button
                  onClick={stop}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
                >
                  Pause
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (activeStep >= steps.length - 1) {
                      setActiveStep(0);
                    }
                    setIsPlaying(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
                >
                  <Play className="w-3 h-3" /> Resume
                </button>
              )}
              <button
                onClick={reset}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </>
          )}
          <span className="text-[9px] text-gray-600 font-mono">
            {activeStep >= 0 ? `${activeStep + 1}/${steps.length}` : '\u2014'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-gray-800 mb-4 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: activeStep >= 0 ? `${((activeStep + 1) / steps.length) * 100}%` : '0%' }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {steps.map((step, i) => {
          const isActive = i === activeStep;
          const isPast = i < activeStep;
          const fc = FLOW_COLORS[step.color] ?? FLOW_COLORS.blue;

          return (
            <button
              key={i}
              onClick={() => {
                setActiveStep(i);
                setIsPlaying(false);
              }}
              className={`w-full text-left rounded-lg border p-2.5 transition-all duration-500 ${
                isActive
                  ? `${fc.border} ${fc.bg} scale-[1.01] shadow-lg`
                  : isPast
                    ? 'border-gray-800/50 bg-white/[0.01] opacity-60'
                    : 'border-gray-800/30 bg-transparent opacity-30'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Step indicator */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                    isActive ? `${fc.dot} text-white` : isPast ? 'bg-gray-700 text-gray-400' : 'bg-gray-800/50 text-gray-700'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-[9px] font-bold">{i + 1}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isActive ? `${fc.bg} ${fc.text}` : 'bg-white/5 text-gray-600'
                      }`}
                    >
                      {step.layer}
                    </span>
                    <code className={`text-[10px] font-mono ${isActive ? fc.text : 'text-gray-500'}`}>{step.table}</code>
                    <span className="text-[9px] text-gray-600">{step.action}</span>
                  </div>
                  {(isActive || isPast) && (
                    <div className="mt-1">
                      <code className={`text-[10px] font-mono font-bold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                        {step.value}
                      </code>
                      {isActive && <div className="text-[9px] text-gray-500 mt-0.5">{step.detail}</div>}
                    </div>
                  )}
                </div>

                {/* Animated dot for active step */}
                {isActive && <div className={`w-2 h-2 rounded-full ${fc.dot} animate-pulse flex-shrink-0`} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
