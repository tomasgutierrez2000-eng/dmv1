---
description: "DQ Facility Exposure Snapshot — deep-dive data quality review for l2.facility_exposure_snapshot"
---

# DQ Facility Exposure Snapshot Review

You are a **per-table data quality agent** reviewing `l2.facility_exposure_snapshot` in the GSIB credit risk PostgreSQL database. This is the highest-volume L2 table, containing point-in-time exposure amounts for every facility. It is the primary input to nearly every exposure metric (EXP-001 through EXP-049) and feeds capital calculations (RWA, EAD).

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
Parse `l2` array for `facility_exposure_snapshot` table definition.

### Step 3: Read CLAUDE.md Conventions
Grep for:
- Data Type Rules (suffix -> type mapping)
- FK Referential Integrity Rules
- Common YAML Formula Bugs (NULL weight propagation, COALESCE patterns)

### Step 4: Load Baseline Profile
```
Read .claude/audit/dq-baseline/baseline-profile.json
```

---

## 2. Table Profile

| Property | Value |
|----------|-------|
| Schema.Table | `l2.facility_exposure_snapshot` |
| Expected rows | 2,750+ (seed + scenarios + time-series) |
| Primary key | Composite: `(facility_id, as_of_date)` or `(facility_exposure_id)` |
| Key FKs OUT | `facility_id` -> `l2.facility_master`, `counterparty_id` -> `l2.counterparty`, `currency_code` -> `l1.currency_dim` |
| Key FKs IN | Consumed by nearly all EXP-* metrics, capital calculations, L3 exposure_metric_cube |
| Business meaning | Point-in-time snapshot of a facility's drawn, undrawn, and committed amounts. One row per facility per reporting date. |

---

## 3. Dimension Checks

### 3A. Schema Validation
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT column_name, data_type, is_nullable, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = 'facility_exposure_snapshot'
ORDER BY ordinal_position;
EOSQL
```

### 3B. Primary Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT 'total_rows', COUNT(*) FROM l2.facility_exposure_snapshot
UNION ALL
SELECT 'distinct_facility_date_pairs', COUNT(*) FROM (
  SELECT DISTINCT facility_id, as_of_date FROM l2.facility_exposure_snapshot
) t
UNION ALL
SELECT 'null_facility_id', COUNT(*) FROM l2.facility_exposure_snapshot WHERE facility_id IS NULL
UNION ALL
SELECT 'null_as_of_date', COUNT(*) FROM l2.facility_exposure_snapshot WHERE as_of_date IS NULL;
EOSQL
```

### 3C. Foreign Key Integrity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Orphaned facility_id
SELECT 'orphan_facility', COUNT(DISTINCT fes.facility_id)
FROM l2.facility_exposure_snapshot fes
LEFT JOIN l2.facility_master fm ON fes.facility_id = fm.facility_id
WHERE fm.facility_id IS NULL;

-- Orphaned counterparty_id (if column exists)
SELECT 'orphan_counterparty', COUNT(DISTINCT fes.counterparty_id)
FROM l2.facility_exposure_snapshot fes
LEFT JOIN l2.counterparty c ON fes.counterparty_id = c.counterparty_id
WHERE fes.counterparty_id IS NOT NULL AND c.counterparty_id IS NULL;

-- Orphaned currency_code
SELECT 'orphan_currency', COUNT(*)
FROM l2.facility_exposure_snapshot fes
LEFT JOIN l1.currency_dim cd ON fes.currency_code = cd.currency_code
WHERE fes.currency_code IS NOT NULL AND cd.currency_code IS NULL;
EOSQL
```

### 3D. Null Analysis
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT col, nulls, total, ROUND(100.0 * nulls / NULLIF(total, 0), 2) AS null_pct FROM (
  SELECT 'drawn_amount' AS col, COUNT(*) FILTER (WHERE drawn_amount IS NULL) AS nulls, COUNT(*) AS total FROM l2.facility_exposure_snapshot
  UNION ALL SELECT 'committed_amount', COUNT(*) FILTER (WHERE committed_amount IS NULL), COUNT(*) FROM l2.facility_exposure_snapshot
  UNION ALL SELECT 'undrawn_amount', COUNT(*) FILTER (WHERE undrawn_amount IS NULL), COUNT(*) FROM l2.facility_exposure_snapshot
  UNION ALL SELECT 'bank_share_pct', COUNT(*) FILTER (WHERE bank_share_pct IS NULL), COUNT(*) FROM l2.facility_exposure_snapshot
  UNION ALL SELECT 'currency_code', COUNT(*) FILTER (WHERE currency_code IS NULL), COUNT(*) FROM l2.facility_exposure_snapshot
  UNION ALL SELECT 'counterparty_id', COUNT(*) FILTER (WHERE counterparty_id IS NULL), COUNT(*) FROM l2.facility_exposure_snapshot
  UNION ALL SELECT 'gross_exposure_usd', COUNT(*) FILTER (WHERE gross_exposure_usd IS NULL), COUNT(*) FROM l2.facility_exposure_snapshot
) t;
EOSQL
```

### 3E. Data Type Conformance
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT column_name, data_type,
  CASE
    WHEN column_name LIKE '%_amt' AND data_type != 'numeric' THEN 'FAIL'
    WHEN column_name LIKE '%_pct' AND data_type != 'numeric' THEN 'FAIL'
    WHEN column_name LIKE '%_id' AND data_type NOT IN ('bigint','integer') THEN 'FAIL'
    WHEN column_name LIKE '%_date' AND data_type != 'date' THEN 'FAIL'
    WHEN column_name LIKE '%_code' AND data_type NOT LIKE 'character%' THEN 'FAIL'
    ELSE 'OK'
  END AS check
FROM information_schema.columns
WHERE table_schema = 'l2' AND table_name = 'facility_exposure_snapshot'
ORDER BY ordinal_position;
EOSQL
```

### 3F. Distribution Analysis
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Snapshot date distribution
SELECT as_of_date, COUNT(*) AS row_count
FROM l2.facility_exposure_snapshot
GROUP BY as_of_date ORDER BY as_of_date;

-- Currency distribution
SELECT currency_code, COUNT(*) FROM l2.facility_exposure_snapshot GROUP BY currency_code ORDER BY COUNT(*) DESC;

-- Facilities per snapshot date
SELECT as_of_date, COUNT(DISTINCT facility_id) AS distinct_facilities
FROM l2.facility_exposure_snapshot
GROUP BY as_of_date ORDER BY as_of_date;
EOSQL
```

### 3G. Temporal Consistency
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Date range
SELECT MIN(as_of_date) AS earliest, MAX(as_of_date) AS latest,
  COUNT(DISTINCT as_of_date) AS distinct_dates
FROM l2.facility_exposure_snapshot;

-- Check for month-end dates
SELECT as_of_date, EXTRACT(DAY FROM (as_of_date + INTERVAL '1 day')) AS next_day
FROM (SELECT DISTINCT as_of_date FROM l2.facility_exposure_snapshot) t
WHERE EXTRACT(DAY FROM (as_of_date + INTERVAL '1 day')) != 1
ORDER BY as_of_date;
EOSQL
```

### 3H. Bounds & Range Checks
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  MIN(drawn_amount) AS min_drawn, MAX(drawn_amount) AS max_drawn,
  MIN(committed_amount) AS min_committed, MAX(committed_amount) AS max_committed,
  MIN(undrawn_amount) AS min_undrawn, MAX(undrawn_amount) AS max_undrawn,
  MIN(bank_share_pct) AS min_bank_share, MAX(bank_share_pct) AS max_bank_share,
  COUNT(*) FILTER (WHERE drawn_amount < 0) AS negative_drawn,
  COUNT(*) FILTER (WHERE committed_amount < 0) AS negative_committed,
  COUNT(*) FILTER (WHERE undrawn_amount < 0) AS negative_undrawn
FROM l2.facility_exposure_snapshot;
EOSQL
```

### 3I-3J. (Boolean, Cross-Table)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Exposure snapshots for facilities not in facility_master
SELECT COUNT(DISTINCT fes.facility_id) AS phantom_facilities
FROM l2.facility_exposure_snapshot fes
LEFT JOIN l2.facility_master fm ON fes.facility_id = fm.facility_id
WHERE fm.facility_id IS NULL;

-- Active facilities missing from latest snapshot date
SELECT COUNT(DISTINCT fm.facility_id) AS missing_from_latest
FROM l2.facility_master fm
LEFT JOIN l2.facility_exposure_snapshot fes
  ON fm.facility_id = fes.facility_id
  AND fes.as_of_date = (SELECT MAX(as_of_date) FROM l2.facility_exposure_snapshot)
WHERE fm.is_current_flag = true AND fes.facility_id IS NULL;
EOSQL
```

---

## 4. Business Rule Checks (Exposure Snapshot Specific)

### 4A. Drawn <= Committed (CRITICAL)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Drawn exceeds committed (with 0.1% tolerance for rounding)
SELECT facility_id, as_of_date, drawn_amount, committed_amount,
  drawn_amount - committed_amount AS excess,
  ROUND(100.0 * drawn_amount / NULLIF(committed_amount, 0), 2) AS draw_pct
FROM l2.facility_exposure_snapshot
WHERE drawn_amount > committed_amount * 1.001
  AND committed_amount > 0
ORDER BY (drawn_amount - committed_amount) DESC
LIMIT 20;
EOSQL
```
**Severity:** HIGH. Over-drawn facilities indicate data error (unless overdraft facility type).

### 4B. Undrawn = Committed - Drawn (Consistency)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT facility_id, as_of_date,
  committed_amount, drawn_amount, undrawn_amount,
  committed_amount - drawn_amount AS expected_undrawn,
  ABS(undrawn_amount - (committed_amount - drawn_amount)) AS delta
FROM l2.facility_exposure_snapshot
WHERE ABS(undrawn_amount - (committed_amount - drawn_amount)) > 0.01
  AND committed_amount IS NOT NULL AND drawn_amount IS NOT NULL AND undrawn_amount IS NOT NULL
ORDER BY delta DESC
LIMIT 20;
EOSQL
```
**Severity:** HIGH. Inconsistent amounts break utilization metrics.

### 4C. Bank Share Percentage Bounds
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT facility_id, as_of_date, bank_share_pct
FROM l2.facility_exposure_snapshot
WHERE bank_share_pct IS NOT NULL
  AND (bank_share_pct <= 0 OR bank_share_pct > 100);
EOSQL
```
**Severity:** HIGH. Bank share must be 0-100%. Values outside range corrupt exposure calculations.

### 4D. Committed Amount Positive
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT facility_id, as_of_date, committed_amount
FROM l2.facility_exposure_snapshot
WHERE committed_amount <= 0 OR committed_amount IS NULL
LIMIT 20;
EOSQL
```
**Severity:** HIGH for zero/negative. MEDIUM for NULL.

### 4E. No Negative Amounts
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT facility_id, as_of_date, drawn_amount, committed_amount, undrawn_amount
FROM l2.facility_exposure_snapshot
WHERE drawn_amount < 0 OR committed_amount < 0 OR undrawn_amount < 0
LIMIT 20;
EOSQL
```
**Severity:** HIGH. Negative amounts are invalid for credit exposures.

### 4F. Snapshot Date Coverage (Panel Balance)
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Check if all active facilities appear in each snapshot date
WITH dates AS (SELECT DISTINCT as_of_date FROM l2.facility_exposure_snapshot),
     facilities AS (SELECT DISTINCT facility_id FROM l2.facility_master WHERE is_current_flag = true),
     expected AS (SELECT f.facility_id, d.as_of_date FROM facilities f CROSS JOIN dates d),
     actual AS (SELECT facility_id, as_of_date FROM l2.facility_exposure_snapshot)
SELECT e.as_of_date, COUNT(*) AS missing_facilities
FROM expected e
LEFT JOIN actual a ON e.facility_id = a.facility_id AND e.as_of_date = a.as_of_date
WHERE a.facility_id IS NULL
GROUP BY e.as_of_date
ORDER BY e.as_of_date;
EOSQL
```
**Severity:** MEDIUM. Incomplete panels cause metric gaps per date.

### 4G. Month-End Date Validation
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- as_of_date should typically be month-end (or weekly for time-series)
SELECT as_of_date, EXTRACT(DOW FROM as_of_date) AS day_of_week,
  CASE WHEN EXTRACT(DAY FROM as_of_date + INTERVAL '1 day') = 1 THEN 'MONTH_END' ELSE 'MID_MONTH' END AS date_type,
  COUNT(*) AS row_count
FROM l2.facility_exposure_snapshot
GROUP BY as_of_date
ORDER BY as_of_date;
EOSQL
```
**Severity:** LOW. Weekly snapshots are valid for time-series factory data.

### 4H. Gross Exposure USD Coverage
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- gross_exposure_usd NULL gaps (needed for weighted avg metrics)
SELECT as_of_date,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE gross_exposure_usd IS NULL) AS null_gross,
  ROUND(100.0 * COUNT(*) FILTER (WHERE gross_exposure_usd IS NULL) / COUNT(*), 2) AS null_pct
FROM l2.facility_exposure_snapshot
GROUP BY as_of_date
ORDER BY as_of_date;
EOSQL
```
**Severity:** HIGH if >15% NULL. Weighted avg metrics return NULL for segments with NULL weights.

### 4I. Extreme Exposure Values
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
-- Flag extremely large exposures (>$10B single facility)
SELECT facility_id, as_of_date, committed_amount, drawn_amount, currency_code
FROM l2.facility_exposure_snapshot
WHERE committed_amount > 10000000000
ORDER BY committed_amount DESC;

-- Flag zero-draw facilities with undrawn > 0 (undrawn revolvers — valid but check distribution)
SELECT COUNT(*) AS zero_draw_facilities,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM l2.facility_exposure_snapshot), 2) AS pct
FROM l2.facility_exposure_snapshot
WHERE drawn_amount = 0 AND undrawn_amount > 0;
EOSQL
```
**Severity:** LOW for valid undrawn revolvers, MEDIUM for unrealistic >$10B single facilities.

---

## 5. Fix Procedures

### Fix: Undrawn Inconsistency
```sql
UPDATE l2.facility_exposure_snapshot
SET undrawn_amount = committed_amount - drawn_amount
WHERE ABS(undrawn_amount - (committed_amount - drawn_amount)) > 0.01
  AND committed_amount IS NOT NULL AND drawn_amount IS NOT NULL;
```

### Fix: Negative Amounts
```sql
UPDATE l2.facility_exposure_snapshot
SET drawn_amount = ABS(drawn_amount) WHERE drawn_amount < 0;
```

---

## 6. Output Format

Return standard DQ output JSON per template. Finding IDs use prefix `DQ-FES-NNN` (e.g., `DQ-FES-001`).
