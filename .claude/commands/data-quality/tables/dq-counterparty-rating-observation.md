---
description: "DQ Counterparty Rating Observation — validates rating transitions, temporal ordering, and rating-PD correlation in l2.counterparty_rating_observation"
---

# DQ Counterparty Rating Observation

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You perform a deep-dive review of `l2.counterparty_rating_observation` — the table that stores credit rating snapshots from external agencies and internal models. Rating data feeds PD estimates, migration matrices, and regulatory capital calculations. Errors here silently corrupt risk-weighted assets and CECL allowance.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` — parse the L2 entry for `counterparty_rating_observation` to get all column names, types, PKs, and FKs
3. Read `CLAUDE.md` sections on "Rating Tier PD Boundaries" and "FK Referential Integrity Rules"
4. If a baseline profile exists at `.claude/audit/dq-baselines/counterparty-rating-observation.json`, load it for delta comparison

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/tables:dq-counterparty-rating-observation
/data-quality/tables:dq-counterparty-rating-observation --fix
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
       COUNT(DISTINCT counterparty_id) AS distinct_counterparties,
       COUNT(DISTINCT rating_agency_code) AS distinct_agencies,
       MIN(as_of_date) AS earliest_date,
       MAX(as_of_date) AS latest_date,
       COUNT(*) FILTER (WHERE rating_value IS NULL) AS null_rating_count
FROM l2.counterparty_rating_observation;
"
```

**Severity rules:**
- CRITICAL if `total_rows = 0` (no rating data at all)
- HIGH if `null_rating_count > 0` (ratings must always have a value)
- MEDIUM if `distinct_agencies < 2` (should have multiple agencies)
- MEDIUM if `distinct_counterparties` < 50% of total counterparties in `l2.counterparty`

### 3B. FK Integrity — counterparty_id

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT cro.counterparty_id, COUNT(*) AS orphan_rows
FROM l2.counterparty_rating_observation cro
LEFT JOIN l2.counterparty c ON cro.counterparty_id = c.counterparty_id
WHERE c.counterparty_id IS NULL
GROUP BY cro.counterparty_id
ORDER BY orphan_rows DESC
LIMIT 20;
"
```

**Severity:** CRITICAL if any orphaned counterparty_ids exist.

### 3C. Rating Agency Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT rating_agency_code, COUNT(*) AS cnt
FROM l2.counterparty_rating_observation
GROUP BY rating_agency_code
ORDER BY cnt DESC;
"
```

**Expected valid agencies:** S&P, Moodys, Fitch, Internal (or their code equivalents like `SP`, `MDY`, `FTC`, `INT`).

**Severity rules:**
- HIGH if any unrecognized agency codes exist
- MEDIUM if only one agency represented (should have at least Internal + one external)
- LOW if distribution is heavily skewed (>90% single agency)

### 3D. Rating Value Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT rating_value, COUNT(*) AS cnt
FROM l2.counterparty_rating_observation
WHERE rating_value IS NOT NULL
GROUP BY rating_value
ORDER BY cnt DESC;
"
```

Cross-reference against `l1.rating_scale_dim` to verify all rating values are valid:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT cro.rating_value, COUNT(*) AS unmatched_rows
FROM l2.counterparty_rating_observation cro
LEFT JOIN l1.rating_scale_dim rsd ON cro.rating_value = rsd.rating_code
WHERE rsd.rating_code IS NULL AND cro.rating_value IS NOT NULL
GROUP BY cro.rating_value
ORDER BY unmatched_rows DESC;
"
```

**Severity:** HIGH if rating values do not match rating_scale_dim entries.

### 3E. Temporal Ordering and Date Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT COUNT(*) AS future_dates
FROM l2.counterparty_rating_observation
WHERE as_of_date > CURRENT_DATE;
"
```

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT COUNT(*) AS ancient_dates
FROM l2.counterparty_rating_observation
WHERE as_of_date < '2020-01-01';
"
```

**Severity:**
- HIGH if future dates exist
- MEDIUM if dates before 2020 exist (data platform scope is modern)

### 3F. Temporal Coverage per Counterparty

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT obs_count, COUNT(*) AS num_counterparties
FROM (
  SELECT counterparty_id, COUNT(DISTINCT as_of_date) AS obs_count
  FROM l2.counterparty_rating_observation
  GROUP BY counterparty_id
) sub
GROUP BY obs_count
ORDER BY obs_count;
"
```

**Severity:**
- MEDIUM if >50% of counterparties have only 1 observation date (need at least 2 for migration analysis)
- LOW if average observations per counterparty < 3

### 3G. Rating Transition Realism

Check for unrealistic jumps (e.g., AAA to D in a single observation step):

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
WITH ordered_ratings AS (
  SELECT counterparty_id, rating_agency_code, as_of_date, rating_value,
         LAG(rating_value) OVER (PARTITION BY counterparty_id, rating_agency_code ORDER BY as_of_date) AS prev_rating,
         LAG(as_of_date) OVER (PARTITION BY counterparty_id, rating_agency_code ORDER BY as_of_date) AS prev_date
  FROM l2.counterparty_rating_observation
),
transitions AS (
  SELECT counterparty_id, rating_agency_code, prev_date, as_of_date,
         prev_rating, rating_value,
         (as_of_date - prev_date) AS days_between
  FROM ordered_ratings
  WHERE prev_rating IS NOT NULL AND prev_rating != rating_value
)
SELECT prev_rating, rating_value, days_between, counterparty_id
FROM transitions
WHERE days_between < 30
ORDER BY days_between
LIMIT 20;
EOSQL
```

**Severity:**
- HIGH if multi-notch jumps (e.g., IG to default-tier) occur within 30 days without a credit event
- MEDIUM if >20% of transitions are downgrades of 3+ notches in <90 days

### 3H. Rating-PD Correlation

Verify that rating observations correlate with PD values in `l2.facility_risk_snapshot`:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT cro.rating_value,
       AVG(frs.pd_pct) AS avg_pd_pct,
       COUNT(*) AS sample_size
FROM l2.counterparty_rating_observation cro
JOIN l2.facility_master fm ON fm.counterparty_id = cro.counterparty_id
JOIN l2.facility_risk_snapshot frs ON frs.facility_id = fm.facility_id
  AND frs.as_of_date = (SELECT MAX(as_of_date) FROM l2.facility_risk_snapshot)
WHERE cro.as_of_date = (
  SELECT MAX(as_of_date) FROM l2.counterparty_rating_observation
)
GROUP BY cro.rating_value
ORDER BY avg_pd_pct;
EOSQL
```

**Severity:**
- HIGH if investment-grade ratings show avg PD > 2% (should be < 0.40% per GSIB calibration)
- HIGH if default-tier ratings show avg PD < 5%
- MEDIUM if PD ordering does not monotonically increase with worse ratings

### 3I. Duplicate Detection

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT counterparty_id, rating_agency_code, as_of_date, COUNT(*) AS dup_count
FROM l2.counterparty_rating_observation
GROUP BY counterparty_id, rating_agency_code, as_of_date
HAVING COUNT(*) > 1
LIMIT 20;
"
```

**Severity:** HIGH if duplicates exist (same counterparty, same agency, same date should be unique).

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true` in orchestrator payload.

### 4A. Fix Orphaned FK References

```sql
-- Option 1: Delete orphaned rows
DELETE FROM l2.counterparty_rating_observation
WHERE counterparty_id NOT IN (SELECT counterparty_id FROM l2.counterparty);

-- Option 2: Remap to valid counterparty (less destructive)
-- Requires manual review of which counterparties to map to
```

### 4B. Fix NULL Rating Values

```sql
-- Remove rows with NULL ratings (they are meaningless)
DELETE FROM l2.counterparty_rating_observation
WHERE rating_value IS NULL;
```

### 4C. Fix Future Dates

```sql
UPDATE l2.counterparty_rating_observation
SET as_of_date = CURRENT_DATE
WHERE as_of_date > CURRENT_DATE;
```

### 4D. Fix Duplicates

```sql
-- Keep the latest-inserted row per (counterparty_id, rating_agency_code, as_of_date)
DELETE FROM l2.counterparty_rating_observation a
USING l2.counterparty_rating_observation b
WHERE a.counterparty_id = b.counterparty_id
  AND a.rating_agency_code = b.rating_agency_code
  AND a.as_of_date = b.as_of_date
  AND a.ctid < b.ctid;
```

### 4E. Fix Execution Pattern

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
  "agent": "dq-counterparty-rating-observation",
  "run_timestamp": "ISO8601",
  "scope": "l2.counterparty_rating_observation",
  "tables_checked": ["l2.counterparty_rating_observation", "l2.counterparty", "l1.rating_scale_dim", "l2.facility_risk_snapshot"],
  "summary": {
    "total_rows": 0,
    "distinct_counterparties": 0,
    "distinct_agencies": 0,
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
6. **Rating-PD correlation is advisory** — flag mismatches but do not auto-fix (requires business review)
7. **Transition realism is advisory** — rapid multi-notch downgrades may be legitimate (credit events)
8. **If running in orchestrator mode**, return JSON payload only (no interactive prompts)
