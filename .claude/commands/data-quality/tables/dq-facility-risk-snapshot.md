---
description: "DQ Facility Risk Snapshot — deep-dive data quality review for l2.facility_risk_snapshot"
---

# DQ Facility Risk Snapshot Review

You are a **per-table data quality agent** reviewing `l2.facility_risk_snapshot` in the GSIB credit risk PostgreSQL database. This table contains the core risk parameters (PD, LGD, risk weights, default status) that drive expected loss, RWA, and capital calculations. Errors here directly corrupt every risk and capital metric.

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
Parse `l2` array for `facility_risk_snapshot` table definition.

### Step 3: Read CLAUDE.md Conventions
Grep for:
- GSIB Risk Sanity Checks (PD, LGD, EL ranges)
- Rating Tier PD Boundaries
- Basel III Exposure Type Rules
- Common YAML Formula Bugs (NULL weight propagation)

### Step 4: Load Baseline Profile
```
Read .claude/audit/dq-baseline/baseline-profile.json
```

---

## 2. Table Profile

| Property | Value |
|----------|-------|
| Schema.Table | `l2.facility_risk_snapshot` |
| Expected rows | Comparable to facility_exposure_snapshot (one per facility per date) |
| Primary key | Composite: `(facility_id, as_of_date)` or `(facility_risk_snapshot_id)` |
| Key FKs OUT | `facility_id` -> `l2.facility_master`, `basel_exposure_type_id` -> `l1.basel_exposure_type_dim` (if exists) |
| Key FKs IN | Consumed by EL metrics, PD/LGD weighted avg metrics, capital RWA calculations |
| Business meaning | Point-in-time risk parameters for each facility — probability of default, loss given default, risk weights, internal ratings, default status. |

---

## 3. Dimension Checks

### 3A. Schema Validation
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = 'facility_risk_snapshot'
ORDER BY ordinal_position;
EOSQL
```

### 3B. Primary Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT 'total_rows', COUNT(*) FROM l2.facility_risk_snapshot
UNION ALL
SELECT 'distinct_fac_date', COUNT(*) FROM (
  SELECT DISTINCT facility_id, as_of_date FROM l2.facility_risk_snapshot
) t
UNION ALL
SELECT 'null_facility_id', COUNT(*) FROM l2.facility_risk_snapshot WHERE facility_id IS NULL;
EOSQL
```

### 3C. Foreign Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Orphaned facility_id
SELECT 'orphan_facility', COUNT(DISTINCT frs.facility_id)
FROM l2.facility_risk_snapshot frs
LEFT JOIN l2.facility_master fm ON frs.facility_id = fm.facility_id
WHERE fm.facility_id IS NULL;

-- Orphaned basel_exposure_type_id (if column exists)
SELECT 'orphan_basel_type', COUNT(*)
FROM l2.facility_risk_snapshot frs
LEFT JOIN l1.basel_exposure_type_dim bet ON frs.basel_exposure_type_id = bet.basel_exposure_type_id
WHERE frs.basel_exposure_type_id IS NOT NULL AND bet.basel_exposure_type_id IS NULL;
EOSQL
```

### 3D. Null Analysis
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT col, nulls, total, ROUND(100.0 * nulls / NULLIF(total, 0), 2) AS null_pct FROM (
  SELECT 'pd_pct' AS col, COUNT(*) FILTER (WHERE pd_pct IS NULL) AS nulls, COUNT(*) AS total FROM l2.facility_risk_snapshot
  UNION ALL SELECT 'lgd_pct', COUNT(*) FILTER (WHERE lgd_pct IS NULL), COUNT(*) FROM l2.facility_risk_snapshot
  UNION ALL SELECT 'internal_risk_rating', COUNT(*) FILTER (WHERE internal_risk_rating IS NULL), COUNT(*) FROM l2.facility_risk_snapshot
  UNION ALL SELECT 'risk_weight_std_pct', COUNT(*) FILTER (WHERE risk_weight_std_pct IS NULL), COUNT(*) FROM l2.facility_risk_snapshot
  UNION ALL SELECT 'risk_weight_erba_pct', COUNT(*) FILTER (WHERE risk_weight_erba_pct IS NULL), COUNT(*) FROM l2.facility_risk_snapshot
  UNION ALL SELECT 'defaulted_flag', COUNT(*) FILTER (WHERE defaulted_flag IS NULL), COUNT(*) FROM l2.facility_risk_snapshot
  UNION ALL SELECT 'basel_exposure_type_id', COUNT(*) FILTER (WHERE basel_exposure_type_id IS NULL), COUNT(*) FROM l2.facility_risk_snapshot
) t;
EOSQL
```

### 3E-3F. Distribution Analysis
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- PD distribution buckets (GSIB calibration tiers)
SELECT
  CASE
    WHEN pd_pct <= 0.40 THEN 'IG (<=0.40%)'
    WHEN pd_pct <= 2.0 THEN 'Standard (0.40-2.0%)'
    WHEN pd_pct <= 10.0 THEN 'Substandard (2.0-10%)'
    WHEN pd_pct <= 30.0 THEN 'Doubtful (10-30%)'
    WHEN pd_pct <= 100.0 THEN 'Loss (30-100%)'
    ELSE 'INVALID (>100%)'
  END AS pd_tier,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM l2.facility_risk_snapshot WHERE pd_pct IS NOT NULL), 2) AS pct
FROM l2.facility_risk_snapshot
WHERE pd_pct IS NOT NULL
GROUP BY 1 ORDER BY MIN(pd_pct);

-- LGD distribution
SELECT
  CASE
    WHEN lgd_pct < 25 THEN 'Low (<25%)'
    WHEN lgd_pct < 45 THEN 'Moderate (25-45%)'
    WHEN lgd_pct < 65 THEN 'High (45-65%)'
    WHEN lgd_pct < 80 THEN 'Very High (65-80%)'
    ELSE 'Extreme (>=80%)'
  END AS lgd_tier,
  COUNT(*) AS count
FROM l2.facility_risk_snapshot
WHERE lgd_pct IS NOT NULL
GROUP BY 1 ORDER BY MIN(lgd_pct);

-- Internal risk rating distribution
SELECT internal_risk_rating, COUNT(*) FROM l2.facility_risk_snapshot
WHERE internal_risk_rating IS NOT NULL
GROUP BY internal_risk_rating ORDER BY COUNT(*) DESC;

-- Risk weight distribution
SELECT
  CASE
    WHEN risk_weight_std_pct <= 20 THEN '0-20%'
    WHEN risk_weight_std_pct <= 50 THEN '21-50%'
    WHEN risk_weight_std_pct <= 100 THEN '51-100%'
    WHEN risk_weight_std_pct <= 150 THEN '101-150%'
    ELSE '>150%'
  END AS rw_bucket,
  COUNT(*) AS count
FROM l2.facility_risk_snapshot
WHERE risk_weight_std_pct IS NOT NULL
GROUP BY 1 ORDER BY MIN(risk_weight_std_pct);
EOSQL
```

### 3G. Temporal Consistency
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT as_of_date, COUNT(*) AS rows, COUNT(DISTINCT facility_id) AS facilities
FROM l2.facility_risk_snapshot
GROUP BY as_of_date ORDER BY as_of_date;
EOSQL
```

### 3H-3J. (Bounds, Booleans, Cross-Table)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Bounds
SELECT
  MIN(pd_pct) AS min_pd, MAX(pd_pct) AS max_pd,
  MIN(lgd_pct) AS min_lgd, MAX(lgd_pct) AS max_lgd,
  MIN(risk_weight_std_pct) AS min_rw, MAX(risk_weight_std_pct) AS max_rw
FROM l2.facility_risk_snapshot;

-- Boolean: defaulted_flag
SELECT
  COUNT(*) FILTER (WHERE defaulted_flag = true) AS defaulted_true,
  COUNT(*) FILTER (WHERE defaulted_flag = false) AS defaulted_false,
  COUNT(*) FILTER (WHERE defaulted_flag IS NULL) AS defaulted_null,
  COUNT(*) AS total
FROM l2.facility_risk_snapshot;

-- Cross-table: date alignment with exposure snapshot
SELECT 'frs_dates_not_in_fes', COUNT(DISTINCT frs.as_of_date)
FROM l2.facility_risk_snapshot frs
LEFT JOIN (SELECT DISTINCT as_of_date FROM l2.facility_exposure_snapshot) fes ON frs.as_of_date = fes.as_of_date
WHERE fes.as_of_date IS NULL;
EOSQL
```

---

## 4. Business Rule Checks (Risk Snapshot Specific)

### 4A. PD Range Validation (CRITICAL)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- PD must be 0-100%
SELECT facility_id, as_of_date, pd_pct
FROM l2.facility_risk_snapshot
WHERE pd_pct < 0 OR pd_pct > 100
LIMIT 20;

-- Unrealistic PD values (>30% for non-defaulted)
SELECT facility_id, as_of_date, pd_pct, defaulted_flag
FROM l2.facility_risk_snapshot
WHERE pd_pct > 30 AND (defaulted_flag = false OR defaulted_flag IS NULL)
LIMIT 20;

-- All-identical PD (low diversity)
SELECT COUNT(DISTINCT ROUND(pd_pct, 4)) AS distinct_pd_values,
  COUNT(*) AS total_rows,
  MODE() WITHIN GROUP (ORDER BY ROUND(pd_pct, 2)) AS most_common_pd
FROM l2.facility_risk_snapshot WHERE pd_pct IS NOT NULL;
EOSQL
```
**Severity:** CRITICAL if PD outside 0-100%. HIGH if all PD values are identical. MEDIUM if >30% non-defaulted.

### 4B. LGD Range Validation
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- LGD must be 0-100%
SELECT facility_id, as_of_date, lgd_pct
FROM l2.facility_risk_snapshot
WHERE lgd_pct < 0 OR lgd_pct > 100
LIMIT 20;

-- LGD should vary by facility type (secured vs unsecured)
SELECT ft.facility_type_name,
  MIN(frs.lgd_pct) AS min_lgd,
  AVG(frs.lgd_pct) AS avg_lgd,
  MAX(frs.lgd_pct) AS max_lgd,
  COUNT(*) AS count
FROM l2.facility_risk_snapshot frs
JOIN l2.facility_master fm ON frs.facility_id = fm.facility_id AND fm.is_current_flag = true
JOIN l1.facility_type_dim ft ON fm.facility_type_id = ft.facility_type_id
WHERE frs.lgd_pct IS NOT NULL
GROUP BY ft.facility_type_name
ORDER BY avg_lgd;
EOSQL
```
**Severity:** HIGH if LGD outside 0-100%. MEDIUM if no variation by facility type.

### 4C. Risk Weight Bounds
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Standardized risk weight: 0-1250% (Basel III max)
SELECT facility_id, as_of_date, risk_weight_std_pct
FROM l2.facility_risk_snapshot
WHERE risk_weight_std_pct IS NOT NULL
  AND (risk_weight_std_pct < 0 OR risk_weight_std_pct > 1250);

-- ERBA risk weight: 0-1250%
SELECT facility_id, as_of_date, risk_weight_erba_pct
FROM l2.facility_risk_snapshot
WHERE risk_weight_erba_pct IS NOT NULL
  AND (risk_weight_erba_pct < 0 OR risk_weight_erba_pct > 1250);
EOSQL
```
**Severity:** HIGH if outside Basel III bounds.

### 4D. Default Flag vs PD Correlation
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Defaulted facilities should have elevated PD (>10%)
SELECT facility_id, as_of_date, pd_pct, defaulted_flag
FROM l2.facility_risk_snapshot
WHERE defaulted_flag = true AND pd_pct < 10
LIMIT 20;

-- Non-defaulted with PD = 100% (should be defaulted)
SELECT facility_id, as_of_date, pd_pct, defaulted_flag
FROM l2.facility_risk_snapshot
WHERE pd_pct >= 99 AND (defaulted_flag = false OR defaulted_flag IS NULL)
LIMIT 20;
EOSQL
```
**Severity:** MEDIUM. PD and default status should be correlated.

### 4E. Internal Risk Rating Coverage
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Active facilities without internal risk rating
SELECT frs.facility_id, frs.as_of_date, frs.internal_risk_rating
FROM l2.facility_risk_snapshot frs
JOIN l2.facility_master fm ON frs.facility_id = fm.facility_id AND fm.is_current_flag = true
WHERE frs.internal_risk_rating IS NULL
  AND frs.as_of_date = (SELECT MAX(as_of_date) FROM l2.facility_risk_snapshot)
LIMIT 20;
EOSQL
```
**Severity:** MEDIUM. Rating gaps prevent risk bucketing.

### 4F. PD Distribution Diversity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Check if PD values are uniformly distributed or clustered
SELECT ROUND(pd_pct, 2) AS pd_rounded, COUNT(*) AS count
FROM l2.facility_risk_snapshot
WHERE pd_pct IS NOT NULL
GROUP BY ROUND(pd_pct, 2)
ORDER BY COUNT(*) DESC
LIMIT 10;

-- Coefficient of variation for PD
SELECT ROUND(STDDEV(pd_pct) / NULLIF(AVG(pd_pct), 0), 4) AS cv_pd,
  ROUND(STDDEV(lgd_pct) / NULLIF(AVG(lgd_pct), 0), 4) AS cv_lgd
FROM l2.facility_risk_snapshot
WHERE pd_pct IS NOT NULL AND lgd_pct IS NOT NULL;
EOSQL
```
**Severity:** MEDIUM if CV < 0.1 (extremely low diversity — likely synthetic placeholder data).

### 4G. Date Alignment with Exposure Snapshot
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Facilities in risk snapshot but not exposure snapshot (same date)
SELECT frs.as_of_date, COUNT(DISTINCT frs.facility_id) AS in_risk_not_exposure
FROM l2.facility_risk_snapshot frs
LEFT JOIN l2.facility_exposure_snapshot fes
  ON frs.facility_id = fes.facility_id AND frs.as_of_date = fes.as_of_date
WHERE fes.facility_id IS NULL
GROUP BY frs.as_of_date ORDER BY frs.as_of_date;
EOSQL
```
**Severity:** MEDIUM. Misaligned dates cause EL calculations to fail for those facilities.

---

## 5. Fix Procedures

### Fix: PD Out of Range
```sql
-- Cap PD to 0-100% range
UPDATE l2.facility_risk_snapshot SET pd_pct = 100.0 WHERE pd_pct > 100;
UPDATE l2.facility_risk_snapshot SET pd_pct = 0.01 WHERE pd_pct < 0;
```

### Fix: Default Flag vs PD Inconsistency
```sql
-- Set defaulted_flag = true for PD >= 99%
UPDATE l2.facility_risk_snapshot SET defaulted_flag = true WHERE pd_pct >= 99;
```

---

## 6. Output Format

Return standard DQ output JSON per template. Finding IDs use prefix `DQ-FRS-NNN` (e.g., `DQ-FRS-001`).
