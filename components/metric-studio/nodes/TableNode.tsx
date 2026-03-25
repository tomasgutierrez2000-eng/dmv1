'use client';

import React, { useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TableNodeData, ZoomLevel } from '@/lib/metric-studio/types';

const LAYER_STYLES: Record<string, { badge: string; border: string; dot: string }> = {
  l1: { badge: 'bg-teal-500/20 text-teal-400 border-teal-500/30', border: 'border-teal-500/30', dot: 'bg-teal-500' },
  l2: { badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30', border: 'border-violet-500/30', dot: 'bg-violet-500' },
  l3: { badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30', border: 'border-rose-500/30', dot: 'bg-rose-500' },
};

/** Field role badges — colored indicators showing how each field is used in the formula */
const ROLE_BADGES: Record<string, { label: string; color: string; title: string }> = {
  measure: { label: 'M', color: 'bg-[#D04A02]/20 text-[#D04A02] border-[#D04A02]/30', title: 'Measure — used in calculation' },
  join_key: { label: 'J', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', title: 'Join Key — links tables together' },
  dimension: { label: 'D', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', title: 'Dimension — groups results' },
  filter: { label: 'F', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', title: 'Filter — constrains results' },
};

/** Determine field role from formula context */
function getFieldRole(fieldName: string, formulaFields?: string[], dimensionFields?: string[], filterFields?: string[], joinFields?: string[]): string | null {
  if (joinFields?.includes(fieldName)) return 'join_key';
  if (dimensionFields?.includes(fieldName)) return 'dimension';
  if (filterFields?.includes(fieldName)) return 'filter';
  if (formulaFields?.includes(fieldName)) return 'measure';
  return null;
}

/** Get a brief data type label */
function getTypeLabel(fieldName: string): string {
  if (fieldName.endsWith('_id')) return 'BIGINT';
  if (fieldName.endsWith('_amt') || fieldName.endsWith('_value')) return 'NUMERIC';
  if (fieldName.endsWith('_pct') || fieldName.endsWith('_bps')) return 'NUMERIC';
  if (fieldName.endsWith('_date') || fieldName.endsWith('_ts')) return 'DATE';
  if (fieldName.endsWith('_flag')) return 'BOOL';
  if (fieldName.endsWith('_code') || fieldName.endsWith('_name')) return 'VARCHAR';
  if (fieldName.endsWith('_count')) return 'INT';
  return '';
}

/** Info popover for table details */
function TableInfoPopover({ data, onClose }: { data: TableNodeData; onClose: () => void }) {
  return (
    <div className="absolute top-full left-0 mt-1 z-50 w-[300px] bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 text-xs">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-slate-200">{data.tableName}</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm">x</button>
      </div>
      {typeof (data as Record<string, unknown>).description === 'string' && (
        <p className="text-slate-400 mb-2 text-[10px] leading-relaxed">{(data as Record<string, unknown>).description as string}</p>
      )}
      <div className="space-y-1 max-h-[200px] overflow-y-auto">
        {data.selectedFields.map((f: string) => (
            <div key={f} className="flex items-center gap-2 text-[10px]">
              <span className="font-mono text-slate-300 truncate flex-1">{f}</span>
              <span className="text-slate-600 text-[9px]">{getTypeLabel(f)}</span>
            </div>
          ))}
      </div>
      {data.rowCount != null && (
        <div className="mt-2 pt-2 border-t border-slate-800 text-slate-500 text-[9px]">
          {data.rowCount.toLocaleString()} rows
        </div>
      )}
    </div>
  );
}

function TableNodeInner({ data, selected }: NodeProps & { data: TableNodeData }) {
  const [showInfo, setShowInfo] = useState(false);
  const style = LAYER_STYLES[data.layer] ?? LAYER_STYLES.l2;
  const zoom: ZoomLevel = data.zoomLevel ?? 'analyst';

  // Formula context from parent (set via canvas state)
  const formulaFields = (data as Record<string, unknown>).formulaFields as string[] | undefined;
  const dimensionFields = (data as Record<string, unknown>).dimensionFields as string[] | undefined;
  const filterFields = (data as Record<string, unknown>).filterFields as string[] | undefined;
  const joinFields = (data as Record<string, unknown>).joinFields as string[] | undefined;
  const isHighlighted = (data as Record<string, unknown>).isHighlighted as boolean | undefined;

  const hasFormulaContext = !!(formulaFields?.length || dimensionFields?.length || filterFields?.length || joinFields?.length);

  const toggleInfo = useCallback(() => setShowInfo((v) => !v), []);

  return (
    <div
      className={`rounded-lg border ${style.border} bg-[#151520] min-w-[160px] max-w-[280px] transition-all duration-200
        ${selected ? 'ring-1 ring-[#D04A02] shadow-lg shadow-[#D04A02]/10' : ''}
        ${isHighlighted ? 'ring-2 ring-[#D04A02] shadow-lg shadow-[#D04A02]/20' : ''}
        ${isHighlighted === false ? 'opacity-30' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-slate-600 !border-slate-500" />

      {/* Header — always visible */}
      <div className="px-2.5 py-1.5 border-b border-slate-800/50 flex items-center gap-1.5 relative">
        <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${style.badge}`}>
          {data.layer.toUpperCase()}
        </span>
        <span className="text-xs text-slate-300 font-medium truncate font-mono flex-1">
          {data.tableName}
        </span>
        {/* (?) info button */}
        <button
          onClick={toggleInfo}
          className="text-[10px] text-slate-500 hover:text-[#D04A02] transition-colors w-4 h-4 flex items-center justify-center rounded hover:bg-slate-800"
          title="Table details"
        >
          ?
        </button>
        {showInfo && <TableInfoPopover data={data} onClose={() => setShowInfo(false)} />}
      </div>

      {/* Fields — analyst + validator zoom */}
      {zoom !== 'cro' && data.selectedFields.length > 0 && (
        <div className="px-1.5 py-1.5 space-y-0.5">
          {data.selectedFields.slice(0, zoom === 'validator' ? 8 : 4).map((f) => {
            const role = hasFormulaContext ? getFieldRole(f, formulaFields, dimensionFields, filterFields, joinFields) : null;
            const isInFormula = role !== null;
            const roleBadge = role ? ROLE_BADGES[role] : null;

            return (
              <div
                key={f}
                className={`flex items-center gap-1 text-[10px] font-mono truncate rounded px-1 py-0.5 transition-opacity duration-200
                  ${hasFormulaContext && !isInFormula ? 'opacity-40' : ''}
                  ${isInFormula ? 'border-l-[3px] border-l-[#D04A02]' : ''}`}
              >
                {/* Role badge */}
                {roleBadge && (
                  <span
                    className={`text-[7px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded border ${roleBadge.color}`}
                    title={roleBadge.title}
                  >
                    {roleBadge.label}
                  </span>
                )}
                {/* Field name */}
                <span className={isInFormula ? 'text-slate-200' : 'text-slate-500'}>
                  {f}
                </span>
                {/* Type label */}
                {zoom === 'validator' && (
                  <span className="text-[8px] text-slate-600 ml-auto">{getTypeLabel(f)}</span>
                )}
              </div>
            );
          })}
          {data.selectedFields.length > (zoom === 'validator' ? 8 : 4) && (
            <div className="text-[9px] text-slate-500 px-1">+{data.selectedFields.length - (zoom === 'validator' ? 8 : 4)} more</div>
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
          <span>{data.rowCount != null ? `${data.rowCount.toLocaleString()} rows` : ''}</span>
          <span>{data.selectedFields.length} fields</span>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-slate-600 !border-slate-500" />
    </div>
  );
}

export const TableNode = React.memo(TableNodeInner);
