'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Library,
  LayoutDashboard,
} from 'lucide-react';
import type { PulseAct } from './pulseData';
import {
  TIMING,
  SOURCE_NODES,
  INGESTION_NODES,
  CANONICAL_NODES,
  PROCESSING_TIER_NODES,
  METRIC_DERIVATION_NODE,
  CONSUMPTION_NODES,
  LTV_TRACE,
  DASHBOARD_KPIS,
  DASHBOARD_BARS,
} from './pulseData';

/* ═══════════════════════════════════════════════════════════════════════════
 * Shared animation variants
 * ═══════════════════════════════════════════════════════════════════════════ */

const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const fadeSlideRight = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const staggerContainer = (staggerS: number) => ({
  hidden: {},
  visible: { transition: { staggerChildren: staggerS } },
});

/* ═══════════════════════════════════════════════════════════════════════════
 * useCountUp hook
 * ═══════════════════════════════════════════════════════════════════════════ */

function useCountUp(target: number, durationMs: number, trigger: boolean): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!trigger) {
      setValue(0);
      return;
    }
    const startTime = performance.now();
    let rafId: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs, trigger]);

  return value;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Inline SVG arrow between horizontal items
 * ═══════════════════════════════════════════════════════════════════════════ */

function FlowArrow() {
  return (
    <div className="flex items-center justify-center shrink-0">
      <svg width="32" height="20" viewBox="0 0 32 20" className="overflow-visible">
        <defs>
          <marker id="pulse-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#475569" />
          </marker>
        </defs>
        <line x1="0" y1="10" x2="24" y2="10" stroke="#475569" strokeWidth="2" markerEnd="url(#pulse-arrow)"
          strokeDasharray="6 4">
          <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Act 1: Source Systems
 * ═══════════════════════════════════════════════════════════════════════════ */

function SourceSystemsAct() {
  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl w-full"
      variants={staggerContainer(TIMING.sourceStaggerS)}
      initial="hidden"
      animate="visible"
    >
      {SOURCE_NODES.map((node) => {
        const Icon = node.icon;
        return (
          <motion.div
            key={node.id}
            variants={fadeSlideUp}
            className="relative bg-slate-900/60 border border-slate-700/60 rounded-xl p-5 flex flex-col items-center gap-3 text-center group"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${node.accentColor}18` }}
            >
              <Icon className="w-6 h-6" style={{ color: node.accentColor }} />
            </div>
            <div className="text-sm font-semibold text-slate-200">{node.label}</div>
            {node.subtitle && (
              <div className="text-[11px] text-slate-500">{node.subtitle}</div>
            )}
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-xl border"
              style={{ borderColor: `${node.accentColor}20` }}
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Act 2: Ingestion & Canonical Model
 * ═══════════════════════════════════════════════════════════════════════════ */

function IngestionAct() {
  const [showCanonical, setShowCanonical] = useState(false);
  const l1Count = useCountUp(78, TIMING.counterDurationMs, showCanonical);
  const l2Count = useCountUp(26, TIMING.counterDurationMs, showCanonical);

  useEffect(() => {
    const timer = setTimeout(() => setShowCanonical(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 max-w-5xl w-full">
      {/* Ingestion pipeline */}
      <motion.div
        className="flex items-center gap-2 flex-wrap justify-center"
        variants={staggerContainer(TIMING.ingestionStaggerS)}
        initial="hidden"
        animate="visible"
      >
        {INGESTION_NODES.map((node, i) => {
          const Icon = node.icon;
          return (
            <React.Fragment key={node.id}>
              {i > 0 && <FlowArrow />}
              <motion.div
                variants={fadeSlideRight}
                className="bg-slate-900/60 border border-blue-500/20 rounded-lg px-4 py-3 flex items-center gap-2.5 shrink-0"
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-blue-500/10">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-slate-200">{node.label}</div>
                  {node.subtitle && (
                    <div className="text-[10px] text-slate-500">{node.subtitle}</div>
                  )}
                </div>
              </motion.div>
            </React.Fragment>
          );
        })}
      </motion.div>

      {/* Canonical model */}
      <motion.div
        className="grid grid-cols-2 gap-6 w-full max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={showCanonical ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {CANONICAL_NODES.map((node) => {
          const Icon = node.icon;
          const isL1 = node.id.includes('l1');
          const count = isL1 ? l1Count : l2Count;
          return (
            <div
              key={node.id}
              className="bg-slate-900/70 border rounded-xl p-6 flex flex-col items-center gap-3"
              style={{ borderColor: `${node.accentColor}30` }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${node.accentColor}18` }}
              >
                <Icon className="w-5 h-5" style={{ color: node.accentColor }} />
              </div>
              <div className="text-sm font-semibold text-slate-200">{node.label}</div>
              <div
                className="text-3xl font-bold font-mono"
                style={{ color: node.accentColor }}
              >
                {count}
              </div>
              <div className="text-[11px] text-slate-500">
                {isL1 ? 'master reference tables' : 'time-series snapshot tables'}
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Act 3: Processing & Metrics
 * ═══════════════════════════════════════════════════════════════════════════ */

function ProcessingAct() {
  const [showFormula, setShowFormula] = useState(false);
  const parentCount = useCountUp(12, TIMING.counterDurationMs, true);
  const variantCount = useCountUp(27, TIMING.counterDurationMs, true);
  const domainCount = useCountUp(8, TIMING.counterDurationMs, true);

  useEffect(() => {
    const timer = setTimeout(() => setShowFormula(true), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row items-start gap-8 max-w-5xl w-full">
      {/* Left: Processing tiers */}
      <motion.div
        className="flex-1 space-y-3"
        variants={staggerContainer(TIMING.tierStaggerS)}
        initial="hidden"
        animate="visible"
      >
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          Processing Engine
        </div>
        {PROCESSING_TIER_NODES.map((node) => {
          const Icon = node.icon;
          return (
            <motion.div
              key={node.id}
              variants={fadeSlideRight}
              className="bg-slate-900/60 border border-purple-500/20 rounded-lg px-4 py-2.5 flex items-center gap-3"
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center bg-purple-500/10">
                <Icon className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-slate-200">{node.label}</div>
                <div className="text-[10px] text-slate-500 truncate">{node.subtitle}</div>
              </div>
            </motion.div>
          );
        })}

        {/* Metric stats */}
        <motion.div
          variants={fadeSlideUp}
          className="mt-4 flex gap-4"
        >
          {[
            { label: 'Parent Metrics', value: parentCount },
            { label: 'Variants', value: variantCount },
            { label: 'Domains', value: domainCount },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800/60 rounded-lg px-3 py-2 text-center flex-1">
              <div className="text-xl font-bold text-purple-400 font-mono">{stat.value}</div>
              <div className="text-[10px] text-slate-500">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Right: LTV trace */}
      <motion.div
        className="flex-1 bg-slate-900/70 border border-slate-700/50 rounded-xl p-6"
        initial={{ opacity: 0, x: 30 }}
        animate={showFormula ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">
          Metric Trace: {LTV_TRACE.metric}
        </div>

        <div className="space-y-3">
          {LTV_TRACE.formulaParts.map((part, i) => (
            <motion.div
              key={part.label}
              initial={{ opacity: 0, x: 20 }}
              animate={showFormula ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.4, duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: part.color }} />
              <div className="flex-1">
                <div className="text-sm text-slate-300">{part.label}</div>
                <div className="text-[10px] font-mono text-slate-500">{part.source}</div>
              </div>
              <div className="text-sm font-bold font-mono" style={{ color: part.color }}>
                {part.value}
              </div>
            </motion.div>
          ))}

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={showFormula ? { scaleX: 1 } : {}}
            transition={{ delay: 0.9, duration: 0.4 }}
            className="h-px bg-slate-700 origin-left"
          />

          {/* Result */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={showFormula ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="flex items-center justify-between pt-1"
          >
            <div className="text-sm font-semibold text-slate-200">{LTV_TRACE.resultLabel}</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {LTV_TRACE.result}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Act 4: Dashboards & Outputs
 * ═══════════════════════════════════════════════════════════════════════════ */

function OutputsAct() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl w-full">
      {/* KPI Cards */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        variants={staggerContainer(0.15)}
        initial="hidden"
        animate="visible"
      >
        {DASHBOARD_KPIS.map((kpi) => (
          <motion.div
            key={kpi.label}
            variants={{
              hidden: { opacity: 0, x: 40 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
            }}
            className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-5"
          >
            <div className="text-[11px] text-slate-500 mb-1">{kpi.label}</div>
            <div className="text-2xl font-bold text-white font-mono">{kpi.value}</div>
            <div className={`flex items-center gap-1 mt-1.5 text-[11px] font-medium ${kpi.trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {kpi.trendUp
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />
              }
              {kpi.trend}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mini bar chart */}
        <motion.div
          className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <span className="text-[12px] font-semibold text-slate-300">Exposure by Business Segment</span>
          </div>
          <div className="space-y-2.5">
            {DASHBOARD_BARS.map((bar, i) => (
              <motion.div
                key={bar.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 + i * 0.15 }}
                className="flex items-center gap-3"
              >
                <span className="text-[11px] text-slate-400 w-28 shrink-0 text-right">{bar.label}</span>
                <div className="flex-1 h-5 bg-slate-800 rounded overflow-hidden">
                  <motion.div
                    className="h-full rounded"
                    style={{ backgroundColor: bar.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${bar.value}%` }}
                    transition={{ delay: 1.2 + i * 0.15, duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 font-mono w-8">{bar.value}%</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Consumption cards */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Consumption Layer
          </div>
          {[
            { icon: LayoutDashboard, label: 'Interactive Dashboards', desc: '7 dashboard pages with drill-down', color: '#f472b6' },
            { icon: Library, label: 'Metric Library', desc: '27 metric variants across 8 domains', color: '#f472b6' },
            { icon: BarChart3, label: 'Schema Visualizer', desc: '153 tables with full relationship mapping', color: '#f472b6' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 + i * 0.2, duration: 0.4 }}
              className="bg-slate-900/60 border border-pink-500/20 rounded-lg px-4 py-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-md flex items-center justify-center bg-pink-500/10">
                <item.icon className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-slate-200">{item.label}</div>
                <div className="text-[10px] text-slate-500">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Full View (all acts condensed)
 * ═══════════════════════════════════════════════════════════════════════════ */

interface FullViewColumnProps {
  title: string;
  color: string;
  items: { label: string; sub?: string }[];
}

function FullViewColumn({ title, color, items }: FullViewColumnProps) {
  return (
    <div className="flex-1 min-w-[200px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <h4 className="text-sm font-bold" style={{ color }}>{title}</h4>
      </div>
      <div className="space-y-1.5 bg-slate-900/40 rounded-lg p-3 border border-slate-800">
        {items.map((item) => (
          <div key={item.label} className="text-[11px]">
            <span className="text-slate-300">{item.label}</span>
            {item.sub && <span className="text-slate-600 ml-1">({item.sub})</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function FullViewArrow() {
  return (
    <div className="flex items-center justify-center shrink-0 self-center">
      <ArrowRight className="w-5 h-5 text-slate-600" />
    </div>
  );
}

export function PulseFullView() {
  return (
    <motion.div
      className="w-full max-w-6xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-white mb-1">End-to-End Data Pipeline</h3>
        <p className="text-sm text-slate-400">From 8 source systems to executive dashboards</p>
      </div>

      <div className="flex items-start gap-3 overflow-x-auto pb-4">
        <FullViewColumn
          title="Source Systems"
          color="#94a3b8"
          items={SOURCE_NODES.map(n => ({ label: n.label, sub: n.subtitle }))}
        />
        <FullViewArrow />
        <FullViewColumn
          title="Ingestion & Model"
          color="#60a5fa"
          items={[
            ...INGESTION_NODES.map(n => ({ label: n.label })),
            { label: 'L1 Reference', sub: '78 tables' },
            { label: 'L2 Snapshots', sub: '25 tables' },
          ]}
        />
        <FullViewArrow />
        <FullViewColumn
          title="Processing Engine"
          color="#a78bfa"
          items={[
            ...PROCESSING_TIER_NODES.map(n => ({ label: n.label, sub: n.subtitle })),
            { label: 'Metric Derivation', sub: '27 variants' },
          ]}
        />
        <FullViewArrow />
        <FullViewColumn
          title="Dashboards & Outputs"
          color="#f472b6"
          items={[
            { label: '7 Dashboard Pages', sub: 'KPIs to drill-down' },
            { label: 'Metric Library', sub: '27 variants' },
            { label: 'Schema Visualizer', sub: '153 tables' },
            { label: 'Lineage Explorer', sub: 'full traceability' },
          ]}
        />
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Main PulseStage switcher
 * ═══════════════════════════════════════════════════════════════════════════ */

interface PulseStageProps {
  act: PulseAct;
}

export default function PulseStage({ act }: PulseStageProps) {
  return (
    <motion.div
      key={act.id}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="w-full flex justify-center"
    >
      {act.id === 'sources' && <SourceSystemsAct />}
      {act.id === 'ingestion' && <IngestionAct />}
      {act.id === 'processing' && <ProcessingAct />}
      {act.id === 'outputs' && <OutputsAct />}
    </motion.div>
  );
}
