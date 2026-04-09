'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { AgentCapability, CapabilityPhase } from '@/lib/agent-library/types';

const PHASE_CONFIG: Record<CapabilityPhase, { label: string; order: number }> = {
  context:    { label: 'Context & Setup',       order: 0 },
  analysis:   { label: 'Analysis & Processing', order: 1 },
  output:     { label: 'Output & Delivery',     order: 2 },
  validation: { label: 'Validation & Audit',    order: 3 },
  general:    { label: 'General',               order: 4 },
};

function CapabilityRow({
  cap,
  isOpen,
  onToggle,
}: {
  cap: AgentCapability;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle();
      }
    },
    [onToggle],
  );

  return (
    <div className="rounded-md border border-slate-700/40 bg-slate-800/30 overflow-hidden">
      <button
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        role="button"
        aria-expanded={isOpen}
        className="flex items-start gap-2.5 w-full text-left px-3 py-2.5 min-h-[44px] group hover:bg-slate-700/30 transition-colors duration-100"
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0 transition-transform duration-150" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0 group-hover:text-slate-400 transition-colors duration-100" />
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-slate-200 font-mono group-hover:text-white transition-colors duration-100">
            {cap.title}
          </span>
          {!isOpen && cap.description && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{cap.description}</p>
          )}
        </div>
      </button>
      <div
        className="transition-[max-height,opacity] duration-150 ease-out overflow-hidden"
        style={{
          maxHeight: isOpen ? '300px' : '0px',
          opacity: isOpen ? 1 : 0,
        }}
      >
        {cap.description ? (
          <div className="px-3 pb-3 pt-0 ml-6">
            <div className="bg-slate-800/60 rounded-md p-3">
              <p className="text-xs text-slate-400 leading-relaxed">{cap.description}</p>
            </div>
          </div>
        ) : (
          <div className="px-3 pb-3 pt-0 ml-6">
            <p className="text-xs text-slate-600 italic">No description available</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CapabilityList({ capabilities }: { capabilities: AgentCapability[] }) {
  const [openSet, setOpenSet] = useState<Set<number>>(new Set());

  const toggle = useCallback((idx: number) => {
    setOpenSet(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  if (capabilities.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 text-center">
        <p className="text-xs text-slate-500 italic">No capabilities parsed from agent definition</p>
      </div>
    );
  }

  // Group by phase, preserving original order within each phase
  const grouped = new Map<CapabilityPhase, { cap: AgentCapability; globalIdx: number }[]>();
  capabilities.forEach((cap, i) => {
    const list = grouped.get(cap.phase) || [];
    list.push({ cap, globalIdx: i });
    grouped.set(cap.phase, list);
  });

  // Sort phases by configured order, filter empty
  const sortedPhases = Array.from(grouped.entries())
    .sort(([a], [b]) => PHASE_CONFIG[a].order - PHASE_CONFIG[b].order);

  // If only one phase exists, skip the phase headers
  const showPhaseHeaders = sortedPhases.length > 1;

  return (
    <div className="space-y-4">
      {sortedPhases.map(([phase, items]) => (
        <div key={phase}>
          {showPhaseHeaders && (
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] text-emerald-400/70 uppercase tracking-wide font-medium">
                {PHASE_CONFIG[phase].label}
              </h3>
              <span className="text-[10px] text-slate-600">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          )}
          <div className="space-y-1">
            {items.map(({ cap, globalIdx }) => (
              <CapabilityRow
                key={globalIdx}
                cap={cap}
                isOpen={openSet.has(globalIdx)}
                onToggle={() => toggle(globalIdx)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
