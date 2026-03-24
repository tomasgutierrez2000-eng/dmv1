SR 11-7 / OCC 2011-12 documentation completeness checker — validates that required model risk management artifacts EXIST and are populated for each metric or model.

Metric or model to check: $ARGUMENTS

---

## 1. Purpose

This checker validates **documentation completeness**, NOT substantive correctness. It answers: "Are all required SR 11-7 artifacts present and non-empty?" It does NOT evaluate whether formulas are mathematically correct or assumptions are reasonable — that is the Risk Expert Reviewer's job.

**Regulatory basis:**
- **SR 11-7** (Fed, April 2011): Guidance on Model Risk Management
- **OCC 2011-12** (OCC, April 2011): Supervisory Guidance on Model Risk Management
- **Key principle:** "Effective challenge depends on complete documentation of model purpose, design, limitations, and testing."

---

## 2. Invocation Modes

### Mode A: Single Metric
Check documentation for one metric by ID or name.
```
/reviewers:sr-11-7-checker EXP-001
/reviewers:sr-11-7-checker "Expected Loss Rate"
```

### Mode B: Domain Sweep
Check all metrics in a domain.
```
/reviewers:sr-11-7-checker --domain exposure
/reviewers:sr-11-7-checker --domain capital
```

### Mode C: Full Portfolio
Check all active metrics.
```
/reviewers:sr-11-7-checker --all
```

### Mode D: Orchestrator-invoked
Receives structured payload:
```json
{
  "mode": "orchestrator",
  "target_type": "metric" | "domain" | "all",
  "target_id": "EXP-001" | "exposure" | null,
  "session_id": "uuid"
}
```

---

## 3. Context Loading

### Step 3a: Read bank profile
```
Read .claude/config/bank-profile.yaml
```
Extract `institution_tier` — GSIB requires ALL 12 checklist items; Large Regional requires 10; Regional requires 8.

### Step 3b: Locate metric artifacts
For each metric under review, locate:
1. **YAML config**: `scripts/calc_engine/metrics/{domain}/{METRIC_ID}.yaml`
2. **Catalogue entry**: grep `data/metric-library/catalogue.json` for the `item_id`
3. **Decomposition audit**: grep `.claude/audit/sessions/` for decomposition sessions referencing the metric
4. **Review findings**: grep `.claude/audit/sessions/` for reviewer sessions referencing the metric

---

## 4. SR 11-7 Documentation Checklist (12 Items)

Each item is scored: PRESENT (artifact exists and is non-empty), PARTIAL (artifact exists but incomplete), MISSING (artifact not found).

### Item 1: Model Purpose & Scope
**What to check:** Does the metric have a documented business purpose?
**Where to find it:**
- YAML: `identification.description` field (non-empty, >20 chars)
- Catalogue: `description` field
- Decomposition audit: `metric_definition.description` and `metric_definition.formula_prose`

**PRESENT if:** At least one source has a meaningful description (>20 chars, not placeholder text).
**PARTIAL if:** Description exists but is <20 chars or appears to be placeholder.
**MISSING if:** No description found in any source.

### Item 2: Formula Documentation
**What to check:** Is the mathematical formula documented in human-readable form?
**Where to find it:**
- YAML: `identification.generic_formula` AND/OR level-specific `formula_sql`
- Catalogue: `level_definitions[].level_logic`
- Decomposition: `metric_definition.generic_formula`, `metric_definition.symbolic_formula`

**PRESENT if:** Both human-readable formula AND SQL formula exist.
**PARTIAL if:** Only SQL exists (no human-readable), or only human-readable (no SQL).
**MISSING if:** Neither exists.

### Item 3: Source Data Identification
**What to check:** Are all input data sources explicitly identified?
**Where to find it:**
- YAML: `source_tables[]` with schema, table, fields, join conditions
- Catalogue: `ingredient_fields[]`
- Decomposition: `ingredients[]` block

**PRESENT if:** source_tables has at least one entry with table + fields populated.
**PARTIAL if:** Tables listed but fields not specified.
**MISSING if:** No source data documentation.

### Item 4: Assumption Statements
**What to check:** Are model assumptions explicitly stated?
**Where to find it:**
- YAML: `metadata.assumptions` field
- Decomposition: `gsib_considerations` block
- Catalogue: `assumptions` field (if exists)

**PRESENT if:** At least one assumption is documented (e.g., "Assumes facility-level PD is through-the-cycle", "Assumes constant LGD under stress").
**PARTIAL if:** Generic statement exists but no metric-specific assumptions.
**MISSING if:** No assumption documentation found.

**Note:** The current YAML schema does not include a `metadata.assumptions` field. MISSING findings here are expected and drive YAML schema extension. This is intentional gap-finding.

**Required for GSIB tier.** Regional banks may have this as PARTIAL without penalty.

### Item 5: Limitation Disclosures
**What to check:** Are known limitations documented?
**Where to find it:**
- YAML: `metadata.limitations` or `metadata.known_issues` field
- Decomposition: `confidence.uncertainty_areas[]`
- Catalogue: any limitations text

**PRESENT if:** At least one limitation is documented (e.g., "Does not capture wrong-way risk", "Assumes independence between PD and LGD").
**PARTIAL if:** Confidence is marked LOW/MEDIUM but no specific limitations listed.
**MISSING if:** No limitation documentation.

**Note:** Same as Item 4 — current YAML schema lacks this field. MISSING findings are expected.

**Required for GSIB tier.**

### Item 6: Validation / Backtesting Methodology
**What to check:** Is there a documented approach to validating the metric?
**Where to find it:**
- YAML: `validation_rules[]` (NON_NULL, THRESHOLD, RECONCILIATION, PERIOD_OVER_PERIOD)
- Decomposition: referenced in regulatory mapping
- Any backtesting results in audit sessions

**PRESENT if:** At least 2 validation rules exist (NON_NULL + one substantive rule).
**PARTIAL if:** Only NON_NULL exists.
**MISSING if:** No validation rules.

### Item 7: Rollup / Aggregation Logic
**What to check:** Is the rollup strategy documented for all hierarchy levels?
**Where to find it:**
- YAML: `levels` section with formula_sql for each of the 5 levels
- Catalogue: `level_definitions[]`
- Decomposition: `rollup_architecture` block

**PRESENT if:** All 5 levels (facility, counterparty, desk, portfolio, segment) have documented formulas.
**PARTIAL if:** Some levels missing (e.g., only facility + counterparty).
**MISSING if:** No rollup documentation.

### Item 8: Regulatory Mapping
**What to check:** Is the metric mapped to applicable regulatory frameworks?
**Where to find it:**
- YAML: `regulatory_references[]`
- Decomposition: `regulatory_mapping[]`
- Catalogue: `regulatory_refs`

**PRESENT if:** At least one regulatory reference with specific section cited.
**PARTIAL if:** Framework named but no specific section (e.g., "Basel III" without CRE XX.YY).
**MISSING if:** No regulatory mapping.

### Item 9: Data Quality Classification
**What to check:** Are ingredients classified by data quality tier?
**Where to find it:**
- Decomposition: `ingredients[].data_quality_tier` (GOLD/SILVER/BRONZE)
- YAML: field-level `data_quality` annotations
- Audit lineage records

**PRESENT if:** Each ingredient has a quality tier assigned.
**PARTIAL if:** Some ingredients have tiers, others don't.
**MISSING if:** No quality classification.

**Required for GSIB tier (BCBS 239 compliance).**

### Item 10: Change History / Version Control
**What to check:** Is the metric's change history tracked?
**Where to find it:**
- YAML: `metadata.created_date`, `metadata.last_modified_date`, `metadata.version`
- Audit sessions: decomposition records with `supersedes_decomp_id`
- Git history of the YAML file

**PRESENT if:** Version info and at least one date populated.
**PARTIAL if:** Dates exist but no version number.
**MISSING if:** No metadata.

### Item 11: Ownership & Accountability
**What to check:** Is a model owner / metric steward identified?
**Where to find it:**
- YAML: `metadata.owner`, `metadata.steward`, or `metadata.approved_by`
- Catalogue: `owner` field

**PRESENT if:** At least one named owner/steward.
**PARTIAL if:** Team-level ownership only (e.g., "Credit Risk Team" without individual).
**MISSING if:** No ownership documented.

**Note:** Current YAML schema lacks this field. MISSING findings are expected and drive schema extension.

### Item 12: Materiality Assessment
**What to check:** Is the metric's materiality / impact classified?
**Where to find it:**
- YAML: `classification.metric_class`, `classification.direction`
- Decomposition: `consumers[]` block (who uses it, how critical)
- Catalogue: `importance` or `materiality` field

**PRESENT if:** Both metric_class and at least one consumer documented.
**PARTIAL if:** Only classification exists, no consumer documentation.
**MISSING if:** Neither exists.

---

## 5. Tier-Adjusted Requirements

| Item | GSIB | Large Regional | Regional |
|------|------|----------------|----------|
| 1. Purpose & Scope | REQUIRED | REQUIRED | REQUIRED |
| 2. Formula Documentation | REQUIRED | REQUIRED | REQUIRED |
| 3. Source Data ID | REQUIRED | REQUIRED | REQUIRED |
| 4. Assumptions | REQUIRED | REQUIRED | OPTIONAL |
| 5. Limitations | REQUIRED | REQUIRED | OPTIONAL |
| 6. Validation Rules | REQUIRED | REQUIRED | REQUIRED |
| 7. Rollup Logic | REQUIRED | REQUIRED | REQUIRED |
| 8. Regulatory Mapping | REQUIRED | REQUIRED | OPTIONAL |
| 9. Data Quality Tiers | REQUIRED | OPTIONAL | OPTIONAL |
| 10. Change History | REQUIRED | REQUIRED | REQUIRED |
| 11. Ownership | REQUIRED | REQUIRED | OPTIONAL |
| 12. Materiality | REQUIRED | OPTIONAL | OPTIONAL |

**Compliance threshold by tier:**
- GSIB: All 12 REQUIRED items must be PRESENT or PARTIAL. No MISSING on required items.
- Large Regional: 10 REQUIRED items must be PRESENT or PARTIAL.
- Regional: 8 REQUIRED items must be PRESENT or PARTIAL.

---

## 6. Output Format

### Per-Metric Report

```
## SR 11-7 Documentation Check: [Metric ID] — [Name]
**Tier:** GSIB | **Required items:** 12 | **Status:** COMPLIANT / NON-COMPLIANT

### Checklist
| # | Item | Status | Source | Detail |
|---|------|--------|--------|--------|
| 1 | Purpose & Scope | PRESENT | YAML + Catalogue | "Measures facility-level..." |
| 2 | Formula Documentation | PRESENT | YAML (5 levels) | generic_formula + formula_sql |
| 3 | Source Data ID | PRESENT | YAML (3 tables) | source_tables populated |
| 4 | Assumptions | MISSING | — | No assumptions documented |
| 5 | Limitations | PARTIAL | Decomposition | uncertainty_areas listed, no formal limitations |
| ... |

### Score
- PRESENT: [N]/12
- PARTIAL: [N]/12
- MISSING: [N]/12
- Required items satisfied: [N]/[required_count]
- **Compliance status:** COMPLIANT / NON-COMPLIANT

### Required Remediation (NON-COMPLIANT items)
1. **Item 4 (Assumptions):** Add `metadata.assumptions` to YAML with at least one metric-specific assumption.
2. **Item 5 (Limitations):** Upgrade from PARTIAL by adding explicit limitations to YAML `metadata.limitations`.
```

### Domain Summary (Mode B)

```
## SR 11-7 Domain Summary: [Domain Name]
**Metrics assessed:** [N] | **Compliant:** [N] | **Non-compliant:** [N]

| Metric ID | Name | Score | Status | Missing Items |
|-----------|------|-------|--------|---------------|
| EXP-001 | Gross Exposure | 11/12 | COMPLIANT | — |
| EXP-002 | Net Exposure | 9/12 | NON-COMPLIANT | Assumptions, Limitations |
| ... |

### Most Common Gaps
1. Assumptions (missing in [N] metrics)
2. Limitations (missing in [N] metrics)
3. Data Quality Tiers (missing in [N] metrics)
```

### Portfolio Summary (Mode C)

```
## SR 11-7 Portfolio Summary
**Total metrics:** [N] | **Compliant:** [N] ([%]) | **Non-compliant:** [N] ([%])

### By Domain
| Domain | Metrics | Compliant | Rate |
|--------|---------|-----------|------|
| Exposure | 16 | 14 | 87.5% |
| Pricing | 8 | 6 | 75.0% |
| ... |

### Top Remediation Priorities
1. [N] metrics missing Assumptions documentation
2. [N] metrics missing Limitation disclosures
3. [N] metrics missing Data Quality classification

### Regulatory Readiness
- GSIB exam readiness: [%] of metrics fully documented
- Estimated remediation effort: [N] items across [N] metrics
```

---

## 7. Audit Logging

```
Initialize AuditLogger:
  agent_name = "sr-11-7-checker"
  session_id = <from context or generate>

For each metric checked:
  write_reasoning_step(N, "Checking [metric_id] item [N]: [item_name]", "[PRESENT/PARTIAL/MISSING]", "HIGH")

For each NON-COMPLIANT finding:
  write_finding(
    finding_ref = "SR117-{METRIC_ID}-{ITEM_NUM}",
    finding_type = "pre_execution",
    severity = "MEDIUM",  # documentation gaps are MEDIUM unless GSIB exam imminent
    domain = "SR 11-7 Documentation",
    issue_description = "Missing [item_name] for [metric_id]",
    mra_classification = "OFI",  # documentation gaps are OFI unless exam-driven
    required_action = "Add [item_name] to YAML metadata or catalogue entry"
  )

Finalize:
  finalize_session("completed", {
    "metrics_checked": N,
    "compliant": N,
    "non_compliant": N,
    "missing_items_total": N,
    "top_gaps": [...]
  })
```

---

## 8. Integration Points

### Upstream
- **Risk Expert Reviewer** — after reviewing metric correctness, triggers SR 11-7 check for documentation
- **Master Orchestrator** — includes SR 11-7 check in end-to-end metric deployment pipeline
- **User** — directly invokes for audit preparation

### Downstream
- **YAML Config Writer** (S5) — receives gap list to add missing metadata fields
- **Audit trail** — findings logged for regulatory reporting
- **Dashboard** — compliance percentages feed into model risk dashboard

### Remediation Workflow
1. SR 11-7 checker identifies MISSING items
2. For YAML-fixable gaps (assumptions, limitations, ownership): generates patch instructions
3. For decomposition-dependent gaps (data quality tiers, consumers): triggers re-run of Decomp Expert
4. After remediation: re-run checker to verify compliance

---

## 9. Error Handling

### Metric not found
```
ERROR: Metric [ID] not found in catalogue or YAML configs.
Check: data/metric-library/catalogue.json, scripts/calc_engine/metrics/**/*.yaml
```

### No YAML for catalogue metric
```
WARNING: Metric [ID] exists in catalogue but has no YAML config.
Documentation check limited to catalogue fields only.
Items requiring YAML (validation rules, source tables detail) will be scored MISSING.
```

### Audit database unavailable
```
WARNING: Cannot write to postgres_audit. Findings logged to local JSON only.
Path: .claude/audit/sessions/
```
