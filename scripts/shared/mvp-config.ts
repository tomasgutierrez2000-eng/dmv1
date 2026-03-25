/**
 * MVP seed-data profile configuration.
 *
 * Shared by L1 and L2 generators when invoked with `--profile=mvp`.
 * Row counts are tuned for a realistic MVP demo portfolio:
 *   100 counterparties → 100 agreements → 400 facilities
 *   with proportionally scaled linking, collateral, and L2 snapshot tables.
 */

export const MVP_ROW_COUNTS: Record<string, number> = {
  /* ─── core entities ─── */
  counterparty: 100,
  legal_entity: 12,

  /* ─── agreements & facilities ─── */
  credit_agreement_master: 100,
  facility_master: 405,
  instrument_master: 50,
  instrument_identifier: 50,
  contract_master: 100,

  /* ─── hierarchies & relationships ─── */
  counterparty_hierarchy: 80,
  control_relationship: 30,
  economic_interdependence_relationship: 20,
  sccl_counterparty_group: 15,
  sccl_counterparty_group_member: 40,
  legal_entity_hierarchy: 12,

  /* ─── participation & allocation ─── */
  credit_agreement_counterparty_participation: 200,
  facility_counterparty_participation: 405,
  facility_lender_allocation: 600,

  /* ─── collateral & CRM ─── */
  collateral_asset_master: 150,
  collateral_link: 200,
  collateral_portfolio: 30,
  crm_protection_master: 80,
  protection_link: 120,
  risk_mitigant_master: 60,
  risk_mitigant_link: 100,

  /* ─── netting & margin ─── */
  netting_agreement: 40,
  netting_set: 60,
  netting_set_link: 80,
  csa_master: 40,
  margin_agreement: 40,

  /* ─── limits ─── */
  limit_rule: 50,
  limit_threshold: 100,

  /* ─── rates ─── */
  fx_rate: 20,
};

/** L2 cycle configuration */
export const MVP_L2_CYCLES = 5;

/** Story arc types for counterparties */
export type StoryArc =
  | 'STABLE_IG'
  | 'GROWING'
  | 'STEADY_HY'
  | 'DETERIORATING'
  | 'RECOVERING'
  | 'STRESSED_SECTOR'
  | 'NEW_RELATIONSHIP'
  | 'DISTRESSED';

/** Rating tier types */
export type RatingTier =
  | 'IG_HIGH'
  | 'IG_MID'
  | 'IG_LOW'
  | 'HY_HIGH'
  | 'HY_MID'
  | 'HY_LOW';

/** Size profile types */
export type SizeProfile = 'LARGE' | 'MID' | 'SMALL';

/** Rating tier → financial attributes mapping */
export const RATING_TIER_MAP: Record<RatingTier, {
  pdLow: number;
  pdHigh: number;
  spRatings: string[];
  moodysRatings: string[];
  fitchRatings: string[];
  internalGrades: string[];
  baselGrades: string[];
  lgd: number;
}> = {
  IG_HIGH: {
    pdLow: 0.0003, pdHigh: 0.0008,
    spRatings: ['AA-', 'A+'], moodysRatings: ['Aa3', 'A1'], fitchRatings: ['AA-', 'A+'],
    internalGrades: ['2', '3'], baselGrades: ['2', '3'], lgd: 0.40,
  },
  IG_MID: {
    pdLow: 0.0010, pdHigh: 0.0025,
    spRatings: ['A', 'A-'], moodysRatings: ['A2', 'A3'], fitchRatings: ['A', 'A-'],
    internalGrades: ['3', '4'], baselGrades: ['3', '4'], lgd: 0.42,
  },
  IG_LOW: {
    pdLow: 0.0030, pdHigh: 0.0060,
    spRatings: ['BBB+', 'BBB'], moodysRatings: ['Baa1', 'Baa2'], fitchRatings: ['BBB+', 'BBB'],
    internalGrades: ['4', '5'], baselGrades: ['4', '5'], lgd: 0.45,
  },
  HY_HIGH: {
    pdLow: 0.0070, pdHigh: 0.0120,
    spRatings: ['BBB-', 'BB+'], moodysRatings: ['Baa3', 'Ba1'], fitchRatings: ['BBB-', 'BB+'],
    internalGrades: ['5', '6'], baselGrades: ['5', '6'], lgd: 0.48,
  },
  HY_MID: {
    pdLow: 0.0150, pdHigh: 0.0300,
    spRatings: ['BB', 'BB-'], moodysRatings: ['Ba2', 'Ba3'], fitchRatings: ['BB', 'BB-'],
    internalGrades: ['6', '7'], baselGrades: ['6', '7'], lgd: 0.55,
  },
  HY_LOW: {
    pdLow: 0.0350, pdHigh: 0.0600,
    spRatings: ['B+', 'B'], moodysRatings: ['B1', 'B2'], fitchRatings: ['B+', 'B'],
    internalGrades: ['7', '8'], baselGrades: ['7', '8'], lgd: 0.60,
  },
};

/** Story arc → PD multiplier path across 5 cycles */
export const STORY_PD_MULTIPLIERS: Record<StoryArc, number[]> = {
  STABLE_IG:        [1.00, 1.00, 1.05, 1.02, 1.00],
  GROWING:          [1.00, 0.95, 0.90, 0.85, 0.82],
  STEADY_HY:        [1.00, 1.03, 0.98, 1.02, 1.00],
  DETERIORATING:    [1.00, 1.30, 1.80, 2.20, 2.00],
  RECOVERING:       [1.80, 1.50, 1.20, 0.95, 0.80],
  STRESSED_SECTOR:  [1.00, 1.40, 2.00, 1.60, 1.30],
  NEW_RELATIONSHIP: [1.00, 1.00, 1.00, 0.98, 0.95],
  DISTRESSED:       [1.00, 2.50, 5.00, 8.00, 12.00],
};

/** Story arc → utilization ratio path across 5 cycles (fraction of committed) */
export const STORY_UTILIZATION: Record<StoryArc, number[]> = {
  STABLE_IG:        [0.48, 0.50, 0.49, 0.47, 0.48],
  GROWING:          [0.40, 0.45, 0.50, 0.55, 0.58],
  STEADY_HY:        [0.60, 0.62, 0.58, 0.61, 0.60],
  DETERIORATING:    [0.55, 0.65, 0.80, 0.85, 0.82],
  RECOVERING:       [0.75, 0.70, 0.60, 0.50, 0.45],
  STRESSED_SECTOR:  [0.50, 0.60, 0.78, 0.70, 0.62],
  NEW_RELATIONSHIP: [0.30, 0.35, 0.38, 0.42, 0.45],
  DISTRESSED:       [0.60, 0.78, 0.92, 0.95, 0.88],
};

/** Story arc → spread multiplier path across 5 cycles */
export const STORY_SPREAD_MULTIPLIERS: Record<StoryArc, number[]> = {
  STABLE_IG:        [1.00, 1.00, 1.02, 1.01, 1.00],
  GROWING:          [1.00, 0.98, 0.95, 0.93, 0.92],
  STEADY_HY:        [1.00, 1.02, 0.99, 1.01, 1.00],
  DETERIORATING:    [1.00, 1.10, 1.30, 1.40, 1.35],
  RECOVERING:       [1.30, 1.20, 1.10, 1.02, 0.98],
  STRESSED_SECTOR:  [1.00, 1.15, 1.35, 1.25, 1.15],
  NEW_RELATIONSHIP: [1.00, 1.00, 0.98, 0.97, 0.95],
  DISTRESSED:       [1.00, 1.30, 1.80, 2.20, 2.50],
};

/** Story arc → credit status across 5 cycles */
export const STORY_CREDIT_STATUS: Record<StoryArc, string[]> = {
  STABLE_IG:        ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING'],
  GROWING:          ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING'],
  STEADY_HY:        ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING'],
  DETERIORATING:    ['PERFORMING', 'WATCH', 'SPECIAL_MENTION', 'SUBSTANDARD', 'SUBSTANDARD'],
  RECOVERING:       ['WATCH', 'WATCH', 'PERFORMING', 'PERFORMING', 'PERFORMING'],
  STRESSED_SECTOR:  ['PERFORMING', 'WATCH', 'SPECIAL_MENTION', 'WATCH', 'PERFORMING'],
  NEW_RELATIONSHIP: ['PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING', 'PERFORMING'],
  DISTRESSED:       ['PERFORMING', 'SUBSTANDARD', 'DEFAULT', 'DEFAULT', 'DEFAULT'],
};

/** Story arc → days past due across 5 cycles */
export const STORY_DPD: Record<StoryArc, number[]> = {
  STABLE_IG:        [0, 0, 0, 0, 0],
  GROWING:          [0, 0, 0, 0, 0],
  STEADY_HY:        [0, 0, 5, 0, 0],
  DETERIORATING:    [0, 15, 32, 60, 45],
  RECOVERING:       [30, 18, 8, 0, 0],
  STRESSED_SECTOR:  [0, 10, 25, 12, 5],
  NEW_RELATIONSHIP: [0, 0, 0, 0, 0],
  DISTRESSED:       [0, 60, 95, 120, 150],
};
