/**
 * FacilityStateManager — THE CORE of Data Factory v2.
 *
 * Manages the single evolving state per facility. All L2 generators read
 * from the same state, guaranteeing cross-table correlation.
 *
 * Pipeline per time step:
 *   1. Update market rates from MarketEnvironment
 *   2. Apply product model draw behavior (with seasonal overlay)
 *   3. Execute amortization schedule (if term loan)
 *   4. Revalue collateral (drift + volatility per asset type)
 *   5. Recompute PD (base + story arc multiplier + sector condition)
 *   6. Recompute spread (market spread + PD-based adder + utilization pricing)
 *   7. Test covenants (if quarterly test date falls in this period)
 *   8. Update IFRS 9 staging (PD increase >2x → Stage 2, DPD >90 → Stage 3)
 *   9. Compute derived metrics (EAD, RWA, ECL)
 *   10. Check lifecycle transitions
 *   11. Collect all events generated
 */

import type { StoryArc, RatingTier, SizeProfile } from '../../../scripts/shared/mvp-config';
import {
  STORY_PD_MULTIPLIERS,
  STORY_UTILIZATION,
  STORY_SPREAD_MULTIPLIERS,
  STORY_CREDIT_STATUS,
  STORY_DPD,
  RATING_TIER_MAP,
} from '../../../scripts/shared/mvp-config';

import type {
  FacilityState, FacilityStateMap, ProductType, CreditStatus,
  IFRS9Stage, CounterpartyFinancials, FacilityEvent, TimeFrequency,
  CovenantPackage,
} from './types';
import { stateKey, CREDIT_STATUS_CODE } from './types';

import { seededRng, pick, round, clamp } from './prng';

import {
  sampleCommittedAmount, sampleLGD, sampleSpread, evolveSpread,
  sampleRiskWeight, sampleCollateralValue, evolveCollateralValue,
  sampleFeeRate, boundedNormal, FINANCIAL_PARAMS,
} from './distributions';

import { MarketEnvironment } from './market-environment';
import { interpolateArcValue, frequencyToDt, getMonth, monthsBetween } from './time-series';

import {
  applyDrawBehavior, calculateAllInRate, calculateEAD, calculateRWA,
  calculateExpectedLoss, calculateECL, calculateFeeRate,
  PRODUCT_CONFIGS, generateAmortizationSchedule,
} from './product-models';

import {
  getDefaultCovenantPackage, initializeCovenantStates,
  testCovenants, checkCrossDefault, nextTestDate,
} from './covenant-engine';

import type { EnrichedFacility, EnrichedCounterparty } from '../gsib-enrichment';
import type { L1Chain } from '../chain-builder';

// ─── Initialization ────────────────────────────────────────────────────

/**
 * Map facility_type string to ProductType enum.
 */
function mapProductType(facilityType: string): ProductType {
  const typeMap: Record<string, ProductType> = {
    'REVOLVING_CREDIT': 'REVOLVING_CREDIT',
    'REVOLVER': 'REVOLVING_CREDIT',
    'RCF': 'REVOLVING_CREDIT',
    'TERM_LOAN': 'TERM_LOAN',
    'TL': 'TERM_LOAN',
    'TERM_LOAN_A': 'TERM_LOAN',
    'TLA': 'TERM_LOAN',
    'TERM_LOAN_B': 'TERM_LOAN_B',
    'TLB': 'TERM_LOAN_B',
    'LETTER_OF_CREDIT': 'LETTER_OF_CREDIT',
    'LC': 'LETTER_OF_CREDIT',
    'LOC': 'LETTER_OF_CREDIT',
    'BRIDGE_LOAN': 'BRIDGE_LOAN',
    'BRIDGE': 'BRIDGE_LOAN',
    'DELAYED_DRAW_TERM_LOAN': 'DELAYED_DRAW_TERM_LOAN',
    'DDTL': 'DELAYED_DRAW_TERM_LOAN',
    'SWINGLINE': 'SWINGLINE',
  };
  return typeMap[facilityType.toUpperCase()] ?? 'REVOLVING_CREDIT';
}

/**
 * Map internal rating to a credit status.
 */
function initialCreditStatus(arc: StoryArc): CreditStatus {
  const statuses = STORY_CREDIT_STATUS[arc];
  return (statuses?.[0] ?? 'PERFORMING') as CreditStatus;
}

/**
 * Determine collateral type based on industry and facility type.
 */
function inferCollateralType(industryId: number, productType: ProductType): string {
  if (productType === 'LETTER_OF_CREDIT') return 'CASH';
  switch (industryId) {
    case 10: return 'RE';           // Real Estate
    case 4: case 5: case 9:        // Energy, Industrials, Materials
      return 'EQUIPMENT';
    case 7: case 6:                 // Retail, Consumer Staples/Agri
      return 'RECEIVABLES';
    case 8:  return 'FLEET';        // Utilities/Transportation
    case 1: case 3:                 // Financial Services, Banks
      return 'CASH';
    default: return 'NONE';         // Tech/Healthcare (2) and others
  }
}

/**
 * Initialize a FacilityState from L1 chain data.
 */
export function initializeFacilityState(
  facility: EnrichedFacility,
  counterparty: EnrichedCounterparty,
  storyArc: StoryArc,
  ratingTier: RatingTier,
  sizeProfile: SizeProfile,
  initialDate: string,
): FacilityState {
  const rng = seededRng(`init-${facility.facility_id}`);
  const productType = mapProductType(facility.facility_type);
  const tierConfig = RATING_TIER_MAP[ratingTier];
  const productConfig = PRODUCT_CONFIGS[productType];

  // Committed amount: use enriched value or sample from distribution
  const committed = facility.committed_facility_amt > 0
    ? facility.committed_facility_amt
    : sampleCommittedAmount(rng, sizeProfile, counterparty.industry_id);

  // Initial utilization based on product type
  const initialUtil = STORY_UTILIZATION[storyArc]?.[0] ?? 0.50;
  const drawn = productConfig.bulletDraw
    ? committed // Term loans: fully drawn at origination
    : round(committed * clamp(initialUtil, 0, 1), 2);
  const undrawn = committed - drawn;

  // PD from counterparty enrichment or tier midpoint
  const pd = counterparty.pd_annual > 0
    ? counterparty.pd_annual
    : (tierConfig.pdLow + tierConfig.pdHigh) / 2;

  // LGD
  const lgd = sampleLGD(rng, ratingTier);

  // Spread
  const spreadBps = facility.interest_rate_spread_bps > 0
    ? facility.interest_rate_spread_bps
    : sampleSpread(rng, ratingTier);

  // Risk weight
  const riskWeightPct = sampleRiskWeight(rng, ratingTier);

  // Collateral
  const collateralType = inferCollateralType(counterparty.industry_id, productType);
  const collateralValue = sampleCollateralValue(rng, drawn > 0 ? drawn : committed, collateralType);
  const ltvRatio = collateralValue > 0 ? drawn / collateralValue : 1.0;

  // Base rate from market environment (use SOFR as default)
  const baseRatePct = 0.0533; // Will be overridden per step from MarketEnvironment

  // All-in rate
  const utilization = committed > 0 ? drawn / committed : 0;
  const allInRate = calculateAllInRate(baseRatePct, spreadBps, productType, utilization);

  // Fee rate
  const feeRate = calculateFeeRate(productType, ratingTier);

  // Cost of funds
  const costOfFunds = Math.max(0, baseRatePct - 0.005);

  // Covenant package
  const covenantPackage = getDefaultCovenantPackage(ratingTier);
  const covenantStates = initializeCovenantStates(covenantPackage);

  // Remaining tenor
  const remainingTenor = monthsBetween(initialDate, facility.maturity_date);

  // EAD, RWA, EL
  const ead = calculateEAD(drawn, undrawn, productType);
  const ccf = PRODUCT_CONFIGS[productType].ccf;
  const rwa = calculateRWA(ead, riskWeightPct);
  const expectedLoss = calculateExpectedLoss(pd, lgd, ead);

  // ECL
  const { ecl_12m, ecl_lifetime } = calculateECL(pd, lgd, ead, 1, remainingTenor);

  // Amortization schedule for term loans
  const amortSchedule = productConfig.amortizes
    ? generateAmortizationSchedule(
        committed, allInRate, facility.origination_date,
        facility.maturity_date, productConfig.amortizationRate,
      )
    : null;

  // External ratings from counterparty
  const extRatingSP = counterparty.external_rating_sp ?? 'NR';
  const extRatingMoodys = counterparty.external_rating_moodys ?? 'NR';

  return {
    // Identity
    facility_id: facility.facility_id,
    counterparty_id: counterparty.counterparty_id,
    credit_agreement_id: facility.credit_agreement_id,
    product_type: productType,
    currency_code: facility.currency_code,
    facility_type_code: facility.facility_type,

    // Profile (immutable)
    story_arc: storyArc,
    rating_tier: ratingTier,
    size_profile: sizeProfile,
    industry_id: counterparty.industry_id,
    country_code: counterparty.country_code,

    // Balances
    committed_amount: committed,
    drawn_amount: drawn,
    undrawn_amount: undrawn,
    original_committed: committed,

    // Credit quality
    pd_annual: pd,
    pd_at_origination: pd,
    lgd_current: lgd,
    internal_rating: counterparty.internal_risk_rating ?? 'NR',
    external_rating_sp: extRatingSP,
    external_rating_moodys: extRatingMoodys,
    credit_status: initialCreditStatus(storyArc),
    days_past_due: STORY_DPD[storyArc]?.[0] ?? 0,
    ifrs9_stage: 1,

    // Pricing
    spread_bps: spreadBps,
    base_rate_pct: baseRatePct,
    all_in_rate_pct: allInRate,
    fee_rate_pct: feeRate,
    cost_of_funds_pct: costOfFunds,

    // Collateral
    collateral_value: collateralValue,
    collateral_type: collateralType,
    ltv_ratio: round(ltvRatio, 4),

    // Covenants
    covenant_package: covenantPackage,
    covenants: covenantStates,
    next_test_date: nextTestDate(initialDate, covenantPackage.test_frequency),

    // Lifecycle — if drawn > 0 at init, skip COMMITMENT to avoid phantom transition
    lifecycle_stage: (productConfig.bulletDraw || drawn > 0) ? 'FUNDED' : 'COMMITMENT',
    origination_date: facility.origination_date,
    maturity_date: facility.maturity_date,
    remaining_tenor_months: remainingTenor,
    amortization_schedule: amortSchedule,
    next_payment_date: amortSchedule?.[0]?.payment_date ?? null,
    is_revolving: productConfig.isRevolving,

    // Risk metrics
    ead,
    ccf,
    rwa,
    risk_weight_pct: riskWeightPct,
    expected_loss: expectedLoss,
    ecl_12m,
    ecl_lifetime,

    // Financial ratios (will be computed per step)
    dscr: 0,
    icr: 0,
    leverage_ratio: 0,

    // Tracking
    last_draw_date: null,
    last_repay_date: null,
    last_rate_reset_date: null,
    prior_drawn_amount: 0,

    // Events
    events_this_period: [],
  };
}

// ─── Counterparty Financials ───────────────────────────────────────────

/**
 * Generate counterparty-level financials from aggregated facility data.
 */
export function generateCounterpartyFinancials(
  rng: () => number,
  counterpartyId: number,
  facilities: FacilityState[],
  tier: RatingTier,
  storyArc: StoryArc,
  dateIdx: number,
  totalDates: number,
): CounterpartyFinancials {
  const params = FINANCIAL_PARAMS[tier];
  const totalCommitted = facilities.reduce((s, f) => s + f.committed_amount, 0);
  const totalDrawn = facilities.reduce((s, f) => s + f.drawn_amount, 0);

  // Revenue baseline from committed amount
  const revRatio = params.revenueToCommitted.lo +
    rng() * (params.revenueToCommitted.hi - params.revenueToCommitted.lo);
  let revenueBase = totalCommitted * revRatio;

  // Apply story arc trend
  const arcMult = STORY_PD_MULTIPLIERS[storyArc];
  if (arcMult) {
    const cycleLen = arcMult.length;
    const t = totalDates > 1 ? dateIdx / (totalDates - 1) : 0;
    const floatIdx = t * (cycleLen - 1);
    const lo = Math.floor(floatIdx);
    const hi = Math.min(lo + 1, cycleLen - 1);
    const frac = floatIdx - lo;
    // PD multiplier is inversely correlated with revenue
    const pdMult = arcMult[lo] * (1 - frac) + arcMult[hi] * frac;
    revenueBase = revenueBase / Math.sqrt(pdMult); // Revenue drops as PD rises
  }

  // Add noise (±5%)
  const revenue = round(revenueBase * (1 + (rng() - 0.5) * 0.10), 2);

  // Operating expenses
  const opExRatio = boundedNormal(rng, params.opExRatio.mean, params.opExRatio.std, 0.40, 0.85);
  const totalExpenses = round(revenue * opExRatio, 2);

  // EBITDA
  const ebitda = round(revenue - totalExpenses, 2);

  // Interest expense = totalDrawn * weighted avg rate
  const avgRate = facilities.length > 0
    ? facilities.reduce((s, f) => s + f.all_in_rate_pct * f.drawn_amount, 0) / Math.max(totalDrawn, 1)
    : 0.06;
  const interestExpense = round(totalDrawn * avgRate, 2);

  // Net income
  const netIncome = round(ebitda - interestExpense, 2);

  // Balance sheet
  const totalAssets = round(totalCommitted * (2.5 + rng() * 1.0), 2);
  const totalDebt = round(totalDrawn * (1.2 + rng() * 0.3), 2);
  const totalLiabilities = round(totalDebt + totalAssets * (0.15 + rng() * 0.10), 2);
  const equity = round(totalAssets - totalLiabilities, 2);

  // Current ratio components
  const currentAssets = round(totalAssets * (0.25 + rng() * 0.15), 2);
  const currentLiabilities = round(totalLiabilities * (0.20 + rng() * 0.10), 2);

  // Other
  const tangibleNetWorth = round(equity * (0.85 + rng() * 0.10), 2);
  const capex = round(revenue * (0.05 + rng() * 0.08), 2);
  const fixedCharges = round(interestExpense + totalDrawn * 0.02, 2);

  return {
    counterparty_id: counterpartyId,
    total_revenue: revenue,
    ebitda,
    net_income: netIncome,
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    equity,
    total_debt: totalDebt,
    interest_expense: interestExpense,
    current_assets: currentAssets,
    current_liabilities: currentLiabilities,
    tangible_net_worth: tangibleNetWorth,
    capex,
    fixed_charges: fixedCharges,
  };
}

// ─── State Evolution ───────────────────────────────────────────────────

/**
 * Evolve a facility state forward one time step.
 *
 * This is the heart of the system — guaranteeing cross-table correlation
 * because ALL generators read from the SAME evolved state.
 */
export function evolveFacilityState(
  rng: () => number,
  prevState: FacilityState,
  date: string,
  dates: string[],
  dateIdx: number,
  market: MarketEnvironment,
  financials: CounterpartyFinancials,
  frequency: TimeFrequency,
): FacilityState {
  const state = structuredClone(prevState);
  state.events_this_period = [];
  const dt = frequencyToDt(frequency);
  const arc = state.story_arc;

  // ── Step 1: Market rates ──
  state.base_rate_pct = market.getBaseRate(date, state.currency_code);
  state.cost_of_funds_pct = market.getCostOfFunds(date, state.currency_code);

  // ── Step 2: Draw behavior (with seasonal overlay) ──
  const storyUtilCurve = STORY_UTILIZATION[arc] ?? [0.50, 0.50, 0.50, 0.50, 0.50];
  const drawResult = applyDrawBehavior(rng, state, date, dates, storyUtilCurve);
  state.prior_drawn_amount = drawResult.prior_drawn_amount;

  // Track draw/repay dates
  if (drawResult.drawn_amount > state.drawn_amount) {
    state.last_draw_date = date;
  } else if (drawResult.drawn_amount < state.drawn_amount) {
    state.last_repay_date = date;
  }
  state.drawn_amount = drawResult.drawn_amount;
  state.undrawn_amount = drawResult.undrawn_amount;

  // ── Step 3: Collateral revaluation ──
  state.collateral_value = evolveCollateralValue(rng, state.collateral_value, state.collateral_type, dt);
  state.ltv_ratio = state.collateral_value > 0
    ? round(state.drawn_amount / state.collateral_value, 4)
    : 1.0;

  // ── Step 4: PD evolution ──
  const pdMultCurve = STORY_PD_MULTIPLIERS[arc] ?? [1.0, 1.0, 1.0, 1.0, 1.0];
  const pdMult = interpolateArcValue(date, dates, pdMultCurve);
  const sectorCondition = market.getSectorCondition(state.industry_id, date);
  const sectorPdMult = sectorCondition.pd_multiplier;
  state.pd_annual = round(
    clamp(state.pd_at_origination * pdMult * sectorPdMult, 0.0001, 0.9999),
    6,
  );

  // ── Step 5: Spread evolution ──
  const spreadMultCurve = STORY_SPREAD_MULTIPLIERS[arc] ?? [1.0, 1.0, 1.0, 1.0, 1.0];
  const spreadMult = interpolateArcValue(date, dates, spreadMultCurve);
  state.spread_bps = evolveSpread(rng, state.spread_bps, state.rating_tier, spreadMult, dt);

  // ── Step 6: Pricing ──
  // Apply sector stress adder only to the all-in rate, not to the base spread
  const utilization = state.committed_amount > 0
    ? state.drawn_amount / state.committed_amount : 0;
  state.all_in_rate_pct = calculateAllInRate(
    state.base_rate_pct, state.spread_bps + sectorCondition.spread_adder_bps, state.product_type, utilization,
  );
  state.last_rate_reset_date = date;

  // ── Step 7: Credit status & DPD ──
  const statusCurve = STORY_CREDIT_STATUS[arc];
  if (statusCurve) {
    const statusIdx = Math.min(
      Math.floor((dateIdx / Math.max(dates.length - 1, 1)) * statusCurve.length),
      statusCurve.length - 1,
    );
    state.credit_status = statusCurve[statusIdx] as CreditStatus;
  }
  const dpdCurve = STORY_DPD[arc];
  if (dpdCurve) {
    state.days_past_due = Math.round(interpolateArcValue(date, dates, dpdCurve));
  }

  // ── Step 8: Covenant testing ──
  const previousDate = dateIdx > 0 ? dates[dateIdx - 1] : undefined;
  const covResult = testCovenants(rng, state, financials, date, previousDate);
  state.covenants = covResult.updatedStates;
  state.events_this_period.push(...covResult.events);
  if (state.covenant_package) {
    state.next_test_date = nextTestDate(date, state.covenant_package.test_frequency);
  }

  // ── Step 8b: Covenant-aware credit status adjustment ──
  // An unwaived covenant breach should push status to at least WATCH
  if (state.credit_status === 'PERFORMING' &&
      state.covenants.some(c => c.is_breached && !c.waiver_active)) {
    state.credit_status = 'WATCH';
  }

  // ── Step 9: IFRS 9 staging ──
  state.ifrs9_stage = determineIFRS9Stage(state);

  // ── Step 10: Remaining tenor ──
  state.remaining_tenor_months = Math.max(0, monthsBetween(date, state.maturity_date));

  // ── Step 11: Derived risk metrics ──
  const ccf = PRODUCT_CONFIGS[state.product_type].ccf;
  state.ccf = ccf;
  state.ead = calculateEAD(state.drawn_amount, state.undrawn_amount, state.product_type);
  state.rwa = calculateRWA(state.ead, state.risk_weight_pct);
  state.expected_loss = calculateExpectedLoss(state.pd_annual, state.lgd_current, state.ead);
  const ecl = calculateECL(
    state.pd_annual, state.lgd_current, state.ead,
    state.ifrs9_stage, state.remaining_tenor_months,
  );
  state.ecl_12m = ecl.ecl_12m;
  state.ecl_lifetime = ecl.ecl_lifetime;

  // ── Step 12: Financial ratios ──
  const debtService = financials.interest_expense + financials.total_debt * 0.02;
  state.dscr = debtService > 0 ? round(financials.ebitda / debtService, 4) : 0;
  state.icr = financials.interest_expense > 0
    ? round(financials.ebitda / financials.interest_expense, 4) : 0;
  state.leverage_ratio = financials.ebitda > 0
    ? round(financials.total_debt / financials.ebitda, 4) : 0;

  // ── Step 13: Lifecycle transitions ──
  applyLifecycleTransitions(state, date, rng);

  // ── Step 14: Generate threshold-based events ──
  generateThresholdEvents(state, date);

  return state;
}

// ─── IFRS 9 Staging ────────────────────────────────────────────────────

function determineIFRS9Stage(state: FacilityState): IFRS9Stage {
  // Stage 3 is sticky: once assigned, it persists until an explicit cure event
  if (state.ifrs9_stage === 3) {
    const hasCureEvent = state.events_this_period.some(
      e => e.type === 'IFRS9_CURE' || e.type === 'RESTRUCTURE_CURE'
    );
    if (!hasCureEvent) return 3;
  }

  // Stage 3: DPD > 90 or DEFAULT status
  if (state.days_past_due > 90 || state.credit_status === 'DEFAULT') {
    return 3;
  }
  // Stage 2: Significant increase in credit risk (PD > 2x origination)
  if (state.pd_annual > state.pd_at_origination * 2) {
    return 2;
  }
  // Stage 2: DPD > 30
  if (state.days_past_due > 30) {
    return 2;
  }
  // Stage 2: Credit status is WATCH or worse
  if (['WATCH', 'SPECIAL_MENTION', 'SUBSTANDARD', 'DOUBTFUL'].includes(state.credit_status)) {
    const statusCode = CREDIT_STATUS_CODE[state.credit_status];
    if (statusCode >= 4) return 2; // SPECIAL_MENTION or worse
  }
  // Stage 1: Performing
  return 1;
}

// ─── Lifecycle Transitions ─────────────────────────────────────────────

function applyLifecycleTransitions(state: FacilityState, date: string, rng: () => number): void {
  const remainingMonths = state.remaining_tenor_months;

  switch (state.lifecycle_stage) {
    case 'COMMITMENT':
      // Transition to FUNDED when first draw occurs
      if (state.drawn_amount > 0) {
        state.lifecycle_stage = 'FUNDED';
        state.events_this_period.push({
          type: 'LIFECYCLE_TRANSITION',
          date,
          description: `Facility ${state.facility_id} transitioned from COMMITMENT to FUNDED`,
          severity: 'LOW',
          triggered_by: 'first_draw',
          facility_ids: [state.facility_id],
          counterparty_id: state.counterparty_id,
        });
      }
      break;

    case 'FUNDED':
      // Term loans transition to AMORTIZING after first amortization payment
      if (PRODUCT_CONFIGS[state.product_type].amortizes && state.drawn_amount < state.original_committed) {
        state.lifecycle_stage = 'AMORTIZING';
      }
      // Check for maturity proximity
      if (remainingMonths <= 3 && remainingMonths > 0) {
        state.lifecycle_stage = 'MATURING';
        state.events_this_period.push({
          type: 'MATURITY_APPROACHING',
          date,
          description: `Facility ${state.facility_id} matures in ${remainingMonths} months`,
          severity: 'MEDIUM',
          triggered_by: 'maturity_proximity',
          facility_ids: [state.facility_id],
          counterparty_id: state.counterparty_id,
        });
      }
      break;

    case 'AMORTIZING':
      if (remainingMonths <= 3 && remainingMonths > 0) {
        state.lifecycle_stage = 'MATURING';
      }
      break;

    case 'MATURING':
      if (remainingMonths <= 0) {
        state.lifecycle_stage = 'MATURED';
      }
      break;

    case 'MATURED':
      // Already handled by lifecycle-engine (refinance or default)
      break;

    case 'RESTRUCTURED':
    case 'DEFAULT':
    case 'WORKOUT':
    case 'WRITTEN_OFF':
      // Terminal or near-terminal states — no automatic transitions
      break;
  }

  // Default trigger: covenant breach without waiver, severe DPD
  if (state.lifecycle_stage !== 'DEFAULT' && state.lifecycle_stage !== 'WORKOUT' &&
      state.lifecycle_stage !== 'WRITTEN_OFF') {
    if (state.days_past_due > 90 || state.credit_status === 'DEFAULT') {
      state.lifecycle_stage = 'DEFAULT';
      state.events_this_period.push({
        type: 'FACILITY_DEFAULT',
        date,
        description: `Facility ${state.facility_id} entered DEFAULT (DPD=${state.days_past_due}, status=${state.credit_status})`,
        severity: 'CRITICAL',
        triggered_by: 'dpd_or_status',
        facility_ids: [state.facility_id],
        counterparty_id: state.counterparty_id,
      });
    }
  }
}

// ─── Threshold-Based Events ────────────────────────────────────────────

function generateThresholdEvents(state: FacilityState, date: string): void {
  const events = state.events_this_period;
  const util = state.committed_amount > 0 ? state.drawn_amount / state.committed_amount : 0;

  // High utilization
  if (util > 0.90) {
    events.push({
      type: 'HIGH_UTILIZATION',
      date,
      description: `Facility ${state.facility_id} utilization at ${(util * 100).toFixed(1)}%`,
      severity: 'MEDIUM',
      triggered_by: 'utilization_threshold',
      facility_ids: [state.facility_id],
      counterparty_id: state.counterparty_id,
    });
  }

  // Collateral shortfall
  if (state.ltv_ratio > 0.85 && state.collateral_type !== 'NONE') {
    events.push({
      type: 'COLLATERAL_SHORTFALL',
      date,
      description: `LTV ratio ${(state.ltv_ratio * 100).toFixed(1)}% exceeds 85% threshold`,
      severity: 'HIGH',
      triggered_by: 'ltv_threshold',
      facility_ids: [state.facility_id],
      counterparty_id: state.counterparty_id,
    });
  }

  // Maturity concentration
  if (state.remaining_tenor_months > 0 && state.remaining_tenor_months <= 6) {
    events.push({
      type: 'MATURITY_CONCENTRATION',
      date,
      description: `Facility ${state.facility_id} matures in ${state.remaining_tenor_months} months`,
      severity: state.remaining_tenor_months <= 3 ? 'HIGH' : 'MEDIUM',
      triggered_by: 'maturity_wall',
      facility_ids: [state.facility_id],
      counterparty_id: state.counterparty_id,
    });
  }

  // Payment default
  if (state.days_past_due > 30 && state.days_past_due <= 90) {
    events.push({
      type: 'PAYMENT_DELAY',
      date,
      description: `Facility ${state.facility_id}: ${state.days_past_due} days past due`,
      severity: 'HIGH',
      triggered_by: 'dpd_threshold',
      facility_ids: [state.facility_id],
      counterparty_id: state.counterparty_id,
    });
  }
}

// ─── State Manager ─────────────────────────────────────────────────────

/**
 * FacilityStateManager: orchestrates initialization and evolution of all facilities.
 */
export class FacilityStateManager {
  private stateMap: FacilityStateMap = new Map();
  private counterpartyFinancials: Map<string, CounterpartyFinancials> = new Map();
  private facilityStates: Map<number, FacilityState> = new Map(); // Current state per facility

  /**
   * Initialize all facility states from L1 chain data.
   */
  initialize(
    chain: L1Chain,
    storyArcMap: Map<number, StoryArc>,
    ratingTierMap: Map<number, RatingTier>,
    sizeProfileMap: Map<number, SizeProfile>,
    initialDate: string,
  ): void {
    for (const facility of chain.facilities) {
      const counterparty = chain.counterparties.find(
        c => c.counterparty_id === facility.counterparty_id,
      );
      if (!counterparty) continue;

      const arc = storyArcMap.get(facility.counterparty_id) ?? 'STABLE_IG';
      const tier = ratingTierMap.get(facility.counterparty_id) ?? 'IG_MID';
      const size = sizeProfileMap.get(facility.counterparty_id) ?? 'MID';

      const state = initializeFacilityState(
        facility, counterparty, arc, tier, size, initialDate,
      );

      this.facilityStates.set(facility.facility_id, state);
      this.stateMap.set(stateKey(facility.facility_id, initialDate), state);
    }
  }

  /**
   * Evolve all facilities forward to the next date.
   */
  step(
    date: string,
    dateIdx: number,
    dates: string[],
    market: MarketEnvironment,
    frequency: TimeFrequency,
  ): void {
    // Group facilities by counterparty for financial computation
    const counterpartyFacilities = new Map<number, FacilityState[]>();
    for (const [, state] of Array.from(this.facilityStates)) {
      const cpId = state.counterparty_id;
      if (!counterpartyFacilities.has(cpId)) {
        counterpartyFacilities.set(cpId, []);
      }
      counterpartyFacilities.get(cpId)!.push(state);
    }

    // Compute counterparty-level financials first (needed for covenant testing)
    for (const [cpId, facilities] of Array.from(counterpartyFacilities)) {
      const rng = seededRng(`cp-fin-${cpId}-${date}`);
      const firstFac = facilities[0];
      const fin = generateCounterpartyFinancials(
        rng, cpId, facilities,
        firstFac.rating_tier, firstFac.story_arc,
        dateIdx, dates.length,
      );
      this.counterpartyFinancials.set(`${cpId}|${date}`, fin);
    }

    // Evolve each facility
    for (const [facilityId, prevState] of Array.from(this.facilityStates)) {
      const rng = seededRng(`evolve-${facilityId}-${date}`);
      const fin = this.counterpartyFinancials.get(`${prevState.counterparty_id}|${date}`)!;

      const newState = evolveFacilityState(
        rng, prevState, date, dates, dateIdx, market, fin, frequency,
      );

      this.facilityStates.set(facilityId, newState);
      this.stateMap.set(stateKey(facilityId, date), newState);
    }

    // Cross-default detection
    for (const [cpId, facilities] of Array.from(counterpartyFacilities)) {
      const currentFacilities = facilities.map(f => this.facilityStates.get(f.facility_id)!);
      for (const fac of currentFacilities) {
        if (fac.covenants.some(c => c.is_breached && !c.waiver_active)) {
          const crossEvents = checkCrossDefault(
            fac.facility_id,
            currentFacilities,
            fac.covenant_package?.cross_default_threshold ?? 0.50,
            date,
          );
          for (const evt of crossEvents) {
            // Add cross-default events to affected facilities
            for (const affectedId of evt.facility_ids) {
              const affectedState = this.facilityStates.get(affectedId);
              if (affectedState) {
                affectedState.events_this_period.push(evt);
              }
            }
          }
        }
      }
    }
  }

  /** Get the full state map (all facilities × all dates). */
  getStateMap(): FacilityStateMap {
    return this.stateMap;
  }

  /** Get current state for a facility. */
  getCurrentState(facilityId: number): FacilityState | undefined {
    return this.facilityStates.get(facilityId);
  }

  /** Get all current facility states. */
  getAllCurrentStates(): FacilityState[] {
    return Array.from(this.facilityStates.values());
  }

  /** Get counterparty financials for a date. */
  getFinancials(counterpartyId: number, date: string): CounterpartyFinancials | undefined {
    return this.counterpartyFinancials.get(`${counterpartyId}|${date}`);
  }

  /** Get all counterparty financials. */
  getAllFinancials(): Map<string, CounterpartyFinancials> {
    return this.counterpartyFinancials;
  }
}
