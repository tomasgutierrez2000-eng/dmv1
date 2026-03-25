/**
 * Metric Studio — Standalone Zustand store.
 *
 * Manages canvas state: nodes, edges, formula composition, execution results.
 * Standalone (not extending modelStore) per eng review decision #5.
 * Uses plain objects (not Maps) for future localStorage serialization.
 */

import { create } from 'zustand';
import type {
  StudioNode,
  StudioEdge,
  StudioDragPayload,
  ComposedField,
  ZoomLevel,
  ExecutionMode,
  ExecutionResult,
  FKEdge,
  StudioSchemaResponse,
  TableNodeData,
} from './types';
import { composeSQL } from './formula-composer';
import { buildFKGraph, findShortestPath, findAllPaths } from './fk-graph';
import type { DataDictionaryRelationship } from '@/lib/data-dictionary';

interface StudioState {
  // Schema (loaded from API)
  schema: StudioSchemaResponse | null;
  schemaLoading: boolean;
  schemaError: string | null;

  // Canvas
  nodes: StudioNode[];
  edges: StudioEdge[];
  selectedNodeId: string | null;
  zoomLevel: ZoomLevel;

  // Composition
  composedFields: ComposedField[];
  formulaSQL: string;
  formulaValid: boolean;
  formulaError: string | null;

  // Execution
  executionMode: ExecutionMode;
  executionResult: ExecutionResult | null;
  nodeDataCache: Record<string, { rows: Record<string, unknown>[]; rowCount: number }>;
  isExecuting: boolean;

  // Debugger
  debugStepIndex: number;
  debugStepCount: number;

  // Actions
  loadSchema: () => Promise<void>;
  addFieldToCanvas: (payload: StudioDragPayload, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  executeFormula: () => Promise<void>;
  loadMetricTemplate: (metricId: string) => Promise<void>;
  autoLayout: () => void;
  setSelectedNode: (nodeId: string | null) => void;
  setZoomLevel: (level: ZoomLevel) => void;
  setExecutionMode: (mode: ExecutionMode) => void;
  setDebugStep: (step: number) => void;
  clearCanvas: () => void;
  updateNodeZoomLevels: (level: ZoomLevel) => void;
}

let nextNodeId = 1;

export const useStudioStore = create<StudioState>((set, get) => ({
  // Initial state
  schema: null,
  schemaLoading: false,
  schemaError: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  zoomLevel: 'analyst',
  composedFields: [],
  formulaSQL: '',
  formulaValid: true,
  formulaError: null,
  executionMode: 'sqljs',
  executionResult: null,
  nodeDataCache: {},
  isExecuting: false,
  debugStepIndex: 0,
  debugStepCount: 0,

  loadSchema: async () => {
    set({ schemaLoading: true, schemaError: null });
    try {
      const res = await fetch('/api/metrics/studio/schema');
      if (!res.ok) throw new Error(`Schema API failed: ${res.status}`);
      const data = await res.json();
      set({ schema: data, schemaLoading: false });
    } catch (err) {
      set({ schemaError: err instanceof Error ? err.message : String(err), schemaLoading: false });
    }
  },

  addFieldToCanvas: (payload, position) => {
    const { nodes, edges, composedFields, schema } = get();

    if (payload.type === 'template' && payload.metricId) {
      get().loadMetricTemplate(payload.metricId);
      return;
    }

    if (!payload.tableName) return;

    const layer = payload.layer ?? 'l2';
    const tableName = payload.tableName;

    // Check if a node for this table already exists
    const existingNode = nodes.find(
      n => n.data.type === 'table' && (n.data as TableNodeData).tableName === tableName
    );

    let updatedNodes = [...nodes];
    let updatedEdges = [...edges];
    let targetNodeId: string;

    if (existingNode && payload.type === 'field' && payload.fieldName) {
      // Append field to existing node
      targetNodeId = existingNode.id;
      updatedNodes = updatedNodes.map(n => {
        if (n.id !== existingNode.id) return n;
        const d = n.data as TableNodeData;
        if (d.selectedFields.includes(payload.fieldName!)) return n;
        return {
          ...n,
          data: {
            ...d,
            selectedFields: [...d.selectedFields, payload.fieldName!],
          },
        };
      });
    } else {
      // Create new table node
      targetNodeId = `studio-node-${nextNodeId++}`;
      const schemaTable = schema?.tables.find(t => t.name === tableName);
      const allFields = schemaTable?.fields.map(f => f.name) ?? [];
      const selectedFields = payload.fieldName ? [payload.fieldName] : allFields;

      const newNode: StudioNode = {
        id: targetNodeId,
        type: 'tableNode',
        position,
        data: {
          type: 'table',
          tableName,
          layer,
          fields: allFields,
          selectedFields,
          zoomLevel: get().zoomLevel,
        },
      };
      updatedNodes.push(newNode);

      // Auto-connect via FK if other table nodes exist
      if (schema?.relationships) {
        const tableNodes = updatedNodes.filter(n => n.data.type === 'table' && n.id !== targetNodeId);
        for (const tn of tableNodes) {
          const tnData = tn.data as TableNodeData;
          const fkGraph = buildFKGraph(
            schema.relationships.map(r => ({
              from_table: r.fromTable,
              from_field: r.fromColumn,
              to_table: r.toTable,
              to_field: r.toColumn,
              from_layer: r.fromLayer,
              to_layer: r.toLayer,
            }))
          );
          const path = findShortestPath(fkGraph, tnData.tableName, tableName);
          if (path && path.length > 0) {
            const edgeId = `studio-edge-${tn.id}-${targetNodeId}`;
            if (!updatedEdges.some(e => e.id === edgeId)) {
              updatedEdges.push({
                id: edgeId,
                source: tn.id,
                target: targetNodeId,
                type: 'dataFlowEdge',
                data: { label: path.map(p => `${p.fromColumn}=${p.toColumn}`).join(', ') },
              });
            }
            break; // Only connect to first matching node
          }
        }
      }
    }

    // Update composed fields
    const newField: ComposedField = {
      table: tableName,
      field: payload.fieldName ?? '*',
      layer,
    };
    const updatedFields = payload.fieldName
      ? [...composedFields.filter(f => !(f.table === tableName && f.field === payload.fieldName)), newField]
      : [...composedFields, newField];

    // Recompose formula
    const relationships: DataDictionaryRelationship[] = (schema?.relationships ?? []).map(r => ({
      from_table: r.fromTable,
      from_field: r.fromColumn,
      to_table: r.toTable,
      to_field: r.toColumn,
      from_layer: r.fromLayer,
      to_layer: r.toLayer,
    }));

    const composed = composeSQL(updatedFields, relationships);

    set({
      nodes: updatedNodes,
      edges: updatedEdges,
      composedFields: updatedFields,
      formulaSQL: composed.sql,
      formulaValid: composed.valid,
      formulaError: composed.error ?? null,
      debugStepCount: composed.steps.length,
      debugStepIndex: 0,
    });
  },

  removeNode: (nodeId) => {
    const { nodes, edges, composedFields } = get();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const updatedNodes = nodes.filter(n => n.id !== nodeId);
    const updatedEdges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);

    // Remove composed fields for this table
    let updatedFields = composedFields;
    if (node.data.type === 'table') {
      const tableName = (node.data as TableNodeData).tableName;
      updatedFields = composedFields.filter(f => f.table !== tableName);
    }

    set({
      nodes: updatedNodes,
      edges: updatedEdges,
      composedFields: updatedFields,
      selectedNodeId: get().selectedNodeId === nodeId ? null : get().selectedNodeId,
    });
  },

  executeFormula: async () => {
    const { formulaSQL, formulaValid, executionMode } = get();
    if (!formulaSQL || !formulaValid) return;

    set({ isExecuting: true, executionResult: null });

    try {
      const composed = composeSQL(
        get().composedFields,
        (get().schema?.relationships ?? []).map(r => ({
          from_table: r.fromTable, from_field: r.fromColumn,
          to_table: r.toTable, to_field: r.toColumn,
          from_layer: r.fromLayer, to_layer: r.toLayer,
        }))
      );

      const res = await fetch('/api/metrics/studio/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formula_sql: composed.sql,
          source_tables: composed.sourceTables,
          execution_mode: executionMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        set({ executionResult: { ok: false, error: data.error ?? `HTTP ${res.status}` }, isExecuting: false });
        return;
      }

      set({
        executionResult: { ok: true, rows: data.rows, rowCount: data.rowCount, durationMs: data.durationMs },
        isExecuting: false,
      });
    } catch (err) {
      set({
        executionResult: { ok: false, error: err instanceof Error ? err.message : String(err) },
        isExecuting: false,
      });
    }
  },

  loadMetricTemplate: async (metricId) => {
    try {
      const res = await fetch(`/api/metrics/studio/template?metricId=${encodeURIComponent(metricId)}`);
      if (!res.ok) throw new Error(`Template API failed: ${res.status}`);
      const data = await res.json();

      set({
        nodes: data.nodes ?? [],
        edges: data.edges ?? [],
        formulaSQL: data.formulaSQL ?? '',
        formulaValid: true,
        formulaError: null,
        composedFields: [],
        executionResult: null,
        debugStepIndex: 0,
      });

      // Auto-layout after template load for end-to-end flow visualization
      get().autoLayout();
    } catch (err) {
      console.error('Failed to load template:', err);
    }
  },

  autoLayout: () => {
    const { nodes, edges, schema } = get();
    if (nodes.length === 0) return;

    // Classify nodes by type
    const l1Nodes: StudioNode[] = [];
    const l2Nodes: StudioNode[] = [];
    const transformNodes: StudioNode[] = [];
    const outputNodes: StudioNode[] = [];
    const destNodes: StudioNode[] = [];

    for (const n of nodes) {
      if (n.data.type === 'destination') destNodes.push(n);
      else if (n.data.type === 'output') outputNodes.push(n);
      else if (n.data.type === 'transform') transformNodes.push(n);
      else if (n.data.type === 'table') {
        const td = n.data as TableNodeData;
        if (td.layer === 'l1') l1Nodes.push(n);
        else l2Nodes.push(n);
      }
    }

    // Main horizontal flow columns
    const COL_GAP = 300;
    const ROW_GAP = 120;
    const L1_Y_OFFSET = -140; // L1 nodes float above their L2 target

    // Position L2 nodes in column 0
    const positioned = new Map<string, { x: number; y: number }>();
    l2Nodes.forEach((n, i) => positioned.set(n.id, { x: 0, y: i * ROW_GAP }));

    // Position transform nodes in column 1
    transformNodes.forEach((n, i) => positioned.set(n.id, { x: COL_GAP, y: i * ROW_GAP }));

    // Position output nodes in column 2
    outputNodes.forEach((n, i) => positioned.set(n.id, { x: COL_GAP * 2, y: i * ROW_GAP }));

    // Position destination nodes in column 3
    destNodes.forEach((n, i) => positioned.set(n.id, { x: COL_GAP * 3, y: i * ROW_GAP }));

    // Position L1 nodes above the L2 node they join to (via FK from schema)
    const fkRels = schema?.relationships ?? [];
    for (const l1Node of l1Nodes) {
      const l1TableName = (l1Node.data as TableNodeData).tableName;
      let matchedL2Pos: { x: number; y: number } | null = null;

      // Find which L2 node this L1 joins to via FK
      for (const l2Node of l2Nodes) {
        const l2TableName = (l2Node.data as TableNodeData).tableName;
        const hasFK = fkRels.some(r =>
          (r.fromTable === l2TableName && r.toTable === l1TableName) ||
          (r.fromTable === l1TableName && r.toTable === l2TableName)
        );
        if (hasFK) {
          matchedL2Pos = positioned.get(l2Node.id) ?? null;
          break;
        }
      }

      if (matchedL2Pos) {
        positioned.set(l1Node.id, { x: matchedL2Pos.x, y: matchedL2Pos.y + L1_Y_OFFSET });
      } else {
        // No FK match — position above leftmost L2
        const firstL2Pos = l2Nodes.length > 0 ? positioned.get(l2Nodes[0].id) : null;
        positioned.set(l1Node.id, {
          x: (firstL2Pos?.x ?? 0) + l1Nodes.indexOf(l1Node) * 180,
          y: (firstL2Pos?.y ?? 0) + L1_Y_OFFSET,
        });
      }
    }

    // Apply positions
    const laid = nodes.map(n => {
      const pos = positioned.get(n.id);
      return pos ? { ...n, position: pos } : n;
    });

    set({ nodes: laid });
  },

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setZoomLevel: (level) => {
    set({ zoomLevel: level });
    get().updateNodeZoomLevels(level);
  },
  setExecutionMode: (mode) => set({ executionMode: mode }),
  setDebugStep: (step) => set({ debugStepIndex: Math.max(0, Math.min(step, get().debugStepCount - 1)) }),
  clearCanvas: () => set({
    nodes: [],
    edges: [],
    composedFields: [],
    formulaSQL: '',
    formulaValid: true,
    formulaError: null,
    executionResult: null,
    selectedNodeId: null,
    debugStepIndex: 0,
    debugStepCount: 0,
    nodeDataCache: {},
  }),

  updateNodeZoomLevels: (level) => {
    set({
      nodes: get().nodes.map(n => ({
        ...n,
        data: { ...n.data, zoomLevel: level },
      })),
    });
  },
}));
