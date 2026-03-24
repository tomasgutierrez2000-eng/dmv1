Build the Risk Expert Reviewer and SR 11-7 Documentation Checker agents — Session S4 of the GSIB Agent Suite.

## Prerequisites Check (MANDATORY — halt if any fail)

1. `.claude/commands/experts/decomp-credit-risk.md` — MUST exist (from S1). Reviewer needs to understand what it's reviewing.
2. `.claude/config/bank-profile.yaml` — must exist (from S0)
3. `.claude/config/schema-manifest.yaml` — must exist (from S0)
4. `.claude/audit/audit_logger.py` — must exist (from S0)
5. `.claude/audit/schema/audit_ddl.sql` — must exist (from S0)

Note: S4 does NOT require S3 (Schema Builder). It can start as soon as S1 is done.

## Your First Actions

1. Read CLAUDE.md completely.
2. Read any existing `review-data-model.md` or validation scripts — absorb the 10-dimension review framework.
3. Read `.claude/commands/experts/data-model-expert.md` if it exists — understand what the reviewer evaluates.
4. Read `.claude/commands/builders/db-schema-builder.md` if it exists — understand the builder's test battery so the reviewer doesn't duplicate syntax tests.
5. Read `.claude/audit/schema/audit_ddl.sql` — understand the review_findings table structure.
6. Read `.claude/audit/audit_logger.py`

## Clarifying Questions

Q1. Do all 10 dimensions apply to EVERY review, or context-dependent? (e.g., "Temporal Data Patterns" may not apply to reference tables)
Q2. Use exact OCC MRA/MRIA/OFI framework, or simplified internal equivalent?
Q3. POST_EXECUTION mode: when a HIGH/CRITICAL issue is found that wasn't caught pre-execution — auto-generate rollback recommendation, flag for human review, or both?
Q4. Produce a regulatory coverage score per review?
Q5. Post-execution QA report detail level — summary or full field-by-field comparison?

## After Answers, Build TWO Files

### File 1: `.claude/commands/reviewers/risk-expert-reviewer.md`

Dual-mode agent (PRE_EXECUTION gate + POST_EXECUTION QA). Must include: 10-dimension assessment framework, finding format with severity/MRA classification, regulatory coverage scoring, gate decision (APPROVED/BLOCKED/APPROVED WITH CONDITIONS), implementation delta comparison (POST mode), audit logging to review_findings table.

### File 2: `.claude/commands/reviewers/sr-11-7-checker.md`

Documentation completeness checker per SR 11-7 / OCC 2011-12. Validates that required artifacts EXIST and are populated — does NOT validate substantive correctness. Checklist: formula documentation, assumption statements, limitation disclosures, backtesting methodology, model inventory entries.

Show me each file before writing to disk.
