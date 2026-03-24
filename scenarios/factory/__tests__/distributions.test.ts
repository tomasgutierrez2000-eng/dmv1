import { describe, it, expect } from 'vitest';
import {
  normalSample, boundedNormal, logNormalSample, betaSample,
  triangularSample, ouStep, sampleCommittedAmount, sampleLGD,
  sampleSpread, sampleUtilization, sampleCollateralValue,
  evolveCollateralValue, seasonalMultiplier, sampleRiskWeight,
  sampleTenorYears, sampleFeeRate, evolveSpread,
} from '../v2/distributions';
import { mulberry32 } from '../v2/prng';
import type { RatingTier, SizeProfile } from '../../../scripts/shared/mvp-config';
import type { ProductType } from '../v2/types';

function makeRng(seed = 42) { return mulberry32(seed); }

describe('normalSample', () => {
  it('produces values centered near 0', () => {
    const rng = makeRng();
    const samples = Array.from({ length: 5000 }, () => normalSample(rng));
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    expect(mean).toBeCloseTo(0, 0); // within ~0.5 of 0
  });

  it('does not produce NaN for extreme seeds', () => {
    for (const seed of [0, 1, -1, 2147483647, -2147483648]) {
      const rng = mulberry32(seed);
      for (let i = 0; i < 100; i++) {
        expect(Number.isNaN(normalSample(rng))).toBe(false);
      }
    }
  });
});

describe('boundedNormal', () => {
  it('stays within [lo, hi]', () => {
    const rng = makeRng();
    for (let i = 0; i < 1000; i++) {
      const v = boundedNormal(rng, 50, 15, 10, 90);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(90);
    }
  });

  it('centers near the mean', () => {
    const rng = makeRng(123);
    const samples = Array.from({ length: 5000 }, () => boundedNormal(rng, 50, 5, 0, 100));
    const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
    expect(mean).toBeCloseTo(50, 0);
  });
});

describe('logNormalSample', () => {
  it('produces positive values within bounds', () => {
    const rng = makeRng();
    for (let i = 0; i < 500; i++) {
      const v = logNormalSample(rng, Math.log(100), 0.5, 10, 1000);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(1000);
    }
  });
});

describe('betaSample', () => {
  it('returns values in [0, 1]', () => {
    const rng = makeRng();
    for (let i = 0; i < 500; i++) {
      const v = betaSample(rng, 2, 5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('handles alpha < 1 (boost case)', () => {
    const rng = makeRng(99);
    for (let i = 0; i < 100; i++) {
      const v = betaSample(rng, 0.5, 0.5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(Number.isNaN(v)).toBe(false);
    }
  });
});

describe('triangularSample', () => {
  it('returns values in [lo, hi]', () => {
    const rng = makeRng();
    for (let i = 0; i < 500; i++) {
      const v = triangularSample(rng, 1, 3, 5);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
});

describe('ouStep (Ornstein-Uhlenbeck)', () => {
  it('mean-reverts toward the target', () => {
    const rng = makeRng(7);
    const params = { mean: 100, theta: 5.0, sigma: 1.0 };
    // Start far from mean, many small steps should converge
    let x = 200;
    for (let i = 0; i < 200; i++) {
      x = ouStep(rng, x, params, 7 / 365);
    }
    // Should be closer to mean than we started
    expect(Math.abs(x - 100)).toBeLessThan(Math.abs(200 - 100));
  });
});

describe('sampleCommittedAmount', () => {
  const sizes: SizeProfile[] = ['LARGE', 'MID', 'SMALL'];

  it('returns values within size-appropriate ranges', () => {
    const rng = makeRng();
    for (const size of sizes) {
      const v = sampleCommittedAmount(rng, size, 1);
      expect(v).toBeGreaterThan(0);
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('LARGE produces larger amounts than SMALL', () => {
    // Use many samples to get reliable averages
    const avgLarge = avg(100, (rng) => sampleCommittedAmount(rng, 'LARGE', 1));
    const avgSmall = avg(100, (rng) => sampleCommittedAmount(rng, 'SMALL', 1));
    expect(avgLarge).toBeGreaterThan(avgSmall);
  });

  it('rounds to nearest $100K', () => {
    const rng = makeRng(55);
    const v = sampleCommittedAmount(rng, 'MID', 5);
    expect(v % 100_000).toBe(0);
  });
});

describe('sampleLGD', () => {
  const tiers: RatingTier[] = ['IG_HIGH', 'IG_MID', 'IG_LOW', 'HY_HIGH', 'HY_MID', 'HY_LOW'];

  it('returns values in [0, 1] for all rating tiers', () => {
    for (const tier of tiers) {
      const rng = makeRng();
      for (let i = 0; i < 100; i++) {
        const v = sampleLGD(rng, tier);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('HY tiers produce higher LGD on average than IG tiers', () => {
    const avgIG = avg(500, (rng) => sampleLGD(rng, 'IG_HIGH'));
    const avgHY = avg(500, (rng) => sampleLGD(rng, 'HY_LOW'));
    expect(avgHY).toBeGreaterThan(avgIG);
  });
});

describe('sampleSpread', () => {
  it('returns positive values for all tiers', () => {
    const tiers: RatingTier[] = ['IG_HIGH', 'IG_MID', 'IG_LOW', 'HY_HIGH', 'HY_MID', 'HY_LOW'];
    for (const tier of tiers) {
      const rng = makeRng();
      const v = sampleSpread(rng, tier);
      expect(v).toBeGreaterThan(0);
    }
  });

  it('HY tiers produce wider spreads than IG tiers', () => {
    const avgIG = avg(200, (rng) => sampleSpread(rng, 'IG_HIGH'));
    const avgHY = avg(200, (rng) => sampleSpread(rng, 'HY_LOW'));
    expect(avgHY).toBeGreaterThan(avgIG);
  });
});

describe('evolveSpread', () => {
  it('keeps spread positive', () => {
    const rng = makeRng();
    let spread = 50;
    for (let i = 0; i < 200; i++) {
      spread = evolveSpread(rng, spread, 'IG_HIGH', 1.0, 7/365);
      expect(spread).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('sampleRiskWeight', () => {
  it('returns positive value', () => {
    const rng = makeRng();
    const v = sampleRiskWeight(rng, 'IG_MID');
    expect(v).toBeGreaterThan(0);
  });
});

describe('sampleUtilization', () => {
  it('returns values in [0, 1] for revolving credit', () => {
    const rng = makeRng();
    for (let i = 0; i < 100; i++) {
      const v = sampleUtilization(rng, 'REVOLVING_CREDIT', 1.0);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('term loans have near-100% utilization', () => {
    const rng = makeRng();
    for (let i = 0; i < 50; i++) {
      const v = sampleUtilization(rng, 'TERM_LOAN', 1.0);
      expect(v).toBeGreaterThanOrEqual(0.95);
    }
  });
});

describe('sampleCollateralValue', () => {
  it('returns 0 for NONE collateral type', () => {
    const rng = makeRng();
    expect(sampleCollateralValue(rng, 1_000_000, 'NONE')).toBe(0);
  });

  it('returns positive value for RE collateral', () => {
    const rng = makeRng();
    const v = sampleCollateralValue(rng, 1_000_000, 'RE');
    expect(v).toBeGreaterThan(0);
  });
});

describe('evolveCollateralValue', () => {
  it('returns same value for CASH (no volatility)', () => {
    const rng = makeRng();
    expect(evolveCollateralValue(rng, 1_000_000, 'CASH', 7/365)).toBe(1_000_000);
  });

  it('changes value for volatile asset types', () => {
    const rng = makeRng();
    const original = 1_000_000;
    let changed = false;
    for (let i = 0; i < 20; i++) {
      const v = evolveCollateralValue(mulberry32(i), original, 'RE', 30/365);
      if (v !== original) changed = true;
    }
    expect(changed).toBe(true);
  });
});

describe('sampleTenorYears', () => {
  it('returns values within product ranges', () => {
    const rng = makeRng();
    const v = sampleTenorYears(rng, 'REVOLVING_CREDIT');
    expect(v).toBeGreaterThanOrEqual(3);
    expect(v).toBeLessThanOrEqual(7);
  });

  it('bridge loans have shorter tenors', () => {
    const avgBridge = avg(200, (rng) => sampleTenorYears(rng, 'BRIDGE_LOAN'));
    const avgTerm = avg(200, (rng) => sampleTenorYears(rng, 'TERM_LOAN'));
    expect(avgBridge).toBeLessThan(avgTerm);
  });
});

describe('sampleFeeRate', () => {
  it('returns positive value', () => {
    const rng = makeRng();
    const v = sampleFeeRate(rng, 'REVOLVING_CREDIT', 'IG_HIGH');
    expect(v).toBeGreaterThan(0);
  });
});

describe('seasonalMultiplier', () => {
  it('returns 1.0 for non-seasonal industries', () => {
    // Industry ID 2 (Technology) has no seasonal pattern
    expect(seasonalMultiplier(2, 6)).toBe(1.0);
  });

  it('retail has higher multiplier in Q4', () => {
    const oct = seasonalMultiplier(7, 10);
    const jan = seasonalMultiplier(7, 1);
    expect(oct).toBeGreaterThan(jan);
  });

  it('energy has higher multiplier in winter', () => {
    const dec = seasonalMultiplier(4, 12);
    const jul = seasonalMultiplier(4, 7);
    expect(dec).toBeGreaterThan(jul);
  });
});

// Utility: compute average over N samples
function avg(n: number, fn: (rng: () => number) => number): number {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += fn(mulberry32(i + 1000));
  }
  return sum / n;
}
