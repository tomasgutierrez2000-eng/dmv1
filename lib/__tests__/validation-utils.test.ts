import { describe, it, expect } from 'vitest';
import {
  validateSqlSafety,
  validateFormulaLogic,
  isBlockingWarning,
  FORBIDDEN_SQL_PATTERNS,
  BLOCKING_RULE_FRAGMENTS,
  type FormulaEntry,
  type ValidationContext,
} from '../validation-utils';

const ctx: ValidationContext = { metricId: 'TEST-001', status: 'ACTIVE' };

function entries(sql: string, level = 'facility'): FormulaEntry[] {
  return [{ level, formulaSql: sql }];
}

// ─── Safety Validation ───────────────────────────────────────────────────

describe('validateSqlSafety', () => {
  it('accepts a valid SELECT statement', () => {
    const errs = validateSqlSafety(ctx, entries("SELECT SUM(amt) FROM l2.fes"));
    expect(errs).toHaveLength(0);
  });

  it('rejects SQL that does not start with SELECT', () => {
    const errs = validateSqlSafety(ctx, entries("WITH cte AS (SELECT 1) SELECT * FROM cte"));
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain('must start with SELECT');
  });

  it.each([
    'INSERT INTO t VALUES (1)',
    'UPDATE t SET x = 1',
    'DELETE FROM t',
    'DROP TABLE t',
    'TRUNCATE t',
    'ALTER TABLE t ADD col INT',
    'CREATE TABLE t (id INT)',
    'GRANT ALL ON t TO user',
    'REVOKE ALL ON t FROM user',
  ])('rejects forbidden keyword: %s', (sql) => {
    expect(FORBIDDEN_SQL_PATTERNS.test(sql)).toBe(true);
    const errs = validateSqlSafety(ctx, entries(`SELECT 1; ${sql}`));
    expect(errs.length).toBeGreaterThan(0);
  });

  it('rejects multi-statement SQL (semicolons)', () => {
    const errs = validateSqlSafety(ctx, entries("SELECT 1; SELECT 2"));
    expect(errs.some(e => e.includes('semicolons'))).toBe(true);
  });

  it('allows semicolons inside string literals', () => {
    const errs = validateSqlSafety(ctx, entries("SELECT * FROM t WHERE code = 'a;b'"));
    expect(errs.filter(e => e.includes('semicolons'))).toHaveLength(0);
  });

  it('validates multiple levels independently', () => {
    const formulas: FormulaEntry[] = [
      { level: 'facility', formulaSql: 'SELECT 1' },
      { level: 'counterparty', formulaSql: 'WITH cte AS (SELECT 1) SELECT 1' },
    ];
    const errs = validateSqlSafety(ctx, formulas);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain('counterparty');
  });
});

// ─── Formula Logic Linting (14 Rules) ─────────────────────────────────

describe('validateFormulaLogic', () => {
  // Rule 1: EBT join completeness
  it('Rule 1: warns when EBT join missing is_current_flag', () => {
    const sql = `SELECT * FROM l2.fes
      LEFT JOIN l1.enterprise_business_taxonomy ebt
      ON ebt.managed_segment_id = fm.lob_segment_id`;
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes('is_current_flag'))).toBe(true);
  });

  it('Rule 1: no warning when is_current_flag is present', () => {
    const sql = `SELECT * FROM l2.fes
      LEFT JOIN l1.enterprise_business_taxonomy ebt
      ON ebt.managed_segment_id = fm.lob_segment_id
      AND ebt.is_current_flag = 'Y'`;
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.filter(w => w.includes('is_current_flag'))).toHaveLength(0);
  });

  // Rule 2: Division without NULLIF
  it('Rule 2: warns on division without NULLIF', () => {
    const sql = "SELECT SUM(a) / SUM(b) FROM t";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes('NULLIF'))).toBe(true);
  });

  it('Rule 2: no warning when NULLIF is used', () => {
    const sql = "SELECT SUM(a) / NULLIF(SUM(b), 0) FROM t";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.filter(w => w.includes('NULLIF'))).toHaveLength(0);
  });

  // Rule 3: Boolean syntax
  it('Rule 3: warns on = TRUE instead of = \'Y\'', () => {
    const sql = "SELECT * FROM t WHERE flag = TRUE";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes("= 'Y'"))).toBe(true);
  });

  // Rule 4: PostgreSQL-only casts
  it('Rule 4: warns on ::FLOAT cast', () => {
    const sql = "SELECT value::FLOAT FROM t";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes('PostgreSQL-specific cast'))).toBe(true);
  });

  it('Rule 4: warns on ::NUMERIC cast', () => {
    const sql = "SELECT value::NUMERIC FROM t";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes('PostgreSQL-specific cast'))).toBe(true);
  });

  // Rule 5: WHERE before last JOIN
  it('Rule 5: warns when WHERE appears before last JOIN', () => {
    const sql = "SELECT * FROM t1 WHERE t1.x = 1 LEFT JOIN t2 ON t2.id = t1.id";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes('WHERE clause before last JOIN'))).toBe(true);
  });

  it('Rule 5: no warning when WHERE is after all JOINs', () => {
    const sql = "SELECT * FROM t1 LEFT JOIN t2 ON t2.id = t1.id WHERE t1.x = 1";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.filter(w => w.includes('WHERE clause before last JOIN'))).toHaveLength(0);
  });

  // Rule 6: FX rate without COALESCE
  it('Rule 6: warns when fx.rate used without COALESCE', () => {
    const sql = "SELECT SUM(amt * fx.rate) FROM t";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes('fx.rate'))).toBe(true);
  });

  it('Rule 6: no warning with COALESCE(fx.rate, 1)', () => {
    const sql = "SELECT SUM(amt * COALESCE(fx.rate, 1)) FROM t";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.filter(w => w.includes('fx.rate') && w.includes('COALESCE'))).toHaveLength(0);
  });

  // Rule 7: SUM of date fields
  it('Rule 7: warns on SUM of date field', () => {
    const sql = "SELECT SUM(t.maturity_date) FROM t";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes('SUM() of a date field'))).toBe(true);
  });

  // Rule 8: AVG of ratios at aggregate levels
  it('Rule 8: warns on AVG of ratio at aggregate level', () => {
    const sql = "SELECT AVG(t.coverage_ratio_pct) FROM t";
    const w = validateFormulaLogic(ctx, entries(sql, 'counterparty'));
    expect(w.some(w => w.includes("Simpson's paradox"))).toBe(true);
  });

  it('Rule 8: no warning at facility level', () => {
    const sql = "SELECT AVG(t.coverage_ratio_pct) FROM t";
    const w = validateFormulaLogic(ctx, entries(sql, 'facility'));
    expect(w.filter(w => w.includes("Simpson's paradox"))).toHaveLength(0);
  });

  // Rule 9: SUM of string fields
  it('Rule 9: warns on SUM of text field', () => {
    const sql = "SELECT SUM(t.legal_name) FROM t";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes('SUM() of text/name/code field'))).toBe(true);
  });

  // Rule 10: SUM of ID fields
  it('Rule 10: warns on SUM of ID field', () => {
    const sql = "SELECT SUM(t.counterparty_id) FROM t";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes('SUM() of ID field'))).toBe(true);
  });

  it('Rule 10: allows SUM of ID inside CASE WHEN', () => {
    const sql = "SELECT SUM(CASE WHEN flag = 'Y' THEN t.counterparty_id ELSE 0 END) FROM t";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.filter(w => w.includes('SUM() of ID field'))).toHaveLength(0);
  });

  // Rule 11: CTE usage
  it('Rule 11: warns when formula starts with WITH', () => {
    const sql = "WITH cte AS (SELECT 1) SELECT * FROM cte";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes('must start with SELECT'))).toBe(true);
  });

  // Rule 12: Wrong EBT join key
  it('Rule 12: warns on EBT join using facility_id', () => {
    const sql = "SELECT * FROM t JOIN l1.enterprise_business_taxonomy ebt ON ebt.facility_id = t.id";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes('non-existent field'))).toBe(true);
  });

  // Rule 13: Missing COALESCE on nullable weight
  it('Rule 13: warns when weight field used without COALESCE', () => {
    const sql = "SELECT SUM(t.lgd_pct * t.outstanding_balance_amt) FROM t";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes('without COALESCE'))).toBe(true);
  });

  // Rule 14: Duplicate aliases
  it('Rule 14: warns on duplicate alias for different tables', () => {
    const sql = "SELECT * FROM l1.table_a t JOIN l2.table_b t ON t.id = t.id";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.some(w => w.includes('duplicate alias'))).toBe(true);
  });

  it('Rule 14: no warning when same table uses same alias', () => {
    const sql = "SELECT * FROM l1.table_a t WHERE t.id = 1";
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w.filter(w => w.includes('duplicate alias'))).toHaveLength(0);
  });

  // Clean SQL should produce no warnings
  it('clean SQL produces zero warnings', () => {
    const sql = `SELECT fm.facility_id AS dimension_key,
      SUM(fes.drawn_amount) / NULLIF(SUM(fes.committed_amount), 0) AS metric_value
      FROM l2.facility_exposure_snapshot fes
      LEFT JOIN l2.facility_master fm ON fm.facility_id = fes.facility_id
      WHERE fes.as_of_date = '2025-01-31'
      GROUP BY fm.facility_id`;
    const w = validateFormulaLogic(ctx, entries(sql));
    expect(w).toHaveLength(0);
  });
});

// ─── isBlockingWarning ───────────────────────────────────────────────────

describe('isBlockingWarning', () => {
  it('identifies blocking warnings', () => {
    expect(isBlockingWarning('TEST-001.facility: WHERE clause before last JOIN — SQL syntax error')).toBe(true);
    expect(isBlockingWarning('TEST-001.facility: PostgreSQL-specific cast (::TYPE)')).toBe(true);
    expect(isBlockingWarning("TEST-001.facility: use = 'Y' for boolean flags")).toBe(true);
    expect(isBlockingWarning('TEST-001.facility: formula_sql must start with SELECT')).toBe(true);
    expect(isBlockingWarning('TEST-001.facility: EBT join on non-existent field')).toBe(true);
  });

  it('does not flag non-blocking warnings', () => {
    expect(isBlockingWarning('TEST-001.facility: division without NULLIF()')).toBe(false);
    expect(isBlockingWarning('TEST-001.facility: fx.rate used without COALESCE()')).toBe(false);
  });
});

// ─── BLOCKING_RULE_FRAGMENTS ─────────────────────────────────────────────

describe('BLOCKING_RULE_FRAGMENTS', () => {
  it('contains 5 blocking fragments', () => {
    expect(BLOCKING_RULE_FRAGMENTS).toHaveLength(5);
  });
});
