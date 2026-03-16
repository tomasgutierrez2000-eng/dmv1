/**
 * Upload validator — validates parsed metric uploads against the data dictionary.
 *
 * Checks metric ID format, collisions with existing catalogue items, required
 * fields, domain/unit/direction/class validity, and source field existence in the
 * data dictionary (with fuzzy matching suggestions).
 */

import { readDataDictionary, findTable } from '@/lib/data-dictionary';
import type { DataDictionary } from '@/lib/data-dictionary';
import { getCatalogueItems } from './store';
import type { MetricWithSources } from './template-parser';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  suggestion?: string;
  auto_fixable?: boolean;
  auto_fix_value?: string;
}

export interface MetricValidation {
  metric_id: string;
  name: string;
  status: 'valid' | 'warning' | 'error';
  issues: ValidationIssue[];
}

export interface ValidationReport {
  metrics: MetricValidation[];
  summary: { total: number; valid: number; warnings: number; errors: number };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const METRIC_ID_PATTERN = /^[A-Z]+-\d{3}$/;

const VALID_DOMAINS = [
  'exposure',
  'risk',
  'pricing',
  'profitability',
  'capital',
  'amendments',
  'reference',
] as const;

const VALID_UNIT_TYPES = [
  'CURRENCY',
  'PERCENTAGE',
  'RATIO',
  'COUNT',
  'RATE',
  'BPS',
  'DAYS',
  'INDEX',
] as const;

const VALID_DIRECTIONS = [
  'HIGHER_BETTER',
  'LOWER_BETTER',
  'NEUTRAL',
] as const;

const VALID_METRIC_CLASSES = [
  'SOURCED',
  'CALCULATED',
  'HYBRID',
] as const;

const VALID_LAYERS = ['L1', 'L2', 'L3'] as const;

// ---------------------------------------------------------------------------
// Levenshtein distance (simple DP implementation, no external deps)
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Use two-row optimisation to save memory.
  let prev = new Array<number>(lb + 1);
  let curr = new Array<number>(lb + 1);

  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[lb];
}

/**
 * Find the closest string in `haystack` to `needle` using Levenshtein
 * distance. Returns the best match if its distance is <= maxDistance,
 * otherwise null.
 */
function findClosestMatch(
  needle: string,
  haystack: string[],
  maxDistance = 3
): string | null {
  if (haystack.length === 0) return null;

  let bestMatch: string | null = null;
  let bestDist = Infinity;

  const lowerNeedle = needle.toLowerCase();

  for (const candidate of haystack) {
    const dist = levenshtein(lowerNeedle, candidate.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      bestMatch = candidate;
    }
  }

  return bestDist <= maxDistance ? bestMatch : null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function checkRequiredString(
  value: unknown,
  fieldName: string,
  issues: ValidationIssue[]
): void {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push({
      severity: 'error',
      field: fieldName,
      message: `Required field '${fieldName}' is missing or empty.`,
    });
  }
}

/**
 * Collect all table names per layer from the data dictionary.
 */
function tableNamesByLayer(dd: DataDictionary): Record<string, string[]> {
  return {
    L1: dd.L1.map((t) => t.name),
    L2: dd.L2.map((t) => t.name),
    L3: dd.L3.map((t) => t.name),
  };
}

/**
 * Collect all table names across all layers (flat list).
 */
function allTableNames(dd: DataDictionary): string[] {
  return [...dd.L1, ...dd.L2, ...dd.L3].map((t) => t.name);
}

// ---------------------------------------------------------------------------
// Per-metric validation
// ---------------------------------------------------------------------------

function validateMetric(
  metric: MetricWithSources,
  existingIds: Set<string>,
  dd: DataDictionary | null,
  tablesByLayer: Record<string, string[]>,
  allTables: string[]
): MetricValidation {
  const issues: ValidationIssue[] = [];

  // 1. Metric ID format
  const metricId = metric.metric_id ?? '';
  if (metricId && !METRIC_ID_PATTERN.test(metricId)) {
    issues.push({
      severity: 'error',
      field: 'metric_id',
      message: `Metric ID '${metricId}' does not match the required format [A-Z]+-[0-9]{3} (e.g. MET-001).`,
      suggestion: 'Use uppercase letters followed by a dash and exactly three digits.',
    });
  }

  // 2. Metric ID collision
  if (metricId && existingIds.has(metricId)) {
    issues.push({
      severity: 'error',
      field: 'metric_id',
      message: `Metric ID '${metricId}' already exists in the catalogue.`,
    });
  }

  // 3. Required fields
  const m = metric as unknown as Record<string, unknown>;
  const requiredFields = [
    'metric_id',
    'name',
    'domain',
    'abbreviation',
    'definition',
    'generic_formula',
    'unit_type',
    'direction',
    'metric_class',
  ];

  for (const label of requiredFields) {
    checkRequiredString(m[label], label, issues);
  }

  // 4. Domain validity
  const domain = (typeof metric.domain === 'string' ? metric.domain : '').trim().toLowerCase();
  if (domain && !(VALID_DOMAINS as readonly string[]).includes(domain)) {
    issues.push({
      severity: 'error',
      field: 'domain',
      message: `Invalid domain '${metric.domain}'. Must be one of: ${VALID_DOMAINS.join(', ')}.`,
    });
  }

  // 5. Unit type validity
  const unitType = (typeof metric.unit_type === 'string' ? metric.unit_type : '').trim().toUpperCase();
  if (unitType && !(VALID_UNIT_TYPES as readonly string[]).includes(unitType)) {
    issues.push({
      severity: 'error',
      field: 'unit_type',
      message: `Invalid unit_type '${metric.unit_type}'. Must be one of: ${VALID_UNIT_TYPES.join(', ')}.`,
    });
  }

  // 6. Direction validity
  const direction = (typeof metric.direction === 'string' ? metric.direction : '').trim().toUpperCase();
  if (direction && !(VALID_DIRECTIONS as readonly string[]).includes(direction)) {
    issues.push({
      severity: 'error',
      field: 'direction',
      message: `Invalid direction '${metric.direction}'. Must be one of: ${VALID_DIRECTIONS.join(', ')}.`,
    });
  }

  // 7. Metric class validity
  const metricClass = (typeof metric.metric_class === 'string' ? metric.metric_class : '').trim().toUpperCase();
  if (metricClass && !(VALID_METRIC_CLASSES as readonly string[]).includes(metricClass)) {
    issues.push({
      severity: 'error',
      field: 'metric_class',
      message: `Invalid metric_class '${metric.metric_class}'. Must be one of: ${VALID_METRIC_CLASSES.join(', ')}.`,
    });
  }

  // 8. Source fields — at least one expected
  const sourceFields: Array<{ layer?: string; table?: string; field?: string }> =
    Array.isArray(metric.sources) ? metric.sources : [];

  if (sourceFields.length === 0) {
    issues.push({
      severity: 'warning',
      field: 'sourceFields',
      message: 'No source fields defined. At least one source field is recommended.',
    });
  }

  // Per-source-field checks (9, 10, 11)
  for (let i = 0; i < sourceFields.length; i++) {
    const sf = sourceFields[i];
    const sfPrefix = `sourceFields[${i}]`;

    // 11. Layer validity
    const rawLayer = (typeof sf.layer === 'string' ? sf.layer : '').trim().toUpperCase();
    if (!rawLayer) {
      issues.push({
        severity: 'error',
        field: `${sfPrefix}.layer`,
        message: `Source field #${i + 1} is missing a layer.`,
      });
    } else if (!(VALID_LAYERS as readonly string[]).includes(rawLayer)) {
      issues.push({
        severity: 'error',
        field: `${sfPrefix}.layer`,
        message: `Source field #${i + 1} has invalid layer '${sf.layer}'. Must be L1, L2, or L3.`,
      });
    }

    const layerKey = rawLayer as 'L1' | 'L2' | 'L3';
    const tableName = (typeof sf.table === 'string' ? sf.table : '').trim();
    const fieldName = (typeof sf.field === 'string' ? sf.field : '').trim();

    // 9. Table existence
    if (tableName && dd) {
      const layerTables = (VALID_LAYERS as readonly string[]).includes(layerKey)
        ? tablesByLayer[layerKey] ?? []
        : allTables;

      const tableFound = layerTables.some(
        (t) => t.toLowerCase() === tableName.toLowerCase()
      );

      if (!tableFound) {
        const closest = findClosestMatch(tableName, layerTables);
        issues.push({
          severity: 'error',
          field: `${sfPrefix}.table`,
          message: `Table '${tableName}' not found in ${(VALID_LAYERS as readonly string[]).includes(layerKey) ? layerKey : 'any layer'} of the data dictionary.`,
          suggestion: closest ? `Did you mean '${closest}'?` : undefined,
          auto_fixable: closest != null,
          auto_fix_value: closest ?? undefined,
        });
      } else {
        // 10. Field existence (only if table was found)
        if (fieldName && (VALID_LAYERS as readonly string[]).includes(layerKey)) {
          const ddTable = findTable(dd, layerKey, tableName) ??
            findTable(
              dd,
              layerKey,
              layerTables.find((t) => t.toLowerCase() === tableName.toLowerCase()) ?? tableName
            );

          if (ddTable) {
            const fieldExists = ddTable.fields.some(
              (f) => f.name.toLowerCase() === fieldName.toLowerCase()
            );
            if (!fieldExists) {
              const fieldNames = ddTable.fields.map((f) => f.name);
              const closestField = findClosestMatch(fieldName, fieldNames);
              issues.push({
                severity: 'error',
                field: `${sfPrefix}.field`,
                message: `Field '${fieldName}' not found in table '${ddTable.name}'.`,
                suggestion: closestField ? `Did you mean '${closestField}'?` : undefined,
                auto_fixable: closestField != null,
                auto_fix_value: closestField ?? undefined,
              });
            }
          }
        }
      }
    }
  }

  // Determine overall status
  const hasError = issues.some((i) => i.severity === 'error');
  const hasWarning = issues.some((i) => i.severity === 'warning');
  const status: MetricValidation['status'] = hasError
    ? 'error'
    : hasWarning
      ? 'warning'
      : 'valid';

  return {
    metric_id: metricId || '(unknown)',
    name: (typeof metric.name === 'string' ? metric.name : '') || '(unnamed)',
    status,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateUpload(
  metrics: MetricWithSources[],
): ValidationReport {
  // Load data dictionary (may be null if unavailable)
  const dd = readDataDictionary();
  const tblByLayer = dd ? tableNamesByLayer(dd) : {};
  const allTbls = dd ? allTableNames(dd) : [];

  // Build set of existing catalogue item IDs for collision check
  const existingItems = getCatalogueItems({});
  const existingIds = new Set(existingItems.map((item) => item.item_id));

  // Validate each metric
  const validations = metrics.map((m) =>
    validateMetric(m, existingIds, dd, tblByLayer, allTbls)
  );

  // Build summary
  let valid = 0;
  let warnings = 0;
  let errors = 0;
  for (const v of validations) {
    switch (v.status) {
      case 'valid':
        valid++;
        break;
      case 'warning':
        warnings++;
        break;
      case 'error':
        errors++;
        break;
    }
  }

  return {
    metrics: validations,
    summary: { total: metrics.length, valid, warnings, errors },
  };
}
