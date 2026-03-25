---
description: "DQ Dashboard Readiness — validates that L2 data will produce correct, diverse, non-null dashboard views across all drill-down dimensions and rollup levels"
---

# DQ Dashboard Readiness

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You validate that the L2 data will produce **correct dashboard outputs** when aggregated across every drill-down dimension. This agent catches issues that pass individual table checks but break dashboards: JOIN fan-out, rollup concentration, NULL dimension keys, and Simpson's paradox risks.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `CLAUDE.md` sections on "EBT Hierarchy Rules", "Rollup hierarchy", and "L2 Data Quality Patterns"
3. If a baseline exists at `.claude/audit/dq-baselines/dashboard-readiness.json`, load for delta

### Dashboard Dimensions (what users GROUP BY)

| Dimension | Source Column | Join Path | Dashboard View |
|-----------|-------------|-----------|----------------|
| Business Segment | `fm.lob_segment_id` | fm → ebt_desk → ebt_port → ebt_seg | Bar chart: exposure by segment |
| Facility Type | `fm.facility_type_id` | fm → facility_type_dim | Bar chart: exposure by product |
| Legal Entity | `fm.legal_entity_id` | fm → legal_entity | Table: capital by entity |
| Entity Type | `c.entity_type_code` | fm → counterparty → entity_type_dim | Pie chart: counterparty mix |
| Country | `c.country_code` | fm → counterparty → country_dim | Map: geographic exposure |
| Currency | `fes.currency_code` | fes → currency_dim | Table: FX exposure |
| Rating Grade | `cro.rating_value` | cro → rating_scale_dim | Heatmap: rating migration |
| DPD Bucket | `fds.dpd_bucket_code` | fds → dpd_bucket_dim | Stacked bar: delinquency |
| Internal Rating | `frs.internal_risk_rating` | frs (inline) | Distribution chart |
| Collateral Type | `cs.crm_type_code` | cs (inline) | Pie chart: collateral mix |

---

## 2. Check Procedures

### 2A. JOIN Fan-Out Detection (CRITICAL)

Duplicate rows in lookup/rate tables cause metric values to be multiplied when JOINed. This is the #1 silent dashboard-corruption issue.

```sql
-- FX rate duplicates: causes exposure to be multiplied by N for each duplicate
SELECT 'fx_rate_fanout' AS check_name,
  from_currency_code, to_currency_code, as_of_date, COUNT(*) AS dupes
FROM l2.fx_rate
GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;
-- SEVERITY: CRITICAL if any rows returned. Each duplicate multiplies every JOINed exposure row.
-- FIX: DELETE FROM l2.fx_rate WHERE fx_rate_id NOT IN (SELECT MIN(fx_rate_id) FROM l2.fx_rate GROUP BY from_currency_code, to_currency_code, as_of_date)

-- Counterparty rating duplicates: causes counterparty-level metrics to fan out
SELECT 'cro_fanout' AS check_name,
  counterparty_id, as_of_date, rating_agency, COUNT(*) AS dupes
FROM l2.counterparty_rating_observation
GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;
-- SEVERITY: HIGH if any rows returned.

-- Collateral snapshot duplicates: causes collateral coverage to be overstated
SELECT 'cs_fanout' AS check_name,
  collateral_asset_id, as_of_date, COUNT(*) AS dupes
FROM l2.collateral_snapshot
GROUP BY 1, 2 HAVING COUNT(*) > 1;

-- Lender allocation duplicates: causes bank_share to be multiplied
SELECT 'fla_fanout' AS check_name,
  facility_id, COUNT(DISTINCT lender_allocation_id) AS allocs
FROM l2.facility_lender_allocation
GROUP BY 1 HAVING COUNT(DISTINCT lender_allocation_id) > 1;
-- NOTE: Multiple allocations per facility are VALID for syndicated deals.
-- Only flag if the SUM(bank_share_pct) > 1.0 for a facility (over-allocation).
```

### 2B. Rollup Dimension Concentration (HIGH)

A dimension is useless for dashboard drill-down if >90% of exposure concentrates in one bucket.

```sql
-- For each dashboard dimension, check concentration
-- Business Segment concentration
WITH seg_exposure AS (
  SELECT COALESCE(ebt_seg.segment_name, '(NULL)') AS segment,
    SUM(fes.drawn_amount) AS drawn
  FROM l2.facility_exposure_snapshot fes
  JOIN l2.facility_master fm ON fes.facility_id = fm.facility_id
  LEFT JOIN l1.enterprise_business_taxonomy ebt ON ebt.managed_segment_id = fm.lob_segment_id AND ebt.is_current_flag = 'Y'
  LEFT JOIN l1.enterprise_business_taxonomy ebt_port ON ebt_port.managed_segment_id = ebt.parent_segment_id AND ebt_port.is_current_flag = 'Y'
  LEFT JOIN l1.enterprise_business_taxonomy ebt_seg ON ebt_seg.managed_segment_id = ebt_port.parent_segment_id AND ebt_seg.is_current_flag = 'Y'
  WHERE fes.as_of_date = (SELECT MAX(as_of_date) FROM l2.facility_exposure_snapshot)
  GROUP BY ebt_seg.segment_name
)
SELECT 'segment_concentration' AS check_name,
  COUNT(DISTINCT segment) AS distinct_segments,
  MAX(drawn) * 100.0 / NULLIF(SUM(drawn), 0) AS max_concentration_pct
FROM seg_exposure;
-- SEVERITY: HIGH if distinct_segments < 3 or max_concentration_pct > 90%
-- SEVERITY: MEDIUM if distinct_segments < 5 or max_concentration_pct > 70%

-- Facility Type concentration
SELECT 'ftype_concentration' AS check_name,
  COUNT(DISTINCT fm.facility_type_id) AS distinct_types,
  MAX(cnt) * 100.0 / SUM(cnt) AS max_concentration_pct
FROM (
  SELECT facility_type_id, COUNT(*) AS cnt FROM l2.facility_master GROUP BY 1
) fm;
-- SEVERITY: CRITICAL if distinct_types = 1 (the "Unknown type" bug)
-- SEVERITY: HIGH if max_concentration_pct > 80%

-- Legal Entity concentration
SELECT 'le_concentration' AS check_name,
  COUNT(DISTINCT fm.legal_entity_id) AS distinct_entities,
  SUM(CASE WHEN fm.legal_entity_id IS NULL THEN 1 ELSE 0 END) AS null_count,
  COUNT(*) AS total
FROM l2.facility_master fm;
-- SEVERITY: CRITICAL if null_count = total (ALL NULL — capital metrics fail)
-- SEVERITY: HIGH if null_count > total * 0.5

-- Entity Type concentration
SELECT 'etype_concentration' AS check_name,
  COUNT(DISTINCT c.entity_type_code) AS distinct_types,
  MAX(cnt) * 100.0 / SUM(cnt) AS max_concentration_pct
FROM (
  SELECT entity_type_code, COUNT(*) AS cnt FROM l2.counterparty GROUP BY 1
) c;

-- Rating Value diversity (no placeholders)
SELECT 'rating_diversity' AS check_name,
  COUNT(DISTINCT rating_value) AS distinct_ratings,
  SUM(CASE WHEN rating_value IN ('0', '', 'N/A', 'UNRATED') THEN 1 ELSE 0 END) AS placeholder_count,
  COUNT(*) AS total
FROM l2.counterparty_rating_observation;
-- SEVERITY: CRITICAL if placeholder_count > total * 0.5

-- Amendment Type diversity
SELECT 'amend_diversity' AS check_name,
  COUNT(DISTINCT amendment_type_code) AS distinct_types
FROM l2.amendment_event;
-- SEVERITY: MEDIUM if distinct_types < 3

-- Bank Share diversity (syndication)
SELECT 'syndication_diversity' AS check_name,
  COUNT(DISTINCT bank_share_pct) AS distinct_shares,
  SUM(CASE WHEN bank_share_pct = 1.0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS pct_sole_lender
FROM l2.facility_exposure_snapshot;
-- SEVERITY: MEDIUM if distinct_shares = 1 (all sole lender)
```

### 2C. EBT Hierarchy Integrity (CRITICAL)

Facilities on non-leaf EBT nodes cause double-counting in rollup metrics.

```sql
-- Non-leaf check
SELECT 'ebt_non_leaf' AS check_name,
  COUNT(*) AS facilities_on_non_leaf
FROM l2.facility_master fm
JOIN l1.enterprise_business_taxonomy ebt ON fm.lob_segment_id = ebt.managed_segment_id
WHERE ebt.managed_segment_id IN (
  SELECT DISTINCT parent_segment_id FROM l1.enterprise_business_taxonomy WHERE parent_segment_id IS NOT NULL
);
-- SEVERITY: CRITICAL if > 0

-- Broken hierarchy chain (leaf with no path to root)
WITH RECURSIVE chain AS (
  SELECT managed_segment_id, parent_segment_id, 1 AS depth
  FROM l1.enterprise_business_taxonomy WHERE parent_segment_id IS NULL AND is_current_flag = 'Y'
  UNION ALL
  SELECT e.managed_segment_id, e.parent_segment_id, c.depth + 1
  FROM l1.enterprise_business_taxonomy e
  JOIN chain c ON e.parent_segment_id = c.managed_segment_id
  WHERE e.is_current_flag = 'Y' AND c.depth < 10
)
SELECT 'ebt_orphan_leaves' AS check_name,
  COUNT(*) AS orphan_facilities
FROM l2.facility_master fm
WHERE fm.lob_segment_id NOT IN (SELECT managed_segment_id FROM chain);
-- SEVERITY: HIGH if > 0 (facilities can't roll up to any segment)
```

### 2D. Cross-Table Date Alignment (HIGH)

Metrics that JOIN multiple snapshot tables will silently DROP rows when tables have different date coverage.

```sql
-- Compare date sets across all snapshot tables
WITH date_sets AS (
  SELECT 'fes' AS tbl, array_agg(DISTINCT as_of_date ORDER BY as_of_date) AS dates FROM l2.facility_exposure_snapshot
  UNION ALL SELECT 'frs', array_agg(DISTINCT as_of_date ORDER BY as_of_date) FROM l2.facility_risk_snapshot
  UNION ALL SELECT 'fps', array_agg(DISTINCT as_of_date ORDER BY as_of_date) FROM l2.facility_pricing_snapshot
  UNION ALL SELECT 'fds', array_agg(DISTINCT as_of_date ORDER BY as_of_date) FROM l2.facility_delinquency_snapshot
  UNION ALL SELECT 'ffs', array_agg(DISTINCT as_of_date ORDER BY as_of_date) FROM l2.facility_financial_snapshot
  UNION ALL SELECT 'fpf', array_agg(DISTINCT as_of_date ORDER BY as_of_date) FROM l2.facility_profitability_snapshot
  UNION ALL SELECT 'fx', array_agg(DISTINCT as_of_date ORDER BY as_of_date) FROM l2.fx_rate
)
SELECT a.tbl AS table_a, b.tbl AS table_b,
  a.dates AS dates_a, b.dates AS dates_b,
  CASE WHEN a.dates = b.dates THEN 'ALIGNED' ELSE 'MISALIGNED' END AS status
FROM date_sets a CROSS JOIN date_sets b
WHERE a.tbl < b.tbl AND a.dates != b.dates;
-- SEVERITY: HIGH for any MISALIGNED pair involving fes+frs (core metric tables)
-- SEVERITY: MEDIUM for fes+fx misalignment (blocks FX conversion on some dates)
```

### 2E. FX Coverage for Non-USD Currencies (HIGH)

Non-USD facilities without FX rates produce NULL in USD-denominated rollups.

```sql
SELECT 'fx_coverage' AS check_name,
  fes.currency_code,
  COUNT(DISTINCT fes.facility_id) AS facilities,
  SUM(CASE WHEN fx.rate IS NULL THEN 1 ELSE 0 END) AS missing_fx_rows,
  COUNT(*) AS total_rows
FROM l2.facility_exposure_snapshot fes
LEFT JOIN l2.fx_rate fx ON fx.from_currency_code = fes.currency_code
  AND fx.to_currency_code = 'USD' AND fx.as_of_date = fes.as_of_date
WHERE fes.currency_code != 'USD'
GROUP BY fes.currency_code;
-- SEVERITY: CRITICAL if any currency has missing_fx_rows > 0
```

### 2F. Collateral Haircut Basel III Compliance (HIGH)

Zero haircuts overstate eligible collateral, inflating LTV and understating LGD.

```sql
SELECT 'haircut_compliance' AS check_name,
  COUNT(*) AS total_rows,
  SUM(CASE WHEN haircut_pct = 0 THEN 1 ELSE 0 END) AS zero_haircut_rows,
  ROUND(SUM(CASE WHEN haircut_pct = 0 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS pct_zero
FROM l2.collateral_snapshot;
-- SEVERITY: HIGH if pct_zero > 50% (Basel III requires supervisory haircuts)
-- SEVERITY: MEDIUM if pct_zero > 20%
```

### 2G. Weighted Average Correctness Risk (Simpson's Paradox)

Detect scenarios where simple AVG would give wrong results but no weighting column is available.

```sql
-- Check: are PD/LGD values properly weight-able? (need non-null drawn_amount as weight)
SELECT 'weight_availability' AS check_name,
  COUNT(*) AS total_join_rows,
  SUM(CASE WHEN fes.drawn_amount IS NULL OR fes.drawn_amount = 0 THEN 1 ELSE 0 END) AS zero_weight_rows,
  ROUND(SUM(CASE WHEN fes.drawn_amount IS NULL OR fes.drawn_amount = 0 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS pct_zero_weight
FROM l2.facility_risk_snapshot frs
JOIN l2.facility_exposure_snapshot fes ON frs.facility_id = fes.facility_id AND frs.as_of_date = fes.as_of_date;
-- SEVERITY: MEDIUM if pct_zero_weight > 10% (these rows drop out of weighted avg calculations)
```

### 2H. Snapshot Uniformity (Anti-Synthetic Signal)

Perfect uniformity (every entity has exactly the same number of snapshots) is a red flag for model validators.

```sql
SELECT 'snapshot_uniformity' AS check_name,
  MIN(cnt) AS min_snapshots, MAX(cnt) AS max_snapshots,
  ROUND(STDDEV(cnt)::numeric, 2) AS stddev_snapshots,
  COUNT(*) AS facility_count
FROM (
  SELECT facility_id, COUNT(*) AS cnt FROM l2.facility_exposure_snapshot GROUP BY facility_id
) t;
-- SEVERITY: LOW if stddev = 0 (perfectly uniform — anti-synthetic signal)
-- NOTE: stddev > 0 is expected for real-world data with staggered origination
```

### 2I. NULL Dimension Keys on Latest Date (CRITICAL for live dashboard)

NULLs on dimension keys cause rows to disappear from GROUP BY results.

```sql
SELECT 'null_dims_latest' AS check_name,
  SUM(CASE WHEN fm.facility_type_id IS NULL THEN 1 ELSE 0 END) AS null_ftype,
  SUM(CASE WHEN fm.lob_segment_id IS NULL THEN 1 ELSE 0 END) AS null_lob,
  SUM(CASE WHEN fm.legal_entity_id IS NULL THEN 1 ELSE 0 END) AS null_le,
  SUM(CASE WHEN fm.counterparty_id IS NULL THEN 1 ELSE 0 END) AS null_cp,
  SUM(CASE WHEN fm.currency_code IS NULL THEN 1 ELSE 0 END) AS null_ccy,
  SUM(CASE WHEN c.entity_type_code IS NULL THEN 1 ELSE 0 END) AS null_etype,
  SUM(CASE WHEN c.country_code IS NULL THEN 1 ELSE 0 END) AS null_country
FROM l2.facility_exposure_snapshot fes
JOIN l2.facility_master fm ON fes.facility_id = fm.facility_id
JOIN l2.counterparty c ON fm.counterparty_id = c.counterparty_id
WHERE fes.as_of_date = (SELECT MAX(as_of_date) FROM l2.facility_exposure_snapshot);
-- SEVERITY: CRITICAL if any column > 0 (rows silently drop from dashboard)
```

### 2J. Lender Allocation Over/Under-Allocation

```sql
SELECT 'allocation_balance' AS check_name,
  fla.facility_id,
  SUM(fla.bank_share_pct) AS total_share
FROM l2.facility_lender_allocation fla
GROUP BY fla.facility_id
HAVING SUM(fla.bank_share_pct) > 1.01 OR SUM(fla.bank_share_pct) < 0.99;
-- SEVERITY: HIGH if over-allocated (>1.0) — causes over-counted exposure
-- NOTE: Under-allocation may be valid (unallocated portion)
```

### Severity Classification

| Severity | Condition |
|----------|-----------|
| CRITICAL | JOIN fan-out (FX dupes), ALL NULL dimension key, EBT non-leaf, single facility type |
| HIGH | >90% concentration on one dimension value, missing FX for a currency, date misalignment |
| MEDIUM | >70% concentration, zero haircuts >50%, anti-synthetic uniformity, low amendment diversity |
| LOW | Anti-synthetic signals, cosmetic distribution issues |

---

## 3. Fix Procedures

### Fix: FX Rate Deduplication
```sql
DELETE FROM l2.fx_rate WHERE fx_rate_id NOT IN (
  SELECT MIN(fx_rate_id) FROM l2.fx_rate GROUP BY from_currency_code, to_currency_code, as_of_date
);
```

### Fix: EBT Non-Leaf Reassignment
See `dq-facility-master.md` section 5 — uses recursive leaf mapping with 2-3 pass approach.

### Fix: Dimension Concentration
See `dq-categorical-diversity.md` section 4 — distributes using `id % N` with dim table FK validation.

### Fix: NULL Dimension Keys
Map by business logic (geography for legal_entity, entity_type for segment) — see `dq-facility-master.md` section 5.

---

## 4. Output Format

```json
{
  "agent": "dq-dashboard-readiness",
  "scope": "dimension",
  "timestamp": "ISO8601",
  "tables_checked": ["l2.facility_master", "l2.facility_exposure_snapshot", "l2.fx_rate", ...],
  "findings": [ ... ],
  "summary": {
    "total_checks": 0,
    "passed": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "fixes_applied": 0,
    "fixes_verified": 0
  },
  "dashboard_dimensions_healthy": 0,
  "dashboard_dimensions_total": 10,
  "health_score": 0
}
```

Health score formula: `max(0, 100 - (critical * 15 + high * 8 + medium * 3 + low * 1))`

Finding IDs use prefix `DQ-DR-NNN` (e.g., `DQ-DR-001`).

---

## 5. Safety Rules

1. **Never DELETE from dimension tables** — only fix L2 data
2. **FX dedup is safe** — removes exact duplicates only (same rate, different PK)
3. **Always verify FK values exist in dim table before UPDATE**
4. **Log all findings before any fix**
5. **If running in orchestrator mode**, return JSON payload only
