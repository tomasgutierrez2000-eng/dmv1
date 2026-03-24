/**
 * Stage 3: Collateral Revaluation — drift + volatility per asset type.
 */

import { evolveCollateralValue } from '../distributions';
import { round } from '../prng';
import type { CollateralInput, CollateralOutput, StageContext } from '../stage-types';

export function applyCollateralRevaluation(
  input: CollateralInput,
  ctx: StageContext,
): CollateralOutput {
  const newValue = evolveCollateralValue(
    ctx.rng, input.collateral_value, input.collateral_type, ctx.dt,
  );

  // LTV: when collateral is zero but drawn > 0, return a high sentinel value
  // (not 1.0, which would imply perfect coverage)
  const ltv_ratio = newValue > 0
    ? round(input.drawn_amount / newValue, 4)
    : (input.drawn_amount > 0 ? 999.0 : 0);

  return {
    collateral_value: newValue,
    ltv_ratio,
  };
}
