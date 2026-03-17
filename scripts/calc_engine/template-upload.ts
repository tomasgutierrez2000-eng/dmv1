#!/usr/bin/env tsx
/**
 * Metric Upload Template — Parser, Auto-Derivation, YAML Generator
 *
 * Accepts a 2-sheet Excel template:
 *   Sheet 1 "Metrics": name, domain, sub_domain, unit_type, rollup_strategy, definition, ...
 *   Sheet 2 "Formulas": name, facility_sql, counterparty_sql, [desk_sql], [portfolio_sql], [segment_sql]
 *
 * Auto-derives: metric_id, aggregate SQL (desk/portfolio/segment via EBT hierarchy),
 * source_tables, ingredient_fields, validations, display_format, abbreviation, etc.
 *
 * Outputs: YAML files in scripts/calc_engine/metrics/{domain}/ ready for calc:sync.
 *
 * Usage:
 *   npx tsx scripts/calc_engine/template-upload.ts <path-to-excel>
 *   npx tsx scripts/calc_engine/template-upload.ts --generate-template
 */

import path from 'path';
import fs from 'fs';
import { stringify as yamlStringify } from 'yaml';

// Dynamic xlsx import — works in both tsx CLI and Next.js API routes
async function getXLSX() {
  const mod = await import('xlsx');
  // Next.js webpack: named exports (utils, readFile, etc.) are on mod directly
  // tsx/Node.js CJS: named exports may only be on mod.default
  if (typeof mod.utils !== 'undefined') return mod;
  return (mod as Record<string, unknown>).default ?? mod;
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface TemplateMetricRow {
  name: string;
  domain: string;
  sub_domain: string;
  unit_type: string;
  rollup_strategy: string;
  definition: string;
  direction?: string;
  metric_class?: string;
  abbreviation?: string;
  insight?: string;
  display_format?: string;
  regulatory_references?: string;
  tags?: string;
  dashboard_pages?: string;
}

interface TemplateFormulaRow {
  name: string;
  facility_sql: string;
  counterparty_sql: string;
  desk_sql?: string;
  portfolio_sql?: string;
  segment_sql?: string;
}

interface ParsedTemplateMetric {
  meta: TemplateMetricRow;
  formulas: TemplateFormulaRow;
}

export interface UploadResult {
  created: string[];
  warnings: string[];
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const VALID_DOMAINS = ['amendments', 'capital', 'exposure', 'pricing', 'profitability', 'reference', 'risk'];
const VALID_UNIT_TYPES = ['CURRENCY', 'PERCENTAGE', 'RATIO', 'COUNT', 'RATE', 'BPS', 'DAYS', 'INDEX', 'ORDINAL'];
const VALID_ROLLUP_STRATEGIES = ['direct-sum', 'sum-ratio', 'count-ratio', 'weighted-avg', 'none'];
const VALID_DIRECTIONS = ['HIGHER_BETTER', 'LOWER_BETTER', 'NEUTRAL'];
const VALID_METRIC_CLASSES = ['SOURCED', 'CALCULATED', 'HYBRID'];

/** Map domain → metric_id prefix. Based on existing conventions in the repo. */
const DOMAIN_PREFIX: Record<string, string> = {
  amendments: 'AMD',
  capital: 'CAP',
  exposure: 'EXP',
  pricing: 'PRC',
  profitability: 'PROF',
  reference: 'REF',
  risk: 'RSK',
};

/** Map unit_type → display_format. */
const UNIT_DISPLAY_FORMAT: Record<string, string> = {
  CURRENCY: '$,.0f',
  PERCENTAGE: '.2f',
  RATIO: ',.2f',
  COUNT: ',.0f',
  RATE: '.4f',
  BPS: ',.0f',
  DAYS: ',.0f',
  INDEX: ',.2f',
  ORDINAL: ',.0f',
};

/** Map rollup_strategy → aggregation_type for aggregate levels. */
const ROLLUP_TO_AGG: Record<string, string> = {
  'direct-sum': 'SUM',
  'sum-ratio': 'CUSTOM',
  'count-ratio': 'COUNT',
  'weighted-avg': 'WEIGHTED_AVG',
  none: 'RAW',
};

// Use process.cwd() for reliable path resolution in both tsx CLI and Next.js webpack
const METRICS_DIR = path.resolve(process.cwd(), 'scripts/calc_engine/metrics');

/** SQL patterns that indicate write operations (forbidden). */
const FORBIDDEN_SQL_PATTERNS = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b/i;

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function parseCommaList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function parsePipeList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value.split('|').map((s) => s.trim()).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════
// 1. Excel Parser
// ═══════════════════════════════════════════════════════════════

export async function parseTemplate(filePath: string): Promise<{ metrics: ParsedTemplateMetric[]; errors: string[] }> {
  const errors: string[] = [];

  if (!fs.existsSync(filePath)) {
    return { metrics: [], errors: [`File not found: ${filePath}`] };
  }

  const XLSX = await getXLSX();
  // Use fs.readFileSync + XLSX.read() instead of XLSX.readFile()
  // because xlsx's internal fs access can fail in webpack-bundled contexts
  const fileData = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileData);

  // Find sheets (case-insensitive)
  const sheetNames = workbook.SheetNames;
  const metricsSheet = sheetNames.find((s: string) => s.toLowerCase() === 'metrics');
  const formulasSheet = sheetNames.find((s: string) => s.toLowerCase() === 'formulas');

  if (!metricsSheet) {
    return { metrics: [], errors: ['Missing "Metrics" sheet in Excel file'] };
  }
  if (!formulasSheet) {
    return { metrics: [], errors: ['Missing "Formulas" sheet in Excel file'] };
  }

  const metricRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(workbook.Sheets[metricsSheet]);
  const formulaRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(workbook.Sheets[formulasSheet]);

  if (metricRows.length === 0) {
    return { metrics: [], errors: ['Metrics sheet is empty'] };
  }

  // Index formula rows by name
  const formulaMap = new Map<string, TemplateFormulaRow>();
  for (let i = 0; i < formulaRows.length; i++) {
    const row = formulaRows[i];
    const name = str(row['name']);
    if (!name) {
      errors.push(`Formulas sheet row ${i + 2}: missing "name" column`);
      continue;
    }
    formulaMap.set(name, {
      name,
      facility_sql: str(row['facility_sql']),
      counterparty_sql: str(row['counterparty_sql']),
      desk_sql: str(row['desk_sql']) || undefined,
      portfolio_sql: str(row['portfolio_sql']) || undefined,
      segment_sql: str(row['segment_sql']) || undefined,
    });
  }

  const metrics: ParsedTemplateMetric[] = [];
  const seenNames = new Set<string>();

  for (let i = 0; i < metricRows.length; i++) {
    const row = metricRows[i];
    const rowNum = i + 2; // Excel row (1-indexed header + 1-indexed data)
    const name = str(row['name']);

    // Required field validation
    if (!name) { errors.push(`Metrics row ${rowNum}: missing "name"`); continue; }
    if (seenNames.has(name)) { errors.push(`Metrics row ${rowNum}: duplicate name "${name}"`); continue; }
    seenNames.add(name);

    const domain = str(row['domain']).toLowerCase();
    const sub_domain = str(row['sub_domain']);
    const unit_type = str(row['unit_type']).toUpperCase();
    const rollup_strategy = str(row['rollup_strategy']).toLowerCase().replace(/\s+/g, '-');
    const definition = str(row['definition']);

    if (!domain) { errors.push(`Metrics row ${rowNum} "${name}": missing "domain"`); continue; }
    if (!sub_domain) { errors.push(`Metrics row ${rowNum} "${name}": missing "sub_domain"`); continue; }
    if (!unit_type) { errors.push(`Metrics row ${rowNum} "${name}": missing "unit_type"`); continue; }
    if (!rollup_strategy) { errors.push(`Metrics row ${rowNum} "${name}": missing "rollup_strategy"`); continue; }
    if (!definition) { errors.push(`Metrics row ${rowNum} "${name}": missing "definition"`); continue; }

    // Enum validation
    if (!VALID_DOMAINS.includes(domain)) {
      errors.push(`Metrics row ${rowNum} "${name}": invalid domain "${domain}" — valid: ${VALID_DOMAINS.join(', ')}`);
      continue;
    }
    if (!VALID_UNIT_TYPES.includes(unit_type)) {
      errors.push(`Metrics row ${rowNum} "${name}": invalid unit_type "${unit_type}" — valid: ${VALID_UNIT_TYPES.join(', ')}`);
      continue;
    }
    if (!VALID_ROLLUP_STRATEGIES.includes(rollup_strategy)) {
      errors.push(`Metrics row ${rowNum} "${name}": invalid rollup_strategy "${rollup_strategy}" — valid: ${VALID_ROLLUP_STRATEGIES.join(', ')}`);
      continue;
    }

    // Find matching formula row
    const formulas = formulaMap.get(name);
    if (!formulas) {
      errors.push(`Metrics row ${rowNum} "${name}": no matching row in Formulas sheet`);
      continue;
    }

    // Validate SQL
    if (!formulas.facility_sql) {
      errors.push(`Formulas "${name}": missing facility_sql`);
      continue;
    }
    if (!formulas.counterparty_sql && rollup_strategy !== 'none') {
      errors.push(`Formulas "${name}": missing counterparty_sql (required when rollup_strategy != "none")`);
      continue;
    }

    // SQL safety checks
    let sqlSafe = true;
    for (const [label, sql] of Object.entries({
      facility_sql: formulas.facility_sql,
      counterparty_sql: formulas.counterparty_sql,
    })) {
      if (!sql) continue;
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        errors.push(`Formulas "${name}".${label}: must start with SELECT`);
        sqlSafe = false;
      }
      if (FORBIDDEN_SQL_PATTERNS.test(sql)) {
        errors.push(`Formulas "${name}".${label}: contains forbidden write operation`);
        sqlSafe = false;
      }
      const withoutStrings = sql.replace(/'[^']*'/g, '');
      if (withoutStrings.includes(';')) {
        errors.push(`Formulas "${name}".${label}: contains semicolons (multi-statement not allowed)`);
        sqlSafe = false;
      }
    }
    if (!sqlSafe) continue;

    // Optional fields with defaults
    const direction = str(row['direction']).toUpperCase().replace(/\s+/g, '_');
    const metric_class = str(row['metric_class']).toUpperCase();

    metrics.push({
      meta: {
        name,
        domain,
        sub_domain,
        unit_type,
        rollup_strategy,
        definition,
        direction: VALID_DIRECTIONS.includes(direction) ? direction : undefined,
        metric_class: VALID_METRIC_CLASSES.includes(metric_class) ? metric_class : undefined,
        abbreviation: str(row['abbreviation']) || undefined,
        insight: str(row['insight']) || undefined,
        display_format: str(row['display_format']) || undefined,
        regulatory_references: str(row['regulatory_references']) || undefined,
        tags: str(row['tags']) || undefined,
        dashboard_pages: str(row['dashboard_pages']) || undefined,
      },
      formulas,
    });
  }

  return { metrics, errors };
}

// ═══════════════════════════════════════════════════════════════
// 2. Auto-Derivation: Metric ID Assignment
// ═══════════════════════════════════════════════════════════════

function getNextMetricId(domain: string): string {
  const prefix = DOMAIN_PREFIX[domain];
  if (!prefix) throw new Error(`Unknown domain: ${domain}`);

  const domainDir = path.join(METRICS_DIR, domain);
  if (!fs.existsSync(domainDir)) {
    fs.mkdirSync(domainDir, { recursive: true });
    return `${prefix}-001`;
  }

  const existing = fs.readdirSync(domainDir)
    .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
    .map((f) => f.replace('.yaml', ''));

  let maxNum = 0;
  for (const id of existing) {
    const match = id.match(/-(\d+)$/);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }

  const nextNum = maxNum + 1;
  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

function getNextCatalogueItemId(): string {
  const cataloguePath = path.resolve(process.cwd(), 'data/metric-library/catalogue.json');
  if (!fs.existsSync(cataloguePath)) return 'MET-001';

  const catalogue = JSON.parse(fs.readFileSync(cataloguePath, 'utf-8'));
  let maxNum = 0;
  for (const item of catalogue) {
    const match = item.item_id?.match(/MET-(\d+)/);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
  }
  return `MET-${String(maxNum + 1).padStart(3, '0')}`;
}

// ═══════════════════════════════════════════════════════════════
// 3. Auto-Derivation: Aggregate SQL via EBT Hierarchy Injection
// ═══════════════════════════════════════════════════════════════

/**
 * Generate desk-level SQL from counterparty SQL by injecting EBT L3 join
 * and replacing GROUP BY fm.counterparty_id with GROUP BY ebt.managed_segment_id.
 */
function deriveDesk(counterpartySql: string, unitType: string): string {
  let sql = counterpartySql;

  // Replace dimension_key alias target
  sql = sql.replace(
    /fm\.counterparty_id\s+AS\s+dimension_key/i,
    'ebt.managed_segment_id AS dimension_key',
  );

  // Replace GROUP BY
  sql = sql.replace(
    /GROUP\s+BY\s+fm\.counterparty_id/i,
    'GROUP BY ebt.managed_segment_id',
  );

  // Inject EBT join before WHERE clause
  const ebtJoin = `\n  LEFT JOIN l1.enterprise_business_taxonomy ebt\n    ON ebt.managed_segment_id = fm.lob_segment_id\n      AND ebt.is_current_flag = 'Y'`;

  // Insert before WHERE
  const whereIdx = sql.search(/\bWHERE\b/i);
  if (whereIdx > -1) {
    sql = sql.substring(0, whereIdx) + ebtJoin + '\n  ' + sql.substring(whereIdx);
  } else {
    // No WHERE — append before GROUP BY
    const groupIdx = sql.search(/\bGROUP\s+BY\b/i);
    if (groupIdx > -1) {
      sql = sql.substring(0, groupIdx) + ebtJoin + '\n  ' + sql.substring(groupIdx);
    } else {
      sql += ebtJoin;
    }
  }

  // Inject FX conversion for CURRENCY metrics
  if (unitType === 'CURRENCY') {
    sql = injectFxConversion(sql);
  }

  return sql;
}

function derivePortfolio(counterpartySql: string, unitType: string): string {
  let sql = counterpartySql;

  sql = sql.replace(
    /fm\.counterparty_id\s+AS\s+dimension_key/i,
    'ebt_l2.managed_segment_id AS dimension_key',
  );

  sql = sql.replace(
    /GROUP\s+BY\s+fm\.counterparty_id/i,
    'GROUP BY ebt_l2.managed_segment_id',
  );

  const ebtJoin = `\n  LEFT JOIN l1.enterprise_business_taxonomy ebt_l3\n    ON ebt_l3.managed_segment_id = fm.lob_segment_id\n      AND ebt_l3.is_current_flag = 'Y'\n  LEFT JOIN l1.enterprise_business_taxonomy ebt_l2\n    ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id\n      AND ebt_l2.is_current_flag = 'Y'`;

  const whereIdx = sql.search(/\bWHERE\b/i);
  if (whereIdx > -1) {
    sql = sql.substring(0, whereIdx) + ebtJoin + '\n  ' + sql.substring(whereIdx);
  } else {
    const groupIdx = sql.search(/\bGROUP\s+BY\b/i);
    if (groupIdx > -1) {
      sql = sql.substring(0, groupIdx) + ebtJoin + '\n  ' + sql.substring(groupIdx);
    } else {
      sql += ebtJoin;
    }
  }

  if (unitType === 'CURRENCY') {
    sql = injectFxConversion(sql);
  }

  return sql;
}

function deriveBusinessSegment(counterpartySql: string, unitType: string): string {
  let sql = counterpartySql;

  sql = sql.replace(
    /fm\.counterparty_id\s+AS\s+dimension_key/i,
    'ebt_l1.managed_segment_id AS dimension_key',
  );

  sql = sql.replace(
    /GROUP\s+BY\s+fm\.counterparty_id/i,
    'GROUP BY ebt_l1.managed_segment_id',
  );

  const ebtJoin = `\n  LEFT JOIN l1.enterprise_business_taxonomy ebt_l3\n    ON ebt_l3.managed_segment_id = fm.lob_segment_id\n      AND ebt_l3.is_current_flag = 'Y'\n  LEFT JOIN l1.enterprise_business_taxonomy ebt_l2\n    ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id\n      AND ebt_l2.is_current_flag = 'Y'\n  LEFT JOIN l1.enterprise_business_taxonomy ebt_l1\n    ON ebt_l1.managed_segment_id = ebt_l2.parent_segment_id\n      AND ebt_l1.is_current_flag = 'Y'`;

  const whereIdx = sql.search(/\bWHERE\b/i);
  if (whereIdx > -1) {
    sql = sql.substring(0, whereIdx) + ebtJoin + '\n  ' + sql.substring(whereIdx);
  } else {
    const groupIdx = sql.search(/\bGROUP\s+BY\b/i);
    if (groupIdx > -1) {
      sql = sql.substring(0, groupIdx) + ebtJoin + '\n  ' + sql.substring(groupIdx);
    } else {
      sql += ebtJoin;
    }
  }

  if (unitType === 'CURRENCY') {
    sql = injectFxConversion(sql);
  }

  return sql;
}

/** Inject FX rate join and multiply metric_value by COALESCE(fx.rate, 1). */
function injectFxConversion(sql: string): string {
  // Don't double-inject
  if (/\bfx_rate\b/i.test(sql) || /\bfx\.rate\b/i.test(sql)) return sql;

  // Detect the primary source table alias (first FROM clause)
  const fromMatch = sql.match(/FROM\s+\w+\.\w+\s+(\w+)/i);
  const srcAlias = fromMatch?.[1] ?? 'fes';

  const fxJoin = `\n  LEFT JOIN l2.fx_rate fx\n    ON fx.from_currency_code = ${srcAlias}.currency_code\n      AND fx.to_currency_code = 'USD'\n      AND fx.as_of_date = ${srcAlias}.as_of_date`;

  // Insert before WHERE
  const whereIdx = sql.search(/\bWHERE\b/i);
  if (whereIdx > -1) {
    sql = sql.substring(0, whereIdx) + fxJoin + '\n  ' + sql.substring(whereIdx);
  } else {
    const groupIdx = sql.search(/\bGROUP\s+BY\b/i);
    if (groupIdx > -1) {
      sql = sql.substring(0, groupIdx) + fxJoin + '\n  ' + sql.substring(groupIdx);
    }
  }

  // Wrap metric_value expression with * COALESCE(fx.rate, 1)
  // Match: <expr> AS metric_value
  sql = sql.replace(
    /(\S+(?:\([^)]*\))?)\s+AS\s+metric_value/i,
    (match, expr) => {
      // Don't double-wrap
      if (expr.includes('fx.rate')) return match;
      return `${expr} * COALESCE(fx.rate, 1) AS metric_value`;
    },
  );

  return sql;
}

// ═══════════════════════════════════════════════════════════════
// 4. Auto-Derivation: Source Tables from SQL
// ═══════════════════════════════════════════════════════════════

interface DerivedSourceTable {
  schema: 'l1' | 'l2' | 'l3';
  table: string;
  alias: string;
  join_type: 'BASE' | 'INNER' | 'LEFT';
  join_on?: string;
  fields: Array<{ name: string; role: 'MEASURE' | 'DIMENSION' | 'FILTER' | 'JOIN_KEY'; description?: string }>;
}

function extractSourceTables(facilitySql: string, counterpartySql: string): DerivedSourceTable[] {
  const tables: DerivedSourceTable[] = [];
  const seen = new Set<string>();

  // Parse FROM/JOIN clauses from both SQL strings
  const allSql = facilitySql + '\n' + counterpartySql;

  // Match: FROM l2.table_name alias or JOIN l2.table_name alias
  const pattern = /(?:(FROM|(?:INNER\s+)?JOIN|LEFT\s+JOIN)\s+)(l[123])\.(\w+)\s+(\w+)/gi;
  let match;
  let isFirst = true;

  while ((match = pattern.exec(allSql)) !== null) {
    const joinKeyword = match[1].trim().toUpperCase();
    const schema = match[2].toLowerCase() as 'l1' | 'l2' | 'l3';
    const table = match[3];
    const alias = match[4];

    // Skip EBT self-joins (handled separately in aggregate levels)
    if (table === 'enterprise_business_taxonomy') continue;
    // Skip FX rate (injected automatically)
    if (table === 'fx_rate') continue;

    const key = `${schema}.${table}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let joinType: 'BASE' | 'INNER' | 'LEFT' = 'INNER';
    if (isFirst || joinKeyword === 'FROM') {
      joinType = 'BASE';
      isFirst = false;
    } else if (joinKeyword.includes('LEFT')) {
      joinType = 'LEFT';
    }

    // Extract join condition (ON clause)
    let joinOn: string | undefined;
    if (joinType !== 'BASE') {
      const onRegex = new RegExp(
        `(?:${joinKeyword.replace(/\s+/g, '\\s+')}\\s+${schema}\\.${table}\\s+${alias}\\s+)ON\\s+([^\\n]+(?:\\n\\s+AND\\s+[^\\n]+)*)`,
        'i',
      );
      const onMatch = allSql.match(onRegex);
      if (onMatch) {
        joinOn = onMatch[1].trim();
      }
    }

    // Extract fields used from this alias
    const fields = extractFieldsForAlias(allSql, alias, table);

    tables.push({ schema, table, alias, join_type: joinType, join_on: joinOn, fields });
  }

  return tables;
}

function extractFieldsForAlias(
  sql: string,
  alias: string,
  tableName: string,
): DerivedSourceTable['fields'] {
  const fields: DerivedSourceTable['fields'] = [];
  const seen = new Set<string>();

  // Match alias.field_name
  const fieldPattern = new RegExp(`\\b${alias}\\.(\\w+)\\b`, 'g');
  let match;
  while ((match = fieldPattern.exec(sql)) !== null) {
    const fieldName = match[1];
    if (seen.has(fieldName)) continue;
    seen.add(fieldName);

    let role: 'MEASURE' | 'DIMENSION' | 'FILTER' | 'JOIN_KEY' = 'MEASURE';

    // Heuristic role detection
    if (fieldName.endsWith('_id') || fieldName === 'facility_id' || fieldName === 'counterparty_id') {
      role = 'JOIN_KEY';
    } else if (fieldName === 'as_of_date' || (fieldName.endsWith('_flag') && fieldName.startsWith('is_'))) {
      role = 'FILTER';
    }

    // Check if field appears in GROUP BY → DIMENSION
    const groupByPattern = new RegExp(`GROUP\\s+BY\\s+[^\\n]*\\b${alias}\\.${fieldName}\\b`, 'i');
    if (groupByPattern.test(sql)) {
      role = 'DIMENSION';
    }

    // Check if field appears in WHERE → FILTER
    const wherePattern = new RegExp(`WHERE\\s+[^\\n]*\\b${alias}\\.${fieldName}\\b`, 'i');
    if (wherePattern.test(sql)) {
      role = 'FILTER';
    }

    // Check if field appears in ON clause → JOIN_KEY
    const onPattern = new RegExp(`ON\\s+[^\\n]*\\b${alias}\\.${fieldName}\\b`, 'i');
    if (onPattern.test(sql)) {
      role = 'JOIN_KEY';
    }

    fields.push({ name: fieldName, role });
  }

  // Ensure at least one field
  if (fields.length === 0) {
    const pkField = tableName.endsWith('_snapshot') ? 'facility_id' : `${tableName.replace(/_dim$|_master$/, '')}_id`;
    fields.push({ name: pkField, role: 'JOIN_KEY' });
  }

  return fields;
}

// ═══════════════════════════════════════════════════════════════
// 5. Auto-Derivation: Validations
// ═══════════════════════════════════════════════════════════════

function deriveValidations(metricId: string, unitType: string, rollupStrategy: string) {
  const validations: Array<{
    rule_id: string;
    type: string;
    description: string;
    severity: string;
    params?: Record<string, unknown>;
  }> = [];

  // NOT_NULL — always
  validations.push({
    rule_id: `${metricId}-V01`,
    type: 'NOT_NULL',
    description: 'No null metric values',
    severity: 'ERROR',
  });

  // NON_NEGATIVE — for CURRENCY, COUNT
  if (['CURRENCY', 'COUNT'].includes(unitType)) {
    validations.push({
      rule_id: `${metricId}-V02`,
      type: 'NON_NEGATIVE',
      description: 'Values must be >= 0',
      severity: 'ERROR',
    });
  }

  // THRESHOLD — for PERCENTAGE
  if (unitType === 'PERCENTAGE') {
    validations.push({
      rule_id: `${metricId}-V02`,
      type: 'THRESHOLD',
      description: 'Percentage must be between 0 and 100',
      severity: 'ERROR',
      params: { min_value: 0, max_value: 100 },
    });
  }

  // THRESHOLD — for RATIO
  if (unitType === 'RATIO') {
    validations.push({
      rule_id: `${metricId}-V02`,
      type: 'THRESHOLD',
      description: 'Ratio must be between 0 and 1',
      severity: 'WARNING',
      params: { min_value: 0, max_value: 1 },
    });
  }

  // RECONCILIATION — for direct-sum
  if (rollupStrategy === 'direct-sum') {
    validations.push({
      rule_id: `${metricId}-V03`,
      type: 'RECONCILIATION',
      description: 'Cross-level totals must match',
      severity: 'ERROR',
      params: {
        levels_to_compare: ['facility', 'counterparty'],
        tolerance_pct: 0.01,
      },
    });
  }

  return validations;
}

// ═══════════════════════════════════════════════════════════════
// 6. Auto-Derivation: Abbreviation
// ═══════════════════════════════════════════════════════════════

function generateAbbreviation(name: string): string {
  // Remove common noise words
  const noise = new Set(['of', 'the', 'and', 'in', 'for', 'to', 'a', 'an', 'by', 'at', 'on']);
  return name
    .replace(/[()$%]/g, '')
    .split(/\s+/)
    .filter((w) => !noise.has(w.toLowerCase()))
    .map((w) => w.slice(0, 3).toUpperCase())
    .join('_');
}

// ═══════════════════════════════════════════════════════════════
// 7. Formula Lint Warnings
// ═══════════════════════════════════════════════════════════════

function lintFormula(name: string, label: string, sql: string): string[] {
  const warnings: string[] = [];

  // Check dimension_key + metric_value columns
  if (!/\bAS\s+dimension_key\b/i.test(sql)) {
    warnings.push(`${name}.${label}: SQL should return a column aliased AS dimension_key`);
  }
  if (!/\bAS\s+metric_value\b/i.test(sql)) {
    warnings.push(`${name}.${label}: SQL should return a column aliased AS metric_value`);
  }

  // Division without NULLIF
  const unsafeDivRegex = /\/\s*(?!NULLIF\b)(?:SUM|COUNT|AVG)\s*\(/gi;
  if (unsafeDivRegex.test(sql)) {
    warnings.push(`${name}.${label}: division without NULLIF() — risk of division by zero`);
  }

  // Boolean syntax
  const withoutStrings = sql.replace(/'[^']*'/g, '');
  if (/=\s*(TRUE|FALSE)\b/i.test(withoutStrings)) {
    warnings.push(`${name}.${label}: use = 'Y' for boolean flags, not = TRUE/FALSE`);
  }

  // PostgreSQL-specific casts
  if (/::(?:FLOAT|INT|TEXT|NUMERIC|BIGINT|VARCHAR|INTEGER|REAL|DOUBLE)/i.test(sql)) {
    warnings.push(`${name}.${label}: PostgreSQL-specific cast (::TYPE) — use * 1.0 for float math`);
  }

  // WHERE before last JOIN
  const whereIdx = withoutStrings.search(/\bWHERE\b/i);
  const joinMatches = [...withoutStrings.matchAll(/\b(?:LEFT\s+|INNER\s+)?JOIN\b/gi)];
  const lastJoinIdx = joinMatches.length > 0 ? Math.max(...joinMatches.map((jm) => jm.index ?? -1)) : -1;
  if (whereIdx > -1 && lastJoinIdx > -1 && whereIdx < lastJoinIdx) {
    warnings.push(`${name}.${label}: WHERE clause before last JOIN — SQL syntax error`);
  }

  // SUM of date fields
  if (/\bSUM\s*\(\s*\w+\.\w+_date\b/i.test(sql)) {
    warnings.push(`${name}.${label}: SUM() of a date field — use MIN/MAX for date aggregation`);
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// 8. YAML Generation
// ═══════════════════════════════════════════════════════════════

function buildMetricDefinition(
  parsed: ParsedTemplateMetric,
  metricId: string,
  catalogueItemId: string,
): Record<string, unknown> {
  const { meta, formulas } = parsed;

  const unitType = meta.unit_type;
  const direction = meta.direction || 'NEUTRAL';
  const metricClass = meta.metric_class || 'CALCULATED';
  const displayFormat = meta.display_format || UNIT_DISPLAY_FORMAT[unitType] || '$,.0f';
  const abbreviation = meta.abbreviation || generateAbbreviation(meta.name);
  const rollupStrategy = meta.rollup_strategy;

  // Derive aggregate SQL
  const deskSql = formulas.desk_sql || (formulas.counterparty_sql ? deriveDesk(formulas.counterparty_sql, unitType) : '');
  const portfolioSql = formulas.portfolio_sql || (formulas.counterparty_sql ? derivePortfolio(formulas.counterparty_sql, unitType) : '');
  const segmentSql = formulas.segment_sql || (formulas.counterparty_sql ? deriveBusinessSegment(formulas.counterparty_sql, unitType) : '');

  // Determine aggregation types
  const facilityAgg = 'RAW';
  const aggType = ROLLUP_TO_AGG[rollupStrategy] || 'SUM';

  // Extract source tables
  const sourceTables = extractSourceTables(formulas.facility_sql, formulas.counterparty_sql || '');

  // Derive validations
  const validations = deriveValidations(metricId, unitType, rollupStrategy);

  // Parse regulatory references
  const regRefs = parsePipeList(meta.regulatory_references).map((ref) => ({
    framework: ref,
    description: ref,
  }));

  const tags = parseCommaList(meta.tags);
  const dashboardPages = parseCommaList(meta.dashboard_pages);

  const yaml: Record<string, unknown> = {
    metric_id: metricId,
    name: meta.name,
    version: '1.0.0',
    owner: 'user-upload',
    status: 'DRAFT',
    effective_date: new Date().toISOString().slice(0, 10),
    supersedes: null,

    domain: meta.domain,
    sub_domain: meta.sub_domain,
    metric_class: metricClass,
    direction,
    unit_type: unitType,
    display_format: displayFormat,
    description: meta.definition,

    regulatory_references: regRefs.length > 0 ? regRefs : [],

    source_tables: sourceTables,

    levels: {
      facility: {
        aggregation_type: facilityAgg,
        formula_text: meta.definition,
        formula_sql: formulas.facility_sql,
      },
      counterparty: {
        aggregation_type: aggType,
        formula_text: `${rollupStrategy} per counterparty`,
        formula_sql: formulas.counterparty_sql || formulas.facility_sql,
      },
      desk: {
        aggregation_type: aggType,
        formula_text: `${rollupStrategy} per L3 desk segment`,
        formula_sql: deskSql,
      },
      portfolio: {
        aggregation_type: aggType,
        formula_text: `${rollupStrategy} per L2 portfolio segment`,
        formula_sql: portfolioSql,
      },
      business_segment: {
        aggregation_type: aggType,
        formula_text: `${rollupStrategy} per L1 business segment`,
        formula_sql: segmentSql,
      },
    },

    depends_on: [],
    output: { table: 'metric_result' },
    validations,
    tags,
    dashboard_pages: dashboardPages,
    legacy_metric_ids: [],

    catalogue: {
      item_id: catalogueItemId,
      abbreviation,
      insight: meta.insight || '',
      rollup_strategy: rollupStrategy,
    },
  };

  return yaml;
}

// ═══════════════════════════════════════════════════════════════
// 9. Write YAML files
// ═══════════════════════════════════════════════════════════════

export async function processTemplate(filePath: string): Promise<UploadResult> {
  const { metrics, errors } = await parseTemplate(filePath);
  const result: UploadResult = { created: [], warnings: [...errors], errors: [] };

  if (metrics.length === 0) {
    // Promote warnings to errors when no valid metrics were parsed
    result.errors = result.warnings;
    result.warnings = [];
    return result;
  }

  // Track assigned metric IDs to avoid collision within same batch
  const assignedIds = new Map<string, number>(); // domain → next number

  // Get next catalogue item ID
  let nextCatNum = parseInt(getNextCatalogueItemId().replace('MET-', ''), 10);

  for (const parsed of metrics) {
    // Assign metric_id
    let metricId: string;
    const prefix = DOMAIN_PREFIX[parsed.meta.domain];
    if (!assignedIds.has(parsed.meta.domain)) {
      // Get next available for this domain
      metricId = getNextMetricId(parsed.meta.domain);
      const num = parseInt(metricId.replace(`${prefix}-`, ''), 10);
      assignedIds.set(parsed.meta.domain, num + 1);
    } else {
      const num = assignedIds.get(parsed.meta.domain)!;
      metricId = `${prefix}-${String(num).padStart(3, '0')}`;
      assignedIds.set(parsed.meta.domain, num + 1);
    }

    // Assign catalogue item_id
    const catalogueItemId = `MET-${String(nextCatNum).padStart(3, '0')}`;
    nextCatNum++;

    // Lint formulas
    const fWarnings = lintFormula(parsed.meta.name, 'facility_sql', parsed.formulas.facility_sql);
    const cWarnings = parsed.formulas.counterparty_sql
      ? lintFormula(parsed.meta.name, 'counterparty_sql', parsed.formulas.counterparty_sql)
      : [];
    result.warnings.push(...fWarnings, ...cWarnings);

    // Build YAML
    const yamlObj = buildMetricDefinition(parsed, metricId, catalogueItemId);

    // Write YAML file
    const domainDir = path.join(METRICS_DIR, parsed.meta.domain);
    if (!fs.existsSync(domainDir)) {
      fs.mkdirSync(domainDir, { recursive: true });
    }
    const yamlPath = path.join(domainDir, `${metricId}.yaml`);
    const yamlStr = yamlStringify(yamlObj, { lineWidth: 0 });
    fs.writeFileSync(yamlPath, yamlStr, 'utf-8');

    result.created.push(`${metricId} (${catalogueItemId}): ${parsed.meta.name} → ${yamlPath}`);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// 10. Blank Template Generator
// ═══════════════════════════════════════════════════════════════

/** Build a 3-sheet template workbook (Metrics, Formulas, Reference). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildTemplateWorkbook(): Promise<{ XLSX: any; wb: any }> {
  const XLSX = await getXLSX();
  const wb = XLSX.utils.book_new();

  // Sheet 1: Metrics
  const metricsHeader = [
    'name', 'domain', 'sub_domain', 'unit_type', 'rollup_strategy', 'definition',
    'direction', 'metric_class', 'abbreviation', 'insight',
    'display_format', 'regulatory_references', 'tags', 'dashboard_pages',
  ];
  const metricsExample = [
    'Gross Drawn Exposure', 'exposure', 'drawn', 'CURRENCY', 'direct-sum',
    'Total drawn amount across all facilities, bank-share adjusted',
    'NEUTRAL', 'CALCULATED', 'GDE', 'Tracks deployed credit risk',
    '$,.0f', 'Basel III CRE22 | FR Y-14Q H.1', 'exposure, drawn', 'P1',
  ];
  const metricsWs = XLSX.utils.aoa_to_sheet([metricsHeader, metricsExample]);
  metricsWs['!cols'] = [
    { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 14 }, { wch: 16 }, { wch: 50 },
    { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 40 },
    { wch: 14 }, { wch: 35 }, { wch: 25 }, { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(wb, metricsWs, 'Metrics');

  // Sheet 2: Formulas
  const formulasHeader = [
    'name', 'facility_sql', 'counterparty_sql', 'desk_sql', 'portfolio_sql', 'segment_sql',
  ];
  const formulasExample = [
    'Gross Drawn Exposure',
    `SELECT\n  fes.facility_id AS dimension_key,\n  SUM(fes.drawn_amount) AS metric_value\nFROM l2.facility_exposure_snapshot fes\nWHERE fes.as_of_date = :as_of_date\nGROUP BY fes.facility_id`,
    `SELECT\n  fm.counterparty_id AS dimension_key,\n  SUM(fes.drawn_amount) AS metric_value\nFROM l2.facility_exposure_snapshot fes\nINNER JOIN l2.facility_master fm\n  ON fm.facility_id = fes.facility_id\nWHERE fes.as_of_date = :as_of_date\nGROUP BY fm.counterparty_id`,
    '', '', '',
  ];
  const formulasWs = XLSX.utils.aoa_to_sheet([formulasHeader, formulasExample]);
  formulasWs['!cols'] = [
    { wch: 30 }, { wch: 80 }, { wch: 80 }, { wch: 80 }, { wch: 80 }, { wch: 80 },
  ];
  XLSX.utils.book_append_sheet(wb, formulasWs, 'Formulas');

  // Sheet 3: Reference
  const refData = [
    ['Field', 'Valid Values'],
    ['domain', VALID_DOMAINS.join(', ')],
    ['unit_type', VALID_UNIT_TYPES.join(', ')],
    ['rollup_strategy', VALID_ROLLUP_STRATEGIES.join(', ')],
    ['direction', VALID_DIRECTIONS.join(', ')],
    ['metric_class', VALID_METRIC_CLASSES.join(', ')],
    ['', ''],
    ['SQL Rules', ''],
    ['1', 'Every formula must return exactly (dimension_key, metric_value)'],
    ['2', 'Use NULLIF(x, 0) before division to prevent division-by-zero'],
    ['3', 'Use COALESCE() for nullable fields'],
    ['4', 'Use = \'Y\' for boolean flag comparisons (not = TRUE)'],
    ['5', 'No PostgreSQL-specific casts (::FLOAT) — use * 1.0 instead'],
    ['6', 'All JOINs must come BEFORE the WHERE clause'],
    ['7', 'Only SELECT statements allowed (no INSERT/UPDATE/DELETE)'],
    ['', ''],
    ['Columns (Required)', 'name, domain, sub_domain, unit_type, rollup_strategy, definition'],
    ['Columns (Required SQL)', 'name, facility_sql, counterparty_sql'],
    ['Columns (Optional)', 'direction, metric_class, abbreviation, insight, display_format, regulatory_references, tags, dashboard_pages'],
    ['Columns (Auto-derived)', 'desk_sql, portfolio_sql, segment_sql (from counterparty_sql + EBT hierarchy)'],
  ];
  const refWs = XLSX.utils.aoa_to_sheet(refData);
  refWs['!cols'] = [{ wch: 25 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, refWs, 'Reference');

  return { XLSX, wb };
}

export async function generateBlankTemplate(outputPath: string): Promise<void> {
  const { XLSX, wb } = await buildTemplateWorkbook();
  XLSX.writeFile(wb, outputPath);
  console.log(`Template generated: ${outputPath}`);
}

/**
 * Generate a blank upload template and return it as a Buffer.
 * Works in serverless / Next.js API routes where disk writes may fail.
 */
export async function generateBlankTemplateBuffer(): Promise<Buffer> {
  const { XLSX, wb } = await buildTemplateWorkbook();
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// ═══════════════════════════════════════════════════════════════
// CLI Entry Point
// ═══════════════════════════════════════════════════════════════

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);

    if (args.includes('--generate-template')) {
      const outputPath = args[args.indexOf('--generate-template') + 1] || 'metrics-upload-template.xlsx';
      await generateBlankTemplate(outputPath);
      process.exit(0);
    }

    if (args.length === 0) {
      console.error('Usage:');
      console.error('  npx tsx scripts/calc_engine/template-upload.ts <path-to-excel>');
      console.error('  npx tsx scripts/calc_engine/template-upload.ts --generate-template [output-path]');
      process.exit(1);
    }

    const filePath = args[0];
    console.log(`Processing template: ${filePath}\n`);

    const result = await processTemplate(filePath);

    if (result.errors.length > 0) {
      console.error(`\n✗ ${result.errors.length} error(s):`);
      result.errors.forEach((e) => console.error(`  ${e}`));
    }

    if (result.warnings.length > 0) {
      console.warn(`\n⚠ ${result.warnings.length} warning(s):`);
      result.warnings.forEach((w) => console.warn(`  ${w}`));
    }

    if (result.created.length > 0) {
      console.log(`\n✓ ${result.created.length} metric(s) created:`);
      result.created.forEach((c) => console.log(`  ${c}`));
      console.log('\nNext steps:');
      console.log('  1. npm run calc:sync        # Sync YAML → catalogue.json');
      console.log('  2. npm run calc:demo -- --metric MET-XXX --persist --force   # Generate demo data');
      console.log('  3. npm run test:calc-engine  # Validate');
    } else if (result.errors.length === 0) {
      console.log('No metrics to create.');
    }

    process.exit(result.errors.length > 0 ? 1 : 0);
  })();
}
