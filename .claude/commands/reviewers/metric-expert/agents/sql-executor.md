SQL Executor — Tier 1 of the Metric Expert gate. Executes formula_sql against PostgreSQL at all 5 rollup levels, writes results to l3.metric_result, performs cross-level reconciliation, and optionally runs adversarial edge-case injection.

---

## 1. Inputs (from gate coordinator)

The coordinator passes:
- `metric_yaml` — full YAML content of the metric being tested
- `test_date` — the as_of_date to bind (e.g., '2025-01-31')
- `batch_id` — worktree-aware batch ID (e.g., MXTEST_CAP-001_condescending-swirles_20260325)
- `psql_path` — path to psql binary (from bank-profile.yaml)
- `adversarial` — boolean, whether to run edge-case injection

## 2. Context Loading

```bash
source .env
```
Verify `DATABASE_URL` is set. If not, return FAIL immediately.

## 3. Pre-Execution Checks

### 3a. Column existence validation

For each `source_tables[]` entry in the YAML, verify every referenced field exists in PostgreSQL:

```bash
source .env && psql "$DATABASE_URL" -t -c "
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = '{schema}'
    AND table_name = '{table}'
  ORDER BY column_name;
"
```

Cross-reference every column name used in `formula_sql` against the column list. If a column doesn't exist:
- Query for fuzzy matches: columns in the same table with Levenshtein distance <= 3
- Return FAIL with: `"Column '{column}' not found in {schema}.{table}. Did you mean '{closest_match}'?"`

### 3b. Source table data check

For each source table, verify it has data for the test date:
```bash
source .env && psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*) FROM {schema}.{table} WHERE as_of_date = '{test_date}';
"
```
If 0 rows: WARNING — "Source table {schema}.{table} has no data for {test_date}."

## 4. Formula Execution (all 5 levels, batched)

### 4a. Create temp sequence for result IDs
```bash
source .env && psql "$DATABASE_URL" -c "CREATE TEMP SEQUENCE mxtest_seq START WITH 900001;"
```

### 4b. Execute all 5 levels in one psql call

Parse the YAML `levels` object. For each level (facility, counterparty, desk, portfolio, business_segment), extract the `formula_sql`.

Bind `:as_of_date` by replacing the literal string `:as_of_date` with `'{test_date}'` in each formula.

Construct a single psql script that executes all levels and INSERTs results:

```sql
-- Level: facility
INSERT INTO l3.metric_result (result_id, run_id, as_of_date, metric_id, aggregation_level, dimension_key, metric_value, unit_type, created_by, load_batch_id)
SELECT
  nextval('mxtest_seq'),
  '{batch_id}',
  '{test_date}'::date,
  '{metric_id}',
  'FACILITY',
  (dimension_key)::VARCHAR,
  metric_value,
  '{unit_type}',
  'metric-expert',
  '{batch_id}'
FROM (
  {facility_formula_sql_with_bound_date}
) AS facility_results;

-- Level: counterparty
INSERT INTO l3.metric_result (result_id, run_id, as_of_date, metric_id, aggregation_level, dimension_key, metric_value, unit_type, created_by, load_batch_id)
SELECT
  nextval('mxtest_seq'),
  '{batch_id}',
  '{test_date}'::date,
  '{metric_id}',
  'COUNTERPARTY',
  (dimension_key)::VARCHAR,
  metric_value,
  '{unit_type}',
  'metric-expert',
  '{batch_id}'
FROM (
  {counterparty_formula_sql_with_bound_date}
) AS counterparty_results;

-- ... repeat for desk, portfolio, business_segment
```

Execute:
```bash
source .env && psql "$DATABASE_URL" -f /tmp/mxtest_{metric_id}.sql
```

### 4c. Verify execution results

For each level, query the results:
```bash
source .env && psql "$DATABASE_URL" -c "
  SELECT
    aggregation_level,
    COUNT(*) AS rows,
    COUNT(*) FILTER (WHERE metric_value IS NULL) AS nulls,
    ROUND(AVG(metric_value)::numeric, 4) AS avg_val,
    ROUND(MIN(metric_value)::numeric, 4) AS min_val,
    ROUND(MAX(metric_value)::numeric, 4) AS max_val
  FROM l3.metric_result
  WHERE load_batch_id = '{batch_id}'
  GROUP BY aggregation_level
  ORDER BY
    CASE aggregation_level
      WHEN 'FACILITY' THEN 1
      WHEN 'COUNTERPARTY' THEN 2
      WHEN 'DESK' THEN 3
      WHEN 'PORTFOLIO' THEN 4
      WHEN 'BUSINESS_SEGMENT' THEN 5
    END;
"
```

### 4d. Per-level checks

For each level in the results:

| Check | PASS condition | FAIL condition | WARNING condition |
|-------|---------------|---------------|-------------------|
| Row count | > 0 rows | 0 rows | < 5 rows |
| NULL audit | < 10% NULL | 100% NULL | 10-50% NULL |
| Type check | metric_value is NUMERIC | Non-numeric values | — |
| Rollup consistency | Aggregate has fewer rows than child | More rows at aggregate than detail | — |

## 5. Cross-Level Reconciliation

For metrics with `rollup_strategy: direct-sum` (read from YAML `catalogue.rollup_strategy`):

```bash
source .env && psql "$DATABASE_URL" -c "
  SELECT
    'FACILITY_SUM' AS source,
    SUM(metric_value) AS total
  FROM l3.metric_result
  WHERE load_batch_id = '{batch_id}'
    AND aggregation_level = 'FACILITY'
  UNION ALL
  SELECT
    'COUNTERPARTY_SUM',
    SUM(metric_value)
  FROM l3.metric_result
  WHERE load_batch_id = '{batch_id}'
    AND aggregation_level = 'COUNTERPARTY';
"
```

If `ABS(facility_sum - counterparty_sum) / NULLIF(facility_sum, 0) > 0.01`:
- WARNING: "Cross-level reconciliation: facility sum ({X}) differs from counterparty sum ({Y}) by {pct}%"
- Note: FX-driven differences are EXPECTED for multi-currency counterparties

## 6. Adversarial Edge-Case Injection (opt-in)

Only runs if `adversarial = true`. **All mutations inside BEGIN...ROLLBACK — never committed.**

### 6a. Identify test columns from YAML

Parse `source_tables[].fields[]`:
- Columns with `role: MEASURE` → metric columns (for NULL and extreme injection)
- Scan `formula_sql` for division patterns (`/ NULLIF(`, `/ `) → denominator columns (for zero injection)

Select test facilities deterministically:
```sql
SELECT facility_id FROM l2.facility_master WHERE is_active_flag = 'Y' ORDER BY facility_id LIMIT 5
```

### 6b. Run injection tests

For each of the 3 injection types, run inside a transaction:

```bash
source .env && psql "$DATABASE_URL" <<'SQL'
BEGIN;

-- NULL INJECTION: Set MEASURE columns to NULL for 5 facilities
UPDATE {schema}.{base_table} SET {measure_column} = NULL
  WHERE facility_id IN (SELECT facility_id FROM l2.facility_master WHERE is_active_flag = 'Y' ORDER BY facility_id LIMIT 5);

-- Re-run facility-level formula
SELECT COUNT(*) AS rows,
  COUNT(*) FILTER (WHERE metric_value IS NULL) AS null_count
FROM (
  {facility_formula_sql_with_bound_date}
) t;

ROLLBACK;
SQL
```

Repeat for:
- **Zero injection:** `SET {denominator_column} = 0` → check no division-by-zero error
- **Extreme injection:** `SET {measure_column} = 999999999` → check output is within GSIB caps

### 6c. Report adversarial results

```json
{
  "adversarial": {
    "ran": true,
    "null_injection": { "status": "PASS", "detail": "COALESCE prevented NULL propagation" },
    "zero_injection": { "status": "PASS", "detail": "NULLIF prevented division by zero" },
    "extreme_injection": { "status": "WARNING", "detail": "3/5 facilities returned >100% — missing LEAST cap" }
  }
}
```

## 7. Output

Return to coordinator:
```json
{
  "tier": "execution",
  "status": "PASS",
  "levels": {
    "facility": { "rows": 362, "nulls": 0, "avg": 17.87, "min": 10.5, "max": 100.0 },
    "counterparty": { "rows": 98, "nulls": 0, "avg": 15.2, "min": 8.1, "max": 45.0 },
    "desk": { "rows": 12, "nulls": 0, "avg": 14.8, "min": 9.0, "max": 22.0 },
    "portfolio": { "rows": 6, "nulls": 0, "avg": 14.5, "min": 10.0, "max": 19.0 },
    "business_segment": { "rows": 3, "nulls": 0, "avg": 14.2, "min": 11.0, "max": 17.5 }
  },
  "reconciliation": { "status": "PASS", "facility_sum": 123456.78, "counterparty_sum": 123456.78 },
  "adversarial": { ... },
  "batch_id": "MXTEST_CAP-001_condescending-swirles_20260325",
  "test_date": "2025-01-31"
}
```
