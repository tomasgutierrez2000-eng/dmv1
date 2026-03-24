/**
 * Tests for db-status.ts.
 * Tests the no-DB fallback path and verifies correct summary/table construction.
 * The live PG path is covered by integration tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  vi.doUnmock('@/lib/data-dictionary');
  vi.doUnmock('@/lib/introspect');
});

function mockDd(dd: unknown) {
  vi.doMock('@/lib/data-dictionary', () => ({
    readDataDictionary: () => dd,
  }));
  // formatPgType is imported by db-status — re-export the real one
  vi.doMock('@/lib/introspect', async () => {
    const actual = await vi.importActual<typeof import('@/lib/introspect')>('@/lib/introspect');
    return actual;
  });
}

/* ────────────────── getDbStatus — no DATABASE_URL ────────────────── */

describe('getDbStatus without DATABASE_URL', () => {
  it('marks all DD tables as not_in_db', async () => {
    mockDd({
      L1: [
        { name: 'counterparty', layer: 'L1', category: 'Entity masters', fields: [{ name: 'counterparty_id', data_type: 'BIGINT' }] },
        { name: 'currency_dim', layer: 'L1', category: 'Reference', fields: [{ name: 'currency_code' }] },
      ],
      L2: [{ name: 'facility_exposure_snapshot', layer: 'L2', category: 'Exposure', fields: [] }],
      L3: [],
      relationships: [],
      derivation_dag: {},
    });

    const { getDbStatus } = await import('../db-status');
    const result = await getDbStatus();

    expect(result.connected).toBe(false);
    expect(result.databaseUrl).toBe(false);
    expect(result.tables).toHaveLength(3);
    expect(result.tables.every(t => t.status === 'not_in_db')).toBe(true);
    expect(result.tables.every(t => t.rowCount === null)).toBe(true);

    // Summary should reflect DD contents
    expect(result.summary.totalTablesInDd).toBe(3);
    expect(result.summary.totalTablesInDb).toBe(0);
    expect(result.summary.tablesNotInDb).toBe(3);
    expect(result.summary.tablesWithData).toBe(0);
    expect(result.summary.tablesEmpty).toBe(0);
    expect(result.summary.tablesNotInDd).toBe(0);
  });

  it('preserves layer and category from DD', async () => {
    mockDd({
      L1: [{ name: 'counterparty', layer: 'L1', category: 'Entity masters', fields: [{ name: 'id' }] }],
      L2: [],
      L3: [],
      relationships: [],
      derivation_dag: {},
    });

    const { getDbStatus } = await import('../db-status');
    const result = await getDbStatus();
    const table = result.tables[0];

    expect(table.name).toBe('counterparty');
    expect(table.layer).toBe('L1');
    expect(table.schema).toBe('l1');
    expect(table.category).toBe('Entity masters');
    expect(table.fieldCount).toBe(1);
    expect(table.fieldDrift).toEqual([]);
  });

  it('returns empty tables array when DD is null', async () => {
    mockDd(null);

    const { getDbStatus } = await import('../db-status');
    const result = await getDbStatus();

    expect(result.connected).toBe(false);
    expect(result.tables).toHaveLength(0);
    expect(result.summary.totalTablesInDd).toBe(0);
    expect(result.summary.totalTablesInDb).toBe(0);
  });

  it('includes ISO timestamp', async () => {
    mockDd({ L1: [], L2: [], L3: [], relationships: [], derivation_dag: {} });

    const { getDbStatus } = await import('../db-status');
    const result = await getDbStatus();

    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('handles DD with tables across all 3 layers', async () => {
    mockDd({
      L1: [{ name: 'dim_a', layer: 'L1', category: 'Ref', fields: [{ name: 'a' }, { name: 'b' }] }],
      L2: [{ name: 'snap_a', layer: 'L2', category: 'Exp', fields: [{ name: 'x' }] }],
      L3: [{ name: 'calc_a', layer: 'L3', category: 'Metric', fields: [] }],
      relationships: [],
      derivation_dag: {},
    });

    const { getDbStatus } = await import('../db-status');
    const result = await getDbStatus();

    expect(result.tables).toHaveLength(3);
    expect(result.tables.find(t => t.layer === 'L1')?.fieldCount).toBe(2);
    expect(result.tables.find(t => t.layer === 'L2')?.fieldCount).toBe(1);
    expect(result.tables.find(t => t.layer === 'L3')?.fieldCount).toBe(0);
  });
});
