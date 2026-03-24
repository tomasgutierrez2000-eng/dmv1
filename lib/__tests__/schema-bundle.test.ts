import { describe, it, expect, vi } from 'vitest';
import {
  findTableInBundle,
  getRelationshipsForTable,
  type SchemaBundle,
} from '../schema-bundle';
import type { DataDictionary, DataDictionaryTable, DataDictionaryRelationship } from '../data-dictionary';

function makeTable(name: string, layer: 'L1' | 'L2' | 'L3', category = 'Test'): DataDictionaryTable {
  return { name, layer, category, fields: [] };
}

function makeRel(from: string, to: string, fromLayer = 'L1', toLayer = 'L2'): DataDictionaryRelationship {
  return { from_table: from, from_field: 'id', to_table: to, to_field: 'fk_id', from_layer: fromLayer, to_layer: toLayer };
}

function makeBundle(dd: DataDictionary | null = null): SchemaBundle {
  return { dataDictionary: dd, l3Tables: [], l3Metrics: [] };
}

function makeDd(overrides?: Partial<DataDictionary>): DataDictionary {
  return { L1: [], L2: [], L3: [], relationships: [], derivation_dag: {}, ...overrides };
}

/* ────────────────── findTableInBundle ────────────────── */

describe('findTableInBundle', () => {
  const dd = makeDd({
    L1: [makeTable('counterparty', 'L1'), makeTable('facility_master', 'L1')],
    L2: [makeTable('facility_exposure_snapshot', 'L2')],
  });
  const bundle = makeBundle(dd);

  it('finds table by exact name', () => {
    expect(findTableInBundle(bundle, 'L1', 'counterparty')?.name).toBe('counterparty');
  });

  it('finds table case-insensitively', () => {
    expect(findTableInBundle(bundle, 'L1', 'COUNTERPARTY')?.name).toBe('counterparty');
    expect(findTableInBundle(bundle, 'L2', 'Facility_Exposure_Snapshot')?.name).toBe('facility_exposure_snapshot');
  });

  it('returns undefined for non-existent table', () => {
    expect(findTableInBundle(bundle, 'L1', 'nonexistent')).toBeUndefined();
  });

  it('returns undefined for wrong layer', () => {
    expect(findTableInBundle(bundle, 'L2', 'counterparty')).toBeUndefined();
  });

  it('returns undefined when DD is null', () => {
    expect(findTableInBundle(makeBundle(null), 'L1', 'counterparty')).toBeUndefined();
  });
});

/* ────────────────── getRelationshipsForTable ────────────────── */

describe('getRelationshipsForTable', () => {
  const rels: DataDictionaryRelationship[] = [
    makeRel('facility_master', 'counterparty', 'L1', 'L1'),
    makeRel('facility_exposure_snapshot', 'facility_master', 'L2', 'L1'),
    makeRel('credit_event', 'counterparty', 'L2', 'L1'),
  ];
  const dd = makeDd({ relationships: rels });
  const bundle = makeBundle(dd);

  it('returns all relationships when no filters', () => {
    expect(getRelationshipsForTable(bundle)).toHaveLength(3);
  });

  it('filters by table name (from side)', () => {
    const result = getRelationshipsForTable(bundle, 'facility_master');
    expect(result).toHaveLength(2); // facility_master appears as from and to
  });

  it('filters by table name (to side)', () => {
    const result = getRelationshipsForTable(bundle, 'counterparty');
    expect(result).toHaveLength(2); // counterparty is target of 2 rels
  });

  it('filters case-insensitively', () => {
    expect(getRelationshipsForTable(bundle, 'FACILITY_MASTER')).toHaveLength(2);
  });

  it('filters by layer', () => {
    const result = getRelationshipsForTable(bundle, undefined, 'L2');
    expect(result).toHaveLength(2); // 2 rels involve L2
  });

  it('combines table and layer filters', () => {
    const result = getRelationshipsForTable(bundle, 'facility_master', 'L2');
    expect(result).toHaveLength(1); // Only the L2→L1 rel involving facility_master
  });

  it('returns empty when DD is null', () => {
    expect(getRelationshipsForTable(makeBundle(null), 'anything')).toEqual([]);
  });

  it('returns empty when no relationships match', () => {
    expect(getRelationshipsForTable(bundle, 'nonexistent_table')).toEqual([]);
  });
});
