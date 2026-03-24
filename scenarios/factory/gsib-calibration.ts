/**
 * GSIB Calibration Tables — realistic value ranges for GSIB credit risk data.
 *
 * These ranges are used by:
 *   - SchemaAnalyzer: to build schema contracts with GSIB-appropriate ranges
 *   - StoryWeaver: to derive values consistent with health states
 *   - EnhancedValidator: to flag unrealistic values
 *   - ScenarioObserver: to verify distribution health
 *
 * Sources: Basel III IRB parameters, FFIEC Call Report guidance, OCC 2020-36,
 * industry calibration studies, CLAUDE.md sanity tables.
 */

/* ────────────────── PD Calibration ────────────────── */

export type RatingTierName =
  | 'INVESTMENT_GRADE'
  | 'STANDARD'
  | 'SUBSTANDARD'
  | 'DOUBTFUL'
  | 'LOSS';

export interface PDRange {
  min: number;  // percentage (e.g., 0.03 = 0.03%)
  max: number;
  description: string;
}

/**
 * PD bands by rating tier — Basel III IRB calibration.
 * Values in percentage (0.03 = 0.03%).
 */
export const PD_BY_RATING_TIER: Record<RatingTierName, PDRange> = {
  INVESTMENT_GRADE: { min: 0.01, max: 0.40, description: 'AAA to BBB- (low default risk)' },
  STANDARD:         { min: 0.40, max: 2.0,  description: 'BB+ to BB- (moderate risk)' },
  SUBSTANDARD:      { min: 2.0,  max: 10.0, description: 'B+ to B- (elevated risk)' },
  DOUBTFUL:         { min: 10.0, max: 30.0, description: 'CCC to CC (high default risk)' },
  LOSS:             { min: 30.0, max: 100.0, description: 'C to D (impaired/default)' },
};

/**
 * Map S&P-style rating to tier name.
 */
export const RATING_TO_TIER: Record<string, RatingTierName> = {
  'AAA': 'INVESTMENT_GRADE', 'AA+': 'INVESTMENT_GRADE', 'AA': 'INVESTMENT_GRADE',
  'AA-': 'INVESTMENT_GRADE', 'A+': 'INVESTMENT_GRADE', 'A': 'INVESTMENT_GRADE',
  'A-': 'INVESTMENT_GRADE', 'BBB+': 'INVESTMENT_GRADE', 'BBB': 'INVESTMENT_GRADE',
  'BBB-': 'INVESTMENT_GRADE',
  'BB+': 'STANDARD', 'BB': 'STANDARD', 'BB-': 'STANDARD',
  'B+': 'SUBSTANDARD', 'B': 'SUBSTANDARD', 'B-': 'SUBSTANDARD',
  'CCC': 'DOUBTFUL', 'CC': 'DOUBTFUL',
  'C': 'LOSS', 'D': 'LOSS',
};

/* ────────────────── LGD Calibration ────────────────── */

export type CollateralClass =
  | 'SENIOR_SECURED'
  | 'SENIOR_UNSECURED'
  | 'SUBORDINATED'
  | 'JUNIOR_SUBORDINATED';

export const LGD_BY_COLLATERAL: Record<CollateralClass, { min: number; max: number }> = {
  SENIOR_SECURED:       { min: 20.0, max: 45.0 },
  SENIOR_UNSECURED:     { min: 35.0, max: 55.0 },
  SUBORDINATED:         { min: 50.0, max: 75.0 },
  JUNIOR_SUBORDINATED:  { min: 65.0, max: 90.0 },
};

/* ────────────────── Utilization ────────────────── */

export type HealthState =
  | 'PERFORMING'
  | 'WATCH'
  | 'DETERIORATING'
  | 'STRESSED'
  | 'DISTRESSED'
  | 'DEFAULT'
  | 'RECOVERY';

export const UTILIZATION_BY_HEALTH: Record<HealthState, { min: number; max: number; typical: number }> = {
  PERFORMING:    { min: 10, max: 65, typical: 35 },
  WATCH:         { min: 30, max: 75, typical: 55 },
  DETERIORATING: { min: 50, max: 85, typical: 70 },
  STRESSED:      { min: 65, max: 95, typical: 82 },
  DISTRESSED:    { min: 80, max: 100, typical: 93 },
  DEFAULT:       { min: 85, max: 100, typical: 95 },
  RECOVERY:      { min: 40, max: 80, typical: 60 },
};

/* ────────────────── Spread (bps) ────────────────── */

export const SPREAD_BY_RATING_TIER: Record<RatingTierName, { min: number; max: number }> = {
  INVESTMENT_GRADE: { min: 50, max: 200 },
  STANDARD:         { min: 150, max: 400 },
  SUBSTANDARD:      { min: 300, max: 700 },
  DOUBTFUL:         { min: 500, max: 1200 },
  LOSS:             { min: 800, max: 2000 },
};

/* ────────────────── DPD Buckets ────────────────── */

/**
 * FFIEC-aligned DPD bucket codes.
 */
export const DPD_BUCKETS = ['CURRENT', '1-29', '30-59', '60-89', '90+'] as const;
export type DPDBucket = typeof DPD_BUCKETS[number];

export const DPD_BUCKET_RANGES: Record<DPDBucket, { minDays: number; maxDays: number }> = {
  'CURRENT': { minDays: 0, maxDays: 0 },
  '1-29':    { minDays: 1, maxDays: 29 },
  '30-59':   { minDays: 30, maxDays: 59 },
  '60-89':   { minDays: 60, maxDays: 89 },
  '90+':     { minDays: 90, maxDays: 999 },
};

/**
 * Expected DPD bucket progression by health state.
 * Worsening trajectory must progress DPD buckets forward.
 */
export const DPD_BY_HEALTH: Record<HealthState, DPDBucket[]> = {
  PERFORMING:    ['CURRENT'],
  WATCH:         ['CURRENT', '1-29'],
  DETERIORATING: ['CURRENT', '1-29', '30-59'],
  STRESSED:      ['1-29', '30-59', '60-89'],
  DISTRESSED:    ['30-59', '60-89', '90+'],
  DEFAULT:       ['90+'],
  RECOVERY:      ['30-59', '60-89', '90+', 'CURRENT'],
};

/* ────────────────── EL Rate ────────────────── */

export const EL_RATE_RANGES: Record<RatingTierName, { min: number; max: number }> = {
  INVESTMENT_GRADE: { min: 0.001, max: 0.50 },
  STANDARD:         { min: 0.10, max: 2.0 },
  SUBSTANDARD:      { min: 0.50, max: 5.0 },
  DOUBTFUL:         { min: 2.0, max: 15.0 },
  LOSS:             { min: 10.0, max: 100.0 },
};

/* ────────────────── Other Metric Ranges ────────────────── */

export const METRIC_RANGES = {
  dscr:            { min: 0.5, max: 5.0, healthyMin: 1.25, warningMin: 1.0 },
  ltv_pct:         { min: 0, max: 300, healthyMax: 65, warningMax: 80 },
  exception_rate:  { min: 0, max: 100, healthyMax: 5, warningMax: 15 },
  risk_weight_pct: { min: 0, max: 1250, typicalIG: 50, typicalHY: 100 },
} as const;

/* ────────────────── Temporal Constraints ────────────────── */

/**
 * Maximum allowed month-over-month changes for key fields.
 * Used by validators and story weaver to ensure continuity.
 */
export const TEMPORAL_LIMITS = {
  /** PD cannot change by more than this factor in one month (e.g., 3.0 = 300%) */
  pd_max_monthly_factor: 3.0,
  /** Rating cannot move more than N notches per month */
  rating_max_notch_change: 3,
  /** Utilization cannot change by more than N% absolute per month */
  utilization_max_monthly_absolute: 25,
  /** Spread cannot change by more than N bps per month */
  spread_max_monthly_bps: 200,
  /** DPD bucket cannot skip more than 1 bucket per month (except for events) */
  dpd_max_bucket_skip: 1,
} as const;

/* ────────────────── Column Name → GSIB Range Mapping ────────────────── */

/**
 * Auto-detect GSIB range from column name suffix/pattern.
 * Used when no explicit calibration is available.
 */
export function inferGSIBRange(columnName: string, dataType: string): { min: number; max: number } | null {
  const name = columnName.toLowerCase();

  // PD
  if (name === 'pd_pct' || name === 'pd_annual' || name.endsWith('_pd_pct'))
    return { min: 0, max: 100 };

  // LGD
  if (name === 'lgd_pct' || name.endsWith('_lgd_pct'))
    return { min: 0, max: 100 };

  // Risk weight
  if (name.includes('risk_weight') && name.endsWith('_pct'))
    return { min: 0, max: 1250 };

  // Generic percentage
  if (name.endsWith('_pct') && dataType.startsWith('NUMERIC'))
    return { min: 0, max: 100 };

  // Basis points
  if (name.endsWith('_bps'))
    return { min: 0, max: 5000 };

  // Amounts (non-negative)
  if (name.endsWith('_amt') && dataType.startsWith('NUMERIC'))
    return { min: 0, max: 1e12 };

  // Counts (non-negative)
  if (name.endsWith('_count'))
    return { min: 0, max: 1e9 };

  // Ratios (like DSCR, coverage)
  if (name.includes('ratio') || name.includes('dscr'))
    return { min: 0, max: 50 };

  // LTV
  if (name.includes('ltv'))
    return { min: 0, max: 500 };

  return null;
}

/**
 * Determine correlation group for a column.
 * Columns in the same group must co-vary (e.g., PD and rating must agree).
 */
export function inferCorrelationGroup(columnName: string): string | null {
  const name = columnName.toLowerCase();

  if (name.includes('pd_') || name.includes('risk_rating') || name.includes('credit_status'))
    return 'pd_rating';

  if (name.includes('drawn') || name.includes('utilization') || name.includes('committed') || name.includes('undrawn'))
    return 'utilization';

  if (name.includes('spread') || name.includes('pricing') || name.includes('all_in_rate'))
    return 'pricing';

  if (name.includes('dpd') || name.includes('delinquency') || name.includes('past_due'))
    return 'delinquency';

  if (name.includes('collateral') || name.includes('ltv'))
    return 'collateral';

  return null;
}
