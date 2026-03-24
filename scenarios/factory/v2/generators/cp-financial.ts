/**
 * Generator: counterparty_financial_snapshot
 * Reads: aggregated counterparty-level financials
 */
import type { FacilityStateMap, CounterpartyFinancials, SqlRow } from '../types';
import { stateKey, FACTORY_SOURCE_SYSTEM_ID } from '../types';
import type { IDRegistry } from '../../id-registry';
import { round } from '../prng';

export function generateCounterpartyFinancialRows(
  stateMap: FacilityStateMap,
  facilityIds: string[],
  dates: string[],
  financials: Map<string, CounterpartyFinancials>,
  registry: IDRegistry,
): SqlRow[] {
  const rows: SqlRow[] = [];

  // Track unique counterparty+date combos
  const seen = new Set<string>();

  for (const date of dates) {
    for (const facId of facilityIds) {
      const state = stateMap.get(stateKey(facId, date));
      if (!state) continue;

      const cpKey = `${state.counterparty_id}|${date}`;
      if (seen.has(cpKey)) continue;
      seen.add(cpKey);

      const fin = financials.get(cpKey);
      if (!fin) continue;

      const snapshotId = registry.allocate('counterparty_financial_snapshot', 1)[0];
      const month = new Date(date + 'T00:00:00Z').getUTCMonth() + 1;
      const year = new Date(date + 'T00:00:00Z').getUTCFullYear();
      const q = Math.ceil(month / 3);

      // Compute derived values
      const depreciation = round(fin.total_assets * 0.03 / 4, 2); // ~3% annual depreciation
      const amortization = round(fin.total_assets * 0.01 / 4, 2); // ~1% annual amortization
      const taxExpense = round(Math.max(0, fin.net_income * 0.21), 2); // 21% corporate tax

      rows.push({
        financial_snapshot_id: snapshotId,
        counterparty_id: state.counterparty_id,
        as_of_date: date,
        reporting_period: `${year}-Q${q}`,
        currency_code: state.currency_code,
        revenue_amt: round(fin.total_revenue, 2),
        operating_expense_amt: round(fin.total_revenue - fin.ebitda, 2),
        ebitda_amt: round(fin.ebitda, 2),
        noi_amt: round(fin.total_revenue * 0.65, 2),
        interest_expense_amt: round(fin.interest_expense, 2),
        tax_expense_amt: taxExpense,
        depreciation_amt: depreciation,
        amortization_amt: amortization,
        shareholders_equity_amt: round(fin.equity, 2),
        tangible_net_worth_usd: round(fin.tangible_net_worth, 2),
        expected_drawdown_amt: null,
        fee_income_amt: null,
        source_system_id: FACTORY_SOURCE_SYSTEM_ID,
        record_source: 'DATA_FACTORY_V2',
        created_by: 'factory_v2',
      });
    }
  }

  return rows;
}
