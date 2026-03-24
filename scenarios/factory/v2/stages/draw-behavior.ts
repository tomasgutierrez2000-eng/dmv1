/**
 * Stage 2: Draw Behavior — apply product-specific draw behavior with seasonal overlay.
 */

import { STORY_UTILIZATION } from '../../../../scripts/shared/mvp-config';
import { applyDrawBehavior as applyDrawBehaviorModel } from '../product-models';
import type { DrawBehaviorInput, DrawBehaviorOutput, StageContext } from '../stage-types';

export function applyDrawBehaviorStage(
  input: DrawBehaviorInput,
  ctx: StageContext,
): DrawBehaviorOutput {
  const arc = input.story_arc;
  const storyUtilCurve = STORY_UTILIZATION[arc] ?? [0.50, 0.50, 0.50, 0.50, 0.50];

  const drawResult = applyDrawBehaviorModel(
    ctx.rng,
    input, // DrawBehaviorInput matches applyDrawBehavior's Pick<> parameter type
    ctx.date,
    ctx.dates,
    storyUtilCurve,
  );

  // Track draw/repay dates
  let last_draw_date: string | null = null;
  let last_repay_date: string | null = null;

  if (drawResult.drawn_amount > input.drawn_amount) {
    last_draw_date = ctx.date;
  } else if (drawResult.drawn_amount < input.drawn_amount) {
    last_repay_date = ctx.date;
  }

  return {
    drawn_amount: drawResult.drawn_amount,
    undrawn_amount: drawResult.undrawn_amount,
    prior_drawn_amount: drawResult.prior_drawn_amount,
    last_draw_date,
    last_repay_date,
  };
}
