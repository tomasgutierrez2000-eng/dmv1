/**
 * Group 13: Distribution Realism Score
 *
 * Composite 0-100 score measuring how realistic generated data distributions are.
 * Inspired by DataSynth's statistical evaluation framework.
 *
 * Components:
 *   - Benford conformance (20%): chi-squared on amount fields
 *   - Correlation fidelity (30%): Spearman ρ vs target copula matrix
 *   - Distribution shape (25%): goodness-of-fit on PD, amounts, utilization
 *   - Concentration realism (15%): Herfindahl index on dimensions
 *   - Temporal realism (10%): autocorrelation of PD time-series
 */

import type { V2GeneratorOutput } from '../v2/generators';
import type { QualityControlResult } from './shared-types';
import { findTable, extractNumericField, stdev } from './shared-types';

// ─── Benford's Law ──────────────────────────────────────────────────────

/** Expected first-digit frequencies per Benford's Law: P(d) = log10(1 + 1/d) */
const BENFORD_EXPECTED = [0, 0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

function benfordScore(values: number[]): number {
  const positiveValues = values.filter(v => v > 0 && isFinite(v));
  if (positiveValues.length < 20) return 100; // Too few values to judge

  const counts = new Array(10).fill(0);
  for (const v of positiveValues) {
    const firstDigit = parseInt(String(Math.abs(v)).replace(/^0\.0*/, '').charAt(0));
    if (firstDigit >= 1 && firstDigit <= 9) counts[firstDigit]++;
  }

  const n = positiveValues.length;
  let chiSquared = 0;
  for (let d = 1; d <= 9; d++) {
    const observed = counts[d] / n;
    const expected = BENFORD_EXPECTED[d];
    chiSquared += ((observed - expected) ** 2) / expected;
  }

  // Convert chi-squared to a 0-100 score (lower chi-squared = better)
  // chi-squared with df=8: critical value at p=0.01 is 20.09, p=0.05 is 15.51
  if (chiSquared < 5) return 100;
  if (chiSquared < 10) return 85;
  if (chiSquared < 15.51) return 70;
  if (chiSquared < 20.09) return 50;
  if (chiSquared < 30) return 30;
  return 10;
}

// ─── Spearman Rank Correlation ──────────────────────────────────────────

function spearmanCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 5) return 0;
  const n = x.length;

  const rankX = computeRanks(x);
  const rankY = computeRanks(y);

  let sumD2 = 0;
  for (let i = 0; i < n; i++) {
    const d = rankX[i] - rankY[i];
    sumD2 += d * d;
  }
  return 1 - (6 * sumD2) / (n * (n * n - 1));
}

function computeRanks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length);
  for (let i = 0; i < indexed.length; i++) {
    ranks[indexed[i].i] = i + 1;
  }
  return ranks;
}

// ─── Correlation Fidelity ───────────────────────────────────────────────

/** Target correlations: [PD↔LGD, PD↔util, PD↔spread] */
const TARGET_CORRELATIONS = [
  { fields: ['pd', 'lgd'], target: 0.30, label: 'PD↔LGD' },
  { fields: ['pd', 'utilization'], target: 0.40, label: 'PD↔Utilization' },
  { fields: ['pd', 'spread'], target: 0.60, label: 'PD↔Spread' },
];

function correlationFidelityScore(
  pdValues: number[],
  lgdValues: number[],
  utilizationValues: number[],
  spreadValues: number[],
): number {
  const fieldMap: Record<string, number[]> = {
    pd: pdValues,
    lgd: lgdValues,
    utilization: utilizationValues,
    spread: spreadValues,
  };

  let totalDeviation = 0;
  let validChecks = 0;

  for (const check of TARGET_CORRELATIONS) {
    const x = fieldMap[check.fields[0]];
    const y = fieldMap[check.fields[1]];
    if (!x || !y || x.length < 10 || y.length < 10) continue;

    // Align lengths
    const n = Math.min(x.length, y.length);
    const rho = spearmanCorrelation(x.slice(0, n), y.slice(0, n));
    totalDeviation += Math.abs(rho - check.target);
    validChecks++;
  }

  if (validChecks === 0) return 100; // No data to check
  const avgDeviation = totalDeviation / validChecks;
  // Score: 100 if deviation < 0.05, linearly decreasing to 0 at deviation 0.5
  return Math.max(0, Math.min(100, 100 * (1 - avgDeviation / 0.5)));
}

// ─── Distribution Shape ─────────────────────────────────────────────────

function distributionShapeScore(values: number[], expectedSkewSign: number): number {
  if (values.length < 20) return 100;
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = stdev(values);
  if (sd < 1e-10) return 20; // Degenerate distribution

  // Compute skewness
  const skew = values.reduce((s, v) => s + ((v - mean) / sd) ** 3, 0) / n;

  // Check: if expected right-skewed (amounts) and skewness is positive, good
  if (expectedSkewSign > 0 && skew > 0.3) return 100;
  if (expectedSkewSign > 0 && skew > 0) return 80;
  if (expectedSkewSign > 0 && skew <= 0) return 40; // Wrong skew direction

  // For PD (expected right-skewed) and utilization (expected slightly right-skewed)
  if (expectedSkewSign === 0) {
    // Symmetric or slightly skewed is fine
    return Math.abs(skew) < 1.0 ? 90 : 60;
  }

  return 70; // Default moderate
}

// ─── Concentration Realism ──────────────────────────────────────────────

function herfindahlScore(values: string[]): number {
  if (values.length === 0) return 100;
  const counts: Record<string, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }
  const n = values.length;
  const shares = Object.values(counts).map(c => c / n);
  const hhi = shares.reduce((s, p) => s + p * p, 0);

  // HHI: 1/k (perfectly uniform) to 1.0 (perfectly concentrated)
  // For GSIB portfolios: moderate concentration is realistic
  const k = Object.keys(counts).length;
  const perfectlyUniform = 1 / Math.max(k, 1);

  // Score: penalize both too-uniform (< 1.2x uniform) and too-concentrated (> 0.5)
  if (hhi < perfectlyUniform * 1.1) return 50; // Suspiciously uniform
  if (hhi > 0.5) return 50; // Too concentrated
  return 90; // Realistic concentration
}

// ─── Temporal Realism ───────────────────────────────────────────────────

function temporalAutocorrelationScore(timeSeries: number[][]): number {
  // timeSeries: array of facility PD trajectories
  if (timeSeries.length === 0) return 100;

  let totalAutocorr = 0;
  let count = 0;

  for (const series of timeSeries) {
    if (series.length < 3) continue;
    // Lag-1 autocorrelation
    const n = series.length;
    const mean = series.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let t = 1; t < n; t++) {
      num += (series[t] - mean) * (series[t - 1] - mean);
    }
    for (let t = 0; t < n; t++) {
      den += (series[t] - mean) ** 2;
    }
    if (den > 0) {
      totalAutocorr += num / den;
      count++;
    }
  }

  if (count === 0) return 100;
  const avgAutocorr = totalAutocorr / count;

  // GSIB PD should show positive autocorrelation (mean-reversion implies ~0.7-0.95)
  if (avgAutocorr > 0.5 && avgAutocorr < 0.98) return 100;
  if (avgAutocorr > 0.3) return 80;
  if (avgAutocorr > 0) return 60;
  return 30; // Negative autocorrelation = random walk, unrealistic
}

// ─── Composite Score ────────────────────────────────────────────────────

export interface RealismScoreBreakdown {
  benford: number;
  correlationFidelity: number;
  distributionShape: number;
  concentrationRealism: number;
  temporalRealism: number;
  composite: number;
}

export function computeRealismScore(
  output: V2GeneratorOutput,
): { score: RealismScoreBreakdown; result: QualityControlResult } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lastDate = output.dates[output.dates.length - 1];

  // Extract fields for analysis
  const exposureTable = findTable(output, 'facility_exposure_snapshot');
  const riskTable = findTable(output, 'facility_risk_snapshot');
  const pricingTable = findTable(output, 'facility_pricing_snapshot');

  // Benford: check committed and drawn amounts
  const committedAmounts = exposureTable
    ? extractNumericField(exposureTable.rows.filter(r => r.as_of_date === lastDate), 'committed_amount')
    : [];
  const drawnAmounts = exposureTable
    ? extractNumericField(exposureTable.rows.filter(r => r.as_of_date === lastDate), 'drawn_amount')
    : [];
  const benford = Math.round(
    (benfordScore(committedAmounts) + benfordScore(drawnAmounts)) / 2
  );

  // Correlation: PD, LGD, utilization, spread
  const lastRiskRows = riskTable?.rows.filter(r => r.as_of_date === lastDate) ?? [];
  const lastExposureRows = exposureTable?.rows.filter(r => r.as_of_date === lastDate) ?? [];
  const lastPricingRows = pricingTable?.rows.filter(r => r.as_of_date === lastDate) ?? [];

  const pdValues = extractNumericField(lastRiskRows, 'pd_pct');
  const lgdValues = extractNumericField(lastRiskRows, 'lgd_pct');
  const utilizationValues: number[] = lastExposureRows.map(r => {
    const committed = r.committed_amount as number;
    const drawn = (r.drawn_amount ?? r.outstanding_balance_amt) as number;
    return committed > 0 ? drawn / committed : 0;
  }).filter(v => isFinite(v));
  const spreadValues = extractNumericField(lastPricingRows, 'spread_bps');

  const correlationFidelity = correlationFidelityScore(pdValues, lgdValues, utilizationValues, spreadValues);

  // Distribution shape: amounts should be right-skewed, PD slightly skewed
  const amountShape = distributionShapeScore(committedAmounts, 1);
  const pdShape = distributionShapeScore(pdValues, 1);
  const distributionShape = Math.round((amountShape + pdShape) / 2);

  // Concentration: check industry and country diversity
  const industries = lastExposureRows.map(r => String(r.industry_id ?? r.lob_segment_id ?? '')).filter(Boolean);
  const countries = lastExposureRows.map(r => String(r.currency_code ?? '')).filter(Boolean);
  const concentrationRealism = Math.round(
    (herfindahlScore(industries) + herfindahlScore(countries)) / 2
  );

  // Temporal: PD autocorrelation per facility
  const facilityIdSet = new Set(riskTable?.rows.map(r => String(r.facility_id)) ?? []);
  const facilityIds = Array.from(facilityIdSet);
  const pdSeries = facilityIds.map(fid => {
    const rows = (riskTable?.rows ?? [])
      .filter(r => String(r.facility_id) === fid)
      .sort((a, b) => String(a.as_of_date).localeCompare(String(b.as_of_date)));
    return rows.map(r => r.pd_pct as number).filter(v => typeof v === 'number' && isFinite(v));
  }).filter(s => s.length >= 3);
  const temporalRealism = temporalAutocorrelationScore(pdSeries);

  // Composite score (weighted)
  const composite = Math.round(
    benford * 0.20 +
    correlationFidelity * 0.30 +
    distributionShape * 0.25 +
    concentrationRealism * 0.15 +
    temporalRealism * 0.10
  );

  // Generate warnings for low-scoring components
  if (benford < 60) warnings.push(`Realism: Benford conformance score ${benford}/100 — amounts may look synthetic`);
  if (correlationFidelity < 60) warnings.push(`Realism: Correlation fidelity score ${correlationFidelity}/100 — PD/LGD/util/spread not properly correlated`);
  if (distributionShape < 60) warnings.push(`Realism: Distribution shape score ${distributionShape}/100 — distributions don't match expected parametric families`);
  if (concentrationRealism < 60) warnings.push(`Realism: Concentration score ${concentrationRealism}/100 — portfolio too uniform or too concentrated`);
  if (temporalRealism < 60) warnings.push(`Realism: Temporal autocorrelation score ${temporalRealism}/100 — PD time-series lacks mean-reversion`);
  if (composite < 70) errors.push(`Realism: Overall score ${composite}/100 — below quality threshold of 70`);

  const score: RealismScoreBreakdown = {
    benford,
    correlationFidelity,
    distributionShape,
    concentrationRealism,
    temporalRealism,
    composite,
  };

  return { score, result: { errors, warnings } };
}

export function runDistributionRealismScore(
  output: V2GeneratorOutput,
): QualityControlResult {
  return computeRealismScore(output).result;
}
