import { describe, it, expect } from 'vitest';
import {
  mulberry32, hashStr, seededRng, pick, range, intRange,
  clamp, seededShuffle, round,
} from '../v2/prng';

describe('mulberry32', () => {
  it('produces deterministic output for the same seed', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it('produces different output for different seeds', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(43);
    const v1 = rng1();
    const v2 = rng2();
    expect(v1).not.toBe(v2);
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('produces values with reasonable distribution (no clustering)', () => {
    const rng = mulberry32(99);
    const buckets = [0, 0, 0, 0, 0]; // 5 buckets
    for (let i = 0; i < 5000; i++) {
      const v = rng();
      buckets[Math.floor(v * 5)]++;
    }
    // Each bucket should have roughly 1000 values (allow 40% deviation)
    for (const count of buckets) {
      expect(count).toBeGreaterThan(600);
      expect(count).toBeLessThan(1400);
    }
  });
});

describe('hashStr', () => {
  it('produces same hash for same string', () => {
    expect(hashStr('hello')).toBe(hashStr('hello'));
  });

  it('produces different hashes for different strings', () => {
    expect(hashStr('hello')).not.toBe(hashStr('world'));
  });

  it('returns a number (integer)', () => {
    const h = hashStr('test');
    expect(typeof h).toBe('number');
    expect(Number.isInteger(h)).toBe(true);
  });

  it('handles empty string', () => {
    expect(hashStr('')).toBe(0);
  });
});

describe('seededRng', () => {
  it('produces consistent sequence for same key', () => {
    const rng1 = seededRng('my-key');
    const rng2 = seededRng('my-key');
    expect(Array.from({ length: 5 }, () => rng1())).toEqual(
      Array.from({ length: 5 }, () => rng2()),
    );
  });

  it('produces different sequences for different keys', () => {
    const rng1 = seededRng('key-a');
    const rng2 = seededRng('key-b');
    expect(rng1()).not.toBe(rng2());
  });
});

describe('pick', () => {
  it('returns an element from the array', () => {
    const rng = mulberry32(1);
    const arr = ['a', 'b', 'c', 'd', 'e'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(pick(rng, arr));
    }
  });

  it('eventually picks different elements', () => {
    const rng = mulberry32(7);
    const arr = [1, 2, 3, 4, 5];
    const picked = new Set<number>();
    for (let i = 0; i < 100; i++) {
      picked.add(pick(rng, arr));
    }
    expect(picked.size).toBeGreaterThan(1);
  });
});

describe('range', () => {
  it('produces values in [min, max)', () => {
    const rng = mulberry32(10);
    for (let i = 0; i < 1000; i++) {
      const v = range(rng, 5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(10);
    }
  });

  it('works with negative ranges', () => {
    const rng = mulberry32(20);
    const v = range(rng, -10, -5);
    expect(v).toBeGreaterThanOrEqual(-10);
    expect(v).toBeLessThan(-5);
  });
});

describe('intRange', () => {
  it('produces integers in [min, max] inclusive', () => {
    const rng = mulberry32(30);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = intRange(rng, 1, 5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    // Should eventually hit all values
    expect(seen.size).toBe(5);
  });
});

describe('round', () => {
  it('rounds to specified decimal places', () => {
    expect(round(3.14159, 2)).toBe(3.14);
    expect(round(3.14159, 4)).toBe(3.1416);
    expect(round(3.14159, 0)).toBe(3);
  });
});

describe('clamp', () => {
  it('returns value when within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('handles boundary values', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('seededShuffle', () => {
  it('produces deterministic result for same seed', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const s1 = seededShuffle(mulberry32(42), arr);
    const s2 = seededShuffle(mulberry32(42), arr);
    expect(s1).toEqual(s2);
  });

  it('produces a valid permutation (same elements)', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = seededShuffle(mulberry32(99), arr);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3];
    const original = [...arr];
    seededShuffle(mulberry32(5), arr);
    expect(arr).toEqual(original);
  });

  it('actually reorders elements', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = seededShuffle(mulberry32(77), arr);
    // Very unlikely to be in the same order
    expect(shuffled).not.toEqual(arr);
  });

  it('handles empty array', () => {
    expect(seededShuffle(mulberry32(1), [])).toEqual([]);
  });

  it('handles single-element array', () => {
    expect(seededShuffle(mulberry32(1), [42])).toEqual([42]);
  });
});
