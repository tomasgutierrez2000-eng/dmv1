'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Activity, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

/**
 * Page 11 — Platform Operations (Accuracy Dashboard).
 * Feed arrival status, validation scorecard, open issues.
 */
export default function PlatformOperationsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    data_quality_score: number | null;
    open_breaks_count: number;
    validation_by_layer?: Record<number, { pass: number; warning: number; fail: number }>;
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
          <div className="flex items-center gap-4">
            <Link href="/overview" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-cyan-400" />
              <div>
                <h1 className="text-xl font-semibold text-white">Page 11 — Platform Operations</h1>
                <p className="text-xs text-slate-400">Feed health, validation scorecard, open issues</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 flex items-center gap-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 flex-shrink-0" />
            <div>
              {loading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  Loading…
                </div>
              ) : (
                <div className="text-2xl font-bold text-white">{summary?.data_quality_score ?? '—'}%</div>
              )}
              <div className="text-xs text-slate-400">Data Quality Score</div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 flex items-center gap-4">
            <XCircle className="w-10 h-10 text-amber-400 flex-shrink-0" />
            <div>
              {loading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  Loading…
                </div>
              ) : (
                <div className="text-2xl font-bold text-white">{summary?.open_breaks_count ?? 0}</div>
              )}
              <div className="text-xs text-slate-400">Open breaks</div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Layer 1–2 (Source / Cross)</div>
            <p className="text-slate-400 text-sm">Validation pass/warn/fail from Accuracy Assurance Engine.</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Feed arrival</div>
            <p className="text-slate-400 text-sm">Feed arrival grid and SLA countdown when Source Registry is populated.</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm">
          <Link href="/data-integrity" className="text-purple-400 hover:underline">Data Integrity (Page 4)</Link>
          {' · '}
          <Link href="/metrics/library" className="text-purple-400 hover:underline">Metric Library</Link>
        </p>
      </main>
    </div>
  );
}
