---
description: "DQ Categorical Diversity — validates that VARCHAR code/status columns in L2 have diverse values matching L1 dim table entries"
---

# DQ Categorical Diversity

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You validate that every VARCHAR code/status column in L2 tables has sufficient value diversity, that FK code values match L1 dim table entries, and that no single value dominates >90% of rows. Low categorical diversity causes metric GROUP BY aggregations to produce a single bucket, making rollup-by-dimension useless.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` for declared schema and FK relationships
3. Read `CLAUDE.md` sections on "Dimension diversity", "FK value range mismatch", and "Dim chain completeness"
4. If a baseline exists at `.claude/audit/dq-baselines/categorical-diversity.json`, load for delta

### Key Categorical Columns (metric-impacting)

| Column | Table | Dim Table (FK) | Expected Diversity |
|--------|-------|----------------|-------------------|
| `currency_code` | facility_exposure_snapshot | currency_dim | 5+ currencies |
| `facility_type_code` | facility_master | facility_type_dim | 8+ types |
| `credit_rating_code` | counterparty_rating_observation | rating_scale_dim | 15+ ratings |
| `country_code` | counterparty | country_dim | 20+ countries |
| `lob_segment_id` | facility_master | enterprise_business_taxonomy | All leaf nodes |
| `industry_id` | counterparty | industry_dim | 10+ industries |
| `entity_type_code` | counterparty | entity_type_dim | 5+ types |
| `fr2590_category_code` | facility_master | fr2590_category_dim | 11 categories |
| `dpd_bucket_code` | facility_delinquency_snapshot | dpd_bucket_dim | 5 FFIEC buckets |
| `pricing_tier_code` | facility_pricing_snapshot | pricing_tier_dim | 5+ tiers |

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/dimensions:dq-categorical-diversity
/data-quality/dimensions:dq-categorical-diversity --table l2.facility_master
/data-quality/dimensions:dq-categorical-diversity --fix
```

### Mode B: Orchestrator
Receives JSON payload:
```json
{
  "mode": "orchestrator",
  "fix_mode": false,
  "tables": ["l2.facility_master"]
}
```

---

## 3. Check Procedures

### 3A. Enumerate All Categorical Columns

Identify VARCHAR columns that are likely categorical (codes, statuses, types):

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT table_name, column_name, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'l2'
  AND data_type = 'character varying'
  AND (column_name LIKE '%_code' OR column_name LIKE '%_type' OR column_name LIKE '%_status'
       OR column_name LIKE '%_category' OR column_name LIKE '%_class' OR column_name LIKE '%_tier'
       OR column_name LIKE '%_grade' OR column_name LIKE '%_bucket' OR column_name LIKE '%_group')
ORDER BY table_name, column_name;
"
```

### 3B. Value Distribution Per Column

For each categorical column, get the value distribution:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT
  {col} AS value,
  COUNT(*) AS cnt,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS pct
FROM l2.{table_name}
WHERE {col} IS NOT NULL
GROUP BY {col}
ORDER BY cnt DESC
LIMIT 20;
"
```

### 3C. Diversity Metrics

For each categorical column, compute diversity statistics:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT
  '{table_name}' AS tbl,
  '{col}' AS col,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT {col}) AS distinct_values,
  COUNT(*) FILTER (WHERE {col} IS NULL) AS null_count,
  MODE() WITHIN GROUP (ORDER BY {col}) AS mode_value,
  ROUND(100.0 * MAX(cnt) / NULLIF(SUM(cnt), 0), 2) AS max_concentration_pct
FROM (
  SELECT {col}, COUNT(*) AS cnt
  FROM l2.{table_name}
  WHERE {col} IS NOT NULL
  GROUP BY {col}
) sub;
"
```

### 3D. Dim Table Match Rate

For each categorical column with a known FK to an L1 dim table, check match rate:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Example: facility_type_code → facility_type_dim
SELECT
  COUNT(*) AS total_l2_rows,
  COUNT(d.facility_type_code) AS matched_rows,
  COUNT(*) - COUNT(d.facility_type_code) AS unmatched_rows,
  ROUND(100.0 * COUNT(d.facility_type_code) / NULLIF(COUNT(*), 0), 2) AS match_pct
FROM l2.facility_master fm
LEFT JOIN l1.facility_type_dim d ON fm.facility_type_code = d.facility_type_code
WHERE fm.facility_type_code IS NOT NULL;
"
```

### 3E. Dim Table Coverage (reverse check)

Check how many L1 dim table entries are actually used by L2 data:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Example: which facility_type_dim entries are used vs unused
SELECT
  d.facility_type_code,
  d.facility_type_name,
  COUNT(fm.facility_id) AS l2_usage_count
FROM l1.facility_type_dim d
LEFT JOIN l2.facility_master fm ON d.facility_type_code = fm.facility_type_code
GROUP BY d.facility_type_code, d.facility_type_name
ORDER BY l2_usage_count ASC;
"
```

### 3F. Single-Value Column Detection

Use pg_stats for efficient detection:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT tablename, attname, n_distinct, most_common_vals, most_common_freqs
FROM pg_stats
WHERE schemaname = 'l2'
  AND (attname LIKE '%_code' OR attname LIKE '%_type' OR attname LIKE '%_status')
  AND n_distinct = 1
ORDER BY tablename, attname;
"
```

### 3G. Placeholder Value Detection

Detect seed generator fallback values in code columns:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT '{table_name}' AS tbl, '{col}' AS col, {col} AS value, COUNT(*) AS cnt
FROM l2.{table_name}
WHERE {col} ~ '^[a-z_]+_[0-9]+$'
   OR {col} ~ '^[a-z_]+_code_[0-9]+$'
GROUP BY {col}
HAVING COUNT(*) > 0
ORDER BY cnt DESC
LIMIT 10;
"
```

### Severity Classification

| Severity | Condition |
|----------|-----------|
| CRITICAL | FK code column has <95% match rate to dim table — silent NULL-out in joins |
| CRITICAL | Placeholder values detected (e.g., 'pricing_tier_code_1') — FK joins fail |
| HIGH | Single-value categorical column — GROUP BY produces one bucket |
| HIGH | >90% concentration on one value — near-zero diversity |
| MEDIUM | <50% of dim table entries used by L2 data — limited coverage |
| MEDIUM | >80% concentration on one value |
| LOW | <5 distinct values in column with 10+ possible dim entries |
| INFO | Good diversity matching expected GSIB distribution |

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true`.

### 4A. Diversify Single-Value Code Columns

```sql
-- Distribute across available dim table values
UPDATE l2.{table_name}
SET {code_col} = (
  SELECT {pk_col}
  FROM l1.{dim_table}
  ORDER BY {pk_col}
  OFFSET ({table_name}_id % (SELECT COUNT(*) FROM l1.{dim_table}))
  LIMIT 1
)
WHERE {code_col} = '{single_value}';
```

### 4B. Fix Placeholder Values

```sql
-- Replace placeholder values with valid dim table entries
UPDATE l2.{table_name}
SET {code_col} = (
  SELECT {pk_col}
  FROM l1.{dim_table}
  ORDER BY {pk_col}
  OFFSET (HASHTEXT({code_col}) % (SELECT COUNT(*) FROM l1.{dim_table}))
  LIMIT 1
)
WHERE {code_col} ~ '^[a-z_]+_[0-9]+$';
```

### 4C. Expand Dim Table (when dim table is too small)

```sql
-- First check if dim table needs more entries
SELECT COUNT(*) FROM l1.{dim_table};

-- If too few entries, add more (FK-safe: INSERT new rows, never DELETE)
INSERT INTO l1.{dim_table} ({pk_col}, {name_col}, {other_cols})
VALUES
  ('{new_code_1}', '{New Name 1}', ...),
  ('{new_code_2}', '{New Name 2}', ...);
```

### 4D. Fix FK Mismatches

```sql
-- Map unmatched values to closest dim table entry
UPDATE l2.{table_name} t
SET {code_col} = (
  SELECT d.{pk_col}
  FROM l1.{dim_table} d
  ORDER BY SIMILARITY(d.{name_col}, t.{code_col}) DESC
  LIMIT 1
)
WHERE {code_col} NOT IN (SELECT {pk_col} FROM l1.{dim_table})
  AND {code_col} IS NOT NULL;
```

---

## 5. Output Format

```json
{
  "agent": "dq-categorical-diversity",
  "run_timestamp": "2026-03-25T10:00:00Z",
  "scope": "all_l2",
  "summary": {
    "tables_checked": 102,
    "categorical_columns_checked": 85,
    "single_value_columns": 6,
    "high_concentration_columns": 12,
    "low_dim_match_columns": 4,
    "placeholder_columns": 3,
    "by_severity": {
      "CRITICAL": 5,
      "HIGH": 10,
      "MEDIUM": 8,
      "LOW": 6,
      "INFO": 15
    }
  },
  "findings": [
    {
      "finding_id": "CD-001",
      "table": "l2.facility_master",
      "column": "fr2590_category_code",
      "severity": "HIGH",
      "category": "single_value",
      "distinct_values": 1,
      "total_rows": 410,
      "single_value": "G1_B",
      "dim_table": "l1.fr2590_category_dim",
      "dim_table_entries": 11,
      "dim_coverage_pct": 9.09,
      "message": "fr2590_category_code has single value 'G1_B' for all 410 rows — only 1 of 11 FR2590 categories used"
    },
    {
      "finding_id": "CD-002",
      "table": "l2.counterparty",
      "column": "industry_id",
      "severity": "CRITICAL",
      "category": "fk_mismatch",
      "match_rate_pct": 42.5,
      "total_rows": 100,
      "unmatched_rows": 58,
      "dim_table": "l1.industry_dim",
      "sample_unmatched": [1, 2, 3, 4, 5],
      "dim_pk_range": "11-92",
      "message": "industry_id has 42.5% match rate to industry_dim — L2 uses values 1-10 but dim uses NAICS codes 11+"
    }
  ],
  "dim_coverage_report": [
    {
      "l2_table": "l2.facility_master",
      "l2_column": "facility_type_code",
      "dim_table": "l1.facility_type_dim",
      "dim_total_entries": 15,
      "dim_used_entries": 8,
      "coverage_pct": 53.3
    }
  ],
  "fixes_applied": [],
  "delta_from_baseline": {
    "new_findings": 3,
    "resolved_findings": 2,
    "unchanged_findings": 15
  }
}
```

---

## 6. Safety Rules

1. **Never UPDATE FK code columns without verifying the new value exists in the dim table** — orphan FKs are worse than low diversity
2. **Never DELETE from dim tables** — use INSERT to add entries (FK-safe dim expansion)
3. **Placeholder detection regex must be conservative** — `^[a-z_]+_[0-9]+$` avoids false positives on legitimate codes
4. **HASHTEXT-based distribution is deterministic** — same input always maps to same dim entry
5. **Log all findings to `.claude/audit/sessions/`**
6. **If running in orchestrator mode**, return JSON payload only
7. **Dim table expansion requires corresponding seed data updates** — adding entries to `industry_dim` also means updating `scripts/l1/seed-data.ts`
8. **Cross-reference with dq-data-distribution** — categorical single-value is a subset of zero-variance
9. **Some single-value columns are legitimate** — e.g., `base_currency_code = 'USD'` for a US bank is correct
10. **Match rate <95% is the threshold for CRITICAL** — based on CLAUDE.md "Dim chain completeness" guidance

---

## 7. Regression Cases (Lessons Learned — 2026-03-25)

These specific categorical diversity failures were found and fixed in the first DQ run:

| Table | Column | Issue | Fix Applied |
|-------|--------|-------|-------------|
| `facility_master` | `facility_type_id` | ALL 362 rows = 12 ("Unknown") — single inactive type | Distributed across 10 active types by GSIB portfolio mix using `facility_id % 100` |
| `amendment_event` | `amendment_type_code` | ALL 390 rows = 'WAIVER' | Distributed across all 10 `amendment_type_dim` codes using `amendment_id % 10` |
| `facility_exposure_snapshot` | `bank_share_pct` | ALL 1086 rows = 1.0 (100%) — zero syndication | Set 5 tiers (35%, 50%, 65%, 80%, 100%) using `facility_id % 5` |
| `counterparty_rating_observation` | `rating_value` | 66.7% = '0' (invalid placeholder) | Mapped to rating_scale_dim grades (2-17) via internal_risk_rating correlation |
| `collateral_snapshot` | `crm_type_code` | ALL rows = 'CASH_COLL' — single collateral type | Added RE_MORTGAGE, PHYS_COLL, REC_COLL, FIN_COLL for new assets |

**Key lesson:** When fixing FK code values, ALWAYS query the dim table FIRST to get valid codes:
```sql
SELECT {pk_col}, {name_col} FROM l1.{dim_table} WHERE is_active_flag = true ORDER BY 1;
```
The first DQ run hit FK constraint violations when using assumed codes ('REPRICING') that didn't exist in `amendment_type_dim` (actual code was 'PRICING').
