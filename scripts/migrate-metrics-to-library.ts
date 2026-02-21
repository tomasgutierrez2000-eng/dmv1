/**
 * One-time migration: create library parents and variants for every L3 metric
 * from getMergedMetrics(). Run: npx tsx scripts/migrate-metrics-to-library.ts
 */

import { getMergedMetrics } from '../lib/metrics-store';
import {
  getParentMetric,
  getVariant,
  upsertParentMetric,
  saveVariant,
  refreshParentVariantCounts,
} from '../lib/metric-library/store';
import type { ParentMetric, MetricVariant } from '../lib/metric-library/types';

const DEFAULT_DOMAIN_ID = 'PR';

function main() {
  const metrics = getMergedMetrics();
  let parentsCreated = 0;
  let variantsCreated = 0;
  let variantsUpdated = 0;

  for (const m of metrics) {
    const metricId = m.id;
    if (!getParentMetric(metricId)) {
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
      parentsCreated++;
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
      variantsUpdated++;
    } else {
      saveVariant(variant);
      variantsCreated++;
    }
  }

  refreshParentVariantCounts();

  console.log('Migration complete.');
  console.log('  Metrics processed:', metrics.length);
  console.log('  Parents created:', parentsCreated);
  console.log('  Variants created:', variantsCreated);
  console.log('  Variants updated:', variantsUpdated);
}

main();
