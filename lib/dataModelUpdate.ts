/**
 * Data model update module: impact analysis and cascading change support.
 * Use when changing or removing tables/fields so dependent tables and sample data stay consistent.
 */
import type { DataModel, Relationship } from '@/types/model';

export interface DependencyEdge {
  sourceTableKey: string;
  targetTableKey: string;
  sourceField: string;
  targetField: string;
  relationshipId: string;
}

export interface ImpactResult {
  /** Tables that reference the given table (depend on it) */
  dependents: string[];
  /** Tables that the given table references (its dependencies) */
  dependencies: string[];
  /** All relationship edges where source references target */
  incomingEdges: DependencyEdge[];
  /** All relationship edges where source is the table and target is a dependency */
  outgoingEdges: DependencyEdge[];
}

/**
 * Build a map: tableKey -> list of relationship edges where source.tableKey = tableKey (outgoing).
 * And reverse: tableKey -> list of edges where target.tableKey = tableKey (incoming).
 */
export function buildDependencyGraph(relationships: Relationship[]): {
  outgoingByTable: Map<string, DependencyEdge[]>;
  incomingByTable: Map<string, DependencyEdge[]>;
} {
  const outgoingByTable = new Map<string, DependencyEdge[]>();
  const incomingByTable = new Map<string, DependencyEdge[]>();

  for (const r of relationships) {
    const edge: DependencyEdge = {
      sourceTableKey: r.source.tableKey,
      targetTableKey: r.target.tableKey,
      sourceField: r.source.field,
      targetField: r.target.field,
      relationshipId: r.id,
    };
    const out = outgoingByTable.get(r.source.tableKey) ?? [];
    out.push(edge);
    outgoingByTable.set(r.source.tableKey, out);
    const inc = incomingByTable.get(r.target.tableKey) ?? [];
    inc.push(edge);
    incomingByTable.set(r.target.tableKey, inc);
  }
  return { outgoingByTable, incomingByTable };
}

/**
 * Get impact of a table: who depends on it (incoming) and what it depends on (outgoing).
 */
export function getTableImpact(
  model: DataModel,
  tableKey: string
): ImpactResult {
  const { outgoingByTable, incomingByTable } = buildDependencyGraph(model.relationships);
  const dependents = (incomingByTable.get(tableKey) ?? []).map((e) => e.sourceTableKey);
  const dependencies = (outgoingByTable.get(tableKey) ?? []).map((e) => e.targetTableKey);
  return {
    dependents: [...new Set(dependents)],
    dependencies: [...new Set(dependencies)],
    incomingEdges: incomingByTable.get(tableKey) ?? [],
    outgoingEdges: outgoingByTable.get(tableKey) ?? [],
  };
}

/**
 * Get impact of removing or changing multiple tables.
 * Returns all tables that would have broken references (dependents of any of the removed tables).
 */
export function getImpactedTables(
  model: DataModel,
  tableKeysToRemoveOrChange: string[]
): string[] {
  const { incomingByTable } = buildDependencyGraph(model.relationships);
  const removedSet = new Set(tableKeysToRemoveOrChange);
  const impacted = new Set<string>();
  for (const tableKey of tableKeysToRemoveOrChange) {
    for (const edge of incomingByTable.get(tableKey) ?? []) {
      impacted.add(edge.sourceTableKey);
    }
  }
  return [...impacted];
}

/**
 * Suggested order to remove tables so FKs are not violated (remove dependents first).
 * Returns tableKeys in an order such that if you remove in this order, no table references a removed table.
 */
export function getSuggestedRemovalOrder(model: DataModel, tableKeys: string[]): string[] {
  const { outgoingByTable } = buildDependencyGraph(model.relationships);
  const set = new Set(tableKeys);
  const order: string[] = [];
  const visited = new Set<string>();

  function visit(key: string) {
    if (visited.has(key) || !set.has(key)) return;
    visited.add(key);
    for (const edge of outgoingByTable.get(key) ?? []) {
      if (set.has(edge.targetTableKey)) visit(edge.targetTableKey);
    }
    order.push(key);
  }

  for (const key of tableKeys) visit(key);
  return order.reverse();
}

/**
 * Validate that all FK targets exist in the model (no orphaned references).
 */
export function validateReferentialIntegrity(model: DataModel): {
  valid: boolean;
  orphaned: Array<{ sourceTableKey: string; sourceField: string; targetTableKey: string }>;
} {
  const tableKeys = new Set(Object.keys(model.tables));
  const orphaned: Array<{ sourceTableKey: string; sourceField: string; targetTableKey: string }> = [];
  for (const r of model.relationships) {
    if (!tableKeys.has(r.target.tableKey)) {
      orphaned.push({
        sourceTableKey: r.source.tableKey,
        sourceField: r.source.field,
        targetTableKey: r.target.tableKey,
      });
    }
  }
  return { valid: orphaned.length === 0, orphaned };
}
