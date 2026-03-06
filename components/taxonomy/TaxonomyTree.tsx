'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, Search, X } from 'lucide-react';
import {
  TaxonomyNode,
  getFlatNodes,
  buildTree,
  countLeaves,
  LEVEL_LABELS,
  LEVEL_COLORS,
} from './taxonomy-data';

function TreeNode({
  node,
  expanded,
  onToggle,
  searchMatch,
  depth = 0,
}: {
  node: TaxonomyNode;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  searchMatch: Set<number>;
  depth?: number;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const colors = LEVEL_COLORS[node.level] || LEVEL_COLORS[3];
  const isMatch = searchMatch.size > 0 && searchMatch.has(node.id);
  const leaves = hasChildren ? countLeaves(node) : 0;

  return (
    <div>
      <button
        onClick={() => hasChildren && onToggle(node.id)}
        className={`
          w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all group
          ${hasChildren ? 'cursor-pointer hover:bg-slate-800/60' : 'cursor-default'}
          ${isMatch ? 'ring-1 ring-amber-400/50 bg-amber-500/5' : ''}
        `}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {/* Expand/collapse chevron */}
        <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
          )}
        </span>

        {/* Level dot */}
        <span
          className={`
            inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono leading-none flex-shrink-0
            ${colors.bg} ${colors.border} ${colors.text} border
          `}
        >
          L{node.level}
        </span>

        {/* Name */}
        <span
          className={`
            flex-1 text-sm truncate
            ${node.level === 0 ? 'font-bold text-amber-300' : ''}
            ${node.level === 1 ? 'font-semibold text-blue-300' : ''}
            ${node.level === 2 ? 'font-medium text-emerald-300' : ''}
            ${node.level === 3 ? 'text-slate-400' : ''}
            ${isMatch ? 'text-amber-200' : ''}
          `}
        >
          {node.name}
        </span>

        {/* Counts badge */}
        {hasChildren && !isExpanded && (
          <span className="text-[11px] text-slate-600 font-mono flex-shrink-0">
            {node.children!.length} direct &middot; {leaves} desks
          </span>
        )}

        {/* Segment code on hover */}
        <span className="text-[10px] text-slate-700 font-mono opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {node.code}
        </span>
      </button>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              searchMatch={searchMatch}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaxonomyTree() {
  const tree = useMemo(() => buildTree(getFlatNodes()), []);
  const flat = useMemo(() => getFlatNodes(), []);

  // Start with L1 (divisions) expanded
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([249]));
  const [search, setSearch] = useState('');

  // Compute search matches and auto-expand path
  const { searchMatch, searchExpanded } = useMemo(() => {
    if (!search.trim()) return { searchMatch: new Set<number>(), searchExpanded: new Set<number>() };

    const q = search.toLowerCase();
    const matches = new Set<number>();
    const toExpand = new Set<number>();

    // Find matching nodes
    flat.forEach(n => {
      if (n.name.toLowerCase().includes(q) || n.code.toLowerCase().includes(q)) {
        matches.add(n.id);
      }
    });

    // Expand ancestors of matches
    const parentMap = new Map<number, number | null>();
    flat.forEach(n => parentMap.set(n.id, n.parentId));

    matches.forEach(id => {
      let current = parentMap.get(id);
      while (current !== null && current !== undefined) {
        toExpand.add(current);
        current = parentMap.get(current);
      }
    });

    return { searchMatch: matches, searchExpanded: toExpand };
  }, [search, flat]);

  const effectiveExpanded = search.trim() ? searchExpanded : expanded;

  const onToggle = useCallback((id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Stats
  const stats = useMemo(() => {
    const byLevel: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    flat.forEach(n => { byLevel[n.level] = (byLevel[n.level] || 0) + 1; });
    return byLevel;
  }, [flat]);

  const expandAll = () => {
    const all = new Set(flat.filter(n => !n.isLeaf).map(n => n.id));
    setExpanded(all);
  };

  const collapseAll = () => {
    setExpanded(new Set([249]));
  };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {([1, 2, 3] as const).map(level => {
          const colors = LEVEL_COLORS[level];
          return (
            <div
              key={level}
              className={`rounded-lg border ${colors.border} ${colors.bg} px-4 py-3`}
            >
              <div className={`text-2xl font-bold font-mono ${colors.text}`}>
                {stats[level]}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {LEVEL_LABELS[level]}s
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search segments, desks, portfolios..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-slate-400"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={expandAll}
          className="px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors"
        >
          Collapse
        </button>
        {search && (
          <span className="text-xs text-slate-600 font-mono">
            {searchMatch.size} match{searchMatch.size !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-600">
        {([0, 1, 2, 3] as const).map(level => {
          const colors = LEVEL_COLORS[level];
          return (
            <span key={level} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
              <span>{LEVEL_LABELS[level]}</span>
            </span>
          );
        })}
      </div>

      {/* Tree */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="p-2 max-h-[calc(100vh-350px)] overflow-y-auto">
          <TreeNode
            node={tree}
            expanded={effectiveExpanded}
            onToggle={onToggle}
            searchMatch={searchMatch}
          />
        </div>
      </div>

      {/* Table info */}
      <div className="text-xs text-slate-700 font-mono px-1">
        Source: l1.enterprise_business_taxonomy &middot; {flat.length} nodes &middot; Self-referencing hierarchy via parent_segment_id
      </div>
    </div>
  );
}
