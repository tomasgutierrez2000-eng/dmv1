---
description: "DQ Facility Profitability Snapshot — validates revenue components, cost consistency, ROE/ROA realism, and profitability distribution in l2.facility_profitability_snapshot"
---

# DQ Facility Profitability Snapshot

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You perform a deep-dive review of `l2.facility_profitability_snapshot` — the table that stores periodic profitability metrics per facility including net interest income, fee income, operating costs, and provisions. Profitability data feeds RAROC calculations, pricing optimization, and capital allocation. Inconsistent revenue components cause misstated risk-adjusted returns and flawed pricing decisions.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` — parse the L2 entry for `facility_profitability_snapshot` to get all column names, types, PKs, and FKs
3. Read `CLAUDE.md` sections on "FK Referential Integrity Rules" and "GSIB Risk Sanity Checks"
4. If a baseline profile exists at `.claude/audit/dq-baselines/facility-profitability-snapshot.json`, load it for delta comparison

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/tables:dq-facility-profitability-snapshot
/data-quality/tables:dq-facility-profitability-snapshot --fix
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
       COUNT(DISTINCT as_of_date) AS distinct_dates,
       MIN(as_of_date) AS earliest_date,
       MAX(as_of_date) AS latest_date,
       COUNT(*) FILTER (WHERE net_interest_income_amt IS NULL) AS null_nii,
       COUNT(*) FILTER (WHERE fee_income_amt IS NULL) AS null_fee,
       COUNT(*) FILTER (WHERE operating_cost_amt IS NULL) AS null_cost
FROM l2.facility_profitability_snapshot;
"
```

**Severity rules:**
- CRITICAL if `total_rows = 0` (no profitability data)
- HIGH if >50% of rows have NULL for all revenue components
- MEDIUM if `distinct_dates < 2` (need multiple snapshots for trend analysis)

### 3B. FK Integrity — facility_id

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT fps.facility_id, COUNT(*) AS orphan_rows
FROM l2.facility_profitability_snapshot fps
LEFT JOIN l2.facility_master fm ON fps.facility_id = fm.facility_id
WHERE fm.facility_id IS NULL
GROUP BY fps.facility_id
LIMIT 20;
"
```

**Severity:** CRITICAL if any orphaned facility_ids exist.

### 3C. Revenue Component Consistency

Check that total_revenue (if present) is consistent with component revenues:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE total_revenue_amt IS NOT NULL) AS has_total_rev,
  COUNT(*) FILTER (WHERE total_revenue_amt IS NOT NULL
    AND ABS(total_revenue_amt - COALESCE(net_interest_income_amt, 0) - COALESCE(fee_income_amt, 0)) > 1.0
  ) AS inconsistent_revenue
FROM l2.facility_profitability_snapshot;
EOSQL
```

**Severity:**
- HIGH if `inconsistent_revenue > 0` (total should equal sum of components within rounding tolerance)
- MEDIUM if total_revenue is NULL but components are populated (missing aggregation)

### 3D. Net Interest Income Range

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT MIN(net_interest_income_amt) AS min_nii,
       MAX(net_interest_income_amt) AS max_nii,
       AVG(net_interest_income_amt) AS avg_nii,
       COUNT(*) FILTER (WHERE net_interest_income_amt < 0) AS negative_nii,
       COUNT(*) FILTER (WHERE net_interest_income_amt > 0) AS positive_nii
FROM l2.facility_profitability_snapshot
WHERE net_interest_income_amt IS NOT NULL;
"
```

**Severity:**
- MEDIUM if all NII values are the same sign (NII can be negative for funding-heavy facilities)
- LOW if average NII seems unrealistic relative to typical facility sizes

### 3E. Fee Income Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT MIN(fee_income_amt) AS min_fee,
       MAX(fee_income_amt) AS max_fee,
       AVG(fee_income_amt) AS avg_fee,
       COUNT(*) FILTER (WHERE fee_income_amt < 0) AS negative_fees
FROM l2.facility_profitability_snapshot
WHERE fee_income_amt IS NOT NULL;
"
```

**Severity:**
- MEDIUM if `negative_fees > 10%` of rows (fee income is typically non-negative; fee reversals are rare)
- LOW if all fee income is zero (may indicate fee data not yet loaded)

### 3F. Operating Cost Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT MIN(operating_cost_amt) AS min_cost,
       MAX(operating_cost_amt) AS max_cost,
       AVG(operating_cost_amt) AS avg_cost,
       COUNT(*) FILTER (WHERE operating_cost_amt < 0) AS negative_costs
FROM l2.facility_profitability_snapshot
WHERE operating_cost_amt IS NOT NULL;
"
```

**Severity:**
- HIGH if `negative_costs > 0` (operating costs should be non-negative)
- MEDIUM if operating costs are NULL for >50% of rows

### 3G. Provision Amount Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT MIN(provision_amt) AS min_provision,
       MAX(provision_amt) AS max_provision,
       AVG(provision_amt) AS avg_provision,
       COUNT(*) FILTER (WHERE provision_amt > 0) AS positive_provisions,
       COUNT(*) FILTER (WHERE provision_amt < 0) AS negative_provisions,
       COUNT(*) FILTER (WHERE provision_amt IS NULL) AS null_provisions
FROM l2.facility_profitability_snapshot;
"
```

**Severity:**
- MEDIUM if all provisions are one-directional (should have both charges and releases)
- LOW if provision_amt is NULL for all rows (may indicate CECL data not integrated)

### 3H. ROE/ROA Realism

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT
  COUNT(*) FILTER (WHERE roe_pct IS NOT NULL) AS has_roe,
  MIN(roe_pct) AS min_roe,
  MAX(roe_pct) AS max_roe,
  AVG(roe_pct) AS avg_roe,
  COUNT(*) FILTER (WHERE roe_pct < -50) AS extreme_negative_roe,
  COUNT(*) FILTER (WHERE roe_pct > 50) AS extreme_positive_roe,
  COUNT(*) FILTER (WHERE roa_pct IS NOT NULL) AS has_roa,
  MIN(roa_pct) AS min_roa,
  MAX(roa_pct) AS max_roa
FROM l2.facility_profitability_snapshot;
"
```

**Severity:**
- HIGH if `extreme_negative_roe > 10%` or `extreme_positive_roe > 10%` (ROE outside -50% to +50% range is unrealistic for most facilities)
- MEDIUM if ROE/ROA are all NULL (profitability metrics not computed)
- LOW if average ROE is negative (may indicate stressed portfolio — flag for review)

### 3I. Profitability Distribution

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
WITH latest AS (
  SELECT facility_id,
         COALESCE(net_interest_income_amt, 0) + COALESCE(fee_income_amt, 0)
         - COALESCE(operating_cost_amt, 0) - COALESCE(provision_amt, 0) AS net_income
  FROM l2.facility_profitability_snapshot
  WHERE as_of_date = (SELECT MAX(as_of_date) FROM l2.facility_profitability_snapshot)
)
SELECT
  COUNT(*) FILTER (WHERE net_income > 0) AS profitable_facilities,
  COUNT(*) FILTER (WHERE net_income <= 0) AS unprofitable_facilities,
  ROUND(100.0 * COUNT(*) FILTER (WHERE net_income > 0) / NULLIF(COUNT(*), 0), 2) AS profitable_pct
FROM latest;
EOSQL
```

**Severity:**
- MEDIUM if profitable_pct < 50% (majority unprofitable is unusual outside stress periods)
- MEDIUM if profitable_pct = 100% (no unprofitable facilities is unrealistic)
- LOW if distribution is unnaturally uniform

### 3J. Date Alignment with Other Snapshots

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT fps_date, fes_date,
       CASE WHEN fes_date IS NOT NULL THEN 'aligned' ELSE 'unaligned' END AS status
FROM (
  SELECT DISTINCT fps.as_of_date AS fps_date,
         fes.as_of_date AS fes_date
  FROM l2.facility_profitability_snapshot fps
  LEFT JOIN (SELECT DISTINCT as_of_date FROM l2.facility_exposure_snapshot) fes
    ON fes.as_of_date = fps.as_of_date
) sub
ORDER BY fps_date;
"
```

**Severity:**
- MEDIUM if profitability dates do not align with exposure snapshot dates
- LOW if only partial alignment

### 3K. Duplicate Detection

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT facility_id, as_of_date, COUNT(*) AS dup_count
FROM l2.facility_profitability_snapshot
GROUP BY facility_id, as_of_date
HAVING COUNT(*) > 1
LIMIT 20;
"
```

**Severity:** HIGH if duplicates exist on (facility_id, as_of_date).

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true` in orchestrator payload.

### 4A. Fix Orphaned FK References

```sql
DELETE FROM l2.facility_profitability_snapshot
WHERE facility_id NOT IN (SELECT facility_id FROM l2.facility_master);
```

### 4B. Fix Negative Operating Costs

```sql
UPDATE l2.facility_profitability_snapshot
SET operating_cost_amt = ABS(operating_cost_amt)
WHERE operating_cost_amt < 0;
```

### 4C. Fix Duplicates

```sql
DELETE FROM l2.facility_profitability_snapshot a
USING l2.facility_profitability_snapshot b
WHERE a.facility_id = b.facility_id
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
  "agent": "dq-facility-profitability-snapshot",
  "run_timestamp": "ISO8601",
  "scope": "l2.facility_profitability_snapshot",
  "tables_checked": ["l2.facility_profitability_snapshot", "l2.facility_master", "l2.facility_exposure_snapshot"],
  "summary": {
    "total_rows": 0,
    "distinct_facilities": 0,
    "distinct_dates": 0,
    "profitable_pct": 0,
    "total_checks": 11,
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

1. **Never DROP the table or any columns** — only UPDATE/DELETE rows
2. **Never execute fixes without `--fix` flag AND user confirmation for CRITICAL/HIGH fixes**
3. **Always run in a transaction** — ROLLBACK on any error
4. **Always run `db:introspect` after data changes** to keep DD in sync
5. **Log all findings to `.claude/audit/sessions/`** with agent name and timestamp
6. **Revenue component fixes require manual review** — do not auto-recalculate totals
7. **ROE/ROA outliers may be legitimate** — flag but do not auto-cap extreme values
8. **Provision direction is business-dependent** — stressed portfolios legitimately have large charges
9. **If running in orchestrator mode**, return JSON payload only (no interactive prompts)
