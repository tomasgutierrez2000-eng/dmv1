# Lineage and Metrics Review

## What Was Done

### Lineage: “Tells the story” of joins and multiple tables

- **Before:** One node per source *field*. When a metric used 2 tables with 5 fields, you saw 5 separate nodes (and the same table repeated several times).
- **After:** Source fields are **grouped by (layer, table)**. You get **one node per table**, with all its fields listed (e.g. `credit_event_facility_link` with fields `facility_id`; `credit_event` with `credit_event_id, event_status, counterparty_id, as_of_date`). So:
  - **Two tables** → two boxes (e.g. `limit_utilization_event` + `limit_rule`).
  - **Joins** are implied by multiple table nodes feeding the same formula (e.g. C003: `credit_event_facility_link`, `facility_exposure_snapshot`, `facility_master` → Formula → metric).
- **Where:** `lib/lineage-generator.ts` (grouping), `LineageFlowView.tsx` and `LineageExplorer.tsx` (show table + multiple fields). Optional `LineageNode.fields` used when a table contributes more than one field.

---

## Resolutions (from spec + industry practice)

### 1. **C004 (tier)** – Limit breach tier

- **Formula:** CASE on utilization vs WARNING and BREACH bands from `limit_threshold`.
- **Issue:** `formulaSQL` joins `limit_threshold` twice (lt_warn, lt_breach) and uses both `threshold_upper_pct` (warn) and `threshold_lower_pct` (breach). **SourceFields** only list one `limit_threshold` row (threshold_type, threshold_upper_pct). So the lineage doesn’t show that two threshold *rows* (WARNING and BREACH) are used.
- **Question:** Should we add a second logical “table” or note in lineage for the BREACH band (e.g. second set of limit_threshold fields: threshold_lower_pct, threshold_type = 'BREACH') so the story is “utilization vs two bands”?

### 2. **C005 (limitAmount)** – Total limit amount

- **formulaSQL** has: `lr.as_of_date = :as_of_date`.
- **Issue:** In the spec, `limit_rule` (L1) has `effective_from_date`, `effective_to_date` but **no `as_of_date`**. So either the SQL is wrong, or there’s a convention (e.g. limit_rule is snapshot at a date elsewhere). 
- **Question:** Is `limit_rule` actually keyed or filtered by as_of_date in your model, or should the filter be something else (e.g. effective_to_date IS NULL only)?

### 3. **C009 (priorMonthLimitStatus)** – Prior month-end tier

- Same tier logic as C004 but for prior month-end date. **SourceFields** include `date_dim.is_month_end` (correct). Same as C004: only one `limit_threshold` band is represented in source fields; the two-band (WARNING + BREACH) logic isn’t fully visible in lineage.

### 4. **C016 (lossGivenDefault)** – LGD

- **formulaSQL** uses **L2.position** (e.g. `p.lgd_estimate`, join to `facility_exposure_snapshot`).
- **Issue:** Your metrics-engine spec and Model Gaps refer to **financial_metric_observation** for pre-calculated risk (PD, LGD, etc.) and mention “position” as optional / for drill-down. So it’s unclear whether LGD should be sourced from **position** or **financial_metric_observation** (e.g. metric_code = 'LGD').
- **Question:** Is L2.position the intended source for LGD in this catalog, or should we switch to financial_metric_observation when position doesn’t exist?

### 5. **C017 (creditLimit)** – Counterparty-level limit

- Same as C005: **formulaSQL** has `lr.as_of_date = :as_of_date`. Same question: does `limit_rule` have or get as_of_date in your system?

### 6. **C018, C019** – Cross-entity exposure

- **SourceFields** and notes already call out the **model gap** (cross_entity_flag not yet on facility_exposure_snapshot; derivation via COUNT(DISTINCT legal_entity_id) > 1). No change needed for lineage; just flagging that the *calculation* is correct but the ideal source is a future field.

### 7. **C015 (probabilityOfDefault)** – PD

- **formulaSQL** references **L2.position** for `pd_estimate` (and counterparty-level from L1.counterparty.pd_annual). Same as C016: is **position** the intended source, or **financial_metric_observation** (metric_code = 'PD')?

### 8. **Missing IDs: C056, C057**

- Import produced 83 metrics; two rows were skipped (no source fields in SourceFields sheet). The IDs in the file jump from C055 to C058, so **C056** and **C057** are missing. If those were intentional metrics, they need to be re-added to the Excel (with corresponding SourceFields rows) and re-imported.

---

## Summary Table

| Metric   | Name / topic              | Issue / question                                                                 |
|----------|---------------------------|-----------------------------------------------------------------------------------|
| C004     | tier                      | Lineage only shows one limit_threshold band; formula uses WARNING + BREACH.       |
| C005     | limitAmount               | formulaSQL uses limit_rule.as_of_date; spec has no as_of_date on limit_rule.      |
| C009     | priorMonthLimitStatus     | Same as C004 re two threshold bands in lineage.                                  |
| C015     | probabilityOfDefault      | Uses L2.position; confirm vs financial_metric_observation.                        |
| C016     | lossGivenDefault          | Uses L2.position; confirm vs financial_metric_observation.                         |
| C017     | creditLimit               | Same as C005 re limit_rule.as_of_date.                                           |
| C018/C019| cross-entity              | Noted as model gap; no lineage change.                                           |
| C056/C057| (missing)                 | Two metrics skipped on import; add to template and re-import if required.        |

---

## What to do next

1. **Lineage:** Use the Metrics Engine (and Lineage explorer) and confirm that multi-table metrics (e.g. C001–C003, C004, C006–C008) now clearly show “these tables (and their fields) feed this formula.”
2. **C004/C009:** If you want the two-band threshold story in lineage, we can add a second “limit_threshold (BREACH)”-style source entry so both bands are visible.
3. **C005/C017:** Confirm whether limit_rule is ever filtered by as_of_date; if not, we should adjust formulaSQL (and any docs) to match the real schema.
4. **C015/C016:** Confirm whether risk metrics should be sourced from L2.position or from financial_metric_observation.
5. **C056/C057:** If those IDs were meant to be real metrics, add them (and their SourceFields) to the template and re-run import.

---

## Resolutions applied (from spec + industry practice)

- **C004 & C009:** Added limit_threshold.threshold_lower_pct (BREACH band) to sourceFields so lineage shows both WARNING and BREACH bands.
- **C005 & C017:** Removed lr.as_of_date from formulaSQL (limit_rule has no as_of_date in spec; active = effective_to_date IS NULL).
- **C015 & C016:** Kept position as primary source per spec; financial_metric_observation is fallback when position does not exist.
- **C018/C019:** Model gap only; no change. **C056/C057:** Add to template and re-import if required.
