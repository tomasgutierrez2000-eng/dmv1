/**
 * Validator — pre-emit validation for generated scenario data.
 *
 * Catches errors BEFORE SQL is written:
 *   - FK chain completeness (every facility has agreement + counterparty)
 *   - L2→L1 FK reference integrity
 *   - Financial consistency (drawn <= committed, positive amounts)
 *   - PK uniqueness (no composite PK collisions)
 *   - ID collision detection via registry
 */

import type { L1Chain } from './chain-builder';
import type { L2Data } from './l2-generator';
import type { ScenarioConfig } from './scenario-config';
import type { IDRegistry } from './id-registry';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    l1_counterparties: number;
    l1_agreements: number;
    l1_facilities: number;
    l2_exposure_rows: number;
    l2_event_rows: number;
    total_inserts: number;
  };
}

/**
 * Validate a scenario's generated data for correctness.
 */
export function validateScenario(
  chain: L1Chain,
  l2Data: L2Data,
  config: ScenarioConfig,
  registry?: IDRegistry,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── 1. L1 Chain Completeness ──

  // Every facility must reference an existing agreement
  const agreementIds = new Set(chain.agreements.map(a => a.credit_agreement_id));
  for (const fac of chain.facilities) {
    if (!agreementIds.has(fac.credit_agreement_id)) {
      errors.push(
        `Facility ${fac.facility_id}: references agreement ${fac.credit_agreement_id} which does not exist`
      );
    }
  }

  // Every facility must reference an existing counterparty
  const counterpartyIds = new Set(chain.counterparties.map(c => c.counterparty_id));
  for (const fac of chain.facilities) {
    if (!counterpartyIds.has(fac.counterparty_id)) {
      errors.push(
        `Facility ${fac.facility_id}: references counterparty ${fac.counterparty_id} which does not exist`
      );
    }
  }

  // Every agreement must reference an existing counterparty
  for (const agr of chain.agreements) {
    if (!counterpartyIds.has(agr.borrower_counterparty_id)) {
      errors.push(
        `Agreement ${agr.credit_agreement_id}: references borrower ${agr.borrower_counterparty_id} which does not exist`
      );
    }
  }

  // ── 2. L2→L1 FK References ──

  const facilityIds = new Set(chain.facilities.map(f => f.facility_id));

  // Exposure snapshots
  for (const exp of (l2Data.facility_exposure_snapshot ?? [])) {
    if (!facilityIds.has(exp.facility_id)) {
      errors.push(`Exposure: facility_id ${exp.facility_id} not in L1 chain`);
    }
    if (!counterpartyIds.has(exp.counterparty_id)) {
      errors.push(`Exposure: counterparty_id ${exp.counterparty_id} not in L1 chain`);
    }
  }

  // Credit events
  for (const evt of (l2Data.credit_event ?? [])) {
    if (!counterpartyIds.has(evt.counterparty_id)) {
      errors.push(`Credit event ${evt.credit_event_id}: counterparty_id ${evt.counterparty_id} not in L1`);
    }
  }

  // Credit event facility links
  for (const link of (l2Data.credit_event_facility_link ?? [])) {
    if (!facilityIds.has(link.facility_id)) {
      errors.push(`Event link: facility_id ${link.facility_id} not in L1`);
    }
  }

  // Risk flags
  for (const flag of (l2Data.risk_flag ?? [])) {
    if (flag.facility_id && !facilityIds.has(flag.facility_id)) {
      errors.push(`Risk flag ${flag.risk_flag_id}: facility_id ${flag.facility_id} not in L1`);
    }
    if (flag.counterparty_id && !counterpartyIds.has(flag.counterparty_id)) {
      errors.push(`Risk flag ${flag.risk_flag_id}: counterparty_id ${flag.counterparty_id} not in L1`);
    }
  }

  // Rating observations
  for (const obs of (l2Data.counterparty_rating_observation ?? [])) {
    if (!counterpartyIds.has(obs.counterparty_id)) {
      errors.push(`Rating observation: counterparty_id ${obs.counterparty_id} not in L1`);
    }
  }

  // Collateral snapshots
  for (const cs of (l2Data.collateral_snapshot ?? [])) {
    if (cs.counterparty_id && !counterpartyIds.has(cs.counterparty_id)) {
      errors.push(`Collateral snapshot: counterparty_id ${cs.counterparty_id} not in L1`);
    }
  }

  // ── 3. Financial Consistency ──

  for (const exp of (l2Data.facility_exposure_snapshot ?? [])) {
    if (exp.drawn_amount > exp.committed_amount) {
      errors.push(
        `Facility ${exp.facility_id} on ${exp.as_of_date}: drawn (${exp.drawn_amount}) > committed (${exp.committed_amount})`
      );
    }
    if (exp.drawn_amount < 0) {
      errors.push(`Facility ${exp.facility_id}: negative drawn_amount ${exp.drawn_amount}`);
    }
    if (exp.committed_amount <= 0) {
      errors.push(`Facility ${exp.facility_id}: non-positive committed_amount ${exp.committed_amount}`);
    }

    // Verify undrawn calculation
    const expectedUndrawn = exp.committed_amount - exp.drawn_amount;
    if (Math.abs((exp.undrawn_amount ?? expectedUndrawn) - expectedUndrawn) > 1) {
      warnings.push(
        `Facility ${exp.facility_id}: undrawn mismatch: ${exp.undrawn_amount} vs expected ${expectedUndrawn}`
      );
    }
  }

  // ── 4. PK Uniqueness ──

  // Exposure snapshots: composite PK (facility_id, as_of_date)
  const expPKs = new Set<string>();
  for (const exp of (l2Data.facility_exposure_snapshot ?? [])) {
    const pk = `${exp.facility_id}|${exp.as_of_date}`;
    if (expPKs.has(pk)) {
      errors.push(`Duplicate exposure PK: facility=${exp.facility_id}, date=${exp.as_of_date}`);
    }
    expPKs.add(pk);
  }

  // Risk flags: single PK (risk_flag_id)
  const flagPKs = new Set<number>();
  for (const flag of (l2Data.risk_flag ?? [])) {
    if (flagPKs.has(flag.risk_flag_id)) {
      errors.push(`Duplicate risk_flag PK: ${flag.risk_flag_id}`);
    }
    flagPKs.add(flag.risk_flag_id);
  }

  // Credit events: single PK (credit_event_id)
  const evtPKs = new Set<number>();
  for (const evt of (l2Data.credit_event ?? [])) {
    if (evtPKs.has(evt.credit_event_id)) {
      errors.push(`Duplicate credit_event PK: ${evt.credit_event_id}`);
    }
    evtPKs.add(evt.credit_event_id);
  }

  // ── 5. Data Completeness ──

  if (chain.counterparties.length === 0) {
    errors.push('No counterparties generated');
  }
  if (chain.facilities.length === 0) {
    errors.push('No facilities generated');
  }
  if ((l2Data.facility_exposure_snapshot ?? []).length === 0) {
    warnings.push('No exposure snapshots generated');
  }

  // Check timeline coverage
  const exposureDates = new Set(
    (l2Data.facility_exposure_snapshot ?? []).map(e => e.as_of_date)
  );
  for (const date of config.timeline.as_of_dates) {
    if (!exposureDates.has(date)) {
      warnings.push(`No exposure data for as_of_date ${date}`);
    }
  }

  // ── 6. ID Registry Cross-Check ──

  if (registry) {
    for (const cp of chain.counterparties) {
      // Check that IDs were allocated by this scenario (not squatting on someone else's)
      const allocs = registry.getAllocationsForScenario(config.scenario_id);
      const cpAlloc = allocs.find(a => a.table === 'counterparty');
      if (cpAlloc && (cp.counterparty_id < cpAlloc.startId || cp.counterparty_id > cpAlloc.endId)) {
        errors.push(
          `Counterparty ${cp.counterparty_id} outside allocated range ${cpAlloc.startId}-${cpAlloc.endId}`
        );
      }
    }
  }

  // ── Compute stats ──

  const l2EventRows = (l2Data.credit_event?.length ?? 0) +
    (l2Data.credit_event_facility_link?.length ?? 0) +
    (l2Data.risk_flag?.length ?? 0) +
    (l2Data.amendment_event?.length ?? 0) +
    (l2Data.stress_test_result?.length ?? 0) +
    (l2Data.stress_test_breach?.length ?? 0);

  const l2SnapshotRows = (l2Data.facility_exposure_snapshot?.length ?? 0) +
    (l2Data.counterparty_rating_observation?.length ?? 0) +
    (l2Data.collateral_snapshot?.length ?? 0) +
    (l2Data.facility_delinquency_snapshot?.length ?? 0) +
    (l2Data.facility_pricing_snapshot?.length ?? 0) +
    (l2Data.limit_contribution_snapshot?.length ?? 0) +
    (l2Data.data_quality_score_snapshot?.length ?? 0);

  const totalInserts = chain.counterparties.length +
    chain.agreements.length +
    chain.facilities.length +
    (chain.hierarchies?.length ?? 0) +
    (chain.collateral_assets?.length ?? 0) +
    (chain.limit_rules?.length ?? 0) +
    (chain.facility_lender_allocations?.length ?? 0) +
    l2SnapshotRows + l2EventRows;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      l1_counterparties: chain.counterparties.length,
      l1_agreements: chain.agreements.length,
      l1_facilities: chain.facilities.length,
      l2_exposure_rows: l2Data.facility_exposure_snapshot?.length ?? 0,
      l2_event_rows: l2EventRows,
      total_inserts: totalInserts,
    },
  };
}
