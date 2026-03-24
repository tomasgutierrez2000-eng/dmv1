import { describe, it, expect } from 'vitest';
import {
  calculateEAD, calculateRWA, calculateExpectedLoss, calculateAllInRate,
  calculateECL, generateAmortizationSchedule, calculateFeeRate,
  utilizationSpreadAdder, PRODUCT_CONFIGS, selectFacilityPool,
  willRefinance,
} from '../v2/product-models';
import { mulberry32 } from '../v2/prng';
import type { ProductType } from '../v2/types';
import type { RatingTier } from '../../../scripts/shared/mvp-config';

describe('calculateEAD', () => {
  it('EAD = drawn + CCF * undrawn', () => {
    // REVOLVING_CREDIT has CCF = 0.40
    const ead = calculateEAD(600_000, 400_000, 'REVOLVING_CREDIT');
    expect(ead).toBe(760_000); // 600K + 0.4 * 400K
  });

  it('EAD for term loan equals drawn amount (CCF=1.0, undrawn=0)', () => {
    const ead = calculateEAD(1_000_000, 0, 'TERM_LOAN');
    expect(ead).toBe(1_000_000);
  });

  it('EAD for letter of credit with CCF=0.20', () => {
    const ead = calculateEAD(0, 500_000, 'LETTER_OF_CREDIT');
    expect(ead).toBe(100_000); // 0 + 0.20 * 500K
  });
});

describe('calculateRWA', () => {
  it('RWA = EAD * risk_weight / 100', () => {
    expect(calculateRWA(1_000_000, 75)).toBe(750_000);
  });

  it('handles zero EAD', () => {
    expect(calculateRWA(0, 100)).toBe(0);
  });

  it('handles zero risk weight', () => {
    expect(calculateRWA(1_000_000, 0)).toBe(0);
  });
});

describe('calculateExpectedLoss', () => {
  it('EL = PD * LGD * EAD', () => {
    // PD=1%, LGD=45%, EAD=1M -> EL=4,500
    const el = calculateExpectedLoss(0.01, 0.45, 1_000_000);
    expect(el).toBe(4_500);
  });

  it('returns 0 when PD is 0', () => {
    expect(calculateExpectedLoss(0, 0.45, 1_000_000)).toBe(0);
  });
});

describe('calculateAllInRate', () => {
  it('combines base rate + spread for term loan', () => {
    // Term loan: no utilization adder, no product adder
    const rate = calculateAllInRate(0.05, 200, 'TERM_LOAN', 1.0);
    // 5% + 200bps/10000 = 5% + 2% = 7%
    expect(rate).toBeCloseTo(0.07, 5);
  });

  it('adds product spread adder for Term Loan B (+75bps)', () => {
    const rate = calculateAllInRate(0.05, 200, 'TERM_LOAN_B', 1.0);
    // 5% + (200+75)/10000 = 5% + 2.75% = 7.75%
    expect(rate).toBeCloseTo(0.0775, 5);
  });

  it('adds utilization adder for revolving credit', () => {
    // High utilization (>90%) adds 60bps
    const rate = calculateAllInRate(0.05, 100, 'REVOLVING_CREDIT', 0.95);
    // 5% + (100+0+60)/10000 = 5% + 1.6% = 6.6%
    expect(rate).toBeCloseTo(0.066, 5);
  });

  it('no utilization adder for revolving credit below 50%', () => {
    const rate = calculateAllInRate(0.05, 100, 'REVOLVING_CREDIT', 0.30);
    // 5% + (100+0+0)/10000 = 5% + 1% = 6%
    expect(rate).toBeCloseTo(0.06, 5);
  });
});

describe('utilizationSpreadAdder', () => {
  it('returns 0 below 50%', () => {
    expect(utilizationSpreadAdder(0.30)).toBe(0);
    expect(utilizationSpreadAdder(0.49)).toBe(0);
  });

  it('returns 15 for 50-75%', () => {
    expect(utilizationSpreadAdder(0.50)).toBe(15);
    expect(utilizationSpreadAdder(0.74)).toBe(15);
  });

  it('returns 35 for 75-90%', () => {
    expect(utilizationSpreadAdder(0.75)).toBe(35);
    expect(utilizationSpreadAdder(0.89)).toBe(35);
  });

  it('returns 60 for >90%', () => {
    expect(utilizationSpreadAdder(0.90)).toBe(60);
    expect(utilizationSpreadAdder(0.99)).toBe(60);
  });
});

describe('calculateECL', () => {
  it('Stage 1: ecl_lifetime equals ecl_12m', () => {
    const result = calculateECL(0.02, 0.45, 1_000_000, 1, 36);
    expect(result.ecl_lifetime).toBe(result.ecl_12m);
  });

  it('Stage 2: ecl_lifetime > ecl_12m for multi-year tenor', () => {
    const result = calculateECL(0.02, 0.45, 1_000_000, 2, 60);
    expect(result.ecl_lifetime).toBeGreaterThan(result.ecl_12m);
  });

  it('Stage 3: ecl_lifetime = LGD * EAD (PD~1)', () => {
    const result = calculateECL(0.10, 0.45, 1_000_000, 3, 36);
    expect(result.ecl_lifetime).toBe(450_000); // 0.45 * 1M
  });

  it('handles zero PD', () => {
    const result = calculateECL(0, 0.45, 1_000_000, 1, 12);
    expect(result.ecl_12m).toBe(0);
    expect(result.ecl_lifetime).toBe(0);
  });
});

describe('calculateFeeRate', () => {
  it('returns 0 for products without undrawn fee', () => {
    expect(calculateFeeRate('TERM_LOAN', 'IG_HIGH')).toBe(0);
    expect(calculateFeeRate('BRIDGE_LOAN', 'HY_LOW')).toBe(0);
  });

  it('returns positive value for revolving credit', () => {
    expect(calculateFeeRate('REVOLVING_CREDIT', 'IG_HIGH')).toBeGreaterThan(0);
  });

  it('higher tier = higher fee rate', () => {
    const igHigh = calculateFeeRate('REVOLVING_CREDIT', 'IG_HIGH');
    const hyLow = calculateFeeRate('REVOLVING_CREDIT', 'HY_LOW');
    expect(hyLow).toBeGreaterThan(igHigh);
  });
});

describe('generateAmortizationSchedule', () => {
  it('produces declining balance over time', () => {
    const schedule = generateAmortizationSchedule(
      1_000_000, 0.06, '2024-01-01', '2026-01-01', 0.025,
    );
    expect(schedule.length).toBeGreaterThan(0);

    // Each entry should have declining remaining_balance
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].remaining_balance).toBeLessThanOrEqual(
        schedule[i - 1].remaining_balance,
      );
    }
  });

  it('ends with zero remaining balance', () => {
    const schedule = generateAmortizationSchedule(
      1_000_000, 0.06, '2024-01-01', '2030-01-01', 0.025,
    );
    const last = schedule[schedule.length - 1];
    expect(last.remaining_balance).toBe(0);
  });

  it('has positive principal and interest amounts', () => {
    const schedule = generateAmortizationSchedule(
      1_000_000, 0.06, '2024-01-01', '2026-01-01', 0.025,
    );
    for (const entry of schedule) {
      expect(entry.principal_amount).toBeGreaterThan(0);
      expect(entry.interest_amount).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('selectFacilityPool', () => {
  it('returns a valid pool with fractions summing to ~1', () => {
    const rng = mulberry32(42);
    const pool = selectFacilityPool(rng, 'LARGE', 'HY_HIGH');
    const total = pool.reduce((s, p) => s + p.fraction, 0);
    expect(total).toBeCloseTo(1.0, 2);
  });

  it('each entry has a valid ProductType', () => {
    const validTypes: ProductType[] = [
      'REVOLVING_CREDIT', 'TERM_LOAN', 'TERM_LOAN_B',
      'LETTER_OF_CREDIT', 'BRIDGE_LOAN', 'DELAYED_DRAW_TERM_LOAN', 'SWINGLINE',
    ];
    const rng = mulberry32(10);
    const pool = selectFacilityPool(rng, 'MID', 'IG_MID');
    for (const entry of pool) {
      expect(validTypes).toContain(entry.facilityType);
    }
  });
});

describe('willRefinance', () => {
  it('returns boolean', () => {
    const rng = mulberry32(42);
    const result = willRefinance(rng, 'REVOLVING_CREDIT', 'IG_HIGH');
    expect(typeof result).toBe('boolean');
  });

  it('IG has higher refinance probability than HY (statistical)', () => {
    let igCount = 0;
    let hyCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (willRefinance(mulberry32(i), 'REVOLVING_CREDIT', 'IG_HIGH')) igCount++;
      if (willRefinance(mulberry32(i + 5000), 'REVOLVING_CREDIT', 'HY_LOW')) hyCount++;
    }
    expect(igCount).toBeGreaterThan(hyCount);
  });
});

describe('PRODUCT_CONFIGS', () => {
  it('has config for all product types', () => {
    const types: ProductType[] = [
      'REVOLVING_CREDIT', 'TERM_LOAN', 'TERM_LOAN_B',
      'LETTER_OF_CREDIT', 'BRIDGE_LOAN', 'DELAYED_DRAW_TERM_LOAN', 'SWINGLINE',
    ];
    for (const t of types) {
      expect(PRODUCT_CONFIGS[t]).toBeDefined();
      expect(PRODUCT_CONFIGS[t].ccf).toBeGreaterThanOrEqual(0);
      expect(PRODUCT_CONFIGS[t].ccf).toBeLessThanOrEqual(1);
    }
  });

  it('revolving products have isRevolving=true', () => {
    expect(PRODUCT_CONFIGS.REVOLVING_CREDIT.isRevolving).toBe(true);
    expect(PRODUCT_CONFIGS.SWINGLINE.isRevolving).toBe(true);
  });

  it('term loans have bulletDraw=true', () => {
    expect(PRODUCT_CONFIGS.TERM_LOAN.bulletDraw).toBe(true);
    expect(PRODUCT_CONFIGS.TERM_LOAN_B.bulletDraw).toBe(true);
    expect(PRODUCT_CONFIGS.BRIDGE_LOAN.bulletDraw).toBe(true);
  });
});
