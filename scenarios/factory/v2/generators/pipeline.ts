/**
 * Generator: deal_pipeline_fact
 * New facilities entering the pipeline
 */
import type { FacilityStateMap, SqlRow } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round, seededRng, pick } from '../prng';

const PIPELINE_STAGES = ['ORIGINATION', 'UNDERWRITING', 'CREDIT_APPROVAL', 'DOCUMENTATION', 'CLOSING'] as const;

export function generatePipelineRows(
  stateMap: FacilityStateMap,
  facilityIds: number[],
  dates: string[],
  registry: IDRegistry,
): SqlRow[] {
  const rows: SqlRow[] = [];

  // Only generate pipeline entries for facilities in COMMITMENT stage
  // on the first date (they're new deals entering the pipeline)
  const firstDate = dates[0];
  if (!firstDate) return rows;

  for (const facId of facilityIds) {
    const state = stateMap.get(stateKey(facId, firstDate));
    if (!state || state.lifecycle_stage !== 'COMMITMENT') continue;

    const rng = seededRng(`pipeline-${facId}`);
    const pipelineId = registry.allocate('deal_pipeline_fact', 1)[0];

    // Determine pipeline stage based on how far from origination
    const stageIdx = Math.min(
      Math.floor(rng() * PIPELINE_STAGES.length),
      PIPELINE_STAGES.length - 1,
    );

    rows.push({
      pipeline_id: pipelineId,
      pipeline_deal_id: pipelineId,
      counterparty_id: state.counterparty_id,
      facility_id: state.facility_id,
      as_of_date: firstDate,
      stage_code: PIPELINE_STAGES[stageIdx],
      pipeline_stage: PIPELINE_STAGES[stageIdx],
      pipeline_status: stageIdx < 3 ? 'ACTIVE' : 'PENDING_CLOSE',
      proposed_amount: round(state.committed_amount, 2),
      expected_committed_amt: round(state.committed_amount, 2),
      expected_exposure_amt: round(state.committed_amount * 0.60, 2),
      expected_spread_bps: round(state.spread_bps, 2),
      expected_all_in_rate_pct: round(state.all_in_rate_pct, 6),
      expected_internal_risk_grade: state.internal_rating,
      expected_tenor_months: String(state.remaining_tenor_months),
      expected_close_date: state.origination_date,
      expected_coverage_ratio: round(state.collateral_value > 0
        ? state.committed_amount / state.collateral_value : 0, 4),
      currency_code: state.currency_code,
      record_level_code: 'FACILITY',
      source_system_id: FACTORY_SOURCE_SYSTEM_ID,
      record_source: 'DATA_FACTORY_V2',
      created_by: 'factory_v2',
    });
  }

  return rows;
}
