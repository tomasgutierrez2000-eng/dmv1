/**
 * Demo Step Generator — auto-generates FlowStep[] arrays for each rollup level
 * from MetricVisualizationConfig + CatalogueItem data.
 *
 * Replaces the 12+ hardcoded step-builder functions in CatalogueDeepDive.tsx.
 */

import type { CatalogueItem, RollupLevelKey, LevelDefinition } from './types';
import type {
  MetricVisualizationConfig,
  DemoEntity,
} from './metric-config';
import { computeRollup, formatMetricValue } from './metric-config';
import type { FlowStep } from '@/components/metric-library/LevelStepWalkthrough';

// ═══════════════════════════════════════════════════════════════
// Main entry point
// ═══════════════════════════════════════════════════════════════

/**
 * Generate FlowStep arrays for all rollup levels.
 * Returns a map from level key to the step array.
 */
export function generateAllDemoSteps(
  config: MetricVisualizationConfig,
  item: CatalogueItem,
  entities: DemoEntity[],
): Record<RollupLevelKey, FlowStep[]> {
  return {
    facility: generateFacilitySteps(config, item, entities),
    counterparty: generateCounterpartySteps(config, item, entities),
    desk: generateDeskSteps(config, item, entities),
    portfolio: generatePortfolioSteps(config, item, entities),
    lob: generateLobSteps(config, item, entities),
  };
}

/**
 * Generate FlowStep array for the position level.
 */
export function generatePositionSteps(
  config: MetricVisualizationConfig,
  entities: DemoEntity[],
): FlowStep[] {
  const example = entities[0];
  if (!example?.positions?.length) return [];

  const steps: FlowStep[] = [];
  const posTotal = example.positions.reduce((s, p) => s + p.balance_amount, 0);

  steps.push({
    layer: 'L2',
    table: 'position',
    action: 'Read raw positions',
    value: `${example.positions.length} positions for ${example.entity_name}`,
    detail: `Each position records a balance amount from the source system.`,
    color: 'cyan',
  });

  steps.push({
    layer: 'L2',
    table: 'position',
    action: 'Sum position balances',
    value: `Total: $${(posTotal / 1_000_000).toFixed(1)}M`,
    detail: `SUM(balance_amount) across all positions = committed_facility_amt.`,
    color: 'cyan',
  });

  return steps;
}

// ═══════════════════════════════════════════════════════════════
// Per-level generators
// ═══════════════════════════════════════════════════════════════

function generateFacilitySteps(
  config: MetricVisualizationConfig,
  item: CatalogueItem,
  entities: DemoEntity[],
): FlowStep[] {
  const example = entities[0];
  if (!example) return [];
  const steps: FlowStep[] = [];
  const levelDef = item.level_definitions.find(d => d.level === 'facility');
  const { metric_fields, formula_decomposition: decomp } = config;

  // Step 1: Pick facility
  steps.push({
    layer: 'Scope',
    table: 'facility_master',
    action: `Select facility`,
    value: `${example.entity_name} (${example.entity_id})`,
    detail: `Start with a single facility from facility_master.`,
    color: 'purple',
  });

  // Step 2+: Read ingredient fields (numerator components)
  for (const comp of decomp.numerator) {
    const val = example.fields[comp.field];
    steps.push({
      layer: comp.source_layer,
      table: comp.source_table,
      action: `Read ${comp.label}`,
      value: formatFieldValue(val, comp.field),
      detail: `Source: ${comp.source_table}.${comp.field}`,
      color: comp.source_layer === 'L1' ? 'cyan' : 'blue',
    });
  }

  // Step 3+: Read denominator components (if ratio)
  for (const comp of decomp.denominator) {
    const val = example.fields[comp.field];
    steps.push({
      layer: comp.source_layer,
      table: comp.source_table,
      action: `Read ${comp.label}`,
      value: formatFieldValue(val, comp.field),
      detail: `Source: ${comp.source_table}.${comp.field}`,
      color: comp.source_layer === 'L1' ? 'cyan' : 'blue',
    });
  }

  // Step 4: Apply formula
  const metricVal = Number(example.fields[metric_fields.primary_value]) || 0;
  steps.push({
    layer: 'Calc',
    table: item.abbreviation,
    action: `Apply formula: ${item.generic_formula}`,
    value: formatMetricValue(metricVal, config.value_format),
    detail: levelDef?.level_logic ?? `Calculate ${item.abbreviation} for this facility.`,
    color: 'amber',
  });

  return steps;
}

function generateCounterpartySteps(
  config: MetricVisualizationConfig,
  item: CatalogueItem,
  entities: DemoEntity[],
): FlowStep[] {
  if (entities.length === 0) return [];
  const steps: FlowStep[] = [];
  const levelDef = item.level_definitions.find(d => d.level === 'counterparty');

  // Find example counterparty
  const cpId = entities[0].counterparty_id;
  const cpName = entities[0].counterparty_name;
  const cpEntities = entities.filter(e => e.counterparty_id === cpId);

  // Step 1: Scope
  steps.push({
    layer: 'Scope',
    table: 'counterparty',
    action: `Select counterparty`,
    value: `${cpName} (${cpId})`,
    detail: `Identify the counterparty and find all their facilities.`,
    color: 'purple',
  });

  // Step 2: Find facilities
  steps.push({
    layer: 'L1',
    table: 'facility_master',
    action: `Find facilities for counterparty`,
    value: `${cpEntities.length} facilities found`,
    detail: `WHERE counterparty_id = '${cpId}'`,
    color: 'cyan',
  });

  // Step 3: Aggregate
  const rollupVal = computeRollup(cpEntities, config);
  const aggDesc = getAggregationDescription(config, cpEntities.length);
  steps.push({
    layer: 'Agg',
    table: item.abbreviation,
    action: aggDesc,
    value: formatMetricValue(rollupVal, config.value_format),
    detail: levelDef?.level_logic ?? `Aggregate across ${cpEntities.length} facilities.`,
    color: 'amber',
  });

  return steps;
}

function generateDeskSteps(
  config: MetricVisualizationConfig,
  item: CatalogueItem,
  entities: DemoEntity[],
): FlowStep[] {
  if (entities.length === 0) return [];
  const steps: FlowStep[] = [];
  const levelDef = item.level_definitions.find(d => d.level === 'desk');

  const deskName = entities[0].desk_name ?? 'Desk';
  const deskEntities = entities.filter(e => e.desk_name === deskName);

  steps.push({
    layer: 'Scope',
    table: 'enterprise_business_taxonomy',
    action: `Lookup desk`,
    value: deskName,
    detail: `Find the desk node in the enterprise business taxonomy (L3).`,
    color: 'purple',
  });

  steps.push({
    layer: 'L1',
    table: 'facility_master',
    action: `Find facilities assigned to desk`,
    value: `${deskEntities.length} facilities`,
    detail: `Join through taxonomy to find all facilities under this desk.`,
    color: 'cyan',
  });

  const rollupVal = computeRollup(deskEntities, config);
  const aggDesc = getAggregationDescription(config, deskEntities.length);
  steps.push({
    layer: 'Agg',
    table: item.abbreviation,
    action: aggDesc,
    value: formatMetricValue(rollupVal, config.value_format),
    detail: levelDef?.level_logic ?? `Aggregate across all desk facilities.`,
    color: 'amber',
  });

  return steps;
}

function generatePortfolioSteps(
  config: MetricVisualizationConfig,
  item: CatalogueItem,
  entities: DemoEntity[],
): FlowStep[] {
  if (entities.length === 0) return [];
  const steps: FlowStep[] = [];
  const levelDef = item.level_definitions.find(d => d.level === 'portfolio');

  const portName = entities[0].portfolio_name ?? 'Portfolio';
  const portEntities = entities.filter(e => e.portfolio_name === portName);
  const desks = [...new Set(portEntities.map(e => e.desk_name).filter(Boolean))];

  steps.push({
    layer: 'Scope',
    table: 'enterprise_business_taxonomy',
    action: `Lookup portfolio`,
    value: portName,
    detail: `Find the portfolio node in hierarchy (L2 level).`,
    color: 'purple',
  });

  steps.push({
    layer: 'L3',
    table: 'enterprise_business_taxonomy',
    action: `Find desks under portfolio`,
    value: `${desks.length} desk(s): ${desks.join(', ')}`,
    detail: `Traverse hierarchy downward to find all desk nodes.`,
    color: 'emerald',
  });

  steps.push({
    layer: 'L1',
    table: 'facility_master',
    action: `Collect all facilities`,
    value: `${portEntities.length} facilities total`,
    detail: `Gather all facilities from all desks under this portfolio.`,
    color: 'cyan',
  });

  const rollupVal = computeRollup(portEntities, config);
  const aggDesc = getAggregationDescription(config, portEntities.length);
  steps.push({
    layer: 'Agg',
    table: item.abbreviation,
    action: aggDesc,
    value: formatMetricValue(rollupVal, config.value_format),
    detail: levelDef?.level_logic ?? `Aggregate across all portfolio facilities.`,
    color: 'amber',
  });

  return steps;
}

function generateLobSteps(
  config: MetricVisualizationConfig,
  item: CatalogueItem,
  entities: DemoEntity[],
): FlowStep[] {
  if (entities.length === 0) return [];
  const steps: FlowStep[] = [];
  const levelDef = item.level_definitions.find(d => d.level === 'lob');

  const lobName = entities[0].lob_name ?? 'Business Segment';
  const portfolios = [...new Set(entities.map(e => e.portfolio_name).filter(Boolean))];
  const desks = [...new Set(entities.map(e => e.desk_name).filter(Boolean))];

  steps.push({
    layer: 'Scope',
    table: 'enterprise_business_taxonomy',
    action: `Lookup Business Segment`,
    value: lobName,
    detail: `Top of the hierarchy (L1 level) — encompasses everything below.`,
    color: 'purple',
  });

  steps.push({
    layer: 'L2',
    table: 'enterprise_business_taxonomy',
    action: `Traverse hierarchy`,
    value: `${portfolios.length} portfolio(s) → ${desks.length} desk(s) → ${entities.length} facilities`,
    detail: `Recursive traversal collects all nodes in the tree.`,
    color: 'emerald',
  });

  const rollupVal = computeRollup(entities, config);
  const aggDesc = getAggregationDescription(config, entities.length);
  steps.push({
    layer: 'Agg',
    table: item.abbreviation,
    action: aggDesc,
    value: formatMetricValue(rollupVal, config.value_format),
    detail: levelDef?.level_logic ?? `Final aggregation across the entire business segment.`,
    color: 'pink',
  });

  return steps;
}

// ═══════════════════════════════════════════════════════════════
// Insight Generator
// ═══════════════════════════════════════════════════════════════

/**
 * Generate per-level insight callout strings from the config.
 */
export function generateInsights(
  config: MetricVisualizationConfig,
  item: CatalogueItem,
): Partial<Record<RollupLevelKey, string>> {
  // If config already has insights, use them
  if (config.insights && Object.keys(config.insights).length > 0) {
    return config.insights;
  }

  const abbr = item.abbreviation;
  const strategy = config.rollup_strategy;

  const insights: Partial<Record<RollupLevelKey, string>> = {};

  const levelDescs: Record<RollupLevelKey, string> = {
    facility: `At the facility level, ${abbr} is computed directly from the facility's own data.`,
    counterparty: `At counterparty level, we gather all facilities belonging to the counterparty and ${strategyVerb(strategy)}.`,
    desk: `At desk level, we find all facilities assigned to this desk via the enterprise business taxonomy and ${strategyVerb(strategy)}.`,
    portfolio: `At portfolio level, we traverse the hierarchy to collect all desks and their facilities, then ${strategyVerb(strategy)}.`,
    lob: `At business segment level, the entire tree is traversed recursively. This gives the broadest view of ${abbr} across the organization.`,
  };

  for (const [level, desc] of Object.entries(levelDescs)) {
    const levelDef = item.level_definitions.find(d => d.level === level);
    insights[level as RollupLevelKey] = levelDef
      ? `${desc} Sourcing: ${levelDef.sourcing_type}.`
      : desc;
  }

  return insights;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function getAggregationDescription(config: MetricVisualizationConfig, count: number): string {
  switch (config.rollup_strategy) {
    case 'sum-ratio':
      return `SUM/SUM ratio across ${count} facilities`;
    case 'weighted-avg':
      return `Exposure-weighted average across ${count} facilities`;
    case 'direct-sum':
      return `SUM across ${count} facilities`;
    case 'count':
      return `COUNT of ${count} facilities`;
    case 'avg':
      return `Average across ${count} facilities`;
    case 'min':
      return `MIN across ${count} facilities`;
    case 'max':
      return `MAX across ${count} facilities`;
    default:
      return `Aggregate across ${count} facilities`;
  }
}

function strategyVerb(strategy: string): string {
  switch (strategy) {
    case 'sum-ratio': return 'apply the SUM(numerator)/SUM(denominator) formula';
    case 'weighted-avg': return 'compute the exposure-weighted average';
    case 'direct-sum': return 'sum all values';
    case 'count': return 'count the entities';
    case 'avg': return 'compute the simple average';
    case 'min': return 'take the minimum';
    case 'max': return 'take the maximum';
    default: return 'aggregate the values';
  }
}

function formatFieldValue(val: number | string | undefined, field: string): string {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'string') return val;
  if (field.endsWith('_amt') || field.endsWith('_value') || field.endsWith('_amount')) {
    return val >= 1_000_000
      ? `$${(val / 1_000_000).toFixed(1)}M`
      : `$${(val / 1_000).toFixed(0)}K`;
  }
  if (field.endsWith('_pct')) return `${val.toFixed(1)}%`;
  if (field.endsWith('_ratio')) return `${val.toFixed(2)}x`;
  return String(val);
}
