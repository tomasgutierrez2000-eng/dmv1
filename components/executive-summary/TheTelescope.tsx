'use client';

import React, { useReducer, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Eye,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  STAGES,
  STAGE_STATS,
  INITIAL_TELESCOPE,
  telescopeReducer,
  getStageById,
  getNodeById,
} from './telescopeData';
import type { ArchStage, ArchNode, TelescopeAction } from './telescopeData';

/* ═══════════════════════════════════════════════════════════════════════════
 * Shared animation variants
 * ═══════════════════════════════════════════════════════════════════════════ */

const stagger = (s: number) => ({
  hidden: {},
  visible: { transition: { staggerChildren: s } },
});

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const fadeScale = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Level 0: Orbit — Bird's-eye pipeline
 * ═══════════════════════════════════════════════════════════════════════════ */

function OrbitView({ onZoomStage }: { onZoomStage: (id: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-6xl">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold border border-slate-700 bg-slate-800/50 text-slate-400 mb-4">
          <Eye className="w-3.5 h-3.5" />
          ORBIT VIEW
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
          The Complete Pipeline
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Click any stage to zoom in and explore its components in detail
        </p>
      </div>

      {/* Pipeline stages */}
      <motion.div
        variants={stagger(0.1)}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap justify-center items-center gap-3 sm:gap-2"
      >
        {STAGES.map((stage, i) => (
          <React.Fragment key={stage.id}>
            {i > 0 && (
              <motion.div variants={fadeUp} className="hidden sm:flex items-center">
                <svg width="32" height="24" viewBox="0 0 32 24" className="text-slate-600">
                  <defs>
                    <marker id={`orb-arrow-${i}`} markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
                      <polygon points="0 0, 6 2.5, 0 5" fill="currentColor" />
                    </marker>
                  </defs>
                  <line
                    x1="2" y1="12" x2="24" y2="12"
                    stroke="currentColor" strokeWidth="1.5"
                    markerEnd={`url(#orb-arrow-${i})`}
                    strokeDasharray="4 3"
                  >
                    <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1.5s" repeatCount="indefinite" />
                  </line>
                </svg>
              </motion.div>
            )}
            <motion.button
              variants={fadeUp}
              onClick={() => onZoomStage(stage.id)}
              className="group relative flex flex-col items-center p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer w-[140px] sm:w-[150px]"
              style={{
                borderColor: `${stage.borderColor}40`,
                backgroundColor: stage.bgColor,
              }}
              whileHover={{
                scale: 1.05,
                boxShadow: `0 0 30px 4px ${stage.color}20`,
                borderColor: stage.borderColor,
              }}
              whileTap={{ scale: 0.97 }}
            >
              {/* Stat badge */}
              <div
                className="absolute -top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                style={{
                  color: stage.color,
                  borderColor: `${stage.color}40`,
                  backgroundColor: `${stage.color}15`,
                }}
              >
                {STAGE_STATS[stage.id]?.stat}
              </div>

              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${stage.color}15` }}
              >
                {(() => { const Icon = stage.nodes[0]?.icon; return Icon ? <Icon className="w-5 h-5" style={{ color: stage.color }} /> : null; })()}
              </div>

              {/* Label */}
              <span className="text-sm font-semibold text-white text-center leading-tight">
                {stage.title}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 text-center">
                {STAGE_STATS[stage.id]?.detail}
              </span>

              {/* Zoom hint */}
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="w-3.5 h-3.5" style={{ color: stage.color }} />
              </div>
            </motion.button>
          </React.Fragment>
        ))}
      </motion.div>

      {/* Summary stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="flex flex-wrap justify-center gap-6 mt-4 text-center"
      >
        {[
          { label: 'Source Systems', value: '8', color: '#94a3b8' },
          { label: 'Total Tables', value: '153', color: '#D04A02' },
          { label: 'Metric Variants', value: '27', color: '#a78bfa' },
          { label: 'Delivery Channels', value: '5', color: '#f472b6' },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold font-mono" style={{ color: s.color }}>
              {s.value}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Level 1: Stage — Node-level detail
 * ═══════════════════════════════════════════════════════════════════════════ */

function StageView({
  stage,
  onZoomNode,
  onZoomOut,
}: {
  stage: ArchStage;
  onZoomNode: (nodeId: string) => void;
  onZoomOut: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl">
      {/* Stage header */}
      <div className="text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold border mb-4"
          style={{
            color: stage.color,
            borderColor: `${stage.color}40`,
            backgroundColor: `${stage.color}15`,
          }}
        >
          <ZoomIn className="w-3.5 h-3.5" />
          STAGE VIEW
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
          {stage.title}
        </h2>
        {stage.subtitle && (
          <p className="text-sm text-slate-400">{stage.subtitle}</p>
        )}
        <p className="text-sm text-slate-500 mt-2">
          {stage.nodes.length} component{stage.nodes.length !== 1 ? 's' : ''} — click any to inspect
        </p>
      </div>

      {/* Nodes grid */}
      <motion.div
        variants={stagger(0.08)}
        initial="hidden"
        animate="visible"
        className={`grid gap-4 w-full ${
          stage.nodes.length <= 3
            ? 'grid-cols-1 sm:grid-cols-3 max-w-3xl'
            : stage.nodes.length <= 4
              ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl'
        }`}
      >
        {stage.nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            {/* Internal flow arrow (for stages like ingestion with vertical flow) */}
            <motion.button
              variants={fadeScale}
              onClick={() => onZoomNode(node.id)}
              className="group relative rounded-xl border p-4 text-left transition-all cursor-pointer"
              style={{
                borderColor: `${node.accentColor}25`,
                backgroundColor: `${node.accentColor}08`,
              }}
              whileHover={{
                scale: 1.03,
                boxShadow: `0 0 24px 2px ${node.accentColor}15`,
                borderColor: `${node.accentColor}50`,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${node.accentColor}15` }}
                >
                  <node.icon className="w-4.5 h-4.5" style={{ color: node.accentColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-white block">{node.label}</span>
                  {node.subtitle && (
                    <span className="text-[11px] text-slate-500 block mt-0.5">{node.subtitle}</span>
                  )}
                </div>
              </div>

              {/* Brief description preview */}
              <p className="text-[11px] text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                {node.detail.description}
              </p>

              {/* Stats preview */}
              {node.detail.stats && node.detail.stats.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {node.detail.stats.slice(0, 2).map((s) => (
                    <span
                      key={s.label}
                      className="text-[9px] px-1.5 py-0.5 rounded-full border"
                      style={{
                        color: node.accentColor,
                        borderColor: `${node.accentColor}30`,
                        backgroundColor: `${node.accentColor}10`,
                      }}
                    >
                      {s.value} {s.label.toLowerCase()}
                    </span>
                  ))}
                </div>
              )}

              {/* Zoom hint */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="w-3.5 h-3.5" style={{ color: node.accentColor }} />
              </div>
            </motion.button>
          </React.Fragment>
        ))}
      </motion.div>

      {/* Stage connection context */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-4 mt-4"
      >
        {(() => {
          const idx = STAGES.findIndex((s) => s.id === stage.id);
          const prev = idx > 0 ? STAGES[idx - 1] : null;
          const next = idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
          return (
            <>
              {prev && (
                <button
                  onClick={onZoomOut}
                  className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span style={{ color: prev.color }}>{prev.title}</span>
                </button>
              )}
              {prev && next && <span className="text-slate-700">|</span>}
              {next && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span style={{ color: next.color }}>{next.title}</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              )}
            </>
          );
        })()}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Level 2: Node — Full detail
 * ═══════════════════════════════════════════════════════════════════════════ */

function NodeView({
  node,
  stage,
  onZoomOut,
}: {
  node: ArchNode;
  stage: ArchStage;
  onZoomOut: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl">
      {/* Node header */}
      <div className="text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold border mb-4"
          style={{
            color: node.accentColor,
            borderColor: `${node.accentColor}40`,
            backgroundColor: `${node.accentColor}15`,
          }}
        >
          <ZoomIn className="w-3.5 h-3.5" />
          INSPECT
        </div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${node.accentColor}15` }}
          >
            <node.icon className="w-6 h-6" style={{ color: node.accentColor }} />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1">
          {node.label}
        </h2>
        {node.subtitle && (
          <p className="text-sm text-slate-400">{node.subtitle}</p>
        )}
        <p className="text-[11px] text-slate-600 mt-1">
          Part of <span style={{ color: stage.color }}>{stage.title}</span>
        </p>
      </div>

      {/* Description card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="w-full rounded-xl border p-5"
        style={{
          borderColor: `${node.accentColor}20`,
          backgroundColor: `${node.accentColor}05`,
        }}
      >
        <p className="text-sm text-slate-300 leading-relaxed">
          {node.detail.description}
        </p>
      </motion.div>

      {/* Items list */}
      {node.detail.items && node.detail.items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="w-full"
        >
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3 px-1">
            Components
          </h3>
          <motion.div
            variants={stagger(0.05)}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {node.detail.items.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-slate-800 bg-slate-900/50"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: node.accentColor }}
                />
                <span className="text-sm text-white font-medium">{item.name}</span>
                {item.note && (
                  <span className="text-[11px] text-slate-500 ml-auto">{item.note}</span>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Stats grid */}
      {node.detail.stats && node.detail.stats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="w-full"
        >
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3 px-1">
            Key Stats
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {node.detail.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-center"
              >
                <div
                  className="text-lg font-bold font-mono"
                  style={{ color: node.accentColor }}
                >
                  {stat.value}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Link */}
      {node.detail.link && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Link
            href={node.detail.link}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{
              color: node.accentColor,
              borderColor: `${node.accentColor}30`,
              backgroundColor: `${node.accentColor}08`,
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in app
          </Link>
        </motion.div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Breadcrumb navigation
 * ═══════════════════════════════════════════════════════════════════════════ */

function TelescopeBreadcrumb({
  state,
  dispatch,
}: {
  state: { zoom: string; stageId: string | null; nodeId: string | null };
  dispatch: React.Dispatch<TelescopeAction>;
}) {
  const stage = state.stageId ? getStageById(state.stageId) : null;
  const node = state.stageId && state.nodeId ? getNodeById(state.stageId, state.nodeId) : null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={() => dispatch({ type: 'ZOOM_ORBIT' })}
        className={`transition-colors ${
          state.zoom === 'orbit' ? 'text-white font-semibold' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        Pipeline
      </button>
      {stage && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <button
            onClick={() => dispatch({ type: 'ZOOM_STAGE', stageId: state.stageId! })}
            className={`transition-colors ${
              state.zoom === 'stage' ? 'font-semibold' : 'hover:opacity-80'
            }`}
            style={{ color: stage.color }}
          >
            {stage.title}
          </button>
        </>
      )}
      {node && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-white font-semibold">{node.label}</span>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Stage navigation (mini horizontal bar)
 * ═══════════════════════════════════════════════════════════════════════════ */

function StageNav({
  currentStageId,
  dispatch,
}: {
  currentStageId: string;
  dispatch: React.Dispatch<TelescopeAction>;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      {STAGES.map((stage) => (
        <button
          key={stage.id}
          onClick={() => dispatch({ type: 'ZOOM_STAGE', stageId: stage.id })}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
            stage.id === currentStageId
              ? 'border'
              : 'text-slate-600 hover:text-slate-400'
          }`}
          style={
            stage.id === currentStageId
              ? {
                  color: stage.color,
                  borderColor: `${stage.color}40`,
                  backgroundColor: `${stage.color}10`,
                }
              : {}
          }
        >
          {stage.title}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Main: TheTelescope
 * ═══════════════════════════════════════════════════════════════════════════ */

export default function TheTelescope() {
  const [state, dispatch] = useReducer(telescopeReducer, INITIAL_TELESCOPE);

  const stage = useMemo(
    () => (state.stageId ? getStageById(state.stageId) : null),
    [state.stageId],
  );
  const node = useMemo(
    () => (state.stageId && state.nodeId ? getNodeById(state.stageId, state.nodeId) : null),
    [state.stageId, state.nodeId],
  );

  /* ── Keyboard nav ────────────────────────────────────────────────────── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        dispatch({ type: 'ZOOM_OUT' });
      } else if (e.key === 'ArrowLeft' && state.zoom === 'stage' && state.stageId) {
        e.preventDefault();
        const idx = STAGES.findIndex((s) => s.id === state.stageId);
        if (idx > 0) dispatch({ type: 'ZOOM_STAGE', stageId: STAGES[idx - 1].id });
      } else if (e.key === 'ArrowRight' && state.zoom === 'stage' && state.stageId) {
        e.preventDefault();
        const idx = STAGES.findIndex((s) => s.id === state.stageId);
        if (idx < STAGES.length - 1) dispatch({ type: 'ZOOM_STAGE', stageId: STAGES[idx + 1].id });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [state.zoom, state.stageId]);

  const d = useCallback((action: TelescopeAction) => dispatch(action), []);

  return (
    <div className="relative w-full min-h-screen bg-slate-950 overflow-hidden">
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
            {state.zoom !== 'orbit' && (
              <>
                <div className="w-px h-4 bg-slate-700" />
                <button
                  onClick={() => d({ type: 'ZOOM_OUT' })}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                  Zoom out
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-600 text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Telescope — Drill-Down Explorer</span>
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="px-6 py-2">
          <TelescopeBreadcrumb state={state} dispatch={dispatch} />
        </div>

        {/* Stage navigation (when zoomed into stage or node) */}
        {state.stageId && (
          <div className="px-6 py-2">
            <StageNav currentStageId={state.stageId} dispatch={dispatch} />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center px-6 py-4 pb-8">
          <AnimatePresence mode="wait" initial={false}>
            {state.zoom === 'orbit' && (
              <motion.div
                key="orbit"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.35 }}
                className="w-full flex justify-center"
              >
                <OrbitView
                  onZoomStage={(id) => d({ type: 'ZOOM_STAGE', stageId: id })}
                />
              </motion.div>
            )}

            {state.zoom === 'stage' && stage && (
              <motion.div
                key={`stage-${stage.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.35 }}
                className="w-full flex justify-center"
              >
                <StageView
                  stage={stage}
                  onZoomNode={(nodeId) => d({ type: 'ZOOM_NODE', nodeId })}
                  onZoomOut={() => d({ type: 'ZOOM_OUT' })}
                />
              </motion.div>
            )}

            {state.zoom === 'node' && node && stage && (
              <motion.div
                key={`node-${node.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.35 }}
                className="w-full flex justify-center"
              >
                <NodeView
                  node={node}
                  stage={stage}
                  onZoomOut={() => d({ type: 'ZOOM_OUT' })}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-slate-800">
          <div className="flex items-center justify-between px-6 h-[52px]">
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="font-mono">
                {state.zoom === 'orbit' ? 'Esc' : '← →'} navigate
              </span>
              {state.zoom !== 'orbit' && (
                <span className="font-mono">Esc zoom out</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => d({ type: 'ZOOM_STAGE', stageId: s.id })}
                  className="transition-all"
                  aria-label={`Zoom to ${s.title}`}
                >
                  <div
                    className={`w-2 h-2 rounded-full transition-all ${
                      s.id === state.stageId
                        ? 'scale-150'
                        : 'opacity-40 hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: s.color,
                      ...(s.id === state.stageId
                        ? { boxShadow: `0 0 0 2px #0a0a0a, 0 0 0 4px ${s.color}` }
                        : {}),
                    }}
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-mono">
                Zoom: {state.zoom === 'orbit' ? '1x' : state.zoom === 'stage' ? '2x' : '3x'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
