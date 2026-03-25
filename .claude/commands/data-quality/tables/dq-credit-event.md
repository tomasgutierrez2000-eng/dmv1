---
description: "DQ Credit Event — validates credit events and facility links, event type codes, temporal consistency, and rarity distribution in l2.credit_event"
---

# DQ Credit Event

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You perform a deep-dive review of `l2.credit_event` and its companion `l2.credit_event_facility_link` — the tables that record defaults, bankruptcies, restructurings, and other credit events. These feed loss-given-default calculations, CECL allowance, and regulatory reporting. Missing or incorrect events cause LGD models to understate loss severity and CECL reserves to be misstated.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` — parse the L2 entries for `credit_event` and `credit_event_facility_link` to get all column names, types, PKs, and FKs
3. Read `CLAUDE.md` sections on "FK Referential Integrity Rules" and "Story Coherence Checklist"
4. If a baseline profile exists at `.claude/audit/dq-baselines/credit-event.json`, load it for delta comparison

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/tables:dq-credit-event
/data-quality/tables:dq-credit-event --fix
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
SELECT 'credit_event' AS tbl,
       COUNT(*) AS total_rows,
       COUNT(DISTINCT counterparty_id) AS distinct_counterparties,
       COUNT(DISTINCT event_type_code) AS distinct_event_types,
       MIN(event_date) AS earliest_event,
       MAX(event_date) AS latest_event
FROM l2.credit_event
UNION ALL
SELECT 'credit_event_facility_link' AS tbl,
       COUNT(*) AS total_rows,
       COUNT(DISTINCT facility_id) AS distinct_facilities,
       COUNT(DISTINCT credit_event_id) AS distinct_events,
       NULL::date, NULL::date
FROM l2.credit_event_facility_link;
"
```

**Severity rules:**
- CRITICAL if `credit_event` has 0 rows (need some credit events for realistic data)
- HIGH if `credit_event_facility_link` has 0 rows when `credit_event` has rows (every event needs at least one link)

### 3B. FK Integrity — counterparty_id

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT ce.counterparty_id, COUNT(*) AS orphan_rows
FROM l2.credit_event ce
LEFT JOIN l2.counterparty c ON ce.counterparty_id = c.counterparty_id
WHERE c.counterparty_id IS NULL
GROUP BY ce.counterparty_id
LIMIT 20;
"
```

**Severity:** CRITICAL if any orphaned counterparty_ids exist.

### 3C. FK Integrity — credit_event_facility_link

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT 'event_id_orphans' AS check_type, COUNT(*) AS cnt
FROM l2.credit_event_facility_link cefl
LEFT JOIN l2.credit_event ce ON cefl.credit_event_id = ce.credit_event_id
WHERE ce.credit_event_id IS NULL
UNION ALL
SELECT 'facility_id_orphans' AS check_type, COUNT(*) AS cnt
FROM l2.credit_event_facility_link cefl
LEFT JOIN l2.facility_master fm ON cefl.facility_id = fm.facility_id
WHERE fm.facility_id IS NULL;
"
```

**Severity:** CRITICAL if any orphaned credit_event_id or facility_id values exist.

### 3D. Event Type Code Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT event_type_code, COUNT(*) AS cnt
FROM l2.credit_event
GROUP BY event_type_code
ORDER BY cnt DESC;
"
```

**Expected valid types:** DEFAULT, BANKRUPTCY, RESTRUCTURING, DOWNGRADE, FORBEARANCE, DISTRESSED_EXCHANGE, ACCELERATION, COVENANT_BREACH (or code equivalents).

**Severity:**
- HIGH if unrecognized event_type_codes exist
- MEDIUM if only 1 event type represented (should have at least 2-3 types)
- LOW if distribution is overly uniform (real portfolios are skewed toward downgrades/covenant breaches)

### 3E. Event Date Validation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT COUNT(*) FILTER (WHERE event_date > CURRENT_DATE) AS future_events,
       COUNT(*) FILTER (WHERE event_date < '2020-01-01') AS ancient_events,
       COUNT(*) FILTER (WHERE event_date IS NULL) AS null_dates
FROM l2.credit_event;
"
```

**Severity:**
- HIGH if future events exist (events cannot be in the future)
- HIGH if NULL event dates exist
- MEDIUM if dates before 2020

### 3F. Event-Facility Link Completeness

Every credit event should have at least one facility link:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT ce.credit_event_id, ce.counterparty_id, ce.event_type_code, ce.event_date
FROM l2.credit_event ce
LEFT JOIN l2.credit_event_facility_link cefl ON ce.credit_event_id = cefl.credit_event_id
WHERE cefl.credit_event_id IS NULL
LIMIT 20;
"
```

**Severity:** HIGH if >10% of events have no facility links (orphaned events are meaningless for facility-level loss analysis).

### 3G. Duplicate Event Detection

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT counterparty_id, event_type_code, event_date, COUNT(*) AS dup_count
FROM l2.credit_event
GROUP BY counterparty_id, event_type_code, event_date
HAVING COUNT(*) > 1
LIMIT 20;
"
```

**Severity:** HIGH if duplicate events exist (same counterparty, type, and date should be unique).

### 3H. Event Rarity Check

Credit events should be relatively rare (healthy portfolio has <5% event rate):

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  total_counterparties,
  counterparties_with_events,
  ROUND(100.0 * counterparties_with_events / NULLIF(total_counterparties, 0), 2) AS event_rate_pct
FROM (
  SELECT
    (SELECT COUNT(*) FROM l2.counterparty) AS total_counterparties,
    (SELECT COUNT(DISTINCT counterparty_id) FROM l2.credit_event) AS counterparties_with_events
) sub;
EOSQL
```

**Severity:**
- MEDIUM if event_rate > 20% (unrealistically high — suggests data quality issue)
- LOW if event_rate = 0% (no events at all — may be intentional for seed data)

### 3I. Event-Risk Flag Correlation

Credit events should correlate with risk flags:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT
  COUNT(DISTINCT ce.counterparty_id) AS event_counterparties,
  COUNT(DISTINCT ce.counterparty_id) FILTER (
    WHERE rf.counterparty_id IS NOT NULL
  ) AS event_cp_with_flags,
  ROUND(100.0 * COUNT(DISTINCT ce.counterparty_id) FILTER (
    WHERE rf.counterparty_id IS NOT NULL
  ) / NULLIF(COUNT(DISTINCT ce.counterparty_id), 0), 2) AS correlation_pct
FROM l2.credit_event ce
LEFT JOIN l2.risk_flag rf ON ce.counterparty_id = rf.counterparty_id;
EOSQL
```

**Severity:**
- MEDIUM if <50% of counterparties with credit events also have risk flags (events should trigger flags)
- LOW if correlation is perfect (100%) — may indicate over-linking

### 3J. Event Within Facility Active Period

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A <<'EOSQL'
SELECT ce.credit_event_id, ce.event_date,
       fm.facility_id, fm.origination_date, fm.maturity_date
FROM l2.credit_event ce
JOIN l2.credit_event_facility_link cefl ON ce.credit_event_id = cefl.credit_event_id
JOIN l2.facility_master fm ON cefl.facility_id = fm.facility_id
WHERE ce.event_date < fm.origination_date
   OR (fm.maturity_date IS NOT NULL AND ce.event_date > fm.maturity_date + INTERVAL '90 days')
LIMIT 20;
EOSQL
```

**Severity:**
- HIGH if events occur before facility origination date
- MEDIUM if events occur >90 days after facility maturity (may indicate data lag, but suspicious)

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true` in orchestrator payload.

### 4A. Fix Orphaned FK References

```sql
-- Delete event-facility links pointing to non-existent events or facilities
DELETE FROM l2.credit_event_facility_link
WHERE credit_event_id NOT IN (SELECT credit_event_id FROM l2.credit_event);

DELETE FROM l2.credit_event_facility_link
WHERE facility_id NOT IN (SELECT facility_id FROM l2.facility_master);

-- Delete events pointing to non-existent counterparties
DELETE FROM l2.credit_event
WHERE counterparty_id NOT IN (SELECT counterparty_id FROM l2.counterparty);
```

### 4B. Fix Duplicate Events

```sql
-- Keep the row with the highest PK per duplicate group
DELETE FROM l2.credit_event a
USING l2.credit_event b
WHERE a.counterparty_id = b.counterparty_id
  AND a.event_type_code = b.event_type_code
  AND a.event_date = b.event_date
  AND a.credit_event_id < b.credit_event_id;
```

### 4C. Fix Future Event Dates

```sql
UPDATE l2.credit_event
SET event_date = CURRENT_DATE
WHERE event_date > CURRENT_DATE;
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
  "agent": "dq-credit-event",
  "run_timestamp": "ISO8601",
  "scope": "l2.credit_event + l2.credit_event_facility_link",
  "tables_checked": ["l2.credit_event", "l2.credit_event_facility_link", "l2.counterparty", "l2.facility_master", "l2.risk_flag"],
  "summary": {
    "total_events": 0,
    "total_links": 0,
    "distinct_counterparties_with_events": 0,
    "event_rate_pct": 0,
    "total_checks": 10,
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

1. **Never DROP tables or columns** — only UPDATE/DELETE rows
2. **Delete facility links BEFORE deleting events** to avoid FK violations
3. **Never execute fixes without `--fix` flag AND user confirmation for CRITICAL/HIGH fixes**
4. **Always run in a transaction** — ROLLBACK on any error
5. **Always run `db:introspect` after data changes** to keep DD in sync
6. **Log all findings to `.claude/audit/sessions/`** with agent name and timestamp
7. **Event-risk correlation is advisory** — flag mismatches but do not auto-create risk flags
8. **Event rarity is portfolio-dependent** — stressed portfolios legitimately have higher event rates
9. **If running in orchestrator mode**, return JSON payload only (no interactive prompts)
