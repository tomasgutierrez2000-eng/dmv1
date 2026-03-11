'use client';

import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import type { PulsePlayState } from './pulseData';
import { PULSE_ACTS } from './pulseData';

interface PulseControlsProps {
  currentAct: number;
  playState: PulsePlayState;
  isComplete: boolean;
  showFullView: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onGoToAct: (act: number) => void;
  onRestart: () => void;
}

export default function PulseControls({
  currentAct,
  playState,
  isComplete,
  showFullView,
  onTogglePlay,
  onNext,
  onPrev,
  onSkip,
  onGoToAct,
  onRestart,
}: PulseControlsProps) {
  const progress = showFullView
    ? 100
    : ((currentAct + 1) / PULSE_ACTS.length) * 100;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-slate-800">
      {/* Progress bar */}
      <div className="h-1 w-full bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-[#D04A02] to-[#E87722] transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-6 h-[64px]">
        {/* Left: Back link */}
        <div className="flex items-center gap-4 min-w-[200px]">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Overview
          </Link>
        </div>

        {/* Center: Act dots + controls */}
        <div className="flex items-center gap-6">
          {/* Act dots */}
          <div className="flex items-center gap-2">
            {PULSE_ACTS.map((act, i) => (
              <button
                key={act.id}
                onClick={() => onGoToAct(i)}
                className="group flex items-center gap-1.5"
                title={`Act ${act.actNumber}: ${act.headline}`}
              >
                <div
                  className={`
                    w-2.5 h-2.5 rounded-full transition-all duration-300
                    ${i === currentAct && !showFullView
                      ? 'scale-125 ring-2 ring-offset-1 ring-offset-[#0a0a0a]'
                      : i <= currentAct || showFullView
                        ? 'opacity-80'
                        : 'opacity-30'
                    }
                    group-hover:opacity-100 group-hover:scale-110
                  `}
                  style={{
                    backgroundColor: act.accentColor,
                    ...(i === currentAct && !showFullView
                      ? { boxShadow: `0 0 0 2px #0a0a0a, 0 0 0 4px ${act.accentColor}` }
                      : {}),
                  }}
                />
                <span
                  className={`
                    text-[10px] font-medium transition-colors hidden sm:inline
                    ${i === currentAct && !showFullView ? 'text-slate-300' : 'text-slate-600 group-hover:text-slate-400'}
                  `}
                >
                  {act.actNumber}
                </span>
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-700" />

          {/* Playback controls */}
          <div className="flex items-center gap-1.5">
            {isComplete ? (
              <button
                onClick={onRestart}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Replay
              </button>
            ) : (
              <>
                <button
                  onClick={onPrev}
                  disabled={currentAct === 0}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous act (←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={onTogglePlay}
                  className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
                  title={playState === 'playing' ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {playState === 'playing' ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={onNext}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  title="Next act (→)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Status + Skip */}
        <div className="flex items-center gap-4 min-w-[200px] justify-end">
          {!showFullView && (
            <>
              <span className="text-[11px] text-slate-500 font-mono">
                Act {currentAct + 1} of {PULSE_ACTS.length}
              </span>
              <button
                onClick={onSkip}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                title="Skip to full view (Esc)"
              >
                Skip
                <SkipForward className="w-3 h-3" />
              </button>
            </>
          )}
          {showFullView && (
            <span className="text-[11px] text-slate-500 font-mono">
              Full Pipeline View
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
