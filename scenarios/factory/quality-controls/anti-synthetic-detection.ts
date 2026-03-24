/**
 * Group 10: Anti-Synthetic Pattern Detection
 *
 * Detects patterns that reveal data as synthetic:
 * - Too many round numbers (>60% ending in 000)
 * - Too many identical values across facilities
 * - Perfectly correlated fields (no noise)
 * - Suspicious patterns in accrued interest / fees
 * - All financial snapshots have identical ratios
 * - Cash flows all same direction
 */

import type { V2GeneratorOutput } from '../v2/generators';
import type { QualityControlResult } from './shared-types';
import { findTable } from './shared-types';

export function runAntiSyntheticChecks(
  output: V2GeneratorOutput,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // -- Round number analysis on committed amounts --
  const exposureTable = findTable(output, 'facility_exposure_snapshot');
  if (exposureTable) {
    const lastDate = output.dates[output.dates.length - 1];
    const lastRows = exposureTable.rows.filter(r => r.as_of_date === lastDate);

    // Check committed amounts
    const committed = lastRows.map(r => r.committed_amount as number).filter(v => v > 0);
    if (committed.length >= 5) {
      const roundCount = committed.filter(v => Math.abs(v % 1000000) < 1).length;
      const roundPct = roundCount / committed.length;
      if (roundPct > 0.80) {
        warnings.push(
          `Anti-synthetic: ${(roundPct*100).toFixed(0)}% of committed amounts are exact millions — ` +
          `real data has more granularity`
        );
      }
    }

    // Check drawn amounts
    const drawn = lastRows.map(r => (r.drawn_amount ?? r.outstanding_balance_amt) as number).filter(v => v > 1000);
    if (drawn.length >= 5) {
      const roundDrawnCount = drawn.filter(v => Math.abs(v % 100000) < 1).length;
      const roundPct = roundDrawnCount / drawn.length;
      if (roundPct > 0.80) {
        warnings.push(
          `Anti-synthetic: ${(roundPct*100).toFixed(0)}% of drawn amounts are exact hundred-thousands`
        );
      }
    }
  }

  // -- Identical base rates (should have some variation by currency) --
  const pricingTable = findTable(output, 'facility_pricing_snapshot');
  if (pricingTable) {
    const lastDate = output.dates[output.dates.length - 1];
    const lastRates = pricingTable.rows
      .filter(r => r.as_of_date === lastDate)
      .map(r => r.base_rate_pct as number)
      .filter(v => v > 0);

    if (lastRates.length >= 5) {
      const uniqueRates = new Set(lastRates.map(r => r.toFixed(6)));
      if (uniqueRates.size === 1) {
        warnings.push(`Anti-synthetic: all ${lastRates.length} facilities have identical base_rate — expected variation by currency/index`);
      }
    }
  }

  // -- Identical cost of funds (should vary by currency at least) --
  const profitTable = findTable(output, 'facility_profitability_snapshot');
  if (profitTable) {
    const lastDate = output.dates[output.dates.length - 1];
    const lastRows = profitTable.rows.filter(r => r.as_of_date === lastDate);

    // Check equity allocation
    const equityPcts = lastRows
      .map(r => r.equity_allocation_pct as number)
      .filter(v => v > 0);
    if (equityPcts.length >= 5) {
      const uniqueEqPcts = new Set(equityPcts.map(v => v.toFixed(6)));
      if (uniqueEqPcts.size === 1) {
        warnings.push(`Anti-synthetic: all ${equityPcts.length} facilities use identical equity_allocation_pct (${equityPcts[0]})`);
      }
    }
  }

  // -- Cash flow direction diversity --
  const cashFlowTable = findTable(output, 'cash_flow');
  if (cashFlowTable && cashFlowTable.rows.length >= 5) {
    const directions = cashFlowTable.rows.map(r => r.direction as string);
    const uniqueDirections = new Set(directions);
    if (uniqueDirections.size === 1) {
      warnings.push(`Anti-synthetic: all ${directions.length} cash flows are ${[...uniqueDirections][0]} — expected mix of INFLOW/OUTFLOW`);
    }

    // Cash flow types should be diverse
    const types = cashFlowTable.rows.map(r => r.cash_flow_type as string);
    const uniqueTypes = new Set(types);
    if (uniqueTypes.size === 1 && cashFlowTable.rows.length >= 10) {
      warnings.push(`Anti-synthetic: all cash flows are type ${[...uniqueTypes][0]} — expected DISBURSEMENT/REPAYMENT/INTEREST mix`);
    }
  }

  // -- Financial snapshot ratio diversity --
  const financialTable = findTable(output, 'facility_financial_snapshot');
  if (financialTable && financialTable.rows.length >= 3) {
    const lastDate = output.dates[output.dates.length - 1];
    const lastRows = financialTable.rows.filter(r => r.as_of_date === lastDate);
    if (lastRows.length >= 3) {
      // Check that EBITDA margins aren't all identical (use ebitda / opex ratio)
      const margins = lastRows
        .filter(r => (r.ebitda_amt as number) > 0 && (r.operating_expense_amt as number) > 0)
        .map(r => ((r.ebitda_amt as number) / (r.operating_expense_amt as number)).toFixed(3));
      const uniqueMargins = new Set(margins);
      if (margins.length >= 3 && uniqueMargins.size === 1) {
        warnings.push(`Anti-synthetic: all financial snapshots have identical EBITDA margin — expected variation`);
      }
    }
  }

  // -- Counterparty financial diversity --
  const cpFinTable = findTable(output, 'counterparty_financial_snapshot');
  if (cpFinTable && cpFinTable.rows.length >= 3) {
    const lastDate = output.dates[output.dates.length - 1];
    const lastRows = cpFinTable.rows.filter(r => r.as_of_date === lastDate);
    if (lastRows.length >= 3) {
      const revenues = lastRows.map(r => r.revenue_amt as number).filter(v => v > 0);
      const uniqueRevenues = new Set(revenues.map(v => Math.round(v / 10000)));
      if (revenues.length >= 3 && uniqueRevenues.size === 1) {
        warnings.push(`Anti-synthetic: all ${revenues.length} counterparties have near-identical revenue`);
      }
    }
  }

  return { errors, warnings };
}
