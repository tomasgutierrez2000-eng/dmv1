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
  STORY_CREDIT_STATUS,
  STORY_DPD,
  RATING_TIER_MAP,
} from '../../../scripts/shared/mvp-config';

import type {
  FacilityState, FacilityStateMap, ProductType, CreditStatus,
  IFRS9Stage, CounterpartyFinancials, FacilityEvent, TimeFrequency,
  CovenantPackage,
} from './types';
import { stateKey } from './types';

import { seededRng, round, clamp } from './prng';

import {
  sampleCommittedAmount, sampleLGD, sampleSpread,
  sampleRiskWeight, sampleCollateralValue,
  boundedNormal, FINANCIAL_PARAMS,
} from './distributions';

import { MarketEnvironment } from './market-environment';
import { frequencyToDt, monthsBetween } from './time-series';

import {
  calculateAllInRate, calculateEAD, calculateRWA,
  calculateExpectedLoss, calculateECL, calculateFeeRate,
  PRODUCT_CONFIGS, generateAmortizationSchedule,
} from './product-models';

import {
  getDefaultCovenantPackage, initializeCovenantStates,
  checkCrossDefault, nextTestDate,
} from './covenant-engine';

import type { StageContext } from './stage-types';
import {
  applyBaseRate,
  applyDrawBehaviorStage,
  applyCollateralRevaluation,
  applyPDUpdate,
  applySpreadUpdate,
  applyPricing,
  applyCovenantTest,
  applyIFRS9Staging,
  applyDerivedMetrics,
  applyLifecycle,
} from './stages';

import type { EnrichedFacility, EnrichedCounterparty } from '../gsib-enrichment';
import type { L1Chain } from '../chain-builder';
import { checkInvariants, type InvariantViolation } from './invariants';

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
  const rawUtil = STORY_UTILIZATION[storyArc]?.[0] ?? 0.50;
  // FUNDED revolvers must have a minimum initial draw (10% of committed)
  // to avoid the inconsistency of lifecycle=FUNDED with drawn_amount=0
  const minUtilForFunded = productConfig.bulletDraw ? 1.0 : 0.10;
  const initialUtil = Math.max(rawUtil, minUtilForFunded);
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
  const ltvRatio = collateralValue > 0 ? drawn / collateralValue : (drawn > 0 ? 999.0 : 0);

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
    facility_id: String(facility.facility_id),
    counterparty_id: String(counterparty.counterparty_id),
    credit_agreement_id: String(facility.credit_agreement_id),
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
  counterpartyId: string,
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
 *
 * Implemented as a typed 10-stage pipeline where each stage declares
 * exactly which fields it reads (input) and writes (output). The compiler
 * enforces that stages cannot silently depend on undeclared fields.
 *
 * See stage-types.ts for the contracts and stages/ for the implementations.
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

  const ctx: StageContext = {
    date,
    dates,
    dateIdx,
    dt: frequencyToDt(frequency),
    rng,
  };

  // ── Stage 1: Base Rate ──
  const s1 = applyBaseRate(state, market, ctx);
  state.base_rate_pct = s1.base_rate_pct;
  state.cost_of_funds_pct = s1.cost_of_funds_pct;

  // ── Stage 2: Draw Behavior ──
  const s2 = applyDrawBehaviorStage(state, ctx);
  if (s2.last_draw_date) state.last_draw_date = s2.last_draw_date;
  if (s2.last_repay_date) state.last_repay_date = s2.last_repay_date;
  state.drawn_amount = s2.drawn_amount;
  state.undrawn_amount = s2.undrawn_amount;
  state.prior_drawn_amount = s2.prior_drawn_amount;

  // ── Stage 3: Collateral Revaluation ──
  const s3 = applyCollateralRevaluation(state, ctx);
  state.collateral_value = s3.collateral_value;
  state.ltv_ratio = s3.ltv_ratio;

  // ── Stage 4: PD Update ──
  const s4 = applyPDUpdate(state, market, ctx);
  state.pd_annual = s4.pd_annual;

  // ── Stage 5: Spread Update ──
  const s5 = applySpreadUpdate(state, ctx);
  state.spread_bps = s5.spread_bps;

  // ── Stage 6: Pricing ──
  const s6 = applyPricing(state, market, ctx);
  state.all_in_rate_pct = s6.all_in_rate_pct;
  state.last_rate_reset_date = s6.last_rate_reset_date;

  // ── Stage 7: Credit Status, DPD & Covenant Testing ──
  const s7 = applyCovenantTest(state, financials, ctx);
  state.credit_status = s7.credit_status;
  state.days_past_due = s7.days_past_due;
  state.covenants = s7.covenants;
  state.next_test_date = s7.next_test_date;
  state.events_this_period.push(...s7.events);

  // ── Stage 8: IFRS 9 Staging ──
  const s8 = applyIFRS9Staging(state);
  state.ifrs9_stage = s8.ifrs9_stage;

  // ── Stage 9: Derived Metrics (EAD, RWA, ECL, tenor, ratios) ──
  const s9 = applyDerivedMetrics(state, financials, ctx);
  state.ead = s9.ead;
  state.ccf = s9.ccf;
  state.rwa = s9.rwa;
  state.expected_loss = s9.expected_loss;
  state.ecl_12m = s9.ecl_12m;
  state.ecl_lifetime = s9.ecl_lifetime;
  state.remaining_tenor_months = s9.remaining_tenor_months;
  state.dscr = s9.dscr;
  state.icr = s9.icr;
  state.leverage_ratio = s9.leverage_ratio;

  // ── Stage 10: Lifecycle Transitions + Threshold Events ──
  const s10 = applyLifecycle(state, ctx);
  state.lifecycle_stage = s10.lifecycle_stage;
  state.events_this_period.push(...s10.events);

  // ── Post-pipeline invariant check ──
  const violations = checkInvariants(state, `step@${date}`);
  if (violations.length > 0) {
    state._invariantViolations = violations;
  }

  return state;
}

// ─── State Manager ─────────────────────────────────────────────────────

/**
 * FacilityStateManager: orchestrates initialization and evolution of all facilities.
 */
export class FacilityStateManager {
  private stateMap: FacilityStateMap = new Map();
  private counterpartyFinancials: Map<string, CounterpartyFinancials> = new Map();
  private facilityStates: Map<string, FacilityState> = new Map(); // Current state per facility

  /**
   * Initialize all facility states from L1 chain data.
   */
  initialize(
    chain: L1Chain,
    storyArcMap: Map<string, StoryArc>,
    ratingTierMap: Map<string, RatingTier>,
    sizeProfileMap: Map<string, SizeProfile>,
    initialDate: string,
  ): void {
    for (const facility of chain.facilities) {
      const counterparty = chain.counterparties.find(
        c => String(c.counterparty_id) === String(facility.counterparty_id),
      );
      if (!counterparty) continue;

      const cpId = String(facility.counterparty_id);
      const arc = storyArcMap.get(cpId) ?? 'STABLE_IG';
      const tier = ratingTierMap.get(cpId) ?? 'IG_MID';
      const size = sizeProfileMap.get(cpId) ?? 'MID';

      const state = initializeFacilityState(
        facility, counterparty, arc, tier, size, initialDate,
      );

      this.facilityStates.set(String(facility.facility_id), state);
      this.stateMap.set(stateKey(facility.facility_id, initialDate), state);
    }

    // ── State initialization completeness audit ──
    const uninitializedFacs = chain.facilities.filter(
      f => !this.facilityStates.has(String(f.facility_id))
    );
    if (uninitializedFacs.length > 0) {
      console.warn(
        `[STATE_INIT] ${uninitializedFacs.length}/${chain.facilities.length} facilities were not initialized in state manager`
      );
      for (const f of uninitializedFacs.slice(0, 5)) {
        console.warn(`  - facility ${f.facility_id}: counterparty ${f.counterparty_id}`);
      }
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
    const counterpartyFacilities = new Map<string, FacilityState[]>();
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
  getCurrentState(facilityId: string): FacilityState | undefined {
    return this.facilityStates.get(facilityId);
  }

  /** Get all current facility states. */
  getAllCurrentStates(): FacilityState[] {
    return Array.from(this.facilityStates.values());
  }

  /** Get counterparty financials for a date. */
  getFinancials(counterpartyId: string, date: string): CounterpartyFinancials | undefined {
    return this.counterpartyFinancials.get(`${counterpartyId}|${date}`);
  }

  /** Get all counterparty financials. */
  getAllFinancials(): Map<string, CounterpartyFinancials> {
    return this.counterpartyFinancials;
  }
}
