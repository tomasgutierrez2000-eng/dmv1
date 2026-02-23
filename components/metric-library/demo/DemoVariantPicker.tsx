'use client';

import React from 'react';
import { Building2, Briefcase } from 'lucide-react';
import type { VariantKey } from './demoSteps';

/* ────────────────────────────────────────────────────────────────────────────
 * DemoVariantPicker — centered modal for choosing CRE or C&I before demo
 * ──────────────────────────────────────────────────────────────────────────── */

interface DemoVariantPickerProps {
  onSelect: (v: VariantKey) => void;
  onClose: () => void;
}

export default function DemoVariantPicker({ onSelect, onClose }: DemoVariantPickerProps) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-gray-700 bg-[#0f0f0f] shadow-2xl p-6">
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-white mb-1">Choose Your DSCR Variant</h2>
          <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
            DSCR works the same way for all loan types, but the income and debt components differ. Pick a product to walk through with real numbers.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* CRE card */}
          <button
            onClick={() => onSelect('CRE')}
            className="group rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 text-left transition-all hover:border-blue-500/60 hover:bg-blue-500/10 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3 group-hover:bg-blue-500/30 transition-colors">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-sm font-bold text-blue-300 mb-1.5">Real Estate (CRE)</div>
            <div className="text-[10px] text-gray-400 leading-relaxed">
              Uses property rental income<br />to measure coverage
            </div>
            <div className="mt-3 pt-3 border-t border-blue-500/15">
              <div className="text-[10px] text-gray-600 font-mono mb-1">
                NOI &divide; Senior Debt Service
              </div>
              <div className="text-[9px] text-gray-600">
                Example: apartment building, office tower
              </div>
            </div>
          </button>

          {/* C&I card */}
          <button
            onClick={() => onSelect('CI')}
            className="group rounded-xl border border-purple-500/30 bg-purple-500/5 p-5 text-left transition-all hover:border-purple-500/60 hover:bg-purple-500/10 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3 group-hover:bg-purple-500/30 transition-colors">
              <Briefcase className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-sm font-bold text-purple-300 mb-1.5">Corporate (C&I)</div>
            <div className="text-[10px] text-gray-400 leading-relaxed">
              Uses company earnings<br />to measure coverage
            </div>
            <div className="mt-3 pt-3 border-t border-purple-500/15">
              <div className="text-[10px] text-gray-600 font-mono mb-1">
                EBITDA &divide; Global Debt Service
              </div>
              <div className="text-[9px] text-gray-600">
                Example: manufacturer, tech company
              </div>
            </div>
          </button>
        </div>

        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
