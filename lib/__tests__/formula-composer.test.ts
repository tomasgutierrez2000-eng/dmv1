import { describe, it, expect } from 'vitest';
import { composeSQL, validateSQL } from '@/lib/metric-studio/formula-composer';
import type { ComposedField } from '@/lib/metric-studio/types';
import type { DataDictionaryRelationship } from '@/lib/data-dictionary';

const RELS: DataDictionaryRelationship[] = [
  { from_table: 'facility_master', from_field: 'counterparty_id', to_table: 'counterparty', to_field: 'counterparty_id', from_layer: 'L2', to_layer: 'L2' },
  { from_table: 'facility_exposure_snapshot', from_field: 'facility_id', to_table: 'facility_master', to_field: 'facility_id', from_layer: 'L2', to_layer: 'L2' },
  { from_table: 'facility_risk_snapshot', from_field: 'facility_id', to_table: 'facility_master', to_field: 'facility_id', from_layer: 'L2', to_layer: 'L2' },
];

describe('composeSQL', () => {
  it('returns error for empty fields', () => {
    const result = composeSQL([], RELS);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No fields');
  });

  it('generates simple SELECT for single table without aggregation', () => {
    const fields: ComposedField[] = [
      { table: 'facility_master', field: 'facility_id', layer: 'l2' },
      { table: 'facility_master', field: 'counterparty_id', layer: 'l2' },
    ];
    const result = composeSQL(fields, RELS);
    expect(result.valid).toBe(true);
    expect(result.sql).toContain('SELECT');
    expect(result.sql).toContain('facility_master');
    expect(result.sql).toContain('facility_id');
    expect(result.sql).toContain('LIMIT 1000');
  });

  it('generates JOIN for two FK-connected tables', () => {
    const fields: ComposedField[] = [
      { table: 'facility_exposure_snapshot', field: 'drawn_amount', layer: 'l2' },
      { table: 'facility_master', field: 'counterparty_id', layer: 'l2' },
    ];
    const result = composeSQL(fields, RELS);
    expect(result.valid).toBe(true);
    expect(result.sql).toContain('JOIN');
    expect(result.sql).toContain('facility_master');
    expect(result.sql).toContain('facility_exposure_snapshot');
  });

  it('generates SUM aggregation with GROUP BY', () => {
    const fields: ComposedField[] = [
      { table: 'facility_exposure_snapshot', field: 'drawn_amount', layer: 'l2', aggregation: 'SUM' },
      { table: 'facility_master', field: 'counterparty_id', layer: 'l2' },
    ];
    const result = composeSQL(fields, RELS);
    expect(result.valid).toBe(true);
    expect(result.sql).toContain('SUM');
    expect(result.sql).toContain('GROUP BY');
    expect(result.sql).toContain('dimension_key');
    expect(result.sql).toContain('metric_value');
  });

  it('uses "total" as dimension_key when all fields aggregated', () => {
    const fields: ComposedField[] = [
      { table: 'facility_exposure_snapshot', field: 'drawn_amount', layer: 'l2', aggregation: 'SUM' },
    ];
    const result = composeSQL(fields, RELS);
    expect(result.valid).toBe(true);
    expect(result.sql).toContain("'total' AS dimension_key");
  });

  it('returns error when no FK path exists', () => {
    const fields: ComposedField[] = [
      { table: 'facility_master', field: 'facility_id', layer: 'l2' },
      { table: 'nonexistent_table', field: 'some_field', layer: 'l2' },
    ];
    const result = composeSQL(fields, RELS);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No FK path');
  });

  it('generates debug steps', () => {
    const fields: ComposedField[] = [
      { table: 'facility_exposure_snapshot', field: 'drawn_amount', layer: 'l2', aggregation: 'SUM' },
      { table: 'facility_master', field: 'counterparty_id', layer: 'l2' },
    ];
    const result = composeSQL(fields, RELS);
    expect(result.steps.length).toBeGreaterThanOrEqual(3); // FROM, JOIN, SELECT
    expect(result.steps[0].type).toBe('from');
    expect(result.steps[result.steps.length - 1].type).toBe('select');
  });

  it('handles COUNT_DISTINCT aggregation', () => {
    const fields: ComposedField[] = [
      { table: 'facility_master', field: 'counterparty_id', layer: 'l2', aggregation: 'COUNT_DISTINCT' },
    ];
    const result = composeSQL(fields, RELS);
    expect(result.valid).toBe(true);
    expect(result.sql).toContain('COUNT(DISTINCT');
  });

  it('includes source tables in result', () => {
    const fields: ComposedField[] = [
      { table: 'facility_exposure_snapshot', field: 'drawn_amount', layer: 'l2' },
      { table: 'facility_master', field: 'counterparty_id', layer: 'l2' },
    ];
    const result = composeSQL(fields, RELS);
    expect(result.sourceTables).toContain('l2.facility_exposure_snapshot');
    expect(result.sourceTables).toContain('l2.facility_master');
  });
});

describe('validateSQL', () => {
  it('accepts valid SELECT statement', () => {
    expect(validateSQL('SELECT * FROM l2.facility_master LIMIT 100')).toBeNull();
  });

  it('rejects INSERT statement', () => {
    expect(validateSQL('INSERT INTO l2.facility_master VALUES (1)')).toContain('INSERT');
  });

  it('rejects DROP statement', () => {
    expect(validateSQL('DROP TABLE l2.facility_master')).toContain('DROP');
  });

  it('rejects DELETE statement', () => {
    expect(validateSQL('DELETE FROM l2.facility_master')).toContain('DELETE');
  });

  it('rejects SQL with semicolons', () => {
    // Semicolons are checked but DROP is caught first (keyword check runs before semicolon check)
    const result = validateSQL('SELECT 1; DROP TABLE x');
    expect(result).not.toBeNull();

    // Test semicolons alone
    expect(validateSQL('SELECT 1; SELECT 2')).toContain('semicolons');
  });

  it('rejects non-SELECT SQL', () => {
    expect(validateSQL('UPDATE l2.facility_master SET name = 1')).toContain('UPDATE');
  });
});
