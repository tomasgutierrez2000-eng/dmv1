/**
 * Tests for inter-stage invariant checker.
 */

import { checkInvariants, reportInvariants } from '../v2/invariants';
import type { FacilityState } from '../v2/types';

// Minimal valid facility state for testing
function makeValidState(overrides: Partial<FacilityState> = {}): FacilityState {
  return {
    facility_id: 1,
    counterparty_id: 1,
    credit_agreement_id: 1,
    product_type: 'REVOLVING_CREDIT',
    currency_code: 'USD',
    facility_type_code: 'REVOLVING_CREDIT',
    story_arc: 'STABLE',
    rating_tier: 'IG_HIGH',
    size_profile: 'LARGE',
    industry_id: 1,
    country_code: 'US',
    committed_amount: 1000000,
    drawn_amount: 500000,
    undrawn_amount: 500000,
    original_committed: 1000000,
    pd_annual: 0.02,
    pd_at_origination: 0.02,
    lgd_current: 0.45,
    internal_rating: 'A',
    external_rating_sp: 'A',
    external_rating_moodys: 'A2',
    credit_status: 'PERFORMING',
    days_past_due: 0,
    ifrs9_stage: 1,
    spread_bps: 150,
    base_rate_pct: 0.053,
    all_in_rate_pct: 0.068,
    fee_rate_pct: 0.0025,
    cost_of_funds_pct: 0.048,
    risk_weight_pct: 0.75,
    collateral_type: 'REAL_ESTATE_COMMERCIAL',
    collateral_value: 600000,
    ltv_ratio: 0.83,
    lifecycle_stage: 'FUNDED',
    origination_date: '2024-01-01',
    maturity_date: '2027-01-01',
    remaining_tenor_months: 36,
    ead: 500000,
    ccf: 0.4,
    rwa: 375000,
    expected_loss: 4500,
    ecl_12m: 3000,
    ecl_lifetime: 9000,
    dscr: 1.5,
    icr: 3.0,
    leverage_ratio: 2.5,
    covenant_package: null,
    covenants: [],
    next_test_date: null,
    amort_schedule: null,
    last_draw_date: null,
    last_repay_date: null,
    last_rate_reset_date: null,
    prior_drawn_amount: 500000,
    events_this_period: [],
    ...overrides,
  } as FacilityState;
}

describe('checkInvariants', () => {
  test('valid state returns no violations', () => {
    const state = makeValidState();
    const violations = checkInvariants(state, 'test');
    expect(violations).toHaveLength(0);
  });

  test('negative drawn_amount is a violation', () => {
    const state = makeValidState({ drawn_amount: -100 });
    const violations = checkInvariants(state, 'draw-behavior');
    expect(violations.some(v => v.field === 'drawn_amount')).toBe(true);
  });

  test('drawn > committed is a violation', () => {
    const state = makeValidState({ drawn_amount: 1500000, committed_amount: 1000000 });
    const violations = checkInvariants(state, 'draw-behavior');
    expect(violations.some(v => v.field === 'drawn_amount')).toBe(true);
  });

  test('PD > 1 is a violation', () => {
    const state = makeValidState({ pd_annual: 1.5 });
    const violations = checkInvariants(state, 'pd-update');
    expect(violations.some(v => v.field === 'pd_annual')).toBe(true);
  });

  test('negative PD is a violation', () => {
    const state = makeValidState({ pd_annual: -0.01 });
    const violations = checkInvariants(state, 'pd-update');
    expect(violations.some(v => v.field === 'pd_annual')).toBe(true);
  });

  test('invalid IFRS9 stage is a violation', () => {
    const state = makeValidState({ ifrs9_stage: 4 as any });
    const violations = checkInvariants(state, 'ifrs9');
    expect(violations.some(v => v.field === 'ifrs9_stage')).toBe(true);
  });

  test('negative spread is a violation', () => {
    const state = makeValidState({ spread_bps: -50 });
    const violations = checkInvariants(state, 'spread-update');
    expect(violations.some(v => v.field === 'spread_bps')).toBe(true);
  });

  test('unrealistic spread >5000bps is a violation', () => {
    const state = makeValidState({ spread_bps: 6000 });
    const violations = checkInvariants(state, 'spread-update');
    expect(violations.some(v => v.field === 'spread_bps')).toBe(true);
  });

  test('negative collateral value is a violation', () => {
    const state = makeValidState({ collateral_value: -1000 });
    const violations = checkInvariants(state, 'collateral');
    expect(violations.some(v => v.field === 'collateral_value')).toBe(true);
  });

  test('LGD > 1 is a violation', () => {
    const state = makeValidState({ lgd_current: 1.2 });
    const violations = checkInvariants(state, 'init');
    expect(violations.some(v => v.field === 'lgd_current')).toBe(true);
  });

  test('small floating point tolerance on drawn vs committed', () => {
    // drawn is 0.05% over committed — within 0.1% tolerance
    const state = makeValidState({ drawn_amount: 1000500, committed_amount: 1000000 });
    const violations = checkInvariants(state, 'draw-behavior');
    // Should still flag because 500 > 1001 (0.1% of 1M)
    expect(violations.some(v => v.field === 'drawn_amount')).toBe(false);
  });
});

describe('reportInvariants', () => {
  test('returns true for empty violations', () => {
    expect(reportInvariants([])).toBe(true);
  });

  test('returns false for non-empty violations', () => {
    const violations = checkInvariants(
      makeValidState({ pd_annual: -1 }),
      'test',
    );
    // Suppress console output during test
    const warn = console.warn;
    console.warn = () => {};
    expect(reportInvariants(violations)).toBe(false);
    console.warn = warn;
  });
});
