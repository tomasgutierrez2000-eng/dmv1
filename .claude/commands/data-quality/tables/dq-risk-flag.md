---
description: "DQ Risk Flag — validates risk flag types, severity levels, active/resolved status, and correlation with risk metrics in l2.risk_flag"
---

# DQ Risk Flag

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You perform a deep-dive review of `l2.risk_flag` — the table that stores risk alerts, watchlist indicators, and exception flags for facilities and counterparties. Risk flags drive the CRO dashboard's early warning system, credit committee escalation, and regulatory reporting. Missing or stale flags create blind spots in risk oversight.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` — parse the L2 entry for `risk_flag` to get all column names, types, PKs, and FKs
3. Read `CLAUDE.md` sections on "FK Referential Integrity Rules" and "Scenario Data Generation Workflow"
4. If a baseline profile exists at `.claude/audit/dq-baselines/risk-flag.json`, load it for delta comparison

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/tables:dq-risk-flag
/data-quality/tables:dq-risk-flag --fix
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
       COUNT(DISTINCT counterparty_id) AS distinct_counterparties,
       COUNT(DISTINCT risk_flag_type_code) AS distinct_flag_types,
       MIN(flag_date) AS earliest_flag,
       MAX(flag_date) AS latest_flag,
       COUNT(*) FILTER (WHERE is_active_flag = TRUE OR is_active_flag::text = 'Y') AS active_flags,
       COUNT(*) FILTER (WHERE is_active_flag = FALSE OR is_active_flag::text = 'N') AS resolved_flags
FROM l2.risk_flag;
"
```

**Severity rules:**
- CRITICAL if `total_rows = 0` (no risk flags at all)
- HIGH if `active_flags = 0` OR `resolved_flags = 0` (must have both active and resolved flags)
- MEDIUM if `distinct_flag_types < 3` (should have diverse flag types)

### 3B. FK Integrity — facility_id and counterparty_id

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT 'facility_id' AS fk_col, COUNT(*) AS orphan_count
FROM l2.risk_flag rf
LEFT JOIN l2.facility_master fm ON rf.facility_id = fm.facility_id
WHERE rf.facility_id IS NOT NULL AND fm.facility_id IS NULL
UNION ALL
SELECT 'counterparty_id' AS fk_col, COUNT(*) AS orphan_count
FROM l2.risk_flag rf
LEFT JOIN l2.counterparty c ON rf.counterparty_id = c.counterparty_id
WHERE rf.counterparty_id IS NOT NULL AND c.counterparty_id IS NULL;
"
```

**Severity:** CRITICAL if any orphaned FK values exist.

### 3C. Risk Flag Type Code Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT risk_flag_type_code, COUNT(*) AS cnt,
       COUNT(*) FILTER (WHERE is_active_flag = TRUE OR is_active_flag::text = 'Y') AS active_cnt
FROM l2.risk_flag
GROUP BY risk_flag_type_code
ORDER BY cnt DESC;
"
```

Cross-reference against risk flag type dim (if exists):

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT rf.risk_flag_type_code, COUNT(*) AS unmatched_rows
FROM l2.risk_flag rf
LEFT JOIN l1.risk_flag_type_dim rftd ON rf.risk_flag_type_code = rftd.risk_flag_type_code
WHERE rftd.risk_flag_type_code IS NULL AND rf.risk_flag_type_code IS NOT NULL
GROUP BY rf.risk_flag_type_code;
"
```

**Expected flag types:** MATURITY_CONCENTRATION, EXPOSURE_BREACH, RATING_DOWNGRADE, COVENANT_BREACH, DELINQUENCY, COLLATERAL_SHORTFALL, LIMIT_UTILIZATION, PRICING_EXCEPTION (or code equivalents).

**Severity:**
- HIGH if flag type codes do not match dim table
- MEDIUM if only 1-2 flag types exist
- LOW if one type dominates >70% of all flags

### 3D. Severity Level Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT severity_level, COUNT(*) AS cnt
FROM l2.risk_flag
GROUP BY severity_level
ORDER BY cnt DESC;
"
```

**Expected levels:** CRITICAL, HIGH, MEDIUM, LOW (or numeric equivalents 1-4).

**Severity:**
- HIGH if unrecognized severity levels exist
- HIGH if all flags have the same severity (no differentiation)
- MEDIUM if CRITICAL/HIGH flags are absent (portfolio should have some elevated risks)
- MEDIUM if severity_level is NULL for any rows

### 3E. Flag Date Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT COUNT(*) FILTER (WHERE flag_date > CURRENT_DATE) AS future_flags,
       COUNT(*) FILTER (WHERE flag_date < '2020-01-01') AS ancient_flags,
       COUNT(*) FILTER (WHERE flag_date IS NULL) AS null_dates
FROM l2.risk_flag;
"
```

**Severity:**
- HIGH if future flag dates exist
- MEDIUM if NULL flag dates exist
- LOW if dates before 2020

### 3F. Active/Resolved Status Consistency

Resolution date should be NULL for active flags and populated for resolved flags:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT
  COUNT(*) FILTER (WHERE (is_active_flag = TRUE OR is_active_flag::text = 'Y')
                     AND resolution_date IS NOT NULL) AS active_with_resolution,
  COUNT(*) FILTER (WHERE (is_active_flag = FALSE OR is_active_flag::text = 'N')
                     AND resolution_date IS NULL) AS resolved_without_resolution
FROM l2.risk_flag;
"
```

**Severity:**
- HIGH if active flags have resolution dates (contradiction)
- MEDIUM if resolved flags lack resolution dates (incomplete lifecycle)

### 3G. Duplicate Flag Detection

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT facility_id, risk_flag_type_code, flag_date, COUNT(*) AS dup_count
FROM l2.risk_flag
GROUP BY facility_id, risk_flag_type_code, flag_date
HAVING COUNT(*) > 1
LIMIT 20;
"
```

**Severity:** HIGH if same flag type for same facility on same date appears multiple times.

### 3H. Risk Flag — Risk Metric Correlation

High-PD facilities should have more risk flags:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
WITH facility_risk AS (
  SELECT frs.facility_id, frs.pd_pct,
         CASE
           WHEN frs.pd_pct <= 0.40 THEN 'IG'
           WHEN frs.pd_pct <= 2.0 THEN 'Standard'
           WHEN frs.pd_pct <= 10.0 THEN 'Substandard'
           ELSE 'Distressed'
         END AS risk_tier
  FROM l2.facility_risk_snapshot frs
  WHERE frs.as_of_date = (SELECT MAX(as_of_date) FROM l2.facility_risk_snapshot)
    AND frs.pd_pct IS NOT NULL
)
SELECT fr.risk_tier,
       COUNT(DISTINCT fr.facility_id) AS facilities,
       COUNT(DISTINCT rf.risk_flag_id) AS flag_count,
       ROUND(COUNT(DISTINCT rf.risk_flag_id)::numeric / NULLIF(COUNT(DISTINCT fr.facility_id), 0), 2) AS flags_per_facility
FROM facility_risk fr
LEFT JOIN l2.risk_flag rf ON fr.facility_id = rf.facility_id
  AND (rf.is_active_flag = TRUE OR rf.is_active_flag::text = 'Y')
GROUP BY fr.risk_tier
ORDER BY fr.risk_tier;
EOSQL
```

**Severity:**
- MEDIUM if distressed facilities have fewer flags than IG facilities (inverse correlation)
- LOW if no correlation pattern is evident

### 3I. Flag Volume Reasonableness

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  total_facilities,
  facilities_with_active_flags,
  ROUND(100.0 * facilities_with_active_flags / NULLIF(total_facilities, 0), 2) AS flag_coverage_pct
FROM (
  SELECT
    (SELECT COUNT(*) FROM l2.facility_master) AS total_facilities,
    (SELECT COUNT(DISTINCT facility_id) FROM l2.risk_flag
     WHERE is_active_flag = TRUE OR is_active_flag::text = 'Y') AS facilities_with_active_flags
) sub;
EOSQL
```

**Severity:**
- MEDIUM if flag_coverage > 50% (too many flags = noise, not signal)
- MEDIUM if flag_coverage < 5% (too few flags for a GSIB portfolio)

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true` in orchestrator payload.

### 4A. Fix Orphaned FK References

```sql
DELETE FROM l2.risk_flag
WHERE facility_id IS NOT NULL
  AND facility_id NOT IN (SELECT facility_id FROM l2.facility_master);

DELETE FROM l2.risk_flag
WHERE counterparty_id IS NOT NULL
  AND counterparty_id NOT IN (SELECT counterparty_id FROM l2.counterparty);
```

### 4B. Fix Active/Resolved Inconsistency

```sql
-- Active flags should not have resolution dates
UPDATE l2.risk_flag
SET resolution_date = NULL
WHERE (is_active_flag = TRUE OR is_active_flag::text = 'Y')
  AND resolution_date IS NOT NULL;

-- Resolved flags without resolution dates get flag_date + 30 days
UPDATE l2.risk_flag
SET resolution_date = flag_date + INTERVAL '30 days'
WHERE (is_active_flag = FALSE OR is_active_flag::text = 'N')
  AND resolution_date IS NULL;
```

### 4C. Fix Duplicate Flags

```sql
DELETE FROM l2.risk_flag a
USING l2.risk_flag b
WHERE a.facility_id = b.facility_id
  AND a.risk_flag_type_code = b.risk_flag_type_code
  AND a.flag_date = b.flag_date
  AND a.risk_flag_id < b.risk_flag_id;
```

### 4D. Fix Future Dates

```sql
UPDATE l2.risk_flag
SET flag_date = CURRENT_DATE
WHERE flag_date > CURRENT_DATE;
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
  "agent": "dq-risk-flag",
  "run_timestamp": "ISO8601",
  "scope": "l2.risk_flag",
  "tables_checked": ["l2.risk_flag", "l2.facility_master", "l2.counterparty", "l2.facility_risk_snapshot", "l1.risk_flag_type_dim"],
  "summary": {
    "total_rows": 0,
    "active_flags": 0,
    "resolved_flags": 0,
    "distinct_flag_types": 0,
    "flag_coverage_pct": 0,
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

1. **Never DROP the table or any columns** — only UPDATE/DELETE rows
2. **Never execute fixes without `--fix` flag AND user confirmation for CRITICAL/HIGH fixes**
3. **Always run in a transaction** — ROLLBACK on any error
4. **Always run `db:introspect` after data changes** to keep DD in sync
5. **Log all findings to `.claude/audit/sessions/`** with agent name and timestamp
6. **Risk-metric correlation is advisory** — flag mismatches but do not auto-create/delete flags
7. **Flag volume thresholds are tier-dependent** — GSIB portfolios have more flags than regional banks
8. **Severity level fixes require business review** — do not auto-reclassify flag severity
9. **If running in orchestrator mode**, return JSON payload only (no interactive prompts)
