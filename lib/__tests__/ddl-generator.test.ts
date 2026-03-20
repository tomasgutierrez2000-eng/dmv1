import { describe, it, expect } from 'vitest';
import {
  sqlTypeForField,
  buildCreateTable,
  buildDropTable,
  buildAddColumn,
  buildDropColumn,
  buildRenameColumn,
  buildAlterColumnType,
  buildForeignKey,
} from '../ddl-generator';
import type { DataDictionaryField, DataDictionaryTable } from '../data-dictionary';

function field(name: string, overrides: Partial<DataDictionaryField> = {}): DataDictionaryField {
  return { name, description: '', ...overrides } as DataDictionaryField;
}

function pkField(name: string, overrides: Partial<DataDictionaryField> = {}): DataDictionaryField {
  return { name, description: '', pk_fk: { is_pk: true }, ...overrides } as DataDictionaryField;
}

// ─── sqlTypeForField ──────────────────────────────────────────────────

describe('sqlTypeForField', () => {
  // Naming convention inference
  it.each([
    ['counterparty_id', 'BIGINT'],
    ['currency_code', 'VARCHAR(30)'],
    ['legal_name', 'VARCHAR(500)'],
    ['facility_desc', 'VARCHAR(500)'],
    ['note_text', 'VARCHAR(500)'],
    ['committed_amt', 'NUMERIC(20,4)'],
    ['coverage_pct', 'NUMERIC(10,6)'],
    ['metric_value', 'NUMERIC(12,6)'],
    ['loan_count', 'INTEGER'],
    ['is_active_flag', 'BOOLEAN'],
    ['maturity_date', 'DATE'],
    ['created_ts', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
    ['spread_bps', 'NUMERIC(10,4)'],
    ['unknown_column', 'VARCHAR(64)'],
  ])('infers %s → %s from naming convention', (name, expected) => {
    expect(sqlTypeForField(field(name))).toBe(expected);
  });

  // Explicit data_type overrides
  it('uses explicit VARCHAR type', () => {
    expect(sqlTypeForField(field('x', { data_type: 'VARCHAR(100)' }))).toBe('VARCHAR(100)');
  });

  it('normalizes STRING to TEXT', () => {
    expect(sqlTypeForField(field('x', { data_type: 'STRING' }))).toBe('TEXT');
  });

  it('normalizes BOOL to BOOLEAN', () => {
    expect(sqlTypeForField(field('x', { data_type: 'BOOL' }))).toBe('BOOLEAN');
  });

  it('normalizes INT to INTEGER', () => {
    expect(sqlTypeForField(field('x', { data_type: 'INT' }))).toBe('INTEGER');
  });

  it('normalizes NUMBER to NUMERIC(20,4)', () => {
    expect(sqlTypeForField(field('x', { data_type: 'NUMBER' }))).toBe('NUMERIC(20,4)');
  });

  // Sequence/rank columns
  it('infers INTEGER for rank_ prefix', () => {
    expect(sqlTypeForField(field('rank_order'))).toBe('INTEGER');
  });

  it('infers INTEGER for _seq suffix', () => {
    expect(sqlTypeForField(field('change_seq'))).toBe('INTEGER');
  });
});

// ─── buildCreateTable ─────────────────────────────────────────────────

describe('buildCreateTable', () => {
  it('generates CREATE TABLE with columns and PK', () => {
    const table: DataDictionaryTable = {
      name: 'counterparty',
      category: 'Master',
      fields: [
        pkField('counterparty_id'),
        field('legal_name'),
        field('country_code'),
      ],
    } as DataDictionaryTable;
    const sql = buildCreateTable(table, 'l1');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "l1"."counterparty"');
    expect(sql).toContain('"counterparty_id" BIGINT NOT NULL');
    expect(sql).toContain('"legal_name" VARCHAR(500)');
    expect(sql).toContain('PRIMARY KEY ("counterparty_id")');
  });

  it('returns comment for table with no fields', () => {
    const table = { name: 'empty_table', category: '', fields: [] } as unknown as DataDictionaryTable;
    const sql = buildCreateTable(table, 'l1');
    expect(sql).toContain('has no columns');
  });

  it('handles composite primary keys', () => {
    const table = {
      name: 'snapshot',
      category: 'Snapshot',
      fields: [pkField('facility_id'), pkField('as_of_date', { data_type: 'DATE' })],
    } as unknown as DataDictionaryTable;
    const sql = buildCreateTable(table, 'l2');
    expect(sql).toContain('PRIMARY KEY ("facility_id", "as_of_date")');
  });
});

// ─── DDL mutation helpers ─────────────────────────────────────────────

describe('buildDropTable', () => {
  it('generates DROP TABLE for L1', () => {
    const sql = buildDropTable('L1', 'old_table');
    expect(sql).toBe('DROP TABLE IF EXISTS "l1"."old_table";');
  });

  it('generates DROP TABLE for L3', () => {
    const sql = buildDropTable('L3', 'calc_table');
    expect(sql).toBe('DROP TABLE IF EXISTS "l3"."calc_table";');
  });
});

describe('buildAddColumn', () => {
  it('generates ALTER TABLE ADD COLUMN', () => {
    const sql = buildAddColumn('L2', 'facility_master', field('new_amt'));
    expect(sql).toContain('ALTER TABLE "l2"."facility_master"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "new_amt" NUMERIC(20,4)');
  });
});

describe('buildDropColumn', () => {
  it('generates ALTER TABLE DROP COLUMN', () => {
    const sql = buildDropColumn('L1', 'counterparty', 'old_field');
    expect(sql).toContain('DROP COLUMN IF EXISTS "old_field"');
  });
});

describe('buildRenameColumn', () => {
  it('generates ALTER TABLE RENAME COLUMN', () => {
    const sql = buildRenameColumn('L2', 'fes', 'old_name', 'new_name');
    expect(sql).toContain('RENAME COLUMN "old_name" TO "new_name"');
  });
});

describe('buildAlterColumnType', () => {
  it('generates ALTER COLUMN TYPE with USING', () => {
    const sql = buildAlterColumnType('L1', 'dim_table', 'col', 'NUMERIC(20,4)');
    expect(sql).toContain('ALTER COLUMN "col" TYPE NUMERIC(20,4)');
    expect(sql).toContain('USING "col"::NUMERIC(20,4)');
  });
});

// ─── buildForeignKey ──────────────────────────────────────────────────

describe('buildForeignKey', () => {
  it('generates DO block with FK constraint', () => {
    const sql = buildForeignKey({
      from_layer: 'l2',
      from_table: 'facility_master',
      from_field: 'counterparty_id',
      to_layer: 'l1',
      to_table: 'counterparty',
      to_field: 'counterparty_id',
    });
    expect(sql).toContain('DO $$ BEGIN');
    expect(sql).toContain('ALTER TABLE "l2"."facility_master"');
    expect(sql).toContain('FOREIGN KEY ("counterparty_id")');
    expect(sql).toContain('REFERENCES "l1"."counterparty" ("counterparty_id")');
    expect(sql).toContain('EXCEPTION WHEN OTHERS THEN NULL');
  });

  it('abbreviates long table names to fit 63-char limit', () => {
    const sql = buildForeignKey({
      from_layer: 'l2',
      from_table: 'credit_agreement_counterparty_participation_allocation',
      from_field: 'counterparty_id',
      to_layer: 'l1',
      to_table: 'counterparty',
      to_field: 'counterparty_id',
    });
    // Constraint name should be <= 63 chars
    const constraintMatch = sql.match(/ADD CONSTRAINT "([^"]+)"/);
    expect(constraintMatch).toBeTruthy();
    expect(constraintMatch![1].length).toBeLessThanOrEqual(63);
  });
});
