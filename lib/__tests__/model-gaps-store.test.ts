import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readModelGaps, writeModelGaps, type ModelGap } from '../model-gaps-store';

let TEST_DIR: string;
let TEST_PATH: string;

vi.mock('@/lib/config', () => ({
  getModelGapsPath: () => TEST_PATH,
}));

function makeGap(item: string): ModelGap {
  return {
    gapItem: item,
    targetTable: 'facility_master',
    fieldsRequired: 'field_a, field_b',
    rationale: 'Test rationale',
    impactedMetrics: 'DSCR, LTV',
  };
}

beforeEach(() => {
  TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'gaps-test-'));
  TEST_PATH = path.join(TEST_DIR, 'model-gaps.json');
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('readModelGaps', () => {
  it('returns empty array when file does not exist', () => {
    expect(readModelGaps()).toEqual([]);
  });

  it('reads valid gaps', () => {
    const data = { version: 1, gaps: [makeGap('Missing LGD fields')] };
    fs.writeFileSync(TEST_PATH, JSON.stringify(data), 'utf-8');
    const result = readModelGaps();
    expect(result).toHaveLength(1);
    expect(result[0].gapItem).toBe('Missing LGD fields');
  });

  it('returns empty on malformed JSON', () => {
    fs.writeFileSync(TEST_PATH, '{ bad json', 'utf-8');
    expect(readModelGaps()).toEqual([]);
  });

  it('returns empty when gaps is not an array', () => {
    fs.writeFileSync(TEST_PATH, '{"gaps": "not-array"}', 'utf-8');
    expect(readModelGaps()).toEqual([]);
  });

  it('returns empty when gaps key is missing', () => {
    fs.writeFileSync(TEST_PATH, '{"version": 1}', 'utf-8');
    expect(readModelGaps()).toEqual([]);
  });

  it('reads multiple gaps preserving order', () => {
    const data = { version: 1, gaps: [makeGap('Gap A'), makeGap('Gap B'), makeGap('Gap C')] };
    fs.writeFileSync(TEST_PATH, JSON.stringify(data), 'utf-8');
    const result = readModelGaps();
    expect(result).toHaveLength(3);
    expect(result.map(g => g.gapItem)).toEqual(['Gap A', 'Gap B', 'Gap C']);
  });
});

describe('writeModelGaps', () => {
  it('writes gaps with version', () => {
    writeModelGaps([makeGap('Gap 1')]);
    const raw = fs.readFileSync(TEST_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe(1);
    expect(parsed.gaps[0].gapItem).toBe('Gap 1');
  });

  it('creates directory if missing', () => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    writeModelGaps([]);
    expect(fs.existsSync(TEST_PATH)).toBe(true);
  });

  it('roundtrips through read', () => {
    const gaps = [makeGap('Gap A'), makeGap('Gap B')];
    writeModelGaps(gaps);
    const result = readModelGaps();
    expect(result).toHaveLength(2);
    expect(result[0].gapItem).toBe('Gap A');
    expect(result[1].impactedMetrics).toBe('DSCR, LTV');
  });
});
