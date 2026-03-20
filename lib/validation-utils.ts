/**
 * SQL formula validation utilities for GSIB metric definitions.
 *
 * Extracted from scripts/calc_engine/loader/yaml-loader.ts for reuse
 * across the calc engine, API routes, and metric library tooling.
 *
 * Two layers:
 *  1. Safety validation — blocks write operations, multi-statement injection
 *  2. Logic linting — catches common GSIB formula bugs (14 rules)
 */

/** Forbidden SQL keywords in formula_sql (write operations) */
export const FORBIDDEN_SQL_PATTERNS = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b/i;

/** Input for SQL validation — a level key + its formula_sql */
export interface FormulaEntry {
  level: string;
  formulaSql: string;
}

/** Metric-level context for validation messages */
export interface ValidationContext {
  metricId: string;
  status?: string;
}

// ─── Safety Validation ──────────────────────────────────────────────────

/** Validate that formula_sql is read-only (SELECT only, single statement) */
export function validateSqlSafety(ctx: ValidationContext, formulas: FormulaEntry[]): string[] {
  const errors: string[] = [];
  for (const { level, formulaSql } of formulas) {
    const sql = formulaSql.trim();
    if (!sql.toUpperCase().startsWith('SELECT')) {
      errors.push(`${ctx.metricId}.levels.${level}.formula_sql must start with SELECT`);
    }
    if (FORBIDDEN_SQL_PATTERNS.test(sql)) {
      errors.push(`${ctx.metricId}.levels.${level}.formula_sql contains forbidden write operation`);
    }
    // Check for multi-statement injection via semicolons (ignore semicolons inside string literals)
    const withoutStrings = sql.replace(/'[^']*'/g, '');
    if (withoutStrings.includes(';')) {
      errors.push(`${ctx.metricId}.levels.${level}.formula_sql contains semicolons (multi-statement not allowed)`);
    }
  }
  return errors;
}

// ─── Formula Logic Linting ──────────────────────────────────────────────

/**
 * Formula logic linter — catches common GSIB formula bugs.
 * Returns warnings (non-blocking by default) to shift-left bug detection.
 *
 * 14 rules covering: EBT join completeness, division safety, boolean syntax,
 * PostgreSQL-only casts, WHERE/JOIN ordering, FX rate COALESCE, date/string/ID
 * SUM, aggregate AVG of ratios, CTE usage, EBT join keys, weight COALESCE,
 * and duplicate aliases.
 */
export function validateFormulaLogic(ctx: ValidationContext, formulas: FormulaEntry[]): string[] {
  const warnings: string[] = [];

  for (const { level, formulaSql: sql } of formulas) {
    // Rule 1: EBT join completeness — every LEFT JOIN l1.enterprise_business_taxonomy
    // must include AND <alias>.is_current_flag = 'Y'
    const ebtJoinRegex = /LEFT\s+JOIN\s+l1\.enterprise_business_taxonomy\s+(\w+)\s*\n?\s*ON\s+/gi;
    let m;
    while ((m = ebtJoinRegex.exec(sql)) !== null) {
      const alias = m[1];
      const searchWindow = sql.substring(m.index, Math.min(m.index + 300, sql.length));
      if (!searchWindow.includes(`${alias}.is_current_flag`)) {
        warnings.push(
          `${ctx.metricId}.${level}: EBT alias "${alias}" missing AND ${alias}.is_current_flag = 'Y'`
        );
      }
    }

    // Rule 2: Division without NULLIF — catches SUM(x)/SUM(y) without safe wrapper
    const unsafeDivRegex = /\/\s*(?!NULLIF\b)(?:SUM|COUNT|AVG)\s*\(/gi;
    if (unsafeDivRegex.test(sql)) {
      warnings.push(
        `${ctx.metricId}.${level}: division without NULLIF() — risk of division by zero`
      );
    }

    // Rule 3: Boolean syntax — must use = 'Y' not = TRUE/true
    if (/=\s*(TRUE|FALSE)\b/i.test(sql) && !/=\s*'[YN]'/.test(sql.substring(0, sql.search(/=\s*(TRUE|FALSE)\b/i) + 20))) {
      const withoutStrings = sql.replace(/'[^']*'/g, '');
      if (/=\s*(TRUE|FALSE)\b/i.test(withoutStrings)) {
        warnings.push(
          `${ctx.metricId}.${level}: use = 'Y' for boolean flags, not = TRUE/FALSE`
        );
      }
    }

    // Rule 4: PostgreSQL-only casts
    if (/::(?:FLOAT|INT|TEXT|NUMERIC|BIGINT|VARCHAR|INTEGER|REAL|DOUBLE)/i.test(sql)) {
      warnings.push(
        `${ctx.metricId}.${level}: PostgreSQL-specific cast (::TYPE) — use * 1.0 for float math`
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
        if (firstWhereAtDepth0 === -1) {
          const slice = clean.slice(ci, ci + 6);
          if (/^\bWHERE\b/i.test(slice)) {
            firstWhereAtDepth0 = ci;
          }
        }
        const joinSlice = clean.slice(ci, ci + 15);
        if (/^(?:LEFT\s+|INNER\s+|CROSS\s+)?JOIN\b/i.test(joinSlice)) {
          lastJoinAtDepth0 = ci;
        }
      }
      if (firstWhereAtDepth0 > -1 && lastJoinAtDepth0 > -1 && firstWhereAtDepth0 < lastJoinAtDepth0) {
        warnings.push(
          `${ctx.metricId}.${level}: WHERE clause before last JOIN — SQL syntax error`
        );
      }
    }

    // Rule 6: FX rate without COALESCE
    if (/\bfx\.rate\b/.test(sql) && !/COALESCE\s*\([^)]*fx\.rate/i.test(sql)) {
      warnings.push(
        `${ctx.metricId}.${level}: fx.rate used without COALESCE() — NULL rates will propagate`
      );
    }

    // Rule 7: SUM of date fields
    if (/\bSUM\s*\(\s*\w+\.\w+_date\b/i.test(sql)) {
      warnings.push(
        `${ctx.metricId}.${level}: SUM() of a date field — use MIN/MAX for date aggregation`
      );
    }

    // Rule 8: AVG of ratios/percentages at aggregate levels (not facility)
    if (level !== 'facility' && /\bAVG\s*\(\s*\w+\.\w+_(?:pct|ratio)\b/i.test(sql)) {
      warnings.push(
        `${ctx.metricId}.${level}: AVG() of ratio/pct at aggregate level — use sum-ratio to avoid Simpson's paradox`
      );
    }

    // Rule 9: SUM of string/text fields (meaningless aggregation)
    if (/\bSUM\s*\(\s*\w+\.\w+_(name|desc|text|code)\b/i.test(sql)) {
      warnings.push(
        `${ctx.metricId}.${level}: SUM() of text/name/code field — use COUNT(DISTINCT) or MIN() for strings`
      );
    }

    // Rule 10: SUM of ID fields (meaningless aggregation — but allow inside CASE WHEN)
    const sumIdMatch = sql.match(/\bSUM\s*\(\s*(\w+\.\w+_id)\b/i);
    if (sumIdMatch) {
      const contextBefore = sql.substring(Math.max(0, sql.indexOf(sumIdMatch[0]) - 30), sql.indexOf(sumIdMatch[0]));
      if (!/CASE\s+WHEN/i.test(contextBefore)) {
        warnings.push(
          `${ctx.metricId}.${level}: SUM() of ID field "${sumIdMatch[1]}" — use COUNT(DISTINCT) instead`
        );
      }
    }

    // Rule 11: CTE usage (formula_sql must start with SELECT, not WITH...AS)
    if (/^\s*WITH\b/i.test(sql)) {
      warnings.push(
        `${ctx.metricId}.${level}: formula_sql must start with SELECT — convert CTEs to inline subqueries`
      );
    }

    // Rule 12: Wrong EBT join key (facility_id/counterparty_id don't exist on EBT)
    if (/ebt\w*\.(facility_id|counterparty_id|agreement_id)/i.test(sql)) {
      warnings.push(
        `${ctx.metricId}.${level}: EBT join on non-existent field — use ebt.managed_segment_id = fm.lob_segment_id`
      );
    }

    // Rule 13: Missing COALESCE on nullable weight fields in weighted-avg patterns
    const weightedProductRegex = /\bSUM\s*\(\s*\w+\.\w+\s*\*\s*(?!COALESCE)(\w+\.(?:outstanding_balance_amt|gross_exposure_usd|committed_facility_amt))/gi;
    let wm;
    while ((wm = weightedProductRegex.exec(sql)) !== null) {
      warnings.push(
        `${ctx.metricId}.${level}: "${wm[1]}" used as weight without COALESCE — NULL values will nullify entire term`
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
            `${ctx.metricId}.${level}: duplicate alias "${am[1]}" used for both "${aliasToTable.get(alias)}" and "${table}"`
          );
        }
        aliasToTable.set(alias, table);
      }
    }
  }

  return warnings;
}

/** Rule fragments that block ACTIVE metrics from loading */
export const BLOCKING_RULE_FRAGMENTS = [
  'WHERE clause before last JOIN',   // SQL syntax error
  'PostgreSQL-specific cast',        // Breaks sql.js
  "use = 'Y' for boolean flags",     // Breaks sql.js
  'must start with SELECT',          // CTE breaks sync validator
  'non-existent field',              // EBT join on wrong field
];

/** Check if a warning is a blocking error for ACTIVE metrics */
export function isBlockingWarning(warning: string): boolean {
  return BLOCKING_RULE_FRAGMENTS.some((frag) => warning.includes(frag));
}
