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

### Phase 2: Data Value Dimension Checks (6 agents, parallel)
Run these 6 agents in parallel:
5. `/data-quality/dimensions:dq-data-distribution`
6. `/data-quality/dimensions:dq-temporal-coherence`
7. `/data-quality/dimensions:dq-numeric-bounds`
8. `/data-quality/dimensions:dq-boolean-consistency`
9. `/data-quality/dimensions:dq-categorical-diversity`
10. `/data-quality/dimensions:dq-cross-table-correlation`

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
