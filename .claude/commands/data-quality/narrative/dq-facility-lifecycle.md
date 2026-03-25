---
description: "DQ Facility Lifecycle — traces facilities from origination through exposure, risk, pricing, and events"
---

# DQ Facility Lifecycle

You are a **narrative data quality agent** that traces sampled facilities through their complete lifecycle: origination, exposure evolution, risk changes, pricing adjustments, delinquency progression, and terminal events (maturity/default). Broken lifecycles indicate missing data, inconsistent seed generation, or factory bugs.

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

1. No arguments -> Sample 20 random facilities (default)
2. `--count N` -> Sample N facilities (max 50)
3. `--facility ID` -> Trace a single specific facility
4. `--fix` -> Enable auto-fix mode
5. `--status ACTIVE|MATURED|DEFAULTED` -> Filter sample by facility status
6. `--scenario S19` -> Focus on factory-generated facilities (ID >= 5000)

---

## 3. Sampling Strategy

### Step 3a: Sample facilities with diverse lifecycle coverage

```sql
SELECT fm.facility_id, fm.counterparty_id, fm.facility_type_code,
       fm.origination_date, fm.maturity_date, fm.facility_status,
       fm.committed_amount, fm.currency_code,
       c.legal_name, c.entity_type_code,
       COUNT(DISTINCT fes.as_of_date) AS exposure_snapshots,
       COUNT(DISTINCT frs.as_of_date) AS risk_snapshots,
       COUNT(DISTINCT fps.as_of_date) AS pricing_snapshots,
       COUNT(DISTINCT fds.as_of_date) AS delinquency_snapshots,
       COUNT(DISTINCT ce.credit_event_id) AS credit_events
FROM l2.facility_master fm
JOIN l2.counterparty c ON fm.counterparty_id = c.counterparty_id
LEFT JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id
LEFT JOIN l2.facility_risk_snapshot frs ON fm.facility_id = frs.facility_id
LEFT JOIN l2.facility_pricing_snapshot fps ON fm.facility_id = fps.facility_id
LEFT JOIN l2.facility_delinquency_snapshot fds ON fm.facility_id = fds.facility_id
LEFT JOIN l2.credit_event_facility_link cefl ON fm.facility_id = cefl.facility_id
LEFT JOIN l2.credit_event ce ON cefl.credit_event_id = ce.credit_event_id
GROUP BY fm.facility_id, fm.counterparty_id, fm.facility_type_code,
         fm.origination_date, fm.maturity_date, fm.facility_status,
         fm.committed_amount, fm.currency_code, c.legal_name, c.entity_type_code
ORDER BY RANDOM()
LIMIT 20;
```

Ensure sample includes: some with credit events, some without; different facility types; both seed (ID < 5000) and scenario (ID >= 5000) facilities.

---

## 4. Per-Facility Lifecycle Trace

For EACH sampled facility, run the following timeline query and build a lifecycle narrative.

### 4a: Full Timeline (Single Query)

```sql
SELECT fm.facility_id, fm.origination_date, fm.maturity_date, fm.facility_status,
       fm.committed_amount AS master_committed, fm.currency_code AS master_currency,
       fes.as_of_date,
       fes.drawn_amount, fes.committed_amount AS snapshot_committed,
       fes.undrawn_amount, fes.currency_code AS snapshot_currency,
       frs.pd_pct, frs.lgd_pct, frs.internal_risk_rating,
       fps.spread_bps, fps.all_in_rate_pct, fps.base_rate_code,
       fds.days_past_due, fds.dpd_bucket_code,
       ffs.total_revenue_amt, ffs.net_income_amt, ffs.total_assets_amt
FROM l2.facility_master fm
LEFT JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id
LEFT JOIN l2.facility_risk_snapshot frs ON fm.facility_id = frs.facility_id AND fes.as_of_date = frs.as_of_date
LEFT JOIN l2.facility_pricing_snapshot fps ON fm.facility_id = fps.facility_id AND fes.as_of_date = fps.as_of_date
LEFT JOIN l2.facility_delinquency_snapshot fds ON fm.facility_id = fds.facility_id AND fes.as_of_date = fds.as_of_date
LEFT JOIN l2.facility_financial_snapshot ffs ON fm.facility_id = ffs.facility_id AND fes.as_of_date = ffs.as_of_date
WHERE fm.facility_id = :fac_id
ORDER BY fes.as_of_date;
```

### 4b: Credit Events for This Facility
```sql
SELECT ce.credit_event_id, ce.event_type_code, ce.event_date,
       ce.event_status, ce.loss_amount, ce.counterparty_id
FROM l2.credit_event ce
JOIN l2.credit_event_facility_link cefl ON ce.credit_event_id = cefl.credit_event_id
WHERE cefl.facility_id = :fac_id
ORDER BY ce.event_date;
```

### 4c: Amendment Events
```sql
SELECT ae.amendment_event_id, ae.event_date, ae.amendment_type,
       acd.change_field, acd.old_value, acd.new_value
FROM l2.amendment_event ae
LEFT JOIN l2.amendment_change_detail acd ON ae.amendment_event_id = acd.amendment_event_id
WHERE ae.facility_id = :fac_id
ORDER BY ae.event_date;
```

### 4d: Collateral
```sql
SELECT cs.collateral_id, cs.as_of_date, cs.market_value_amt,
       cs.collateral_type_code, cs.coverage_ratio_pct
FROM l2.collateral_snapshot cs
WHERE cs.facility_id = :fac_id
ORDER BY cs.as_of_date;
```

---

## 5. Lifecycle Coherence Checks

For each facility, evaluate ALL of the following rules. Each failed check becomes a finding.

### 5a: Temporal Ordering
**Check:** `origination_date < maturity_date`. First snapshot `as_of_date >= origination_date`. No snapshots after maturity_date (unless status changed to EXTENDED).
**Severity:** HIGH if origination >= maturity. MEDIUM if snapshots outside active period.

### 5b: Status-Snapshot Consistency
**Check:** Facilities with status MATURED or CLOSED should not have recent (latest date) snapshots showing non-zero drawn amounts. ACTIVE facilities should have snapshots at the latest snapshot date in the database.
**Severity:** MEDIUM.

### 5c: Exposure Amount Monotonicity
**Check:** `committed_amount` should not change by >50% between consecutive snapshots unless an amendment event explains the change. `drawn_amount` changes are more volatile but should not exceed `committed_amount`.
**Severity:** HIGH if drawn > committed at any snapshot. MEDIUM if committed jumps >50% unexplained.

### 5d: PD/LGD Evolution
**Check:** PD and LGD should change gradually (not >5x jump between consecutive snapshots without a credit event). PD should be within 0-100% range. LGD within 0-100%.
**Severity:** HIGH if PD or LGD outside [0, 100]. MEDIUM if unexplained >5x jump.

### 5e: Risk Rating Transitions
**Check:** Internal risk ratings should follow plausible transitions. A jump from AAA-equivalent to default without intermediate steps is suspicious (unless a sudden credit event occurred).
**Severity:** MEDIUM for implausible rating jumps.

### 5f: Pricing-Risk Alignment
**Check:** When PD increases significantly (>2x), pricing spread should also increase in the same or next period. Stable or decreasing spreads during credit deterioration indicates mis-pricing or stale data.
**Severity:** LOW (informational).

### 5g: Delinquency Progression
**Check:** DPD bucket transitions should be monotonically worsening OR show cure events. Valid transitions: CURRENT -> 1-29 -> 30-59 -> 60-89 -> 90+. Invalid: 90+ -> CURRENT without a cure event or payment record.
**Severity:** HIGH if invalid backward transition without explanation.

### 5h: Default Event Consistency
**Check:** If a credit event with type DEFAULT exists, the facility should show elevated PD (>10%) and DPD 90+ at or after the event date. Conversely, facilities with PD > 30% for >3 consecutive periods should have a credit event or at minimum risk flags.
**Severity:** HIGH if default event exists but PD < 5% at event date.

### 5i: Currency Consistency
**Check:** `facility_master.currency_code` should match `facility_exposure_snapshot.currency_code` for all snapshots of that facility. Currency should not change across snapshots (facility currency is fixed at origination).
**Severity:** CRITICAL if currency changes mid-lifecycle.

### 5j: Snapshot Date Coverage
**Check:** All snapshot tables (exposure, risk, pricing, delinquency) should have the same set of `as_of_date` values for a given facility. Missing dates in one table but present in others indicates incomplete data generation.
**Severity:** MEDIUM. Compute coverage ratio: `dates_present / max_dates_across_tables`.

### 5k: Financial Metric Consistency
**Check:** If financial snapshot data exists, `total_assets_amt > 0`, `total_revenue_amt` is reasonable for the industry, `net_income_amt` is not wildly inconsistent with revenue.
**Severity:** LOW.

### 5l: Committed vs Master Committed
**Check:** `facility_master.committed_amount` should match the earliest `facility_exposure_snapshot.committed_amount` (at origination). Later snapshots may differ if amendments occurred.
**Severity:** LOW if minor difference. MEDIUM if >10% difference at first snapshot.

---

## 6. Output

### 6a: Per-Facility Lifecycle Summary

For each facility, produce:
```
### Facility: [facility_id] ([facility_type_code])
**Counterparty:** [legal_name] (ID: [cp_id])
**Lifecycle:** [origination_date] -> [maturity_date] | Status: [status]
**Committed:** [amount] [currency]
**Snapshots:** [N] dates across [M] tables
**Events:** [N] credit events, [N] amendments
**Coherence:** [PASS / N issues found]
**Lifecycle Story:**
> [2-4 sentence narrative of the facility's life based on the data:
>  e.g., "Originated Jan 2024 as a $50M revolving credit facility.
>  Utilization increased from 30% to 65% over 6 months.
>  PD remained stable at 0.5% with no delinquency.
>  Facility remains active with 18 months to maturity."]
**Issues:**
- [DQ-NAR-FLC-001] [severity] [description]
```

### 6b: Session Output

Save findings to `.claude/audit/dq-sessions/dq-facility-lifecycle-[timestamp].json`:

```json
{
  "agent": "dq-facility-lifecycle",
  "scope": "narrative",
  "timestamp": "ISO8601",
  "tables_checked": ["l2.facility_master", "l2.facility_exposure_snapshot", "l2.facility_risk_snapshot", "..."],
  "facilities_sampled": 20,
  "facilities_coherent": 14,
  "facilities_with_issues": 6,
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

### 6c: Present Summary Table

```
| Facility | Type | Counterparty | Status | Snapshots | Events | Coherent | Issues |
|----------|------|-------------|--------|-----------|--------|----------|--------|
| 5001     | RCF  | Atlas Corp  | ACTIVE | 13        | 0      | YES      | 0      |
| 42       | TL   | Acme Inc    | MATURED| 8         | 1      | NO       | 2      |
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
- `drawn_amount > committed_amount` -> cap drawn to committed, recalculate undrawn
- Currency mismatch between master and snapshot -> update snapshot to match master
- Missing `undrawn_amount` -> calculate as `committed_amount - drawn_amount`
- PD/LGD outside [0, 100] -> cap to valid range

**Non-fixable issues (report only):**
- Missing snapshot dates (requires data regeneration)
- Rating transition anomalies (needs business review)
- Pricing-risk misalignment (may be intentional)

---

## 8. Safety Rules

1. **Read-only by default** — only modify data when `--fix` is explicitly passed
2. **Never DROP or TRUNCATE** — fixes are UPDATE/INSERT only
3. **Always log before fixing** — finding must be recorded before any data change
4. **Always provide rollback SQL** — every fix must be reversible
5. **No L1 or L3 modifications** — this agent only fixes L2 data
6. **Verify after fix** — re-run the check query to confirm it resolved the issue
7. **Do not expose DATABASE_URL or credentials** in output
