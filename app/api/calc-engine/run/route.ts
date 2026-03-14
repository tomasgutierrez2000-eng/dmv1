/**
 * POST /api/calc-engine/run — Run a metric calculation at a given dimension.
 *
 * Replaces the FastAPI /run endpoint from scripts/calc_engine/server.py.
 * Uses YAML formula_sql exclusively (no Python calculators).
 */

import { NextRequest } from 'next/server';
import { jsonSuccess, jsonError, normalizeCaughtError } from '@/lib/api-response';
import { DataLoader } from '@/scripts/calc_engine/data-loader';
import { executeMetricLevel } from '@/scripts/calc_engine/generic-calculator';
import { loadMetricDefinitions } from '@/scripts/calc_engine/loader/yaml-loader';
import type { AggregationLevel } from '@/scripts/calc_engine/types';

const DEFAULT_AS_OF_DATE = process.env.DEFAULT_AS_OF_DATE ?? '2025-01-31';

// Maps incoming dimension aliases to canonical AggregationLevel
const DIMENSION_ALIASES: Record<string, AggregationLevel> = {
  facility: 'facility',
  counterparty: 'counterparty',
  desk: 'desk',
  portfolio: 'portfolio',
  business_segment: 'business_segment',
  lob: 'business_segment',
};

export async function POST(request: NextRequest) {
  let loader: DataLoader | null = null;
  try {
    const body = await request.json() as {
      metric_id?: string;
      dimension?: string;
      as_of_date?: string;
    };

    const metricId = body.metric_id;
    if (!metricId) {
      return jsonError('metric_id is required', { status: 400 });
    }

    const rawDim = body.dimension ?? 'facility';
    const dimension = DIMENSION_ALIASES[rawDim];
    if (!dimension) {
      return jsonError(
        `dimension must be one of: ${Object.keys(DIMENSION_ALIASES).join(', ')}`,
        { status: 400 },
      );
    }

    const asOfDate = body.as_of_date ?? DEFAULT_AS_OF_DATE;

    // Find metric definition
    const { metrics } = loadMetricDefinitions();
    const metric = metrics.find(m =>
      m.metric_id === metricId ||
      m.catalogue?.item_id === metricId ||
      m.legacy_metric_ids?.includes(metricId)
    );

    if (!metric) {
      return jsonError(`Metric not found: ${metricId}`, { status: 422 });
    }

    // Execute
    loader = new DataLoader();
    const result = await executeMetricLevel(metric, dimension, loader, asOfDate);

    // Sanitize NaN/Infinity values
    const sanitizedRows = result.rows.map(row => {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (typeof v === 'number' && !Number.isFinite(v)) {
          clean[k] = null;
        } else {
          clean[k] = v;
        }
      }
      return clean;
    });

    return jsonSuccess({
      metric_id: metricId,
      dimension: rawDim,
      row_count: sanitizedRows.length,
      rows: sanitizedRows,
    });
  } catch (err) {
    const { message, status, details, code } = normalizeCaughtError(err);
    return jsonError(message, { status, details, code });
  } finally {
    if (loader) await loader.close();
  }
}
