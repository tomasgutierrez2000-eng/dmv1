/**
 * L2 Generator — produces time-series atomic data using story arc curves.
 *
 * Generates exposure snapshots, rating observations, credit events, risk flags,
 * and other L2 tables driven by the story arc assigned to each counterparty.
 *
 * Uses the same story arc curves from scripts/shared/mvp-config.ts to ensure
 * consistency with seed data behavior patterns.
 */

import {
  STORY_UTILIZATION,
  STORY_PD_MULTIPLIERS,
  STORY_SPREAD_MULTIPLIERS,
  STORY_CREDIT_STATUS,
  STORY_DPD,
  RATING_TIER_MAP,
} from '../../scripts/shared/mvp-config';
import type { StoryArc, RatingTier } from '../../scripts/shared/mvp-config';
import type { L1Chain } from './chain-builder';
import type { EnrichedCounterparty, EnrichedFacility } from './gsib-enrichment';
import type { ScenarioConfig, CreditEventConfig, RiskFlagConfig, AmendmentConfig } from './scenario-config';
import type { IDRegistry } from './id-registry';

/* ────────────────── Output Types ────────────────── */

export interface ExposureRow {
  facility_exposure_id: number;
  facility_id: number;
  counterparty_id: number;
  as_of_date: string;
  exposure_type_id: number;
  drawn_amount: number;
  committed_amount: number;
  undrawn_amount: number;
  currency_code: string;
  limit_status_code: string;
}

export interface RatingObservationRow {
  observation_id: number;
  counterparty_id: number;
  as_of_date: string;
  rating_type: string;
  rating_value: string;
  rating_grade_id: number;
  is_internal_flag: string;
  pd_implied: string;
  rating_source_id: number;
}

export interface CreditEventRow {
  credit_event_id: number;
  counterparty_id: number;
  credit_event_type_code: number;
  event_date: string;
  event_summary: string;
  event_status: string;
}

export interface EventFacilityLinkRow {
  link_id: number;
  credit_event_id: number;
  facility_id: number;
}

export interface RiskFlagRow {
  risk_flag_id: number;
  facility_id: number | null;
  counterparty_id: number | null;
  flag_type: string;
  flag_code: string;
  flag_severity: string;
  as_of_date: string;
  flag_description: string;
}

export interface AmendmentEventRow {
  amendment_id: number;
  facility_id: number;
  credit_agreement_id: number;
  counterparty_id: number;
  amendment_type_code: string;
  amendment_status_code: string;
  effective_date: string;
  amendment_description: string;
}

export interface CollateralSnapshotRow {
  collateral_asset_id: number;
  counterparty_id: number;
  as_of_date: string;
  original_valuation_usd: number;
  current_valuation_usd: number;
}

export interface StressTestResultRow {
  result_id: number;
  scenario_id: number;
  as_of_date: string;
  loss_amount: number;
  result_status: string;
  result_description: string;
}

export interface StressTestBreachRow {
  breach_id: number;
  scenario_id: number;
  as_of_date: string;
  stress_test_result_id: number;
  counterparty_id: number;
  breach_amount_usd: number;
  breach_severity: string;
}

export interface DelinquencyRow {
  facility_id: number;
  counterparty_id: number;
  as_of_date: string;
  credit_status_code: number;
  days_past_due: number;
  delinquency_status_code: string;
}

export interface LimitContributionRow {
  limit_rule_id: number;
  counterparty_id: number;
  as_of_date: string;
  contribution_amount_usd: number;
  contribution_pct: number;
}

export interface LimitUtilizationRow {
  counterparty_id: number;
  limit_rule_id: number;
  as_of_date: string;
  utilized_amount: number;
  available_amount: number;
}

export interface DealPipelineRow {
  pipeline_id: number;
  counterparty_id: number;
  facility_id: number;
  as_of_date: string;
  pipeline_stage: string;
  proposed_amount: number;
  expected_close_date: string;
}

export interface DataQualityRow {
  score_id: number;
  dimension_name: string;
  as_of_date: string;
  completeness_score: number;
  validity_score: number;
  timeliness_score: number;
  overall_score: number;
}

export interface ExposureAttributionRow {
  attribution_id: number;
  counterparty_id: number;
  facility_id: number;
  as_of_date: string;
  exposure_type_id: number;
  counterparty_role_code: string;
  attributed_exposure_usd: number;
  attribution_pct: number;
}

/* ────────────────── New L2 Table Row Types ────────────────── */

export interface FacilityPricingRow {
  facility_id: number;
  as_of_date: string;
  spread_bps: number;
  rate_index_id: number;
  all_in_rate_pct: number;
  base_rate_pct: number;
  currency_code: string;
  facility_pricing_id: number;
  fee_rate_pct: number;
  cost_of_funds_pct: number;
  payment_frequency: string;
  is_prepayment_penalty_flag: string;
}

export interface FacilityRiskRow {
  facility_id: number;
  as_of_date: string;
  counterparty_id: number;
  pd_pct: number;
  lgd_pct: number;
  ccf: number;
  ead_amt: number;
  expected_loss_amt: number;
  rwa_amt: number;
  risk_weight_pct: number;
  internal_risk_rating: string;
  currency_code: string;
}

export interface FacilityFinancialRow {
  facility_id: number;
  as_of_date: string;
  counterparty_id: number;
  currency_code: string;
  reporting_period: string;
  revenue_amt: number;
  operating_expense_amt: number;
  ebitda_amt: number;
  total_debt_service_amt: number;
  interest_expense_amt: number;
  principal_payment_amt: number;
  net_income_amt: number;
  dscr_value: number;
  ltv_pct: number;
}

export interface PositionRow {
  position_id: number;
  as_of_date: string;
  facility_id: number;
  instrument_id: number;
  position_type: string;
  balance_amount: number;
  currency_code: string;
  source_system_id: number;
  counterparty_id: number;
  credit_agreement_id: number;
  credit_status_code: string;
  exposure_type_code: string;
  internal_risk_rating: string;
  external_risk_rating: string;
  notional_amount: number;
  is_trading_banking_book_flag: string;
  product_node_id: number;
}

export interface PositionDetailRow {
  position_detail_id: number;
  position_id: number;
  as_of_date: string;
  detail_type: string;
  amount: number;
  current_balance: number;
  funded_amount: number;
  unfunded_amount: number;
  total_commitment: number;
  interest_rate: number;
  days_past_due: number;
  delinquency_status: string;
  spread_bps: number;
  exposure_type_code: string;
  notional_amount: number;
  is_delinquent_payment_flag: string;
}

export interface CashFlowRow {
  cash_flow_id: number;
  facility_id: number;
  counterparty_id: number;
  cash_flow_date: string;
  cash_flow_type: string;
  amount: number;
  currency_code: string;
  as_of_date: string;
  flow_direction: string;
  flow_type: string;
}

export interface FacilityLobAttributionRow {
  attribution_id: number;
  facility_id: number;
  as_of_date: string;
  lob_segment_id: number;
  attribution_pct: number;
  attributed_amount: number;
  attribution_amount_usd: number;
  attribution_type: string;
}

export interface CounterpartyFinancialRow {
  financial_snapshot_id: number;
  counterparty_id: number;
  as_of_date: string;
  reporting_period: string;
  currency_code: string;
  revenue_amt: number;
  operating_expense_amt: number;
  net_income_amt: number;
  interest_expense_amt: number;
  total_assets_amt: number;
  total_liabilities_amt: number;
  shareholders_equity_amt: number;
  ebitda_amt: number;
  total_debt_service_amt: number;
}

export interface FacilityProfitabilityRow {
  facility_id: number;
  as_of_date: string;
  interest_income_amt: number;
  interest_expense_amt: number;
  fee_income_amt: number;
  nii_ytd: number;
  fee_income_ytd: number;
  ledger_account_id: number;
  base_currency_code: string;
}

export interface AmendmentChangeDetailRow {
  change_detail_id: number;
  amendment_id: number;
  change_type: string;
  old_value: string;
  new_value: string;
  change_field_name: string;
  change_seq: number;
}

export interface ExceptionEventRow {
  exception_id: number;
  as_of_date: string;
  exception_type: string;
  facility_id: number;
  counterparty_id: number;
  exception_status: string;
  exception_severity: string;
  exception_description: string;
  breach_amount_usd: number;
  breach_pct: number;
  identified_date: string;
  days_open: number;
}

export interface FacilityCreditApprovalRow {
  approval_id: number;
  facility_id: number;
  counterparty_id: number;
  as_of_date: string;
  approval_status: string;
  approval_date: string;
  approved_amount: number;
  is_exception_flag: string;
}

export interface FinancialMetricObservationRow {
  observation_id: number;
  counterparty_id: number;
  facility_id: number;
  as_of_date: string;
  metric_definition_id: number;
  metric_code: string;
  metric_name: string;
  metric_value: number;
  context_id: number;
}

export interface NettingSetExposureRow {
  netting_set_id: number;
  as_of_date: string;
  netted_exposure_amount: number;
  gross_exposure_amount: number;
  currency_code: string;
  counterparty_id: number;
  netting_set_exposure_id: number;
  netting_benefit_amt: number;
  pfe_usd: number;
}

export interface MetricThresholdL2Row {
  threshold_id: number;
  metric_definition_id: number;
  as_of_date: string;
  threshold_value: number;
  threshold_type: string;
}

export interface L2Data {
  facility_exposure_snapshot?: ExposureRow[];
  counterparty_rating_observation?: RatingObservationRow[];
  credit_event?: CreditEventRow[];
  credit_event_facility_link?: EventFacilityLinkRow[];
  risk_flag?: RiskFlagRow[];
  amendment_event?: AmendmentEventRow[];
  collateral_snapshot?: CollateralSnapshotRow[];
  stress_test_result?: StressTestResultRow[];
  stress_test_breach?: StressTestBreachRow[];
  facility_delinquency_snapshot?: DelinquencyRow[];
  limit_contribution_snapshot?: LimitContributionRow[];
  limit_utilization_event?: LimitUtilizationRow[];
  deal_pipeline_fact?: DealPipelineRow[];
  data_quality_score_snapshot?: DataQualityRow[];
  exposure_counterparty_attribution?: ExposureAttributionRow[];
  // New tables
  facility_pricing_snapshot?: FacilityPricingRow[];
  facility_risk_snapshot?: FacilityRiskRow[];
  facility_financial_snapshot?: FacilityFinancialRow[];
  position?: PositionRow[];
  position_detail?: PositionDetailRow[];
  cash_flow?: CashFlowRow[];
  facility_lob_attribution?: FacilityLobAttributionRow[];
  counterparty_financial_snapshot?: CounterpartyFinancialRow[];
  facility_profitability_snapshot?: FacilityProfitabilityRow[];
  amendment_change_detail?: AmendmentChangeDetailRow[];
  exception_event?: ExceptionEventRow[];
  facility_credit_approval?: FacilityCreditApprovalRow[];
  financial_metric_observation?: FinancialMetricObservationRow[];
  netting_set_exposure_snapshot?: NettingSetExposureRow[];
  metric_threshold?: MetricThresholdL2Row[];
}

/* ────────────────── PRNG helpers ────────────────── */

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/* ────────────────── Risk Weight by Tier ────────────────── */

const TIER_BASE_RW: Record<RatingTier, number> = {
  IG_HIGH: 50, IG_MID: 75, IG_LOW: 100,
  HY_HIGH: 100, HY_MID: 125, HY_LOW: 150,
};

/* ────────────────── Internal / External Rating Labels ────────────────── */

const TIER_INT_RATINGS: Record<RatingTier, string[]> = {
  IG_HIGH: ['AA-', 'AA', 'A+', 'AA-', 'AA'],
  IG_MID:  ['A', 'A-', 'A+', 'A', 'A-'],
  IG_LOW:  ['BBB+', 'BBB', 'BBB+', 'BBB-', 'BBB'],
  HY_HIGH: ['BB+', 'BB', 'BB+', 'BBB-', 'BB+'],
  HY_MID:  ['BB', 'BB-', 'B+', 'BB-', 'BB'],
  HY_LOW:  ['B+', 'B', 'B-', 'B', 'B+'],
};

const TIER_EXT_RATINGS: Record<RatingTier, string[]> = {
  IG_HIGH: ['Aa3', 'Aa2', 'A1', 'Aa3', 'Aa2'],
  IG_MID:  ['A2', 'A3', 'A1', 'A2', 'A3'],
  IG_LOW:  ['Baa1', 'Baa2', 'Baa1', 'Baa3', 'Baa2'],
  HY_HIGH: ['Ba1', 'Ba2', 'Ba1', 'Baa3', 'Ba1'],
  HY_MID:  ['Ba2', 'Ba3', 'B1', 'Ba3', 'Ba2'],
  HY_LOW:  ['B1', 'B2', 'B3', 'B2', 'B1'],
};

const RATING_MIGRATION: Record<StoryArc, number[]> = {
  STABLE_IG:        [0, 0, 0],
  GROWING:          [0, 0, 1],
  STEADY_HY:        [0, 0, 0],
  DETERIORATING:    [0, 1, 2],
  RECOVERING:       [2, 1, 0],
  STRESSED_SECTOR:  [0, 1, 1],
  NEW_RELATIONSHIP: [0, 0, 0],
};

/* ────────────────── Event Type → BIGINT Mapping ────────────────── */

const EVENT_TYPE_MAP: Record<string, number> = {
  DEFAULT: 1, FAILURE_TO_PAY: 1,
  BANKRUPTCY: 2,
  OBLIGATION_ACCELERATION: 3,
  OBLIGATION_DEFAULT: 4,
  RESTRUCTURING: 5, AMENDMENT: 5,
  REPUDIATION: 6,
  GOVERNMENTAL_INTERVENTION: 7,
  CROSS_DEFAULT: 8,
  DISTRESSED_EXCHANGE: 9,
  DOWNGRADE: 10, RATING_DOWNGRADE: 10,
};

/* Credit status code BIGINT mapping (for delinquency snapshot) */
function dpdToStatusCode(dpd: number): number {
  if (dpd === 0) return 1;   // PERFORMING / CURRENT
  if (dpd < 30) return 3;    // WATCH
  if (dpd < 60) return 4;    // SPECIAL_MENTION
  if (dpd < 90) return 5;    // SUBSTANDARD
  if (dpd < 180) return 9;   // DOUBTFUL
  return 10;                  // DEFAULT
}

/* ────────────────── Main L2 Generator ────────────────── */

/**
 * Generate all L2 data for a scenario based on its config and L1 chain.
 * Uses story arc curves for realistic time-series behavior.
 */
export function generateL2Data(
  chain: L1Chain,
  config: ScenarioConfig,
  registry: IDRegistry,
): L2Data {
  const data: L2Data = {};

  // Map counterparty IDs to their profiles for story arc lookup
  const cpProfileMap = new Map<number, { arc: StoryArc; tier: RatingTier }>();
  config.counterparties.forEach((p, i) => {
    cpProfileMap.set(chain.counterparties[i].counterparty_id, {
      arc: p.story_arc,
      tier: p.rating_tier,
    });
  });

  // ── 1. Exposure Snapshots (always generated) ──
  data.facility_exposure_snapshot = generateExposures(chain, config, cpProfileMap);

  // ── 2. Rating Observations (for DETERIORATION_TREND, RATING_DIVERGENCE, EVENT_CASCADE) ──
  if (shouldGenerateRatings(config)) {
    data.counterparty_rating_observation = generateRatings(chain, config, cpProfileMap);
  }

  // ── 3. Credit Events ──
  if (config.events?.credit_events && config.events.credit_events.length > 0) {
    const result = generateCreditEvents(chain, config, registry);
    data.credit_event = result.events;
    data.credit_event_facility_link = result.links;
  }

  // ── 4. Risk Flags ──
  if (config.events?.risk_flags && config.events.risk_flags.length > 0) {
    data.risk_flag = generateRiskFlags(chain, config, registry);
  }

  // ── 5. Amendments ──
  if (config.events?.amendments && config.events.amendments.length > 0) {
    data.amendment_event = generateAmendments(chain, config, registry);
  }

  // ── 6. Collateral Snapshots ──
  if (config.type === 'COLLATERAL_DECLINE' && chain.collateral_assets) {
    data.collateral_snapshot = generateCollateralSnapshots(chain, config);
  }

  // ── 7. Stress Test Results ──
  if (config.stress_test) {
    const result = generateStressTest(chain, config, registry);
    data.stress_test_result = result.results;
    data.stress_test_breach = result.breaches;
  }

  // ── 8. Delinquency Snapshots ──
  if (config.type === 'DELINQUENCY_TREND') {
    data.facility_delinquency_snapshot = generateDelinquency(chain, config, cpProfileMap);
  }

  // ── 9. Limit Contributions ──
  if (config.limit && config.type === 'EXPOSURE_BREACH') {
    data.limit_contribution_snapshot = generateLimitContributions(chain, config);
    data.limit_utilization_event = generateLimitUtilization(chain, config);
  }

  // ── 10. Deal Pipeline ──
  if (config.type === 'PIPELINE_SPIKE') {
    data.deal_pipeline_fact = generateDealPipeline(chain, config, registry);
  }

  // ── 11. Syndicated Attribution ──
  if (config.type === 'SYNDICATED_FACILITY') {
    data.exposure_counterparty_attribution = generateAttribution(chain, config);
  }

  // ── 12. Always-on tables ──
  data.facility_pricing_snapshot = generateFacilityPricing(chain, config, cpProfileMap);
  data.facility_risk_snapshot = generateFacilityRisk(chain, config, cpProfileMap);
  data.facility_financial_snapshot = generateFacilityFinancial(chain, config, cpProfileMap);
  const positions = generatePositions(chain, config, cpProfileMap);
  data.position = positions;
  data.position_detail = generatePositionDetails(positions, chain, config, cpProfileMap);
  data.cash_flow = generateCashFlows(chain, config, cpProfileMap);
  data.facility_lob_attribution = generateLobAttribution(chain, config, cpProfileMap);

  // ── 13. Conditional tables ──

  // Counterparty financial snapshot
  if (['DETERIORATION_TREND', 'LEVERAGED_FINANCE'].includes(config.type)
    || config.l2_tables?.counterparty_financial_snapshot?.generate === true) {
    data.counterparty_financial_snapshot = generateCounterpartyFinancial(chain, config, cpProfileMap);
  }

  // Facility profitability
  if (['PRODUCT_MIX', 'LEVERAGED_FINANCE'].includes(config.type)
    || config.l2_tables?.facility_profitability_snapshot?.generate === true) {
    data.facility_profitability_snapshot = generateFacilityProfitability(chain, config, cpProfileMap);
  }

  // Amendment change details (when amendments exist)
  if ((l2Data_amendment_event_length(data)) > 0) {
    data.amendment_change_detail = generateAmendmentChangeDetails(data);
  }

  // Exception events
  if (['EXPOSURE_BREACH', 'BREACH_RESOLUTION'].includes(config.type)
    || config.l2_tables?.exception_event?.generate === true) {
    data.exception_event = generateExceptionEvents(chain, config);
  }

  // Credit approvals
  if (['PIPELINE_SPIKE'].includes(config.type)
    || config.l2_tables?.facility_credit_approval?.generate === true) {
    data.facility_credit_approval = generateFacilityCreditApprovals(chain, config);
  }

  // Financial metric observations
  if (['DATA_QUALITY', 'REGULATORY_NEAR_MISS'].includes(config.type)
    || config.l2_tables?.financial_metric_observation?.generate === true) {
    data.financial_metric_observation = generateFinancialMetricObservations(chain, config, cpProfileMap);
  }

  // Netting set exposure
  if (['SYNDICATED_FACILITY'].includes(config.type)
    || config.l2_tables?.netting_set_exposure_snapshot?.generate === true) {
    data.netting_set_exposure_snapshot = generateNettingSetExposure(chain, config);
  }

  // Metric thresholds (L2)
  if (['REGULATORY_NEAR_MISS'].includes(config.type)
    || config.l2_tables?.metric_threshold?.generate === true) {
    data.metric_threshold = generateMetricThresholds(config);
  }

  return data;
}

/** Helper to safely get amendment_event length from partially-built L2Data */
function l2Data_amendment_event_length(data: L2Data): number {
  return data.amendment_event?.length ?? 0;
}

/* ────────────────── Exposure Generator ────────────────── */

let _exposureIdCounter = 200000;

function generateExposures(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): ExposureRow[] {
  const rows: ExposureRow[] = [];
  const dates = config.timeline.as_of_dates;

  for (const facility of chain.facilities) {
    const profile = cpProfileMap.get(facility.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const utilRate = STORY_UTILIZATION[arc][cycleIdx];

      const committed = facility.committed_facility_amt;
      const drawn = Math.round(committed * utilRate);
      const undrawn = committed - drawn;

      let limitStatus = 'WITHIN_LIMIT';
      if (utilRate > 0.95) limitStatus = 'BREACHED';
      else if (utilRate > 0.85) limitStatus = 'APPROACHING';

      _exposureIdCounter++;
      rows.push({
        facility_exposure_id: _exposureIdCounter,
        facility_id: facility.facility_id,
        counterparty_id: facility.counterparty_id,
        as_of_date: dates[dateIdx],
        exposure_type_id: 1,
        drawn_amount: drawn,
        committed_amount: committed,
        undrawn_amount: undrawn,
        currency_code: facility.currency_code,
        limit_status_code: limitStatus,
      });
    }
  }

  return rows;
}

/* ────────────────── Rating Generator ────────────────── */

function shouldGenerateRatings(config: ScenarioConfig): boolean {
  return ['DETERIORATION_TREND', 'RATING_DIVERGENCE', 'EVENT_CASCADE'].includes(config.type)
    || config.l2_tables?.counterparty_rating_observation?.generate === true;
}

let _observationIdCounter = 50000;

function generateRatings(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): RatingObservationRow[] {
  const rows: RatingObservationRow[] = [];
  const dates = config.timeline.as_of_dates;

  for (const cp of chain.counterparties) {
    const profile = cpProfileMap.get(cp.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const tier = profile?.tier ?? 'IG_MID';
    const migration = RATING_MIGRATION[arc];
    const intRatings = TIER_INT_RATINGS[tier];
    const extRatings = TIER_EXT_RATINGS[tier];
    const tierData = RATING_TIER_MAP[tier];

    // Check for explicit before/after ratings
    const ratingOverrides = config.l2_tables?.counterparty_rating_observation;

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const migOffset = migration[dateIdx] ?? 0;

      // Internal rating
      const intIdx = Math.min(migOffset, intRatings.length - 1);
      const intRating = ratingOverrides?.ratings_after?.internal && dateIdx === dates.length - 1
        ? ratingOverrides.ratings_after.internal
        : intRatings[intIdx];

      _observationIdCounter++;
      const pdMult = STORY_PD_MULTIPLIERS[arc]?.[dateIdx + 2] ?? 1.0;
      const pdRaw = tierData.pdLow * pdMult;
      const pdInt = isNaN(pdRaw) ? 0.01 : Math.round(pdRaw * 10000) / 10000;
      const gradeId = parseInt(cp.internal_risk_rating);
      rows.push({
        observation_id: _observationIdCounter,
        counterparty_id: cp.counterparty_id,
        as_of_date: dates[dateIdx],
        rating_type: 'INTERNAL',
        rating_value: intRating,
        rating_grade_id: isNaN(gradeId) ? (intIdx + 3) : gradeId,
        is_internal_flag: 'Y',
        pd_implied: String(pdInt),
        rating_source_id: 1,
      });

      // External rating
      const extIdx = Math.min(migOffset, extRatings.length - 1);
      const extRating = ratingOverrides?.ratings_after?.moodys && dateIdx === dates.length - 1
        ? ratingOverrides.ratings_after.moodys
        : extRatings[extIdx];

      _observationIdCounter++;
      const pdExtRaw = tierData.pdLow * pdMult * 1.1;
      const pdExt = isNaN(pdExtRaw) ? 0.012 : Math.round(pdExtRaw * 10000) / 10000;
      rows.push({
        observation_id: _observationIdCounter,
        counterparty_id: cp.counterparty_id,
        as_of_date: dates[dateIdx],
        rating_type: 'EXTERNAL_MOODYS',
        rating_value: extRating,
        rating_grade_id: extIdx + 3,
        is_internal_flag: 'N',
        pd_implied: String(pdExt),
        rating_source_id: 2,
      });
    }
  }

  return rows;
}

/* ────────────────── Credit Event Generator ────────────────── */

let _linkIdCounter = 300000;

function generateCreditEvents(
  chain: L1Chain,
  config: ScenarioConfig,
  registry: IDRegistry,
): { events: CreditEventRow[]; links: EventFacilityLinkRow[] } {
  const events: CreditEventRow[] = [];
  const links: EventFacilityLinkRow[] = [];

  const evtConfigs = config.events?.credit_events ?? [];
  if (evtConfigs.length === 0) return { events, links };

  const eventIds = registry.allocate('credit_event', evtConfigs.length, config.scenario_id);

  for (let i = 0; i < evtConfigs.length; i++) {
    const evt = evtConfigs[i];
    const cpIdx = i % chain.counterparties.length;
    const cp = chain.counterparties[cpIdx];

    events.push({
      credit_event_id: eventIds[i],
      counterparty_id: cp.counterparty_id,
      credit_event_type_code: EVENT_TYPE_MAP[evt.type] ?? 4,
      event_date: evt.date,
      event_summary: evt.description ?? `${evt.type} for ${cp.legal_name}`,
      event_status: 'CONFIRMED',
    });

    // Link to all facilities of this counterparty
    const cpFacilities = chain.facilities.filter(f => f.counterparty_id === cp.counterparty_id);
    for (const fac of cpFacilities) {
      _linkIdCounter++;
      links.push({
        link_id: _linkIdCounter,
        credit_event_id: eventIds[i],
        facility_id: fac.facility_id,
      });
    }
  }

  return { events, links };
}

/* ────────────────── Risk Flag Generator ────────────────── */

function generateRiskFlags(
  chain: L1Chain,
  config: ScenarioConfig,
  registry: IDRegistry,
): RiskFlagRow[] {
  const flagConfigs = config.events?.risk_flags ?? [];
  if (flagConfigs.length === 0) return [];

  // One flag per config per counterparty
  const totalFlags = flagConfigs.length * chain.counterparties.length;
  const flagIds = registry.allocate('risk_flag', totalFlags, config.scenario_id);

  const rows: RiskFlagRow[] = [];
  let idx = 0;

  for (const flagCfg of flagConfigs) {
    for (const cp of chain.counterparties) {
      const cpFacs = chain.facilities.filter(f => f.counterparty_id === cp.counterparty_id);
      const lastDate = config.timeline.as_of_dates[config.timeline.as_of_dates.length - 1];

      // Map severity to flag_type: HIGH → WATCH_LIST, others → CONCENTRATION
      const flagType = flagCfg.severity === 'HIGH' ? 'WATCH_LIST' : 'CONCENTRATION';

      rows.push({
        risk_flag_id: flagIds[idx++],
        facility_id: cpFacs.length > 0 ? cpFacs[0].facility_id : null,
        counterparty_id: cp.counterparty_id,
        flag_type: flagType,
        flag_code: flagCfg.code,
        flag_severity: flagCfg.severity,
        as_of_date: lastDate,
        flag_description: flagCfg.description ?? `${flagCfg.code} — ${cp.legal_name}`,
      });
    }
  }

  return rows;
}

/* ────────────────── Amendment Generator ────────────────── */

function generateAmendments(
  chain: L1Chain,
  config: ScenarioConfig,
  registry: IDRegistry,
): AmendmentEventRow[] {
  const amdConfigs = config.events?.amendments ?? [];
  if (amdConfigs.length === 0) return [];

  const amdIds = registry.allocate('amendment_event', amdConfigs.length, config.scenario_id);

  return amdConfigs.map((amd, i) => {
    const cpIdx = i % chain.counterparties.length;
    const cpFacs = chain.facilities.filter(f => f.counterparty_id === chain.counterparties[cpIdx].counterparty_id);
    return {
      amendment_id: amdIds[i],
      facility_id: cpFacs.length > 0 ? cpFacs[0].facility_id : chain.facilities[0].facility_id,
      credit_agreement_id: chain.agreements[i % chain.agreements.length].credit_agreement_id,
      counterparty_id: chain.counterparties[cpIdx].counterparty_id,
      amendment_type_code: amd.type,
      amendment_status_code: amd.status,
      effective_date: amd.date,
      amendment_description: amd.description ?? `${amd.type} for ${config.name}`,
    };
  });
}

/* ────────────────── Collateral Snapshot Generator ────────────────── */

function generateCollateralSnapshots(
  chain: L1Chain,
  config: ScenarioConfig,
): CollateralSnapshotRow[] {
  if (!chain.collateral_assets) return [];

  const declinePct = config.l2_tables?.collateral_snapshot?.decline_pct ?? 15;
  const lastDate = config.timeline.as_of_dates[config.timeline.as_of_dates.length - 1];

  return chain.collateral_assets.map(asset => {
    // Generate a realistic original valuation based on counterparty's facilities
    const cpFacs = chain.facilities.filter(f => f.counterparty_id === asset.counterparty_id);
    const baseVal = cpFacs.length > 0
      ? Math.round(cpFacs[0].committed_facility_amt * 1.2)
      : 100_000_000;
    return {
      collateral_asset_id: asset.collateral_asset_id,
      counterparty_id: asset.counterparty_id,
      as_of_date: lastDate,
      original_valuation_usd: baseVal,
      current_valuation_usd: Math.round(baseVal * (1 - declinePct / 100)),
    };
  });
}

/* ────────────────── Stress Test Generator ────────────────── */

function generateStressTest(
  chain: L1Chain,
  config: ScenarioConfig,
  registry: IDRegistry,
): { results: StressTestResultRow[]; breaches: StressTestBreachRow[] } {
  const st = config.stress_test!;
  const resultIds = registry.allocate('stress_test_result', 1, config.scenario_id);
  const lastDate = config.timeline.as_of_dates[config.timeline.as_of_dates.length - 1];

  // scenario_id must reference l1.scenario_dim (1-10). Map stress type → valid ID.
  // 1=BASE, 2=ADV, 3=SEV_ADV, 4=MGMT, 5=HIST_GFC, 6=HIST_COVID, 7=RATE_UP, 8=RATE_DN, 9=CRE, 10=IDIO
  const stressScenarioMap: Record<string, number> = {
    'CCAR Severely Adverse': 3, 'CCAR Adverse': 2, 'CCAR Baseline': 1,
    'CRE Downturn': 9, 'Rate Shock': 7,
  };
  const scenarioNum = stressScenarioMap[st.scenario_name] ?? 3; // default to Severely Adverse

  const results: StressTestResultRow[] = [{
    result_id: resultIds[0],
    scenario_id: scenarioNum,
    as_of_date: lastDate,
    loss_amount: st.loss_amount,
    result_status: st.result_status,
    result_description: `Stress test: ${st.scenario_name} — ${config.name}`,
  }];

  const breaches: StressTestBreachRow[] = [];
  if (st.breaches) {
    const breachIds = registry.allocate('stress_test_breach', st.breaches.length, config.scenario_id);
    for (let i = 0; i < st.breaches.length; i++) {
      const b = st.breaches[i];
      breaches.push({
        breach_id: breachIds[i],
        scenario_id: scenarioNum,
        as_of_date: lastDate,
        stress_test_result_id: resultIds[0],
        counterparty_id: chain.counterparties[b.counterparty_index % chain.counterparties.length].counterparty_id,
        breach_amount_usd: b.amount,
        breach_severity: b.severity,
      });
    }
  }

  return { results, breaches };
}

/* ────────────────── Delinquency Generator ────────────────── */

function generateDelinquency(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): DelinquencyRow[] {
  const rows: DelinquencyRow[] = [];
  const dates = config.timeline.as_of_dates;

  for (const facility of chain.facilities) {
    const profile = cpProfileMap.get(facility.counterparty_id);
    const arc = profile?.arc ?? 'STEADY_HY';

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const dpd = STORY_DPD[arc][cycleIdx];

      rows.push({
        facility_id: facility.facility_id,
        counterparty_id: facility.counterparty_id,
        as_of_date: dates[dateIdx],
        credit_status_code: dpdToStatusCode(dpd),
        days_past_due: dpd,
        delinquency_status_code: dpd === 0 ? 'CURRENT' : dpd < 30 ? 'PAST_DUE_30' : dpd < 60 ? 'PAST_DUE_60' : 'PAST_DUE_90',
      });
    }
  }

  return rows;
}

/* ────────────────── Limit Contribution Generator ────────────────── */

function generateLimitContributions(
  chain: L1Chain,
  config: ScenarioConfig,
): LimitContributionRow[] {
  if (!chain.limit_rules || chain.limit_rules.length === 0) return [];

  const limitRule = chain.limit_rules[0];
  const lastDate = config.timeline.as_of_dates[config.timeline.as_of_dates.length - 1];

  return chain.counterparties.map((cp, i) => {
    // Distribute exposure across counterparties
    const cpFacs = chain.facilities.filter(f => f.counterparty_id === cp.counterparty_id);
    const totalExposure = cpFacs.reduce((sum, f) => sum + f.committed_facility_amt, 0);
    const allExposure = chain.facilities.reduce((sum, f) => sum + f.committed_facility_amt, 0);

    return {
      limit_rule_id: limitRule.limit_rule_id,
      counterparty_id: cp.counterparty_id,
      as_of_date: lastDate,
      contribution_amount_usd: totalExposure,
      contribution_pct: Math.round(totalExposure / allExposure * 100 * 100) / 100,
    };
  });
}

/* ────────────────── Limit Utilization Generator ────────────────── */

function generateLimitUtilization(
  chain: L1Chain,
  config: ScenarioConfig,
): LimitUtilizationRow[] {
  if (!chain.limit_rules || chain.limit_rules.length === 0) return [];

  const limitRule = chain.limit_rules[0];
  const lastDate = config.timeline.as_of_dates[config.timeline.as_of_dates.length - 1];
  const totalExposure = chain.facilities.reduce((sum, f) => sum + f.committed_facility_amt, 0);

  return [{
    counterparty_id: chain.counterparties[0].counterparty_id,
    limit_rule_id: limitRule.limit_rule_id,
    as_of_date: lastDate,
    utilized_amount: totalExposure,
    available_amount: Math.max(0, limitRule.limit_amount_usd - totalExposure),
  }];
}

/* ────────────────── Deal Pipeline Generator ────────────────── */

function generateDealPipeline(
  chain: L1Chain,
  config: ScenarioConfig,
  registry: IDRegistry,
): DealPipelineRow[] {
  const pipelineCount = config.l2_tables?.deal_pipeline_fact?.pipeline_count ?? chain.facilities.length;
  const stages = config.l2_tables?.deal_pipeline_fact?.stages ?? ['ORIGINATION', 'UNDERWRITING', 'APPROVED', 'CLOSING'];
  const pipelineIds = registry.allocate('deal_pipeline_fact', pipelineCount, config.scenario_id);

  const lastDate = config.timeline.as_of_dates[config.timeline.as_of_dates.length - 1];
  return pipelineIds.map((id, i) => {
    const fac = chain.facilities[i % chain.facilities.length];
    return {
      pipeline_id: id,
      counterparty_id: fac.counterparty_id,
      facility_id: fac.facility_id,
      as_of_date: lastDate,
      pipeline_stage: stages[i % stages.length],
      proposed_amount: fac.committed_facility_amt,
      expected_close_date: lastDate,
    };
  });
}

/* ────────────────── Attribution Generator ────────────────── */

let _attributionIdCounter = 400000;

function generateAttribution(
  chain: L1Chain,
  config: ScenarioConfig,
): ExposureAttributionRow[] {
  const rows: ExposureAttributionRow[] = [];
  const lastDate = config.timeline.as_of_dates[config.timeline.as_of_dates.length - 1];

  const roles = ['BORROWER', 'GUARANTOR', 'PARTICIPANT', 'CO-LENDER'];

  for (let i = 0; i < chain.counterparties.length; i++) {
    const cp = chain.counterparties[i];
    for (const fac of chain.facilities) {
      const role = i === 0 ? 'BORROWER' : roles[i % roles.length];
      const pct = i === 0 ? 40 : Math.round(60 / (chain.counterparties.length - 1));

      _attributionIdCounter++;
      rows.push({
        attribution_id: _attributionIdCounter,
        counterparty_id: cp.counterparty_id,
        facility_id: fac.facility_id,
        as_of_date: lastDate,
        exposure_type_id: 1,
        counterparty_role_code: role,
        attributed_exposure_usd: Math.round(fac.committed_facility_amt * pct / 100),
        attribution_pct: pct,
      });
    }
  }

  return rows;
}

/* ═══════════════════════════════════════════════════════════════
   NEW GENERATORS — Always-on and conditional L2 tables
   ═══════════════════════════════════════════════════════════════ */

/* ────────────────── Tier Base Spreads (bps) ────────────────── */

const TIER_BASE_SPREAD: Record<RatingTier, number> = {
  IG_HIGH: 85, IG_MID: 125, IG_LOW: 175,
  HY_HIGH: 250, HY_MID: 350, HY_LOW: 500,
};

/* ────────────────── Facility Pricing Generator ────────────────── */

let _pricingIdCounter = 500000;

function generateFacilityPricing(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): FacilityPricingRow[] {
  const rows: FacilityPricingRow[] = [];
  const dates = config.timeline.as_of_dates;

  for (const facility of chain.facilities) {
    const profile = cpProfileMap.get(facility.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const tier = profile?.tier ?? 'IG_MID';
    const baseSpread = TIER_BASE_SPREAD[tier];

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const spreadMult = STORY_SPREAD_MULTIPLIERS[arc][cycleIdx];
      const spread = Math.round(baseSpread * spreadMult);
      const baseRate = 0.0530; // Fed funds ~5.30%
      const allInRate = Math.round((baseRate + spread / 10000) * 10000) / 10000;

      _pricingIdCounter++;
      rows.push({
        facility_id: facility.facility_id,
        as_of_date: dates[dateIdx],
        spread_bps: spread,
        rate_index_id: ((facility.facility_id - 1) % 10) + 1,
        all_in_rate_pct: allInRate,
        base_rate_pct: baseRate,
        currency_code: facility.currency_code,
        facility_pricing_id: _pricingIdCounter,
        fee_rate_pct: 0.0025, // 25 bps commitment fee
        cost_of_funds_pct: baseRate - 0.005,
        payment_frequency: 'QUARTERLY',
        is_prepayment_penalty_flag: 'N',
      });
    }
  }

  return rows;
}

/* ────────────────── Facility Risk Generator ────────────────── */

function generateFacilityRisk(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): FacilityRiskRow[] {
  const rows: FacilityRiskRow[] = [];
  const dates = config.timeline.as_of_dates;

  for (const facility of chain.facilities) {
    const profile = cpProfileMap.get(facility.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const tier = profile?.tier ?? 'IG_MID';
    const tierData = RATING_TIER_MAP[tier];
    const rw = TIER_BASE_RW[tier];
    const intRatings = TIER_INT_RATINGS[tier];

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const utilRate = STORY_UTILIZATION[arc][cycleIdx];
      const pdMult = STORY_PD_MULTIPLIERS[arc][cycleIdx];

      const committed = facility.committed_facility_amt;
      const drawn = Math.round(committed * utilRate);
      const undrawn = committed - drawn;
      const ccf = 0.40; // typical CCF for undrawn
      const ead = drawn + Math.round(undrawn * ccf);
      const pd = Math.round(tierData.pdLow * pdMult * 1000000) / 1000000;
      const lgd = tierData.lgd;
      const el = Math.round(ead * pd * lgd);
      const rwa = Math.round(ead * rw / 100);

      const migOffset = (RATING_MIGRATION[arc]?.[dateIdx] ?? 0);
      const intIdx = Math.min(migOffset, intRatings.length - 1);

      rows.push({
        facility_id: facility.facility_id,
        as_of_date: dates[dateIdx],
        counterparty_id: facility.counterparty_id,
        pd_pct: pd,
        lgd_pct: lgd,
        ccf,
        ead_amt: ead,
        expected_loss_amt: el,
        rwa_amt: rwa,
        risk_weight_pct: rw,
        internal_risk_rating: intRatings[intIdx],
        currency_code: facility.currency_code,
      });
    }
  }

  return rows;
}

/* ────────────────── Facility Financial Generator ────────────────── */

function generateFacilityFinancial(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): FacilityFinancialRow[] {
  const rows: FacilityFinancialRow[] = [];
  const dates = config.timeline.as_of_dates;
  const rng = mulberry32(hashStr(config.scenario_id + '_financial'));

  for (const facility of chain.facilities) {
    const profile = cpProfileMap.get(facility.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const tier = profile?.tier ?? 'IG_MID';
    const committed = facility.committed_facility_amt;

    // Revenue baseline proportional to committed amount
    const revenueBase = Math.round(committed * (0.12 + rng() * 0.06)); // 12-18% of committed

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const utilRate = STORY_UTILIZATION[arc][cycleIdx];
      const spreadMult = STORY_SPREAD_MULTIPLIERS[arc][cycleIdx];

      const drawn = Math.round(committed * utilRate);
      const spread = TIER_BASE_SPREAD[tier] * spreadMult;
      const baseRate = 0.0530;
      const allInRate = baseRate + spread / 10000;

      // Financial metrics
      const revenue = Math.round(revenueBase * (1 + (rng() - 0.5) * 0.1));
      const opex = Math.round(revenue * (0.55 + rng() * 0.15)); // 55-70% cost ratio
      const ebitda = revenue - opex;
      const noi = Math.round(revenue * 0.65); // NOI ~65% of revenue
      const debtService = Math.round(drawn * allInRate);
      const interestExpense = Math.round(drawn * allInRate * 0.85);
      const principalPayment = Math.round(debtService - interestExpense);
      const netIncome = ebitda - interestExpense;
      const dscr = debtService > 0 ? Math.round((noi / debtService) * 1000000) / 1000000 : 0;
      const ltvDenom = committed * 1.5; // assume collateral = 1.5× committed
      const ltv = ltvDenom > 0 ? Math.round((drawn / ltvDenom) * 1000000) / 1000000 : 0;

      const period = dates[dateIdx].substring(0, 7); // YYYY-MM
      rows.push({
        facility_id: facility.facility_id,
        as_of_date: dates[dateIdx],
        counterparty_id: facility.counterparty_id,
        currency_code: facility.currency_code,
        reporting_period: period,
        revenue_amt: revenue,
        operating_expense_amt: opex,
        ebitda_amt: ebitda,
        total_debt_service_amt: debtService,
        interest_expense_amt: interestExpense,
        principal_payment_amt: principalPayment,
        net_income_amt: netIncome,
        dscr_value: dscr,
        ltv_pct: ltv,
      });
    }
  }

  return rows;
}

/* ────────────────── Position Generator ────────────────── */

let _positionIdCounter = 600000;

function generatePositions(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): PositionRow[] {
  const rows: PositionRow[] = [];
  const dates = config.timeline.as_of_dates;

  for (const facility of chain.facilities) {
    const profile = cpProfileMap.get(facility.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const tier = profile?.tier ?? 'IG_MID';
    const intRatings = TIER_INT_RATINGS[tier];
    const extRatings = TIER_EXT_RATINGS[tier];

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const utilRate = STORY_UTILIZATION[arc][cycleIdx];
      const committed = facility.committed_facility_amt;
      const drawn = Math.round(committed * utilRate);
      const creditStatus = STORY_CREDIT_STATUS[arc][cycleIdx];
      const migOffset = RATING_MIGRATION[arc]?.[dateIdx] ?? 0;
      const intIdx = Math.min(migOffset, intRatings.length - 1);
      const extIdx = Math.min(migOffset, extRatings.length - 1);

      _positionIdCounter++;
      rows.push({
        position_id: _positionIdCounter,
        as_of_date: dates[dateIdx],
        facility_id: facility.facility_id,
        instrument_id: ((facility.facility_id - 1) % 100) + 1,
        position_type: facility.facility_type ?? 'TERM_LOAN',
        balance_amount: drawn,
        currency_code: facility.currency_code,
        source_system_id: ((facility.facility_id - 1) % 10) + 1,
        counterparty_id: facility.counterparty_id,
        credit_agreement_id: facility.credit_agreement_id,
        credit_status_code: creditStatus,
        exposure_type_code: 'FUNDED',
        internal_risk_rating: intRatings[intIdx],
        external_risk_rating: extRatings[extIdx],
        notional_amount: committed,
        is_trading_banking_book_flag: 'B',
        product_node_id: ((facility.facility_id - 1) % 100) + 1,
      });
    }
  }

  return rows;
}

/* ────────────────── Position Detail Generator ────────────────── */

let _positionDetailIdCounter = 700000;

function generatePositionDetails(
  positions: PositionRow[],
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): PositionDetailRow[] {
  const rows: PositionDetailRow[] = [];

  // Build a lookup for facility committed amounts
  const facMap = new Map<number, number>();
  for (const f of chain.facilities) {
    facMap.set(f.facility_id, f.committed_facility_amt);
  }

  for (const pos of positions) {
    const profile = cpProfileMap.get(pos.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const tier = profile?.tier ?? 'IG_MID';

    const committed = facMap.get(pos.facility_id) ?? pos.notional_amount;
    const unfunded = committed - pos.balance_amount;
    const baseRate = 0.0530;
    const spread = TIER_BASE_SPREAD[tier];
    const allInRate = baseRate + spread / 10000;

    // Find the date index for DPD lookup
    const dateIdx = config.timeline.as_of_dates.indexOf(pos.as_of_date);
    const cycleIdx = Math.min((dateIdx >= 0 ? dateIdx : 0) + 2, 4);
    const dpd = STORY_DPD[arc][cycleIdx];

    _positionDetailIdCounter++;
    rows.push({
      position_detail_id: _positionDetailIdCounter,
      position_id: pos.position_id,
      as_of_date: pos.as_of_date,
      detail_type: 'PRINCIPAL',
      amount: pos.balance_amount,
      current_balance: pos.balance_amount,
      funded_amount: pos.balance_amount,
      unfunded_amount: unfunded,
      total_commitment: committed,
      interest_rate: Math.round(allInRate * 1000000) / 1000000,
      days_past_due: dpd,
      delinquency_status: dpd === 0 ? 'PERFORMING' : dpd < 30 ? 'PAST_DUE_30' : dpd < 60 ? 'PAST_DUE_60' : 'PAST_DUE_90',
      spread_bps: spread,
      exposure_type_code: 'FUNDED',
      notional_amount: committed,
      is_delinquent_payment_flag: dpd > 0 ? 'Y' : 'N',
    });
  }

  return rows;
}

/* ────────────────── Cash Flow Generator ────────────────── */

let _cashFlowIdCounter = 800000;

function generateCashFlows(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): CashFlowRow[] {
  const rows: CashFlowRow[] = [];
  const dates = config.timeline.as_of_dates;

  for (const facility of chain.facilities) {
    const profile = cpProfileMap.get(facility.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const committed = facility.committed_facility_amt;

    let prevDrawn = 0;
    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const utilRate = STORY_UTILIZATION[arc][cycleIdx];
      const drawn = Math.round(committed * utilRate);
      const delta = drawn - prevDrawn;

      if (delta !== 0) {
        _cashFlowIdCounter++;
        rows.push({
          cash_flow_id: _cashFlowIdCounter,
          facility_id: facility.facility_id,
          counterparty_id: facility.counterparty_id,
          cash_flow_date: dates[dateIdx],
          cash_flow_type: delta > 0 ? 'DRAW' : 'REPAYMENT',
          amount: Math.abs(delta),
          currency_code: facility.currency_code,
          as_of_date: dates[dateIdx],
          flow_direction: delta > 0 ? 'INBOUND' : 'OUTBOUND',
          flow_type: delta > 0 ? 'DRAW' : 'REPAYMENT',
        });
      }

      // Interest payment cash flow
      const tier = profile?.tier ?? 'IG_MID';
      const spread = TIER_BASE_SPREAD[tier];
      const interestAmt = Math.round(drawn * (0.0530 + spread / 10000) / 12); // monthly interest
      if (interestAmt > 0) {
        _cashFlowIdCounter++;
        rows.push({
          cash_flow_id: _cashFlowIdCounter,
          facility_id: facility.facility_id,
          counterparty_id: facility.counterparty_id,
          cash_flow_date: dates[dateIdx],
          cash_flow_type: 'INTEREST',
          amount: interestAmt,
          currency_code: facility.currency_code,
          as_of_date: dates[dateIdx],
          flow_direction: 'OUTBOUND',
          flow_type: 'INTEREST',
        });
      }

      prevDrawn = drawn;
    }
  }

  return rows;
}

/* ────────────────── LOB Attribution Generator ────────────────── */

let _lobAttributionIdCounter = 900000;

function generateLobAttribution(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): FacilityLobAttributionRow[] {
  const rows: FacilityLobAttributionRow[] = [];
  const dates = config.timeline.as_of_dates;

  for (const facility of chain.facilities) {
    const profile = cpProfileMap.get(facility.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const committed = facility.committed_facility_amt;

    // Cycle lob_segment_id across counterparties (1-10 from enterprise_business_taxonomy)
    const lobId = ((facility.counterparty_id - 1) % 10) + 1;

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const utilRate = STORY_UTILIZATION[arc][cycleIdx];
      const drawn = Math.round(committed * utilRate);

      _lobAttributionIdCounter++;
      rows.push({
        attribution_id: _lobAttributionIdCounter,
        facility_id: facility.facility_id,
        as_of_date: dates[dateIdx],
        lob_segment_id: lobId,
        attribution_pct: 100,
        attributed_amount: drawn,
        attribution_amount_usd: drawn,
        attribution_type: 'DIRECT',
      });
    }
  }

  return rows;
}

/* ════════════════ Conditional Generators ════════════════ */

/* ────────────────── Counterparty Financial Generator ────────────────── */

let _cpFinancialIdCounter = 1000000;

function generateCounterpartyFinancial(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): CounterpartyFinancialRow[] {
  const rows: CounterpartyFinancialRow[] = [];
  const dates = config.timeline.as_of_dates;
  const rng = mulberry32(hashStr(config.scenario_id + '_cp_financial'));

  for (const cp of chain.counterparties) {
    const profile = cpProfileMap.get(cp.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const cpFacs = chain.facilities.filter(f => f.counterparty_id === cp.counterparty_id);
    const totalCommitted = cpFacs.reduce((s, f) => s + f.committed_facility_amt, 0);

    // Base financials scaled to total committed exposure
    const revenueBase = Math.round(totalCommitted * (0.25 + rng() * 0.15));

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const utilRate = STORY_UTILIZATION[arc][cycleIdx];
      const pdMult = STORY_PD_MULTIPLIERS[arc][cycleIdx];

      const totalDrawn = cpFacs.reduce((s, f) => s + Math.round(f.committed_facility_amt * utilRate), 0);

      // Deteriorating arcs show declining revenue and margins
      const revFactor = arc === 'DETERIORATING' ? (1 - dateIdx * 0.08)
        : arc === 'RECOVERING' ? (1 + dateIdx * 0.05)
        : (1 + (rng() - 0.5) * 0.05);
      const revenue = Math.round(revenueBase * revFactor);
      const opex = Math.round(revenue * (0.60 + pdMult * 0.05));
      const netIncome = revenue - opex;
      const interestExpense = Math.round(totalDrawn * 0.06);
      const totalAssets = Math.round(totalCommitted * 3);
      const totalLiabilities = Math.round(totalCommitted * 2);
      const equity = totalAssets - totalLiabilities;
      const ebitda = netIncome + interestExpense + Math.round(revenue * 0.05);
      const debtService = interestExpense + Math.round(totalDrawn * 0.02);

      _cpFinancialIdCounter++;
      rows.push({
        financial_snapshot_id: _cpFinancialIdCounter,
        counterparty_id: cp.counterparty_id,
        as_of_date: dates[dateIdx],
        reporting_period: dates[dateIdx].substring(0, 7),
        currency_code: 'USD',
        revenue_amt: revenue,
        operating_expense_amt: opex,
        net_income_amt: netIncome,
        interest_expense_amt: interestExpense,
        total_assets_amt: totalAssets,
        total_liabilities_amt: totalLiabilities,
        shareholders_equity_amt: equity,
        ebitda_amt: ebitda,
        total_debt_service_amt: debtService,
      });
    }
  }

  return rows;
}

/* ────────────────── Facility Profitability Generator ────────────────── */

function generateFacilityProfitability(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): FacilityProfitabilityRow[] {
  const rows: FacilityProfitabilityRow[] = [];
  const dates = config.timeline.as_of_dates;

  for (const facility of chain.facilities) {
    const profile = cpProfileMap.get(facility.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const tier = profile?.tier ?? 'IG_MID';
    const committed = facility.committed_facility_amt;
    const spread = TIER_BASE_SPREAD[tier];
    const baseRate = 0.0530;

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const utilRate = STORY_UTILIZATION[arc][cycleIdx];
      const spreadMult = STORY_SPREAD_MULTIPLIERS[arc][cycleIdx];
      const drawn = Math.round(committed * utilRate);

      const allInRate = baseRate + (spread * spreadMult) / 10000;
      const costOfFunds = baseRate - 0.005;

      const interestIncome = Math.round(drawn * allInRate);
      const interestExpense = Math.round(drawn * costOfFunds);
      const nii = interestIncome - interestExpense;
      const feeIncome = Math.round(committed * 0.0025); // 25bps commitment fee

      rows.push({
        facility_id: facility.facility_id,
        as_of_date: dates[dateIdx],
        interest_income_amt: interestIncome,
        interest_expense_amt: interestExpense,
        fee_income_amt: feeIncome,
        nii_ytd: nii * (dateIdx + 1), // YTD accumulation
        fee_income_ytd: feeIncome * (dateIdx + 1),
        ledger_account_id: ((facility.facility_id - 1) % 10) + 1,
        base_currency_code: facility.currency_code,
      });
    }
  }

  return rows;
}

/* ────────────────── Amendment Change Detail Generator ────────────────── */

let _changeDetailIdCounter = 1100000;

function generateAmendmentChangeDetails(
  l2Data: L2Data,
): AmendmentChangeDetailRow[] {
  const amendments = l2Data.amendment_event ?? [];
  if (amendments.length === 0) return [];

  const rows: AmendmentChangeDetailRow[] = [];

  const changeTypes: Record<string, { field: string; old: string; new: string }[]> = {
    COVENANT_WAIVER: [
      { field: 'min_dscr', old: '1.25', new: '1.10' },
      { field: 'max_ltv', old: '0.75', new: '0.85' },
    ],
    RATE_MODIFICATION: [
      { field: 'spread_bps', old: '200', new: '275' },
    ],
    MATURITY_EXTENSION: [
      { field: 'maturity_date', old: '2025-06-30', new: '2026-06-30' },
    ],
    COMMITMENT_INCREASE: [
      { field: 'committed_amount', old: '100000000', new: '125000000' },
    ],
  };

  for (const amd of amendments) {
    const changes = changeTypes[amd.amendment_type_code] ?? [
      { field: 'terms', old: 'original', new: 'amended' },
    ];

    for (let seq = 0; seq < changes.length; seq++) {
      const ch = changes[seq];
      _changeDetailIdCounter++;
      rows.push({
        change_detail_id: _changeDetailIdCounter,
        amendment_id: amd.amendment_id,
        change_type: amd.amendment_type_code,
        old_value: ch.old,
        new_value: ch.new,
        change_field_name: ch.field,
        change_seq: seq + 1,
      });
    }
  }

  return rows;
}

/* ────────────────── Exception Event Generator ────────────────── */

let _exceptionIdCounter = 1200000;

function generateExceptionEvents(
  chain: L1Chain,
  config: ScenarioConfig,
): ExceptionEventRow[] {
  const rows: ExceptionEventRow[] = [];
  const lastDate = config.timeline.as_of_dates[config.timeline.as_of_dates.length - 1];

  const exceptionTypes = config.type === 'EXPOSURE_BREACH'
    ? ['LIMIT_BREACH', 'CONCENTRATION_LIMIT']
    : ['COVENANT_VIOLATION', 'DOCUMENTATION_DEFICIENCY'];

  for (let i = 0; i < chain.counterparties.length; i++) {
    const cp = chain.counterparties[i];
    const cpFacs = chain.facilities.filter(f => f.counterparty_id === cp.counterparty_id);
    if (cpFacs.length === 0) continue;

    const totalExposure = cpFacs.reduce((s, f) => s + f.committed_facility_amt, 0);
    const breachAmt = Math.round(totalExposure * 0.15); // 15% over limit

    _exceptionIdCounter++;
    rows.push({
      exception_id: _exceptionIdCounter,
      as_of_date: lastDate,
      exception_type: exceptionTypes[i % exceptionTypes.length],
      facility_id: cpFacs[0].facility_id,
      counterparty_id: cp.counterparty_id,
      exception_status: config.type === 'BREACH_RESOLUTION' ? 'RESOLVED' : 'OPEN',
      exception_severity: i === 0 ? 'HIGH' : 'MEDIUM',
      exception_description: `${exceptionTypes[i % exceptionTypes.length]} — ${cp.legal_name}`,
      breach_amount_usd: breachAmt,
      breach_pct: 15,
      identified_date: config.timeline.as_of_dates[Math.max(0, config.timeline.as_of_dates.length - 2)],
      days_open: config.type === 'BREACH_RESOLUTION' ? 0 : 30 + i * 10,
    });
  }

  return rows;
}

/* ────────────────── Facility Credit Approval Generator ────────────────── */

let _approvalIdCounter = 1300000;

function generateFacilityCreditApprovals(
  chain: L1Chain,
  config: ScenarioConfig,
): FacilityCreditApprovalRow[] {
  const rows: FacilityCreditApprovalRow[] = [];
  const lastDate = config.timeline.as_of_dates[config.timeline.as_of_dates.length - 1];
  const statuses = ['APPROVED', 'PENDING', 'CONDITIONAL', 'APPROVED'];

  for (let i = 0; i < chain.facilities.length; i++) {
    const fac = chain.facilities[i];
    _approvalIdCounter++;
    rows.push({
      approval_id: _approvalIdCounter,
      facility_id: fac.facility_id,
      counterparty_id: fac.counterparty_id,
      as_of_date: lastDate,
      approval_status: statuses[i % statuses.length],
      approval_date: lastDate,
      approved_amount: fac.committed_facility_amt,
      is_exception_flag: 'N',
    });
  }

  return rows;
}

/* ────────────────── Financial Metric Observation Generator ────────────────── */

let _metricObsIdCounter = 1400000;

function generateFinancialMetricObservations(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): FinancialMetricObservationRow[] {
  const rows: FinancialMetricObservationRow[] = [];
  const dates = config.timeline.as_of_dates;

  // Key metrics: DSCR=1, LTV=2, ICR=3, Leverage=4, Current Ratio=5
  const metrics = [
    { id: 1, code: 'DSCR', name: 'Debt Service Coverage Ratio' },
    { id: 2, code: 'LTV', name: 'Loan-to-Value Ratio' },
    { id: 3, code: 'ICR', name: 'Interest Coverage Ratio' },
  ];

  for (const cp of chain.counterparties) {
    const profile = cpProfileMap.get(cp.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const cpFacs = chain.facilities.filter(f => f.counterparty_id === cp.counterparty_id);
    if (cpFacs.length === 0) continue;

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const utilRate = STORY_UTILIZATION[arc][cycleIdx];
      const pdMult = STORY_PD_MULTIPLIERS[arc][cycleIdx];

      for (const metric of metrics) {
        let value: number;
        if (metric.code === 'DSCR') {
          value = Math.round((2.0 / pdMult) * 100) / 100; // DSCR inversely related to PD
        } else if (metric.code === 'LTV') {
          value = Math.round(utilRate * 0.8 * 100) / 100; // LTV tracks utilization
        } else {
          value = Math.round((3.0 / pdMult) * 100) / 100; // ICR
        }

        _metricObsIdCounter++;
        rows.push({
          observation_id: _metricObsIdCounter,
          counterparty_id: cp.counterparty_id,
          facility_id: cpFacs[0].facility_id,
          as_of_date: dates[dateIdx],
          metric_definition_id: metric.id,
          metric_code: metric.code,
          metric_name: metric.name,
          metric_value: value,
          context_id: 1,
        });
      }
    }
  }

  return rows;
}

/* ────────────────── Netting Set Exposure Generator ────────────────── */

let _nettingSetExposureIdCounter = 500000;

function generateNettingSetExposure(
  chain: L1Chain,
  config: ScenarioConfig,
): NettingSetExposureRow[] {
  const rows: NettingSetExposureRow[] = [];
  const dates = config.timeline.as_of_dates;

  // Use existing netting_set IDs (1-60 in seed). Derive from counterparty_id to avoid
  // PK collisions across scenarios. PK = (netting_set_id, as_of_date).
  // Seed data occupies netting_set_id 1-40 with date 2025-01-31, so we use IDs 41-60
  // for factory data to avoid collisions.
  const usedPKs = new Set<string>();
  for (let i = 0; i < chain.counterparties.length; i++) {
    const cp = chain.counterparties[i];
    const nettingSetId = ((cp.counterparty_id - 1) % 20) + 41; // IDs 41-60, avoiding seed 1-40
    const cpFacs = chain.facilities.filter(f => f.counterparty_id === cp.counterparty_id);
    const totalCommitted = cpFacs.reduce((s, f) => s + f.committed_facility_amt, 0);

    for (const date of dates) {
      const pk = `${nettingSetId}|${date}`;
      if (usedPKs.has(pk)) continue; // skip duplicate composite PKs
      usedPKs.add(pk);

      const grossExposure = totalCommitted;
      const nettingBenefit = Math.round(grossExposure * 0.25); // 25% netting benefit
      const nettedExposure = grossExposure - nettingBenefit;
      const pfe = Math.round(nettedExposure * 0.15);

      _nettingSetExposureIdCounter++;
      rows.push({
        netting_set_id: nettingSetId,
        as_of_date: date,
        netted_exposure_amount: nettedExposure,
        gross_exposure_amount: grossExposure,
        currency_code: 'USD',
        counterparty_id: cp.counterparty_id,
        netting_set_exposure_id: _nettingSetExposureIdCounter,
        netting_benefit_amt: nettingBenefit,
        pfe_usd: pfe,
      });
    }
  }

  return rows;
}

/* ────────────────── Metric Threshold (L2) Generator ────────────────── */

let _thresholdIdCounter = 1500000;

function generateMetricThresholds(
  config: ScenarioConfig,
): MetricThresholdL2Row[] {
  const rows: MetricThresholdL2Row[] = [];
  const lastDate = config.timeline.as_of_dates[config.timeline.as_of_dates.length - 1];

  // Key metric thresholds
  const thresholds = [
    { metricDefId: 1, type: 'WARNING', value: 1.25 },   // DSCR warning
    { metricDefId: 1, type: 'BREACH', value: 1.00 },    // DSCR breach
    { metricDefId: 2, type: 'WARNING', value: 0.75 },   // LTV warning
    { metricDefId: 2, type: 'BREACH', value: 0.90 },    // LTV breach
    { metricDefId: 3, type: 'WARNING', value: 1.50 },   // ICR warning
    { metricDefId: 3, type: 'BREACH', value: 1.00 },    // ICR breach
  ];

  for (const t of thresholds) {
    _thresholdIdCounter++;
    rows.push({
      threshold_id: _thresholdIdCounter,
      metric_definition_id: t.metricDefId,
      as_of_date: lastDate,
      threshold_value: t.value,
      threshold_type: t.type,
    });
  }

  return rows;
}
