'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TableNodeData, ZoomLevel } from '@/lib/metric-studio/types';

const LAYER_STYLES: Record<string, { badge: string; border: string; dot: string }> = {
  l1: { badge: 'bg-teal-500/20 text-teal-400 border-teal-500/30', border: 'border-teal-500/30', dot: 'bg-teal-500' },
  l2: { badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30', border: 'border-violet-500/30', dot: 'bg-violet-500' },
  l3: { badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30', border: 'border-rose-500/30', dot: 'bg-rose-500' },
};

function TableNodeInner({ data, selected }: NodeProps & { data: TableNodeData }) {
  const style = LAYER_STYLES[data.layer] ?? LAYER_STYLES.l2;
  const zoom: ZoomLevel = data.zoomLevel ?? 'analyst';

  return (
    <div className={`rounded-lg border ${style.border} bg-[#151520] min-w-[160px] max-w-[260px] transition-shadow ${selected ? 'ring-1 ring-[#D04A02] shadow-lg shadow-[#D04A02]/10' : ''}`}>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-slate-600 !border-slate-500" />

      {/* Header — always visible */}
      <div className="px-2.5 py-1.5 border-b border-slate-800/50 flex items-center gap-1.5">
        <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${style.badge}`}>
          {data.layer.toUpperCase()}
        </span>
        <span className="text-xs text-slate-300 font-medium truncate font-mono">
          {data.tableName}
        </span>
      </div>

      {/* Fields — analyst + validator zoom */}
      {zoom !== 'cro' && data.selectedFields.length > 0 && (
        <div className="px-2.5 py-1.5 space-y-0.5">
          {data.selectedFields.slice(0, zoom === 'validator' ? 8 : 4).map(f => (
            <div key={f} className="text-[10px] text-slate-400 font-mono truncate">{f}</div>
          ))}
          {data.selectedFields.length > (zoom === 'validator' ? 8 : 4) && (
            <div className="text-[9px] text-slate-500">+{data.selectedFields.length - (zoom === 'validator' ? 8 : 4)} more</div>
          )}
        </div>
      )}

      {/* Sample rows — validator zoom only */}
      {zoom === 'validator' && data.sampleRows && data.sampleRows.length > 0 && (
        <div className="border-t border-slate-800/50 px-2 py-1.5 max-h-[100px] overflow-y-auto">
          <table className="w-full text-[9px] font-mono text-slate-500">
            <tbody>
              {data.sampleRows.slice(0, 3).map((row, i) => (
                <tr key={i} className="border-b border-slate-800/30 last:border-0">
                  {Object.values(row).slice(0, 3).map((v, j) => (
                    <td key={j} className="px-1 py-0.5 truncate max-w-[60px]">{String(v ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer — analyst + validator zoom */}
      {zoom !== 'cro' && (
        <div className="px-2.5 py-1 border-t border-slate-800/50 flex justify-between text-[9px] text-slate-500">
          <span>{data.rowCount != null ? `${data.rowCount.toLocaleString()} rows` : '—'}</span>
          <span>{data.selectedFields.length} fields</span>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-slate-600 !border-slate-500" />
    </div>
  );
}

export const TableNode = React.memo(TableNodeInner);
