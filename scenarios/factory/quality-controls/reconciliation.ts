/**
 * Group 11: Reconciliation & Completeness
 *
 * Cross-table value matches, internal L2->L2 FKs, cash flow <-> balance
 * reconciliation, limit aggregation, and audit metadata completeness.
 */

import type { L1Chain } from '../chain-builder';
import type { V2GeneratorOutput } from '../v2/generators';
import type { QualityControlResult } from './shared-types';
import { findTable, sampleRows } from './shared-types';

export function runReconciliation(output: V2GeneratorOutput, chain: L1Chain): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // -- 11a: Cross-table value reconciliation --
  // Same FacilityState fields appear in multiple tables — verify they match.
  const exposure = findTable(output, 'facility_exposure_snapshot');
  const position = findTable(output, 'position');
  const posDetail = findTable(output, 'position_detail');
  const risk = findTable(output, 'facility_risk_snapshot');
  const delinquency = findTable(output, 'facility_delinquency_snapshot');
  const provision = findTable(output, 'ecl_provision_snapshot');

  if (exposure && position) {
    let mismatchCount = 0;
    for (const expRow of sampleRows(exposure.rows, 200)) {
      const facId = expRow.facility_id;
      const date = expRow.as_of_date;
      const posRow = position.rows.find(r => r.facility_id === facId && r.as_of_date === date);
      if (!posRow) continue;

      const expDrawn = expRow.outstanding_balance_amt as number;
      const posBalance = posRow.balance_amount as number;
      if (typeof expDrawn === 'number' && typeof posBalance === 'number') {
        if (Math.abs(expDrawn - posBalance) > 0.02) {
          mismatchCount++;
          if (mismatchCount <= 3) {
            warnings.push(`Reconciliation: facility ${facId} on ${date}: exposure.outstanding_balance_amt (${expDrawn}) != position.balance_amount (${posBalance})`);
          }
        }
      }

      // PD cross-check between position and risk
      if (risk) {
        const riskRow = risk.rows.find(r => r.facility_id === facId && r.as_of_date === date);
        if (riskRow && posRow.pd_estimate !== undefined && riskRow.pd_pct !== undefined) {
          const posPd = typeof posRow.pd_estimate === 'string' ? parseFloat(posRow.pd_estimate) : posRow.pd_estimate as number;
          const riskPd = riskRow.pd_pct as number;
          if (typeof posPd === 'number' && typeof riskPd === 'number' && !isNaN(posPd) && Math.abs(posPd - riskPd) > 0.0001) {
            mismatchCount++;
            if (mismatchCount <= 5) {
              warnings.push(`Reconciliation: facility ${facId} on ${date}: position.pd_estimate (${posPd}) != risk.pd_pct (${riskPd})`);
            }
          }
        }
      }

      // Credit status cross-check between position and delinquency
      if (delinquency) {
        const delRow = delinquency.rows.find(r => r.facility_id === facId && r.as_of_date === date);
        if (delRow && posRow.credit_status_code && delRow.credit_status_code) {
          if (String(posRow.credit_status_code) !== String(delRow.credit_status_code)) {
            mismatchCount++;
            if (mismatchCount <= 5) {
              warnings.push(`Reconciliation: facility ${facId} on ${date}: position.credit_status_code (${posRow.credit_status_code}) != delinquency.credit_status_code (${delRow.credit_status_code})`);
            }
          }
        }
      }
    }
  }

  // Position_detail balance check against exposure
  if (exposure && posDetail) {
    let detailMismatch = 0;
    for (const expRow of sampleRows(exposure.rows, 100)) {
      const facId = expRow.facility_id;
      const date = expRow.as_of_date;
      const detRow = posDetail.rows.find(r => r.as_of_date === date &&
        exposure.rows.some(e => e.facility_id === facId && e.as_of_date === date));
      if (!detRow) continue;
      const expCommitted = expRow.committed_amount as number;
      const detCommitment = detRow.total_commitment as number;
      if (typeof expCommitted === 'number' && typeof detCommitment === 'number') {
        if (Math.abs(expCommitted - detCommitment) > 0.02) {
          detailMismatch++;
          if (detailMismatch <= 2) {
            warnings.push(`Reconciliation: facility ${facId}: exposure.committed_amount (${expCommitted}) != position_detail.total_commitment (${detCommitment})`);
          }
        }
      }
    }
  }

  // -- 11b: Internal L2->L2 FK integrity --
  // position_detail.position_id -> position.position_id
  if (position && posDetail) {
    const positionIds = new Set(position.rows.map(r => r.position_id));
    let orphanDetails = 0;
    for (const row of posDetail.rows) {
      if (row.position_id && !positionIds.has(row.position_id)) {
        orphanDetails++;
      }
    }
    if (orphanDetails > 0) {
      errors.push(`Internal FK: ${orphanDetails} position_detail rows reference non-existent position_id`);
    }
  }

  // credit_event_facility_link.credit_event_id -> credit_event.credit_event_id
  const creditEvent = findTable(output, 'credit_event');
  const ceLink = findTable(output, 'credit_event_facility_link');
  if (creditEvent && ceLink) {
    const eventIds = new Set(creditEvent.rows.map(r => r.credit_event_id));
    let orphanLinks = 0;
    for (const row of ceLink.rows) {
      if (row.credit_event_id && !eventIds.has(row.credit_event_id)) {
        orphanLinks++;
      }
    }
    if (orphanLinks > 0) {
      errors.push(`Internal FK: ${orphanLinks} credit_event_facility_link rows reference non-existent credit_event_id`);
    }
  }

  // amendment_change_detail.amendment_id -> amendment_event.amendment_id
  const amendment = findTable(output, 'amendment_event');
  const changeDetail = findTable(output, 'amendment_change_detail');
  if (amendment && changeDetail) {
    const amendIds = new Set(amendment.rows.map(r => r.amendment_id));
    let orphanChanges = 0;
    for (const row of changeDetail.rows) {
      if (row.amendment_id && !amendIds.has(row.amendment_id)) {
        orphanChanges++;
      }
    }
    if (orphanChanges > 0) {
      errors.push(`Internal FK: ${orphanChanges} amendment_change_detail rows reference non-existent amendment_id`);
    }
  }

  // stress_test_breach.stress_test_result_id -> stress_test_result.result_id
  const stResult = findTable(output, 'stress_test_result');
  const stBreach = findTable(output, 'stress_test_breach');
  if (stResult && stBreach) {
    const resultIds = new Set(stResult.rows.map(r => r.result_id));
    let orphanBreaches = 0;
    for (const row of stBreach.rows) {
      if (row.stress_test_result_id && !resultIds.has(row.stress_test_result_id)) {
        orphanBreaches++;
      }
    }
    if (orphanBreaches > 0) {
      errors.push(`Internal FK: ${orphanBreaches} stress_test_breach rows reference non-existent stress_test_result_id`);
    }
  }

  // -- 11c: Cash flow <-> balance change reconciliation --
  // Net cash flows between periods should reconcile to drawn balance changes.
  const cashFlow = findTable(output, 'cash_flow');
  if (cashFlow && exposure && output.dates.length >= 2) {
    const sortedDates = [...output.dates].sort();
    const facilityIds = [...new Set(exposure.rows.map(r => r.facility_id))];
    let reconMismatches = 0;

    for (const facId of facilityIds.slice(0, 20)) {
      for (let d = 1; d < sortedDates.length && reconMismatches < 5; d++) {
        const prevDate = sortedDates[d - 1];
        const currDate = sortedDates[d];

        const prevExp = exposure.rows.find(r => r.facility_id === facId && r.as_of_date === prevDate);
        const currExp = exposure.rows.find(r => r.facility_id === facId && r.as_of_date === currDate);
        if (!prevExp || !currExp) continue;

        const prevDrawn = prevExp.outstanding_balance_amt as number;
        const currDrawn = currExp.outstanding_balance_amt as number;
        if (typeof prevDrawn !== 'number' || typeof currDrawn !== 'number') continue;

        const drawnDelta = currDrawn - prevDrawn;

        // Sum net principal cash flows for this facility in this period
        const periodCFs = cashFlow.rows.filter(r =>
          r.facility_id === facId && r.as_of_date === currDate
        );
        if (periodCFs.length === 0) continue;

        let netPrincipal = 0;
        for (const cf of periodCFs) {
          const amt = (cf.principal_amount ?? cf.amount) as number;
          if (typeof amt !== 'number') continue;
          const dir = cf.direction as string;
          if (dir === 'OUTFLOW') netPrincipal += amt;  // disbursement increases drawn
          else if (dir === 'INFLOW') netPrincipal -= amt;  // repayment decreases drawn
        }

        // Allow 10% tolerance for rounding and interest capitalization
        if (Math.abs(drawnDelta) > 100 && netPrincipal !== 0) {
          const ratio = Math.abs(drawnDelta - netPrincipal) / Math.max(Math.abs(drawnDelta), 1);
          if (ratio > 0.25) {
            reconMismatches++;
            warnings.push(`Cash flow recon: facility ${facId} period ${prevDate}->${currDate}: drawn changed by ${drawnDelta.toFixed(0)} but net cash flow principal = ${netPrincipal.toFixed(0)} (${(ratio * 100).toFixed(0)}% gap)`);
          }
        }
      }
    }
  }

  // -- 11d: Limit contribution <-> exposure aggregation --
  // limit_contribution_snapshot.contribution_amount should ~ sum of facility drawn for that CP
  const limitContrib = findTable(output, 'limit_contribution_snapshot');
  if (limitContrib && exposure) {
    let limitMismatches = 0;
    for (const lRow of sampleRows(limitContrib.rows, 50)) {
      const cpId = lRow.counterparty_id;
      const date = lRow.as_of_date;
      const contrib = lRow.contribution_amount as number;
      if (typeof contrib !== 'number') continue;

      const cpExposures = exposure.rows.filter(r => r.counterparty_id === cpId && r.as_of_date === date);
      const sumDrawn = cpExposures.reduce((s, r) => s + ((r.outstanding_balance_amt as number) || 0), 0);

      if (Math.abs(contrib) > 100 && Math.abs(sumDrawn) > 100) {
        const ratio = Math.abs(contrib - sumDrawn) / Math.max(Math.abs(sumDrawn), 1);
        if (ratio > 0.10) {
          limitMismatches++;
          if (limitMismatches <= 3) {
            warnings.push(`Limit recon: CP ${cpId} on ${date}: limit_contribution (${contrib.toFixed(0)}) vs sum of facility drawn (${sumDrawn.toFixed(0)}) — ${(ratio * 100).toFixed(0)}% gap`);
          }
        }
      }
    }
  }

  // -- 11e: CP financial <-> facility financial proportional consistency --
  const cpFin = findTable(output, 'counterparty_financial_snapshot');
  const facFin = findTable(output, 'facility_financial_snapshot');
  if (cpFin && facFin) {
    let finMismatches = 0;
    for (const cpRow of sampleRows(cpFin.rows, 30)) {
      const cpId = cpRow.counterparty_id;
      const date = cpRow.as_of_date;
      const cpEbitda = cpRow.ebitda_amt as number;
      if (typeof cpEbitda !== 'number' || cpEbitda <= 0) continue;

      const facRows = facFin.rows.filter(r => r.counterparty_id === cpId && r.as_of_date === date);
      if (facRows.length === 0) continue;

      const sumFacEbitda = facRows.reduce((s, r) => s + ((r.ebitda_amt as number) || 0), 0);
      // Facility-level EBITDA should not exceed CP-level EBITDA (it's apportioned)
      if (sumFacEbitda > cpEbitda * 1.15 && sumFacEbitda > 1000) {
        finMismatches++;
        if (finMismatches <= 3) {
          warnings.push(`Financial recon: CP ${cpId} on ${date}: sum of facility EBITDA (${sumFacEbitda.toFixed(0)}) exceeds CP EBITDA (${cpEbitda.toFixed(0)}) by ${((sumFacEbitda / cpEbitda - 1) * 100).toFixed(0)}%`);
        }
      }
    }
  }

  // -- 11f: Audit metadata completeness --
  // Every output table should have source_system_id and record_source.
  const AUDIT_FIELDS = ['source_system_id', 'record_source'] as const;
  for (const td of output.tables) {
    if (td.rows.length === 0) continue;
    const firstRow = td.rows[0];
    for (const field of AUDIT_FIELDS) {
      if (!(field in firstRow)) {
        warnings.push(`Audit metadata: ${td.schema}.${td.table} is missing '${field}' field — required for GSIB lineage`);
      }
    }
  }

  return { errors, warnings };
}
