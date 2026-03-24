/**
 * Stage 1: Base Rate — update market rates from MarketEnvironment.
 */

import type { MarketEnvironment } from '../market-environment';
import type { BaseRateInput, BaseRateOutput, StageContext } from '../stage-types';

export function applyBaseRate(
  input: BaseRateInput,
  market: MarketEnvironment,
  ctx: StageContext,
): BaseRateOutput {
  return {
    base_rate_pct: market.getBaseRate(ctx.date, input.currency_code),
    cost_of_funds_pct: market.getCostOfFunds(ctx.date, input.currency_code),
  };
}
