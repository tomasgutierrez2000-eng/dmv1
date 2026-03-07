import type { CalculationDimension } from '@/data/l3-metrics';

/* ═══════════════════════════════════════════════════════════════════════════
 * Pipeline data for Undrawn Exposure — Python code at all levels
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface PipelineField {
  name: string;
  sampleValue: string;
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
  inputTableIds: string[];
  sampleOutput?: SampleData;
}

export interface DimensionPipeline {
  dimension: CalculationDimension;
  label: string;
  description: string;
  tables: string[];
  steps: PipelineStep[];
}

export const PHASE_COLORS: Record<StepPhase, { bg: string; border: string; text: string; badge: string }> = {
  READ:      { bg: 'bg-blue-950/60',    border: 'border-blue-500/40',    text: 'text-blue-300',    badge: 'bg-blue-500/20 text-blue-300' },
  JOIN:      { bg: 'bg-purple-950/60',   border: 'border-purple-500/40',  text: 'text-purple-300',  badge: 'bg-purple-500/20 text-purple-300' },
  BRANCH:    { bg: 'bg-amber-950/60',    border: 'border-amber-500/40',   text: 'text-amber-300',   badge: 'bg-amber-500/20 text-amber-300' },
  CALCULATE: { bg: 'bg-emerald-950/60',  border: 'border-emerald-500/40', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
  AGGREGATE: { bg: 'bg-pink-950/60',     border: 'border-pink-500/40',    text: 'text-pink-300',    badge: 'bg-pink-500/20 text-pink-300' },
  TRAVERSE:  { bg: 'bg-cyan-950/60',     border: 'border-cyan-500/40',   text: 'text-cyan-300',    badge: 'bg-cyan-500/20 text-cyan-300' },
};

export const PHASE_SVG_COLORS: Record<StepPhase, string> = {
  READ: '#3b82f6', JOIN: '#a855f7', BRANCH: '#f59e0b',
  CALCULATE: '#10b981', AGGREGATE: '#ec4899', TRAVERSE: '#06b6d4',
};

export const PIPELINE_TABLES: Record<string, PipelineTable> = {
  pos: {
    id: 'pos',
    name: 'position',
    shortName: 'Position',
    layer: 'L2',
    fields: [
      { name: 'position_id', sampleValue: '1' },
      { name: 'as_of_date', sampleValue: '2025-01-31' },
      { name: 'facility_id', sampleValue: '1' },
    ],
  },
  pdtl: {
    id: 'pdtl',
    name: 'position_detail',
    shortName: 'Position Detail',
    layer: 'L2',
    fields: [
      { name: 'position_id', sampleValue: '1' },
      { name: 'as_of_date', sampleValue: '2025-01-31' },
      { name: 'unfunded_amount', sampleValue: '$130M' },
    ],
  },
  fm: {
    id: 'fm',
    name: 'facility_master',
    shortName: 'Facility Master',
    layer: 'L1',
    fields: [
      { name: 'facility_id', sampleValue: '1' },
      { name: 'bank_share_pct', sampleValue: '1.0' },
      { name: 'facility_active_flag', sampleValue: 'Y' },
      { name: 'lob_segment_id', sampleValue: '1', dims: ['L3', 'L2', 'L1'] },
    ],
  },
  fcp: {
    id: 'fcp',
    name: 'facility_counterparty_participation',
    shortName: 'Participation',
    layer: 'L1',
    fields: [
      { name: 'facility_id', sampleValue: '1' },
      { name: 'counterparty_id', sampleValue: '1' },
      { name: 'participation_pct', sampleValue: '0.5' },
    ],
  },
  ebt: {
    id: 'ebt',
    name: 'enterprise_business_taxonomy',
    shortName: 'Business Taxonomy',
    layer: 'L1',
    fields: [
      { name: 'managed_segment_id', sampleValue: '1' },
      { name: 'tree_level', sampleValue: 'L1|L2|L3' },
      { name: 'description', sampleValue: 'CRE Lending' },
    ],
  },
};

const ACTIVE_FLAG_VALUE = 'Y';

/* ── Facility level: Calc ── */
const FACILITY_STEPS: PipelineStep[] = [
  {
    id: 'fac-read',
    phase: 'READ',
    title: '1. Read Position & Position Detail',
    pythonCode: `pos = position.loc[
    position["as_of_date"] == as_of_date,
    ["position_id", "facility_id"]
].drop_duplicates()

pdtl = position_detail.loc[
    position_detail["as_of_date"] == as_of_date,
    ["position_id", "unfunded_amount"]
].copy()
pdtl["unfunded_amount"] = pdtl["unfunded_amount"].fillna(0.0)

j = pos.merge(pdtl, on="position_id", how="inner")`,
    narration: 'Filter positions and position_detail by as_of_date. Sum unfunded_amount per position.',
    inputTableIds: ['pos', 'pdtl'],
    sampleOutput: {
      headers: ['facility_id', 'position_id', 'unfunded_amount'],
      rows: [
        ['1', '1', '$130M'],
        ['1', '2', '$50M'],
      ],
    },
  },
  {
    id: 'fac-agg',
    phase: 'AGGREGATE',
    title: '2. Sum Unfunded per Facility',
    pythonCode: `fac_sum = (
    j.groupby("facility_id", as_index=False)
     .agg(unfunded_amount_sum=("unfunded_amount", "sum"))
)`,
    narration: 'Group by facility_id and sum unfunded_amount across all positions.',
    inputTableIds: [],
    sampleOutput: {
      headers: ['facility_id', 'unfunded_amount_sum'],
      rows: [
        ['1', '$180M'],
        ['2', '$50M'],
      ],
    },
  },
  {
    id: 'fac-join',
    phase: 'JOIN',
    title: '3. Join Facility Master (Bank Share, Active Flag)',
    pythonCode: `fac_sum = fac_sum.merge(
    facility_master[["facility_id", "bank_share_pct", "facility_active_flag"]],
    on="facility_id",
    how="left"
)

fac_sum = fac_sum.loc[
    fac_sum["facility_active_flag"].astype(str).str.upper() == "${ACTIVE_FLAG_VALUE}"
]

fac_sum["bank_share_pct"] = fac_sum["bank_share_pct"].fillna(0.0)`,
    narration: 'Join facility_master for bank_share_pct and facility_active_flag. Filter to active facilities only.',
    inputTableIds: ['fm'],
    sampleOutput: {
      headers: ['facility_id', 'unfunded_amount_sum', 'bank_share_pct'],
      rows: [
        ['1', '$180M', '1.0'],
        ['2', '$50M', '0.5'],
      ],
    },
  },
  {
    id: 'fac-calc',
    phase: 'CALCULATE',
    title: '4. Compute Undrawn Exposure (Bank Share)',
    pythonCode: `fac_sum["undrawn_exposure_usd"] = (
    fac_sum["unfunded_amount_sum"] * fac_sum["bank_share_pct"]
)

return fac_sum[["facility_id", "undrawn_exposure_usd"]]`,
    narration: 'Multiply unfunded_amount_sum by bank_share_pct to get bank-share-only undrawn exposure.',
    inputTableIds: [],
    sampleOutput: {
      headers: ['facility_id', 'undrawn_exposure_usd'],
      rows: [
        ['1', '$180M'],
        ['2', '$25M'],
      ],
    },
  },
];

/* ── Counterparty level: Calc (participation-weighted) ── */
const COUNTERPARTY_STEPS: PipelineStep[] = [
  {
    id: 'cp-calc',
    phase: 'CALCULATE',
    title: '1. Facility-Level Undrawn × Participation',
    pythonCode: `fac = undrawn_exposure_facility_level(
    as_of_date, facility_master, position, position_detail
)

part = facility_counterparty_participation[
    ["facility_id", "counterparty_id", "participation_pct"]
].copy()
part["participation_pct"] = part["participation_pct"].fillna(0.0)

j = fac.merge(part, on="facility_id", how="inner")
j["counterparty_undrawn_exposure_usd"] = (
    j["undrawn_exposure_usd"] * j["participation_pct"]
)`,
    narration: 'Start from facility-level undrawn exposure. Join facility_counterparty_participation and multiply by participation_pct.',
    inputTableIds: ['fcp'],
    sampleOutput: {
      headers: ['facility_id', 'counterparty_id', 'undrawn_exposure_usd', 'participation_pct', 'counterparty_undrawn_exposure_usd'],
      rows: [
        ['1', '1', '$180M', '0.5', '$90M'],
        ['2', '1', '$25M', '1.0', '$25M'],
      ],
    },
  },
  {
    id: 'cp-agg',
    phase: 'AGGREGATE',
    title: '2. Sum per Counterparty',
    pythonCode: `return (
    j.groupby("counterparty_id", as_index=False)
     .agg(counterparty_undrawn_exposure_usd=("counterparty_undrawn_exposure_usd", "sum"))
)`,
    narration: 'Group by counterparty_id and sum the participation-weighted undrawn exposure.',
    inputTableIds: [],
    sampleOutput: {
      headers: ['counterparty_id', 'counterparty_undrawn_exposure_usd'],
      rows: [
        ['1', '$115M'],
        ['2', '$30M'],
      ],
    },
  },
];

/* ── L3 Desk / L2 Portfolio / L1 LoB: Aggregation by taxonomy ── */
const LOB_AGG_NARRATION = 'Lookup lob_segment_id from enterprise_business_taxonomy by tree_level and description. Filter facility_master by lob_segment_id. Sum facility undrawn exposure.';

const L3_STEPS: PipelineStep[] = [
  {
    id: 'l3-node',
    phase: 'READ',
    title: '1. Resolve L3 LoB Node',
    pythonCode: `node = enterprise_business_taxonomy.loc[
    (enterprise_business_taxonomy["tree_level"] == "L3") &
    (enterprise_business_taxonomy["description"] == target_lob_description),
    ["managed_segment_id"]
]
lob_id = node.iloc[0]["managed_segment_id"]`,
    narration: 'Lookup managed_segment_id from enterprise_business_taxonomy where tree_level=L3 and description=target L3 LoB.',
    inputTableIds: ['ebt'],
  },
  {
    id: 'l3-agg',
    phase: 'AGGREGATE',
    title: '2. Sum Facility Undrawn by L3 LoB',
    pythonCode: `fac_exp = undrawn_exposure_facility_level(...)
fac_attr = facility_master.loc[
    facility_master["lob_segment_id"] == lob_id,
    ["facility_id", "lob_segment_id"]
]
j = fac_exp.merge(fac_attr, on="facility_id", how="inner")
return j.groupby("lob_segment_id", as_index=False).agg(
    undrawn_exposure_usd=("undrawn_exposure_usd", "sum")
)`,
    narration: LOB_AGG_NARRATION,
    inputTableIds: ['fm'],
    sampleOutput: {
      headers: ['lob_segment_id', 'undrawn_exposure_usd'],
      rows: [
        ['1', '$205M'],
        ['2', '$80M'],
      ],
    },
  },
];

const L2_STEPS: PipelineStep[] = [
  {
    id: 'l2-node',
    phase: 'READ',
    title: '1. Resolve L2 LoB Node',
    pythonCode: `node = enterprise_business_taxonomy.loc[
    (enterprise_business_taxonomy["tree_level"] == "L2") &
    (enterprise_business_taxonomy["description"] == target_lob_description),
    ["managed_segment_id"]
]
lob_id = node.iloc[0]["managed_segment_id"]`,
    narration: 'Lookup managed_segment_id where tree_level=L2.',
    inputTableIds: ['ebt'],
  },
  {
    id: 'l2-agg',
    phase: 'AGGREGATE',
    title: '2. Sum Facility Undrawn by L2 LoB',
    pythonCode: `fac_exp = undrawn_exposure_facility_level(...)
fac_attr = facility_master.loc[
    facility_master["lob_segment_id"] == lob_id,
    ["facility_id", "lob_segment_id"]
]
j = fac_exp.merge(fac_attr, on="facility_id", how="inner")
return j.groupby("lob_segment_id", as_index=False).agg(
    undrawn_exposure_usd=("undrawn_exposure_usd", "sum")
)`,
    narration: LOB_AGG_NARRATION,
    inputTableIds: ['fm'],
    sampleOutput: {
      headers: ['lob_segment_id', 'undrawn_exposure_usd'],
      rows: [
        ['101', '$350M'],
        ['102', '$120M'],
      ],
    },
  },
];

const L1_STEPS: PipelineStep[] = [
  {
    id: 'l1-node',
    phase: 'READ',
    title: '1. Resolve L1 LoB Node',
    pythonCode: `node = enterprise_business_taxonomy.loc[
    (enterprise_business_taxonomy["tree_level"] == "L1") &
    (enterprise_business_taxonomy["description"] == target_lob_description),
    ["managed_segment_id"]
]
lob_id = node.iloc[0]["managed_segment_id"]`,
    narration: 'Lookup managed_segment_id where tree_level=L1.',
    inputTableIds: ['ebt'],
  },
  {
    id: 'l1-agg',
    phase: 'AGGREGATE',
    title: '2. Sum Facility Undrawn by L1 LoB',
    pythonCode: `fac_exp = undrawn_exposure_facility_level(...)
fac_attr = facility_master.loc[
    facility_master["lob_segment_id"] == lob_id,
    ["facility_id", "lob_segment_id"]
]
j = fac_exp.merge(fac_attr, on="facility_id", how="inner")
return j.groupby("lob_segment_id", as_index=False).agg(
    undrawn_exposure_usd=("undrawn_exposure_usd", "sum")
)`,
    narration: LOB_AGG_NARRATION,
    inputTableIds: ['fm'],
    sampleOutput: {
      headers: ['lob_segment_id', 'undrawn_exposure_usd'],
      rows: [
        ['1', '$470M'],
      ],
    },
  },
];

export const DIMENSION_PIPELINES: Record<CalculationDimension, DimensionPipeline> = {
  facility: {
    dimension: 'facility',
    label: 'Facility',
    description: 'Sum unfunded_amount from position_detail × bank_share_pct, filtered by facility_active_flag=Y',
    tables: ['pos', 'pdtl', 'fm'],
    steps: FACILITY_STEPS,
  },
  counterparty: {
    dimension: 'counterparty',
    label: 'Counterparty',
    description: 'Facility undrawn × participation_pct, then sum by counterparty',
    tables: ['pos', 'pdtl', 'fm', 'fcp'],
    steps: COUNTERPARTY_STEPS,
  },
  L3: {
    dimension: 'L3',
    label: 'Desk (L3)',
    description: 'Aggregate facility undrawn by L3 LoB via enterprise_business_taxonomy',
    tables: ['pos', 'pdtl', 'fm', 'ebt'],
    steps: L3_STEPS,
  },
  L2: {
    dimension: 'L2',
    label: 'Portfolio (L2)',
    description: 'Aggregate facility undrawn by L2 LoB via enterprise_business_taxonomy',
    tables: ['pos', 'pdtl', 'fm', 'ebt'],
    steps: L2_STEPS,
  },
  L1: {
    dimension: 'L1',
    label: 'Business Segment (L1)',
    description: 'Aggregate facility undrawn by L1 LoB via enterprise_business_taxonomy',
    tables: ['pos', 'pdtl', 'fm', 'ebt'],
    steps: L1_STEPS,
  },
};

export const PYTHON_FORMULAS: Record<CalculationDimension, string> = {
  facility: `def undrawn_exposure_facility_level(
    as_of_date: pd.Timestamp,
    facility_master: pd.DataFrame,
    position: pd.DataFrame,
    position_detail: pd.DataFrame,
) -> pd.DataFrame:
    pos = position.loc[
        position["as_of_date"] == as_of_date,
        ["position_id", "facility_id"]
    ].drop_duplicates()

    pdtl = position_detail.loc[
        position_detail["as_of_date"] == as_of_date,
        ["position_id", "unfunded_amount"]
    ].copy()
    pdtl["unfunded_amount"] = pdtl["unfunded_amount"].fillna(0.0)

    j = pos.merge(pdtl, on="position_id", how="inner")
    fac_sum = j.groupby("facility_id", as_index=False).agg(
        unfunded_amount_sum=("unfunded_amount", "sum")
    )
    fac_sum = fac_sum.merge(
        facility_master[["facility_id", "bank_share_pct", "facility_active_flag"]],
        on="facility_id", how="left"
    )
    fac_sum = fac_sum.loc[
        fac_sum["facility_active_flag"].astype(str).str.upper() == "Y"
    ]
    fac_sum["bank_share_pct"] = fac_sum["bank_share_pct"].fillna(0.0)
    fac_sum["undrawn_exposure_usd"] = (
        fac_sum["unfunded_amount_sum"] * fac_sum["bank_share_pct"]
    )
    return fac_sum[["facility_id", "undrawn_exposure_usd"]]`,

  counterparty: `def undrawn_exposure_counterparty_level(
    as_of_date: pd.Timestamp,
    facility_master: pd.DataFrame,
    position: pd.DataFrame,
    position_detail: pd.DataFrame,
    facility_counterparty_participation: pd.DataFrame,
) -> pd.DataFrame:
    fac = undrawn_exposure_facility_level(
        as_of_date, facility_master, position, position_detail
    )
    part = facility_counterparty_participation[
        ["facility_id", "counterparty_id", "participation_pct"]
    ].copy()
    part["participation_pct"] = part["participation_pct"].fillna(0.0)
    j = fac.merge(part, on="facility_id", how="inner")
    j["counterparty_undrawn_exposure_usd"] = (
        j["undrawn_exposure_usd"] * j["participation_pct"]
    )
    return j.groupby("counterparty_id", as_index=False).agg(
        counterparty_undrawn_exposure_usd=("counterparty_undrawn_exposure_usd", "sum")
    )`,

  L3: `def undrawn_exposure_lob_rollup(
    as_of_date: pd.Timestamp,
    facility_master: pd.DataFrame,
    position: pd.DataFrame,
    position_detail: pd.DataFrame,
    enterprise_business_taxonomy: pd.DataFrame,
    target_tree_level: str,  # "L1" | "L2" | "L3"
    target_lob_description: str,
) -> pd.DataFrame:
    node = enterprise_business_taxonomy.loc[
        (enterprise_business_taxonomy["tree_level"] == target_tree_level) &
        (enterprise_business_taxonomy["description"] == target_lob_description),
        ["managed_segment_id"]
    ]
    lob_id = node.iloc[0]["managed_segment_id"]
    fac_exp = undrawn_exposure_facility_level(...)
    fac_attr = facility_master.loc[
        facility_master["lob_segment_id"] == lob_id,
        ["facility_id", "lob_segment_id"]
    ]
    j = fac_exp.merge(fac_attr, on="facility_id", how="inner")
    return j.groupby("lob_segment_id", as_index=False).agg(
        undrawn_exposure_usd=("undrawn_exposure_usd", "sum")
    )`,

  L2: `# Same as L3, with target_tree_level="L2"`,

  L1: `# Same as L3, with target_tree_level="L1"`,
};
