/**
 * Generator: collateral_snapshot
 * Reads: collateral_value, collateral_type, ltv_ratio
 */
import type { FacilityStateMap, SqlRow } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round, seededRng } from '../prng';

/** Map collateral type to CRM type code (Basel credit risk mitigation). */
const CRM_TYPE_MAP: Record<string, string> = {
  RE: 'CRE',
  RECEIVABLES: 'FIN_RECV',
  FLEET: 'PHYS_COLL',
  EQUIPMENT: 'PHYS_COLL',
  CASH: 'CASH_COLL',
  NONE: 'UNSECURED',
};

/** Map collateral type to mitigant group code. */
const MITIGANT_GROUP_MAP: Record<string, string> = {
  RE: 'REAL_ESTATE',
  RECEIVABLES: 'FINANCIAL',
  FLEET: 'PHYSICAL',
  EQUIPMENT: 'PHYSICAL',
  CASH: 'CASH',
  NONE: 'NONE',
};

export function generateCollateralRows(
  stateMap: FacilityStateMap,
  facilityIds: number[],
  dates: string[],
  registry: IDRegistry,
  collateralAssetMap: Map<number, number>, // facility_id → collateral_asset_id
): SqlRow[] {
  const rows: SqlRow[] = [];

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
      }

      // Haircut percentage based on collateral type
      const haircutPct = state.collateral_type === 'CASH' ? 0
        : state.collateral_type === 'RE' ? 0.15
        : state.collateral_type === 'RECEIVABLES' ? 0.20
        : state.collateral_type === 'EQUIPMENT' ? 0.25
        : 0.30;

      const eligibleAmount = round(state.collateral_value * (1 - haircutPct), 2);
      const allocatedAmount = round(Math.min(eligibleAmount, state.drawn_amount), 2);

      rows.push({
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
        crm_type_code: CRM_TYPE_MAP[state.collateral_type] ?? 'UNSECURED',
        mitigant_group_code: MITIGANT_GROUP_MAP[state.collateral_type] ?? 'NONE',
        mitigant_subtype: state.collateral_type,
        is_risk_shifting_flag: state.collateral_type === 'CASH',
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });
    }
  }

  return rows;
}
