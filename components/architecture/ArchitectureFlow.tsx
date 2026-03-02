'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Minimize2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  STAGES,
  STAGE_CONNECTIONS,
  type ArchStage,
  type ArchNode,
} from './architectureData';

/* ═══════════════════════════════════════════════════════════════════════════
 * SVG Arrow between stages
 * ═══════════════════════════════════════════════════════════════════════════ */

function StageArrow({
  label,
  animated,
}: {
  label?: string;
  animated: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-0.5 min-w-[36px] shrink-0 self-center">
      <svg width="36" height="24" viewBox="0 0 36 24" className="overflow-visible">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#475569" />
          </marker>
        </defs>
        <line
          x1="0"
          y1="12"
          x2="28"
          y2="12"
          stroke="#475569"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
          strokeDasharray={animated ? '6 4' : 'none'}
        >
          {animated && (
            <animate
              attributeName="stroke-dashoffset"
              from="20"
              to="0"
              dur="1.5s"
              repeatCount="indefinite"
            />
          )}
        </line>
      </svg>
      {label && (
        <span className="text-[9px] text-slate-500 whitespace-nowrap leading-none">
          {label}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Internal flow arrow (vertical, within a stage)
 * ═══════════════════════════════════════════════════════════════════════════ */

function InternalArrow() {
  return (
    <div className="flex justify-center py-0.5">
      <svg width="16" height="16" viewBox="0 0 16 16">
        <defs>
          <marker
            id="arrowdown"
            markerWidth="6"
            markerHeight="5"
            refX="3"
            refY="5"
            orient="auto"
          >
            <polygon points="0 0, 6 0, 3 5" fill="#475569" />
          </marker>
        </defs>
        <line
          x1="8"
          y1="0"
          x2="8"
          y2="12"
          stroke="#475569"
          strokeWidth="1.5"
          markerEnd="url(#arrowdown)"
        />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Node Card (compact + expanded)
 * ═══════════════════════════════════════════════════════════════════════════ */

function NodeCard({
  node,
  isExpanded,
  onToggle,
  dimmed,
}: {
  node: ArchNode;
  isExpanded: boolean;
  onToggle: () => void;
  dimmed: boolean;
}) {
  const Icon = node.icon;

  return (
    <motion.div
      layout
      className={`
        rounded-lg border cursor-pointer transition-all duration-300 overflow-hidden
        ${isExpanded
          ? 'bg-slate-800/90 border-slate-600 shadow-lg'
          : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/40'
        }
        ${dimmed ? 'opacity-40' : 'opacity-100'}
      `}
      onClick={onToggle}
      style={
        isExpanded
          ? { boxShadow: `0 0 20px 2px ${node.accentColor}15, 0 0 6px 1px ${node.accentColor}10` }
          : undefined
      }
    >
      {/* Compact header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${node.accentColor}18` }}
        >
          <Icon
            className="w-3.5 h-3.5"
            style={{ color: node.accentColor }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold text-slate-200 leading-tight">
            {node.label}
          </div>
          {node.subtitle && (
            <div className="text-[9px] text-slate-500 leading-tight mt-0.5">
              {node.subtitle}
            </div>
          )}
        </div>
        <div className="shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 space-y-2.5">
              {/* Divider */}
              <div
                className="h-px w-full"
                style={{ backgroundColor: `${node.accentColor}20` }}
              />

              {/* Description */}
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {node.detail.description}
              </p>

              {/* Stats */}
              {node.detail.stats && node.detail.stats.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {node.detail.stats.map((s) => (
                    <div
                      key={s.label}
                      className="bg-slate-700/50 rounded px-2 py-1"
                    >
                      <div className="text-[9px] text-slate-500 uppercase tracking-wider">
                        {s.label}
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium">
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Items list */}
              {node.detail.items && node.detail.items.length > 0 && (
                <div className="space-y-1">
                  {node.detail.items.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-baseline gap-1.5 text-[10px]"
                    >
                      <span
                        className="w-1 h-1 rounded-full shrink-0 mt-[5px]"
                        style={{ backgroundColor: node.accentColor }}
                      />
                      <span className="text-slate-300 font-mono">
                        {item.name}
                      </span>
                      {item.note && (
                        <span className="text-slate-600 italic">
                          {item.note}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Link */}
              {node.detail.link && (
                <Link
                  href={node.detail.link}
                  className="inline-flex items-center gap-1 text-[10px] font-medium hover:underline"
                  style={{ color: node.accentColor }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Explore <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Stage Column
 * ═══════════════════════════════════════════════════════════════════════════ */

function StageColumn({
  stage,
  expandedNodes,
  onToggleNode,
  onExpandAll,
  anyExpanded,
}: {
  stage: ArchStage;
  expandedNodes: Set<string>;
  onToggleNode: (id: string) => void;
  onExpandAll: (stageId: string) => void;
  anyExpanded: boolean;
}) {
  const hasAnyExpanded = stage.nodes.some((n) => expandedNodes.has(n.id));

  return (
    <div className="flex flex-col min-w-[200px] flex-1 w-full">
      {/* Stage header */}
      <button
        className="flex items-center gap-2 mb-3 group cursor-pointer"
        onClick={() => onExpandAll(stage.id)}
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <div className="text-left min-w-0">
          <h3
            className="text-sm font-bold tracking-tight group-hover:underline"
            style={{ color: stage.color }}
          >
            {stage.title}
          </h3>
          {stage.subtitle && (
            <p className="text-[10px] text-slate-500 leading-tight">
              {stage.subtitle}
            </p>
          )}
        </div>
      </button>

      {/* Stage container */}
      <div
        className="flex-1 rounded-xl p-1.5 space-y-0 border"
        style={{
          backgroundColor: stage.bgColor,
          borderColor: `${stage.borderColor}30`,
        }}
      >
        {stage.nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            {stage.internalFlow && i > 0 && <InternalArrow />}
            {!stage.internalFlow && i > 0 && <div className="h-1.5" />}
            <NodeCard
              node={node}
              isExpanded={expandedNodes.has(node.id)}
              onToggle={() => onToggleNode(node.id)}
              dimmed={anyExpanded && !expandedNodes.has(node.id)}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Main Component
 * ═══════════════════════════════════════════════════════════════════════════ */

export default function ArchitectureFlow() {
  const [expandedNodes, setExpandedNodes] = useState(new Set<string>());
  const scrollRef = useRef<HTMLDivElement>(null);

  const anyExpanded = expandedNodes.size > 0;

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAllInStage = useCallback((stageId: string) => {
    const stage = STAGES.find((s) => s.id === stageId);
    if (!stage) return;

    setExpandedNodes((prev) => {
      const allInStage = stage.nodes.map((n) => n.id);
      const allExpanded = allInStage.every((id) => prev.has(id));

      const next = new Set(prev);
      if (allExpanded) {
        allInStage.forEach((id) => next.delete(id));
      } else {
        allInStage.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  /* scroll hint: fade edges */
  const [scrollState, setScrollState] = useState({ left: false, right: true });
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setScrollState({
        left: el.scrollLeft > 10,
        right: el.scrollLeft < el.scrollWidth - el.clientWidth - 10,
      });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">
            End-to-End Data Pipeline
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Click any node to expand. Click a stage header to expand all nodes in that stage.
          </p>
        </div>
        {anyExpanded && (
          <button
            onClick={collapseAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            Collapse all
          </button>
        )}
      </div>

      {/* Stage indicator bar (fixed reference) */}
      <div className="flex items-center gap-0 mb-4 overflow-x-auto pb-2">
        {STAGES.map((stage, i) => (
          <React.Fragment key={stage.id}>
            {i > 0 && (
              <ArrowRight className="w-4 h-4 text-slate-600 shrink-0 mx-1" />
            )}
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              <span className="text-[11px] font-medium text-slate-400">
                {stage.title}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Scroll container with fade edges */}
      <div className="relative">
        {scrollState.left && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
        )}
        {scrollState.right && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollRef}
          className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="flex items-start gap-0 w-full" style={{ minWidth: '1400px' }}>
          {STAGES.map((stage, i) => (
            <React.Fragment key={stage.id}>
              {i > 0 && (
                <StageArrow
                  label={STAGE_CONNECTIONS[i - 1]?.label}
                  animated={anyExpanded}
                />
              )}
              <StageColumn
                stage={stage}
                expandedNodes={expandedNodes}
                onToggleNode={toggleNode}
                onExpandAll={expandAllInStage}
                anyExpanded={anyExpanded}
              />
            </React.Fragment>
          ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-4 text-[10px] text-slate-500">
        <span className="font-medium text-slate-400 uppercase tracking-wider">
          Layers:
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: '#D04A02' }} />
          L1 Reference (78 tables)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: '#E87722' }} />
          L2 Snapshots (26 tables)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: '#6B7280' }} />
          L3 Analytics (49 tables)
        </span>
        <span className="text-slate-600">|</span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: '#8b5cf6' }} />
          Processing
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: '#14b8a6' }} />
          Outputs
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: '#ec4899' }} />
          Consumption
        </span>
      </div>
    </div>
  );
}
