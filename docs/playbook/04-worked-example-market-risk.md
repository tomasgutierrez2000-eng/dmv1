# 04 - Worked Example: Market Risk

This section walks through a complete onboarding example for the **Market Risk** stripe. It shows every artifact that would be produced -- from the intake worksheet through table design, YAML metric specs, and pipeline output.

Use this as a template when onboarding your own risk stripe.

---

## Market Risk Overview

Market Risk covers the risk of loss from changes in market prices, rates, and volatilities. A Market Risk stripe would generate these metrics:

| Metric | ID | Unit | Direction | Rollup | Description |
|--------|----|------|-----------|--------|-------------|
| **Value at Risk (99% 1D)** | MKT-001 | CURRENCY | LOWER_BETTER | direct-sum | Max expected 1-day loss at 99% confidence |
| **Total Daily P&L** | MKT-002 | CURRENCY | NEUTRAL | direct-sum | Realized + unrealized P&L |
| **Stressed VaR** | MKT-003 | CURRENCY | LOWER_BETTER | direct-sum | VaR under stressed market conditions |
| **Expected Shortfall** | MKT-004 | CURRENCY | LOWER_BETTER | direct-sum | Average loss beyond VaR threshold |
| **DV01 (IR Sensitivity)** | MKT-005 | CURRENCY | NEUTRAL | direct-sum | Dollar value of 1bp rate move |
| **P&L Attribution** | MKT-006 | CURRENCY | NEUTRAL | direct-sum | P&L decomposition by risk factor |

Key regulatory frameworks: FRTB (Fundamental Review of the Trading Book), Basel III Market Risk capital charges, FR Y-14Q Schedule E.

---

## Completed Intake Worksheet

### Section A: Stripe Identity

| Field | Answer |
|-------|--------|
| Risk Stripe Name | Market Risk |
| Domain ID | `market-risk` |
| Domain Display Name | Market Risk & Trading |
| Primary Stakeholders | Head of Market Risk, Trading Desk Heads |
| Color | `#0288D1` |
| Icon | `TrendingDown` |

### Section B: Reusable Existing Tables

**L1 tables reused:**

| Table | Why |
|-------|-----|
| `currency_dim` | Multi-currency P&L and VaR conversion |
| `country_dim` | Country-level risk aggregation |
| `interest_rate_index_dim` | Rate curve references for IR risk |
| `scenario_dim` | Stress and historical scenarios |
| `instrument_identifier` | CUSIP/ISIN lookups for positions |
| `date_dim` | Date-based aggregation and time series |
| `enterprise_business_taxonomy` | Rollup hierarchy (desk > portfolio > segment) |
| `org_unit_dim` | Trading desk organizational structure |
| `reporting_entity_dim` | Legal entity reporting for capital |
| `source_system_registry` | Source system tracking (risk engine, trading systems) |

**L2 tables reused:**

| Table | Why |
|-------|-----|
| `counterparty` | Counterparty-level risk aggregation |
| `legal_entity` | Legal entity for capital allocation |
| `instrument_master` | Security/instrument master data |
| `position` | Position-level holdings (core building block for market risk) |
| `position_detail` | Position attributes (notional, quantity, trade date) |
| `fx_rate` | Cross-currency rates for VaR/P&L conversion |
| `netting_agreement` | ISDA netting for counterparty exposure |
| `netting_set` | Netting set definitions for CVA/market risk |
| `netting_set_link` | Netting set membership |
| `stress_test_breach` | Stress test breach tracking |

### Section C: New Tables Needed

#### New L1 Tables

**1. `risk_factor_type_dim`** -- Classification of market risk factors

| Field | Type | Notes |
|-------|------|-------|
| `risk_factor_type_id` | BIGINT (PK) | |
| `risk_factor_type_code` | VARCHAR(30) | EQ, IR, FX, CS, CMDTY |
| `risk_factor_type_name` | VARCHAR(500) | e.g., "Equity", "Interest Rate" |
| `frtb_risk_class` | VARCHAR(64) | FRTB risk class mapping |
| `created_ts` | TIMESTAMP | |
| `updated_ts` | TIMESTAMP | |

SCD Type: SCD-0 (fixed reference). Category: Market Risk.

**2. `var_model_config`** -- VaR model parameters

| Field | Type | Notes |
|-------|------|-------|
| `var_model_id` | BIGINT (PK) | |
| `var_model_code` | VARCHAR(30) | e.g., HIST_99_1D, MC_99_10D |
| `var_model_name` | VARCHAR(500) | |
| `methodology` | VARCHAR(64) | HISTORICAL, MONTE_CARLO, PARAMETRIC |
| `confidence_level_pct` | NUMERIC(10,6) | e.g., 99.0, 97.5 |
| `holding_period_days` | INTEGER | |
| `lookback_period_days` | INTEGER | |
| `is_regulatory_flag` | BOOLEAN | |
| `created_ts` | TIMESTAMP | |
| `updated_ts` | TIMESTAMP | |

SCD Type: SCD-1. Category: Market Risk.

#### New L2 Tables

**3. `market_data_snapshot`** -- Daily market data observations

| Field | Type | Notes |
|-------|------|-------|
| `market_data_id` | BIGSERIAL (PK) | |
| `instrument_id` | BIGINT (FK) | -> `l2.instrument_master` |
| `risk_factor_type_id` | BIGINT (FK) | -> `l1.risk_factor_type_dim` |
| `as_of_date` | DATE | |
| `close_price_value` | NUMERIC(12,6) | |
| `mid_price_value` | NUMERIC(12,6) | |
| `bid_price_value` | NUMERIC(12,6) | |
| `ask_price_value` | NUMERIC(12,6) | |
| `implied_vol_pct` | NUMERIC(10,6) | |
| `currency_code` | VARCHAR(20) (FK) | -> `l1.currency_dim` |
| `source_system_id` | BIGINT (FK) | -> `l1.source_system_registry` |
| `created_ts` | TIMESTAMP | |

SCD Type: Snapshot. Category: Market Data.

**4. `position_market_risk_snapshot`** -- Position-level risk sensitivities (Greeks)

| Field | Type | Notes |
|-------|------|-------|
| `position_id` | BIGINT (FK, PK) | -> `l2.position` |
| `as_of_date` | DATE (PK) | |
| `delta_value` | NUMERIC(12,6) | |
| `gamma_value` | NUMERIC(12,6) | |
| `vega_value` | NUMERIC(12,6) | |
| `theta_value` | NUMERIC(12,6) | |
| `dv01_value` | NUMERIC(12,6) | |
| `cs01_value` | NUMERIC(12,6) | |
| `currency_code` | VARCHAR(20) (FK) | -> `l1.currency_dim` |
| `created_ts` | TIMESTAMP | |

SCD Type: Snapshot. Category: Market Risk. PK: (position_id, as_of_date).

**5. `var_result_snapshot`** -- VaR results from the risk engine

| Field | Type | Notes |
|-------|------|-------|
| `var_result_id` | BIGSERIAL (PK) | |
| `var_model_id` | BIGINT (FK) | -> `l1.var_model_config` |
| `position_id` | BIGINT (FK, nullable) | -> `l2.position` |
| `netting_set_id` | BIGINT (FK, nullable) | -> `l2.netting_set` |
| `legal_entity_id` | BIGINT (FK) | -> `l2.legal_entity` |
| `as_of_date` | DATE | |
| `var_amt` | NUMERIC(20,4) | |
| `stressed_var_amt` | NUMERIC(20,4) | |
| `expected_shortfall_amt` | NUMERIC(20,4) | |
| `currency_code` | VARCHAR(20) (FK) | -> `l1.currency_dim` |
| `created_ts` | TIMESTAMP | |

SCD Type: Snapshot. Category: Market Risk.

**6. `pnl_observation`** -- Daily P&L from trading systems

| Field | Type | Notes |
|-------|------|-------|
| `pnl_observation_id` | BIGSERIAL (PK) | |
| `position_id` | BIGINT (FK) | -> `l2.position` |
| `as_of_date` | DATE | |
| `realized_pnl_amt` | NUMERIC(20,4) | |
| `unrealized_pnl_amt` | NUMERIC(20,4) | |
| `total_pnl_amt` | NUMERIC(20,4) | |
| `currency_code` | VARCHAR(20) (FK) | -> `l1.currency_dim` |
| `created_ts` | TIMESTAMP | |

SCD Type: Snapshot. Category: Market Risk.

#### New L3 Tables

These are for derived metrics that the calculation engine produces:

| L3 Table | Purpose | Tier |
|----------|---------|------|
| `var_aggregation_calc` | Aggregated VaR with diversification benefit (cannot simply sum position VaRs) | 1 |
| `pnl_attribution_calc` | P&L decomposition by risk factor type | 1 |
| `position_market_risk_calc` | Calculated overlay: risk-weighted notional, net Greeks per netting set | 1 |

---

## How Data Traverses Tables to Generate Metrics

This section shows exactly how data flows from source tables through joins to produce each metric at every rollup level.

### MKT-001: Value at Risk -- Data Flow

```
                    ┌─────────────────────────┐
                    │  L1. var_model_config    │
                    │  ─────────────────────   │
                    │  var_model_id (PK)       │
                    │  var_model_code          │  FILTER: var_model_code = 'HIST_99_1D'
                    │  confidence_level_pct    │
                    │  holding_period_days     │
                    └───────────┬──────────────┘
                                │ INNER JOIN on var_model_id
                                ▼
┌─────────────────────────────────────────────────────┐
│  L2. var_result_snapshot  (BASE TABLE)               │
│  ──────────────────────────────────────────────────  │
│  var_result_id (PK)                                  │
│  position_id ──────────────────┐                     │
│  var_model_id (FK) ────────────┘  FILTER: as_of_date │
│  as_of_date                                          │
│  ▶ var_amt  ◀──── THIS IS THE MEASURE               │
│  stressed_var_amt                                    │
│  expected_shortfall_amt                              │
└───────────┬─────────────────────────────────────────┘
            │ INNER JOIN on position_id
            ▼
┌──────────────────────────────────┐
│  L2. position                    │
│  ──────────────────────────────  │
│  position_id (PK)                │
│  counterparty_id (FK) ──────┐   │  DIMENSION: groups by counterparty
│  lob_segment_id (FK) ──────┐│   │  DIMENSION: feeds rollup hierarchy
└─────────────────────────────┼┼──┘
                              ││
              ┌───────────────┘│
              │                └────────────────────────────┐
              ▼                                             ▼
┌──────────────────────────┐    ┌──────────────────────────────────────┐
│  L2. counterparty        │    │  L1. enterprise_business_taxonomy    │
│  ────────────────────    │    │  ──────────────────────────────────  │
│  counterparty_id (PK)    │    │  managed_segment_id (PK)             │
│  legal_name              │    │  parent_segment_id (FK → self)       │
│                          │    │  segment_name                        │
│  Used at counterparty    │    │                                      │
│  rollup level            │    │  L3 desk → L2 portfolio → L1 segment │
└──────────────────────────┘    └──────────────────────────────────────┘
```

**Rollup at each level:**

| Level | dimension_key | SQL Logic | Result |
|-------|--------------|-----------|--------|
| **Facility** | `position_id` | Raw read: `vrs.var_amt` | $2.1M per position |
| **Counterparty** | `counterparty_id` | `SUM(var_amt) GROUP BY pos.counterparty_id` | $8.4M per counterparty |
| **Desk** | `managed_segment_id` (L3) | `SUM(var_amt) GROUP BY ebt.managed_segment_id` | $42M per desk |
| **Portfolio** | `managed_segment_id` (L2) | `SUM(var_amt) GROUP BY ebt_l2.managed_segment_id` via parent_segment_id | $125M per portfolio |
| **Business Segment** | `managed_segment_id` (L1) | `SUM(var_amt) GROUP BY ebt_l1.managed_segment_id` via grandparent | $310M per segment |

### MKT-002: Daily P&L -- Data Flow

```
┌──────────────────────────────────────┐
│  L2. pnl_observation  (BASE TABLE)   │
│  ──────────────────────────────────  │
│  pnl_observation_id (PK)             │
│  position_id (FK) ──────────┐        │  FILTER: as_of_date
│  as_of_date                  │        │
│  realized_pnl_amt            │        │
│  unrealized_pnl_amt          │        │
│  ▶ total_pnl_amt  ◀── MEASURE       │
└──────────────────────────────┼───────┘
                               │ INNER JOIN on position_id
                               ▼
                ┌──────────────────────────────┐
                │  L2. position                │
                │  ──────────────────────────  │
                │  position_id (PK)            │
                │  counterparty_id ──► rollup  │
                │  lob_segment_id ──► rollup   │
                └──────────────┬───────────────┘
                               │ LEFT JOIN on lob_segment_id
                               ▼
                ┌──────────────────────────────────────┐
                │  L1. enterprise_business_taxonomy    │
                │  Self-join chain for hierarchy:       │
                │  ebt_l3 (desk) → ebt_l2 (portfolio)  │
                │    → ebt_l1 (business segment)       │
                └──────────────────────────────────────┘
```

P&L uses a simpler flow than VaR -- no model config filter needed. Just raw P&L from `pnl_observation`, joined to `position` for organizational grouping, then rolled up through the taxonomy hierarchy.

### Ingredient Fields Generated

When `npm run calc:sync` processes the YAML, it auto-generates ingredient fields for the catalogue. For MKT-001 (VaR), the ingredient fields would be:

| Layer | Table | Field | Role | Data Type |
|-------|-------|-------|------|-----------|
| L2 | `var_result_snapshot` | `var_amt` | MEASURE | NUMERIC(20,4) |
| L2 | `var_result_snapshot` | `position_id` | JOIN_KEY | BIGINT |
| L2 | `var_result_snapshot` | `as_of_date` | FILTER | DATE |
| L2 | `position` | `counterparty_id` | DIMENSION | BIGINT |
| L2 | `position` | `lob_segment_id` | DIMENSION | BIGINT |
| L1 | `var_model_config` | `var_model_code` | FILTER | VARCHAR(30) |
| L1 | `enterprise_business_taxonomy` | `managed_segment_id` | DIMENSION | BIGINT |

These ingredient fields appear in the metric library UI under the "Ingredients" tab, showing users exactly which atomic L1/L2 fields feed the metric.

---

## Domain Registration

Add to `data/metric-library/domains.json`:

```json
{
  "domain_id": "market-risk",
  "domain_name": "Market Risk & Trading",
  "description": "Metrics related to VaR, sensitivities, P&L, and market risk factor analysis",
  "color": "#0288D1",
  "icon": "TrendingDown"
}
```

Add to `data/l1-table-meta.ts`:
```typescript
{ name: 'risk_factor_type_dim', scd: 'SCD-0', category: 'Market Risk' },
{ name: 'var_model_config', scd: 'SCD-1', category: 'Market Risk' },
```

Add to `data/l2-table-meta.ts`:
```typescript
{ name: 'market_data_snapshot', scd: 'Snapshot', category: 'Market Data' },
{ name: 'position_market_risk_snapshot', scd: 'Snapshot', category: 'Market Risk' },
{ name: 'var_result_snapshot', scd: 'Snapshot', category: 'Market Risk' },
{ name: 'pnl_observation', scd: 'Snapshot', category: 'Market Risk' },
```

---

## Sample Metric YAML: MKT-001 (Value at Risk)

File: `scripts/calc_engine/metrics/market-risk/MKT-001.yaml`

```yaml
# ═══════════════════════════════════════════════════════════════
# GSIB Metric Definition
# Value at Risk (99% 1-Day Historical)
# ═══════════════════════════════════════════════════════════════

# ── IDENTIFICATION ──────────────────────────────────────────
metric_id: "MKT-001"
name: "Value at Risk (99% 1D Historical)"
version: "1.0.0"
owner: "market-risk"
status: DRAFT
effective_date: "2026-01-01"
supersedes: null

# ── CLASSIFICATION ──────────────────────────────────────────
domain: "market-risk"
sub_domain: "var"
metric_class: CALCULATED
direction: LOWER_BETTER
unit_type: CURRENCY
display_format: "$,.0f"
description: >
  99th percentile Value at Risk using historical simulation with a 1-day
  holding period. Measures the maximum expected loss over a single trading
  day at 99% confidence. At the position level, reads raw VaR from the
  risk engine output (var_result_snapshot). At higher rollup levels, sums
  position-level VaR as a conservative approximation (actual portfolio VaR
  requires correlation modeling via an escape-hatch calculator).

# ── REGULATORY REFERENCES ───────────────────────────────────
regulatory_references:
  - framework: "Basel III"
    section: "MAR33"
    description: "Internal models approach — VaR backtesting and capital charge"
  - framework: "FRTB"
    section: "MAR33.9"
    description: "Expected shortfall replacing VaR for capital, but VaR retained for backtesting"

# ── SOURCE TABLES ───────────────────────────────────────────
source_tables:
  - schema: l2
    table: var_result_snapshot
    alias: vrs
    join_type: BASE
    fields:
      - name: var_result_id
        role: JOIN_KEY
      - name: position_id
        role: JOIN_KEY
      - name: as_of_date
        role: FILTER
      - name: var_amt
        role: MEASURE
        description: "99% 1-day VaR amount in reporting currency"
      - name: var_model_id
        role: FILTER
  - schema: l2
    table: position
    alias: pos
    join_type: INNER
    join_on: "pos.position_id = vrs.position_id"
    fields:
      - name: position_id
        role: JOIN_KEY
      - name: counterparty_id
        role: DIMENSION
      - name: lob_segment_id
        role: DIMENSION
  - schema: l1
    table: var_model_config
    alias: vmc
    join_type: INNER
    join_on: "vmc.var_model_id = vrs.var_model_id"
    fields:
      - name: var_model_id
        role: FILTER
      - name: var_model_code
        role: FILTER
  - schema: l1
    table: enterprise_business_taxonomy
    alias: ebt
    join_type: LEFT
    join_on: "ebt.managed_segment_id = pos.lob_segment_id"
    fields:
      - name: managed_segment_id
        role: DIMENSION
      - name: parent_segment_id
        role: DIMENSION

# ── LEVEL FORMULAS ──────────────────────────────────────────
levels:
  facility:
    aggregation_type: RAW
    formula_text: >
      Position-level VaR as reported by the risk engine for the 99% 1-day
      historical simulation model.
    formula_sql: |
      SELECT
        vrs.position_id                AS dimension_key,
        vrs.var_amt                    AS metric_value
      FROM l2.var_result_snapshot vrs
      INNER JOIN l1.var_model_config vmc
        ON vmc.var_model_id = vrs.var_model_id
       AND vmc.var_model_code = 'HIST_99_1D'
      WHERE vrs.as_of_date = :as_of_date
        AND vrs.position_id IS NOT NULL

  counterparty:
    aggregation_type: SUM
    formula_text: >
      SUM of position-level VaR per counterparty. Conservative approximation
      (ignores diversification benefit between positions).
    formula_sql: |
      SELECT
        pos.counterparty_id            AS dimension_key,
        SUM(vrs.var_amt)               AS metric_value
      FROM l2.var_result_snapshot vrs
      INNER JOIN l2.position pos
        ON pos.position_id = vrs.position_id
      INNER JOIN l1.var_model_config vmc
        ON vmc.var_model_id = vrs.var_model_id
       AND vmc.var_model_code = 'HIST_99_1D'
      WHERE vrs.as_of_date = :as_of_date
        AND vrs.position_id IS NOT NULL
      GROUP BY pos.counterparty_id

  desk:
    aggregation_type: SUM
    formula_text: >
      SUM of position-level VaR per L3 desk segment.
    formula_sql: |
      SELECT
        ebt.managed_segment_id         AS dimension_key,
        SUM(vrs.var_amt)               AS metric_value
      FROM l2.var_result_snapshot vrs
      INNER JOIN l2.position pos
        ON pos.position_id = vrs.position_id
      INNER JOIN l1.var_model_config vmc
        ON vmc.var_model_id = vrs.var_model_id
       AND vmc.var_model_code = 'HIST_99_1D'
      LEFT JOIN l1.enterprise_business_taxonomy ebt
        ON ebt.managed_segment_id = pos.lob_segment_id
      WHERE vrs.as_of_date = :as_of_date
        AND vrs.position_id IS NOT NULL
      GROUP BY ebt.managed_segment_id

  portfolio:
    aggregation_type: SUM
    formula_text: >
      SUM of position-level VaR per L2 portfolio segment.
    formula_sql: |
      SELECT
        ebt_l2.managed_segment_id      AS dimension_key,
        SUM(vrs.var_amt)               AS metric_value
      FROM l2.var_result_snapshot vrs
      INNER JOIN l2.position pos
        ON pos.position_id = vrs.position_id
      INNER JOIN l1.var_model_config vmc
        ON vmc.var_model_id = vrs.var_model_id
       AND vmc.var_model_code = 'HIST_99_1D'
      LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
        ON ebt_l3.managed_segment_id = pos.lob_segment_id
      LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
        ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
      WHERE vrs.as_of_date = :as_of_date
        AND vrs.position_id IS NOT NULL
      GROUP BY ebt_l2.managed_segment_id

  business_segment:
    aggregation_type: SUM
    formula_text: >
      SUM of position-level VaR per L1 business segment.
    formula_sql: |
      SELECT
        ebt_l1.managed_segment_id      AS dimension_key,
        SUM(vrs.var_amt)               AS metric_value
      FROM l2.var_result_snapshot vrs
      INNER JOIN l2.position pos
        ON pos.position_id = vrs.position_id
      INNER JOIN l1.var_model_config vmc
        ON vmc.var_model_id = vrs.var_model_id
       AND vmc.var_model_code = 'HIST_99_1D'
      LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
        ON ebt_l3.managed_segment_id = pos.lob_segment_id
      LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
        ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
      LEFT JOIN l1.enterprise_business_taxonomy ebt_l1
        ON ebt_l1.managed_segment_id = ebt_l2.parent_segment_id
      WHERE vrs.as_of_date = :as_of_date
        AND vrs.position_id IS NOT NULL
      GROUP BY ebt_l1.managed_segment_id

# ── DEPENDENCIES ────────────────────────────────────────────
depends_on: []

# ── OUTPUT ──────────────────────────────────────────────────
output:
  table: metric_result
  additional_tables:
    - schema: l3
      table: var_aggregation_calc
      column: var_amt

# ── VALIDATION RULES ────────────────────────────────────────
validations:
  - rule_id: "MKT-001-V01"
    type: NOT_NULL
    description: "VaR must not be null for positions with risk engine output"
    severity: ERROR
  - rule_id: "MKT-001-V02"
    type: NON_NEGATIVE
    description: "VaR values must be >= 0 (loss is expressed as positive)"
    severity: ERROR
  - rule_id: "MKT-001-V03"
    type: RECONCILIATION
    description: "Position-level VaR sums must reconcile across rollup levels"
    severity: ERROR
    params:
      levels_to_compare: [facility, counterparty, desk, portfolio, business_segment]
      tolerance_pct: 0.01
  - rule_id: "MKT-001-V04"
    type: PERIOD_OVER_PERIOD
    description: "Flag VaR changes > 25% vs prior day (potential data issue or market event)"
    severity: WARNING
    params:
      max_change_pct: 25.0

# ── CATALOGUE ───────────────────────────────────────────────
catalogue:
  item_id: "MET-201"
  abbreviation: "VAR"
  insight: >
    Measures the bank's maximum expected trading loss at 99% confidence
    over one day. Rising VaR indicates increasing market risk exposure.
    Compare against risk limits and stressed VaR (MKT-003) to assess
    whether the trading book is within risk appetite.
  rollup_strategy: "direct-sum"
  primary_value_field: "var_amt"

# ── METADATA ────────────────────────────────────────────────
tags:
  - "var"
  - "market-risk"
  - "trading"
  - "frtb"
  - "risk-measurement"
dashboard_pages: []
legacy_metric_ids: []
```

---

## Sample Metric YAML: MKT-002 (Daily P&L)

File: `scripts/calc_engine/metrics/market-risk/MKT-002.yaml`

This is a simpler "direct-sum" metric for contrast with VaR above.

```yaml
# ═══════════════════════════════════════════════════════════════
# GSIB Metric Definition
# Total Daily P&L
# ═══════════════════════════════════════════════════════════════

metric_id: "MKT-002"
name: "Total Daily P&L"
version: "1.0.0"
owner: "market-risk"
status: DRAFT
effective_date: "2026-01-01"
supersedes: null

domain: "market-risk"
sub_domain: "pnl"
metric_class: SOURCED
direction: NEUTRAL
unit_type: CURRENCY
display_format: "$,.0f"
description: >
  Total daily profit and loss (realized + unrealized) across the trading
  book. Sourced directly from trading system P&L observations. Positive
  values indicate profit, negative values indicate loss.

regulatory_references:
  - framework: "Basel III"
    section: "MAR99"
    description: "P&L attribution and backtesting requirements for IMA"

source_tables:
  - schema: l2
    table: pnl_observation
    alias: pnl
    join_type: BASE
    fields:
      - name: position_id
        role: JOIN_KEY
      - name: as_of_date
        role: FILTER
      - name: total_pnl_amt
        role: MEASURE
        description: "Total P&L (realized + unrealized) in reporting currency"
  - schema: l2
    table: position
    alias: pos
    join_type: INNER
    join_on: "pos.position_id = pnl.position_id"
    fields:
      - name: position_id
        role: JOIN_KEY
      - name: counterparty_id
        role: DIMENSION
      - name: lob_segment_id
        role: DIMENSION
  - schema: l1
    table: enterprise_business_taxonomy
    alias: ebt
    join_type: LEFT
    join_on: "ebt.managed_segment_id = pos.lob_segment_id"
    fields:
      - name: managed_segment_id
        role: DIMENSION
      - name: parent_segment_id
        role: DIMENSION

levels:
  facility:
    aggregation_type: RAW
    formula_text: "Position-level total P&L as recorded by the trading system."
    formula_sql: |
      SELECT
        pnl.position_id                AS dimension_key,
        pnl.total_pnl_amt             AS metric_value
      FROM l2.pnl_observation pnl
      WHERE pnl.as_of_date = :as_of_date

  counterparty:
    aggregation_type: SUM
    formula_text: "SUM of position P&L per counterparty."
    formula_sql: |
      SELECT
        pos.counterparty_id            AS dimension_key,
        SUM(pnl.total_pnl_amt)        AS metric_value
      FROM l2.pnl_observation pnl
      INNER JOIN l2.position pos
        ON pos.position_id = pnl.position_id
      WHERE pnl.as_of_date = :as_of_date
      GROUP BY pos.counterparty_id

  desk:
    aggregation_type: SUM
    formula_text: "SUM of position P&L per L3 desk segment."
    formula_sql: |
      SELECT
        ebt.managed_segment_id         AS dimension_key,
        SUM(pnl.total_pnl_amt)        AS metric_value
      FROM l2.pnl_observation pnl
      INNER JOIN l2.position pos
        ON pos.position_id = pnl.position_id
      LEFT JOIN l1.enterprise_business_taxonomy ebt
        ON ebt.managed_segment_id = pos.lob_segment_id
      WHERE pnl.as_of_date = :as_of_date
      GROUP BY ebt.managed_segment_id

  portfolio:
    aggregation_type: SUM
    formula_text: "SUM of position P&L per L2 portfolio segment."
    formula_sql: |
      SELECT
        ebt_l2.managed_segment_id      AS dimension_key,
        SUM(pnl.total_pnl_amt)        AS metric_value
      FROM l2.pnl_observation pnl
      INNER JOIN l2.position pos
        ON pos.position_id = pnl.position_id
      LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
        ON ebt_l3.managed_segment_id = pos.lob_segment_id
      LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
        ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
      WHERE pnl.as_of_date = :as_of_date
      GROUP BY ebt_l2.managed_segment_id

  business_segment:
    aggregation_type: SUM
    formula_text: "SUM of position P&L per L1 business segment."
    formula_sql: |
      SELECT
        ebt_l1.managed_segment_id      AS dimension_key,
        SUM(pnl.total_pnl_amt)        AS metric_value
      FROM l2.pnl_observation pnl
      INNER JOIN l2.position pos
        ON pos.position_id = pnl.position_id
      LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
        ON ebt_l3.managed_segment_id = pos.lob_segment_id
      LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
        ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
      LEFT JOIN l1.enterprise_business_taxonomy ebt_l1
        ON ebt_l1.managed_segment_id = ebt_l2.parent_segment_id
      WHERE pnl.as_of_date = :as_of_date
      GROUP BY ebt_l1.managed_segment_id

depends_on: []

output:
  table: metric_result

validations:
  - rule_id: "MKT-002-V01"
    type: NOT_NULL
    description: "P&L must not be null for active trading positions"
    severity: ERROR
  - rule_id: "MKT-002-V02"
    type: RECONCILIATION
    description: "Position-level P&L sums must reconcile across rollup levels"
    severity: ERROR
    params:
      levels_to_compare: [facility, counterparty, desk, portfolio, business_segment]
      tolerance_pct: 0.01

catalogue:
  item_id: "MET-202"
  abbreviation: "PNL"
  insight: >
    Total daily P&L across the trading book. A key input for VaR
    backtesting and P&L attribution. Large swings may indicate
    concentrated risk or market events requiring investigation.
  rollup_strategy: "direct-sum"
  primary_value_field: "total_pnl_amt"

tags:
  - "pnl"
  - "market-risk"
  - "trading"
  - "backtesting"
dashboard_pages: []
legacy_metric_ids: []
```

---

## What the Pipeline Produces

After running the pipeline:

```bash
# 1. Generate catalogue entries and Excel from YAML
npm run calc:sync

# 2. Validate definitions
npm run validate

# 3. (Optional) Generate demo walkthrough data
npm run calc:demo -- --metric MET-201 --persist --force
```

### Auto-Generated Catalogue Entry

`npm run calc:sync` parses your YAML and creates a full `CatalogueItem` in `data/metric-library/catalogue.json`. For MET-201 (VaR), it generates:

- **Ingredient fields** -- extracted from `source_tables[].fields[]` where `role: MEASURE`. Lists every atomic L1/L2 field the metric reads (see table above).
- **Level definitions** -- one per rollup level (facility, counterparty, desk, portfolio, lob), each with:
  - `sourcing_type`: Raw, Calc, Agg, or Avg
  - `level_logic`: auto-generated structured pseudocode from the SQL, e.g.:
    ```
    1. LOAD  l2.var_result_snapshot (vrs)
       WHERE vrs.as_of_date = :as_of_date
    2. JOIN  l1.var_model_config (vmc)
       ON vmc.var_model_id = vrs.var_model_id
       AND vmc.var_model_code = 'HIST_99_1D'
    3. GROUP BY vrs.position_id
    4. COMPUTE metric_value = vrs.var_amt
    ```
  - `source_references`: which ingredient fields are used at this level
- **Visualization config** -- auto-generated in `data/metric-library/visualization-configs.json`:
  - `rollup_strategy`: "direct-sum"
  - `formula_decomposition`: numerator fields, result format
  - `worked_example_columns`: column headers and formatting for the demo table

### Demo Data (Interactive Walkthrough)

If you write a Python calculator (optional), `npm run calc:demo` generates demo walkthrough data. The demo shows 3-5 representative facilities with real metric values:

```json
{
  "facilities": [
    {
      "facility_id": "F-5001",
      "facility_name": "Global Macro Fund -- USD IR Swap Book",
      "counterparty_id": "CP-1001",
      "counterparty_name": "Global Macro Capital Partners",
      "desk_name": "Rates Trading Desk",
      "portfolio_name": "Fixed Income Trading",
      "lob_name": "Markets & Securities",
      "committed_amt": 500000000,
      "var_amt": 2100000,
      "extra_fields": {
        "var_model_code": "HIST_99_1D",
        "confidence_level_pct": 99.0,
        "holding_period_days": 1
      }
    }
  ]
}
```

This data powers the interactive walkthrough in `/metrics/library` -- users can step through the calculation at each rollup level and see how position-level values aggregate up.

### Files Modified by `calc:sync`

| File | What Gets Added |
|------|----------------|
| `data/metric-library/catalogue.json` | New CatalogueItem entries for MET-201 and MET-202 |
| `data/metrics_dimensions_filled.xlsx` | New rows for MKT-001 and MKT-002 with per-dimension formulas |
| `data/metric-library/visualization-configs.json` | Rollup strategy, formula decomposition, worked example columns |

After sync, your metrics appear in `/metrics/library` filtered by "Market Risk & Trading" domain.

---

## Lessons from the Capital Metrics Onboarding

The Capital & RWA stripe was the first to onboard beyond Credit Risk. Their migration (`sql/migrations/002-capital-metrics.sql`) is a useful precedent:

**What they added:**
- 2 new L1 tables (`basel_exposure_type_dim`, `regulatory_capital_requirement`)
- 1 new L2 table (`capital_position_snapshot`)
- 7 new L3 tables (RWA calc, binding constraints, capital consumption at 5 rollup levels)
- New fields on existing L2 tables (`facility_master` + `legal_entity_id`, `profit_center_code`)

**Patterns they used:**
- `IF NOT EXISTS` guards on CREATE TABLE for idempotent migrations
- `DO $$ BEGIN ... END $$` blocks for ALTER TABLE (adding columns to existing tables)
- `SET search_path TO l1, l2, l3, public` for cross-schema FK references
- Strict L3 convention: risk weights in L2, RWA amounts in L3

**What to watch out for:**
- If you add fields to existing L2 tables (like `facility_master`), use the `DO $$ IF NOT EXISTS` pattern
- Always run `npm run db:introspect` after migration to update the data dictionary
- Verify FK references resolve correctly before loading data

---

Next: [05 - Reference](05-reference.md)
