/**
 * Stage 6: Pricing — all-in rate from base rate + spread + utilization pricing.
 */

import { calculateAllInRate } from '../product-models';
import type { MarketEnvironment } from '../market-environment';
import type { PricingInput, PricingOutput, StageContext } from '../stage-types';

export function applyPricing(
  input: PricingInput,
  market: MarketEnvironment,
  ctx: StageContext,
): PricingOutput {
  const sectorCondition = market.getSectorCondition(input.industry_id, ctx.date);
  const utilization = input.committed_amount > 0
    ? input.drawn_amount / input.committed_amount
    : 0;

  return {
    all_in_rate_pct: calculateAllInRate(
      input.base_rate_pct,
      input.spread_bps + sectorCondition.spread_adder_bps,
      input.product_type,
      utilization,
    ),
    last_rate_reset_date: ctx.date,
  };
}
