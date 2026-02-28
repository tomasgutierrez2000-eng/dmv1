'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { CatalogueItem, IngredientField, LevelDefinition } from '@/lib/metric-library/types';
import { ROLLUP_LEVEL_LABELS, type RollupLevelKey } from '@/lib/metric-library/types';

/*
 * Full lineage diagram for a CatalogueItem.
 *
 * Layout (4 columns):
 *   [Source Tables]  →  [Join / Lookup]  →  [Calculation]  →  [Output Levels]
 *
 * Source Tables: L1/L2 tables with their fields
 * Join / Lookup: FK relationships and taxonomy traversal
 * Calculation: The formula node
 * Output Levels: Each rollup level (facility → counterparty → desk → portfolio → lob)
 */

interface DiagramNode {
  id: string;
  label: string;
  sublabel?: string;
  column: number; // 0-3
  layer: 'L1' | 'L2' | 'calc' | 'output';
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

const LAYER_STYLE: Record<string, { bg: string; border: string; text: string; svgColor: string }> = {
  L1:     { bg: 'bg-blue-950/60',    border: 'border-blue-500/40',    text: 'text-blue-300',    svgColor: '#3b82f6' },
  L2:     { bg: 'bg-amber-950/60',   border: 'border-amber-500/40',   text: 'text-amber-300',   svgColor: '#f59e0b' },
  calc:   { bg: 'bg-purple-950/60',  border: 'border-purple-500/40',  text: 'text-purple-300',  svgColor: '#a855f7' },
  output: { bg: 'bg-emerald-950/60', border: 'border-emerald-500/40', text: 'text-emerald-300', svgColor: '#10b981' },
};

function buildDiagram(item: CatalogueItem): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const seenTables = new Set<string>();

  // Column 0: Source tables (deduplicated)
  for (const ing of item.ingredient_fields) {
    const tableId = `${ing.layer}.${ing.table}`;
    if (!seenTables.has(tableId)) {
      seenTables.add(tableId);
      nodes.push({
        id: tableId,
        label: `${ing.layer}.${ing.table}`,
        sublabel: ing.layer === 'L1' ? 'Reference' : ing.layer === 'L2' ? 'Snapshot' : 'Derived',
        column: 0,
        layer: ing.layer as 'L1' | 'L2',
      });
    }
  }

  // Also add join tables from source_references across all levels
  const joinTables = new Set<string>();
  for (const ld of item.level_definitions) {
    for (const sr of ld.source_references) {
      const tableId = `${sr.layer}.${sr.table}`;
      if (!seenTables.has(tableId)) {
        seenTables.add(tableId);
        joinTables.add(tableId);
        nodes.push({
          id: tableId,
          label: `${sr.layer}.${sr.table}`,
          sublabel: sr.layer === 'L1' ? 'Reference' : sr.layer === 'L2' ? 'Snapshot' : 'Derived',
          column: 0,
          layer: sr.layer as 'L1' | 'L2',
        });
      }
    }
  }

  // Column 1: Calculation node
  const calcId = `calc.${item.item_id}`;
  nodes.push({
    id: calcId,
    label: item.abbreviation || item.item_id,
    sublabel: item.generic_formula,
    column: 1,
    layer: 'calc',
  });

  // Edges: source tables → calculation
  for (const tableId of seenTables) {
    edges.push({ from: tableId, to: calcId });
  }

  // Column 2: Output levels
  for (const ld of item.level_definitions) {
    if (!ld.in_record) continue;
    const levelId = `output.${ld.level}`;
    nodes.push({
      id: levelId,
      label: ld.dashboard_display_name,
      sublabel: ld.sourcing_type,
      column: 2,
      layer: 'output',
    });
    edges.push({ from: calcId, to: levelId });
  }

  return { nodes, edges };
}

// Layout constants
const NW = 220, NH = 64, CG = 80, RG = 16, P = 32;

function computeLayout(nodes: DiagramNode[]) {
  const columns: DiagramNode[][] = [[], [], []];
  for (const n of nodes) columns[n.column].push(n);

  const maxColLen = Math.max(...columns.map((c) => c.length), 1);
  const totalH = maxColLen * NH + Math.max(0, maxColLen - 1) * RG;

  const positions: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];

  for (let c = 0; c < 3; c++) {
    const col = columns[c];
    const colH = col.length * NH + Math.max(0, col.length - 1) * RG;
    const sy = P + (totalH - colH) / 2;
    for (let i = 0; i < col.length; i++) {
      positions.push({
        id: col[i].id,
        x: P + c * (NW + CG),
        y: sy + i * (NH + RG),
        w: NW,
        h: NH,
      });
    }
  }

  return {
    positions,
    width: P * 2 + 3 * NW + 2 * CG,
    height: P * 2 + totalH,
  };
}

export default function CatalogueLineageDiagram({ item }: { item: CatalogueItem }) {
  const { nodes, edges } = useMemo(() => buildDiagram(item), [item]);
  const { positions, width, height } = useMemo(() => computeLayout(nodes), [nodes]);

  const [hovered, setHovered] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const posMap = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);

  const connected = useMemo(() => {
    if (!hovered) return new Set<string>();
    const s = new Set([hovered]);
    for (const e of edges) {
      if (e.from === hovered) s.add(e.to);
      if (e.to === hovered) s.add(e.from);
    }
    return s;
  }, [hovered, edges]);

  if (nodes.length === 0) return null;

  const uid = item.item_id.replace(/\W/g, '-');

  return (
    <div className="overflow-x-auto">
      {/* Column labels */}
      <div className="flex mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500" style={{ paddingLeft: P }}>
        <div style={{ width: NW }}>Source Tables</div>
        <div style={{ width: CG }} />
        <div style={{ width: NW }}>Calculation</div>
        <div style={{ width: CG }} />
        <div style={{ width: NW }}>Output Levels</div>
      </div>

      <div style={{ width, height, position: 'relative', minHeight: height }}>
        {/* SVG edges */}
        <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
          <defs>
            <marker id={`ah-${uid}`} markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
              <path d="M0,0 L7,2.5 L0,5" fill="rgba(255,255,255,0.25)" />
            </marker>
            {Object.entries(LAYER_STYLE).map(([key, style]) => (
              <marker key={key} id={`ah-${uid}-${key}`} markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <path d="M0,0 L7,2.5 L0,5" fill={style.svgColor} fillOpacity={0.5} />
              </marker>
            ))}
          </defs>
          {edges.map((edge, i) => {
            const fp = posMap.get(edge.from);
            const tp = posMap.get(edge.to);
            if (!fp || !tp) return null;
            const fn = nodeMap.get(edge.from);
            const x1 = fp.x + fp.w, y1 = fp.y + fp.h / 2;
            const x2 = tp.x, y2 = tp.y + tp.h / 2;
            const dx = (x2 - x1) * 0.4;
            const hi = hovered && connected.has(edge.from) && connected.has(edge.to);
            const layer = fn?.layer || 'L1';
            return (
              <path
                key={i}
                d={`M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`}
                fill="none"
                stroke={hi ? LAYER_STYLE[layer]?.svgColor ?? '#fff' : 'rgba(255,255,255,0.1)'}
                strokeWidth={hi ? 2 : 1.5}
                markerEnd={`url(#ah-${uid}${hi ? `-${layer}` : ''})`}
                className="transition-all duration-200"
                style={{ opacity: hovered && !hi ? 0.2 : ready ? 1 : 0 }}
              />
            );
          })}
        </svg>

        {/* HTML nodes */}
        {positions.map((pos) => {
          const node = nodeMap.get(pos.id);
          if (!node) return null;
          const style = LAYER_STYLE[node.layer] ?? LAYER_STYLE.L1;
          const dim = hovered && !connected.has(node.id);

          return (
            <div
              key={pos.id}
              className={`absolute rounded-lg border px-3 py-2 cursor-pointer transition-all duration-200
                ${style.bg} ${style.border}
                ${dim ? 'opacity-30 scale-[0.97]' : 'opacity-100 scale-100'}
                ${hovered === pos.id ? 'scale-[1.03] ring-1 ring-white/20' : ''}
              `}
              style={{
                left: pos.x,
                top: pos.y,
                width: pos.w,
                height: pos.h,
                opacity: ready ? undefined : 0,
                transform: ready ? undefined : 'translateY(8px)',
              }}
              onMouseEnter={() => setHovered(pos.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className={`text-xs font-semibold truncate ${style.text}`}>
                {node.label}
              </div>
              {node.sublabel && (
                <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                  {node.sublabel}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
