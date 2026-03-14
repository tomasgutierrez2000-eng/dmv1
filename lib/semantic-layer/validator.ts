/**
 * Semantic Layer — Metric Validator
 *
 * Executes validation rules defined on semantic metrics.
 * Can validate computed results post-calculation or validate
 * the semantic model itself for structural integrity.
 */

import type { SemanticMetric, SemanticValidationRule, SemanticModel } from './types';

// ═══════════════════════════════════════════════════════════════
// Result Types
// ═══════════════════════════════════════════════════════════════

/** Validation check types: YAML rule types + model structural checks. */
export type ValidationCheckType = SemanticValidationRule['type'] | 'MODEL_INTEGRITY';

export interface ValidationResult {
  rule_id: string;
  metric_id: string;
  type: ValidationCheckType;
  severity: SemanticValidationRule['severity'];
  passed: boolean;
  message: string;
  details?: string;
}

export interface ModelValidationReport {
  total_checks: number;
  passed: number;
  warnings: number;
  errors: number;
  results: ValidationResult[];
}

// ═══════════════════════════════════════════════════════════════
// Value Validation (post-computation)
// ═══════════════════════════════════════════════════════════════

/**
 * Validate a computed metric result against the metric's validation rules.
 */
export function validateMetricResult(
  metric: SemanticMetric,
  value: number | null | undefined,
  level: string,
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const rule of metric.validations) {
    const result = evaluateRule(metric.id, rule, value, level);
    results.push(result);
  }

  return results;
}

function evaluateRule(
  metricId: string,
  rule: SemanticValidationRule,
  value: number | null | undefined,
  level: string,
): ValidationResult {
  const base = {
    rule_id: rule.rule_id,
    metric_id: metricId,
    type: rule.type,
    severity: rule.severity,
  };

  switch (rule.type) {
    case 'NOT_NULL':
      return {
        ...base,
        passed: value != null,
        message: value != null
          ? `${metricId} at ${level}: value is present`
          : `${metricId} at ${level}: value is null`,
      };

    case 'NON_NEGATIVE':
      return {
        ...base,
        passed: value == null || value >= 0,
        message: value != null && value < 0
          ? `${metricId} at ${level}: value is negative (${value})`
          : `${metricId} at ${level}: non-negative check passed`,
      };

    case 'THRESHOLD': {
      const maxValue = rule.params?.max_value as number | undefined;
      const minValue = rule.params?.min_value as number | undefined;
      const pass = value == null || (
        (maxValue == null || value <= maxValue) &&
        (minValue == null || value >= minValue)
      );
      return {
        ...base,
        passed: pass,
        message: pass
          ? `${metricId} at ${level}: threshold check passed`
          : `${metricId} at ${level}: value ${value} outside threshold [${minValue ?? '-inf'}, ${maxValue ?? 'inf'}]`,
      };
    }

    case 'PERIOD_OVER_PERIOD':
    case 'RECONCILIATION':
    case 'CUSTOM_SQL':
      // These require multi-value or SQL context — mark as skipped
      return {
        ...base,
        passed: true,
        message: `${metricId}: ${rule.type} validation requires execution context (skipped in simple mode)`,
        details: rule.description,
      };

    default:
      return {
        ...base,
        passed: true,
        message: `${metricId}: unknown rule type ${rule.type} (skipped)`,
      };
  }
}

// ═══════════════════════════════════════════════════════════════
// Model Validation (structural integrity)
// ═══════════════════════════════════════════════════════════════

/**
 * Validate the semantic model for structural integrity:
 * - All depends_on references resolve
 * - All domain_ids map to known domains
 * - No duplicate metric IDs
 * - All metrics have at least one level formula
 * - Ingredient fields have descriptions
 */
export function validateModel(model: SemanticModel): ModelValidationReport {
  const results: ValidationResult[] = [];
  const metricIds = new Set(model.metrics.map(m => m.id));
  const domainIds = new Set(model.domains.map(d => d.id));

  // Check for duplicate IDs
  const seen = new Set<string>();
  for (const m of model.metrics) {
    if (seen.has(m.id)) {
      results.push({
        rule_id: 'MODEL-DUP-ID',
        metric_id: m.id,
        type: 'MODEL_INTEGRITY',
        severity: 'ERROR',
        passed: false,
        message: `Duplicate metric ID: ${m.id}`,
      });
    }
    seen.add(m.id);
  }

  for (const m of model.metrics) {
    // Check depends_on references
    for (const depId of m.depends_on) {
      if (!metricIds.has(depId)) {
        results.push({
          rule_id: 'MODEL-DEP-REF',
          metric_id: m.id,
          type: 'MODEL_INTEGRITY',
          severity: 'WARNING',
          passed: false,
          message: `${m.id}: depends_on references unknown metric "${depId}"`,
        });
      }
    }

    // Check domain_id
    if (!domainIds.has(m.domain_id)) {
      results.push({
        rule_id: 'MODEL-DOMAIN-REF',
        metric_id: m.id,
        type: 'MODEL_INTEGRITY',
        severity: 'WARNING',
        passed: false,
        message: `${m.id}: domain_id "${m.domain_id}" not in domains.json`,
      });
    }

    // Check level formulas
    if (m.level_formulas.length === 0) {
      results.push({
        rule_id: 'MODEL-NO-LEVELS',
        metric_id: m.id,
        type: 'MODEL_INTEGRITY',
        severity: 'ERROR',
        passed: false,
        message: `${m.id}: no level formulas defined`,
      });
    }

    // Check ingredient fields have descriptions
    for (const field of m.ingredient_fields) {
      if (!field.description || field.description === field.field) {
        results.push({
          rule_id: 'MODEL-FIELD-DESC',
          metric_id: m.id,
          type: 'MODEL_INTEGRITY',
          severity: 'INFO',
          passed: false,
          message: `${m.id}: ingredient field ${field.layer}.${field.table}.${field.field} lacks meaningful description`,
        });
      }
    }
  }

  // Count metrics with no issues (don't add individual "OK" entries — too noisy at scale)
  const metricIdsWithIssues = new Set(results.filter(r => !r.passed).map(r => r.metric_id));
  const passedCount = model.metrics.filter(m => !metricIdsWithIssues.has(m.id)).length;

  const errors = results.filter(r => !r.passed && r.severity === 'ERROR').length;
  const warnings = results.filter(r => !r.passed && r.severity === 'WARNING').length;

  return {
    total_checks: results.length + passedCount,
    passed: passedCount,
    warnings,
    errors,
    results: results.filter(r => !r.passed), // Only return issues, not passing checks
  };
}
