'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, GitBranch, RefreshCw, Calculator } from 'lucide-react';
import CalculationTrace from '@/components/governance/calculation-trace/CalculationTrace';
import type { CatalogueItem } from '@/lib/metric-library/types';

export default function TracePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = decodeURIComponent(String(params.itemId ?? ''));

  const [item, setItem] = useState<CatalogueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // URL params for pre-population
  const initialLevel = searchParams.get('level') ?? undefined;
  const initialKey = searchParams.get('key') ?? undefined;
  const initialDate = searchParams.get('date') ?? undefined;

  // Fetch catalogue item
  useEffect(() => {
    async function loadItem() {
      try {
        const res = await fetch(`/api/metrics/library/catalogue/${encodeURIComponent(itemId)}`);
        if (res.ok) {
          setItem(await res.json());
        } else if (res.status === 404) {
          setError('Metric not found');
        } else {
          setError(`Server error (${res.status})`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error');
      }
      setLoading(false);
    }
    if (itemId) loadItem();
  }, [itemId]);

  // Fetch available dates
  useEffect(() => {
    async function loadDates() {
      try {
        const res = await fetch('/api/metrics/governance/reference-data?type=dates');
        if (res.ok) {
          const data = await res.json();
          setAvailableDates(data.available ?? []);
          setAsOfDate(initialDate ?? data.latest ?? data.available?.[0] ?? null);
        }
      } catch {
        // Dates unavailable
      }
    }
    loadDates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-pwc-black">
        <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
      </div>
    );
  }

  if (!item || error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-pwc-black text-gray-500">
        <GitBranch className="w-12 h-12 mb-4" />
        <h2 className="text-lg font-semibold text-gray-400">{error ?? 'Metric not found'}</h2>
        <button
          type="button"
          onClick={() => router.push('/metrics/library')}
          className="mt-4 px-4 py-2 bg-pwc-gray border border-pwc-gray-light rounded-lg text-sm text-gray-300 hover:text-pwc-white transition-colors"
        >
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pwc-black">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-3 bg-pwc-gray border-b border-pwc-gray-light">
        <button
          type="button"
          onClick={() => router.push(`/metrics/library/${encodeURIComponent(itemId)}/calculator`)}
          className="flex items-center gap-1.5 text-gray-400 hover:text-pwc-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Calculator
        </button>

        <div className="h-5 w-px bg-pwc-gray-light" />

        <GitBranch className="w-4 h-4 text-emerald-400" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-pwc-white truncate">
            {item.abbreviation} — Calculation Trace
          </h1>
          <p className="text-[10px] text-gray-500 truncate">{item.generic_formula}</p>
        </div>

        {/* Calculator link */}
        <button
          type="button"
          onClick={() => router.push(`/metrics/library/${encodeURIComponent(itemId)}/calculator`)}
          className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-gray-400 hover:text-pwc-orange hover:bg-pwc-orange/5 rounded transition-colors"
        >
          <Calculator className="w-3 h-3" />
          Open Calculator
        </button>

        {/* Date picker */}
        {availableDates.length > 0 && (
          <select
            value={asOfDate ?? ''}
            onChange={(e) => setAsOfDate(e.target.value || null)}
            className="bg-pwc-black border border-pwc-gray-light rounded px-2 py-1 text-gray-300 font-mono text-xs focus:outline-none focus:border-pwc-orange"
          >
            {availableDates.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {asOfDate ? (
          <CalculationTrace
            item={item}
            asOfDate={asOfDate}
            initialLevel={initialLevel}
            initialKey={initialKey}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">Loading dates...</p>
          </div>
        )}
      </main>
    </div>
  );
}
