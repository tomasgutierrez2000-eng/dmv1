'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, X, ChevronDown, ChevronRight, ArrowLeft, ExternalLink,
  Layers, Zap, Info, Grid3x3, Hash,
  TrendingUp, Table2, Tag, AlertTriangle, FileCode, FolderOpen,
} from 'lucide-react';
import Link from 'next/link';
import {
  DASHBOARD_PAGES, DIMENSION_LABELS,
  metricsByPage,
  type L3Metric, type DashboardPage, type PageInfo,
  type LineageNode, type LineageEdge, type DimensionInteraction,
} from '@/data/l3-metrics';
import {
  L3_TABLES,
  getL3Categories,
  type L3TableDef,
  type L3Tier,
} from '@/data/l3-tables';

// Sample values in L3 metrics align with the same reference scenario as L1/L2 sample data
// (e.g. visualizer and Facility Summary). No L1/L2 APIs or store are used here — L3 is display-only.
const SAMPLE_DATA_CONTEXT =
  'Sample values align with L1/L2 reference scenario (e.g. facility_id = FAC-2024-00847). Use the Visualizer to explore the same data at L1/L2.';

// ═══════════════════════════════════════════════════════════════
// Layer styling
// ═══════════════════════════════════════════════════════════════

const LAYER_STYLE: Record<string, { bg: string; border: string; text: string; badge: string; svgColor: string; label: string }> = {
  L1:        { bg: 'bg-blue-950/60',    border: 'border-blue-500/40',    text: 'text-blue-300',    badge: 'bg-blue-500/20 text-blue-300',     svgColor: '#3b82f6', label: 'L1 Reference' },
  L2:        { bg: 'bg-amber-950/60',   border: 'border-amber-500/40',   text: 'text-amber-300',   badge: 'bg-amber-500/20 text-amber-300',   svgColor: '#f59e0b', label: 'L2 Snapshot' },
  L3:        { bg: 'bg-emerald-950/60', border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300', svgColor: '#10b981', label: 'L3 Derived' },
  transform: { bg: 'bg-purple-950/60',  border: 'border-purple-500/40',  text: 'text-purple-300',  badge: 'bg-purple-500/20 text-purple-300',  svgColor: '#a855f7', label: 'Transform' },
};

const METRIC_TYPE_ICON: Record<string, React.ReactNode> = {
  Aggregate: <Hash className="w-3.5 h-3.5" />,
  Ratio: <TrendingUp className="w-3.5 h-3.5" />,
  Count: <Grid3x3 className="w-3.5 h-3.5" />,
  Derived: <Zap className="w-3.5 h-3.5" />,
  Status: <AlertTriangle className="w-3.5 h-3.5" />,
  Trend: <TrendingUp className="w-3.5 h-3.5" />,
  Table: <Table2 className="w-3.5 h-3.5" />,
  Categorical: <Tag className="w-3.5 h-3.5" />,
};

const DIM_INTERACTION_STYLE: Record<DimensionInteraction, { bg: string; text: string; label: string }> = {
  FILTER:    { bg: 'bg-blue-500/20',   text: 'text-blue-300',   label: 'Filter' },
  GROUP_BY:  { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Group By' },
  AVAILABLE: { bg: 'bg-gray-500/20',   text: 'text-gray-400',   label: 'Available' },
  TOGGLE:    { bg: 'bg-amber-500/20',  text: 'text-amber-300',  label: 'Toggle' },
};

// ═══════════════════════════════════════════════════════════════
// Lineage Flow Visualization (SVG + HTML)
// ═══════════════════════════════════════════════════════════════

interface NodePosition { id: string; x: number; y: number; w: number; h: number }

function computeLayout(nodes: LineageNode[], edges: LineageEdge[]): { positions: NodePosition[]; width: number; height: number } {
  const colMap: Record<string, number> = { L1: 0, L2: 1, transform: 2, L3: 3 };
  const columns: LineageNode[][] = [[], [], [], []];
  for (const n of nodes) columns[colMap[n.layer] ?? 2].push(n);

  // Move L3 source refs (ones with outgoing edges) to col 1
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

function LineageFlow({ metric }: { metric: L3Metric }) {
  const nodes = useMemo(() => metric.nodes || [], [metric.nodes]);
  const edges = useMemo(() => metric.edges || [], [metric.edges]);

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

  return (
    <div className="overflow-x-auto">
      <div style={{ width, height, position: 'relative', minHeight: height }}>
        {/* SVG edges */}
        <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
          <defs>
            <marker id={`ah-${metric.id}`} markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
              <path d="M0,0 L7,2.5 L0,5" fill="rgba(255,255,255,0.25)" />
            </marker>
            {['L1','L2','L3','transform'].map(l => (
              <marker key={l} id={`ah-${metric.id}-${l}`} markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
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
                  markerEnd={`url(#ah-${metric.id}${hi ? `-${layer}` : ''})`}
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

        {/* HTML nodes */}
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

// ═══════════════════════════════════════════════════════════════
// Equation Breakdown
// ═══════════════════════════════════════════════════════════════

function EquationBreakdown({ metric }: { metric: L3Metric }) {
  if (!metric.nodes || !metric.edges) return null;
  const final = metric.nodes.find(n => n.layer === 'L3' && !metric.edges!.some(e => e.from === n.id));
  if (!final) return null;

  const inputs = metric.edges!.filter(e => e.to === final.id)
    .map(e => ({ node: metric.nodes!.find(n => n.id === e.from)!, edge: e }))
    .filter(x => x.node);

  return (
    <div className="flex items-center gap-2.5 flex-wrap justify-center py-3">
      {inputs.map(({ node, edge }, i) => {
        const s = LAYER_STYLE[node.layer] || LAYER_STYLE.transform;
        return (
          <React.Fragment key={node.id}>
            {i > 0 && <span className="text-lg font-bold text-gray-500">{edge.label || '→'}</span>}
            <div className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border ${s.border} ${s.bg}`}>
              <span className="text-sm font-bold font-mono text-white">{node.sampleValue}</span>
              <span className={`text-[10px] font-medium ${s.text}`}>
                {node.fields && node.fields.length > 1 ? node.fields.join(', ') : node.field}
              </span>
            </div>
          </React.Fragment>
        );
      })}
      <span className="text-lg font-bold text-gray-500">=</span>
      <div className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
        <span className="text-lg font-bold font-mono text-emerald-400">{final.sampleValue}</span>
        <span className="text-[10px] font-semibold text-emerald-300">{final.field}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Metric Card (expanded view)
// ═══════════════════════════════════════════════════════════════

function MetricCard({ metric, pageInfo }: { metric: L3Metric; pageInfo: PageInfo }) {
  const [expanded, setExpanded] = useState(false);
  const hasLineage = metric.nodes && metric.nodes.length > 0;

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${expanded ? 'border-white/10 bg-white/[0.02]' : 'border-white/[0.04] hover:border-white/10'}`}>
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Metric ID badge */}
        <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-500 flex-shrink-0 w-12 text-center">
          {metric.id}
        </span>
        {/* Type icon */}
        <span className="flex-shrink-0 text-gray-500">{METRIC_TYPE_ICON[metric.metricType]}</span>
        {/* Name */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-white">{metric.name}</span>
          <span className="text-[10px] text-gray-500 ml-2">{metric.metricType}</span>
        </div>
        {/* Formula preview */}
        <span className="text-[11px] text-gray-500 font-mono truncate max-w-[200px] hidden md:block">
          {metric.formula}
        </span>
        {/* Sample value */}
        <span className="text-sm font-mono font-semibold text-emerald-400 flex-shrink-0 w-20 text-right">
          {metric.sampleValue}
        </span>
        {/* Lineage indicator */}
        {hasLineage && (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-500" title="Has visual lineage" />
        )}
        {/* Chevron */}
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-white/5 px-4 py-4 space-y-4">
          {/* Description */}
          <p className="text-sm text-gray-400 leading-relaxed">{metric.description}</p>

          {/* How this value is calculated — formula and result */}
          <div className="bg-black/20 rounded-lg px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-1.5">How this value is calculated</div>
            <div className="text-sm font-mono text-purple-300">{metric.formula}</div>
            <div className="mt-2 text-xs text-gray-400">
              With sample data: <span className="text-emerald-400 font-mono font-medium">{metric.formula}</span>
              <span className="text-gray-500"> → </span>
              <span className="text-emerald-400 font-mono font-semibold">{metric.sampleValue ?? '—'}</span>
            </div>
            {metric.formulaSQL && (
              <div className="text-xs font-mono text-gray-500 mt-2 pt-2 border-t border-white/5">
                <span className="text-gray-600">SQL: </span>{metric.formulaSQL}
              </div>
            )}
          </div>

          {/* Source fields */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-2">Atomic Source Fields</div>
            <div className="flex flex-wrap gap-2">
              {metric.sourceFields.map((sf, i) => {
                const s = LAYER_STYLE[sf.layer];
                return (
                  <div key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${s.border} ${s.bg}`}>
                    <span className={`text-[9px] font-bold ${s.text}`}>{sf.layer}</span>
                    <span className="text-[11px] text-white font-mono">{sf.table}.{sf.field}</span>
                    {sf.sampleValue && (
                      <span className="text-[10px] text-emerald-400 font-mono ml-1">{sf.sampleValue}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dimensions */}
          {metric.dimensions.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-2">Dimensions</div>
              <div className="flex flex-wrap gap-1.5">
                {metric.dimensions.map((d, i) => {
                  const ds = DIM_INTERACTION_STYLE[d.interaction];
                  return (
                    <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${ds.bg} ${ds.text}`}>
                      {ds.label}: {DIMENSION_LABELS[d.dimension] || d.dimension}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Visual lineage flow */}
          {hasLineage && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-2">Data Lineage Flow</div>
              <div className="bg-black/10 rounded-lg p-3">
                <LineageFlow metric={metric} />
              </div>
            </div>
          )}

          {/* Equation breakdown (with lineage) or simple calculation (no lineage) */}
          {hasLineage ? (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-2">Equation Breakdown (Sample Data)</div>
              <div className="bg-black/10 rounded-lg p-3">
                <EquationBreakdown metric={metric} />
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-2">Calculation (sample data)</div>
              <div className="bg-black/10 rounded-lg p-3 text-sm font-mono text-gray-300">
                <span className="text-purple-300">{metric.formula}</span>
                <span className="text-gray-500 mx-1">→</span>
                <span className="text-emerald-400 font-semibold">{metric.sampleValue ?? '—'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Explorer Component
// ═══════════════════════════════════════════════════════════════

type ViewMode = 'metrics' | 'tables';

export default function LineageExplorer() {
  const [viewMode, setViewMode] = useState<ViewMode>('metrics');
  const [activePage, setActivePage] = useState<DashboardPage>('P1');
  const [search, setSearch] = useState('');

  const pageInfo = useMemo(() => DASHBOARD_PAGES.find(p => p.id === activePage)!, [activePage]);
  const pageMetrics = useMemo(() => {
    let metrics = metricsByPage(activePage);
    if (search.trim()) {
      const q = search.toLowerCase();
      metrics = metrics.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.formula.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );
    }
    return metrics;
  }, [activePage, search]);

  // Group metrics by section
  const sections = useMemo(() => {
    const map = new Map<string, L3Metric[]>();
    for (const m of pageMetrics) {
      if (!map.has(m.section)) map.set(m.section, []);
      map.get(m.section)!.push(m);
    }
    return map;
  }, [pageMetrics]);

  // Stats
  const stats = useMemo(() => {
    const all = metricsByPage(activePage);
    return {
      total: all.length,
      withLineage: all.filter(m => m.nodes && m.nodes.length > 0).length,
      types: [...new Set(all.map(m => m.metricType))],
    };
  }, [activePage]);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex">
      {/* ── Sidebar: Page Navigation ── */}
      <aside className="w-56 flex-shrink-0 border-r border-white/[0.04] bg-[#080c16] flex flex-col">
        <div className="p-4 border-b border-white/[0.04]">
          <Link href="/overview" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm mb-3">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <h1 className="text-sm font-bold flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-purple-400" />
            L3
          </h1>
          <div className="flex rounded-lg bg-white/[0.04] p-0.5 mb-3">
            <button
              onClick={() => setViewMode('metrics')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                viewMode === 'metrics' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Metrics
            </button>
            <button
              onClick={() => setViewMode('tables')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                viewMode === 'tables' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              Tables
            </button>
          </div>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {viewMode === 'tables' ? (
            <div className="px-3 text-[10px] text-gray-500">
              <div className="font-semibold text-gray-400 mb-1">49 L3 tables</div>
              <div className="space-y-0.5">
                {([1, 2, 3, 4] as L3Tier[]).map(t => (
                  <div key={t}>Tier {t}: {L3_TABLES.filter(tbl => tbl.tier === t).length} tables</div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {DASHBOARD_PAGES.map(page => {
                const count = metricsByPage(page.id).length;
                const isActive = activePage === page.id;
                return (
                  <button
                    key={page.id}
                    onClick={() => { setActivePage(page.id); setSearch(''); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all ${
                      isActive
                        ? 'bg-white/[0.06] border-l-2'
                        : 'hover:bg-white/[0.02] border-l-2 border-transparent'
                    }`}
                    style={isActive ? { borderLeftColor: page.color } : undefined}
                  >
                    <span className="text-base">{page.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-gray-400'}`}>
                        {page.shortName}
                      </div>
                      <div className="text-[10px] text-gray-600">{page.id} · {count} metrics</div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </nav>
        {/* Legend */}
        <div className="p-3 border-t border-white/[0.04]">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-600 mb-2">Layer Legend</div>
          {(['L1','L2','transform','L3'] as const).map(l => {
            const s = LAYER_STYLE[l];
            return (
              <div key={l} className="flex items-center gap-1.5 py-0.5">
                <div className={`w-2 h-2 rounded-sm ${s.bg} border ${s.border}`} />
                <span className={`text-[10px] ${s.text}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto">
        {viewMode === 'tables' ? (
          <>
            <header className="sticky top-0 z-30 bg-[#0a0e1a]/95 backdrop-blur-xl border-b border-white/[0.04]">
              <div className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-6 h-6 text-emerald-400" />
                  <div>
                    <h2 className="text-lg font-bold text-white">L3 Table View</h2>
                    <p className="text-xs text-gray-500">49 reporting tables · DDL &amp; population in sql/l3/</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <a
                      href="/api/l3/sql?file=00_README.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      README
                    </a>
                    <a
                      href="/api/l3/sql?file=01_DDL_all_tables.sql"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      DDL
                    </a>
                    <Link href="/visualizer" className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-gray-500 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                      ERD
                    </Link>
                  </div>
                </div>
              </div>
            </header>
            <div className="px-6 py-5">
              <div className="mb-4 flex items-center gap-2 text-[10px] text-gray-500">
                <span>Tier 1 = L1+L2 only → Tier 2 → Tier 3 → Tier 4 (see 06_ORCHESTRATOR.sql)</span>
              </div>
              {getL3Categories().map(cat => {
                const tables = L3_TABLES.filter(t => t.category === cat);
                return (
                  <div key={cat} className="mb-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-emerald-500/50" />
                      {cat}
                      <span className="text-gray-600">({tables.length})</span>
                    </h3>
                    <div className="space-y-1.5">
                      {tables.map(t => (
                        <div
                          key={t.id}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                        >
                          <span className="text-[10px] font-bold font-mono w-10 text-gray-500">{t.id}</span>
                          <span className="text-sm font-medium text-white font-mono">l3.{t.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-300">
                            Tier {t.tier}
                          </span>
                          <a
                            href="/api/l3/sql?file=01_DDL_all_tables.sql"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto text-[10px] text-gray-500 hover:text-purple-400 transition-colors flex items-center gap-1"
                          >
                            <FileCode className="w-3 h-3" />
                            DDL
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <header className="sticky top-0 z-30 bg-[#0a0e1a]/95 backdrop-blur-xl border-b border-white/[0.04]">
              <div className="px-6 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{pageInfo.icon}</span>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: pageInfo.color }}>
                      {pageInfo.id}: {pageInfo.name}
                    </h2>
                    <p className="text-xs text-gray-500">{pageInfo.description}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
                    <span>{stats.total} metrics</span>
                    <span>{stats.withLineage} with lineage</span>
                    <Link
                      href="/visualizer"
                      className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      ERD
                    </Link>
                  </div>
                </div>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={`Search ${pageInfo.shortName} metrics...`}
                    className="w-full pl-9 pr-8 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </header>

            <div className="px-6 py-5">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 mb-4">
                <p className="text-[11px] text-emerald-200/90">{SAMPLE_DATA_CONTEXT}</p>
              </div>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Types:</span>
                {stats.types.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                    {METRIC_TYPE_ICON[t]} {t}
                  </span>
                ))}
                <span className="flex items-center gap-1 text-[10px] text-purple-400 ml-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" /> = Has visual lineage
                </span>
              </div>

              {pageMetrics.length === 0 && (
                <div className="text-center py-16 text-gray-600">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>No metrics match &ldquo;{search}&rdquo;</p>
                </div>
              )}

              {Array.from(sections.entries()).map(([section, metrics]) => (
                <div key={section} className="mb-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: pageInfo.color }} />
                    {section}
                    <span className="text-gray-600">({metrics.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {metrics.map(m => (
                      <MetricCard key={m.id} metric={m} pageInfo={pageInfo} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
