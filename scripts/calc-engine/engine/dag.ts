/**
 * GSIB Calculation Engine — DAG Builder & Topological Sort
 *
 * Builds a directed acyclic graph from metric depends_on fields,
 * detects cycles, and produces an execution plan with parallel batches.
 */

import type { MetricDefinition } from '../types';
import type { DAGNode, DAGEdge, ExecutionBatch, ExecutionPlan } from '../types/dag';

/**
 * Build an execution plan from metric definitions.
 *
 * @param metrics - All loaded metric definitions
 * @param filter - Optional subset of metric_ids to execute (transitive deps are pulled in)
 * @returns ExecutionPlan with ordered batches
 */
export function buildExecutionPlan(
  metrics: MetricDefinition[],
  filter?: string[]
): ExecutionPlan {
  const metricMap = new Map(metrics.map((m) => [m.metric_id, m]));

  // If filter specified, resolve transitive dependencies
  let targetIds: Set<string>;
  if (filter && filter.length > 0) {
    targetIds = resolveTransitiveDeps(filter, metricMap);
  } else {
    targetIds = new Set(metrics.map((m) => m.metric_id));
  }

  // Build nodes and edges
  const nodes = new Map<string, DAGNode>();
  const edges: DAGEdge[] = [];

  for (const id of targetIds) {
    const m = metricMap.get(id);
    if (!m) continue;

    nodes.set(id, {
      metricId: id,
      name: m.name,
      domain: m.domain,
      dependsOn: m.depends_on.filter((d) => targetIds.has(d)),
      dependedOnBy: [],
      inDegree: 0,
      tier: -1,
    });
  }

  // Build edges and reverse references
  for (const [id, node] of nodes) {
    for (const depId of node.dependsOn) {
      edges.push({ from: depId, to: id });
      const depNode = nodes.get(depId);
      if (depNode) {
        depNode.dependedOnBy.push(id);
      }
      node.inDegree++;
    }
  }

  // Cycle detection using DFS with coloring
  const cyclePath = detectCycles(nodes);
  if (cyclePath) {
    return {
      totalMetrics: nodes.size,
      totalBatches: 0,
      batches: [],
      nodes,
      edges,
      hasCycles: true,
      cyclePath,
    };
  }

  // Topological sort using Kahn's algorithm, grouping into parallel batches
  const batches = topologicalSort(nodes);

  return {
    totalMetrics: nodes.size,
    totalBatches: batches.length,
    batches,
    nodes,
    edges,
    hasCycles: false,
  };
}

/**
 * Resolve transitive dependencies for a set of target metric IDs.
 */
function resolveTransitiveDeps(
  targetIds: string[],
  metricMap: Map<string, MetricDefinition>
): Set<string> {
  const result = new Set<string>();
  const stack = [...targetIds];

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (result.has(id)) continue;

    const m = metricMap.get(id);
    if (!m) continue;

    result.add(id);
    for (const depId of m.depends_on) {
      if (!result.has(depId)) {
        stack.push(depId);
      }
    }
  }

  return result;
}

type Color = 'WHITE' | 'GRAY' | 'BLACK';

/**
 * Detect cycles using DFS with 3-color marking.
 * Returns the cycle path if found, null otherwise.
 */
function detectCycles(nodes: Map<string, DAGNode>): string[] | null {
  const color = new Map<string, Color>();
  const parent = new Map<string, string | null>();

  for (const id of nodes.keys()) {
    color.set(id, 'WHITE');
    parent.set(id, null);
  }

  for (const id of nodes.keys()) {
    if (color.get(id) === 'WHITE') {
      const cycle = dfs(id, nodes, color, parent);
      if (cycle) return cycle;
    }
  }

  return null;
}

function dfs(
  nodeId: string,
  nodes: Map<string, DAGNode>,
  color: Map<string, Color>,
  parent: Map<string, string | null>
): string[] | null {
  color.set(nodeId, 'GRAY');
  const node = nodes.get(nodeId);
  if (!node) return null;

  // Visit neighbors (nodes that depend ON this node)
  for (const neighborId of node.dependedOnBy) {
    const neighborColor = color.get(neighborId);
    if (neighborColor === 'GRAY') {
      // Found a cycle — reconstruct path
      const path = [neighborId, nodeId];
      let current = parent.get(nodeId);
      while (current && current !== neighborId) {
        path.push(current);
        current = parent.get(current);
      }
      path.push(neighborId);
      return path.reverse();
    }
    if (neighborColor === 'WHITE') {
      parent.set(neighborId, nodeId);
      const cycle = dfs(neighborId, nodes, color, parent);
      if (cycle) return cycle;
    }
  }

  color.set(nodeId, 'BLACK');
  return null;
}

/**
 * Topological sort using Kahn's algorithm.
 * Groups nodes with the same tier into parallel execution batches.
 */
function topologicalSort(nodes: Map<string, DAGNode>): ExecutionBatch[] {
  // Track remaining in-degree for each node
  const remaining = new Map<string, number>();
  for (const [id, node] of nodes) {
    remaining.set(id, node.inDegree);
  }

  // Start with nodes that have no dependencies
  let currentBatch: string[] = [];
  for (const [id, deg] of remaining) {
    if (deg === 0) {
      currentBatch.push(id);
    }
  }

  const batches: ExecutionBatch[] = [];
  let tier = 0;

  while (currentBatch.length > 0) {
    // Assign tier to nodes in current batch
    for (const id of currentBatch) {
      const node = nodes.get(id);
      if (node) node.tier = tier;
    }

    batches.push({
      tier,
      metrics: [...currentBatch].sort(),
    });

    // Find next batch by removing current batch from graph
    const nextBatch: string[] = [];
    for (const id of currentBatch) {
      const node = nodes.get(id);
      if (!node) continue;
      for (const dependentId of node.dependedOnBy) {
        const deg = (remaining.get(dependentId) ?? 1) - 1;
        remaining.set(dependentId, deg);
        if (deg === 0) {
          nextBatch.push(dependentId);
        }
      }
    }

    currentBatch = nextBatch;
    tier++;
  }

  return batches;
}

/**
 * Format execution plan as ASCII for display.
 */
export function formatExecutionPlanAscii(plan: ExecutionPlan): string {
  if (plan.hasCycles) {
    return `ERROR: Cycle detected in dependency graph: ${plan.cyclePath?.join(' → ')}`;
  }

  if (plan.totalMetrics === 0) {
    return 'No metrics to execute.';
  }

  const lines: string[] = [
    `Execution Plan: ${plan.totalMetrics} metrics in ${plan.totalBatches} batches`,
    '',
  ];

  for (const batch of plan.batches) {
    lines.push(`  Tier ${batch.tier} (${batch.metrics.length} metrics, parallel):`);
    for (const id of batch.metrics) {
      const node = plan.nodes.get(id);
      const deps = node?.dependsOn.length
        ? ` ← depends on: ${node.dependsOn.join(', ')}`
        : '';
      lines.push(`    ${id} — ${node?.name ?? '?'}${deps}`);
    }
  }

  return lines.join('\n');
}

/**
 * Export execution plan as DOT format for Graphviz visualization.
 */
export function formatExecutionPlanDot(plan: ExecutionPlan): string {
  const lines: string[] = ['digraph calc_engine {', '  rankdir=TB;', '  node [shape=box];', ''];

  for (const batch of plan.batches) {
    lines.push(`  subgraph cluster_tier_${batch.tier} {`);
    lines.push(`    label="Tier ${batch.tier}";`);
    for (const id of batch.metrics) {
      const node = plan.nodes.get(id);
      lines.push(`    "${id}" [label="${id}\\n${node?.name ?? ''}"];`);
    }
    lines.push('  }');
  }

  lines.push('');
  for (const edge of plan.edges) {
    lines.push(`  "${edge.from}" -> "${edge.to}";`);
  }

  lines.push('}');
  return lines.join('\n');
}
