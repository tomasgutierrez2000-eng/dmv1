import { describe, it, expect } from 'vitest';
import { layerToSchema, findTable, type DataDictionary, type DataDictionaryTable } from '../data-dictionary';

describe('layerToSchema', () => {
  it('maps L1 to l1', () => expect(layerToSchema('L1')).toBe('l1'));
  it('maps L2 to l2', () => expect(layerToSchema('L2')).toBe('l2'));
  it('maps L3 to l3', () => expect(layerToSchema('L3')).toBe('l3'));
});

describe('findTable', () => {
  const dd: DataDictionary = {
    L1: [
      { name: 'counterparty', layer: 'L1', category: 'Master', fields: [] },
      { name: 'facility_master', layer: 'L1', category: 'Master', fields: [] },
    ] as DataDictionaryTable[],
    L2: [
      { name: 'facility_exposure_snapshot', layer: 'L2', category: 'Snapshot', fields: [] },
    ] as DataDictionaryTable[],
    L3: [] as DataDictionaryTable[],
    relationships: [],
    derivation_dag: {},
  };

  it('finds table by name in correct layer', () => {
    const table = findTable(dd, 'L1', 'counterparty');
    expect(table).toBeDefined();
    expect(table!.name).toBe('counterparty');
  });

  it('returns undefined for table in wrong layer', () => {
    expect(findTable(dd, 'L2', 'counterparty')).toBeUndefined();
  });

  it('returns undefined for non-existent table', () => {
    expect(findTable(dd, 'L1', 'nonexistent')).toBeUndefined();
  });

  it('returns undefined for empty layer', () => {
    expect(findTable(dd, 'L3', 'anything')).toBeUndefined();
  });
});
