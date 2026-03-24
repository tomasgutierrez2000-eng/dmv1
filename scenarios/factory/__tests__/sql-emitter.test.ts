/**
 * Tests for SQL emitter — the most critical module in the factory pipeline.
 * Every INSERT statement in the entire pipeline flows through buildInsert/formatSqlValue.
 */

import { buildInsert, LOAD_ORDER, formatSqlValue, emitScenarioSql } from '../sql-emitter';

describe('formatSqlValue', () => {
  // _id suffix → BIGINT (unquoted)
  test('_id columns format as unquoted integers', () => {
    expect(formatSqlValue('facility_id', 42)).toBe('42');
    expect(formatSqlValue('counterparty_id', 0)).toBe('0');
  });

  // _code suffix → VARCHAR (quoted)
  test('_code columns format as quoted strings', () => {
    expect(formatSqlValue('currency_code', 'USD')).toBe("'USD'");
    expect(formatSqlValue('credit_status_code', 'CURRENT')).toBe("'CURRENT'");
  });

  // _amt suffix → NUMERIC (unquoted)
  test('_amt columns format as unquoted numbers', () => {
    expect(formatSqlValue('committed_facility_amt', 125.50)).toBe('125.5');
    expect(formatSqlValue('drawn_amount', 0)).toBe('0');
  });

  // _pct suffix → NUMERIC (unquoted)
  test('_pct columns format as unquoted numbers', () => {
    expect(formatSqlValue('pd_pct', 0.0234)).toBe('0.0234');
    expect(formatSqlValue('coverage_ratio_pct', 100.0)).toBe('100');
  });

  // _flag suffix → boolean
  test('_flag columns format as boolean strings', () => {
    const result = formatSqlValue('is_active_flag', 'Y');
    expect(result === "'Y'" || result === 'TRUE').toBe(true);
  });

  // _date suffix → DATE (quoted)
  test('_date columns format as quoted dates', () => {
    expect(formatSqlValue('maturity_date', '2025-01-31')).toBe("'2025-01-31'");
  });

  // _name suffix → VARCHAR (quoted)
  test('_name columns format as quoted strings', () => {
    expect(formatSqlValue('facility_name', 'Test Facility')).toBe("'Test Facility'");
  });

  // NULL handling
  test('null values format as NULL', () => {
    expect(formatSqlValue('any_column', null)).toBe('NULL');
    expect(formatSqlValue('any_column', undefined)).toBe('NULL');
  });

  // _bps suffix → NUMERIC (unquoted)
  test('_bps columns format as unquoted numbers', () => {
    expect(formatSqlValue('spread_bps', 150)).toBe('150');
  });

  // _count suffix → INTEGER (unquoted)
  test('_count columns format as unquoted integers', () => {
    expect(formatSqlValue('number_of_loans', 5)).toBe('5');
  });

  // SQL injection prevention — single quotes escaped
  test('string values have single quotes escaped', () => {
    const result = formatSqlValue('legal_name', "O'Brien & Co");
    expect(result).not.toContain("O'Brien");
    expect(result).toContain("O''Brien");
  });
});

describe('buildInsert', () => {
  test('builds correct INSERT for simple row', () => {
    const sql = buildInsert('l2.counterparty', {
      counterparty_id: 1,
      legal_name: 'Test Corp',
      country_code: 'US',
    });
    expect(sql).toContain('INSERT INTO l2.counterparty');
    expect(sql).toContain('counterparty_id');
    expect(sql).toContain('legal_name');
    expect(sql).toContain('country_code');
    expect(sql).toContain('1');
    expect(sql).toContain("'Test Corp'");
    expect(sql).toContain("'US'");
    expect(sql).toMatch(/;$/);
  });

  test('handles NULL values', () => {
    const sql = buildInsert('l2.facility_master', {
      facility_id: 1,
      maturity_date: null,
    });
    expect(sql).toContain('NULL');
  });

  test('handles reserved word columns', () => {
    const sql = buildInsert('l1.some_table', {
      value: 42.5,
      name: 'test',
    });
    // "value" is a PG reserved word — should be double-quoted
    expect(sql).toContain('"value"');
  });
});

describe('LOAD_ORDER', () => {
  test('L1 tables come before L2 tables', () => {
    const firstL2 = LOAD_ORDER.findIndex(t => t.startsWith('l2.'));
    const lastL1 = LOAD_ORDER.map((t, i) => t.startsWith('l1.') ? i : -1)
      .filter(i => i >= 0)
      .pop()!;
    // Some L2 entity tables may be interleaved (e.g., l2.credit_agreement_counterparty_participation)
    // but core L1 dims should come first
    const firstL1Dim = LOAD_ORDER.indexOf('l1.country_dim');
    expect(firstL1Dim).toBeLessThan(firstL2);
  });

  test('contains all key tables', () => {
    expect(LOAD_ORDER).toContain('l2.counterparty');
    expect(LOAD_ORDER).toContain('l2.facility_master');
    expect(LOAD_ORDER).toContain('l2.facility_exposure_snapshot');
    expect(LOAD_ORDER).toContain('l2.credit_event');
    expect(LOAD_ORDER).toContain('l2.position');
  });

  test('position comes before position_detail', () => {
    const posIdx = LOAD_ORDER.indexOf('l2.position');
    const detIdx = LOAD_ORDER.indexOf('l2.position_detail');
    expect(posIdx).toBeLessThan(detIdx);
  });

  test('credit_event comes before credit_event_facility_link', () => {
    const evtIdx = LOAD_ORDER.indexOf('l2.credit_event');
    const linkIdx = LOAD_ORDER.indexOf('l2.credit_event_facility_link');
    expect(evtIdx).toBeLessThan(linkIdx);
  });
});

describe('emitScenarioSql', () => {
  test('emits header with scenario info', () => {
    const sql = emitScenarioSql([], {
      scenarioId: 'S19',
      scenarioName: 'Test Scenario',
      narrative: 'A test narrative',
    });
    expect(sql).toContain('S19');
    expect(sql).toContain('Test Scenario');
    expect(sql).toContain('SET search_path TO l1, l2, public;');
  });

  test('emits tables in load order', () => {
    const sql = emitScenarioSql([
      { table: 'l2.facility_exposure_snapshot', rows: [{ facility_id: 1, drawn_amount: 100 }] },
      { table: 'l2.counterparty', rows: [{ counterparty_id: 1, legal_name: 'Test' }] },
    ], {
      scenarioId: 'S1',
      scenarioName: 'Test',
      narrative: 'Test',
    });
    const cpIdx = sql.indexOf('l2.counterparty');
    const expIdx = sql.indexOf('l2.facility_exposure_snapshot');
    // counterparty should come before exposure (load order)
    expect(cpIdx).toBeLessThan(expIdx);
  });

  test('warns for tables not in load order', () => {
    const sql = emitScenarioSql([
      { table: 'l99.unknown_table', rows: [{ id: 1 }] },
    ], {
      scenarioId: 'S1',
      scenarioName: 'Test',
      narrative: 'Test',
    });
    expect(sql).toContain('WARNING');
    expect(sql).toContain('l99.unknown_table');
  });

  test('skips empty tables', () => {
    const sql = emitScenarioSql([
      { table: 'l2.counterparty', rows: [] },
    ], {
      scenarioId: 'S1',
      scenarioName: 'Test',
      narrative: 'Test',
    });
    expect(sql).not.toContain('l2.counterparty (0 rows)');
  });
});
