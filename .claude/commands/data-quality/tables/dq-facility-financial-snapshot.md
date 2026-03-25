---
description: "DQ Facility Financial Snapshot — deep-dive data quality review for l2.facility_financial_snapshot"
---

# DQ Facility Financial Snapshot Review

You are a **per-table data quality agent** reviewing `l2.facility_financial_snapshot` in the GSIB credit risk PostgreSQL database. This table contains borrower financial data at the facility level (revenues, debt, income, DSCR inputs). It feeds debt service coverage ratio calculations and profitability metrics. Many fields here are raw inputs that L3 tables compute ratios from.

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
Parse `l2` array for `facility_financial_snapshot` table definition.

### Step 3: Read CLAUDE.md Conventions
Grep for:
- L1/L2/L3 Convention (calculated overlay pattern)
- GSIB Risk Sanity Checks (DSCR, LTV ranges)
- sql.js vs PG schema drift

### Step 4: Load Baseline Profile
```
Read .claude/audit/dq-baseline/baseline-profile.json
```

---

## 2. Table Profile

| Property | Value |
|----------|-------|
| Schema.Table | `l2.facility_financial_snapshot` |
| Expected rows | One per facility per reporting date (may be sparser than exposure/risk) |
| Primary key | Composite: `(facility_id, as_of_date)` or `(facility_financial_snapshot_id)` |
| Key FKs OUT | `facility_id` -> `l2.facility_master` |
| Key FKs IN | Consumed by L3 `facility_financial_calc` (DSCR, LTV, net income ratios) |
| Business meaning | Point-in-time financial statement data linked to each facility's borrower — revenue, debt, income, operating cash flow, debt service. Raw inputs for computed ratios. |

**L2/L3 Split Note:** Per CLAUDE.md conventions, this table should contain ONLY raw/atomic financial data (revenues, debt amounts, income). Computed ratios (DSCR, LTV, coverage ratios) belong in `l3.facility_financial_calc`. If any derived fields are found here, flag as layer violation.

---

## 3. Dimension Checks

### 3A. Schema Validation
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = 'facility_financial_snapshot'
ORDER BY ordinal_position;
EOSQL
```

### 3B. Primary Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT 'total_rows', COUNT(*) FROM l2.facility_financial_snapshot
UNION ALL
SELECT 'distinct_fac_date', COUNT(*) FROM (
  SELECT DISTINCT facility_id, as_of_date FROM l2.facility_financial_snapshot
) t;
EOSQL
```

### 3C. Foreign Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Orphaned facility_id
SELECT 'orphan_facility', COUNT(DISTINCT ffs.facility_id)
FROM l2.facility_financial_snapshot ffs
LEFT JOIN l2.facility_master fm ON ffs.facility_id = fm.facility_id
WHERE fm.facility_id IS NULL;
EOSQL
```

### 3D. Null Analysis
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT col, nulls, total, ROUND(100.0 * nulls / NULLIF(total, 0), 2) AS null_pct FROM (
  SELECT 'total_revenue_amt' AS col, COUNT(*) FILTER (WHERE total_revenue_amt IS NULL) AS nulls, COUNT(*) AS total FROM l2.facility_financial_snapshot
  UNION ALL SELECT 'net_income_amt', COUNT(*) FILTER (WHERE net_income_amt IS NULL), COUNT(*) FROM l2.facility_financial_snapshot
  UNION ALL SELECT 'total_debt_amt', COUNT(*) FILTER (WHERE total_debt_amt IS NULL), COUNT(*) FROM l2.facility_financial_snapshot
  UNION ALL SELECT 'total_assets_amt', COUNT(*) FILTER (WHERE total_assets_amt IS NULL), COUNT(*) FROM l2.facility_financial_snapshot
  UNION ALL SELECT 'net_operating_income_amt', COUNT(*) FILTER (WHERE net_operating_income_amt IS NULL), COUNT(*) FROM l2.facility_financial_snapshot
  UNION ALL SELECT 'debt_service_amt', COUNT(*) FILTER (WHERE debt_service_amt IS NULL), COUNT(*) FROM l2.facility_financial_snapshot
  UNION ALL SELECT 'appraised_value_amt', COUNT(*) FILTER (WHERE appraised_value_amt IS NULL), COUNT(*) FROM l2.facility_financial_snapshot
  UNION ALL SELECT 'dscr_ratio', COUNT(*) FILTER (WHERE dscr_ratio IS NULL), COUNT(*) FROM l2.facility_financial_snapshot
  UNION ALL SELECT 'ltv_pct', COUNT(*) FILTER (WHERE ltv_pct IS NULL), COUNT(*) FROM l2.facility_financial_snapshot
) t;
EOSQL
```

### 3E-3F. Distribution & Bounds
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Key financial metric ranges
SELECT
  MIN(total_revenue_amt) AS min_rev, MAX(total_revenue_amt) AS max_rev,
  MIN(net_income_amt) AS min_ni, MAX(net_income_amt) AS max_ni,
  MIN(total_debt_amt) AS min_debt, MAX(total_debt_amt) AS max_debt,
  MIN(total_assets_amt) AS min_assets, MAX(total_assets_amt) AS max_assets,
  MIN(dscr_ratio) AS min_dscr, MAX(dscr_ratio) AS max_dscr,
  MIN(ltv_pct) AS min_ltv, MAX(ltv_pct) AS max_ltv
FROM l2.facility_financial_snapshot;
EOSQL
```

### 3G. Temporal
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT as_of_date, COUNT(*), COUNT(DISTINCT facility_id) AS distinct_facilities
FROM l2.facility_financial_snapshot
GROUP BY as_of_date ORDER BY as_of_date;
EOSQL
```

### 3H-3J. (Cross-Table)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Financial snapshot coverage vs exposure snapshot
SELECT 'fes_facilities', COUNT(DISTINCT facility_id) FROM l2.facility_exposure_snapshot
UNION ALL
SELECT 'ffs_facilities', COUNT(DISTINCT facility_id) FROM l2.facility_financial_snapshot;
EOSQL
```

---

## 4. Business Rule Checks (Financial Snapshot Specific)

### 4A. DSCR Ratio Range (CRITICAL)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- DSCR typically 0.5-5.0x; negative is critical (negative NOI)
SELECT
  COUNT(*) FILTER (WHERE dscr_ratio < 0) AS negative_dscr,
  COUNT(*) FILTER (WHERE dscr_ratio BETWEEN 0 AND 0.99) AS below_1x,
  COUNT(*) FILTER (WHERE dscr_ratio BETWEEN 1.0 AND 1.24) AS thin_coverage,
  COUNT(*) FILTER (WHERE dscr_ratio BETWEEN 1.25 AND 2.0) AS adequate,
  COUNT(*) FILTER (WHERE dscr_ratio BETWEEN 2.01 AND 5.0) AS strong,
  COUNT(*) FILTER (WHERE dscr_ratio > 5.0) AS very_high,
  COUNT(*) FILTER (WHERE dscr_ratio > 50.0) AS suspicious_high,
  COUNT(*) FILTER (WHERE dscr_ratio IS NULL) AS null_dscr,
  COUNT(*) AS total
FROM l2.facility_financial_snapshot;
EOSQL
```
**Severity:** CRITICAL if negative DSCR (indicates negative cash flow or data error). HIGH if >10% are suspicious (>50x).

**Layer check:** If `dscr_ratio` exists in this L2 table, verify whether it is a raw input from a source system or should be in L3. If it is computed from `net_operating_income_amt / debt_service_amt`, it belongs in `l3.facility_financial_calc`.

### 4B. LTV Percentage Range
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  COUNT(*) FILTER (WHERE ltv_pct < 0) AS negative_ltv,
  COUNT(*) FILTER (WHERE ltv_pct BETWEEN 0 AND 65) AS safe,
  COUNT(*) FILTER (WHERE ltv_pct BETWEEN 65 AND 80) AS moderate,
  COUNT(*) FILTER (WHERE ltv_pct BETWEEN 80 AND 100) AS high,
  COUNT(*) FILTER (WHERE ltv_pct > 100) AS underwater,
  COUNT(*) FILTER (WHERE ltv_pct > 200) AS extreme,
  COUNT(*) FILTER (WHERE ltv_pct IS NULL) AS null_ltv,
  COUNT(*) AS total
FROM l2.facility_financial_snapshot;
EOSQL
```
**Severity:** HIGH if negative LTV. MEDIUM if >20% are underwater (>100%).

### 4C. Revenue Positive for Most
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  COUNT(*) FILTER (WHERE total_revenue_amt > 0) AS positive_rev,
  COUNT(*) FILTER (WHERE total_revenue_amt = 0) AS zero_rev,
  COUNT(*) FILTER (WHERE total_revenue_amt < 0) AS negative_rev,
  COUNT(*) FILTER (WHERE total_revenue_amt IS NULL) AS null_rev,
  COUNT(*) AS total
FROM l2.facility_financial_snapshot;
EOSQL
```
**Severity:** MEDIUM if >30% zero/negative revenue.

### 4D. Net Income Can Be Negative (Losses) But Should Be Realistic
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Net income distribution
SELECT
  COUNT(*) FILTER (WHERE net_income_amt < -1e9) AS large_loss,
  COUNT(*) FILTER (WHERE net_income_amt BETWEEN -1e9 AND 0) AS loss,
  COUNT(*) FILTER (WHERE net_income_amt BETWEEN 0 AND 1e6) AS small_profit,
  COUNT(*) FILTER (WHERE net_income_amt BETWEEN 1e6 AND 1e9) AS profit,
  COUNT(*) FILTER (WHERE net_income_amt > 1e9) AS large_profit,
  COUNT(*) FILTER (WHERE net_income_amt IS NULL) AS null_ni
FROM l2.facility_financial_snapshot;
EOSQL
```
**Severity:** LOW. Losses are valid. Flag only if distribution seems unrealistic.

### 4E. Total Debt Non-Negative
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT facility_id, as_of_date, total_debt_amt
FROM l2.facility_financial_snapshot
WHERE total_debt_amt < 0
LIMIT 20;
EOSQL
```
**Severity:** HIGH. Negative total debt is invalid.

### 4F. DSCR Consistency (NOI / Debt Service)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- If both NOI and debt service exist, verify DSCR = NOI / debt_service
SELECT facility_id, as_of_date,
  dscr_ratio AS stored_dscr,
  ROUND(net_operating_income_amt / NULLIF(debt_service_amt, 0), 4) AS computed_dscr,
  ABS(dscr_ratio - (net_operating_income_amt / NULLIF(debt_service_amt, 0))) AS delta
FROM l2.facility_financial_snapshot
WHERE dscr_ratio IS NOT NULL
  AND net_operating_income_amt IS NOT NULL
  AND debt_service_amt IS NOT NULL
  AND debt_service_amt != 0
  AND ABS(dscr_ratio - (net_operating_income_amt / NULLIF(debt_service_amt, 0))) > 0.05
ORDER BY delta DESC
LIMIT 20;
EOSQL
```
**Severity:** HIGH if delta > 0.5. MEDIUM if 0.05-0.5.

### 4G. Assets >= Debt (Balance Sheet Consistency)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Typically total_assets >= total_debt (unless deeply insolvent)
SELECT facility_id, as_of_date, total_assets_amt, total_debt_amt,
  total_debt_amt - total_assets_amt AS excess_debt
FROM l2.facility_financial_snapshot
WHERE total_assets_amt IS NOT NULL AND total_debt_amt IS NOT NULL
  AND total_debt_amt > total_assets_amt * 1.5
ORDER BY excess_debt DESC
LIMIT 10;
EOSQL
```
**Severity:** MEDIUM. Debt > 1.5x assets is unusual but possible for highly leveraged entities.

### 4H. Appraised Value for Secured Facilities
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Secured facilities should have appraised_value_amt populated
SELECT fm.facility_id, ft.facility_type_name, ffs.appraised_value_amt
FROM l2.facility_financial_snapshot ffs
JOIN l2.facility_master fm ON ffs.facility_id = fm.facility_id AND fm.is_current_flag = true
LEFT JOIN l1.facility_type_dim ft ON fm.facility_type_id = ft.facility_type_id
WHERE ffs.appraised_value_amt IS NULL
  AND ft.facility_type_name ILIKE '%secured%'
  AND ffs.as_of_date = (SELECT MAX(as_of_date) FROM l2.facility_financial_snapshot)
LIMIT 20;
EOSQL
```
**Severity:** MEDIUM. Missing appraisals prevent LTV calculation for secured facilities.

### 4I. Layer Violation Check
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Check for computed/derived columns that should be in L3
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = 'facility_financial_snapshot'
  AND (column_name LIKE '%_ratio' OR column_name LIKE '%_score'
    OR column_name LIKE '%coverage%' OR column_name LIKE '%derived%');
EOSQL
```
**Severity:** MEDIUM. Computed ratios in L2 violate the calculated overlay pattern.

---

## 5. Fix Procedures

### Fix: DSCR Recalculation
```sql
-- Recompute DSCR from component fields (if DSCR belongs in this table)
UPDATE l2.facility_financial_snapshot
SET dscr_ratio = ROUND(net_operating_income_amt / NULLIF(debt_service_amt, 0), 4)
WHERE net_operating_income_amt IS NOT NULL
  AND debt_service_amt IS NOT NULL AND debt_service_amt != 0
  AND ABS(dscr_ratio - (net_operating_income_amt / NULLIF(debt_service_amt, 0))) > 0.5;
```

### Fix: Negative Total Debt
```sql
UPDATE l2.facility_financial_snapshot
SET total_debt_amt = ABS(total_debt_amt)
WHERE total_debt_amt < 0;
```

---

## 6. Output Format

Return standard DQ output JSON per template. Finding IDs use prefix `DQ-FFS-NNN` (e.g., `DQ-FFS-001`).
