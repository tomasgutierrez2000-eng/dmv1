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

/* ═══════════════════════════════════════════════════════════════════════════
 * DATA: Table definitions used in the diagram
 * ═══════════════════════════════════════════════════════════════════════════ */

interface TableDef {
  id: string;
  name: string;
  layer: 'L1' | 'L2' | 'CALC';
  shortName: string;
  fields: { name: string; sampleValue: string }[];
}

const TABLES: Record<string, TableDef> = {
  cs: {
    id: 'cs',
    name: 'collateral_snapshot',
    layer: 'L2',
    shortName: 'Collateral Snapshot',
    fields: [
      { name: 'collateral_snapshot_id', sampleValue: 'CS-001' },
      { name: 'facility_id', sampleValue: '12345' },
      { name: 'current_valuation_usd', sampleValue: '$55,000,000' },
      { name: 'as_of_date', sampleValue: '2024-12-31' },
    ],
  },
  fm: {
    id: 'fm',
    name: 'facility_master',
    layer: 'L1',
    shortName: 'Facility Master',
    fields: [
      { name: 'facility_id', sampleValue: '12345' },
      { name: 'counterparty_id', sampleValue: '7890' },
      { name: 'lob_segment_id', sampleValue: '301' },
      { name: 'facility_active_flag', sampleValue: 'Y' },
    ],
  },
  fcp: {
    id: 'fcp',
    name: 'facility_counterparty_participation',
    layer: 'L1',
    shortName: 'Participation',
    fields: [
      { name: 'facility_id', sampleValue: '12345' },
      { name: 'counterparty_id', sampleValue: '7890' },
      { name: 'participation_pct', sampleValue: '100.00' },
      { name: 'counterparty_role_code', sampleValue: 'BORROWER' },
    ],
  },
  cp: {
    id: 'cp',
    name: 'counterparty',
    layer: 'L1',
    shortName: 'Counterparty',
    fields: [
      { name: 'counterparty_id', sampleValue: '7890' },
      { name: 'counterparty_name', sampleValue: 'Apex Properties' },
      { name: 'risk_rating', sampleValue: 'BBB' },
    ],
  },
  ebt: {
    id: 'ebt',
    name: 'enterprise_business_taxonomy',
    layer: 'L1',
    shortName: 'Business Taxonomy',
    fields: [
      { name: 'managed_segment_id', sampleValue: '301' },
      { name: 'parent_segment_id', sampleValue: '30' },
      { name: 'lob_l3_name', sampleValue: 'CRE Lending Desk' },
      { name: 'lob_l2_name', sampleValue: 'Commercial Real Estate' },
      { name: 'lob_l1_name', sampleValue: 'Lending Division' },
    ],
  },
  sumagg: {
    id: 'sumagg',
    name: 'SUM Aggregation',
    layer: 'CALC',
    shortName: 'SUM Aggregate',
    fields: [],
  },
  partwt: {
    id: 'partwt',
    name: 'Participation-Weighted SUM',
    layer: 'CALC',
    shortName: 'Participation \u00d7 MV',
    fields: [],
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * DATA: Traversal steps per dimension
 * ═══════════════════════════════════════════════════════════════════════════ */

type StepKind = 'source' | 'join' | 'aggregate' | 'result';

interface TraversalStep {
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
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
  tables: string[];
  steps: TraversalStep[];
}

const DIMENSION_DEMOS: DimensionDemo[] = [
  {
    key: 'facility',
    label: 'Facility',
    icon: Table2,
    description: 'Total collateral market value for a single loan facility',
    tables: ['cs', 'fm', 'sumagg'],
    steps: [
      {
        kind: 'source',
        highlightTable: 'cs',
        fieldsToShow: ['collateral_snapshot_id', 'facility_id', 'current_valuation_usd'],
        narration:
          'We start at the collateral snapshot table. Each row represents one collateral asset \u2014 a property, equipment, or security pledged against a loan. For facility 12345, there are 3 collateral assets: $55M, $40M, and $25M.',
      },
      {
        kind: 'join',
        highlightTable: 'fm',
        arrowFrom: 'cs',
        arrowTo: 'fm',
        joinKey: 'facility_id',
        fieldsToShow: ['facility_id', 'facility_active_flag'],
        narration:
          'We follow the facility_id link to facility_master to confirm this is an active facility (facility_active_flag = Y) and get the latest snapshot (MAX as_of_date).',
      },
      {
        kind: 'result',
        highlightTable: 'sumagg',
        arrowFrom: 'cs',
        arrowTo: 'sumagg',
        fieldsToShow: [],
        narration:
          'SUM all current_valuation_usd values for this facility: $55M + $40M + $25M = $120,000,000. This is the total collateral market value securing this single CRE Multifamily loan.',
        sampleResult: 'SUM = $120,000,000',
      },
    ],
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    description: 'Participation-weighted collateral MV for a borrower',
    tables: ['cs', 'fm', 'fcp', 'cp', 'sumagg', 'partwt'],
    steps: [
      {
        kind: 'source',
        highlightTable: 'cs',
        fieldsToShow: ['facility_id', 'current_valuation_usd'],
        narration:
          'We start with collateral snapshots. But this time we need to attribute values to a specific counterparty \u2014 and a facility may have multiple participating counterparties.',
      },
      {
        kind: 'aggregate',
        highlightTable: 'sumagg',
        arrowFrom: 'cs',
        arrowTo: 'sumagg',
        fieldsToShow: [],
        narration:
          'First, compute per-facility collateral MV by summing collateral assets. Facility A: $120M, Facility B: $65M, Facility E: $50M.',
        sampleResult: '$120M, $65M, $50M per facility',
      },
      {
        kind: 'join',
        highlightTable: 'fm',
        arrowFrom: 'cs',
        arrowTo: 'fm',
        joinKey: 'facility_id',
        fieldsToShow: ['facility_id', 'counterparty_id'],
        narration:
          'Look up each facility in facility_master to find its counterparty_id and confirm it is active.',
      },
      {
        kind: 'join',
        highlightTable: 'fcp',
        arrowFrom: 'fm',
        arrowTo: 'fcp',
        joinKey: 'facility_id + counterparty_id',
        fieldsToShow: ['facility_id', 'counterparty_id', 'participation_pct'],
        narration:
          'The critical step: look up the participation_pct in facility_counterparty_participation. For Facility E, Apex Properties has 60% participation and TechForge has 40%.',
      },
      {
        kind: 'join',
        highlightTable: 'cp',
        arrowFrom: 'fcp',
        arrowTo: 'cp',
        joinKey: 'counterparty_id',
        fieldsToShow: ['counterparty_id', 'counterparty_name'],
        narration:
          'Follow counterparty_id to the counterparty table to resolve the name: "Apex Properties." Now we know which borrower and what percentage they own.',
      },
      {
        kind: 'result',
        highlightTable: 'partwt',
        arrowFrom: 'cp',
        arrowTo: 'partwt',
        fieldsToShow: [],
        narration:
          'Multiply each facility MV by participation_pct, then SUM per counterparty: Apex = $120M\u00d7100% + $65M\u00d7100% + $50M\u00d760% = $215,000,000. No double-counting \u2014 Facility E is split between two counterparties.',
        sampleResult: 'Apex: $215M, TechForge: $85M',
      },
    ],
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    description: 'SUM of collateral MV for a trading desk',
    tables: ['cs', 'fm', 'ebt', 'sumagg'],
    steps: [
      {
        kind: 'source',
        highlightTable: 'cs',
        fieldsToShow: ['facility_id', 'current_valuation_usd'],
        narration:
          'Starting from collateral snapshots. The desk-level view groups facility totals by which trading desk manages them.',
      },
      {
        kind: 'aggregate',
        highlightTable: 'sumagg',
        arrowFrom: 'cs',
        arrowTo: 'sumagg',
        fieldsToShow: [],
        narration:
          'Compute per-facility collateral MV first \u2014 the foundation for all organizational rollups.',
        sampleResult: 'Per facility MVs computed',
      },
      {
        kind: 'join',
        highlightTable: 'fm',
        arrowFrom: 'cs',
        arrowTo: 'fm',
        joinKey: 'facility_id',
        fieldsToShow: ['facility_id', 'lob_segment_id'],
        narration:
          'The facility_master table has a lob_segment_id field \u2014 the link to the bank\'s organizational hierarchy.',
      },
      {
        kind: 'join',
        highlightTable: 'ebt',
        arrowFrom: 'fm',
        arrowTo: 'ebt',
        joinKey: 'lob_segment_id = managed_segment_id',
        fieldsToShow: ['managed_segment_id', 'lob_l3_name'],
        narration:
          'Follow lob_segment_id into the business taxonomy. Segment 301 = "CRE Lending Desk." Every facility with this segment belongs to CRE Lending.',
      },
      {
        kind: 'aggregate',
        highlightTable: 'sumagg',
        arrowFrom: 'ebt',
        arrowTo: 'sumagg',
        fieldsToShow: [],
        narration:
          'Group facilities by desk, then SUM their collateral MV: $120M + $65M + $50M = $235,000,000 for CRE Lending. No participation weighting \u2014 desk rollup uses full facility values.',
        sampleResult: 'Desk SUM = $235,000,000',
      },
    ],
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    description: 'SUM of collateral MV for a portfolio (group of desks)',
    tables: ['cs', 'fm', 'ebt', 'sumagg'],
    steps: [
      {
        kind: 'source',
        highlightTable: 'cs',
        fieldsToShow: ['facility_id', 'current_valuation_usd'],
        narration:
          'For portfolio-level Collateral MV, we need to aggregate across all desks that roll up to the same portfolio.',
      },
      {
        kind: 'aggregate',
        highlightTable: 'sumagg',
        arrowFrom: 'cs',
        arrowTo: 'sumagg',
        fieldsToShow: [],
        narration:
          'Compute per-facility collateral MV first.',
        sampleResult: 'Per facility MVs computed',
      },
      {
        kind: 'join',
        highlightTable: 'fm',
        arrowFrom: 'cs',
        arrowTo: 'fm',
        joinKey: 'facility_id',
        fieldsToShow: ['facility_id', 'lob_segment_id'],
        narration:
          'Get the lob_segment_id from facility_master \u2014 same entry point into the org tree.',
      },
      {
        kind: 'join',
        highlightTable: 'ebt',
        arrowFrom: 'fm',
        arrowTo: 'ebt',
        joinKey: 'lob_segment_id = managed_segment_id',
        fieldsToShow: ['managed_segment_id', 'parent_segment_id', 'lob_l3_name'],
        narration:
          'Enter the taxonomy at the desk (leaf) level. But we need the PARENT \u2014 the portfolio this desk belongs to.',
      },
      {
        kind: 'join',
        highlightTable: 'ebt',
        arrowFrom: 'ebt',
        arrowTo: 'ebt',
        joinKey: 'parent_segment_id = managed_segment_id (self-join)',
        fieldsToShow: ['managed_segment_id', 'lob_l2_name'],
        narration:
          'Self-join: take the desk\'s parent_segment_id and look it up. This gives us the L2 portfolio: "Commercial Real Estate." Multiple desks share this parent.',
      },
      {
        kind: 'aggregate',
        highlightTable: 'sumagg',
        arrowFrom: 'ebt',
        arrowTo: 'sumagg',
        fieldsToShow: [],
        narration:
          'Group facilities by portfolio, then SUM: $300,000,000 total collateral MV across the entire portfolio.',
        sampleResult: 'Portfolio SUM = $300,000,000',
      },
    ],
  },
  {
    key: 'lob',
    label: 'Business Segment',
    icon: PieChart,
    description: 'SUM of collateral MV at the division level',
    tables: ['cs', 'fm', 'ebt', 'sumagg'],
    steps: [
      {
        kind: 'source',
        highlightTable: 'cs',
        fieldsToShow: ['facility_id', 'current_valuation_usd'],
        narration:
          'For the highest rollup \u2014 Business Segment \u2014 we aggregate across the entire division.',
      },
      {
        kind: 'aggregate',
        highlightTable: 'sumagg',
        arrowFrom: 'cs',
        arrowTo: 'sumagg',
        fieldsToShow: [],
        narration:
          'Compute per-facility collateral MV \u2014 always the starting point.',
        sampleResult: 'Per facility MVs computed',
      },
      {
        kind: 'join',
        highlightTable: 'fm',
        arrowFrom: 'cs',
        arrowTo: 'fm',
        joinKey: 'facility_id',
        fieldsToShow: ['facility_id', 'lob_segment_id'],
        narration:
          'Get the lob_segment_id from facility_master.',
      },
      {
        kind: 'join',
        highlightTable: 'ebt',
        arrowFrom: 'fm',
        arrowTo: 'ebt',
        joinKey: 'lob_segment_id = managed_segment_id',
        fieldsToShow: ['managed_segment_id', 'parent_segment_id', 'lob_l3_name'],
        narration:
          'Enter the taxonomy at the desk. Now walk ALL the way up to the root.',
      },
      {
        kind: 'join',
        highlightTable: 'ebt',
        arrowFrom: 'ebt',
        arrowTo: 'ebt',
        joinKey: 'recursive parent_segment_id until parent IS NULL',
        fieldsToShow: ['managed_segment_id', 'parent_segment_id', 'lob_l1_name'],
        narration:
          'RECURSIVE self-join: Desk (301) \u2192 Portfolio (30) \u2192 Department (3, root). The root node is the "Lending Division." Like climbing a family tree to the great-grandparent.',
      },
      {
        kind: 'aggregate',
        highlightTable: 'sumagg',
        arrowFrom: 'ebt',
        arrowTo: 'sumagg',
        fieldsToShow: [],
        narration:
          'SUM all facility collateral MV in the division: $300,000,000 \u2014 the board-level view of total collateral coverage for the Lending Division.',
        sampleResult: 'LoB SUM = $300,000,000',
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYOUT: compute card positions for the visual diagram
 * ═══════════════════════════════════════════════════════════════════════════ */

const CARD_W = 176;
const CARD_GAP = 24;
const CARD_H_BASE = 52;
const FIELD_H = 20;
const ROW_HEIGHT = 172;
const SVG_PAD = 16;
const NAME_MAX_CHARS = 12;
const VALUE_MAX_CHARS = 12;

const PLAYBACK_BASE_MS = 5000;
const SPEED_OPTIONS = [
  { value: 0.5, label: '0.5\u00d7' },
  { value: 1, label: '1\u00d7' },
  { value: 1.5, label: '1.5\u00d7' },
] as const;

function getCardPositions(tableIds: string[]): Record<string, { x: number; y: number; h: number }> {
  const positions: Record<string, { x: number; y: number; h: number }> = {};
  let xCursor = SVG_PAD;

  for (const tid of tableIds) {
    const t = TABLES[tid];
    if (!t) continue;
    const fieldCount = t.layer === 'CALC' ? 1 : Math.min(t.fields.length, 4);
    const h = CARD_H_BASE + fieldCount * FIELD_H;
    const y = t.layer === 'L1' ? ROW_HEIGHT : SVG_PAD;
    positions[tid] = { x: xCursor, y, h };
    xCursor += CARD_W + CARD_GAP;
  }
  return positions;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SUB-COMPONENTS
 * ═══════════════════════════════════════════════════════════════════════════ */

const KIND_COLORS: Record<StepKind, string> = {
  source: '#14b8a6',
  join: '#3b82f6',
  aggregate: '#a855f7',
  result: '#10b981',
};

function TableCard({
  tableDef,
  isActive,
  isVisited,
  fieldsToShow,
  sampleResult,
  x,
  y,
  w,
  h,
}: {
  tableDef: TableDef;
  isActive: boolean;
  isVisited: boolean;
  fieldsToShow: string[];
  sampleResult?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const isCalc = tableDef.layer === 'CALC';
  const glowColor = isCalc ? '#10b981' : tableDef.layer === 'L1' ? '#3b82f6' : '#14b8a6';

  return (
    <g style={{
      opacity: isActive ? 1 : isVisited ? 0.7 : 0.25,
      transition: 'opacity 0.5s ease',
      ...(isActive ? { animation: 'cmv-ttd-fadeIn 0.4s ease-out' } : {}),
    }}>
      {isActive && (
        <>
          <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={16} fill="none" stroke={glowColor} strokeWidth={1} opacity={0.2} style={{ filter: 'blur(6px)' }} />
          <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={13} fill="none" stroke={glowColor} strokeWidth={2} opacity={0.5} style={{ animation: 'cmv-ttd-glow 2s ease-in-out infinite' }} />
        </>
      )}
      <rect
        x={x} y={y} width={w} height={h} rx={10}
        fill={isActive ? (isCalc ? 'rgba(16,185,129,0.12)' : tableDef.layer === 'L1' ? 'rgba(59,130,246,0.12)' : 'rgba(20,184,166,0.12)') : 'rgba(255,255,255,0.02)'}
        stroke={isActive ? glowColor : '#374151'}
        strokeWidth={isActive ? 2 : 1}
        style={{ transition: 'all 0.5s ease' }}
      />
      {/* Layer badge */}
      <rect x={x + 6} y={y + 6} width={24} height={16} rx={4} fill={isCalc ? 'rgba(16,185,129,0.2)' : tableDef.layer === 'L1' ? 'rgba(59,130,246,0.2)' : 'rgba(20,184,166,0.2)'} />
      <text x={x + 18} y={y + 18} textAnchor="middle" fill={isCalc ? '#6ee7b7' : tableDef.layer === 'L1' ? '#93c5fd' : '#5eead4'} fontSize={9} fontWeight={700}>
        {isCalc ? 'FX' : tableDef.layer}
      </text>
      {/* Table name */}
      <text x={x + 36} y={y + 19} fill={isActive ? '#f3f4f6' : '#9ca3af'} fontSize={11} fontWeight={600}>
        {tableDef.shortName}
      </text>
      {/* Full name */}
      <text x={x + 8} y={y + 40} fill="#6b7280" fontSize={8} fontFamily="monospace">
        {isCalc ? tableDef.name : tableDef.name.length > 30 ? tableDef.name.slice(0, 28) + '\u2026' : tableDef.name}
      </text>

      {/* Fields or result */}
      {isCalc && sampleResult && isActive ? (
        <text x={x + w / 2} y={y + 58} textAnchor="middle" fill="#6ee7b7" fontSize={10} fontWeight={700} fontFamily="monospace">
          {sampleResult.length > 28 ? sampleResult.slice(0, 26) + '\u2026' : sampleResult}
        </text>
      ) : (
        tableDef.fields.slice(0, 4).map((field, i) => {
          const isHighlighted = isActive && fieldsToShow.includes(field.name);
          const fy = y + CARD_H_BASE + i * FIELD_H;
          const nameDisplay = field.name.length > NAME_MAX_CHARS ? field.name.slice(0, NAME_MAX_CHARS - 1) + '\u2026' : field.name;
          const valueDisplay = field.sampleValue.length > VALUE_MAX_CHARS ? field.sampleValue.slice(0, VALUE_MAX_CHARS - 1) + '\u2026' : field.sampleValue;
          return (
            <g key={field.name}>
              {isHighlighted && (
                <rect x={x + 4} y={fy - 2} width={w - 8} height={FIELD_H - 2} rx={4} fill="rgba(20,184,166,0.1)" />
              )}
              <text x={x + 12} y={fy + 13} fill={isHighlighted ? '#5eead4' : '#6b7280'} fontSize={9} fontFamily="monospace" fontWeight={isHighlighted ? 600 : 400}>
                <title>{field.name}</title>
                {nameDisplay}
              </text>
              {isHighlighted && (
                <text x={x + w - 12} y={fy + 13} textAnchor="end" fill="#d1d5db" fontSize={9} fontFamily="monospace" fontWeight={600}>
                  <title>{field.sampleValue}</title>
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

const ARROW_DRAW_LENGTH = 500;
const LABEL_Y_IN_GAP = 160;

function AnimatedArrow({
  fromPos, toPos, fromW, fromH, toH, isActive, isVisited, joinKey, color,
}: {
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  fromW: number;
  fromH: number;
  toH: number;
  isActive: boolean;
  isVisited: boolean;
  joinKey?: string;
  color: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(ARROW_DRAW_LENGTH);

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
    labelY = sameRow ? LABEL_Y_IN_GAP : (y1 + y2) / 2 - 8;
  }

  const drawStyle: React.CSSProperties = isActive
    ? { strokeDasharray: pathLength, strokeDashoffset: 0, transition: 'stroke-dashoffset 0.8s ease-out, opacity 0.3s' }
    : isVisited
      ? { strokeDasharray: 'none', transition: 'opacity 0.5s' }
      : { strokeDasharray: pathLength, strokeDashoffset: pathLength, transition: 'stroke-dashoffset 0.8s ease-out, opacity 0.3s' };

  return (
    <g style={{ opacity: isActive ? 1 : isVisited ? 0.4 : 0, transition: 'opacity 0.5s' }}>
      {isActive && (
        <path d={pathD} fill="none" stroke={color} strokeWidth={6} opacity={0.15} style={{ filter: 'blur(4px)' }} />
      )}
      <path ref={pathRef} d={pathD} fill="none" stroke={color} strokeWidth={isActive ? 2.5 : 1.5} markerEnd="url(#cmv-arrow-active)" style={drawStyle} />
      {isActive && joinKey && (
        <g style={{ animation: 'cmv-ttd-fadeIn 0.6s ease-out 0.4s both' }}>
          <rect x={labelX - 4} y={labelY - 10} width={Math.min(joinKey.length * 5 + 16, 200)} height={16} rx={4} fill="rgba(0,0,0,0.85)" stroke={color} strokeWidth={0.5} opacity={0.9} />
          <text x={labelX + 2} y={labelY + 1} fill={color} fontSize={8} fontFamily="monospace" fontWeight={600}>
            ON {joinKey.length > 28 ? joinKey.slice(0, 26) + '\u2026' : joinKey}
          </text>
        </g>
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════ */

export default function CollMvTableTraversalDemo() {
  const [selectedDim, setSelectedDim] = useState<string>('facility');
  const [activeStep, setActiveStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.5);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const demo = DIMENSION_DEMOS.find((d) => d.key === selectedDim)!;
  const positions = getCardPositions(demo.tables);

  const totalSteps = demo.steps.length;
  const step = activeStep >= 0 ? demo.steps[activeStep] : null;
  const stepDelayMs = Math.round(PLAYBACK_BASE_MS / playbackSpeed);

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
        @keyframes cmv-ttd-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.2; }
        }
        @keyframes cmv-ttd-fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cmv-ttd-slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-teal-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-teal-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Table Traversal Demo</h3>
          <span className="text-[10px] text-gray-600">Pick a dimension, then watch how the tables connect</span>
        </div>
      </div>

      {/* Dimension picker */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2 flex-wrap">
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mr-1">Dimension:</span>
        {DIMENSION_DEMOS.map((d) => {
          const Icon = d.icon;
          const active = selectedDim === d.key;
          return (
            <button
              key={d.key}
              onClick={() => setSelectedDim(d.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                active
                  ? 'bg-teal-500/15 border border-teal-500/40 text-teal-300'
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
        {/* Progress bar */}
        <div className="h-0.5 bg-gray-800 rounded-full mb-3">
          <div
            className="h-full bg-gradient-to-r from-teal-500 via-blue-500 to-teal-500 transition-all duration-700 ease-out rounded-full"
            style={{ width: activeStep >= 0 ? `${((activeStep + 1) / totalSteps) * 100}%` : '0%' }}
          />
        </div>

        {activeStep === -1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-400">
              Press <strong className="text-white">Play</strong> to watch how the <strong className="text-teal-300">{demo.label}</strong> dimension
              traverses {demo.tables.filter((t) => TABLES[t]?.layer !== 'CALC').length} database tables step by step.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Speed:</span>
              {SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPlaybackSpeed(opt.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    playbackSpeed === opt.value
                      ? 'bg-teal-500/25 border border-teal-500/40 text-teal-300'
                      : 'bg-white/[0.04] border border-gray-800 text-gray-500 hover:text-gray-300'
                  }`}
                  title={`Playback at ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={play}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 font-bold text-sm hover:bg-teal-500/25 transition-colors"
              >
                <Play className="w-4 h-4" /> Start Demo
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div key={`narration-${selectedDim}-${activeStep}`} className="flex-1 min-w-0 max-w-2xl" style={{ animation: 'cmv-ttd-slideUp 0.4s ease-out' }}>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
                  Step {activeStep + 1} of {totalSteps}
                </span>
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    color: KIND_COLORS[step!.kind],
                    borderColor: KIND_COLORS[step!.kind] + '40',
                    backgroundColor: KIND_COLORS[step!.kind] + '15',
                  }}
                >
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
                  <button onClick={play} className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 hover:bg-teal-500/25 transition-colors" title="Play">
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
                  <button
                    key={opt.value}
                    onClick={() => setPlaybackSpeed(opt.value)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                      playbackSpeed === opt.value
                        ? 'bg-teal-500/25 border border-teal-500/40 text-teal-300'
                        : 'bg-white/[0.04] border border-gray-800 text-gray-500 hover:text-gray-300'
                    }`}
                    title={`${opt.label} playback`}
                  >
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
              const fromName = s.arrowFrom && TABLES[s.arrowFrom] ? TABLES[s.arrowFrom].shortName : s.arrowFrom ?? '?';
              const toName = s.arrowTo && TABLES[s.arrowTo] ? TABLES[s.arrowTo].shortName : s.arrowTo ?? '?';
              const isCurrent = step && demo.steps[activeStep] === s;
              return (
                <div
                  key={i}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono ${
                    isCurrent
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                      : 'bg-white/[0.03] border-gray-800 text-gray-400'
                  }`}
                >
                  <span className="text-gray-500">{fromName}</span>
                  <span className="text-gray-600">{'\u2192'}</span>
                  <span>{toName}</span>
                  <span className="text-emerald-400/90">ON {s.joinKey}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SVG Diagram */}
      <div className="px-2 pt-6 pb-3 overflow-x-auto overflow-y-hidden">
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="block mx-auto"
          style={{ minWidth: '100%', maxWidth: Math.min(svgW, 900) }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker id="cmv-arrow-active" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
              <polygon points="0 0, 8 4, 0 8" fill="#a855f7" />
            </marker>
          </defs>

          {/* Row labels */}
          <text x={8} y={SVG_PAD + 10} fill="#4b5563" fontSize={8} fontWeight={700} fontFamily="monospace">L2 Snapshots</text>
          <text x={8} y={ROW_HEIGHT + 10} fill="#4b5563" fontSize={8} fontWeight={700} fontFamily="monospace">L1 Reference</text>

          {/* Arrows */}
          {demo.steps.map((s, i) => {
            if (!s.arrowFrom || !s.arrowTo) return null;
            const from = positions[s.arrowFrom];
            const to = positions[s.arrowTo];
            if (!from || !to) return null;
            const arrowKey = `${s.arrowFrom}->${s.arrowTo}`;
            const isArrowActive = i === activeStep;
            const isArrowVisited = visitedArrows.has(arrowKey) && i < activeStep;
            return (
              <AnimatedArrow
                key={`arrow-${selectedDim}-${i}`}
                fromPos={from}
                toPos={to}
                fromW={CARD_W}
                fromH={from.h}
                toH={to.h}
                isActive={isArrowActive}
                isVisited={isArrowVisited}
                joinKey={s.joinKey}
                color={KIND_COLORS[s.kind]}
              />
            );
          })}

          {/* Table cards */}
          {demo.tables.map((tid) => {
            const t = TABLES[tid];
            const pos = positions[tid];
            if (!t || !pos) return null;
            const isTableActive = step?.highlightTable === tid;
            const isTableVisited = visitedTables.has(tid);
            const fieldsToShow = isTableActive ? step!.fieldsToShow : [];
            const sampleResult = isTableActive ? step!.sampleResult : undefined;
            return (
              <TableCard
                key={`card-${selectedDim}-${tid}`}
                tableDef={t}
                isActive={isTableActive}
                isVisited={isTableVisited}
                fieldsToShow={fieldsToShow}
                sampleResult={sampleResult}
                x={pos.x}
                y={pos.y}
                w={CARD_W}
                h={pos.h}
              />
            );
          })}
        </svg>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-4 text-[9px] text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500" /> L2 Snapshot</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> L1 Reference</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Calculation</span>
          <span className="ml-auto font-medium">Collateral MV = SUM(current_valuation_usd)</span>
        </div>
      </div>
    </div>
  );
}
