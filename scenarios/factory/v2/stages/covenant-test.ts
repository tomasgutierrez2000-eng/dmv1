/**
 * Stage 7: Credit Status, DPD & Covenant Testing.
 *
 * Also includes the covenant-aware credit status adjustment:
 * an unwaived breach pushes status to at least WATCH.
 */

import {
  STORY_CREDIT_STATUS,
  STORY_DPD,
} from '../../../../scripts/shared/mvp-config';
import { interpolateArcValue } from '../time-series';
import { testCovenants, nextTestDate } from '../covenant-engine';
import type { CounterpartyFinancials, CreditStatus, FacilityEvent } from '../types';
import type { CovenantTestInput, CovenantTestOutput, StageContext } from '../stage-types';

export function applyCovenantTest(
  input: CovenantTestInput,
  financials: CounterpartyFinancials,
  ctx: StageContext,
): CovenantTestOutput {
  const arc = input.story_arc;

  // Credit status from story arc
  let credit_status = input.credit_status;
  const statusCurve = STORY_CREDIT_STATUS[arc];
  if (statusCurve) {
    const statusIdx = Math.min(
      Math.floor((ctx.dateIdx / Math.max(ctx.dates.length - 1, 1)) * statusCurve.length),
      statusCurve.length - 1,
    );
    credit_status = statusCurve[statusIdx] as CreditStatus;
  }

  // DPD from story arc
  let days_past_due = input.days_past_due;
  const dpdCurve = STORY_DPD[arc];
  if (dpdCurve) {
    days_past_due = Math.round(interpolateArcValue(ctx.date, ctx.dates, dpdCurve));
  }

  // Covenant testing — build a minimal state slice for testCovenants
  const stateSlice = {
    facility_id: input.facility_id,
    counterparty_id: input.counterparty_id,
    covenant_package: input.covenant_package,
    covenants: input.covenants,
    rating_tier: input.rating_tier,
    drawn_amount: input.drawn_amount,
    collateral_value: input.collateral_value,
    credit_status,
    days_past_due,
  };

  const previousDate = ctx.dateIdx > 0 ? ctx.dates[ctx.dateIdx - 1] : undefined;
  const covResult = testCovenants(
    ctx.rng,
    stateSlice as any, // testCovenants expects full FacilityState but only reads these fields
    financials,
    ctx.date,
    previousDate,
  );

  const events: FacilityEvent[] = [...covResult.events];
  const covenants = covResult.updatedStates;

  let next_test_date: string | null = input.covenant_package
    ? nextTestDate(ctx.date, input.covenant_package.test_frequency)
    : null;

  // Covenant-aware credit status adjustment:
  // an unwaived breach pushes status to at least WATCH
  if (credit_status === 'PERFORMING' &&
      covenants.some(c => c.is_breached && !c.waiver_active)) {
    credit_status = 'WATCH';
  }

  return {
    credit_status,
    days_past_due,
    covenants,
    next_test_date,
    events,
  };
}
