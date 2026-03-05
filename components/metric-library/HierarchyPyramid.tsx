'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { CatalogueItem } from '@/lib/metric-library/types';
import type { MetricVisualizationConfig, DemoEntity } from '@/lib/metric-library/metric-config';
import { computeRollup, formatMetricValue as fmtVal, getValueColor } from '@/lib/metric-library/metric-config';

/* ────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ──────────────────────────────────────────────────────────────────────────── */

type LevelKey = 'lob' | 'portfolio' | 'desk' | 'counterparty' | 'facility' | 'position';

interface PyramidNode {
  id: string;
  level: LevelKey;
  label: string;
  sublabel?: string;
  metricValue?: number;
  committed?: number;
  /** Secondary display value (e.g. collateral for LTV, or weight for others). */
  secondaryValue?: number;
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
  lob:          { bg: 'bg-pink-950/60',    border: 'border-pink-500/30',    text: 'text-pink-300',    svgColor: '#ec4899', label: 'Business Segment',          activeBorder: 'border-pink-500/70',    activeBg: 'bg-pink-950/80' },
  portfolio:    { bg: 'bg-emerald-950/60', border: 'border-emerald-500/30', text: 'text-emerald-300', svgColor: '#10b981', label: 'Portfolio',    activeBorder: 'border-emerald-500/70', activeBg: 'bg-emerald-950/80' },
  desk:         { bg: 'bg-amber-950/60',   border: 'border-amber-500/30',   text: 'text-amber-300',   svgColor: '#f59e0b', label: 'Desk',         activeBorder: 'border-amber-500/70',   activeBg: 'bg-amber-950/80' },
  counterparty: { bg: 'bg-purple-950/60',  border: 'border-purple-500/30',  text: 'text-purple-300',  svgColor: '#a855f7', label: 'Counterparty', activeBorder: 'border-purple-500/70',  activeBg: 'bg-purple-950/80' },
  facility:     { bg: 'bg-blue-950/60',    border: 'border-blue-500/30',    text: 'text-blue-300',    svgColor: '#3b82f6', label: 'Facility',     activeBorder: 'border-blue-500/70',    activeBg: 'bg-blue-950/80' },
  position:     { bg: 'bg-cyan-950/60',    border: 'border-cyan-500/30',    text: 'text-cyan-300',    svgColor: '#06b6d4', label: 'Position',     activeBorder: 'border-cyan-500/70',    activeBg: 'bg-cyan-950/80' },
};

const LEVEL_ORDER: LevelKey[] = ['lob', 'portfolio', 'desk', 'counterparty', 'facility', 'position'];

/* ────────────────────────────────────────────────────────────────────────────
 * HELPERS
 * ──────────────────────────────────────────────────────────────────────────── */

const fmtCurrency = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    : `$${(n / 1_000).toFixed(0)}K`;

/* ────────────────────────────────────────────────────────────────────────────
 * BUILD NODES & EDGES — config-driven, no metric-specific branches
 * ──────────────────────────────────────────────────────────────────────────── */

function buildGraph(
  entities: DemoEntity[],
  config: MetricVisualizationConfig,
): { nodes: PyramidNode[]; edges: PyramidEdge[] } {
  const nodes: PyramidNode[] = [];
  const edges: PyramidEdge[] = [];
  const nodeMap = new Map<string, PyramidNode>();
  const { metric_fields } = config;

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

  /** Compute metric value for a group of entities using the config. */
  const computeGroupMetric = (group: DemoEntity[]) => computeRollup(group, config);

  /** Get the primary "weight" or "committed" value from an entity. */
  const getWeight = (e: DemoEntity) => {
    const wField = metric_fields.weight_value ?? metric_fields.numerator_value ?? 'committed_amt';
    return Number(e.fields[wField]) || Number(e.fields['committed_amt']) || 0;
  };

  /** Get the secondary display value (denominator for ratio, or nothing). */
  const getSecondary = (e: DemoEntity) => {
    if (metric_fields.denominator_value) {
      return Number(e.fields[metric_fields.denominator_value]) || 0;
    }
    return undefined;
  };

  // Business Segment level
  const lobName = entities[0]?.lob_name ?? 'Business Segment';
  const lobId = 'lob-' + lobName.replace(/\s/g, '-');
  const lobNode = makeNode(lobId, 'lob', lobName);
  lobNode.committed = entities.reduce((s, e) => s + getWeight(e), 0);
  lobNode.secondaryValue = metric_fields.denominator_value
    ? entities.reduce((s, e) => s + (getSecondary(e) ?? 0), 0)
    : undefined;
  lobNode.metricValue = computeGroupMetric(entities);

  // Portfolio level
  const portfolios = [...new Set(entities.map(e => e.portfolio_name).filter(Boolean))];
  for (const pName of portfolios) {
    const pEntities = entities.filter(e => e.portfolio_name === pName);
    const pId = 'port-' + pName!.replace(/\s/g, '-');
    const pNode = makeNode(pId, 'portfolio', pName!);
    pNode.committed = pEntities.reduce((s, e) => s + getWeight(e), 0);
    pNode.secondaryValue = metric_fields.denominator_value
      ? pEntities.reduce((s, e) => s + (getSecondary(e) ?? 0), 0)
      : undefined;
    pNode.metricValue = computeGroupMetric(pEntities);
    addEdge(lobId, pId);
  }

  // Desk level
  const desks = [...new Set(entities.map(e => e.desk_name).filter(Boolean))];
  for (const dName of desks) {
    const dEntities = entities.filter(e => e.desk_name === dName);
    const dId = 'desk-' + dName!.replace(/\s/g, '-');
    const dNode = makeNode(dId, 'desk', dName!);
    dNode.committed = dEntities.reduce((s, e) => s + getWeight(e), 0);
    dNode.secondaryValue = metric_fields.denominator_value
      ? dEntities.reduce((s, e) => s + (getSecondary(e) ?? 0), 0)
      : undefined;
    dNode.metricValue = computeGroupMetric(dEntities);
    const parentPortfolioName = dEntities[0]?.portfolio_name;
    if (parentPortfolioName) {
      const pId = 'port-' + parentPortfolioName.replace(/\s/g, '-');
      addEdge(pId, dId);
    }
  }

  // Counterparty level
  const cpMap = new Map<string, DemoEntity>();
  for (const e of entities) {
    if (!cpMap.has(e.counterparty_id)) cpMap.set(e.counterparty_id, e);
  }
  for (const [cpIdKey, cpExample] of cpMap) {
    const cpEntities = entities.filter(e => e.counterparty_id === cpIdKey);
    const cpId = 'cp-' + cpIdKey;
    const cpNode = makeNode(cpId, 'counterparty', cpExample.counterparty_name, cpIdKey);
    cpNode.committed = cpEntities.reduce((s, e) => s + getWeight(e), 0);
    cpNode.secondaryValue = metric_fields.denominator_value
      ? cpEntities.reduce((s, e) => s + (getSecondary(e) ?? 0), 0)
      : undefined;
    cpNode.metricValue = computeGroupMetric(cpEntities);
  }

  // Facility level
  for (const e of entities) {
    const fId = 'fac-' + e.entity_id;
    const fNode = makeNode(fId, 'facility', e.entity_name, e.entity_id);
    fNode.committed = getWeight(e);
    fNode.secondaryValue = getSecondary(e);
    fNode.metricValue = Number(e.fields[metric_fields.primary_value]) || 0;

    const deskId = e.desk_name ? 'desk-' + e.desk_name.replace(/\s/g, '-') : null;
    if (deskId) addEdge(deskId, fId);

    const cpId = 'cp-' + e.counterparty_id;
    addEdge(cpId, fId);
  }

  // Position level
  for (const e of entities) {
    if (!e.positions?.length) continue;
    const posId = 'pos-' + e.entity_id;
    const posTotal = e.positions.reduce((s, p) => s + p.balance_amount, 0);
    const posNode = makeNode(posId, 'position', `${e.positions.length} positions`, e.entity_id);
    posNode.committed = posTotal;
    posNode.posCount = e.positions.length;
    addEdge('fac-' + e.entity_id, posId);
  }

  return { nodes, edges };
}

/* ────────────────────────────────────────────────────────────────────────────
 * LAYOUT
 * ──────────────────────────────────────────────────────────────────────────── */

interface NodePos { id: string; x: number; y: number; w: number; h: number; }

const NW = 148; const NH = 54; const RG = 56; const CG = 16; const PX = 24; const PY = 24;

function computePositions(nodes: PyramidNode[]): { positions: NodePos[]; width: number; height: number } {
  const levelRows = new Map<LevelKey, PyramidNode[]>();
  for (const level of LEVEL_ORDER) levelRows.set(level, nodes.filter(n => n.level === level));

  const deskNodes = levelRows.get('desk') ?? [];
  const cpNodes = levelRows.get('counterparty') ?? [];
  const combinedCount = deskNodes.length + cpNodes.length;

  const rowWidths = new Map<LevelKey, number>();
  for (const level of LEVEL_ORDER) {
    const row = levelRows.get(level) ?? [];
    if (level === 'desk' || level === 'counterparty') {
      rowWidths.set('desk', combinedCount * NW + (combinedCount - 1) * CG + 40);
    } else {
      rowWidths.set(level, row.length * NW + Math.max(0, row.length - 1) * CG);
    }
  }

  let maxRowWidth = 0;
  for (const w of rowWidths.values()) if (w > maxRowWidth) maxRowWidth = w;
  const svgWidth = maxRowWidth + PX * 2;

  const positions: NodePos[] = [];
  const visualRows = [
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
    let effectiveRowW = rowW;
    if (row.levels.length === 2) effectiveRowW = rowW + 40;
    const startX = (svgWidth - effectiveRowW) / 2;

    let xCursor = startX;
    for (let ni = 0; ni < row.nodes.length; ni++) {
      if (row.levels.length === 2 && ni === deskNodes.length && deskNodes.length > 0) xCursor += 40;
      positions.push({ id: row.nodes[ni].id, x: xCursor, y, w: NW, h: NH });
      xCursor += NW + CG;
    }
  }

  const svgHeight = PY * 2 + visualRows.length * NH + (visualRows.length - 1) * RG;
  return { positions, width: svgWidth, height: svgHeight };
}

/* ────────────────────────────────────────────────────────────────────────────
 * CONNECTED SET
 * ──────────────────────────────────────────────────────────────────────────── */

function getConnected(nodeId: string, nodes: PyramidNode[]): Set<string> {
  const nm = new Map(nodes.map(n => [n.id, n]));
  const connected = new Set<string>([nodeId]);
  const upQ = [nodeId];
  while (upQ.length > 0) {
    const cur = upQ.shift()!;
    for (const pid of nm.get(cur)?.parentIds ?? []) { if (!connected.has(pid)) { connected.add(pid); upQ.push(pid); } }
  }
  const downQ = [nodeId];
  while (downQ.length > 0) {
    const cur = downQ.shift()!;
    for (const cid of nm.get(cur)?.childIds ?? []) { if (!connected.has(cid)) { connected.add(cid); downQ.push(cid); } }
  }
  return connected;
}

/* ────────────────────────────────────────────────────────────────────────────
 * MAIN COMPONENT — Config-driven
 * ──────────────────────────────────────────────────────────────────────────── */

interface HierarchyPyramidProps {
  item: CatalogueItem;
  config: MetricVisualizationConfig;
  entities?: DemoEntity[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function HierarchyPyramid({ item, config, entities: externalEntities, activeTab, onTabChange }: HierarchyPyramidProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Use external entities, or fall back to config's demo_entities
  const entities = useMemo(() => externalEntities ?? config.demo_entities ?? [], [externalEntities, config.demo_entities]);

  const { nodes, edges } = useMemo(() => buildGraph(entities, config), [entities, config]);
  const { positions, width, height } = useMemo(() => computePositions(nodes), [nodes]);

  const posMap = useMemo(() => new Map(positions.map(p => [p.id, p])), [positions]);
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const connected = useMemo(() => {
    if (!hovered) return new Set<string>();
    return getConnected(hovered, nodes);
  }, [hovered, nodes]);

  const connectedEdges = useMemo(() => {
    if (!hovered) return new Set<number>();
    const s = new Set<number>();
    edges.forEach((e, i) => { if (connected.has(e.from) && connected.has(e.to)) s.add(i); });
    return s;
  }, [hovered, connected, edges]);

  if (entities.length === 0) return null;

  const { value_format } = config;
  const hasDenominator = !!config.metric_fields.denominator_value;

  return (
    <div className="rounded-xl border border-gray-800 bg-black/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">Hierarchy Overview</span>
          <span className="text-[9px] text-gray-600">Click a node to explore that level</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          {LEVEL_ORDER.map(level => {
            const s = LEVEL_STYLE[level];
            return (
              <span key={level} className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${s.bg} ${s.text} border ${s.border}`}>
                {s.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* SVG Pyramid — desktop */}
      <div className="hidden md:block overflow-x-auto">
        <div style={{ minWidth: width, minHeight: height }} className="relative mx-auto" role="img" aria-label={`Hierarchy pyramid showing ${item.abbreviation} rollup`}>
          <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
            {edges.map((edge, i) => {
              const fp = posMap.get(edge.from);
              const tp = posMap.get(edge.to);
              if (!fp || !tp) return null;
              const fromNode = nodeMap.get(edge.from);
              const style = fromNode ? LEVEL_STYLE[fromNode.level] : LEVEL_STYLE.facility;
              const x1 = fp.x + fp.w / 2, y1 = fp.y + fp.h;
              const x2 = tp.x + tp.w / 2, y2 = tp.y;
              const dy = (y2 - y1) * 0.4;
              const hi = hovered && connectedEdges.has(i);
              const dim = hovered && !hi;
              return (
                <path key={i} d={`M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`}
                  fill="none" stroke={hi ? style.svgColor : 'rgba(255,255,255,0.08)'} strokeWidth={hi ? 2 : 1}
                  style={{ opacity: dim ? 0.05 : ready ? 1 : 0, transition: `opacity 0.4s ${i * 40}ms, stroke 0.2s` }}
                />
              );
            })}
          </svg>

          {positions.map((pos, i) => {
            const node = nodeMap.get(pos.id);
            if (!node) return null;
            const s = LEVEL_STYLE[node.level];
            const dim = hovered && !connected.has(pos.id);
            const isHovered = hovered === pos.id;
            const isActiveLevel = activeTab === node.level;

            return (
              <div key={pos.id}
                className={`absolute rounded-lg border transition-all duration-200 cursor-pointer select-none
                  ${isActiveLevel ? `${s.activeBg} ${s.activeBorder} ring-1 ring-white/10` : `${s.bg} ${s.border}`}
                  ${dim ? 'opacity-[0.12]' : ''} ${isHovered ? 'scale-[1.06] z-20 shadow-lg shadow-black/50' : 'z-0'}`}
                style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h,
                  opacity: ready ? undefined : 0, transform: ready ? undefined : 'translateY(6px)',
                  transition: `all 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 30}ms` }}
                onMouseEnter={() => setHovered(pos.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onTabChange?.(node.level)}
              >
                <div className="px-2 py-1.5 h-full flex flex-col justify-center min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`text-[7px] font-bold uppercase tracking-wider px-1 py-px rounded ${s.bg} ${s.text}`}>{s.label}</span>
                    <span className="text-[9px] text-gray-300 truncate font-medium">{node.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {node.metricValue !== undefined && (
                      <span className={`text-xs font-bold font-mono ${getValueColor(node.metricValue, value_format)}`}>
                        {fmtVal(node.metricValue, value_format)}
                      </span>
                    )}
                    {node.committed !== undefined && node.level !== 'position' && (
                      <span className="text-[9px] font-mono text-gray-500">
                        {hasDenominator
                          ? `${fmtCurrency(node.committed)}/${fmtCurrency(node.secondaryValue ?? 0)}`
                          : fmtCurrency(node.committed)
                        }
                      </span>
                    )}
                    {node.level === 'position' && node.posCount !== undefined && (
                      <span className="text-[9px] font-mono text-gray-500">
                        {node.posCount} pos {fmtCurrency(node.committed ?? 0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {[
            { label: 'Business Segment (L1)', y: PY },
            { label: 'Portfolio (L2)', y: PY + (NH + RG) },
            { label: 'Desk / Counterparty', y: PY + 2 * (NH + RG) },
            { label: 'Facility', y: PY + 3 * (NH + RG) },
            { label: 'Position', y: PY + 4 * (NH + RG) },
          ].map(r => (
            <div key={r.label} className="absolute text-[8px] font-bold uppercase tracking-wider text-gray-700 pointer-events-none"
              style={{ left: 4, top: r.y + NH / 2 - 6, width: 80 }}>
              {r.label}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile fallback */}
      <div className="md:hidden space-y-1.5">
        {LEVEL_ORDER.map(level => {
          const levelNodes = nodes.filter(n => n.level === level);
          const s = LEVEL_STYLE[level];
          const isActiveLevel = activeTab === level;
          return (
            <button key={level} onClick={() => onTabChange?.(level)}
              className={`w-full text-left rounded-lg border p-2 transition-all ${isActiveLevel ? `${s.activeBg} ${s.activeBorder} ring-1 ring-white/10` : `${s.bg} ${s.border} hover:bg-white/[0.02]`}`}>
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${s.bg} ${s.text}`}>{s.label}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {levelNodes.map(n => (
                    <span key={n.id} className="text-[10px] text-gray-300">
                      {n.label}
                      {n.metricValue !== undefined && (
                        <span className={`ml-1 font-mono font-bold ${getValueColor(n.metricValue, value_format)}`}>
                          {fmtVal(n.metricValue, value_format)}
                        </span>
                      )}
                      {n.posCount !== undefined && <span className="ml-1 font-mono text-gray-500">{n.posCount} pos</span>}
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
