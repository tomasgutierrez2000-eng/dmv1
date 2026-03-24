import { describe, it, expect } from 'vitest';
import { buildMetricValueRowsFromRunOutput } from '../metrics-value-store';
import type { RunMetricOutput } from '../metrics-calculation/types';

function makeScalarOutput(value: number): RunMetricOutput {
  return { ok: true, result: { type: 'scalar', value } };
}

function makeTabularOutput(rows: Array<{ dimension_value: string | number; metric_value: number }>): RunMetricOutput {
  return { ok: true, result: { type: 'tabular', rows } };
}

const BASE_ARGS = {
  metricId: 'C001',
  asOfDate: '2025-01-31',
  runVersionId: 'v1',
} as const;

/* ────────────────── buildMetricValueRowsFromRunOutput ────────────────── */

describe('buildMetricValueRowsFromRunOutput', () => {
  it('returns empty array when output is not ok', () => {
    const output: RunMetricOutput = { ok: false, error: 'fail' };
    const rows = buildMetricValueRowsFromRunOutput(
      BASE_ARGS.metricId, 'facility', BASE_ARGS.asOfDate, BASE_ARGS.runVersionId, output
    );
    expect(rows).toEqual([]);
  });

  it('builds single row from scalar result', () => {
    const output = makeScalarOutput(42.5);
    const rows = buildMetricValueRowsFromRunOutput(
      BASE_ARGS.metricId, 'facility', BASE_ARGS.asOfDate, BASE_ARGS.runVersionId, output
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(42.5);
    expect(rows[0].metric_id).toBe('C001');
    expect(rows[0].as_of_date).toBe('2025-01-31');
    expect(rows[0].aggregation_level).toBe('facility');
    // Scalar results set the key field to empty string (not null) — intentional for DB inserts
    expect(rows[0].facility_id).toBe('');
  });

  it('maps dimension to correct key field for facility', () => {
    const output = makeTabularOutput([{ dimension_value: '101', metric_value: 5.5 }]);
    const rows = buildMetricValueRowsFromRunOutput(
      BASE_ARGS.metricId, 'facility', BASE_ARGS.asOfDate, BASE_ARGS.runVersionId, output
    );
    expect(rows[0].facility_id).toBe('101');
    expect(rows[0].counterparty_id).toBeNull();
  });

  it('maps dimension to correct key field for counterparty', () => {
    const output = makeTabularOutput([{ dimension_value: '201', metric_value: 3.0 }]);
    const rows = buildMetricValueRowsFromRunOutput(
      BASE_ARGS.metricId, 'counterparty', BASE_ARGS.asOfDate, BASE_ARGS.runVersionId, output
    );
    expect(rows[0].counterparty_id).toBe('201');
    expect(rows[0].facility_id).toBeNull();
  });

  it('maps L3 dimension to desk_id', () => {
    const output = makeTabularOutput([{ dimension_value: 'D1', metric_value: 10 }]);
    const rows = buildMetricValueRowsFromRunOutput(
      BASE_ARGS.metricId, 'L3', BASE_ARGS.asOfDate, BASE_ARGS.runVersionId, output
    );
    expect(rows[0].desk_id).toBe('D1');
  });

  it('maps L2 dimension to portfolio_id', () => {
    const output = makeTabularOutput([{ dimension_value: 'P1', metric_value: 20 }]);
    const rows = buildMetricValueRowsFromRunOutput(
      BASE_ARGS.metricId, 'L2', BASE_ARGS.asOfDate, BASE_ARGS.runVersionId, output
    );
    expect(rows[0].portfolio_id).toBe('P1');
  });

  it('maps L1 dimension to lob_id', () => {
    const output = makeTabularOutput([{ dimension_value: 'LOB1', metric_value: 30 }]);
    const rows = buildMetricValueRowsFromRunOutput(
      BASE_ARGS.metricId, 'L1', BASE_ARGS.asOfDate, BASE_ARGS.runVersionId, output
    );
    expect(rows[0].lob_id).toBe('LOB1');
  });

  it('handles multiple tabular rows', () => {
    const output = makeTabularOutput([
      { dimension_value: '1', metric_value: 10 },
      { dimension_value: '2', metric_value: 20 },
      { dimension_value: '3', metric_value: 30 },
    ]);
    const rows = buildMetricValueRowsFromRunOutput(
      BASE_ARGS.metricId, 'facility', BASE_ARGS.asOfDate, BASE_ARGS.runVersionId, output
    );
    expect(rows).toHaveLength(3);
    expect(rows.map(r => r.value)).toEqual([10, 20, 30]);
  });

  it('passes variant_id through', () => {
    const output = makeScalarOutput(1);
    const rows = buildMetricValueRowsFromRunOutput(
      BASE_ARGS.metricId, 'facility', BASE_ARGS.asOfDate, BASE_ARGS.runVersionId, output, 'var-1'
    );
    expect(rows[0].variant_id).toBe('var-1');
  });

  it('defaults variant_id to null', () => {
    const output = makeScalarOutput(1);
    const rows = buildMetricValueRowsFromRunOutput(
      BASE_ARGS.metricId, 'facility', BASE_ARGS.asOfDate, BASE_ARGS.runVersionId, output
    );
    expect(rows[0].variant_id).toBeNull();
  });

  it('converts non-numeric metric_value to null', () => {
    const output: RunMetricOutput = {
      ok: true,
      result: { type: 'tabular', rows: [{ dimension_value: '1', metric_value: 'not-a-number' as unknown as number }] },
    };
    const rows = buildMetricValueRowsFromRunOutput(
      BASE_ARGS.metricId, 'facility', BASE_ARGS.asOfDate, BASE_ARGS.runVersionId, output
    );
    expect(rows[0].value).toBeNull();
  });
});
