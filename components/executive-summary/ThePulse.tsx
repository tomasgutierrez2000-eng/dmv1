'use client';

import { useReducer, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import {
  PULSE_ACTS,
  INITIAL_STATE,
  pulseReducer,
} from './pulseData';
import type { PulseAction } from './pulseData';
import PulseStage, { PulseFullView } from './PulseStage';
import PulseControls from './PulseControls';
import PulseParticles from './PulseParticles';

export default function ThePulse() {
  const [state, dispatch] = useReducer(pulseReducer, INITIAL_STATE);

  const act = PULSE_ACTS[state.currentAct];

  /* ─── Auto-advance timer ──────────────────────────────────────────── */
  useEffect(() => {
    if (state.playState !== 'playing' || state.showFullView || state.isComplete) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'NEXT_ACT' });
    }, act.durationMs);
    return () => clearTimeout(timer);
  }, [state.currentAct, state.playState, state.showFullView, state.isComplete, act.durationMs]);

  /* ─── Keyboard navigation ─────────────────────────────────────────── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        dispatch({ type: 'NEXT_ACT' });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        dispatch({ type: 'PREV_ACT' });
      } else if (e.key === ' ') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_PLAY' });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        dispatch({ type: 'SKIP_TO_FULL' });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  /* ─── Dispatch helpers for controls ───────────────────────────────── */
  const d = useCallback((action: PulseAction) => dispatch(action), []);

  return (
    <div className="relative w-full min-h-screen bg-slate-950 overflow-hidden">
      {/* Particle layer (behind everything) */}
      <PulseParticles currentAct={state.currentAct} isPlaying={state.playState === 'playing'} />

      {/* Main content */}
      <div className="relative z-10 flex flex-col min-h-screen pb-20">
        {/* Top header */}
        <header className="px-6 pt-5 pb-3 flex items-center justify-between">
          <Link
            href="/overview"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Overview
          </Link>
          <div className="flex items-center gap-2 text-slate-600 text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Pulse — Executive Summary</span>
          </div>
        </header>

        {/* Act headline */}
        <div className="px-6 pt-6 pb-4 text-center">
          <AnimatePresence mode="wait">
            {state.showFullView ? (
              <motion.div
                key="full-view-heading"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                {/* Heading rendered inside PulseFullView */}
              </motion.div>
            ) : (
              <motion.div
                key={act.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-center gap-3 mb-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border"
                    style={{
                      color: act.accentColor,
                      borderColor: `${act.accentColor}30`,
                      backgroundColor: `${act.accentColor}10`,
                    }}
                  >
                    Act {act.actNumber}
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
                  {act.headline}
                </h2>
                <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
                  {act.subtitle}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stage content */}
        <main className="flex-1 flex items-center justify-center px-6 py-4">
          <AnimatePresence mode="wait">
            {state.showFullView ? (
              <PulseFullView key="full-view" />
            ) : (
              <PulseStage key={act.id} act={act} />
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Controls */}
      <PulseControls
        currentAct={state.currentAct}
        playState={state.playState}
        isComplete={state.isComplete}
        showFullView={state.showFullView}
        onTogglePlay={() => d({ type: 'TOGGLE_PLAY' })}
        onNext={() => d({ type: 'NEXT_ACT' })}
        onPrev={() => d({ type: 'PREV_ACT' })}
        onSkip={() => d({ type: 'SKIP_TO_FULL' })}
        onGoToAct={(act) => d({ type: 'GO_TO_ACT', act })}
        onRestart={() => d({ type: 'RESTART' })}
      />
    </div>
  );
}
