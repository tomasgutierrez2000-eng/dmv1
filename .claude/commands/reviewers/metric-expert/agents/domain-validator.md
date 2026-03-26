Domain Validator — Tier 2 of the Metric Expert gate. Checks metric outputs against GSIB banking domain knowledge: expected ranges, distribution health, outliers, sign correctness, and completeness.

---

## 1. Inputs (from gate coordinator)

- `metric_yaml` — full YAML content (for unit_type, metric_class, domain)
- `batch_id` — the test batch ID in l3.metric_result
- `test_date` — the as_of_date used for testing

## 2. Context Loading (MANDATORY)

### 2a. Read GSIB range registry from CLAUDE.md

```
Read CLAUDE.md — locate the "GSIB Risk Sanity Checks" table in Phase 5D.
```

Parse the table into a lookup structure:

| Metric Type | unit_type | Healthy Range | Warning | Critical |
|------------|-----------|---------------|---------|----------|
| PD (%) | PERCENTAGE | 0.03–2% (IG) | 2–10% (sub-IG) | >10% (distressed) |
| LGD (%) | PERCENTAGE | 30% (sr. secured) – 45% (unsecured) | 50–65% | >70% |
| EL Rate (%) | PERCENTAGE | 0.01–0.5% (IG) | 0.5–2% | >5% (stressed) |
| EL $ | CURRENCY | Proportional to PD×LGD×EAD | — | — |
| DSCR | RATIO | >1.25x | 1.0–1.25x | <1.0x |
| LTV (%) | PERCENTAGE | <65% (CRE) | 65–80% | >80% |
| Exception Rate (%) | PERCENTAGE | <5% | 5–15% | >15% (OCC 2020-36) |
| Utilization (%) | PERCENTAGE | 30–70% typical | >90% | >100% (over-draw) |
| Maturity (days) | DAYS | Industry-dependent | Concentration risk | Wall/cliff |

**THIS IS THE SINGLE SOURCE OF TRUTH.** Do not hardcode ranges — always read from CLAUDE.md at runtime.

### 2b. Map metric to range entry

Use the metric's `domain`, `sub_domain`, `name`, and `unit_type` from the YAML to find the best matching row in the GSIB range table.

Matching priority:
1. Exact name match (e.g., metric name contains "PD" → PD row)
2. Domain + unit_type match (e.g., domain=exposure + unit_type=PERCENTAGE → Utilization or LTV)
3. unit_type only (e.g., CURRENCY → non-negative check)
4. **Fallback:** No match found → apply generic checks only

## 3. Validation Checks

### 3a. Range Check (skip if fallback)

Query L3 test results at facility level:
```bash
source .env && psql "$DATABASE_URL" -c "
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE metric_value BETWEEN {healthy_min} AND {healthy_max}) AS in_range,
    COUNT(*) FILTER (WHERE metric_value < {critical_min} OR metric_value > {critical_max}) AS critical
  FROM l3.metric_result
  WHERE load_batch_id = '{batch_id}'
    AND aggregation_level = 'FACILITY'
    AND metric_value IS NOT NULL;
"
```

| Condition | Result |
|-----------|--------|
| >80% values in healthy range | PASS |
| >50% values in healthy range, 0 critical | PASS_WITH_WARNINGS |
| Any values in critical range | WARNING with list of facility IDs |
| >50% values in critical range | FAIL |

### 3b. Distribution Check

```bash
source .env && psql "$DATABASE_URL" -c "
  SELECT
    ROUND(STDDEV(metric_value)::numeric, 6) AS stddev,
    ROUND(AVG(metric_value)::numeric, 6) AS mean,
    COUNT(DISTINCT ROUND(metric_value::numeric, 2)) AS distinct_values
  FROM l3.metric_result
  WHERE load_batch_id = '{batch_id}'
    AND aggregation_level = 'FACILITY'
    AND metric_value IS NOT NULL;
"
```

| Condition | Result |
|-----------|--------|
| stddev > 0 AND distinct_values > 1 | PASS |
| stddev = 0 OR distinct_values = 1 | WARNING: "All {count} facilities have identical metric value {value}. Seed data may lack diversity." |

### 3c. Outlier Check

```bash
source .env && psql "$DATABASE_URL" -c "
  SELECT dimension_key, metric_value
  FROM l3.metric_result
  WHERE load_batch_id = '{batch_id}'
    AND aggregation_level = 'FACILITY'
    AND (metric_value < {critical_min} OR metric_value > {critical_max})
  ORDER BY metric_value DESC
  LIMIT 10;
"
```

If any outliers found: WARNING with facility IDs and values. Include GSIB interpretation:
- CAR > 50%: "Near-zero RWA denominator — not genuine over-capitalization"
- PD > 10%: "Distressed counterparty — verify this is intentional in seed data"
- LTV > 80%: "Under-collateralized — common for unsecured facilities"

### 3d. Sign Check

Based on `unit_type` from YAML:

| unit_type | Expected sign | Check |
|-----------|--------------|-------|
| CURRENCY | Non-negative | Any metric_value < 0 → WARNING |
| PERCENTAGE | 0–100 | Any metric_value < 0 or > 100 → WARNING |
| RATIO | Non-negative | Any metric_value < 0 → WARNING |
| COUNT | Non-negative integer | Any metric_value < 0 or non-integer → WARNING |
| DAYS | Non-negative | Any metric_value < 0 → WARNING |

```bash
source .env && psql "$DATABASE_URL" -c "
  SELECT COUNT(*) FILTER (WHERE metric_value < 0) AS negative_count,
         COUNT(*) FILTER (WHERE metric_value > 100) AS over_100_count,
         COUNT(*) AS total
  FROM l3.metric_result
  WHERE load_batch_id = '{batch_id}'
    AND aggregation_level = 'FACILITY'
    AND metric_value IS NOT NULL;
"
```

### 3e. Completeness Check

How many active facilities have a value for this metric vs. total active facilities?

```bash
source .env && psql "$DATABASE_URL" -c "
  SELECT
    (SELECT COUNT(*) FROM l2.facility_master WHERE is_active_flag = 'Y') AS total_active,
    (SELECT COUNT(*) FROM l3.metric_result WHERE load_batch_id = '{batch_id}' AND aggregation_level = 'FACILITY') AS has_value,
    ROUND(
      (SELECT COUNT(*) FROM l3.metric_result WHERE load_batch_id = '{batch_id}' AND aggregation_level = 'FACILITY')::numeric
      / NULLIF((SELECT COUNT(*) FROM l2.facility_master WHERE is_active_flag = 'Y'), 0) * 100, 1
    ) AS coverage_pct;
"
```

| Condition | Result |
|-----------|--------|
| coverage > 80% | PASS |
| coverage 50-80% | WARNING: "Only {pct}% of active facilities have a value" |
| coverage < 50% | WARNING: "Low coverage ({pct}%) — metric may have data gaps or restrictive WHERE filters" |
| coverage = 0% | Already caught by SQL Executor (0 rows) |

### 3f. Rollup Consistency

Verify that aggregate levels have fewer rows than detail levels:
```bash
source .env && psql "$DATABASE_URL" -c "
  SELECT aggregation_level, COUNT(*) AS row_count
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

Expected: FACILITY > COUNTERPARTY > DESK > PORTFOLIO > BUSINESS_SEGMENT.
If any level has MORE rows than a lower level: WARNING.

## 4. Fallback Behavior (unknown metric type)

When no GSIB range entry matches this metric:

1. Skip range check (3a) and outlier check (3c)
2. Run distribution check (3b) — stddev=0 is always suspicious
3. Run sign check (3d) — based on unit_type
4. Run completeness check (3e)
5. Run rollup consistency (3f)
6. Add note: "No GSIB range defined for metric type '{domain}/{sub_domain}' with unit_type='{unit_type}'. Consider adding to CLAUDE.md Phase 5D table."

## 5. Output

Return to coordinator:
```json
{
  "tier": "domain",
  "status": "PASS_WITH_WARNINGS",
  "checks": {
    "range": { "status": "PASS", "in_range_pct": 85.2 },
    "distribution": { "status": "PASS", "stddev": 12.45, "distinct_values": 89 },
    "outliers": { "status": "WARNING", "count": 3, "details": ["facility 47: CAR=103% (near-zero RWA)"] },
    "sign": { "status": "PASS", "negative_count": 0 },
    "completeness": { "status": "PASS", "coverage_pct": 92.1 },
    "rollup_consistency": { "status": "PASS" }
  },
  "gsib_range_source": "CLAUDE.md Phase 5D",
  "matched_range_entry": "CAR"
}
```
