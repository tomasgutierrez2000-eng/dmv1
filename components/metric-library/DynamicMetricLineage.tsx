'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Database,
  GitBranch,
  Layers,
  Table2,
  Users,
  Briefcase,
  FolderTree,
  PieChart,
  Zap,
  BookOpen,
} from 'lucide-react';
import type { CatalogueItem, LevelDefinition, IngredientField, RollupLevelKey } from '@/lib/metric-library/types';
import type { DemoEntity } from '@/lib/metric-library/metric-config';
import type { L3Metric } from '@/data/l3-metrics';
import { buildVisualizationConfig, convertDemoData } from '@/lib/metric-library/config-builder';
import LineageFlowView from '@/components/lineage/LineageFlowView';
import GenericTableTraversalDemo from './GenericTableTraversalDemo';
import AutoDemoOrchestrator from './AutoDemoOrchestrator';
import type { DemoSideEffects } from './demo/useDemoEngine';

/* ════════════════════════════════════════════════════════════════════════════
 * CONSTANTS
 * ════════════════════════════════════════════════════════════════════════════ */

type TabKey = 'facility' | 'counterparty' | 'desk' | 'portfolio' | 'lob';

const LEVEL_ICONS: Record<string, React.ElementType> = {
  facility: Table2,
  counterparty: Users,
  desk: Briefcase,
  portfolio: FolderTree,
  lob: PieChart,
};

const LEVEL_COLORS: Record<string, string> = {
  facility: 'blue',
  counterparty: 'purple',
  desk: 'amber',
  portfolio: 'emerald',
  lob: 'pink',
};

const SOURCING_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  Raw: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', label: 'SOURCED' },
  Calc: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'CALCULATED' },
  Agg: { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'AGGREGATED' },
  Avg: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'AVERAGED' },
};

/* ════════════════════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ════════════════════════════════════════════════════════════════════════════ */

interface DynamicMetricLineageProps {
  item: CatalogueItem;
  /** Pre-resolved L3Metric (from server component — includes lineage nodes/edges). */
  l3Metric?: L3Metric | null;
}

export default function DynamicMetricLineage({ item, l3Metric }: DynamicMetricLineageProps) {
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [activeWalkthrough, setActiveWalkthrough] = useState<TabKey>('facility');
  const [showDemo, setShowDemo] = useState(false);

  // Build visualization config and entities
  const config = useMemo(() => buildVisualizationConfig(item), [item]);
  const entities = useMemo(() => convertDemoData(item, config.metric_fields) ?? [], [item, config]);

  // Sorted level definitions (follow canonical order)
  const levels = useMemo(() => {
    const order: RollupLevelKey[] = ['facility', 'counterparty', 'desk', 'portfolio', 'lob'];
    return order
      .map(key => item.level_definitions.find(d => d.level === key))
      .filter((d): d is LevelDefinition => !!d);
  }, [item.level_definitions]);

  const hasDemoData = !!(item.demo_data?.facilities?.length);

  // Demo side-effect handler — lets the demo orchestrator control page state
  // Deferred via setTimeout to avoid setState-during-render warnings
  const handleDemoSideEffect = (fx: Partial<DemoSideEffects>) => {
    setTimeout(() => {
      if (fx.expandLevel !== undefined) setExpandedLevel(fx.expandLevel);
      if (fx.l2Filter !== undefined) {
        const filterToTab: Record<string, TabKey> = {
          facility: 'facility', counterparty: 'counterparty',
          desk: 'desk', portfolio: 'portfolio', lob: 'lob',
        };
        if (filterToTab[fx.l2Filter]) setActiveWalkthrough(filterToTab[fx.l2Filter]);
      }
    }, 0);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
      {/* Auto Demo Orchestrator */}
      {showDemo && hasDemoData && (
        <AutoDemoOrchestrator
          item={item}
          config={config}
          entities={entities}
          onClose={() => setShowDemo(false)}
          onSideEffect={handleDemoSideEffect}
        />
      )}

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/metrics/library"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Metric Library
          </Link>
          {hasDemoData && (
            <button
              onClick={() => setShowDemo(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Guided Demo
            </button>
          )}
        </div>

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="space-y-4" data-demo="header">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <GitBranch className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-bold text-white">{item.item_name}</h1>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs font-bold">
                  {item.abbreviation}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  item.kind === 'METRIC' ? 'bg-blue-500/15 text-blue-400' : 'bg-gray-500/15 text-gray-400'
                }`}>
                  {item.kind}
                </span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{item.definition}</p>
            </div>
          </div>

          {/* Formula banner */}
          <div className="bg-purple-950/30 rounded-lg p-4 border border-purple-900/40" data-demo="formula">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Formula</span>
              <code className="text-sm font-mono text-purple-300 font-semibold">{item.generic_formula}</code>
            </div>
            <div className="flex items-center gap-4 flex-wrap text-[11px] text-purple-300/70">
              <span>Class: <strong className="text-purple-200">{item.metric_class}</strong></span>
              <span>Unit: <strong className="text-purple-200">{item.unit_type}</strong></span>
              <span>Direction: <strong className="text-purple-200">{item.direction.replace('_', ' ')}</strong></span>
              <span>Rollup: <strong className="text-purple-200">{config.rollup_strategy}</strong></span>
            </div>
          </div>
        </div>

        {/* ── Lineage DAG ────────────────────────────────────────── */}
        {l3Metric && (
          <section data-demo="lineage-dag">
            <SectionHeader icon={GitBranch} title="Data Lineage Flow" />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <LineageFlowView metric={l3Metric} />
            </div>
          </section>
        )}

        {/* ── Ingredient Fields ───────────────────────────────────── */}
        {item.ingredient_fields.length > 0 && (
          <section data-demo="ingredients">
            <SectionHeader icon={Database} title="Ingredient Fields" subtitle={`${item.ingredient_fields.length} source fields`} />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="grid gap-2">
                {item.ingredient_fields.map((f, i) => (
                  <IngredientFieldRow key={`${f.table}-${f.field}-${i}`} field={f} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Rollup Hierarchy ────────────────────────────────────── */}
        <section data-demo="rollup-hierarchy">
          <SectionHeader icon={Layers} title="Rollup Hierarchy" subtitle="How this metric computes at each level" />

          {/* Level Cards */}
          <div className="space-y-3" data-demo="level-cards">
            {levels.map((level) => (
              <div key={level.level} data-demo={`rollup-${level.level}`}>
                <LevelCard
                  level={level}
                  isExpanded={expandedLevel === level.level}
                  onToggle={() => setExpandedLevel(expandedLevel === level.level ? null : level.level)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── Table Traversal Demo ────────────────────────────────── */}
        {config.traversal_config && (
          <section data-demo="table-traversal">
            <SectionHeader icon={Zap} title="Table Traversal Demo" subtitle="See how tables connect at each dimension" />
            <GenericTableTraversalDemo
              config={config.traversal_config}
              metricName={item.abbreviation}
              activeDimension={activeWalkthrough}
            />
          </section>
        )}

      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
 * SUB-COMPONENTS
 * ════════════════════════════════════════════════════════════════════════════ */

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function IngredientFieldRow({ field }: { field: IngredientField }) {
  const layerColors: Record<string, string> = {
    L1: 'text-blue-400 bg-blue-500/10',
    L2: 'text-cyan-400 bg-cyan-500/10',
    L3: 'text-emerald-400 bg-emerald-500/10',
  };
  const lc = layerColors[field.layer] ?? 'text-gray-400 bg-gray-500/10';
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-gray-800/50">
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${lc}`}>{field.layer}</span>
      <span className="text-xs font-mono text-gray-400">{field.table}</span>
      <span className="text-xs text-gray-600">.</span>
      <span className="text-xs font-mono text-gray-200">{field.field}</span>
      <span className="text-xs text-gray-500 ml-auto">{field.description}</span>
    </div>
  );
}

function LevelCard({
  level,
  isExpanded,
  onToggle,
}: {
  level: LevelDefinition;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = LEVEL_ICONS[level.level] ?? Table2;
  const color = LEVEL_COLORS[level.level] ?? 'gray';
  const badge = SOURCING_BADGES[level.sourcing_type] ?? SOURCING_BADGES.Raw;

  return (
    <div className={`rounded-xl border transition-all ${
      isExpanded ? `border-${color}-500/40 bg-${color}-500/5` : 'border-gray-800 bg-gray-900/50'
    }`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className={`w-8 h-8 rounded-lg bg-${color}-500/20 flex items-center justify-center`}>
          <Icon className={`w-4 h-4 text-${color}-400`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{level.dashboard_display_name}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Level logic */}
          <div className="bg-black/30 rounded-lg p-3 border border-gray-800/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Level Logic</span>
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{level.level_logic}</p>
          </div>

          {/* Spec formula (if present) */}
          {level.spec_formula && (
            <div className="bg-black/30 rounded-lg p-3 border border-gray-800/50">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Spec Formula</span>
              <code className="text-xs font-mono text-purple-300">{level.spec_formula}</code>
            </div>
          )}

          {/* Source references */}
          {level.source_references.length > 0 && (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Source References</span>
              <div className="grid gap-1.5">
                {level.source_references.map((f, i) => (
                  <IngredientFieldRow key={`${f.table}-${f.field}-${i}`} field={f} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

