'use client';

import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDemoEngine, type DemoSideEffects, type GenericDemoStep } from './demo/useDemoEngine';
import DemoOverlay from './demo/DemoOverlay';
import DemoNarrationPanel from './demo/DemoNarrationPanel';
import DemoControlBar from './demo/DemoControlBar';
import type { CatalogueItem } from '@/lib/metric-library/types';
import type { MetricVisualizationConfig, DemoEntity } from '@/lib/metric-library/metric-config';

/* ────────────────────────────────────────────────────────────────────────────
 * AutoDemoOrchestrator — generic demo spotlight for any metric
 *
 * Auto-generates ~12-15 demo steps from the MetricVisualizationConfig and
 * CatalogueItem, then drives a guided tour using the existing useDemoEngine
 * infrastructure (spotlight overlay, narration panel, control bar).
 *
 * No variants — starts directly at step 1 (no variant picker).
 * ──────────────────────────────────────────────────────────────────────────── */

type NoVariant = 'default';

interface AutoDemoOrchestratorProps {
  item: CatalogueItem;
  config: MetricVisualizationConfig;
  entities: DemoEntity[];
  onClose: () => void;
  onSideEffect: (fx: Partial<DemoSideEffects>) => void;
}

/* ── Step generator ──────────────────────────────────────────────────────── */

function generateDemoSteps(
  item: CatalogueItem,
  config: MetricVisualizationConfig,
  entities: DemoEntity[],
): GenericDemoStep<NoVariant>[] {
  const abbr = item.abbreviation;
  const name = item.item_name;
  const formula = item.generic_formula;
  const rollup = config.rollup_strategy;

  const rollupLabel: Record<string, string> = {
    'sum-ratio': 'SUM(numerator) / SUM(denominator)',
    'weighted-avg': 'exposure-weighted average',
    'direct-sum': 'SUM of values',
    count: 'COUNT',
    min: 'MIN', max: 'MAX', avg: 'simple average',
  };

  const rollupExplain: Record<string, string> = {
    'sum-ratio': `${abbr} uses a "sum-ratio" rollup: at each level, sum all numerators and all denominators separately, then divide once. This avoids misleading simple averages.`,
    'weighted-avg': `${abbr} uses an exposure-weighted average: each facility's ${abbr} is weighted by its committed amount. Larger facilities have proportionally more influence on the result.`,
    'direct-sum': `${abbr} uses direct summation: simply add up the values from all child entities. No averaging or ratio calculation needed.`,
    count: `${abbr} uses a count aggregation: simply count the number of qualifying items at each level.`,
    min: `${abbr} reports the minimum value across all child entities — showing the worst case.`,
    max: `${abbr} reports the maximum value across all child entities — showing the best case.`,
    avg: `${abbr} uses a simple average across all child entities at each level.`,
  };

  const steps: GenericDemoStep<NoVariant>[] = [];

  // Step 0: placeholder (variant picker position — engine starts at step 0)
  // Since we have no variants, we'll immediately jump to step 1
  steps.push({
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: `Welcome to the ${abbr} Lineage Demo`,
    narration: `This guided walkthrough will show you the complete journey of ${name} (${abbr}) — from how it's defined, where the data comes from, how the math works, and how the result flows from a single facility up to the business segment level.\n\n${item.definition}\n\nLet's begin.`,
    targetSelector: '[data-demo="header"]',
  });

  // Phase 2: Formula
  steps.push({
    id: 'formula-overview',
    phase: 2,
    phaseLabel: 'Define the Metric',
    title: `The ${abbr} Formula`,
    narration: `${name} is calculated using:\n\n${formula}\n\nClass: ${item.metric_class} | Unit: ${item.unit_type} | Direction: ${item.direction.replace('_', ' ')}\n\nRollup strategy: ${rollupLabel[rollup] ?? rollup}`,
    targetSelector: '[data-demo="formula"]',
    insight: rollupExplain[rollup] ?? undefined,
  });

  // Phase 3: Ingredient Fields (Data Sources)
  if (item.ingredient_fields.length > 0) {
    const fieldCount = item.ingredient_fields.length;
    const tables = [...new Set(item.ingredient_fields.map(f => `${f.layer}.${f.table}`))];
    steps.push({
      id: 'ingredients',
      phase: 3,
      phaseLabel: 'Data Sources',
      title: 'Where the Data Lives',
      narration: `${abbr} draws from ${fieldCount} source fields across ${tables.length} table${tables.length > 1 ? 's' : ''}:\n\n${tables.map(t => `• ${t}`).join('\n')}\n\nThese fields provide the raw inputs — the "ingredients" — that feed into the formula.`,
      targetSelector: '[data-demo="ingredients"]',
    });
  }

  // Phase 3b: Lineage DAG (if L3 metric exists)
  steps.push({
    id: 'lineage-dag',
    phase: 3,
    phaseLabel: 'Data Sources',
    title: 'End-to-End Data Lineage',
    narration: `This directed acyclic graph (DAG) shows how data flows from source tables through transformations to produce the final ${abbr} value. Each node is a table or calculation step; each edge shows the data dependency.`,
    targetSelector: '[data-demo="lineage-dag"]',
  });

  // Phase 4: Hierarchy Overview
  if (entities.length > 0) {
    steps.push({
      id: 'hierarchy-overview',
      phase: 4,
      phaseLabel: 'Calculation',
      title: `${abbr} Across the Hierarchy`,
      narration: `The pyramid shows how ${abbr} values flow from individual facilities up through the organizational hierarchy.\n\nClick any node to explore that level in detail. Values are ${config.value_format.direction === 'HIGHER_BETTER' ? 'better when higher' : config.value_format.direction === 'LOWER_BETTER' ? 'better when lower' : 'directionally neutral'}.`,
      targetSelector: '[data-demo="rollup-hierarchy"]',
    });
  }

  // Phase 5: Rollup levels
  const levelOrder = ['facility', 'counterparty', 'desk', 'portfolio', 'lob'] as const;
  const levelLabels: Record<string, string> = {
    facility: 'Individual Facility',
    counterparty: 'Borrower (Counterparty)',
    desk: 'Trading Desk',
    portfolio: 'Portfolio',
    lob: 'Business Segment',
  };
  const levelDescriptions: Record<string, (abbr: string, rollup: string) => string> = {
    facility: (a, _r) => `At the facility level, ${a} is calculated directly from the formula — no aggregation needed. This is the finest grain of the metric.`,
    counterparty: (a, r) => `A single borrower may have multiple facilities. At the counterparty level, we combine all facilities for one borrower using ${r}.`,
    desk: (a, r) => `A desk manages a group of counterparties. ${a} at desk level aggregates across all facilities assigned to the desk via the enterprise business taxonomy, using ${r}.`,
    portfolio: (a, r) => `The portfolio spans multiple desks. ${a} at portfolio level traverses the hierarchy upward to collect all desks, then aggregates using ${r}.`,
    lob: (a, r) => `At the business segment level — the widest view — ${a} aggregates every facility in the entire segment using ${r}. This serves as a trend indicator for senior leadership.`,
  };

  for (const lvl of levelOrder) {
    const levelDef = item.level_definitions.find(d => d.level === lvl);
    if (!levelDef) continue;

    const rollupText = rollupLabel[rollup] ?? rollup;
    steps.push({
      id: `rollup-${lvl}`,
      phase: 5,
      phaseLabel: 'Rollup Hierarchy',
      title: `Level: ${levelLabels[lvl] ?? lvl}`,
      narration: levelDescriptions[lvl]?.(abbr, rollupText) ?? `${abbr} at ${lvl} level.`,
      targetSelector: `[data-demo="rollup-${lvl}"]`,
      onEnter: { expandLevel: lvl },
    });
  }

  // Phase 5b: Table Traversal
  if (config.traversal_config) {
    steps.push({
      id: 'table-traversal',
      phase: 5,
      phaseLabel: 'Rollup Hierarchy',
      title: 'Table Traversal',
      narration: `This interactive demo shows how the database tables connect at each dimension. Select a dimension tab to see the join path the engine follows to collect and aggregate ${abbr} values.`,
      targetSelector: '[data-demo="table-traversal"]',
      onEnter: { expandLevel: null },
    });
  }

  // Phase 5c: Formula Animation
  if (config.formula_decomposition.numerator.length > 0) {
    steps.push({
      id: 'formula-animation',
      phase: 5,
      phaseLabel: 'Rollup Hierarchy',
      title: 'Formula Build-Up',
      narration: `Watch how the ${abbr} formula assembles step by step. The numerator and denominator components are shown with sample values, building up to the final result.`,
      targetSelector: '[data-demo="formula-animation"]',
    });
  }

  // Phase 6: Walkthrough
  if (entities.length > 0) {
    steps.push({
      id: 'walkthrough',
      phase: 6,
      phaseLabel: 'Worked Examples',
      title: 'Step-by-Step Walkthrough',
      narration: `This section provides a detailed calculation walkthrough at each rollup level. Use the tab bar to switch between Facility, Counterparty, Desk, Portfolio, and Business Segment views.\n\nEach tab shows the step-by-step flow and a worked example table with real values.`,
      targetSelector: '[data-demo="walkthrough"]',
      onEnter: { expandLevel: null, l2Filter: 'facility' },
    });
  }

  // Phase 6b: Summary
  steps.push({
    id: 'summary',
    phase: 6,
    phaseLabel: 'Worked Examples',
    title: 'Summary',
    narration: `That's the complete journey of ${name} (${abbr}):\n\n1. Formula: ${formula}\n2. Source data: ${item.ingredient_fields.length} fields from L1/L2 tables\n3. Rollup: ${rollupLabel[rollup] ?? rollup}\n4. Levels: Facility → Counterparty → Desk → Portfolio → Business Segment\n\nEvery value on the dashboard traces back through this lineage chain — full auditability from top to bottom.`,
    targetSelector: '[data-demo="header"]',
    onEnter: { expandLevel: null },
  });

  return steps;
}

/* ── Selector resolver (no variants — identity function) ─────────────── */

function resolveSelector(selector: string, _variant: NoVariant): string {
  return selector;
}

function resolveField<T>(field: T | ((v: string) => T), _variant: string): T {
  return typeof field === 'function' ? (field as (v: string) => T)('default') : field;
}

/* ── Component ───────────────────────────────────────────────────────── */

export default function AutoDemoOrchestrator({
  item,
  config,
  entities,
  onClose,
  onSideEffect,
}: AutoDemoOrchestratorProps) {
  const steps = useMemo(
    () => generateDemoSteps(item, config, entities),
    [item, config, entities],
  );

  const engine = useDemoEngine<NoVariant>({
    steps,
    resolveSelector,
    onClose,
    onSideEffect,
    defaultL2Filter: 'facility',
  });

  // Auto-start: skip variant picker (step 0) and go to step 1 immediately
  // Deferred to avoid setState-during-render warnings
  useEffect(() => {
    const timer = setTimeout(() => {
      engine.selectVariant('default');
    }, 0);
    return () => clearTimeout(timer);
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll while demo is active
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const hasVariant = engine.selectedVariant !== null;

  const content = (
    <>
      {/* Spotlight overlay */}
      <DemoOverlay
        targetRect={engine.targetRect}
        isTransitioning={engine.isTransitioning}
        visible={hasVariant}
      />

      {/* Narration panel */}
      {hasVariant && engine.selectedVariant && (
        <DemoNarrationPanel
          currentStep={engine.currentStep}
          variant={engine.selectedVariant}
          totalSteps={engine.totalSteps}
          steps={steps as GenericDemoStep[]}
          resolveField={resolveField as <T>(field: T | ((v: string) => T), variant: string) => T}
        />
      )}

      {/* Control bar */}
      <DemoControlBar
        currentStep={engine.currentStep}
        totalSteps={engine.totalSteps}
        hasVariant={hasVariant}
        onPrev={engine.goPrev}
        onNext={engine.goNext}
        onRestart={engine.restart}
        onClose={engine.closeDemo}
      />
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
