import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  readDataDictionary,
  writeDataDictionary,
  ensureEmptyDataDictionary,
  findTable,
  layerToSchema,
  type DataDictionary,
  type DataDictionaryTable,
} from '../data-dictionary';

// Mock config to control paths
vi.mock('@/lib/config', () => ({
  getDataDictionaryPath: () => '/tmp/test-dd/data-dictionary.json',
  getDataDictionaryDir: () => '/tmp/test-dd',
}));

const TEST_DIR = '/tmp/test-dd';
const TEST_PATH = path.join(TEST_DIR, 'data-dictionary.json');

function makeDd(overrides?: Partial<DataDictionary>): DataDictionary {
  return {
    L1: [],
    L2: [],
    L3: [],
    relationships: [],
    derivation_dag: {},
    ...overrides,
  };
}

function makeTable(name: string, layer: 'L1' | 'L2' | 'L3'): DataDictionaryTable {
  return { name, layer, category: 'Test', fields: [] };
}

beforeEach(() => {
  if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(TEST_PATH)) fs.unlinkSync(TEST_PATH);
  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
});

/* ────────────────── readDataDictionary ────────────────── */

describe('readDataDictionary', () => {
  it('returns null when file does not exist', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readDataDictionary()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('File not found'));
    warnSpy.mockRestore();
  });

  it('reads and parses valid JSON', () => {
    const dd = makeDd({ L1: [makeTable('counterparty', 'L1')] });
    fs.writeFileSync(TEST_PATH, JSON.stringify(dd), 'utf-8');
    const result = readDataDictionary();
    expect(result).not.toBeNull();
    expect(result!.L1).toHaveLength(1);
    expect(result!.L1[0].name).toBe('counterparty');
  });

  it('returns null on malformed JSON and logs error', () => {
    fs.writeFileSync(TEST_PATH, '{ broken json', 'utf-8');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(readDataDictionary()).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse'),
      expect.any(String)
    );
    errorSpy.mockRestore();
  });

  it('returns null on empty file', () => {
    fs.writeFileSync(TEST_PATH, '', 'utf-8');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(readDataDictionary()).toBeNull();
    errorSpy.mockRestore();
  });
});

/* ────────────────── writeDataDictionary ────────────────── */

describe('writeDataDictionary', () => {
  it('writes valid JSON to disk', () => {
    const dd = makeDd({ L2: [makeTable('facility_master', 'L2')] });
    writeDataDictionary(dd);
    const raw = fs.readFileSync(TEST_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.L2[0].name).toBe('facility_master');
  });

  it('creates directory if it does not exist', () => {
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
    const dd = makeDd();
    writeDataDictionary(dd);
    expect(fs.existsSync(TEST_PATH)).toBe(true);
  });

  it('overwrites existing file', () => {
    writeDataDictionary(makeDd({ L1: [makeTable('old', 'L1')] }));
    writeDataDictionary(makeDd({ L1: [makeTable('new', 'L1')] }));
    const result = readDataDictionary();
    expect(result!.L1[0].name).toBe('new');
  });
});

/* ────────────────── ensureEmptyDataDictionary ────────────────── */

describe('ensureEmptyDataDictionary', () => {
  it('returns existing DD if file exists', () => {
    const dd = makeDd({ L1: [makeTable('existing', 'L1')] });
    fs.writeFileSync(TEST_PATH, JSON.stringify(dd), 'utf-8');
    const result = ensureEmptyDataDictionary();
    expect(result.L1[0].name).toBe('existing');
  });

  it('creates and returns empty DD if file does not exist', () => {
    const result = ensureEmptyDataDictionary();
    expect(result.L1).toEqual([]);
    expect(result.L2).toEqual([]);
    expect(result.L3).toEqual([]);
    expect(result.relationships).toEqual([]);
    expect(fs.existsSync(TEST_PATH)).toBe(true);
  });
});

/* ────────────────── findTable ────────────────── */

describe('findTable', () => {
  const dd = makeDd({
    L1: [makeTable('counterparty', 'L1'), makeTable('facility_master', 'L1')],
    L2: [makeTable('facility_exposure_snapshot', 'L2')],
    L3: [],
  });

  it('finds table by layer and name', () => {
    expect(findTable(dd, 'L1', 'counterparty')?.name).toBe('counterparty');
    expect(findTable(dd, 'L2', 'facility_exposure_snapshot')?.name).toBe('facility_exposure_snapshot');
  });

  it('returns undefined for non-existent table', () => {
    expect(findTable(dd, 'L1', 'nonexistent')).toBeUndefined();
  });

  it('returns undefined for wrong layer', () => {
    expect(findTable(dd, 'L2', 'counterparty')).toBeUndefined();
  });

  it('returns undefined for empty layer', () => {
    expect(findTable(dd, 'L3', 'anything')).toBeUndefined();
  });
});

/* ────────────────── layerToSchema ────────────────── */

describe('layerToSchema', () => {
  it('converts L1 to l1', () => expect(layerToSchema('L1')).toBe('l1'));
  it('converts L2 to l2', () => expect(layerToSchema('L2')).toBe('l2'));
  it('converts L3 to l3', () => expect(layerToSchema('L3')).toBe('l3'));
});
