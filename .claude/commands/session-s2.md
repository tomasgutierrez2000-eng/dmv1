Build the Data Model Expert and Regulatory Mapping Expert agents — Session S2 of the GSIB Agent Suite.

## Prerequisites Check (MANDATORY — halt if any fail)

Before writing ANY code, verify these exist:
1. `.claude/config/bank-profile.yaml` — must exist (from S0)
2. `.claude/config/schema-manifest.yaml` — must exist (from S0)
3. `.claude/audit/audit_logger.py` — must exist (from S0)
4. `.claude/audit/schema/audit_ddl.sql` — must exist (from S0)

If ANY prerequisite is missing, tell the user: "S2 requires S0 Foundation. Missing: [list]. Run /session-s0 first."

Note: S2 does NOT require S1 (Decomp Expert). S1 and S2 can run in parallel.

## Design Doc

Read the design doc in CLAUDE.md "Agent Suite Architecture" section. This session builds agents #2 (Data Model Expert) and #3 (Regulatory Mapping Expert) from Layer 1.

## Your First Actions

1. Read CLAUDE.md completely — especially the DDL rules, naming conventions, and data type rules sections.
2. Read `.claude/config/bank-profile.yaml` and `.claude/config/schema-manifest.yaml` (summary)
3. Read ALL existing DDL files in the project — you must understand every table, constraint, and relationship
4. Read `.claude/audit/audit_logger.py`
5. If `.claude/commands/experts/decomp-credit-risk.md` exists (S1 done), read it to understand the decomposition output format the Data Model Expert will receive as input
6. Check the data dictionary at `facility-summary-mvp/output/data-dictionary/data-dictionary.json` — understand the field structure

## Clarifying Questions (ask ALL before building)

Q1. When the Data Model Expert recommends a new table, should it suggest a target schema name (e.g., l2.new_table) or leave schema placement to the user?

Q2. When the expert identifies that an existing table needs a new column, should it present a diff-style view or a full revised DDL block?

Q3. How should the expert handle conflicting requirements — e.g., a new metric needs a field that already exists but with a different data type? Flag and escalate, or propose a solution?

Q4. For the Regulatory Mapping Expert — which regulatory frameworks should it cover? US-only (FR Y-14, FR Y-9C, FFIEC 101, FR 2052a, FR 2590) or also BCBS/EU?

Q5. Should the Regulatory Mapping Expert produce a coverage score (e.g., "78% of FR Y-14 Schedule H fields covered") or just a gap list?

Q6. When the Data Model Expert finishes and is ready to hand off to the DB Schema Builder — should it require explicit user confirmation (Y/N), or is running the next command implicit confirmation?

## After Answers, Build TWO Files

### File 1: `.claude/commands/experts/data-model-expert.md`

Builds on schema-manifest.yaml to analyze gaps and propose DDL changes. Must include:
- Context loading (schema-manifest, bank-profile, relevant DDL)
- Intake questions (direct mode) for risk stripe, metric, dimensions, source systems
- Schema analysis: map existing fields → identify gaps → propose additions
- Naming convention enforcement (snake_case, type suffix rules from CLAUDE.md)
- Structured recommendation output (tables leveraged, proposed additions, dependencies, questions)
- Confirmation gate before downstream handoff
- Audit logging

### File 2: `.claude/commands/experts/reg-mapping-expert.md`

Maps the data model against regulatory reporting requirements. Must include:
- Full FR Y-14 field mapping (Schedules H, M, N, Q — field-level)
- FR Y-9C HC-R capital reporting mapping
- FFIEC 101 advanced approaches mapping
- FR 2052a liquidity reporting mapping
- BCBS 239 principle coverage assessment (14 principles)
- Coverage matrix output format (standard × field → covered/gap/partial)
- Gap prioritization by regulatory risk (mandatory vs. best practice)
- Audit logging

Show me each file before writing to disk.
