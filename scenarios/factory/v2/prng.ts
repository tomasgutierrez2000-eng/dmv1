/**
 * Consolidated PRNG module — deterministic, reproducible random generation.
 *
 * Uses mulberry32 (a fast 32-bit PRNG) with string-based seeding.
 * All data factory randomness flows through this module to ensure
 * reproducibility across runs.
 *
 * Previously duplicated in:
 *   - scenarios/factory/gsib-enrichment.ts
 *   - scenarios/factory/l2-generator.ts
 *   - scripts/l1/mvp-counterparties.ts
 */

/** Create a seeded PRNG using the mulberry32 algorithm. */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string to a 32-bit integer for PRNG seeding. */
export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Create a PRNG seeded from a string key. */
export function seededRng(key: string): () => number {
  return mulberry32(hashStr(key));
}

/** Pick a random element from an array. */
export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Generate a random number in [min, max). */
export function range(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Generate a random integer in [min, max] inclusive. */
export function intRange(rng: () => number, min: number, max: number): number {
  return Math.floor(range(rng, min, max + 1));
}

/** Round to N decimal places. */
export function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Deterministic shuffle (Fisher-Yates with seeded RNG). */
export function seededShuffle<T>(rng: () => number, arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Clamp a value to [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
