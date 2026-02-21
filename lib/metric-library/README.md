# Metric Library

Governed catalog for metric definitions and variants. Single source of truth for “what metrics exist.”

## Model (best practice)

- **One parent metric** = one business concept (e.g. DSCR, PD, LTV). One parent per concept.
- **Many metric variants** under each parent. Each variant is a specific implementation (e.g. “CRE DSCR (NOI)”, “C&I DSCR (EBITDA)”).
- **Rollup per variant**: Each variant defines how it aggregates across the hierarchy in `rollup_logic`:
  - **Facility** → **Counterparty** → **Desk** → **Portfolio** → **LoB** (Line of Business).

Use `ROLLUP_HIERARCHY_LEVELS` in `types.ts` as the canonical order for display and validation.

## Condign practices

- **Single parent per concept**: Do not create multiple parents for the same concept; create multiple variants under one parent.
- **Variant rollup**: Every variant that aggregates should define `rollup_logic` with at least one of: facility, counterparty, desk, portfolio, lob.
- **Executable link**: CALCULATED variants set `executable_metric_id` to the L3 metric id so the Metrics Engine can run them.
- **Versioning**: When editing an ACTIVE variant, create a new version and archive the previous (version_history).
