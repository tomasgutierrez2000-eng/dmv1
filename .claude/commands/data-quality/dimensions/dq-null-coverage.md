---
description: "DQ Null Coverage — measures null percentage for every column in every L2 table and flags violations by column criticality"
---

# DQ Null Coverage

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You measure the null percentage for every column in every L2 table and flag violations based on column criticality tiers. Excessive NULLs in metric-critical fields silently produce zero/NULL metric values that appear as broken formulas.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` for declared schema
3. Read `CLAUDE.md` sections on metric source fields and common bugs (NULL weight propagation, NULL sparsity)
4. If a baseline profile exists at `.claude/audit/dq-baselines/null-coverage.json`, load it for delta comparison

### Column Criticality Tiers

| Tier | Column Types | NULL Threshold | Severity |
|------|-------------|----------------|----------|
| T0 — PK/FK | All `_id` columns in PK or FK constraints | 0% (must be zero) | CRITICAL |
| T1 — Metric-Critical | `pd_pct`, `lgd_pct`, `committed_facility_amt`, `drawn_amount`, `outstanding_balance_amt`, `exposure_at_default_amt`, `risk_weight_std_pct`, `risk_weight_erba_pct`, `bank_share_pct`, `collateral_value_amt`, `market_value_amt` | <= 5% NULL | HIGH |
| T2 — Reporting | `as_of_date`, `currency_code`, `facility_type_code`, `credit_rating_code`, `country_code`, `lob_segment_id`, `counterparty_id`, `legal_entity_id` | <= 10% NULL | HIGH |
| T3 — Audit | `created_ts`, `updated_ts` | <= 10% NULL | LOW |
| T4 — General | All other columns | <= 50% NULL | MEDIUM |
| T5 — Optional | Columns ending in `_comment`, `_notes`, `_description` | No threshold | INFO only |

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/dimensions:dq-null-coverage
/data-quality/dimensions:dq-null-coverage --table l2.facility_risk_snapshot
/data-quality/dimensions:dq-null-coverage --fix
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

### 3A. Enumerate All Tables

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'l2' AND table_type = 'BASE TABLE'
ORDER BY table_name;
"
```

### 3B. Generate Per-Table Null Analysis

For each L2 table, dynamically generate and run a null analysis query. Build the query programmatically from column metadata:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = '{table_name}'
ORDER BY ordinal_position;
"
```

Then for each table, run a single query that computes null stats for all columns at once:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT
  '{table_name}' AS table_name,
  COUNT(*) AS total_rows,
  {for each column: COUNT({col}) AS {col}_non_null}
FROM l2.{table_name};
"
```

For tables with many columns, use the UNION ALL pattern:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT '{col1}' AS col, COUNT(*) AS total, COUNT({col1}) AS non_null,
       ROUND(100.0 * (COUNT(*) - COUNT({col1})) / NULLIF(COUNT(*), 0), 2) AS null_pct
FROM l2.{table_name}
UNION ALL
SELECT '{col2}', COUNT(*), COUNT({col2}),
       ROUND(100.0 * (COUNT(*) - COUNT({col2})) / NULLIF(COUNT(*), 0), 2)
FROM l2.{table_name}
UNION ALL
...
ORDER BY null_pct DESC;
"
```

### 3C. Batch Query for Small Tables

For tables with fewer than 20 columns, use this efficient single-pass approach:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT
  COUNT(*) AS total,
  COUNT(col1) AS col1_nn, COUNT(col2) AS col2_nn, COUNT(col3) AS col3_nn
FROM l2.{table_name};
"
```

### 3D. Classify Findings

For each column with NULL percentage above its tier threshold:

1. Determine the column's criticality tier (T0-T5) using the rules in section 1
2. Compare actual null_pct against the tier's threshold
3. If violated, create a finding with the appropriate severity

### 3E. Cross-Reference with Metric Source Fields

Parse `data/l3-metrics.ts` and `data/metric-library/catalogue.json` to find which metrics depend on each column. If a column is a metric source field AND has high NULL percentage, escalate severity:

```
Column l2.facility_risk_snapshot.pd_pct has 45% NULL
  → Used by metrics: EXP-016 (Expected Loss), RSK-001 (PD Distribution)
  → Escalate to CRITICAL: 45% of metric inputs will produce NULL output
```

### 3F. Empty Tables Detection

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT schemaname || '.' || relname AS table_name, n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'l2'
ORDER BY n_live_tup ASC;
"
```

Tables with 0 rows have 100% effective NULL for all columns — flag as HIGH.

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true`.

### 4A. Safe Default Fills

These columns have well-defined defaults that are safe to apply:

```sql
-- Audit timestamps
UPDATE l2.{table} SET created_ts = CURRENT_TIMESTAMP WHERE created_ts IS NULL;
UPDATE l2.{table} SET updated_ts = CURRENT_TIMESTAMP WHERE updated_ts IS NULL;

-- Boolean flags (default to FALSE)
UPDATE l2.{table} SET {flag_column} = FALSE WHERE {flag_column} IS NULL;

-- Bank share percentage (default 100% = sole lender)
UPDATE l2.{table} SET bank_share_pct = 100.0 WHERE bank_share_pct IS NULL;
```

### 4B. Conditional Fills (require domain knowledge)

```sql
-- Currency code: default to USD for domestic facilities
UPDATE l2.{table} SET currency_code = 'USD'
WHERE currency_code IS NULL
  AND facility_id IN (
    SELECT fm.facility_id FROM l2.facility_master fm
    JOIN l2.counterparty c ON fm.counterparty_id = c.counterparty_id
    WHERE c.country_code = 'US'
  );

-- PD: cannot default — flag for seed data regeneration
-- LGD: cannot default — flag for seed data regeneration
-- Amounts: cannot default to 0 (would distort metrics) — flag for review
```

### 4C. Seed Data Regeneration

For metric-critical columns with >50% NULL, the fix is to regenerate seed data:

```bash
# Regenerate L2 sample data
npm run generate:l2

# Then reload into PostgreSQL
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -f scripts/l2/output/seed.sql
```

### 4D. Fix Execution Pattern

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -c "
BEGIN;
UPDATE l2.{table} SET {column} = {default_value} WHERE {column} IS NULL;
-- Verify change
SELECT COUNT(*) AS remaining_nulls FROM l2.{table} WHERE {column} IS NULL;
COMMIT;
"
```

---

## 5. Output Format

```json
{
  "agent": "dq-null-coverage",
  "run_timestamp": "2026-03-25T10:00:00Z",
  "scope": "all_l2",
  "summary": {
    "tables_checked": 102,
    "columns_checked": 1847,
    "empty_tables": 3,
    "violations": 45,
    "by_severity": {
      "CRITICAL": 5,
      "HIGH": 12,
      "MEDIUM": 18,
      "LOW": 8,
      "INFO": 2
    },
    "by_tier": {
      "T0_pk_fk": { "checked": 200, "violations": 0 },
      "T1_metric_critical": { "checked": 85, "violations": 12 },
      "T2_reporting": { "checked": 120, "violations": 8 },
      "T3_audit": { "checked": 150, "violations": 5 },
      "T4_general": { "checked": 1200, "violations": 18 },
      "T5_optional": { "checked": 92, "violations": 2 }
    }
  },
  "findings": [
    {
      "finding_id": "NC-001",
      "table": "l2.facility_risk_snapshot",
      "column": "pd_pct",
      "severity": "CRITICAL",
      "category": "null_coverage",
      "tier": "T1_metric_critical",
      "total_rows": 2753,
      "null_count": 1240,
      "null_pct": 45.04,
      "threshold_pct": 5.0,
      "affected_metrics": ["EXP-016", "RSK-001", "RSK-003"],
      "fix_type": "seed_data_regeneration",
      "message": "pd_pct has 45% NULL — affects 3 metrics that depend on this field"
    }
  ],
  "column_report": [
    {
      "table": "l2.facility_risk_snapshot",
      "column": "pd_pct",
      "null_pct": 45.04,
      "tier": "T1",
      "status": "FAIL"
    }
  ],
  "fixes_applied": [],
  "delta_from_baseline": {
    "new_findings": 5,
    "resolved_findings": 2,
    "unchanged_findings": 38
  }
}
```

---

## 6. Safety Rules

1. **Never set metric-critical numeric fields to 0** — zero is a valid value that distorts calculations differently from NULL
2. **Never set PD/LGD/amounts to defaults** — these require domain-appropriate values from seed data
3. **Boolean flags CAN safely default to FALSE** — absence of a flag typically means the condition is not met
4. **Audit timestamps CAN safely default to CURRENT_TIMESTAMP**
5. **Always run in a transaction** — ROLLBACK on any error
6. **Always log findings to `.claude/audit/sessions/`**
7. **Cross-reference metric dependencies** before downgrading any finding's severity
8. **Empty tables (0 rows) are always HIGH severity** — they indicate missing data loads, not just NULLs
9. **If running in orchestrator mode**, return JSON payload only
10. **Cap dynamic query generation at 50 columns per UNION ALL** — split into multiple queries for wider tables
