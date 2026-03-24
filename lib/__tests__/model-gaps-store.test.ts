import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { readModelGaps, writeModelGaps, type ModelGap } from '../model-gaps-store';

const TEST_DIR = '/tmp/test-model-gaps';
const TEST_PATH = path.join(TEST_DIR, 'model-gaps.json');

vi.mock('@/lib/config', () => ({
  getModelGapsPath: () => '/tmp/test-model-gaps/model-gaps.json',
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
  if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(TEST_PATH)) fs.unlinkSync(TEST_PATH);
  try { fs.rmSync(TEST_DIR, { recursive: true }); } catch { /* ok */ }
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
    if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true });
    writeModelGaps([]);
    expect(fs.existsSync(TEST_PATH)).toBe(true);
  });
});
