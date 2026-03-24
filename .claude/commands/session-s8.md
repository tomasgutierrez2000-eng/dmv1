Build the Master Orchestrator — Session S8 of the GSIB Agent Suite.

## Prerequisites Check (MANDATORY — halt if ALL prior sessions are incomplete)

Verify these agent files exist. List any that are missing — the Orchestrator can still be built but will note which pipeline steps are unavailable.

**Layer 1 (Experts):**
- [ ] `.claude/commands/experts/decomp-credit-risk.md` (S1)
- [ ] `.claude/commands/experts/decomp-market-risk.md` (S2.5)
- [ ] `.claude/commands/experts/decomp-ccr.md` (S2.5)
- [ ] `.claude/commands/experts/decomp-liquidity.md` (S2.5)
- [ ] `.claude/commands/experts/decomp-capital.md` (S2.5)
- [ ] `.claude/commands/experts/decomp-irrbb-alm.md` (S2.5)
- [ ] `.claude/commands/experts/decomp-oprisk.md` (S2.5)
- [ ] `.claude/commands/experts/decomp-compliance.md` (S2.5)
- [ ] `.claude/commands/experts/data-model-expert.md` (S2)
- [ ] `.claude/commands/experts/reg-mapping-expert.md` (S2)

**Layer 2 (Builders):**
- [ ] `.claude/commands/builders/db-schema-builder.md` (S3)
- [ ] `.claude/commands/builders/migration-manager.md` (S3)
- [ ] `.claude/commands/builders/data-factory-builder.md` (S5)
- [ ] `.claude/commands/builders/metric-config-writer.md` (S5)
- [ ] `.claude/commands/builders/dashboard-generator.md` (S6)

**Layer 3 (Reviewers):**
- [ ] `.claude/commands/reviewers/risk-expert-reviewer.md` (S4)
- [ ] `.claude/commands/reviewers/sr-11-7-checker.md` (S4)
- [ ] `.claude/commands/reviewers/drift-monitor.md` (S7)
- [ ] `.claude/commands/reviewers/audit-reporter.md` (S7)

**Required (non-negotiable):**
- [ ] `.claude/config/bank-profile.yaml` (S0)
- [ ] `.claude/audit/audit_logger.py` (S0)

Report: "Found X/20 agents. Missing: [list]. Orchestrator will mark missing agents as UNAVAILABLE in pipeline."

## Your First Actions

1. Read CLAUDE.md completely.
2. Read EVERY file in `.claude/commands/` — map the exact input/output contract for each agent.
3. Read `.claude/config/bank-profile.yaml` and `.claude/config/schema-manifest.yaml`.
4. Read `.claude/audit/schema/audit_ddl.sql` and `.claude/audit/audit_logger.py`.

## Clarifying Questions

Q1. User input detail level — high level ("add Expected Loss") or metric-specific ("decompose EL, find gaps, build")? Or both?
Q2. Parallel execution — interleaved output or run silently and present merged results?
Q3. Session state persistence — support resume if workflow is interrupted?
Q4. End-of-session summary format — status table, narrative, or both?
Q5. Support DRY_RUN mode — plan the full pipeline without executing builders?

## After Answers, Build ONE File

### `.claude/commands/orchestrate.md`

6 workflow modes: DECOMPOSE, BUILD, FULL, REVIEW, MONITOR, DRY_RUN.

Must include:
- Session initialization (UUID, audit trail start, config loading)
- Intent parsing → mode selection → pipeline planning
- User confirmation of plan before execution
- Sequential agent invocation with inline context passing (per eng review: no file-based handoff for inter-agent comms, only audit writes for durability)
- Failure handling (retry/skip/abort per agent)
- BLOCKING reviewer findings halt pipeline
- End-of-session summary (agent status table, schema changes, findings, regulatory coverage)
- Audit logging (full session to JSON + DB)

Show me the file before writing to disk.
