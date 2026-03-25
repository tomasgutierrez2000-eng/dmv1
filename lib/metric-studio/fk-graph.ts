/**
 * FK Graph — builds a foreign key adjacency graph from the data dictionary
 * and provides BFS shortest-path / DFS all-paths algorithms for JOIN inference.
 *
 * Used by formula-composer.ts to auto-connect tables dragged onto the canvas.
 *
 * Key design decisions (from outside voice review):
 * - Uses BARE table names (e.g. "facility_master"), not schema-qualified
 * - Schema prefix ("l1."/"l2."/"l3.") added only during SQL generation
 * - Self-referencing FKs filtered out to prevent BFS infinite loops
 * - Visited-set guard in BFS for additional cycle protection
 */

import type { FKEdge } from './types';
import type { DataDictionaryRelationship } from '@/lib/data-dictionary';

/** Adjacency list: table name → outgoing FK edges. Bidirectional. */
export type FKGraph = Map<string, FKEdge[]>;

/**
 * Build an FK adjacency graph from data dictionary relationships.
 * Creates bidirectional edges (A→B and B→A) for each FK constraint.
 * Filters out self-referencing FKs (where from_table === to_table).
 */
export function buildFKGraph(relationships: DataDictionaryRelationship[]): FKGraph {
  const graph: FKGraph = new Map();

  for (const rel of relationships) {
    // Skip self-referencing FKs (e.g., EBT parent_segment_id → managed_segment_id)
    if (rel.from_table === rel.to_table) continue;

    const edge: FKEdge = {
      fromTable: rel.from_table,
      fromColumn: rel.from_field,
      fromLayer: rel.from_layer.toLowerCase(),
      toTable: rel.to_table,
      toColumn: rel.to_field,
      toLayer: rel.to_layer.toLowerCase(),
    };

    // Forward edge: from → to
    const fwd = graph.get(rel.from_table) ?? [];
    fwd.push(edge);
    graph.set(rel.from_table, fwd);

    // Reverse edge: to → from (for bidirectional traversal)
    const rev: FKEdge = {
      fromTable: rel.to_table,
      fromColumn: rel.to_field,
      fromLayer: rel.to_layer.toLowerCase(),
      toTable: rel.from_table,
      toColumn: rel.from_field,
      toLayer: rel.from_layer.toLowerCase(),
    };
    const bwd = graph.get(rel.to_table) ?? [];
    bwd.push(rev);
    graph.set(rel.to_table, bwd);
  }

  return graph;
}

/**
 * BFS shortest path between two tables in the FK graph.
 * Returns the path as an array of FKEdge, or null if no path exists.
 */
export function findShortestPath(
  graph: FKGraph,
  from: string,
  to: string,
): FKEdge[] | null {
  if (from === to) return [];

  const visited = new Set<string>([from]);
  // Queue entries: [currentTable, pathSoFar]
  const queue: Array<[string, FKEdge[]]> = [[from, []]];

  while (queue.length > 0) {
    const [current, path] = queue.shift()!;
    const neighbors = graph.get(current) ?? [];

    for (const edge of neighbors) {
      const next = edge.toTable;
      if (visited.has(next)) continue;
      visited.add(next);

      const newPath = [...path, edge];
      if (next === to) return newPath;
      queue.push([next, newPath]);
    }
  }

  return null; // No path found
}

/**
 * DFS to find ALL paths between two tables, up to a max depth.
 * Returns paths sorted shortest-first.
 * Used for FK disambiguation when multiple paths exist.
 */
export function findAllPaths(
  graph: FKGraph,
  from: string,
  to: string,
  maxDepth: number = 4,
): FKEdge[][] {
  const results: FKEdge[][] = [];

  function dfs(current: string, path: FKEdge[], visited: Set<string>): void {
    if (path.length > maxDepth) return;
    if (current === to) {
      results.push([...path]);
      return;
    }

    const neighbors = graph.get(current) ?? [];
    for (const edge of neighbors) {
      const next = edge.toTable;
      if (visited.has(next)) continue;
      visited.add(next);
      path.push(edge);
      dfs(next, path, visited);
      path.pop();
      visited.delete(next);
    }
  }

  const visited = new Set<string>([from]);
  dfs(from, [], visited);

  // Sort shortest-first
  results.sort((a, b) => a.length - b.length);
  return results;
}

/**
 * Generate a human-readable JOIN condition string from an FK edge.
 * E.g., "fm.counterparty_id = c.counterparty_id"
 */
export function edgeToJoinCondition(edge: FKEdge): string {
  const fromAlias = abbreviateTable(edge.fromTable);
  const toAlias = abbreviateTable(edge.toTable);
  return `${fromAlias}.${edge.fromColumn} = ${toAlias}.${edge.toColumn}`;
}

/**
 * Generate a short alias for a table name.
 * E.g., "facility_exposure_snapshot" → "fes"
 */
export function abbreviateTable(tableName: string): string {
  const parts = tableName.split('_');
  if (parts.length === 1) return tableName.slice(0, 3);
  // Take first letter of each word, up to 4 chars
  return parts.map(p => p[0]).join('').slice(0, 4);
}

/**
 * Format a path as a human-readable string for disambiguation UI.
 * E.g., "facility_master → credit_agreement_master → counterparty"
 */
export function pathToString(path: FKEdge[]): string {
  if (path.length === 0) return '(direct)';
  const tables = [path[0].fromTable, ...path.map(e => e.toTable)];
  return tables.join(' → ');
}
