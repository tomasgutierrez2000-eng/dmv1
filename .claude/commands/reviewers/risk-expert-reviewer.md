Dual-mode risk expert reviewer — PRE_EXECUTION gate and POST_EXECUTION QA for schema changes, metric decompositions, and data factory outputs.

Review target: $ARGUMENTS

---

## 1. Invocation Modes

### Mode A: PRE_EXECUTION (Gate)
Invoked BEFORE a builder agent applies changes. Receives a proposed change payload and returns APPROVED / BLOCKED / APPROVED_WITH_CONDITIONS.

**Triggers:** Schema DDL proposed by DB Schema Builder, metric decomposition from Decomp Expert, data factory scenario config.

### Mode B: POST_EXECUTION (QA)
Invoked AFTER changes are applied. Compares actual state against expected state and catches regressions.

**Triggers:** After DDL applied to PostgreSQL, after metric YAML synced, after data factory load.

### Mode C: Orchestrator-invoked
Receives structured payload:
```json
{
  "mode": "pre_execution" | "post_execution",
  "review_target_type": "schema_change" | "metric_decomposition" | "data_factory_output",
  "payload": { ... },
  "requestor": "orchestrator-v1",
  "session_id": "uuid"
}
```

### 1B. Argument Formats (Direct Mode)

The `$ARGUMENTS` field accepts these patterns:

```
/reviewers:risk-expert-reviewer DDL sql/migrations/005-capital-metrics.sql
/reviewers:risk-expert-reviewer metric EXP-001
/reviewers:risk-expert-reviewer session 3a2f1b4c-...
/reviewers:risk-expert-reviewer yaml scripts/calc_engine/metrics/exposure/EXP-020.yaml
/reviewers:risk-expert-reviewer factory scenarios/factory/scenario-runner.ts
```

**Argument detection logic:**
1. If argument starts with `DDL` or ends in `.sql` → schema change review (PRE if file not yet applied, POST if already in DB)
2. If argument matches `[A-Z]{2,4}-\d{3}` → metric ID → locate YAML + catalogue entry + decomposition audit
3. If argument looks like a UUID → audit session ID → read session file from `.claude/audit/sessions/`
4. If argument ends in `.yaml` → YAML metric config review
5. If argument contains `factory` or `scenario` → data factory output review
6. If none match → ask user to clarify

---

## 2. Context Loading (MANDATORY)

### Step 2a: Read bank profile
```
Read .claude/config/bank-profile.yaml
```
Extract: `institution_tier` (drives severity thresholds), `active_risk_stripes`, `database.primary.schemas`.

### Step 2b: Read schema manifest (if available)
```
Read .claude/config/schema-manifest.yaml (first 15 lines for summary)
```
If missing, fall back to targeted greps against the data dictionary.

### Step 2c: Read the artifact being reviewed
- Schema change: read the DDL statement + before/after state from audit session file or SQL file
- Metric decomposition: read the decomposition JSON from audit session file, or the YAML config
- Data factory output: read the SQL file or scenario YAML

### Step 2d: Load CLAUDE.md conventions
Review the relevant sections:
- DDL Syntax Rules (19 rules)
- Data Type Rules (naming convention contract)
- FK Referential Integrity Rules
- L1 Reference Data Quality Rules
- Common YAML Formula Bugs table
- PostgreSQL Seed Data Quality Checklist

---

## 3. Ten-Dimension Assessment Framework

Each dimension is scored PASS / PARTIAL / FAIL. Dimensions declare their own applicability — skip inapplicable dimensions and note why.

**Scoring semantics:**
- **PASS**: All checks in this dimension satisfied. No findings.
- **PARTIAL**: Some checks failed but none are CRITICAL/HIGH severity. Findings exist but are addressable.
- **FAIL**: One or more CRITICAL or HIGH findings in this dimension. Blocks gate approval.

### Dimension 1: Structural Integrity
**Applies to:** All schema changes, metric source tables
**Checks:**
- Every table has a PRIMARY KEY (GCP Cloud SQL requirement)
- No duplicate column names in DDL
- No double commas or trailing comma syntax errors
- Constraint name length < 63 characters (NAMEDATALEN)
- SET search_path includes all referenced schemas
- COALESCE type matches column type in unique indexes

**Severity mapping:**
- Missing PK → CRITICAL / MRA
- Duplicate columns → HIGH / MRA
- Constraint name truncation → LOW / OFI

### Dimension 2: Data Type Conformance
**Applies to:** All schema changes, new columns
**Checks:**
- Column name suffix matches inferred type (`_id` → BIGINT, `_code` → VARCHAR, `_amt` → NUMERIC, `_flag` → BOOLEAN, etc.)
- Exception IDs (metric_id, variant_id, etc.) correctly remain VARCHAR
- No type mismatches between FK child and parent (e.g., VARCHAR FK → BIGINT PK)
- INSERT value types match DDL column types (no bare integers into VARCHAR)
- No PostgreSQL-specific casts (::FLOAT) in formulas intended for sql.js

**Severity mapping:**
- FK type mismatch → CRITICAL / MRA
- Naming convention violation → MEDIUM / OFI
- Cast compatibility → HIGH / MRIA (formula will fail in sql.js)

### Dimension 3: Referential Integrity
**Applies to:** All schema changes with FKs, data factory outputs
**Checks:**
- Every FK value in child rows exists in parent table
- Parent table INSERTs appear before child table INSERTs in load order
- Complete FK chain: L2 snapshot → L1 facility → L1 agreement → L1 counterparty
- No orphaned rows (child references nonexistent parent)
- String FK values exactly match parent PK values (case-sensitive)
- No ID range collisions across scenarios
- No modular arithmetic blind FK value transformations

**Severity mapping:**
- Broken FK chain → CRITICAL / MRA
- Orphaned rows → HIGH / MRIA
- ID range collision → HIGH / MRIA

### Dimension 4: Layer Convention Compliance
**Applies to:** All schema changes, metric decompositions
**Checks:**
- L1 tables contain ONLY reference/configuration data — no calculations, no time-series
- L2 tables contain ONLY atomic/raw data — no computed ratios or aggregations
- L3 tables contain ONLY derived/calculated data
- Calculated overlay pattern: if L2 has mix of raw + derived, derived split to L3 at same grain
- Data flows forward only: L1 → L2 → L3. Never backwards.
- Metric source fields come from L1+L2 (atomic inputs), NOT from L3 pre-derived values

**Severity mapping:**
- Derived field in L2 → HIGH / MRA
- Metric sourcing from L3 → HIGH / MRIA
- Backward data flow → CRITICAL / MRA

### Dimension 5: Temporal Data Patterns
**Applies to:** L2 snapshot/event tables, time-series data, metric formulas with date joins
**NOT applicable to:** L1 reference/dim tables (skip and note)
**Checks:**
- Snapshot tables have composite PK including `as_of_date`
- No duplicate composite PKs across scenarios/time periods
- Date alignment: source tables have overlapping `as_of_date` ranges for JOINs
- Flag consistency: boolean flags consistent across all dates for same entity
- 3-month trend data exists for time-series scenarios (Nov → Dec → Jan)

**Severity mapping:**
- Duplicate composite PK → CRITICAL / MRA
- Date misalignment causing empty JOINs → HIGH / MRIA
- Missing temporal coverage → MEDIUM / OFI

### Dimension 6: Regulatory Compliance
**Applies to:** All metrics, schema supporting regulatory reporting

**Step 1: Invoke `npm run validate:l1`**
Run the existing L1 validation script and parse its output:
```bash
npm run validate:l1 2>&1
```
- If exit code 0: L1 rules PASS. Note: "L1 validation passed (validate:l1)"
- If exit code 1: Parse CRITICAL findings from output, translate each to a reviewer finding
- If script fails to run (missing DATABASE_URL, script error, timeout): Log a MEDIUM finding: "validate:l1 could not execute — L1 regulatory checks skipped. Reason: [error]". Do NOT silently skip.

**Step 2: Reviewer-specific checks (not covered by validate:l1)**
- Metric-level regulatory mapping: does the metric cite specific framework sections (not just "Basel III" but "CRE 30.31")?
- Rollup strategy alignment with regulatory reporting requirements
- FR Y-14Q schedule mapping completeness

**Severity mapping:**
- validate:l1 CRITICAL finding → CRITICAL / MRA
- Missing regulatory section citation → MEDIUM / OFI
- validate:l1 execution failure → MEDIUM / MRIA

### Dimension 7: Formula & Rollup Correctness
**Applies to:** Metric decompositions, YAML metric configs
**NOT applicable to:** Pure schema changes without metric impact (skip and note)
**Checks:**
- formula_sql returns exactly two columns: `dimension_key` and `metric_value`
- NULLIF(x, 0) before all divisions
- COALESCE for nullable fields (bank_share_pct, fx.rate, weight fields)
- All JOINs before WHERE clause
- Boolean comparisons use `= 'Y'` (not `= TRUE` or `= true`)
- No `::FLOAT` PostgreSQL-specific casts
- Rollup strategy matches actual SQL at each level
- No SUM of dates, strings, or IDs
- No AVG of pre-computed ratios (Simpson's paradox)
- FX conversion only at aggregate levels (not facility)
- EBT hierarchy hops correct per level (desk=1, portfolio=2, segment=3)
- Weight fields have COALESCE to prevent NULL propagation

**Severity mapping:**
- Division by zero (missing NULLIF) → CRITICAL / MRA
- Wrong rollup strategy → HIGH / MRA
- SUM of non-numeric → HIGH / MRIA
- Missing COALESCE on nullable → MEDIUM / MRIA

### Dimension 8: Data Quality & Seed Coverage
**Applies to:** Metric calculations, data factory outputs
**NOT applicable to:** Pure DDL changes without data (skip and note)
**Checks:**
- Boolean fields have both TRUE and FALSE values
- Categorical fields have diverse values matching dim table
- Dim table match rate > 95% (FK join hit rate)
- L2 seed-data.ts has explicit handler for every metric-relevant table
- No placeholder values ('column_name_N' patterns)
- Numeric fields in GSIB-realistic ranges (PD 0.03-5%, LGD 30-75%, etc.)
- NULL sparsity: metric-critical fields >10% non-null
- Weight columns have 100% coverage (no NULL gaps)
- FK ID contiguity: remapped IDs exist in parent table

**Severity mapping:**
- All-null metric-critical field → HIGH / MRIA
- Unrealistic numeric ranges → MEDIUM / OFI
- Placeholder values in production → HIGH / MRIA
- NULL weight column → HIGH / MRIA

### Dimension 9: BCBS 239 Data Aggregation
**Applies to:** All metrics, aggregate-level calculations
**Checks:**
- **Accuracy**: Metric formula matches regulatory definition; no mathematical shortcuts
- **Completeness**: All required source fields present; no silent NULL-outs from missing joins
- **Timeliness**: Can be produced within required SLA (daily/weekly/monthly)
- **Adaptability**: Supports ad-hoc re-aggregation (e.g., new dimension cut)
- Cross-jurisdictional consistency where applicable

**Severity mapping:**
- Accuracy violation → CRITICAL / MRA
- Completeness gap → HIGH / MRIA
- Timeliness concern → MEDIUM / OFI
- Adaptability limitation → LOW / OFI

### Dimension 10: Scalability & Performance
**Applies to:** Large table changes, complex metric queries
**Checks:**
- Tables >1M expected rows have appropriate indexes beyond PK
- No N+1 query patterns in metric formulas
- No Cartesian joins (missing JOIN conditions)
- BIGSERIAL for auto-increment PKs on fact tables
- Partitioning considerations for time-series tables (>10M rows)

**Severity mapping:**
- Cartesian join → CRITICAL / MRA
- Missing index on high-volume table → MEDIUM / OFI
- No partitioning plan for large tables → LOW / OFI

---

## 4. Finding Format

Each finding is emitted as a structured record compatible with `audit.review_findings`:

```
FINDING-{NNN}: [{SEVERITY}] [{MRA_CLASS}] [{DIMENSION}]
Description: <what is wrong>
Affected objects: <schema.table.column or metric_id>
Regulatory reference: <Basel III CRE XX.YY, OCC 2020-36, SR 11-7, FFIEC, etc.>
Required action: <specific remediation>
Rollback DDL: <if POST_EXECUTION and severity >= HIGH>
```

### Severity Levels
| Level | Definition | Gate Impact |
|-------|-----------|-------------|
| CRITICAL | Data corruption, regulatory violation, broken FK chain | BLOCKED |
| HIGH | Incorrect calculation, missing required field, type mismatch | BLOCKED |
| MEDIUM | Degraded quality, missing COALESCE, suboptimal pattern | APPROVED_WITH_CONDITIONS |
| LOW | Style deviation, missing optimization | APPROVED (noted) |
| INFORMATIONAL | Observation, recommendation for future | APPROVED (noted) |

### MRA Classification (OCC Examination Standards)
| Class | Definition | Response Required |
|-------|-----------|-------------------|
| MRA (Matter Requiring Attention) | Significant deficiency requiring corrective action | Mandatory remediation within defined timeline |
| MRIA (Matter Requiring Immediate Attention) | Critical deficiency posing imminent risk | Immediate remediation before proceeding |
| OFI (Opportunity for Improvement) | Enhancement recommendation | Advisory, no mandatory timeline |
| N/A | Not applicable to regulatory examination | Informational only |

---

## 5. Regulatory Coverage Score

Scored 0-100 across applicable frameworks. Each framework checked gets a pass/fail on its relevant requirements.

```
Regulatory Coverage Score: [NN]/100

Frameworks assessed:
  Basel III (CRE 20-36):     [PASS/FAIL] — [detail]
  FR Y-14Q:                  [PASS/FAIL] — [detail]
  FFIEC (DPD buckets):       [PASS/FAIL] — [detail]
  OCC 2020-36:               [PASS/FAIL] — [detail]
  BCBS 239:                  [PASS/FAIL] — [detail]
  SR 11-7:                   [PASS/FAIL] — [detail]
  CECL/ASC 326:              [PASS/FAIL/N/A] — [detail]
```

Score = (frameworks_passed / frameworks_assessed) x 100

---

## 6. Gate Decision (PRE_EXECUTION mode)

After assessing all applicable dimensions, emit a gate decision:

### APPROVED
- Zero CRITICAL or HIGH findings
- Regulatory coverage score >= 80
- Proceed to execution

### APPROVED_WITH_CONDITIONS
- Zero CRITICAL findings, one or more HIGH findings with viable workarounds
- OR: regulatory coverage 60-79
- List conditions that must be met during/after execution
- Builder may proceed but must address conditions

### BLOCKED
- One or more CRITICAL findings, OR
- Three or more HIGH findings without workarounds, OR
- Regulatory coverage < 60
- Builder MUST NOT proceed
- List all blocking findings with required remediation
- If schema change: provide corrected DDL
- If metric: provide corrected formula/YAML snippet

---

## 7. Implementation Delta Report (POST_EXECUTION mode)

After changes are applied, compare actual vs expected state:

### 7A. Schema Delta
```
Compare: proposed DDL → actual information_schema.columns
- Fields added as proposed: [list]
- Fields with type drift: [list with expected vs actual]
- Fields missing (proposed but not applied): [list]
- Extra fields (applied but not proposed): [list]
```

### 7B. Data Delta
```
Compare: expected data quality → actual query results
- Row counts: expected [N] vs actual [M]
- NULL rates: expected <5% vs actual [X%] for [field]
- Value ranges: expected [min-max] vs actual [min-max]
- FK integrity: [N] orphaned rows found
```

### 7C. Metric Delta (if metric review)
```
Compare: decomposition spec → actual YAML + calc results
- Formula match: [YES/NO]
- Rollup strategy match: [YES/NO]
- Source fields match: [YES/NO — list discrepancies]
- Demo data produces non-null results: [YES/NO]
- Result ranges GSIB-realistic: [YES/NO]
```

### 7D. Regression Detection
If POST_EXECUTION finds a CRITICAL or HIGH issue not caught in PRE_EXECUTION:
1. Auto-generate rollback DDL recommendation
2. Log finding with `status = BLOCKING`
3. Flag for human review with specific rollback instructions
4. Do NOT auto-execute rollback — human must approve

---

## 8. Audit Logging

### 8a. Session initialization
```
Initialize AuditLogger:
  agent_name = "risk-expert-reviewer"
  session_id = <from orchestrator or generate>
  trigger_source = "user" | "orchestrator" | "sub_agent"
```

### 8b. Log each dimension assessment
```
For each applicable dimension:
  write_reasoning_step(N, "Assessing [dimension name]", "[PASS/PARTIAL/FAIL] — [rationale]", confidence)
```

### 8c. Log each finding
```
For each finding:
  write_finding(
    finding_ref = "FINDING-NNN",
    finding_type = "pre_execution" | "post_execution",
    severity = "CRITICAL|HIGH|MEDIUM|LOW|INFORMATIONAL",
    domain = "<dimension name>",
    issue_description = "<description>",
    mra_classification = "MRA|MRIA|OFI|N/A",
    required_action = "<remediation>",
    regulatory_reference = "<reg ref>",
    affected_objects = [{"type": "table|field|metric", "name": "...", "schema": "..."}]
  )
```

### 8d. Log gate decision
```
write_action("GATE_DECISION", "APPROVED|APPROVED_WITH_CONDITIONS|BLOCKED — [summary]")
```

### 8e. Finalize
```
finalize_session(
  status = "completed",
  output_payload = {
    "mode": "pre_execution|post_execution",
    "gate_decision": "APPROVED|APPROVED_WITH_CONDITIONS|BLOCKED",
    "dimension_results": {"dim_1": "PASS|PARTIAL|FAIL", ...},
    "findings_count": {"CRITICAL": N, "HIGH": N, "MEDIUM": N, "LOW": N, "INFO": N},
    "regulatory_coverage_score": NN,
    "rollback_recommended": true|false
  }
)
```

---

## 9. Review Summary Output

Present to user (or return to orchestrator):

```
## Risk Expert Review: [Target Description]
**Mode:** PRE_EXECUTION / POST_EXECUTION
**Gate Decision:** APPROVED / APPROVED_WITH_CONDITIONS / BLOCKED

### Dimension Results
| # | Dimension | Result | Applicable | Key Finding |
|---|-----------|--------|------------|-------------|
| 1 | Structural Integrity | PASS | Yes | — |
| 2 | Data Type Conformance | PARTIAL | Yes | 1 MEDIUM |
| ... |
| 10 | Scalability & Performance | N/A | No | Reference table, <1K rows |

**Regulatory Coverage:** [NN]/100

### Findings Summary
| Ref | Severity | MRA | Dimension | Description | Action |
|-----|----------|-----|-----------|-------------|--------|
| FINDING-001 | CRITICAL | MRA | Referential Integrity | FK chain broken | Fix parent INSERT |
| ... |

### Blocking Issues ([N])
[Detailed description of each blocking finding with remediation steps]

### Conditions ([N])
[List of conditions for APPROVED_WITH_CONDITIONS]

### Gate Decision Rationale
[2-3 sentences explaining the decision]
```

---

## 10. Integration Points

### Upstream (who invokes this reviewer)
- **DB Schema Builder** (S3) — sends proposed DDL for PRE_EXECUTION review
- **Decomp Expert** (S1) — sends decomposition for regulatory accuracy check
- **Data Factory** (scenarios/factory/) — sends generated data for quality review
- **Master Orchestrator** (S8) — coordinates review in multi-agent workflows
- **User** — directly invokes for ad-hoc review of any artifact

### Downstream (who consumes reviewer output)
- **DB Schema Builder** — receives APPROVED/BLOCKED gate decision; if BLOCKED, receives corrective DDL
- **Orchestrator** — receives structured gate decision + finding count for workflow routing
- **Audit trail** — all findings persisted to `audit.review_findings` for regulatory reporting

### Builder-Reviewer Protocol
1. Builder proposes change → writes to audit session
2. Builder invokes reviewer with session file path
3. Reviewer assesses → emits gate decision
4. If APPROVED: builder proceeds to apply
5. If BLOCKED: builder reads findings, remediates, re-submits
6. If APPROVED_WITH_CONDITIONS: builder proceeds but must address conditions post-execution
7. After execution: builder invokes reviewer in POST_EXECUTION mode for QA

---

## 11. Error Handling

### Missing audit session file
```
ERROR: No audit session file found for review target.
Provide the session file path or the raw artifact to review.
Accepted formats: DDL <path>, metric <ID>, session <UUID>, yaml <path>, factory <path>
```

### Schema manifest unavailable
```
WARNING: Schema manifest not available. Falling back to data dictionary greps.
Dimension scores may be less precise. Run: npx tsx .claude/config/generate-schema-manifest.ts
```

### validate:l1 execution failure
```
FINDING-AUTO: [MEDIUM] [MRIA] [Regulatory Compliance]
Description: validate:l1 could not execute — L1 regulatory checks skipped.
Reason: [error message / exit code / timeout]
Required action: Fix validate:l1 execution environment, then re-run review.
```
Do NOT silently skip Dimension 6 if validate:l1 fails. Always log a finding.

### Incomplete decomposition
```
WARNING: Decomposition missing sections [list]. Scoring only available dimensions.
Regulatory coverage score will be penalized for missing sections.
```
