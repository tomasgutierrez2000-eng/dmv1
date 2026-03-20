/**
 * GSIB Calculation Engine — YAML Metric Definition Loader
 *
 * Recursively scans metrics/**\/*.yaml, parses, validates against
 * JSON Schema, and returns typed MetricDefinition[] sorted by metric_id.
 */

import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import Ajv from 'ajv';
import { metricDefinitionSchema } from './schema';
import type { MetricDefinition } from '../types';
import {
  validateSqlSafety,
  validateFormulaLogic,
  isBlockingWarning,
} from '../../../lib/validation-utils';
import type { FormulaEntry, ValidationContext } from '../../../lib/validation-utils';

const METRICS_DIR = path.resolve(__dirname, '..', 'metrics');

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(metricDefinitionSchema);

/** Recursively find all .yaml files under a directory */
function findYamlFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findYamlFiles(fullPath));
    } else if (entry.name.endsWith('.yaml') && !entry.name.startsWith('_')) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Convert MetricDefinition levels to FormulaEntry[] for shared validation utils */
function toFormulaEntries(metric: MetricDefinition): FormulaEntry[] {
  return Object.entries(metric.levels).map(([level, formula]) => ({
    level,
    formulaSql: formula.formula_sql,
  }));
}

/** Build ValidationContext from a MetricDefinition */
function toValidationCtx(metric: MetricDefinition): ValidationContext {
  return { metricId: metric.metric_id, status: metric.status };
}

export interface LoadResult {
  metrics: MetricDefinition[];
  errors: string[];
  warnings: string[];
}

/**
 * Load all metric definitions from the metrics directory.
 *
 * @param metricsDir - Override directory (default: scripts/calc_engine/metrics/)
 * @returns Parsed and validated MetricDefinition[] + any errors
 */
export function loadMetricDefinitions(metricsDir?: string): LoadResult {
  const dir = metricsDir ?? METRICS_DIR;
  const yamlFiles = findYamlFiles(dir);
  const metrics: MetricDefinition[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenIds = new Set<string>();

  for (const filePath of yamlFiles) {
    const relPath = path.relative(dir, filePath);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = parseYaml(raw);

      // JSON Schema validation
      const valid = validate(parsed);
      if (!valid) {
        const schemaErrors = (validate.errors ?? [])
          .map((e) => `${e.instancePath} ${e.message}`)
          .join('; ');
        errors.push(`${relPath}: schema validation failed — ${schemaErrors}`);
        continue;
      }

      const metric = parsed as MetricDefinition;

      // Duplicate ID check
      if (seenIds.has(metric.metric_id)) {
        errors.push(`${relPath}: duplicate metric_id "${metric.metric_id}"`);
        continue;
      }
      seenIds.add(metric.metric_id);

      // SQL safety check (shared validation utils)
      const ctx = toValidationCtx(metric);
      const entries = toFormulaEntries(metric);
      const sqlErrors = validateSqlSafety(ctx, entries);
      if (sqlErrors.length > 0) {
        errors.push(...sqlErrors.map((e) => `${relPath}: ${e}`));
        continue;
      }

      // Formula logic linting — critical rules block ACTIVE metrics from loading
      const logicWarnings = validateFormulaLogic(ctx, entries);

      if (metric.status === 'ACTIVE' && logicWarnings.length > 0) {
        const blockers = logicWarnings.filter(isBlockingWarning);
        if (blockers.length > 0) {
          for (const b of blockers) {
            errors.push(`${relPath}: BLOCKED (ACTIVE) — ${b}`);
          }
          const nonBlockers = logicWarnings.filter((w) => !isBlockingWarning(w));
          for (const w of nonBlockers) {
            warnings.push(`${relPath}: ${w}`);
          }
          continue; // Don't load this metric — must fix before syncing
        }
      }

      // Non-blocking warnings for all metrics
      if (logicWarnings.length > 0) {
        for (const w of logicWarnings) {
          warnings.push(`${relPath}: ${w}`);
        }
      }

      metric._file_path = filePath;
      metric._loaded_at = new Date().toISOString();
      metrics.push(metric);
    } catch (err) {
      errors.push(`${relPath}: parse error — ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Cross-metric validation: depends_on references must point to loaded metrics
  const loadedIds = new Set(metrics.map((m) => m.metric_id));
  for (const metric of metrics) {
    for (const depId of metric.depends_on) {
      if (!loadedIds.has(depId)) {
        errors.push(
          `${metric.metric_id}: depends_on references unknown metric "${depId}"`
        );
      }
    }
  }

  // Cross-metric validation: catalogue abbreviation uniqueness
  const seenAbbreviations = new Map<string, string>();
  for (const metric of metrics) {
    const abbr = (metric as { catalogue?: { abbreviation?: string } }).catalogue?.abbreviation;
    if (abbr) {
      const existing = seenAbbreviations.get(abbr);
      if (existing) {
        warnings.push(
          `${metric.metric_id}: duplicate catalogue abbreviation "${abbr}" (also used by ${existing})`
        );
      } else {
        seenAbbreviations.set(abbr, metric.metric_id);
      }
    }
  }

  // Sort by metric_id for deterministic output
  metrics.sort((a, b) => a.metric_id.localeCompare(b.metric_id));

  return { metrics, errors, warnings };
}
