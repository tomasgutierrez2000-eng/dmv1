'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Calculator, Shield, Calendar,
  RefreshCw, Settings, Database,
} from 'lucide-react';
import IngredientMapPane from '@/components/governance/IngredientMapPane';
import CalculationWorkspace from '@/components/governance/CalculationWorkspace';
import RollupResultsPane from '@/components/governance/RollupResultsPane';
import GovernanceStatusBanner from '@/components/governance/GovernanceStatusBanner';
import UserIdentitySetup from '@/components/governance/UserIdentitySetup';
import type { CatalogueItem } from '@/lib/metric-library/types';
import type { GovernanceStatus } from '@/lib/governance/status-machine';

interface ResultRow {
  dimension_key: unknown;
  metric_value: unknown;
  [key: string]: unknown;
}

/**
 * Full-screen interactive calculator page for a metric.
 * 3-pane layout: Ingredient Map | Calculation Workspace | Rollup Results
 */
export default function CalculatorPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = decodeURIComponent(String(params.itemId ?? ''));

  const [item, setItem] = useState<CatalogueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState<string | null>(null);
  const [activeResults, setActiveResults] = useState<{ level: string; rows: ResultRow[] } | undefined>();
  const [showIdentitySetup, setShowIdentitySetup] = useState(false);

  // Fetch catalogue item
  useEffect(() => {
    async function loadItem() {
      try {
        const res = await fetch(`/api/metrics/library/catalogue/${encodeURIComponent(itemId)}`);
        if (res.ok) {
          const data = await res.json();
          setItem(data);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    if (itemId) loadItem();
  }, [itemId]);

  // Fetch latest as_of_date
  useEffect(() => {
    async function loadDate() {
      try {
        const res = await fetch('/api/metrics/governance/reference-data?type=dates');
        if (res.ok) {
          const data = await res.json();
          setAsOfDate(data.latest ?? null);
        }
      } catch { /* ignore */ }
    }
    loadDate();
  }, []);

  const handleResultsChange = useCallback((level: string, rows: ResultRow[]) => {
    setActiveResults({ level, rows });
  }, []);

  const handleStatusChange = useCallback((newStatus: GovernanceStatus) => {
    setItem(prev => prev ? { ...prev, status: newStatus as CatalogueItem['status'] } : prev);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-pwc-black">
        <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-pwc-black text-gray-500">
        <Calculator className="w-12 h-12 mb-4" />
        <h2 className="text-lg font-semibold text-gray-400">Metric not found</h2>
        <p className="text-sm mt-1">{itemId}</p>
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
    <div className="h-screen flex flex-col bg-pwc-black overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-pwc-gray border-b border-pwc-gray-light shrink-0">
        <button
          type="button"
          onClick={() => router.push(`/metrics/library/${encodeURIComponent(itemId)}`)}
          className="flex items-center gap-1.5 text-gray-400 hover:text-pwc-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="h-5 w-px bg-pwc-gray-light" />

        <Calculator className="w-4 h-4 text-pwc-orange" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-pwc-white truncate">
            {item.abbreviation} — {item.item_name}
          </h1>
          <p className="text-[10px] text-gray-500 truncate">{item.generic_formula}</p>
        </div>

        {/* Governance status */}
        <div className="w-64 shrink-0">
          <GovernanceStatusBanner
            itemId={itemId}
            currentStatus={(item.status as GovernanceStatus) ?? 'DRAFT'}
            onStatusChange={handleStatusChange}
          />
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
          <Calendar className="w-3.5 h-3.5" />
          <span>as_of:</span>
          {asOfDate ? (
            <span className="text-gray-300 font-mono">{asOfDate}</span>
          ) : (
            <span className="text-amber-400">loading...</span>
          )}
        </div>

        {/* DB status */}
        <div className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
          <Database className="w-3 h-3" />
          <span>PostgreSQL</span>
        </div>

        {/* Identity settings */}
        <button
          type="button"
          onClick={() => setShowIdentitySetup(true)}
          className="p-1.5 rounded hover:bg-pwc-gray-light text-gray-500 hover:text-gray-300 transition-colors"
          title="Identity settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* 3-Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Ingredient Map */}
        <div className="w-72 shrink-0 border-r border-pwc-gray-light bg-pwc-gray overflow-hidden">
          <IngredientMapPane itemId={itemId} />
        </div>

        {/* Center Pane: Calculation Workspace */}
        <div className="flex-1 bg-pwc-gray overflow-hidden">
          <CalculationWorkspace
            asOfDate={asOfDate}
            onResultsChange={handleResultsChange}
          />
        </div>

        {/* Right Pane: Rollup Results */}
        <div className="w-72 shrink-0 border-l border-pwc-gray-light bg-pwc-gray overflow-hidden">
          <RollupResultsPane
            asOfDate={asOfDate}
            activeResults={activeResults}
          />
        </div>
      </div>

      {/* Identity Setup Modal */}
      <UserIdentitySetup
        forceOpen={showIdentitySetup}
        onComplete={() => setShowIdentitySetup(false)}
        onDismiss={() => setShowIdentitySetup(false)}
      />
    </div>
  );
}
