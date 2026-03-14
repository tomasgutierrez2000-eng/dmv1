/**
 * Semantic Layer — Public API
 *
 * Usage:
 *   import { getSemanticModel, buildDependencyGraph, validateModel } from '@/lib/semantic-layer';
 */

export { getSemanticModel, invalidateSemanticCache } from './registry';
export { buildDependencyGraph, getTransitiveDependencies } from './dependency-graph';
export { validateMetricResult, validateModel } from './validator';
export { buildRegulatoryIndex, lookupByFramework, lookupByField } from './regulatory-index';

// Re-export core types
export type {
  SemanticModel,
  SemanticMetric,
  SemanticDimension,
  SemanticHierarchy,
  SemanticMeasure,
  SemanticDomain,
  GlossaryEntry,
  AggregationRule,
  AggregationType,
  LevelFormula,
  IngredientFieldRef,
  RegulatoryRef,
  SemanticValidationRule,
  TenantConfig,
  MetricQuery,
  MetricSummary,
} from './types';

// Re-export return types for consumers of exported functions
export type { DependencyGraph, DependencyNode } from './dependency-graph';
export type { ValidationResult, ModelValidationReport, ValidationCheckType } from './validator';
export type { RegulatoryIndex, RegulatoryFrameworkSummary, RegulatoryMetricLink, FieldRegulatoryLink } from './regulatory-index';
