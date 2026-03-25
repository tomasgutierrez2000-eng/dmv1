'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TransformNodeData, ZoomLevel } from '@/lib/metric-studio/types';

const OP_LABELS: Record<string, string> = {
  join: 'JOIN',
  group_by: 'GROUP BY',
  aggregate: 'COMPUTE',
};

function TransformNodeInner({ data, selected }: NodeProps & { data: TransformNodeData }) {
  const zoom: ZoomLevel = data.zoomLevel ?? 'analyst';

  return (
    <div className={`rounded-lg border border-[#D04A02]/40 bg-[#151520] min-w-[140px] max-w-[220px] transition-shadow ${selected ? 'ring-1 ring-[#D04A02] shadow-lg shadow-[#D04A02]/10' : ''}`}>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-[#D04A02]/60 !border-[#D04A02]/40" />

      <div className="px-2.5 py-1.5 border-b border-slate-800/50 flex items-center gap-1.5">
        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-[#D04A02]/20 text-[#D04A02] border-[#D04A02]/30">
          {OP_LABELS[data.operation] ?? data.operation}
        </span>
        <span className="text-xs text-slate-300 font-medium truncate">
          {data.label}
        </span>
      </div>

      {/* Details — analyst + validator zoom */}
      {zoom !== 'cro' && (
        <div className="px-2.5 py-1.5">
          {data.condition && (
            <div className="text-[10px] text-slate-400 font-mono truncate">{data.condition}</div>
          )}
          {data.aggregation && data.fieldName && (
            <div className="text-[10px] text-[#D04A02] font-mono">
              {data.aggregation}({data.fieldName})
            </div>
          )}
        </div>
      )}

      {/* Row counts — validator zoom */}
      {zoom === 'validator' && (data.inputRowCount != null || data.outputRowCount != null) && (
        <div className="px-2.5 py-1 border-t border-slate-800/50 flex justify-between text-[9px] text-slate-500">
          {data.inputRowCount != null && <span>In: {data.inputRowCount.toLocaleString()}</span>}
          {data.outputRowCount != null && <span>Out: {data.outputRowCount.toLocaleString()}</span>}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-[#D04A02]/60 !border-[#D04A02]/40" />
    </div>
  );
}

export const TransformNode = React.memo(TransformNodeInner);
