/**
 * Tests for safe collection utilities.
 */

import { safePush, safeGet } from '../v2/safe-collections';

describe('safePush', () => {
  test('pushes to existing key', () => {
    const map = new Map<string, number[]>();
    map.set('a', [1, 2]);
    safePush(map, 'a', 3);
    expect(map.get('a')).toEqual([1, 2, 3]);
  });

  test('throws on missing key with context', () => {
    const map = new Map<string, number[]>();
    map.set('a', []);
    expect(() => safePush(map, 'b', 1, 'test-context')).toThrow(
      /key "b" not found.*test-context/,
    );
  });

  test('throws on missing key without context', () => {
    const map = new Map<string, number[]>();
    expect(() => safePush(map, 'missing', 1)).toThrow(/key "missing" not found/);
  });

  test('error message includes available keys', () => {
    const map = new Map<string, number[]>();
    map.set('alpha', []);
    map.set('beta', []);
    try {
      safePush(map, 'gamma', 1);
      fail('should have thrown');
    } catch (e: any) {
      expect(e.message).toContain('alpha');
      expect(e.message).toContain('beta');
    }
  });
});

describe('safeGet', () => {
  test('returns value for existing key', () => {
    const map = new Map<string, number>();
    map.set('x', 42);
    expect(safeGet(map, 'x')).toBe(42);
  });

  test('throws on missing key', () => {
    const map = new Map<string, number>();
    expect(() => safeGet(map, 'missing')).toThrow(/key "missing" not found/);
  });

  test('throws with context', () => {
    const map = new Map<string, number>();
    expect(() => safeGet(map, 'k', 'my-context')).toThrow(/my-context/);
  });
});
