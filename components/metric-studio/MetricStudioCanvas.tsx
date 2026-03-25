'use client';

import React, { useCallback, useMemo, useEffect, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useViewport,
  useReactFlow,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TableNode } from './nodes/TableNode';
import { TransformNode } from './nodes/TransformNode';
import { OutputNode } from './nodes/OutputNode';
import { DataFlowEdge } from './edges/DataFlowEdge';
import { useStudioStore } from '@/lib/metric-studio/canvas-state';
import type { StudioDragPayload, StudioNode, StudioEdge, ZoomLevel } from '@/lib/metric-studio/types';

// Defined OUTSIDE component to prevent re-render cascade (React Flow perf rule #1)
const nodeTypes = {
  tableNode: TableNode,
  transformNode: TransformNode,
  outputNode: OutputNode,
};

const edgeTypes = {
  dataFlowEdge: DataFlowEdge,
};

/** Debounced zoom threshold — only re-renders on threshold crossing (perf rule #4) */
function useCoarsenedZoom(): ZoomLevel {
  const { zoom } = useViewport();
  const isCro = zoom < 0.5;
  const isAnalyst = zoom >= 0.5 && zoom <= 1.0;
  return useMemo(() => {
    if (isCro) return 'cro';
    if (isAnalyst) return 'analyst';
    return 'validator';
  }, [isCro, isAnalyst]);
}

function MetricStudioCanvasInner() {
  const nodes = useStudioStore(s => s.nodes);
  const edges = useStudioStore(s => s.edges);
  const setSelectedNode = useStudioStore(s => s.setSelectedNode);
  const addFieldToCanvas = useStudioStore(s => s.addFieldToCanvas);
  const setZoomLevel = useStudioStore(s => s.setZoomLevel);
  const loadSchema = useStudioStore(s => s.loadSchema);

  const { screenToFlowPosition } = useReactFlow();

  // Load schema on mount
  useEffect(() => {
    loadSchema();
  }, [loadSchema]);

  // Track zoom level changes
  const zoomLevel = useCoarsenedZoom();
  useEffect(() => {
    setZoomLevel(zoomLevel);
  }, [zoomLevel, setZoomLevel]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    useStudioStore.setState({
      nodes: applyNodeChanges(changes, useStudioStore.getState().nodes) as StudioNode[],
    });
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    useStudioStore.setState({
      edges: applyEdgeChanges(changes, useStudioStore.getState().edges) as StudioEdge[],
    });
  }, []);

  const onConnect: OnConnect = useCallback(() => {
    // Manual edge connections — future feature
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: { id: string }) => {
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // DnD handlers
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const raw = event.dataTransfer.getData('application/studio-drag');
    if (!raw) return;

    let payload: StudioDragPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    addFieldToCanvas(payload, position);
  }, [screenToFlowPosition, addFieldToCanvas]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
        className="bg-slate-950"
      >
        <Background color="#1e293b" gap={24} size={1} variant={"dots" as never} />
        <Controls className="!bg-slate-800 !border-slate-700 !rounded-lg [&_button]:!bg-slate-800 [&_button]:!border-slate-700 [&_button]:!fill-slate-400 [&_button:hover]:!bg-slate-700" />
        <MiniMap
          className="!bg-slate-900 !border-slate-700"
          nodeColor={(n) => {
            const layer = (n.data as { layer?: string })?.layer;
            if (layer === 'l1') return '#14b8a6';
            if (layer === 'l2') return '#8b5cf6';
            if (layer === 'l3') return '#f43f5e';
            return '#D04A02';
          }}
          maskColor="rgba(0,0,0,0.7)"
        />
      </ReactFlow>
    </div>
  );
}

export const MetricStudioCanvas = React.memo(MetricStudioCanvasInner);
