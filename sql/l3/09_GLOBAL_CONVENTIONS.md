# Global Conventions for L3 SQL Generation

## Data Type Mappings

| Pattern | SQL Type | Notes |
|---|---|---|
| `*_id` | `VARCHAR(64)` | Business keys from source systems |
| `*_code` | `VARCHAR(30)` | Classification/status codes |
| `*_name`, `*_desc`, `*_text` | `VARCHAR(500)` or `TEXT` | Display names |
| `*_amt` | `NUMERIC(20,4)` | Monetary amounts in base currency |
| `*_pct` | `NUMERIC(10,6)` | Percentages stored as-is: 25.5% = 25.500000 |
| `*_value` (ratio) | `NUMERIC(12,6)` | Non-percentage ratios (DSCR, FCCR) |
| `*_count` | `INTEGER` | Counts |
| `*_flag` | `BOOLEAN` | True/False |
| `*_date` | `DATE` | Calendar dates |
| `*_ts` | `TIMESTAMP` | Timestamps |
| `*_bps` | `NUMERIC(10,4)` | Basis points |
| `*_seq`, `rank_*` | `INTEGER` | Ordering |

## Primary Key Convention

- Composite PKs: `(run_version_id, as_of_date, ...)`
- Nullable PK parts: Use COALESCE in unique index
- Single PKs (breach_id, report_run_id): UUID generation

## Foreign Key Convention

- All FKs reference `l1.*` or `l2.*` schemas
- Cross-L3 FKs: logical only (documented in comments, not enforced)
- Nullable FKs: no constraint, documented

## Currency Conversion Pattern

All monetary measures stored in `base_currency_code` (typically USD).
Conversion: `amount * COALESCE(fx.exchange_rate, 1)`
FX rate join: `l1.fx_rate ON currency_code = from_currency_code AND to_currency_code = @base_currency_code AND as_of_date = @as_of_date`

## Period-over-Period Pattern

Every table with `prior_period_*` or `*_change_pct` fields:
- Current: `WHERE as_of_date = @as_of_date`
- Prior: `WHERE as_of_date = @prior_as_of_date` (= `@as_of_date - INTERVAL '1 month'`)
- Change %: `(current - prior) / NULLIF(prior, 0) * 100.0`

## LoB Attribution Pattern

Facilities map to LoBs via `l2.facility_lob_attribution`:
- Join: `ON facility_id = fla.facility_id AND fla.as_of_date = @as_of_date`
- Fields: `fla.lob_node_id`, `fla.hierarchy_id`, `fla.attribution_pct`
- When attribution_pct < 100: multiply measures by `attribution_pct / 100.0`

## Exposure-Weighted Average Pattern

For averages like avg_pd_pct, avg_lgd_pct:
```sql
SUM(pd_pct * ead_amt) / NULLIF(SUM(ead_amt), 0) AS avg_pd_pct
```

## Key L1 Reference Table Joins

| L1 Table | Join Pattern | Purpose |
|---|---|---|
| `counterparty` | `ON counterparty_id` | Name, type, country, industry |
| `counterparty_hierarchy` | `ON counterparty_id` | Parent/child |
| `facility_master` | `ON facility_id` | Type, product, dates, syndication |
| `legal_entity` | `ON legal_entity_id` | LE name, classification |
| `country_dim` → `region_dim` | `ON country_code` → `ON region_code` | Geography hierarchy |
| `industry_dim` | `ON industry_code` | Sector name |
| `rating_grade_dim` | `ON rating_grade_id` | Rating label, rank |
| `enterprise_business_taxonomy` | `ON business_node_id = lob_node_id` | LoB hierarchy |
| `enterprise_product_taxonomy` | `ON product_node_id` | Product hierarchy |
| `scenario_dim` | `ON scenario_id` | Scenario name, type |
| `fx_rate` | `ON from/to_currency + as_of_date` | Currency conversion |
| `metric_definition_dim` | `ON metric_code` | Metric governance |
| `limit_threshold` | `ON limit_assignment_id` | Limit values |
| `sccl_counterparty_group_member` | `ON counterparty_id` | SCCL grouping |

## Key L2 Source Table Joins

| L2 Table | Feeds L3 Tables | Join Pattern |
|---|---|---|
| `position` + `position_detail` | T1, T2, T20 | `ON position_id AND as_of_date` |
| `facility_exposure_snapshot` | T1, T4, T22 | `ON facility_id AND as_of_date` |
| `collateral_snapshot` | T6, T7 | `ON collateral_asset_id AND as_of_date` |
| `limit_utilization_event` | T8, T9, T11 | `ON limit_assignment_id` |
| `limit_contribution_snapshot` | T8, T10 | `ON limit_assignment_id AND as_of_date` |
| `credit_event` | T12, T14 | `ON counterparty_id AND event_date` |
| `counterparty_rating_observation` | T2, T13, T32 | `ON counterparty_id AND as_of_date AND rating_source_id` |
| `facility_pricing_snapshot` | T24, T45 | `ON facility_id AND as_of_date` |
| `facility_profitability_snapshot` | T23 | `ON facility_id AND as_of_date` |
| `facility_delinquency_snapshot` | T25 | `ON facility_id AND as_of_date` |
| `facility_lob_attribution` | Nearly all L3 | `ON facility_id AND as_of_date` |
| `amendment_event` | T4, T43, T44 | `ON facility_id` |
| `stress_test_result` + `_breach` | T39, T40 | `ON scenario_id AND as_of_date` |
| `data_quality_score_snapshot` | T35, T37, T38 | `ON dimension_id AND as_of_date` |
| `deal_pipeline_fact` | T27 | `ON lob_node_id AND as_of_date` |
| `financial_metric_observation` | T46 | `ON metric_code AND dimension_id` |
| `risk_flag` | T22, T47 | `ON facility_id AND as_of_date` |
| `metric_threshold` | T24, T30, T41 | `ON metric_code AND as_of_date` |
