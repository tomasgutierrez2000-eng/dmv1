/**
 * YAML Generator — converts parsed metric upload data into YAML format
 * matching the calc engine metric definition schema.
 *
 * Uses template literals (no YAML library) to produce output that matches
 * the style of existing YAML files in scripts/calc_engine/metrics/.
 *
 * The generated YAML passes validation against scripts/calc_engine/loader/schema.ts.
 */

import type { MetricWithSources } from './template-parser';

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Returns the relative path (from project root) where this metric's YAML
 * file should be written.
 *
 * Format: scripts/calc_engine/metrics/{domain}/{metricId}.yaml
 */
export function getYamlFilePath(metricId: string, domain: string): string {
  const sanitizedDomain = domain.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return `scripts/calc_engine/metrics/${sanitizedDomain}/${metricId}.yaml`;
}

/**
 * Generate a YAML string from uploaded metric data, matching the exact format
 * of existing YAML metric files (see scripts/calc_engine/metrics/_template.yaml).
 */
export function generateYamlFromUpload(
  metric: MetricWithSources,
): string {
  const today = formatDate(new Date());
  const metricId = metric.metric_id;
  const name = metric.name;
  const domain = metric.domain ?? 'general';
  const subDomain = 'general';
  const metricClass = metric.metric_class ?? 'CALCULATED';
  const direction = metric.direction ?? 'NEUTRAL';
  const unitType = metric.unit_type ?? 'CURRENCY';
  const displayFormat = inferDisplayFormat(unitType);
  const description = metric.definition ?? `${name} metric.`;
  const genericFormula = metric.generic_formula ?? '';
  const abbreviation = metric.abbreviation ?? deriveAbbreviation(metricId, name);
  const insight = metric.insight ?? `Tracks ${name.toLowerCase()} across the portfolio.`;
  const rollupStrategy = metric.rollup_strategy ?? 'direct-sum';

  // Build source tables section
  const sourceTablesYaml = buildSourceTables(metric);

  // Build level formulas
  const levelsYaml = buildLevels(metric, rollupStrategy, genericFormula);

  // Build tags
  const tagsYaml = buildTags(domain);

  // Build catalogue
  const catalogueYaml = buildCatalogue(metricId, abbreviation, insight, rollupStrategy);

  return `\
# ${'═'.repeat(63)}
# GSIB Metric Definition \u2014 ${metricId}: ${name}
# ${'═'.repeat(63)}

# IDENTIFICATION
metric_id: "${escapeYamlString(metricId)}"
name: "${escapeYamlString(name)}"
version: "1.0.0"
owner: "uploaded"
status: DRAFT
effective_date: "${today}"
supersedes: null

# CLASSIFICATION
domain: "${escapeYamlString(domain)}"
sub_domain: "${escapeYamlString(subDomain)}"
metric_class: ${metricClass}
direction: ${direction}
unit_type: ${unitType}
display_format: "${escapeYamlString(displayFormat)}"
description: >
${indentBlock(description, 2)}

# REGULATORY REFERENCES
regulatory_references: []

# SOURCE TABLES
source_tables:
${sourceTablesYaml}

# LEVEL FORMULAS
levels:
${levelsYaml}

depends_on: []

output:
  table: metric_result

validations:
  - rule_id: "${escapeYamlString(metricId)}-V01"
    type: NOT_NULL
    description: "No null metric values"
    severity: ERROR

catalogue:
${catalogueYaml}

tags:
${tagsYaml}
dashboard_pages: []
legacy_metric_ids: []
`;
}

// ═══════════════════════════════════════════════════════════════
// Source Tables Builder
// ═══════════════════════════════════════════════════════════════

interface SourceGroup {
  schema: string;
  table: string;
  alias: string;
  fields: Array<{ name: string; role: string }>;
}

function buildSourceTables(metric: MetricWithSources): string {
  const sources = metric.sources ?? [];
  if (sources.length === 0) {
    // Fallback: single placeholder source table
    return `\
  - schema: l2
    table: facility_exposure_snapshot
    alias: fes
    join_type: BASE
    fields:
      - name: facility_id
        role: JOIN_KEY
      - name: as_of_date
        role: FILTER`;
  }

  // Group source fields by (layer, table)
  const groupMap = new Map<string, SourceGroup>();
  for (const src of sources) {
    const schema = layerToSchema(src.layer);
    const key = `${schema}.${src.table}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        schema,
        table: src.table,
        alias: deriveAlias(src.table, groupMap),
        fields: [],
      });
    }
    const group = groupMap.get(key)!;
    // Avoid duplicate field names within a group
    if (!group.fields.some((f) => f.name === src.field)) {
      group.fields.push({
        name: src.field,
        role: src.role ?? inferFieldRole(src.field),
      });
    }
  }

  const groups = Array.from(groupMap.values());
  const lines: string[] = [];
  let baseAlias: string | null = null;

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const isBase = i === 0;
    const joinType = isBase ? 'BASE' : 'INNER';

    if (isBase) baseAlias = g.alias;

    lines.push(`  - schema: ${g.schema}`);
    lines.push(`    table: ${g.table}`);
    lines.push(`    alias: ${g.alias}`);
    lines.push(`    join_type: ${joinType}`);

    if (!isBase && baseAlias) {
      const joinOn = inferJoinOn(g, baseAlias, groups[0]);
      if (joinOn) {
        lines.push(`    join_on: "${escapeYamlString(joinOn)}"`);
      }
    }

    lines.push(`    fields:`);
    for (const f of g.fields) {
      lines.push(`      - name: ${f.name}`);
      lines.push(`        role: ${f.role}`);
    }
  }

  return lines.join('\n');
}

function layerToSchema(layer: string): string {
  const l = layer.toUpperCase();
  if (l === 'L1') return 'l1';
  if (l === 'L2') return 'l2';
  if (l === 'L3') return 'l3';
  return 'l2'; // default
}

/** Derive a short alias from table name (first chars of each word segment). */
function deriveAlias(tableName: string, existing: Map<string, SourceGroup>): string {
  const parts = tableName.split('_').filter(Boolean);
  // Try first-letter-of-each-word (e.g., facility_exposure_snapshot -> fes)
  let alias = parts.map((p) => p[0]).join('');
  if (alias.length < 2 && parts.length > 0) {
    alias = parts[0].slice(0, 3);
  }

  // Ensure uniqueness
  const existingAliases = new Set(
    Array.from(existing.values()).map((g) => g.alias)
  );
  let candidate = alias;
  let suffix = 2;
  while (existingAliases.has(candidate)) {
    candidate = `${alias}${suffix}`;
    suffix++;
  }
  return candidate;
}

/** Infer field role from the field name suffix. */
function inferFieldRole(fieldName: string): string {
  if (fieldName.endsWith('_id')) return 'JOIN_KEY';
  if (fieldName === 'as_of_date' || fieldName.endsWith('_date')) return 'FILTER';
  if (fieldName.endsWith('_flag')) return 'FILTER';
  if (fieldName.endsWith('_code') || fieldName.endsWith('_type')) return 'DIMENSION';
  // Default to MEASURE for amount/pct/value/count/rate/bps fields, else MEASURE
  return 'MEASURE';
}

/** Attempt to infer a join condition between two source groups. */
function inferJoinOn(
  joined: SourceGroup,
  baseAlias: string,
  baseGroup: SourceGroup
): string | null {
  // Look for common JOIN_KEY fields between the two groups
  const baseKeys = baseGroup.fields
    .filter((f) => f.role === 'JOIN_KEY')
    .map((f) => f.name);
  const joinedKeys = joined.fields
    .filter((f) => f.role === 'JOIN_KEY')
    .map((f) => f.name);

  const common = baseKeys.filter((k) => joinedKeys.includes(k));
  if (common.length > 0) {
    return common
      .map((k) => `${joined.alias}.${k} = ${baseAlias}.${k}`)
      .join(' AND ');
  }

  // Fallback: look for facility_id as a common key
  const baseFacility = baseGroup.fields.some((f) => f.name === 'facility_id');
  const joinedFacility = joined.fields.some((f) => f.name === 'facility_id');
  if (baseFacility && joinedFacility) {
    return `${joined.alias}.facility_id = ${baseAlias}.facility_id`;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// Level Formulas Builder
// ═══════════════════════════════════════════════════════════════

function buildLevels(
  metric: MetricWithSources,
  rollupStrategy: string,
  genericFormula: string
): string {
  const aggType = inferAggregationType(rollupStrategy);
  const facilityAggType = rollupStrategy === 'direct-sum' ? 'RAW' : aggType;

  const facilityFormulaText = genericFormula || `${metric.name} per facility`;
  const counterpartyFormulaText = 'Aggregated per counterparty';
  const deskFormulaText = 'Aggregated per desk segment';
  const portfolioFormulaText = 'Aggregated per portfolio segment';
  const segmentFormulaText = 'Aggregated per business segment';

  return `\
  facility:
    aggregation_type: ${facilityAggType}
    formula_text: "${escapeYamlString(facilityFormulaText)}"
  counterparty:
    aggregation_type: ${aggType}
    formula_text: "${escapeYamlString(counterpartyFormulaText)}"
  desk:
    aggregation_type: SUM
    formula_text: "${escapeYamlString(deskFormulaText)}"
  portfolio:
    aggregation_type: SUM
    formula_text: "${escapeYamlString(portfolioFormulaText)}"
  business_segment:
    aggregation_type: SUM
    formula_text: "${escapeYamlString(segmentFormulaText)}"`;
}

function inferAggregationType(rollupStrategy: string): string {
  switch (rollupStrategy) {
    case 'direct-sum': return 'SUM';
    case 'sum-ratio': return 'CUSTOM';
    case 'weighted-avg': return 'WEIGHTED_AVG';
    case 'count': return 'COUNT';
    case 'min': return 'MIN';
    case 'max': return 'MAX';
    case 'avg': return 'WEIGHTED_AVG';
    default: return 'SUM';
  }
}

// ═══════════════════════════════════════════════════════════════
// Catalogue Block Builder
// ═══════════════════════════════════════════════════════════════

function buildCatalogue(
  metricId: string,
  abbreviation: string,
  insight: string,
  rollupStrategy: string
): string {
  return `\
  item_id: "${escapeYamlString(metricId)}"
  abbreviation: "${escapeYamlString(abbreviation)}"
  insight: "${escapeYamlString(insight)}"
  rollup_strategy: "${escapeYamlString(rollupStrategy)}"
  primary_value_field: "metric_value"`;
}

// ═══════════════════════════════════════════════════════════════
// Tags Builder
// ═══════════════════════════════════════════════════════════════

function buildTags(domain: string): string {
  return `  - ${domain}`;
}

// ═══════════════════════════════════════════════════════════════
// Utility Helpers
// ═══════════════════════════════════════════════════════════════

/** Format a Date to YYYY-MM-DD string. */
function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Infer d3-format display format string from unit_type. */
function inferDisplayFormat(unitType: string): string {
  switch (unitType) {
    case 'CURRENCY': return '$,.0f';
    case 'PERCENTAGE': return '.2f';
    case 'RATIO': return '.2f';
    case 'COUNT': return ',d';
    case 'RATE': return '.4f';
    case 'BPS': return '.1f';
    case 'DAYS': return ',d';
    case 'INDEX': return '.2f';
    case 'ORDINAL': return ',d';
    default: return '$,.0f';
  }
}

/** Derive an abbreviation from the metric ID and name. */
function deriveAbbreviation(metricId: string, name: string): string {
  // Try to build from first letters of significant words
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2); // skip short words like "of", "in", "to"
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w.slice(0, 4).toUpperCase())
      .join('-');
  }
  return metricId;
}

/**
 * Escape a string for safe inclusion in double-quoted YAML values.
 * Handles double quotes and backslashes.
 */
function escapeYamlString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ');
}

/**
 * Indent a multi-line block of text by the given number of spaces.
 * Each line gets the indentation prefix.
 */
function indentBlock(text: string, spaces: number): string {
  const prefix = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}
