import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CALCULATION_DIMENSIONS } from '../data/l3-metrics';
import {
  getMetricForCalculation,
  resolveAllowedDimensions,
  resolveFormulaForDimension,
  runMetricCalculation,
} from '../lib/metrics-calculation';
import { getTableKeysForMetric } from '../lib/metrics-calculation/table-resolver';

const FINALIZED_METRICS = ['C100', 'C101', 'C102', 'C103', 'C104', 'C105', 'C106', 'C107'];
const L1_PATH = path.join(process.cwd(), 'scripts/l1/output/sample-data.json');
const L2_PATH = path.join(process.cwd(), 'scripts/l2/output/sample-data.json');
const canRunSqlIntegration = fs.existsSync(L1_PATH) && fs.existsSync(L2_PATH);

async function main() {
  console.log('Testing calculation engine for finalized metrics...');
  for (const metricId of FINALIZED_METRICS) {
    const metric = getMetricForCalculation(metricId);
    assert.ok(metric, `metric ${metricId} must exist`);
    const allowed = resolveAllowedDimensions(metric);
    assert.ok(allowed.length > 0, `${metricId} must have allowed dimensions`);
    assert.ok(
      allowed.every((d) => CALCULATION_DIMENSIONS.includes(d)),
      `${metricId} has invalid allowed dimensions`
    );

    for (const dim of allowed) {
      const resolved = resolveFormulaForDimension(metric, dim, { allowLegacyFallback: true });
      assert.ok(resolved?.formulaSQL?.trim(), `${metricId}:${dim} must resolve to formulaSQL`);
      const tableKeys = getTableKeysForMetric(metric, dim);
      assert.ok(tableKeys.length > 0, `${metricId}:${dim} must resolve at least one input table`);
    }

    if (canRunSqlIntegration) {
      const result = await runMetricCalculation({
        metric,
        dimension: allowed[0]!,
        asOfDate: null,
      });
      assert.ok('ok' in result, `${metricId} run result shape must include ok`);
      if (!result.ok) {
        assert.fail(`${metricId} integration run failed: ${result.error}`);
      }
    }
  }

  if (!canRunSqlIntegration) {
    console.log('Skipped SQL integration run (sample data not found).');
  }
  console.log('Calculation engine tests passed for all finalized metrics.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
