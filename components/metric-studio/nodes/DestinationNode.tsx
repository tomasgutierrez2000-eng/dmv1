'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { DestinationNodeData, ZoomLevel } from '@/lib/metric-studio/types';

function DestinationNodeInner({ data, selected }: NodeProps & { data: DestinationNodeData }) {
  const zoom: ZoomLevel = data.zoomLevel ?? 'analyst';
  const isGhost = data.isGhost ?? false;

  return (
    <div
      className={`rounded-lg border border-dashed border-rose-500/30 bg-rose-500/5 min-w-[160px] max-w-[260px] transition-shadow ${selected ? 'ring-1 ring-[#D04A02] shadow-lg shadow-[#D04A02]/10' : ''}`}
      aria-label={`L3 destination table: ${isGhost ? 'unknown' : data.tableName}`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-rose-500/60 !border-rose-500/40" />

      {/* Header */}
      <div className="px-2.5 py-1.5 border-b border-slate-800/50 flex items-center gap-1.5">
        <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-rose-500/20 text-rose-400 border-rose-500/30">
          L3
        </span>
        <span className="text-xs text-slate-300 font-medium truncate font-mono">
          {isGhost ? 'Unknown destination' : data.tableName}
        </span>
      </div>

      {/* Target column — analyst + validator zoom */}
      {zoom !== 'cro' && (
        <div className="px-2.5 py-1.5 space-y-0.5">
          {isGhost ? (
            <div className="text-[10px] text-slate-500 italic" title="L3 destination not mapped for this metric domain">
              ? — destination not mapped
            </div>
          ) : (
            <>
              {data.targetColumn && (
                <div className="text-[10px] text-[#D04A02] font-mono font-medium truncate">
                  → {data.targetColumn}
                </div>
              )}
              {/* Additional fields — validator zoom only */}
              {zoom === 'validator' && data.fields.length > 0 && (
                <>
                  {data.fields
                    .filter(f => f.name !== data.targetColumn)
                    .slice(0, 8)
                    .map(f => (
                      <div key={f.name} className="text-[10px] text-slate-500 font-mono truncate flex items-center gap-1">
                        <span className="truncate">{f.name}</span>
                        {f.dataType && <span className="text-slate-600 text-[8px]">{f.dataType}</span>}
                      </div>
                    ))}
                  {data.fields.length > 9 && (
                    <div className="text-[9px] text-slate-600">+{data.fields.length - 9} more</div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Footer — analyst + validator zoom */}
      {zoom !== 'cro' && !isGhost && (
        <div className="px-2.5 py-1 border-t border-slate-800/50 flex justify-between text-[9px] text-slate-500">
          <span>{data.category ?? 'L3 Derived'}</span>
          <span>{data.fields.length} fields</span>
        </div>
      )}
    </div>
  );
}

export const DestinationNode = React.memo(DestinationNodeInner);
