'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Table2,
  Users,
  Briefcase,
  FolderTree,
  PieChart,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import type { CatalogueItem } from '@/lib/metric-library/types';
import type { RollupLevelKey } from '@/lib/metric-library/types';
import type { DemoEntity, MetricVisualizationConfig } from '@/lib/metric-library/metric-config';
import { buildVisualizationConfig, convertDemoData } from '@/lib/metric-library/config-builder';
import { generateAllDemoSteps, generatePositionSteps, generateInsights } from '@/lib/metric-library/demo-step-generator';
import LevelStepWalkthrough from './LevelStepWalkthrough';
import type { FlowStep } from './LevelStepWalkthrough';
import { PositionTable, EntityTable } from './WorkedExampleTable';
import GenericTableTraversalDemo from './GenericTableTraversalDemo';
import GenericFormulaAnimation from './GenericFormulaAnimation';

/* ────────────────────────────────────────────────────────────────────────────
 * TAB DEFINITIONS
 * ──────────────────────────────────────────────────────────────────────────── */

type TabKey = 'position' | 'facility' | 'counterparty' | 'desk' | 'portfolio' | 'lob';

const TAB_TO_ROLLUP: Record<TabKey, RollupLevelKey> = {
  position: 'facility',
  facility: 'facility',
  counterparty: 'counterparty',
  desk: 'desk',
  portfolio: 'portfolio',
  lob: 'lob',
};

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ElementType;
  color: string;
  activeBg: string;
  activeText: string;
}

const TABS: TabDef[] = [
  { key: 'position',     label: 'Position',          icon: Layers,     color: 'cyan',    activeBg: 'bg-cyan-500',    activeText: 'text-white' },
  { key: 'facility',     label: 'Facility',          icon: Table2,     color: 'blue',    activeBg: 'bg-blue-500',    activeText: 'text-white' },
  { key: 'counterparty', label: 'Counterparty',      icon: Users,      color: 'purple',  activeBg: 'bg-purple-500',  activeText: 'text-white' },
  { key: 'desk',         label: 'Desk',              icon: Briefcase,  color: 'amber',   activeBg: 'bg-amber-500',   activeText: 'text-white' },
  { key: 'portfolio',    label: 'Portfolio',          icon: FolderTree, color: 'emerald', activeBg: 'bg-emerald-500', activeText: 'text-white' },
  { key: 'lob',          label: 'Business Segment',  icon: PieChart,   color: 'pink',    activeBg: 'bg-pink-500',    activeText: 'text-white' },
];

/* ────────────────────────────────────────────────────────────────────────────
 * LINEAGE ROUTES — will be migrated to dynamic route in Phase 7
 * ──────────────────────────────────────────────────────────────────────────── */

const LINEAGE_ROUTES: Record<string, { href: string; label: string }> = {
  LTV:              { href: '/metrics/LTV/lineage',            label: 'LTV End-to-End Lineage' },
  DSCR:             { href: '/metrics/DSCR/lineage',           label: 'DSCR End-to-End Lineage' },
  WABR:             { href: '/metrics/WABR/lineage',           label: 'WABR End-to-End Lineage' },
  INT_INCOME:       { href: '/metrics/INT_INCOME/lineage',     label: 'Interest Income End-to-End Lineage' },
  INT_EXPENSE:      { href: '/metrics/INT_EXPENSE/lineage',    label: 'Interest Expense End-to-End Lineage' },
  RR_MIG:           { href: '/metrics/RR_MIG/lineage',         label: 'Risk Rating Migration Lineage' },
  COMMITTED_AMOUNT: { href: '/metrics/COMMITTED/lineage',      label: 'Committed Amount End-to-End Lineage' },
  EXCPN_RT:         { href: '/metrics/EXCPN_RT/lineage',       label: 'Exception Rate End-to-End Lineage' },
  ALLOC_PCT:        { href: '/metrics/ALLOC_PCT/lineage',      label: 'Allocation % End-to-End Lineage' },
  COLL_MV:          { href: '/metrics/COLL_MV/lineage',        label: 'Collateral MV End-to-End Lineage' },
};

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

function getFormulaBannerDesc(config: MetricVisualizationConfig): React.ReactNode {
  switch (config.rollup_strategy) {
    case 'weighted-avg':
      return (
        <>
          At facility level, {config.abbreviation} is computed directly.
          At higher levels, rollup uses <strong className="text-purple-200">exposure-weighted average</strong>: Σ({config.abbreviation} × Exposure) / Σ(Exposure).
        </>
      );
    case 'sum-ratio':
      return (
        <>
          The formula never changes — only the <strong className="text-purple-200">scope of facilities</strong> varies by level.
          Every rollup resolves back to &quot;which facilities are in scope?&quot; then applies the same calculation.
        </>
      );
    case 'direct-sum':
      return (
        <>
          At each level, the metric is a <strong className="text-purple-200">direct sum</strong> of all in-scope facility values.
        </>
      );
    default:
      return (
        <>
          The metric aggregates across facilities at each rollup level using the configured strategy.
        </>
      );
  }
}

function getFormulaLabel(config: MetricVisualizationConfig): string {
  if (config.rollup_strategy === 'sum-ratio') return 'Formula (constant)';
  if (config.rollup_strategy === 'weighted-avg') return 'Formula + Rollup';
  return 'Formula';
}

function entitiesForTab(
  entities: DemoEntity[],
  tab: TabKey,
): DemoEntity[] {
  if (!entities.length) return [];

  const example = entities[0];
  switch (tab) {
    case 'position':
    case 'facility':
      return [example];
    case 'counterparty': {
      const cpId = example.counterparty_id;
      return entities.filter(e => e.counterparty_id === cpId);
    }
    case 'desk': {
      const deskName = example.desk_name;
      return deskName ? entities.filter(e => e.desk_name === deskName) : entities;
    }
    case 'portfolio':
    case 'lob':
      return entities;
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT
 * ──────────────────────────────────────────────────────────────────────────── */

export default function CatalogueDeepDive({ item }: { item: CatalogueItem }) {
  const [activeTab, setActiveTab] = useState<TabKey>('position');

  const demo = item.demo_data;
  const hasDemoData = !!(demo?.facilities?.length);
  const formula = item.generic_formula;
  const metricLabel = item.abbreviation;
  const lineageRoute = LINEAGE_ROUTES[item.abbreviation];

  // Build config and convert demo data — all hooks MUST be before any early return
  const config = useMemo(() => buildVisualizationConfig(item), [item]);
  const entities = useMemo(() => convertDemoData(item, config.metric_fields) ?? [], [item, config]);
  const allSteps = useMemo(() => generateAllDemoSteps(config, item, entities), [config, item, entities]);
  const positionSteps = useMemo(() => generatePositionSteps(config, entities), [config, entities]);
  const insights = useMemo(() => {
    const generated = generateInsights(config, item);
    return {
      position: generated.facility ?? 'Positions are the finest grain — individual exposures recorded in the source system.',
      facility: generated.facility ?? `At facility level, ${metricLabel} is computed directly from the facility's data.`,
      counterparty: generated.counterparty ?? `Group facilities by counterparty and aggregate.`,
      desk: generated.desk ?? `Resolve the desk via enterprise_business_taxonomy, then aggregate.`,
      portfolio: generated.portfolio ?? `Traverse hierarchy to collect all desks, then aggregate.`,
      lob: generated.lob ?? `Top of hierarchy — recursive traversal collects all entities.`,
    };
  }, [config, item, metricLabel]);

  // No demo data — show traversal demo or lineage link
  if (!hasDemoData) {
    return (
      <div className="space-y-6">
        {config.traversal_config && (
          <GenericTableTraversalDemo
            config={config.traversal_config}
            metricName={item.abbreviation}
          />
        )}
        <div className="text-center py-12 text-gray-500">
          {lineageRoute ? (
            <>
              <p className="text-sm mb-4">This metric has a dedicated interactive lineage diagram with guided demo walkthrough.</p>
              <Link
                href={lineageRoute.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                View {lineageRoute.label} →
              </Link>
            </>
          ) : (
            <p className="text-sm">No demo data available for this item.</p>
          )}
        </div>
      </div>
    );
  }

  const legacyFacilities = demo!.facilities;
  const exampleFacility = legacyFacilities[0];

  // Step builder dispatch
  function stepsFor(tab: TabKey): FlowStep[] {
    if (tab === 'position') return positionSteps;
    const rollupKey = TAB_TO_ROLLUP[tab];
    return allSteps[rollupKey] ?? [];
  }

  function titleFor(tab: TabKey): string {
    const titles: Record<TabKey, string> = {
      position: `Position → Facility Rollup`,
      facility: `Facility-Level ${metricLabel}`,
      counterparty: `Counterparty-Level ${metricLabel}`,
      desk: `Desk-Level ${metricLabel} (L3)`,
      portfolio: `Portfolio-Level ${metricLabel} (L2)`,
      lob: `Business Segment-Level ${metricLabel} (L1)`,
    };
    return titles[tab];
  }

  function subtitleFor(tab: TabKey): string {
    const example = entities[0];
    if (!example) return '';
    switch (tab) {
      case 'position': return `${example.entity_id} — ${example.entity_name}`;
      case 'facility': return `Direct calculation for ${example.entity_id}`;
      case 'counterparty': {
        const cpEntities = entities.filter(e => e.counterparty_id === example.counterparty_id);
        return `${example.counterparty_name} (${example.counterparty_id}) — ${cpEntities.length} facilities`;
      }
      case 'desk': return `${example.desk_name ?? 'Desk'} via taxonomy lookup`;
      case 'portfolio': return `${example.portfolio_name ?? 'Portfolio'} — parent_segment_id traversal`;
      case 'lob': return `${example.lob_name ?? 'Business Segment'} — recursive hierarchy traversal`;
    }
  }

  const tabEntities = entitiesForTab(entities, activeTab);

  return (
    <div className="space-y-4">
      {/* Formula banner */}
      <div className="bg-purple-950/30 rounded-lg p-3 border border-purple-900/40">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
            {getFormulaLabel(config)}
          </span>
          <code className="text-sm font-mono text-purple-300 font-semibold">{formula}</code>
        </div>
        <p className="text-[11px] text-purple-300/70 mt-1">
          {getFormulaBannerDesc(config)}
        </p>
      </div>

      {/* Table Traversal Demo — config-driven */}
      {config.traversal_config && (
        <GenericTableTraversalDemo
          config={config.traversal_config}
          metricName={metricLabel}
          activeDimension={TAB_TO_ROLLUP[activeTab]}
        />
      )}

      {/* Formula Animation — config-driven */}
      {config.formula_decomposition.numerator.length > 0 && (
        <GenericFormulaAnimation
          config={config}
          entities={entities}
          rollupLevel={TAB_TO_ROLLUP[activeTab]}
        />
      )}

      {/* Tab bar */}
      <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="Deep-dive level tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                isActive
                  ? `${tab.activeBg} ${tab.activeText} shadow-md`
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Insight callout */}
      <div className="flex items-start gap-3 bg-blue-950/30 rounded-lg p-3 border border-blue-900/40">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-blue-200 leading-relaxed">{insights[activeTab]}</p>
      </div>

      {/* Tab content */}
      <div role="tabpanel">
        {activeTab === 'position' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={stepsFor('position')}
              title={titleFor('position')}
              subtitle={subtitleFor('position')}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Positions in {exampleFacility.facility_id} — {exampleFacility.facility_name}
              </div>
              <PositionTable facility={exampleFacility} />
            </div>
          </div>
        )}

        {activeTab === 'facility' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={stepsFor('facility')}
              title={titleFor('facility')}
              subtitle={subtitleFor('facility')}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Facility Detail
              </div>
              <EntityTable
                entities={tabEntities}
                columns={config.worked_example_columns}
                config={config}
                showPositionCount
              />
              <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Position Breakdown
                </div>
                <PositionTable facility={exampleFacility} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'counterparty' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={stepsFor('counterparty')}
              title={titleFor('counterparty')}
              subtitle={subtitleFor('counterparty')}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                {entities[0]?.counterparty_name ?? 'Counterparty'} Facilities
              </div>
              <EntityTable
                entities={tabEntities}
                columns={config.worked_example_columns}
                config={config}
                showPositionCount
              />
            </div>
          </div>
        )}

        {activeTab === 'desk' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={stepsFor('desk')}
              title={titleFor('desk')}
              subtitle={subtitleFor('desk')}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                {entities[0]?.desk_name ?? 'Desk'} Facilities
              </div>
              <EntityTable
                entities={tabEntities}
                columns={config.worked_example_columns}
                config={config}
                showPositionCount
              />
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={stepsFor('portfolio')}
              title={titleFor('portfolio')}
              subtitle={subtitleFor('portfolio')}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                All Facilities by Desk
              </div>
              <EntityTable
                entities={tabEntities}
                columns={config.worked_example_columns}
                config={config}
                groupBy="desk"
                showPositionCount
              />
            </div>
          </div>
        )}

        {activeTab === 'lob' && (
          <div className="space-y-4">
            <LevelStepWalkthrough
              steps={stepsFor('lob')}
              title={titleFor('lob')}
              subtitle={subtitleFor('lob')}
            />
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
                All Facilities by Desk (Full Department)
              </div>
              <EntityTable
                entities={tabEntities}
                columns={config.worked_example_columns}
                config={config}
                groupBy="desk"
                showPositionCount
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
