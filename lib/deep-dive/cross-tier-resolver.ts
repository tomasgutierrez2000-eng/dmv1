/**
 * Resolves cross-tier dependencies for the step-by-step calculation walkthrough.
 *
 * When viewing a metric at counterparty level, this includes the facility-level
 * sourcing and calculation steps that feed into the counterparty calculation,
 * providing the end-to-end data flow.
 */

import type { CalculationDimension, SourceField } from '@/data/l3-metrics';
import { DIMENSION_TO_CONSUMPTION_LEVEL } from '@/data/l3-metrics';
import { ROLLUP_HIERARCHY_LEVELS, ROLLUP_LEVEL_LABELS, type RollupLevelKey } from '@/lib/metric-library/types';
import { parseLineageNarrative, extractSourceTables, type LineageStep } from './lineage-parser';

/** Data for a single dimension from the API / level definitions. */
export interface DimensionData {
  lineageNarrative?: string;
  sourceFields?: SourceField[];
  formula?: string;
  formulaSQL?: string;
  rollupLogic?: string;
  definition?: string;
  laymanFormula?: string;
  dashboardDisplayName?: string;
}

export interface TierStepGroup {
  tier: RollupLevelKey;
  tierLabel: string;
  dimension: CalculationDimension;
  isCurrentTier: boolean;
  isDependencyTier: boolean;
  steps: LineageStep[];
  sourceTables: { layer: string; table: string; fields: string[] }[];
  rollupLogic?: string;
}

export interface CrossTierResolution {
  metricId: string;
  targetDimension: CalculationDimension;
  tiers: TierStepGroup[];
  allSourceTables: { layer: string; table: string; fields: string[] }[];
}

/** Map CalculationDimension to its position in the rollup hierarchy. */
const DIM_TO_ROLLUP_KEY: Record<CalculationDimension, RollupLevelKey> = {
  facility: 'facility',
  counterparty: 'counterparty',
  L3: 'desk',
  L2: 'portfolio',
  L1: 'lob',
};

const ROLLUP_KEY_TO_DIM: Record<RollupLevelKey, CalculationDimension> = {
  facility: 'facility',
  counterparty: 'counterparty',
  desk: 'L3',
  portfolio: 'L2',
  lob: 'L1',
};

/**
 * Resolve the cross-tier dependency chain for a given metric at a target dimension.
 *
 * Returns tier step groups ordered from lowest dependency tier to the target tier.
 * For upper tiers (L2, L1), includes: facility level + target level (skipping intermediates
 * to avoid overly long chains, unless they have distinct steps).
 */
export function resolveCrossTierDependencies(
  metricId: string,
  targetDimension: CalculationDimension,
  dimensionDataMap: Map<CalculationDimension, DimensionData>
): CrossTierResolution {
  const targetRollupKey = DIM_TO_ROLLUP_KEY[targetDimension];
  const targetIndex = ROLLUP_HIERARCHY_LEVELS.indexOf(targetRollupKey);

  const tiers: TierStepGroup[] = [];
  const allSourceTablesMap = new Map<string, { layer: string; table: string; fields: string[] }>();

  // Always include facility level as the base dependency (if target > facility)
  if (targetIndex > 0) {
    const facilityDim: CalculationDimension = 'facility';
    const facilityData = dimensionDataMap.get(facilityDim);
    if (facilityData?.lineageNarrative) {
      const steps = parseLineageNarrative(
        facilityData.lineageNarrative,
        facilityData.sourceFields,
        facilityData.formulaSQL
      );
      const sourceTables = extractSourceTables(facilityData.sourceFields);
      for (const st of sourceTables) {
        const key = `${st.layer}.${st.table}`;
        const existing = allSourceTablesMap.get(key);
        if (existing) {
          for (const f of st.fields) {
            if (!existing.fields.includes(f)) existing.fields.push(f);
          }
        } else {
          allSourceTablesMap.set(key, { ...st });
        }
      }
      tiers.push({
        tier: 'facility',
        tierLabel: ROLLUP_LEVEL_LABELS.facility,
        dimension: facilityDim,
        isCurrentTier: false,
        isDependencyTier: true,
        steps,
        sourceTables,
        rollupLogic: facilityData.rollupLogic,
      });
    }
  }

  // Add the target dimension tier
  const targetData = dimensionDataMap.get(targetDimension);
  if (targetData?.lineageNarrative) {
    const steps = parseLineageNarrative(
      targetData.lineageNarrative,
      targetData.sourceFields,
      targetData.formulaSQL
    );
    const sourceTables = extractSourceTables(targetData.sourceFields);
    for (const st of sourceTables) {
      const key = `${st.layer}.${st.table}`;
      const existing = allSourceTablesMap.get(key);
      if (existing) {
        for (const f of st.fields) {
          if (!existing.fields.includes(f)) existing.fields.push(f);
        }
      } else {
        allSourceTablesMap.set(key, { ...st });
      }
    }

    // Deduplicate: remove steps from target that duplicate facility-level SOURCE steps
    const facilityTier = tiers.find((t) => t.tier === 'facility');
    let deduplicatedSteps = steps;
    if (facilityTier && facilityTier.steps.length > 0) {
      const facilitySourceKeys = new Set(
        facilityTier.steps
          .filter((s) => s.tag === 'SOURCE')
          .map((s) => `${s.layer}.${s.table}.${s.field}`)
      );
      // Keep steps that are new to this tier OR are TRANSFORM/OUTPUT
      deduplicatedSteps = steps.filter((s) => {
        if (s.tag !== 'SOURCE') return true;
        const key = `${s.layer}.${s.table}.${s.field}`;
        return !facilitySourceKeys.has(key);
      });
    }

    tiers.push({
      tier: targetRollupKey,
      tierLabel: ROLLUP_LEVEL_LABELS[targetRollupKey],
      dimension: targetDimension,
      isCurrentTier: true,
      isDependencyTier: false,
      steps: deduplicatedSteps,
      sourceTables,
      rollupLogic: targetData.rollupLogic,
    });
  } else {
    // Fallback: no lineage narrative available, just create stub tier
    tiers.push({
      tier: targetRollupKey,
      tierLabel: ROLLUP_LEVEL_LABELS[targetRollupKey],
      dimension: targetDimension,
      isCurrentTier: true,
      isDependencyTier: false,
      steps: [],
      sourceTables: [],
    });
  }

  return {
    metricId,
    targetDimension,
    tiers,
    allSourceTables: Array.from(allSourceTablesMap.values()),
  };
}

/**
 * Build source tables for each tier in the hierarchy for the overview diagram.
 * Returns a map from RollupLevelKey to source tables used at that tier.
 */
export function buildHierarchySourceTables(
  dimensionDataMap: Map<CalculationDimension, DimensionData>
): Map<RollupLevelKey, { layer: string; table: string; fields: string[] }[]> {
  const result = new Map<RollupLevelKey, { layer: string; table: string; fields: string[] }[]>();

  for (const level of ROLLUP_HIERARCHY_LEVELS) {
    const dim = ROLLUP_KEY_TO_DIM[level];
    const data = dimensionDataMap.get(dim);
    if (data?.sourceFields) {
      result.set(level, extractSourceTables(data.sourceFields));
    } else {
      result.set(level, []);
    }
  }

  return result;
}
