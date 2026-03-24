# 01 - Data Model Overview

## The Three-Layer Architecture

The data model is organized into three layers. Every table, every field, and every metric follows this convention.

```
 ┌─────────────────────────────────────────────────────────┐
 │  L1 -- REFERENCE DATA  (75 tables)                     │
 │  Dimensions, masters, lookups, hierarchies, config      │
 │  Rarely changes. Shared across all risk stripes.        │
 │  Examples: currency_dim, country_dim, scenario_dim      │
 └──────────────────────────┬──────────────────────────────┘
                            │ L2 reads from L1
                            ▼
 ┌─────────────────────────────────────────────────────────┐
 │  L2 -- ATOMIC DATA  (102 tables)                        │
 │  Raw source-system snapshots and events                 │
 │  Point-in-time observations. Never computed.            │
 │  Examples: position, facility_exposure_snapshot, fx_rate │
 └──────────────────────────┬──────────────────────────────┘
                            │ L3 reads from L1 + L2
                            ▼
 ┌─────────────────────────────────────────────────────────┐
 │  L3 -- DERIVED DATA  (83 tables)                       │
 │  Anything calculated, aggregated, or computed           │
 │  Ratios, scores, summaries, cubes                       │
 │  Examples: exposure_metric_cube, metric_result          │
 └─────────────────────────────────────────────────────────┘
```

**The cardinal rule: data flows forward only.** L1 feeds L2. L1 + L2 feed L3. Never backwards.

---

## How to Classify a Table or Field

Use this decision tree when deciding where something belongs:

```
Is it a fixed code/lookup/dimension that rarely changes?
  YES --> L1 (Reference Data)
  NO  --> Is it a raw observation, snapshot, or event from a source system?
            YES --> L2 (Atomic Data)
            NO  --> Is it computed, derived, aggregated, or a ratio?
                      YES --> L3 (Derived Data)
```

**Common mistakes to avoid:**
- Putting ratios (DSCR, LTV, coverage) in L2 -- these are derived, they belong in L3
- Putting time-series snapshots in L1 -- snapshots are atomic observations, they belong in L2
- Putting lookup dimensions in L2 -- fixed reference codes belong in L1

### The Calculated Overlay Pattern

When an L2 table has a mix of raw fields and derived fields, split the derived fields into a companion L3 table at the same grain (same PK) with a FK back to the L2 source.

**Real example from the codebase:**
- `l2.facility_financial_snapshot` -- raw inputs (revenue, operating expenses, total debt, property value)
- `l3.facility_financial_calc` (T51) -- derived fields (DSCR, LTV, net income, debt service coverage)

The platform has 12 calculated overlay tables (T51-T62):

| L3 Table | Companion L2 Table | What It Calculates |
|----------|-------------------|-------------------|
| `facility_financial_calc` (T51) | `facility_financial_snapshot` | DSCR, LTV, net income |
| `facility_exposure_calc` (T52) | `facility_exposure_snapshot` | Net exposure, utilization ratios |
| `data_quality_score_snapshot` (T53) | -- | DQ scores (entirely computed) |
| `stress_test_result` (T54) | -- | Stress test outputs (entirely computed) |
| `facility_risk_calc` (T55) | `facility_risk_snapshot` | Risk-weighted metrics |
| `netting_set_exposure_calc` (T56) | `netting_set_exposure_snapshot` | Netting-adjusted exposure |
| `counterparty_rating_calc` (T57) | `counterparty_rating_observation` | Rating-derived metrics |
| `facility_pricing_calc` (T58) | `facility_pricing_snapshot` | Pricing-derived metrics |
| `deal_pipeline_calc` (T59) | `deal_pipeline_fact` | Pipeline-derived metrics |
| `collateral_calc` (T60) | `collateral_snapshot` | Collateral-derived metrics |
| `cash_flow_calc` (T61) | `cash_flow` | Cash flow-derived metrics |
| `gl_account_balance_calc` (T62) | `gl_account_balance_snapshot` | GL-derived metrics |

---

## The Rollup Hierarchy

Every metric must define how it aggregates across five levels:

```
Facility  -->  Counterparty  -->  Desk (L3)  -->  Portfolio (L2)  -->  Business Segment (L1)
(most              ▲                  ▲                 ▲                     ▲
 granular)    SUM/AVG/etc.      via org_unit       via parent          via parent
                                 hierarchy          segment             segment
```

The hierarchy is driven by `l1.enterprise_business_taxonomy`, a self-referencing table where each segment has a `parent_segment_id`. This allows the platform to roll up from individual facilities through organizational levels to top-level business segments.

**Why this matters:** When you write a YAML metric spec, you must provide SQL for all five rollup levels. See the [Worked Example](04-worked-example-market-risk.md) for how this works in practice.

---

## Complete Table Inventory

This is the "shopping list" for onboarding teams. Check which tables your risk stripe can reuse before proposing new ones.

### L1 -- REFERENCE DATA  (75 tables)

| Category | Tables |
|----------|--------|
| **Currency** | `currency_dim` |
| **Geography** | `country_dim`, `region_dim` |
| **Regulatory** | `regulatory_jurisdiction`, `regulatory_capital_basis_dim`, `regulatory_mapping`, `report_cell_definition` |
| **Counterparty** | `entity_type_dim`, `counterparty_role_dim` |
| **Credit Risk Status** | `credit_event_type_dim`, `credit_status_dim`, `dpd_bucket_dim` |
| **Exposure Classification** | `exposure_type_dim` |
| **Credit Events / Amendments** | `amendment_status_dim`, `amendment_type_dim` |
| **Default Rules** | `default_definition_dim` |
| **Ratings** | `internal_risk_rating_bucket_dim`, `risk_rating_tier_dim`, `rating_change_status_dim`, `rating_scale_dim`, `rating_source`, `rating_grade_dim`, `rating_mapping` |
| **Facility** | `pricing_tier_dim`, `utilization_status_dim` |
| **Calendar & Time** | `origination_date_bucket_dim`, `maturity_bucket_dim`, `date_dim`, `date_time_dim`, `reporting_calendar_dim` |
| **Limits & Thresholds** | `limit_status_dim`, `limit_rule`, `limit_threshold`, `metric_threshold` |
| **Regulatory Mapping** | `fr2590_category_dim` |
| **Collateral & CRM** | `crm_type_dim`, `risk_mitigant_type_dim`, `collateral_type`, `collateral_eligibility_dim`, `collateral_haircut_dim`, `crm_eligibility_dim` |
| **Market Data** | `interest_rate_index_dim` |
| **Instrument** | `instrument_identifier` |
| **Scenario** | `scenario_dim` |
| **Industry** | `industry_dim` |
| **Business Taxonomy** | `enterprise_business_taxonomy` |
| **Product Taxonomy** | `enterprise_product_taxonomy` |
| **Portfolio** | `portfolio_dim`, `collateral_portfolio` |
| **Organization** | `org_unit_dim` |
| **Legal Entity** | `reporting_entity_dim` |
| **General Ledger** | `ledger_account_dim` |
| **Metrics & Context** | `context_dim`, `metric_definition_dim` |
| **Run Control & Lineage** | `source_system_registry`, `run_control`, `report_registry`, `validation_check_registry`, `reconciliation_control` |
| **Models** | `model_registry_dim`, `rule_registry` |
| **SCCL Grouping** | `sccl_counterparty_group`, `sccl_counterparty_group_member` |

### L2 -- ATOMIC DATA  (102 tables)

| Category | Tables | SCD Type |
|----------|--------|----------|
| **Business Entity** | `counterparty`, `legal_entity`, `credit_agreement_master`, `facility_master`, `contract_master` | SCD-2 |
| **Financial** | `instrument_master` | SCD-2 |
| **Netting** | `netting_agreement`, `netting_set`, `netting_set_link` | SCD-2 |
| **Collateral & CRM** | `csa_master`, `margin_agreement`, `collateral_asset_master`, `collateral_link`, `crm_protection_master`, `protection_link`, `risk_mitigant_master`, `risk_mitigant_link` | SCD-2 |
| **Hierarchy** | `counterparty_hierarchy`, `legal_entity_hierarchy`, `control_relationship`, `economic_interdependence_relationship` | SCD-2 |
| **Counterparty Participation** | `credit_agreement_counterparty_participation`, `facility_counterparty_participation`, `facility_lender_allocation` | SCD-2 |
| **Market Data** | `fx_rate` | Snapshot |
| **Position Core** | `position` | Snapshot |
| **Position Detail** | `position_detail` | Snapshot |
| **Exposure** | `facility_exposure_snapshot`, `netting_set_exposure_snapshot`, `exposure_counterparty_attribution` | Snapshot |
| **Business Segment Attribution** | `facility_lob_attribution` | Snapshot |
| **CRM** | `collateral_snapshot` | Snapshot |
| **Financial Metrics** | `facility_financial_snapshot`, `facility_delinquency_snapshot`, `facility_pricing_snapshot`, `facility_profitability_snapshot`, `counterparty_financial_snapshot` | Snapshot |
| **Limits** | `limit_contribution_snapshot`, `limit_utilization_event`, `limit_assignment_snapshot` | Snapshot |
| **Ratings** | `counterparty_rating_observation` | Snapshot |
| **Metrics** | `financial_metric_observation` | Snapshot |
| **Risk Monitoring** | `facility_risk_snapshot`, `risk_flag` | Snapshot/Event |
| **Cash Flows** | `cash_flow` | Event |
| **Amendments** | `amendment_change_detail`, `amendment_event` | Event |
| **Credit Events** | `credit_event`, `credit_event_facility_link` | Event |
| **Stress Testing** | `stress_test_breach` | Event |
| **Deal Pipeline** | `deal_pipeline_fact` | Event |
| **Exceptions** | `exception_event` | Event |
| **Approvals** | `facility_credit_approval` | Event |
| **Payments** | `payment_ledger` | Event |
| **General Ledger** | `gl_journal_entry`, `gl_account_balance_snapshot` | Event/Snapshot |

### L3 -- DERIVED DATA  (83 tables)

L3 tables are organized into 4 execution tiers and are generated by the calculation engine. New risk stripes typically add their own L3 tables. See `data/l3-tables.ts` for the full manifest.

Key L3 categories:
- **Exposure & Risk Metrics** (T01-T05, T52, T55-T56) -- cubes, summaries, calculated overlays
- **Credit Risk Mitigation** (T06-T07, T60) -- CRM allocations, collateral valuations
- **Limits & Appetite** (T08-T11, T33-T34) -- limit states, breaches, utilization
- **Credit Events & Performance** (T12-T14, T57) -- events, rating migrations, defaults
- **Business Segment Summary** (T22-T29, T46-T49, T59) -- LOB-level rollups
- **Calculation Engine** (T63-T66) -- run control, audit, validation, metric results

---

## How the Data Dictionary Works

PostgreSQL is the **golden source of truth** for all table structures:

```
PostgreSQL          npm run db:introspect          data-dictionary.json          Visualizer / APIs
(live DB)    ────────────────────────────>    (cached JSON)    ──────────────>   (reads JSON)
```

The data dictionary lives at `facility-summary-mvp/output/data-dictionary/data-dictionary.json`. It contains every table, every field, data types, PKs, FKs, and descriptions. The visualizer, Excel exporter, validation scripts, and schema bundle API all read from it.

**After any schema change:** Run `npm run db:introspect` to update the data dictionary. This happens automatically via the PostToolUse hook when using Claude Code.

---

## Naming Convention Contract

Column names determine their SQL types. The DDL generator infers types from name suffixes:

| Suffix | SQL Type | Example |
|--------|----------|---------|
| `_id` | `BIGINT` | `counterparty_id`, `facility_id` |
| `_code` | `VARCHAR(30)` | `currency_code`, `risk_factor_type_code` |
| `_name`, `_desc`, `_text` | `VARCHAR(500)` | `facility_name`, `description_text` |
| `_amt` | `NUMERIC(20,4)` | `gross_exposure_amt`, `var_amt` |
| `_pct` | `NUMERIC(10,6)` | `coverage_ratio_pct`, `confidence_level_pct` |
| `_value` | `NUMERIC(12,6)` | `close_price_value`, `delta_value` |
| `_date` | `DATE` | `maturity_date`, `as_of_date` |
| `_ts` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | `created_ts`, `updated_ts` |
| `_flag` | `BOOLEAN` | `is_active_flag`, `defaulted_flag` |
| `_count` | `INTEGER` | `number_of_loans` |
| `_bps` | `NUMERIC(10,4)` | `interest_rate_spread_bps` |
| (no match) | `VARCHAR(64)` | (fallback) |

**Exception IDs** that remain VARCHAR despite `_id` suffix: `metric_id`, `variant_id`, `source_metric_id`, `mdrm_id`, `mapped_line_id`, `mapped_column_id`.

**Why this matters:** If you name a column `var_amount` instead of `var_amt`, it will get `VARCHAR(64)` instead of `NUMERIC(20,4)`. Follow the suffix convention exactly.

---

Next: [02 - Platform Capabilities](02-platform-capabilities.md)
