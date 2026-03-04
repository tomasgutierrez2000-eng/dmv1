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
  ffs: {
    id: 'ffs',
    name: 'facility_financial_snapshot',
    layer: 'L2',
    shortName: 'Financial Snapshot',
    fields: [
      { name: 'facility_id', sampleValue: 'F-101' },
      { name: 'noi', sampleValue: '$1,585,000' },
      { name: 'ebitda', sampleValue: '$5,640,000' },
      { name: 'debt_service', sampleValue: '$1,200,000' },
      { name: 'as_of_date', sampleValue: '2024-12-31' },
    ],
  },
  fes: {
    id: 'fes',
    name: 'facility_exposure_snapshot',
    layer: 'L2',
    shortName: 'Exposure Snapshot',
    fields: [
      { name: 'facility_id', sampleValue: 'F-101' },
      { name: 'gross_exposure_usd', sampleValue: '$50,000,000' },
      { name: 'committed_amount', sampleValue: '$50,000,000' },
      { name: 'as_of_date', sampleValue: '2024-12-31' },
    ],
  },
  fm: {
    id: 'fm',
    name: 'facility_master',
    layer: 'L1',
    shortName: 'Facility Master',
    fields: [
      { name: 'facility_id', sampleValue: 'F-101' },
      { name: 'counterparty_id', sampleValue: 'CP-01' },
      { name: 'lob_segment_id', sampleValue: 'SEG-L3-CRE' },
      { name: 'product_type', sampleValue: 'CRE Term Loan' },
    ],
  },
  cp: {
    id: 'cp',
    name: 'counterparty',
    layer: 'L1',
    shortName: 'Counterparty',
    fields: [
      { name: 'counterparty_id', sampleValue: 'CP-02' },
      { name: 'counterparty_name', sampleValue: 'Meridian Group' },
      { name: 'risk_rating', sampleValue: 'BBB' },
    ],
  },
  ebt: {
    id: 'ebt',
    name: 'enterprise_business_taxonomy',
    layer: 'L1',
    shortName: 'Business Taxonomy',
    fields: [
      { name: 'managed_segment_id', sampleValue: 'SEG-L3-CRE' },
      { name: 'parent_segment_id', sampleValue: 'SEG-L2-CRE' },
      { name: 'lob_l3_name', sampleValue: 'CRE Lending' },
      { name: 'lob_l2_name', sampleValue: 'Commercial RE' },
      { name: 'lob_l1_name', sampleValue: 'Commercial Banking' },
    ],
  },
  calc: {
    id: 'calc',
    name: 'DSCR Calculation',
    layer: 'CALC',
    shortName: 'Calculate DSCR',
    fields: [],
  },
  wagg: {
    id: 'wagg',
    name: 'Weighted Average',
    layer: 'CALC',
    shortName: 'Aggregate',
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
    description: 'Direct DSCR for a single facility — NOI (or EBITDA) divided by debt service',
    tables: ['ffs', 'fes', 'fm', 'calc'],
    steps: [
      {
        kind: 'source',
        highlightTable: 'ffs',
        fieldsToShow: ['facility_id', 'noi', 'debt_service'],
        narration:
          'We start at the financial snapshot table. This is a periodic snapshot of each facility\'s income and obligations. For facility F-101, the net operating income (NOI) is $1,585K and annual debt service is $1,200K.',
      },
      {
        kind: 'join',
        highlightTable: 'fes',
        arrowFrom: 'ffs',
        arrowTo: 'fes',
        joinKey: 'facility_id + as_of_date',
        fieldsToShow: ['facility_id', 'gross_exposure_usd'],
        narration:
          'Next, we join the exposure snapshot to get the facility\'s gross exposure. While exposure isn\'t part of the DSCR formula itself, it serves as the weighting basis when we aggregate DSCR to higher levels. F-101 has $50M gross exposure.',
      },
      {
        kind: 'join',
        highlightTable: 'fm',
        arrowFrom: 'ffs',
        arrowTo: 'fm',
        joinKey: 'facility_id',
        fieldsToShow: ['facility_id', 'product_type'],
        narration:
          'We look up the facility\'s master record to determine its product type. This is critical for DSCR: CRE (Commercial Real Estate) facilities use NOI as the cashflow numerator, while C&I (Commercial & Industrial) facilities use EBITDA. F-101 is a "CRE Term Loan," so we use NOI.',
      },
      {
        kind: 'result',
        highlightTable: 'calc',
        arrowFrom: 'ffs',
        arrowTo: 'calc',
        fieldsToShow: [],
        narration:
          'Now we compute DSCR: NOI ÷ Debt Service = $1,585K / $1,200K = 1.32x. A DSCR above 1.0x means the facility generates enough cash to cover its debt obligations. At 1.32x, there\'s a 32% cushion — healthy but not exceptional.',
        sampleResult: '$1,585K / $1,200K = 1.32x',
      },
    ],
  },
  {
    key: 'counterparty',
    label: 'Counterparty',
    icon: Users,
    description: 'Exposure-weighted average DSCR across a borrower\'s facilities',
    tables: ['ffs', 'fes', 'fm', 'cp', 'calc', 'wagg'],
    steps: [
      {
        kind: 'source',
        highlightTable: 'ffs',
        fieldsToShow: ['facility_id', 'noi', 'ebitda', 'debt_service'],
        narration:
          'We start at the financial snapshot, but this time we pull ALL facilities belonging to one borrower. Meridian Group (CP-02) has three facilities with different cashflow sources: one CRE facility uses NOI ($890K), while two C&I facilities use EBITDA ($5,640K and $3,200K).',
      },
      {
        kind: 'join',
        highlightTable: 'fes',
        arrowFrom: 'ffs',
        arrowTo: 'fes',
        joinKey: 'facility_id + as_of_date',
        fieldsToShow: ['facility_id', 'gross_exposure_usd'],
        narration:
          'For each facility, we join the exposure snapshot to get gross_exposure_usd. This is the weighting basis for the aggregation — larger exposures carry more weight in the average. Meridian\'s exposures are $20M, $80M, and $15M.',
      },
      {
        kind: 'result',
        highlightTable: 'calc',
        arrowFrom: 'ffs',
        arrowTo: 'calc',
        fieldsToShow: [],
        narration:
          'First, we calculate individual DSCR for each facility. The CRE facility (F-103) uses NOI: $890K/$950K = 0.94x — below 1.0x, a stress signal. The C&I facilities use EBITDA: $5,640K/$1,380K = 4.09x and $3,200K/$1,050K = 3.05x.',
        sampleResult: 'Per facility: 0.94x, 4.09x, 3.05x',
      },
      {
        kind: 'join',
        highlightTable: 'fm',
        arrowFrom: 'ffs',
        arrowTo: 'fm',
        joinKey: 'facility_id',
        fieldsToShow: ['facility_id', 'counterparty_id'],
        narration:
          'Now we group these facilities by borrower. The facility_master table has a counterparty_id field — all three facilities share counterparty_id = CP-02, meaning they belong to Meridian Group.',
      },
      {
        kind: 'join',
        highlightTable: 'cp',
        arrowFrom: 'fm',
        arrowTo: 'cp',
        joinKey: 'counterparty_id',
        fieldsToShow: ['counterparty_id', 'counterparty_name'],
        narration:
          'We follow counterparty_id to the counterparty table to resolve the borrower\'s identity: "Meridian Group." All facilities sharing CP-02 belong to this single borrower.',
      },
      {
        kind: 'aggregate',
        highlightTable: 'wagg',
        arrowFrom: 'cp',
        arrowTo: 'wagg',
        fieldsToShow: [],
        narration:
          'Finally, we compute an exposure-weighted average: Σ(DSCR × exposure) / Σ(exposure). The stressed CRE facility (0.94x, $20M) is diluted by the strong C&I facilities (4.09x at $80M; 3.05x at $15M). The $80M facility dominates the average. Result: Counterparty DSCR = 3.41x.',
        sampleResult: 'Exposure-Wtd DSCR = 3.41x',
      },
    ],
  },
  {
    key: 'desk',
    label: 'Desk',
    icon: Briefcase,
    description: 'Exposure-weighted average for a trading desk',
    tables: ['ffs', 'fes', 'fm', 'ebt', 'calc', 'wagg'],
    steps: [
      {
        kind: 'source',
        highlightTable: 'ffs',
        fieldsToShow: ['facility_id', 'noi', 'debt_service'],
        narration:
          'Same starting point — the financial snapshot provides cashflow data (NOI or EBITDA) and debt service for every facility. For the CRE Lending desk, we focus on CRE facilities that use NOI as the cashflow measure.',
      },
      {
        kind: 'join',
        highlightTable: 'fes',
        arrowFrom: 'ffs',
        arrowTo: 'fes',
        joinKey: 'facility_id + as_of_date',
        fieldsToShow: ['facility_id', 'gross_exposure_usd'],
        narration:
          'Join the exposure snapshot to get gross_exposure_usd as the weighting basis. Each facility\'s DSCR will be weighted proportionally to its exposure when we aggregate.',
      },
      {
        kind: 'result',
        highlightTable: 'calc',
        arrowFrom: 'ffs',
        arrowTo: 'calc',
        fieldsToShow: [],
        narration:
          'Compute per-facility DSCR first: F-101 = 1.32x ($50M), F-102 = 1.50x ($30M), F-103 = 0.94x ($20M). Every aggregation level above facility depends on having these individual ratios computed.',
        sampleResult: 'Per facility DSCRs computed',
      },
      {
        kind: 'join',
        highlightTable: 'fm',
        arrowFrom: 'ffs',
        arrowTo: 'fm',
        joinKey: 'facility_id',
        fieldsToShow: ['facility_id', 'lob_segment_id'],
        narration:
          'The key step: facility_master has a lob_segment_id field. This foreign key connects the loan to the bank\'s organizational hierarchy. For CRE facilities, it points to segment "SEG-L3-CRE" — the CRE Lending desk.',
      },
      {
        kind: 'join',
        highlightTable: 'ebt',
        arrowFrom: 'fm',
        arrowTo: 'ebt',
        joinKey: 'lob_segment_id = managed_segment_id',
        fieldsToShow: ['managed_segment_id', 'lob_l3_name'],
        narration:
          'We follow lob_segment_id into the business taxonomy table. The leaf node (L3) IS the desk. SEG-L3-CRE maps to "CRE Lending." All facilities with this segment belong to this desk.',
      },
      {
        kind: 'aggregate',
        highlightTable: 'wagg',
        arrowFrom: 'ebt',
        arrowTo: 'wagg',
        fieldsToShow: [],
        narration:
          'Group all facilities by desk, then compute exposure-weighted average: Σ(DSCR × exposure) / Σ(exposure). Note: unlike LTV which re-aggregates numerator/denominator, DSCR uses the weighted average of pre-computed facility-level ratios. CRE Desk DSCR = 1.30x.',
        sampleResult: 'Desk Wtd DSCR = 1.30x',
      },
    ],
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: FolderTree,
    description: 'Exposure-weighted average for a portfolio (group of desks)',
    tables: ['ffs', 'fes', 'fm', 'ebt', 'calc', 'wagg'],
    steps: [
      {
        kind: 'source',
        highlightTable: 'ffs',
        fieldsToShow: ['facility_id', 'noi', 'ebitda', 'debt_service'],
        narration:
          'Starting from financial snapshot data again. For portfolio-level DSCR, we need to aggregate across all desks that roll up to the same portfolio. This includes both CRE (NOI-based) and C&I (EBITDA-based) desks.',
      },
      {
        kind: 'join',
        highlightTable: 'fes',
        arrowFrom: 'ffs',
        arrowTo: 'fes',
        joinKey: 'facility_id + as_of_date',
        fieldsToShow: ['facility_id', 'gross_exposure_usd'],
        narration:
          'Exposure lookup — same join as every other level. Each facility\'s gross_exposure_usd becomes its weight in the aggregation.',
      },
      {
        kind: 'result',
        highlightTable: 'calc',
        arrowFrom: 'ffs',
        arrowTo: 'calc',
        fieldsToShow: [],
        narration:
          'Compute per-facility DSCR ratios first. The dual-cashflow logic applies: product_type determines whether to use NOI or EBITDA. This is always the prerequisite step before any aggregation.',
        sampleResult: 'Per facility DSCRs computed',
      },
      {
        kind: 'join',
        highlightTable: 'fm',
        arrowFrom: 'ffs',
        arrowTo: 'fm',
        joinKey: 'facility_id',
        fieldsToShow: ['facility_id', 'lob_segment_id'],
        narration:
          'Get the lob_segment_id from facility_master. This is the same FK we used for the desk level — it points to the leaf of the organizational tree.',
      },
      {
        kind: 'join',
        highlightTable: 'ebt',
        arrowFrom: 'fm',
        arrowTo: 'ebt',
        joinKey: 'lob_segment_id = managed_segment_id',
        fieldsToShow: ['managed_segment_id', 'parent_segment_id', 'lob_l3_name'],
        narration:
          'Enter the taxonomy at the leaf node (desk level). But this time we don\'t stop here — we need the PARENT of this desk, which represents the portfolio it belongs to.',
      },
      {
        kind: 'join',
        highlightTable: 'ebt',
        arrowFrom: 'ebt',
        arrowTo: 'ebt',
        joinKey: 'parent_segment_id = managed_segment_id (self-join)',
        fieldsToShow: ['managed_segment_id', 'lob_l2_name'],
        narration:
          'Self-join on the taxonomy table: take the desk\'s parent_segment_id (SEG-L2-CRE) and look it up as managed_segment_id. This gives us the L2 portfolio: "Commercial Real Estate." Both CRE and Corporate desks may share this parent.',
      },
      {
        kind: 'aggregate',
        highlightTable: 'wagg',
        arrowFrom: 'ebt',
        arrowTo: 'wagg',
        fieldsToShow: [],
        narration:
          'Group all facilities whose taxonomy leaf traces up to the same L2 portfolio, then compute exposure-weighted average DSCR. The blended result combines CRE facilities (NOI-based, typically 1.0-2.0x) with C&I facilities (EBITDA-based, often 2.0-5.0x). Portfolio DSCR = 1.30x.',
        sampleResult: 'Portfolio Wtd DSCR = 1.30x',
      },
    ],
  },
  {
    key: 'lob',
    label: 'Business Segment',
    icon: PieChart,
    description: 'Exposure-weighted average at the department level',
    tables: ['ffs', 'fes', 'fm', 'ebt', 'calc', 'wagg'],
    steps: [
      {
        kind: 'source',
        highlightTable: 'ffs',
        fieldsToShow: ['facility_id', 'noi', 'ebitda', 'debt_service'],
        narration:
          'For the highest rollup — Business Segment (department) — we start from all financial data across the entire division. This spans every product type: CRE term loans (NOI), C&I revolvers (EBITDA), and everything in between.',
      },
      {
        kind: 'join',
        highlightTable: 'fes',
        arrowFrom: 'ffs',
        arrowTo: 'fes',
        joinKey: 'facility_id + as_of_date',
        fieldsToShow: ['facility_id', 'gross_exposure_usd'],
        narration:
          'Exposure values are looked up per facility, as always. The aggregation will span all five demo facilities: $50M + $30M + $20M + $80M + $15M = $195M total exposure.',
      },
      {
        kind: 'result',
        highlightTable: 'calc',
        arrowFrom: 'ffs',
        arrowTo: 'calc',
        fieldsToShow: [],
        narration:
          'Compute per-facility DSCR ratios — the foundation for all aggregation. Five facilities: 1.32x, 1.50x, 0.94x, 4.09x, and 3.05x, with exposures of $50M, $30M, $20M, $80M, and $15M respectively.',
        sampleResult: 'Per facility DSCRs computed',
      },
      {
        kind: 'join',
        highlightTable: 'fm',
        arrowFrom: 'ffs',
        arrowTo: 'fm',
        joinKey: 'facility_id',
        fieldsToShow: ['facility_id', 'lob_segment_id'],
        narration:
          'Retrieve the lob_segment_id from facility_master — the entry point into the organizational hierarchy. Facilities map to different segments: CRE → SEG-L3-CRE, C&I → SEG-L3-CORP.',
      },
      {
        kind: 'join',
        highlightTable: 'ebt',
        arrowFrom: 'fm',
        arrowTo: 'ebt',
        joinKey: 'lob_segment_id = managed_segment_id',
        fieldsToShow: ['managed_segment_id', 'parent_segment_id', 'lob_l3_name'],
        narration:
          'Enter the taxonomy at the leaf (desk). Now we need to walk ALL the way up to the ROOT of the tree — the department / business segment level.',
      },
      {
        kind: 'join',
        highlightTable: 'ebt',
        arrowFrom: 'ebt',
        arrowTo: 'ebt',
        joinKey: 'recursive parent_segment_id until parent IS NULL',
        fieldsToShow: ['managed_segment_id', 'parent_segment_id', 'lob_l1_name'],
        narration:
          'RECURSIVE self-join: follow parent_segment_id repeatedly. Desk (SEG-L3-CRE) → Portfolio (SEG-L2-CRE) → Department (root, where parent IS NULL). The root node is the Business Segment: "Commercial Banking." All five facilities ultimately trace here.',
      },
      {
        kind: 'aggregate',
        highlightTable: 'wagg',
        arrowFrom: 'ebt',
        arrowTo: 'wagg',
        fieldsToShow: [],
        narration:
          'Group ALL facilities whose taxonomy path traces to the same root segment. Exposure-weighted average DSCR blends the stressed CRE facility (0.94x) with strong C&I performers (4.09x). The $80M C&I term loan heavily influences the result. Business Segment DSCR = 2.58x.',
        sampleResult: 'Segment Wtd DSCR = 2.58x',
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
  { value: 0.5, label: '0.5×' },
  { value: 1, label: '1×' },
  { value: 1.5, label: '1.5×' },
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
  source: '#f59e0b',
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

  const glowColor = isCalc ? '#10b981' : tableDef.layer === 'L1' ? '#3b82f6' : '#f59e0b';

  return (
    <g style={{
      opacity: isActive ? 1 : isVisited ? 0.7 : 0.25,
      transition: 'opacity 0.5s ease',
      ...(isActive ? { animation: 'dscr-ttd-fadeIn 0.4s ease-out' } : {}),
    }}>
      {isActive && (
        <>
          <rect
            x={x - 6}
            y={y - 6}
            width={w + 12}
            height={h + 12}
            rx={16}
            fill="none"
            stroke={glowColor}
            strokeWidth={1}
            opacity={0.2}
            style={{ filter: 'blur(6px)' }}
          />
          <rect
            x={x - 3}
            y={y - 3}
            width={w + 6}
            height={h + 6}
            rx={13}
            fill="none"
            stroke={glowColor}
            strokeWidth={2}
            opacity={0.5}
            style={{ animation: 'dscr-ttd-glow 2s ease-in-out infinite' }}
          />
        </>
      )}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
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
        {tableDef.shortName}
      </text>
      {/* Full name */}
      <text x={x + 8} y={y + 40} fill="#6b7280" fontSize={8} fontFamily="monospace">
        {isCalc ? tableDef.name : tableDef.name.length > 30 ? tableDef.name.slice(0, 28) + '\u2026' : tableDef.name}
      </text>

      {/* Fields or result */}
      {isCalc && sampleResult && isActive ? (
        <text
          x={x + w / 2}
          y={y + 58}
          textAnchor="middle"
          fill="#6ee7b7"
          fontSize={10}
          fontWeight={700}
          fontFamily="monospace"
        >
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
                <rect x={x + 4} y={fy - 2} width={w - 8} height={FIELD_H - 2} rx={4} fill="rgba(245,158,11,0.1)" />
              )}
              <text x={x + 12} y={fy + 13} fill={isHighlighted ? '#fcd34d' : '#6b7280'} fontSize={9} fontFamily="monospace" fontWeight={isHighlighted ? 600 : 400}>
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
  fromPos,
  toPos,
  fromW,
  fromH,
  toH,
  isActive,
  isVisited,
  joinKey,
  color,
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
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
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
    ? {
        strokeDasharray: pathLength,
        strokeDashoffset: 0,
        transition: 'stroke-dashoffset 0.8s ease-out, opacity 0.3s',
      }
    : isVisited
      ? { strokeDasharray: 'none', transition: 'opacity 0.5s' }
      : {
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength,
          transition: 'stroke-dashoffset 0.8s ease-out, opacity 0.3s',
        };

  return (
    <g style={{ opacity: isActive ? 1 : isVisited ? 0.4 : 0, transition: 'opacity 0.5s' }}>
      {isActive && (
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={6}
          opacity={0.15}
          style={{ filter: `blur(4px)` }}
        />
      )}
      <path
        ref={pathRef}
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={isActive ? 2.5 : 1.5}
        markerEnd="url(#dscr-arrow-active)"
        style={drawStyle}
      />
      {isActive && joinKey && (
        <g style={{ animation: 'dscr-ttd-fadeIn 0.6s ease-out 0.4s both' }}>
          <rect
            x={labelX - 4}
            y={labelY - 10}
            width={Math.min(joinKey.length * 5 + 16, 200)}
            height={16}
            rx={4}
            fill="rgba(0,0,0,0.85)"
            stroke={color}
            strokeWidth={0.5}
            opacity={0.9}
          />
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

export default function DSCRTableTraversalDemo() {
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
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying && activeStep >= 0 && activeStep < totalSteps - 1) {
      timerRef.current = setTimeout(() => setActiveStep((s) => s + 1), stepDelayMs);
      return clearTimer;
    }
    if (activeStep >= totalSteps - 1) {
      setIsPlaying(false);
    }
  }, [isPlaying, activeStep, totalSteps, stepDelayMs, clearTimer]);

  useEffect(() => {
    setActiveStep(-1);
    setIsPlaying(false);
    clearTimer();
  }, [selectedDim, clearTimer]);

  const play = () => {
    if (activeStep >= totalSteps - 1) setActiveStep(0);
    else if (activeStep === -1) setActiveStep(0);
    setIsPlaying(true);
  };
  const pause = () => { setIsPlaying(false); clearTimer(); };
  const next = () => { pause(); setActiveStep((s) => Math.min(s + 1, totalSteps - 1)); };
  const prev = () => { pause(); setActiveStep((s) => Math.max(s - 1, 0)); };
  const reset = () => { pause(); setActiveStep(-1); };

  const svgW = demo.tables.length * (CARD_W + CARD_GAP) + SVG_PAD * 2;
  const svgH = ROW_HEIGHT + 120;

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <style>{`
        @keyframes dscr-ttd-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.2; }
        }
        @keyframes dscr-ttd-fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dscr-ttd-slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
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
        {DIMENSION_DEMOS.map((d) => {
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

      {/* Steps + controls ABOVE the flow */}
      <div className="px-5 py-4 border-b border-white/5 bg-black/20">
        {/* Progress bar */}
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
                      ? 'bg-purple-500/25 border border-purple-500/40 text-purple-300'
                      : 'bg-white/[0.04] border border-gray-800 text-gray-500 hover:text-gray-300'
                  }`}
                  title={`Playback at ${opt.label}`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={play}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold text-sm hover:bg-purple-500/25 transition-colors"
              >
                <Play className="w-4 h-4" /> Start Demo
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div key={`narration-${selectedDim}-${activeStep}`} className="flex-1 min-w-0 max-w-2xl" style={{ animation: 'dscr-ttd-slideUp 0.4s ease-out' }}>
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
                <button
                  onClick={prev}
                  disabled={activeStep <= 0}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous step"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                {isPlaying ? (
                  <button
                    onClick={pause}
                    className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 hover:bg-amber-500/25 transition-colors"
                    title="Pause"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={play}
                    className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 hover:bg-purple-500/25 transition-colors"
                    title="Play"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={next}
                  disabled={activeStep >= totalSteps - 1}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next step"
                >
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
                        ? 'bg-purple-500/25 border border-purple-500/40 text-purple-300'
                        : 'bg-white/[0.04] border border-gray-800 text-gray-500 hover:text-gray-300'
                    }`}
                    title={`${opt.label} playback`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={reset}
                className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                title="Reset"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Join conditions — single view, no scroll */}
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
                  <span className="text-gray-600">→</span>
                  <span>{toName}</span>
                  <span className="text-emerald-400/90">ON {s.joinKey}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SVG Diagram — compact, fit in single view */}
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
            <marker id="dscr-arrow-active" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
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
            const isActive = step?.highlightTable === tid;
            const isVisited = visitedTables.has(tid) && !isActive;
            const fieldsToShow = isActive && step ? step.fieldsToShow : [];
            const sampleResult = isActive && step ? step.sampleResult : undefined;

            return (
              <TableCard
                key={`${selectedDim}-${tid}`}
                tableDef={t}
                isActive={isActive}
                isVisited={isVisited}
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
    </div>
  );
}
