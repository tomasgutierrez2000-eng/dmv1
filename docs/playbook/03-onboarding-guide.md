# 03 - Onboarding Guide

This is the step-by-step process for a new risk stripe to onboard to the shared data model. The process has four phases spanning 2-4 weeks.

---

## Prerequisites

Before starting, ensure you have:
- Access to the platform (dev server URL or local checkout)
- Node.js 18+ and Python 3.10+ installed (for running the YAML pipeline)
- PostgreSQL connection (`DATABASE_URL`) -- or coordinate with the platform team for schema changes
- Basic familiarity with YAML syntax

---

## Phase 1: Discovery (Week 1)

**Who:** Business Analyst + Tech Lead together

### Step 1: Explore the existing model

1. Open the **visualizer** at `/visualizer` and browse L1/L2 tables by category
2. Open the **metric library** at `/metrics/library` and browse existing metrics by domain
3. Use the **AI agent** at `/agent` to ask questions like:
   - "What tables exist in the Position category?"
   - "Show me the fields in counterparty"
   - "Which metrics use the collateral_snapshot table?"

### Step 2: Fill out the Stripe Intake Worksheet

Work through each section below with your team. This worksheet drives everything that follows.

---

### Section A: Stripe Identity

| Field | Your Answer |
|-------|-------------|
| Risk Stripe Name | _(e.g., Market Risk)_ |
| Domain ID (kebab-case) | _(e.g., market-risk)_ |
| Domain Display Name | _(e.g., Market Risk & Trading)_ |
| Primary Stakeholders | _(names / roles)_ |
| Color (hex) | _(e.g., #0288D1)_ |
| Icon (Lucide icon name) | _(e.g., TrendingDown)_ |

---

### Section B: Reusable Existing Tables

Go through the tables below and check every table your stripe will use. This determines what you can build on without creating new tables.

**L1 Reference Tables -- check all you will use:**

| Check | Table | Category | Why You Might Need It |
|-------|-------|----------|----------------------|
| [ ] | `currency_dim` | Currency | Multi-currency conversions |
| [ ] | `country_dim` | Geography | Country-level risk grouping |
| [ ] | `region_dim` | Geography | Regional aggregation |
| [ ] | `entity_type_dim` | Counterparty | Counterparty classification |
| [ ] | `industry_dim` | Industry | Industry sector analysis |
| [ ] | `interest_rate_index_dim` | Market Data | Rate curve references |
| [ ] | `scenario_dim` | Scenario | Stress / what-if scenarios |
| [ ] | `instrument_identifier` | Instrument | Instrument lookups (CUSIP, ISIN) |
| [ ] | `date_dim` | Calendar & Time | Date-based aggregation |
| [ ] | `maturity_bucket_dim` | Calendar & Time | Maturity bucketing |
| [ ] | `enterprise_business_taxonomy` | Business Taxonomy | Rollup hierarchy (desk > portfolio > segment) |
| [ ] | `enterprise_product_taxonomy` | Product Taxonomy | Product classification |
| [ ] | `org_unit_dim` | Organization | Org structure |
| [ ] | `portfolio_dim` | Portfolio | Portfolio grouping |
| [ ] | `reporting_entity_dim` | Legal Entity | Legal entity reporting |
| [ ] | `source_system_registry` | Run Control | Source system tracking |
| [ ] | `rating_scale_dim` | Ratings | Rating scale definitions |
| [ ] | `rating_grade_dim` | Ratings | Rating grade lookups |
| [ ] | `rating_source` | Ratings | Rating agency references |
| [ ] | `collateral_type` | Collateral & CRM | Collateral classification |
| [ ] | `regulatory_jurisdiction` | Regulatory | Jurisdiction-based rules |
| [ ] | `limit_rule` | Limits & Thresholds | Limit definitions |
| [ ] | `limit_threshold` | Limits & Thresholds | Threshold values |
| [ ] | `metric_threshold` | Limits & Thresholds | Metric alert thresholds |
| [ ] | `model_registry_dim` | Models | Model governance |
| [ ] | `context_dim` | Metrics & Context | Calculation context |
| [ ] | `metric_definition_dim` | Metrics & Context | Metric metadata |

**L2 Atomic Tables -- check all you will use:**

| Check | Table | Category | Why You Might Need It |
|-------|-------|----------|----------------------|
| [ ] | `counterparty` | Business Entity | Core counterparty data |
| [ ] | `legal_entity` | Business Entity | Legal entity master |
| [ ] | `instrument_master` | Financial | Instrument/security master |
| [ ] | `credit_agreement_master` | Business Entity | Credit agreement terms |
| [ ] | `facility_master` | Business Entity | Facility details |
| [ ] | `contract_master` | Financial | Contract master |
| [ ] | `position` | Position Core | Position-level holdings |
| [ ] | `position_detail` | Position Detail | Position attributes |
| [ ] | `fx_rate` | Market Data | FX rates for conversion |
| [ ] | `netting_agreement` | Netting | ISDA netting agreements |
| [ ] | `netting_set` | Netting | Netting set definitions |
| [ ] | `netting_set_link` | Netting | Netting set membership |
| [ ] | `facility_exposure_snapshot` | Exposure | Drawn/undrawn amounts |
| [ ] | `netting_set_exposure_snapshot` | Exposure | Netting-adjusted exposure |
| [ ] | `collateral_snapshot` | CRM | Collateral valuations |
| [ ] | `facility_risk_snapshot` | Risk Monitoring | PD, LGD, risk weights |
| [ ] | `counterparty_rating_observation` | Ratings | Rating snapshots |
| [ ] | `facility_financial_snapshot` | Financial Metrics | Financial statement data |
| [ ] | `stress_test_breach` | Stress Testing | Stress test results |
| [ ] | `risk_flag` | Risk Monitoring | Risk alerts and flags |
| [ ] | `csa_master` | Collateral & CRM | CSA agreement details |
| [ ] | `margin_agreement` | Collateral & CRM | Margin terms |
| [ ] | `limit_utilization_event` | Limits | Limit usage tracking |
| [ ] | `gl_journal_entry` | General Ledger | GL postings |
| [ ] | `gl_account_balance_snapshot` | General Ledger | GL balances |

---

### Section C: New Tables Needed

For each new table your stripe requires, fill out one row. Follow the [naming convention](01-data-model-overview.md#naming-convention-contract).

| # | Table Name (snake_case) | Layer | Category | SCD Type | Description | Key Fields | FK References |
|---|------------------------|-------|----------|----------|-------------|------------|---------------|
| 1 | _(e.g., var_model_config)_ | _(L1)_ | _(Market Risk)_ | _(SCD-1)_ | _(VaR model parameters)_ | _(var_model_id PK, var_model_code, confidence_level_pct, holding_period_days)_ | _(none)_ |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |

**SCD type guide:**
- **L1 tables:** SCD-0 (fixed codes that never change) or SCD-1 (overwrite with latest value)
- **L2 tables:** SCD-2 (versioned masters with history), Snapshot (point-in-time observations), Event (discrete occurrences)

---

### Section D: Metrics Needed

For each metric your stripe needs, fill out one row.

| # | Metric Name | Unit Type | Direction | Business Definition | Source Tables | Rollup Strategy |
|---|-------------|-----------|-----------|-------------------|---------------|-----------------|
| 1 | _(e.g., Value at Risk)_ | _(CURRENCY)_ | _(LOWER_BETTER)_ | _(99% 1-day VaR...)_ | _(var_result_snapshot, position)_ | _(direct-sum)_ |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |

**Unit types:** CURRENCY, PERCENTAGE, RATIO, COUNT, RATE, BPS, DAYS, INDEX, ORDINAL

**Direction:** HIGHER_BETTER, LOWER_BETTER, NEUTRAL

**Rollup strategies:**
- `direct-sum` -- Facility values simply SUM to counterparty/desk/portfolio/segment (e.g., exposure amounts, P&L)
- `sum-ratio` -- Metric is a ratio where you SUM(numerator)/SUM(denominator) at each level (e.g., LTV, DSCR)
- `weighted-avg` -- Metric is a weighted average using a basis like EAD (e.g., EAD-weighted PD)

---

## Phase 2: Schema Design (Week 1-2)

**Who:** Tech Lead

### Step 3: Design new L1/L2 tables

Using Section C of the intake worksheet:
1. Write field definitions following the [naming convention](01-data-model-overview.md#naming-convention-contract)
2. Apply the L1/L2/L3 classification test -- if a field is computed, it goes in L3
3. Use the [Calculated Overlay Pattern](01-data-model-overview.md#the-calculated-overlay-pattern) if your L2 table has mixed raw and derived fields
4. Write CREATE TABLE DDL following the rules in the [Reference](05-reference.md#ddl-rules-quick-reference)

### Step 4: Add tables to the database

**Option A (with DB access):**
```bash
# Execute your DDL against PostgreSQL
psql -d postgres -f sql/migrations/your-stripe-migration.sql

# Auto-sync data dictionary (runs automatically via hook, or manually):
npm run db:introspect
```

**Option B (without DB access):**
Submit your DDL file to the platform team. They will load it and run introspection.

### Step 5: Register table metadata

Add your new tables to the metadata files:

```typescript
// data/l1-table-meta.ts (for L1 tables)
{ name: 'your_new_dim', scd: 'SCD-0', category: 'Your Category' },

// data/l2-table-meta.ts (for L2 tables)
{ name: 'your_new_snapshot', scd: 'Snapshot', category: 'Your Category' },
```

### Step 6: Register your domain

Add an entry to `data/metric-library/domains.json`:
```json
{
  "domain_id": "your-domain",
  "domain_name": "Your Domain Display Name",
  "description": "One-line description of what this domain covers",
  "color": "#HEXCOLOR",
  "icon": "LucideIconName"
}
```

### Step 7: Verify in the visualizer

Open `/visualizer` and confirm:
- Your new tables appear with the correct layer and category
- FK relationships render correctly
- Status dots show the expected state (green if data loaded, amber if empty)

---

## Phase 3: Metric Definition (Week 2-3)

**Who:** Tech Lead

### Step 8: Write YAML metric specs

1. Create a directory for your domain: `scripts/calc_engine/metrics/your-domain/`
2. Copy the template: `scripts/calc_engine/metrics/_template.yaml`
3. Write one YAML file per metric with:
   - `source_tables[]` referencing your L1/L2 tables
   - SQL formulas for all 5 rollup levels (facility, counterparty, desk, portfolio, business_segment)
   - A `catalogue` block for the UI entry
   - Validation rules

See the [Worked Example](04-worked-example-market-risk.md) for complete YAML specs.

### Step 9: Run the pipeline

```bash
# Generate Excel + catalogue entries from your YAML
npm run calc:sync

# Validate your metric definition
npm run calc:validate -- --metric YOUR-001

# Execute the metric (requires data in the database)
npm run calc:run -- --metric YOUR-001

# Full pipeline: sync + generate demo data
npm run calc:full
```

### Step 10: Validate

```bash
# Cross-referential integrity check
npm run validate

# Verify in the UI
# Open /metrics/library and filter by your domain
# Check that level definitions, ingredient fields, and lineage look correct
```

---

## Adding Metrics to the Metric Library

The metric library (`/metrics/library`) is the central catalogue of all business metrics. For your metrics to show up with full functionality -- ingredient fields, level definitions, interactive demo walkthroughs, and lineage visualization -- they need to be registered correctly. There are two paths.

### Path A: YAML-First (Recommended)

This is the primary path. Write YAML metric specs and run `npm run calc:sync` to auto-generate catalogue entries.

**What `calc:sync` auto-generates for each metric:**

| Component | Source in YAML | Generated Output |
|-----------|---------------|-----------------|
| **Ingredient fields** | `source_tables[].fields[]` | List of atomic L1/L2 fields with layer, table, field name, data type, description |
| **Level definitions** | `levels.{facility,counterparty,desk,portfolio,business_segment}` | Per-level sourcing type, structured pseudocode, source references |
| **Visualization config** | `catalogue.rollup_strategy` + `catalogue.primary_value_field` | Rollup strategy, formula decomposition, worked example columns |

**To ensure ingredient fields display correctly:**

1. Every source field must have a `role` in the YAML (`MEASURE`, `DIMENSION`, `FILTER`, `JOIN_KEY`)
2. Fields with `role: MEASURE` become the primary ingredient fields shown in the UI
3. Include all dimension/join fields -- they appear as supporting ingredients
4. Add `description` to measure fields for better UI tooltips

**To ensure level definitions display correctly:**

1. Provide SQL for all 5 rollup levels (facility, counterparty, desk, portfolio, business_segment)
2. Each level's SQL must return `dimension_key` and `metric_value` columns
3. Set the correct `aggregation_type` per level (`RAW`, `SUM`, `WEIGHTED_AVG`, `COUNT`, `CUSTOM`)
4. Include `formula_text` for each level -- this becomes the human-readable description in the UI

**To enable interactive demo walkthroughs:**

1. Write a Python calculator in `scripts/calc_engine/calculators/your_metric.py`
2. Register it in `scripts/calc_engine/calculators/__init__.py`
3. Run `npm run calc:demo -- --metric MET-XXX --persist --force`
4. The calculator should generate 3-5 representative facilities with realistic values
5. Include `extra_fields` for metric-specific data (e.g., `var_model_code` for VaR)

### Path B: Excel Bulk Upload (Alternative)

For teams that prefer spreadsheets over YAML, two template formats are available.

#### Template 1: Metric Library Template (High-Level)

**Download:** `GET /api/metrics/library/export/template` (downloads `metric-library-template.xlsx`)

This template has 4 sheets:

| Sheet | Required Columns | Purpose |
|-------|-----------------|---------|
| **Instructions** | -- | How to fill out the template |
| **Domains** | `domain_id`, `domain_name` | Register your risk domain |
| **ParentMetrics** | `metric_id`, `metric_name`, `definition`, `generic_formula`, `metric_class`, `unit_type`, `direction`, `domain_ids` | Define each parent metric concept |
| **Variants** | `variant_id`, `variant_name`, `parent_metric_id`, `variant_type`, `status`, `formula_display` | Define metric variants with rollup formulas |

**Enum values for key columns:**
- `metric_class`: `SOURCED` | `CALCULATED` | `HYBRID`
- `unit_type`: `RATIO` | `PERCENTAGE` | `CURRENCY` | `COUNT` | `RATE` | `ORDINAL` | `DAYS` | `INDEX`
- `direction`: `HIGHER_BETTER` | `LOWER_BETTER` | `NEUTRAL`
- `variant_type`: `SOURCED` | `CALCULATED`
- `status`: `ACTIVE` | `DRAFT` | `DEPRECATED`
- `weighting_basis`: `BY_EAD` | `BY_OUTSTANDING` | `BY_COMMITTED`

**Variants sheet -- rollup columns:** Fill `rollup_facility`, `rollup_counterparty`, `rollup_desk`, `rollup_portfolio`, `rollup_lob` with the formula text at each level.

**Import:** `POST /api/metrics/library/import` (upload the filled Excel file)

#### Template 2: Detailed Metrics Template (Full Definitions)

**Generate:** `npx tsx scripts/generate-metrics-upload-template.ts [output-path]`

This is a richer template with 4 sheets:

| Sheet | Purpose |
|-------|---------|
| **Metrics** | One row per metric with per-dimension pseudocode (5 levels x 5 columns each) |
| **IngredientFields** | All atomic L1/L2 source fields per metric (layer, table, field, data_type, sample_value) |
| **DimensionSources** | Per-dimension source references (which fields are used at each rollup level) |
| **Instructions** | Detailed instructions with examples |

**Per-dimension columns on the Metrics sheet** (repeat for each of 5 levels: facility, counterparty, desk, portfolio, lob):

| Column | Purpose | Example |
|--------|---------|---------|
| `{dim}_in_record` | Is this metric available at this level? | `Y` or `N` |
| `{dim}_sourcing_type` | How this level gets data | `Raw`, `Calc`, `Agg`, `Avg` |
| `{dim}_level_logic` | Pseudocode formula at this level | `For each DISTINCT(facility_id) THEN [var_amt]` |
| `{dim}_display_name` | Dashboard label | `Facility VaR ($)` |
| `{dim}_spec_formula` | Specification formula (optional, for traceability) | |

**Import:** Place as `data/metrics_dimensions_filled.xlsx` and restart, or use `npx tsx scripts/import-metrics-replace.ts <file.xlsx>`

### Completeness Checklist

For a metric to show full functionality in `/metrics/library`, verify:

- [ ] **Catalogue entry exists** in `data/metric-library/catalogue.json` (auto-generated by `calc:sync` from YAML)
- [ ] **Ingredient fields populated** -- at least the MEASURE fields appear under the "Ingredients" tab
- [ ] **Level definitions populated** -- all 5 levels show sourcing type, pseudocode, and source references
- [ ] **Domain registered** in `data/metric-library/domains.json` -- metric appears under the correct domain filter
- [ ] **Lineage renders** -- the SVG DAG shows source fields flowing to the metric (auto-generated from ingredient fields)
- [ ] **(Optional) Demo data exists** -- interactive walkthrough with sample facilities is available
- [ ] **(Optional) Executable metric linked** -- `executable_metric_id` on the catalogue item points to an L3 metric for live calculation

---

## Phase 4: Go-Live (Week 3-4)

**Who:** Business Analyst + Tech Lead

### Step 11: Review with stakeholders

- Walk through the metric library entries with business analysts
- Verify demo walkthroughs make business sense
- Check that rollup values reconcile across levels

### Step 12: Load production data

- Load real data into your L1/L2 tables
- Run the calculation engine against real data
- Verify results on the dashboard

---

## Onboarding Checklist

- [ ] Explored the visualizer and metric library
- [ ] Filled out the Stripe Intake Worksheet (Sections A-D)
- [ ] Designed new L1/L2 tables with proper naming conventions
- [ ] Added tables to PostgreSQL and ran `npm run db:introspect`
- [ ] Registered table metadata in `l1-table-meta.ts` / `l2-table-meta.ts`
- [ ] Registered domain in `domains.json`
- [ ] Verified tables in the visualizer
- [ ] Wrote YAML metric specs with SQL for all 5 rollup levels
- [ ] Ran `npm run calc:sync` and `npm run validate` successfully
- [ ] Verified metric library entries: ingredient fields, level definitions, and lineage render correctly
- [ ] (Optional) Generated demo walkthrough data via `npm run calc:demo`
- [ ] Reviewed metric library entries with stakeholders

---

Next: [04 - Worked Example: Market Risk](04-worked-example-market-risk.md)
