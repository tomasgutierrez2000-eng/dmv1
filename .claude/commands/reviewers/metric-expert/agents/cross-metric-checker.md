Cross-Metric Checker — Tier 3 of the Metric Expert gate. Verifies mathematical identities across related metrics by joining L3 test results. Includes auto-discovery: when testing a single metric, finds related metrics from the identity registry, runs their formulas, and checks identities.

---

## 1. Inputs (from gate coordinator)

- `metric_id` — the primary metric being tested (e.g., CAP-001)
- `batch_id` — test batch ID in l3.metric_result
- `test_date` — the as_of_date used

## 2. Identity Registry

These are the mathematical relationships that MUST hold across related metrics. Each identity is a SQL query that JOINs l3.metric_result rows by dimension_key across metric_ids.

```yaml
identities:
  - id: IDENT-001
    name: "EL Rate ≈ PD × LGD"
    description: "Expected Loss Rate should equal Probability of Default times Loss Given Default at facility level"
    yaml_ids: [RSK-003, RSK-001, RSK-002]  # EL Rate, PD, LGD
    roles: { el: RSK-003, pd: RSK-001, lgd: RSK-002 }
    level: FACILITY
    tolerance_pct: 5.0
    check_sql: |
      SELECT
        el.dimension_key,
        el.metric_value AS el_rate,
        pd.metric_value AS pd_pct,
        lgd.metric_value AS lgd_pct,
        (pd.metric_value * lgd.metric_value / 100.0) AS expected_el,
        ABS(el.metric_value - (pd.metric_value * lgd.metric_value / 100.0))
          / NULLIF(el.metric_value, 0) * 100.0 AS pct_diff
      FROM l3.metric_result el
      JOIN l3.metric_result pd
        ON pd.dimension_key = el.dimension_key
        AND pd.load_batch_id = el.load_batch_id
        AND pd.metric_id = 'RSK-001'
        AND pd.aggregation_level = 'FACILITY'
      JOIN l3.metric_result lgd
        ON lgd.dimension_key = el.dimension_key
        AND lgd.load_batch_id = el.load_batch_id
        AND lgd.metric_id = 'RSK-002'
        AND lgd.aggregation_level = 'FACILITY'
      WHERE el.load_batch_id = '{batch_id}'
        AND el.metric_id = 'RSK-003'
        AND el.aggregation_level = 'FACILITY'
      ORDER BY pct_diff DESC
      LIMIT 20

  - id: IDENT-002
    name: "Utilization = Drawn / Committed × 100"
    yaml_ids: [EXP-007, EXP-005, EXP-004]  # Utilization, Drawn, Committed
    roles: { util: EXP-007, drawn: EXP-005, committed: EXP-004 }
    level: FACILITY
    tolerance_pct: 1.0
    check_sql: |
      SELECT
        u.dimension_key,
        u.metric_value AS utilization,
        d.metric_value AS drawn,
        c.metric_value AS committed,
        (d.metric_value / NULLIF(c.metric_value, 0) * 100.0) AS expected_util,
        ABS(u.metric_value - (d.metric_value / NULLIF(c.metric_value, 0) * 100.0)) AS abs_diff
      FROM l3.metric_result u
      JOIN l3.metric_result d
        ON d.dimension_key = u.dimension_key
        AND d.load_batch_id = u.load_batch_id
        AND d.metric_id = 'EXP-005'
        AND d.aggregation_level = 'FACILITY'
      JOIN l3.metric_result c
        ON c.dimension_key = u.dimension_key
        AND c.load_batch_id = u.load_batch_id
        AND c.metric_id = 'EXP-004'
        AND c.aggregation_level = 'FACILITY'
      WHERE u.load_batch_id = '{batch_id}'
        AND u.metric_id = 'EXP-007'
        AND u.aggregation_level = 'FACILITY'
      ORDER BY abs_diff DESC
      LIMIT 20

  - id: IDENT-003
    name: "Facility sum = Counterparty total (direct-sum)"
    yaml_ids: ["*"]  # Applies to any direct-sum metric
    level: FACILITY_TO_COUNTERPARTY
    tolerance_pct: 0.01
    description: "For direct-sum rollup metrics, the sum of facility values per counterparty must equal the counterparty-level value (within FX tolerance for multi-currency counterparties)"
    check_sql: |
      SELECT
        cp.dimension_key AS counterparty_id,
        cp.metric_value AS cp_value,
        fac_sum.fac_total,
        ABS(cp.metric_value - fac_sum.fac_total)
          / NULLIF(cp.metric_value, 0) * 100.0 AS pct_diff
      FROM l3.metric_result cp
      JOIN (
        SELECT
          fm.counterparty_id::VARCHAR AS counterparty_id,
          SUM(f.metric_value) AS fac_total
        FROM l3.metric_result f
        JOIN l2.facility_master fm ON fm.facility_id::VARCHAR = f.dimension_key
        WHERE f.load_batch_id = '{batch_id}'
          AND f.metric_id = '{metric_id}'
          AND f.aggregation_level = 'FACILITY'
        GROUP BY fm.counterparty_id
      ) fac_sum ON fac_sum.counterparty_id = cp.dimension_key
      WHERE cp.load_batch_id = '{batch_id}'
        AND cp.metric_id = '{metric_id}'
        AND cp.aggregation_level = 'COUNTERPARTY'
      ORDER BY pct_diff DESC
      LIMIT 20

## 3. Auto-Discovery Flow

When testing a single metric, the cross-metric checker must ensure related metrics have results in the test batch.

### Step 3a: Find applicable identities

Search the identity registry for entries where `yaml_ids` contains the current `metric_id`.

### Step 3b: Identify missing related metrics

For each applicable identity, check which related metrics are NOT yet in the test batch:
```bash
source .env && psql "$DATABASE_URL" -t -c "
  SELECT DISTINCT metric_id
  FROM l3.metric_result
  WHERE load_batch_id = '{batch_id}';
"
```

Compare against required `yaml_ids`. Any missing → need to execute their formulas.

### Step 3c: Execute missing related metrics

For each missing metric:
1. Locate its YAML: `find scripts/calc_engine/metrics -name "{METRIC_ID}.yaml"`
2. Read the YAML, extract the `facility` level `formula_sql`
3. Bind the test date
4. Execute and INSERT into l3.metric_result with the SAME batch_id

```bash
source .env && psql "$DATABASE_URL" -c "
  INSERT INTO l3.metric_result (result_id, run_id, as_of_date, metric_id, aggregation_level, dimension_key, metric_value, unit_type, created_by, load_batch_id)
  SELECT
    nextval('mxtest_seq'),
    '{batch_id}',
    '{test_date}'::date,
    '{related_metric_id}',
    'FACILITY',
    (dimension_key)::VARCHAR,
    metric_value,
    '{unit_type}',
    'metric-expert-xmetric',
    '{batch_id}'
  FROM (
    {related_metric_facility_formula_sql}
  ) AS related_results;
"
```

Note: The temp sequence `mxtest_seq` was created by the SQL Executor. If it doesn't exist (cross-metric checker ran independently), create one:
```bash
source .env && psql "$DATABASE_URL" -c "CREATE TEMP SEQUENCE IF NOT EXISTS mxtest_seq START WITH 950001;"
```

### Step 3d: For IDENT-003 (direct-sum reconciliation)

This identity applies to ANY metric with `rollup_strategy: direct-sum` in its catalogue block. Read the YAML to check if `catalogue.rollup_strategy` is `direct-sum`. If yes, run IDENT-003 using the primary metric's own data (no related metrics needed).

## 4. Identity Execution

For each applicable identity with all required metrics present:

### Step 4a: Run the check SQL
```bash
source .env && psql "$DATABASE_URL" -c "{check_sql with batch_id bound}"
```

### Step 4b: Evaluate results

Parse the output rows. For each row, check if `pct_diff` (or `abs_diff`) exceeds `tolerance_pct`.

| Condition | Result |
|-----------|--------|
| All rows within tolerance | PASS |
| <10% of rows exceed tolerance | PASS_WITH_WARNINGS: "Minor identity deviation in {N} facilities" |
| >10% of rows exceed tolerance | FAIL: "Mathematical identity {name} violated for {N}/{total} facilities" |
| 0 rows returned (no overlapping dimension_keys) | WARNING: "No overlapping facilities between metrics — identity cannot be verified" |

### Step 4c: Report divergent facilities

For FAIL or WARNING, list the top 5 divergent facilities:
```
Identity: EL Rate ≈ PD × LGD
  Facility 47: EL=0.8%, PD=2.1%, LGD=45% → expected EL=0.95% → diff=15.8% (EXCEEDS 5% tolerance)
  Facility 102: EL=0.3%, PD=0.8%, LGD=35% → expected EL=0.28% → diff=7.1% (EXCEEDS 5% tolerance)
```

## 5. Output

Return to coordinator:
```json
{
  "tier": "cross_metric",
  "status": "PASS",
  "identities_checked": 2,
  "identities_passed": 2,
  "identities_failed": 0,
  "identities_skipped": 1,
  "details": [
    {
      "id": "IDENT-001",
      "name": "EL Rate ≈ PD × LGD",
      "status": "PASS",
      "rows_checked": 362,
      "rows_exceeding_tolerance": 0,
      "auto_discovered_metrics": ["RSK-001", "RSK-002"]
    },
    {
      "id": "IDENT-003",
      "name": "Facility sum = Counterparty total",
      "status": "PASS",
      "rows_checked": 98,
      "max_pct_diff": 0.0001
    },
    {
      "id": "IDENT-002",
      "name": "Utilization = Drawn / Committed",
      "status": "SKIPPED",
      "reason": "Primary metric CAP-001 not part of this identity"
    }
  ]
}
```
