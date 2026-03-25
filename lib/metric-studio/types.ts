/**
 * Metric Studio IDE — Shared type definitions.
 *
 * Used across all Studio modules: FK graph, formula composer,
 * canvas state, custom nodes, and API routes.
 */

import type { Node, Edge } from '@xyflow/react';

// ─── Drag-and-Drop ────────────────────────────────────────────

/** Payload attached to dataTransfer during palette → canvas DnD. */
export interface StudioDragPayload {
  type: 'field' | 'table' | 'template';
  layer?: 'l1' | 'l2' | 'l3';
  tableName?: string;
  fieldName?: string;
  metricId?: string;
}

// ─── FK Graph ─────────────────────────────────────────────────

/** A single foreign key edge in the FK graph. Uses bare table names. */
export interface FKEdge {
  fromTable: string;
  fromColumn: string;
  fromLayer: string;
  toTable: string;
  toColumn: string;
  toLayer: string;
}

/** User's choice when multiple FK paths exist between two tables. */
export interface FKPathChoice {
  path: FKEdge[];
  userSelected: boolean;
}

// ─── Formula Composition ──────────────────────────────────────

export type AggregationFn = 'SUM' | 'AVG' | 'COUNT' | 'COUNT_DISTINCT' | 'MIN' | 'MAX';

/** A single field dragged onto the canvas with its composition metadata. */
export interface ComposedField {
  table: string;
  field: string;
  layer: 'l1' | 'l2' | 'l3';
  aggregation?: AggregationFn | null;
  joinPath?: FKPathChoice;
}

/** One step in the SQL debugger's progressive execution. */
export interface SQLStep {
  order: number;
  type: 'from' | 'join' | 'where' | 'group_by' | 'select';
  sql: string;
  description: string;
  tables: string[];
}

/** Result of composing SQL from dragged fields. */
export interface ComposedFormula {
  sql: string;
  steps: SQLStep[];
  valid: boolean;
  error?: string;
  sourceTables: string[];
}

// ─── Semantic Zoom ────────────────────────────────────────────

/** Three zoom levels for progressive disclosure. */
export type ZoomLevel = 'cro' | 'analyst' | 'validator';

// ─── Canvas Node Data ─────────────────────────────────────────

/** Data payload for TableNode (source table on the canvas). */
export interface TableNodeData {
  type: 'table';
  tableName: string;
  layer: 'l1' | 'l2' | 'l3';
  fields: string[];
  selectedFields: string[];
  rowCount?: number;
  sampleRows?: Record<string, unknown>[];
  zoomLevel: ZoomLevel;
  [key: string]: unknown;
}

/** Data payload for TransformNode (JOIN/GROUP/COMPUTE operation). */
export interface TransformNodeData {
  type: 'transform';
  operation: 'join' | 'group_by' | 'aggregate';
  label: string;
  condition?: string;
  aggregation?: AggregationFn;
  fieldName?: string;
  inputRowCount?: number;
  outputRowCount?: number;
  zoomLevel: ZoomLevel;
  [key: string]: unknown;
}

/** Data payload for OutputNode (final metric result). */
export interface OutputNodeData {
  type: 'output';
  metricName: string;
  value?: number | string | null;
  formattedValue?: string;
  unitType?: 'percentage' | 'currency' | 'ratio' | 'count' | 'days';
  trend?: { direction: 'up' | 'down' | 'flat'; delta?: string };
  asOfDate?: string;
  zoomLevel: ZoomLevel;
  [key: string]: unknown;
}

/** Data payload for DestinationNode (L3 table where metric results land). */
export interface DestinationNodeData {
  type: 'destination';
  tableName: string;
  layer: 'l3';
  targetColumn?: string;
  fields: Array<{ name: string; dataType?: string }>;
  category?: string;
  description?: string;
  isGhost?: boolean;
  zoomLevel: ZoomLevel;
  [key: string]: unknown;
}

export type StudioNodeData = TableNodeData | TransformNodeData | OutputNodeData | DestinationNodeData;
export type StudioNode = Node<StudioNodeData>;

/** Edge flow types for layer-aware styling. */
export type EdgeFlowType = 'dim-lookup' | 'source' | 'output';
export type StudioEdge = Edge<{ rowCount?: number; label?: string; flowType?: EdgeFlowType }>;

// ─── Execution ────────────────────────────────────────────────

export type ExecutionMode = 'sqljs' | 'postgresql';

export interface ExecutionSuccess {
  ok: true;
  rows: Record<string, unknown>[];
  rowCount: number;
  durationMs: number;
  warnings?: string[];
}

export interface ExecutionError {
  ok: false;
  error: string;
  code?: string;
}

export type ExecutionResult = ExecutionSuccess | ExecutionError;

// ─── API Request/Response ─────────────────────────────────────

/** POST /api/metrics/studio/execute */
export interface StudioExecuteRequest {
  formula_sql: string;
  source_tables: string[];
  execution_mode: ExecutionMode;
}

export interface StudioExecuteResponse {
  ok: true;
  result: ExecutionSuccess;
  steps?: SQLStep[];
}

/** Field info returned by the schema API. */
export interface StudioSchemaField {
  name: string;
  dataType?: string;
  description?: string;
  isPk?: boolean;
  fkTarget?: { layer: string; table: string; field: string };
}

/** Table info returned by the schema API. L3 tables have fields omitted (lazy-loaded). */
export interface StudioSchemaTable {
  name: string;
  layer: 'l1' | 'l2' | 'l3';
  category: string;
  fields: StudioSchemaField[];
}

/** GET /api/metrics/studio/schema */
export interface StudioSchemaResponse {
  tables: StudioSchemaTable[];
  relationships: Array<FKEdge>;
}

/** GET /api/metrics/studio/template?metricId=X */
export interface StudioTemplateResponse {
  metricId: string;
  metricName: string;
  formulaSQL: string;
  nodes: StudioNode[];
  edges: StudioEdge[];
  l3Destination?: { table: string; column?: string };
}
