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
    } catch (err) {
      console.error('Failed to load template:', err);
    }
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
