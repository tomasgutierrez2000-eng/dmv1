import { describe, it, expect } from 'vitest';
import { applyCollateralRevaluation } from '../v2/stages/collateral';
import { applyIFRS9Staging } from '../v2/stages/ifrs9';
import { applyDerivedMetrics } from '../v2/stages/derived-metrics';
import { applyLifecycle } from '../v2/stages/lifecycle';
import { mulberry32 } from '../v2/prng';
import type { StageContext } from '../v2/stage-types';
import type { CounterpartyFinancials } from '../v2/types';

const DATES = ['2025-01-31', '2025-02-28', '2025-03-31', '2025-04-30', '2025-05-30'];

function makeCtx(dateIdx = 0, seed = 42): StageContext {
  return {
    date: DATES[dateIdx],
    dates: DATES,
    dateIdx,
    dt: 7 / 365,
    rng: mulberry32(seed),
  };
}

function makeFinancials(overrides: Partial<CounterpartyFinancials> = {}): CounterpartyFinancials {
  return {
    counterparty_id: '1',
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

describe('Stage 3: Collateral Revaluation', () => {
  it('returns same value for CASH collateral (no volatility)', () => {
    const result = applyCollateralRevaluation(
      { collateral_value: 1_000_000, collateral_type: 'CASH', drawn_amount: 500_000 },
      makeCtx(),
    );
    expect(result.collateral_value).toBe(1_000_000);
  });

  it('computes LTV ratio correctly', () => {
    const result = applyCollateralRevaluation(
      { collateral_value: 2_000_000, collateral_type: 'CASH', drawn_amount: 1_000_000 },
      makeCtx(),
    );
    expect(result.ltv_ratio).toBeCloseTo(0.5, 4);
  });

  it('returns ltv_ratio = 999.0 when collateral is 0 and drawn > 0', () => {
    const result = applyCollateralRevaluation(
      { collateral_value: 0, collateral_type: 'NONE', drawn_amount: 1_000_000 },
      makeCtx(),
    );
    expect(result.ltv_ratio).toBe(999.0);
  });

  it('evolves RE collateral over time', () => {
    let value = 5_000_000;
    let changed = false;
    for (let i = 0; i < 20; i++) {
      const result = applyCollateralRevaluation(
        { collateral_value: value, collateral_type: 'RE', drawn_amount: 3_000_000 },
        makeCtx(0, i),
      );
      if (result.collateral_value !== value) changed = true;
    }
    expect(changed).toBe(true);
  });
});

describe('Stage 8: IFRS9 Staging', () => {
  it('Stage 3 when DPD > 90', () => {
    const result = applyIFRS9Staging({
      ifrs9_stage: 1,
      days_past_due: 91,
      credit_status: 'PERFORMING',
      pd_annual: 0.005,
      pd_at_origination: 0.005,
      events_this_period: [],
    });
    expect(result.ifrs9_stage).toBe(3);
  });

  it('Stage 3 when credit_status is DEFAULT', () => {
    const result = applyIFRS9Staging({
      ifrs9_stage: 1,
      days_past_due: 0,
      credit_status: 'DEFAULT',
      pd_annual: 0.005,
      pd_at_origination: 0.005,
      events_this_period: [],
    });
    expect(result.ifrs9_stage).toBe(3);
  });

  it('Stage 2 when PD > 2x origination PD', () => {
    const result = applyIFRS9Staging({
      ifrs9_stage: 1,
      days_past_due: 0,
      credit_status: 'PERFORMING',
      pd_annual: 0.015,
      pd_at_origination: 0.005,
      events_this_period: [],
    });
    expect(result.ifrs9_stage).toBe(2);
  });

  it('Stage 2 when DPD > 30', () => {
    const result = applyIFRS9Staging({
      ifrs9_stage: 1,
      days_past_due: 45,
      credit_status: 'PERFORMING',
      pd_annual: 0.005,
      pd_at_origination: 0.005,
      events_this_period: [],
    });
    expect(result.ifrs9_stage).toBe(2);
  });

  it('Stage 1 when all metrics are healthy', () => {
    const result = applyIFRS9Staging({
      ifrs9_stage: 1,
      days_past_due: 0,
      credit_status: 'PERFORMING',
      pd_annual: 0.005,
      pd_at_origination: 0.005,
      events_this_period: [],
    });
    expect(result.ifrs9_stage).toBe(1);
  });

  it('Stage 3 is sticky without cure event', () => {
    const result = applyIFRS9Staging({
      ifrs9_stage: 3,
      days_past_due: 0,
      credit_status: 'PERFORMING',
      pd_annual: 0.001,
      pd_at_origination: 0.005,
      events_this_period: [],
    });
    expect(result.ifrs9_stage).toBe(3);
  });

  it('Stage 3 can be cured with IFRS9_CURE event', () => {
    const result = applyIFRS9Staging({
      ifrs9_stage: 3,
      days_past_due: 0,
      credit_status: 'PERFORMING',
      pd_annual: 0.001,
      pd_at_origination: 0.005,
      events_this_period: [{
        type: 'IFRS9_CURE',
        date: '2025-01-31',
        description: 'Cure',
        severity: 'LOW',
        triggered_by: 'manual',
        facility_ids: ['1'],
        counterparty_id: '1',
      }],
    });
    expect(result.ifrs9_stage).toBe(1);
  });
});

describe('Stage 9: Derived Metrics', () => {
  it('computes EAD, RWA, and EL correctly', () => {
    const result = applyDerivedMetrics(
      {
        product_type: 'REVOLVING_CREDIT',
        drawn_amount: 600_000,
        undrawn_amount: 400_000,
        risk_weight_pct: 75,
        pd_annual: 0.01,
        lgd_current: 0.45,
        ifrs9_stage: 1,
        remaining_tenor_months: 36,
        maturity_date: '2028-01-01',
      },
      makeFinancials(),
      makeCtx(),
    );

    // EAD = 600K + 0.4 * 400K = 760K
    expect(result.ead).toBe(760_000);
    // RWA = 760K * 75/100 = 570K
    expect(result.rwa).toBe(570_000);
    // EL = 0.01 * 0.45 * 760K = 3420
    expect(result.expected_loss).toBe(3_420);
    // ccf for revolver = 0.4
    expect(result.ccf).toBe(0.4);
  });

  it('computes financial ratios', () => {
    const financials = makeFinancials({
      ebitda: 30_000_000,
      interest_expense: 5_000_000,
      total_debt: 100_000_000,
    });
    const result = applyDerivedMetrics(
      {
        product_type: 'TERM_LOAN',
        drawn_amount: 1_000_000,
        undrawn_amount: 0,
        risk_weight_pct: 100,
        pd_annual: 0.02,
        lgd_current: 0.45,
        ifrs9_stage: 1,
        remaining_tenor_months: 24,
        maturity_date: '2027-01-01',
      },
      financials,
      makeCtx(),
    );

    // DSCR = EBITDA / (interest + 2% of debt) = 30M / (5M + 2M) = 4.2857
    expect(result.dscr).toBeCloseTo(4.2857, 2);
    // ICR = EBITDA / interest = 30M / 5M = 6
    expect(result.icr).toBe(6);
    // Leverage = debt / EBITDA = 100M / 30M = 3.3333
    expect(result.leverage_ratio).toBeCloseTo(3.3333, 2);
  });

  it('computes ECL for stage 1 (12m = lifetime)', () => {
    const result = applyDerivedMetrics(
      {
        product_type: 'TERM_LOAN',
        drawn_amount: 1_000_000,
        undrawn_amount: 0,
        risk_weight_pct: 100,
        pd_annual: 0.02,
        lgd_current: 0.45,
        ifrs9_stage: 1,
        remaining_tenor_months: 36,
        maturity_date: '2028-01-01',
      },
      makeFinancials(),
      makeCtx(),
    );
    expect(result.ecl_12m).toBe(result.ecl_lifetime);
  });
});

describe('Stage 10: Lifecycle Transitions', () => {
  it('COMMITMENT -> FUNDED when drawn > 0', () => {
    const result = applyLifecycle(
      {
        lifecycle_stage: 'COMMITMENT',
        remaining_tenor_months: 60,
        drawn_amount: 100_000,
        product_type: 'REVOLVING_CREDIT',
        original_committed: 1_000_000,
        days_past_due: 0,
        credit_status: 'PERFORMING',
        committed_amount: 1_000_000,
        facility_id: '1',
        counterparty_id: '1',
        covenants: [],
        covenant_package: null,
        collateral_type: 'NONE',
        ltv_ratio: 0,
        events_this_period: [],
      },
      makeCtx(),
    );
    expect(result.lifecycle_stage).toBe('FUNDED');
    expect(result.events.some(e => e.type === 'LIFECYCLE_TRANSITION')).toBe(true);
  });

  it('stays in COMMITMENT when drawn = 0', () => {
    const result = applyLifecycle(
      {
        lifecycle_stage: 'COMMITMENT',
        remaining_tenor_months: 60,
        drawn_amount: 0,
        product_type: 'REVOLVING_CREDIT',
        original_committed: 1_000_000,
        days_past_due: 0,
        credit_status: 'PERFORMING',
        committed_amount: 1_000_000,
        facility_id: '1',
        counterparty_id: '1',
        covenants: [],
        covenant_package: null,
        collateral_type: 'NONE',
        ltv_ratio: 0,
        events_this_period: [],
      },
      makeCtx(),
    );
    expect(result.lifecycle_stage).toBe('COMMITMENT');
  });

  it('FUNDED -> MATURING when remaining_tenor <= 3', () => {
    const result = applyLifecycle(
      {
        lifecycle_stage: 'FUNDED',
        remaining_tenor_months: 2,
        drawn_amount: 1_000_000,
        product_type: 'REVOLVING_CREDIT',
        original_committed: 1_000_000,
        days_past_due: 0,
        credit_status: 'PERFORMING',
        committed_amount: 1_000_000,
        facility_id: '1',
        counterparty_id: '1',
        covenants: [],
        covenant_package: null,
        collateral_type: 'NONE',
        ltv_ratio: 0,
        events_this_period: [],
      },
      makeCtx(),
    );
    expect(result.lifecycle_stage).toBe('MATURING');
  });

  it('triggers DEFAULT when DPD > 90', () => {
    const result = applyLifecycle(
      {
        lifecycle_stage: 'FUNDED',
        remaining_tenor_months: 24,
        drawn_amount: 1_000_000,
        product_type: 'REVOLVING_CREDIT',
        original_committed: 1_000_000,
        days_past_due: 91,
        credit_status: 'PERFORMING',
        committed_amount: 1_000_000,
        facility_id: '1',
        counterparty_id: '1',
        covenants: [],
        covenant_package: null,
        collateral_type: 'NONE',
        ltv_ratio: 0,
        events_this_period: [],
      },
      makeCtx(),
    );
    expect(result.lifecycle_stage).toBe('DEFAULT');
    expect(result.events.some(e => e.type === 'FACILITY_DEFAULT')).toBe(true);
  });

  it('emits HIGH_UTILIZATION event when util > 90%', () => {
    const result = applyLifecycle(
      {
        lifecycle_stage: 'FUNDED',
        remaining_tenor_months: 24,
        drawn_amount: 950_000,
        product_type: 'REVOLVING_CREDIT',
        original_committed: 1_000_000,
        days_past_due: 0,
        credit_status: 'PERFORMING',
        committed_amount: 1_000_000,
        facility_id: '1',
        counterparty_id: '1',
        covenants: [],
        covenant_package: null,
        collateral_type: 'NONE',
        ltv_ratio: 0,
        events_this_period: [],
      },
      makeCtx(),
    );
    expect(result.events.some(e => e.type === 'HIGH_UTILIZATION')).toBe(true);
  });

  it('emits COLLATERAL_SHORTFALL when LTV > 85%', () => {
    const result = applyLifecycle(
      {
        lifecycle_stage: 'FUNDED',
        remaining_tenor_months: 24,
        drawn_amount: 500_000,
        product_type: 'REVOLVING_CREDIT',
        original_committed: 1_000_000,
        days_past_due: 0,
        credit_status: 'PERFORMING',
        committed_amount: 1_000_000,
        facility_id: '1',
        counterparty_id: '1',
        covenants: [],
        covenant_package: null,
        collateral_type: 'RE',
        ltv_ratio: 0.90,
        events_this_period: [],
      },
      makeCtx(),
    );
    expect(result.events.some(e => e.type === 'COLLATERAL_SHORTFALL')).toBe(true);
  });

  it('emits MATURITY_CONCENTRATION when 0 < remaining <= 6 months', () => {
    const result = applyLifecycle(
      {
        lifecycle_stage: 'MATURING',
        remaining_tenor_months: 4,
        drawn_amount: 500_000,
        product_type: 'REVOLVING_CREDIT',
        original_committed: 1_000_000,
        days_past_due: 0,
        credit_status: 'PERFORMING',
        committed_amount: 1_000_000,
        facility_id: '1',
        counterparty_id: '1',
        covenants: [],
        covenant_package: null,
        collateral_type: 'NONE',
        ltv_ratio: 0,
        events_this_period: [],
      },
      makeCtx(),
    );
    expect(result.events.some(e => e.type === 'MATURITY_CONCENTRATION')).toBe(true);
  });
});
