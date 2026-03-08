/**
 * GSIB Calculation Engine — DAG Types
 */

import type { MetricExecStatus } from './engine';

/** A node in the metric dependency graph */
export interface DAGNode {
  metricId: string;
  name: string;
  domain: string;
  dependsOn: string[];
  dependedOnBy: string[];
  inDegree: number;
  tier: number;
  status?: MetricExecStatus;
}

/** An edge in the dependency graph */
export interface DAGEdge {
  from: string;
  to: string;
}

/** Batch of metrics that can be executed in parallel */
export interface ExecutionBatch {
  tier: number;
  metrics: string[];
}

/** Complete execution plan produced by the DAG resolver */
export interface ExecutionPlan {
  totalMetrics: number;
  totalBatches: number;
  batches: ExecutionBatch[];
  nodes: Map<string, DAGNode>;
  edges: DAGEdge[];
  hasCycles: boolean;
  cyclePath?: string[];
}
