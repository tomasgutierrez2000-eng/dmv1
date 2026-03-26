Metric Expert Gate — PostgreSQL formula validation gate for GSIB metrics. Tests formula SQL against the live database, validates outputs against GSIB domain knowledge, checks cross-metric mathematical identities, and reports PASS / PASS_WITH_WARNINGS / FAIL with evidence.

Target: $ARGUMENTS

---

## 1. Invocation Modes

### Mode A: Single-Metric Gate (default)
```
/reviewers:metric-expert-gate CAP-001
/reviewers:metric-expert-gate CAP-001 --adversarial
/reviewers:metric-expert-gate CAP-001 --force
```

### Mode B: Library Sweep
```
/reviewers:metric-expert-gate --sweep
/reviewers:metric-expert-gate --sweep --parallel 5
```

### Mode C: Orchestrator-invoked
Receives structured payload from metric-config-writer or orchestrator:
```json
{
  "mode": "post_execution",
  "metric_id": "CAP-001",
  "yaml_path": "scripts/calc_engine/metrics/capital/CAP-001.yaml",
  "requestor": "metric-config-writer-v1",
  "session_id": "uuid"
}
```

### Argument Detection
1. If argument matches `[A-Z]{2,4}-\d{3}` → single-metric gate
2. If argument is `--sweep` → library sweep mode
3. If argument ends in `.yaml` → extract metric_id from YAML, run single gate
4. If none match → ask user to clarify

### Flags
- `--adversarial` — Run edge-case injection tests (NULL, zero, extreme values) inside BEGIN...ROLLBACK
- `--force` — On FAIL, log WARNING but allow metric to proceed. Requires justification string. Audit-logged.
- `--sweep` — Discover all YAMLs and run gate per metric. Serial by default.
- `--parallel N` — Run N concurrent gates during sweep (default: 1, max: 5)

---

## 2. Context Loading (MANDATORY)

### Step 2a: Read bank profile
```
Read .claude/config/bank-profile.yaml
```
Extract: `institution_tier`, `database.primary`, `migration_tooling.psql_path`.

### Step 2b: Read CLAUDE.md conventions
```
Read CLAUDE.md — focus on:
  - "Adding a New Metric" Phase 5 (validation rules)
  - "Common YAML Formula Bugs" table
  - "GSIB Risk Sanity Checks" table (Phase 5D) — THIS IS THE GSIB RANGE REGISTRY
  - "PostgreSQL Seed Data Quality Checklist"
```

### Step 2c: Determine worktree name
```bash
basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "main"
```
Used for worktree-aware batch IDs: `MXTEST_{METRIC_ID}_{WORKTREE}_{YYYYMMDD}`

### Step 2d: Load test registry

Read the test registry to understand what's already been tested:
```bash
cat .claude/audit/metric-expert-registry.jsonl 2>/dev/null | wc -l
```

If the file exists, parse it to build a map of `metric_id → last_test_date, last_verdict`. Use this to:
1. Report prior test history when running a single-metric gate (Step 3j)
2. Identify never-tested metrics in sweep mode
3. Detect metrics that previously FAILed and may need re-testing

### Step 2e: Check for stale test batches
```bash
source .env && psql "$DATABASE_URL" -c "
  SELECT load_batch_id, COUNT(*), MIN(created_ts) AS oldest
  FROM l3.metric_result
  WHERE load_batch_id LIKE 'MXTEST_%'
  GROUP BY load_batch_id
  ORDER BY oldest;
"
```
If stale batches exist (>1 hour old), clean them up before proceeding:
```bash
psql "$DATABASE_URL" -c "DELETE FROM l3.metric_result WHERE load_batch_id LIKE 'MXTEST_%' AND created_ts < NOW() - INTERVAL '1 hour';"
```

### Step 2e: Verify DATABASE_URL connectivity
```bash
source .env && psql "$DATABASE_URL" -c "SELECT 1 AS connected;" 2>&1
```
If this fails: **FAIL immediately** — "No database connection. Set DATABASE_URL and ensure PostgreSQL is reachable."

---

## 3. Single-Metric Gate Flow

### Step 3a: Read and validate metric YAML

Locate the YAML:
```bash
find scripts/calc_engine/metrics -name "{METRIC_ID}.yaml" -type f
```

Read the YAML file. Validate structure:
- `metric_id` exists and matches argument
- `status` is ACTIVE (or being upgraded to ACTIVE)
- `source_tables` array is non-empty
- `levels` object has at least `facility` key
- Each level has `formula_sql` field
- `formula_sql` starts with `SELECT` (no CTEs)

If any structural check fails: **FAIL** with specific error. Do NOT proceed to SQL execution.

### Step 3b: Determine test date
```bash
source .env && psql "$DATABASE_URL" -t -c "
  SELECT MAX(as_of_date) FROM l2.facility_exposure_snapshot;
"
```
Use the latest available `as_of_date` for all formula executions.

### Step 3c: Generate batch ID
```
MXTEST_{METRIC_ID}_{WORKTREE}_{YYYYMMDD}
```
Example: `MXTEST_CAP-001_condescending-swirles_20260325`

### Step 3d: Dispatch SQL Executor (BLOCKING — must complete before next dispatches)

Use the Agent tool to dispatch `sql-executor.md` with:
- The metric YAML content
- The test date
- The batch ID
- The psql path from bank-profile
- Whether `--adversarial` flag is set

**Wait for completion.** The SQL Executor writes results to `l3.metric_result`. If it FAILs, skip directly to Step 3f (Debugger).

### Step 3e: Dispatch Domain Validator + Cross-Metric Checker (PARALLEL)

After SQL Executor succeeds, dispatch BOTH in parallel using the Agent tool:

**Domain Validator** (`domain-validator.md`):
- The metric YAML (for unit_type, metric_class)
- The batch ID (to query L3 results)
- The GSIB range table from CLAUDE.md Phase 5D

**Cross-Metric Checker** (`cross-metric-checker.md`):
- The metric ID
- The batch ID
- The identity registry (hardcoded in checker)
- Auto-discovery mode: checker reads identity registry, finds related metric IDs, runs their formula_sql too, writes to same batch, then checks identities

Wait for both to complete.

### Step 3f: Dispatch Debugger (only on FAIL)

If SQL Executor, Domain Validator, OR Cross-Metric Checker returned FAIL:

Dispatch `debugger.md` with:
- The failure details (error message, tier, level)
- The metric YAML
- The CLAUDE.md "Common YAML Formula Bugs" table

The Debugger returns a root cause diagnosis and proposed fix. It NEVER modifies files.

### Step 3g: Produce verdict

Combine all tier results:

```
VERDICT LOGIC:
  - ALL tiers PASS → PASS
  - Any tier WARNING, none FAIL → PASS_WITH_WARNINGS
  - Any tier FAIL → FAIL
  - FAIL + --force flag → FORCED_PASS (logged with justification)
```

Output payload:
```json
{
  "metric_id": "CAP-001",
  "verdict": "PASS_WITH_WARNINGS",
  "test_date": "2025-01-31",
  "tiers": {
    "structural": { "status": "PASS" },
    "execution": { "status": "PASS", "rows": { "facility": 362, "counterparty": 98, "desk": 12, "portfolio": 6, "business_segment": 3 } },
    "domain": { "status": "WARNING", "findings": ["48 facilities >50% CAR — capped at 100%"] },
    "cross_metric": { "status": "PASS", "identities_checked": 2, "identities_passed": 2 }
  },
  "adversarial": { "ran": false },
  "debugger": null,
  "test_batch_id": "MXTEST_CAP-001_condescending-swirles_20260325",
  "cleanup_confirmed": true,
  "forced": false
}
```

### Step 3h: Cleanup L3 test data

**ALWAYS run cleanup, even on FAIL:**
```bash
source .env && psql "$DATABASE_URL" -c "
  DELETE FROM l3.metric_result WHERE load_batch_id = '{BATCH_ID}';
"
```
Report: "Cleaned up {N} test rows from l3.metric_result."

If cleanup fails (PG down): WARN but do not crash. Stale batch check in Step 2d will catch orphans on next run.

### Step 3i: Audit logging

Write audit session to `.claude/audit/sessions/metric-expert-{METRIC_ID}-{timestamp}.json`:
```json
{
  "agent": "metric-expert-gate",
  "metric_id": "CAP-001",
  "timestamp": "2026-03-25T21:30:00Z",
  "verdict": "PASS_WITH_WARNINGS",
  "tiers": { ... },
  "adversarial": { ... },
  "debugger": null,
  "duration_seconds": 45,
  "cleanup_confirmed": true
}
```

### Step 3j: Update test registry

Append the result to the persistent test registry at `.claude/audit/metric-expert-registry.jsonl`. This is a JSONL file (one JSON object per line) that tracks every metric the gate has tested and when.

```bash
echo '{"metric_id":"{METRIC_ID}","verdict":"{VERDICT}","test_date":"{TEST_DATE}","tested_at":"{ISO_TIMESTAMP}","worktree":"{WORKTREE}","domain":"{DOMAIN}","levels_tested":5,"facility_rows":{N},"adversarial":{true|false},"forced":{true|false},"findings_count":{N}}' >> .claude/audit/metric-expert-registry.jsonl
```

**Before running the gate**, read the registry to report prior test history for this metric:
```bash
grep '"metric_id":"{METRIC_ID}"' .claude/audit/metric-expert-registry.jsonl 2>/dev/null | tail -5
```

If prior entries exist, display:
```
Prior test history for {METRIC_ID}:
  2026-03-25 21:30 — PASS (worktree: condescending-swirles)
  2026-03-24 14:15 — FAIL → fixed → PASS (worktree: quirky-ishizaka)
```

**In sweep mode**, after all metrics are tested, produce a coverage summary from the registry:
```bash
# Metrics tested in the last 7 days
grep -c '"verdict"' .claude/audit/metric-expert-registry.jsonl 2>/dev/null
# Metrics never tested (compare YAML list vs registry)
```

Display:
```
COVERAGE: 87/110 ACTIVE metrics tested in last 7 days
NEVER TESTED: AMD-003, RSK-012, CAP-009, ... (23 metrics)
LAST FULL SWEEP: 2026-03-25 (87 metrics)
```

### Step 3k: Present results

Display a clear summary to the user:

```
╔══════════════════════════════════════════════════════╗
║  METRIC EXPERT GATE — CAP-001                       ║
║  Capital Adequacy Ratio (%)                          ║
╠══════════════════════════════════════════════════════╣
║  Structural:    PASS                                 ║
║  Execution:     PASS (362 facility, 98 cp, ...)     ║
║  Domain:        WARNING — 48 facilities >50% CAR    ║
║  Cross-Metric:  PASS (2/2 identities)               ║
║  Adversarial:   not run (use --adversarial)          ║
╠══════════════════════════════════════════════════════╣
║  VERDICT: PASS_WITH_WARNINGS                         ║
║  Cleanup: 362 test rows deleted                      ║
╚══════════════════════════════════════════════════════╝
```

---

## 4. Sweep Mode

When `--sweep` flag is provided:

### Step 4a: Discover all YAML metrics
```bash
find scripts/calc_engine/metrics -name "*.yaml" -type f | sort
```

### Step 4b: Filter to ACTIVE metrics only
Read each YAML, check `status: ACTIVE`. Skip DRAFT metrics.

### Step 4c: Execute gates

**Serial (default):** Loop through each metric, invoke the single-metric gate flow (Steps 3a-3j).

**Parallel (`--parallel N`):** Dispatch N concurrent gate runs using the Agent tool. Each gets its own batch ID (worktree + metric ID ensures uniqueness).

### Step 4d: Produce sweep summary

```
╔══════════════════════════════════════════════════════════════╗
║  METRIC EXPERT SWEEP — 2026-03-25                            ║
╠══════════════════════════════════════════════════════════════╣
║  Total metrics:  87 ACTIVE (23 DRAFT skipped)                ║
║  PASS:           72                                          ║
║  WARNINGS:       11                                          ║
║  FAIL:            4                                          ║
╠══════════════════════════════════════════════════════════════╣
║  FAILED METRICS:                                             ║
║    RSK-005 — Column `risk_weight_pct` not found              ║
║    AMD-003 — 0 rows at facility level (no data for date)     ║
║    CAP-008 — Division by zero (missing NULLIF)               ║
║    EXP-019 — Cross-metric identity EL≠PD×LGD×EAD            ║
╠══════════════════════════════════════════════════════════════╣
║  Duration: 38 minutes (serial)                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 5. Force Override

When `--force` flag is used on a FAILed metric:

1. Prompt user for justification string:
   "This metric FAILED validation. Provide justification for forcing ACTIVE status:"

2. Log the override:
```json
{
  "action": "FORCED_PASS",
  "metric_id": "CAP-001",
  "justification": "Business-critical for Q1 reporting. Known issue with seed data, not formula.",
  "original_verdict": "FAIL",
  "failure_details": "...",
  "forced_by": "tomas",
  "timestamp": "2026-03-25T21:30:00Z"
}
```

3. Write to audit trail with severity: WARNING.
4. Proceed — metric can be marked ACTIVE.

---

## 6. Integration Points

### Upstream (who invokes this gate)
- **User** via `/reviewers:metric-expert-gate {METRIC_ID}` (Mode A)
- **Metric Config Writer** (S5) — after calc:sync and calc:demo succeed (Mode C)
- **Master Orchestrator** (S8) — Phase 8.5 in FULL/BUILD mode (Mode C)

### Downstream (who consumes the verdict)
- **Metric Config Writer** — blocks `status: ACTIVE` if verdict is FAIL (unless --force)
- **Risk Expert Reviewer** — receives gate verdict as input to POST_EXECUTION QA
- **Audit Reporter** — reads gate audit sessions for compliance reports

### Output handoff format
The full verdict JSON (Step 3g) is:
1. Stored in `.claude/audit/sessions/` via audit logging
2. Returned to the orchestrator (Mode C) as the `output_payload`
3. Displayed to user (Mode A) via the summary box (Step 3j)
