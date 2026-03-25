---
description: "DQ Collateral Snapshot — validates collateral values, type diversity, LTV derivation, and date alignment in l2.collateral_snapshot"
---

# DQ Collateral Snapshot

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You perform a deep-dive review of `l2.collateral_snapshot` — the table that stores periodic collateral valuations backing credit facilities. Collateral data feeds LTV ratios, LGD estimates, and RWA calculations. Under-valued or missing collateral silently inflates risk-weighted assets and capital requirements.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` — parse the L2 entry for `collateral_snapshot` to get all column names, types, PKs, and FKs
3. Read `CLAUDE.md` sections on "FK Referential Integrity Rules" and "GSIB Risk Sanity Checks" (LTV ranges)
4. If a baseline profile exists at `.claude/audit/dq-baselines/collateral-snapshot.json`, load it for delta comparison

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/tables:dq-collateral-snapshot
/data-quality/tables:dq-collateral-snapshot --fix
```

### Mode B: Orchestrator
Receives JSON payload:
```json
{
  "mode": "orchestrator",
  "fix_mode": false
}
```

If `$ARGUMENTS` contains `--fix`, execute fix procedures after reporting. Otherwise, report only.

---

## 3. Check Procedures

### 3A. Row Count and Basic Profile

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT COUNT(*) AS total_rows,
       COUNT(DISTINCT facility_id) AS distinct_facilities,
       COUNT(DISTINCT collateral_type_code) AS distinct_types,
       MIN(as_of_date) AS earliest_date,
       MAX(as_of_date) AS latest_date,
       COUNT(*) FILTER (WHERE collateral_value_amt IS NULL) AS null_value_count,
       COUNT(*) FILTER (WHERE collateral_value_amt <= 0) AS non_positive_value_count
FROM l2.collateral_snapshot;
"
```

**Severity rules:**
- CRITICAL if `total_rows = 0` (no collateral data)
- CRITICAL if `non_positive_value_count > 0` (collateral must have positive value)
- HIGH if `null_value_count > 0` (value is the core field)
- MEDIUM if `distinct_types < 3` (should have diverse collateral types: RE, securities, cash, receivables)

### 3B. Collateral Value Positivity and Realism

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT MIN(collateral_value_amt) AS min_value,
       MAX(collateral_value_amt) AS max_value,
       AVG(collateral_value_amt) AS avg_value,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY collateral_value_amt) AS median_value,
       PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY collateral_value_amt) AS p99_value
FROM l2.collateral_snapshot
WHERE collateral_value_amt IS NOT NULL;
"
```

**Severity rules:**
- CRITICAL if `min_value <= 0` (negative or zero collateral values are invalid)
- HIGH if `max_value > 10000000000` (>$10B single collateral — verify outliers)
- MEDIUM if `avg_value < 1000` (suspiciously low — may be placeholder data)

### 3C. Collateral Type Distribution

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT collateral_type_code, COUNT(*) AS cnt,
       AVG(collateral_value_amt) AS avg_value,
       SUM(collateral_value_amt) AS total_value
FROM l2.collateral_snapshot
GROUP BY collateral_type_code
ORDER BY cnt DESC;
"
```

Cross-reference against collateral type dim (if exists):

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT cs.collateral_type_code, COUNT(*) AS unmatched_rows
FROM l2.collateral_snapshot cs
LEFT JOIN l1.collateral_type_dim ctd ON cs.collateral_type_code = ctd.collateral_type_code
WHERE ctd.collateral_type_code IS NULL AND cs.collateral_type_code IS NOT NULL
GROUP BY cs.collateral_type_code;
"
```

**Severity:**
- HIGH if collateral type codes do not match dim table entries
- MEDIUM if all collateral is the same type (no diversity)
- LOW if one type dominates >80% of rows

### 3D. FK Integrity — facility_id and collateral_asset_id

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT 'facility_id' AS fk_col, COUNT(*) AS orphan_count
FROM l2.collateral_snapshot cs
LEFT JOIN l2.facility_master fm ON cs.facility_id = fm.facility_id
WHERE cs.facility_id IS NOT NULL AND fm.facility_id IS NULL
UNION ALL
SELECT 'collateral_asset_id' AS fk_col, COUNT(*) AS orphan_count
FROM l2.collateral_snapshot cs
LEFT JOIN l2.collateral_asset_master cam ON cs.collateral_asset_id = cam.collateral_asset_id
WHERE cs.collateral_asset_id IS NOT NULL AND cam.collateral_asset_id IS NULL;
"
```

**Severity:** CRITICAL if any orphaned FK values exist.

### 3E. Currency Code Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT cs.currency_code, COUNT(*) AS cnt
FROM l2.collateral_snapshot cs
LEFT JOIN l1.currency_dim cd ON cs.currency_code = cd.currency_code
WHERE cd.currency_code IS NULL AND cs.currency_code IS NOT NULL
GROUP BY cs.currency_code;
"
```

**Severity:**
- HIGH if currency codes do not match `l1.currency_dim`
- MEDIUM if `currency_code` is NULL for any rows

### 3F. Derived LTV Reasonableness

Derive LTV by joining collateral to exposure and check for reasonableness:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  CASE
    WHEN derived_ltv <= 0.65 THEN '0-65% (healthy)'
    WHEN derived_ltv <= 0.80 THEN '65-80% (watch)'
    WHEN derived_ltv <= 1.00 THEN '80-100% (elevated)'
    WHEN derived_ltv <= 2.00 THEN '100-200% (underwater)'
    ELSE '>200% (extreme)'
  END AS ltv_bucket,
  COUNT(*) AS facility_count
FROM (
  SELECT fm.facility_id,
         fes.drawn_amount / NULLIF(SUM(cs.collateral_value_amt), 0) AS derived_ltv
  FROM l2.facility_master fm
  JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id
    AND fes.as_of_date = (SELECT MAX(as_of_date) FROM l2.facility_exposure_snapshot)
  JOIN l2.collateral_snapshot cs ON cs.facility_id = fm.facility_id
    AND cs.as_of_date = (SELECT MAX(as_of_date) FROM l2.collateral_snapshot)
  GROUP BY fm.facility_id, fes.drawn_amount
) sub
WHERE derived_ltv IS NOT NULL
GROUP BY 1
ORDER BY 1;
EOSQL
```

**Severity:**
- HIGH if >30% of facilities have LTV > 200% (extreme over-leveraging)
- MEDIUM if no facilities fall in the healthy 0-65% bucket
- LOW if LTV distribution is unnaturally uniform

### 3G. Date Alignment with Exposure Snapshots

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT cs_date, fes_date,
       CASE WHEN fes_date IS NOT NULL THEN 'aligned' ELSE 'unaligned' END AS status,
       COUNT(*) AS cnt
FROM (
  SELECT DISTINCT cs.as_of_date AS cs_date,
         fes.as_of_date AS fes_date
  FROM l2.collateral_snapshot cs
  LEFT JOIN l2.facility_exposure_snapshot fes
    ON fes.as_of_date = cs.as_of_date
) sub
GROUP BY cs_date, fes_date, CASE WHEN fes_date IS NOT NULL THEN 'aligned' ELSE 'unaligned' END
ORDER BY cs_date;
"
```

**Severity:**
- MEDIUM if collateral snapshot dates do not align with any exposure snapshot dates
- LOW if only partial alignment

### 3H. Secured Facility Coverage

Check if secured facilities have collateral records:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  COUNT(DISTINCT fm.facility_id) AS secured_facilities,
  COUNT(DISTINCT cs.facility_id) AS facilities_with_collateral,
  COUNT(DISTINCT fm.facility_id) - COUNT(DISTINCT cs.facility_id) AS missing_collateral
FROM l2.facility_master fm
LEFT JOIN l2.collateral_snapshot cs ON fm.facility_id = cs.facility_id
WHERE fm.is_secured_flag = 'Y' OR fm.is_secured_flag = TRUE;
EOSQL
```

**Severity:**
- HIGH if >20% of secured facilities have no collateral records
- MEDIUM if >10% missing

### 3I. Duplicate Detection

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT facility_id, collateral_asset_id, as_of_date, COUNT(*) AS dup_count
FROM l2.collateral_snapshot
GROUP BY facility_id, collateral_asset_id, as_of_date
HAVING COUNT(*) > 1
LIMIT 20;
"
```

**Severity:** HIGH if duplicates exist on the composite key.

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true` in orchestrator payload.

### 4A. Fix Non-Positive Collateral Values

```sql
-- Remove rows with zero or negative collateral values (meaningless)
DELETE FROM l2.collateral_snapshot
WHERE collateral_value_amt <= 0;
```

### 4B. Fix Orphaned FK References

```sql
DELETE FROM l2.collateral_snapshot
WHERE facility_id NOT IN (SELECT facility_id FROM l2.facility_master)
  AND facility_id IS NOT NULL;
```

### 4C. Fix Duplicates

```sql
DELETE FROM l2.collateral_snapshot a
USING l2.collateral_snapshot b
WHERE a.facility_id = b.facility_id
  AND a.collateral_asset_id = b.collateral_asset_id
  AND a.as_of_date = b.as_of_date
  AND a.ctid < b.ctid;
```

### 4D. Fix Execution Pattern

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -c "
BEGIN;
-- Apply fix SQL here
-- Verify with evidence query
COMMIT;
"
```

After fixes, run `npm run db:introspect` to update the data dictionary.

---

## 5. Output Format

```json
{
  "agent": "dq-collateral-snapshot",
  "run_timestamp": "ISO8601",
  "scope": "l2.collateral_snapshot",
  "tables_checked": ["l2.collateral_snapshot", "l2.facility_master", "l2.collateral_asset_master", "l2.facility_exposure_snapshot", "l1.currency_dim", "l1.collateral_type_dim"],
  "summary": {
    "total_rows": 0,
    "distinct_facilities": 0,
    "distinct_types": 0,
    "date_range": "YYYY-MM-DD to YYYY-MM-DD",
    "total_checks": 9,
    "passed": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "fixes_applied": 0,
    "fixes_verified": 0
  },
  "findings": [],
  "fixes_applied": [],
  "health_score": 0
}
```

Health score formula: `max(0, 100 - (critical * 15 + high * 8 + medium * 3 + low * 1))`

---

## 6. Safety Rules

1. **Never DROP the table or any columns** — only UPDATE/DELETE rows or ALTER TYPE
2. **Never execute fixes without `--fix` flag AND user confirmation for CRITICAL/HIGH fixes**
3. **Always run in a transaction** — ROLLBACK on any error
4. **Always run `db:introspect` after data changes** to keep DD in sync
5. **Log all findings to `.claude/audit/sessions/`** with agent name and timestamp
6. **LTV derivation is advisory** — flag outliers but do not auto-fix collateral values (requires appraisal review)
7. **Collateral type diversity is advisory** — portfolio composition may legitimately skew to one type
8. **If running in orchestrator mode**, return JSON payload only (no interactive prompts)

---

## 7. Regression Cases (Lessons Learned — 2026-03-25)

| Issue | Details | Fix |
|-------|---------|-----|
| `haircut_pct = 0` for ALL rows | Basel III requires supervisory haircuts (5-50% by type). Zero haircuts overstate eligible collateral | Set by `collateral_asset_type`: REAL_ESTATE=25%, EQUIPMENT=30%, RECEIVABLES=15%, SECURITIES=20%, CASH=0-8% |
| `eligible_collateral_amount` not recalculated after haircut fix | Must update `eligible_collateral_amount = valuation_amount * (1 - haircut_pct)` | Always update both columns together |
| Only 12% of facilities covered | 45 assets for 362 facilities | Add `collateral_asset_master` entries + snapshots for ~30% more facilities with realistic LTV ratios |
| Single `crm_type_code` = 'CASH_COLL' | No collateral type diversity | Add RE_MORTGAGE, PHYS_COLL, REC_COLL, FIN_COLL for new assets |
| Column name: `valuation_amount` not `collateral_value_amt` | Agent queries must use actual DD column names | Always verify via `information_schema.columns` |
| `noi_current_amt` 100% NULL | CRE income field completely unpopulated | LOW severity — only relevant for CRE-specific collateral analysis |
