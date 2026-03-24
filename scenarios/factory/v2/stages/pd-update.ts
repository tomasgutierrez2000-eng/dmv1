/**
 * Stage 4: PD Update — base PD + story arc multiplier + sector condition.
 */

import { STORY_PD_MULTIPLIERS } from '../../../../scripts/shared/mvp-config';
import { interpolateArcValue } from '../time-series';
import { round, clamp } from '../prng';
import type { MarketEnvironment } from '../market-environment';
import type { PDUpdateInput, PDUpdateOutput, StageContext } from '../stage-types';

export function applyPDUpdate(
  input: PDUpdateInput,
  market: MarketEnvironment,
  ctx: StageContext,
): PDUpdateOutput {
  const arc = input.story_arc;
  const pdMultCurve = STORY_PD_MULTIPLIERS[arc] ?? [1.0, 1.0, 1.0, 1.0, 1.0];
  const pdMult = interpolateArcValue(ctx.date, ctx.dates, pdMultCurve);
  const sectorCondition = market.getSectorCondition(input.industry_id, ctx.date);
  const sectorPdMult = sectorCondition.pd_multiplier;

  return {
    pd_annual: round(
      clamp(input.pd_at_origination * pdMult * sectorPdMult, 0.0001, 0.9999),
      6,
    ),
  };
}
