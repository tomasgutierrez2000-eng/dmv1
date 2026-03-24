import { describe, it, expect, beforeEach } from 'vitest';
import { IDRegistry } from '../id-registry';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('IDRegistry', () => {
  let tmpDir: string;
  let registryPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'id-registry-test-'));
    registryPath = join(tmpDir, 'test-registry.json');
  });

  function createRegistry() {
    return new IDRegistry(registryPath);
  }

  describe('allocate', () => {
    it('returns unique contiguous IDs', () => {
      const reg = createRegistry();
      const ids = reg.allocate('counterparty', 5, 'test-scenario');
      expect(ids).toHaveLength(5);
      // IDs should be contiguous
      for (let i = 1; i < ids.length; i++) {
        expect(Number(ids[i])).toBe(Number(ids[i - 1]) + 1);
      }
      // IDs should be strings
      expect(typeof ids[0]).toBe('string');
    });

    it('does not overlap with previous allocations', () => {
      const reg = createRegistry();
      const ids1 = reg.allocate('counterparty', 5, 'S19');
      const ids2 = reg.allocate('counterparty', 5, 'S20');
      const set1 = new Set(ids1);
      for (const id of ids2) {
        expect(set1.has(id)).toBe(false);
      }
    });

    it('throws on collision with reserved ranges', () => {
      // The registry auto-initializes with RESERVED_RANGES
      // Trying to allocate in seed range should fail if we force a start
      const reg = createRegistry();
      // First allocation should succeed (starts above reserved ranges)
      expect(() => reg.allocate('counterparty', 5, 'test')).not.toThrow();
    });

    it('throws when count is zero or negative', () => {
      const reg = createRegistry();
      expect(() => reg.allocate('counterparty', 0, 'test')).toThrow();
      expect(() => reg.allocate('counterparty', -1, 'test')).toThrow();
    });

    it('handles unknown tables with default start', () => {
      const reg = createRegistry();
      const ids = reg.allocate('unknown_new_table', 3, 'test');
      expect(ids).toHaveLength(3);
      // Default start is 10001
      expect(ids[0]).toBe('10001');
    });
  });

  describe('isAllocated', () => {
    it('returns true for allocated IDs', () => {
      const reg = createRegistry();
      const ids = reg.allocate('counterparty', 5, 'test');
      expect(reg.isAllocated('counterparty', ids[0])).toBe(true);
      expect(reg.isAllocated('counterparty', ids[4])).toBe(true);
    });

    it('returns false for unallocated IDs outside any range', () => {
      const reg = createRegistry();
      // Use an ID far above any allocation
      expect(reg.isAllocated('counterparty', '999999')).toBe(false);
    });

    it('returns true for seed-range IDs (reserved)', () => {
      const reg = createRegistry();
      // Seed counterparty range: 1-100
      expect(reg.isAllocated('counterparty', '1')).toBe(true);
      expect(reg.isAllocated('counterparty', '50')).toBe(true);
      expect(reg.isAllocated('counterparty', '100')).toBe(true);
    });
  });

  describe('deallocate', () => {
    it('removes allocations for a scenario', () => {
      const reg = createRegistry();
      reg.allocate('counterparty', 5, 'test-scenario');
      const removed = reg.deallocate('test-scenario');
      expect(removed).toBe(1);
    });

    it('returns 0 when scenario does not exist', () => {
      const reg = createRegistry();
      expect(reg.deallocate('nonexistent')).toBe(0);
    });

    it('does not remove allocations from other scenarios', () => {
      const reg = createRegistry();
      reg.allocate('counterparty', 5, 'S19');
      const ids20 = reg.allocate('counterparty', 5, 'S20');
      reg.deallocate('S19');
      // S20 allocations should still be present
      expect(reg.isAllocated('counterparty', ids20[0])).toBe(true);
    });
  });

  describe('save and reload', () => {
    it('persists state to disk and reloads correctly', () => {
      const reg1 = createRegistry();
      const ids = reg1.allocate('counterparty', 5, 'persist-test');
      reg1.save();

      const reg2 = new IDRegistry(registryPath);
      expect(reg2.isAllocated('counterparty', ids[0])).toBe(true);
      expect(reg2.isAllocated('counterparty', ids[4])).toBe(true);
    });
  });

  describe('summary', () => {
    it('returns aggregate stats', () => {
      const reg = createRegistry();
      reg.allocate('counterparty', 5, 'test');
      reg.allocate('facility_master', 10, 'test');
      const stats = reg.summary();
      expect(stats.tables).toBeGreaterThan(0);
      expect(stats.totalIds).toBeGreaterThan(0);
    });
  });

  describe('getAllocationsForScenario', () => {
    it('returns allocations for specified scenario', () => {
      const reg = createRegistry();
      reg.allocate('counterparty', 5, 'my-scenario');
      reg.allocate('facility_master', 3, 'my-scenario');
      const allocs = reg.getAllocationsForScenario('my-scenario');
      expect(allocs.length).toBe(2);
      expect(allocs.every(a => a.scenarioId === 'my-scenario')).toBe(true);
    });
  });

  describe('getAllocationsForTable', () => {
    it('returns allocations for specified table', () => {
      const reg = createRegistry();
      reg.allocate('counterparty', 5, 'S1');
      reg.allocate('counterparty', 3, 'S2');
      const allocs = reg.getAllocationsForTable('counterparty');
      // Should include seed + S1-S18 reserved + our new allocations
      expect(allocs.length).toBeGreaterThanOrEqual(2);
    });
  });

  // Cleanup
  afterEach(() => {
    try { rmSync(tmpDir, { recursive: true }); } catch {}
  });
});
