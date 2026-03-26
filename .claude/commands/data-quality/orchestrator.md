---
description: "Master Data Quality Orchestrator — coordinates 33 DQ agents across 6 phases to review all L2 tables"
---

# Data Quality Orchestrator

You are the **master coordinator** for a 53-agent data quality review system targeting the GSIB wholesale credit risk data platform. You orchestrate 6 phases of checks across 100 L2 tables, consolidate findings, track fixes, and produce a final health report.

Target: $ARGUMENTS

---

## 1. Invocation Modes

### Mode A: Full Run (default)
```
/data-quality:orchestrator
/data-quality:orchestrator --fix
```
Runs all 6 phases sequentially. With `--fix`, agents apply fixes automatically.

### Mode B: Single Phase
```
/data-quality:orchestrator --phase 0
/data-quality:orchestrator --phase 1 --fix
/data-quality:orchestrator --phase 3 --batch A
```

### Mode C: Single Table Deep-Dive
```
/data-quality:orchestrator --table l2.facility_master --fix
```
Runs all dimension checks + the per-table agent for one specific table.

### Mode D: Report Only
```
/data-quality:orchestrator --report
```
Generates consolidated report from the last run's session files without re-running checks.

### Argument Detection
1. No arguments → Full run (Mode A), no auto-fix
2. `--fix` → Enable auto-fix mode for all agents
3. `--phase N` → Run only phase N (0-5)
4. `--batch A|B|C` → Within phase 3, run only that batch
5. `--table l2.xxx` → Single-table deep-dive (Mode C)
6. `--report` → Report-only mode (Mode D)

---

## 2. Context Loading (MANDATORY)

### Step 2a: Read bank profile
```
Read .claude/config/bank-profile.yaml
```
Extract: `database.primary` connection, `institution_tier`, `active_risk_stripes`.

### Step 2b: Verify database connectivity
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "SELECT 'DQ_CONNECTED' AS status;"
```
If this fails, HALT with error: "Cannot connect to PostgreSQL. Check DATABASE_URL in .env"

### Step 2c: Check agent availability
Verify all 53 agent files exist:
```
Glob .claude/commands/data-quality/**/*.md
```
Expected: 53 files (1 orchestrator + 1 template + 10 dimensions + 15 tables + 4 narrative + 3 util + 19 remaining = 53 invokable + 1 template).

Count invokable agents (excluding _template.md and orchestrator.md): should be 51.

### Step 2d: Check for previous run checkpoint
```
Read .claude/audit/dq-sessions/orchestrator-latest.json (if exists)
```
If a checkpoint exists from an interrupted run, offer to resume from the last completed phase.

---

## 3. Phase Execution

### Phase 0: Baseline Profile (1 agent, sequential)
```
Invoke: /data-quality/util:dq-baseline-profiler
```
Produces `.claude/audit/dq-baseline/baseline-profile.json` with:
- Row counts per L2 table
- Column null percentages (from pg_stats)
- Distinct value counts for code/status columns
- FK constraint catalog

**Gate:** If baseline fails (DB unreachable), HALT entire pipeline.

### Phase 1: Structural Dimension Checks (4 agents, parallel)
Run these 4 agents in parallel:
1. `/data-quality/dimensions:dq-schema-conformance`
2. `/data-quality/dimensions:dq-pk-fk-integrity`
3. `/data-quality/dimensions:dq-type-alignment`
4. `/data-quality/dimensions:dq-null-coverage`

**Gate:** If any CRITICAL findings with fix_mode enabled, apply fixes before proceeding. If CRITICAL findings without fix_mode, warn user and ask to continue or abort.

### Phase 2: Data Value Dimension Checks (7 agents, parallel)
Run these 7 agents in parallel:
5. `/data-quality/dimensions:dq-data-distribution`
6. `/data-quality/dimensions:dq-temporal-coherence`
7. `/data-quality/dimensions:dq-numeric-bounds`
8. `/data-quality/dimensions:dq-boolean-consistency`
9. `/data-quality/dimensions:dq-categorical-diversity`
10. `/data-quality/dimensions:dq-cross-table-correlation`
11. `/data-quality/dimensions:dq-dashboard-readiness` — **NEW (2026-03-25):** JOIN fan-out, rollup concentration, EBT leaf, FX coverage, NULL dimension keys, anti-synthetic uniformity

### Phase 3: Per-Table Deep Dives (15 agents, 3 batches of 5)

**Batch A** (parallel):
11. `/data-quality/tables:dq-facility-master`
12. `/data-quality/tables:dq-counterparty`
13. `/data-quality/tables:dq-credit-agreement-master`
14. `/data-quality/tables:dq-facility-exposure-snapshot`
15. `/data-quality/tables:dq-facility-risk-snapshot`

**Batch B** (parallel, after Batch A):
16. `/data-quality/tables:dq-facility-pricing-snapshot`
17. `/data-quality/tables:dq-facility-financial-snapshot`
18. `/data-quality/tables:dq-facility-delinquency-snapshot`
19. `/data-quality/tables:dq-counterparty-rating-observation`
20. `/data-quality/tables:dq-collateral-snapshot`

**Batch C** (parallel, after Batch B):
21. `/data-quality/tables:dq-credit-event`
22. `/data-quality/tables:dq-risk-flag`
23. `/data-quality/tables:dq-position`
24. `/data-quality/tables:dq-facility-profitability-snapshot`
25. `/data-quality/tables:dq-fx-rate`

### Phase 4: Narrative Validation (4 agents, parallel)
26. `/data-quality/narrative:dq-counterparty-journey`
27. `/data-quality/narrative:dq-facility-lifecycle`
28. `/data-quality/narrative:dq-credit-event-chain`
29. `/data-quality/narrative:dq-rating-pd-delinquency`

### Phase 5: Report Generation (1 agent, sequential)
30. `/data-quality/util:dq-report-generator`

---

## 4. Consolidated Health Score

After all phases complete, compute:

### Per-Table Score
```
table_score = max(0, 100 - (critical * 15 + high * 8 + medium * 3 + low * 1))
```

### Overall Score
```
overall_score = weighted_average(table_scores, weights=row_counts)
```
Tables with more rows contribute more to the overall score.

### Score Interpretation
| Score | Rating | Meaning |
|-------|--------|---------|
| 90-100 | Excellent | Production-ready, GSIB audit-compliant |
| 75-89 | Good | Minor issues, safe for most reporting |
| 50-74 | Fair | Significant gaps, review before regulatory use |
| 25-49 | Poor | Major issues, data unreliable for metrics |
| 0-24 | Critical | Fundamental integrity failures |

---

## 5. Checkpoint & Resume

After each phase, write checkpoint:
```json
{
  "session_id": "uuid",
  "started_at": "ISO8601",
  "current_phase": 2,
  "phases_completed": [0, 1],
  "fix_mode": true,
  "total_findings": { "critical": 2, "high": 5, "medium": 12, "low": 8 },
  "total_fixes": 7,
  "phase_results": {
    "0": { "status": "completed", "findings": 0 },
    "1": { "status": "completed", "findings": 15, "fixes": 7 },
    "2": { "status": "in_progress" }
  }
}
```
Save to `.claude/audit/dq-sessions/orchestrator-latest.json`.

---

## 6. Final Report Format

Present to user:

```
## Data Quality Review — Final Report

**Date:** [timestamp]
**Database:** [DATABASE_URL host]
**Tables Reviewed:** [N] L2 tables
**Total Checks:** [N]
**Overall Health Score:** [N]/100 ([rating])

### Findings Summary
| Severity | Count | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | N | N | N |
| HIGH | N | N | N |
| MEDIUM | N | N | N |
| LOW | N | N | N |

### Per-Table Scores (sorted worst-first)
| Table | Score | Critical | High | Medium | Low |
|-------|-------|----------|------|--------|-----|
| l2.xxx | 45 | 2 | 3 | 5 | 1 |
| ... | ... | ... | ... | ... | ... |

### Top Issues (CRITICAL + HIGH)
1. [DQ-XXX-001] l2.table.column — description (FIXED / OPEN)
2. [DQ-XXX-002] l2.table.column — description (FIXED / OPEN)
...

### Narrative Coherence
- Counterparty journeys: [N] sampled, [N] coherent, [N] with issues
- Facility lifecycles: [N] traced, [N] valid
- Rating-PD correlation: [pass/fail]

### Fixes Applied
[N] fixes applied, [N] verified successful, [N] failed verification
Full fix log: .claude/audit/dq-fixes/
```

---

## 7. Safety Rules

1. **Never DROP or TRUNCATE** tables — fixes should be UPDATE/INSERT only
2. **Always log before fixing** — finding must be recorded before any data change
3. **Always provide rollback SQL** — every fix must be reversible
4. **Gate on CRITICAL findings** — if Phase 1 finds CRITICAL issues, pause and confirm with user before Phase 2
5. **No cross-schema writes** — DQ agents only modify L2 data, never L1 or L3
6. **Verify after fix** — re-run the check query to confirm the fix worked

## 8. Integration Points

**Upstream:**
- Data dictionary: `facility-summary-mvp/output/data-dictionary/data-dictionary.json`
- Bank profile: `.claude/config/bank-profile.yaml`
- Schema manifest: `.claude/config/schema-manifest.yaml`

**Downstream:**
- Audit sessions: `.claude/audit/dq-sessions/`
- Fix records: `.claude/audit/dq-fixes/`
- Baseline profile: `.claude/audit/dq-baseline/`

**Existing validation to complement (not duplicate):**
- `scenarios/factory/quality-controls/` — 11 QC modules (factory-generated data)
- `scripts/validate-l1-data-quality.ts` — L1 reference data
- `scenarios/factory/enhanced-validator.ts` — pre-flight validation

---

## 9. Regression Test Cases (Lessons Learned — 2026-03-25 DQ Run)

These 12 issues were found in the first comprehensive L2 DQ review. Every future run MUST check for recurrence.

| # | Finding | Table | Column | Severity | Regression SQL |
|---|---------|-------|--------|----------|---------------|
| 1 | ALL facilities mapped to single type ("Unknown", id=12) | facility_master | facility_type_id | CRITICAL | `SELECT COUNT(DISTINCT facility_type_id) AS types FROM l2.facility_master` → must be >= 5 |
| 2 | `legal_entity_id` 100% NULL — capital metrics can't compute entity rollups | facility_master | legal_entity_id | CRITICAL | `SELECT SUM(CASE WHEN legal_entity_id IS NULL THEN 1 ELSE 0 END) FROM l2.facility_master` → must be 0 |
| 3 | `rating_value = '0'` for 66.7% of CRO — invalid placeholder rating | counterparty_rating_observation | rating_value | CRITICAL | `SELECT SUM(CASE WHEN rating_value = '0' THEN 1 ELSE 0 END) FROM l2.counterparty_rating_observation` → must be 0 |
| 4 | 29.5% of facilities assigned to non-leaf EBT nodes → rollup double-counting | facility_master | lob_segment_id | HIGH | See "EBT leaf check" query in CLAUDE.md → `on_non_leaf` must be 0 |
| 5 | Collateral `haircut_pct = 0` for ALL rows — Basel III requires haircuts | collateral_snapshot | haircut_pct | HIGH | `SELECT SUM(CASE WHEN haircut_pct = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) FROM l2.collateral_snapshot` → must be < 30% |
| 6 | `facility_financial_snapshot` missing a month of data vs other snapshot tables | facility_financial_snapshot | as_of_date | HIGH | `SELECT COUNT(DISTINCT as_of_date) FROM l2.facility_financial_snapshot` → must match other snapshot tables |
| 7 | `bank_share_pct` uniformly 1.0 — zero syndication diversity | facility_exposure_snapshot | bank_share_pct | MEDIUM | `SELECT COUNT(DISTINCT bank_share_pct) FROM l2.facility_exposure_snapshot` → must be >= 2 |
| 8 | ALL amendment events are same type | amendment_event | amendment_type_code | MEDIUM | `SELECT COUNT(DISTINCT amendment_type_code) FROM l2.amendment_event` → must be >= 3 |
| 9 | Counterparty hierarchy < 10% populated | counterparty_hierarchy | — | MEDIUM | `SELECT COUNT(DISTINCT counterparty_id) * 100.0 / (SELECT COUNT(*) FROM l2.counterparty) FROM l2.counterparty_hierarchy` → must be >= 50% |
| 10 | Collateral covers < 15% of facilities | collateral_snapshot | facility_id | MEDIUM | `SELECT COUNT(DISTINCT facility_id) * 100.0 / (SELECT COUNT(*) FROM l2.facility_master) FROM l2.collateral_snapshot WHERE facility_id IS NOT NULL` → must be >= 20% |
| 11 | Perfect snapshot uniformity (stddev=0) — anti-synthetic signal | facility_exposure_snapshot | — | LOW | `SELECT ROUND(STDDEV(cnt)::numeric,2) FROM (SELECT facility_id, COUNT(*) AS cnt FROM l2.facility_exposure_snapshot GROUP BY facility_id) t` → must be > 0 |
| 12 | Zero negative interest income — unrealistic for variable-rate book | facility_profitability_snapshot | interest_income_amt | LOW | `SELECT SUM(CASE WHEN interest_income_amt < 0 THEN 1 ELSE 0 END) FROM l2.facility_profitability_snapshot` → must be > 0 |

### Common Fix Patterns

| Issue Type | Fix Pattern | Pitfall |
|-----------|-------------|---------|
| Single-value categorical | `UPDATE SET col = CASE WHEN id % N = 0 THEN ... END` | Must verify FK values exist in parent dim table BEFORE updating |
| NULL FK column | `UPDATE fm SET col = CASE WHEN condition THEN ... END FROM join_table` | Distribute across available FK targets by geography/entity type, not random |
| Missing snapshot month | `INSERT INTO ... SELECT ... FROM same_table WHERE as_of_date = [adjacent_date]` | Apply slight variance (0.9-1.1x) to numeric fields to avoid exact duplication |
| Zero haircuts | `UPDATE SET haircut_pct = CASE WHEN type = X THEN Y END` | Also update `eligible_collateral_amount = valuation * (1 - haircut)` |
| Non-leaf EBT | Map to first leaf child: `SELECT MIN(child_id) WHERE parent = non_leaf AND child NOT IN (SELECT parent ...)` | Some non-leaf nodes have children that are also non-leaf — must recurse to true leaves |
| Lifecycle variation (anti-synthetic) | `DELETE FROM snapshot WHERE as_of_date = earliest AND facility_id % N = 0` | Check for FK cascade constraints (position → position_detail → loans_*) before deleting |
| Placeholder ratings | Map via internal_risk_rating correlation using CTE + JOIN | Use `DISTINCT ON` to avoid multi-row joins when counterparty has multiple facilities |

### Column Name Corrections (actual vs assumed)

These column names differed from common assumptions during the DQ run:

| Table | Assumed Name | Actual Name |
|-------|-------------|-------------|
| counterparty_rating_observation | `observation_date` | `as_of_date` |
| counterparty_rating_observation | `rating_agency_code` | `rating_agency` |
| facility_pricing_snapshot | `interest_rate_spread_bps` | `spread_bps` |
| counterparty | `counterparty_status` | `counterparty_type` |
| risk_flag | `risk_flag_type_code` | `flag_type` |
| credit_event | `event_type_code` | `credit_event_type_code` |
| collateral_snapshot | `collateral_value_amt` | `valuation_amount` |
| facility_profitability_snapshot | `net_interest_income_amt` | `interest_income_amt` |
| counterparty_hierarchy | `child_counterparty_id` | PK is `counterparty_id` (the child IS the PK) |

**Lesson:** Always run `SELECT column_name FROM information_schema.columns WHERE table_schema='l2' AND table_name='xxx'` before writing queries with assumed column names. The data dictionary has the correct names but agent prompts may use outdated assumptions.

### Additional Regression Tests (2026-03-26 E2E Metric Validation)

These issues were found during end-to-end testing of 5 GSIB metrics (EXP-001, CAP-001, PRC-001, RSK-001, REF-001):

| # | Finding | Table | Severity | Regression SQL |
|---|---------|-------|----------|---------------|
| 13 | ALL counterparties have `pd_annual` < 0.06% — 100% Investment Grade, no tier diversity | counterparty | CRITICAL | `SELECT COUNT(DISTINCT CASE WHEN pd_annual > 0.4 THEN 1 WHEN pd_annual > 2.0 THEN 2 WHEN pd_annual > 10 THEN 3 END) AS tiers FROM l2.counterparty WHERE pd_annual IS NOT NULL` → must be >= 3 |
| 14 | Low position diversity: 98.6% of facilities have exactly 1 position | position | MEDIUM | `SELECT ROUND(STDDEV(cnt)::numeric, 2) FROM (SELECT facility_id, COUNT(DISTINCT position_id) AS cnt FROM l2.position GROUP BY facility_id) t` → stddev must be > 0.5 |
| 15 | Capital adequacy NOT_NULL validation at ERROR severity but 12.8% NULLs are expected | YAML validation | LOW | Check all YAML files: `NOT_NULL` + `severity: ERROR` on ratio metrics with NULLIF denominators → should be WARNING |

### Metric-Specific GSIB Distribution Checks

When running deep-dives on individual metrics, verify output distributions match these GSIB expectations:

| Metric Type | Expected Distribution | Red Flag |
|------------|----------------------|----------|
| Risk Rating Tier | 60% IG, 25% Standard, 10% Sub, 4% Doubtful, 1% Loss | 100% single tier |
| Capital Adequacy (%) | 80% in 8-20% range, <5% above 50% | >30% NULLs or >10% above 50% |
| All-in Rate (%) | Spread across 1-25%, concentration in 5-10% | All values identical or >50% |
| Collateral Value ($) | Log-normal distribution, 100K-10M range typical | All zero or all same value |
| Position Count | 1-5 per facility, some with 10+ | All = 1 (no diversity) |
