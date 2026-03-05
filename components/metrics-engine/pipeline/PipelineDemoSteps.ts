import type { GenericDemoStep } from '@/components/metric-library/demo/useDemoEngine';
import { DIMENSION_PIPELINES, PIPELINE_TABLES } from './dscrPipelineData';
import type { CalculationDimension } from '@/data/l3-metrics';

/* ═══════════════════════════════════════════════════════════════════════════
 * Demo steps for the DSCR Pipeline view.
 *
 * Generated dynamically per dimension — each step targets a
 * data-pipeline="..." element on the page.
 *
 * Variant = CalculationDimension (facility, counterparty, L3, L2, L1)
 * ═══════════════════════════════════════════════════════════════════════════ */

export function buildPipelineDemoSteps(dim: CalculationDimension): GenericDemoStep<CalculationDimension>[] {
  const pipeline = DIMENSION_PIPELINES[dim];
  const steps: GenericDemoStep<CalculationDimension>[] = [];

  // Phase 0: Welcome (variant picker placeholder — we skip variant picker and start demo directly)
  steps.push({
    id: 'welcome',
    phase: 1,
    phaseLabel: 'Introduction',
    title: `DSCR Pipeline — ${pipeline.label}`,
    narration: `This demo walks through each step of the Python pipeline that computes the DSCR metric at the ${pipeline.label} level.\n\n${pipeline.description}.\n\nPress → to begin.`,
    targetSelector: '[data-pipeline="flow-container"]',
  });

  // Phase 1: Source tables
  let stepNum = 1;
  for (const tid of pipeline.tables) {
    const table = PIPELINE_TABLES[tid];
    if (!table) continue;
    steps.push({
      id: `table-${tid}`,
      phase: 2,
      phaseLabel: 'Source Data',
      title: `${table.layer}.${table.name}`,
      narration: `This ${table.layer === 'L1' ? 'reference' : 'snapshot'} table provides the following fields for this calculation:\n\n${table.fields
        .map((f) => `• ${f.name} — e.g. ${f.sampleValue}`)
        .join('\n')}`,
      targetSelector: `[data-pipeline="table-${tid}"]`,
      insight: table.layer === 'L2'
        ? 'L2 tables hold atomic, point-in-time snapshots — raw data, never calculated.'
        : 'L1 tables hold reference/dimension data — rarely changes, used for joins and lookups.',
    });
    stepNum++;
  }

  // Phase 2: Pipeline steps
  for (const pipeStep of pipeline.steps) {
    steps.push({
      id: `step-${pipeStep.id}`,
      phase: 3,
      phaseLabel: 'Python Logic',
      title: pipeStep.title,
      narration: pipeStep.narration + (pipeStep.inputTableIds.length > 0
        ? `\n\nReads from: ${pipeStep.inputTableIds.map((t) => PIPELINE_TABLES[t]?.name ?? t).join(', ')}`
        : ''),
      targetSelector: `[data-pipeline="step-${pipeStep.id}"]`,
      insight: pipeStep.phase === 'BRANCH'
        ? 'This branching logic is what makes DSCR product-aware — CRE and C&I have different income measures.'
        : pipeStep.phase === 'AGGREGATE'
          ? 'Exposure-weighted averaging ensures larger loans contribute more to the aggregate DSCR.'
          : pipeStep.phase === 'TRAVERSE'
            ? 'The hierarchy traversal walks up the enterprise_business_taxonomy to resolve parent segments.'
            : undefined,
    });
    stepNum++;
  }

  // Phase 3: Output
  steps.push({
    id: 'output',
    phase: 4,
    phaseLabel: 'Output',
    title: `DSCR per ${pipeline.label}`,
    narration: `The pipeline produces one DSCR value per ${pipeline.label.toLowerCase()}. Values above 1.0x indicate the entity generates enough income to cover its debt obligations.\n\nClick "Calculation Results" below to see the actual computed values from the sample data.`,
    targetSelector: '[data-pipeline="output"]',
    insight: 'A DSCR below 1.0x is a red flag — the entity cannot service its debt from current income.',
  });

  return steps;
}

/** Resolve demo selectors (no variant substitution needed — dim is fixed) */
export function resolvePipelineSelector(selector: string, _dim: CalculationDimension): string {
  return selector;
}
