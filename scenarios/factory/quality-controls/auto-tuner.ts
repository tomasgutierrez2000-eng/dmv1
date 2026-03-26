/**
 * AutoTuner — automatic parameter adjustment when Distribution Realism Score < 70.
 *
 * Analyzes which realism components failed and generates a JSON patch
 * with adjusted distribution parameters for the V2 state machine.
 *
 * Runs deterministically — no LLM calls.
 */

import type { V2GeneratorOutput } from '../v2/generators';
import { computeRealismScore, type RealismScoreBreakdown } from './distribution-realism-score';

export interface AutoTunerPatch {
  /** Whether any adjustments were made. */
  adjusted: boolean;
  /** Realism score before adjustments. */
  score_before: RealismScoreBreakdown;
  /** Specific parameter adjustments. */
  adjustments: TunerAdjustment[];
}

export interface TunerAdjustment {
  component: 'benford' | 'correlation' | 'distribution' | 'concentration' | 'temporal';
  parameter: string;
  old_value: number;
  new_value: number;
  reason: string;
}

/**
 * Analyze realism score and generate parameter adjustments.
 *
 * Returns a patch that can be applied to V2 config for re-generation.
 */
export function generateAutoTunerPatch(
  output: V2GeneratorOutput,
): AutoTunerPatch {
  const { score } = computeRealismScore(output);
  const adjustments: TunerAdjustment[] = [];

  // Only tune if composite score is below threshold
  if (score.composite >= 70) {
    return { adjusted: false, score_before: score, adjustments: [] };
  }

  // Benford failure: amounts are too round → widen LogNormal sigma
  if (score.benford < 60) {
    adjustments.push({
      component: 'benford',
      parameter: 'amount_lognormal_sigma',
      old_value: 0.5,
      new_value: Math.min(0.5 + 0.15, 1.2), // Increase sigma, cap at 1.2
      reason: `Benford score ${score.benford}/100 — amounts need wider distribution (less rounding)`,
    });
  }

  // Correlation too low: increase copula coefficients
  if (score.correlationFidelity < 60) {
    adjustments.push({
      component: 'correlation',
      parameter: 'copula_pd_lgd_rho',
      old_value: 0.30,
      new_value: Math.min(0.30 + 0.10, 0.80), // Increase, cap at 0.80
      reason: `Correlation fidelity ${score.correlationFidelity}/100 — PD↔LGD correlation too weak`,
    });
    adjustments.push({
      component: 'correlation',
      parameter: 'copula_pd_util_rho',
      old_value: 0.40,
      new_value: Math.min(0.40 + 0.10, 0.80),
      reason: `Correlation fidelity ${score.correlationFidelity}/100 — PD↔utilization correlation too weak`,
    });
    adjustments.push({
      component: 'correlation',
      parameter: 'copula_pd_spread_rho',
      old_value: 0.60,
      new_value: Math.min(0.60 + 0.10, 0.90),
      reason: `Correlation fidelity ${score.correlationFidelity}/100 — PD↔spread correlation too weak`,
    });
  }

  // Correlation too high: decrease copula coefficients
  // (This handles the case where AutoTuner previously over-corrected)
  if (score.correlationFidelity > 95) {
    adjustments.push({
      component: 'correlation',
      parameter: 'copula_pd_lgd_rho',
      old_value: 0.30,
      new_value: Math.max(0.30 - 0.05, 0.10),
      reason: `Correlation too tight — reduce to allow natural variation`,
    });
  }

  // Distribution shape failure: narrow Beta parameters toward tier calibration
  if (score.distributionShape < 60) {
    adjustments.push({
      component: 'distribution',
      parameter: 'pd_beta_alpha',
      old_value: 2.0,
      new_value: 1.5, // More right-skewed
      reason: `Distribution shape ${score.distributionShape}/100 — PD needs more right-skew`,
    });
    adjustments.push({
      component: 'distribution',
      parameter: 'pd_beta_beta',
      old_value: 5.0,
      new_value: 8.0, // More concentrated toward low PD
      reason: `Distribution shape ${score.distributionShape}/100 — PD too uniformly spread`,
    });
  }

  // Concentration too uniform: introduce dominant sectors
  if (score.concentrationRealism < 60) {
    adjustments.push({
      component: 'concentration',
      parameter: 'sector_concentration_factor',
      old_value: 1.0,
      new_value: 1.5, // 50% more concentrated
      reason: `Concentration ${score.concentrationRealism}/100 — portfolio too uniformly distributed`,
    });
  }

  // Temporal realism: PD lacks autocorrelation → increase OU mean-reversion
  if (score.temporalRealism < 60) {
    adjustments.push({
      component: 'temporal',
      parameter: 'ou_theta',
      old_value: 0.1,
      new_value: 0.3, // Stronger mean-reversion
      reason: `Temporal realism ${score.temporalRealism}/100 — PD time-series lacks mean-reversion`,
    });
  }

  return {
    adjusted: adjustments.length > 0,
    score_before: score,
    adjustments,
  };
}
