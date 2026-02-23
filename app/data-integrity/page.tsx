'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';

/**
 * Page 4 — Legal Entity & Data Integrity.
 * Data Quality Score, Reconciliation Breaks, Attribute DQ from Accuracy Assurance Engine.
 */
export default function DataIntegrityPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    data_quality_score: number | null;
    open_breaks_count: number;
    open_breaks_by_severity: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/accuracy/summary')
      .then((r) => r.ok ? r.json() : null)
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/overview"
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              <div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Page 4 — Data Integrity</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Data Quality Score, Reconciliation Breaks, Attribute DQ (Accuracy Assurance Engine)
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid gap-6 md:grid-cols-3 mb-10">
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Data Quality Score</h2>
            </div>
            <p className="text-slate-400 text-sm">Composite from Layer 1–4 validation pass rate.</p>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500 text-xs mt-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                Loading…
              </div>
            ) : summary?.data_quality_score != null ? (
              <p className="text-2xl font-bold text-emerald-400 mt-2">{summary.data_quality_score}%</p>
            ) : (
              <p className="text-slate-500 text-xs mt-2">No validation runs yet. Run validations to see the Data Quality Score here.</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Reconciliation Breaks</h2>
            </div>
            <p className="text-slate-400 text-sm">Open breaks (cross-source and end-to-end).</p>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500 text-xs mt-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                Loading…
              </div>
            ) : summary ? (
              <>
                <p className="text-2xl font-bold text-amber-400 mt-2">{summary.open_breaks_count} open</p>
                {summary.open_breaks_by_severity && Object.keys(summary.open_breaks_by_severity).length > 0 && (
                  <div className="text-xs text-slate-400 mt-1">
                    {Object.entries(summary.open_breaks_by_severity)
                      .filter(([, n]) => n > 0)
                      .map(([sev, n]) => `${sev}: ${n}`)
                      .join(' · ')}
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-xs mt-2">Unable to load summary.</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Data Quality Trend</h2>
            </div>
            <p className="text-slate-400 text-sm">12-month trend of validation results.</p>
            <p className="text-slate-500 text-xs mt-2">Chart when historical runs are available.</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm">
          <Link href="/lineage" className="text-purple-400 hover:underline">L3 Lineage</Link>
          {' · '}
          <Link href="/metrics/library" className="text-purple-400 hover:underline">Metric Library</Link>
          {' · '}
          <Link href="/platform-operations" className="text-purple-400 hover:underline">Platform Operations</Link>
        </p>
      </main>
    </div>
  );
}
