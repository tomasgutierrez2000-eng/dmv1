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

## Bulk import (Excel)

You can bulk add or update domains, parent metrics, and variants via Excel. Use the **Download template** button on the Metric Library page to get a workbook with the correct sheets and headers, or **Export library** to download the current catalog for editing and re-import.

### Template format

- **Sheet "Instructions"**: Short description of the process and valid values (no data rows).
- **Sheet "Domains"**: One row per domain.
- **Sheet "ParentMetrics"**: One row per parent metric.
- **Sheet "Variants"**: One row per variant; `parent_metric_id` must match a `metric_id` in the ParentMetrics sheet (or already in the library).

### Required columns

| Sheet         | Required columns |
|---------------|------------------|
| Domains       | `domain_id`, `domain_name` |
| ParentMetrics | `metric_id`, `metric_name`, `definition`, `generic_formula`, `metric_class`, `unit_type`, `direction`, `domain_ids` (comma-separated) |
| Variants      | `variant_id`, `variant_name`, `parent_metric_id`, `variant_type`, `status`, `version`, `effective_date`, `formula_display` |

### Optional columns (examples)

- **Domains**: `domain_description`, `icon`, `color`, `regulatory_relevance`, `primary_stakeholders`
- **ParentMetrics**: `risk_appetite_relevant`, `rollup_philosophy`, `rollup_description`, `regulatory_references`
- **Variants**: `formula_specification`, `detailed_description`, `rollup_facility`, `rollup_counterparty`, `rollup_desk`, `rollup_portfolio`, `rollup_lob`, `weighting_basis`, `executable_metric_id`, `owner_team`, `approver`, `review_cycle`, `source_system`, `source_field_name`, `refresh_frequency`, `used_by_dashboards`, `regulatory_references`

### Valid values

- `metric_class`: SOURCED, CALCULATED, HYBRID
- `unit_type`: RATIO, PERCENTAGE, CURRENCY, COUNT, RATE, ORDINAL, DAYS, INDEX
- `direction`: HIGHER_BETTER, LOWER_BETTER, NEUTRAL
- `variant_type`: SOURCED, CALCULATED
- `status`: ACTIVE, DRAFT, DEPRECATED, PROPOSED, INACTIVE
- `review_cycle`: ANNUAL, SEMI_ANNUAL, QUARTERLY, AD_HOC
- `weighting_basis`: BY_EAD, BY_OUTSTANDING, BY_COMMITTED

### Import behavior

- **Processing order**: Domains first, then Parent Metrics, then Variants. Variant rows whose `parent_metric_id` is not in the file and not already in the library are skipped and reported in the response errors.
- **Upsert**: Rows with an existing `domain_id`, `metric_id`, or `variant_id` update the existing record; otherwise a new record is created.
- After import, parent variant counts are refreshed automatically.
