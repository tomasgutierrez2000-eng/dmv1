'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Database,
  Layers,
  Calculator,
  BarChart3,
  LayoutDashboard,
  Sparkles,
  RotateCcw,
  Table2,
  Users,
  Briefcase,
  FolderTree,
  PieChart,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  METRICS,
  SOURCE_SYSTEM_MAP,
  STEP_TYPE_STYLES,
  JOURNEY_STEPS,
} from './pickAMetricData';
import type { MetricJourneyDef, JourneyStepId } from './pickAMetricData';

/* ═══════════════════════════════════════════════════════════════════════════
 * Shared
 * ═══════════════════════════════════════════════════════════════════════════ */

const LEVEL_ICONS = [Table2, Users, Briefcase, FolderTree, PieChart];

const stagger = (s: number) => ({
  hidden: {},
  visible: { transition: { staggerChildren: s } },
});
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
const fadeRight = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Step 0: Metric Picker
 * ═══════════════════════════════════════════════════════════════════════════ */

function MetricPicker({ onSelect }: { onSelect: (m: MetricJourneyDef) => void }) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-5xl">
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
          Pick a Metric
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
          Choose a metric to watch its complete journey — from raw source data through calculation and aggregation to the executive dashboard.
        </p>
      </div>

      <motion.div
        className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full"
        variants={stagger(0.1)}
        initial="hidden"
        animate="visible"
      >
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <motion.button
              key={m.id}
              variants={fadeUp}
              onClick={() => onSelect(m)}
              className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-5 text-left group hover:border-slate-600 hover:bg-slate-800/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${m.domainColor}18` }}
                >
                  <Icon className="w-5 h-5" style={{ color: m.domainColor }} />
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold text-white">{m.shortName}</div>
                  <div className="text-[10px] font-medium" style={{ color: m.domainColor }}>
                    {m.domainLabel}
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-slate-400 leading-relaxed mb-2">{m.tagline}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-slate-300 group-hover:gap-2 transition-all">
                <span>Explore journey</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Journey Step: Source Systems
 * ═══════════════════════════════════════════════════════════════════════════ */

function SourceStep({ metric }: { metric: MetricJourneyDef }) {
  return (
    <motion.div className="space-y-6 w-full max-w-3xl" variants={stagger(0.15)} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="text-center">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
          Step 1 of 5
        </div>
        <h3 className="text-xl font-bold text-white mb-1">Source Systems</h3>
        <p className="text-sm text-slate-400">
          {metric.shortName} pulls raw data from {metric.sourceSystemIds.length} upstream systems
        </p>
      </motion.div>

      <motion.div className="flex flex-wrap justify-center gap-4" variants={stagger(0.2)}>
        {metric.sourceSystemIds.map((sid) => {
          const sys = SOURCE_SYSTEM_MAP[sid];
          if (!sys) return null;
          return (
            <motion.div
              key={sid}
              variants={fadeUp}
              className="bg-slate-900/70 border border-slate-700/50 rounded-xl px-6 py-4 flex items-center gap-3"
            >
              <Database className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm font-semibold text-slate-200">{sys.label}</div>
                <div className="text-[11px] text-slate-500">{sys.subtitle}</div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div variants={fadeUp} className="flex justify-center">
        <div className="bg-slate-800/50 rounded-lg px-4 py-2 text-[11px] text-slate-500 flex items-center gap-2">
          <ArrowRight className="w-3 h-3" />
          Data flows into the ingestion pipeline for validation and standardization
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Journey Step: Tables & Fields
 * ═══════════════════════════════════════════════════════════════════════════ */

function TablesStep({ metric }: { metric: MetricJourneyDef }) {
  const l1Fields = metric.sourceFields.filter(f => f.layer === 'L1');
  const l2Fields = metric.sourceFields.filter(f => f.layer === 'L2');

  return (
    <motion.div className="space-y-6 w-full max-w-3xl" variants={stagger(0.15)} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="text-center">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
          Step 2 of 5
        </div>
        <h3 className="text-xl font-bold text-white mb-1">Data Tables & Fields</h3>
        <p className="text-sm text-slate-400">
          {metric.shortName} reads from {metric.sourceFields.length} fields across L1 and L2
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {l1Fields.length > 0 && (
          <motion.div variants={fadeRight} className="bg-slate-900/70 border border-[#D04A02]/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-[#D04A02]" />
              <span className="text-[12px] font-bold text-[#D04A02]">L1 — Reference Data</span>
            </div>
            <div className="space-y-2">
              {l1Fields.map((f) => (
                <div key={`${f.table}.${f.field}`} className="bg-slate-800/50 rounded-lg px-3 py-2">
                  <div className="text-[11px] font-mono text-slate-300">{f.table}</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span className="text-[#D04A02]">.{f.field}</span>
                    <span>— {f.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {l2Fields.length > 0 && (
          <motion.div variants={fadeRight} className="bg-slate-900/70 border border-[#E87722]/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-[#E87722]" />
              <span className="text-[12px] font-bold text-[#E87722]">L2 — Snapshots & Events</span>
            </div>
            <div className="space-y-2">
              {l2Fields.map((f) => (
                <div key={`${f.table}.${f.field}`} className="bg-slate-800/50 rounded-lg px-3 py-2">
                  <div className="text-[11px] font-mono text-slate-300">{f.table}</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span className="text-[#E87722]">.{f.field}</span>
                    <span>— {f.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Journey Step: Calculate
 * ═══════════════════════════════════════════════════════════════════════════ */

function CalculateStep({ metric }: { metric: MetricJourneyDef }) {
  return (
    <motion.div className="space-y-6 w-full max-w-3xl" variants={stagger(0.15)} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="text-center">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
          Step 3 of 5
        </div>
        <h3 className="text-xl font-bold text-white mb-1">Facility-Level Calculation</h3>
        <p className="text-sm text-slate-400">{metric.formula}</p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-6 max-w-lg mx-auto"
      >
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <span className="text-[12px] font-bold text-emerald-400">{metric.shortName} Formula</span>
        </div>

        <div className="space-y-3">
          {metric.formulaParts.map((part, i) => (
            <motion.div
              key={part.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.35, duration: 0.4 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: part.color }} />
                <span className="text-sm text-slate-300">{part.label}</span>
              </div>
              <span className="text-sm font-bold font-mono" style={{ color: part.color }}>
                {part.value}
              </span>
            </motion.div>
          ))}

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3 + metric.formulaParts.length * 0.35, duration: 0.3 }}
            className="h-px bg-slate-700 origin-left"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + metric.formulaParts.length * 0.35, duration: 0.4 }}
            className="flex items-center justify-between pt-1"
          >
            <span className="text-sm font-semibold text-slate-200">{metric.resultLabel}</span>
            <span className="text-2xl font-bold font-mono" style={{ color: metric.domainColor }}>
              {metric.result}
            </span>
          </motion.div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex justify-center">
        <div className="text-[11px] text-slate-500 italic">{metric.direction}</div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Journey Step: Aggregate (Rollup Hierarchy)
 * ═══════════════════════════════════════════════════════════════════════════ */

function AggregateStep({ metric }: { metric: MetricJourneyDef }) {
  return (
    <motion.div className="space-y-6 w-full max-w-3xl" variants={stagger(0.15)} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="text-center">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
          Step 4 of 5
        </div>
        <h3 className="text-xl font-bold text-white mb-1">Rollup Through Hierarchy</h3>
        <p className="text-sm text-slate-400">
          {metric.shortName} aggregates from facility to business segment
        </p>
      </motion.div>

      <motion.div className="space-y-3" variants={stagger(0.18)}>
        {metric.rollupLevels.map((level, i) => {
          const Icon = LEVEL_ICONS[i] || PieChart;
          const stepStyle = STEP_TYPE_STYLES[level.stepType];
          return (
            <motion.div
              key={level.level}
              variants={fadeRight}
              className="relative bg-slate-900/70 border border-slate-700/40 rounded-xl px-5 py-3.5 flex items-center gap-4"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${metric.domainColor}15` }}
              >
                <Icon className="w-4.5 h-4.5" style={{ color: metric.domainColor }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-slate-200">{level.label}</span>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border ${stepStyle.bg} ${stepStyle.text} ${stepStyle.border}`}>
                    {level.stepType}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {level.method} — <span className="font-mono text-slate-400">{level.formula}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-base font-bold font-mono" style={{ color: metric.domainColor }}>
                  {level.sampleValue}
                </div>
              </div>

              {/* Connecting line to next */}
              {i < metric.rollupLevels.length - 1 && (
                <div className="absolute -bottom-2 left-1/2 w-px h-3 bg-slate-700" />
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Journey Step: Dashboard
 * ═══════════════════════════════════════════════════════════════════════════ */

function DashboardStep({ metric }: { metric: MetricJourneyDef }) {
  const topLevel = metric.rollupLevels[metric.rollupLevels.length - 1];
  const facilityLevel = metric.rollupLevels[0];

  return (
    <motion.div className="space-y-6 w-full max-w-3xl" variants={stagger(0.15)} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="text-center">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
          Step 5 of 5
        </div>
        <h3 className="text-xl font-bold text-white mb-1">Dashboard Output</h3>
        <p className="text-sm text-slate-400">
          {metric.shortName} appears across multiple dashboard views
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Executive KPI card */}
        <motion.div
          variants={fadeUp}
          className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[10px] font-bold text-pink-400 uppercase">Executive KPI</span>
          </div>
          <div className="text-[11px] text-slate-500 mb-2">{topLevel.label} Level</div>
          <div className="text-3xl font-bold font-mono" style={{ color: metric.domainColor }}>
            {topLevel.sampleValue}
          </div>
          <div className="text-sm text-slate-300 mt-1">{metric.name}</div>
        </motion.div>

        {/* Drill-down card */}
        <motion.div
          variants={fadeUp}
          className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[10px] font-bold text-pink-400 uppercase">Drill-Down</span>
          </div>
          <div className="text-[11px] text-slate-500 mb-3">Facility-level detail</div>
          <div className="space-y-2">
            {['Facility A', 'Facility B', 'Facility C'].map((name, i) => {
              const val = i === 0
                ? facilityLevel.sampleValue
                : i === 1 ? metric.rollupLevels[1]?.sampleValue || facilityLevel.sampleValue
                : metric.result;
              return (
                <div key={name} className="flex items-center justify-between text-[12px]">
                  <span className="text-slate-400">{name}</span>
                  <span className="font-mono font-medium" style={{ color: metric.domainColor }}>
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Journey complete banner */}
      <motion.div
        variants={fadeUp}
        className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4 text-center"
      >
        <div className="text-sm text-slate-300 mb-1">
          From <span className="font-semibold text-white">{metric.sourceSystemIds.length} source systems</span> through{' '}
          <span className="font-semibold text-white">{metric.sourceFields.length} data fields</span> to{' '}
          <span className="font-semibold text-white">{metric.rollupLevels.length} aggregation levels</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Full lineage and governance tracked at every step
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Step progress bar
 * ═══════════════════════════════════════════════════════════════════════════ */

function StepProgress({
  currentStep,
  metric,
  onStepClick,
}: {
  currentStep: number;
  metric: MetricJourneyDef;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {JOURNEY_STEPS.map((step, i) => (
        <React.Fragment key={step.id}>
          {i > 0 && <div className="w-4 sm:w-8 h-px bg-slate-700" />}
          <button
            onClick={() => onStepClick(i)}
            className={`
              flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium transition-all
              ${i === currentStep
                ? 'bg-slate-800 border border-slate-600 text-white'
                : i < currentStep
                  ? 'text-slate-400 hover:text-slate-300'
                  : 'text-slate-600'
              }
            `}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                i === currentStep
                  ? 'text-white'
                  : i < currentStep
                    ? 'text-slate-500'
                    : 'text-slate-700 bg-slate-800'
              }`}
              style={i <= currentStep ? { backgroundColor: `${metric.domainColor}30`, color: metric.domainColor } : {}}
            >
              {i + 1}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Main: PickAMetric
 * ═══════════════════════════════════════════════════════════════════════════ */

const STEP_COMPONENTS = [SourceStep, TablesStep, CalculateStep, AggregateStep, DashboardStep];

export default function PickAMetric() {
  const [selectedMetric, setSelectedMetric] = useState<MetricJourneyDef | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const handleSelect = useCallback((m: MetricJourneyDef) => {
    setSelectedMetric(m);
    setCurrentStep(0);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedMetric(null);
    setCurrentStep(0);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < JOURNEY_STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  }, [currentStep]);

  /* ── Keyboard nav ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedMetric) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' && currentStep < JOURNEY_STEPS.length - 1) {
        e.preventDefault();
        setCurrentStep(s => s + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        e.preventDefault();
        setCurrentStep(s => s - 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedMetric, currentStep, handleBack]);

  const StepComponent = selectedMetric ? STEP_COMPONENTS[currentStep] : null;

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
            {selectedMetric && (
              <>
                <div className="w-px h-4 bg-slate-700" />
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Change metric
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-600 text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pick a Metric — Interactive Journey</span>
          </div>
        </header>

        {/* Metric badge (when selected) */}
        {selectedMetric && (
          <div className="px-6 py-2 flex justify-center">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-semibold"
              style={{
                color: selectedMetric.domainColor,
                borderColor: `${selectedMetric.domainColor}30`,
                backgroundColor: `${selectedMetric.domainColor}10`,
              }}
            >
              <selectedMetric.icon className="w-4 h-4" />
              {selectedMetric.name}
            </div>
          </div>
        )}

        {/* Step progress (when in journey) */}
        {selectedMetric && (
          <div className="px-6 py-3">
            <StepProgress
              currentStep={currentStep}
              metric={selectedMetric}
              onStepClick={setCurrentStep}
            />
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center px-6 py-4 pb-24">
          <AnimatePresence mode="wait" initial={false}>
            {!selectedMetric ? (
              <motion.div
                key="picker"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="w-full flex justify-center"
              >
                <MetricPicker onSelect={handleSelect} />
              </motion.div>
            ) : StepComponent ? (
              <motion.div
                key={`step-${currentStep}`}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="w-full flex justify-center"
              >
                <StepComponent metric={selectedMetric} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom navigation (when in journey) */}
      {selectedMetric && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-slate-800">
          <div className="h-1 w-full bg-slate-800">
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${((currentStep + 1) / JOURNEY_STEPS.length) * 100}%`,
                backgroundColor: selectedMetric.domainColor,
              }}
            />
          </div>
          <div className="flex items-center justify-between px-6 h-[60px]">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[11px] text-slate-500 font-mono">
                Step {currentStep + 1} of {JOURNEY_STEPS.length}: {JOURNEY_STEPS[currentStep].label}
              </span>
              <span className="text-[9px] text-slate-600 font-mono">← → navigate · Esc back</span>
            </div>

            {currentStep < JOURNEY_STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: selectedMetric.domainColor }}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Try another metric
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
