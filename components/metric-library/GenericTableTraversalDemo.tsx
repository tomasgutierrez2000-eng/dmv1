'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Calculator,
  Table2,
  Users,
  Briefcase,
  FolderTree,
  PieChart,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { TraversalConfig, TraversalTableDef } from '@/lib/metric-library/metric-config';
import type { RollupLevelKey } from '@/lib/metric-library/types';

/* ═══════════════════════════════════════════════════════════════════════════
 * TYPES
 * ═══════════════════════════════════════════════════════════════════════════ */

type StepKind = 'source' | 'join' | 'calc' | 'output';

interface InternalStep {
  kind: StepKind;
  highlightTable: string;
  arrowFrom?: string;
  arrowTo?: string;
  joinKey?: string;
  fieldsToShow: string[];
  narration: string;
  sampleResult?: string;
}

interface DimensionDemo {
  key: RollupLevelKey;
  label: string;
  icon: LucideIcon;
  description: string;
  tables: string[];
  steps: InternalStep[];
}

/* ═══════════════════════════════════════════════════════════════════════════
 * CONVERT TraversalConfig → internal data structures
 * ═══════════════════════════════════════════════════════════════════════════ */

const LEVEL_ICONS: Record<RollupLevelKey, LucideIcon> = {
  facility: Table2,
  counterparty: Users,
  desk: Briefcase,
  portfolio: FolderTree,
  lob: PieChart,
};

const LEVEL_LABELS: Record<RollupLevelKey, string> = {
  facility: 'Facility',
  counterparty: 'Counterparty',
  desk: 'Desk',
  portfolio: 'Portfolio',
  lob: 'Business Segment',
};

function buildDimensionDemos(config: TraversalConfig, metricName: string): DimensionDemo[] {
  const demos: DimensionDemo[] = [];

  for (const [level, steps] of Object.entries(config.dimension_paths) as [RollupLevelKey, typeof config.dimension_paths[RollupLevelKey]][]) {
    if (!steps?.length) continue;

    // Collect all unique tables referenced
    const tableSet = new Set<string>();
    for (const step of steps) {
      tableSet.add(step.highlight_table);
    }
    const tableIds = Array.from(tableSet);

    const internalSteps: InternalStep[] = steps.map((step, i) => ({
      kind: step.kind as StepKind,
      highlightTable: step.highlight_table,
      arrowFrom: i > 0 ? steps[i - 1].highlight_table : undefined,
      arrowTo: step.highlight_table,
      joinKey: step.join_condition,
      fieldsToShow: step.highlight_fields ?? [],
      narration: step.narration,
      sampleResult: step.kind === 'calc' || step.kind === 'output' ? `${metricName} calculated` : undefined,
    }));

    demos.push({
      key: level,
      label: LEVEL_LABELS[level] ?? level,
      icon: LEVEL_ICONS[level] ?? Table2,
      description: `${metricName} calculation at the ${LEVEL_LABELS[level]?.toLowerCase() ?? level} level`,
      tables: tableIds,
      steps: internalSteps,
    });
  }

  return demos;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYOUT CONSTANTS
 * ═══════════════════════════════════════════════════════════════════════════ */

const CARD_W = 220;
const CARD_GAP = 28;
const CARD_H_BASE = 56;
const FIELD_H = 20;
const ROW_HEIGHT = 180;
const SVG_PAD = 16;
const NAME_MAX_CHARS = 22;
const VALUE_MAX_CHARS = 14;

const PLAYBACK_BASE_MS = 5000;
const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 1.5, label: '1.5×' },
] as const;

function getCardPositions(
  tableIds: string[],
  tables: Record<string, TraversalTableDef>,
): Record<string, { x: number; y: number; h: number }> {
  const positions: Record<string, { x: number; y: number; h: number }> = {};
  let xCursor = SVG_PAD;

  for (const tid of tableIds) {
    const t = tables[tid];
    if (!t) continue;
    const isCalc = t.layer === 'L3';
    const fieldCount = isCalc ? 1 : Math.min(t.fields.length, 5);
    const h = CARD_H_BASE + fieldCount * FIELD_H;
    const y = t.layer === 'L1' ? ROW_HEIGHT : SVG_PAD;
    positions[tid] = { x: xCursor, y, h };
    xCursor += CARD_W + CARD_GAP;
  }
  return positions;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SUB-COMPONENTS (TableCard, AnimatedArrow — extracted from original)
 * ═══════════════════════════════════════════════════════════════════════════ */

const KIND_COLORS: Record<StepKind, string> = {
  source: '#f59e0b',
  join: '#3b82f6',
  calc: '#a855f7',
  output: '#10b981',
};

function TableCard({
  tableDef,
  isActive,
  isVisited,
  fieldsToShow,
  sampleResult,
  x, y, w, h,
}: {
  tableDef: TraversalTableDef;
  isActive: boolean;
  isVisited: boolean;
  fieldsToShow: string[];
  sampleResult?: string;
  x: number; y: number; w: number; h: number;
}) {
  const isCalc = tableDef.layer === 'L3';
  const glowColor = isCalc ? '#10b981' : tableDef.layer === 'L1' ? '#3b82f6' : '#f59e0b';
  const shortName = tableDef.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 28);

  return (
    <g style={{
      opacity: isActive ? 1 : isVisited ? 0.7 : 0.25,
      transition: 'opacity 0.5s ease',
      ...(isActive ? { animation: 'ttd-fadeIn 0.4s ease-out' } : {}),
    }}>
      {isActive && (
        <>
          <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={16} fill="none" stroke={glowColor} strokeWidth={1} opacity={0.2} style={{ filter: 'blur(6px)' }} />
          <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={13} fill="none" stroke={glowColor} strokeWidth={2} opacity={0.5} style={{ animation: 'ttd-glow 2s ease-in-out infinite' }} />
        </>
      )}
      <rect
        x={x} y={y} width={w} height={h} rx={10}
        fill={isActive ? (isCalc ? 'rgba(16,185,129,0.12)' : tableDef.layer === 'L1' ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)') : 'rgba(255,255,255,0.02)'}
        stroke={isActive ? glowColor : '#374151'}
        strokeWidth={isActive ? 2 : 1}
        style={{ transition: 'all 0.5s ease' }}
      />
      {/* Layer badge */}
      <rect x={x + 6} y={y + 6} width={24} height={16} rx={4} fill={isCalc ? 'rgba(16,185,129,0.2)' : tableDef.layer === 'L1' ? 'rgba(59,130,246,0.2)' : 'rgba(245,158,11,0.2)'} />
      <text x={x + 18} y={y + 18} textAnchor="middle" fill={isCalc ? '#6ee7b7' : tableDef.layer === 'L1' ? '#93c5fd' : '#fcd34d'} fontSize={9} fontWeight={700}>
        {isCalc ? 'FX' : tableDef.layer}
      </text>
      {/* Table name */}
      <text x={x + 36} y={y + 19} fill={isActive ? '#f3f4f6' : '#9ca3af'} fontSize={11} fontWeight={600}>
        {shortName}
      </text>
      {/* Full name */}
      <text x={x + 8} y={y + 40} fill="#6b7280" fontSize={8} fontFamily="monospace">
        {tableDef.name.length > 38 ? tableDef.name.slice(0, 36) + '\u2026' : tableDef.name}
      </text>

      {/* Fields or result */}
      {isCalc && sampleResult && isActive ? (
        <text x={x + w / 2} y={y + 58} textAnchor="middle" fill="#6ee7b7" fontSize={10} fontWeight={700} fontFamily="monospace">
          {sampleResult.length > 36 ? sampleResult.slice(0, 34) + '\u2026' : sampleResult}
        </text>
      ) : (
        tableDef.fields.slice(0, 5).map((field, i) => {
          const isHighlighted = isActive && fieldsToShow.includes(field.name);
          const fy = y + CARD_H_BASE + i * FIELD_H;
          const nameDisplay = field.name.length > NAME_MAX_CHARS ? field.name.slice(0, NAME_MAX_CHARS - 1) + '\u2026' : field.name;
          const valueDisplay = field.sample_value.length > VALUE_MAX_CHARS ? field.sample_value.slice(0, VALUE_MAX_CHARS - 1) + '\u2026' : field.sample_value;
          return (
            <g key={field.name}>
              {isHighlighted && <rect x={x + 4} y={fy - 2} width={w - 8} height={FIELD_H - 2} rx={4} fill="rgba(245,158,11,0.1)" />}
              <text x={x + 12} y={fy + 13} fill={isHighlighted ? '#fcd34d' : '#6b7280'} fontSize={9} fontFamily="monospace" fontWeight={isHighlighted ? 600 : 400}>
                <title>{field.name}</title>
                {nameDisplay}
              </text>
              {isHighlighted && (
                <text x={x + w - 12} y={fy + 13} textAnchor="end" fill="#d1d5db" fontSize={9} fontFamily="monospace" fontWeight={600}>
                  <title>{field.sample_value}</title>
                  {valueDisplay}
                </text>
              )}
            </g>
          );
        })
      )}
    </g>
  );
}

function AnimatedArrow({
  fromPos, toPos, fromW, fromH, toH,
  isActive, isVisited, joinKey, color,
}: {
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  fromW: number; fromH: number; toH: number;
  isActive: boolean; isVisited: boolean;
  joinKey?: string; color: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(500);

  useEffect(() => {
    if (pathRef.current) setPathLength(pathRef.current.getTotalLength());
  }, [fromPos.x, fromPos.y, toPos.x, toPos.y, fromW, fromH, toH]);

  const isSelfJoin = fromPos.x === toPos.x && fromPos.y === toPos.y;
  let pathD: string;
  let labelX: number;
  let labelY: number;

  if (isSelfJoin) {
    const cx = fromPos.x + fromW + 30;
    const y1 = fromPos.y + fromH * 0.3;
    const y2 = fromPos.y + fromH * 0.7;
    pathD = `M${fromPos.x + fromW},${y1} C${cx},${y1} ${cx},${y2} ${fromPos.x + fromW},${y2}`;
    labelX = cx + 4;
    labelY = (y1 + y2) / 2;
  } else {
    const sameRow = Math.abs(fromPos.y - toPos.y) < 40;
    let x1: number, y1: number, x2: number, y2: number;
    if (sameRow) {
      const goingRight = toPos.x > fromPos.x;
      x1 = goingRight ? fromPos.x + fromW : fromPos.x;
      y1 = fromPos.y + fromH / 2;
      x2 = goingRight ? toPos.x : toPos.x + fromW;
      y2 = toPos.y + toH / 2;
    } else {
      x1 = fromPos.x + fromW / 2;
      y1 = toPos.y < fromPos.y ? fromPos.y : fromPos.y + fromH;
      x2 = toPos.x + fromW / 2;
      y2 = toPos.y < fromPos.y ? toPos.y + toH : toPos.y;
    }
    const cx1 = sameRow ? (x1 + x2) / 2 : x1;
    const cy1 = sameRow ? y1 : (y1 + y2) / 2;
    const cx2 = sameRow ? (x1 + x2) / 2 : x2;
    const cy2 = sameRow ? y2 : (y1 + y2) / 2;
    pathD = `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
    labelX = (x1 + x2) / 2;
    labelY = sameRow ? 160 : (y1 + y2) / 2 - 8;
  }

  const drawStyle: React.CSSProperties = isActive
    ? { strokeDasharray: pathLength, strokeDashoffset: 0, transition: 'stroke-dashoffset 0.8s ease-out, opacity 0.3s' }
    : isVisited
      ? { strokeDasharray: 'none', transition: 'opacity 0.5s' }
      : { strokeDasharray: pathLength, strokeDashoffset: pathLength, transition: 'stroke-dashoffset 0.8s ease-out, opacity 0.3s' };

  return (
    <g style={{ opacity: isActive ? 1 : isVisited ? 0.4 : 0, transition: 'opacity 0.5s' }}>
      {isActive && <path d={pathD} fill="none" stroke={color} strokeWidth={6} opacity={0.15} style={{ filter: 'blur(4px)' }} />}
      <path ref={pathRef} d={pathD} fill="none" stroke={color} strokeWidth={isActive ? 2.5 : 1.5} markerEnd="url(#arrow-active)" style={drawStyle} />
      {isActive && joinKey && (
        <g style={{ animation: 'ttd-fadeIn 0.6s ease-out 0.4s both' }}>
          <rect x={labelX - 4} y={labelY - 10} width={Math.min(joinKey.length * 5 + 16, 200)} height={16} rx={4} fill="rgba(0,0,0,0.85)" stroke={color} strokeWidth={0.5} opacity={0.9} />
          <text x={labelX + 2} y={labelY + 1} fill={color} fontSize={8} fontFamily="monospace" fontWeight={600}>
            ON {joinKey.length > 36 ? joinKey.slice(0, 34) + '\u2026' : joinKey}
          </text>
        </g>
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MAIN COMPONENT — Config-driven, no hardcoded metric data
 * ═══════════════════════════════════════════════════════════════════════════ */

interface GenericTableTraversalDemoProps {
  config: TraversalConfig;
  metricName: string;
  activeDimension?: RollupLevelKey;
}

export default function GenericTableTraversalDemo({
  config,
  metricName,
  activeDimension,
}: GenericTableTraversalDemoProps) {
  const dimensionDemos = React.useMemo(() => buildDimensionDemos(config, metricName), [config, metricName]);

  const [selectedDim, setSelectedDim] = useState<string>(
    activeDimension ?? dimensionDemos[0]?.key ?? 'facility',
  );
  const [activeStep, setActiveStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with external activeDimension prop
  useEffect(() => {
    if (activeDimension && activeDimension !== selectedDim) {
      setSelectedDim(activeDimension);
    }
  }, [activeDimension]); // eslint-disable-line react-hooks/exhaustive-deps

  const demo = dimensionDemos.find((d) => d.key === selectedDim) ?? dimensionDemos[0];

  const totalSteps = demo?.steps.length ?? 0;
  const stepDelayMs = Math.round(PLAYBACK_BASE_MS / playbackSpeed);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    if (isPlaying && activeStep >= 0 && activeStep < totalSteps - 1) {
      timerRef.current = setTimeout(() => setActiveStep((s) => s + 1), stepDelayMs);
      return clearTimer;
    }
    if (activeStep >= totalSteps - 1) setIsPlaying(false);
  }, [isPlaying, activeStep, totalSteps, stepDelayMs, clearTimer]);

  useEffect(() => {
    setActiveStep(-1);
    setIsPlaying(false);
    clearTimer();
  }, [selectedDim, clearTimer]);

  if (!demo) return null;

  const positions = getCardPositions(demo.tables, config.tables);
  const step = activeStep >= 0 ? demo.steps[activeStep] : null;

  const visitedTables = new Set<string>();
  const visitedArrows = new Set<string>();
  if (activeStep >= 0) {
    for (let i = 0; i <= activeStep; i++) {
      visitedTables.add(demo.steps[i].highlightTable);
      if (demo.steps[i].arrowFrom && demo.steps[i].arrowTo) {
        visitedArrows.add(`${demo.steps[i].arrowFrom}->${demo.steps[i].arrowTo}`);
      }
    }
  }

  const joinSteps = demo.steps.filter((s) => s.joinKey);

  const play = () => { if (activeStep >= totalSteps - 1) setActiveStep(0); else if (activeStep === -1) setActiveStep(0); setIsPlaying(true); };
  const pause = () => { setIsPlaying(false); clearTimer(); };
  const next = () => { pause(); setActiveStep((s) => Math.min(s + 1, totalSteps - 1)); };
  const prev = () => { pause(); setActiveStep((s) => Math.max(s - 1, 0)); };
  const reset = () => { pause(); setActiveStep(-1); };

  const svgW = demo.tables.length * (CARD_W + CARD_GAP) + SVG_PAD * 2;
  const svgH = ROW_HEIGHT + 120;

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <style>{`
        @keyframes ttd-glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.2; } }
        @keyframes ttd-fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ttd-slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Table Traversal Demo</h3>
          <span className="text-[10px] text-gray-600">Pick a dimension, then watch how the tables connect</span>
        </div>
      </div>

      {/* Dimension picker */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2 flex-wrap">
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mr-1">Dimension:</span>
        {dimensionDemos.map((d) => {
          const Icon = d.icon;
          const active = selectedDim === d.key;
          return (
            <button
              key={d.key}
              onClick={() => setSelectedDim(d.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                active
                  ? 'bg-purple-500/15 border border-purple-500/40 text-purple-300'
                  : 'bg-white/[0.02] border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Description */}
      <div className="px-5 py-2 bg-white/[0.01]">
        <p className="text-[11px] text-gray-500">{demo.description}</p>
      </div>

      {/* Steps + controls */}
      <div className="px-5 py-4 border-b border-white/5 bg-black/20">
        <div className="h-0.5 bg-gray-800 rounded-full mb-3">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-blue-500 to-purple-500 transition-all duration-700 ease-out rounded-full"
            style={{ width: activeStep >= 0 ? `${((activeStep + 1) / totalSteps) * 100}%` : '0%' }}
          />
        </div>

        {activeStep === -1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-400">
              Press <strong className="text-white">Play</strong> to watch how the <strong className="text-purple-300">{demo.label}</strong> dimension
              traverses the database tables step by step.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Speed:</span>
              {SPEED_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setPlaybackSpeed(opt.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${playbackSpeed === opt.value ? 'bg-purple-500/25 border border-purple-500/40 text-purple-300' : 'bg-white/[0.04] border border-gray-800 text-gray-500 hover:text-gray-300'}`}>
                  {opt.label}
                </button>
              ))}
              <button onClick={play} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-sm hover:bg-purple-500/25 transition-colors">
                <Play className="w-4 h-4" /> Start Demo
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div key={`narration-${selectedDim}-${activeStep}`} className="flex-1 min-w-0 max-w-2xl" style={{ animation: 'ttd-slideUp 0.4s ease-out' }}>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Step {activeStep + 1} of {totalSteps}</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ color: KIND_COLORS[step!.kind], borderColor: KIND_COLORS[step!.kind] + '40', backgroundColor: KIND_COLORS[step!.kind] + '15' }}>
                  {step!.kind.toUpperCase()}
                </span>
                {step!.joinKey && (
                  <code className="text-[9px] font-mono text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    ON {step!.joinKey}
                  </code>
                )}
              </div>
              <p className="text-[13px] text-gray-300 leading-relaxed">{step!.narration}</p>
              {step!.sampleResult && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                  <code className="text-sm font-mono font-bold text-emerald-300">{step!.sampleResult}</code>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <button onClick={prev} disabled={activeStep <= 0} className="w-8 h-8 rounded-lg bg-white/5 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Previous step">
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                {isPlaying ? (
                  <button onClick={pause} className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 hover:bg-amber-500/25 transition-colors" title="Pause">
                    <Pause className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={play} className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 hover:bg-purple-500/25 transition-colors" title="Play">
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button onClick={next} disabled={activeStep >= totalSteps - 1} className="w-8 h-8 rounded-lg bg-white/5 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Next step">
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Speed:</span>
                {SPEED_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => setPlaybackSpeed(opt.value)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${playbackSpeed === opt.value ? 'bg-purple-500/25 border border-purple-500/40 text-purple-300' : 'bg-white/[0.04] border border-gray-800 text-gray-500 hover:text-gray-300'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <button onClick={reset} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors" title="Reset">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Join conditions */}
      {joinSteps.length > 0 && (
        <div className="px-5 py-3 border-b border-white/5 bg-gray-900/30">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2">Join conditions (all steps)</div>
          <div className="flex flex-wrap gap-2">
            {joinSteps.map((s, i) => {
              const fromName = s.arrowFrom ? (config.tables[s.arrowFrom]?.name ?? s.arrowFrom) : '?';
              const toName = s.arrowTo ? (config.tables[s.arrowTo]?.name ?? s.arrowTo) : '?';
              const isCurrent = step && demo.steps[activeStep] === s;
              return (
                <div key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono ${isCurrent ? 'bg-blue-500/15 border-blue-500/40 text-blue-200' : 'bg-white/[0.03] border-gray-800 text-gray-400'}`}>
                  <span className="text-gray-500">{fromName.split('_').map(w => w[0]).join('').toUpperCase()}</span>
                  <span className="text-gray-600">→</span>
                  <span>{toName.split('_').map(w => w[0]).join('').toUpperCase()}</span>
                  <span className="text-emerald-400/90">ON {s.joinKey}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SVG Diagram */}
      <div className="px-2 pt-6 pb-3 overflow-x-auto overflow-y-hidden">
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="block" style={{ minWidth: svgW }}>
          <defs>
            <marker id="arrow-active" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
              <polygon points="0 0, 8 4, 0 8" fill="#a855f7" />
            </marker>
          </defs>

          <text x={8} y={SVG_PAD + 10} fill="#4b5563" fontSize={8} fontWeight={700} fontFamily="monospace">L2 Snapshots</text>
          <text x={8} y={ROW_HEIGHT + 10} fill="#4b5563" fontSize={8} fontWeight={700} fontFamily="monospace">L1 Reference</text>

          {/* Arrows */}
          {demo.steps.map((s, i) => {
            if (!s.arrowFrom || !s.arrowTo) return null;
            const from = positions[s.arrowFrom];
            const to = positions[s.arrowTo];
            if (!from || !to) return null;
            const arrowKey = `${s.arrowFrom}->${s.arrowTo}`;
            return (
              <AnimatedArrow
                key={`arrow-${selectedDim}-${i}`}
                fromPos={from} toPos={to}
                fromW={CARD_W} fromH={from.h} toH={to.h}
                isActive={i === activeStep}
                isVisited={visitedArrows.has(arrowKey) && i < activeStep}
                joinKey={s.joinKey}
                color={KIND_COLORS[s.kind]}
              />
            );
          })}

          {/* Table cards */}
          {demo.tables.map((tid) => {
            const t = config.tables[tid];
            const pos = positions[tid];
            if (!t || !pos) return null;
            const isActive = step?.highlightTable === tid;
            const isVisited = visitedTables.has(tid) && !isActive;
            return (
              <TableCard
                key={`${selectedDim}-${tid}`}
                tableDef={t}
                isActive={isActive}
                isVisited={isVisited}
                fieldsToShow={isActive && step ? step.fieldsToShow : []}
                sampleResult={isActive && step ? step.sampleResult : undefined}
                x={pos.x} y={pos.y} w={CARD_W} h={pos.h}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
