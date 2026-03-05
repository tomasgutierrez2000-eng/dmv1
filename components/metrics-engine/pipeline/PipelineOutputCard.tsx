'use client';

import React from 'react';
import type { CalculationDimension } from '@/data/l3-metrics';
import { CALCULATION_DIMENSION_LABELS } from '@/data/l3-metrics';

interface PipelineOutputCardProps {
  dimension: CalculationDimension;
  resultCount: number;
  medianValue: number | null;
  isHighlighted: boolean;
}

export default function PipelineOutputCard({ dimension, resultCount, medianValue, isHighlighted }: PipelineOutputCardProps) {
  const dscrColor = medianValue === null
    ? 'text-gray-500'
    : medianValue >= 1.25
      ? 'text-emerald-400'
      : medianValue >= 1.0
        ? 'text-amber-400'
        : 'text-red-400';

  return (
    <div
      data-pipeline="output"
      className={`rounded-lg border px-4 py-4 transition-all duration-300 bg-emerald-950/60 border-emerald-500/40 ${
        isHighlighted ? 'ring-1 ring-white/30 scale-[1.02]' : 'opacity-80'
      }`}
    >
      {/* Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
          L3 Output
        </span>
      </div>

      {/* Metric name */}
      <p className="text-sm font-bold text-white mb-1">DSCR</p>
      <p className="text-[10px] text-gray-400 mb-3">
        per {CALCULATION_DIMENSION_LABELS[dimension] ?? dimension}
      </p>

      {/* Median value */}
      {medianValue !== null ? (
        <div className="text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Median</p>
          <p className={`text-2xl font-mono font-bold ${dscrColor}`}>
            {medianValue.toFixed(2)}x
          </p>
        </div>
      ) : (
        <div className="text-center">
          <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
        </div>
      )}

      {/* Count */}
      {resultCount > 0 && (
        <p className="text-[10px] text-gray-500 text-center mt-2">
          {resultCount} {CALCULATION_DIMENSION_LABELS[dimension]?.toLowerCase() ?? 'results'}
        </p>
      )}
    </div>
  );
}
