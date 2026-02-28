'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { CatalogueItem, DemoFacility } from '@/lib/metric-library/types';

/* ────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ──────────────────────────────────────────────────────────────────────────── */

type LevelKey = 'lob' | 'portfolio' | 'desk' | 'counterparty' | 'facility' | 'position';

interface PyramidNode {
  id: string;
  level: LevelKey;
  label: string;
  sublabel?: string;
  ltv?: number;
  committed?: number;
  collateral?: number;
  posCount?: number;
  parentIds: string[];
  childIds: string[];
}

interface PyramidEdge {
  from: string;
  to: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * LEVEL COLORS — match tab colors from CatalogueDeepDive
 * ──────────────────────────────────────────────────────────────────────────── */

const LEVEL_STYLE: Record<LevelKey, {
  bg: string; border: string; text: string; svgColor: string; label: string;
  activeBorder: string; activeBg: string;
}> = {
  lob:          { bg: 'bg-pink-950/60',    border: 'border-pink-500/30',    text: 'text-pink-300',    svgColor: '#ec4899', label: 'LoB',          activeBorder: 'border-pink-500/70',    activeBg: 'bg-pink-950/80' },
  portfolio:    { bg: 'bg-emerald-950/60', border: 'border-emerald-500/30', text: 'text-emerald-300', svgColor: '#10b981', label: 'Portfolio',    activeBorder: 'border-emerald-500/70', activeBg: 'bg-emerald-950/80' },
  desk:         { bg: 'bg-amber-950/60',   border: 'border-amber-500/30',   text: 'text-amber-300',   svgColor: '#f59e0b', label: 'Desk',         activeBorder: 'border-amber-500/70',   activeBg: 'bg-amber-950/80' },
  counterparty: { bg: 'bg-purple-950/60',  border: 'border-purple-500/30',  text: 'text-purple-300',  svgColor: '#a855f7', label: 'Counterparty', activeBorder: 'border-purple-500/70',  activeBg: 'bg-purple-950/80' },
  facility:     { bg: 'bg-blue-950/60',    border: 'border-blue-500/30',    text: 'text-blue-300',    svgColor: '#3b82f6', label: 'Facility',     activeBorder: 'border-blue-500/70',    activeBg: 'bg-blue-950/80' },
  position:     { bg: 'bg-cyan-950/60',    border: 'border-cyan-500/30',    text: 'text-cyan-300',    svgColor: '#06b6d4', label: 'Position',     activeBorder: 'border-cyan-500/70',    activeBg: 'bg-cyan-950/80' },
};

/* Level ordering: top (LoB) → bottom (positions) */
const LEVEL_ORDER: LevelKey[] = ['lob', 'portfolio', 'desk', 'counterparty', 'facility', 'position'];

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    : `$${(n / 1_000).toFixed(0)}K`;

const pct = (n: number) => `${n.toFixed(1)}%`;

function ltvColor(v: number): string {
  if (v >= 100) return 'text-red-400';
  if (v >= 80) return 'text-amber-400';
  return 'text-gray-200';
}

function ltvColorSvg(v: number): string {
  if (v >= 100) return '#f87171';
  if (v >= 80) return '#fbbf24';
  return '#e5e7eb';
}

/* ────────────────────────────────────────────────────────────────────────────
 * BUILD NODES & EDGES from demo_data.facilities
 * ──────────────────────────────────────────────────────────────────────────── */

function buildGraph(facilities: DemoFacility[]): { nodes: PyramidNode[]; edges: PyramidEdge[] } {
  const nodes: PyramidNode[] = [];
  const edges: PyramidEdge[] = [];
  const nodeMap = new Map<string, PyramidNode>();

  const makeNode = (id: string, level: LevelKey, label: string, sublabel?: string): PyramidNode => {
    if (nodeMap.has(id)) return nodeMap.get(id)!;
    const n: PyramidNode = { id, level, label, sublabel, parentIds: [], childIds: [] };
    nodes.push(n);
    nodeMap.set(id, n);
    return n;
  };

  const addEdge = (fromId: string, toId: string) => {
    edges.push({ from: fromId, to: toId });
    const from = nodeMap.get(fromId);
    const to = nodeMap.get(toId);
    if (from && !from.childIds.includes(toId)) from.childIds.push(toId);
    if (to && !to.parentIds.includes(fromId)) to.parentIds.push(fromId);
  };

  // LoB level — all facilities share the same lob_name in demo
  const lobName = facilities[0]?.lob_name ?? 'LoB';
  const lobId = 'lob-' + lobName.replace(/\s/g, '-');
  const lobTotalC = facilities.reduce((s, f) => s + f.committed_amt, 0);
  const lobTotalV = facilities.reduce((s, f) => s + f.collateral_value, 0);
  const lobNode = makeNode(lobId, 'lob', lobName);
  lobNode.committed = lobTotalC;
  lobNode.collateral = lobTotalV;
  lobNode.ltv = lobTotalV > 0 ? (lobTotalC / lobTotalV) * 100 : 0;

  // Portfolio level
  const portfolios = [...new Set(facilities.map((f) => f.portfolio_name))];
  for (const pName of portfolios) {
    const pFacs = facilities.filter((f) => f.portfolio_name === pName);
    const pId = 'port-' + pName.replace(/\s/g, '-');
    const pTotalC = pFacs.reduce((s, f) => s + f.committed_amt, 0);
    const pTotalV = pFacs.reduce((s, f) => s + f.collateral_value, 0);
    const pNode = makeNode(pId, 'portfolio', pName);
    pNode.committed = pTotalC;
    pNode.collateral = pTotalV;
    pNode.ltv = pTotalV > 0 ? (pTotalC / pTotalV) * 100 : 0;
    addEdge(lobId, pId);
  }

  // Desk level
  const desks = [...new Set(facilities.map((f) => f.desk_name))];
  for (const dName of desks) {
    const dFacs = facilities.filter((f) => f.desk_name === dName);
    const dId = 'desk-' + dName.replace(/\s/g, '-');
    const dTotalC = dFacs.reduce((s, f) => s + f.committed_amt, 0);
    const dTotalV = dFacs.reduce((s, f) => s + f.collateral_value, 0);
    const dNode = makeNode(dId, 'desk', dName);
    dNode.committed = dTotalC;
    dNode.collateral = dTotalV;
    dNode.ltv = dTotalV > 0 ? (dTotalC / dTotalV) * 100 : 0;
    // Link to parent portfolio
    const parentPortfolioName = dFacs[0]?.portfolio_name;
    if (parentPortfolioName) {
      const pId = 'port-' + parentPortfolioName.replace(/\s/g, '-');
      addEdge(pId, dId);
    }
  }

  // Counterparty level
  const counterparties = [...new Map(facilities.map((f) => [f.counterparty_id, f])).values()];
  for (const cpFac of counterparties) {
    const cpFacs = facilities.filter((f) => f.counterparty_id === cpFac.counterparty_id);
    const cpId = 'cp-' + cpFac.counterparty_id;
    const cpTotalC = cpFacs.reduce((s, f) => s + f.committed_amt, 0);
    const cpTotalV = cpFacs.reduce((s, f) => s + f.collateral_value, 0);
    const cpNode = makeNode(cpId, 'counterparty', cpFac.counterparty_name, cpFac.counterparty_id);
    cpNode.committed = cpTotalC;
    cpNode.collateral = cpTotalV;
    cpNode.ltv = cpTotalV > 0 ? (cpTotalC / cpTotalV) * 100 : 0;
    // Counterparty connects to desk level — but counterparty/desk are parallel groupings
    // We won't draw edges from desk→counterparty; instead, counterparty→facility and desk→facility
  }

  // Facility level
  for (const f of facilities) {
    const fId = 'fac-' + f.facility_id;
    const fNode = makeNode(fId, 'facility', f.facility_name, f.facility_id);
    fNode.committed = f.committed_amt;
    fNode.collateral = f.collateral_value;
    fNode.ltv = f.ltv_pct;

    // Edge: desk → facility
    const deskId = 'desk-' + f.desk_name.replace(/\s/g, '-');
    addEdge(deskId, fId);

    // Edge: counterparty → facility
    const cpId = 'cp-' + f.counterparty_id;
    addEdge(cpId, fId);
  }

  // Position level — one node per facility showing aggregated positions
  for (const f of facilities) {
    const posId = 'pos-' + f.facility_id;
    const posTotal = f.positions.reduce((s, p) => s + p.balance_amount, 0);
    const posNode = makeNode(posId, 'position', `${f.positions.length} positions`, f.facility_id);
    posNode.committed = posTotal;
    posNode.posCount = f.positions.length;

    const fId = 'fac-' + f.facility_id;
    addEdge(fId, posId);
  }

  return { nodes, edges };
}

/* ────────────────────────────────────────────────────────────────────────────
 * LAYOUT — compute x,y positions for each node within SVG
 * ──────────────────────────────────────────────────────────────────────────── */

interface NodePos {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const NW = 148;  // node width
const NH = 54;   // node height
const RG = 56;   // row gap (vertical space between levels)
const CG = 16;   // column gap (horizontal space between nodes at same level)
const PX = 24;   // horizontal padding
const PY = 24;   // vertical padding

function computePositions(
  nodes: PyramidNode[],
): { positions: NodePos[]; width: number; height: number } {
  // Group nodes by level
  const levelRows = new Map<LevelKey, PyramidNode[]>();
  for (const level of LEVEL_ORDER) {
    levelRows.set(level, nodes.filter((n) => n.level === level));
  }

  // Special handling: desk and counterparty are at the same visual row
  // Desks on left, counterparties on right
  const deskNodes = levelRows.get('desk') ?? [];
  const cpNodes = levelRows.get('counterparty') ?? [];

  // Compute combined row (desk + counterparty share row 2 with a separator)
  const combinedDeskCpCount = deskNodes.length + cpNodes.length;

  // Determine max row width to center everything
  const rowWidths = new Map<LevelKey, number>();
  for (const level of LEVEL_ORDER) {
    const row = levelRows.get(level) ?? [];
    if (level === 'desk' || level === 'counterparty') {
      // Combined row
      rowWidths.set('desk', combinedDeskCpCount * NW + (combinedDeskCpCount - 1) * CG + 40); // extra 40 for separator
    } else {
      rowWidths.set(level, row.length * NW + Math.max(0, row.length - 1) * CG);
    }
  }

  // SVG width = widest row + padding
  let maxRowWidth = 0;
  for (const w of rowWidths.values()) {
    if (w > maxRowWidth) maxRowWidth = w;
  }
  const svgWidth = maxRowWidth + PX * 2;

  const positions: NodePos[] = [];

  // Visual rows: lob(0), portfolio(1), desk+counterparty(2), facility(3), position(4)
  const visualRows: { levels: LevelKey[]; nodes: PyramidNode[] }[] = [
    { levels: ['lob'], nodes: levelRows.get('lob') ?? [] },
    { levels: ['portfolio'], nodes: levelRows.get('portfolio') ?? [] },
    { levels: ['desk', 'counterparty'], nodes: [...deskNodes, ...cpNodes] },
    { levels: ['facility'], nodes: levelRows.get('facility') ?? [] },
    { levels: ['position'], nodes: levelRows.get('position') ?? [] },
  ];

  for (let ri = 0; ri < visualRows.length; ri++) {
    const row = visualRows[ri];
    const y = PY + ri * (NH + RG);
    const rowW = row.nodes.length * NW + Math.max(0, row.nodes.length - 1) * CG;

    // For the combined desk+counterparty row, add separator space
    let effectiveRowW = rowW;
    if (row.levels.length === 2) {
      effectiveRowW = rowW + 40; // separator gap
    }

    const startX = (svgWidth - effectiveRowW) / 2;

    let xCursor = startX;
    for (let ni = 0; ni < row.nodes.length; ni++) {
      const node = row.nodes[ni];

      // Add separator gap between desk group and counterparty group
      if (row.levels.length === 2 && ni === deskNodes.length && deskNodes.length > 0) {
        xCursor += 40; // separator gap
      }

      positions.push({
        id: node.id,
        x: xCursor,
        y,
        w: NW,
        h: NH,
      });
      xCursor += NW + CG;
    }
  }

  const svgHeight = PY * 2 + visualRows.length * NH + (visualRows.length - 1) * RG;

  return { positions, width: svgWidth, height: svgHeight };
}

/* ────────────────────────────────────────────────────────────────────────────
 * GET CONNECTED SET — find all ancestors + descendants of a hovered node
 * ──────────────────────────────────────────────────────────────────────────── */

function getConnected(nodeId: string, nodes: PyramidNode[]): Set<string> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const connected = new Set<string>([nodeId]);

  // Walk up (ancestors)
  const upQueue = [nodeId];
  while (upQueue.length > 0) {
    const cur = upQueue.shift()!;
    const node = nodeMap.get(cur);
    if (!node) continue;
    for (const pid of node.parentIds) {
      if (!connected.has(pid)) {
        connected.add(pid);
        upQueue.push(pid);
      }
    }
  }

  // Walk down (descendants)
  const downQueue = [nodeId];
  while (downQueue.length > 0) {
    const cur = downQueue.shift()!;
    const node = nodeMap.get(cur);
    if (!node) continue;
    for (const cid of node.childIds) {
      if (!connected.has(cid)) {
        connected.add(cid);
        downQueue.push(cid);
      }
    }
  }

  return connected;
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT
 * ──────────────────────────────────────────────────────────────────────────── */

interface HierarchyPyramidProps {
  item: CatalogueItem;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function HierarchyPyramid({ item, activeTab, onTabChange }: HierarchyPyramidProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  const facilities = item.demo_data?.facilities ?? [];

  const { nodes, edges } = useMemo(() => buildGraph(facilities), [facilities]);
  const { positions, width, height } = useMemo(() => computePositions(nodes), [nodes]);

  const posMap = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const connected = useMemo(() => {
    if (!hovered) return new Set<string>();
    return getConnected(hovered, nodes);
  }, [hovered, nodes]);

  const connectedEdges = useMemo(() => {
    if (!hovered) return new Set<number>();
    const s = new Set<number>();
    edges.forEach((e, i) => {
      if (connected.has(e.from) && connected.has(e.to)) s.add(i);
    });
    return s;
  }, [hovered, connected, edges]);

  // Early return after all hooks
  if (facilities.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">Hierarchy Overview</span>
          <span className="text-[9px] text-gray-600">Click a node to explore that level</span>
        </div>
        {/* Level legend */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          {LEVEL_ORDER.map((level) => {
            const s = LEVEL_STYLE[level];
            return (
              <span
                key={level}
                className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${s.bg} ${s.text} border ${s.border}`}
              >
                {s.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* SVG Pyramid — desktop */}
      <div className="hidden md:block overflow-x-auto">
        <div style={{ minWidth: width, minHeight: height }} className="relative mx-auto" role="img" aria-label="Hierarchy pyramid showing metric rollup from positions to LoB">
          <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
            {/* Bezier edges */}
            {edges.map((edge, i) => {
              const fp = posMap.get(edge.from);
              const tp = posMap.get(edge.to);
              if (!fp || !tp) return null;
              const fromNode = nodeMap.get(edge.from);
              const style = fromNode ? LEVEL_STYLE[fromNode.level] : LEVEL_STYLE.facility;

              // From bottom-center of parent to top-center of child
              const x1 = fp.x + fp.w / 2;
              const y1 = fp.y + fp.h;
              const x2 = tp.x + tp.w / 2;
              const y2 = tp.y;
              const dy = (y2 - y1) * 0.4;

              const hi = hovered && connectedEdges.has(i);
              const dim = hovered && !hi;

              return (
                <path
                  key={i}
                  d={`M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`}
                  fill="none"
                  stroke={hi ? style.svgColor : 'rgba(255,255,255,0.08)'}
                  strokeWidth={hi ? 2 : 1}
                  style={{
                    opacity: dim ? 0.05 : ready ? 1 : 0,
                    transition: `opacity 0.4s ${i * 40}ms, stroke 0.2s`,
                  }}
                />
              );
            })}
          </svg>

          {/* Nodes — rendered as absolutely positioned divs */}
          {positions.map((pos, i) => {
            const node = nodeMap.get(pos.id);
            if (!node) return null;
            const s = LEVEL_STYLE[node.level];
            const dim = hovered && !connected.has(pos.id);
            const isHovered = hovered === pos.id;
            const isActiveLevel = activeTab === node.level;

            return (
              <div
                key={pos.id}
                className={`absolute rounded-lg border transition-all duration-200 cursor-pointer select-none
                  ${isActiveLevel ? `${s.activeBg} ${s.activeBorder} ring-1 ring-white/10` : `${s.bg} ${s.border}`}
                  ${dim ? 'opacity-[0.12]' : ''}
                  ${isHovered ? 'scale-[1.06] z-20 shadow-lg shadow-black/50' : 'z-0'}
                `}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: pos.w,
                  height: pos.h,
                  opacity: ready ? undefined : 0,
                  transform: ready ? undefined : 'translateY(6px)',
                  transition: `all 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 30}ms`,
                }}
                onMouseEnter={() => setHovered(pos.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onTabChange?.(node.level)}
              >
                <div className="px-2 py-1.5 h-full flex flex-col justify-center min-w-0">
                  {/* Level badge + label */}
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`text-[7px] font-bold uppercase tracking-wider px-1 py-px rounded ${s.bg} ${s.text}`}>
                      {s.label}
                    </span>
                    <span className="text-[9px] text-gray-300 truncate font-medium">{node.label}</span>
                  </div>
                  {/* Values row */}
                  <div className="flex items-center gap-1.5">
                    {node.ltv !== undefined && (
                      <span className={`text-xs font-bold font-mono ${ltvColor(node.ltv)}`}>
                        {pct(node.ltv)}
                      </span>
                    )}
                    {node.committed !== undefined && node.level !== 'position' && (
                      <span className="text-[9px] font-mono text-gray-500">
                        {fmt(node.committed)}/{fmt(node.collateral ?? 0)}
                      </span>
                    )}
                    {node.level === 'position' && node.posCount !== undefined && (
                      <span className="text-[9px] font-mono text-gray-500">
                        {node.posCount} pos {fmt(node.committed ?? 0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Row labels on the left */}
          {[
            { label: 'LoB (L1)', y: PY },
            { label: 'Portfolio (L2)', y: PY + (NH + RG) },
            { label: 'Desk / Counterparty', y: PY + 2 * (NH + RG) },
            { label: 'Facility', y: PY + 3 * (NH + RG) },
            { label: 'Position', y: PY + 4 * (NH + RG) },
          ].map((r) => (
            <div
              key={r.label}
              className="absolute text-[8px] font-bold uppercase tracking-wider text-gray-700 pointer-events-none"
              style={{ left: 4, top: r.y + NH / 2 - 6, width: 80 }}
            >
              {r.label}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile fallback — vertical list */}
      <div className="md:hidden space-y-1.5">
        {LEVEL_ORDER.map((level) => {
          const levelNodes = nodes.filter((n) => n.level === level);
          const s = LEVEL_STYLE[level];
          const isActiveLevel = activeTab === level;
          return (
            <button
              key={level}
              onClick={() => onTabChange?.(level)}
              className={`w-full text-left rounded-lg border p-2 transition-all ${
                isActiveLevel
                  ? `${s.activeBg} ${s.activeBorder} ring-1 ring-white/10`
                  : `${s.bg} ${s.border} hover:bg-white/[0.02]`
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${s.bg} ${s.text}`}>
                  {s.label}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {levelNodes.map((n) => (
                    <span key={n.id} className="text-[10px] text-gray-300">
                      {n.label}
                      {n.ltv !== undefined && (
                        <span className={`ml-1 font-mono font-bold ${ltvColor(n.ltv)}`}>{pct(n.ltv)}</span>
                      )}
                      {n.posCount !== undefined && (
                        <span className="ml-1 font-mono text-gray-500">{n.posCount} pos</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
