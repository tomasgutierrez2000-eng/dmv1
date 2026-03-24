Build the Data Factory Builder and YAML Metric Config Writer agents — Session S5 of the GSIB Agent Suite.

## Prerequisites Check (MANDATORY — halt if any fail)

1. `.claude/commands/builders/db-schema-builder.md` — MUST exist (from S3). Data Factory is triggered by schema changes. **If missing: "S5 requires S3. Run /session-s3 first."**
2. `.claude/commands/experts/decomp-credit-risk.md` — MUST exist (from S1). YAML Config Writer reads decomposition output.
3. `.claude/commands/add-metric.md` — MUST exist (existing command). YAML Config Writer wraps this.
4. `.claude/config/bank-profile.yaml` — must exist (from S0)
5. `.claude/audit/audit_logger.py` — must exist (from S0)

## Your First Actions

1. Read CLAUDE.md completely — especially the data factory section and "Adding a New Metric" workflow.
2. Read ALL existing data generation scripts in `scenarios/factory/` — understand libraries, entities, volumes, value ranges.
3. Read `.claude/commands/add-metric.md` — the YAML Config Writer wraps this existing workflow.
4. Read existing YAML metric configs (e.g., `scripts/calc_engine/metrics/exposure/EXP-001.yaml`).
5. Read `.claude/audit/audit_logger.py`

## Clarifying Questions

Q1. Default synthetic data volume for new tables? (e.g., 100 counterparties, 500 facilities, 3 years daily?)
Q2. Realistic value ranges — derive from GSIB benchmarks or do you have reference ranges?
Q3. Generate data that makes metrics "work" (plausible outputs) or purely random within bounds?
Q4. On schema change: generate net-new data only, regenerate all, or offer the choice?
Q5. Respect referential integrity (FK chains) or populate independently?

## After Answers, Build TWO Files

### File 1: `.claude/commands/builders/data-factory-builder.md`

Wraps the existing `scenarios/factory/` V2 engine. Must include: change context intake, dependency analysis (FK ordering), data profile generation (per field: strategy, ranges, FK refs, volume), script generation (idempotent, UPSERT pattern), execution + validation (row counts, FK checks, distribution spot-checks), audit logging.

### File 2: `.claude/commands/builders/metric-config-writer.md`

Thin wrapper over `add-metric.md` that adds: structured JSON input from Decomp Expert, audit logging, `calc:sync` and `calc:demo` execution, structured JSON output for the Orchestrator. Does NOT duplicate the 10-phase workflow — calls it.

Show me each file before writing to disk.
