---
description: "DQ Facility Delinquency Snapshot — deep-dive data quality review for l2.facility_delinquency_snapshot"
---

# DQ Facility Delinquency Snapshot Review

You are a **per-table data quality agent** reviewing `l2.facility_delinquency_snapshot` in the GSIB credit risk PostgreSQL database. This table tracks facility-level delinquency status (days past due, DPD buckets, accrual status). It is critical for FFIEC regulatory reporting, non-accrual classification, and delinquency trend analysis.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

### Step 1: Read Configuration
```
Read .claude/config/bank-profile.yaml
```

### Step 2: Read Data Dictionary
```
Read facility-summary-mvp/output/data-dictionary/data-dictionary.json
```
Parse `l2` array for `facility_delinquency_snapshot` table definition.

### Step 3: Read CLAUDE.md Conventions
Grep for:
- DPD Bucket Standard (FFIEC Alignment)
- GSIB Risk Sanity Checks
- Common YAML Formula Bugs (boolean checks, categorical values)

### Step 4: Load Baseline Profile
```
Read .claude/audit/dq-baseline/baseline-profile.json
```

---

## 2. Table Profile

| Property | Value |
|----------|-------|
| Schema.Table | `l2.facility_delinquency_snapshot` |
| Expected rows | One per facility per reporting date |
| Primary key | Composite: `(facility_id, as_of_date)` or `(facility_delinquency_snapshot_id)` |
| Key FKs OUT | `facility_id` -> `l2.facility_master`, `dpd_bucket_code` -> `l1.dpd_bucket_dim` (if exists) |
| Key FKs IN | Consumed by delinquency metrics, non-accrual reporting, risk migration analysis |
| Business meaning | Point-in-time delinquency status for each facility — days past due, regulatory DPD bucket, accrual status. Required for FFIEC Call Report delinquency schedules. |

---

## 3. Dimension Checks

### 3A. Schema Validation
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = 'facility_delinquency_snapshot'
ORDER BY ordinal_position;
EOSQL
```

### 3B. Primary Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT 'total_rows', COUNT(*) FROM l2.facility_delinquency_snapshot
UNION ALL
SELECT 'distinct_fac_date', COUNT(*) FROM (
  SELECT DISTINCT facility_id, as_of_date FROM l2.facility_delinquency_snapshot
) t;
EOSQL
```

### 3C. Foreign Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Orphaned facility_id
SELECT 'orphan_facility', COUNT(DISTINCT fds.facility_id)
FROM l2.facility_delinquency_snapshot fds
LEFT JOIN l2.facility_master fm ON fds.facility_id = fm.facility_id
WHERE fm.facility_id IS NULL;
EOSQL
```

### 3D. Null Analysis
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT col, nulls, total, ROUND(100.0 * nulls / NULLIF(total, 0), 2) AS null_pct FROM (
  SELECT 'days_past_due' AS col, COUNT(*) FILTER (WHERE days_past_due IS NULL) AS nulls, COUNT(*) AS total FROM l2.facility_delinquency_snapshot
  UNION ALL SELECT 'dpd_bucket_code', COUNT(*) FILTER (WHERE dpd_bucket_code IS NULL), COUNT(*) FROM l2.facility_delinquency_snapshot
  UNION ALL SELECT 'delinquency_status', COUNT(*) FILTER (WHERE delinquency_status IS NULL), COUNT(*) FROM l2.facility_delinquency_snapshot
  UNION ALL SELECT 'accrual_status_code', COUNT(*) FILTER (WHERE accrual_status_code IS NULL), COUNT(*) FROM l2.facility_delinquency_snapshot
) t;
EOSQL
```

### 3E-3F. Distribution
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- DPD bucket distribution
SELECT dpd_bucket_code, COUNT(*),
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM l2.facility_delinquency_snapshot), 2) AS pct
FROM l2.facility_delinquency_snapshot
GROUP BY dpd_bucket_code ORDER BY dpd_bucket_code;

-- Accrual status distribution
SELECT accrual_status_code, COUNT(*) FROM l2.facility_delinquency_snapshot
GROUP BY accrual_status_code ORDER BY COUNT(*) DESC;

-- Delinquency status distribution
SELECT delinquency_status, COUNT(*) FROM l2.facility_delinquency_snapshot
GROUP BY delinquency_status ORDER BY COUNT(*) DESC;

-- DPD numeric distribution
SELECT
  MIN(days_past_due) AS min_dpd,
  MAX(days_past_due) AS max_dpd,
  AVG(days_past_due) AS avg_dpd,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_past_due) AS median_dpd,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY days_past_due) AS p95_dpd
FROM l2.facility_delinquency_snapshot WHERE days_past_due IS NOT NULL;
EOSQL
```

### 3G. Temporal
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT as_of_date, COUNT(*), COUNT(DISTINCT facility_id) AS facilities
FROM l2.facility_delinquency_snapshot
GROUP BY as_of_date ORDER BY as_of_date;
EOSQL
```

### 3H-3J. (Bounds, Cross-Table)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Negative DPD
SELECT facility_id, as_of_date, days_past_due
FROM l2.facility_delinquency_snapshot WHERE days_past_due < 0;

-- Cross-table: delinquency date alignment with exposure
SELECT 'delinq_dates_not_in_fes', COUNT(DISTINCT fds.as_of_date)
FROM l2.facility_delinquency_snapshot fds
LEFT JOIN (SELECT DISTINCT as_of_date FROM l2.facility_exposure_snapshot) fes
  ON fds.as_of_date = fes.as_of_date
WHERE fes.as_of_date IS NULL;
EOSQL
```

---

## 4. Business Rule Checks (Delinquency Snapshot Specific)

### 4A. DPD Bucket Code Validity (CRITICAL)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Must be one of 5 FFIEC standard buckets
SELECT dpd_bucket_code, COUNT(*)
FROM l2.facility_delinquency_snapshot
WHERE dpd_bucket_code NOT IN ('CURRENT', '1-29', '30-59', '60-89', '90+')
  AND dpd_bucket_code IS NOT NULL
GROUP BY dpd_bucket_code;

-- Check all 5 buckets are represented
SELECT bucket, COALESCE(actual_count, 0) AS count FROM (
  VALUES ('CURRENT'), ('1-29'), ('30-59'), ('60-89'), ('90+')
) AS expected(bucket)
LEFT JOIN (
  SELECT dpd_bucket_code, COUNT(*) AS actual_count
  FROM l2.facility_delinquency_snapshot
  GROUP BY dpd_bucket_code
) actual ON expected.bucket = actual.dpd_bucket_code;
EOSQL
```
**Severity:** CRITICAL if invalid bucket codes. HIGH if fewer than 5 buckets represented (metric gaps).

### 4B. DPD vs Bucket Code Consistency (CRITICAL)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- days_past_due must be consistent with dpd_bucket_code
SELECT facility_id, as_of_date, days_past_due, dpd_bucket_code,
  CASE
    WHEN days_past_due = 0 AND dpd_bucket_code = 'CURRENT' THEN 'OK'
    WHEN days_past_due BETWEEN 1 AND 29 AND dpd_bucket_code = '1-29' THEN 'OK'
    WHEN days_past_due BETWEEN 30 AND 59 AND dpd_bucket_code = '30-59' THEN 'OK'
    WHEN days_past_due BETWEEN 60 AND 89 AND dpd_bucket_code = '60-89' THEN 'OK'
    WHEN days_past_due >= 90 AND dpd_bucket_code = '90+' THEN 'OK'
    ELSE 'MISMATCH'
  END AS consistency
FROM l2.facility_delinquency_snapshot
WHERE days_past_due IS NOT NULL AND dpd_bucket_code IS NOT NULL
  AND CASE
    WHEN days_past_due = 0 AND dpd_bucket_code = 'CURRENT' THEN false
    WHEN days_past_due BETWEEN 1 AND 29 AND dpd_bucket_code = '1-29' THEN false
    WHEN days_past_due BETWEEN 30 AND 59 AND dpd_bucket_code = '30-59' THEN false
    WHEN days_past_due BETWEEN 60 AND 89 AND dpd_bucket_code = '60-89' THEN false
    WHEN days_past_due >= 90 AND dpd_bucket_code = '90+' THEN false
    ELSE true
  END
LIMIT 20;
EOSQL
```
**Severity:** CRITICAL. DPD-bucket mismatch directly corrupts FFIEC delinquency reporting.

### 4C. 90+ DPD Implies Non-Accrual
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- 90+ DPD facilities should have NON_ACCRUAL status
SELECT facility_id, as_of_date, days_past_due, dpd_bucket_code, accrual_status_code
FROM l2.facility_delinquency_snapshot
WHERE dpd_bucket_code = '90+'
  AND (accrual_status_code IS NULL OR accrual_status_code != 'NON_ACCRUAL')
LIMIT 20;
EOSQL
```
**Severity:** HIGH. 90+ DPD facilities must be classified as non-accrual per regulatory guidance.

### 4D. 90+ DPD Correlates With Elevated PD in Risk Snapshot
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Facilities with 90+ DPD should have PD > 10% in risk snapshot
SELECT fds.facility_id, fds.as_of_date, fds.days_past_due, fds.dpd_bucket_code,
  frs.pd_pct, frs.defaulted_flag
FROM l2.facility_delinquency_snapshot fds
JOIN l2.facility_risk_snapshot frs
  ON fds.facility_id = frs.facility_id AND fds.as_of_date = frs.as_of_date
WHERE fds.dpd_bucket_code = '90+'
  AND (frs.pd_pct < 10 OR frs.pd_pct IS NULL)
LIMIT 20;
EOSQL
```
**Severity:** MEDIUM. Regulatory expectation is that 90+ DPD facilities have elevated PD.

### 4E. DPD Progression Realism (No Impossible Cures)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Check for unrealistic DPD jumps: 90+ -> CURRENT without passing through intermediate buckets
-- (Cures are possible but should be accompanied by a credit event)
WITH ranked AS (
  SELECT facility_id, as_of_date, dpd_bucket_code, days_past_due,
    LAG(dpd_bucket_code) OVER (PARTITION BY facility_id ORDER BY as_of_date) AS prev_bucket,
    LAG(days_past_due) OVER (PARTITION BY facility_id ORDER BY as_of_date) AS prev_dpd,
    LAG(as_of_date) OVER (PARTITION BY facility_id ORDER BY as_of_date) AS prev_date
  FROM l2.facility_delinquency_snapshot
)
SELECT facility_id, prev_date, as_of_date,
  prev_bucket, dpd_bucket_code,
  prev_dpd, days_past_due
FROM ranked
WHERE prev_bucket = '90+' AND dpd_bucket_code = 'CURRENT'
LIMIT 20;
EOSQL
```
**Severity:** MEDIUM. 90+ to CURRENT in one period is unusual without a credit event (write-off, restructuring).

### 4F. DPD Non-Negative
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT facility_id, as_of_date, days_past_due
FROM l2.facility_delinquency_snapshot
WHERE days_past_due < 0;
EOSQL
```
**Severity:** HIGH. Negative days past due is physically impossible.

### 4G. Delinquency Status Consistency
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- delinquency_status should correlate with DPD
-- e.g., 'CURRENT' status with 60 DPD is inconsistent
SELECT facility_id, as_of_date, days_past_due, dpd_bucket_code, delinquency_status
FROM l2.facility_delinquency_snapshot
WHERE delinquency_status IS NOT NULL
  AND days_past_due IS NOT NULL
  AND (
    (delinquency_status ILIKE '%current%' AND days_past_due > 29)
    OR (delinquency_status ILIKE '%default%' AND days_past_due < 90)
  )
LIMIT 20;
EOSQL
```
**Severity:** MEDIUM.

### 4H. Accrual Status Values
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Valid accrual statuses
SELECT accrual_status_code, COUNT(*)
FROM l2.facility_delinquency_snapshot
WHERE accrual_status_code IS NOT NULL
GROUP BY accrual_status_code ORDER BY COUNT(*) DESC;
EOSQL
```
**Severity:** MEDIUM if invalid codes. Expected values: ACCRUAL, NON_ACCRUAL, or similar.

### 4I. Coverage: Active Facilities Without Delinquency Data
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Active facilities with exposure but no delinquency snapshot
SELECT COUNT(DISTINCT fm.facility_id) AS facilities_no_delinquency
FROM l2.facility_master fm
JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id
LEFT JOIN l2.facility_delinquency_snapshot fds ON fm.facility_id = fds.facility_id
WHERE fm.is_current_flag = true AND fds.facility_id IS NULL;
EOSQL
```
**Severity:** MEDIUM. Facilities without delinquency data default to CURRENT assumption.

---

## 5. Fix Procedures

### Fix: DPD-Bucket Mismatch
```sql
-- Recalculate dpd_bucket_code from days_past_due
UPDATE l2.facility_delinquency_snapshot
SET dpd_bucket_code = CASE
  WHEN days_past_due = 0 THEN 'CURRENT'
  WHEN days_past_due BETWEEN 1 AND 29 THEN '1-29'
  WHEN days_past_due BETWEEN 30 AND 59 THEN '30-59'
  WHEN days_past_due BETWEEN 60 AND 89 THEN '60-89'
  WHEN days_past_due >= 90 THEN '90+'
END
WHERE days_past_due IS NOT NULL;
```

### Fix: 90+ DPD Non-Accrual
```sql
UPDATE l2.facility_delinquency_snapshot
SET accrual_status_code = 'NON_ACCRUAL'
WHERE dpd_bucket_code = '90+'
  AND (accrual_status_code IS NULL OR accrual_status_code != 'NON_ACCRUAL');
```

### Fix: Negative DPD
```sql
UPDATE l2.facility_delinquency_snapshot
SET days_past_due = 0, dpd_bucket_code = 'CURRENT'
WHERE days_past_due < 0;
```

---

## 6. Output Format

Return standard DQ output JSON per template. Finding IDs use prefix `DQ-FDS-NNN` (e.g., `DQ-FDS-001`).
