import { describe, it, expect } from 'vitest';
import {
  TIER_BASE_SPREADS,
  TIER_BASE_RW,
  CURRENCY_BASE_RATES,
  TIER_INT_RATINGS,
  TIER_EXT_RATINGS,
  RATING_MIGRATION,
} from '../seed-config';

const TIERS = ['IG_HIGH', 'IG_MID', 'IG_LOW', 'HY_HIGH', 'HY_MID', 'HY_LOW'] as const;

describe('TIER_BASE_SPREADS', () => {
  it('has all 6 rating tiers', () => {
    for (const tier of TIERS) {
      expect(TIER_BASE_SPREADS[tier]).toBeDefined();
      expect(typeof TIER_BASE_SPREADS[tier]).toBe('number');
    }
  });

  it('spreads increase from IG_HIGH to HY_LOW', () => {
    expect(TIER_BASE_SPREADS.IG_HIGH).toBeLessThan(TIER_BASE_SPREADS.IG_MID);
    expect(TIER_BASE_SPREADS.IG_LOW).toBeLessThan(TIER_BASE_SPREADS.HY_HIGH);
    expect(TIER_BASE_SPREADS.HY_MID).toBeLessThan(TIER_BASE_SPREADS.HY_LOW);
  });
});

describe('TIER_BASE_RW', () => {
  it('has all 6 rating tiers', () => {
    for (const tier of TIERS) {
      expect(TIER_BASE_RW[tier]).toBeDefined();
    }
  });

  it('risk weights increase from IG to HY', () => {
    expect(TIER_BASE_RW.IG_HIGH).toBeLessThanOrEqual(TIER_BASE_RW.IG_MID);
    expect(TIER_BASE_RW.IG_LOW).toBeLessThanOrEqual(TIER_BASE_RW.HY_HIGH);
  });
});

describe('CURRENCY_BASE_RATES', () => {
  it('includes major currencies', () => {
    expect(CURRENCY_BASE_RATES.USD).toBeDefined();
    expect(CURRENCY_BASE_RATES.EUR).toBeDefined();
    expect(CURRENCY_BASE_RATES.GBP).toBeDefined();
    expect(CURRENCY_BASE_RATES.JPY).toBeDefined();
    expect(CURRENCY_BASE_RATES.CHF).toBeDefined();
  });

  it('JPY has lowest rate', () => {
    expect(CURRENCY_BASE_RATES.JPY).toBeLessThan(CURRENCY_BASE_RATES.USD);
    expect(CURRENCY_BASE_RATES.JPY).toBeLessThan(CURRENCY_BASE_RATES.EUR);
  });
});

describe('TIER_INT_RATINGS / TIER_EXT_RATINGS', () => {
  it('each tier has 5 cycle positions', () => {
    for (const tier of TIERS) {
      expect(TIER_INT_RATINGS[tier]).toHaveLength(5);
      expect(TIER_EXT_RATINGS[tier]).toHaveLength(5);
    }
  });

  it('IG_HIGH internal ratings are AA-range', () => {
    for (const rating of TIER_INT_RATINGS.IG_HIGH) {
      expect(rating.startsWith('AA') || rating.startsWith('A+')).toBe(true);
    }
  });
});

describe('RATING_MIGRATION', () => {
  it('STABLE arcs have all-zero offsets', () => {
    expect(RATING_MIGRATION.STABLE_IG.every(v => v === 0)).toBe(true);
    expect(RATING_MIGRATION.STEADY_HY.every(v => v === 0)).toBe(true);
  });

  it('DETERIORATING arc worsens over time', () => {
    const d = RATING_MIGRATION.DETERIORATING;
    expect(d[0]).toBe(0);
    expect(d[d.length - 1]).toBeGreaterThan(0);
  });

  it('each arc has 5 cycle positions', () => {
    for (const arc of Object.values(RATING_MIGRATION)) {
      expect(arc).toHaveLength(5);
    }
  });
});
