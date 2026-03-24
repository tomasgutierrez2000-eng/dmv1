/**
 * V2 Generator Orchestrator — replaces the monolithic l2-generator.ts.
 *
 * Pipeline:
 *   1. Initialize FacilityStateManager from L1 chain
 *   2. Generate date grid from time series config
 *   3. Step through each date, evolving all facility states
 *   4. Call each focused generator to produce L2 table rows
 *   5. Return complete L2 data package
 */

import type { StoryArc, RatingTier, SizeProfile } from '../../../../scripts/shared/mvp-config';
import type {
  FacilityState, FacilityStateMap, TimeFrequency, TableData,
  V2MarketConfig, V2TimeSeriesConfig,
} from '../types';

import type { L1Chain } from '../../chain-builder';
import type { IDRegistry } from '../../id-registry';
import { reportInvariants, type InvariantViolation } from '../invariants';

import { FacilityStateManager } from '../facility-state';
import { MarketEnvironment } from '../market-environment';
import { generateDateGrid, frequencyToDt } from '../time-series';

// Generator imports
import { generateExposureRows } from './exposure';
import { generatePricingRows } from './pricing';
import { generateRiskRows } from './risk';
import { generateFinancialRows } from './financial';
import { generatePositionRows } from './position';
import { generateCashFlowRows } from './cash-flow';
import { generateDelinquencyRows } from './delinquency';
import { generateRatingRows } from './rating';
import { generateCollateralRows } from './collateral';
import { generateProfitabilityRows } from './profitability';
import { generateEventRows } from './events';
import { generateLimitRows } from './limits';
import { generatePipelineRows } from './pipeline';
import { generateCounterpartyFinancialRows } from './cp-financial';
import { generateProvisionRows } from './provision';
import { generateStressTestRows } from './stress-test';
import { generateProductTableRows } from './product-tables';
import { generateFxRateRows } from './fx-rate';

// ─── Generator Dependency Declarations ────────────────────────────────
//
// Each generator declares its name and which other generators must run first.
// The orchestrator validates execution order against these declarations.

export interface GeneratorDef {
  /** Unique name matching the execution step. */
  name: string;
  /** Names of generators that MUST run before this one. */
  dependsOn: string[];
}

/**
 * Static registry of all generators and their dependencies.
 * Order here matches intended execution order in generateV2Data().
 */
export const GENERATOR_REGISTRY: GeneratorDef[] = [
  { name: 'fx-rate',               dependsOn: [] },
  { name: 'exposure',              dependsOn: [] },
  { name: 'pricing',               dependsOn: [] },
  { name: 'risk',                  dependsOn: [] },
  { name: 'financial',             dependsOn: [] },
  { name: 'position',              dependsOn: [] },
  { name: 'product-tables',        dependsOn: ['position'] },  // reads positionIdMap from position generator
  { name: 'delinquency',           dependsOn: [] },
  { name: 'rating',                dependsOn: [] },
  { name: 'collateral',            dependsOn: [] },
  { name: 'profitability',         dependsOn: [] },
  { name: 'events',                dependsOn: [] },
  { name: 'limits',                dependsOn: [] },
  { name: 'pipeline',              dependsOn: [] },
  { name: 'cp-financial',          dependsOn: [] },
  { name: 'stress-test',           dependsOn: [] },
];

/**
 * Validate that the declared execution order respects all dependency constraints.
 * Throws if any generator runs before a generator it depends on.
 */
export function validateGeneratorOrder(registry: GeneratorDef[]): void {
  const executed = new Set<string>();
  for (const gen of registry) {
    for (const dep of gen.dependsOn) {
      if (!executed.has(dep)) {
        throw new Error(
          `Generator "${gen.name}" depends on "${dep}" but "${dep}" has not run yet. ` +
          `Reorder GENERATOR_REGISTRY so "${dep}" appears before "${gen.name}".`
        );
      }
    }
    executed.add(gen.name);
  }
}

// Validate at module load time — catches ordering bugs immediately
validateGeneratorOrder(GENERATOR_REGISTRY);

// ─── Configuration ─────────────────────────────────────────────────────

export interface V2GeneratorConfig {
  /** Scenario identifier (e.g., "S19"). */
  scenarioId?: string;
  /** Market environment configuration. */
  market?: V2MarketConfig;
  /** Time series configuration. */
  timeSeries: V2TimeSeriesConfig;
  /** Default time frequency. */
  frequency?: TimeFrequency;
  /** Story arc assignments per counterparty. */
  storyArcs: Map<string, StoryArc>;
  /** Rating tier assignments per counterparty. */
  ratingTiers: Map<string, RatingTier>;
  /** Size profile assignments per counterparty. */
  sizeProfiles: Map<string, SizeProfile>;
  /** Backward-compat: explicit as_of_dates override. */
  snapshotDates?: string[];
  /** Limit rule map: counterparty_id → limit_rule_id. */
  limitRules?: Map<string, string>;
}

// ─── Output ────────────────────────────────────────────────────────────

export interface V2GeneratorOutput {
  /** All generated table data. */
  tables: TableData[];
  /** The state map for inspection/validation. */
  stateMap: FacilityStateMap;
  /** Generated date grid. */
  dates: string[];
  /** Summary statistics. */
  stats: {
    facilityCount: number;
    dateCount: number;
    totalRows: number;
    tableBreakdown: Record<string, number>;
    invariantViolations: number;
  };
}

// ─── Orchestrator ──────────────────────────────────────────────────────

/**
 * Generate all L2 data for a scenario.
 *
 * This is the single entry point that replaces generateL2Data()
 * from the old l2-generator.ts.
 */
export function generateV2Data(
  chain: L1Chain,
  config: V2GeneratorConfig,
  registry: IDRegistry,
): V2GeneratorOutput {
  const frequency = config.frequency ?? 'WEEKLY';

  // ── Step 1: Generate date grid ──
  const dates = config.snapshotDates && config.snapshotDates.length > 0
    ? [...config.snapshotDates].sort()
    : generateDateGrid({
        start_date: config.timeSeries.start_date,
        end_date: config.timeSeries.end_date,
        frequency,
      });

  if (dates.length === 0) {
    throw new Error('No dates generated — check time series configuration');
  }

  // ── Step 2: Initialize market environment ──
  const market = new MarketEnvironment(
    config.market?.preset ?? 'CURRENT_2024',
    config.market?.sector_shocks ?? [],
    config.market?.rate_overrides ?? {},
  );

  // ── Step 3: Initialize facility state manager ──
  const manager = new FacilityStateManager();
  manager.initialize(
    chain,
    config.storyArcs,
    config.ratingTiers,
    config.sizeProfiles,
    dates[0],
  );

  // ── Step 4: Evolve through date grid ──
  for (let i = 1; i < dates.length; i++) {
    manager.step(dates[i], i, dates, market, frequency);
  }

  const stateMap = manager.getStateMap();
  const financials = manager.getAllFinancials();
  const facilityIds = chain.facilities.map(f => f.facility_id);

  // ── Step 4b: Aggregate invariant violations from state evolution ──
  const allViolations: InvariantViolation[] = [];
  for (const [, state] of stateMap) {
    if (state._invariantViolations && state._invariantViolations.length > 0) {
      allViolations.push(...state._invariantViolations);
    }
  }
  if (allViolations.length > 0) {
    reportInvariants(allViolations, true);
  }

  // ── Step 5: Run all generators ──
  const tables: TableData[] = [];
  const tableBreakdown: Record<string, number> = {};

  // 0. FX Rates — must run before exposure so metric JOINs on fx.as_of_date have matching rows
  const currencies = new Set(chain.facilities.map(f => f.currency_code));
  currencies.add('USD'); // always include USD
  const fxRateRows = generateFxRateRows(currencies, dates, registry);
  tables.push({ schema: 'l2', table: 'fx_rate', rows: fxRateRows });
  tableBreakdown['fx_rate'] = fxRateRows.length;

  // 1. Exposure — pass bank_share_pct from L1 lender allocations (syndicated facilities < 1.0)
  const bankShareMap = new Map<string, number>();
  if (chain.facility_lender_allocations) {
    for (const alloc of chain.facility_lender_allocations) {
      bankShareMap.set(alloc.facility_id, alloc.bank_share_pct);
    }
  }
  const exposureRows = generateExposureRows(stateMap, facilityIds, dates, registry, bankShareMap);
  tables.push({ schema: 'l2', table: 'facility_exposure_snapshot', rows: exposureRows });
  tableBreakdown['facility_exposure_snapshot'] = exposureRows.length;

  // 2. Pricing
  const pricingRows = generatePricingRows(stateMap, facilityIds, dates, registry);
  tables.push({ schema: 'l2', table: 'facility_pricing_snapshot', rows: pricingRows });
  tableBreakdown['facility_pricing_snapshot'] = pricingRows.length;

  // 3. Risk
  const riskRows = generateRiskRows(stateMap, facilityIds, dates);
  tables.push({ schema: 'l2', table: 'facility_risk_snapshot', rows: riskRows });
  tableBreakdown['facility_risk_snapshot'] = riskRows.length;

  // 4. Financial
  const financialRows = generateFinancialRows(stateMap, facilityIds, dates, financials, registry);
  tables.push({ schema: 'l2', table: 'facility_financial_snapshot', rows: financialRows });
  tableBreakdown['facility_financial_snapshot'] = financialRows.length;

  // 5. Position + Position Detail
  const { positions, positionDetails, positionIdMap } = generatePositionRows(stateMap, facilityIds, dates, registry);
  tables.push({ schema: 'l2', table: 'position', rows: positions });
  tables.push({ schema: 'l2', table: 'position_detail', rows: positionDetails });
  tableBreakdown['position'] = positions.length;
  tableBreakdown['position_detail'] = positionDetails.length;

  // 5b. Product-specific snapshot tables (40 tables, 10 products × 4 categories)
  const productOutput = generateProductTableRows(stateMap, facilityIds, dates, positionIdMap);
  for (const [tblName, rows] of productOutput.tables) {
    if (rows.length > 0) {
      tables.push({ schema: 'l2', table: tblName, rows });
      tableBreakdown[tblName] = rows.length;
    }
  }

  // 6. Cash Flow — SKIPPED: l2.cash_flow table does not exist in PostgreSQL schema.
  //    Re-enable when table is created via DDL migration.
  // const cashFlowRows = generateCashFlowRows(stateMap, facilityIds, dates, registry);
  // if (cashFlowRows.length > 0) {
  //   tables.push({ schema: 'l2', table: 'cash_flow', rows: cashFlowRows });
  //   tableBreakdown['cash_flow'] = cashFlowRows.length;
  // }

  // 7. Delinquency
  const delinquencyRows = generateDelinquencyRows(stateMap, facilityIds, dates, registry);
  tables.push({ schema: 'l2', table: 'facility_delinquency_snapshot', rows: delinquencyRows });
  tableBreakdown['facility_delinquency_snapshot'] = delinquencyRows.length;

  // 8. Ratings
  const ratingRows = generateRatingRows(stateMap, facilityIds, dates, registry);
  tables.push({ schema: 'l2', table: 'counterparty_rating_observation', rows: ratingRows });
  tableBreakdown['counterparty_rating_observation'] = ratingRows.length;

  // 9. Collateral
  const collateralAssetMap = new Map<string, string>();
  // Pre-populate from chain if available
  if (chain.collateral_assets) {
    for (const asset of chain.collateral_assets) {
      if ('facility_id' in asset && 'collateral_asset_id' in asset) {
        collateralAssetMap.set(
          (asset as Record<string, string>).facility_id,
          (asset as Record<string, string>).collateral_asset_id,
        );
      }
    }
  }
  const collateralOutput = generateCollateralRows(stateMap, facilityIds, dates, registry, collateralAssetMap);
  // Insert auto-created L1 collateral_asset_master rows BEFORE L2 snapshots
  if (collateralOutput.autoCreatedAssets.length > 0) {
    tables.push({ schema: 'l2', table: 'collateral_asset_master', rows: collateralOutput.autoCreatedAssets });
    tableBreakdown['collateral_asset_master'] = collateralOutput.autoCreatedAssets.length;
  }
  tables.push({ schema: 'l2', table: 'collateral_snapshot', rows: collateralOutput.snapshots });
  tableBreakdown['collateral_snapshot'] = collateralOutput.snapshots.length;

  // 10. Profitability
  const profitabilityRows = generateProfitabilityRows(stateMap, facilityIds, dates, registry);
  tables.push({ schema: 'l2', table: 'facility_profitability_snapshot', rows: profitabilityRows });
  tableBreakdown['facility_profitability_snapshot'] = profitabilityRows.length;

  // 11. Events (credit_event, risk_flag, amendment_event, exception_event)
  const eventRows = generateEventRows(stateMap, facilityIds, dates, registry);
  if (eventRows.creditEvents.length > 0) {
    tables.push({ schema: 'l2', table: 'credit_event', rows: eventRows.creditEvents });
    tableBreakdown['credit_event'] = eventRows.creditEvents.length;
  }
  if (eventRows.creditEventFacilityLinks.length > 0) {
    tables.push({ schema: 'l2', table: 'credit_event_facility_link', rows: eventRows.creditEventFacilityLinks });
    tableBreakdown['credit_event_facility_link'] = eventRows.creditEventFacilityLinks.length;
  }
  if (eventRows.riskFlags.length > 0) {
    tables.push({ schema: 'l2', table: 'risk_flag', rows: eventRows.riskFlags });
    tableBreakdown['risk_flag'] = eventRows.riskFlags.length;
  }
  if (eventRows.amendments.length > 0) {
    tables.push({ schema: 'l2', table: 'amendment_event', rows: eventRows.amendments });
    tableBreakdown['amendment_event'] = eventRows.amendments.length;
  }
  if (eventRows.amendmentChangeDetails.length > 0) {
    tables.push({ schema: 'l2', table: 'amendment_change_detail', rows: eventRows.amendmentChangeDetails });
    tableBreakdown['amendment_change_detail'] = eventRows.amendmentChangeDetails.length;
  }
  if (eventRows.exceptions.length > 0) {
    tables.push({ schema: 'l2', table: 'exception_event', rows: eventRows.exceptions });
    tableBreakdown['exception_event'] = eventRows.exceptions.length;
  }

  // 12. Limits
  const limitRules = config.limitRules ?? new Map<string, string>();
  // Auto-assign limit rules if not provided
  if (limitRules.size === 0 && chain.limit_rules) {
    for (const rule of chain.limit_rules) {
      if (rule.counterparty_id !== null) {
        limitRules.set(rule.counterparty_id, rule.limit_rule_id);
      }
    }
  }
  if (limitRules.size > 0) {
    const { contributions, utilizations } = generateLimitRows(stateMap, facilityIds, dates, registry, limitRules);
    tables.push({ schema: 'l2', table: 'limit_contribution_snapshot', rows: contributions });
    tables.push({ schema: 'l2', table: 'limit_utilization_event', rows: utilizations });
    tableBreakdown['limit_contribution_snapshot'] = contributions.length;
    tableBreakdown['limit_utilization_event'] = utilizations.length;
  }

  // 13. Pipeline
  const pipelineRows = generatePipelineRows(stateMap, facilityIds, dates, registry);
  if (pipelineRows.length > 0) {
    tables.push({ schema: 'l2', table: 'deal_pipeline_fact', rows: pipelineRows });
    tableBreakdown['deal_pipeline_fact'] = pipelineRows.length;
  }

  // 14. Counterparty Financial
  const cpFinRows = generateCounterpartyFinancialRows(stateMap, facilityIds, dates, financials, registry);
  tables.push({ schema: 'l2', table: 'counterparty_financial_snapshot', rows: cpFinRows });
  tableBreakdown['counterparty_financial_snapshot'] = cpFinRows.length;

  // 15. Provision (IFRS 9 ECL) — SKIPPED: l2.ecl_provision_snapshot table does not exist
  //     in PostgreSQL schema. Re-enable when table is created via DDL migration.
  // const provisionRows = generateProvisionRows(stateMap, facilityIds, dates, registry);
  // if (provisionRows.length > 0) {
  //   tables.push({ schema: 'l2', table: 'ecl_provision_snapshot', rows: provisionRows });
  //   tableBreakdown['ecl_provision_snapshot'] = provisionRows.length;
  // }

  // 16. Stress Test (result + breach)
  const stressRows = generateStressTestRows(
    stateMap, facilityIds, dates, registry, market, config.scenarioId ?? 'v2',
  );
  if (stressRows.results.length > 0) {
    tables.push({ schema: 'l2', table: 'stress_test_result', rows: stressRows.results });
    tableBreakdown['stress_test_result'] = stressRows.results.length;
  }
  if (stressRows.breaches.length > 0) {
    tables.push({ schema: 'l2', table: 'stress_test_breach', rows: stressRows.breaches });
    tableBreakdown['stress_test_breach'] = stressRows.breaches.length;
  }

  // ── Facility coverage audit ──
  const exposureTableForAudit = tables.find(t => t.table === 'facility_exposure_snapshot');
  if (exposureTableForAudit) {
    const exposedFacs = new Set(exposureTableForAudit.rows.map(r => String(r.facility_id)));
    const missingFacs = facilityIds.filter(id => !exposedFacs.has(id));
    if (missingFacs.length > 0) {
      console.warn(
        `[COMPLETENESS] ${missingFacs.length}/${facilityIds.length} facilities have NO exposure rows: ` +
        `${missingFacs.slice(0, 5).join(', ')}${missingFacs.length > 5 ? '...' : ''}`
      );
    }
  }

  // ── Stats ──
  const totalRows = tables.reduce((s, t) => s + t.rows.length, 0);

  return {
    tables,
    stateMap,
    dates,
    stats: {
      facilityCount: facilityIds.length,
      dateCount: dates.length,
      totalRows,
      tableBreakdown,
      invariantViolations: allViolations.length,
    },
  };
}
