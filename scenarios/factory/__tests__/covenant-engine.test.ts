import { describe, it, expect } from 'vitest';
import {
  testCovenants, checkCrossDefault, nextTestDate, isTestDate,
  getDefaultCovenantPackage, initializeCovenantStates,
  computeCovenantMetric,
} from '../v2/covenant-engine';
import { mulberry32 } from '../v2/prng';
import type { FacilityState, CounterpartyFinancials, CovenantPackage } from '../v2/types';

function makeRng(seed = 42) { return mulberry32(seed); }

function makeFinancials(overrides: Partial<CounterpartyFinancials> = {}): CounterpartyFinancials {
  return {
    counterparty_id: 1,
    total_revenue: 100_000_000,
    ebitda: 30_000_000,
    net_income: 15_000_000,
    total_assets: 500_000_000,
    total_liabilities: 300_000_000,
    equity: 200_000_000,
    total_debt: 100_000_000,
    interest_expense: 5_000_000,
    current_assets: 80_000_000,
    current_liabilities: 40_000_000,
    tangible_net_worth: 150_000_000,
    capex: 10_000_000,
    fixed_charges: 15_000_000,
    ...overrides,
  };
}

function makeState(overrides: Partial<FacilityState> = {}): FacilityState {
  return {
    facility_id: 1,
    counterparty_id: 1,
    credit_agreement_id: 1,
    product_type: 'REVOLVING_CREDIT',
    currency_code: 'USD',
    facility_type_code: 'RC',
    story_arc: 'STABLE',
    rating_tier: 'IG_MID',
    size_profile: 'MID',
    industry_id: 1,
    country_code: 'US',
    committed_amount: 10_000_000,
    drawn_amount: 5_000_000,
    undrawn_amount: 5_000_000,
    original_committed: 10_000_000,
    pd_annual: 0.005,
    pd_at_origination: 0.005,
    lgd_current: 0.45,
    internal_rating: 'BBB',
    external_rating_sp: 'BBB',
    external_rating_moodys: 'Baa2',
    credit_status: 'PERFORMING',
    days_past_due: 0,
    ifrs9_stage: 1,
    spread_bps: 125,
    base_rate_pct: 0.05,
    all_in_rate_pct: 0.0625,
    fee_rate_pct: 0.0020,
    cost_of_funds_pct: 0.04,
    collateral_value: 8_000_000,
    collateral_type: 'RE',
    ltv_ratio: 0.625,
    covenant_package: getDefaultCovenantPackage('IG_MID'),
    covenants: initializeCovenantStates(getDefaultCovenantPackage('IG_MID')),
    next_test_date: null,
    lifecycle_stage: 'FUNDED',
    origination_date: '2023-01-01',
    maturity_date: '2028-01-01',
    remaining_tenor_months: 36,
    amortization_schedule: null,
    next_payment_date: null,
    is_revolving: true,
    ead: 7_000_000,
    ccf: 0.4,
    rwa: 5_250_000,
    risk_weight_pct: 75,
    expected_loss: 15_750,
    ecl_12m: 15_750,
    ecl_lifetime: 15_750,
    dscr: 2.5,
    icr: 6.0,
    leverage_ratio: 3.33,
    last_draw_date: null,
    last_repay_date: null,
    last_rate_reset_date: null,
    prior_drawn_amount: 5_000_000,
    events_this_period: [],
    ...overrides,
  } as FacilityState;
}

describe('testCovenants', () => {
  it('returns no breach when financial ratios are healthy', () => {
    const state = makeState();
    const financials = makeFinancials();
    // Use a date that is a quarter-end test date
    const result = testCovenants(makeRng(), state, financials, '2025-06-30');
    expect(result.hasBreach).toBe(false);
  });

  it('detects breach when leverage exceeds threshold', () => {
    const state = makeState();
    // Push leverage way up: total_debt = 500M vs ebitda = 30M -> leverage = 16.7
    const financials = makeFinancials({ total_debt: 500_000_000, ebitda: 30_000_000 });
    const result = testCovenants(makeRng(), state, financials, '2025-06-30');
    expect(result.hasBreach).toBe(true);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.some(e => e.type === 'COVENANT_BREACH')).toBe(true);
  });

  it('returns empty result when no covenant package', () => {
    const state = makeState({ covenant_package: null });
    const financials = makeFinancials();
    const result = testCovenants(makeRng(), state, financials, '2025-06-30');
    expect(result.hasBreach).toBe(false);
    expect(result.updatedStates).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it('does not test covenants on non-test dates', () => {
    const state = makeState();
    const financials = makeFinancials({ total_debt: 500_000_000 });
    // Mid-month date for semi-annual frequency
    const result = testCovenants(makeRng(), state, financials, '2025-05-15', '2025-05-08');
    expect(result.events).toEqual([]);
  });
});

describe('computeCovenantMetric', () => {
  it('DSCR = EBITDA / (interest + 2% of debt)', () => {
    const state = makeState();
    const financials = makeFinancials({
      ebitda: 30_000_000,
      interest_expense: 5_000_000,
      total_debt: 100_000_000,
    });
    // debtService = 5M + 100M * 0.02 = 7M
    // DSCR = 30M / 7M = 4.286
    const v = computeCovenantMetric('MIN_DSCR', state, financials);
    expect(v).toBeCloseTo(4.286, 2);
  });

  it('MAX_LTV = drawn / collateral_value', () => {
    const state = makeState({ drawn_amount: 6_000_000, collateral_value: 10_000_000 });
    const v = computeCovenantMetric('MAX_LTV', state, makeFinancials());
    expect(v).toBeCloseTo(0.6, 4);
  });

  it('MAX_LTV returns 1.0 when no collateral', () => {
    const state = makeState({ drawn_amount: 1_000_000, collateral_value: 0 });
    const v = computeCovenantMetric('MAX_LTV', state, makeFinancials());
    expect(v).toBe(1.0);
  });

  it('MAX_LEVERAGE = total_debt / ebitda', () => {
    const financials = makeFinancials({ total_debt: 120_000_000, ebitda: 30_000_000 });
    const v = computeCovenantMetric('MAX_LEVERAGE', makeState(), financials);
    expect(v).toBe(4);
  });
});

describe('headroom with threshold=0 (division by zero fix)', () => {
  it('does not throw when threshold is 0', () => {
    const pkg: CovenantPackage = {
      covenants: [{
        type: 'MAX_LEVERAGE',
        threshold: 0,
        direction: 'MAX',
        warning_buffer_pct: 0.10,
      }],
      test_frequency: 'QUARTERLY',
      cure_period_days: 30,
      cross_default_threshold: 0.30,
    };
    const state = makeState({ covenant_package: pkg, covenants: initializeCovenantStates(pkg) });
    const financials = makeFinancials();
    // Should not throw
    const result = testCovenants(makeRng(), state, financials, '2025-06-30');
    expect(result).toBeDefined();
  });
});

describe('checkCrossDefault', () => {
  it('triggers cross-default when breach facility is significant portion of agreement', () => {
    const facilities: FacilityState[] = [
      makeState({
        facility_id: 1, credit_agreement_id: 100,
        drawn_amount: 8_000_000,
        covenants: [{ covenant_type: 'MAX_LEVERAGE', threshold_value: 4.5,
          current_value: 5.0, headroom_pct: -0.11, is_breached: true,
          is_warning: false, waiver_active: false, last_test_date: '2025-06-30' }],
      }),
      makeState({
        facility_id: 2, credit_agreement_id: 100,
        drawn_amount: 2_000_000,
      }),
    ];
    const events = checkCrossDefault(1, facilities, 0.50, '2025-06-30');
    expect(events.some(e => e.type === 'CROSS_DEFAULT')).toBe(true);
  });

  it('does not trigger when breached facility is small', () => {
    const facilities: FacilityState[] = [
      makeState({
        facility_id: 1, credit_agreement_id: 100,
        drawn_amount: 1_000_000,
        covenants: [{ covenant_type: 'MAX_LEVERAGE', threshold_value: 4.5,
          current_value: 5.0, headroom_pct: -0.11, is_breached: true,
          is_warning: false, waiver_active: false, last_test_date: '2025-06-30' }],
      }),
      makeState({
        facility_id: 2, credit_agreement_id: 100,
        drawn_amount: 9_000_000,
      }),
    ];
    const events = checkCrossDefault(1, facilities, 0.50, '2025-06-30');
    expect(events.filter(e => e.type === 'CROSS_DEFAULT')).toHaveLength(0);
  });

  it('returns empty when facility not found', () => {
    const events = checkCrossDefault(999, [], 0.50, '2025-06-30');
    expect(events).toEqual([]);
  });
});

describe('nextTestDate', () => {
  it('returns correct next quarter-end for quarterly', () => {
    const date = nextTestDate('2025-01-15', 'QUARTERLY');
    expect(date).toBe('2025-03-31');
  });

  it('returns correct next semi-annual date', () => {
    const date = nextTestDate('2025-04-01', 'SEMI_ANNUAL');
    expect(date).toBe('2025-06-30');
  });

  it('returns December for annual from any date', () => {
    const date = nextTestDate('2025-01-01', 'ANNUAL');
    expect(date).toBe('2025-12-31');
  });

  it('rolls to next year when past December', () => {
    const date = nextTestDate('2025-12-31', 'ANNUAL');
    expect(date).toBe('2026-12-31');
  });
});

describe('isTestDate', () => {
  it('returns true for quarter-end dates', () => {
    expect(isTestDate('2025-03-31', 'QUARTERLY')).toBe(true);
    expect(isTestDate('2025-06-30', 'QUARTERLY')).toBe(true);
    expect(isTestDate('2025-09-30', 'QUARTERLY')).toBe(true);
    expect(isTestDate('2025-12-31', 'QUARTERLY')).toBe(true);
  });

  it('returns false for mid-month dates', () => {
    expect(isTestDate('2025-03-15', 'QUARTERLY')).toBe(false);
  });

  it('returns true with proximity check when boundary was crossed', () => {
    // Gap from Feb to April crosses the March quarter-end — should trigger QUARTERLY test
    expect(isTestDate('2025-04-04', 'QUARTERLY', '2025-02-28')).toBe(true);
  });

  it('semi-annual only fires on June and December', () => {
    expect(isTestDate('2025-06-30', 'SEMI_ANNUAL')).toBe(true);
    expect(isTestDate('2025-12-31', 'SEMI_ANNUAL')).toBe(true);
    expect(isTestDate('2025-03-31', 'SEMI_ANNUAL')).toBe(false);
  });

  it('annual only fires on December', () => {
    expect(isTestDate('2025-12-31', 'ANNUAL')).toBe(true);
    expect(isTestDate('2025-06-30', 'ANNUAL')).toBe(false);
  });
});

describe('getDefaultCovenantPackage', () => {
  it('returns more covenants for lower-rated tiers', () => {
    const ig = getDefaultCovenantPackage('IG_HIGH');
    const hy = getDefaultCovenantPackage('HY_LOW');
    expect(hy.covenants.length).toBeGreaterThan(ig.covenants.length);
  });

  it('returns a deep clone (modifying one does not affect another)', () => {
    const pkg1 = getDefaultCovenantPackage('IG_MID');
    const pkg2 = getDefaultCovenantPackage('IG_MID');
    pkg1.covenants[0].threshold = 999;
    expect(pkg2.covenants[0].threshold).not.toBe(999);
  });
});

describe('initializeCovenantStates', () => {
  it('creates states with healthy initial headroom', () => {
    const pkg = getDefaultCovenantPackage('HY_MID');
    const states = initializeCovenantStates(pkg);
    expect(states.length).toBe(pkg.covenants.length);
    for (const s of states) {
      expect(s.is_breached).toBe(false);
      expect(s.headroom_pct).toBe(0.50);
    }
  });
});
