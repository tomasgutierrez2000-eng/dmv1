'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useStudioStore } from '@/lib/metric-studio/canvas-state';

const STEPS = [
  {
    title: 'Data Tables',
    description: 'These tables contain the raw data your metric needs. L2 tables hold snapshots and events, L1 tables hold reference/lookup data.',
    target: 'nodes',
  },
  {
    title: 'Ingredient Fields',
    description: 'The highlighted fields (orange border) are the specific columns used in the formula. M = measure, J = join key, D = dimension.',
    target: 'fields',
  },
  {
    title: 'Data Connections',
    description: 'Edges show how tables link together via foreign keys. Hover any edge to see the relationship in plain English.',
    target: 'edges',
  },
  {
    title: 'The Formula',
    description: 'The formula bar shows the SQL calculation. Toggle to "EN" mode to see it in plain English. Click "Run" to execute.',
    target: 'formula',
  },
] as const;

interface GuidedWalkthroughProps {
  metricName: string;
  onDismiss: () => void;
}

export function GuidedWalkthrough({ metricName, onDismiss }: GuidedWalkthroughProps) {
  const [step, setStep] = useState(0);
  const highlightNodes = useStudioStore((s) => s.highlightNodes);
  const nodes = useStudioStore((s) => s.nodes);

  // Highlight relevant elements based on current step
  useEffect(() => {
    if (STEPS[step]?.target === 'nodes') {
      highlightNodes(nodes.map((n) => n.id));
    } else {
      highlightNodes([]);
    }
    return () => highlightNodes([]);
  }, [step, nodes, highlightNodes]);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Remember dismissal
      localStorage.setItem(`walkthrough-${metricName}`, 'dismissed');
      onDismiss();
    }
  }, [step, metricName, onDismiss]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(`walkthrough-${metricName}`, 'dismissed');
    highlightNodes([]);
    onDismiss();
  }, [metricName, onDismiss, highlightNodes]);

  const currentStep = STEPS[step];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[400px]">
      <div className="bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-sm p-4">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? 'bg-[#D04A02]' : i < step ? 'bg-slate-600' : 'bg-slate-800'
              }`}
            />
          ))}
          <span className="text-[9px] text-slate-500 ml-auto">Step {step + 1}/{STEPS.length}</span>
        </div>

        {/* Content */}
        <div className="mb-3">
          <h3 className="text-sm font-medium text-slate-200 mb-1">{currentStep.title}</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">{currentStep.description}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button
            onClick={handleSkip}
            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            Skip walkthrough
          </button>
          <button
            onClick={handleNext}
            className="px-3 py-1 text-[10px] bg-[#D04A02] text-white rounded hover:bg-[#E87722] transition-colors"
          >
            {step < STEPS.length - 1 ? 'Next' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
}
