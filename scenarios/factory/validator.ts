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

  // Facility pricing snapshots
  for (const fp of (l2Data.facility_pricing_snapshot ?? [])) {
    if (!facilityIds.has(fp.facility_id)) {
      errors.push(`Facility pricing: facility_id ${fp.facility_id} not in L1`);
    }
  }

  // Facility risk snapshots
  for (const fr of (l2Data.facility_risk_snapshot ?? [])) {
    if (!facilityIds.has(fr.facility_id)) {
      errors.push(`Facility risk: facility_id ${fr.facility_id} not in L1`);
    }
    if (!counterpartyIds.has(fr.counterparty_id)) {
      errors.push(`Facility risk: counterparty_id ${fr.counterparty_id} not in L1`);
    }
  }

  // Facility financial snapshots
  for (const ff of (l2Data.facility_financial_snapshot ?? [])) {
    if (!facilityIds.has(ff.facility_id)) {
      errors.push(`Facility financial: facility_id ${ff.facility_id} not in L1`);
    }
  }

  // Positions
  for (const pos of (l2Data.position ?? [])) {
    if (!facilityIds.has(pos.facility_id)) {
      errors.push(`Position ${pos.position_id}: facility_id ${pos.facility_id} not in L1`);
    }
    if (!counterpartyIds.has(pos.counterparty_id)) {
      errors.push(`Position ${pos.position_id}: counterparty_id ${pos.counterparty_id} not in L1`);
    }
  }

  // Position details → position FK
  const positionIds = new Set((l2Data.position ?? []).map(p => p.position_id));
  for (const pd of (l2Data.position_detail ?? [])) {
    if (!positionIds.has(pd.position_id)) {
      errors.push(`Position detail ${pd.position_detail_id}: position_id ${pd.position_id} not in generated positions`);
    }
  }

  // Cash flows
  for (const cf of (l2Data.cash_flow ?? [])) {
    if (!facilityIds.has(cf.facility_id)) {
      errors.push(`Cash flow ${cf.cash_flow_id}: facility_id ${cf.facility_id} not in L1`);
    }
    if (!counterpartyIds.has(cf.counterparty_id)) {
      errors.push(`Cash flow ${cf.cash_flow_id}: counterparty_id ${cf.counterparty_id} not in L1`);
    }
  }

  // LOB attribution
  for (const la of (l2Data.facility_lob_attribution ?? [])) {
    if (!facilityIds.has(la.facility_id)) {
      errors.push(`LOB attribution ${la.attribution_id}: facility_id ${la.facility_id} not in L1`);
    }
  }

  // Counterparty financial snapshots
  for (const cpf of (l2Data.counterparty_financial_snapshot ?? [])) {
    if (!counterpartyIds.has(cpf.counterparty_id)) {
      errors.push(`CP financial ${cpf.financial_snapshot_id}: counterparty_id ${cpf.counterparty_id} not in L1`);
    }
  }

  // Facility profitability
  for (const fp of (l2Data.facility_profitability_snapshot ?? [])) {
    if (!facilityIds.has(fp.facility_id)) {
      errors.push(`Facility profitability: facility_id ${fp.facility_id} not in L1`);
    }
  }

  // Amendment change details → amendment FK
  const amendmentIds = new Set((l2Data.amendment_event ?? []).map(a => a.amendment_id));
  for (const acd of (l2Data.amendment_change_detail ?? [])) {
    if (!amendmentIds.has(acd.amendment_id)) {
      errors.push(`Amendment detail ${acd.change_detail_id}: amendment_id ${acd.amendment_id} not in generated amendments`);
    }
  }

  // Exception events
  for (const ee of (l2Data.exception_event ?? [])) {
    if (!facilityIds.has(ee.facility_id)) {
      errors.push(`Exception ${ee.exception_id}: facility_id ${ee.facility_id} not in L1`);
    }
    if (!counterpartyIds.has(ee.counterparty_id)) {
      errors.push(`Exception ${ee.exception_id}: counterparty_id ${ee.counterparty_id} not in L1`);
    }
  }

  // Credit approvals
  for (const ca of (l2Data.facility_credit_approval ?? [])) {
    if (!facilityIds.has(ca.facility_id)) {
      errors.push(`Credit approval ${ca.approval_id}: facility_id ${ca.facility_id} not in L1`);
    }
    if (!counterpartyIds.has(ca.counterparty_id)) {
      errors.push(`Credit approval ${ca.approval_id}: counterparty_id ${ca.counterparty_id} not in L1`);
    }
  }

  // Financial metric observations
  for (const fmo of (l2Data.financial_metric_observation ?? [])) {
    if (!counterpartyIds.has(fmo.counterparty_id)) {
      errors.push(`Metric observation ${fmo.observation_id}: counterparty_id ${fmo.counterparty_id} not in L1`);
    }
    if (!facilityIds.has(fmo.facility_id)) {
      errors.push(`Metric observation ${fmo.observation_id}: facility_id ${fmo.facility_id} not in L1`);
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

  // Facility pricing: composite PK (facility_id, as_of_date)
  const pricingPKs = new Set<string>();
  for (const fp of (l2Data.facility_pricing_snapshot ?? [])) {
    const pk = `${fp.facility_id}|${fp.as_of_date}`;
    if (pricingPKs.has(pk)) {
      errors.push(`Duplicate facility_pricing PK: facility=${fp.facility_id}, date=${fp.as_of_date}`);
    }
    pricingPKs.add(pk);
  }

  // Facility risk: composite PK (facility_id, as_of_date)
  const riskPKs = new Set<string>();
  for (const fr of (l2Data.facility_risk_snapshot ?? [])) {
    const pk = `${fr.facility_id}|${fr.as_of_date}`;
    if (riskPKs.has(pk)) {
      errors.push(`Duplicate facility_risk PK: facility=${fr.facility_id}, date=${fr.as_of_date}`);
    }
    riskPKs.add(pk);
  }

  // Facility financial: composite PK (facility_id, as_of_date)
  const finPKs = new Set<string>();
  for (const ff of (l2Data.facility_financial_snapshot ?? [])) {
    const pk = `${ff.facility_id}|${ff.as_of_date}`;
    if (finPKs.has(pk)) {
      errors.push(`Duplicate facility_financial PK: facility=${ff.facility_id}, date=${ff.as_of_date}`);
    }
    finPKs.add(pk);
  }

  // Position: single PK (position_id)
  const posPKs = new Set<number>();
  for (const pos of (l2Data.position ?? [])) {
    if (posPKs.has(pos.position_id)) {
      errors.push(`Duplicate position PK: ${pos.position_id}`);
    }
    posPKs.add(pos.position_id);
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
    (l2Data.facility_risk_snapshot?.length ?? 0) +
    (l2Data.facility_financial_snapshot?.length ?? 0) +
    (l2Data.counterparty_financial_snapshot?.length ?? 0) +
    (l2Data.facility_profitability_snapshot?.length ?? 0) +
    (l2Data.facility_lob_attribution?.length ?? 0) +
    (l2Data.position?.length ?? 0) +
    (l2Data.position_detail?.length ?? 0) +
    (l2Data.cash_flow?.length ?? 0) +
    (l2Data.netting_set_exposure_snapshot?.length ?? 0) +
    (l2Data.financial_metric_observation?.length ?? 0) +
    (l2Data.metric_threshold?.length ?? 0) +
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
