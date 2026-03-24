/**
 * Stage 5: Spread Update — market spread evolution via Ornstein-Uhlenbeck process.
 */

import { STORY_SPREAD_MULTIPLIERS } from '../../../../scripts/shared/mvp-config';
import { evolveSpread } from '../distributions';
import { interpolateArcValue } from '../time-series';
import type { SpreadUpdateInput, SpreadUpdateOutput, StageContext } from '../stage-types';

export function applySpreadUpdate(
  input: SpreadUpdateInput,
  ctx: StageContext,
): SpreadUpdateOutput {
  const arc = input.story_arc;
  const spreadMultCurve = STORY_SPREAD_MULTIPLIERS[arc] ?? [1.0, 1.0, 1.0, 1.0, 1.0];
  const spreadMult = interpolateArcValue(ctx.date, ctx.dates, spreadMultCurve);

  return {
    spread_bps: evolveSpread(ctx.rng, input.spread_bps, input.rating_tier, spreadMult, ctx.dt),
  };
}
