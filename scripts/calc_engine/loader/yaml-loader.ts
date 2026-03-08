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

const METRICS_DIR = path.resolve(__dirname, '..', 'metrics');

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(metricDefinitionSchema);

/** Forbidden SQL keywords in formula_sql (write operations) */
const FORBIDDEN_SQL_PATTERNS = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b/i;

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

/** Validate that formula_sql is read-only (SELECT only, single statement) */
function validateSqlSafety(metric: MetricDefinition): string[] {
  const errors: string[] = [];
  for (const [level, formula] of Object.entries(metric.levels)) {
    const sql = formula.formula_sql.trim();
    if (!sql.toUpperCase().startsWith('SELECT')) {
      errors.push(`${metric.metric_id}.levels.${level}.formula_sql must start with SELECT`);
    }
    if (FORBIDDEN_SQL_PATTERNS.test(sql)) {
      errors.push(`${metric.metric_id}.levels.${level}.formula_sql contains forbidden write operation`);
    }
    // Check for multi-statement injection via semicolons (ignore semicolons inside string literals)
    const withoutStrings = sql.replace(/'[^']*'/g, '');
    if (withoutStrings.includes(';')) {
      errors.push(`${metric.metric_id}.levels.${level}.formula_sql contains semicolons (multi-statement not allowed)`);
    }
  }
  return errors;
}

export interface LoadResult {
  metrics: MetricDefinition[];
  errors: string[];
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

      // SQL safety check
      const sqlErrors = validateSqlSafety(metric);
      if (sqlErrors.length > 0) {
        errors.push(...sqlErrors.map((e) => `${relPath}: ${e}`));
        continue;
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

  // Sort by metric_id for deterministic output
  metrics.sort((a, b) => a.metric_id.localeCompare(b.metric_id));

  return { metrics, errors };
}
