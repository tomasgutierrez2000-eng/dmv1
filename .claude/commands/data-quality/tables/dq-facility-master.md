---
description: "DQ Facility Master — deep-dive data quality review for l2.facility_master"
---

# DQ Facility Master Review

You are a **per-table data quality agent** reviewing `l2.facility_master` in the GSIB credit risk PostgreSQL database. This is the **hub table** of the data model — nearly every L2 snapshot and L3 calculation joins to it. Data quality failures here cascade to every downstream metric.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

### Step 1: Read Configuration
```
Read .claude/config/bank-profile.yaml
```
Extract: `database.primary` connection, `institution_tier`, `psql_path`.

### Step 2: Read Data Dictionary
```
Read facility-summary-mvp/output/data-dictionary/data-dictionary.json
```
Parse the `l2` array for the `facility_master` table definition — fields, types, PKs, FKs.

### Step 3: Read CLAUDE.md Conventions
Grep for:
- L1/L2/L3 Convention (layer rules)
- EBT Hierarchy Rules
- Agreement-Facility Counterparty Alignment
- Data Type Rules (suffix -> type mapping)

### Step 4: Load Baseline Profile
```
Read .claude/audit/dq-baseline/baseline-profile.json
```
If missing, run targeted row-count and null-percentage queries.

---

## 2. Table Profile

| Property | Value |
|----------|-------|
| Schema.Table | `l2.facility_master` |
| Expected rows | 410+ (seed) + scenario facilities |
| Primary key | `facility_id` (BIGINT) |
| SCD type | Type 2 (`is_current_flag`, `effective_from_date`, `effective_to_date`) |
| Key FKs OUT | `counterparty_id` -> `l2.counterparty`, `credit_agreement_id` -> `l2.credit_agreement_master`, `facility_type_id` -> `l1.facility_type_dim`, `lob_segment_id` -> `l1.enterprise_business_taxonomy`, `currency_code` -> `l1.currency_dim`, `legal_entity_id` -> `l2.legal_entity` (if present) |
| Key FKs IN | `l2.facility_exposure_snapshot`, `l2.facility_risk_snapshot`, `l2.facility_pricing_snapshot`, `l2.facility_financial_snapshot`, `l2.facility_delinquency_snapshot`, `l2.collateral_snapshot`, `l3.*_calc` tables |
| Business meaning | Every credit facility (loan, revolver, LOC, guarantee) the bank extends. Hub for all facility-level metrics. |

---

## 3. Dimension Checks

Run all 10 dimension checks scoped to `l2.facility_master`.

### 3A. Schema Validation
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT column_name, data_type, is_nullable, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = 'facility_master'
ORDER BY ordinal_position;
EOSQL
```
Compare every column name, type, and nullability against the data dictionary. Flag mismatches.

### 3B. Primary Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT 'total_rows', COUNT(*) FROM l2.facility_master
UNION ALL
SELECT 'distinct_pks', COUNT(DISTINCT facility_id) FROM l2.facility_master
UNION ALL
SELECT 'null_pks', COUNT(*) FROM l2.facility_master WHERE facility_id IS NULL;
"
```

### 3C. Foreign Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Orphaned counterparty_id
SELECT 'orphan_counterparty', COUNT(*)
FROM l2.facility_master fm
LEFT JOIN l2.counterparty c ON fm.counterparty_id = c.counterparty_id
WHERE c.counterparty_id IS NULL AND fm.is_current_flag = true;

-- Orphaned credit_agreement_id
SELECT 'orphan_agreement', COUNT(*)
FROM l2.facility_master fm
LEFT JOIN l2.credit_agreement_master ca ON fm.credit_agreement_id = ca.credit_agreement_id
WHERE ca.credit_agreement_id IS NULL AND fm.credit_agreement_id IS NOT NULL AND fm.is_current_flag = true;

-- Orphaned facility_type_id
SELECT 'orphan_facility_type', COUNT(*)
FROM l2.facility_master fm
LEFT JOIN l1.facility_type_dim ft ON fm.facility_type_id = ft.facility_type_id
WHERE ft.facility_type_id IS NULL AND fm.facility_type_id IS NOT NULL AND fm.is_current_flag = true;

-- Orphaned currency_code
SELECT 'orphan_currency', COUNT(*)
FROM l2.facility_master fm
LEFT JOIN l1.currency_dim cd ON fm.currency_code = cd.currency_code
WHERE cd.currency_code IS NULL AND fm.currency_code IS NOT NULL AND fm.is_current_flag = true;

-- Orphaned lob_segment_id
SELECT 'orphan_lob_segment', COUNT(*)
FROM l2.facility_master fm
LEFT JOIN l1.enterprise_business_taxonomy ebt ON fm.lob_segment_id = ebt.managed_segment_id
WHERE ebt.managed_segment_id IS NULL AND fm.lob_segment_id IS NOT NULL AND fm.is_current_flag = true;
EOSQL
```

### 3D. Null Analysis
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  'facility_id' AS col, COUNT(*) FILTER (WHERE facility_id IS NULL) AS nulls, COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE facility_id IS NULL) / COUNT(*), 2) AS null_pct
FROM l2.facility_master WHERE is_current_flag = true
UNION ALL
SELECT 'counterparty_id', COUNT(*) FILTER (WHERE counterparty_id IS NULL), COUNT(*),
  ROUND(100.0 * COUNT(*) FILTER (WHERE counterparty_id IS NULL) / COUNT(*), 2)
FROM l2.facility_master WHERE is_current_flag = true
UNION ALL
SELECT 'credit_agreement_id', COUNT(*) FILTER (WHERE credit_agreement_id IS NULL), COUNT(*),
  ROUND(100.0 * COUNT(*) FILTER (WHERE credit_agreement_id IS NULL) / COUNT(*), 2)
FROM l2.facility_master WHERE is_current_flag = true
UNION ALL
SELECT 'facility_name', COUNT(*) FILTER (WHERE facility_name IS NULL), COUNT(*),
  ROUND(100.0 * COUNT(*) FILTER (WHERE facility_name IS NULL) / COUNT(*), 2)
FROM l2.facility_master WHERE is_current_flag = true
UNION ALL
SELECT 'lob_segment_id', COUNT(*) FILTER (WHERE lob_segment_id IS NULL), COUNT(*),
  ROUND(100.0 * COUNT(*) FILTER (WHERE lob_segment_id IS NULL) / COUNT(*), 2)
FROM l2.facility_master WHERE is_current_flag = true
UNION ALL
SELECT 'currency_code', COUNT(*) FILTER (WHERE currency_code IS NULL), COUNT(*),
  ROUND(100.0 * COUNT(*) FILTER (WHERE currency_code IS NULL) / COUNT(*), 2)
FROM l2.facility_master WHERE is_current_flag = true
UNION ALL
SELECT 'origination_date', COUNT(*) FILTER (WHERE origination_date IS NULL), COUNT(*),
  ROUND(100.0 * COUNT(*) FILTER (WHERE origination_date IS NULL) / COUNT(*), 2)
FROM l2.facility_master WHERE is_current_flag = true
UNION ALL
SELECT 'maturity_date', COUNT(*) FILTER (WHERE maturity_date IS NULL), COUNT(*),
  ROUND(100.0 * COUNT(*) FILTER (WHERE maturity_date IS NULL) / COUNT(*), 2)
FROM l2.facility_master WHERE is_current_flag = true
UNION ALL
SELECT 'committed_facility_amt', COUNT(*) FILTER (WHERE committed_facility_amt IS NULL), COUNT(*),
  ROUND(100.0 * COUNT(*) FILTER (WHERE committed_facility_amt IS NULL) / COUNT(*), 2)
FROM l2.facility_master WHERE is_current_flag = true;
EOSQL
```

### 3E. Data Type Conformance
Verify suffix-to-type contract:
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT column_name, data_type,
  CASE
    WHEN column_name LIKE '%_id' AND data_type NOT IN ('bigint','integer') THEN 'FAIL: _id should be BIGINT'
    WHEN column_name LIKE '%_code' AND data_type NOT LIKE 'character%' THEN 'FAIL: _code should be VARCHAR'
    WHEN column_name LIKE '%_amt' AND data_type != 'numeric' THEN 'FAIL: _amt should be NUMERIC'
    WHEN column_name LIKE '%_pct' AND data_type != 'numeric' THEN 'FAIL: _pct should be NUMERIC'
    WHEN column_name LIKE '%_date' AND data_type != 'date' THEN 'FAIL: _date should be DATE'
    WHEN column_name LIKE '%_flag' AND data_type != 'boolean' THEN 'FAIL: _flag should be BOOLEAN'
    WHEN column_name LIKE '%_ts' AND data_type NOT LIKE 'timestamp%' THEN 'FAIL: _ts should be TIMESTAMP'
    ELSE 'OK'
  END AS type_check
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = 'facility_master'
  AND CASE
    WHEN column_name LIKE '%_id' AND data_type NOT IN ('bigint','integer') THEN true
    WHEN column_name LIKE '%_code' AND data_type NOT LIKE 'character%' THEN true
    WHEN column_name LIKE '%_amt' AND data_type != 'numeric' THEN true
    WHEN column_name LIKE '%_pct' AND data_type != 'numeric' THEN true
    WHEN column_name LIKE '%_date' AND data_type != 'date' THEN true
    WHEN column_name LIKE '%_flag' AND data_type != 'boolean' THEN true
    WHEN column_name LIKE '%_ts' AND data_type NOT LIKE 'timestamp%' THEN true
    ELSE false
  END;
EOSQL
```

### 3F. Distribution Analysis
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Facility type distribution
SELECT 'facility_type_id', facility_type_id::text, COUNT(*)
FROM l2.facility_master WHERE is_current_flag = true
GROUP BY facility_type_id ORDER BY COUNT(*) DESC;

-- Currency distribution
SELECT 'currency_code', currency_code, COUNT(*)
FROM l2.facility_master WHERE is_current_flag = true
GROUP BY currency_code ORDER BY COUNT(*) DESC;

-- LOB segment distribution
SELECT 'lob_segment_id', lob_segment_id::text, COUNT(*)
FROM l2.facility_master WHERE is_current_flag = true
GROUP BY lob_segment_id ORDER BY COUNT(*) DESC LIMIT 20;
EOSQL
```
Flag if any single value dominates >80% of rows (low diversity).

### 3G. Temporal Consistency
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Date range check
SELECT
  MIN(origination_date) AS earliest_origination,
  MAX(origination_date) AS latest_origination,
  MIN(maturity_date) AS earliest_maturity,
  MAX(maturity_date) AS latest_maturity,
  MIN(effective_from_date) AS earliest_eff_from,
  MAX(effective_from_date) AS latest_eff_from
FROM l2.facility_master WHERE is_current_flag = true;

-- Audit timestamp gaps
SELECT
  COUNT(*) FILTER (WHERE created_ts IS NULL) AS missing_created_ts,
  COUNT(*) FILTER (WHERE updated_ts IS NULL) AS missing_updated_ts,
  COUNT(*) AS total
FROM l2.facility_master;
EOSQL
```

### 3H. Bounds & Range Checks
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  MIN(committed_facility_amt) AS min_committed,
  MAX(committed_facility_amt) AS max_committed,
  AVG(committed_facility_amt) AS avg_committed,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY committed_facility_amt) AS median_committed,
  COUNT(*) FILTER (WHERE committed_facility_amt <= 0) AS non_positive_committed,
  COUNT(*) FILTER (WHERE committed_facility_amt > 1e12) AS over_1T
FROM l2.facility_master WHERE is_current_flag = true;
EOSQL
```

### 3I. Boolean Field Checks
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT column_name,
  COUNT(*) FILTER (WHERE val = true) AS true_ct,
  COUNT(*) FILTER (WHERE val = false) AS false_ct,
  COUNT(*) FILTER (WHERE val IS NULL) AS null_ct,
  COUNT(*) AS total
FROM (
  SELECT 'is_current_flag' AS column_name, is_current_flag AS val FROM l2.facility_master
) t GROUP BY column_name;
EOSQL
```

### 3J. Cross-Table Consistency
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Facilities without any exposure snapshots
SELECT 'facilities_no_exposure', COUNT(*)
FROM l2.facility_master fm
LEFT JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id
WHERE fes.facility_id IS NULL AND fm.is_current_flag = true;

-- Facilities without risk snapshots
SELECT 'facilities_no_risk', COUNT(*)
FROM l2.facility_master fm
LEFT JOIN l2.facility_risk_snapshot frs ON fm.facility_id = frs.facility_id
WHERE frs.facility_id IS NULL AND fm.is_current_flag = true;
EOSQL
```

---

## 4. Business Rule Checks (Facility Master Specific)

### 4A. EBT Leaf Node Validation (CRITICAL)
`lob_segment_id` must point to LEAF nodes in the EBT hierarchy, never parent/portfolio/segment nodes.
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Facilities assigned to NON-LEAF EBT nodes
SELECT fm.facility_id, fm.lob_segment_id, ebt.segment_name, ebt.hierarchy_level
FROM l2.facility_master fm
JOIN l1.enterprise_business_taxonomy ebt ON fm.lob_segment_id = ebt.managed_segment_id
WHERE fm.lob_segment_id IN (
  SELECT DISTINCT parent_segment_id
  FROM l1.enterprise_business_taxonomy
  WHERE parent_segment_id IS NOT NULL
) AND fm.is_current_flag = true;
EOSQL
```
**Severity:** CRITICAL if any rows returned. Facilities on non-leaf nodes cause incorrect rollup aggregation.

### 4B. Maturity After Origination
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT facility_id, facility_name, origination_date, maturity_date,
  maturity_date - origination_date AS tenor_days
FROM l2.facility_master
WHERE maturity_date <= origination_date AND is_current_flag = true;
EOSQL
```
**Severity:** HIGH. Maturity before origination is physically impossible.

### 4C. Committed Amount Positive
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT facility_id, facility_name, committed_facility_amt
FROM l2.facility_master
WHERE (committed_facility_amt <= 0 OR committed_facility_amt IS NULL)
  AND is_current_flag = true;
EOSQL
```
**Severity:** HIGH. Zero or negative commitment is invalid for active facilities.

### 4D. SCD-2 Consistency — Single Current Row
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Multiple current rows for same facility
SELECT facility_id, COUNT(*) AS current_count
FROM l2.facility_master
WHERE is_current_flag = true
GROUP BY facility_id
HAVING COUNT(*) > 1;
EOSQL
```
**Severity:** CRITICAL. Multiple current rows cause double-counting in every metric.

### 4E. Agreement-Counterparty Alignment
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Facility counterparty != agreement borrower (non-syndicated)
SELECT fm.facility_id, fm.counterparty_id AS fac_cp,
  ca.borrower_counterparty_id AS agr_cp, ca.credit_agreement_id
FROM l2.facility_master fm
JOIN l2.credit_agreement_master ca ON fm.credit_agreement_id = ca.credit_agreement_id
WHERE fm.counterparty_id != ca.borrower_counterparty_id
  AND fm.is_current_flag = true
  AND NOT EXISTS (
    SELECT 1 FROM l2.credit_agreement_counterparty_participation cacp
    WHERE cacp.credit_agreement_id = ca.credit_agreement_id
    AND cacp.counterparty_id = fm.counterparty_id
  );
EOSQL
```
**Severity:** HIGH. Misaligned counterparties break counterparty-level rollups.

### 4F. Legal Entity Validity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- legal_entity_id FK check (if column exists)
SELECT fm.facility_id, fm.legal_entity_id
FROM l2.facility_master fm
LEFT JOIN l2.legal_entity le ON fm.legal_entity_id = le.legal_entity_id
WHERE fm.legal_entity_id IS NOT NULL
  AND le.legal_entity_id IS NULL
  AND fm.is_current_flag = true;
EOSQL
```
**Severity:** HIGH if orphaned. Capital metrics depend on legal entity assignment.

### 4G. Orphaned Facilities (No Exposure Snapshots)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT fm.facility_id, fm.facility_name, fm.counterparty_id
FROM l2.facility_master fm
LEFT JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id
WHERE fes.facility_id IS NULL AND fm.is_current_flag = true
ORDER BY fm.facility_id;
EOSQL
```
**Severity:** MEDIUM. Facilities without exposure data are invisible to all exposure metrics.

### 4H. Tenor Reasonableness
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  COUNT(*) FILTER (WHERE maturity_date - origination_date < 30) AS tenor_under_30d,
  COUNT(*) FILTER (WHERE maturity_date - origination_date BETWEEN 30 AND 365) AS tenor_1y,
  COUNT(*) FILTER (WHERE maturity_date - origination_date BETWEEN 366 AND 1825) AS tenor_1_5y,
  COUNT(*) FILTER (WHERE maturity_date - origination_date BETWEEN 1826 AND 3650) AS tenor_5_10y,
  COUNT(*) FILTER (WHERE maturity_date - origination_date > 3650) AS tenor_over_10y,
  COUNT(*) FILTER (WHERE maturity_date - origination_date > 18250) AS tenor_over_50y
FROM l2.facility_master WHERE is_current_flag = true;
EOSQL
```
**Severity:** LOW for outliers, MEDIUM if >10% are unreasonable (under 30d or over 50y).

### 4I. Facility Name Quality
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT facility_id, facility_name
FROM l2.facility_master
WHERE is_current_flag = true
  AND (facility_name IS NULL
    OR facility_name = ''
    OR facility_name ~ '^[0-9]+$'
    OR facility_name ~ '^facility_name_'
    OR LENGTH(facility_name) < 3);
EOSQL
```
**Severity:** LOW. Placeholder names indicate incomplete seed data.

---

## 5. Fix Procedures

### Fix: SCD-2 Duplicate Current Rows
```sql
-- Keep the row with latest effective_from_date, deactivate others
UPDATE l2.facility_master fm SET is_current_flag = false
WHERE fm.is_current_flag = true
  AND EXISTS (
    SELECT 1 FROM l2.facility_master fm2
    WHERE fm2.facility_id = fm.facility_id
      AND fm2.is_current_flag = true
      AND fm2.effective_from_date > fm.effective_from_date
  );
```

### Fix: EBT Non-Leaf Assignment
```sql
-- Map each non-leaf node to its first leaf descendant
WITH non_leaf AS (
  SELECT DISTINCT parent_segment_id FROM l1.enterprise_business_taxonomy WHERE parent_segment_id IS NOT NULL
),
leaf_mapping AS (
  SELECT nl.parent_segment_id AS non_leaf_id,
    (SELECT MIN(ebt2.managed_segment_id) FROM l1.enterprise_business_taxonomy ebt2
     WHERE ebt2.parent_segment_id = nl.parent_segment_id
     AND ebt2.managed_segment_id NOT IN (SELECT parent_segment_id FROM non_leaf)
     AND ebt2.is_current_flag = 'Y') AS leaf_id
  FROM non_leaf nl
)
UPDATE l2.facility_master fm SET lob_segment_id = lm.leaf_id
FROM leaf_mapping lm WHERE fm.lob_segment_id = lm.non_leaf_id AND lm.leaf_id IS NOT NULL;
-- NOTE: Some non-leaf nodes have children that are ALSO non-leaf. If on_non_leaf > 0 after first pass,
-- re-run the mapping — it may take 2-3 iterations to reach true leaves.
```

### Fix: Facility Type All Same Value
```sql
-- Distribute across active facility types by GSIB portfolio mix
-- CRITICAL: Verify dim table IDs first: SELECT facility_type_id, facility_type_name FROM l1.facility_type_dim WHERE is_active_flag = true;
UPDATE l2.facility_master SET facility_type_id = CASE
  WHEN facility_id % 100 < 35 THEN 1   -- Term Loan (35%)
  WHEN facility_id % 100 < 60 THEN 4   -- Revolving Credit (25%)
  WHEN facility_id % 100 < 70 THEN 11  -- SBLC (10%)
  WHEN facility_id % 100 < 78 THEN 9   -- Trade Finance (8%)
  WHEN facility_id % 100 < 85 THEN 2   -- Term Loan B (7%)
  WHEN facility_id % 100 < 90 THEN 5   -- Commercial LC (5%)
  WHEN facility_id % 100 < 94 THEN 10  -- ABL (4%)
  WHEN facility_id % 100 < 97 THEN 3   -- Bridge Loan (3%)
  WHEN facility_id % 100 < 99 THEN 6   -- Financial Guarantee (2%)
  ELSE 8                                 -- Uncommitted (1%)
END;
```

### Fix: Legal Entity ID All NULL
```sql
-- Distribute across legal entities by counterparty geography
UPDATE l2.facility_master fm SET legal_entity_id = CASE
  WHEN c.country_code = 'US' THEN (CASE WHEN fm.facility_id % 3 = 0 THEN 1 WHEN fm.facility_id % 3 = 1 THEN 2 ELSE 3 END)
  WHEN c.country_code IN ('GB', 'DE', 'FR', 'CH') THEN 8   -- Europe entity
  WHEN c.country_code IN ('JP', 'AU', 'IN', 'KR') THEN 9   -- Asia Pacific entity
  WHEN c.country_code = 'CA' THEN 10
  WHEN c.country_code = 'SG' THEN 11
  WHEN c.country_code = 'HK' THEN 12
  ELSE 7  -- International
END
FROM l2.counterparty c WHERE c.counterparty_id = fm.counterparty_id;
-- CRITICAL: Verify legal_entity IDs exist first: SELECT legal_entity_id FROM l2.legal_entity;
```

### Fix: Maturity Before Origination
```sql
-- Swap dates if clearly inverted
UPDATE l2.facility_master
SET origination_date = maturity_date, maturity_date = origination_date
WHERE maturity_date < origination_date AND is_current_flag = true;
```

---

## 6. Output Format

Return standard DQ output JSON per template:
```json
{
  "agent": "dq-facility-master",
  "scope": "table",
  "timestamp": "ISO8601",
  "tables_checked": ["l2.facility_master"],
  "findings": [ ... ],
  "summary": {
    "total_checks": 0,
    "passed": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "fixes_applied": 0,
    "fixes_verified": 0
  },
  "health_score": 0
}
```

Finding IDs use prefix `DQ-FM-NNN` (e.g., `DQ-FM-001`).

---

## 7. Regression Checks (Lessons Learned — 2026-03-25)

These issues were found in the first comprehensive DQ review and MUST be checked every run:

### 7A. Facility Type Diversity (CRITICAL regression)
```sql
SELECT COUNT(DISTINCT facility_type_id) AS distinct_types FROM l2.facility_master;
-- Must be >= 5. If = 1, all facilities share one type (the "Unknown" bug)
```

### 7B. Legal Entity Populated (CRITICAL regression)
```sql
SELECT SUM(CASE WHEN legal_entity_id IS NULL THEN 1 ELSE 0 END) AS null_le FROM l2.facility_master;
-- Must be 0. If = total rows, capital metrics cascade-fail
```

### 7C. EBT Leaf Recursion Warning
When fixing non-leaf EBT assignments, the first pass maps parent→child, but some children are themselves parents.
Always verify with a second pass count:
```sql
-- After fix, re-check. If still > 0, run the fix again.
SELECT SUM(CASE WHEN ebt.managed_segment_id IN (SELECT DISTINCT parent_segment_id FROM l1.enterprise_business_taxonomy WHERE parent_segment_id IS NOT NULL) THEN 1 ELSE 0 END) AS on_non_leaf
FROM l2.facility_master fm JOIN l1.enterprise_business_taxonomy ebt ON fm.lob_segment_id = ebt.managed_segment_id;
```
