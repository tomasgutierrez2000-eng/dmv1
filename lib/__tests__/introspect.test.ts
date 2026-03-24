import { describe, it, expect } from 'vitest';
import {
  formatPgType,
  schemaToLayer,
  mergeIntoDataDictionary,
  type IntrospectedData,
} from '../introspect';
import type { DataDictionary } from '../data-dictionary';

/* ────────────────── formatPgType ────────────────── */

describe('formatPgType', () => {
  it('VARCHAR with length', () => {
    expect(formatPgType('character varying', 50, null, null, 'varchar')).toBe('VARCHAR(50)');
  });

  it('VARCHAR without length', () => {
    expect(formatPgType('character varying', null, null, null, 'varchar')).toBe('VARCHAR');
  });

  it('CHAR with length', () => {
    expect(formatPgType('character', 2, null, null, 'bpchar')).toBe('CHAR(2)');
  });

  it('NUMERIC with precision and scale', () => {
    expect(formatPgType('numeric', null, 20, 4, 'numeric')).toBe('NUMERIC(20,4)');
  });

  it('NUMERIC with precision only', () => {
    expect(formatPgType('numeric', null, 10, null, 'numeric')).toBe('NUMERIC(10)');
  });

  it('NUMERIC bare', () => {
    expect(formatPgType('numeric', null, null, null, 'numeric')).toBe('NUMERIC');
  });

  it('INTEGER → SERIAL when nextval default', () => {
    expect(formatPgType('integer', null, null, null, 'int4', "nextval('seq'::regclass)")).toBe('SERIAL');
  });

  it('INTEGER without nextval', () => {
    expect(formatPgType('integer', null, null, null, 'int4')).toBe('INTEGER');
  });

  it('BIGINT → BIGSERIAL when nextval default', () => {
    expect(formatPgType('bigint', null, null, null, 'int8', "nextval('id_seq'::regclass)")).toBe('BIGSERIAL');
  });

  it('BIGINT without nextval', () => {
    expect(formatPgType('bigint', null, null, null, 'int8')).toBe('BIGINT');
  });

  it('SMALLINT', () => {
    expect(formatPgType('smallint', null, null, null, 'int2')).toBe('SMALLINT');
  });

  it('BOOLEAN', () => {
    expect(formatPgType('boolean', null, null, null, 'bool')).toBe('BOOLEAN');
  });

  it('DATE', () => {
    expect(formatPgType('date', null, null, null, 'date')).toBe('DATE');
  });

  it('TIMESTAMP without timezone', () => {
    expect(formatPgType('timestamp without time zone', null, null, null, 'timestamp')).toBe('TIMESTAMP');
  });

  it('TIMESTAMPTZ', () => {
    expect(formatPgType('timestamp with time zone', null, null, null, 'timestamptz')).toBe('TIMESTAMPTZ');
  });

  it('TEXT', () => {
    expect(formatPgType('text', null, null, null, 'text')).toBe('TEXT');
  });

  it('DOUBLE PRECISION', () => {
    expect(formatPgType('double precision', null, null, null, 'float8')).toBe('DOUBLE PRECISION');
  });

  it('REAL', () => {
    expect(formatPgType('real', null, null, null, 'float4')).toBe('REAL');
  });

  it('JSON', () => {
    expect(formatPgType('json', null, null, null, 'json')).toBe('JSON');
  });

  it('JSONB', () => {
    expect(formatPgType('jsonb', null, null, null, 'jsonb')).toBe('JSONB');
  });

  it('ARRAY type strips underscore prefix', () => {
    expect(formatPgType('ARRAY', null, null, null, '_text')).toBe('text[]');
    expect(formatPgType('ARRAY', null, null, null, '_int4')).toBe('int4[]');
  });

  it('USER-DEFINED uppercases udt_name', () => {
    expect(formatPgType('USER-DEFINED', null, null, null, 'citext')).toBe('CITEXT');
  });

  it('unknown types uppercase', () => {
    expect(formatPgType('xml', null, null, null, 'xml')).toBe('XML');
  });
});

/* ────────────────── schemaToLayer ────────────────── */

describe('schemaToLayer', () => {
  it('maps l1 → L1', () => expect(schemaToLayer('l1')).toBe('L1'));
  it('maps l2 → L2', () => expect(schemaToLayer('l2')).toBe('L2'));
  it('maps l3 → L3', () => expect(schemaToLayer('l3')).toBe('L3'));
  it('throws on unknown schema', () => {
    expect(() => schemaToLayer('public')).toThrow('Unknown schema: public');
  });
});

/* ────────────────── mergeIntoDataDictionary ────────────────── */

describe('mergeIntoDataDictionary', () => {
  function emptyDd(): DataDictionary {
    return { L1: [], L2: [], L3: [], relationships: [], derivation_dag: {} };
  }

  function emptyIntrospected(): IntrospectedData {
    return { tables: [], columns: [], pks: [], fks: [] };
  }

  it('adds new tables to empty DD', () => {
    const dd = emptyDd();
    const introspected: IntrospectedData = {
      tables: [{ table_schema: 'l1', table_name: 'counterparty' }],
      columns: [{
        table_schema: 'l1', table_name: 'counterparty', column_name: 'counterparty_id',
        data_type: 'bigint', character_maximum_length: null, numeric_precision: null,
        numeric_scale: null, is_nullable: 'NO', column_default: null, ordinal_position: 1,
        udt_name: 'int8',
      }],
      pks: [{ table_schema: 'l1', table_name: 'counterparty', column_name: 'counterparty_id', ordinal_position: 1 }],
      fks: [],
    };

    const report = mergeIntoDataDictionary(dd, introspected);
    expect(report.tablesAdded).toContain('L1.counterparty');
    expect(dd.L1).toHaveLength(1);
    expect(dd.L1[0].name).toBe('counterparty');
    expect(dd.L1[0].fields[0].name).toBe('counterparty_id');
    expect(dd.L1[0].fields[0].pk_fk?.is_pk).toBe(true);
  });

  it('detects new fields on existing tables', () => {
    const dd = emptyDd();
    dd.L2 = [{ name: 'exposure', layer: 'L2', category: 'Test', fields: [
      { name: 'facility_id', data_type: 'BIGINT' },
    ]}];

    const introspected: IntrospectedData = {
      tables: [{ table_schema: 'l2', table_name: 'exposure' }],
      columns: [
        { table_schema: 'l2', table_name: 'exposure', column_name: 'facility_id', data_type: 'bigint', character_maximum_length: null, numeric_precision: null, numeric_scale: null, is_nullable: 'NO', column_default: null, ordinal_position: 1, udt_name: 'int8' },
        { table_schema: 'l2', table_name: 'exposure', column_name: 'drawn_amount', data_type: 'numeric', character_maximum_length: null, numeric_precision: 20, numeric_scale: 4, is_nullable: 'YES', column_default: null, ordinal_position: 2, udt_name: 'numeric' },
      ],
      pks: [], fks: [],
    };

    const report = mergeIntoDataDictionary(dd, introspected);
    expect(report.fieldsAdded).toContain('L2.exposure.drawn_amount');
    expect(dd.L2[0].fields).toHaveLength(2);
  });

  it('detects type changes', () => {
    const dd = emptyDd();
    dd.L1 = [{ name: 'dim', layer: 'L1', category: 'Test', fields: [
      { name: 'code', data_type: 'VARCHAR(20)' },
    ]}];

    const introspected: IntrospectedData = {
      tables: [{ table_schema: 'l1', table_name: 'dim' }],
      columns: [
        { table_schema: 'l1', table_name: 'dim', column_name: 'code', data_type: 'character varying', character_maximum_length: 50, numeric_precision: null, numeric_scale: null, is_nullable: 'NO', column_default: null, ordinal_position: 1, udt_name: 'varchar' },
      ],
      pks: [], fks: [],
    };

    const report = mergeIntoDataDictionary(dd, introspected);
    expect(report.typesChanged).toHaveLength(1);
    expect(report.typesChanged[0]).toContain('VARCHAR(20)');
    expect(report.typesChanged[0]).toContain('VARCHAR(50)');
    expect(dd.L1[0].fields[0].data_type).toBe('VARCHAR(50)');
  });

  it('reports table/field totals', () => {
    const dd = emptyDd();
    const introspected: IntrospectedData = {
      tables: [
        { table_schema: 'l1', table_name: 'a' },
        { table_schema: 'l1', table_name: 'b' },
        { table_schema: 'l2', table_name: 'c' },
      ],
      columns: [
        { table_schema: 'l1', table_name: 'a', column_name: 'id', data_type: 'bigint', character_maximum_length: null, numeric_precision: null, numeric_scale: null, is_nullable: 'NO', column_default: null, ordinal_position: 1, udt_name: 'int8' },
        { table_schema: 'l1', table_name: 'b', column_name: 'id', data_type: 'bigint', character_maximum_length: null, numeric_precision: null, numeric_scale: null, is_nullable: 'NO', column_default: null, ordinal_position: 1, udt_name: 'int8' },
        { table_schema: 'l2', table_name: 'c', column_name: 'id', data_type: 'bigint', character_maximum_length: null, numeric_precision: null, numeric_scale: null, is_nullable: 'NO', column_default: null, ordinal_position: 1, udt_name: 'int8' },
      ],
      pks: [], fks: [],
    };

    const report = mergeIntoDataDictionary(dd, introspected);
    expect(report.totalTables.L1).toBe(2);
    expect(report.totalTables.L2).toBe(1);
    expect(report.totalTables.L3).toBe(0);
  });

  it('handles FK relationships', () => {
    const dd = emptyDd();
    const introspected: IntrospectedData = {
      tables: [
        { table_schema: 'l2', table_name: 'fes' },
        { table_schema: 'l1', table_name: 'fm' },
      ],
      columns: [
        { table_schema: 'l2', table_name: 'fes', column_name: 'facility_id', data_type: 'bigint', character_maximum_length: null, numeric_precision: null, numeric_scale: null, is_nullable: 'NO', column_default: null, ordinal_position: 1, udt_name: 'int8' },
        { table_schema: 'l1', table_name: 'fm', column_name: 'facility_id', data_type: 'bigint', character_maximum_length: null, numeric_precision: null, numeric_scale: null, is_nullable: 'NO', column_default: null, ordinal_position: 1, udt_name: 'int8' },
      ],
      pks: [{ table_schema: 'l1', table_name: 'fm', column_name: 'facility_id', ordinal_position: 1 }],
      fks: [{ table_schema: 'l2', table_name: 'fes', column_name: 'facility_id', ref_schema: 'l1', ref_table: 'fm', ref_column: 'facility_id' }],
    };

    mergeIntoDataDictionary(dd, introspected);
    const fesField = dd.L2[0].fields[0];
    expect(fesField.pk_fk?.fk_target).toEqual({ layer: 'L1', table: 'fm', field: 'facility_id' });
  });

  it('handles empty introspection gracefully', () => {
    const dd = emptyDd();
    dd.L1 = [{ name: 'existing', layer: 'L1', category: 'Test', fields: [] }];
    const report = mergeIntoDataDictionary(dd, emptyIntrospected());
    expect(report.tablesAdded).toHaveLength(0);
    // existing table preserved (not removed — removal only reported, not enacted)
  });
});
