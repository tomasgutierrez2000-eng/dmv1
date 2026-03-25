'use client';

import React, { useState } from 'react';
import { useStudioStore } from '@/lib/metric-studio/canvas-state';
import { SqlDebugger } from './SqlDebugger';

type Tab = 'data' | 'sql';

export function DataInspector() {
  const [tab, setTab] = useState<Tab>('data');
  const selectedNodeId = useStudioStore(s => s.selectedNodeId);
  const nodes = useStudioStore(s => s.nodes);
  const executionResult = useStudioStore(s => s.executionResult);
  const isExecuting = useStudioStore(s => s.isExecuting);
  const formulaSQL = useStudioStore(s => s.formulaSQL);
  const executeFormula = useStudioStore(s => s.executeFormula);
  const executionMode = useStudioStore(s => s.executionMode);
  const setExecutionMode = useStudioStore(s => s.setExecutionMode);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const nodeData = selectedNode?.data;

  return (
    <div className="w-[280px] bg-[#0f1017] border-l border-slate-800 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {(['data', 'sql'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-2 text-[11px] capitalize border-b-2 transition-colors ${
              tab === t
                ? 'text-[#D04A02] border-[#D04A02]'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
        <div className="flex-1" />
        {/* Execute button */}
        <button
          onClick={executeFormula}
          disabled={isExecuting || !formulaSQL}
          className="px-3 py-1 text-[10px] text-[#D04A02] hover:bg-[#D04A02]/10 disabled:opacity-30 rounded-sm mr-1 my-1 border border-[#D04A02]/30"
        >
          {isExecuting ? 'Running...' : '▶ Execute'}
        </button>
      </div>

      {/* Execution mode toggle */}
      <div className="px-3 py-1.5 flex items-center gap-2 border-b border-slate-800/50 text-[9px]">
        <span className="text-slate-500">Mode:</span>
        {(['sqljs', 'postgresql'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setExecutionMode(mode)}
            className={`px-2 py-0.5 rounded border text-[9px] ${
              executionMode === mode
                ? 'border-[#D04A02]/50 text-[#D04A02] bg-[#D04A02]/10'
                : 'border-slate-700 text-slate-500 hover:text-slate-300'
            }`}
          >
            {mode === 'sqljs' ? 'Demo (sql.js)' : 'Live (PG)'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'data' && (
          <DataTab
            nodeData={nodeData}
            selectedNodeId={selectedNodeId}
            executionResult={executionResult}
          />
        )}
        {tab === 'sql' && (
          <div>
            {/* Full SQL */}
            {formulaSQL && (
              <div className="bg-[#1a1a25] border border-slate-800 rounded p-2 mb-3 max-h-[200px] overflow-y-auto">
                <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {formulaSQL}
                </pre>
              </div>
            )}
            {/* Step debugger */}
            <SqlDebugger />
          </div>
        )}
      </div>
    </div>
  );
}

function DataTab({
  nodeData,
  selectedNodeId,
  executionResult,
}: {
  nodeData: Record<string, unknown> | undefined;
  selectedNodeId: string | null;
  executionResult: { ok: true; rows: Record<string, unknown>[]; rowCount: number } | { ok: false; error: string } | null;
}) {
  // Show selected node info
  if (nodeData?.type === 'table') {
    const td = nodeData as { tableName: string; layer: string; selectedFields: string[]; rowCount?: number; sampleRows?: Record<string, unknown>[] };
    const layerColor = td.layer === 'l1' ? 'text-teal-400' : td.layer === 'l3' ? 'text-rose-400' : 'text-violet-400';
    return (
      <div>
        <div className="mb-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Selected Node</div>
          <div className="text-sm text-slate-200 font-medium mt-0.5 font-mono">{td.tableName}</div>
          <div className={`text-[10px] ${layerColor} mt-0.5`}>
            {td.layer.toUpperCase()}{td.layer === 'l1' ? ' REF' : ''} &middot; {td.selectedFields?.length ?? 0} fields
          </div>
        </div>
        {td.sampleRows && td.sampleRows.length > 0 && (
          <SampleTable rows={td.sampleRows} />
        )}
      </div>
    );
  }

  // Show L3 destination node info
  if (nodeData?.type === 'destination') {
    const dd = nodeData as { tableName: string; targetColumn?: string; fields: Array<{ name: string; dataType?: string }>; category?: string; isGhost?: boolean };
    if (dd.isGhost) {
      return (
        <div>
          <div className="mb-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">L3 Destination</div>
            <div className="text-sm text-slate-400 font-medium mt-0.5 italic">Unknown destination</div>
            <div className="text-[10px] text-slate-500 mt-1">
              L3 destination not mapped for this metric domain.
            </div>
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="mb-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">L3 Destination</div>
          <div className="text-sm text-slate-200 font-medium mt-0.5 font-mono">{dd.tableName}</div>
          <div className="text-[10px] text-rose-400 mt-0.5">
            L3 &middot; {dd.category ?? 'Derived'} &middot; {dd.fields.length} fields
          </div>
        </div>
        {dd.targetColumn && (
          <div className="mb-3">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Target Column</div>
            <div className="text-xs text-[#D04A02] font-mono bg-[#D04A02]/5 border border-[#D04A02]/20 rounded px-2 py-1">
              → {dd.targetColumn}
            </div>
          </div>
        )}
        {dd.fields.length > 0 && (
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Schema</div>
            <div className="space-y-px">
              {dd.fields.map(f => (
                <div key={f.name} className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center justify-between ${f.name === dd.targetColumn ? 'text-[#D04A02] bg-[#D04A02]/5' : 'text-slate-500'}`}>
                  <span className="truncate">{f.name}</span>
                  {f.dataType && <span className="text-slate-600 text-[8px] ml-2 shrink-0">{f.dataType}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show execution result if available
  if (executionResult) {
    if (!executionResult.ok) {
      return (
        <div className="text-xs text-red-400 bg-red-950/20 border border-red-500/20 rounded p-2">
          {executionResult.error}
        </div>
      );
    }
    return (
      <div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
          Execution Result &middot; {executionResult.rowCount} rows
        </div>
        <SampleTable rows={executionResult.rows.slice(0, 50)} />
      </div>
    );
  }

  if (!selectedNodeId) {
    return (
      <div className="text-xs text-slate-500 italic">
        Click a node to inspect its data, or execute the formula to see results.
      </div>
    );
  }

  return null;
}

function SampleTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return null;
  const columns = Object.keys(rows[0]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[10px] font-mono">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col} className="text-left px-1.5 py-1 text-slate-500 border-b border-slate-800 font-medium sticky top-0 bg-[#0f1017]">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[#1a1a25]">
              {columns.map(col => (
                <td key={col} className="px-1.5 py-0.5 text-slate-400 border-b border-slate-800/30 truncate max-w-[100px]">
                  {formatCellValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-[9px] text-slate-600 text-right mt-1">
        Showing {rows.length} rows
      </div>
    </div>
  );
}

function formatCellValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return v.toLocaleString();
    return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(v);
}
