Integration Test and Final CLAUDE.md Update — Session S9 of the GSIB Agent Suite.

## Prerequisites Check

ALL prior sessions should be complete. Run the S8 prerequisite check to see which agents exist.

## What To Do

### Part 1: Integration Smoke Test (DRY_RUN)

Invoke `/orchestrate` with:
> "I need to add a Current Expected Credit Loss (CECL) allowance metric to the credit risk stripe — decompose it, identify schema gaps, and plan the build"

Run in DRY_RUN mode. Walk through the full pipeline:
- Show every agent handoff and payload
- Show every finding from the reviewer
- Flag any missing inputs, broken references, or gaps
- Do NOT execute any DDL

Present a gap analysis: what is missing, broken, or needs refinement.

### Part 2: Cross-Reference Validation

Check consistency across all agent files:
1. Every agent references audit_logger.py calls correctly
2. Handoff payload formats are consistent between sender and receiver
3. Reviewer is invoked in correct mode (PRE vs POST) by the builder
4. schema-manifest.yaml update logic is only in one place (the builder)
5. bank-profile.yaml fields referenced consistently across all agents
6. All output file paths are consistent

Report any inconsistencies.

### Part 3: Final CLAUDE.md Update

Rewrite the "## Agent Suite Architecture" section with:
- Complete agent inventory (name, file path, one-line description)
- Session sequencing guide for future builds (how to add a new stripe expert)
- Audit trail guide (what gets logged where and when)
- How to invoke each agent directly (e.g., `/decomp-credit-risk EL`)
- How to invoke the orchestrator (e.g., `/orchestrate add CECL allowance`)
- Troubleshooting section (common failure modes)
- Reference to bank-profile.yaml and schema-manifest.yaml

Show the full updated CLAUDE.md section before writing.
