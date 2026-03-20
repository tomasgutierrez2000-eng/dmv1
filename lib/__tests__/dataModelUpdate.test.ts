import { describe, it, expect } from 'vitest';
import {
  buildDependencyGraph,
  getTableImpact,
  getImpactedTables,
  getSuggestedRemovalOrder,
  validateReferentialIntegrity,
} from '../dataModelUpdate';
import type { DataModel, Relationship } from '@/types/model';

// ─── Test helpers ────────────────────────────────────────────────────────

function rel(source: string, target: string, sourceField = 'fk_id', targetField = 'id'): Relationship {
  return {
    id: `${source}->${target}`,
    source: { tableKey: source, field: sourceField },
    target: { tableKey: target, field: targetField },
  } as Relationship;
}

function model(tableKeys: string[], relationships: Relationship[]): DataModel {
  const tables: Record<string, unknown> = {};
  for (const key of tableKeys) {
    tables[key] = { key, name: key, fields: [] };
  }
  return { tables, relationships } as unknown as DataModel;
}

// ─── buildDependencyGraph ─────────────────────────────────────────────

describe('buildDependencyGraph', () => {
  it('builds outgoing and incoming edge maps', () => {
    const rels = [rel('A', 'B'), rel('A', 'C'), rel('D', 'B')];
    const { outgoingByTable, incomingByTable } = buildDependencyGraph(rels);

    expect(outgoingByTable.get('A')).toHaveLength(2);
    expect(outgoingByTable.get('D')).toHaveLength(1);
    expect(incomingByTable.get('B')).toHaveLength(2);
    expect(incomingByTable.get('C')).toHaveLength(1);
  });

  it('returns empty maps for no relationships', () => {
    const { outgoingByTable, incomingByTable } = buildDependencyGraph([]);
    expect(outgoingByTable.size).toBe(0);
    expect(incomingByTable.size).toBe(0);
  });
});

// ─── getTableImpact ───────────────────────────────────────────────────

describe('getTableImpact', () => {
  const rels = [rel('child1', 'parent'), rel('child2', 'parent'), rel('parent', 'grandparent')];
  const m = model(['child1', 'child2', 'parent', 'grandparent'], rels);

  it('finds dependents (who references this table)', () => {
    const impact = getTableImpact(m, 'parent');
    expect(impact.dependents).toContain('child1');
    expect(impact.dependents).toContain('child2');
  });

  it('finds dependencies (what this table references)', () => {
    const impact = getTableImpact(m, 'parent');
    expect(impact.dependencies).toContain('grandparent');
  });

  it('deduplicates results', () => {
    const dupeRels = [rel('A', 'B', 'fk1'), rel('A', 'B', 'fk2')];
    const dm = model(['A', 'B'], dupeRels);
    const impact = getTableImpact(dm, 'B');
    expect(impact.dependents).toHaveLength(1);
    expect(impact.incomingEdges).toHaveLength(2);
  });

  it('returns empty arrays for isolated table', () => {
    const impact = getTableImpact(m, 'child1');
    expect(impact.dependents).toHaveLength(0);
    expect(impact.dependencies).toHaveLength(1);
  });
});

// ─── getImpactedTables ────────────────────────────────────────────────

describe('getImpactedTables', () => {
  it('returns tables that reference the removed tables', () => {
    const rels = [rel('A', 'B'), rel('C', 'B'), rel('D', 'A')];
    const m = model(['A', 'B', 'C', 'D'], rels);
    const impacted = getImpactedTables(m, ['B']);
    expect(impacted).toContain('A');
    expect(impacted).toContain('C');
    expect(impacted).not.toContain('D');
  });

  it('handles multiple tables removed at once', () => {
    const rels = [rel('A', 'B'), rel('C', 'D')];
    const m = model(['A', 'B', 'C', 'D'], rels);
    const impacted = getImpactedTables(m, ['B', 'D']);
    expect(impacted).toContain('A');
    expect(impacted).toContain('C');
  });

  it('returns empty for no dependents', () => {
    const rels = [rel('A', 'B')];
    const m = model(['A', 'B'], rels);
    expect(getImpactedTables(m, ['A'])).toHaveLength(0);
  });
});

// ─── getSuggestedRemovalOrder ──────────────────────────────────────────

describe('getSuggestedRemovalOrder', () => {
  it('removes dependents before parents (topological order)', () => {
    const rels = [rel('child', 'parent'), rel('parent', 'grandparent')];
    const m = model(['child', 'parent', 'grandparent'], rels);
    const order = getSuggestedRemovalOrder(m, ['child', 'parent', 'grandparent']);
    const childIdx = order.indexOf('child');
    const parentIdx = order.indexOf('parent');
    const grandIdx = order.indexOf('grandparent');
    expect(childIdx).toBeLessThan(parentIdx);
    expect(parentIdx).toBeLessThan(grandIdx);
  });

  it('handles diamond dependency', () => {
    // A -> B, A -> C, B -> D, C -> D
    const rels = [rel('A', 'B'), rel('A', 'C'), rel('B', 'D'), rel('C', 'D')];
    const m = model(['A', 'B', 'C', 'D'], rels);
    const order = getSuggestedRemovalOrder(m, ['A', 'B', 'C', 'D']);
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('C'));
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('D'));
  });

  it('only includes requested tables', () => {
    const rels = [rel('A', 'B'), rel('B', 'C')];
    const m = model(['A', 'B', 'C'], rels);
    const order = getSuggestedRemovalOrder(m, ['A', 'B']);
    expect(order).toHaveLength(2);
    expect(order).not.toContain('C');
  });
});

// ─── validateReferentialIntegrity ─────────────────────────────────────

describe('validateReferentialIntegrity', () => {
  it('returns valid for complete model', () => {
    const rels = [rel('A', 'B')];
    const m = model(['A', 'B'], rels);
    const result = validateReferentialIntegrity(m);
    expect(result.valid).toBe(true);
    expect(result.orphaned).toHaveLength(0);
  });

  it('detects orphaned FK references', () => {
    const rels = [rel('A', 'B'), rel('A', 'MISSING')];
    const m = model(['A', 'B'], rels);
    const result = validateReferentialIntegrity(m);
    expect(result.valid).toBe(false);
    expect(result.orphaned).toHaveLength(1);
    expect(result.orphaned[0].targetTableKey).toBe('MISSING');
  });

  it('handles empty model', () => {
    const m = model([], []);
    const result = validateReferentialIntegrity(m);
    expect(result.valid).toBe(true);
  });
});
