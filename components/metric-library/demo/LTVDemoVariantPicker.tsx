'use client';

import React from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import type { LTVVariantKey } from './ltvDemoSteps';

/* ────────────────────────────────────────────────────────────────────────────
 * LTVDemoVariantPicker — centered modal for choosing Standard or Stressed LTV
 * ──────────────────────────────────────────────────────────────────────────── */

interface LTVDemoVariantPickerProps {
  onSelect: (v: LTVVariantKey) => void;
  onClose: () => void;
}

export default function LTVDemoVariantPicker({ onSelect, onClose }: LTVDemoVariantPickerProps) {
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
          <h2 className="text-lg font-bold text-white mb-1">Choose Your LTV Variant</h2>
          <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
            Both variants measure the same thing — how much of the collateral&apos;s value is covered by the loan. They differ in how they value the collateral.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Standard card */}
          <button
            onClick={() => onSelect('standard')}
            className="group rounded-xl border border-teal-500/30 bg-teal-500/5 p-5 text-left transition-all hover:border-teal-500/60 hover:bg-teal-500/10 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center mb-3 group-hover:bg-teal-500/30 transition-colors">
              <Shield className="w-5 h-5 text-teal-400" />
            </div>
            <div className="text-sm font-bold text-teal-300 mb-1.5">Standard LTV</div>
            <div className="text-[10px] text-gray-400 leading-relaxed">
              Uses current market<br />collateral valuation
            </div>
            <div className="mt-3 pt-3 border-t border-teal-500/15">
              <div className="text-[10px] text-gray-600 font-mono mb-1">
                Drawn &divide; Collateral Value
              </div>
              <div className="text-[9px] text-gray-600">
                Metric ID: C104
              </div>
            </div>
          </button>

          {/* Stressed card */}
          <button
            onClick={() => onSelect('stressed')}
            className="group rounded-xl border border-orange-500/30 bg-orange-500/5 p-5 text-left transition-all hover:border-orange-500/60 hover:bg-orange-500/10 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center mb-3 group-hover:bg-orange-500/30 transition-colors">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-sm font-bold text-orange-300 mb-1.5">Stressed LTV</div>
            <div className="text-[10px] text-gray-400 leading-relaxed">
              Applies haircut to<br />collateral value
            </div>
            <div className="mt-3 pt-3 border-t border-orange-500/15">
              <div className="text-[10px] text-gray-600 font-mono mb-1">
                Drawn &divide; Stressed Value
              </div>
              <div className="text-[9px] text-gray-600">
                Metric ID: C105
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
