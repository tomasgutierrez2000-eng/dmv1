/**
 * Semantic Layer — Metric Dependency Graph
 *
 * Builds a directed acyclic graph of metric dependencies from the `depends_on` field.
 * Provides topological sort for correct calculation ordering and cycle detection.
 */

import type { SemanticMetric } from './types';

export interface DependencyNode {
  id: string;
  name: string;
  domain_id: string;
  /** Direct upstream dependencies. */
  depends_on: string[];
  /** Direct downstream dependents (metrics that depend on this one). */
  depended_by: string[];
  /** Depth in the DAG (0 = leaf with no dependencies). */
  depth: number;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  /** Topologically sorted metric IDs (safe calculation order). */
  topological_order: string[];
  /** Any cycles detected (should be empty in a valid model). */
  cycles: string[][];
  /** Total count of dependency edges. */
  edge_count: number;
}

/**
 * Build the full dependency graph from semantic metrics.
 */
export function buildDependencyGraph(metrics: SemanticMetric[]): DependencyGraph {
  // Build adjacency lists
  const dependsOn = new Map<string, Set<string>>();
  const dependedBy = new Map<string, Set<string>>();
  let edgeCount = 0;

  for (const m of metrics) {
    if (!dependsOn.has(m.id)) dependsOn.set(m.id, new Set());
    if (!dependedBy.has(m.id)) dependedBy.set(m.id, new Set());

    for (const depId of m.depends_on) {
      dependsOn.get(m.id)!.add(depId);
      if (!dependedBy.has(depId)) dependedBy.set(depId, new Set());
      dependedBy.get(depId)!.add(m.id);
      edgeCount++;
    }
  }

  const nodeIds = metrics.map(m => m.id);

  // Detect cycles via DFS
  const cycles = detectCycles(nodeIds, dependsOn);

  // Topological sort (Kahn's algorithm)
  const topoOrder = topologicalSort(nodeIds, dependsOn);

  // Compute depth for each node
  const depths = computeDepths(nodeIds, dependsOn);

  // Build nodes
  const nodes: DependencyNode[] = metrics.map(m => ({
    id: m.id,
    name: m.name,
    domain_id: m.domain_id,
    depends_on: Array.from(dependsOn.get(m.id) ?? []),
    depended_by: Array.from(dependedBy.get(m.id) ?? []),
    depth: depths.get(m.id) ?? 0,
  }));

  return {
    nodes,
    topological_order: topoOrder,
    cycles,
    edge_count: edgeCount,
  };
}

/**
 * Get the transitive closure of dependencies for a metric (all upstream).
 */
export function getTransitiveDependencies(
  metricId: string,
  metrics: SemanticMetric[],
): string[] {
  const metricMap = new Map(metrics.map(m => [m.id, m]));
  const visited = new Set<string>();

  const walk = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const m = metricMap.get(id);
    if (m) {
      for (const depId of m.depends_on) walk(depId);
    }
  };

  walk(metricId);
  visited.delete(metricId); // exclude self
  return Array.from(visited);
}

// ═══════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════

function detectCycles(nodeIds: string[], adjacency: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  const dfs = (id: string) => {
    if (inStack.has(id)) {
      // Found a cycle — extract it
      const cycleStart = path.indexOf(id);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart));
      }
      return;
    }
    if (visited.has(id)) return;

    visited.add(id);
    inStack.add(id);
    path.push(id);

    for (const dep of adjacency.get(id) ?? []) {
      dfs(dep);
    }

    path.pop();
    inStack.delete(id);
  };

  for (const id of nodeIds) {
    if (!visited.has(id)) dfs(id);
  }

  return cycles;
}

function topologicalSort(nodeIds: string[], adjacency: Map<string, Set<string>>): string[] {
  // adjacency: nodeId → Set<dependency IDs this node depends on>
  // in-degree = count of dependencies each node has (nodes with 0 deps are processed first)
  const inDegree = new Map<string, number>();
  for (const id of nodeIds) {
    inDegree.set(id, adjacency.get(id)?.size ?? 0);
  }

  // reverseAdj: depId → Set<nodes that depend on depId>
  // Used to decrement in-degree when a dependency is resolved
  const reverseAdj = new Map<string, Set<string>>();
  for (const id of nodeIds) {
    for (const dep of adjacency.get(id) ?? []) {
      if (!reverseAdj.has(dep)) reverseAdj.set(dep, new Set());
      reverseAdj.get(dep)!.add(id);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const result: string[] = [];
  let head = 0; // Index-based dequeue: O(1) vs shift()'s O(n)
  while (head < queue.length) {
    const id = queue[head++];
    result.push(id);
    // For each node that depends on `id`, reduce its in-degree
    for (const dependent of reverseAdj.get(id) ?? []) {
      const newDeg = (inDegree.get(dependent) ?? 1) - 1;
      inDegree.set(dependent, newDeg);
      if (newDeg === 0) queue.push(dependent);
    }
  }

  return result;
}

function computeDepths(nodeIds: string[], adjacency: Map<string, Set<string>>): Map<string, number> {
  const depths = new Map<string, number>();
  const memo = new Map<string, number>();

  const getDepth = (id: string, visited: Set<string>): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (visited.has(id)) return 0; // cycle protection
    visited.add(id);

    const deps = adjacency.get(id);
    if (!deps || deps.size === 0) {
      memo.set(id, 0);
      return 0;
    }

    let maxDepth = 0;
    for (const dep of deps) {
      maxDepth = Math.max(maxDepth, getDepth(dep, visited) + 1);
    }
    memo.set(id, maxDepth);
    return maxDepth;
  };

  for (const id of nodeIds) {
    depths.set(id, getDepth(id, new Set()));
  }

  return depths;
}
