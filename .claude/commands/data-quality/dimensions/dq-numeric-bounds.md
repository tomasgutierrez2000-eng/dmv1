---
description: "DQ Numeric Bounds — validates that numeric fields in L2 tables fall within GSIB-realistic ranges for credit risk metrics"
---

# DQ Numeric Bounds

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You validate that every numeric column in L2 tables falls within GSIB-realistic bounds. Out-of-range values indicate seed data bugs (e.g., `pd_pct = 100.5`), unit confusion (basis points stored as percentages), or sign errors (negative amounts). Values outside realistic bounds silently produce nonsensical metric outputs.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` for declared schema
3. Read `CLAUDE.md` section "GSIB Risk Sanity Checks" for domain-specific ranges
4. If a baseline exists at `.claude/audit/dq-baselines/numeric-bounds.json`, load for delta

### GSIB-Realistic Bound Definitions

| Field Pattern | Column Suffix | Min | Max | Unit | Severity |
|--------------|---------------|-----|-----|------|----------|
| `pd_pct` | `_pct` | 0 | 100 | Percentage | CRITICAL |
| `lgd_pct` | `_pct` | 0 | 100 | Percentage | CRITICAL |
| `risk_weight_std_pct` | `_pct` | 0 | 1250 | Percentage | HIGH |
| `risk_weight_erba_pct` | `_pct` | 0 | 1250 | Percentage | HIGH |
| `bank_share_pct` | `_pct` | 0 | 100 | Percentage | HIGH |
| `coverage_ratio_pct` | `_pct` | 0 | 200 | Percentage | MEDIUM |
| `*_pct` (generic) | `_pct` | -100 | 1000 | Percentage | MEDIUM |
| `committed_facility_amt` | `_amt` | 0 | 1e12 | Currency | HIGH |
| `drawn_amount` | `_amt` | 0 | 1e12 | Currency | HIGH |
| `outstanding_balance_amt` | `_amt` | 0 | 1e12 | Currency | HIGH |
| `*_amt` (generic) | `_amt` | -1e12 | 1e12 | Currency | MEDIUM |
| `*_bps` | `_bps` | -1000 | 10000 | Basis Points | MEDIUM |
| `*_rate` | `_rate` | -10 | 100 | Rate | MEDIUM |
| `*_count` | `_count` | 0 | 1e9 | Count | LOW |
| `dscr_*` | (ratio) | 0 | 50 | Ratio | HIGH |
| `ltv_*` | (ratio) | 0 | 200 | Percentage | HIGH |

### Domain-Specific Healthy Ranges (informational, not hard bounds)

| Metric Type | Healthy | Warning | Critical |
|------------|---------|---------|----------|
| PD (%) | 0.03-2% (IG) | 2-10% (sub-IG) | >10% (distressed) |
| LGD (%) | 30% (secured) - 45% (unsecured) | 50-65% | >70% |
| EL Rate (%) | 0.01-0.5% (IG) | 0.5-2% | >5% (stressed) |
| DSCR | >1.25x | 1.0-1.25x | <1.0x |
| LTV (%) | <65% (CRE) | 65-80% | >80% |
| Utilization (%) | 30-70% | >90% | >100% |

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/dimensions:dq-numeric-bounds
/data-quality/dimensions:dq-numeric-bounds --table l2.facility_risk_snapshot
/data-quality/dimensions:dq-numeric-bounds --fix
```

### Mode B: Orchestrator
Receives JSON payload:
```json
{
  "mode": "orchestrator",
  "fix_mode": false,
  "tables": ["l2.facility_risk_snapshot"]
}
```

---

## 3. Check Procedures

### 3A. Enumerate Numeric Columns

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema = 'l2'
  AND data_type IN ('integer', 'bigint', 'numeric', 'double precision', 'real', 'smallint')
ORDER BY table_name, ordinal_position;
"
```

### 3B. Bound Check Per Column

For each numeric column, determine its expected bounds from the suffix and field name, then check:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT
  '{table_name}' AS tbl,
  '{col}' AS col,
  COUNT(*) AS total,
  COUNT({col}) AS non_null,
  MIN({col}) AS min_val,
  MAX({col}) AS max_val,
  ROUND(AVG({col})::numeric, 4) AS avg_val,
  ROUND(STDDEV({col})::numeric, 4) AS stddev_val,
  COUNT(*) FILTER (WHERE {col} < {min_bound}) AS below_min,
  COUNT(*) FILTER (WHERE {col} > {max_bound}) AS above_max,
  COUNT(*) FILTER (WHERE {col} < 0) AS negative_count
FROM l2.{table_name};
"
```

### 3C. Critical Field Deep Dive

For the most important risk fields, run detailed distribution analysis:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- PD Distribution (should be 0-100, concentrated 0.03-10%)
SELECT
  CASE
    WHEN pd_pct <= 0.4 THEN '0-0.4% (Investment Grade)'
    WHEN pd_pct <= 2.0 THEN '0.4-2% (Standard)'
    WHEN pd_pct <= 10.0 THEN '2-10% (Substandard)'
    WHEN pd_pct <= 30.0 THEN '10-30% (Doubtful)'
    WHEN pd_pct <= 100.0 THEN '30-100% (Loss)'
    ELSE '>100% (INVALID)'
  END AS pd_bucket,
  COUNT(*) AS cnt,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS pct
FROM l2.facility_risk_snapshot
WHERE pd_pct IS NOT NULL
GROUP BY 1
ORDER BY MIN(pd_pct);
"
```

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- LGD Distribution (should be 0-100%, concentrated 20-65%)
SELECT
  CASE
    WHEN lgd_pct < 20 THEN '0-20% (Over-secured)'
    WHEN lgd_pct <= 35 THEN '20-35% (Senior Secured)'
    WHEN lgd_pct <= 45 THEN '35-45% (Unsecured)'
    WHEN lgd_pct <= 65 THEN '45-65% (Subordinated)'
    WHEN lgd_pct <= 100 THEN '65-100% (Distressed)'
    ELSE '>100% (INVALID)'
  END AS lgd_bucket,
  COUNT(*) AS cnt,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS pct
FROM l2.facility_risk_snapshot
WHERE lgd_pct IS NOT NULL
GROUP BY 1
ORDER BY MIN(lgd_pct);
"
```

### 3D. Amount Sanity Checks

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Drawn > Committed (should never happen)
SELECT facility_id, as_of_date, drawn_amount, committed_facility_amt
FROM l2.facility_exposure_snapshot
WHERE drawn_amount > committed_facility_amt
  AND committed_facility_amt > 0
LIMIT 10;

-- Negative amounts
SELECT facility_id, as_of_date,
       committed_facility_amt, drawn_amount, outstanding_balance_amt
FROM l2.facility_exposure_snapshot
WHERE committed_facility_amt < 0
   OR drawn_amount < 0
   OR outstanding_balance_amt < 0
LIMIT 10;

-- Extreme outliers (>$1 trillion)
SELECT facility_id, as_of_date, committed_facility_amt
FROM l2.facility_exposure_snapshot
WHERE committed_facility_amt > 1e12
LIMIT 10;
"
```

### 3E. Basis Point vs Percentage Confusion

Detect columns where values suggest unit confusion:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- _pct columns with values > 100 (might be basis points stored as percentage)
SELECT table_name, column_name, MIN(val) AS min_v, MAX(val) AS max_v, AVG(val) AS avg_v
FROM (
  SELECT '{table_name}' AS table_name, '{col}' AS column_name, {col} AS val
  FROM l2.{table_name}
  WHERE {col} IS NOT NULL
) sub
WHERE val > 100
GROUP BY table_name, column_name;
"
```

### 3F. Risk Weight Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Risk weights should be 0-1250% (Basel III max)
SELECT
  'risk_weight_std_pct' AS col,
  COUNT(*) FILTER (WHERE risk_weight_std_pct < 0) AS negative,
  COUNT(*) FILTER (WHERE risk_weight_std_pct > 1250) AS above_max,
  MIN(risk_weight_std_pct) AS min_val,
  MAX(risk_weight_std_pct) AS max_val
FROM l2.facility_risk_snapshot
UNION ALL
SELECT
  'risk_weight_erba_pct',
  COUNT(*) FILTER (WHERE risk_weight_erba_pct < 0),
  COUNT(*) FILTER (WHERE risk_weight_erba_pct > 1250),
  MIN(risk_weight_erba_pct),
  MAX(risk_weight_erba_pct)
FROM l2.facility_risk_snapshot;
"
```

### Severity Classification

| Severity | Condition |
|----------|-----------|
| CRITICAL | PD or LGD outside 0-100% — mathematically invalid, corrupts EL calculations |
| CRITICAL | Drawn amount > committed amount — violates fundamental credit constraint |
| HIGH | Risk weight outside 0-1250% — Basel III violation |
| HIGH | Negative exposure amounts — sign error |
| HIGH | All values identical for metric-critical field (zero variance, from dq-data-distribution overlap) |
| MEDIUM | Generic _pct outside -100 to 1000% — possible unit confusion |
| MEDIUM | _bps values outside -1000 to 10000 — possible percentage stored as bps |
| LOW | Count fields negative — cosmetic |
| INFO | Values in warning range but within hard bounds — flag for domain review |

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true`.

### 4A. Clamp to Bounds (safe for obvious violations)

```sql
-- PD must be 0-100%
UPDATE l2.facility_risk_snapshot
SET pd_pct = GREATEST(0, LEAST(pd_pct, 100))
WHERE pd_pct < 0 OR pd_pct > 100;

-- LGD must be 0-100%
UPDATE l2.facility_risk_snapshot
SET lgd_pct = GREATEST(0, LEAST(lgd_pct, 100))
WHERE lgd_pct < 0 OR lgd_pct > 100;

-- Amounts must be non-negative
UPDATE l2.facility_exposure_snapshot
SET drawn_amount = ABS(drawn_amount)
WHERE drawn_amount < 0;
```

### 4B. Unit Conversion (when unit confusion is detected)

```sql
-- Basis points stored as percentage: divide by 100
UPDATE l2.{table_name}
SET {col} = {col} / 100.0
WHERE {col} > 100 AND '{col}' LIKE '%_pct';

-- Percentage stored as basis points: multiply by 100
UPDATE l2.{table_name}
SET {col} = {col} * 100.0
WHERE {col} < 1 AND '{col}' LIKE '%_bps';
```

### 4C. Fix Drawn > Committed

```sql
-- Cap drawn at committed
UPDATE l2.facility_exposure_snapshot
SET drawn_amount = committed_facility_amt
WHERE drawn_amount > committed_facility_amt AND committed_facility_amt > 0;

-- Recalculate undrawn
UPDATE l2.facility_exposure_snapshot
SET undrawn_amount = committed_facility_amt - drawn_amount
WHERE undrawn_amount IS NOT NULL;
```

### 4D. Seed Data Regeneration

For systemic bound violations (e.g., all PD values are 100.5%), the fix is seed data regeneration. See `dq-data-distribution.md` section 4A.

---

## 5. Output Format

```json
{
  "agent": "dq-numeric-bounds",
  "run_timestamp": "2026-03-25T10:00:00Z",
  "scope": "all_l2",
  "summary": {
    "tables_checked": 102,
    "numeric_columns_checked": 450,
    "violations": 28,
    "by_severity": {
      "CRITICAL": 4,
      "HIGH": 8,
      "MEDIUM": 12,
      "LOW": 3,
      "INFO": 1
    },
    "by_category": {
      "out_of_range": 15,
      "negative_amount": 5,
      "drawn_gt_committed": 3,
      "unit_confusion": 2,
      "extreme_outlier": 3
    }
  },
  "findings": [
    {
      "finding_id": "NB-001",
      "table": "l2.facility_risk_snapshot",
      "column": "pd_pct",
      "severity": "CRITICAL",
      "category": "out_of_range",
      "min_bound": 0,
      "max_bound": 100,
      "actual_min": -0.5,
      "actual_max": 150.3,
      "violations_below": 2,
      "violations_above": 45,
      "total_rows": 2753,
      "violation_pct": 1.71,
      "fix_sql": "UPDATE l2.facility_risk_snapshot SET pd_pct = GREATEST(0, LEAST(pd_pct, 100)) WHERE pd_pct < 0 OR pd_pct > 100;",
      "fix_safety": "safe",
      "message": "47 rows have pd_pct outside valid range [0, 100] — max value 150.3 suggests unit confusion or seed data bug"
    }
  ],
  "distribution_summaries": {
    "pd_pct": {
      "investment_grade": 450,
      "standard": 280,
      "substandard": 120,
      "doubtful": 35,
      "loss": 10,
      "invalid": 47
    }
  },
  "fixes_applied": [],
  "delta_from_baseline": {
    "new_findings": 4,
    "resolved_findings": 1,
    "unchanged_findings": 23
  }
}
```

---

## 6. Safety Rules

1. **Never clamp values without understanding root cause** — clamping pd_pct = 150 to 100 hides a unit confusion bug
2. **Unit conversion fixes are risky** — verify with sample data before bulk UPDATE
3. **Negative amounts may be legitimate** (e.g., net income can be negative) — check column semantics before fixing
4. **Drawn > committed is always a data error** — no legitimate reason for drawn to exceed committed
5. **Risk weight = 1250% is valid** (Basel III floor for unrated exposures) — don't flag as violation
6. **Log all findings to `.claude/audit/sessions/`**
7. **If running in orchestrator mode**, return JSON payload only
8. **Distribution analysis (PD/LGD buckets) is informational** — violations are based on hard bounds, not distribution shape
9. **Always run in a transaction** — ROLLBACK on any error
10. **Cross-reference with dq-data-distribution findings** — zero-variance + out-of-range is a stronger signal than either alone
