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
import ErrorBoundary from '@/components/governance/ErrorBoundary';
import GovernanceStatusBanner from '@/components/governance/GovernanceStatusBanner';
import UserIdentitySetup from '@/components/governance/UserIdentitySetup';
import { useToast } from '@/components/ui/Toast';
import { getStoredIdentity, governanceHeaders } from '@/lib/governance/identity';
import type { CatalogueItem } from '@/lib/metric-library/types';
import { getFormulasForItem } from '@/components/governance/CalculationWorkspace';
import type { GovernanceStatus } from '@/lib/governance/status-machine';

/** Infer rollup strategy from level definitions sourcing types. */
function inferRollupStrategy(defs: CatalogueItem['level_definitions']): string | undefined {
  if (!defs?.length) return undefined;
  const types = defs.map(d => d.sourcing_type);
  if (types.includes('Avg')) return 'weighted-avg';
  if (types.includes('Calc') && types.includes('Agg')) return 'sum-ratio';
  if (types.every(t => t === 'Agg' || t === 'Raw')) return 'direct-sum';
  if (types.every(t => t === 'Calc')) return 'sum-ratio';
  return 'direct-sum';
}

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
  const { toast } = useToast();
  const itemId = decodeURIComponent(String(params.itemId ?? ''));

  const [item, setItem] = useState<CatalogueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [dbStatus, setDbStatus] = useState<'checking' | 'postgresql' | 'sample-data' | 'disconnected'>('checking');
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
          setLoadError(null);
        } else if (res.status === 404) {
          setLoadError('not_found');
        } else {
          setLoadError(`Server error (${res.status})`);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Network error');
      }
      setLoading(false);
    }
    if (itemId) loadItem();
  }, [itemId]);

  // Fetch dates for picker (falls back to sample data when DB unavailable)
  useEffect(() => {
    async function loadDates() {
      try {
        const res = await fetch('/api/metrics/governance/reference-data?type=dates');
        if (res.status === 503) {
          setDbStatus('disconnected');
          setAvailableDates([]);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setDbStatus(data.source === 'postgresql' ? 'postgresql' : 'sample-data');
          setAvailableDates(data.available ?? []);
          setAsOfDate((prev) => prev ?? data.latest ?? data.available?.[0] ?? null);
        } else {
          setDbStatus('disconnected');
        }
      } catch {
        setDbStatus('disconnected');
      }
    }
    loadDates();
  }, []);

  const handleResultsChange = useCallback((level: string, rows: ResultRow[]) => {
    setActiveResults({ level, rows });
  }, []);

  const handleStatusChange = useCallback((newStatus: GovernanceStatus) => {
    setItem(prev => prev ? { ...prev, status: newStatus as CatalogueItem['status'] } : prev);
  }, []);

  const handleFormulaSave = useCallback(
    async (level: string, sql: string) => {
      if (!item) return;
      const levelKey = level === 'business_segment' ? 'lob' : level;
      const existing = item.level_definitions.find((ld) => ld.level === levelKey);
      const updatedLevelDefs = existing
        ? item.level_definitions.map((ld) =>
            ld.level === levelKey ? { ...ld, formula_sql: sql } : ld,
          )
        : [
            ...item.level_definitions,
            {
              level: levelKey as 'facility' | 'counterparty' | 'desk' | 'portfolio' | 'lob',
              dashboard_display_name: `${item.item_name} (${levelKey})`,
              in_record: true,
              sourcing_type: 'Calc' as const,
              level_logic: '',
              source_references: [],
              formula_sql: sql,
            },
          ];
      const user = typeof window !== 'undefined' ? getStoredIdentity() : null;
      const res = await fetch(`/api/metrics/library/catalogue/${encodeURIComponent(itemId)}`, {
        method: 'PUT',
        headers: governanceHeaders(user, 'Formula updated via governance calculator'),
        body: JSON.stringify({ level_definitions: updatedLevelDefs }),
      });
      if (res.ok) {
        const data = await res.json();
        setItem(data);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          type: 'error',
          title: 'Formula save failed',
          description: err.error || `HTTP ${res.status}`,
        });
      }
    },
    [item, itemId, toast],
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-pwc-black">
        <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />
      </div>
    );
  }

  if (!item) {
    const isNotFound = loadError === 'not_found' || !loadError;
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-pwc-black text-gray-500">
        <Calculator className="w-12 h-12 mb-4" />
        <h2 className="text-lg font-semibold text-gray-400">
          {isNotFound ? 'Metric not found' : 'Failed to load metric'}
        </h2>
        <p className="text-sm mt-1">{isNotFound ? itemId : loadError}</p>
        <div className="flex gap-3 mt-4">
          {!isNotFound && (
            <button
              type="button"
              onClick={() => { setLoading(true); setLoadError(null); }}
              className="px-4 py-2 bg-pwc-orange text-white rounded-lg text-sm hover:bg-pwc-orange/90 transition-colors"
            >
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push('/metrics/library')}
            className="px-4 py-2 bg-pwc-gray border border-pwc-gray-light rounded-lg text-sm text-gray-300 hover:text-pwc-white transition-colors"
          >
            Back to Library
          </button>
        </div>
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
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] text-gray-500 truncate">{item.generic_formula}</p>
            {item.regulatory_references?.length ? (
              <span className="text-[9px] text-gray-600" title="SR 11-7 / BCBS 239 traceability">
                {item.regulatory_references.map((ref) => (
                  <span key={ref} className="px-1 py-0.5 rounded bg-gray-700/50 font-mono mr-0.5">
                    {ref}
                  </span>
                ))}
              </span>
            ) : null}
          </div>
        </div>

        {/* Governance status */}
        <div className="min-w-0 flex-1 max-w-xs">
          <GovernanceStatusBanner
            itemId={itemId}
            currentStatus={(item.status as GovernanceStatus) ?? 'DRAFT'}
            lastEditorId={item.last_editor_id ?? undefined}
            lastEditorName={item.last_editor_name ?? undefined}
            onStatusChange={handleStatusChange}
            onIdentityRequired={() => setShowIdentitySetup(true)}
          />
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
          <Calendar className="w-3.5 h-3.5" />
          <span>as_of:</span>
          {dbStatus === 'disconnected' ? (
            <span className="text-amber-400" title="Database not connected">DB not connected</span>
          ) : availableDates.length > 0 ? (
            <select
              value={asOfDate ?? ''}
              onChange={(e) => setAsOfDate(e.target.value || null)}
              className="bg-pwc-black border border-pwc-gray-light rounded px-2 py-1 text-gray-300 font-mono text-xs focus:outline-none focus:border-pwc-orange"
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          ) : asOfDate ? (
            <span className="text-gray-300 font-mono">{asOfDate}</span>
          ) : (
            <span className="text-amber-400">loading...</span>
          )}
        </div>

        {/* DB status */}
        <div className="flex items-center gap-1 text-[10px] shrink-0" title={{
          checking: 'Checking database connection...',
          postgresql: 'Connected to PostgreSQL',
          'sample-data': 'Using in-memory sample data (no DATABASE_URL)',
          disconnected: 'Database not connected',
        }[dbStatus]}>
          <Database className={`w-3 h-3 ${{
            checking: 'text-gray-500',
            postgresql: 'text-emerald-500',
            'sample-data': 'text-blue-500',
            disconnected: 'text-amber-500',
          }[dbStatus]}`} />
          <span className={{
            checking: 'text-gray-500',
            postgresql: 'text-emerald-400',
            'sample-data': 'text-blue-400',
            disconnected: 'text-amber-400',
          }[dbStatus]}>
            {{ checking: 'Checking...', postgresql: 'PostgreSQL', 'sample-data': 'Sample Data', disconnected: 'Disconnected' }[dbStatus]}
          </span>
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
          <ErrorBoundary paneName="Ingredient Map">
            <IngredientMapPane itemId={itemId} />
          </ErrorBoundary>
        </div>

        {/* Center Pane: Calculation Workspace */}
        <div className="flex-1 bg-pwc-gray overflow-hidden">
          <ErrorBoundary paneName="Calculation Workspace">
            <CalculationWorkspace
              asOfDate={asOfDate}
              itemId={itemId}
              item={item}
              onResultsChange={handleResultsChange}
              onFormulaSave={handleFormulaSave}
            />
          </ErrorBoundary>
        </div>

        {/* Right Pane: Rollup Results */}
        <div className="w-72 shrink-0 border-l border-pwc-gray-light bg-pwc-gray overflow-hidden">
          <ErrorBoundary paneName="Rollup Results">
            <RollupResultsPane
              asOfDate={asOfDate}
              activeResults={activeResults}
              levelFormulas={item ? getFormulasForItem(item) : undefined}
              item={item ? {
                ...item,
                item_id: item.item_id,
                rollup_strategy: inferRollupStrategy(item.level_definitions),
              } : null}
            />
          </ErrorBoundary>
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
