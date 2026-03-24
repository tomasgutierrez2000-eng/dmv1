Build the Schema Drift Monitor and Audit Report Generator agents — Session S7 of the GSIB Agent Suite.

## Prerequisites Check (MANDATORY — halt if any fail)

1. `.claude/commands/builders/db-schema-builder.md` — MUST exist (from S3). Drift Monitor checks against schema changes made by the builder. **If missing: "S7 requires S3. Run /session-s3 first."**
2. `.claude/config/schema-manifest.yaml` — must exist (from S0)
3. `.claude/audit/schema/audit_ddl.sql` — must exist (from S0). Audit Reporter reads from these tables.
4. `.claude/audit/audit_logger.py` — must exist (from S0)

Note: S7 can run in parallel with S6.

## Your First Actions

1. Read CLAUDE.md — especially the Database Recon Indicators and db-status sections.
2. Read `.claude/config/schema-manifest.yaml` (summary) — understand the manifest format.
3. Read `.claude/audit/schema/audit_ddl.sql` — understand all 5 audit tables and 3 views.
4. Read `lib/db-status.ts` if it exists — existing drift detection logic to absorb/wrap.
5. Read `.claude/audit/audit_logger.py`

## Clarifying Questions

Q1. Drift Monitor: compare manifest vs. live DB, or also compare DDL files vs. live DB?
Q2. Should Drift Monitor run on-demand only, or also support scheduled mode (e.g., CI cron)?
Q3. Audit Reporter output format — markdown report, JSON, or both?
Q4. Audit Reporter scope — activity summary only, or also include finding resolution status and regulatory coverage trends?

## After Answers, Build TWO Files

### File 1: `.claude/commands/reviewers/drift-monitor.md`

Compares schema-manifest.yaml against live PostgreSQL (via information_schema). Detects: columns added outside agent pipeline, type changes, missing indexes, orphaned tables. Output: drift report with severity and remediation suggestions. Audit logging.

### File 2: `.claude/commands/reviewers/audit-reporter.md`

Consumes all 5 audit tables. Generates: agent activity summary, schema change history, finding resolution status, regulatory coverage trends. Uses the 3 views (v_open_findings, v_latest_decompositions, v_pending_schema_changes) for efficient querying. Audit logging.

Show me each file before writing to disk.
