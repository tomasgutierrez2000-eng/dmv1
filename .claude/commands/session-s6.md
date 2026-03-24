Build the Dashboard Generator agent — Session S6 of the GSIB Agent Suite.

## Prerequisites Check (MANDATORY — halt if any fail)

1. `.claude/commands/experts/decomp-credit-risk.md` — MUST exist (from S1). Dashboard is generated from decomposition output.
2. `.claude/commands/builders/db-schema-builder.md` — MUST exist (from S3). Dashboard needs schema context.
3. `.claude/config/bank-profile.yaml` — must exist (from S0)
4. `.claude/audit/audit_logger.py` — must exist (from S0)

Note: S6 can run in parallel with S7.

## Your First Actions

1. Read CLAUDE.md completely.
2. Read existing dashboard/visualization components in `components/` — understand the Recharts patterns, Tailwind styling, and existing metric visualization approaches.
3. Read `DESIGN.md` if it exists — all visual decisions must follow the design system.
4. Read decomp expert output format from `decomp-credit-risk.md` — understand the ingredients, rollup dimensions, and formula that drive the dashboard layout.
5. Read `.claude/audit/audit_logger.py`

## Clarifying Questions

Q1. Generate full Next.js pages or just component specs (JSON layout definitions)?
Q2. Should the dashboard follow existing metric library visualization patterns, or can it introduce new patterns?
Q3. What dashboard elements per metric? Cards, rollup drill-down, trend chart, threshold indicators — all of these, or a subset?

## After Answers, Build ONE File

### `.claude/commands/builders/dashboard-generator.md`

This is a STRETCH GOAL agent. It should produce a dashboard component spec (JSON layout definition) at minimum, with optional full Next.js page generation. Must include: decomposition intake, layout planning (cards, charts, drill-down), component spec output, optional page generation following existing patterns, audit logging.

Show me the file before writing to disk.
