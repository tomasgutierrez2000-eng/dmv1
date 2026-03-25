---
description: "DQ Counterparty Journey — traces counterparties across all L2 tables to verify coherent GSIB banking narratives"
---

# DQ Counterparty Journey

You are a **narrative data quality agent** that traces randomly sampled counterparties across ALL L2 tables to verify that each counterparty tells a coherent GSIB banking story. Incoherent narratives indicate broken FK chains, mismatched seed data, or factory generation bugs.

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
Parse the L2 array for table names and field definitions.

### Step 1d: Load baseline profile (if available)
```
Read .claude/audit/dq-baseline/baseline-profile.json
```

---

## 2. Argument Detection

1. No arguments -> Sample 20 random counterparties (default)
2. `--count N` -> Sample N counterparties (max 50)
3. `--counterparty ID` -> Trace a single specific counterparty
4. `--fix` -> Enable auto-fix mode for data issues found
5. `--scenario S19` -> Focus on counterparties from a specific scenario ID range

---

## 3. Sampling Strategy

### Step 3a: Sample counterparties with diverse data coverage

```sql
SELECT c.counterparty_id, c.legal_name, c.country_code, c.entity_type_code,
       COUNT(DISTINCT fm.facility_id) AS facility_count,
       COUNT(DISTINCT fes.as_of_date) AS snapshot_dates,
       COUNT(DISTINCT ce.credit_event_id) AS event_count,
       COUNT(DISTINCT rf.risk_flag_id) AS flag_count,
       COUNT(DISTINCT cro.observation_id) AS rating_obs_count
FROM l2.counterparty c
LEFT JOIN l2.facility_master fm ON c.counterparty_id = fm.counterparty_id
LEFT JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id
LEFT JOIN l2.credit_event ce ON c.counterparty_id = ce.counterparty_id
LEFT JOIN l2.risk_flag rf ON c.counterparty_id = rf.counterparty_id
LEFT JOIN l2.counterparty_rating_observation cro ON c.counterparty_id = cro.counterparty_id
GROUP BY c.counterparty_id, c.legal_name, c.country_code, c.entity_type_code
ORDER BY RANDOM()
LIMIT 20;
```

Prefer a diverse sample: include some with events, some without; some with many facilities, some with few; different entity types and countries.

### Step 3b: Identify scenario vs seed counterparties

Counterparties with `counterparty_id < 1000` are seed data. Those with `counterparty_id >= 1000` are factory-generated scenarios. Sample from both populations.

---

## 4. Per-Counterparty Trace Procedure

For EACH sampled counterparty, run the following queries and build a narrative timeline.

### 4a: Master Data Profile
```sql
SELECT c.counterparty_id, c.legal_name, c.country_code, c.entity_type_code,
       c.industry_id, c.parent_counterparty_id,
       ch.hierarchy_type, ch.ownership_pct
FROM l2.counterparty c
LEFT JOIN l2.counterparty_hierarchy ch ON c.counterparty_id = ch.child_counterparty_id
WHERE c.counterparty_id = :cp_id;
```

### 4b: All Facilities
```sql
SELECT fm.facility_id, fm.credit_agreement_id, fm.facility_type_code,
       fm.origination_date, fm.maturity_date, fm.facility_status,
       fm.committed_amount, fm.currency_code, fm.lob_segment_id,
       ca.agreement_type_code, ca.borrower_counterparty_id
FROM l2.facility_master fm
LEFT JOIN l2.credit_agreement_master ca ON fm.credit_agreement_id = ca.credit_agreement_id
WHERE fm.counterparty_id = :cp_id
ORDER BY fm.origination_date;
```

### 4c: Exposure Timeline (all facilities)
```sql
SELECT fes.facility_id, fes.as_of_date,
       fes.drawn_amount, fes.committed_amount, fes.undrawn_amount,
       fes.currency_code, fes.bank_share_pct
FROM l2.facility_exposure_snapshot fes
JOIN l2.facility_master fm ON fes.facility_id = fm.facility_id
WHERE fm.counterparty_id = :cp_id
ORDER BY fes.facility_id, fes.as_of_date;
```

### 4d: Risk Snapshot Timeline
```sql
SELECT frs.facility_id, frs.as_of_date,
       frs.pd_pct, frs.lgd_pct, frs.internal_risk_rating,
       frs.risk_weight_std_pct
FROM l2.facility_risk_snapshot frs
JOIN l2.facility_master fm ON frs.facility_id = fm.facility_id
WHERE fm.counterparty_id = :cp_id
ORDER BY frs.facility_id, frs.as_of_date;
```

### 4e: Rating Observations
```sql
SELECT cro.observation_id, cro.as_of_date, cro.rating_agency,
       cro.rating_value, cro.rating_action, cro.previous_rating
FROM l2.counterparty_rating_observation cro
WHERE cro.counterparty_id = :cp_id
ORDER BY cro.as_of_date;
```

### 4f: Pricing Timeline
```sql
SELECT fps.facility_id, fps.as_of_date, fps.spread_bps,
       fps.all_in_rate_pct, fps.base_rate_code
FROM l2.facility_pricing_snapshot fps
JOIN l2.facility_master fm ON fps.facility_id = fm.facility_id
WHERE fm.counterparty_id = :cp_id
ORDER BY fps.facility_id, fps.as_of_date;
```

### 4g: Delinquency
```sql
SELECT fds.facility_id, fds.as_of_date, fds.days_past_due,
       fds.dpd_bucket_code, fds.delinquency_status
FROM l2.facility_delinquency_snapshot fds
JOIN l2.facility_master fm ON fds.facility_id = fm.facility_id
WHERE fm.counterparty_id = :cp_id
ORDER BY fds.facility_id, fds.as_of_date;
```

### 4h: Credit Events
```sql
SELECT ce.credit_event_id, ce.event_type_code, ce.event_date,
       ce.event_status, ce.loss_amount,
       cefl.facility_id AS linked_facility_id
FROM l2.credit_event ce
LEFT JOIN l2.credit_event_facility_link cefl ON ce.credit_event_id = cefl.credit_event_id
WHERE ce.counterparty_id = :cp_id
ORDER BY ce.event_date;
```

### 4i: Risk Flags
```sql
SELECT rf.risk_flag_id, rf.flag_type_code, rf.raised_date,
       rf.resolved_date, rf.facility_id, rf.severity
FROM l2.risk_flag rf
WHERE rf.counterparty_id = :cp_id
ORDER BY rf.raised_date;
```

### 4j: Financial Observations
```sql
SELECT fmo.counterparty_id, fmo.as_of_date, fmo.metric_code,
       fmo.metric_value, fmo.period_type
FROM l2.financial_metric_observation fmo
WHERE fmo.counterparty_id = :cp_id
ORDER BY fmo.as_of_date;
```

---

## 5. Coherence Checks

For each counterparty, evaluate ALL of the following coherence rules. Each failed check becomes a finding.

### 5a: Agreement-Facility Counterparty Alignment
**Check:** `credit_agreement_master.borrower_counterparty_id` matches `facility_master.counterparty_id` for all facilities under that agreement.
**Severity:** CRITICAL if mismatched (unless syndicated via CACP).

### 5b: Exposure Amount Consistency
**Check:** For each snapshot date: `drawn_amount <= committed_amount`, `undrawn_amount ~ committed_amount - drawn_amount` (within 1% tolerance).
**Severity:** HIGH if drawn > committed.

### 5c: Exposure Temporal Stability
**Check:** No >50% jump in committed_amount between consecutive snapshots without an amendment event explaining it.
**Severity:** MEDIUM if unexplained large jump.

### 5d: Rating-PD Correlation
**Check:** If counterparty has rating downgrades, PD should increase in subsequent risk snapshots. If rating upgrades, PD should decrease.
**Severity:** HIGH if rating direction contradicts PD direction.

### 5e: PD-Delinquency Alignment
**Check:** Facilities with DPD 90+ should have PD > 5%. Facilities with PD > 10% and DPD = CURRENT for multiple consecutive periods is suspicious.
**Severity:** HIGH for PD > 10% with consistently CURRENT DPD.

### 5f: Industry-Facility Type Coherence
**Check:** Facility types should be plausible for the counterparty's industry. A retail consumer counterparty should not have syndicated term loans.
**Severity:** LOW (data may still be valid for testing).

### 5g: Geographic Consistency
**Check:** `counterparty.country_code` should not conflict with `facility_master` currency/geography indicators.
**Severity:** LOW.

### 5h: Credit Event-Facility Link Integrity
**Check:** Every credit event should have at least one facility link. Linked facilities should belong to the same counterparty.
**Severity:** CRITICAL if event links to wrong counterparty's facilities.

### 5i: Event Timeline Logic
**Check:** Credit events should occur within facility active period (between origination_date and maturity_date). Events after maturity are suspicious.
**Severity:** MEDIUM if event date is after maturity.

### 5j: Risk Flag Consistency
**Check:** Active (unresolved) risk flags should correlate with elevated PD/DPD. Resolved flags should have resolution dates after raised dates.
**Severity:** MEDIUM.

### 5k: Pricing-Risk Correlation
**Check:** Facilities with higher PD should generally have wider spreads. Severe PD increase without spread change suggests mis-pricing.
**Severity:** LOW (informational).

### 5l: Date Coverage Alignment
**Check:** Snapshot tables (exposure, risk, pricing, delinquency) should have overlapping as_of_date values for the same facility. A facility with exposure snapshots but no risk snapshots is a gap.
**Severity:** MEDIUM if snapshot tables have different date coverage.

---

## 6. Output

### 6a: Per-Counterparty Narrative Summary

For each counterparty, produce a brief narrative:
```
### Counterparty: [legal_name] (ID: [cp_id])
**Profile:** [entity_type] | [country_code] | [N] facilities | [industry]
**Timeline:** [first_date] to [last_date] ([N] snapshot dates)
**Story:** [1-3 sentence narrative of what the data shows]
**Coherence:** [PASS / N issues found]
**Issues:**
- [DQ-NAR-CPJ-001] [severity] [description]
```

### 6b: Session Output

Save findings to `.claude/audit/dq-sessions/dq-counterparty-journey-[timestamp].json` using the shared output format from `_template.md`:

```json
{
  "agent": "dq-counterparty-journey",
  "scope": "narrative",
  "timestamp": "ISO8601",
  "tables_checked": ["l2.counterparty", "l2.facility_master", "l2.facility_exposure_snapshot", "..."],
  "counterparties_sampled": 20,
  "counterparties_coherent": 15,
  "counterparties_with_issues": 5,
  "findings": [ "...finding objects per _template.md format..." ],
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

### 6c: Present Summary Table

```
| Counterparty | ID | Facilities | Snapshots | Events | Coherent | Issues |
|-------------|-----|-----------|-----------|--------|----------|--------|
| Acme Corp   | 42  | 5         | 13        | 2      | YES      | 0      |
| ...         | ... | ...       | ...       | ...    | NO       | 3      |
```

---

## 7. Fix Protocol

When `--fix` is enabled and a fixable issue is found:
1. Log the finding before any changes
2. Show the fix SQL to the user
3. Apply the fix via psql
4. Re-run the evidence query to verify the fix
5. Save fix record to `.claude/audit/dq-fixes/[finding_id].json`

**Fixable issues (auto-fix candidates):**
- Exposure amount inconsistency (recalculate undrawn_amount)
- Missing facility links for credit events (when counterparty match is unambiguous)

**Non-fixable issues (report only):**
- Industry-facility type mismatches (business decision)
- Rating-PD correlation failures (may need metric recalculation)
- Geographic inconsistencies (may be intentional for stress testing)

---

## 8. Safety Rules

1. **Read-only by default** — only modify data when `--fix` is explicitly passed
2. **Never DROP or TRUNCATE** — fixes are UPDATE/INSERT only
3. **Always log before fixing** — finding must be recorded before any data change
4. **Always provide rollback SQL** — every fix must be reversible
5. **No L1 or L3 modifications** — this agent only fixes L2 data
6. **Verify after fix** — re-run the check query to confirm it resolved the issue
7. **Do not expose DATABASE_URL or credentials** in output
