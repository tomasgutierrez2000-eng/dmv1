/**
 * Generator: facility_financial_snapshot
 * Reads: counterparty financials, facility-level amounts
 */
import type { FacilityState, FacilityStateMap, CounterpartyFinancials, SqlRow } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round, seededRng } from '../prng';

export function generateFinancialRows(
  stateMap: FacilityStateMap,
  facilityIds: number[],
  dates: string[],
  financials: Map<string, CounterpartyFinancials>,
  registry: IDRegistry,
): SqlRow[] {
  const rows: SqlRow[] = [];

  for (const date of dates) {
    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      const fin = financials.get(`${state.counterparty_id}|${date}`);
      if (!fin) continue;

      const rng = seededRng(`fin-${facId}-${date}`);
      const snapshotId = registry.allocate('facility_financial_snapshot', 1)[0];

      // Facility-level financial metrics (proportional to facility's share of total)
      const totalCpDrawn = fin.total_debt;
      const facShare = totalCpDrawn > 0 ? state.drawn_amount / totalCpDrawn : 0.5;

      const revenue = round(fin.total_revenue * facShare, 2);
      const opex = round(fin.ebitda > 0
        ? revenue - fin.ebitda * facShare
        : revenue * 0.65, 2);
      const ebitda = round(revenue - opex, 2);
      const interestExp = round(state.drawn_amount * state.all_in_rate_pct, 2);
      const principalPayment = state.amortization_schedule
        ? round(state.original_committed * 0.025, 2) // Quarterly amort
        : 0;

      rows.push({
        financial_snapshot_id: snapshotId,
        facility_id: state.facility_id,
        as_of_date: date,
        counterparty_id: state.counterparty_id,
        currency_code: state.currency_code,
        operating_expense_amt: opex,
        ebitda_amt: ebitda,
        interest_expense_amt: interestExp,
        principal_payment_amt: principalPayment,
        reporting_period: getReportingPeriod(date),
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });
    }
  }

  return rows;
}

function getReportingPeriod(date: string): string {
  const month = new Date(date + 'T00:00:00Z').getUTCMonth() + 1;
  const year = new Date(date + 'T00:00:00Z').getUTCFullYear();
  const q = Math.ceil(month / 3);
  return `${year}-Q${q}`;
}
