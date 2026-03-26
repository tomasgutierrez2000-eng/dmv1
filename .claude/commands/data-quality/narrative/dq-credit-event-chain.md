---
description: "DQ Credit Event Chain — validates credit event -> facility link -> facility -> counterparty chain integrity"
---

# DQ Credit Event Chain

You are a **narrative data quality agent** that validates the complete credit event chain: every credit event must link to facilities, those facilities must belong to the correct counterparty, event timing must be plausible, and downstream impacts (PD increase, risk flags, delinquency) should be visible in subsequent snapshots. Broken event chains indicate orphaned events, missing links, or incoherent factory narratives.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

### Step 1a: Read bank profile
```
Read .claude/config/bank-profile.yaml
```

### Step 1b: Verify database connectivity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "SELECT 'DQ_CONNECTED';"
```
If this fails, HALT with: "Cannot connect to PostgreSQL."

### Step 1c: Read data dictionary
```
Read facility-summary-mvp/output/data-dictionary/data-dictionary.json
```

### Step 1d: Load baseline profile (if available)
```
Read .claude/audit/dq-baseline/baseline-profile.json
```

---

## 2. Argument Detection

1. No arguments -> Check all credit events (default)
2. `--event ID` -> Check a single credit event
3. `--counterparty ID` -> Check all events for a counterparty
4. `--fix` -> Enable auto-fix mode
5. `--type DEFAULT|DOWNGRADE|RESTRUCTURE` -> Filter by event type

---

## 3. Event Population Overview

### Step 3a: Count and categorize all credit events

```sql
SELECT event_type_code, event_status,
       COUNT(*) AS event_count,
       MIN(event_date) AS earliest,
       MAX(event_date) AS latest
FROM l2.credit_event
GROUP BY event_type_code, event_status
ORDER BY event_count DESC;
```

### Step 3b: Link coverage overview

```sql
SELECT
  (SELECT COUNT(*) FROM l2.credit_event) AS total_events,
  (SELECT COUNT(DISTINCT credit_event_id) FROM l2.credit_event_facility_link) AS events_with_links,
  (SELECT COUNT(*) FROM l2.credit_event_facility_link) AS total_links,
  (SELECT COUNT(*) FROM l2.credit_event ce
   WHERE NOT EXISTS (SELECT 1 FROM l2.credit_event_facility_link cefl
                     WHERE cefl.credit_event_id = ce.credit_event_id)) AS orphaned_events;
```

---

## 4. Chain Integrity Checks

### 4a: Orphaned Events (No Facility Link)
**Check:** Every credit event should have at least one row in `credit_event_facility_link`.
**Severity:** HIGH — orphaned events are invisible to facility-level metrics.

```sql
SELECT ce.credit_event_id, ce.event_type_code, ce.event_date,
       ce.counterparty_id, c.legal_name
FROM l2.credit_event ce
JOIN l2.counterparty c ON ce.counterparty_id = c.counterparty_id
WHERE NOT EXISTS (
  SELECT 1 FROM l2.credit_event_facility_link cefl
  WHERE cefl.credit_event_id = ce.credit_event_id
)
ORDER BY ce.event_date;
```

### 4b: Dangling Links (Link Points to Non-Existent Facility)
**Check:** Every `credit_event_facility_link.facility_id` must exist in `facility_master`.
**Severity:** CRITICAL — dangling FK.

```sql
SELECT cefl.credit_event_id, cefl.facility_id
FROM l2.credit_event_facility_link cefl
WHERE NOT EXISTS (
  SELECT 1 FROM l2.facility_master fm WHERE fm.facility_id = cefl.facility_id
);
```

### 4c: Counterparty Mismatch (Event CP != Facility CP)
**Check:** The counterparty on the credit event must match the counterparty on the linked facility.
**Severity:** CRITICAL — breaks the narrative chain entirely.

```sql
SELECT ce.credit_event_id, ce.event_type_code, ce.event_date,
       ce.counterparty_id AS event_cp_id,
       fm.counterparty_id AS facility_cp_id,
       cefl.facility_id,
       c_event.legal_name AS event_cp_name,
       c_fac.legal_name AS facility_cp_name
FROM l2.credit_event ce
JOIN l2.credit_event_facility_link cefl ON ce.credit_event_id = cefl.credit_event_id
JOIN l2.facility_master fm ON cefl.facility_id = fm.facility_id
JOIN l2.counterparty c_event ON ce.counterparty_id = c_event.counterparty_id
JOIN l2.counterparty c_fac ON fm.counterparty_id = c_fac.counterparty_id
WHERE ce.counterparty_id != fm.counterparty_id;
```

### 4d: Temporal Validity (Event Within Facility Active Period)
**Check:** `event_date` should be >= `origination_date` and <= `maturity_date` (with 90-day grace after maturity for post-maturity events).
**Severity:** MEDIUM if event is slightly outside range. HIGH if event predates origination.

```sql
SELECT ce.credit_event_id, ce.event_type_code, ce.event_date,
       cefl.facility_id,
       fm.origination_date, fm.maturity_date,
       CASE
         WHEN ce.event_date < fm.origination_date THEN 'EVENT_BEFORE_ORIGINATION'
         WHEN ce.event_date > fm.maturity_date + INTERVAL '90 days' THEN 'EVENT_AFTER_MATURITY_GRACE'
         WHEN ce.event_date > fm.maturity_date THEN 'EVENT_AFTER_MATURITY_WITHIN_GRACE'
         ELSE 'OK'
       END AS temporal_check
FROM l2.credit_event ce
JOIN l2.credit_event_facility_link cefl ON ce.credit_event_id = cefl.credit_event_id
JOIN l2.facility_master fm ON cefl.facility_id = fm.facility_id
WHERE ce.event_date < fm.origination_date
   OR ce.event_date > fm.maturity_date + INTERVAL '90 days';
```

### 4e: Duplicate Event Detection
**Check:** No two credit events should have the same (counterparty_id, event_type_code, event_date) unless they affect different facilities.
**Severity:** MEDIUM — may indicate factory duplication bugs.

```sql
SELECT counterparty_id, event_type_code, event_date, COUNT(*) AS dup_count
FROM l2.credit_event
GROUP BY counterparty_id, event_type_code, event_date
HAVING COUNT(*) > 1;
```

### 4f: Loss Amount Validation
**Check:** `loss_amount` should be non-negative. For non-default events, `loss_amount` should typically be NULL or 0. Loss amount should not exceed total committed exposure for linked facilities.
**Severity:** HIGH if loss exceeds exposure. MEDIUM if negative.

```sql
SELECT ce.credit_event_id, ce.event_type_code, ce.loss_amount,
       SUM(fes.committed_amount) AS total_committed
FROM l2.credit_event ce
JOIN l2.credit_event_facility_link cefl ON ce.credit_event_id = cefl.credit_event_id
JOIN l2.facility_master fm ON cefl.facility_id = fm.facility_id
LEFT JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id
  AND fes.as_of_date = (SELECT MAX(as_of_date) FROM l2.facility_exposure_snapshot WHERE facility_id = fm.facility_id AND as_of_date <= ce.event_date)
WHERE ce.loss_amount IS NOT NULL AND ce.loss_amount > 0
GROUP BY ce.credit_event_id, ce.event_type_code, ce.loss_amount
HAVING ce.loss_amount > SUM(fes.committed_amount);
```

---

## 5. Downstream Impact Verification

For each credit event, verify that downstream data reflects the event appropriately.

### 5a: Post-Default PD Increase
**Check:** After a DEFAULT event, the linked facility's PD should increase to >10% in the next available risk snapshot.
**Severity:** HIGH if PD remains low after default.

```sql
SELECT ce.credit_event_id, ce.event_date, cefl.facility_id,
       frs_before.pd_pct AS pd_before_event,
       frs_after.pd_pct AS pd_after_event
FROM l2.credit_event ce
JOIN l2.credit_event_facility_link cefl ON ce.credit_event_id = cefl.credit_event_id
LEFT JOIN LATERAL (
  SELECT pd_pct FROM l2.facility_risk_snapshot
  WHERE facility_id = cefl.facility_id AND as_of_date <= ce.event_date
  ORDER BY as_of_date DESC LIMIT 1
) frs_before ON true
LEFT JOIN LATERAL (
  SELECT pd_pct FROM l2.facility_risk_snapshot
  WHERE facility_id = cefl.facility_id AND as_of_date > ce.event_date
  ORDER BY as_of_date ASC LIMIT 1
) frs_after ON true
WHERE ce.event_type_code IN ('DEFAULT', 'BANKRUPTCY')
  AND frs_after.pd_pct < 10;
```

### 5b: Post-Event Risk Flags
**Check:** After significant credit events (DEFAULT, DOWNGRADE), risk flags should be raised for the affected counterparty/facility.
**Severity:** MEDIUM if no corresponding risk flag.

```sql
SELECT ce.credit_event_id, ce.event_type_code, ce.event_date,
       ce.counterparty_id,
       COUNT(rf.risk_flag_id) AS flags_after_event
FROM l2.credit_event ce
LEFT JOIN l2.risk_flag rf ON ce.counterparty_id = rf.counterparty_id
  AND rf.raised_date >= ce.event_date
  AND rf.raised_date <= ce.event_date + INTERVAL '30 days'
WHERE ce.event_type_code IN ('DEFAULT', 'BANKRUPTCY', 'RESTRUCTURE')
GROUP BY ce.credit_event_id, ce.event_type_code, ce.event_date, ce.counterparty_id
HAVING COUNT(rf.risk_flag_id) = 0;
```

### 5c: Post-Event Delinquency
**Check:** After a default event, the linked facility should show elevated DPD (60+ or 90+) in subsequent delinquency snapshots.
**Severity:** MEDIUM.

```sql
SELECT ce.credit_event_id, ce.event_date, cefl.facility_id,
       fds.as_of_date AS delinquency_date, fds.dpd_bucket_code
FROM l2.credit_event ce
JOIN l2.credit_event_facility_link cefl ON ce.credit_event_id = cefl.credit_event_id
LEFT JOIN l2.facility_delinquency_snapshot fds ON cefl.facility_id = fds.facility_id
  AND fds.as_of_date > ce.event_date
  AND fds.as_of_date <= ce.event_date + INTERVAL '90 days'
WHERE ce.event_type_code IN ('DEFAULT', 'BANKRUPTCY')
  AND (fds.dpd_bucket_code IS NULL OR fds.dpd_bucket_code IN ('CURRENT', '1-29'));
```

---

## 6. Output

### 6a: Chain Integrity Summary Table

```
| Check | Total | Passed | Failed | Severity |
|-------|-------|--------|--------|----------|
| Orphaned events (no link) | 150 | 142 | 8 | HIGH |
| Dangling links | 300 | 300 | 0 | CRITICAL |
| CP mismatch | 300 | 298 | 2 | CRITICAL |
| Temporal validity | 300 | 290 | 10 | MEDIUM |
| Duplicate events | 150 | 148 | 2 | MEDIUM |
| Loss > exposure | 50 | 49 | 1 | HIGH |
```

### 6b: Downstream Impact Summary

```
| Impact Check | Events Checked | Impact Visible | Missing Impact |
|-------------|---------------|---------------|----------------|
| Post-default PD | 20 | 15 | 5 |
| Post-event flags | 30 | 22 | 8 |
| Post-event DPD | 20 | 12 | 8 |
```

### 6c: Session Output

Save findings to `.claude/audit/dq-sessions/dq-credit-event-chain-[timestamp].json`:

```json
{
  "agent": "dq-credit-event-chain",
  "scope": "narrative",
  "timestamp": "ISO8601",
  "tables_checked": ["l2.credit_event", "l2.credit_event_facility_link", "l2.facility_master", "l2.counterparty", "l2.facility_risk_snapshot", "l2.risk_flag", "l2.facility_delinquency_snapshot"],
  "total_events": 0,
  "events_with_links": 0,
  "orphaned_events": 0,
  "cp_mismatches": 0,
  "findings": [],
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

---

## 7. Fix Protocol

When `--fix` is enabled:
1. Log finding before any changes
2. Show fix SQL
3. Apply fix
4. Verify fix
5. Save fix record to `.claude/audit/dq-fixes/[finding_id].json`

**Fixable issues:**
- Orphaned events: create `credit_event_facility_link` rows when counterparty has exactly one facility (unambiguous link)
- Counterparty mismatch: update `credit_event.counterparty_id` to match facility's counterparty when there is only one linked facility
- Negative loss amounts: set to `ABS(loss_amount)`

**Non-fixable issues (report only):**
- Dangling links to non-existent facilities (need to determine correct facility)
- Temporal violations (may need event date adjustment or business review)
- Missing downstream impacts (need risk snapshot or flag generation)
- Duplicate events (need business decision on which to keep)

---

## 8. Safety Rules

1. **Read-only by default** — only modify data when `--fix` is explicitly passed
2. **Never DROP or TRUNCATE** — fixes are UPDATE/INSERT only
3. **Never delete credit events** — they are audit trail records
4. **Always log before fixing** — finding must be recorded before any data change
5. **Always provide rollback SQL** — every fix must be reversible
6. **No L1 or L3 modifications** — this agent only fixes L2 data
7. **Verify after fix** — re-run the check query to confirm it resolved the issue
8. **Do not expose DATABASE_URL or credentials** in output
