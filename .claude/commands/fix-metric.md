Debug and fix a metric calculation issue.

Metric / issue: $ARGUMENTS

## Steps

1. Find the metric in `data/l3-metrics.ts` by ID or name
2. Check `data/metric-library/catalogue.json` for the catalogue item and its `level_definitions`
3. Check the YAML source at `scripts/calc_engine/metrics/{domain}/{METRIC_ID}.yaml`
4. Read the formula resolution chain:
   - `lib/metrics-calculation/formula-resolver.ts` — check if `formulasByDimension` has an override
   - `lib/metrics-calculation/escape-hatch.ts` — check for hardcoded calculator
   - `lib/metrics-calculation/engine.ts` — trace the full calculation pipeline
5. Check `lib/metrics-calculation/sql-runner.ts` for SQL execution issues
6. Verify `sourceFields` reference valid L1/L2 tables and fields in the data dictionary
7. Run `npm run test:calc-engine` to validate
8. Fix the issue and verify the level_logic in catalogue.json is consistent with the formulaSQL

## Common Root Causes (check these first)

### "undefined" in results or empty/null metric_value
- **Case-sensitive table key filter**: `getDistinctAsOfDates` in sql-runner may filter for uppercase `L2.` but receive lowercase `l2.table`. Check that all table key comparisons are case-insensitive.
- **`:as_of_date` binds to empty string**: If `getDistinctAsOfDates` returns no dates, the parameter binds to `''` → WHERE matches nothing → 0 rows → scalar null result. Verify sample data has `as_of_date` values.
- **Scalar result missing fields**: If sql-runner returns a scalar result (0 or 1 row), the execute route must still include `dimension_key` in the response row. Check `app/api/metrics/studio/execute/route.ts` line ~93.

### Metric returns all zeros or single value
- **Seed data lacks diversity**: Run `SELECT COUNT(DISTINCT field) FROM l2.table` for key metric fields. Common: `pd_annual` all < 0.06% (100% IG), `facility_type_id` all = 12 (Unknown), `bank_share_pct` all = 1.0.
- **Boolean flags all same value**: Check `is_pricing_exception_flag`, `defaulted_flag` etc. have both TRUE and FALSE.
- **Wrong dim table range**: JOIN to dim table matches 0 rows because FK values fall outside dim PK range.

### Metric has high NULL rate (>20%)
- **Legitimate NULLs from NULLIF**: Ratio metrics (CAR, utilization) produce NULL when denominator is zero (undrawn commitments, 0% risk-weight). Check if the `NOT_NULL` validation severity should be `WARNING` instead of `ERROR`.
- **Missing LEFT JOIN data**: Confirm all source tables have data for the test `as_of_date`.
- **NULL weight propagation**: `SUM(x * y)` returns NULL if ANY term is NULL. Use `COALESCE(weight, 0)` on weighting fields.

### PG mode fails but Demo (sql.js) works
- **`:as_of_date` parameter syntax**: PG doesn't understand sql.js bind syntax. The execute route should replace `:as_of_date` with an actual date. Check `app/api/metrics/studio/execute/route.ts` executePG function.
- **Schema prefix differences**: sql.js uses `l2_table_name` (underscore) but PG uses `l2.table_name` (dot with search_path).
- **Type differences**: sql.js stores booleans as `'Y'`/`'N'` TEXT but PG uses BOOLEAN. Use `= 'Y'` which works in both.

### GSIB Sanity Check Failures
Verify output magnitudes match domain expectations:
- **PD**: 0.03–2% (IG), 2–10% (sub-IG), >10% (distressed)
- **Capital ratios**: 8–20% typical, >50% suspicious (check denominator)
- **All-in rate**: 1–25% range, varies by product type
- **Risk rating tier**: Should span multiple tiers (1–5), not all = 1
- **Counts**: Should have variance — if all facilities have exactly 1 position, seed data is sparse
