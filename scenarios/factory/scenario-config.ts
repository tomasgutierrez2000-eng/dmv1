/**
 * Scenario Narrative Config — YAML schema and parser.
 *
 * Each scenario is a YAML file describing WHAT the data tells,
 * not HOW to generate the SQL. The factory handles the HOW.
 */

import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import YAML from 'yaml';
import type { StoryArc, RatingTier, SizeProfile } from '../../scripts/shared/mvp-config';

/* ────────────────── Scenario Type Taxonomy ────────────────── */

export type ScenarioType =
  | 'EXPOSURE_BREACH'       // S1, S4: limit utilization exceeds threshold
  | 'DETERIORATION_TREND'   // S2, S17: multi-month credit quality decline
  | 'RATING_DIVERGENCE'     // S3: internal vs external rating gap
  | 'COLLATERAL_DECLINE'    // S6: collateral value drop triggers events
  | 'STRESS_TEST'           // S5: stress scenario with breaches
  | 'EVENT_CASCADE'         // S15, S16: credit event → amendment → exception chain
  | 'PIPELINE_SPIKE'        // S9: new facility onboarding surge
  | 'DELINQUENCY_TREND'     // S18: rising delinquency across borrowers
  | 'SYNDICATED_FACILITY'   // S7: multi-party syndicated deal
  | 'BREACH_RESOLUTION'     // S8: limit breach → corrective action → resolution
  | 'DATA_QUALITY'          // S11: data quality score deterioration
  | 'PRODUCT_MIX'           // S12: FR2590 product category shift
  | 'LEVERAGED_FINANCE'     // S13: high-yield high-risk portfolio
  | 'REGULATORY_NEAR_MISS'  // S14: capital ratio approaching minimum
  | 'MATURITY_WALL';        // S10: concentration of upcoming maturities

/* ────────────────── Counterparty Profile ────────────────── */

export interface CounterpartyProfile {
  legal_name: string;
  country: string;                    // ISO 2-letter: US, GB, DE, etc.
  industry_id: number;                // FK to industry_dim
  rating_tier: RatingTier;
  story_arc: StoryArc;
  size: SizeProfile;
  // Optional overrides
  counterparty_type?: string;         // CORPORATE, FINANCIAL_INSTITUTION, etc.
  entity_type_code?: string;
  basel_asset_class?: string;
  external_rating_sp?: string;        // Explicit S&P rating
  external_rating_moodys?: string;    // Explicit Moody's rating
  internal_risk_rating?: string;      // Explicit internal rating
  pd_annual?: number;                 // Explicit PD
  lgd_unsecured?: number;             // Explicit LGD
}

/* ────────────────── Facility Config ────────────────── */

export interface FacilityConfig {
  per_counterparty: number;           // Average facilities per counterparty
  types?: string[];                   // Facility types to use (defaults to pool selection)
  total_commitment_range?: [number, number]; // Override COMMITMENT_RANGES
}

/* ────────────────── Timeline Config ────────────────── */

export interface TimelineConfig {
  as_of_dates: string[];              // ['2024-11-30', '2024-12-31', '2025-01-31']
}

/* ────────────────── Events Config ────────────────── */

export interface CreditEventConfig {
  type: string;                       // DOWNGRADE, DEFAULT, COVENANT_BREACH, etc.
  date: string;                       // YYYY-MM-DD
  description?: string;
  severity?: string;                  // LOW, MEDIUM, HIGH, CRITICAL
}

export interface RiskFlagConfig {
  code: string;                       // SECTOR_CONCENTRATION, MATURITY_WALL, etc.
  severity: string;                   // LOW, MEDIUM, HIGH, CRITICAL
  description?: string;
}

export interface AmendmentConfig {
  type: string;                       // COVENANT_WAIVER, RATE_MODIFICATION, etc.
  status: string;                     // EFFECTIVE, APPROVED, PENDING
  date: string;
  description?: string;
}

export interface EventsConfig {
  credit_events?: CreditEventConfig[];
  risk_flags?: RiskFlagConfig[];
  amendments?: AmendmentConfig[];
}

/* ────────────────── Stress Test Config ────────────────── */

export interface StressTestConfig {
  scenario_name: string;
  loss_amount: number;
  result_status: string;              // PASSED, FAILED
  breaches?: { counterparty_index: number; amount: number; severity: string }[];
}

/* ────────────────── Limit Config ────────────────── */

export interface LimitConfig {
  limit_amount: number;
  utilization_trend?: number[];       // Per as_of_date utilization percentages
  limit_type?: string;                // SINGLE_NAME, SECTOR, GROUP, etc.
}

/* ────────────────── L2 Table Overrides ────────────────── */

export interface L2TableOverrides {
  counterparty_rating_observation?: {
    generate: boolean;
    ratings_before?: { sp?: string; moodys?: string; internal?: string };
    ratings_after?: { sp?: string; moodys?: string; internal?: string };
  };
  facility_exposure_snapshot?: { generate: boolean };
  collateral_snapshot?: {
    generate: boolean;
    asset_count?: number;
    decline_pct?: number;
  };
  facility_delinquency_snapshot?: { generate: boolean };
  facility_pricing_snapshot?: { generate: boolean };
  deal_pipeline_fact?: {
    generate: boolean;
    pipeline_count?: number;
    stages?: string[];
  };
  data_quality_score_snapshot?: {
    generate: boolean;
    dimensions?: { name: string; score: number }[];
  };
  risk_flag?: { generate: boolean };
  stress_test_result?: { generate: boolean };
  limit_utilization_event?: { generate: boolean };
  limit_contribution_snapshot?: { generate: boolean };
  exposure_counterparty_attribution?: { generate: boolean };
  // New table overrides
  facility_financial_snapshot?: { generate: boolean };
  facility_risk_snapshot?: { generate: boolean };
  position?: { generate: boolean };
  cash_flow?: { generate: boolean };
  facility_lob_attribution?: { generate: boolean };
  counterparty_financial_snapshot?: { generate: boolean };
  facility_profitability_snapshot?: { generate: boolean };
  amendment_change_detail?: { generate: boolean };
  exception_event?: { generate: boolean };
  facility_credit_approval?: { generate: boolean };
  financial_metric_observation?: { generate: boolean };
  netting_set_exposure_snapshot?: { generate: boolean };
  metric_threshold?: { generate: boolean };
}

/* ────────────────── Full Scenario Config ────────────────── */

export interface ScenarioConfig {
  scenario_id: string;                // S19, S20, etc.
  name: string;
  type: ScenarioType;
  narrative: string;

  counterparties: CounterpartyProfile[];
  facilities: FacilityConfig;
  timeline: TimelineConfig;

  events?: EventsConfig;
  stress_test?: StressTestConfig;
  limit?: LimitConfig;
  l2_tables?: L2TableOverrides;

  // Verification query hint (used for auto-generating checks)
  verification?: {
    min_rows?: number;
    key_assertion?: string;           // Human-readable assertion
  };

  // ── V2 extensions (optional — all have defaults) ──

  /** Market environment configuration. */
  market_environment?: {
    preset: 'CURRENT_2024' | 'CUTTING_CYCLE' | 'RISING_RATES' | 'RATE_PLATEAU' | 'ZERO_LOWER_BOUND' | 'CUSTOM';
    sector_shocks?: {
      industry_id: number;
      stress_level: 'NORMAL' | 'ELEVATED' | 'STRESSED' | 'CRISIS';
      effective_date: string;
    }[];
    rate_overrides?: Record<string, number>;
  };

  /** Time series configuration — overrides timeline.as_of_dates when set. */
  time_series?: {
    start_date: string;
    end_date: string;
    frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY';
  };

  /** Lifecycle configuration. */
  lifecycle?: {
    include_matured?: boolean;
    include_workouts?: boolean;
    refinancing_probability?: number;
  };

  /** Covenant override configuration. */
  covenants?: {
    override?: boolean;
    packages?: {
      type: string;
      threshold: number;
      direction: 'MIN' | 'MAX';
      warning_buffer_pct: number;
    }[];
  };
}

/* ────────────────── Parser ────────────────── */

const DEFAULT_TIMELINE: TimelineConfig = {
  as_of_dates: ['2024-11-30', '2024-12-31', '2025-01-31'],
};

const DEFAULT_FACILITIES: FacilityConfig = {
  per_counterparty: 3,
};

/**
 * Parse a scenario YAML file into a typed ScenarioConfig.
 * Applies defaults for missing optional fields.
 */
export function parseScenarioYaml(filePath: string): ScenarioConfig {
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = YAML.parse(raw) as Partial<ScenarioConfig>;

  // Validate required fields
  if (!parsed.scenario_id) throw new Error(`Missing scenario_id in ${filePath}`);
  if (!parsed.name) throw new Error(`Missing name in ${filePath}`);
  if (!parsed.type) throw new Error(`Missing type in ${filePath}`);
  if (!parsed.counterparties || parsed.counterparties.length === 0) {
    throw new Error(`Missing counterparties in ${filePath}`);
  }

  return {
    scenario_id: parsed.scenario_id,
    name: parsed.name,
    type: parsed.type,
    narrative: parsed.narrative ?? '',
    counterparties: parsed.counterparties,
    facilities: { ...DEFAULT_FACILITIES, ...parsed.facilities },
    timeline: { ...DEFAULT_TIMELINE, ...parsed.timeline },
    events: parsed.events,
    stress_test: parsed.stress_test,
    limit: parsed.limit,
    l2_tables: parsed.l2_tables,
    verification: parsed.verification,
  };
}

/**
 * Load all scenario YAML files from the narratives directory.
 * Returns them sorted by scenario_id.
 */
export function loadAllScenarios(narrativesDir?: string): ScenarioConfig[] {
  const dir = narrativesDir ?? path.join(__dirname, '..', 'narratives');
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort();

  return files.map(f => parseScenarioYaml(path.join(dir, f)));
}
