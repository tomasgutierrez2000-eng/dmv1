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

/**
 * Formula logic linter — catches common GSIB formula bugs at load-time.
 * Returns warnings (non-blocking) to shift-left bug detection during calc:sync.
 */
function validateFormulaLogic(metric: MetricDefinition): string[] {
  const warnings: string[] = [];

  for (const [level, formula] of Object.entries(metric.levels)) {
    const sql = formula.formula_sql;

    // Rule 1: EBT join completeness — every LEFT JOIN l1.enterprise_business_taxonomy
    // must include AND <alias>.is_current_flag = 'Y'
    const ebtJoinRegex = /LEFT\s+JOIN\s+l1\.enterprise_business_taxonomy\s+(\w+)\s*\n?\s*ON\s+/gi;
    let m;
    while ((m = ebtJoinRegex.exec(sql)) !== null) {
      const alias = m[1];
      // Look for the alias.is_current_flag within the next ~300 chars (same JOIN clause)
      const searchWindow = sql.substring(m.index, Math.min(m.index + 300, sql.length));
      if (!searchWindow.includes(`${alias}.is_current_flag`)) {
        warnings.push(
          `${metric.metric_id}.${level}: EBT alias "${alias}" missing AND ${alias}.is_current_flag = 'Y'`
        );
      }
    }

    // Rule 2: Division without NULLIF — catches SUM(x)/SUM(y) without safe wrapper
    const unsafeDivRegex = /\/\s*(?!NULLIF\b)(?:SUM|COUNT|AVG)\s*\(/gi;
    if (unsafeDivRegex.test(sql)) {
      warnings.push(
        `${metric.metric_id}.${level}: division without NULLIF() — risk of division by zero`
      );
    }

    // Rule 3: Boolean syntax — must use = 'Y' not = TRUE/true
    if (/=\s*(TRUE|FALSE)\b/i.test(sql) && !/=\s*'[YN]'/.test(sql.substring(0, sql.search(/=\s*(TRUE|FALSE)\b/i) + 20))) {
      // Only warn if the TRUE/FALSE appears in a comparison context (not inside a string)
      const withoutStrings = sql.replace(/'[^']*'/g, '');
      if (/=\s*(TRUE|FALSE)\b/i.test(withoutStrings)) {
        warnings.push(
          `${metric.metric_id}.${level}: use = 'Y' for boolean flags, not = TRUE/FALSE`
        );
      }
    }

    // Rule 4: PostgreSQL-only casts
    if (/::(?:FLOAT|INT|TEXT|NUMERIC|BIGINT|VARCHAR|INTEGER|REAL|DOUBLE)/i.test(sql)) {
      warnings.push(
        `${metric.metric_id}.${level}: PostgreSQL-specific cast (::TYPE) — use * 1.0 for float math`
      );
    }

    // Rule 5: WHERE before last JOIN (parenthesis-aware — only flags at the same nesting depth)
    {
      const clean = sql.replace(/'[^']*'/g, '');
      let depth = 0;
      let firstWhereAtDepth0 = -1;
      let lastJoinAtDepth0 = -1;
      for (let ci = 0; ci < clean.length; ci++) {
        if (clean[ci] === '(') { depth++; continue; }
        if (clean[ci] === ')') { depth--; continue; }
        if (depth !== 0) continue;
        // Check for WHERE keyword at depth 0
        if (firstWhereAtDepth0 === -1) {
          const slice = clean.slice(ci, ci + 6);
          if (/^\bWHERE\b/i.test(slice)) {
            firstWhereAtDepth0 = ci;
          }
        }
        // Check for JOIN keyword at depth 0
        const joinSlice = clean.slice(ci, ci + 15);
        if (/^(?:LEFT\s+|INNER\s+|CROSS\s+)?JOIN\b/i.test(joinSlice)) {
          lastJoinAtDepth0 = ci;
        }
      }
      if (firstWhereAtDepth0 > -1 && lastJoinAtDepth0 > -1 && firstWhereAtDepth0 < lastJoinAtDepth0) {
        warnings.push(
          `${metric.metric_id}.${level}: WHERE clause before last JOIN — SQL syntax error`
        );
      }
    }

    // Rule 6: FX rate without COALESCE
    if (/\bfx\.rate\b/.test(sql) && !/COALESCE\s*\([^)]*fx\.rate/i.test(sql)) {
      warnings.push(
        `${metric.metric_id}.${level}: fx.rate used without COALESCE() — NULL rates will propagate`
      );
    }

    // Rule 7: SUM of date fields
    if (/\bSUM\s*\(\s*\w+\.\w+_date\b/i.test(sql)) {
      warnings.push(
        `${metric.metric_id}.${level}: SUM() of a date field — use MIN/MAX for date aggregation`
      );
    }

    // Rule 8: AVG of ratios/percentages at aggregate levels (not facility)
    if (level !== 'facility' && /\bAVG\s*\(\s*\w+\.\w+_(?:pct|ratio)\b/i.test(sql)) {
      warnings.push(
        `${metric.metric_id}.${level}: AVG() of ratio/pct at aggregate level — use sum-ratio to avoid Simpson's paradox`
      );
    }

    // Rule 9: SUM of string/text fields (meaningless aggregation)
    if (/\bSUM\s*\(\s*\w+\.\w+_(name|desc|text|code)\b/i.test(sql)) {
      warnings.push(
        `${metric.metric_id}.${level}: SUM() of text/name/code field — use COUNT(DISTINCT) or MIN() for strings`
      );
    }

    // Rule 10: SUM of ID fields (meaningless aggregation — but allow inside CASE WHEN)
    const sumIdMatch = sql.match(/\bSUM\s*\(\s*(\w+\.\w+_id)\b/i);
    if (sumIdMatch) {
      // Check that this SUM(_id) is NOT inside a CASE WHEN or COUNT(DISTINCT) context
      const contextBefore = sql.substring(Math.max(0, sql.indexOf(sumIdMatch[0]) - 30), sql.indexOf(sumIdMatch[0]));
      if (!/CASE\s+WHEN/i.test(contextBefore)) {
        warnings.push(
          `${metric.metric_id}.${level}: SUM() of ID field "${sumIdMatch[1]}" — use COUNT(DISTINCT) instead`
        );
      }
    }

    // Rule 11: CTE usage (formula_sql must start with SELECT, not WITH...AS)
    if (/^\s*WITH\b/i.test(sql)) {
      warnings.push(
        `${metric.metric_id}.${level}: formula_sql must start with SELECT — convert CTEs to inline subqueries`
      );
    }

    // Rule 12: Wrong EBT join key (facility_id/counterparty_id don't exist on EBT)
    if (/ebt\w*\.(facility_id|counterparty_id|agreement_id)/i.test(sql)) {
      warnings.push(
        `${metric.metric_id}.${level}: EBT join on non-existent field — use ebt.managed_segment_id = fm.lob_segment_id`
      );
    }

    // Rule 13: Missing COALESCE on nullable weight fields in weighted-avg patterns
    // Detects SUM(x * y) where y could be NULL and is not wrapped in COALESCE
    const weightedProductRegex = /\bSUM\s*\(\s*\w+\.\w+\s*\*\s*(?!COALESCE)(\w+\.(?:outstanding_balance_amt|gross_exposure_usd|committed_facility_amt))/gi;
    let wm;
    while ((wm = weightedProductRegex.exec(sql)) !== null) {
      warnings.push(
        `${metric.metric_id}.${level}: "${wm[1]}" used as weight without COALESCE — NULL values will nullify entire term`
      );
    }

    // Rule 14: Duplicate table aliases (same alias for different tables)
    const aliasMatches = [...sql.matchAll(/\b(?:FROM|JOIN)\s+\w+\.\w+\s+(\w+)\b/gi)];
    const aliasToTable = new Map<string, string>();
    for (const am of aliasMatches) {
      const alias = am[1].toLowerCase();
      const fullMatch = am[0].toLowerCase();
      const tableMatch = fullMatch.match(/(?:from|join)\s+(\w+\.\w+)/i);
      if (tableMatch) {
        const table = tableMatch[1];
        if (aliasToTable.has(alias) && aliasToTable.get(alias) !== table) {
          warnings.push(
            `${metric.metric_id}.${level}: duplicate alias "${am[1]}" used for both "${aliasToTable.get(alias)}" and "${table}"`
          );
        }
        aliasToTable.set(alias, table);
      }
    }
  }

  return warnings;
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

      // SQL safety check
      const sqlErrors = validateSqlSafety(metric);
      if (sqlErrors.length > 0) {
        errors.push(...sqlErrors.map((e) => `${relPath}: ${e}`));
        continue;
      }

      // Formula logic linting — critical rules block ACTIVE metrics from loading
      const logicWarnings = validateFormulaLogic(metric);

      // These rule fragments cause SQL execution failures — block ACTIVE metrics
      const BLOCKING_RULE_FRAGMENTS = [
        'WHERE clause before last JOIN',   // SQL syntax error
        'PostgreSQL-specific cast',        // Breaks sql.js
        "use = 'Y' for boolean flags",     // Breaks sql.js
        'must start with SELECT',          // CTE breaks sync validator
        'non-existent field',              // EBT join on wrong field
      ];

      if (metric.status === 'ACTIVE' && logicWarnings.length > 0) {
        const blockers = logicWarnings.filter((w) =>
          BLOCKING_RULE_FRAGMENTS.some((frag) => w.includes(frag))
        );
        if (blockers.length > 0) {
          for (const b of blockers) {
            errors.push(`${relPath}: BLOCKED (ACTIVE) — ${b}`);
          }
          // Still add non-blocking warnings for visibility
          const nonBlockers = logicWarnings.filter(
            (w) => !BLOCKING_RULE_FRAGMENTS.some((frag) => w.includes(frag))
          );
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
