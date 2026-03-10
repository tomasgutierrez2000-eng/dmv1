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

export interface FacilityFinancialSnapshotRow {
  facility_id: number;
  as_of_date: string;
  noi_amt: number;
  total_debt_service_amt: number;
  revenue_amt: number;
  operating_expense_amt: number;
  ebitda_amt: number;
  interest_expense_amt: number;
  principal_payment_amt: number;
  counterparty_id: number;
  currency_code: string;
  reporting_period: string;
  financial_snapshot_id: number;
  dscr_value: number;
  ltv_pct: number;
  net_income_amt: number;
  interest_rate_sensitivity_pct: number;
}

export interface CounterpartyFinancialSnapshotRow {
  financial_snapshot_id: number;
  counterparty_id: number;
  as_of_date: string;
  reporting_period: string;
  currency_code: string;
  revenue_amt: number;
  operating_expense_amt: number;
  net_income_amt: number;
  interest_expense_amt: number;
  tax_expense_amt: number;
  depreciation_amt: number;
  amortization_amt: number;
  total_assets_amt: number;
  total_liabilities_amt: number;
  shareholders_equity_amt: number;
  ebitda_amt: number;
  noi_amt: number;
  total_debt_service_amt: number;
  tangible_net_worth_usd: number;
}

export interface FacilityCreditApprovalRow {
  approval_id: number;
  facility_id: number;
  counterparty_id: number;
  as_of_date: string;
  approval_status: string;
  approval_date: string;
  approved_amount: number;
  exception_flag: string;
  exception_type: string | null;
  exception_type_code: string | null;
  exception_severity: string | null;
  exception_reason: string | null;
  approved_by: string;
  expiry_date: string;
}

export interface FacilityRiskSnapshotRow {
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
  expected_loss_rate_pct: number;
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
  facility_financial_snapshot?: FacilityFinancialSnapshotRow[];
  counterparty_financial_snapshot?: CounterpartyFinancialSnapshotRow[];
  facility_credit_approval?: FacilityCreditApprovalRow[];
  facility_risk_snapshot?: FacilityRiskSnapshotRow[];
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

  // ── 12. Facility Financial Snapshots (always generated) ──
  data.facility_financial_snapshot = generateFacilityFinancials(chain, config, cpProfileMap);

  // ── 13. Counterparty Financial Snapshots (always generated) ──
  data.counterparty_financial_snapshot = generateCounterpartyFinancials(chain, config, cpProfileMap, registry);

  // ── 14. Facility Credit Approvals (always generated) ──
  data.facility_credit_approval = generateCreditApprovals(chain, config, cpProfileMap, registry);

  // ── 15. Facility Risk Snapshots (always generated) ──
  data.facility_risk_snapshot = generateFacilityRisk(chain, config, cpProfileMap);

  return data;
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

/* ────────────────── Facility Financial Snapshot Generator ────────────────── */

let _finSnapshotIdCounter = 500000;

/**
 * Revenue multiplier by story arc — maps to realistic revenue/committed ratios.
 * Healthy companies generate more revenue relative to their debt facility.
 */
const ARC_REVENUE_MULT: Record<StoryArc, number[]> = {
  STABLE_IG:        [0.25, 0.25, 0.26, 0.25, 0.25],
  GROWING:          [0.20, 0.22, 0.24, 0.27, 0.30],
  STEADY_HY:        [0.20, 0.20, 0.19, 0.20, 0.20],
  DETERIORATING:    [0.22, 0.18, 0.14, 0.11, 0.12],
  RECOVERING:       [0.12, 0.15, 0.18, 0.22, 0.24],
  STRESSED_SECTOR:  [0.20, 0.16, 0.12, 0.14, 0.17],
  NEW_RELATIONSHIP: [0.18, 0.19, 0.20, 0.21, 0.22],
};

function generateFacilityFinancials(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): FacilityFinancialSnapshotRow[] {
  const rows: FacilityFinancialSnapshotRow[] = [];
  const dates = config.timeline.as_of_dates;

  for (const facility of chain.facilities) {
    const profile = cpProfileMap.get(facility.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const tier = profile?.tier ?? 'IG_MID';
    const rng = mulberry32(hashStr(`fin.${facility.facility_id}`));

    const committed = facility.committed_facility_amt;
    const spreadBps = facility.interest_rate_spread_bps;
    const isRevolving = facility.revolving_flag === 'Y';

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const utilRate = STORY_UTILIZATION[arc][cycleIdx];
      const drawn = Math.round(committed * utilRate);

      // Revenue proportional to committed amount
      const revMult = ARC_REVENUE_MULT[arc][cycleIdx];
      const revenue = Math.round(committed * revMult);

      // Operating expenses: 55-75% of revenue depending on tier
      const opexRatio = tier.startsWith('IG') ? 0.58 + rng() * 0.07 : 0.65 + rng() * 0.10;
      const opex = Math.round(revenue * opexRatio);

      const ebitda = revenue - opex;

      // D&A approximation for NOI
      const daRatio = 0.08 + rng() * 0.04;
      const noi = Math.round(ebitda * (1 - daRatio));

      // Interest = drawn * (spread + base rate ~3%)
      const effectiveRate = (spreadBps / 10000) + 0.03;
      const interestExpense = Math.round(drawn * effectiveRate);

      // Principal payment: amortizing facilities pay ~5%/yr of committed
      const principalPayment = isRevolving ? 0 : Math.round(committed * 0.05);

      const totalDebtService = interestExpense + principalPayment;

      // DSCR = NOI / total debt service (capped to reasonable range)
      const dscr = totalDebtService > 0
        ? Math.round(Math.max(0.3, Math.min(5.0, noi / totalDebtService)) * 1000) / 1000
        : 0;

      // LTV = drawn / estimated collateral value (~120% of committed)
      const collateralEstimate = committed * 1.2;
      const ltv = collateralEstimate > 0
        ? Math.round(drawn / collateralEstimate * 100 * 100) / 100
        : 0;

      // Tax rate ~21%
      const taxRate = 0.21;
      const netIncome = Math.round((ebitda - interestExpense) * (1 - taxRate));

      // Interest rate sensitivity (bps impact on NII per 100bp shift)
      const sensitivity = Math.round((0.5 + rng() * 1.5) * 1000) / 1000;

      _finSnapshotIdCounter++;
      rows.push({
        facility_id: facility.facility_id,
        as_of_date: dates[dateIdx],
        noi_amt: noi,
        total_debt_service_amt: totalDebtService,
        revenue_amt: revenue,
        operating_expense_amt: opex,
        ebitda_amt: ebitda,
        interest_expense_amt: interestExpense,
        principal_payment_amt: principalPayment,
        counterparty_id: facility.counterparty_id,
        currency_code: facility.currency_code,
        reporting_period: dates[dateIdx].slice(0, 7),   // YYYY-MM
        financial_snapshot_id: _finSnapshotIdCounter,
        dscr_value: dscr,
        ltv_pct: ltv,
        net_income_amt: netIncome,
        interest_rate_sensitivity_pct: sensitivity,
      });
    }
  }

  return rows;
}

/* ────────────────── Counterparty Financial Snapshot Generator ────────────────── */

function generateCounterpartyFinancials(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
  registry: IDRegistry,
): CounterpartyFinancialSnapshotRow[] {
  const rows: CounterpartyFinancialSnapshotRow[] = [];
  const dates = config.timeline.as_of_dates;
  const snapshotIds = registry.allocate(
    'counterparty_financial_snapshot',
    chain.counterparties.length * dates.length,
    config.scenario_id,
  );
  let idIdx = 0;

  for (const cp of chain.counterparties) {
    const profile = cpProfileMap.get(cp.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const tier = profile?.tier ?? 'IG_MID';
    const rng = mulberry32(hashStr(`cpfin.${cp.counterparty_id}`));

    // Aggregate committed amounts for this counterparty
    const cpFacilities = chain.facilities.filter(f => f.counterparty_id === cp.counterparty_id);
    const totalCommitted = cpFacilities.reduce((s, f) => s + f.committed_facility_amt, 0);

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const utilRate = STORY_UTILIZATION[arc][cycleIdx];
      const totalDrawn = Math.round(totalCommitted * utilRate);

      // Company-level financials scaled from total committed
      const revMult = ARC_REVENUE_MULT[arc][cycleIdx];
      // Company revenue is larger than facility-level (facilities are a fraction of total debt)
      const revScale = 3.0 + rng() * 2.0;  // company revenue is 3-5x facility revenue
      const revenue = Math.round(totalCommitted * revMult * revScale);

      const opexRatio = tier.startsWith('IG') ? 0.60 + rng() * 0.08 : 0.67 + rng() * 0.10;
      const opex = Math.round(revenue * opexRatio);

      const interestExpense = Math.round(totalDrawn * 0.045);
      const taxExpense = Math.round(Math.max(0, revenue - opex - interestExpense) * 0.21);
      const depreciation = Math.round(revenue * (0.03 + rng() * 0.02));
      const amortization = Math.round(revenue * (0.01 + rng() * 0.01));

      const ebitda = revenue - opex;
      const noi = ebitda - depreciation - amortization;
      const netIncome = Math.round(ebitda - interestExpense - taxExpense);
      const totalDebtService = interestExpense + Math.round(totalCommitted * 0.04);

      // Balance sheet
      const totalAssets = Math.round(totalCommitted * (4.0 + rng() * 3.0));
      const totalLiabilities = Math.round(totalAssets * (0.50 + rng() * 0.25));
      const equity = totalAssets - totalLiabilities;
      const tangibleNetWorth = Math.round(equity * (0.70 + rng() * 0.20));

      const currencyCode = cpFacilities.length > 0 ? cpFacilities[0].currency_code : 'USD';

      rows.push({
        financial_snapshot_id: snapshotIds[idIdx++],
        counterparty_id: cp.counterparty_id,
        as_of_date: dates[dateIdx],
        reporting_period: dates[dateIdx].slice(0, 7),
        currency_code: currencyCode,
        revenue_amt: revenue,
        operating_expense_amt: opex,
        net_income_amt: netIncome,
        interest_expense_amt: interestExpense,
        tax_expense_amt: taxExpense,
        depreciation_amt: depreciation,
        amortization_amt: amortization,
        total_assets_amt: totalAssets,
        total_liabilities_amt: totalLiabilities,
        shareholders_equity_amt: equity,
        ebitda_amt: ebitda,
        noi_amt: noi,
        total_debt_service_amt: totalDebtService,
        tangible_net_worth_usd: tangibleNetWorth,
      });
    }
  }

  return rows;
}

/* ────────────────── Facility Credit Approval Generator ────────────────── */

function generateCreditApprovals(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
  registry: IDRegistry,
): FacilityCreditApprovalRow[] {
  const approvalIds = registry.allocate(
    'facility_credit_approval',
    chain.facilities.length,
    config.scenario_id,
  );
  const lastDate = config.timeline.as_of_dates[config.timeline.as_of_dates.length - 1];

  const approvers = [
    'Credit Committee', 'Senior Credit Officer', 'Regional Credit Head',
    'Portfolio Management', 'Chief Credit Officer',
  ];

  return chain.facilities.map((fac, i) => {
    const profile = cpProfileMap.get(fac.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const rng = mulberry32(hashStr(`appr.${fac.facility_id}`));

    // Stressed facilities may have exceptions
    const isStressed = ['DETERIORATING', 'STRESSED_SECTOR'].includes(arc);
    const hasException = isStressed && rng() < 0.6;

    const exceptionTypes: Record<string, { code: string; severity: string; reason: string }> = {
      COVENANT_WAIVER:   { code: 'COV_WAIVE', severity: 'MEDIUM', reason: 'Financial covenant waiver due to temporary market conditions' },
      RATING_EXCEPTION:  { code: 'RTG_EXCPT', severity: 'HIGH',   reason: 'Approved despite below-threshold internal rating' },
      LIMIT_EXCEPTION:   { code: 'LMT_EXCPT', severity: 'MEDIUM', reason: 'Single-name concentration limit exceeded' },
      COLLATERAL_SHORTFALL: { code: 'COL_SHORT', severity: 'LOW', reason: 'Collateral coverage below policy minimum' },
    };
    const exceptionKeys = Object.keys(exceptionTypes);
    const exType = hasException ? exceptionKeys[Math.floor(rng() * exceptionKeys.length)] : null;
    const exDetail = exType ? exceptionTypes[exType] : null;

    return {
      approval_id: approvalIds[i],
      facility_id: fac.facility_id,
      counterparty_id: fac.counterparty_id,
      as_of_date: lastDate,
      approval_status: 'APPROVED',
      approval_date: fac.origination_date,
      approved_amount: fac.committed_facility_amt,
      exception_flag: hasException ? 'Y' : 'N',
      exception_type: exType,
      exception_type_code: exDetail?.code ?? null,
      exception_severity: exDetail?.severity ?? null,
      exception_reason: exDetail?.reason ?? null,
      approved_by: approvers[Math.floor(rng() * approvers.length)],
      expiry_date: fac.maturity_date,
    };
  });
}

/* ────────────────── Facility Risk Snapshot Generator ────────────────── */

function generateFacilityRisk(
  chain: L1Chain,
  config: ScenarioConfig,
  cpProfileMap: Map<number, { arc: StoryArc; tier: RatingTier }>,
): FacilityRiskSnapshotRow[] {
  const rows: FacilityRiskSnapshotRow[] = [];
  const dates = config.timeline.as_of_dates;

  for (const facility of chain.facilities) {
    const profile = cpProfileMap.get(facility.counterparty_id);
    const arc = profile?.arc ?? 'STABLE_IG';
    const tier = profile?.tier ?? 'IG_MID';
    const tierData = RATING_TIER_MAP[tier];
    const cp = chain.counterparties.find(c => c.counterparty_id === facility.counterparty_id);
    const baseRW = TIER_BASE_RW[tier];

    const isRevolving = facility.revolving_flag === 'Y';
    const committed = facility.committed_facility_amt;

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      const cycleIdx = Math.min(dateIdx + 2, 4);
      const utilRate = STORY_UTILIZATION[arc][cycleIdx];
      const pdMult = STORY_PD_MULTIPLIERS[arc][cycleIdx];

      const drawn = Math.round(committed * utilRate);
      const undrawn = committed - drawn;

      // PD = base PD * story arc multiplier
      const pdBase = (tierData.pdLow + tierData.pdHigh) / 2;
      const pd = Math.round(pdBase * pdMult * 10000) / 10000;

      // LGD from tier
      const lgd = tierData.lgd;

      // CCF: revolving 75%, term 100%
      const ccf = isRevolving ? 0.75 : 1.0;

      // EAD = drawn + CCF * undrawn
      const ead = Math.round(drawn + ccf * undrawn);

      // Expected loss = EAD * PD * LGD
      const expectedLoss = Math.round(ead * pd * lgd);
      const expectedLossRate = ead > 0 ? Math.round(expectedLoss / ead * 10000) / 10000 : 0;

      // Risk weight adjusted by PD multiplier
      const riskWeight = Math.round(baseRW * Math.max(0.5, pdMult) * 100) / 100;
      const rwa = Math.round(ead * riskWeight / 100);

      rows.push({
        facility_id: facility.facility_id,
        as_of_date: dates[dateIdx],
        counterparty_id: facility.counterparty_id,
        pd_pct: pd,
        lgd_pct: lgd,
        ccf,
        ead_amt: ead,
        expected_loss_amt: expectedLoss,
        rwa_amt: rwa,
        risk_weight_pct: riskWeight,
        internal_risk_rating: cp?.internal_risk_rating ?? '5',
        currency_code: facility.currency_code,
        expected_loss_rate_pct: expectedLossRate,
      });
    }
  }

  return rows;
}
