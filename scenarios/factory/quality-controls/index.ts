/**
 * Quality Controls — holistic L1-driven data quality checks for Factory V2 output.
 *
 * 11 control groups covering every aspect of GSIB data quality:
 *
 *   1. L1 FK Domain Validation — every FK value in L2 rows exists in L1
 *   2. Enrichment Map Drift Detection — hardcoded maps haven't gone stale
 *   3. Arithmetic Identity Checks — formulas are correct
 *   4. Cross-Field Consistency — values are coherent with L1-driven rules
 *   5. Story Arc Fidelity — generated data tells the scenario's story
 *   6. Cross-Table Correlation — tables that should co-exist do
 *   7. Temporal Coherence — time series are well-formed and consistent
 *   8. Portfolio Distribution — data isn't suspiciously uniform
 *   9. Financial Realism & GSIB Bounds — amounts/rates within regulatory limits
 *  10. Anti-Synthetic Pattern Detection — data looks real, not generated
 *  11. Reconciliation & Completeness — cross-table value matches, internal FKs,
 *      cash flow <-> balance reconciliation, limit aggregation, audit metadata
 *
 * Each group returns { errors, warnings } consistent with validator.ts pattern.
 */

import type { ReferenceDataRegistry } from '../reference-data-registry';
import type { L1Chain } from '../chain-builder';
import type { V2GeneratorOutput } from '../v2/generators';
import type { ScenarioConfig } from '../scenario-config';

// Re-export types
export type { QualityControlResult, FullQualityControlResult } from './shared-types';
export { merge, sampleRows, findTable, extractNumericField, stdev } from './shared-types';

// Re-export individual group functions
export { runFKDomainValidation } from './fk-domain-validation';
export { runDriftDetection, runEnrichmentMapDrift } from './drift-detection';
export { runArithmeticChecks } from './arithmetic-checks';
export { runCrossFieldConsistency } from './cross-field-consistency';
export { runStoryArcChecks } from './story-arc-fidelity';
export { runCrossTableCorrelation } from './cross-table-correlation';
export { runTemporalCoherence } from './temporal-coherence';
export { runPortfolioDistribution } from './distribution-health';
export { runFinancialRealism } from './realism-bounds';
export { runAntiSyntheticChecks } from './anti-synthetic-detection';
export { runReconciliation } from './reconciliation';
export { runDistributionRealismScore, computeRealismScore } from './distribution-realism-score';

// Import for orchestrator
import type { FullQualityControlResult } from './shared-types';
import { merge } from './shared-types';
import { runFKDomainValidation } from './fk-domain-validation';
import { runDriftDetection } from './drift-detection';
import { runArithmeticChecks } from './arithmetic-checks';
import { runCrossFieldConsistency } from './cross-field-consistency';
import { runStoryArcChecks } from './story-arc-fidelity';
import { runCrossTableCorrelation } from './cross-table-correlation';
import { runTemporalCoherence } from './temporal-coherence';
import { runPortfolioDistribution } from './distribution-health';
import { runFinancialRealism } from './realism-bounds';
import { runAntiSyntheticChecks } from './anti-synthetic-detection';
import { runReconciliation } from './reconciliation';
import { runDistributionRealismScore } from './distribution-realism-score';

/**
 * Run all 13 quality control groups for a scenario.
 */
export function runAllQualityControls(
  output: V2GeneratorOutput,
  chain: L1Chain,
  config: ScenarioConfig,
  registry: ReferenceDataRegistry,
): FullQualityControlResult {
  const group1 = runFKDomainValidation(output, registry);
  const group2 = runDriftDetection(registry);
  const group3 = runArithmeticChecks(output);
  const group4 = runCrossFieldConsistency(output, registry);
  const group5 = runStoryArcChecks(output, chain, config);
  const group6 = runCrossTableCorrelation(output, chain);
  const group7 = runTemporalCoherence(output);
  const group8 = runPortfolioDistribution(output, chain, config);
  const group9 = runFinancialRealism(output, chain);
  const group10 = runAntiSyntheticChecks(output);
  const group11 = runReconciliation(output, chain);
  const group13 = runDistributionRealismScore(output);

  const combined = merge(group1, group2, group3, group4, group5, group6, group7, group8, group9, group10, group11, group13);

  return {
    ...combined,
    group1_fk: group1,
    group2_drift: group2,
    group3_arithmetic: group3,
    group4_consistency: group4,
    group5_story: group5,
    group6_crossTable: group6,
    group7_temporal: group7,
    group8_distribution: group8,
    group9_realism: group9,
    group10_antiSynthetic: group10,
    group11_reconciliation: group11,
    group13_realismScore: group13,
  };
}
