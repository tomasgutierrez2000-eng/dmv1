'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ReactFlowProvider } from '@xyflow/react';
import { MetricStudioCanvas } from '@/components/metric-studio/MetricStudioCanvas';
import { FieldPalette } from '@/components/metric-studio/FieldPalette';
import { FormulaBar } from '@/components/metric-studio/FormulaBar';
import { ChatPanel } from '@/components/metric-studio/ChatPanel';
import { OnboardingOverlay } from '@/components/metric-studio/OnboardingOverlay';
import { ResultsPanel } from '@/components/metric-studio/ResultsPanel';
import { useStudioStore } from '@/lib/metric-studio/canvas-state';

// ---------- zoom indicator ----------

function ZoomIndicator() {
  const zoomLevel = useStudioStore((s) => s.zoomLevel);
  const levels = [
    { key: 'cro', label: 'CRO View' },
    { key: 'analyst', label: 'Analyst View' },
    { key: 'validator', label: 'Validator View' },
  ] as const;

  return (
    <div className="absolute top-3 right-[312px] z-10 flex items-center gap-1">
      {levels.map((l) => (
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

// ---------- canvas toolbar ----------

function CanvasToolbar() {
  const clearCanvas = useStudioStore((s) => s.clearCanvas);
  const nodeCount = useStudioStore((s) => s.nodes.length);

  return (
    <div className="absolute top-3 left-[232px] z-10 flex items-center gap-1.5">
      {nodeCount > 0 && (
        <button
          onClick={clearCanvas}
          className="px-2 py-0.5 text-[10px] rounded border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/30 bg-slate-800/50"
        >
          Clear
        </button>
      )}
    </div>
  );
}

// ---------- main page ----------

export default function MetricStudioPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const executionResult = useStudioStore((s) => s.executionResult);
  const loadMetricTemplate = useStudioStore((s) => s.loadMetricTemplate);

  // Check if first visit
  useEffect(() => {
    const onboarded = localStorage.getItem('studio-onboarded');
    if (!onboarded) {
      setShowOnboarding(true);
    }
  }, []);

  // Show results panel when execution completes
  useEffect(() => {
    if (executionResult) {
      setShowResults(true);
    }
  }, [executionResult]);

  const handleOnboardingSubmit = useCallback((message: string) => {
    localStorage.setItem('studio-onboarded', 'true');
    setShowOnboarding(false);
    // The chat panel will pick up this message — for now we store it
    // and the ChatPanel can read it on mount
    sessionStorage.setItem('studio-initial-message', message);
  }, []);

  const handleOnboardingTemplate = useCallback(
    (metricId: string) => {
      localStorage.setItem('studio-onboarded', 'true');
      setShowOnboarding(false);
      loadMetricTemplate(metricId);
    },
    [loadMetricTemplate]
  );

  const handleOnboardingSkip = useCallback(() => {
    localStorage.setItem('studio-onboarded', 'true');
    setShowOnboarding(false);
  }, []);

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-slate-950">
        {/* Onboarding overlay */}
        {showOnboarding && (
          <OnboardingOverlay
            onSubmit={handleOnboardingSubmit}
            onTemplate={handleOnboardingTemplate}
            onSkip={handleOnboardingSkip}
          />
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#111118] shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#D04A02] font-mono tracking-wider">METRIC STUDIO</span>
            <span className="text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">v2</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowResults((v) => !v)}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                showResults
                  ? 'border-[#D04A02]/50 text-[#D04A02] bg-[#D04A02]/10'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              Results
            </button>
            <Link
              href="/metrics/library"
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              &larr; Library
            </Link>
          </div>
        </div>

        {/* Formula bar */}
        <FormulaBar />

        {/* Main content (canvas area + optional results) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Upper area: palette + canvas + chat */}
          <div className="flex-1 flex overflow-hidden relative" style={showResults && executionResult ? { flex: '0 0 65%' } : undefined}>
            <FieldPalette />
            <div className="flex-1 relative min-w-[400px]">
              <MetricStudioCanvas />
              <ZoomIndicator />
              <CanvasToolbar />
              {/* Empty state */}
              {useStudioStore.getState().nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-sm text-slate-600">Ask the AI to build a formula</p>
                    <p className="text-xs text-slate-700 mt-1">or drag tables from the left panel</p>
                  </div>
                </div>
              )}
            </div>
            <ChatPanel />
          </div>

          {/* Lower area: results panel */}
          <ResultsPanel visible={showResults} />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
