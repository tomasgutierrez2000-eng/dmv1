import { describe, it, expect } from 'vitest';
import { parseDDL, parseFkReference } from '../ddl-parser';

// ─── parseDDL ─────────────────────────────────────────────────────────

describe('parseDDL', () => {
  it('parses a simple L2 table with inline PK', () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS l2.counterparty (
        counterparty_id BIGINT NOT NULL PRIMARY KEY,
        legal_name VARCHAR(500),
        country_code VARCHAR(30)
      );
    `;
    const tables = parseDDL(sql, 'l2');
    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('counterparty');
    expect(tables[0].schema).toBe('l2');
    expect(tables[0].pkColumns).toEqual(['counterparty_id']);
    expect(tables[0].columns).toHaveLength(3);
    expect(tables[0].columns[0].pk).toBe(true);
    expect(tables[0].columns[0].nullable).toBe(false);
    expect(tables[0].columns[1].nullable).toBe(true);
  });

  it('parses quoted table names', () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS "l2"."counterparty" (
        counterparty_id BIGINT NOT NULL PRIMARY KEY
      );
    `;
    const tables = parseDDL(sql, 'l2');
    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('counterparty');
  });

  it('parses composite PRIMARY KEY clause', () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS l2.facility_exposure_snapshot (
        facility_id BIGINT NOT NULL,
        as_of_date DATE NOT NULL,
        drawn_amount NUMERIC(20,4),
        PRIMARY KEY (facility_id, as_of_date)
      );
    `;
    const tables = parseDDL(sql, 'l2');
    expect(tables[0].pkColumns).toEqual(['facility_id', 'as_of_date']);
    expect(tables[0].columns.find(c => c.name === 'facility_id')?.pk).toBe(true);
    expect(tables[0].columns.find(c => c.name === 'as_of_date')?.pk).toBe(true);
  });

  it('parses CONSTRAINT FOREIGN KEY clauses', () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS l2.facility_master (
        facility_id BIGINT NOT NULL PRIMARY KEY,
        counterparty_id BIGINT,
        CONSTRAINT fk_fm_cp FOREIGN KEY (counterparty_id) REFERENCES l2.counterparty(counterparty_id)
      );
    `;
    const tables = parseDDL(sql, 'l2');
    const cpCol = tables[0].columns.find(c => c.name === 'counterparty_id');
    expect(cpCol?.fk).toBe('l2.counterparty(counterparty_id)');
  });

  it('parses DEFAULT values', () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS l1.dim_table (
        id BIGINT NOT NULL PRIMARY KEY,
        is_active BOOLEAN DEFAULT TRUE,
        status VARCHAR(20) DEFAULT 'ACTIVE'
      );
    `;
    const tables = parseDDL(sql, 'l1');
    const activeCol = tables[0].columns.find(c => c.name === 'is_active');
    expect(activeCol?.defaultVal).toBe('TRUE');
  });

  it('parses multiple tables in one file', () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS l1.table_a (
        id BIGINT NOT NULL PRIMARY KEY
      );
      CREATE TABLE IF NOT EXISTS l1.table_b (
        id BIGINT NOT NULL PRIMARY KEY
      );
    `;
    const tables = parseDDL(sql, 'l1');
    expect(tables).toHaveLength(2);
    expect(tables[0].name).toBe('table_a');
    expect(tables[1].name).toBe('table_b');
  });

  it('skips comment lines inside table body', () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS l1.test_table (
        -- This is a comment
        id BIGINT NOT NULL PRIMARY KEY,
        name VARCHAR(100)
      );
    `;
    const tables = parseDDL(sql, 'l1');
    expect(tables[0].columns).toHaveLength(2);
  });

  it('returns empty array for no matching tables', () => {
    const sql = `CREATE TABLE IF NOT EXISTS l2.other_table (id BIGINT);`;
    const tables = parseDDL(sql, 'l1');
    expect(tables).toHaveLength(0);
  });
});

// ─── parseFkReference ─────────────────────────────────────────────────

describe('parseFkReference', () => {
  it('parses l1/l2 format: l2.table(field)', () => {
    const result = parseFkReference('l2.counterparty(counterparty_id)');
    expect(result).toEqual({ layer: 'L2', table: 'counterparty', field: 'counterparty_id' });
  });

  it('parses l2 format', () => {
    const result = parseFkReference('l2.facility_master(facility_id)');
    expect(result).toEqual({ layer: 'L2', table: 'facility_master', field: 'facility_id' });
  });

  it('parses L3 format: L2.table.field', () => {
    const result = parseFkReference('L2.counterparty.counterparty_id');
    expect(result).toEqual({ layer: 'L2', table: 'counterparty', field: 'counterparty_id' });
  });

  it('returns null for invalid format', () => {
    expect(parseFkReference('invalid')).toBeNull();
    expect(parseFkReference('')).toBeNull();
  });
});
