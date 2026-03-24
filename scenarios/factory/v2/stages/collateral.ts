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

  const ltv_ratio = newValue > 0
    ? round(input.drawn_amount / newValue, 4)
    : 1.0;

  return {
    collateral_value: newValue,
    ltv_ratio,
  };
}
