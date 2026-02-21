# metric_value_fact population

`l3.metric_value_fact` holds pre-calculated metric values by aggregation level (facility, counterparty, desk, portfolio, lob) for dashboard consumption.

**Population**: Not done by SQL procedures. The application populates this table (or returns equivalent rows on demand) by:

1. For each metric and each allowed dimension, calling the metrics calculation engine (`runMetricCalculation` in `lib/metrics-calculation/engine.ts`).
2. Mapping the result to rows with `aggregation_level` and dimension keys via `buildMetricValueRowsFromRunOutput` in `lib/metrics-value-store.ts`.
3. Inserting into `l3.metric_value_fact` when a database connection is configured, or returning these rows directly from `GET /api/metrics/values` when the store is empty (on-demand fallback).

To run a batch population (when L3 is backed by PostgreSQL), use a Node script or job that iterates metrics and dimensions, runs the calculation, and executes `INSERT INTO l3.metric_value_fact (...) VALUES (...)` for each row.
