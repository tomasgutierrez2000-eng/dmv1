import { describe, it, expect } from 'vitest';
import { SchemaRegistry, validateAgainstSchema, validateLoadOrder } from '../schema-validator';

// Build a minimal registry for testing (without requiring the actual data dictionary file)
function makeTestRegistry(): SchemaRegistry {
  const registry = new SchemaRegistry();
  // Manually populate using the private tableColumns map via the class methods
  // We'll use a workaround: create from a temp DD
  return registry;
}

// Use a factory that builds registry from data
function buildRegistry(tables: Record<string, string[]>): SchemaRegistry {
  const registry = Object.create(SchemaRegistry.prototype) as SchemaRegistry;
  const map = new Map<string, Set<string>>();
  for (const [table, cols] of Object.entries(tables)) {
    map.set(table, new Set(cols));
  }
  // Access private field via any
  (registry as any).tableColumns = map;
  (registry as any).loadedFrom = 'test';
  return registry;
}

describe('SchemaRegistry', () => {
  describe('hasTable', () => {
    it('returns true for existing table', () => {
      const reg = buildRegistry({ 'l2.facility_master': ['facility_id', 'counterparty_id'] });
      expect(reg.hasTable('l2.facility_master')).toBe(true);
    });

    it('returns false for non-existing table', () => {
      const reg = buildRegistry({ 'l2.facility_master': ['facility_id'] });
      expect(reg.hasTable('l2.nonexistent')).toBe(false);
    });
  });

  describe('hasColumn', () => {
    it('returns true for existing column', () => {
      const reg = buildRegistry({ 'l2.facility_master': ['facility_id', 'counterparty_id'] });
      expect(reg.hasColumn('l2.facility_master', 'facility_id')).toBe(true);
    });

    it('returns false for non-existing column', () => {
      const reg = buildRegistry({ 'l2.facility_master': ['facility_id'] });
      expect(reg.hasColumn('l2.facility_master', 'nonexistent')).toBe(false);
    });

    it('returns false when table does not exist', () => {
      const reg = buildRegistry({});
      expect(reg.hasColumn('l2.nonexistent', 'col')).toBe(false);
    });
  });

  describe('suggestColumn', () => {
    it('suggests close match (Levenshtein)', () => {
      const reg = buildRegistry({
        'l2.facility_master': ['is_active_flag', 'facility_id', 'counterparty_id'],
      });
      const suggestion = reg.suggestColumn('l2.facility_master', 'is_active');
      expect(suggestion).toBe('is_active_flag');
    });

    it('returns null when no close match', () => {
      const reg = buildRegistry({
        'l2.facility_master': ['facility_id'],
      });
      const suggestion = reg.suggestColumn('l2.facility_master', 'totally_different_name');
      expect(suggestion).toBeNull();
    });

    it('returns null when table does not exist', () => {
      const reg = buildRegistry({});
      expect(reg.suggestColumn('l2.nonexistent', 'col')).toBeNull();
    });
  });

  describe('getColumns', () => {
    it('returns column set for existing table', () => {
      const reg = buildRegistry({ 'l1.currency_dim': ['currency_code', 'currency_name'] });
      const cols = reg.getColumns('l1.currency_dim');
      expect(cols).toBeDefined();
      expect(cols!.has('currency_code')).toBe(true);
    });

    it('returns undefined for non-existing table', () => {
      const reg = buildRegistry({});
      expect(reg.getColumns('l1.nonexistent')).toBeUndefined();
    });
  });

  describe('summary', () => {
    it('returns correct counts', () => {
      const reg = buildRegistry({
        'l1.table_a': ['col1', 'col2'],
        'l2.table_b': ['col3'],
      });
      const summary = reg.summary();
      expect(summary.tables).toBe(2);
      expect(summary.totalColumns).toBe(3);
    });
  });
});

describe('validateAgainstSchema', () => {
  it('passes for valid data', () => {
    const registry = buildRegistry({
      'l2.facility_master': ['facility_id', 'counterparty_id', 'status'],
    });
    const result = validateAgainstSchema([
      {
        schema: 'l2',
        table: 'facility_master',
        rows: [{ facility_id: 1, counterparty_id: 2, status: 'ACTIVE' }],
      },
    ], registry);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('catches unknown table', () => {
    const registry = buildRegistry({});
    const result = validateAgainstSchema([
      { schema: 'l2', table: 'nonexistent', rows: [{ id: 1 }] },
    ], registry);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('SCHEMA_DRIFT');
    expect(result.stats.tablesNotInDD).toContain('l2.nonexistent');
  });

  it('catches unknown column with suggestion', () => {
    const registry = buildRegistry({
      'l2.facility_master': ['is_active_flag', 'facility_id'],
    });
    const result = validateAgainstSchema([
      { schema: 'l2', table: 'facility_master', rows: [{ facility_id: 1, is_active: true }] },
    ], registry);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('is_active');
    expect(result.errors[0]).toContain('is_active_flag'); // suggestion
  });

  it('handles empty rows gracefully', () => {
    const registry = buildRegistry({
      'l2.facility_master': ['facility_id'],
    });
    const result = validateAgainstSchema([
      { schema: 'l2', table: 'facility_master', rows: [] },
    ], registry);
    expect(result.valid).toBe(true);
  });

  it('deduplicates column errors per table', () => {
    const registry = buildRegistry({
      'l2.facility_master': ['facility_id'],
    });
    const result = validateAgainstSchema([
      {
        schema: 'l2',
        table: 'facility_master',
        rows: [
          { facility_id: 1, bad_col: 'x' },
          { facility_id: 2, bad_col: 'y' },
        ],
      },
    ], registry);
    // Only one error for bad_col despite two rows
    const badColErrors = result.errors.filter(e => e.includes('bad_col'));
    expect(badColErrors).toHaveLength(1);
  });
});

describe('validateLoadOrder', () => {
  it('passes when all tables exist', () => {
    const registry = buildRegistry({
      'l1.counterparty': ['counterparty_id'],
      'l2.facility_master': ['facility_id'],
    });
    const result = validateLoadOrder(['l1.counterparty', 'l2.facility_master'], registry);
    expect(result.valid).toBe(true);
  });

  it('fails when table does not exist', () => {
    const registry = buildRegistry({
      'l1.counterparty': ['counterparty_id'],
    });
    const result = validateLoadOrder(['l1.counterparty', 'l2.nonexistent'], registry);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('l2.nonexistent');
  });
});
