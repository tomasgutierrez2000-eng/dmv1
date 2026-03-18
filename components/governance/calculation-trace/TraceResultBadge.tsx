'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface TraceResultBadgeProps {
  value: number | null;
  formatted: string;
  unitType: string;
  direction: string;
}

function getColor(value: number, unitType: string, direction: string): string {
  if (unitType === 'PERCENTAGE' || unitType === 'RATIO') {
    if (direction === 'LOWER_BETTER') {
      if (value < 60) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      if (value < 80) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      return 'text-red-400 border-red-500/30 bg-red-500/10';
    }
    if (direction === 'HIGHER_BETTER') {
      if (value >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      if (value >= 60) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      return 'text-red-400 border-red-500/30 bg-red-500/10';
    }
  }
  return 'text-gray-300 border-gray-600 bg-gray-800/50';
}

export default function TraceResultBadge({ value, formatted, unitType, direction }: TraceResultBadgeProps) {
  if (value === null) {
    return (
      <div className="flex items-center gap-3 px-6 py-4 rounded-xl border border-gray-700 bg-gray-800/30">
        <Minus className="w-6 h-6 text-gray-500" />
        <div>
          <span className="text-2xl font-bold text-gray-500">N/A</span>
          <p className="text-xs text-gray-600">No result computed</p>
        </div>
      </div>
    );
  }

  const colorClasses = getColor(value, unitType, direction);
  const DirectionIcon = direction === 'HIGHER_BETTER' ? ArrowUp : direction === 'LOWER_BETTER' ? ArrowDown : Minus;

  return (
    <div className={`flex items-center gap-3 px-6 py-4 rounded-xl border ${colorClasses}`}>
      <DirectionIcon className="w-6 h-6" />
      <div>
        <span className="text-2xl font-bold tabular-nums">{formatted}</span>
        <p className="text-xs opacity-70 mt-0.5">
          {direction === 'HIGHER_BETTER' ? 'Higher is better' : direction === 'LOWER_BETTER' ? 'Lower is better' : 'Neutral'}
        </p>
      </div>
    </div>
  );
}
