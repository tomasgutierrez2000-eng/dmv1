/**
 * Validator — pre-emit validation for generated scenario data.
 *
 * Catches errors BEFORE SQL/DB writes:
 *   - FK chain completeness (every facility has agreement + counterparty)
 *   - L2→L1 FK reference integrity
 *   - Financial consistency (drawn <= committed, positive amounts)
 *   - PK uniqueness (no composite PK collisions)
 *   - ID collision detection via registry
 *   - V2: Covenant consistency, IFRS 9 staging, distribution health,
 *     cross-table correlation, lifecycle consistency
 */

import type { L1Chain } from './chain-builder';
import type { L2Data } from './l2-types';
import type { ScenarioConfig } from './scenario-config';
import type { IDRegistry } from './id-registry';
import type { V2GeneratorOutput } from './v2/generators';
import type { FacilityState, FacilityStateMap, TableData as V2TableData } from './v2/types';
import { stateKey } from './v2/types';
import { VALID_ENTITY_TYPE_CODES, VALID_NAICS_CODES, VALID_DPD_CODES } from './shared-constants';

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
    if (!facilityIds.has(String(exp.facility_id))) {
      errors.push(`Exposure: facility_id ${exp.facility_id} not in L1 chain`);
    }
    if (!counterpartyIds.has(String(exp.counterparty_id))) {
      errors.push(`Exposure: counterparty_id ${exp.counterparty_id} not in L1 chain`);
    }
  }

  // Credit events
  for (const evt of (l2Data.credit_event ?? [])) {
    if (!counterpartyIds.has(String(evt.counterparty_id))) {
      errors.push(`Credit event ${evt.credit_event_id}: counterparty_id ${evt.counterparty_id} not in L1`);
    }
  }

  // Credit event facility links
  for (const link of (l2Data.credit_event_facility_link ?? [])) {
    if (!facilityIds.has(String(link.facility_id))) {
      errors.push(`Event link: facility_id ${link.facility_id} not in L1`);
    }
  }

  // Risk flags
  for (const flag of (l2Data.risk_flag ?? [])) {
    if (flag.facility_id && !facilityIds.has(String(flag.facility_id))) {
      errors.push(`Risk flag ${flag.risk_flag_id}: facility_id ${flag.facility_id} not in L1`);
    }
    if (flag.counterparty_id && !counterpartyIds.has(String(flag.counterparty_id))) {
      errors.push(`Risk flag ${flag.risk_flag_id}: counterparty_id ${flag.counterparty_id} not in L1`);
    }
  }

  // Rating observations
  for (const obs of (l2Data.counterparty_rating_observation ?? [])) {
    if (!counterpartyIds.has(String(obs.counterparty_id))) {
      errors.push(`Rating observation: counterparty_id ${obs.counterparty_id} not in L1`);
    }
  }

  // Collateral snapshots
  for (const cs of (l2Data.collateral_snapshot ?? [])) {
    if (cs.counterparty_id && !counterpartyIds.has(String(cs.counterparty_id))) {
      errors.push(`Collateral snapshot: counterparty_id ${cs.counterparty_id} not in L1`);
    }
  }

  // Facility pricing snapshots
  for (const fp of (l2Data.facility_pricing_snapshot ?? [])) {
    if (!facilityIds.has(String(fp.facility_id))) {
      errors.push(`Facility pricing: facility_id ${fp.facility_id} not in L1`);
    }
  }

  // Facility risk snapshots
  for (const fr of (l2Data.facility_risk_snapshot ?? [])) {
    if (!facilityIds.has(String(fr.facility_id))) {
      errors.push(`Facility risk: facility_id ${fr.facility_id} not in L1`);
    }
    if (!counterpartyIds.has(String(fr.counterparty_id))) {
      errors.push(`Facility risk: counterparty_id ${fr.counterparty_id} not in L1`);
    }
  }

  // Facility financial snapshots
  for (const ff of (l2Data.facility_financial_snapshot ?? [])) {
    if (!facilityIds.has(String(ff.facility_id))) {
      errors.push(`Facility financial: facility_id ${ff.facility_id} not in L1`);
    }
  }

  // Positions
  for (const pos of (l2Data.position ?? [])) {
    if (!facilityIds.has(String(pos.facility_id))) {
      errors.push(`Position ${pos.position_id}: facility_id ${pos.facility_id} not in L1`);
    }
    if (!counterpartyIds.has(String(pos.counterparty_id))) {
      errors.push(`Position ${pos.position_id}: counterparty_id ${pos.counterparty_id} not in L1`);
    }
  }

  // Position details → position FK
  const positionIds = new Set((l2Data.position ?? []).map(p => p.position_id));
  for (const pd of (l2Data.position_detail ?? [])) {
    if (!positionIds.has(pd.position_id!)) {
      errors.push(`Position detail ${pd.position_detail_id}: position_id ${pd.position_id} not in generated positions`);
    }
  }

  // Cash flows (table may not exist in DD-generated types)
  for (const cf of ((l2Data as any).cash_flow ?? [])) {
    if (!facilityIds.has(String(cf.facility_id))) {
      errors.push(`Cash flow ${cf.cash_flow_id}: facility_id ${cf.facility_id} not in L1`);
    }
    if (!counterpartyIds.has(String(cf.counterparty_id))) {
      errors.push(`Cash flow ${cf.cash_flow_id}: counterparty_id ${cf.counterparty_id} not in L1`);
    }
  }

  // LOB attribution
  for (const la of (l2Data.facility_lob_attribution ?? [])) {
    if (!facilityIds.has(String(la.facility_id))) {
      errors.push(`LOB attribution ${la.attribution_id}: facility_id ${la.facility_id} not in L1`);
    }
  }

  // Counterparty financial snapshots
  for (const cpf of (l2Data.counterparty_financial_snapshot ?? [])) {
    if (!counterpartyIds.has(String(cpf.counterparty_id))) {
      errors.push(`CP financial ${cpf.financial_snapshot_id}: counterparty_id ${cpf.counterparty_id} not in L1`);
    }
  }

  // Facility profitability
  for (const fp of (l2Data.facility_profitability_snapshot ?? [])) {
    if (!facilityIds.has(String(fp.facility_id))) {
      errors.push(`Facility profitability: facility_id ${fp.facility_id} not in L1`);
    }
  }

  // Amendment change details → amendment FK
  const amendmentIds = new Set((l2Data.amendment_event ?? []).map(a => a.amendment_id));
  for (const acd of (l2Data.amendment_change_detail ?? [])) {
    if (!amendmentIds.has(acd.amendment_id!)) {
      errors.push(`Amendment detail ${acd.change_detail_id}: amendment_id ${acd.amendment_id} not in generated amendments`);
    }
  }

  // Exception events
  for (const ee of (l2Data.exception_event ?? [])) {
    if (!facilityIds.has(String(ee.facility_id))) {
      errors.push(`Exception ${ee.exception_id}: facility_id ${ee.facility_id} not in L1`);
    }
    if (!counterpartyIds.has(String(ee.counterparty_id))) {
      errors.push(`Exception ${ee.exception_id}: counterparty_id ${ee.counterparty_id} not in L1`);
    }
  }

  // Credit approvals
  for (const ca of (l2Data.facility_credit_approval ?? [])) {
    if (ca.facility_id != null && !facilityIds.has(String(ca.facility_id))) {
      errors.push(`Credit approval ${ca.approval_id}: facility_id ${ca.facility_id} not in L1`);
    }
    if (ca.counterparty_id != null && !counterpartyIds.has(String(ca.counterparty_id))) {
      errors.push(`Credit approval ${ca.approval_id}: counterparty_id ${ca.counterparty_id} not in L1`);
    }
  }

  // Financial metric observations
  for (const fmo of (l2Data.financial_metric_observation ?? [])) {
    if (fmo.counterparty_id != null && !counterpartyIds.has(String(fmo.counterparty_id))) {
      errors.push(`Metric observation ${fmo.observation_id}: counterparty_id ${fmo.counterparty_id} not in L1`);
    }
    if (fmo.facility_id != null && !facilityIds.has(String(fmo.facility_id))) {
      errors.push(`Metric observation ${fmo.observation_id}: facility_id ${fmo.facility_id} not in L1`);
    }
  }

  // ── 3. Financial Consistency ──

  for (const exp of (l2Data.facility_exposure_snapshot ?? [])) {
    const drawn = exp.drawn_amount ?? 0;
    const committed = exp.committed_amount ?? 0;
    if (drawn > committed) {
      errors.push(
        `Facility ${exp.facility_id} on ${exp.as_of_date}: drawn (${drawn}) > committed (${committed})`
      );
    }
    if (drawn < 0) {
      errors.push(`Facility ${exp.facility_id}: negative drawn_amount ${drawn}`);
    }
    if (committed <= 0) {
      errors.push(`Facility ${exp.facility_id}: non-positive committed_amount ${committed}`);
    }

    // Verify undrawn calculation
    const expectedUndrawn = committed - drawn;
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
      const cpIdNum = Number(cp.counterparty_id);
      if (cpAlloc && (cpIdNum < cpAlloc.startId || cpIdNum > cpAlloc.endId)) {
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
    ((l2Data as Record<string, unknown[]>).stress_test_result?.length ?? 0) +
    ((l2Data as Record<string, unknown[]>).stress_test_breach?.length ?? 0);

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
    ((l2Data as Record<string, unknown[]>).cash_flow?.length ?? 0) +
    ((l2Data as Record<string, unknown[]>).netting_set_exposure_snapshot?.length ?? 0) +
    (l2Data.financial_metric_observation?.length ?? 0) +
    ((l2Data as Record<string, unknown[]>).metric_threshold?.length ?? 0) +
    ((l2Data as Record<string, unknown[]>).limit_contribution_snapshot?.length ?? 0) +
    ((l2Data as Record<string, unknown[]>).data_quality_score_snapshot?.length ?? 0);

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

/* ────────────────── V2 Validation ────────────────── */

export interface V2ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    l1_counterparties: number;
    l1_facilities: number;
    l2_total_rows: number;
    date_count: number;
    tables_generated: number;
  };
}

/**
 * Validate v2 generator output.
 *
 * Runs L1 chain checks plus v2-specific checks:
 *   - FK references (L2 → L1)
 *   - Financial consistency
 *   - PK uniqueness per table
 *   - Covenant consistency
 *   - IFRS 9 staging rules
 *   - Distribution health (unique amounts)
 *   - Cross-table correlation
 *   - Lifecycle consistency
 */
export function validateV2Output(
  chain: L1Chain,
  output: V2GeneratorOutput,
  config: ScenarioConfig,
): V2ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const counterpartyIds = new Set(chain.counterparties.map(c => c.counterparty_id));
  const facilityIds = new Set(chain.facilities.map(f => f.facility_id));
  const agreementIds = new Set(chain.agreements.map(a => a.credit_agreement_id));

  // ── 1. L1 Chain Completeness ──

  for (const fac of chain.facilities) {
    if (!agreementIds.has(fac.credit_agreement_id)) {
      errors.push(`Facility ${fac.facility_id}: references agreement ${fac.credit_agreement_id} not in chain`);
    }
    if (!counterpartyIds.has(fac.counterparty_id)) {
      errors.push(`Facility ${fac.facility_id}: references counterparty ${fac.counterparty_id} not in chain`);
    }
  }
  for (const agr of chain.agreements) {
    if (!counterpartyIds.has(agr.borrower_counterparty_id)) {
      errors.push(`Agreement ${agr.credit_agreement_id}: references borrower ${agr.borrower_counterparty_id} not in chain`);
    }
  }

  // ── 2. FK References in L2 Tables ──

  for (const td of output.tables) {
    for (const row of td.rows) {
      if ('facility_id' in row && row.facility_id != null) {
        if (!facilityIds.has(String(row.facility_id))) {
          errors.push(`${td.schema}.${td.table}: facility_id ${row.facility_id} not in L1`);
          break; // One error per table is enough
        }
      }
      if ('counterparty_id' in row && row.counterparty_id != null) {
        if (!counterpartyIds.has(String(row.counterparty_id))) {
          errors.push(`${td.schema}.${td.table}: counterparty_id ${row.counterparty_id} not in L1`);
          break;
        }
      }
    }
  }

  // ── 2b. Inter-L2 FK References ──

  const creditEventIds = new Set<string>();
  const amendmentEventIds = new Set<string>();
  const positionIds = new Set<string>();
  const collateralAssetIds = new Set<string>();
  const limitRuleIds = new Set<string>();

  for (const td of output.tables) {
    if (td.table === 'credit_event') {
      for (const r of td.rows) creditEventIds.add(String(r.credit_event_id));
    }
    if (td.table === 'amendment_event') {
      for (const r of td.rows) amendmentEventIds.add(String(r.amendment_id));
    }
    if (td.table === 'position') {
      for (const r of td.rows) positionIds.add(String(r.position_id));
    }
  }
  if (chain.collateral_assets) {
    for (const a of chain.collateral_assets) collateralAssetIds.add(String(a.collateral_asset_id));
  }
  if (chain.limit_rules) {
    for (const r of chain.limit_rules) limitRuleIds.add(String(r.limit_rule_id));
  }

  for (const td of output.tables) {
    if (td.table === 'credit_event_facility_link') {
      for (const row of td.rows) {
        if (!creditEventIds.has(String(row.credit_event_id))) {
          errors.push(`credit_event_facility_link: credit_event_id ${row.credit_event_id} not in generated credit_events`);
          break;
        }
      }
    }
    if (td.table === 'amendment_change_detail') {
      for (const row of td.rows) {
        if (!amendmentEventIds.has(String(row.amendment_id))) {
          errors.push(`amendment_change_detail: amendment_id ${row.amendment_id} not in generated amendment_events`);
          break;
        }
      }
    }
    if (td.table === 'collateral_snapshot' && collateralAssetIds.size > 0) {
      for (const row of td.rows) {
        if ('collateral_asset_id' in row && !collateralAssetIds.has(String(row.collateral_asset_id))) {
          warnings.push(`collateral_snapshot: collateral_asset_id ${row.collateral_asset_id} not in L1 collateral_asset_master`);
          break;
        }
      }
    }
    if (td.table === 'limit_contribution_snapshot' && limitRuleIds.size > 0) {
      for (const row of td.rows) {
        if ('limit_rule_id' in row && !limitRuleIds.has(String(row.limit_rule_id))) {
          errors.push(`limit_contribution_snapshot: limit_rule_id ${row.limit_rule_id} not in L1 limit_rules`);
          break;
        }
      }
    }
    if (td.table === 'position_detail') {
      for (const row of td.rows) {
        if ('position_id' in row && !positionIds.has(String(row.position_id))) {
          errors.push(`position_detail: position_id ${row.position_id} not in generated positions`);
          break;
        }
      }
    }
  }

  // ── 2c. Inverse Completeness: every L1 facility must have L2 exposure rows ──

  const exposureTableForInverse = output.tables.find(t => t.table === 'facility_exposure_snapshot');
  if (exposureTableForInverse) {
    const exposedFacilityIds = new Set(exposureTableForInverse.rows.map(r => String(r.facility_id)));
    for (const fac of chain.facilities) {
      if (!exposedFacilityIds.has(String(fac.facility_id))) {
        errors.push(`Facility ${fac.facility_id} in L1 chain has NO exposure rows in L2 data`);
      }
    }
  }

  // ── 3. PK Uniqueness ──

  for (const td of output.tables) {
    if (td.rows.length === 0) continue;
    const pkFields = guessPKFields(td.table, td.rows[0]);
    if (pkFields.length === 0) continue;

    const seen = new Set<string>();
    for (const row of td.rows) {
      const pk = pkFields.map(f => String(row[f])).join('|');
      if (seen.has(pk)) {
        errors.push(`${td.schema}.${td.table}: duplicate PK (${pkFields.join(',')}) = ${pk}`);
        break;
      }
      seen.add(pk);
    }
  }

  // ── 4. Financial Consistency ──

  const exposureTable = output.tables.find(t => t.table === 'facility_exposure_snapshot');
  if (exposureTable) {
    for (const row of exposureTable.rows) {
      const drawn = row.drawn_amount as number | null | undefined;
      const committed = row.committed_amount as number;

      // NULL drawn_amount check — prevents silent metric failures (utilization, EAD)
      if (drawn === null || drawn === undefined) {
        errors.push(`Exposure: facility ${row.facility_id} on ${row.as_of_date}: drawn_amount is NULL — metrics will return NULL`);
        continue;
      }
      if (drawn > committed * 1.001) {
        errors.push(`Exposure: facility ${row.facility_id} on ${row.as_of_date}: drawn (${drawn}) > committed (${committed})`);
      }
      if (drawn < 0) {
        errors.push(`Exposure: facility ${row.facility_id}: negative drawn_amount ${drawn}`);
      }
      if (committed <= 0) {
        errors.push(`Exposure: facility ${row.facility_id}: non-positive committed_amount ${committed}`);
      }

      // Verify undrawn_amount is also populated
      const undrawn = row.undrawn_amount as number | null | undefined;
      if (undrawn === null || undrawn === undefined) {
        errors.push(`Exposure: facility ${row.facility_id} on ${row.as_of_date}: undrawn_amount is NULL`);
      }
    }
  }

  // PD range check
  const riskTable = output.tables.find(t => t.table === 'facility_risk_snapshot');
  if (riskTable) {
    for (const row of riskTable.rows) {
      const pd = row.pd_pct as number;
      if (pd < 0 || pd > 1) {
        warnings.push(`Risk: facility ${row.facility_id} on ${row.as_of_date}: PD ${pd} out of [0,1]`);
      }
    }
  }

  // ── 5. Covenant Consistency (v2-specific) ──

  for (const entry of Array.from(output.stateMap.entries())) {
    const state = entry[1];
    if (state.covenants.some(c => c.is_breached && !c.waiver_active)) {
      if (state.credit_status === 'PERFORMING') {
        warnings.push(
          `Facility ${state.facility_id}: has unwaived covenant breach but status is PERFORMING`
        );
      }
    }
  }

  // ── 6. IFRS 9 Staging Rules ──

  for (const entry of Array.from(output.stateMap.entries())) {
    const state = entry[1];
    if (state.ifrs9_stage === 3 && state.days_past_due < 90) {
      warnings.push(
        `Facility ${state.facility_id}: Stage 3 but DPD=${state.days_past_due} (<90)`
      );
    }
    if (state.ifrs9_stage === 1 && state.days_past_due > 30) {
      warnings.push(
        `Facility ${state.facility_id}: Stage 1 but DPD=${state.days_past_due} (>30)`
      );
    }
  }

  // ── 7. Distribution Health ──

  if (exposureTable && exposureTable.rows.length > 10) {
    // Check that drawn amounts aren't all identical
    const lastDate = output.dates[output.dates.length - 1];
    const lastDateRows = exposureTable.rows.filter(r => r.as_of_date === lastDate);
    const drawnAmounts = lastDateRows.map(r => r.drawn_amount as number);
    const uniqueDrawn = new Set(drawnAmounts);
    if (uniqueDrawn.size < Math.min(drawnAmounts.length, 3)) {
      warnings.push(
        `Distribution: only ${uniqueDrawn.size} unique drawn amounts on ${lastDate} across ${drawnAmounts.length} facilities`
      );
    }
  }

  // ── 8. Cross-Table Correlation ──

  // If PD increased significantly, spread should have also increased
  const pricingTable = output.tables.find(t => t.table === 'facility_pricing_snapshot');
  if (riskTable && pricingTable && output.dates.length >= 2) {
    const firstDate = output.dates[0];
    const lastDate = output.dates[output.dates.length - 1];

    // Build O(1) lookup maps keyed by "facilityId|date" to avoid O(n) .find() per facility
    const riskByKey = new Map<string, Record<string, unknown>>();
    for (const r of riskTable.rows) {
      riskByKey.set(`${r.facility_id}|${r.as_of_date}`, r);
    }
    const pricingByKey = new Map<string, Record<string, unknown>>();
    for (const r of pricingTable.rows) {
      pricingByKey.set(`${r.facility_id}|${r.as_of_date}`, r);
    }

    for (const facId of Array.from(facilityIds)) {
      const pdFirst = riskByKey.get(`${facId}|${firstDate}`);
      const pdLast = riskByKey.get(`${facId}|${lastDate}`);
      const spreadFirst = pricingByKey.get(`${facId}|${firstDate}`);
      const spreadLast = pricingByKey.get(`${facId}|${lastDate}`);

      if (pdFirst && pdLast && spreadFirst && spreadLast) {
        const pdIncrease = (pdLast.pd_pct as number) / Math.max(pdFirst.pd_pct as number, 0.0001);
        const spreadIncrease = (spreadLast.interest_rate_spread_bps as number) - (spreadFirst.interest_rate_spread_bps as number);

        // If PD more than doubled, spread should have increased
        if (pdIncrease > 2.0 && spreadIncrease < 0) {
          warnings.push(
            `Correlation: facility ${facId}: PD increased ${pdIncrease.toFixed(1)}x but spread decreased by ${Math.abs(spreadIncrease).toFixed(0)}bps`
          );
        }
      }
    }
  }

  // ── 9. Lifecycle Consistency ──

  for (const entry of Array.from(output.stateMap.entries())) {
    const key = entry[0];
    const state = entry[1];
    // Extract date from key (format: "facilityId|date")
    const parts = key.split('|');
    if (parts.length < 2) continue;
    const date = parts[1];

    if (state.lifecycle_stage === 'MATURED' && state.maturity_date > date) {
      warnings.push(
        `Facility ${state.facility_id}: lifecycle=MATURED but maturity_date=${state.maturity_date} is after ${date}`
      );
    }

    if (state.lifecycle_stage === 'FUNDED' && state.drawn_amount <= 0) {
      warnings.push(
        `Facility ${state.facility_id}: lifecycle=FUNDED but drawn_amount=${state.drawn_amount}`
      );
    }
  }

  // ── 10. L1 Reference Code Validation ──
  // Verify FK code values in generated rows match valid L1 dim table entries.
  // Uses L1 seed data via ReferenceDataRegistry (loaded dynamically from SQL).
  // Falls back to hardcoded sets when registry is not available.

  // Entity type codes must exist in l1.entity_type_dim — invalid codes silently
  // drop counterparties from Basel III risk weight lookups and entity-type rollups.
  for (const cp of chain.counterparties) {
    if (!VALID_ENTITY_TYPE_CODES.has(cp.entity_type_code)) {
      errors.push(
        `Counterparty ${cp.counterparty_id} (${cp.legal_name}): entity_type_code '${cp.entity_type_code}' not in entity_type_dim — ` +
        `likely a NAICS code leak. Valid codes: ${Array.from(VALID_ENTITY_TYPE_CODES).join(', ')}`
      );
    }
  }

  // Industry IDs must be valid NAICS 2-digit codes (11-92) that exist in l1.industry_dim.
  // IDs 1-10 are invalid — the factory's internal industry mapping (1=TMT, 2=Healthcare, etc.)
  // must be translated to NAICS codes before emitting counterparty rows.
  for (const cp of chain.counterparties) {
    if (!VALID_NAICS_CODES.has(cp.industry_id)) {
      errors.push(
        `Counterparty ${cp.counterparty_id} (${cp.legal_name}): industry_id ${cp.industry_id} not in industry_dim — ` +
        `valid NAICS 2-digit codes start at 11. Factory internal IDs (1-10) must be mapped to NAICS.`
      );
    }
  }

  const VALID_LIMIT_STATUS_CODES = new Set(['NEAR_LIMIT', 'WITHIN_LIMIT', 'OVER_LIMIT', 'INACTIVE']);

  // Dynamic L1 validation — if ReferenceDataRegistry is loaded by quality-controls.ts,
  // the comprehensive FK checks run there. Here we keep lightweight fallback checks
  // for credit_status_code (using ALL 10 L1 codes) and limit_status_code.
  const VALID_CREDIT_STATUS_CODES = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const VALID_COLLATERAL_TYPE_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  for (const td of output.tables) {
    for (const row of td.rows) {
      // credit_status_code FK
      if ('credit_status_code' in row && row.credit_status_code !== null && row.credit_status_code !== undefined) {
        const code = typeof row.credit_status_code === 'string' ? parseInt(row.credit_status_code, 10) : row.credit_status_code as number;
        if (!isNaN(code) && !VALID_CREDIT_STATUS_CODES.has(code)) {
          warnings.push(`${td.schema}.${td.table}: credit_status_code ${row.credit_status_code} not in L1 credit_status_dim (1-10)`);
          break;
        }
      }
      // limit_status_code FK
      if ('limit_status_code' in row && row.limit_status_code !== null && row.limit_status_code !== undefined) {
        if (!VALID_LIMIT_STATUS_CODES.has(row.limit_status_code as string)) {
          warnings.push(`${td.schema}.${td.table}: limit_status_code '${row.limit_status_code}' not in known set`);
          break;
        }
      }
      // collateral_type_id FK
      if ('collateral_type_id' in row && row.collateral_type_id !== null && row.collateral_type_id !== undefined) {
        if (!VALID_COLLATERAL_TYPE_IDS.has(row.collateral_type_id as number)) {
          warnings.push(`${td.schema}.${td.table}: collateral_type_id ${row.collateral_type_id} not in L1 collateral_type (1-10)`);
          break;
        }
      }
    }
  }

  // ── 11. FX Rate Coverage (per currency × date) ──
  // Metric formulas JOIN: fx.from_currency_code = fes.currency_code AND fx.to_currency_code = 'USD'
  //                       AND fx.as_of_date = fes.as_of_date
  // Must validate per (currency, date) pair — not just per date — otherwise a facility
  // with currency 'ZAR' would silently get NULL FX conversions even if USD has full coverage.

  const fxTable = output.tables.find(t => t.table === 'fx_rate');
  if (exposureTable && exposureTable.rows.length > 0) {
    // Build set of (currency|date) pairs covered by FX rates (to_currency_code = 'USD')
    const fxCoverage = new Set<string>();
    for (const row of (fxTable?.rows ?? [])) {
      if (row.to_currency_code === 'USD') {
        fxCoverage.add(`${row.from_currency_code}|${row.as_of_date}`);
      }
    }

    // Check every (currency, date) pair in exposure data
    const missingPairs: string[] = [];
    const checkedPairs = new Set<string>();
    for (const row of exposureTable.rows) {
      const key = `${row.currency_code}|${row.as_of_date}`;
      if (checkedPairs.has(key)) continue;
      checkedPairs.add(key);
      if (!fxCoverage.has(key)) {
        missingPairs.push(key);
      }
    }
    if (missingPairs.length > 0) {
      errors.push(
        `FX coverage gap: ${missingPairs.length} (currency, date) pairs in exposure have no FX→USD rate: ` +
        `${missingPairs.slice(0, 5).join(', ')}${missingPairs.length > 5 ? '...' : ''}. ` +
        `Metric formulas JOINing on fx.from_currency_code + fx.as_of_date will return NULL.`
      );
    }
  }

  // ── 12. DPD Bucket Code Validation ──
  // Ensure generated DPD bucket codes match FFIEC standard codes in l1.dpd_bucket_dim.
  const delinquencyTable = output.tables.find(t => t.table === 'facility_delinquency_snapshot');
  if (delinquencyTable) {
    const invalidDpdCodes = new Set<string>();
    for (const row of delinquencyTable.rows) {
      const code = row.dpd_bucket_code as string;
      if (code && !VALID_DPD_CODES.has(code)) invalidDpdCodes.add(code);
    }
    if (invalidDpdCodes.size > 0) {
      errors.push(
        `DPD bucket codes not in L1 dpd_bucket_dim: [${Array.from(invalidDpdCodes).join(', ')}]. ` +
        `Valid L1 PK codes: ${Array.from(VALID_DPD_CODES).join(', ')}.`
      );
    }
  }

  // ── 13. Data Completeness ──

  if (chain.counterparties.length === 0) errors.push('No counterparties generated');
  if (chain.facilities.length === 0) errors.push('No facilities generated');
  if (!exposureTable || exposureTable.rows.length === 0) {
    warnings.push('No exposure snapshots generated');
  }

  // ── Stats ──

  const totalRows = output.tables.reduce((s, t) => s + t.rows.length, 0);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      l1_counterparties: chain.counterparties.length,
      l1_facilities: chain.facilities.length,
      l2_total_rows: totalRows,
      date_count: output.dates.length,
      tables_generated: output.tables.length,
    },
  };
}

/* ────────────────── PK Field Guesser ────────────────── */

/** Guess PK fields from table name and row shape. */
function guessPKFields(table: string, sampleRow: Record<string, unknown>): string[] {
  // Tables with known composite PKs
  const compositePKs: Record<string, string[]> = {
    facility_exposure_snapshot: ['facility_id', 'as_of_date'],
    facility_pricing_snapshot: ['facility_id', 'as_of_date'],
    facility_risk_snapshot: ['facility_id', 'as_of_date'],
    facility_financial_snapshot: ['facility_id', 'as_of_date'],
    facility_delinquency_snapshot: ['facility_id', 'as_of_date'],
    facility_profitability_snapshot: ['facility_id', 'as_of_date'],
    collateral_snapshot: ['collateral_asset_id', 'as_of_date'],
    // counterparty_rating_observation has observation_id as PK (handled by single-PK fallback)
    counterparty_financial_snapshot: ['counterparty_id', 'as_of_date'],
    ecl_provision_snapshot: ['facility_id', 'as_of_date'],
    limit_contribution_snapshot: ['limit_rule_id', 'facility_id', 'as_of_date'],
    fx_rate: ['from_currency_code', 'to_currency_code', 'as_of_date'],
  };

  if (compositePKs[table]) {
    const pk = compositePKs[table];
    if (pk.every(f => f in sampleRow)) return pk;
  }

  // Single ID PK patterns
  const idFields = [
    `${table.replace(/_snapshot$/, '')}_id`,
    `${table}_id`,
  ];
  for (const f of idFields) {
    if (f in sampleRow) return [f];
  }

  // Common single PK field names
  for (const f of ['link_id', 'position_id', 'credit_event_id', 'risk_flag_id', 'amendment_id', 'exception_id', 'cash_flow_id', 'approval_id', 'observation_id', 'attribution_id', 'provision_id', 'change_detail_id']) {
    if (f in sampleRow) return [f];
  }

  return [];
}
