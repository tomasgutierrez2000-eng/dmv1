/**
 * Layout Engine — Dagre-based auto-layout for Metric Studio canvas.
 *
 * Produces non-overlapping node positions using a directed graph layout.
 * Direction: left-to-right (LR) — data flows L2 sources → L1 reference → output.
 *
 * Node dimensions are estimated based on content (field count, zoom level).
 * After layout, nodes are animated to their new positions (250ms ease-in-out per DESIGN.md).
 */

import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

// ---------- types ----------

interface LayoutOptions {
  /** Direction: LR (left-to-right) or TB (top-to-bottom). Default: LR */
  direction?: 'LR' | 'TB';
  /** Horizontal gap between nodes in pixels. Default: 80 */
  nodeGapX?: number;
  /** Vertical gap between nodes in pixels. Default: 50 */
  nodeGapY?: number;
  /** Whether to center the graph in the viewport. Default: true */
  center?: boolean;
  /** Viewport width for centering. Default: 800 */
  viewportWidth?: number;
  /** Viewport height for centering. Default: 600 */
  viewportHeight?: number;
}

interface NodeDimensions {
  width: number;
  height: number;
}

// ---------- node dimension estimation ----------

/**
 * Estimate node dimensions based on type and content.
 * These are approximations — actual rendering may differ slightly,
 * but Dagre uses these for non-overlapping placement.
 */
function estimateNodeDimensions(node: Node): NodeDimensions {
  const data = node.data as Record<string, unknown>;
  const type = node.type || 'tableNode';

  if (type === 'outputNode') {
    return { width: 220, height: 120 };
  }

  if (type === 'transformNode') {
    return { width: 200, height: 80 };
  }

  // tableNode — height depends on selected fields
  const selectedFields = (data.selectedFields as string[]) || [];
  const zoomLevel = (data.zoomLevel as string) || 'analyst';

  // Base dimensions
  let width = 240;
  let headerHeight = 40;
  let fieldHeight = 0;
  let footerHeight = 24;

  if (zoomLevel === 'cro') {
    // CRO: header only
    return { width: 180, height: headerHeight };
  }

  if (zoomLevel === 'analyst') {
    // Show up to 4 fields
    fieldHeight = Math.min(selectedFields.length, 4) * 22;
  } else {
    // Validator: up to 8 fields + sample data table
    fieldHeight = Math.min(selectedFields.length, 8) * 22;
    fieldHeight += 80; // Sample data table
  }

  return { width, height: headerHeight + fieldHeight + footerHeight + 16 };
}

// ---------- layout algorithm ----------

/**
 * Apply Dagre layout to a set of nodes and edges.
 * Returns new node positions (does not mutate inputs).
 */
export function layoutNodes(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {},
): Node[] {
  if (nodes.length === 0) return nodes;

  const {
    direction = 'LR',
    nodeGapX = 80,
    nodeGapY = 50,
    center = true,
    viewportWidth = 800,
    viewportHeight = 600,
  } = options;

  // Create dagre graph
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: nodeGapY,
    ranksep: nodeGapX,
    marginx: 40,
    marginy: 40,
  });

  // Add nodes with estimated dimensions
  for (const node of nodes) {
    const dims = estimateNodeDimensions(node);
    g.setNode(node.id, { width: dims.width, height: dims.height });
  }

  // Add edges
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  // Run layout
  dagre.layout(g);

  // Extract positions
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    if (!nodeWithPosition) return node;

    const dims = estimateNodeDimensions(node);
    return {
      ...node,
      position: {
        // Dagre returns center positions — convert to top-left for React Flow
        x: nodeWithPosition.x - dims.width / 2,
        y: nodeWithPosition.y - dims.height / 2,
      },
    };
  });

  // Optionally center in viewport
  if (center && layoutedNodes.length > 0) {
    const minX = Math.min(...layoutedNodes.map((n) => n.position.x));
    const maxX = Math.max(...layoutedNodes.map((n) => n.position.x + estimateNodeDimensions(n).width));
    const minY = Math.min(...layoutedNodes.map((n) => n.position.y));
    const maxY = Math.max(...layoutedNodes.map((n) => n.position.y + estimateNodeDimensions(n).height));

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    const offsetX = Math.max(40, (viewportWidth - graphWidth) / 2) - minX;
    const offsetY = Math.max(40, (viewportHeight - graphHeight) / 2) - minY;

    return layoutedNodes.map((node) => ({
      ...node,
      position: {
        x: node.position.x + offsetX,
        y: node.position.y + offsetY,
      },
    }));
  }

  return layoutedNodes;
}

/**
 * Check if any two nodes overlap.
 * Used for validation and deciding whether to trigger re-layout.
 */
export function hasOverlappingNodes(nodes: Node[]): boolean {
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const aDims = estimateNodeDimensions(a);
    const aRight = a.position.x + aDims.width;
    const aBottom = a.position.y + aDims.height;

    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const bDims = estimateNodeDimensions(b);
      const bRight = b.position.x + bDims.width;
      const bBottom = b.position.y + bDims.height;

      // Check AABB overlap
      if (
        a.position.x < bRight &&
        aRight > b.position.x &&
        a.position.y < bBottom &&
        aBottom > b.position.y
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Sort nodes by layer for consistent left-to-right ordering.
 * L2 (sources) → L1 (reference) → transforms → L3 (output)
 */
export function sortNodesByLayer(nodes: Node[]): Node[] {
  const layerOrder: Record<string, number> = {
    l2: 0,
    l1: 1,
    transform: 2,
    l3: 3,
  };

  return [...nodes].sort((a, b) => {
    const aLayer = (a.data as Record<string, unknown>).layer as string || 'l2';
    const bLayer = (b.data as Record<string, unknown>).layer as string || 'l2';
    return (layerOrder[aLayer] ?? 2) - (layerOrder[bLayer] ?? 2);
  });
}
