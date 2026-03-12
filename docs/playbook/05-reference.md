# 05 - Reference

Quick-reference card for templates, naming conventions, CLI commands, and key file locations.

---

## YAML Metric Template (Annotated)

Copy from `scripts/calc_engine/metrics/_template.yaml` to `scripts/calc_engine/metrics/{your-domain}/{METRIC_ID}.yaml`.

```yaml
# ── IDENTIFICATION (required) ─────────────────────────────
metric_id: "DOMAIN-NNN"          # Unique ID, e.g., MKT-001, LIQ-001
name: "Metric Name"              # Human-readable name
version: "1.0.0"                 # Semantic version
owner: "team-name"               # Owning team
status: DRAFT                    # ACTIVE | DRAFT | DEPRECATED | RETIRED
effective_date: "2026-01-01"     # When metric becomes effective
supersedes: null                 # Previous metric_id if replacing one

# ── CLASSIFICATION (required) ─────────────────────────────
domain: "your-domain"            # Must match domain_id in domains.json
sub_domain: "sub_category"       # Free-text sub-categorization
metric_class: CALCULATED         # SOURCED (direct read) | CALCULATED (derived) | HYBRID
direction: NEUTRAL               # HIGHER_BETTER | LOWER_BETTER | NEUTRAL
unit_type: CURRENCY              # CURRENCY | PERCENTAGE | RATIO | COUNT | RATE | BPS | DAYS | INDEX | ORDINAL
display_format: "$,.0f"          # d3-format string for UI rendering
description: >                   # Business definition (2-3 sentences)
  What this metric measures, why it matters, and any caveats.

# ── REGULATORY REFERENCES (optional) ──────────────────────
regulatory_references:
  - framework: "Basel III"       # Framework name
    section: "CRE22"             # Section/article reference
    description: "..."           # What this section covers

# ── SOURCE TABLES (required) ─────────────────────────────
# List every L1/L2 table the metric reads from.
source_tables:
  - schema: l2                   # l1 | l2 | l3
    table: table_name            # Exact table name
    alias: t                     # Short alias for SQL
    join_type: BASE              # BASE (main table) | INNER | LEFT | CROSS
    # join_on only needed for non-BASE tables:
    join_on: "t.id = base.id"
    fields:
      - name: field_name
        role: MEASURE            # MEASURE | DIMENSION | FILTER | JOIN_KEY
        description: "..."       # Optional field description

# ── LEVEL FORMULAS (required) ─────────────────────────────
# Each level must return: dimension_key (the grain) and metric_value (the number).
# Bind parameters: :as_of_date, :base_currency, :prior_as_of_date, :run_id
levels:
  facility:                      # Most granular (per position/facility)
    aggregation_type: RAW        # RAW | SUM | WEIGHTED_AVG | COUNT | COUNT_DISTINCT | MIN | MAX | MEDIAN | CUSTOM
    formula_text: "..."          # Human-readable description
    formula_sql: |               # PostgreSQL SQL
      SELECT
        t.id AS dimension_key,
        t.amount AS metric_value
      FROM l2.table_name t
      WHERE t.as_of_date = :as_of_date

  counterparty:                  # Per-counterparty aggregation
    aggregation_type: SUM
    formula_text: "..."
    formula_sql: |
      SELECT ... GROUP BY counterparty_id

  desk:                          # Per L3 desk (via enterprise_business_taxonomy)
    aggregation_type: SUM
    formula_text: "..."
    formula_sql: |
      SELECT ... GROUP BY ebt.managed_segment_id

  portfolio:                     # Per L2 portfolio (parent of desk)
    aggregation_type: SUM
    formula_text: "..."
    formula_sql: |
      SELECT ... GROUP BY ebt_l2.managed_segment_id

  business_segment:              # Per L1 segment (parent of portfolio)
    aggregation_type: SUM
    formula_text: "..."
    formula_sql: |
      SELECT ... GROUP BY ebt_l1.managed_segment_id

# ── DEPENDENCIES (optional) ──────────────────────────────
depends_on: []                   # metric_ids this metric reads from

# ── OUTPUT (required) ────────────────────────────────────
output:
  table: metric_result           # Where results are stored
  # additional_tables:           # Optional: other L3 tables populated
  #   - schema: l3
  #     table: your_calc_table
  #     column: result_column

# ── VALIDATION RULES (recommended) ──────────────────────
validations:
  - rule_id: "DOMAIN-NNN-V01"
    type: NOT_NULL               # NOT_NULL | NON_NEGATIVE | RECONCILIATION | PERIOD_OVER_PERIOD | THRESHOLD
    description: "..."
    severity: ERROR              # ERROR | WARNING

# ── CATALOGUE (required for UI) ─────────────────────────
catalogue:
  item_id: "MET-NNN"            # Catalogue ID (must be unique)
  abbreviation: "SHORT"         # 3-8 char abbreviation for UI
  insight: >                    # Business insight (what to look for when this metric changes)
    One paragraph explaining what trends mean.
  rollup_strategy: "direct-sum" # direct-sum | sum-ratio | weighted-avg
  primary_value_field: "field"  # Main measure field name

# ── METADATA (optional) ─────────────────────────────────
tags: []                         # Searchable tags
dashboard_pages: []              # P1-P7 dashboard page references
legacy_metric_ids: []            # IDs of metrics this replaces
```

---

## Naming Convention Quick Reference

| Suffix | SQL Type | Example |
|--------|----------|---------|
| `_id` | `BIGINT` | `counterparty_id`, `var_model_id` |
| `_code` | `VARCHAR(30)` | `currency_code`, `risk_factor_type_code` |
| `_name` | `VARCHAR(500)` | `facility_name`, `var_model_name` |
| `_desc`, `_text` | `VARCHAR(500)` | `description_text` |
| `_amt` | `NUMERIC(20,4)` | `var_amt`, `total_pnl_amt` |
| `_pct` | `NUMERIC(10,6)` | `confidence_level_pct` |
| `_value` | `NUMERIC(12,6)` | `delta_value`, `close_price_value` |
| `_date` | `DATE` | `as_of_date`, `maturity_date` |
| `_ts` | `TIMESTAMP` | `created_ts`, `updated_ts` |
| `_flag` | `BOOLEAN` | `is_active_flag`, `is_regulatory_flag` |
| `_count` | `INTEGER` | `number_of_positions` |
| `_bps` | `NUMERIC(10,4)` | `spread_bps` |
| (no match) | `VARCHAR(64)` | (fallback) |

**Exception IDs** (remain VARCHAR despite `_id` suffix): `metric_id`, `variant_id`, `source_metric_id`, `mdrm_id`, `mapped_line_id`, `mapped_column_id`.

---

## DDL Rules Quick Reference

1. **Reserved words** must be double-quoted: `"value"`, `"user"`, `"order"`, `"group"`, `"select"`, `"table"`, `"column"`, `"check"`, `"primary"`, `"foreign"`, `"constraint"`, `"default"`, `"null"`, `"true"`, `"false"`
2. **Every table must have a PRIMARY KEY** (required for GCP Cloud SQL logical replication)
3. **SET search_path** for cross-schema FK references:
   - L2 DDL: `SET search_path TO l1, l2, public;`
   - L3 DDL: `SET search_path TO l1, l2, l3, public;`
4. **FK constraint names** must be < 63 characters (use abbreviations for long table names)
5. **Use `IF NOT EXISTS`** for idempotent migrations
6. **Use `DO $$ BEGIN ... END $$`** for ALTER TABLE (adding columns to existing tables)
7. **COALESCE type must match column**: BIGINT uses `COALESCE(col, 0)`, VARCHAR uses `COALESCE(col, '')`

---

## CLI Command Reference

### Metric Pipeline

| Command | What It Does |
|---------|-------------|
| `npm run calc:sync` | Sync YAML to Excel + catalogue (no demo data) |
| `npm run calc:sync:excel` | Sync YAML to Excel only |
| `npm run calc:sync:catalogue` | Sync YAML to catalogue only |
| `npm run calc:run -- --metric MKT-001` | Execute one metric |
| `npm run calc:validate -- --metric MKT-001` | Validate one metric definition |
| `npm run calc:inspect -- --metric MKT-001` | Inspect metric definition details |
| `npm run calc:list` | List all registered metrics |
| `npm run calc:dag` | Show metric dependency graph |
| `npm run calc:demo -- --metric MET-201 --persist --force` | Generate demo data for one metric |
| `npm run calc:demo:all` | Generate demo data for all metrics |
| `npm run calc:full` | Full pipeline: calc:sync + calc:demo:all |
| `npm run calc:audit` | Query calculation audit trail |

### Database & Schema

| Command | What It Does |
|---------|-------------|
| `npm run db:introspect` | Sync PostgreSQL schema to data-dictionary.json |
| `npm run db:sync-capital` | Sync main DB schema to postgres_capital |
| `npm run db:load-gsib` | Load GSIB DDL and seed data |
| `npm run db:load-gsib-fresh` | Drop and reload GSIB data |
| `npm run db:verify-gsib` | Verify GSIB data integrity |
| `npm run db:verify-scenarios` | Verify scenario data integrity |
| `npm run db:migrate` | Run database migrations |
| `npm run sync:data-model` | Sync from DDL (fallback when no DB) |

### Validation & Testing

| Command | What It Does |
|---------|-------------|
| `npm run validate` | Run 30+ cross-referential integrity checks |
| `npm run test:metrics` | Validate metric definitions |
| `npm run test:calc-engine` | Test calculation engine |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |

### Export & Data Generation

| Command | What It Does |
|---------|-------------|
| `npm run export:data-model` | Export data model to Excel |
| `npm run generate:l1` | Generate L1 sample data |
| `npm run generate:l2` | Generate L2 sample data |
| `npm run factory:generate` | Generate all scenario data |
| `npm run factory:validate` | Validate scenario data |

### Development

| Command | What It Does |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |

---

## File Locations Quick Reference

| Artifact | Path |
|----------|------|
| **Metric YAML definitions** | `scripts/calc_engine/metrics/{domain}/{METRIC_ID}.yaml` |
| **YAML template** | `scripts/calc_engine/metrics/_template.yaml` |
| **Catalogue JSON** | `data/metric-library/catalogue.json` |
| **Domains JSON** | `data/metric-library/domains.json` |
| **Variants JSON** | `data/metric-library/variants.json` |
| **Visualization configs** | `data/metric-library/visualization-configs.json` |
| **L1 table metadata** | `data/l1-table-meta.ts` |
| **L2 table metadata** | `data/l2-table-meta.ts` |
| **L3 table manifest** | `data/l3-tables.ts` |
| **L3 metric definitions** | `data/l3-metrics.ts` |
| **Metrics Excel** | `data/metrics_dimensions_filled.xlsx` |
| **Data dictionary** | `facility-summary-mvp/output/data-dictionary/data-dictionary.json` |
| **DDL files (L1/L2)** | `sql/gsib-export/` |
| **DDL files (L3)** | `sql/l3/` |
| **Migrations** | `sql/migrations/` |
| **Python calculators** | `scripts/calc_engine/calculators/` |
| **Catalogue types** | `lib/metric-library/types.ts` |
| **Calculation engine** | `lib/metrics-calculation/` |
| **DDL generator** | `lib/ddl-generator.ts` |
| **Introspection script** | `scripts/introspect-db.ts` |

---

## Rollup Strategy Decision Tree

```
Can you simply SUM the facility-level values to get the counterparty total?
  YES --> "direct-sum"
          Examples: exposure amounts, P&L, VaR, counts, collateral values

  NO  --> Is the metric a ratio where you need SUM(numerator) / SUM(denominator)?
            YES --> "sum-ratio"
                    Examples: LTV, DSCR, capital adequacy ratio, utilization %

            NO  --> Does the metric need weighting by some basis (e.g., EAD-weighted PD)?
                      YES --> "weighted-avg"
                              Examples: EAD-weighted PD, notional-weighted spread
```

---

## Glossary

| Term | Definition |
|------|-----------|
| **Catalogue Item** | A business metric concept in the metric library (e.g., DSCR, LTV, VaR). Defined in `catalogue.json`. |
| **Ingredient Field** | A raw L1/L2 field that feeds into a metric calculation. Listed on each catalogue item. |
| **Level Definition** | How a metric computes at a specific rollup level (facility, counterparty, desk, portfolio, business segment). |
| **Sourcing Type** | How a level gets its data: `Raw` (direct field read), `Calc` (computed formula), `Agg` (aggregated from lower level), `Avg` (weighted average). |
| **Calculated Overlay** | An L3 table at the same grain as an L2 table, holding derived fields split from the L2 table to maintain L2/L3 separation. |
| **SCD-0** | Slowly Changing Dimension Type 0: fixed reference data that never changes (e.g., currency codes). |
| **SCD-1** | Type 1: overwrite with latest value, no history retained (e.g., org structure). |
| **SCD-2** | Type 2: versioned with history, each row has effective dates (e.g., counterparty master). |
| **Snapshot** | Point-in-time observation keyed by `as_of_date`. Each date gets a full snapshot. |
| **Event** | Discrete occurrence with a timestamp (e.g., credit event, amendment). |
| **Escape Hatch** | A hardcoded calculator override for metrics too complex for pure SQL (e.g., correlation-adjusted VaR). Defined in `lib/metrics-calculation/escape-hatch.ts`. |
| **Data Dictionary** | The JSON file (`data-dictionary.json`) that caches the full schema from PostgreSQL. Source of truth for the visualizer. |
| **Schema Bundle** | Unified JSON export of data dictionary + L3 tables + metrics, served by `/api/schema/bundle`. |
| **Bind Parameters** | SQL variables replaced at runtime: `:as_of_date`, `:base_currency`, `:prior_as_of_date`, `:run_id`. |

---

Back to: [Playbook Index](README.md)
