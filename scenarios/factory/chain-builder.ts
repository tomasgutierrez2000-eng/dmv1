/**
 * Chain Builder — generates L1 data (counterparty → agreement → facility) with guaranteed FK integrity.
 *
 * Takes a scenario config + ID registry and produces a complete L1 chain
 * where every FK reference is guaranteed to exist.
 *
 * The chain is built atomically: counterparties first, then agreements
 * referencing those counterparties, then facilities referencing both.
 */

import type { IDRegistry } from './id-registry';
import type { ScenarioConfig } from './scenario-config';
import {
  enrichCounterparty,
  enrichAgreement,
  enrichFacilities,
  enrichLenderAllocation,
  type EnrichedCounterparty,
  type EnrichedAgreement,
  type EnrichedFacility,
  type EnrichedAllocation,
} from './gsib-enrichment';
import { seededRng } from './v2/prng';
import { FACTORY_SOURCE_SYSTEM_ID } from './v2/types';

/* ────────────────── Output Types ────────────────── */

export interface L1Chain {
  counterparties: EnrichedCounterparty[];
  agreements: EnrichedAgreement[];
  facilities: EnrichedFacility[];
  hierarchies?: HierarchyRow[];
  collateral_assets?: CollateralAssetRow[];
  limit_rules?: LimitRuleRow[];
  facility_lender_allocations?: EnrichedAllocation[];
}

export interface HierarchyRow {
  counterparty_id: string;
  as_of_date: string;
  immediate_parent_id: string;
  ultimate_parent_id: string;
  ownership_pct: number;
  record_source?: string;
  created_by?: string;
}

export interface CollateralAssetRow {
  collateral_asset_id: string;
  collateral_type_id: number;
  counterparty_id: string;
  country_code: string;
  currency_code: string;
  legal_entity_id: number;
  effective_start_date: string;
  description: string;
  collateral_status?: string;
  is_current_flag?: boolean;
  is_regulatory_eligible_flag?: boolean;
  source_system_id?: number;
  record_source?: string;
  created_by?: string;
}

export interface LimitRuleRow {
  limit_rule_id: string;
  limit_type: string;
  limit_amount_usd: number;
  counterparty_id: string | null;
  record_source?: string;
  created_by?: string;
}

/* ────────────────── Chain Builder ────────────────── */

/**
 * Build a complete L1 chain from a scenario config.
 * All IDs are allocated from the registry (collision-free).
 * All FK references are guaranteed to exist.
 */
export function buildL1Chain(config: ScenarioConfig, registry: IDRegistry): L1Chain {
  const cpCount = config.counterparties.length;
  const facPerCp = config.facilities.per_counterparty;

  // 1. Allocate all IDs upfront
  const cpIds = registry.allocate('counterparty', cpCount, config.scenario_id);
  const agrIds = registry.allocate('credit_agreement_master', cpCount, config.scenario_id);
  const facIds = registry.allocate('facility_master', cpCount * facPerCp, config.scenario_id);

  // Version-pinned scenario seed for deterministic PRNG
  const scenarioSeed = `${config.scenario_id}.v1`;

  // 2. Build counterparties (enriched with GSIB fields)
  const counterparties = config.counterparties.map((profile, i) =>
    enrichCounterparty(profile, cpIds[i], scenarioSeed)
  );

  // 3. Build agreements (each referencing its counterparty)
  const agreements = counterparties.map((cp, i) =>
    enrichAgreement(agrIds[i], cp, config.counterparties[i].size, scenarioSeed)
  );

  // 4. Build facilities (each referencing agreement + counterparty)
  const facilities: EnrichedFacility[] = [];
  for (let i = 0; i < cpCount; i++) {
    const cpFacIds = facIds.slice(i * facPerCp, (i + 1) * facPerCp);
    const cpFacs = enrichFacilities(
      counterparties[i],
      agrIds[i],
      cpFacIds,
      config.counterparties[i].size,
      config.counterparties[i].rating_tier,
      scenarioSeed,
    );
    facilities.push(...cpFacs);
  }

  // 5. Build lender allocations (100% bank share for each facility)
  const allocIds = registry.allocate('facility_lender_allocation', facilities.length, config.scenario_id);
  const facility_lender_allocations = facilities.map((fac, i) => enrichLenderAllocation(fac, allocIds[i]));

  // 6. Build optional components based on scenario type

  // Hierarchies (for cross-entity scenarios)
  let hierarchies: HierarchyRow[] | undefined;
  if (cpCount > 1 && (config.type === 'EXPOSURE_BREACH' || config.type === 'SYNDICATED_FACILITY')) {
    const lastDate = config.timeline.as_of_dates[config.timeline.as_of_dates.length - 1];
    const hierarchyRng = seededRng(`hierarchy-${config.scenario_id}`);
    hierarchies = [];
    // First counterparty is parent (self-referencing)
    hierarchies.push({
      counterparty_id: cpIds[0],
      as_of_date: lastDate,
      immediate_parent_id: cpIds[0],
      ultimate_parent_id: cpIds[0],
      ownership_pct: 100,
      record_source: 'DATA_FACTORY_V2',
      created_by: 'data-factory-v2',
    });
    // Rest are children of the first
    for (let i = 1; i < cpCount; i++) {
      hierarchies.push({
        counterparty_id: cpIds[i],
        as_of_date: lastDate,
        immediate_parent_id: cpIds[0],
        ultimate_parent_id: cpIds[0],
        ownership_pct: Math.round(50 + hierarchyRng() * 50),
        record_source: 'DATA_FACTORY_V2',
        created_by: 'data-factory-v2',
      });
    }
  }

  // Collateral assets (for collateral-decline scenarios)
  let collateral_assets: CollateralAssetRow[] | undefined;
  if (config.type === 'COLLATERAL_DECLINE') {
    const assetCount = config.l2_tables?.collateral_snapshot?.asset_count ?? 8;
    const assetIds = registry.allocate('collateral_asset_master', assetCount, config.scenario_id);
    const cpCountry = config.counterparties[0]?.country ?? 'US';
    // Valid collateral_type_ids from l1.collateral_type seed data (1-10)
    const VALID_COLLATERAL_TYPE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    collateral_assets = assetIds.map((id, i) => ({
      collateral_asset_id: id,
      collateral_type_id: VALID_COLLATERAL_TYPE_IDS[i % VALID_COLLATERAL_TYPE_IDS.length],
      counterparty_id: cpIds[i % cpCount],
      country_code: cpCountry,
      currency_code: cpCountry === 'US' ? 'USD' : cpCountry === 'GB' ? 'GBP' : 'USD',
      legal_entity_id: ((i % 12) + 1),     // 1-12
      effective_start_date: '2024-01-01',
      description: `Property ${i + 1} — ${config.name}`,
      collateral_status: 'ACTIVE',
      is_current_flag: 'Y',
      is_regulatory_eligible_flag: 'Y',
      source_system_id: FACTORY_SOURCE_SYSTEM_ID,
      record_source: 'DATA_FACTORY_V2',
      created_by: 'data-factory-v2',
    }));
  }

  // Limit rules (for exposure-breach scenarios)
  let limit_rules: LimitRuleRow[] | undefined;
  if (config.limit) {
    const limitIds = registry.allocate('limit_rule', 1, config.scenario_id);
    limit_rules = [{
      limit_rule_id: limitIds[0],
      limit_type: config.limit.limit_type ?? 'SINGLE_NAME',
      limit_amount_usd: config.limit.limit_amount,
      counterparty_id: cpIds[0],
      record_source: 'DATA_FACTORY_V2',
      created_by: 'data-factory-v2',
    }];
  }

  return {
    counterparties,
    agreements,
    facilities,
    hierarchies,
    collateral_assets,
    limit_rules,
    facility_lender_allocations,
  };
}
