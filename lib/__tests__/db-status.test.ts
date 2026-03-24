/**
 * Tests for db-status.ts pure helper functions.
 * The main getDbStatus() function requires PG — tested via integration tests.
 * Here we test the exported types and the module's internal pure helpers
 * by importing them indirectly through behavior.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TableStatus, FieldDriftType, DbStatusSummary } from '../db-status';

// Type-level tests — ensure the types are correct
describe('db-status types', () => {
  it('TableStatus has expected values', () => {
    const statuses: TableStatus[] = ['has_data', 'empty', 'not_in_db', 'not_in_dd'];
    expect(statuses).toHaveLength(4);
  });

  it('FieldDriftType has expected values', () => {
    const drifts: FieldDriftType[] = ['in_dd_not_in_db', 'in_db_not_in_dd', 'type_mismatch'];
    expect(drifts).toHaveLength(3);
  });

  it('DbStatusSummary has all required fields', () => {
    const summary: DbStatusSummary = {
      totalTablesInDd: 10,
      totalTablesInDb: 8,
      tablesWithData: 6,
      tablesEmpty: 2,
      tablesNotInDb: 2,
      tablesNotInDd: 0,
      tablesWithFieldDrift: 1,
      totalFieldDrifts: 3,
    };
    expect(summary.totalTablesInDd).toBe(10);
    expect(summary.tablesWithFieldDrift).toBe(1);
  });
});

// Test getDbStatus without DATABASE_URL — should return all tables as not_in_db
describe('getDbStatus without DATABASE_URL', () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('returns connected=false and databaseUrl=false', async () => {
    // Mock readDataDictionary to return a small DD
    vi.doMock('@/lib/data-dictionary', () => ({
      readDataDictionary: () => ({
        L1: [{ name: 'counterparty', layer: 'L1', category: 'Entity masters', fields: [{ name: 'id' }] }],
        L2: [],
        L3: [],
        relationships: [],
        derivation_dag: {},
      }),
    }));

    // Re-import after mock
    const { getDbStatus } = await import('../db-status');
    const result = await getDbStatus();

    expect(result.connected).toBe(false);
    expect(result.databaseUrl).toBe(false);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].status).toBe('not_in_db');
    expect(result.summary.tablesNotInDb).toBe(1);

    vi.doUnmock('@/lib/data-dictionary');
  });

  it('handles null data dictionary gracefully', async () => {
    vi.doMock('@/lib/data-dictionary', () => ({
      readDataDictionary: () => null,
    }));
    // Clear module cache so the new mock takes effect
    vi.resetModules();

    const { getDbStatus } = await import('../db-status');
    const result = await getDbStatus();

    expect(result.connected).toBe(false);
    expect(result.tables).toHaveLength(0);
    expect(result.summary.totalTablesInDd).toBe(0);

    vi.doUnmock('@/lib/data-dictionary');
  });
});
