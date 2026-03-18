'use client';

import { useState, useCallback, useRef } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import TraceEntityPicker from './TraceEntityPicker';
import TraceStepTimeline from './TraceStepTimeline';
import TraceFormulaPanel from './TraceFormulaPanel';
import TraceResultBadge from './TraceResultBadge';
import type { CatalogueItem, LevelDefinition } from '@/lib/metric-library/types';

/* ── Types ──────────────────────────────────────────────────────────── */

interface TraceColumnUsed {
  name: string;
  value: unknown;
  role: 'measure' | 'join_key' | 'filter' | 'reference';
}

interface TraceStep {
  order: number;
  type: 'source' | 'join' | 'filter' | 'compute';
  table_name: string;
  table_display: string;
  layer: string;
  alias_in_sql: string;
  description: string;
  join_condition?: string;
  columns_used: TraceColumnUsed[];
  row_data: Record<string, unknown>[];
  row_count: number;
}

interface TraceResult {
  metric: {
    item_id: string;
    name: string;
    abbreviation: string;
    formula: string;
    formula_sql: string;
    unit_type: string;
    direction: string;
  };
  entity: {
    level: string;
    dimension_key: string;
    dimension_label: string;
  };
  steps: TraceStep[];
  final_result: {
    metric_value: number | null;
    formatted: string;
  };
  as_of_date: string;
  duration_ms: number;
}

/* ── Level tabs ─────────────────────────────────────────────────────── */

const LEVEL_TABS = [
  { key: 'facility', label: 'Facility', catalogueKey: 'facility' },
  { key: 'counterparty', label: 'Counterparty', catalogueKey: 'counterparty' },
  { key: 'desk', label: 'Desk', catalogueKey: 'desk' },
  { key: 'portfolio', label: 'Portfolio', catalogueKey: 'portfolio' },
  { key: 'business_segment', label: 'Segment', catalogueKey: 'lob' },
];

/* ── Component ──────────────────────────────────────────────────────── */

interface CalculationTraceProps {
  item: CatalogueItem;
  asOfDate: string;
  initialLevel?: string;
  initialKey?: string;
}

export default function CalculationTrace({
  item,
  asOfDate,
  initialLevel,
  initialKey,
}: CalculationTraceProps) {
  const [activeLevel, setActiveLevel] = useState(initialLevel ?? 'facility');
  const [selectedKey, setSelectedKey] = useState<string | null>(initialKey ?? null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Get formula for current level
  const catalogueKey = LEVEL_TABS.find(t => t.key === activeLevel)?.catalogueKey ?? activeLevel;
  const levelDef = item.level_definitions?.find((d: LevelDefinition) => d.level === catalogueKey);
  const formulaSql = levelDef?.formula_sql?.trim() ?? '';

  // Run trace (with request cancellation)
  const runTrace = useCallback(async (key: string) => {
    if (!key || !formulaSql) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setTraceResult(null);

    try {
      const res = await fetch('/api/metrics/governance/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.item_id,
          level: activeLevel,
          dimension_key: key,
          as_of_date: asOfDate,
        }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }

      setTraceResult(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Trace request failed');
    } finally {
      setLoading(false);
    }
  }, [item.item_id, activeLevel, asOfDate, formulaSql]);

  const handleEntitySelect = useCallback((key: string, label: string) => {
    setSelectedKey(key);
    setSelectedLabel(label);
    runTrace(key);
  }, [runTrace]);

  const handleLevelChange = useCallback((level: string) => {
    setActiveLevel(level);
    setSelectedKey(null);
    setSelectedLabel(null);
    setTraceResult(null);
    setError(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Level selector */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {LEVEL_TABS.map(tab => {
          const tabCatalogueKey = tab.catalogueKey;
          const hasFormula = item.level_definitions?.some(
            (d: LevelDefinition) => d.level === tabCatalogueKey && d.formula_sql?.trim()
          );
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleLevelChange(tab.key)}
              disabled={!hasFormula}
              title={!hasFormula ? `No formula defined for ${tab.label}` : undefined}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                ${activeLevel === tab.key
                  ? 'bg-pwc-orange/20 text-pwc-orange border border-pwc-orange/40'
                  : hasFormula
                    ? 'text-gray-400 hover:text-gray-300 hover:bg-pwc-gray-light/30'
                    : 'text-gray-600 cursor-not-allowed opacity-50'
                }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* No formula warning */}
      {!formulaSql && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-amber-400">No formula defined for this level. Switch to a level with a formula.</span>
        </div>
      )}

      {/* Entity picker */}
      {formulaSql && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Select Entity
          </h3>
          <TraceEntityPicker
            level={activeLevel}
            itemId={item.item_id}
            formulaSql={formulaSql}
            asOfDate={asOfDate}
            selectedKey={selectedKey}
            onSelect={handleEntitySelect}
          />
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="w-5 h-5 text-pwc-orange animate-spin" />
          <span className="text-sm text-gray-400">Building calculation trace...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      {/* Trace result */}
      {traceResult && !loading && (
        <div className="space-y-6">
          {/* Entity header */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-pwc-gray border border-pwc-gray-light">
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                {LEVEL_TABS.find(t => t.key === traceResult.entity.level)?.label ?? traceResult.entity.level}
              </span>
              <p className="text-sm font-semibold text-gray-200">{traceResult.entity.dimension_label}</p>
              <p className="text-[10px] text-gray-500 font-mono">
                as_of_date: {traceResult.as_of_date} · {traceResult.duration_ms}ms
              </p>
            </div>
            <TraceResultBadge
              value={traceResult.final_result.metric_value}
              formatted={traceResult.final_result.formatted}
              unitType={traceResult.metric.unit_type}
              direction={traceResult.metric.direction}
            />
          </div>

          {/* Step-by-step timeline */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Calculation Steps
            </h3>
            <TraceStepTimeline steps={traceResult.steps} />
          </div>

          {/* Formula panel */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Formula & Values
            </h3>
            <TraceFormulaPanel
              formula={traceResult.metric.formula}
              formulaSql={traceResult.metric.formula_sql}
              unitType={traceResult.metric.unit_type}
              steps={traceResult.steps}
              metricValue={traceResult.final_result.metric_value}
              formatted={traceResult.final_result.formatted}
            />
          </div>
        </div>
      )}
    </div>
  );
}
