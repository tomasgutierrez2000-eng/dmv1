'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { L3Metric, LineageNode, LineageEdge } from '@/data/l3-metrics';

const LAYER_STYLE: Record<string, { bg: string; border: string; text: string; badge: string; svgColor: string; label: string }> = {
  L1:        { bg: 'bg-blue-950/60',    border: 'border-blue-500/40',    text: 'text-blue-300',    badge: 'bg-blue-500/20 text-blue-300',     svgColor: '#3b82f6', label: 'L1 Reference' },
  L2:        { bg: 'bg-amber-950/60',   border: 'border-amber-500/40',   text: 'text-amber-300',   badge: 'bg-amber-500/20 text-amber-300',   svgColor: '#f59e0b', label: 'L2 Snapshot' },
  L3:        { bg: 'bg-emerald-950/60', border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300', svgColor: '#10b981', label: 'L3 Derived' },
  transform: { bg: 'bg-purple-950/60',  border: 'border-purple-500/40',  text: 'text-purple-300',  badge: 'bg-purple-500/20 text-purple-300',  svgColor: '#a855f7', label: 'Transform' },
};

interface NodePosition { id: string; x: number; y: number; w: number; h: number }

function computeLayout(nodes: LineageNode[], edges: LineageEdge[]): { positions: NodePosition[]; width: number; height: number } {
  const colMap: Record<string, number> = { L1: 0, L2: 1, transform: 2, L3: 3 };
  const columns: LineageNode[][] = [[], [], [], []];
  for (const n of nodes) columns[colMap[n.layer] ?? 2].push(n);

  const finalId = nodes.find(n => n.layer === 'L3' && !edges.some(e => e.from === n.id))?.id;
  for (let i = columns[3].length - 1; i >= 0; i--) {
    if (columns[3][i].id !== finalId && edges.some(e => e.from === columns[3][i].id)) {
      columns[1].push(columns[3].splice(i, 1)[0]);
    }
  }

  const NW = 200, NH = 72, CG = 60, RG = 16, P = 32;
  const positions: NodePosition[] = [];
  let maxH = 0;

  for (const col of columns) {
    const h = col.length * NH + Math.max(0, col.length - 1) * RG;
    if (h > maxH) maxH = h;
  }

  for (let c = 0; c < 4; c++) {
    const col = columns[c];
    const colH = col.length * NH + Math.max(0, col.length - 1) * RG;
    const sy = P + (maxH - colH) / 2;
    for (let i = 0; i < col.length; i++) {
      positions.push({ id: col[i].id, x: P + c * (NW + CG), y: sy + i * (NH + RG), w: NW, h: NH });
    }
  }

  return { positions, width: P * 2 + 4 * NW + 3 * CG, height: P * 2 + maxH };
}

export default function LineageFlowView({ metric }: { metric: L3Metric }) {
  const nodes = metric.nodes || [];
  const edges = metric.edges || [];

  const [hovered, setHovered] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 80); return () => clearTimeout(t); }, []);

  const { positions, width, height } = useMemo(() => computeLayout(nodes, edges), [nodes, edges]);
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const posMap = useMemo(() => new Map(positions.map(p => [p.id, p])), [positions]);

  const connected = useMemo(() => {
    if (!hovered) return new Set<string>();
    const s = new Set([hovered]);
    for (const e of edges) { if (e.from === hovered) s.add(e.to); if (e.to === hovered) s.add(e.from); }
    return s;
  }, [hovered, edges]);

  if (nodes.length === 0) return null;

  const uid = metric.id.replace(/\W/g, '-');

  return (
    <div className="overflow-x-auto">
      <div style={{ width, height, position: 'relative', minHeight: height }}>
        <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
          <defs>
            <marker id={`ah-${uid}`} markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
              <path d="M0,0 L7,2.5 L0,5" fill="rgba(255,255,255,0.25)" />
            </marker>
            {['L1','L2','L3','transform'].map(l => (
              <marker key={l} id={`ah-${uid}-${l}`} markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <path d="M0,0 L7,2.5 L0,5" fill={LAYER_STYLE[l].svgColor} fillOpacity={0.5} />
              </marker>
            ))}
          </defs>
          {edges.map((edge, i) => {
            const fp = posMap.get(edge.from), tp = posMap.get(edge.to);
            if (!fp || !tp) return null;
            const fn = nodeMap.get(edge.from);
            const x1 = fp.x + fp.w, y1 = fp.y + fp.h / 2, x2 = tp.x, y2 = tp.y + tp.h / 2;
            const dx = (x2 - x1) * 0.4;
            const hi = hovered && connected.has(edge.from) && connected.has(edge.to);
            const dim = hovered && !hi;
            const layer = fn?.layer || 'L1';
            return (
              <g key={i}>
                <path
                  d={`M${x1},${y1} C${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}`}
                  fill="none" stroke={hi ? LAYER_STYLE[layer].svgColor : 'rgba(255,255,255,0.1)'}
                  strokeWidth={hi ? 2 : 1.5}
                  markerEnd={`url(#ah-${uid}${hi ? `-${layer}` : ''})`}
                  style={{ opacity: dim ? 0.1 : ready ? 1 : 0, transition: `opacity 0.4s ${i*60}ms, stroke 0.2s` }}
                />
                {edge.label && ready && (
                  <text x={(x1+x2)/2} y={(y1+y2)/2-6} textAnchor="middle"
                    className="text-[9px] fill-gray-500 select-none"
                    style={{ opacity: dim ? 0.1 : 0.6, transition: 'opacity 0.2s' }}
                  >{edge.label}</text>
                )}
              </g>
            );
          })}
        </svg>

        {positions.map((pos, i) => {
          const node = nodeMap.get(pos.id);
          if (!node) return null;
          const s = LAYER_STYLE[node.layer] || LAYER_STYLE.transform;
          const isTarget = node.layer === 'L3' && !edges.some(e => e.from === node.id);
          const dim = hovered && !connected.has(pos.id);
          return (
            <div
              key={pos.id}
              className={`absolute rounded-lg border ${s.bg} ${s.border} transition-all duration-200 cursor-default
                ${isTarget ? 'ring-1 ring-emerald-500/30' : ''}
                ${dim ? 'opacity-15' : ''}
                ${hovered === pos.id ? 'scale-[1.03] z-10 shadow-lg' : 'z-0'}
              `}
              style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h,
                opacity: ready ? undefined : 0, transform: ready ? undefined : 'translateY(8px)',
                transition: `all 0.3s cubic-bezier(0.16,1,0.3,1) ${i*50}ms`,
              }}
              onMouseEnter={() => setHovered(pos.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="px-2.5 py-1.5 h-full flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-px rounded flex-shrink-0 ${s.badge}`}>{s.label}</span>
                  {node.table && <span className="text-[9px] text-gray-500 truncate">{node.table}</span>}
                  {node.fields && node.fields.length > 1 && (
                    <span className="text-[8px] text-gray-500 flex-shrink-0">({node.fields.length})</span>
                  )}
                </div>
                <div className={`text-xs font-semibold ${s.text} truncate`} title={node.fields?.join(', ')}>
                  {node.fields && node.fields.length > 1 ? node.fields.join(', ') : node.field}
                </div>
                <div className="text-[10px] text-gray-400 font-mono truncate mt-px">
                  {node.formula ? <span className="text-purple-300">{node.formula}</span> : node.sampleValue}
                </div>
                {node.filterCriteria && (
                  <div className="text-[9px] text-gray-500 truncate mt-1 border-t border-white/5 pt-1" title={node.filterCriteria}>
                    {node.filterCriteria}
                  </div>
                )}
              </div>
              {hovered === pos.id && (node.description || node.filterCriteria) && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 bg-gray-800 border border-white/10 rounded-lg px-2.5 py-2 shadow-xl min-w-[180px] max-w-[260px]">
                  {node.description && <div className="text-[10px] text-gray-300 leading-relaxed">{node.description}</div>}
                  {node.sampleValue && <div className="text-[10px] text-emerald-400 mt-0.5 font-mono">Value: {node.sampleValue}</div>}
                  {node.filterCriteria && <div className="text-[9px] text-amber-300/90 mt-1.5 pt-1 border-t border-white/10">Data filter: {node.filterCriteria}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
