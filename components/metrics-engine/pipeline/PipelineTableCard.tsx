'use client';

import React from 'react';
import type { PipelineTable } from './dscrPipelineData';
import type { CalculationDimension } from '@/data/l3-metrics';

const LAYER_STYLE = {
  L1: { bg: 'bg-blue-950/60',  border: 'border-blue-500/40',  badge: 'bg-blue-500/20 text-blue-300',  dot: 'bg-blue-500' },
  L2: { bg: 'bg-amber-950/60', border: 'border-amber-500/40', badge: 'bg-amber-500/20 text-amber-300', dot: 'bg-amber-500' },
};

interface PipelineTableCardProps {
  table: PipelineTable;
  dimension: CalculationDimension;
  isHighlighted: boolean;
  onHover: (id: string | null) => void;
}

export default function PipelineTableCard({ table, dimension, isHighlighted, onHover }: PipelineTableCardProps) {
  const style = LAYER_STYLE[table.layer];

  return (
    <div
      data-pipeline={`table-${table.id}`}
      className={`rounded-lg border px-3 py-2.5 transition-all duration-300 ${style.bg} ${style.border} ${
        isHighlighted ? 'ring-1 ring-white/30 scale-[1.02]' : 'opacity-80 hover:opacity-100'
      }`}
      onMouseEnter={() => onHover(table.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Layer badge + table name */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${style.badge}`}>
          {table.layer}
        </span>
        <span className="text-[10px] font-mono text-gray-400 truncate">{table.name}</span>
      </div>

      {/* Fields */}
      <div className="space-y-0.5">
        {table.fields.map((f) => {
          const isActive = !f.dims || f.dims.length === 0 || f.dims.includes(dimension);
          return (
            <div
              key={f.name}
              className={`flex items-center justify-between text-[10px] transition-opacity ${
                isActive ? 'opacity-100' : 'opacity-30'
              }`}
            >
              <span className="font-mono text-gray-300">{f.name}</span>
              <span className="text-gray-500 ml-2 truncate text-right">{f.sampleValue}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
