'use client';

import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { MetricStudioCanvas } from '@/components/metric-studio/MetricStudioCanvas';
import { FieldPalette } from '@/components/metric-studio/FieldPalette';
import { FormulaBar } from '@/components/metric-studio/FormulaBar';
import { DataInspector } from '@/components/metric-studio/DataInspector';
import { useStudioStore } from '@/lib/metric-studio/canvas-state';

function ZoomIndicator() {
  const zoomLevel = useStudioStore(s => s.zoomLevel);
  const levels = [
    { key: 'cro', label: 'CRO View' },
    { key: 'analyst', label: 'Analyst View' },
    { key: 'validator', label: 'Validator View' },
  ] as const;

  return (
    <div className="absolute top-3 right-[290px] z-10 flex items-center gap-1">
      {levels.map(l => (
        <span
          key={l.key}
          className={`px-2 py-0.5 text-[10px] rounded border ${
            zoomLevel === l.key
              ? 'border-[#D04A02] text-[#D04A02] bg-[#D04A02]/10'
              : 'border-slate-700 text-slate-500 bg-slate-800/50'
          }`}
        >
          {l.label}
        </span>
      ))}
    </div>
  );
}

function CanvasActions() {
  const clearCanvas = useStudioStore(s => s.clearCanvas);
  const autoLayout = useStudioStore(s => s.autoLayout);
  const nodeCount = useStudioStore(s => s.nodes.length);

  if (nodeCount === 0) return null;

  return (
    <div className="absolute top-3 left-[232px] z-10 flex items-center gap-1">
      <button
        onClick={autoLayout}
        className="px-2 py-0.5 text-[10px] rounded border border-slate-700 text-slate-500 hover:text-[#D04A02] hover:border-[#D04A02]/30 bg-slate-800/50"
        title="Arrange nodes in end-to-end flow layout"
      >
        Auto Layout
      </button>
      <button
        onClick={clearCanvas}
        className="px-2 py-0.5 text-[10px] rounded border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/30 bg-slate-800/50"
      >
        Clear Canvas
      </button>
    </div>
  );
}

export default function MetricStudioPage() {
  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-slate-950">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#111118]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#D04A02] font-mono tracking-wider">METRIC STUDIO</span>
            <span className="text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">Phase 1</span>
          </div>
          <a
            href="/metrics/library"
            className="text-[10px] text-slate-500 hover:text-slate-300"
          >
            ← Back to Library
          </a>
        </div>

        {/* Formula bar */}
        <FormulaBar />

        {/* Main 3-panel layout */}
        <div className="flex-1 flex overflow-hidden relative">
          <FieldPalette />
          <div className="flex-1 relative">
            <MetricStudioCanvas />
            <ZoomIndicator />
            <CanvasActions />
          </div>
          <DataInspector />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
