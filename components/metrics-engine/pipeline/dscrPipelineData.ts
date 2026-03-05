import type { CalculationDimension } from '@/data/l3-metrics';

/* ═══════════════════════════════════════════════════════════════════════════
 * Pipeline data types & definitions for DSCR visual flow
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface PipelineField {
  name: string;
  sampleValue: string;
  /** Which dimensions use this field (empty = all) */
  dims?: CalculationDimension[];
}

export interface PipelineTable {
  id: string;
  name: string;
  shortName: string;
  layer: 'L1' | 'L2';
  fields: PipelineField[];
}

export type StepPhase = 'READ' | 'JOIN' | 'BRANCH' | 'CALCULATE' | 'AGGREGATE' | 'TRAVERSE';

export interface SampleData {
  headers: string[];
  rows: string[][];
}

export interface PipelineStep {
  id: string;
  phase: StepPhase;
  title: string;
  pythonCode: string;
  narration: string;
  /** IDs of source tables this step reads from */
  inputTableIds: string[];
  /** Sample data after this step (mini table) */
  sampleOutput?: SampleData;
}

export interface DimensionPipeline {
  dimension: CalculationDimension;
  label: string;
  description: string;
  tables: string[]; // table IDs used
  steps: PipelineStep[];
}

/* ── Phase colors ── */
export const PHASE_COLORS: Record<StepPhase, { bg: string; border: string; text: string; badge: string }> = {
  READ:      { bg: 'bg-blue-950/60',    border: 'border-blue-500/40',    text: 'text-blue-300',    badge: 'bg-blue-500/20 text-blue-300' },
  JOIN:      { bg: 'bg-purple-950/60',   border: 'border-purple-500/40',  text: 'text-purple-300',  badge: 'bg-purple-500/20 text-purple-300' },
  BRANCH:    { bg: 'bg-amber-950/60',    border: 'border-amber-500/40',   text: 'text-amber-300',   badge: 'bg-amber-500/20 text-amber-300' },
  CALCULATE: { bg: 'bg-emerald-950/60',  border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
  AGGREGATE: { bg: 'bg-pink-950/60',     border: 'border-pink-500/40',    text: 'text-pink-300',    badge: 'bg-pink-500/20 text-pink-300' },
  TRAVERSE:  { bg: 'bg-cyan-950/60',     border: 'border-cyan-500/40',    text: 'text-cyan-300',    badge: 'bg-cyan-500/20 text-cyan-300' },
};

export const PHASE_SVG_COLORS: Record<StepPhase, string> = {
  READ: '#3b82f6', JOIN: '#a855f7', BRANCH: '#f59e0b',
  CALCULATE: '#10b981', AGGREGATE: '#ec4899', TRAVERSE: '#06b6d4',
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Source tables
 * ═══════════════════════════════════════════════════════════════════════════ */

export const PIPELINE_TABLES: Record<string, PipelineTable> = {
  ffs: {
    id: 'ffs',
    name: 'facility_financial_snapshot',
    shortName: 'Financial Snapshot',
    layer: 'L2',
    fields: [
      { name: 'facility_id',            sampleValue: 'F-101' },
      { name: 'noi_amt',                sampleValue: '$1,585,000',  dims: ['facility'] },
      { name: 'ebitda_amt',             sampleValue: '$5,640,000',  dims: ['facility'] },
      { name: 'total_debt_service_amt', sampleValue: '$1,200,000' },
      { name: 'as_of_date',             sampleValue: '2024-12-31' },
    ],
  },
  fes: {
    id: 'fes',
    name: 'facility_exposure_snapshot',
    shortName: 'Exposure Snapshot',
    layer: 'L2',
    fields: [
      { name: 'facility_id',        sampleValue: 'F-101' },
      { name: 'counterparty_id',    sampleValue: 'CP-01',       dims: ['counterparty'] },
      { name: 'gross_exposure_usd', sampleValue: '$50,000,000' },
    ],
  },
  fm: {
    id: 'fm',
    name: 'facility_master',
    shortName: 'Facility Master',
    layer: 'L1',
    fields: [
      { name: 'facility_id',      sampleValue: 'F-101' },
      { name: 'product_node_id',  sampleValue: '3',            dims: ['facility'] },
      { name: 'lob_segment_id',   sampleValue: 'SEG-L3-CRE',  dims: ['L3', 'L2', 'L1'] },
      { name: 'counterparty_id',  sampleValue: 'CP-01',        dims: ['counterparty'] },
    ],
  },
  ept: {
    id: 'ept',
    name: 'enterprise_product_taxonomy',
    shortName: 'Product Taxonomy',
    layer: 'L1',
    fields: [
      { name: 'product_node_id', sampleValue: '3' },
      { name: 'product_code',    sampleValue: 'BL' },
    ],
  },
  ebt: {
    id: 'ebt',
    name: 'enterprise_business_taxonomy',
    shortName: 'Business Taxonomy',
    layer: 'L1',
    fields: [
      { name: 'managed_segment_id', sampleValue: 'SEG-L3-CRE' },
      { name: 'parent_segment_id',  sampleValue: 'SEG-L2-CRE' },
      { name: 'segment_name',       sampleValue: 'CRE Lending' },
    ],
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
 * Per-dimension pipeline steps
 * ═══════════════════════════════════════════════════════════════════════════ */

const FACILITY_STEPS: PipelineStep[] = [
  {
    id: 'fac-read',
    phase: 'READ',
    title: '1. Read & Merge Tables',
    pythonCode: `merged = ffs.merge(
    fm[['facility_id', 'product_node_id']],
    on='facility_id'
)`,
    narration: 'Read every facility\'s financial snapshot (NOI, EBITDA, debt service) and merge with the facility master to get each facility\'s product_node_id.',
    inputTableIds: ['ffs', 'fm'],
    sampleOutput: {
      headers: ['facility_id', 'noi_amt', 'ebitda_amt', 'debt_service', 'product_node_id'],
      rows: [
        ['F-101', '$1.59M', '$5.64M', '$1.20M', '3'],
        ['F-102', '$0', '$3.20M', '$0.95M', '5'],
      ],
    },
  },
  {
    id: 'fac-join',
    phase: 'JOIN',
    title: '2. Join Product Taxonomy',
    pythonCode: `merged = merged.merge(
    ept[['product_node_id', 'product_code']],
    on='product_node_id'
)`,
    narration: 'Join the product taxonomy to resolve each product_node_id to its product_code (BL, BRIDGE, TERM, etc). This determines the numerator formula.',
    inputTableIds: ['ept'],
    sampleOutput: {
      headers: ['facility_id', 'noi_amt', 'ebitda_amt', 'debt_service', 'product_code'],
      rows: [
        ['F-101', '$1.59M', '$5.64M', '$1.20M', 'BL  (CRE)'],
        ['F-102', '$0', '$3.20M', '$0.95M', 'TERM (C&I)'],
      ],
    },
  },
  {
    id: 'fac-branch',
    phase: 'BRANCH',
    title: '3. Branch: CRE vs C&I',
    pythonCode: `merged['numerator'] = np.where(
    merged['product_code'].isin(['BL','BRIDGE']),
    merged['noi_amt'],       # CRE → NOI
    merged['ebitda_amt']     # C&I → EBITDA
)`,
    narration: 'CRE products (BL, BRIDGE) use Net Operating Income as numerator. All other products (C&I) use EBITDA. This is the key branching logic.',
    inputTableIds: [],
    sampleOutput: {
      headers: ['facility_id', 'product_code', 'numerator', 'source'],
      rows: [
        ['F-101', 'BL', '$1,585,000', 'noi_amt (CRE)'],
        ['F-102', 'TERM', '$3,200,000', 'ebitda_amt (C&I)'],
      ],
    },
  },
  {
    id: 'fac-calc',
    phase: 'CALCULATE',
    title: '4. Compute DSCR',
    pythonCode: `merged['dscr'] = (
    merged['numerator']
    / merged['total_debt_service_amt']
      .replace(0, np.nan)
)`,
    narration: 'Divide the numerator by total debt service. Zero debt service → NaN (excluded). A DSCR > 1.0x means income covers debt payments.',
    inputTableIds: [],
    sampleOutput: {
      headers: ['facility_id', 'product_code', 'numerator', 'debt_service', 'DSCR'],
      rows: [
        ['F-101', 'BL (CRE)', '$1.59M', '$1.20M', '1.32x'],
        ['F-102', 'TERM (C&I)', '$3.20M', '$0.95M', '3.37x'],
      ],
    },
  },
];

const COUNTERPARTY_STEPS: PipelineStep[] = [
  {
    id: 'cp-read',
    phase: 'READ',
    title: '1. Get Facility DSCR + Exposure',
    pythonCode: `merged = facility_dscr.merge(
    fes[['facility_id',
         'counterparty_id',
         'gross_exposure_usd']]
)`,
    narration: 'Start from the facility-level DSCR (computed above) and merge with the exposure snapshot to get each facility\'s gross exposure and counterparty assignment.',
    inputTableIds: ['fes'],
    sampleOutput: {
      headers: ['facility_id', 'counterparty_id', 'dscr', 'gross_exposure'],
      rows: [
        ['F-101', 'CP-01', '1.32x', '$50M'],
        ['F-103', 'CP-01', '0.87x', '$22M'],
        ['F-102', 'CP-02', '3.37x', '$35M'],
      ],
    },
  },
  {
    id: 'cp-weight',
    phase: 'CALCULATE',
    title: '2. Compute Weights',
    pythonCode: `merged['weighted_dscr'] = (
    merged['dscr']
    * merged['gross_exposure_usd']
)`,
    narration: 'Multiply each facility\'s DSCR by its gross exposure. Larger exposures contribute more to the counterparty average — this is exposure-weighted.',
    inputTableIds: [],
    sampleOutput: {
      headers: ['facility_id', 'cp_id', 'dscr', 'exposure', 'weighted'],
      rows: [
        ['F-101', 'CP-01', '1.32x', '$50M', '$66.0M'],
        ['F-103', 'CP-01', '0.87x', '$22M', '$19.1M'],
      ],
    },
  },
  {
    id: 'cp-agg',
    phase: 'AGGREGATE',
    title: '3. Aggregate per Counterparty',
    pythonCode: `grouped = merged.groupby('counterparty_id').agg(
    weighted_sum=('weighted_dscr', 'sum'),
    weight_total=('valid_weight', 'sum')
)
grouped['dscr'] = (
    grouped['weighted_sum']
    / grouped['weight_total']
)`,
    narration: 'Group by counterparty and compute the weighted average: sum(DSCR × exposure) / sum(exposure). This gives one DSCR per counterparty.',
    inputTableIds: [],
    sampleOutput: {
      headers: ['counterparty_id', 'weighted_sum', 'weight_total', 'DSCR'],
      rows: [
        ['CP-01', '$85.1M', '$72M', '1.18x'],
        ['CP-02', '$117.9M', '$35M', '3.37x'],
      ],
    },
  },
];

const DESK_STEPS: PipelineStep[] = [
  {
    id: 'desk-read',
    phase: 'READ',
    title: '1. Get Facility DSCR + Exposure',
    pythonCode: `merged = facility_dscr.merge(
    fes[['facility_id',
         'gross_exposure_usd']]
)`,
    narration: 'Start from facility-level DSCR and merge with exposure data for weighting.',
    inputTableIds: ['fes'],
  },
  {
    id: 'desk-join',
    phase: 'JOIN',
    title: '2. Join Facility → Segment',
    pythonCode: `merged = merged.merge(
    fm[['facility_id', 'lob_segment_id']]
)
merged = merged.merge(
    ebt[['managed_segment_id',
         'segment_name']],
    left_on='lob_segment_id',
    right_on='managed_segment_id'
)`,
    narration: 'Join facility_master for lob_segment_id, then resolve through business taxonomy to get the Desk (L3) segment_name.',
    inputTableIds: ['fm', 'ebt'],
    sampleOutput: {
      headers: ['facility_id', 'dscr', 'exposure', 'segment_name'],
      rows: [
        ['F-101', '1.32x', '$50M', 'CRE Lending'],
        ['F-102', '3.37x', '$35M', 'C&I Banking'],
      ],
    },
  },
  {
    id: 'desk-agg',
    phase: 'AGGREGATE',
    title: '3. Weighted Average per Desk',
    pythonCode: `grouped = merged.groupby('segment_name').agg(
    weighted_sum=('weighted_dscr', 'sum'),
    weight_total=('gross_exposure_usd', 'sum')
)
grouped['dscr'] = (
    grouped['weighted_sum']
    / grouped['weight_total']
)`,
    narration: 'Group by desk segment and compute exposure-weighted average DSCR across all facilities in that desk.',
    inputTableIds: [],
    sampleOutput: {
      headers: ['segment_name', 'weighted_sum', 'total_exposure', 'DSCR'],
      rows: [
        ['CRE Lending', '$95.6M', '$72M', '1.33x'],
        ['C&I Banking', '$117.9M', '$35M', '3.37x'],
      ],
    },
  },
];

const PORTFOLIO_STEPS: PipelineStep[] = [
  {
    id: 'port-read',
    phase: 'READ',
    title: '1. Get Facility DSCR + Exposure',
    pythonCode: `merged = facility_dscr.merge(
    fes[['facility_id',
         'gross_exposure_usd']]
)`,
    narration: 'Start from facility-level DSCR with exposure for weighting.',
    inputTableIds: ['fes'],
  },
  {
    id: 'port-join',
    phase: 'JOIN',
    title: '2. Join Facility → Segment',
    pythonCode: `merged = merged.merge(
    fm[['facility_id', 'lob_segment_id']]
)
merged = merged.merge(
    ebt[['managed_segment_id',
         'parent_segment_id']],
    left_on='lob_segment_id',
    right_on='managed_segment_id'
)`,
    narration: 'Join facility_master for lob_segment_id, then business taxonomy to get each desk\'s parent_segment_id.',
    inputTableIds: ['fm', 'ebt'],
  },
  {
    id: 'port-traverse',
    phase: 'TRAVERSE',
    title: '3. Resolve Portfolio Parent',
    pythonCode: `merged = merged.merge(
    ebt[['managed_segment_id',
         'segment_name']]
      .rename(columns={
        'managed_segment_id': 'parent_id',
        'segment_name': 'portfolio_name'
      }),
    left_on='parent_segment_id',
    right_on='parent_id'
)`,
    narration: 'Walk one level up the hierarchy: look up the parent segment\'s name. This is the Portfolio (L2) level.',
    inputTableIds: ['ebt'],
    sampleOutput: {
      headers: ['facility_id', 'dscr', 'exposure', 'portfolio_name'],
      rows: [
        ['F-101', '1.32x', '$50M', 'Commercial RE'],
        ['F-102', '3.37x', '$35M', 'Commercial Banking'],
      ],
    },
  },
  {
    id: 'port-agg',
    phase: 'AGGREGATE',
    title: '4. Weighted Average per Portfolio',
    pythonCode: `grouped = merged.groupby('portfolio_name').agg(
    weighted_sum=('weighted_dscr', 'sum'),
    weight_total=('gross_exposure_usd', 'sum')
)
grouped['dscr'] = (
    grouped['weighted_sum']
    / grouped['weight_total']
)`,
    narration: 'Group by portfolio and compute the exposure-weighted DSCR across all facilities in that portfolio.',
    inputTableIds: [],
    sampleOutput: {
      headers: ['portfolio_name', 'total_exposure', 'DSCR'],
      rows: [
        ['Commercial RE', '$72M', '1.33x'],
        ['Commercial Banking', '$85M', '2.41x'],
      ],
    },
  },
];

const SEGMENT_STEPS: PipelineStep[] = [
  {
    id: 'seg-read',
    phase: 'READ',
    title: '1. Get Facility DSCR + Exposure',
    pythonCode: `merged = facility_dscr.merge(
    fes[['facility_id',
         'gross_exposure_usd']]
)`,
    narration: 'Start from facility-level DSCR with exposure for weighting.',
    inputTableIds: ['fes'],
  },
  {
    id: 'seg-join',
    phase: 'JOIN',
    title: '2. Join Facility → Segment',
    pythonCode: `merged = merged.merge(
    fm[['facility_id', 'lob_segment_id']]
)
merged = merged.merge(
    ebt[['managed_segment_id',
         'parent_segment_id']],
    left_on='lob_segment_id',
    right_on='managed_segment_id'
)`,
    narration: 'Join facility_master for lob_segment_id, then business taxonomy to start walking up the hierarchy.',
    inputTableIds: ['fm', 'ebt'],
  },
  {
    id: 'seg-traverse',
    phase: 'TRAVERSE',
    title: '3. Walk to Root Ancestor',
    pythonCode: `# Walk up: desk → portfolio → root
merged = merged.merge(
    ebt[['managed_segment_id',
         'parent_segment_id']]
      .rename(columns={
        'managed_segment_id': 'p_id',
        'parent_segment_id': 'root_segment_id'
      }),
    left_on='parent_segment_id',
    right_on='p_id'
)
merged = merged.merge(
    ebt[['managed_segment_id',
         'segment_name']]
      .rename(columns={
        'managed_segment_id': 'root_id',
        'segment_name': 'segment_name_l1'
      }),
    left_on='root_segment_id',
    right_on='root_id'
)`,
    narration: 'Walk two levels up: desk → portfolio (parent) → business segment (grandparent/root). This resolves the L1 root segment name.',
    inputTableIds: ['ebt'],
    sampleOutput: {
      headers: ['facility_id', 'dscr', 'exposure', 'segment_name_l1'],
      rows: [
        ['F-101', '1.32x', '$50M', 'Wholesale Banking'],
        ['F-102', '3.37x', '$35M', 'Wholesale Banking'],
        ['F-105', '1.87x', '$28M', 'Retail Banking'],
      ],
    },
  },
  {
    id: 'seg-agg',
    phase: 'AGGREGATE',
    title: '4. Weighted Average per Segment',
    pythonCode: `grouped = merged.groupby('segment_name_l1').agg(
    weighted_sum=('weighted_dscr', 'sum'),
    weight_total=('gross_exposure_usd', 'sum')
)
grouped['dscr'] = (
    grouped['weighted_sum']
    / grouped['weight_total']
)`,
    narration: 'Group by root business segment and compute the exposure-weighted DSCR — the highest aggregation level.',
    inputTableIds: [],
    sampleOutput: {
      headers: ['segment_name_l1', 'total_exposure', 'DSCR'],
      rows: [
        ['Wholesale Banking', '$157M', '1.89x'],
        ['Retail Banking', '$68M', '1.54x'],
      ],
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
 * Full pipeline data per dimension
 * ═══════════════════════════════════════════════════════════════════════════ */

export const DIMENSION_PIPELINES: Record<CalculationDimension, DimensionPipeline> = {
  facility: {
    dimension: 'facility',
    label: 'Facility',
    description: 'Direct DSCR per facility with CRE/C&I numerator branching',
    tables: ['ffs', 'fm', 'ept'],
    steps: FACILITY_STEPS,
  },
  counterparty: {
    dimension: 'counterparty',
    label: 'Counterparty',
    description: 'Exposure-weighted average DSCR across facilities per counterparty',
    tables: ['fes'],
    steps: COUNTERPARTY_STEPS,
  },
  L3: {
    dimension: 'L3',
    label: 'Desk (L3)',
    description: 'Exposure-weighted average DSCR per desk via business taxonomy',
    tables: ['fes', 'fm', 'ebt'],
    steps: DESK_STEPS,
  },
  L2: {
    dimension: 'L2',
    label: 'Portfolio (L2)',
    description: 'Exposure-weighted average DSCR per portfolio via parent segment traversal',
    tables: ['fes', 'fm', 'ebt'],
    steps: PORTFOLIO_STEPS,
  },
  L1: {
    dimension: 'L1',
    label: 'Business Segment (L1)',
    description: 'Exposure-weighted average DSCR per root business segment',
    tables: ['fes', 'fm', 'ebt'],
    steps: SEGMENT_STEPS,
  },
};

/* ── Full Python formula per dimension (for copy-to-clipboard) ── */
export const PYTHON_FORMULAS: Record<CalculationDimension, string> = {
  facility: `# DSCR — Facility Level
import pandas as pd, numpy as np

def calculate_facility_dscr(ffs, fm, ept):
    merged = ffs.merge(fm[['facility_id', 'product_node_id']], on='facility_id')
    merged = merged.merge(ept[['product_node_id', 'product_code']], on='product_node_id')
    merged['numerator'] = np.where(
        merged['product_code'].isin(['BL', 'BRIDGE']),
        merged['noi_amt'], merged['ebitda_amt'])
    merged['dscr'] = merged['numerator'] / merged['total_debt_service_amt'].replace(0, np.nan)
    return merged[['facility_id', 'product_code', 'dscr']]`,

  counterparty: `# DSCR — Counterparty Weighted Average
def calculate_counterparty_dscr(facility_dscr, fes):
    merged = facility_dscr.merge(fes[['facility_id', 'counterparty_id', 'gross_exposure_usd']])
    merged['weighted_dscr'] = merged['dscr'] * merged['gross_exposure_usd']
    grouped = merged.groupby('counterparty_id').agg(
        weighted_sum=('weighted_dscr', 'sum'), weight_total=('gross_exposure_usd', 'sum'))
    grouped['dscr'] = grouped['weighted_sum'] / grouped['weight_total'].replace(0, np.nan)
    return grouped[['dscr']]`,

  L3: `# DSCR — Desk (L3) Weighted Average
def calculate_desk_dscr(facility_dscr, fes, fm, ebt):
    merged = facility_dscr.merge(fes[['facility_id', 'gross_exposure_usd']])
    merged = merged.merge(fm[['facility_id', 'lob_segment_id']])
    merged = merged.merge(ebt[['managed_segment_id', 'segment_name']],
        left_on='lob_segment_id', right_on='managed_segment_id')
    merged['weighted_dscr'] = merged['dscr'] * merged['gross_exposure_usd']
    grouped = merged.groupby('segment_name').agg(
        weighted_sum=('weighted_dscr', 'sum'), weight_total=('gross_exposure_usd', 'sum'))
    grouped['dscr'] = grouped['weighted_sum'] / grouped['weight_total'].replace(0, np.nan)
    return grouped[['dscr']]`,

  L2: `# DSCR — Portfolio (L2) Weighted Average
def calculate_portfolio_dscr(facility_dscr, fes, fm, ebt):
    merged = facility_dscr.merge(fes[['facility_id', 'gross_exposure_usd']])
    merged = merged.merge(fm[['facility_id', 'lob_segment_id']])
    merged = merged.merge(ebt[['managed_segment_id', 'parent_segment_id']],
        left_on='lob_segment_id', right_on='managed_segment_id')
    merged = merged.merge(ebt[['managed_segment_id', 'segment_name']].rename(
        columns={'managed_segment_id': 'parent_id', 'segment_name': 'portfolio_name'}),
        left_on='parent_segment_id', right_on='parent_id')
    merged['weighted_dscr'] = merged['dscr'] * merged['gross_exposure_usd']
    grouped = merged.groupby('portfolio_name').agg(
        weighted_sum=('weighted_dscr', 'sum'), weight_total=('gross_exposure_usd', 'sum'))
    grouped['dscr'] = grouped['weighted_sum'] / grouped['weight_total'].replace(0, np.nan)
    return grouped[['dscr']]`,

  L1: `# DSCR — Business Segment (L1) Weighted Average
def calculate_segment_dscr(facility_dscr, fes, fm, ebt):
    merged = facility_dscr.merge(fes[['facility_id', 'gross_exposure_usd']])
    merged = merged.merge(fm[['facility_id', 'lob_segment_id']])
    merged = merged.merge(ebt[['managed_segment_id', 'parent_segment_id']],
        left_on='lob_segment_id', right_on='managed_segment_id')
    merged = merged.merge(ebt[['managed_segment_id', 'parent_segment_id']].rename(
        columns={'managed_segment_id': 'p_id', 'parent_segment_id': 'root_segment_id'}),
        left_on='parent_segment_id', right_on='p_id')
    merged = merged.merge(ebt[['managed_segment_id', 'segment_name']].rename(
        columns={'managed_segment_id': 'root_id', 'segment_name': 'segment_name_l1'}),
        left_on='root_segment_id', right_on='root_id')
    merged['weighted_dscr'] = merged['dscr'] * merged['gross_exposure_usd']
    grouped = merged.groupby('segment_name_l1').agg(
        weighted_sum=('weighted_dscr', 'sum'), weight_total=('gross_exposure_usd', 'sum'))
    grouped['dscr'] = grouped['weighted_sum'] / grouped['weight_total'].replace(0, np.nan)
    return grouped[['dscr']]`,
};
