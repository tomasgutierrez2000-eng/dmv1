/**
 * Group 8: Portfolio Distribution
 *
 * Ensures the generated portfolio is realistic, not suspiciously uniform:
 * - Amount diversity (unique committed amounts)
 * - Currency diversity matches counterparty countries
 * - Rating distribution isn't degenerate
 * - Spread distribution has reasonable variance
 * - Product mix (not all same product type)
 * - Country/industry concentration
 */

import type { L1Chain } from '../chain-builder';
import type { V2GeneratorOutput } from '../v2/generators';
import type { ScenarioConfig } from '../scenario-config';
import type { QualityControlResult } from './shared-types';
import { findTable, stdev } from './shared-types';

export function runPortfolioDistribution(
  output: V2GeneratorOutput,
  chain: L1Chain,
  config: ScenarioConfig,
): QualityControlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Use the last date for snapshot analysis
  const lastDate = output.dates[output.dates.length - 1];
  if (!lastDate) return { errors, warnings };

  // -- Committed amount diversity --
  const exposureTable = findTable(output, 'facility_exposure_snapshot');
  if (exposureTable) {
    const lastDateRows = exposureTable.rows.filter(r => r.as_of_date === lastDate);
    const committed = lastDateRows.map(r => r.committed_amount as number).filter(v => v > 0);
    const uniqueCommitted = new Set(committed.map(v => Math.round(v / 1000))); // round to $1K
    if (committed.length >= 5 && uniqueCommitted.size < committed.length * 0.4) {
      warnings.push(
        `Distribution: only ${uniqueCommitted.size}/${committed.length} unique committed amounts on ${lastDate} — ` +
        `data may look synthetic`
      );
    }

    // -- Drawn amount diversity --
    const drawn = lastDateRows.map(r => (r.drawn_amount ?? r.outstanding_balance_amt) as number).filter(v => v !== undefined);
    const uniqueDrawn = new Set(drawn.map(v => Math.round(v / 1000)));
    if (drawn.length >= 5 && uniqueDrawn.size < drawn.length * 0.3) {
      warnings.push(
        `Distribution: only ${uniqueDrawn.size}/${drawn.length} unique drawn amounts on ${lastDate}`
      );
    }
  }

  // -- Currency diversity --
  const currencies = new Set(chain.facilities.map(f => (f as unknown as Record<string, unknown>).currency_code as string).filter(Boolean));
  if (chain.facilities.length >= 10 && currencies.size === 1) {
    warnings.push(`Distribution: all ${chain.facilities.length} facilities use ${[...currencies][0]} — no currency diversification`);
  }

  // -- Product mix --
  const productTypes = chain.facilities.map(f => (f as unknown as Record<string, unknown>).facility_type_code as string);
  const uniqueProducts = new Set(productTypes.filter(Boolean));
  if (chain.facilities.length >= 6 && uniqueProducts.size === 1) {
    warnings.push(`Distribution: all facilities are ${[...uniqueProducts][0]} — no product diversification`);
  }

  // -- Spread diversity --
  const pricingTable = findTable(output, 'facility_pricing_snapshot');
  if (pricingTable) {
    const lastSpreads = pricingTable.rows
      .filter(r => r.as_of_date === lastDate)
      .map(r => r.spread_bps as number)
      .filter(v => v > 0);

    if (lastSpreads.length >= 5) {
      const spreadStdev = stdev(lastSpreads);
      const spreadMean = lastSpreads.reduce((s, v) => s + v, 0) / lastSpreads.length;
      // Guard: only check CV if we have enough data and a positive mean
      if (spreadMean > 0 && lastSpreads.length >= 2 && spreadStdev / spreadMean < 0.05) {
        warnings.push(
          `Distribution: spread CV=${(spreadStdev/spreadMean*100).toFixed(1)}% — almost identical spreads across ${lastSpreads.length} facilities`
        );
      }
    }
  }

  // -- PD distribution --
  const riskTable = findTable(output, 'facility_risk_snapshot');
  if (riskTable) {
    const lastPDs = riskTable.rows
      .filter(r => r.as_of_date === lastDate)
      .map(r => r.pd_pct as number)
      .filter(v => v > 0);

    if (lastPDs.length >= 5) {
      const pdStdev = stdev(lastPDs);
      const pdMean = lastPDs.reduce((s, v) => s + v, 0) / lastPDs.length;
      // Guard: only check CV if we have enough data and a positive mean
      if (pdMean > 0 && lastPDs.length >= 2 && pdStdev / pdMean < 0.05) {
        warnings.push(`Distribution: PD CV=${(pdStdev/pdMean*100).toFixed(1)}% — almost identical PDs across ${lastPDs.length} facilities`);
      }
    }
  }

  // -- Rating diversity (if multiple counterparties) --
  const ratingTable = findTable(output, 'counterparty_rating_observation');
  if (ratingTable && chain.counterparties.length >= 3) {
    const internalRatings = ratingTable.rows
      .filter(r => r.as_of_date === lastDate && r.rating_agency === 'INTERNAL')
      .map(r => r.rating_value as string);
    const uniqueRatings = new Set(internalRatings);
    if (internalRatings.length >= 3 && uniqueRatings.size === 1) {
      warnings.push(`Distribution: all ${internalRatings.length} counterparties have identical internal rating ${[...uniqueRatings][0]}`);
    }
  }

  return { errors, warnings };
}
