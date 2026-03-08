'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { STAGES, STAGE_CONNECTIONS } from '../architecture/architectureData';
import type { ArchStage, ArchNode } from '../architecture/architectureData';
import { useSchemaBundle } from './useSchemaBundle';

/* ═══════════════════════════════════════════════════════════════════════════
 * Heartbeat pulse animation (SVG)
 * ═══════════════════════════════════════════════════════════════════════════ */

function HeartbeatLine({ color, active }: { color: string; active: boolean }) {
  return (
    <svg width="80" height="20" viewBox="0 0 80 20" className="inline-block">
      <path
        d={active
          ? 'M0,10 L15,10 L20,2 L25,18 L30,6 L35,14 L40,10 L80,10'
          : 'M0,10 L80,10'
        }
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={active ? 0.8 : 0.2}
      >
        {active && (
          <animate
            attributeName="stroke-dashoffset"
            from="160"
            to="0"
            dur="2s"
            repeatCount="indefinite"
          />
        )}
      </path>
      {active && (
        <path
          d="M0,10 L15,10 L20,2 L25,18 L30,6 L35,14 L40,10 L80,10"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="80 80"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.4}
        >
          <animate
            attributeName="stroke-dashoffset"
            from="160"
            to="0"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>
      )}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Animated flow arrow between stages
 * ═══════════════════════════════════════════════════════════════════════════ */

function FlowArrow({ color, label }: { color: string; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1 shrink-0">
      <svg width="36" height="20" viewBox="0 0 36 20">
        <defs>
          <marker
            id={`bp-arrow-${label}`}
            markerWidth="6"
            markerHeight="5"
            refX="6"
            refY="2.5"
            orient="auto"
          >
            <polygon points="0 0, 6 2.5, 0 5" fill={color} opacity={0.6} />
          </marker>
        </defs>
        <line
          x1="2" y1="10" x2="28" y2="10"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="5 3"
          markerEnd={`url(#bp-arrow-${label})`}
          opacity={0.5}
        >
          <animate
            attributeName="stroke-dashoffset"
            from="16"
            to="0"
            dur="1.2s"
            repeatCount="indefinite"
          />
        </line>
      </svg>
      {label && (
        <span className="text-[8px] text-slate-600 whitespace-nowrap">{label}</span>
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
      <svg width="16" height="14" viewBox="0 0 16 14">
        <defs>
          <marker id="bp-arrowdown" markerWidth="5" markerHeight="4" refX="2.5" refY="4" orient="auto">
            <polygon points="0 0, 5 0, 2.5 4" fill="#475569" />
          </marker>
        </defs>
        <line x1="8" y1="0" x2="8" y2="10" stroke="#475569" strokeWidth="1" markerEnd="url(#bp-arrowdown)" />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Node card (expandable)
 * ═══════════════════════════════════════════════════════════════════════════ */

function NodeCard({
  node,
  expanded,
  dimmed,
  onToggle,
}: {
  node: ArchNode;
  expanded: boolean;
  dimmed: boolean;
  onToggle: () => void;
}) {
  const Icon = node.icon;

  return (
    <motion.div layout className={`transition-opacity duration-300 ${dimmed ? 'opacity-30' : 'opacity-100'}`}>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left rounded-lg border p-2.5 transition-all duration-200 group"
        style={{
          borderColor: expanded ? `${node.accentColor}50` : `${node.accentColor}20`,
          backgroundColor: expanded ? `${node.accentColor}10` : `${node.accentColor}05`,
          boxShadow: expanded ? `0 0 20px 2px ${node.accentColor}15` : 'none',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${node.accentColor}15` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: node.accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-white block truncate">{node.label}</span>
            {node.subtitle && (
              <span className="text-[9px] text-slate-500 block truncate">{node.subtitle}</span>
            )}
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
          </motion.div>
        </div>

        {/* Pulse indicator */}
        {!expanded && (
          <div className="mt-1.5 flex items-center gap-1">
            <div
              className="w-1 h-1 rounded-full animate-pulse"
              style={{ backgroundColor: node.accentColor }}
            />
            <span className="text-[8px] text-slate-600">active</span>
          </div>
        )}
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2 px-1 space-y-2">
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {node.detail.description}
              </p>

              {node.detail.items && node.detail.items.length > 0 && (
                <div className="space-y-1">
                  {node.detail.items.slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[9px]">
                      <div
                        className="w-1 h-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: node.accentColor }}
                      />
                      <span className="text-slate-300">{item.name}</span>
                      {item.note && (
                        <span className="text-slate-600 ml-auto text-[8px]">{item.note}</span>
                      )}
                    </div>
                  ))}
                  {node.detail.items.length > 4 && (
                    <span className="text-[8px] text-slate-600">
                      +{node.detail.items.length - 4} more
                    </span>
                  )}
                </div>
              )}

              {node.detail.stats && node.detail.stats.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {node.detail.stats.map((stat) => (
                    <span
                      key={stat.label}
                      className="text-[8px] px-1.5 py-0.5 rounded border"
                      style={{
                        color: node.accentColor,
                        borderColor: `${node.accentColor}25`,
                        backgroundColor: `${node.accentColor}08`,
                      }}
                    >
                      {stat.value} {stat.label.toLowerCase()}
                    </span>
                  ))}
                </div>
              )}

              {node.detail.link && (
                <Link
                  href={node.detail.link}
                  className="inline-flex items-center gap-1 text-[9px] hover:underline mt-1"
                  style={{ color: node.accentColor }}
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Open
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
 * Stage column
 * ═══════════════════════════════════════════════════════════════════════════ */

function StageColumn({
  stage,
  expandedNodes,
  onToggleNode,
  onExpandAll,
}: {
  stage: ArchStage;
  expandedNodes: Set<string>;
  onToggleNode: (id: string) => void;
  onExpandAll: () => void;
}) {
  const anyExpanded = stage.nodes.some((n) => expandedNodes.has(n.id));
  const allExpanded = stage.nodes.every((n) => expandedNodes.has(n.id));

  return (
    <div className="min-w-[180px] max-w-[220px] flex-1 shrink-0">
      {/* Stage header */}
      <button
        onClick={onExpandAll}
        aria-expanded={allExpanded}
        className="w-full text-center mb-3 group"
      >
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all"
          style={{
            color: stage.color,
            borderColor: `${stage.color}30`,
            backgroundColor: `${stage.color}08`,
          }}
        >
          <HeartbeatLine color={stage.color} active={anyExpanded} />
          <span>{stage.title}</span>
        </div>
        {stage.subtitle && (
          <div className="text-[9px] text-slate-600 mt-1">{stage.subtitle}</div>
        )}
      </button>

      {/* Nodes */}
      <div
        className="rounded-xl border p-2.5 space-y-1.5"
        style={{
          borderColor: `${stage.borderColor}30`,
          backgroundColor: `${stage.bgColor}`,
        }}
      >
        {stage.nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            {stage.internalFlow && i > 0 && <InternalArrow />}
            <NodeCard
              node={node}
              expanded={expandedNodes.has(node.id)}
              dimmed={anyExpanded && !expandedNodes.has(node.id)}
              onToggle={() => onToggleNode(node.id)}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Floating particles overlay
 * ═══════════════════════════════════════════════════════════════════════════ */

/* Seeded PRNG to avoid hydration mismatch from Math.random() */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const PARTICLE_DATA = (() => {
  const rand = seededRandom(42);
  const colors = ['#D04A02', '#60a5fa', '#a78bfa', '#2dd4bf', '#f472b6'];
  return Array.from({ length: 20 }, (_, i) => {
    const x1 = rand() * 10;
    const y1 = 20 + rand() * 60;
    const x2 = 90 + rand() * 10;
    const y2 = 20 + rand() * 60;
    const cx1 = x1 + (x2 - x1) * 0.3 + (rand() - 0.5) * 20;
    const cy1 = y1 + (rand() - 0.5) * 30;
    const cx2 = x1 + (x2 - x1) * 0.7 + (rand() - 0.5) * 20;
    const cy2 = y2 + (rand() - 0.5) * 30;
    return {
      id: i,
      r: 0.3 + rand() * 0.4,
      dur: 6 + rand() * 8,
      delay: rand() * 10,
      color: colors[i % colors.length],
      path: `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`,
    };
  });
})();

function BlueprintParticles() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {PARTICLE_DATA.map((p) => (
        <circle key={p.id} r={p.r} fill={p.color} opacity={0.5}>
          <animateMotion
            dur={`${p.dur}s`}
            begin={`${p.delay}s`}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.25 0.1 0.25 1"
            keyTimes="0;1"
            path={p.path}
          />
        </circle>
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * System health indicator
 * ═══════════════════════════════════════════════════════════════════════════ */

function SystemHealth() {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setBeat((b) => b + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-slate-800 bg-slate-900/80">
      <div className="relative">
        <Activity className="w-4 h-4 text-emerald-400" />
        <motion.div
          key={beat}
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0 rounded-full border border-emerald-400"
        />
      </div>
      <div>
        <div className="text-[10px] font-semibold text-emerald-400">PIPELINE ACTIVE</div>
        <div className="text-[8px] text-slate-500">All 6 stages operational</div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        {STAGES.map((s) => (
          <div
            key={s.id}
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{
              backgroundColor: s.color,
              animationDelay: `${STAGES.indexOf(s) * 0.3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Main: TheLivingBlueprint
 * ═══════════════════════════════════════════════════════════════════════════ */

export default function TheLivingBlueprint() {
  const { counts } = useSchemaBundle();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAllInStage = useCallback((stage: ArchStage) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      const allExpanded = stage.nodes.every((n) => next.has(n.id));
      if (allExpanded) {
        stage.nodes.forEach((n) => next.delete(n.id));
      } else {
        stage.nodes.forEach((n) => next.add(n.id));
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  const anyExpanded = expandedNodes.size > 0;

  return (
    <div className="relative w-full min-h-screen bg-slate-950 overflow-hidden">
      {/* Particles */}
      <BlueprintParticles />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="px-6 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/overview"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Overview
            </Link>
            {anyExpanded && (
              <>
                <div className="w-px h-4 bg-slate-700" />
                <button
                  onClick={collapseAll}
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Collapse all
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-600 text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Living Blueprint — Interactive Architecture</span>
          </div>
        </header>

        {/* Title + health */}
        <div className="px-6 py-4 flex flex-col items-center gap-4">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
              The Living Blueprint
            </h1>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Explore the complete architecture — click any component to see how it connects to the whole system
            </p>
          </div>
          <SystemHealth />
        </div>

        {/* Main pipeline view */}
        <main className="flex-1 px-4 pb-8 overflow-x-auto" ref={scrollRef}>
          <div className="flex items-start gap-0 min-w-max mx-auto py-4 px-2 justify-center">
            {STAGES.map((stage, i) => (
              <React.Fragment key={stage.id}>
                {i > 0 && (
                  <div className="flex items-center self-center pt-8">
                    <FlowArrow
                      color={STAGES[i - 1].color}
                      label={STAGE_CONNECTIONS[i - 1]?.label}
                    />
                  </div>
                )}
                <StageColumn
                  stage={stage}
                  expandedNodes={expandedNodes}
                  onToggleNode={toggleNode}
                  onExpandAll={() => expandAllInStage(stage)}
                />
              </React.Fragment>
            ))}
          </div>
        </main>

        {/* Bottom summary bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-slate-800">
          <div className="flex items-center justify-between px-6 h-[48px]">
            <div className="flex items-center gap-4">
              {STAGES.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-[9px] text-slate-500 hidden sm:inline">{s.title}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
              <span>{counts.totalTables || 153} tables</span>
              <span className="text-slate-700">|</span>
              <span>{counts.metricCount || 27} metrics</span>
              <span className="text-slate-700">|</span>
              <span>6 stages</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
