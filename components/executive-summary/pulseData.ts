import { STAGES } from '@/components/architecture/architectureData';
import type { ArchNode } from '@/components/architecture/architectureData';

/* ═══════════════════════════════════════════════════════════════════════════
 * Types
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface PulseAct {
  id: string;
  actNumber: number;
  headline: string;
  subtitle: string;
  accentColor: string;
  durationMs: number;
}

export type PulsePlayState = 'playing' | 'paused';

export interface PulseState {
  currentAct: number;
  playState: PulsePlayState;
  isComplete: boolean;
  showFullView: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Timing
 * ═══════════════════════════════════════════════════════════════════════════ */

export const TIMING = {
  actDurationMs: 6000,
  sourceStaggerS: 0.25,
  ingestionStaggerS: 0.4,
  counterDurationMs: 1500,
  tierStaggerS: 0.35,
  particleSpawnIntervalMs: 200,
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
 * Acts
 * ═══════════════════════════════════════════════════════════════════════════ */

export const PULSE_ACTS: PulseAct[] = [
  {
    id: 'sources',
    actNumber: 1,
    headline: 'Your Data Lives Everywhere',
    subtitle: '8 upstream source systems feed raw financial data into the pipeline',
    accentColor: '#94a3b8',
    durationMs: 6000,
  },
  {
    id: 'ingestion',
    actNumber: 2,
    headline: 'We Bring It Together',
    subtitle: 'Data is validated, standardized, and loaded into a canonical model',
    accentColor: '#60a5fa',
    durationMs: 7000,
  },
  {
    id: 'processing',
    actNumber: 3,
    headline: 'We Calculate What Matters',
    subtitle: 'A 4-tier processing engine derives metrics across every dimension',
    accentColor: '#a78bfa',
    durationMs: 7000,
  },
  {
    id: 'outputs',
    actNumber: 4,
    headline: 'You See It Clearly',
    subtitle: 'Dashboard-ready outputs drive business decisions at every level',
    accentColor: '#f472b6',
    durationMs: 6000,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * Extracted data from architectureData.ts
 * ═══════════════════════════════════════════════════════════════════════════ */

// Act 1: Source systems (STAGES[0])
export const SOURCE_NODES: ArchNode[] = STAGES[0].nodes;

// Act 2: Ingestion pipeline (STAGES[1]) + Canonical model (STAGES[2])
export const INGESTION_NODES: ArchNode[] = STAGES[1].nodes;
export const CANONICAL_NODES: ArchNode[] = STAGES[2].nodes;

// Act 3: Processing engine (STAGES[3])
export const PROCESSING_TIER_NODES: ArchNode[] = STAGES[3].nodes.slice(0, 4);
export const METRIC_DERIVATION_NODE: ArchNode = STAGES[3].nodes[4];

// Act 4: Outputs (STAGES[4]) + Consumption (STAGES[5])
export const OUTPUT_NODES: ArchNode[] = STAGES[4].nodes;
export const CONSUMPTION_NODES: ArchNode[] = STAGES[5].nodes;

/* ═══════════════════════════════════════════════════════════════════════════
 * LTV metric trace (Act 3 highlight)
 * ═══════════════════════════════════════════════════════════════════════════ */

export const LTV_TRACE = {
  metric: 'Loan-to-Value (LTV)',
  formulaParts: [
    { label: 'Outstanding Balance', value: '$178.3M', source: 'facility_exposure_snapshot', color: '#60a5fa' },
    { label: 'Collateral Value', value: '$273.5M', source: 'collateral_snapshot', color: '#f59e0b' },
  ],
  operator: '/',
  result: '65.2%',
  resultLabel: 'LTV Ratio',
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Dashboard mockup data (Act 4)
 * ═══════════════════════════════════════════════════════════════════════════ */

export const DASHBOARD_KPIS = [
  { label: 'Total Facilities', value: '2,847', trend: '+12%', trendUp: true },
  { label: 'Total Committed', value: '$48.2B', trend: '+3.1%', trendUp: true },
  { label: 'Avg DSCR', value: '1.84x', trend: '-0.05', trendUp: false },
  { label: 'Avg LTV', value: '65.2%', trend: '-1.2%', trendUp: true },
];

export const DASHBOARD_BARS = [
  { label: 'Commercial RE', value: 35, color: '#D04A02' },
  { label: 'C&I Lending', value: 28, color: '#E87722' },
  { label: 'Leveraged Finance', value: 18, color: '#a78bfa' },
  { label: 'Trade Finance', value: 12, color: '#60a5fa' },
  { label: 'Other', value: 7, color: '#6b7280' },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * Reducer
 * ═══════════════════════════════════════════════════════════════════════════ */

export type PulseAction =
  | { type: 'NEXT_ACT' }
  | { type: 'PREV_ACT' }
  | { type: 'GO_TO_ACT'; act: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SKIP_TO_FULL' }
  | { type: 'RESTART' };

export const INITIAL_STATE: PulseState = {
  currentAct: 0,
  playState: 'playing',
  isComplete: false,
  showFullView: false,
};

export function pulseReducer(state: PulseState, action: PulseAction): PulseState {
  switch (action.type) {
    case 'NEXT_ACT':
      if (state.currentAct >= 3)
        return { ...state, isComplete: true, showFullView: true, playState: 'paused' };
      return { ...state, currentAct: state.currentAct + 1 };
    case 'PREV_ACT':
      if (state.showFullView)
        return { ...state, currentAct: 3, showFullView: false, isComplete: false, playState: 'paused' };
      return { ...state, currentAct: Math.max(0, state.currentAct - 1), isComplete: false };
    case 'GO_TO_ACT':
      return { ...state, currentAct: action.act, isComplete: false, showFullView: false, playState: 'paused' };
    case 'PLAY':
      return { ...state, playState: 'playing' };
    case 'PAUSE':
      return { ...state, playState: 'paused' };
    case 'TOGGLE_PLAY':
      return { ...state, playState: state.playState === 'playing' ? 'paused' : 'playing' };
    case 'SKIP_TO_FULL':
      return { ...state, showFullView: true, isComplete: true, playState: 'paused' };
    case 'RESTART':
      return { ...INITIAL_STATE };
    default:
      return state;
  }
}
