Debug and fix a metric calculation issue.

Metric / issue: $ARGUMENTS

## Steps

1. Find the metric in `data/l3-metrics.ts` by ID or name
2. Check `data/metric-library/catalogue.json` for the catalogue item and its `level_definitions`
3. Read the formula resolution chain:
   - `lib/metrics-calculation/formula-resolver.ts` — check if `formulasByDimension` has an override
   - `lib/metrics-calculation/escape-hatch.ts` — check for hardcoded calculator
   - `lib/metrics-calculation/engine.ts` — trace the full calculation pipeline
4. Check `lib/metrics-calculation/sql-runner.ts` for SQL execution issues
5. Verify `sourceFields` reference valid L1/L2 tables and fields in the data dictionary
6. Run `npm run test:calc-engine` to validate
7. Fix the issue and verify the level_logic in catalogue.json is consistent with the formulaSQL
