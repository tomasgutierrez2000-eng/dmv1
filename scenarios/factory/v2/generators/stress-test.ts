/**
 * Generator: stress_test_result, stress_test_breach
 * Activates for scenarios with sector stress or crisis conditions.
 * Produces summary-level results and detailed breach records.
 */
import type { FacilityStateMap, SqlRow, SectorCondition } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { IDRegistry } from '../../id-registry';
import type { MarketEnvironment } from '../market-environment';
import { seededRng } from '../prng';

export interface StressTestRows {
  results: SqlRow[];
  breaches: SqlRow[];
}

export function generateStressTestRows(
  stateMap: FacilityStateMap,
  facilityIds: string[],
  dates: string[],
  registry: IDRegistry,
  market: MarketEnvironment,
  scenarioId: string,
): StressTestRows {
  const results: SqlRow[] = [];
  const breaches: SqlRow[] = [];

  // Only generate stress test rows on the last snapshot date
  const date = dates[dates.length - 1];

  const rng = seededRng(`stress-${scenarioId}-${date}`);
  const snapshot = market.getSnapshot(date, rng);
  const sectorConditions = snapshot.sector_conditions;
  const hasStress = Array.from(sectorConditions.values()).some(
    sc => sc.stress_level === 'STRESSED' || sc.stress_level === 'CRISIS'
  );

  if (!hasStress) return { results, breaches };

  // Aggregate portfolio-level stress result
  let totalLoss = 0;
  let totalCapitalImpact = 0;
  const breachedFacilities: { facilityId: string; loss: number; counterpartyId: string }[] = [];

  for (const facId of facilityIds) {
    const state = stateMap.get(stateKey(facId, date));
    if (!state) continue;

    const sectorCond = sectorConditions.get(state.industry_id);
    if (!sectorCond || (sectorCond.stress_level !== 'STRESSED' && sectorCond.stress_level !== 'CRISIS')) {
      continue;
    }

    const stressedLoss = state.ead * state.pd_annual * sectorCond.pd_multiplier * state.lgd_current;
    const capitalImpact = state.rwa * 0.08 * sectorCond.pd_multiplier;
    totalLoss += stressedLoss;
    totalCapitalImpact += capitalImpact;

    if (stressedLoss > state.committed_amount * 0.05) {
      breachedFacilities.push({
        facilityId: facId,
        loss: stressedLoss,
        counterpartyId: state.counterparty_id,
      });
    }
  }

  if (totalLoss === 0) return { results, breaches };

  const resultId = registry.allocate('stress_test_result', 1)[0];
  results.push({
    result_id: resultId,
    scenario_id: parseInt(scenarioId.replace(/^S0*/, ''), 10) || 0,
    as_of_date: date,
    result_description: `Factory stress test: ${breachedFacilities.length} facilities breached across ${facilityIds.length} total`,
    loss_amount: Math.round(totalLoss * 100) / 100,
    capital_impact: Math.round(totalCapitalImpact * 100) / 100,
    result_status: breachedFacilities.length > 0 ? 'BREACH' : 'PASS',
    scenario_type: 'SECTOR_STRESS',
  });

  for (const bf of breachedFacilities) {
    const breachId = registry.allocate('stress_test_breach', 1)[0];
    breaches.push({
      breach_id: breachId,
      scenario_id: parseInt(scenarioId.replace(/^S0*/, ''), 10) || 0,
      as_of_date: date,
      limit_rule_id: null,
      counterparty_id: bf.counterpartyId,
      breach_amount: Math.round(bf.loss * 100) / 100,
      breach_amount_usd: Math.round(bf.loss * 100) / 100,
      breach_severity: bf.loss > 50_000_000 ? 'CRITICAL' : bf.loss > 10_000_000 ? 'HIGH' : 'MEDIUM',
      control_description: null,
      control_owner: null,
      failure_description: `Facility ${bf.facilityId} stressed loss exceeds 5% of committed`,
      lob_segment_id: null,
      stress_test_result_id: resultId,
    });
  }

  return { results, breaches };
}
