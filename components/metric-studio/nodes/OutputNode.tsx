'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { OutputNodeData, ZoomLevel } from '@/lib/metric-studio/types';

function OutputNodeInner({ data, selected }: NodeProps & { data: OutputNodeData }) {
  const zoom: ZoomLevel = data.zoomLevel ?? 'analyst';

  return (
    <div className={`rounded-lg border border-rose-500/30 bg-[#151520] min-w-[140px] max-w-[200px] transition-shadow ${selected ? 'ring-1 ring-[#D04A02] shadow-lg shadow-[#D04A02]/10' : ''}`}>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-rose-500/60 !border-rose-500/40" />

      <div className="px-2.5 py-1.5 border-b border-slate-800/50 flex items-center gap-1.5">
        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-rose-500/20 text-rose-400 border-rose-500/30">
          L3
        </span>
        <span className="text-xs text-slate-300 font-medium truncate">
          {data.metricName}
        </span>
      </div>

      <div className="px-2.5 py-2 text-center">
        <div className="text-xl font-bold text-[#D04A02] font-mono">
          {data.formattedValue ?? (data.value != null ? String(data.value) : '—')}
        </div>

        {/* Trend indicator */}
        {zoom !== 'cro' && data.trend && (
          <div className={`text-[10px] mt-0.5 ${data.trend.direction === 'up' ? 'text-green-400' : data.trend.direction === 'down' ? 'text-red-400' : 'text-slate-500'}`}>
            {data.trend.direction === 'up' ? '▲' : data.trend.direction === 'down' ? '▼' : '—'}
            {data.trend.delta && ` ${data.trend.delta}`}
          </div>
        )}

        {/* as_of_date */}
        {zoom !== 'cro' && data.asOfDate && (
          <div className="text-[9px] text-slate-500 mt-1">{data.asOfDate}</div>
        )}
      </div>
    </div>
  );
}

export const OutputNode = React.memo(OutputNodeInner);
