import { NextResponse } from 'next/server';
import { getMergedMetrics } from '@/lib/metrics-store';
import {
  getParentMetric,
  getVariant,
  upsertParentMetric,
  saveVariant,
  refreshParentVariantCounts,
} from '@/lib/metric-library/store';
import type { ParentMetric, MetricVariant } from '@/lib/metric-library/types';

const DEFAULT_DOMAIN_ID = 'PR';

/**
 * Migration: creates one parent and one variant per L3 metric (bootstrap).
 * Best practice: for a true "one parent, many variants" setup, create a single parent per concept
 * (e.g. metric_id "DSCR") and multiple variants under it, each with its own rollup_logic
 * (facility → counterparty → desk → portfolio → lob).
 */
export async function POST() {
  const metrics = getMergedMetrics();
  const createdParents: string[] = [];
  const createdVariants: string[] = [];
  const updatedVariants: string[] = [];

  for (const m of metrics) {
    const metricId = m.id;
    const parentExists = getParentMetric(metricId);
    if (!parentExists) {
      const parent: ParentMetric = {
        metric_id: metricId,
        metric_name: m.name,
        definition: m.description ?? '',
        generic_formula: m.formula ?? '',
        metric_class: 'CALCULATED',
        unit_type: 'RATIO',
        direction: 'NEUTRAL',
        risk_appetite_relevant: false,
        rollup_philosophy: 'Not specified',
        rollup_description: '',
        domain_ids: [DEFAULT_DOMAIN_ID],
      };
      upsertParentMetric(parent);
      createdParents.push(metricId);
    }

    const variantExists = getVariant(metricId);
    const variant: MetricVariant = {
      variant_id: metricId,
      variant_name: m.name,
      parent_metric_id: metricId,
      variant_type: 'CALCULATED',
      status: 'ACTIVE',
      version: 'v1.0',
      effective_date: new Date().toISOString().slice(0, 10),
      formula_display: m.formula ?? '',
      formula_specification: m.formulaSQL,
      executable_metric_id: metricId,
      detailed_description: m.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (variantExists) {
      saveVariant({ ...variantExists, ...variant });
      updatedVariants.push(metricId);
    } else {
      saveVariant(variant);
      createdVariants.push(metricId);
    }
  }

  refreshParentVariantCounts();

  return NextResponse.json({
    ok: true,
    metrics_processed: metrics.length,
    parents_created: createdParents.length,
    variants_created: createdVariants.length,
    variants_updated: updatedVariants.length,
    createdParents,
    createdVariants,
    updatedVariants,
  });
}
