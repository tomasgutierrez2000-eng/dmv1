'use client';

import React, { useState, useCallback } from 'react';
import { X, Info, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export interface ExplainPayload {
  metric_identity: {
    name: string;
    id: string;
    classification: string;
    criticality_tier?: string | null;
  };
  value_context: {
    value_display: string | null;
    as_of_date: string | null;
    scope: string | null;
    record_count: number | null;
  };
  source_lineage: string | null;
  calculation_lineage: string | null;
  quality_status: { status: 'green' | 'amber' | 'red'; issues: string[] };
  last_reconciliation: { target: string; date: string; result: string; variance?: string } | null;
  governance: {
    metric_owner: string | null;
    last_reviewed: string | null;
    next_review: string | null;
  };
}

interface ExplainThisNumberProps {
  /** L3 metric id (e.g. M007) or Metric Library variant_id */
  metricId: string;
  /** Use variant_id API when true, else metric_id */
  variantId?: boolean;
  /** Trigger: 'button' shows a small icon button; 'context' means parent handles right-click and calls open() */
  trigger?: 'button' | 'none';
  /** Class name for the trigger button */
  className?: string;
  /** Child to wrap with context menu when trigger is 'context' (optional) */
  children?: React.ReactNode;
}

export function useExplainThisNumber(metricId: string, variantId?: boolean) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ExplainPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExplain = useCallback(async () => {
    if (!metricId) return;
    setLoading(true);
    setError(null);
    try {
      const param = variantId ? `variant_id=${encodeURIComponent(metricId)}` : `metric_id=${encodeURIComponent(metricId)}`;
      const res = await fetch(`/api/explain-metric?${param}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const payload = await res.json();
      setData(payload);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [metricId, variantId]);

  return { open, setOpen, data, loading, error, fetchExplain };
}

export default function ExplainThisNumber({
  metricId,
  variantId = false,
  trigger = 'button',
  className = '',
  children,
}: ExplainThisNumberProps) {
  const { open, setOpen, data, loading, error, fetchExplain } = useExplainThisNumber(metricId, variantId);

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fetchExplain();
  };

  return (
    <>
      {trigger === 'button' && (
        <button
          type="button"
          onClick={handleOpen}
          className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-500 hover:text-purple-400 hover:bg-white/5 transition-colors ${className}`}
          title="Explain this number"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Info className="w-3.5 h-3.5" />}
        </button>
      )}
      {children && trigger === 'none' && (
        <span onClick={handleOpen} onContextMenu={(e) => { e.preventDefault(); handleOpen(e as unknown as React.MouseEvent); }} className="cursor-pointer">
          {children}
        </span>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-400" />
                Explain this number
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              {data && (
                <>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Metric</div>
                    <p className="text-white font-medium">{data.metric_identity.name}</p>
                    <p className="text-xs text-gray-400">
                      {data.metric_identity.id} · {data.metric_identity.classification}
                      {data.metric_identity.criticality_tier && ` · ${data.metric_identity.criticality_tier}`}
                    </p>
                  </div>
                  {data.value_context.value_display != null && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Value</div>
                      <p className="text-emerald-400 font-mono font-semibold">{data.value_context.value_display}</p>
                      {data.value_context.scope && <p className="text-xs text-gray-400 mt-0.5">{data.value_context.scope}</p>}
                    </div>
                  )}
                  {data.calculation_lineage && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Calculation</div>
                      <p className="text-sm text-purple-300 font-mono break-all">{data.calculation_lineage}</p>
                    </div>
                  )}
                  {data.source_lineage && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Source lineage</div>
                      <p className="text-sm text-gray-300">{data.source_lineage}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {data.quality_status.status === 'green' && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Quality: OK
                      </span>
                    )}
                    {data.quality_status.status === 'amber' && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400">Quality: Warnings</span>
                    )}
                    {data.quality_status.status === 'red' && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-red-400">Quality: Issues</span>
                    )}
                  </div>
                  {(data.governance.metric_owner || data.governance.last_reviewed) && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Governance</div>
                      <p className="text-xs text-gray-400">
                        {data.governance.metric_owner && `Owner: ${data.governance.metric_owner}. `}
                        {data.governance.last_reviewed && `Last reviewed: ${data.governance.last_reviewed}. `}
                        {data.governance.next_review && `Next review: ${data.governance.next_review}.`}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
