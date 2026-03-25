/**
 * Stage 10: Lifecycle Transitions + Threshold-Based Events.
 */

import { PRODUCT_CONFIGS } from '../product-models';
import type { FacilityEvent, LifecycleStage } from '../types';
import type { LifecycleInput, LifecycleOutput, StageContext } from '../stage-types';

export function applyLifecycle(
  input: LifecycleInput,
  ctx: StageContext,
): LifecycleOutput {
  let lifecycle_stage: LifecycleStage = input.lifecycle_stage;
  const events: FacilityEvent[] = [];
  const remainingMonths = input.remaining_tenor_months;

  // ── Lifecycle transitions ──
  switch (lifecycle_stage) {
    case 'COMMITMENT':
      if (input.drawn_amount > 0) {
        lifecycle_stage = 'FUNDED';
        events.push({
          type: 'LIFECYCLE_TRANSITION',
          date: ctx.date,
          description: `Facility ${input.facility_id} transitioned from COMMITMENT to FUNDED`,
          severity: 'LOW',
          triggered_by: 'first_draw',
          facility_ids: [input.facility_id],
          counterparty_id: input.counterparty_id,
        });
      }
      break;

    case 'FUNDED':
      // Revolvers that fully repay transition back to COMMITMENT
      if (input.drawn_amount <= 0 && !PRODUCT_CONFIGS[input.product_type].bulletDraw) {
        lifecycle_stage = 'COMMITMENT';
      } else if (PRODUCT_CONFIGS[input.product_type].amortizes && input.drawn_amount < input.original_committed) {
        lifecycle_stage = 'AMORTIZING';
      }
      if (remainingMonths <= 3 && remainingMonths > 0) {
        lifecycle_stage = 'MATURING';
        events.push({
          type: 'MATURITY_APPROACHING',
          date: ctx.date,
          description: `Facility ${input.facility_id} matures in ${remainingMonths} months`,
          severity: 'MEDIUM',
          triggered_by: 'maturity_proximity',
          facility_ids: [input.facility_id],
          counterparty_id: input.counterparty_id,
        });
      }
      break;

    case 'AMORTIZING':
      if (remainingMonths <= 3 && remainingMonths > 0) {
        lifecycle_stage = 'MATURING';
      }
      break;

    case 'MATURING':
      if (remainingMonths <= 0) {
        lifecycle_stage = 'MATURED';
      }
      break;

    case 'MATURED':
    case 'RESTRUCTURED':
    case 'DEFAULT':
    case 'WORKOUT':
    case 'WRITTEN_OFF':
      break;
  }

  // Default trigger: covenant breach without waiver, severe DPD
  if (lifecycle_stage !== 'DEFAULT' && lifecycle_stage !== 'WORKOUT' &&
      lifecycle_stage !== 'WRITTEN_OFF') {
    if (input.days_past_due > 90 || input.credit_status === 'DEFAULT') {
      lifecycle_stage = 'DEFAULT';
      events.push({
        type: 'FACILITY_DEFAULT',
        date: ctx.date,
        description: `Facility ${input.facility_id} entered DEFAULT (DPD=${input.days_past_due}, status=${input.credit_status})`,
        severity: 'CRITICAL',
        triggered_by: 'dpd_or_status',
        facility_ids: [input.facility_id],
        counterparty_id: input.counterparty_id,
      });
    }
  }

  // ── Threshold-based events ──
  const util = input.committed_amount > 0 ? input.drawn_amount / input.committed_amount : 0;

  if (util > 0.90) {
    events.push({
      type: 'HIGH_UTILIZATION',
      date: ctx.date,
      description: `Facility ${input.facility_id} utilization at ${(util * 100).toFixed(1)}%`,
      severity: 'MEDIUM',
      triggered_by: 'utilization_threshold',
      facility_ids: [input.facility_id],
      counterparty_id: input.counterparty_id,
    });
  }

  if (input.ltv_ratio > 0.85 && input.collateral_type !== 'NONE') {
    events.push({
      type: 'COLLATERAL_SHORTFALL',
      date: ctx.date,
      description: `LTV ratio ${(input.ltv_ratio * 100).toFixed(1)}% exceeds 85% threshold`,
      severity: 'HIGH',
      triggered_by: 'ltv_threshold',
      facility_ids: [input.facility_id],
      counterparty_id: input.counterparty_id,
    });
  }

  if (remainingMonths > 0 && remainingMonths <= 6) {
    events.push({
      type: 'MATURITY_CONCENTRATION',
      date: ctx.date,
      description: `Facility ${input.facility_id} matures in ${remainingMonths} months`,
      severity: remainingMonths <= 3 ? 'HIGH' : 'MEDIUM',
      triggered_by: 'maturity_wall',
      facility_ids: [input.facility_id],
      counterparty_id: input.counterparty_id,
    });
  }

  if (input.days_past_due > 30 && input.days_past_due <= 90) {
    events.push({
      type: 'PAYMENT_DELAY',
      date: ctx.date,
      description: `Facility ${input.facility_id}: ${input.days_past_due} days past due`,
      severity: 'HIGH',
      triggered_by: 'dpd_threshold',
      facility_ids: [input.facility_id],
      counterparty_id: input.counterparty_id,
    });
  }

  return {
    lifecycle_stage,
    events,
  };
}
