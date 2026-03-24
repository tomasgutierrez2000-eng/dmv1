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

  // applyDrawBehavior reads from state — build a minimal object that satisfies its reads.
  // It accesses: product_type, lifecycle_stage, committed_amount, drawn_amount,
  // original_committed, industry_id, facility_type_code
  const stateSlice = {
    product_type: input.product_type,
    lifecycle_stage: input.lifecycle_stage,
    committed_amount: input.committed_amount,
    drawn_amount: input.drawn_amount,
    original_committed: input.original_committed,
    industry_id: input.industry_id,
    facility_type_code: input.facility_type_code,
  };

  const drawResult = applyDrawBehaviorModel(
    ctx.rng,
    stateSlice as any, // applyDrawBehavior expects full FacilityState but only reads these fields
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
