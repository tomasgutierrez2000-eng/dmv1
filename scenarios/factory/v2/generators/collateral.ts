/**
 * Generator: collateral_snapshot
 * Reads: collateral_value, collateral_type, ltv_ratio
 */
import type { FacilityStateMap, SqlRow } from '../types';
import {
  stateKey, FACTORY_SOURCE_SYSTEM_ID,
  COLLATERAL_TYPE_ID_MAP, CRM_TYPE_CODE_MAP,
} from '../types';
import type { IDRegistry } from '../../id-registry';
import { round, seededRng } from '../prng';

/** Map collateral type to mitigant group code. */
const MITIGANT_GROUP_MAP: Record<string, string> = {
  RE: 'REAL_ESTATE',
  RECEIVABLES: 'FINANCIAL',
  FLEET: 'PHYSICAL',
  EQUIPMENT: 'PHYSICAL',
  CASH: 'CASH',
  NONE: 'NONE',
};

export interface CollateralOutput {
  snapshots: SqlRow[];
  /** Auto-created collateral_asset_master rows for facilities with no pre-existing L1 asset. */
  autoCreatedAssets: SqlRow[];
}

export function generateCollateralRows(
  stateMap: FacilityStateMap,
  facilityIds: string[],
  dates: string[],
  registry: IDRegistry,
  collateralAssetMap: Map<string, string>, // facility_id → collateral_asset_id
): CollateralOutput {
  const snapshots: SqlRow[] = [];
  const autoCreatedAssets: SqlRow[] = [];
  const preExistingAssetIds = new Set(collateralAssetMap.values());

  for (const date of dates) {
    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state || state.collateral_type === 'NONE') continue;

      const rng = seededRng(`coll-${facId}-${date}`);
      const snapshotId = registry.allocate('collateral_snapshot', 1)[0];

      // Get or create collateral_asset_id for this facility
      let assetId = collateralAssetMap.get(facId);
      if (!assetId) {
        assetId = registry.allocate('collateral_asset', 1)[0];
        collateralAssetMap.set(facId, assetId);
        // Create the L2 collateral_asset_master row (FK parent for collateral_snapshot)
        autoCreatedAssets.push({
          collateral_asset_id: assetId,
          collateral_type_id: COLLATERAL_TYPE_ID_MAP[state.collateral_type] ?? 1,
          counterparty_id: state.counterparty_id,
          country_code: state.country_code,
          currency_code: state.currency_code,
          legal_entity_id: ((parseInt(facId, 10) % 12) + 1),
          effective_start_date: date,
          description: `Collateral asset — facility ${facId}`,
          collateral_status: 'ACTIVE',
          is_current_flag: 'Y',
          is_regulatory_eligible_flag: 'Y',
          // original_cost required for RE assets — basis for origination NOI derivation
          original_cost: state.collateral_type === 'RE'
            ? round(state.collateral_value * 1.05, 2)  // original appraisal value
            : null,
          // NOI at origination = static value from underwriting appraisal (FR Y-14Q CRE H.1)
          noi_at_origination_amt: state.collateral_type === 'RE'
            ? round(state.collateral_value * 1.05 * 0.055, 2)  // ~5.5% cap rate on original value
            : null,
          source_system_id: FACTORY_SOURCE_SYSTEM_ID,
          record_source: 'DATA_FACTORY_V2',
          created_by: 'factory_v2',
        });
      }

      // Haircut percentage based on collateral type
      const haircutPct = state.collateral_type === 'CASH' ? 0
        : state.collateral_type === 'RE' ? 0.15
        : state.collateral_type === 'RECEIVABLES' ? 0.20
        : state.collateral_type === 'EQUIPMENT' ? 0.25
        : 0.30;

      const eligibleAmount = round(state.collateral_value * (1 - haircutPct), 2);
      const allocatedAmount = round(Math.min(eligibleAmount, state.drawn_amount), 2);

      snapshots.push({
        collateral_snapshot_id: snapshotId,
        collateral_asset_id: assetId,
        as_of_date: date,
        facility_id: state.facility_id,
        counterparty_id: state.counterparty_id,
        currency_code: state.currency_code,
        valuation_amount: round(state.collateral_value, 2),
        current_valuation_usd: round(state.collateral_value, 2),
        original_valuation_usd: round(state.collateral_value * 1.05, 2), // Slightly higher at origination
        haircut_pct: round(haircutPct, 6),
        eligible_collateral_amount: eligibleAmount,
        allocated_amount_usd: allocatedAmount,
        crm_type_code: CRM_TYPE_CODE_MAP[state.collateral_type] ?? 'COLLATERAL',
        mitigant_group_code: MITIGANT_GROUP_MAP[state.collateral_type] ?? 'NONE',
        mitigant_subtype: state.collateral_type,
        is_risk_shifting_flag: state.collateral_type === 'CASH' ? 'Y' : 'N',
        // NOI current = time-varying income from collateral asset (CRE property)
        noi_current_amt: state.collateral_type === 'RE'
          ? round(state.collateral_value * 0.06, 2)  // ~6% cap rate for CRE
          : null,
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });
    }
  }

  return { snapshots, autoCreatedAssets };
}
