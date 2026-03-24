Build the DB Schema Builder and Migration Manager agents — Session S3 of the GSIB Agent Suite.

## Prerequisites Check (MANDATORY — halt if any fail)

1. `.claude/commands/experts/data-model-expert.md` — MUST exist (from S2). The Schema Builder receives input from this agent. **If missing: "S3 requires S2 (Data Model Expert). Run /session-s2 first."**
2. `.claude/commands/experts/decomp-credit-risk.md` — MUST exist (from S1). Needed to understand the decomposition output format.
3. `.claude/config/bank-profile.yaml` — must exist (from S0)
4. `.claude/config/schema-manifest.yaml` — must exist (from S0)
5. `.claude/audit/audit_logger.py` — must exist (from S0)
6. `.claude/audit/schema/audit_ddl.sql` — must exist (from S0)

## Your First Actions

1. Read CLAUDE.md completely — especially the DDL rules, GCP Cloud SQL rules, data type naming conventions, FK integrity rules.
2. Read `.claude/commands/experts/data-model-expert.md` — understand the JSON payload format this builder receives.
3. Read ALL existing DDL files and migration scripts. Note the naming convention in `sql/migrations/`.
4. Read `.claude/audit/schema/audit_ddl.sql` — the builder must log to these tables.
5. Read `.claude/audit/audit_logger.py`

## Clarifying Questions

Q1. Execute DDL directly, generate migration files for review, or both (generate + optionally execute)?
Q2. Migration file naming convention — continue `NNN-description.sql` or adopt `V{version}__{desc}.sql` (Flyway)?
Q3. What constitutes a passing DDL test? (syntax, FK refs, type compatibility, naming compliance, index coverage — anything else?)
Q4. Auto-update schema-manifest.yaml after DDL, or prompt?
Q5. Auto-rollback on mid-execution failure, or halt for manual resolution?
Q6. Auto-trigger Data Factory after schema change, or require confirmation?

## After Answers, Build TWO Files

### File 1: `.claude/commands/builders/db-schema-builder.md`

Must include: input validation, PRE_EXECUTION reviewer gate (mandatory, non-bypassable), 6-test DDL battery (syntax, duplicates, FK refs, data types, naming, indexes), migration script generation, transactional execution, schema-manifest update, POST_EXECUTION reviewer trigger, audit logging.

### File 2: `.claude/commands/builders/migration-manager.md`

Must include: migration tracking (applied vs. pending), rollback script generation, migration ordering validation, status reporting, integration with existing `sql/migrations/` directory. This also satisfies TODOS.md #3 (Full migration framework).

Show me each file before writing to disk.
