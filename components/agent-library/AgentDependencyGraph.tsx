'use client';

import { useMemo } from 'react';
import type { AgentDefinition, AgentCategory } from '@/lib/agent-library/types';

const CATEGORY_COLORS: Record<AgentCategory, string> = {
  expert: '#8b5cf6',    // violet
  builder: '#14b8a6',   // teal
  reviewer: '#eab308',  // amber
  workflow: '#3b82f6',  // blue
  session: '#64748b',   // slate
};

interface GraphNode {
  id: string;
  label: string;
  category: AgentCategory;
  x: number;
  y: number;
}

interface GraphEdge {
  from: string;
  to: string;
}

export default function AgentDependencyGraph({ agents }: { agents: AgentDefinition[] }) {
  const { nodes, edges } = useMemo(() => {
    // Group agents by category for layout
    const groups: Record<AgentCategory, AgentDefinition[]> = {
      expert: [], builder: [], reviewer: [], workflow: [], session: [],
    };
    for (const a of agents) groups[a.category].push(a);

    const categoryOrder: AgentCategory[] = ['expert', 'builder', 'reviewer', 'workflow', 'session'];
    const graphNodes: GraphNode[] = [];
    const graphEdges: GraphEdge[] = [];

    const padding = 20;
    const nodeWidth = 140;
    const nodeHeight = 36;
    const colGap = 180;
    const rowGap = 50;

    let col = 0;
    for (const cat of categoryOrder) {
      const group = groups[cat];
      if (group.length === 0) continue;
      let row = 0;
      for (const a of group) {
        graphNodes.push({
          id: a.slug,
          label: a.name.length > 20 ? a.name.slice(0, 20) + '...' : a.name,
          category: a.category,
          x: padding + col * colGap,
          y: padding + 30 + row * rowGap,
        });
        row++;
      }
      col++;
    }

    // Build edges from dependencies
    const slugMap = new Map(agents.map(a => [a.slug, a]));
    const nameMap = new Map(agents.map(a => [a.name.toLowerCase(), a]));

    for (const a of agents) {
      for (const dep of a.dependencies) {
        const target = slugMap.get(dep) || nameMap.get(dep.toLowerCase());
        if (target) {
          graphEdges.push({ from: target.slug, to: a.slug });
        }
      }
    }

    return { nodes: graphNodes, edges: graphEdges };
  }, [agents]);

  if (nodes.length === 0) return null;

  const maxX = Math.max(...nodes.map(n => n.x)) + 160;
  const maxY = Math.max(...nodes.map(n => n.y)) + 50;

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-lg overflow-auto">
      <svg width={maxX} height={maxY} className="min-w-full">
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#475569" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x + 70}
              y1={from.y + 18}
              x2={to.x + 70}
              y2={to.y + 18}
              stroke="#475569"
              strokeWidth={1}
              markerEnd="url(#arrow)"
              opacity={0.6}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width={140}
              height={36}
              rx={6}
              fill="#1e293b"
              stroke={CATEGORY_COLORS[node.category]}
              strokeWidth={1}
              opacity={0.8}
            />
            <circle
              cx={node.x + 14}
              cy={node.y + 18}
              r={4}
              fill={CATEGORY_COLORS[node.category]}
            />
            <text
              x={node.x + 24}
              y={node.y + 22}
              fill="#e2e8f0"
              fontSize={10}
              fontFamily="monospace"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
