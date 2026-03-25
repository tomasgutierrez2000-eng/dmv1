'use client';

import React from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

function DataFlowEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const rowCount = data?.rowCount as number | undefined;
  const label = data?.label as string | undefined;
  const flowType = data?.flowType as string | undefined;

  // Layer-aware stroke colors
  const FLOW_COLORS: Record<string, string> = {
    'dim-lookup': '#14b8a6', // teal-500
    'source': '#8b5cf6',     // violet-500
    'output': '#f43f5e',     // rose-500
  };
  const baseColor = flowType ? (FLOW_COLORS[flowType] ?? '#334155') : '#334155';
  const isDashed = flowType === 'dim-lookup';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#D04A02' : baseColor,
          strokeWidth: selected ? 2 : 1.5,
          strokeDasharray: isDashed ? '6 3' : undefined,
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />
      {/* Row count badge at midpoint */}
      {rowCount != null && (
        <foreignObject
          x={labelX - 30}
          y={labelY - 10}
          width={60}
          height={20}
          className="pointer-events-none"
        >
          <div className="flex items-center justify-center">
            <span className="bg-slate-800 border border-slate-700 rounded-full px-1.5 py-0.5 text-[8px] font-mono text-slate-400 whitespace-nowrap">
              {rowCount.toLocaleString()} rows
            </span>
          </div>
        </foreignObject>
      )}
      {/* Edge label */}
      {label && !rowCount && (
        <foreignObject
          x={labelX - 40}
          y={labelY - 10}
          width={80}
          height={20}
          className="pointer-events-none"
        >
          <div className="flex items-center justify-center">
            <span className="text-[9px] text-slate-500 truncate">{label}</span>
          </div>
        </foreignObject>
      )}
    </>
  );
}

export const DataFlowEdge = React.memo(DataFlowEdgeInner);
