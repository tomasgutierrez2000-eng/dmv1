Build the Credit Risk Decomposition Expert agent — Session S1 of the GSIB Agent Suite.

## Prerequisites Check (MANDATORY — halt if any fail)

Before writing ANY code, verify these exist:
1. `.claude/config/bank-profile.yaml` — read it, confirm institution_tier and active_risk_stripes
2. `.claude/config/schema-manifest.yaml` — read the summary section, confirm table counts
3. `.claude/audit/audit_logger.py` — read it, confirm AuditLogger class exists with write_reasoning_step, write_action, finalize_session
4. `.claude/audit/schema/audit_ddl.sql` — confirm it exists

If ANY prerequisite is missing, tell the user: "S1 requires S0 Foundation to be complete. Missing: [list]. Run S0 first."

## Design Doc (read for context)

Read the design doc referenced in CLAUDE.md under "Agent Suite Architecture" for the full 3-tier architecture context. This session builds agent 1a from Layer 1 (Experts).

## Your First Actions

1. Read CLAUDE.md completely.
2. Read `.claude/config/bank-profile.yaml`
3. Read `.claude/config/schema-manifest.yaml` (summary section only — 16K lines, don't read all columns)
4. Read all DDL files relevant to credit risk tables (grep for exposure, facility, counterparty, collateral, credit in schema-manifest)
5. Read `.claude/audit/audit_logger.py`
6. Read `.claude/commands/add-metric.md` — understand the existing metric workflow this expert feeds into
7. Read any existing YAML metric configs: `scripts/calc_engine/metrics/exposure/EXP-001.yaml` as a reference

## Clarifying Questions (ask ALL before building)

Q1. When the Decomp Expert recommends schema changes, should it produce a structured JSON payload for the Data Model Expert, or a human-readable recommendation that the user reviews first?

Q2. For the credit risk knowledge base — should the expert cover ALL credit risk metrics (PD, LGD, EAD, EL, DSCR, LTV, RWA, NPL, coverage ratio, charge-off rate, criticized asset ratio, CECL allowance, concentration metrics, migration matrices) or start with a focused subset?

Q3. Should the expert's output format include a YAML metric config draft (extending the existing EXP-001.yaml pattern), or just the decomposition that feeds into the YAML Config Writer later?

Q4. The expert needs to know about the existing 100+ metrics in the catalogue to avoid duplicates. Should it read `data/metric-library/catalogue.json` on every invocation, or rely on the schema-manifest for a lighter check?

## After Answers, Build

Create `.claude/commands/experts/decomp-credit-risk.md` — this is the REFERENCE IMPLEMENTATION that all 7 other stripe experts will follow.

### Required Sections in the Agent File

1. **Invocation modes**: Direct (user describes a need) and Orchestrator-invoked (receives structured payload)
2. **Context loading**: bank-profile.yaml, schema-manifest.yaml (summary), relevant DDL
3. **Intake questions** (direct mode only): risk stripe confirmation, metric name, capability being built, dimensions needed, source systems
4. **Credit risk knowledge base**: All standard credit risk metrics with Basel III/IV formulas, FR Y-14 mappings, BCBS 239 refs
5. **Decomposition output format** (exact format — all other experts must match this):
   - Metric definition, formula (symbolic + prose), variants
   - Ingredients with source table/field, data type, transformation, data quality tier
   - Schema gaps (MISSING ingredients)
   - Rollup architecture (5 levels with aggregation methods)
   - Consumers (function, team, use case, frequency)
   - Regulatory mapping (standard, article, requirement)
   - GSIB considerations
   - Confidence level with reasoning
6. **Confirmation gate**: Wait for explicit user YES before triggering downstream agents
7. **Audit logging**: Call AuditLogger for reasoning chain, actions, and final output

### Credit Risk Domain Knowledge to Embed

The expert must have deep knowledge of:
- Basel III/IV credit risk formulas (IRB: PD×LGD×EAD×M, SA: exposure×RW)
- CECL/IFRS 9 provisioning frameworks (lifetime PD × LGD × EAD, discounted)
- FR Y-14 Schedule H (wholesale), M (CRE), Q (retail — for cross-reference)
- SR 11-7 model risk management requirements
- Shared National Credit (SNC) reporting
- OCC 2020-36 (credit administration)
- DSCR, LTV, coverage ratio calculation methods and GSIB-specific variants
- Rollup hierarchy: facility → counterparty → desk → portfolio → segment
- FX conversion patterns (aggregate levels only, per CLAUDE.md)
- EBT hierarchy joins (per CLAUDE.md patterns)

Show me the full file before writing to disk.
