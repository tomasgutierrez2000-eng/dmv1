'use client';

import type { MetricVariant } from '@/lib/metric-library/types';
import { ROLLUP_HIERARCHY_LEVELS, ROLLUP_LEVEL_LABELS } from '@/lib/metric-library/types';

/**
 * Simplified lineage view — shows source table/field and rollup chain.
 * Full L1→L2→L3 lineage lives in the L3 metrics engine, not the library.
 */
export default function MetricLibraryLineageView({ variant }: { variant: MetricVariant }) {
  const v = variant;
  const hasSource = v.source_table || v.source_field;
  const hasRollup = v.rollup_logic && Object.values(v.rollup_logic).some(Boolean);

  if (!hasSource && !hasRollup) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-6 text-center text-gray-500">
        <p className="text-sm">No lineage defined for this variant.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasSource && (
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2">
            <div className="text-[10px] font-bold text-blue-600 uppercase">Source</div>
            <div className="text-sm font-mono text-blue-900">
              {v.source_table}{v.source_field ? `.${v.source_field}` : ''}
            </div>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-300 flex-shrink-0" aria-hidden>
            <path d="M9 12h6m-3-3l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="rounded-lg bg-indigo-100 border border-indigo-300 px-3 py-2">
            <div className="text-[10px] font-bold text-indigo-700 uppercase">This Metric</div>
            <div className="text-sm font-medium text-indigo-900">{v.variant_name}</div>
          </div>
        </div>
      )}

      {hasRollup && (
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Rollup Chain</h3>
          <div className="flex flex-wrap gap-2">
            {ROLLUP_HIERARCHY_LEVELS.map((level, i) => {
              const logic = v.rollup_logic?.[level];
              if (!logic) return null;
              return (
                <div key={level} className="flex items-center gap-2">
                  {i > 0 && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-300 flex-shrink-0" aria-hidden>
                      <path d="M6 8h4m-2-2l2 2-2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5 min-w-[120px]">
                    <div className="text-[9px] font-bold text-gray-500 uppercase">{ROLLUP_LEVEL_LABELS[level]}</div>
                    <div className="text-xs text-gray-700 mt-0.5">{logic}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
