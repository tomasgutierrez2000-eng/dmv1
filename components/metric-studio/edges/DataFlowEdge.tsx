'use client';

import React, { useState } from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

/** Humanize a FK field name into a relationship description */
function humanizeJoinField(fieldName: string): string {
  if (!fieldName) return '';
  // Remove _id suffix and convert snake_case
  const base = fieldName.replace(/_id$/, '').replace(/_/g, ' ');
  return `linked by ${base}`;
}

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
  const [hovered, setHovered] = useState(false);

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
  const joinField = data?.joinField as string | undefined;
  const joinCondition = data?.joinCondition as string | undefined;
  const isHighlighted = data?.isHighlighted as boolean | undefined;

  const strokeColor = selected || isHighlighted ? '#D04A02' : hovered ? '#64748b' : '#334155';
  const strokeWidth = selected || isHighlighted ? 2 : hovered ? 2 : 1.5;

  return (
    <>
      {/* Invisible wider path for hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ cursor: 'pointer' }}
      />

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
      />

      {/* FK field label at midpoint */}
      {joinField && (
        <foreignObject
          x={labelX - 50}
          y={labelY - 10}
          width={100}
          height={20}
          className="pointer-events-none"
        >
          <div className="flex items-center justify-center">
            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap transition-opacity ${
              hovered || selected ? 'text-slate-300 bg-slate-800/90 border border-slate-600' : 'text-slate-600 opacity-60'
            }`}>
              {joinField}
            </span>
          </div>
        </foreignObject>
      )}

      {/* Row count badge */}
      {rowCount != null && !joinField && (
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
      {label && !rowCount && !joinField && (
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

      {/* Hover tooltip with join condition */}
      {hovered && (joinCondition || joinField) && (
        <foreignObject
          x={labelX - 100}
          y={labelY + 12}
          width={200}
          height={40}
          className="pointer-events-none"
        >
          <div className="flex items-center justify-center">
            <span className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[9px] text-slate-300 shadow-lg whitespace-nowrap">
              {joinCondition || humanizeJoinField(joinField || '')}
            </span>
          </div>
        </foreignObject>
      )}
    </>
  );
}

export const DataFlowEdge = React.memo(DataFlowEdgeInner);
