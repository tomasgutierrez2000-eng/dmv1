---
description: "DQ Credit Agreement Master — deep-dive data quality review for l2.credit_agreement_master"
---

# DQ Credit Agreement Master Review

You are a **per-table data quality agent** reviewing `l2.credit_agreement_master` in the GSIB credit risk PostgreSQL database. Credit agreements are the legal contracts under which facilities are extended. They bridge counterparties to facilities and are critical for syndication, CACP participation, and agreement-level reporting.

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
Parse `l2` array for `credit_agreement_master` table definition.

### Step 3: Read CLAUDE.md Conventions
Grep for:
- Agreement-Facility Counterparty Alignment
- FK Referential Integrity Rules
- SCD-2 conventions

### Step 4: Load Baseline Profile
```
Read .claude/audit/dq-baseline/baseline-profile.json
```

---

## 2. Table Profile

| Property | Value |
|----------|-------|
| Schema.Table | `l2.credit_agreement_master` |
| Expected rows | 100+ (seed) + scenario agreements |
| Primary key | `credit_agreement_id` (BIGINT) |
| SCD type | Type 2 (if applicable) |
| Key FKs OUT | `borrower_counterparty_id` -> `l2.counterparty` |
| Key FKs IN | `l2.facility_master.credit_agreement_id`, `l2.credit_agreement_counterparty_participation` |
| Business meaning | Legal credit agreements (revolving credit facilities, term loans, syndicated deals). Each agreement may have multiple facilities underneath it. |

---

## 3. Dimension Checks

### 3A. Schema Validation
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT column_name, data_type, is_nullable, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = 'credit_agreement_master'
ORDER BY ordinal_position;
EOSQL
```

### 3B. Primary Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT 'total_rows', COUNT(*) FROM l2.credit_agreement_master
UNION ALL
SELECT 'distinct_pks', COUNT(DISTINCT credit_agreement_id) FROM l2.credit_agreement_master
UNION ALL
SELECT 'null_pks', COUNT(*) FROM l2.credit_agreement_master WHERE credit_agreement_id IS NULL;
"
```

### 3C. Foreign Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Orphaned borrower_counterparty_id
SELECT 'orphan_borrower_cp', COUNT(*)
FROM l2.credit_agreement_master ca
LEFT JOIN l2.counterparty c ON ca.borrower_counterparty_id = c.counterparty_id
WHERE c.counterparty_id IS NULL AND ca.borrower_counterparty_id IS NOT NULL;
EOSQL
```

### 3D. Null Analysis
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT col, nulls, total, ROUND(100.0 * nulls / NULLIF(total, 0), 2) AS null_pct FROM (
  SELECT 'borrower_counterparty_id' AS col, COUNT(*) FILTER (WHERE borrower_counterparty_id IS NULL) AS nulls, COUNT(*) AS total FROM l2.credit_agreement_master
  UNION ALL SELECT 'agreement_type_code', COUNT(*) FILTER (WHERE agreement_type_code IS NULL), COUNT(*) FROM l2.credit_agreement_master
  UNION ALL SELECT 'effective_date', COUNT(*) FILTER (WHERE effective_date IS NULL), COUNT(*) FROM l2.credit_agreement_master
  UNION ALL SELECT 'maturity_date', COUNT(*) FILTER (WHERE maturity_date IS NULL), COUNT(*) FROM l2.credit_agreement_master
  UNION ALL SELECT 'agreement_amount_amt', COUNT(*) FILTER (WHERE agreement_amount_amt IS NULL), COUNT(*) FROM l2.credit_agreement_master
  UNION ALL SELECT 'currency_code', COUNT(*) FILTER (WHERE currency_code IS NULL), COUNT(*) FROM l2.credit_agreement_master
) t;
EOSQL
```

### 3E. Data Type Conformance
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT column_name, data_type,
  CASE
    WHEN column_name LIKE '%_id' AND data_type NOT IN ('bigint','integer') THEN 'FAIL'
    WHEN column_name LIKE '%_code' AND data_type NOT LIKE 'character%' THEN 'FAIL'
    WHEN column_name LIKE '%_amt' AND data_type != 'numeric' THEN 'FAIL'
    WHEN column_name LIKE '%_date' AND data_type != 'date' THEN 'FAIL'
    WHEN column_name LIKE '%_flag' AND data_type != 'boolean' THEN 'FAIL'
    ELSE 'OK'
  END AS check
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = 'credit_agreement_master'
ORDER BY ordinal_position;
EOSQL
```

### 3F. Distribution Analysis
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Agreement type distribution
SELECT agreement_type_code, COUNT(*) FROM l2.credit_agreement_master GROUP BY agreement_type_code ORDER BY COUNT(*) DESC;

-- Currency distribution
SELECT currency_code, COUNT(*) FROM l2.credit_agreement_master GROUP BY currency_code ORDER BY COUNT(*) DESC;

-- Facilities per agreement distribution
SELECT ca.credit_agreement_id, COUNT(fm.facility_id) AS fac_count
FROM l2.credit_agreement_master ca
LEFT JOIN l2.facility_master fm ON ca.credit_agreement_id = fm.credit_agreement_id AND fm.is_current_flag = true
GROUP BY ca.credit_agreement_id
ORDER BY fac_count DESC LIMIT 20;
EOSQL
```

### 3G-3J. (Temporal, Bounds, Booleans, Cross-Table)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Temporal
SELECT MIN(effective_date), MAX(effective_date), MIN(maturity_date), MAX(maturity_date) FROM l2.credit_agreement_master;

-- Bounds
SELECT MIN(agreement_amount_amt), MAX(agreement_amount_amt), AVG(agreement_amount_amt),
  COUNT(*) FILTER (WHERE agreement_amount_amt <= 0) AS non_positive
FROM l2.credit_agreement_master;

-- Agreements with no facilities
SELECT 'agreements_no_facilities', COUNT(*)
FROM l2.credit_agreement_master ca
LEFT JOIN l2.facility_master fm ON ca.credit_agreement_id = fm.credit_agreement_id AND fm.is_current_flag = true
WHERE fm.facility_id IS NULL;
EOSQL
```

---

## 4. Business Rule Checks (Credit Agreement Specific)

### 4A. Borrower-Facility Counterparty Alignment (CRITICAL)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Facility counterparty != agreement borrower (excluding syndicated)
SELECT fm.facility_id, fm.counterparty_id AS fac_cp,
  ca.borrower_counterparty_id AS agr_cp,
  ca.credit_agreement_id
FROM l2.facility_master fm
JOIN l2.credit_agreement_master ca ON fm.credit_agreement_id = ca.credit_agreement_id
WHERE fm.counterparty_id != ca.borrower_counterparty_id
  AND fm.is_current_flag = true
  AND NOT EXISTS (
    SELECT 1 FROM l2.credit_agreement_counterparty_participation cacp
    WHERE cacp.credit_agreement_id = ca.credit_agreement_id
  )
ORDER BY ca.credit_agreement_id;
EOSQL
```
**Severity:** HIGH. Misalignment breaks counterparty-level rollups unless syndication is documented.

### 4B. Effective Date Before Maturity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT credit_agreement_id, effective_date, maturity_date
FROM l2.credit_agreement_master
WHERE maturity_date <= effective_date
  AND maturity_date IS NOT NULL AND effective_date IS NOT NULL;
EOSQL
```
**Severity:** HIGH. Agreement cannot mature before it becomes effective.

### 4C. Agreement Type Validity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Check if agreement_type_code references a dim table
SELECT DISTINCT ca.agreement_type_code
FROM l2.credit_agreement_master ca
WHERE ca.agreement_type_code IS NOT NULL
ORDER BY ca.agreement_type_code;
EOSQL
```
**Severity:** MEDIUM if invalid codes found.

### 4D. Every Agreement Has At Least One Facility
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT ca.credit_agreement_id, ca.borrower_counterparty_id
FROM l2.credit_agreement_master ca
LEFT JOIN l2.facility_master fm ON ca.credit_agreement_id = fm.credit_agreement_id AND fm.is_current_flag = true
WHERE fm.facility_id IS NULL
ORDER BY ca.credit_agreement_id;
EOSQL
```
**Severity:** MEDIUM. Agreements without facilities are either orphaned or data gaps.

### 4E. Agreement Amount vs Facility Commitments
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Sum of facility commitments should not exceed agreement amount (with tolerance)
SELECT ca.credit_agreement_id,
  ca.agreement_amount_amt AS agr_amt,
  SUM(fm.committed_facility_amt) AS sum_fac_committed,
  CASE
    WHEN ca.agreement_amount_amt > 0
      THEN ROUND(100.0 * SUM(fm.committed_facility_amt) / ca.agreement_amount_amt, 2)
    ELSE NULL
  END AS utilization_pct
FROM l2.credit_agreement_master ca
JOIN l2.facility_master fm ON ca.credit_agreement_id = fm.credit_agreement_id AND fm.is_current_flag = true
WHERE ca.agreement_amount_amt IS NOT NULL AND ca.agreement_amount_amt > 0
GROUP BY ca.credit_agreement_id, ca.agreement_amount_amt
HAVING SUM(fm.committed_facility_amt) > ca.agreement_amount_amt * 1.01
ORDER BY utilization_pct DESC;
EOSQL
```
**Severity:** MEDIUM. Facility commitments exceeding agreement amount by >1% indicates data error.

### 4F. Syndication Participation Check
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Agreements with CACP entries — verify participation makes sense
SELECT ca.credit_agreement_id,
  ca.borrower_counterparty_id,
  COUNT(cacp.counterparty_id) AS participant_count,
  SUM(cacp.participation_pct) AS total_participation_pct
FROM l2.credit_agreement_master ca
JOIN l2.credit_agreement_counterparty_participation cacp
  ON ca.credit_agreement_id = cacp.credit_agreement_id
GROUP BY ca.credit_agreement_id, ca.borrower_counterparty_id
HAVING SUM(cacp.participation_pct) NOT BETWEEN 99.9 AND 100.1
ORDER BY total_participation_pct;
EOSQL
```
**Severity:** HIGH if participation percentages do not sum to ~100%.

### 4G. Duplicate Agreement Detection
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Near-duplicate agreements (same borrower, same effective date, same amount)
SELECT borrower_counterparty_id, effective_date, agreement_amount_amt,
  COUNT(*) AS dup_count, ARRAY_AGG(credit_agreement_id) AS agr_ids
FROM l2.credit_agreement_master
WHERE effective_date IS NOT NULL AND agreement_amount_amt IS NOT NULL
GROUP BY borrower_counterparty_id, effective_date, agreement_amount_amt
HAVING COUNT(*) > 1;
EOSQL
```
**Severity:** MEDIUM. Potential data duplication.

---

## 5. Fix Procedures

### Fix: Borrower-Facility Misalignment
```sql
-- Option 1: Update facility to match agreement borrower
UPDATE l2.facility_master fm
SET counterparty_id = ca.borrower_counterparty_id
FROM l2.credit_agreement_master ca
WHERE fm.credit_agreement_id = ca.credit_agreement_id
  AND fm.counterparty_id != ca.borrower_counterparty_id
  AND fm.is_current_flag = true
  AND NOT EXISTS (
    SELECT 1 FROM l2.credit_agreement_counterparty_participation cacp
    WHERE cacp.credit_agreement_id = ca.credit_agreement_id
  );
```

### Fix: Maturity Before Effective Date
```sql
-- Manual review required — could be date entry error
-- Log finding for business user review
```

---

## 6. Output Format

Return standard DQ output JSON per template. Finding IDs use prefix `DQ-CA-NNN` (e.g., `DQ-CA-001`).
