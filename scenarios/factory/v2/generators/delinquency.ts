/**
 * Generator: facility_delinquency_snapshot
 * Reads: days_past_due, credit_status
 */
import type { FacilityStateMap, SqlRow, CreditStatus } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID, CREDIT_STATUS_CODE } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round } from '../prng';

export function generateDelinquencyRows(
  stateMap: FacilityStateMap,
  facilityIds: number[],
  dates: string[],
  registry: IDRegistry,
): SqlRow[] {
  const rows: SqlRow[] = [];

  for (const date of dates) {
    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      const snapshotId = registry.allocate('facility_delinquency_snapshot', 1)[0];
      const dpd = state.days_past_due;

      // DPD bucket — FFIEC Call Report standard codes matching l1.dpd_bucket_dim:
      // CURRENT (0), 1-29, 30-59, 60-89, 90+
      let bucketCode = 'CURRENT';
      if (dpd >= 1 && dpd <= 29) bucketCode = '1-29';
      else if (dpd >= 30 && dpd <= 59) bucketCode = '30-59';
      else if (dpd >= 60 && dpd <= 89) bucketCode = '60-89';
      else if (dpd >= 90) bucketCode = '90+';

      // Overdue amounts based on DPD
      const monthlyPayment = state.drawn_amount * state.all_in_rate_pct / 12;
      const overdueInterest = dpd > 0 ? round(monthlyPayment * Math.ceil(dpd / 30), 2) : 0;
      const overduePrincipal = dpd > 90 ? round(state.drawn_amount * 0.02, 2) : 0;

      rows.push({
        delinquency_snapshot_id: snapshotId,
        facility_id: state.facility_id,
        as_of_date: date,
        counterparty_id: state.counterparty_id,
        currency_code: state.currency_code,
        credit_status_code: String(CREDIT_STATUS_CODE[state.credit_status as CreditStatus] ?? 1),
        days_past_due: dpd,
        days_past_due_max: dpd, // Same as current for generated data
        delinquency_bucket_code: bucketCode,
        dpd_bucket_code: bucketCode,
        delinquency_status_code: dpd > 0 ? 'DELINQUENT' : 'CURRENT',
        is_watch_list_flag: ['WATCH', 'SPECIAL_MENTION', 'SUBSTANDARD', 'DOUBTFUL'].includes(state.credit_status),
        is_delinquent_payment_flag: dpd > 0,
        overdue_interest_amt: overdueInterest,
        overdue_principal_amt: overduePrincipal,
        overdue_amt_0_30: dpd > 0 && dpd <= 30 ? overdueInterest : 0,
        overdue_amt_31_60: dpd > 30 && dpd <= 60 ? overdueInterest : 0,
        overdue_amt_61_90_plus: dpd > 60 ? overdueInterest + overduePrincipal : 0,
        last_payment_received_date: dpd === 0 ? date : null,
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });
    }
  }

  return rows;
}
