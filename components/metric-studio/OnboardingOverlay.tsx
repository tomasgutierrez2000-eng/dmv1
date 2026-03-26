'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface OnboardingOverlayProps {
  onSubmit: (message: string) => void;
  onTemplate: (metricId: string) => void;
  onSkip: () => void;
}

const TEMPLATES = [
  { id: 'EXP-015', name: 'Expected Loss Rate', desc: 'PD x LGD x Committed exposure' },
  { id: 'EXP-014', name: 'DSCR', desc: 'Debt Service Coverage Ratio' },
  { id: 'RSK-009', name: 'Loan-to-Value', desc: 'Outstanding balance / collateral value' },
  { id: 'EXP-021', name: 'Utilization', desc: 'Drawn amount / committed amount' },
  { id: 'RSK-010', name: 'Migration Rate', desc: 'Rating downgrades as % of book' },
  { id: 'PRC-003', name: 'Exception Rate', desc: 'Pricing exceptions as % of facilities' },
];

export function OnboardingOverlay({ onSubmit, onTemplate, onSkip }: OnboardingOverlayProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the input on mount
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputValue.trim()) {
        onSubmit(inputValue.trim());
      }
    },
    [inputValue, onSubmit]
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="w-full max-w-2xl px-6">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-50 font-mono tracking-tight">
            METRIC STUDIO
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Build credit risk metrics with AI assistance
          </p>
        </div>

        {/* Main input */}
        <form onSubmit={handleSubmit} className="mb-8">
          <label className="block text-sm text-slate-300 mb-3 text-center">
            What do you want to measure?
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g., average probability of default weighted by exposure"
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-5 py-4 text-base text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#D04A02]/60 focus:ring-2 focus:ring-[#D04A02]/20 font-mono"
            />
            {inputValue.trim() && (
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#D04A02] text-white text-sm rounded-lg hover:bg-[#E87722] transition-colors"
              >
                Build
              </button>
            )}
          </div>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-xs text-slate-600">or start from a template</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onTemplate(t.id)}
              className="text-left bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3 hover:border-[#D04A02]/40 hover:bg-[#D04A02]/5 transition-colors group"
            >
              <div className="text-sm text-slate-200 font-medium group-hover:text-[#D04A02] transition-colors">
                {t.name}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Skip link */}
        <div className="text-center">
          <button
            onClick={onSkip}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Skip &mdash; I know what I&apos;m doing &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
