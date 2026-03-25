---
description: "DQ Cross-Table Correlation — validates that related L2 tables have matching rows for shared entities and dates"
---

# DQ Cross-Table Correlation

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You validate that related L2 tables have matching rows: if a facility has an exposure snapshot, it should also have a risk snapshot for the same dates; if a credit event exists, it should have facility links; if a facility is active, it should have at least one exposure record. Missing cross-table correlations cause metric JOINs to silently return NULL or zero.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` for FK relationships
3. Read `CLAUDE.md` sections on "The Complete Chain Rule" and cross-table JOIN patterns
4. If a baseline exists at `.claude/audit/dq-baselines/cross-table-correlation.json`, load for delta

### Expected Cross-Table Relationships

| Parent Table | Child/Related Table | Join Key | Expectation |
|-------------|--------------------|---------:|-------------|
| facility_master | facility_exposure_snapshot | facility_id | Every active facility has >= 1 exposure row |
| facility_exposure_snapshot | facility_risk_snapshot | facility_id + as_of_date | Same date grid |
| facility_exposure_snapshot | facility_pricing_snapshot | facility_id + as_of_date | Same date grid |
| facility_exposure_snapshot | facility_delinquency_snapshot | facility_id + as_of_date | Same date grid |
| facility_master | facility_profitability_snapshot | facility_id | Active facilities have profitability data |
| credit_event | credit_event_facility_link | credit_event_id | Every event links to >= 1 facility |
| amendment_event | amendment_change_detail | amendment_event_id | Every amendment has >= 1 change detail |
| facility_master | collateral_snapshot | facility_id | Secured facilities have collateral |
| counterparty | counterparty_rating_observation | counterparty_id | Rated counterparties have observations |
| credit_agreement_master | facility_master | credit_agreement_id | Every agreement has >= 1 facility |
| counterparty | facility_master | counterparty_id | Active counterparties have >= 1 facility |

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/dimensions:dq-cross-table-correlation
/data-quality/dimensions:dq-cross-table-correlation --table l2.facility_exposure_snapshot
/data-quality/dimensions:dq-cross-table-correlation --fix
```

### Mode B: Orchestrator
Receives JSON payload:
```json
{
  "mode": "orchestrator",
  "fix_mode": false,
  "tables": ["l2.facility_exposure_snapshot"]
}
```

---

## 3. Check Procedures

### 3A. Snapshot Date Grid Correlation

Check that exposure, risk, pricing, and delinquency snapshots share the same (facility_id, as_of_date) grid:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Facilities with exposure but no risk snapshot (for same date)
SELECT COUNT(DISTINCT fes.facility_id) AS facilities_missing_risk,
       COUNT(*) AS rows_missing_risk
FROM l2.facility_exposure_snapshot fes
LEFT JOIN l2.facility_risk_snapshot frs
  ON fes.facility_id = frs.facility_id AND fes.as_of_date = frs.as_of_date
WHERE frs.facility_id IS NULL;
"
```

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Facilities with exposure but no pricing snapshot (for same date)
SELECT COUNT(DISTINCT fes.facility_id) AS facilities_missing_pricing,
       COUNT(*) AS rows_missing_pricing
FROM l2.facility_exposure_snapshot fes
LEFT JOIN l2.facility_pricing_snapshot fps
  ON fes.facility_id = fps.facility_id AND fes.as_of_date = fps.as_of_date
WHERE fps.facility_id IS NULL;
"
```

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Facilities with risk but no exposure snapshot (orphan risk data)
SELECT COUNT(DISTINCT frs.facility_id) AS facilities_risk_no_exposure,
       COUNT(*) AS rows_risk_no_exposure
FROM l2.facility_risk_snapshot frs
LEFT JOIN l2.facility_exposure_snapshot fes
  ON frs.facility_id = fes.facility_id AND frs.as_of_date = fes.as_of_date
WHERE fes.facility_id IS NULL;
"
```

Get specific mismatched (facility_id, as_of_date) pairs:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT DISTINCT fes.facility_id, fes.as_of_date
FROM l2.facility_exposure_snapshot fes
LEFT JOIN l2.facility_risk_snapshot frs
  ON fes.facility_id = frs.facility_id AND fes.as_of_date = frs.as_of_date
WHERE frs.facility_id IS NULL
ORDER BY fes.as_of_date DESC, fes.facility_id
LIMIT 20;
"
```

### 3B. Event-Link Correlation

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Credit events without facility links
SELECT ce.credit_event_id, ce.event_type_code, ce.event_date
FROM l2.credit_event ce
LEFT JOIN l2.credit_event_facility_link cefl
  ON ce.credit_event_id = cefl.credit_event_id
WHERE cefl.credit_event_id IS NULL
ORDER BY ce.event_date DESC
LIMIT 20;
"
```

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Amendment events without change details
SELECT ae.amendment_event_id, ae.amendment_type_code, ae.effective_date
FROM l2.amendment_event ae
LEFT JOIN l2.amendment_change_detail acd
  ON ae.amendment_event_id = acd.amendment_event_id
WHERE acd.amendment_event_id IS NULL
ORDER BY ae.effective_date DESC
LIMIT 20;
"
```

### 3C. Active Entity Coverage

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Active facilities without any exposure data
SELECT fm.facility_id, fm.facility_name, fm.facility_type_code
FROM l2.facility_master fm
LEFT JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id
WHERE fm.is_current_flag = true
  AND fes.facility_id IS NULL
ORDER BY fm.facility_id
LIMIT 20;
"
```

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Counterparties without any facilities
SELECT c.counterparty_id, c.legal_name
FROM l2.counterparty c
LEFT JOIN l2.facility_master fm ON c.counterparty_id = fm.counterparty_id
WHERE fm.counterparty_id IS NULL
ORDER BY c.counterparty_id
LIMIT 20;
"
```

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Credit agreements without any facilities
SELECT cam.credit_agreement_id, cam.agreement_name
FROM l2.credit_agreement_master cam
LEFT JOIN l2.facility_master fm ON cam.credit_agreement_id = fm.credit_agreement_id
WHERE fm.credit_agreement_id IS NULL
ORDER BY cam.credit_agreement_id
LIMIT 20;
"
```

### 3D. Collateral Coverage for Secured Facilities

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Secured facilities without collateral snapshots
SELECT fm.facility_id, fm.facility_type_code
FROM l2.facility_master fm
LEFT JOIN l2.collateral_snapshot cs ON fm.facility_id = cs.facility_id
WHERE fm.is_current_flag = true
  AND fm.facility_type_code IN ('SECURED_TL', 'SECURED_RCF', 'CRE', 'ABL')
  AND cs.facility_id IS NULL
ORDER BY fm.facility_id
LIMIT 20;
"
```

### 3E. Rating Coverage

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
-- Counterparties without any rating observations
SELECT c.counterparty_id, c.legal_name, c.entity_type_code
FROM l2.counterparty c
LEFT JOIN l2.counterparty_rating_observation cro
  ON c.counterparty_id = cro.counterparty_id
WHERE cro.counterparty_id IS NULL
ORDER BY c.counterparty_id
LIMIT 20;
"
```

### 3F. Row Count Correlation Summary

Overview of all related table pair correlations:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT
  'facility_master' AS parent_table,
  (SELECT COUNT(*) FROM l2.facility_master WHERE is_current_flag = true) AS parent_active,
  'facility_exposure_snapshot' AS child_table,
  (SELECT COUNT(DISTINCT facility_id) FROM l2.facility_exposure_snapshot) AS child_distinct_fk,
  (SELECT COUNT(*) FROM l2.facility_master fm WHERE fm.is_current_flag = true AND NOT EXISTS (
    SELECT 1 FROM l2.facility_exposure_snapshot fes WHERE fes.facility_id = fm.facility_id
  )) AS parent_without_child
UNION ALL
SELECT
  'credit_event',
  (SELECT COUNT(*) FROM l2.credit_event),
  'credit_event_facility_link',
  (SELECT COUNT(DISTINCT credit_event_id) FROM l2.credit_event_facility_link),
  (SELECT COUNT(*) FROM l2.credit_event ce WHERE NOT EXISTS (
    SELECT 1 FROM l2.credit_event_facility_link cefl WHERE cefl.credit_event_id = ce.credit_event_id
  ))
UNION ALL
SELECT
  'amendment_event',
  (SELECT COUNT(*) FROM l2.amendment_event),
  'amendment_change_detail',
  (SELECT COUNT(DISTINCT amendment_event_id) FROM l2.amendment_change_detail),
  (SELECT COUNT(*) FROM l2.amendment_event ae WHERE NOT EXISTS (
    SELECT 1 FROM l2.amendment_change_detail acd WHERE acd.amendment_event_id = ae.amendment_event_id
  ));
"
```

### 3G. The Complete Chain Audit

Verify the full FK chain from counterparty through to exposure:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT
  c.counterparty_id,
  c.legal_name,
  COUNT(DISTINCT cam.credit_agreement_id) AS agreements,
  COUNT(DISTINCT fm.facility_id) AS facilities,
  COUNT(DISTINCT fes.facility_id) AS facilities_with_exposure,
  COUNT(DISTINCT frs.facility_id) AS facilities_with_risk,
  CASE
    WHEN COUNT(DISTINCT fm.facility_id) = 0 THEN 'NO_FACILITIES'
    WHEN COUNT(DISTINCT fes.facility_id) = 0 THEN 'NO_EXPOSURE'
    WHEN COUNT(DISTINCT frs.facility_id) = 0 THEN 'NO_RISK'
    WHEN COUNT(DISTINCT fes.facility_id) < COUNT(DISTINCT fm.facility_id) THEN 'PARTIAL_EXPOSURE'
    ELSE 'COMPLETE'
  END AS chain_status
FROM l2.counterparty c
LEFT JOIN l2.credit_agreement_master cam ON c.counterparty_id = cam.borrower_counterparty_id
LEFT JOIN l2.facility_master fm ON cam.credit_agreement_id = fm.credit_agreement_id AND fm.is_current_flag = true
LEFT JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id
LEFT JOIN l2.facility_risk_snapshot frs ON fm.facility_id = frs.facility_id
GROUP BY c.counterparty_id, c.legal_name
ORDER BY chain_status, c.counterparty_id
LIMIT 30;
"
```

### Severity Classification

| Severity | Condition |
|----------|-----------|
| CRITICAL | Active facilities without any exposure snapshot — core metric data missing |
| CRITICAL | Exposure without risk snapshot (same dates) — PD/LGD/EL metrics fail |
| CRITICAL | Counterparties without any facilities — orphan master data |
| HIGH | Credit events without facility links — event metrics cannot attribute to facilities |
| HIGH | Active facilities missing from latest reporting period |
| HIGH | Incomplete chain (counterparty exists but has no path to exposure data) |
| MEDIUM | Amendment events without change details — amendment metrics incomplete |
| MEDIUM | Secured facilities without collateral — LTV metrics return NULL |
| MEDIUM | Counterparties without rating observations — rating metrics incomplete |
| LOW | Exposure without pricing snapshot — pricing metrics incomplete for those dates |
| LOW | Exposure without delinquency snapshot — DPD metrics incomplete |

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true`.

### 4A. Generate Stub Snapshot Rows

For facilities with exposure but no risk snapshot:

```sql
-- Insert stub risk snapshot rows for missing (facility_id, as_of_date) pairs
INSERT INTO l2.facility_risk_snapshot (facility_id, as_of_date, created_ts)
SELECT DISTINCT fes.facility_id, fes.as_of_date, CURRENT_TIMESTAMP
FROM l2.facility_exposure_snapshot fes
LEFT JOIN l2.facility_risk_snapshot frs
  ON fes.facility_id = frs.facility_id AND fes.as_of_date = frs.as_of_date
WHERE frs.facility_id IS NULL
ON CONFLICT DO NOTHING;
```

### 4B. Generate Event Links

For credit events without facility links, create a link to the first facility of the event's counterparty:

```sql
-- Link unlinked credit events to their counterparty's first facility
INSERT INTO l2.credit_event_facility_link (credit_event_id, facility_id, created_ts)
SELECT ce.credit_event_id, fm.facility_id, CURRENT_TIMESTAMP
FROM l2.credit_event ce
LEFT JOIN l2.credit_event_facility_link cefl ON ce.credit_event_id = cefl.credit_event_id
CROSS JOIN LATERAL (
  SELECT facility_id FROM l2.facility_master
  WHERE counterparty_id = ce.counterparty_id
  ORDER BY facility_id LIMIT 1
) fm
WHERE cefl.credit_event_id IS NULL
  AND fm.facility_id IS NOT NULL;
```

### 4C. Generate Exposure Stubs for Active Facilities

```sql
-- Insert minimal exposure rows for active facilities without exposure data
INSERT INTO l2.facility_exposure_snapshot (facility_id, as_of_date, committed_facility_amt, drawn_amount, created_ts)
SELECT fm.facility_id,
       (SELECT MAX(as_of_date) FROM l2.facility_exposure_snapshot),
       0, 0, CURRENT_TIMESTAMP
FROM l2.facility_master fm
LEFT JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id
WHERE fm.is_current_flag = true
  AND fes.facility_id IS NULL
ON CONFLICT DO NOTHING;
```

### 4D. Flag Orphan Master Data

For counterparties/agreements without children, set a status flag rather than deleting:

```sql
-- Mark orphan counterparties (no facilities)
UPDATE l2.counterparty
SET is_active_flag = false
WHERE counterparty_id NOT IN (
  SELECT DISTINCT counterparty_id FROM l2.facility_master
)
AND is_active_flag = true;
```

---

## 5. Output Format

```json
{
  "agent": "dq-cross-table-correlation",
  "run_timestamp": "2026-03-25T10:00:00Z",
  "scope": "all_l2",
  "summary": {
    "correlation_pairs_checked": 11,
    "pairs_with_gaps": 6,
    "total_missing_rows": 1245,
    "chain_completeness": {
      "complete_counterparties": 85,
      "partial_exposure": 10,
      "no_exposure": 3,
      "no_facilities": 2
    },
    "by_severity": {
      "CRITICAL": 3,
      "HIGH": 4,
      "MEDIUM": 3,
      "LOW": 2
    }
  },
  "findings": [
    {
      "finding_id": "XC-001",
      "parent_table": "l2.facility_exposure_snapshot",
      "child_table": "l2.facility_risk_snapshot",
      "join_key": "facility_id + as_of_date",
      "severity": "CRITICAL",
      "category": "snapshot_date_grid_mismatch",
      "missing_rows": 820,
      "affected_facilities": 410,
      "affected_dates": ["2024-11-30"],
      "fix_type": "insert_stub_rows",
      "message": "820 (facility_id, as_of_date) pairs in FES have no matching FRS row — entire Nov 2024 risk data missing"
    },
    {
      "finding_id": "XC-002",
      "parent_table": "l2.credit_event",
      "child_table": "l2.credit_event_facility_link",
      "join_key": "credit_event_id",
      "severity": "HIGH",
      "category": "event_without_link",
      "unlinked_events": 15,
      "total_events": 200,
      "sample_event_ids": [101, 102, 103],
      "message": "15 credit events have no facility link — cannot attribute to specific facilities"
    }
  ],
  "correlation_matrix": [
    {
      "parent": "facility_master (active)",
      "child": "facility_exposure_snapshot",
      "parent_count": 410,
      "child_distinct_fk": 408,
      "coverage_pct": 99.5,
      "status": "OK"
    },
    {
      "parent": "facility_exposure_snapshot",
      "child": "facility_risk_snapshot",
      "parent_count": 2753,
      "child_matched": 1933,
      "coverage_pct": 70.2,
      "status": "CRITICAL"
    }
  ],
  "fixes_applied": [],
  "delta_from_baseline": {
    "new_findings": 2,
    "resolved_findings": 1,
    "unchanged_findings": 5
  }
}
```

---

## 6. Safety Rules

1. **Stub rows should have NULL metric columns** — zero values distort calculations differently from NULL
2. **Never DELETE master data to fix correlation gaps** — mark inactive instead
3. **Event link generation requires matching counterparty** — never link events to random facilities
4. **ON CONFLICT DO NOTHING is mandatory** for all stub INSERT operations — prevents PK duplicates
5. **Log all findings to `.claude/audit/sessions/`**
6. **If running in orchestrator mode**, return JSON payload only
7. **The exposure-risk correlation is the highest-priority check** — most metrics JOIN FES + FRS
8. **Cross-reference with dq-temporal-coherence** — date grid misalignment is the root cause of many correlation gaps
9. **Partial coverage (e.g., 95% match) may be acceptable** — some facilities may legitimately lack certain snapshot types
10. **Always check both directions** (parent without child AND child without parent) — orphan child rows are also problematic
