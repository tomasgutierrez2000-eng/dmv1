---
description: "DQ Temporal Coherence — validates time-series consistency, date grid alignment, SCD-2 integrity, and temporal realism across all L2 tables"
---

# DQ Temporal Coherence

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You validate that snapshot tables have consistent date grids, time-series have no gaps, SCD-2 tables have proper effective date ranges with exactly one current row per entity, and all date values are temporally realistic. Date misalignment is one of the most common causes of JOIN failures in metric calculations.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` for table structures
3. Read `CLAUDE.md` section on "Temporal flag inconsistency" and "Date alignment" in the PostgreSQL Seed Data Quality Checklist
4. If a baseline exists at `.claude/audit/dq-baselines/temporal-coherence.json`, load for delta

### L2 Snapshot Tables (time-series with `as_of_date`)

These tables should have aligned date grids:
- `facility_exposure_snapshot` (FES)
- `facility_risk_snapshot` (FRS)
- `facility_pricing_snapshot` (FPS)
- `facility_delinquency_snapshot` (FDS)
- `facility_profitability_snapshot` (FPRS)
- `collateral_snapshot` (CS)
- `counterparty_rating_observation` (CRO)
- `financial_metric_observation` (FMO)
- `capital_position_snapshot` (CPS)

### L2 SCD-2 Tables (with `is_current_flag` or `effective_start_date`)

- `facility_master`
- `credit_agreement_master`
- `counterparty`
- `counterparty_hierarchy`

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/dimensions:dq-temporal-coherence
/data-quality/dimensions:dq-temporal-coherence --table l2.facility_exposure_snapshot
/data-quality/dimensions:dq-temporal-coherence --fix
```

### Mode B: Orchestrator
Receives JSON payload:
```json
{
  "mode": "orchestrator",
  "fix_mode": false,
  "tables": ["l2.facility_exposure_snapshot", "l2.facility_risk_snapshot"]
}
```

---

## 3. Check Procedures

### 3A. Date Grid Inventory

Get all distinct `as_of_date` values across all snapshot tables to build the expected date grid:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT 'facility_exposure_snapshot' AS tbl, as_of_date, COUNT(*) AS row_count
FROM l2.facility_exposure_snapshot GROUP BY as_of_date
UNION ALL
SELECT 'facility_risk_snapshot', as_of_date, COUNT(*)
FROM l2.facility_risk_snapshot GROUP BY as_of_date
UNION ALL
SELECT 'facility_pricing_snapshot', as_of_date, COUNT(*)
FROM l2.facility_pricing_snapshot GROUP BY as_of_date
UNION ALL
SELECT 'facility_delinquency_snapshot', as_of_date, COUNT(*)
FROM l2.facility_delinquency_snapshot GROUP BY as_of_date
UNION ALL
SELECT 'collateral_snapshot', as_of_date, COUNT(*)
FROM l2.collateral_snapshot GROUP BY as_of_date
ORDER BY 2, 1;
"
```

### 3B. Date Grid Alignment Check

For each pair of snapshot tables, verify they share the same `as_of_date` values:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Dates in FES but not FRS
SELECT 'FES_not_FRS' AS gap_type, fes.as_of_date, COUNT(DISTINCT fes.facility_id) AS affected_facilities
FROM l2.facility_exposure_snapshot fes
LEFT JOIN l2.facility_risk_snapshot frs ON fes.facility_id = frs.facility_id AND fes.as_of_date = frs.as_of_date
WHERE frs.facility_id IS NULL
GROUP BY fes.as_of_date
UNION ALL
-- Dates in FRS but not FES
SELECT 'FRS_not_FES', frs.as_of_date, COUNT(DISTINCT frs.facility_id)
FROM l2.facility_risk_snapshot frs
LEFT JOIN l2.facility_exposure_snapshot fes ON frs.facility_id = fes.facility_id AND frs.as_of_date = fes.as_of_date
WHERE fes.facility_id IS NULL
GROUP BY frs.as_of_date
ORDER BY 2, 1;
"
```

### 3C. Time Series Gap Detection

For each snapshot table, detect gaps in the monthly time series:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
WITH dates AS (
  SELECT DISTINCT as_of_date FROM l2.facility_exposure_snapshot ORDER BY as_of_date
),
gaps AS (
  SELECT as_of_date,
         LAG(as_of_date) OVER (ORDER BY as_of_date) AS prev_date,
         as_of_date - LAG(as_of_date) OVER (ORDER BY as_of_date) AS gap_days
  FROM dates
)
SELECT as_of_date, prev_date, gap_days
FROM gaps
WHERE gap_days > 35  -- Flag gaps > 35 days (monthly data should be ~28-31 days apart)
ORDER BY as_of_date;
"
```

### 3D. SCD-2 Current Row Integrity

Check that SCD-2 tables have exactly one current row per entity:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- facility_master: multiple current rows per facility
SELECT facility_id, COUNT(*) AS current_count
FROM l2.facility_master
WHERE is_current_flag = true
GROUP BY facility_id
HAVING COUNT(*) > 1
LIMIT 20;
"
```

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- facility_master: facilities with NO current row
SELECT fm1.facility_id
FROM l2.facility_master fm1
GROUP BY fm1.facility_id
HAVING SUM(CASE WHEN is_current_flag = true THEN 1 ELSE 0 END) = 0
LIMIT 20;
"
```

Repeat for `credit_agreement_master`, `counterparty`, `counterparty_hierarchy`.

### 3E. Date Realism Checks

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Future dates (should not exist in historical snapshot data)
SELECT '{table_name}' AS tbl, '{date_col}' AS col, COUNT(*) AS future_count
FROM l2.{table_name}
WHERE {date_col} > CURRENT_DATE
UNION ALL
-- Ancient dates (before 2015 is suspicious for this platform)
SELECT '{table_name}', '{date_col}', COUNT(*)
FROM l2.{table_name}
WHERE {date_col} < '2015-01-01'
UNION ALL
-- NULL dates in snapshot tables (as_of_date should never be NULL)
SELECT '{table_name}', '{date_col}', COUNT(*)
FROM l2.{table_name}
WHERE {date_col} IS NULL;
"
```

### 3F. Effective Date Range Validity

For SCD-2 tables with `effective_start_date` and `effective_end_date`:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Inverted date ranges (start > end)
SELECT facility_id, effective_start_date, effective_end_date
FROM l2.facility_master
WHERE effective_start_date IS NOT NULL
  AND effective_end_date IS NOT NULL
  AND effective_start_date > effective_end_date
LIMIT 10;

-- Overlapping date ranges for same entity
SELECT a.facility_id, a.effective_start_date AS a_start, a.effective_end_date AS a_end,
       b.effective_start_date AS b_start, b.effective_end_date AS b_end
FROM l2.facility_master a
JOIN l2.facility_master b ON a.facility_id = b.facility_id
  AND a.ctid != b.ctid
  AND a.effective_start_date < COALESCE(b.effective_end_date, '9999-12-31')
  AND b.effective_start_date < COALESCE(a.effective_end_date, '9999-12-31')
LIMIT 10;
"
```

### 3G. Facility Date Coverage

Verify every active facility has snapshot data for the most recent reporting period:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
WITH latest_date AS (
  SELECT MAX(as_of_date) AS max_date FROM l2.facility_exposure_snapshot
),
active_facilities AS (
  SELECT facility_id FROM l2.facility_master WHERE is_current_flag = true
)
SELECT af.facility_id, 'missing_latest_exposure' AS issue
FROM active_facilities af
LEFT JOIN l2.facility_exposure_snapshot fes
  ON af.facility_id = fes.facility_id AND fes.as_of_date = (SELECT max_date FROM latest_date)
WHERE fes.facility_id IS NULL
LIMIT 20;
"
```

### Severity Classification

| Severity | Condition |
|----------|-----------|
| CRITICAL | SCD-2 table has entities with multiple current rows — metric queries return duplicates |
| CRITICAL | `as_of_date` is NULL in snapshot tables — JOIN failures |
| HIGH | Snapshot tables have misaligned date grids — cross-table JOINs return 0 rows for some dates |
| HIGH | Active facilities missing from latest reporting period |
| HIGH | Inverted or overlapping SCD-2 date ranges |
| MEDIUM | Time series gaps >35 days (missing months) |
| MEDIUM | Future dates in historical data |
| LOW | Ancient dates (before 2015) — may be legitimate for long-dated facilities |
| LOW | Entities with no current SCD-2 row (may be legitimately closed) |

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true`.

### 4A. SCD-2 Duplicate Current Rows

Keep the most recently updated row as current, set others to historical:

```sql
UPDATE l2.facility_master SET is_current_flag = false
WHERE ctid NOT IN (
  SELECT DISTINCT ON (facility_id) ctid
  FROM l2.facility_master
  WHERE is_current_flag = true
  ORDER BY facility_id, updated_ts DESC NULLS LAST
)
AND is_current_flag = true;
```

### 4B. Missing Snapshot Rows

Generate stub rows for missing date/facility combinations:

```sql
-- Generate missing FRS rows for dates that exist in FES
INSERT INTO l2.facility_risk_snapshot (facility_id, as_of_date)
SELECT DISTINCT fes.facility_id, fes.as_of_date
FROM l2.facility_exposure_snapshot fes
LEFT JOIN l2.facility_risk_snapshot frs
  ON fes.facility_id = frs.facility_id AND fes.as_of_date = frs.as_of_date
WHERE frs.facility_id IS NULL;
```

### 4C. Fix Inverted Date Ranges

```sql
UPDATE l2.facility_master
SET effective_start_date = effective_end_date,
    effective_end_date = effective_start_date
WHERE effective_start_date > effective_end_date;
```

### 4D. Fix NULL as_of_date

```sql
-- Set NULL as_of_date to the most common date in the table
UPDATE l2.{table_name}
SET as_of_date = (SELECT MODE() WITHIN GROUP (ORDER BY as_of_date) FROM l2.{table_name} WHERE as_of_date IS NOT NULL)
WHERE as_of_date IS NULL;
```

---

## 5. Output Format

```json
{
  "agent": "dq-temporal-coherence",
  "run_timestamp": "2026-03-25T10:00:00Z",
  "scope": "all_l2",
  "summary": {
    "snapshot_tables_checked": 9,
    "scd2_tables_checked": 4,
    "date_grid": {
      "total_dates": 12,
      "min_date": "2024-01-31",
      "max_date": "2025-01-31",
      "misaligned_pairs": 3
    },
    "scd2_issues": {
      "multi_current_entities": 5,
      "no_current_entities": 2,
      "inverted_ranges": 0,
      "overlapping_ranges": 1
    },
    "time_series_gaps": 2,
    "unrealistic_dates": 15,
    "by_severity": {
      "CRITICAL": 5,
      "HIGH": 8,
      "MEDIUM": 4,
      "LOW": 3
    }
  },
  "findings": [
    {
      "finding_id": "TC-001",
      "table": "l2.facility_master",
      "severity": "CRITICAL",
      "category": "scd2_multi_current",
      "affected_entities": 5,
      "sample_ids": [101, 203, 305],
      "fix_sql": "UPDATE l2.facility_master SET is_current_flag = false WHERE ...",
      "fix_safety": "safe",
      "message": "5 facilities have multiple rows with is_current_flag = true"
    },
    {
      "finding_id": "TC-002",
      "tables": ["facility_exposure_snapshot", "facility_risk_snapshot"],
      "severity": "HIGH",
      "category": "date_grid_misalignment",
      "fes_dates": ["2025-01-31", "2024-12-31", "2024-11-30"],
      "frs_dates": ["2025-01-31", "2024-12-31"],
      "missing_in_frs": ["2024-11-30"],
      "affected_facilities": 410,
      "fix_type": "insert_stub_rows",
      "message": "FRS missing 2024-11-30 data while FES has it — 410 facilities affected"
    }
  ],
  "date_grid_matrix": {
    "dates": ["2025-01-31", "2024-12-31", "2024-11-30"],
    "tables": {
      "facility_exposure_snapshot": [2753, 2753, 2753],
      "facility_risk_snapshot": [930, 930, 0],
      "facility_pricing_snapshot": [410, 410, 410]
    }
  },
  "fixes_applied": [],
  "delta_from_baseline": {
    "new_findings": 3,
    "resolved_findings": 1,
    "unchanged_findings": 8
  }
}
```

---

## 6. Safety Rules

1. **Never DELETE SCD-2 rows** — set `is_current_flag = false` instead
2. **Never backdate `as_of_date`** — only forward-fill or use the mode
3. **Stub snapshot rows should have NULL metric columns** — not zero (zero distorts calculations)
4. **Always verify FK integrity before inserting stub rows** — facility_id must exist in facility_master
5. **Log all findings to `.claude/audit/sessions/`**
6. **If running in orchestrator mode**, return JSON payload only
7. **Date grid misalignment between FES and FRS is the highest-impact issue** — most metric formulas JOIN these tables on `(facility_id, as_of_date)`
8. **SCD-2 fixes must preserve audit trail** — never delete historical rows, only fix `is_current_flag`
9. **Time series gaps may be legitimate** — quarterly data has 90-day gaps by design; weekly data has 7-day gaps
10. **Cross-reference with data factory seed dates** — gaps may be intentional boundaries between seed and factory data

---

## 7. Regression Cases (Lessons Learned — 2026-03-25)

### 7A. FFS Missing Month (HIGH)
`facility_financial_snapshot` had only 2 dates (Dec, Jan) while all other snapshot tables had 3 (Nov, Dec, Jan). This caused DSCR calculations to return NULL for November and broke period-over-period financial analysis.

**Regression check:**
```sql
WITH fes_dates AS (SELECT array_agg(DISTINCT as_of_date ORDER BY as_of_date) AS dates FROM l2.facility_exposure_snapshot),
     ffs_dates AS (SELECT array_agg(DISTINCT as_of_date ORDER BY as_of_date) AS dates FROM l2.facility_financial_snapshot)
SELECT CASE WHEN f.dates = ff.dates THEN 'ALIGNED' ELSE 'MISALIGNED: FES=' || f.dates::text || ' FFS=' || ff.dates::text END AS status
FROM fes_dates f, ffs_dates ff;
```
**Fix:** Copy adjacent month with slight variance: `INSERT INTO ffs SELECT *, adjusted_date FROM ffs WHERE as_of_date = [adjacent_date]`

### 7B. Snapshot Uniformity Signal
All facilities had exactly 3 snapshots (stddev=0). Fixed by removing Nov snapshots for ~14% of facilities to simulate lifecycle variation.
