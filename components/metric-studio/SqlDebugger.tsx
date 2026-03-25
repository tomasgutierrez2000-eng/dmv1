'use client';

import React from 'react';
import { useStudioStore } from '@/lib/metric-studio/canvas-state';
import { composeSQL } from '@/lib/metric-studio/formula-composer';

export function SqlDebugger() {
  const composedFields = useStudioStore(s => s.composedFields);
  const schema = useStudioStore(s => s.schema);
  const debugStepIndex = useStudioStore(s => s.debugStepIndex);
  const debugStepCount = useStudioStore(s => s.debugStepCount);
  const setDebugStep = useStudioStore(s => s.setDebugStep);

  // Recompute steps from current composition
  const relationships = (schema?.relationships ?? []).map(r => ({
    from_table: r.fromTable, from_field: r.fromColumn,
    to_table: r.toTable, to_field: r.toColumn,
    from_layer: r.fromLayer, to_layer: r.toLayer,
  }));
  const composed = composeSQL(composedFields, relationships);
  const steps = composed.steps;
  const currentStep = steps[debugStepIndex];

  if (steps.length === 0) {
    return (
      <div className="px-3 py-2 text-[10px] text-slate-500 italic">
        Add fields to the canvas to enable the SQL debugger.
      </div>
    );
  }

  return (
    <div className="border-t border-slate-800">
      {/* Controls */}
      <div className="px-3 py-1.5 flex items-center gap-2 bg-[#111118] border-b border-slate-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDebugStep(debugStepIndex - 1)}
            disabled={debugStepIndex <= 0}
            className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] hover:border-[#D04A02] hover:text-[#D04A02] disabled:opacity-30 disabled:hover:border-slate-700 disabled:hover:text-slate-400"
            title="Previous step"
          >◀</button>
          <button
            onClick={() => setDebugStep(debugStepIndex + 1)}
            disabled={debugStepIndex >= steps.length - 1}
            className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] hover:border-[#D04A02] hover:text-[#D04A02] disabled:opacity-30 disabled:hover:border-slate-700 disabled:hover:text-slate-400"
            title="Next step"
          >▶</button>
          <button
            onClick={() => setDebugStep(steps.length - 1)}
            disabled={debugStepIndex >= steps.length - 1}
            className="w-6 h-6 flex items-center justify-center rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] hover:border-[#D04A02] hover:text-[#D04A02] disabled:opacity-30 disabled:hover:border-slate-700 disabled:hover:text-slate-400"
            title="Run to end"
          >▶|</button>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          Step {debugStepIndex + 1}/{steps.length}: <span className="text-slate-300">{currentStep?.description ?? ''}</span>
        </span>
      </div>

      {/* Step SQL */}
      {currentStep && (
        <div className="px-3 py-2 max-h-[200px] overflow-y-auto">
          <pre className="text-[10px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">
            {currentStep.sql}
          </pre>
        </div>
      )}

      {/* Step progress dots */}
      <div className="px-3 py-1 flex items-center gap-1">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setDebugStep(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === debugStepIndex ? 'bg-[#D04A02]' :
              i < debugStepIndex ? 'bg-slate-600' : 'bg-slate-800'
            }`}
            title={`Step ${i + 1}: ${s.description}`}
          />
        ))}
      </div>
    </div>
  );
}
