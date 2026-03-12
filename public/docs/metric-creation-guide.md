# Metric Creation Guide

This guide explains how to create new metrics for the banking data model using the Excel template.

---

## Quick Start

1. **Download the template** from `/metrics/library/upload` (click "Download Template")
2. **Fill it out** using the instructions below (or paste this guide + the DD Reference sheet into your AI)
3. **Upload** the filled template at `/metrics/library/upload`
4. **Review** the validation report and fix any issues
5. **Deploy** to add metrics to the data model

---

## Data Model Overview

The model has three layers:

| Layer | Purpose | Examples |
|-------|---------|---------|
| **L1** | Reference/dimension data (rarely changes) | `counterparty`, `facility_master`, `currency_dim` |
| **L2** | Atomic/raw data (snapshots, events) | `facility_exposure_snapshot`, `credit_event`, `position` |
| **L3** | Derived/calculated data (metrics, aggregations) | `exposure_metric_cube`, `facility_financial_calc` |

**Rollup hierarchy:** Facility → Counterparty → Desk (L3) → Portfolio (L2) → Business Segment (L1)

---

## Filling the Template

### Metrics Sheet

Each row defines one metric. Required fields:

| Field | What to fill | Example |
|-------|-------------|---------|
| `metric_id` | `DOMAIN-NNN` format. Domain prefix = EXP, RSK, PRC, PROF, CAP, AMD, REF | `EXP-050` |
| `name` | Human-readable name | `Loan-to-Value Ratio` |
| `domain` | One of: exposure, risk, pricing, profitability, capital, amendments, reference | `exposure` |
| `abbreviation` | Short name for UI display (2-8 chars) | `LTV` |
| `definition` | Business definition in 1-3 sentences | `Ratio of outstanding loan balance to the appraised value of collateral` |
| `generic_formula` | Human-readable formula | `drawn_amount / collateral_value * 100` |
| `unit_type` | CURRENCY, PERCENTAGE, RATIO, COUNT, RATE, BPS, DAYS, INDEX | `PERCENTAGE` |
| `direction` | HIGHER_BETTER, LOWER_BETTER, NEUTRAL | `LOWER_BETTER` |
| `metric_class` | SOURCED (read directly), CALCULATED (derived), HYBRID (mix) | `CALCULATED` |

Optional fields:

| Field | What to fill |
|-------|-------------|
| `insight` | Why this metric matters to the business |
| `formula_facility` | SQL SELECT for facility-level calculation |
| `formula_counterparty` | SQL SELECT for counterparty-level rollup |
| `formula_desk` | SQL SELECT for desk-level rollup |
| `formula_portfolio` | SQL SELECT for portfolio-level rollup |
| `formula_segment` | SQL SELECT for business segment rollup |
| `rollup_strategy` | How to aggregate: `direct-sum`, `sum-ratio`, `weighted-avg` |

### SourceFields Sheet

Each row maps a metric to a source field in the data dictionary.

| Field | What to fill | Example |
|-------|-------------|---------|
| `metric_id` | Must match a metric_id from the Metrics sheet | `EXP-050` |
| `layer` | L1, L2, or L3 | `L2` |
| `table` | Table name from the DD Reference sheet | `facility_exposure_snapshot` |
| `field` | Field name from the DD Reference sheet | `drawn_amount` |
| `role` | MEASURE (value used in formula), DIMENSION (grouping), FILTER (date/flag), JOIN_KEY (FK) | `MEASURE` |
| `description` | What this field represents in the formula | `Outstanding drawn balance` |

**Important:** Use exact table and field names from the DD Reference sheet. The validator will flag mismatches.

---

## SQL Formula Conventions

SQL formulas should:
- Return exactly two columns: `dimension_key` and `metric_value`
- Use bind parameter `:as_of_date` for date filtering
- Use schema-qualified table names: `l1.table_name`, `l2.table_name`
- Start with `SELECT`

### Example: Simple Sum (Facility Level)
```sql
SELECT
  fes.facility_id AS dimension_key,
  fes.drawn_amount AS metric_value
FROM l2.facility_exposure_snapshot fes
WHERE fes.as_of_date = :as_of_date
```

### Example: Ratio (Facility Level)
```sql
SELECT
  fes.facility_id AS dimension_key,
  CASE WHEN cs.current_valuation_usd = 0 THEN NULL
       ELSE fes.drawn_amount / cs.current_valuation_usd * 100.0
  END AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l2.collateral_snapshot cs ON cs.facility_id = fes.facility_id
WHERE fes.as_of_date = :as_of_date
```

### Example: Counterparty Rollup
```sql
SELECT
  fm.counterparty_id AS dimension_key,
  SUM(fes.drawn_amount) AS metric_value
FROM l2.facility_exposure_snapshot fes
INNER JOIN l2.facility_master fm ON fm.facility_id = fes.facility_id
WHERE fes.as_of_date = :as_of_date
GROUP BY fm.counterparty_id
```

---

## Rollup Strategies

| Strategy | When to use | How rollup works |
|----------|------------|-----------------|
| `direct-sum` | Additive metrics (amounts, counts) | SUM values at each level |
| `sum-ratio` | Ratio metrics (LTV, coverage) | SUM(numerator) / SUM(denominator) at each level |
| `weighted-avg` | Weighted metrics (rates, scores) | Weighted average by exposure at each level |

---

## Using AI to Help Fill the Template

Paste this prompt into ChatGPT, Claude, or any AI assistant:

```
I need to create banking metrics for a GSIB data model. Here are the available tables and fields from our data dictionary:

[Paste the contents of the "DD Reference" sheet here]

I want to create the following metric(s):
[Describe what you want to calculate]

Please fill out an Excel template with these sheets:

**Metrics sheet columns:** metric_id, name, domain, abbreviation, definition, generic_formula, unit_type, direction, metric_class, insight, formula_facility, formula_counterparty, formula_desk, formula_portfolio, formula_segment, rollup_strategy

**SourceFields sheet columns:** metric_id, layer, table, field, role, description

Rules:
- metric_id format: DOMAIN-NNN (e.g., EXP-050)
- SQL formulas must return dimension_key and metric_value columns
- Use :as_of_date as the date parameter
- Use schema-qualified table names (l1.table, l2.table)
- Source fields must use exact table/field names from the data dictionary
- Valid domains: exposure, risk, pricing, profitability, capital, amendments, reference
```

---

## Common Tables for Metrics

| Table | Layer | Key Fields | Use For |
|-------|-------|------------|---------|
| `facility_exposure_snapshot` | L2 | drawn_amount, committed_facility_amt, gross_exposure_usd | Exposure metrics |
| `facility_master` | L2 | facility_id, counterparty_id, lob_segment_id | Joining to hierarchy |
| `counterparty` | L1 | counterparty_id, legal_name, risk_rating_code | Counterparty info |
| `collateral_snapshot` | L2 | current_valuation_usd, facility_id | Collateral/LTV metrics |
| `facility_financial_calc` | L3 | dscr_value, ltv_pct, net_income_amt | Pre-calculated ratios |
| `credit_event` | L2 | event_type_code, severity_code | Risk event metrics |
| `facility_risk_snapshot` | L2 | risk_rating_code, pd_value | Risk rating metrics |
| `position` | L2 | balance_amount, product_code | Position-level data |
| `enterprise_business_taxonomy` | L1 | managed_segment_id, parent_segment_id | Desk/Portfolio/LOB rollup |
