/**
 * Stage 9: Derived Metrics — EAD, RWA, ECL, financial ratios, remaining tenor.
 */

import {
  calculateEAD, calculateRWA, calculateExpectedLoss, calculateECL,
  PRODUCT_CONFIGS,
} from '../product-models';
import { monthsBetween } from '../time-series';
import { round } from '../prng';
import type { CounterpartyFinancials } from '../types';
import type { DerivedMetricsInput, DerivedMetricsOutput, StageContext } from '../stage-types';

export function applyDerivedMetrics(
  input: DerivedMetricsInput,
  financials: CounterpartyFinancials,
  ctx: StageContext,
): DerivedMetricsOutput {
  // Remaining tenor
  const remaining_tenor_months = Math.max(0, monthsBetween(ctx.date, input.maturity_date));

  // EAD, RWA, EL
  const ccf = PRODUCT_CONFIGS[input.product_type].ccf;
  const ead = calculateEAD(input.drawn_amount, input.undrawn_amount, input.product_type);
  const rwa = calculateRWA(ead, input.risk_weight_pct);
  const expected_loss = calculateExpectedLoss(input.pd_annual, input.lgd_current, ead);

  // ECL
  const ecl = calculateECL(
    input.pd_annual, input.lgd_current, ead,
    input.ifrs9_stage, remaining_tenor_months,
  );

  // Financial ratios
  const debtService = financials.interest_expense + financials.total_debt * 0.02;
  const dscr = debtService > 0 ? round(financials.ebitda / debtService, 4) : 0;
  const icr = financials.interest_expense > 0
    ? round(financials.ebitda / financials.interest_expense, 4) : 0;
  const leverage_ratio = financials.ebitda > 0
    ? round(financials.total_debt / financials.ebitda, 4) : 0;

  return {
    ead,
    ccf,
    rwa,
    expected_loss,
    ecl_12m: ecl.ecl_12m,
    ecl_lifetime: ecl.ecl_lifetime,
    remaining_tenor_months,
    dscr,
    icr,
    leverage_ratio,
  };
}
