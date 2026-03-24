# CLAUDE.md — Data Model Visualizer

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__Claude_in_Chrome__*` tools.

Available skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/review`, `/ship`, `/browse`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Project Overview
Banking data model visualization platform with metrics calculation engine. Next.js 14 App Router, TypeScript, Tailwind CSS, Zustand, Recharts. PostgreSQL + sql.js for calculations.

## Architecture: Three-Layer Data Model
- **L1 — Reference Data (75 tables):** Dimensions, masters, lookups, hierarchies, configuration. Rarely changes. Examples: `counterparty`, `facility_master`, `currency_dim`, `metric_threshold`
- **L2 — Atomic Data (101 tables):** Raw source-system snapshots and events. Point-in-time observations, not computed. Examples: `facility_exposure_snapshot`, `credit_event`, `position`
- **L3 — Derived Data (83 tables):** Anything calculated, aggregated, or computed from L1+L2. Examples: `exposure_metric_cube`, `facility_financial_calc`, `stress_test_result`

Rollup hierarchy: **Facility → Counterparty → Desk (L3) → Portfolio (L2) → Business Segment (L1)**

### L1/L2/L3 Convention (VITAL)
**Every field and table MUST follow this rule:**
- **L1:** Only reference/configuration data — no calculations, no time-series snapshots
- **L2:** Only atomic/raw data — if a field is computed from other fields (ratios, aggregations, derived metrics), it belongs in L3
- **L3:** All derived/calculated data — ratios (DSCR, LTV, coverage), aggregations, scores, summaries
- **Calculated overlay pattern:** When an L2 table has a mix of raw and derived fields, split the derived fields into a new L3 table at the same grain (same PK) with a FK back to the L2 source. Example: `l2.facility_financial_snapshot` (raw inputs) → `l3.facility_financial_calc` (DSCR, LTV, net income)
- **Data flows forward only:** L1 → L2 → L3. L3 reads from L1+L2. L2 reads from L1. Never backwards.

## Key Directories
```
app/                    # Next.js pages + API routes
  api/metrics/          # Metric calculation, values, library endpoints
  api/data-model/       # Schema mutation APIs
  metrics/library/      # Metric library UI
  metrics/deep-dive/    # Deep-dive calculation UI
components/             # Feature-organized React components
  lineage/              # SVG DAG lineage renderers
  metric-library/       # Catalogue UI + demos
  metrics-engine/       # Calculation result UI
lib/                    # Core business logic
  metrics-calculation/  # Engine, formula resolver, SQL runner, escape hatch
  metric-library/       # Catalogue store & types
  deep-dive/            # Seed metrics, lineage parser, cross-tier resolver
data/                   # Data definitions
  l3-metrics.ts         # 110+ metric definitions (SOURCE OF TRUTH for L3 metrics)
  l3-tables.ts          # 83 L3 table definitions
  metric-library/       # catalogue.json, variants.json, parent-metrics.json, domains.json
scripts/                # CLI data processing scripts
```

## Metric System — How It Works

### Metric Definition (`data/l3-metrics.ts`)
Each L3Metric has: `id`, `name`, `page` (P1-P7), `formula`, `formulaSQL`, `sourceFields[]`, `dimensions[]`, and optional `formulasByDimension` for per-grain overrides.

### Catalogue / Metric Library (`lib/metric-library/`)
- **CatalogueItem** = one business concept (e.g. DSCR, LTV, PD)
- Each has `level_definitions[]` showing how it computes at each rollup level
- `ingredient_fields[]` = atomic source fields from L1/L2 tables
- `demo_data` = curated walkthrough examples
- Stored in `data/metric-library/catalogue.json`
- Types in `lib/metric-library/types.ts`

### Calculation Engine (`lib/metrics-calculation/`)
Pipeline: `runMetricCalculation()` → `resolveFormulaForDimension()` → escape hatch OR SQL execution
1. **Formula Resolution** — checks `formulasByDimension[dim]` → legacy lookup → base `formulaSQL`
2. **Escape Hatch** — optional hardcoded calculator override for complex metrics
3. **SQL Execution** — runs against in-memory sql.js with sample data
4. CalculationDimension: `facility | counterparty | L1 | L2 | L3`

### Lineage
- Auto-generated from `metric.sourceFields[]` via `lib/lineage-generator.ts`
- Or pre-defined `nodes[]` + `edges[]` for complex DAGs
- Narrative parser in `lib/deep-dive/lineage-parser.ts` extracts steps from pipe-delimited level logic

## Adding a New Metric (Parallel Worktree Workflow)

Multiple sessions can implement metrics in parallel, each in its own git worktree/branch. Follow this 6-phase workflow EXACTLY.

### Parallel Safety Rules
- **Conflict-safe files** (unique per metric, no merge issues): YAML files in `scripts/calc_engine/metrics/{domain}/`
- **Conflict-prone files** (shared, additive conflicts easy to resolve at merge): `data/metric-library/catalogue.json`, `data/metric-library/visualization-configs.json`
- **Do NOT modify** `data/l3-metrics.ts` or `data/metric-library/domains.json` unless absolutely necessary — flag for user
- After ALL parallel sessions merge to main, run `npm run calc:sync` once from main to reconcile catalogue.json from all YAMLs
- Do not run `calc:full` — use `calc:sync` + individual `calc:demo` per metric to avoid regenerating all 100+ existing metrics

### Phase 1: Thorough Spec Review (CRITICAL — before writing any code)
For EACH metric spec, perform these checks:

**1A. Identification & Duplicate Check**
- Search existing YAMLs: `scripts/calc_engine/metrics/**/*.yaml` for metric_id collisions
- Search `data/metric-library/catalogue.json` for existing metrics covering the same business concept (by name, abbreviation, keywords)
- Check for inactive/draft metrics that could be updated instead of creating new
- Verify ID follows convention: `{DOMAIN}-{NNN}` (e.g., EXP-001, CAP-005, PRC-003)
- Verify domain/sub_domain, metric_class (SOURCED/CALCULATED/HYBRID), direction (HIGHER_BETTER/LOWER_BETTER/NEUTRAL), unit_type (CURRENCY/PERCENTAGE/RATIO/COUNT/DAYS/ORDINAL)
- **Abbreviation uniqueness:** Verify the catalogue `abbreviation` is unique across all metrics — duplicate abbreviations (e.g., RSK-006 and RSK-007 both using "RRSI") cause confusion in the UI

**1B. Source Table & Field Validation**
- For EVERY table in `source_tables`: verify it exists in `facility-summary-mvp/output/data-dictionary/data-dictionary.json`
- For EVERY field referenced: verify **exact field name** exists in that table in the DD — subtle mismatches (e.g., `pricing_exception_flag` vs `is_pricing_exception_flag`) cause silent failures
- Verify schema assignments: `l1` = reference/dim, `l2` = atomic/snapshot, `l3` = derived/calc
- **Layer convention:** Source fields should come from L1+L2 (atomic inputs). If spec sources from L3 tables, flag it — the metric should compute from atomic ingredients, not pre-derived values (e.g., EXP-016 was wrong: sourced `l3.facility_stress_test_calc.stressed_expected_loss` instead of computing base EL from `l2.facility_risk_snapshot` PD × LGD × committed)

**1C. Formula & SQL Validation**
Every `formula_sql` MUST:
- Return exactly two columns: `dimension_key` and `metric_value`
- Use `NULLIF(x, 0)` before division to prevent division-by-zero
- Use `COALESCE()` for nullable fields (e.g., `COALESCE(fes.bank_share_pct, 100.0)`, `COALESCE(fx.rate, 1)`)
- Use only SELECT statements (no INSERT/UPDATE/DELETE/DROP), no semicolons
- Have all JOINs BEFORE the WHERE clause (SQL syntax error caught in PRC-003: WHERE appeared before LEFT JOIN)
- Use `= 'Y'` for boolean flag comparisons (NOT `= TRUE` or `= true`) — this is the ONLY syntax that works in both PostgreSQL (BOOLEAN) and sql.js (TEXT with 'Y'/'N' storage)
- NOT use `::FLOAT` or other PostgreSQL-specific casts — sql.js (SQLite) doesn't support them. Use `* 1.0` or `* 100.0` for float math

**1D. Rollup Strategy Validation**
- **direct-sum**: For additive measures (amounts, counts). `SUM(value)` at every level. FX conversion: `SUM(value * COALESCE(fx.rate, 1))`
- **sum-ratio**: For ratios/percentages. `SUM(numerator) / NULLIF(SUM(denominator), 0)` at every level. NEVER average pre-computed rates — this causes mathematical inconsistency (Simpson's paradox)
- **count-ratio**: For percentage-of-count metrics. `SUM(CASE flag) / COUNT(*)` at every level. Re-count at each level, never average
- **weighted-avg**: For averages weighted by exposure. `SUM(value * weight) / NULLIF(SUM(weight), 0)`
- Verify the declared `rollup_strategy` in the catalogue block matches the actual SQL at each level (caught in EXP-015: declared `weighted-avg` but SQL used broken `SUM/AVG` of percentages)
- For date fields: use `MIN` or `MAX` aggregation, NEVER `SUM` (caught in REF-009: SUM of dates is mathematically invalid)

**1E. EBT Hierarchy Pattern (desk/portfolio/segment levels)**
```sql
-- Desk (L3): direct join
LEFT JOIN l1.enterprise_business_taxonomy ebt
  ON ebt.managed_segment_id = fm.lob_segment_id

-- Portfolio (L2): one hop up
LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fm.lob_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id

-- Business Segment (L1): two hops up
LEFT JOIN l1.enterprise_business_taxonomy ebt_l3
  ON ebt_l3.managed_segment_id = fm.lob_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l2
  ON ebt_l2.managed_segment_id = ebt_l3.parent_segment_id
LEFT JOIN l1.enterprise_business_taxonomy ebt_l1
  ON ebt_l1.managed_segment_id = ebt_l2.parent_segment_id
```

**1F. FX Conversion Pattern (aggregate levels only)**
```sql
LEFT JOIN l2.fx_rate fx
  ON fx.from_currency_code = fes.currency_code
  AND fx.to_currency_code = 'USD'
  AND fx.as_of_date = fes.as_of_date
-- Usage: multiply by COALESCE(fx.rate, 1)
```
FX conversion is applied at counterparty and above (not at facility level — facility values stay in local currency).

**1G. Validation Rules Check**
- Minimum: `NOT_NULL` + either `NON_NEGATIVE` or `THRESHOLD`
- Ratio metrics: `THRESHOLD` with min/max (e.g., 0–100% for percentages)
- Additive metrics: `RECONCILIATION` rule (facility sum should equal counterparty sum)
- Time-series metrics: `PERIOD_OVER_PERIOD` with `max_change_pct`

### Phase 2: Present Review Findings
Present structured summary per metric:
```
### Metric: [METRIC-ID] — [Name]
- Status: PASS / PASS WITH NOTES / NEEDS CHANGES
- Existing match: None / [item_id] — recommend update
- Source tables: All verified / [issues]
- Formula issues: None / [list]
- Rollup strategy: Correct / Should be [X] instead of [Y]
- Missing validations: [list]
- Business logic: Sound / [concerns]
```
**Wait for user confirmation before Phase 3.** Do not write any files until approved.

### Phase 3: YAML Authoring
1. Create YAML at `scripts/calc_engine/metrics/{domain}/{METRIC_ID}.yaml`
2. Include ALL sections: identification, classification, regulatory_references, source_tables, levels (all 5), dependencies, output, validation_rules, catalogue, metadata
3. Set `status: ACTIVE` unless user specifies otherwise
4. Use EBT hierarchy pattern for desk/portfolio/segment levels
5. Use FX conversion pattern at aggregate levels for CURRENCY metrics

### Phase 4: Sync & Test (from worktree directory!)
**CRITICAL: Run all commands from the worktree directory**, not the main repo. Running from main reads stale YAML and produces misleading errors.

```bash
# 1. Sync YAML → catalogue + Excel
npm run calc:sync

# 2. Generate demo data for each new metric (use MET-XXX catalogue IDs, NOT YAML IDs)
npm run calc:demo -- --metric MET-XXX --persist --force

# 3. Run calculation engine tests (must be 0 failures)
npm run test:calc-engine
```

**Common calc:demo failures and fixes:**
- `"no such column: xxx"` for fields that exist in DD → sql.js sample data is stale → run `npm run generate:l2`
- `"no such table: xxx"` referencing old L3 tables → running from main repo instead of worktree, or stale executable_metric_id
- Wrong metric ID format → use `MET-029` (catalogue ID), not `REF-009` (YAML ID)

### Phase 5: Database & Risk Verification (MANDATORY)

**5A. PostgreSQL Formula Testing**
Execute each level's `formula_sql` directly against PostgreSQL:
```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -c "SQL_HERE"
```
- Test at minimum: facility level + one aggregate level (counterparty or business_segment with full EBT hierarchy)
- Verify SQL executes without errors, returns rows, produces non-null values
- Note: PostgreSQL uses `BOOLEAN` for `_flag` columns; `= 'Y'` works (PG accepts 'Y' as boolean literal)

**5B. Rollup Reconciliation**
For direct-sum metrics: verify `SUM(facility values) = counterparty value` for same-currency counterparties:
```sql
-- Step 1: Get facility-level values
WITH facility_vals AS (
  SELECT fm.counterparty_id, frs.facility_id, SUM(<formula>) AS fac_value
  FROM ... GROUP BY fm.counterparty_id, frs.facility_id
)
SELECT counterparty_id, SUM(fac_value) AS sum_facility_vals FROM facility_vals GROUP BY counterparty_id;

-- Step 2: Compare against counterparty-level formula output
-- Values should match for same-currency counterparties
-- FX-driven differences are EXPECTED for multi-currency counterparties
```

**5C. Seed Data Coverage**
Verify test data actually exercises the metric:
- Check if source tables have non-null values for the metric's input fields
- Check if boolean flags have both TRUE and FALSE values (e.g., PRC-003 Exception Rate returned 0% because seed data had zero exceptions — formula was correct but untestable)
- Check categorical fields have **diverse values** matching the dim table (e.g., FR2590 had only 1 of 11 codes — metric worked but returned identical values for every facility)
- Check dim table **match rate**: join metric source fields to dim tables and verify >95% match. Unmatched rows produce NULL/0 metric values (e.g., RSK-010 returned 0 for 85% of counterparties before rating_scale_dim expansion)
- Verify L2 seed-data.ts has an explicit `case` handler for every table with metric-relevant fields. Tables without handlers produce placeholder strings like `'column_name_N'`
- After expanding L1 dim tables (e.g., `CUSTOM_TABLE_SIZES`), verify the seed generator uses `rowIndex` directly, not `idx = rowIndex % N` which cycles back to early values
- **If seed data is sparse or missing for the metric's primary field, add it** — update `scripts/l2/seed-data.ts` with a new helper function and run `npm run generate:l2` to regenerate sample data. Also populate PostgreSQL directly for the production database. A metric with all-NULL values is not "working".
- Document data limitations explicitly; do not confuse them with formula bugs

**5D. GSIB Risk Sanity Checks**
Validate output magnitudes against domain knowledge:

| Metric Type | Healthy Range | Warning | Critical |
|------------|--------------|---------|----------|
| PD (%) | 0.03–2% (IG) | 2–10% (sub-IG) | >10% (distressed) |
| LGD (%) | 30% (sr. secured) – 45% (unsecured) | 50–65% | >70% |
| EL Rate (%) | 0.01–0.5% (IG) | 0.5–2% | >5% (stressed) |
| EL $ | Proportional to PD×LGD×EAD | — | — |
| DSCR | >1.25x | 1.0–1.25x | <1.0x |
| LTV (%) | <65% (CRE) | 65–80% | >80% |
| Exception Rate (%) | <5% | 5–15% | >15% (OCC 2020-36) |
| Utilization (%) | 30–70% typical | >90% | >100% (over-draw) |
| Maturity (days) | Industry-dependent | Concentration risk | Wall/cliff |

### Phase 6: Commit
```bash
git add scripts/calc_engine/metrics/{domain}/*.yaml \
       data/metric-library/catalogue.json \
       data/metric-library/visualization-configs.json \
       data/metrics_dimensions_filled.xlsx \
       scripts/l2/output/*  # if L2 sample data was regenerated
```
Commit message format:
```
Add {N} {domain} metrics: {ID-1}, {ID-2}, ...

- {ID-1}: {name} ({brief description})
- {ID-2}: {name} ({brief description})

Spec reviewed: source tables verified against DD, formulas validated
against PostgreSQL, rollup reconciliation passed, GSIB risk sanity checked.
```

### Individual commands
- `npm run calc:sync` — YAML → Excel + catalogue (no demo data)
- `npm run calc:demo -- --metric MET-XXX --persist --force` — generate demo for one metric
- `npm run calc:demo:all` — generate demo for all metrics with calculators
- `npm run calc:full` — calc:sync + calc:demo:all

### Common YAML Formula Bugs (Lessons Learned)

| Bug | Example | Fix |
|-----|---------|-----|
| SUM of dates | `SUM(origination_date)` at counterparty | Use `MIN()` or `MAX()` for date aggregation |
| Average of ratios | `AVG(el_rate_pct)` at counterparty | Use sum-ratio: `SUM(PD×LGD×Committed)/SUM(Committed)` |
| WHERE before JOIN | `WHERE ... LEFT JOIN ebt` | All JOINs must come before WHERE clause |
| Wrong source layer | Source from `l3.stress_test_calc` | Compute from L2 atomic inputs (PD, LGD, committed) |
| Wrong field name | `pricing_exception_flag` | Check exact name in DD: `is_pricing_exception_flag` |
| PostgreSQL-only cast | `value::FLOAT` | Use `value * 1.0` — sql.js doesn't support `::` |
| Wrong boolean compare | `= TRUE` or `= true` | Use `= 'Y'` — works in both PG and sql.js |
| Missing COALESCE | `fes.bank_share_pct / 100` (NULL if missing) | `COALESCE(fes.bank_share_pct, 100.0) / 100.0` |
| Missing NULLIF | `SUM(x) / SUM(y)` (div-by-zero) | `SUM(x) / NULLIF(SUM(y), 0)` |
| FX at facility level | `* fx.rate` in facility formula | FX only at aggregate levels; facility stays local currency |
| Homogeneous seed arrays | `FR2590_CATS_BASE = ['G1_B' x10]` | Use diverse values matching dim table PKs — single-value arrays make metrics return identical results for all rows |
| L2 table missing handler | `facility_risk_snapshot` had no `case` in `getL2SeedValue()` | Every L2 table with metric-relevant fields needs an explicit handler; fallback produces `'column_name_N'` strings |
| L1 seed index cycling | `idx = rowIndex % 10` for 32-row `rating_scale_dim` | Use `rowIndex` directly (not `idx`) when `CUSTOM_TABLE_SIZES` exceeds the default cycle length |
| Boolean leak in VARCHAR | `internal_risk_rating = 'true'` (JS boolean serialized) | Ensure seed generators return string values, not booleans, for VARCHAR columns |
| FK-safe dim expansion | `DELETE FROM rating_scale_dim` fails on FK constraint | Use `UPDATE` existing rows + `INSERT` new rows to preserve FK references from child tables |
| SUM of strings | `SUM(legal_name)` at counterparty | For text/ID fields: use `COUNT(DISTINCT id)`. For hierarchy/LoB string metrics: use `MIN()` for deterministic string selection |
| SUM of IDs | `SUM(legal_entity_id)` at counterparty | Summing IDs is meaningless — use `COUNT(DISTINCT)` |
| Wrong ingredient_fields | `ingredient_fields` lists `position.lgd_estimate` | Must match actual formula sources — verify after `calc:sync` (sync preserves manual edits but YAML-generated fields may be stale from DRAFT) |
| Wrong CACP role code | `SYNDICATE_MEMBER` in CACP insert | Check `l1.counterparty_role_dim` for valid FK codes before INSERT — use `PARTICIPANT` |
| Placeholder seed values | `limit_status_code_1`, `limit_status_code_2` junk | L2 seed generator fallback creates `'column_name_N'` — add explicit handler in `getL2SeedValue()` |
| No dimension diversity | All FES rows have `legal_entity_id = 1` | Distribute across available entities: `SET legal_entity_id = CASE WHEN facility_id % 10 IN (0,1,2) THEN 1 ...` |
| No syndication data | 0 syndicated facilities — all CACP entries single-participant | Add `PARTICIPANT` rows for multi-bank agreements: `INSERT INTO cacp ... 'PARTICIPANT'` |
| Non-existent JOIN field | `ebt.facility_id` in EBT join (field doesn't exist) | Always verify JOIN fields exist in the target table via DD. EBT correct join: `ebt.managed_segment_id = fm.lob_segment_id` |
| Missing EBT is_current_flag | `LEFT JOIN ebt ON ebt.managed_segment_id = fm.lob_segment_id` | ALL EBT joins MUST include `AND ebt.is_current_flag = 'Y'` — without it, historical/inactive nodes pollute results |
| NULL weight propagation | `SUM(lgd_pct * outstanding_balance_amt)` returns NULL if outstanding is NULL | Use `COALESCE(weight_field, 0)` on weighting fields: `SUM(lgd_pct * COALESCE(outstanding_balance_amt, 0))` — NULL in ANY term nullifies the entire row's contribution |
| YAML THRESHOLD nesting | `min_value: 0` / `max_value: 1` at validation top level | THRESHOLD `min_value`/`max_value` must be under `params:` key: `params: { min_value: 0, max_value: 1 }` — calc:sync schema validation rejects top-level placement |
| DRAFT metric blind trust | Upgrading DRAFT metric without reviewing SQL | DRAFT metrics often have placeholder SQL with non-existent fields/joins. When upgrading to ACTIVE, rewrite and verify ALL `formula_sql` — don't assume DRAFT SQL is correct |
| Wrong rollup for strings | `rollup_strategy: "direct-sum"` on LoB string metric | String/hierarchy SOURCED metrics use `rollup_strategy: "none"` — `direct-sum` implies SUM() which is invalid for VARCHAR |
| xlsx merge conflict | Binary `metrics_dimensions_filled.xlsx` always conflicts on merge | Resolve by taking the branch version (`git checkout branch -- file`), then run `calc:sync` on main to regenerate from merged YAMLs |
| Numeric placeholder in NUMERIC fields | `pd_pct = 100.5` for all rows in `facility_risk_snapshot` | L2 seed generator produces unrealistic numeric constants — patch sample-data.json with realistic ranges (e.g., 0.03–5% for PD) |
| Temporal flag inconsistency | `is_pricing_exception_flag` TRUE on some dates, NULL on others for same facility | Flag values must be consistent across ALL `as_of_date` rows for a given facility, or formula must filter by date |
| Small sample modulo miss | `facility_id % 13` with only 10 facilities (ids 1–10) matches zero rows | Use explicit facility selection or row-index logic — sql.js sample has only ~10 entities |
| CTE in formula_sql | `WITH cte AS (SELECT...) SELECT FROM cte` | `calc:sync` validator requires `formula_sql` to start with `SELECT` — convert CTEs to inline subqueries |
| Invalid YAML enum | `role: WEIGHT`, `role: LABEL`, `aggregation_type: AVG` | Valid FieldRole: `MEASURE\|DIMENSION\|FILTER\|JOIN_KEY`. Valid AggregationType: `RAW\|SUM\|WEIGHTED_AVG\|COUNT\|COUNT_DISTINCT\|MIN\|MAX\|MEDIAN\|CUSTOM` |
| Wrong join key for cp-level tables | `cro.facility_id` (doesn't exist) | Tables like `counterparty_rating_observation` have `counterparty_id`, not `facility_id` — join through `fm.counterparty_id = cro.counterparty_id` |
| Missing bridge table joins | Direct join `fm → rmtd` (no path) | Use full bridge chain: `facility_master → risk_mitigant_link → risk_mitigant_master → risk_mitigant_type_dim` |
| SUM of categorical values | `SUM(risk_rating_status)` at aggregate | Use CUSTOM aggregation: derive direction from `AVG(change_steps)` via CASE WHEN |
| Seed data doesn't exercise metric | `risk_rating_change_steps` NULL for 929/930 rows | Populate seed data with realistic distributions via SQL migration (e.g., `UPDATE SET col = CASE WHEN id % 100 < 55 THEN 0 ...`) before declaring metric "working" |
| Non-contiguous FK ID mapping | `410001 + ((id-1) % 123)` maps to gap IDs 410101-410123 | When remapping FK values with modulo, verify ALL mapped IDs exist in parent table — non-contiguous PK ranges have gaps that modulo doesn't avoid |
| Dim chain completeness | `country_dim.region_code = 'AMER'` but no 'AMER' in `region_dim` | Verify full dim chain: source → bridge_dim → target_dim. Missing entries in ANY dim table silently NULL-out the entire join chain |
| sql.js vs PG schema drift | `net_income_amt` exists in sql.js L2 but only in L3 in PG | Always test `formula_sql` against PostgreSQL — sql.js sample data adds fields to L2 tables that only exist in L3 in PG. Formulas pass sql.js but fail PG |
| FK value range mismatch | `counterparty.industry_id = 1-10` but `industry_dim` uses NAICS codes 11+ | Verify FK values actually exist in parent dim PK range — values may be syntactically valid BIGINT but semantically wrong (no matching PK row) |
| NULL weight column | `gross_exposure_usd` NULL for 347/2753 FES rows | Weighted avg returns NULL for entire segments when weight column has NULL gaps — verify weight columns have 100% coverage, not just formula correctness |
| ROW_NUMBER for string rollup | `SUM(industry_name)` invalid at segment level | Use `ROW_NUMBER() OVER (PARTITION BY segment ORDER BY SUM(exposure) DESC)` to find dominant string value by exposure weight |
| PK duplicates in FES | 14,580 duplicate (facility_id, as_of_date) rows inflating SUM metrics 2-7x | Factory dedup or `ON CONFLICT DO NOTHING`; validator.ts now checks PK uniqueness pre-emit |
| Entity type code leak | `entity_type_code = '53'` (NAICS code) instead of 'RE' on 15 CPs | gsib-enrichment.ts now maps internal IDs → valid entity_type_dim codes; validator errors on invalid codes |
| Internal industry_id emission | `industry_id = 1-10` (factory internal) not in `industry_dim` (NAICS 11+) | gsib-enrichment.ts now emits `naicsCode` (11-92), never internal factory IDs; validator checks NAICS range |
| NULL drawn_amount in FES | 87% NULL because factory wrote `outstanding_balance_amt` but metrics use `drawn_amount` | Exposure generator now populates BOTH `drawn_amount` AND `outstanding_balance_amt`; validator errors on NULL |
| DPD bucket code mismatch | Generator hardcoded `'0-30', '31-60', '61-90'` but dim uses FFIEC `'CURRENT', '30-59', '60-89'` | Delinquency generator updated to FFIEC codes; validator checks generated codes against valid set |
| FX rate date coverage gap | Only 3 of 34 snapshot dates had fx_rate rows — JOINs returned NULL for 26 weeks | New fx-rate generator creates rates for ALL snapshot dates; validator checks FX date coverage |
| QC silent skip on registry fail | `ReferenceDataRegistry.fromSeedSQL()` failure silently skipped all 11 QC groups | scenario-runner now fails fast on registry load failure — QC is not optional |

### PostgreSQL Seed Data Quality Checklist (Phase 5C Extended)

After verifying formulas execute, always check that seed data produces **meaningful, diverse results** — not just non-null:

| Check | What to verify | Common failure |
|-------|---------------|----------------|
| **Boolean diversity** | Both TRUE and FALSE values for flag fields | All flags same value → metric always 0 or 100% |
| **FK participation** | Multi-participant records exist (e.g., CACP) | All agreements single-participant → syndication always 0 |
| **Dimension diversity** | Multiple distinct values for categorical fields | All rows point to same entity → COUNT(DISTINCT) always 1 |
| **Threshold coverage** | Values span multiple threshold buckets | All utilization <75% → only NO_BREACH, never ELEVATED/WARNING |
| **Placeholder detection** | No auto-generated `field_name_123` values | Seed generator fallback creates junk — grep for `_code_[0-9]` patterns |
| **Date alignment** | Source tables have overlapping `as_of_date` | FES max=Feb but FRS max=Jan → JOIN returns 0 rows for Feb date |
| **Status field diversity** | Categorical status fields have multiple distinct values | All `pricing_exception_status` NULL → ordinal encoding always returns 0 |
| **Numeric range realism** | NUMERIC fields have values in GSIB-realistic ranges | `pd_pct = 100.5` makes PD metric return 100% instead of <5% |
| **NULL sparsity** | Metric-critical fields have >10% non-null values | Column exists with correct type but 99.9% NULL → metric appears broken (e.g., 1/930 `risk_rating_change_steps`) |
| **FK ID contiguity** | Remapped FK values all exist in parent table | Modulo remapping into non-contiguous PK ranges creates orphaned references in gaps |

### Legacy manual workflow (still works)
1. Add CatalogueItem to `data/metric-library/catalogue.json` with `item_id`, `level_definitions`, `ingredient_fields`
2. If executable: add L3Metric entry to `data/l3-metrics.ts` with `formulaSQL` and `sourceFields`
3. Link via `executable_metric_id` on the catalogue item
4. Add demo data if interactive walkthrough is needed
5. Add lineage page in `app/metrics/[metric]-lineage/` if custom visualization needed

## Conventions
- **Commit messages:** Descriptive English — `Add [feature]`, `Fix [bug]`, `Merge branch 'claude/...'`
- **Branch naming:** `claude/<adjective-scientist>` for worktree sessions
- **Component files:** PascalCase (`LineageExplorer.tsx`)
- **API responses:** Success: `{ ok?: boolean, data?: T }`; error: `{ ok: false, error: string, details?: string, code?: string }`. Use `lib/api-response.ts` (`jsonSuccess`, `jsonError`, `normalizeCaughtError`) for consistent responses. See `docs/DEPLOYMENT.md` for path overrides and read/write requirements.
- **Metric IDs:** `C001`-`C107` for L3 metrics, `MET-XXX` for catalogue items
- **No Prettier** — ESLint only (Next.js config)
- **No test framework** — validation via CLI scripts (`npm run test:metrics`, `npm run test:calc-engine`)

## Key Types (import from these files)
- `data/l3-metrics.ts` — `L3Metric`, `CalculationDimension`, `MetricType`, `SourceField`, `DashboardPage`
- `lib/metric-library/types.ts` — `CatalogueItem`, `LevelDefinition`, `IngredientField`, `MetricDomain`, `RollupLevelKey`
- `lib/metrics-calculation/types.ts` — `RunMetricRequest`, `RunMetricResult`, `FormulaResolution`

## npm Scripts
```bash
npm run dev              # Dev server (port 3000)
npm run build            # Production build
npm run test:metrics     # Validate metric definitions
npm run test:calc-engine # Test calculation engine
npm run calc:sync        # YAML → Excel + catalogue (sync only, no demo)
npm run calc:demo        # Generate demo data (use --metric MET-XXX for one)
npm run calc:demo:all    # Generate demo data for all metrics with calculators
npm run calc:full        # calc:sync + calc:demo:all (full pipeline)
npm run db:introspect    # Introspect PostgreSQL → update data dictionary
npm run sync:data-model  # Sync model from DDL (offline fallback) or DB
npm run export:data-model # Export to Excel
npm run validate         # Validate cross-referential integrity
npm run validate:l1      # Validate L1 reference data quality rules
npm run doc:sync         # Sync table/metric counts in CLAUDE.md + playbook docs
```

## Keeping This File Current
Table and metric counts in this file (L1=63, L2=56, L3=66, etc.) are **auto-synced** by `npm run doc:sync`. The same script also updates `docs/playbook/` files.

**When to run `npm run doc:sync`:**
- After adding/removing tables in `data/l1-table-meta.ts`, `data/l2-table-meta.ts`, or `data/l3-tables.ts`
- After adding/removing metrics in `data/metric-library/catalogue.json`
- After adding/removing domains in `data/metric-library/domains.json`
- Automatically: the PostToolUse hook runs `doc:sync` after any DB schema change (alongside `db:introspect`)

**If you notice stale counts** in this file or the playbook, just run `npm run doc:sync` to fix them.

## Environment Variables
```
DATABASE_URL             # PostgreSQL (GCP Cloud SQL) — golden source for schema
GOOGLE_GEMINI_API_KEY    # Gemini agent
ANTHROPIC_API_KEY        # Claude integration
AGENT_PROVIDER           # gemini|claude|ollama
```

## Golden Source: PostgreSQL
The live PostgreSQL database (GCP Cloud SQL, via `DATABASE_URL`) is the **golden source of truth** for all table structures, fields, data types, PKs, and FKs. The data flow is:

1. **PostgreSQL** → `npm run db:introspect` → updates `data-dictionary.json` with exact types/PKs/FKs
2. **data-dictionary.json** → consumed by visualizers, Excel exporter, validation, schema bundle API
3. **DDL files** (`sql/gsib-export/*.sql`, `sql/l3/*.sql`) → offline fallback when `DATABASE_URL` unavailable
4. **Table metadata** (`data/l1-table-meta.ts`, `data/l2-table-meta.ts`) → SCD types and categories only (not structural)

When `DATABASE_URL` is set, `npm run sync:data-model` automatically delegates to introspection. Without it, falls back to DDL parsing via `lib/ddl-parser.ts`.

### Auto-Sync Hook (MANDATORY)
A Claude Code `PostToolUse` hook (`.claude/hooks/post-db-change.sh`) automatically runs `npm run db:introspect` after any Bash command that modifies the PostgreSQL schema (DDL operations, `db:load`, `apply-ddl`, `psql`). **Rules:**
- **After ANY database schema change** (CREATE/ALTER/DROP TABLE, adding columns, loading DDL), the hook auto-syncs the data dictionary. If the hook doesn't fire, manually run `npm run db:introspect`.
- **Never skip introspection** after schema changes — the visualizer, exporter, and validation all read from the data dictionary, not directly from PostgreSQL.
- **After introspection**, verify the `/data-elements` page reflects the changes.
- **Capital DB auto-sync:** The hook also runs `npm run db:sync-capital --yes` to propagate schema changes to `postgres_capital` (see below).

### Capital Metrics Database (`postgres_capital`)
A separate database on the same GCP Cloud SQL instance for capital metrics development. Contains a full copy of the main `postgres` database plus capital-specific extensions.

**Connection:** Same host/port as main DB, database name = `postgres_capital`
```
postgresql://postgres:<password>@localhost:5433/postgres_capital
```

**Capital-specific additions (migration `sql/migrations/002-capital-metrics.sql`):**

| Layer | Table | Purpose |
|-------|-------|---------|
| L1 | `basel_exposure_type_dim` | Basel III exposure classes (Corporate, Sovereign, Bank, Retail, etc.) |
| L1 | `regulatory_capital_requirement` | Fed-published capital requirements per GSIB per effective date |
| L2 | `capital_position_snapshot` | Entity-level capital ratios from Y-9C/Call Reports (quarterly) |
| L3 | `facility_rwa_calc` | Dual-approach RWA amounts (strict L3 convention — derived from L2 risk weights) |
| L3 | `capital_binding_constraint` | Entity-level binding constraint analysis (CET1, Tier1, SLR, TLAC) |
| L3 | `facility_capital_consumption` | Per-facility capital allocation (top-down from entity binding constraint) |
| L3 | `counterparty_capital_consumption` | Counterparty-level rollup |
| L3 | `desk_capital_consumption` | Desk/org-unit-level rollup |
| L3 | `portfolio_capital_consumption` | Portfolio-level rollup (primary view per spec) |
| L3 | `segment_capital_consumption` | Business segment/LOB rollup |

**Field additions on existing tables:**
- `l2.facility_master` + `legal_entity_id`, `profit_center_code`
- `l2.facility_risk_snapshot` + `risk_weight_std_pct`, `risk_weight_erba_pct`, `defaulted_flag`, `basel_exposure_type_id`

**Auto-sync:** The PostToolUse hook runs `npm run db:sync-capital --yes` after any DDL change on main. The sync script (`scripts/sync-capital-db.ts`) compares schemas, applies new tables/columns from main to capital, and preserves capital-specific additions.

**Manual sync:** `npm run db:sync-capital` (dry-run) or `npm run db:sync-capital -- --yes` (auto-apply)

**Applying capital changes to main:** When satisfied with the capital schema, run the migration against main:
```bash
psql -d postgres -f sql/migrations/002-capital-metrics.sql
psql -d postgres -f sql/migrations/002a-capital-metrics-seed.sql
```

## L1 Reference Data Quality Rules

L1 reference data is the foundation of all metric calculations and rollups. Errors in L1 silently corrupt L2/L3 outputs. These rules codify lessons from the GSIB L1 audit and MUST be followed when adding or modifying L1 tables and seed data.

### EBT Hierarchy Rules
- Root node (400249 "Enterprise") MUST have `parent_segment_id = NULL` — any other value creates circular references or orphaned subtrees
- All `facility_master.lob_segment_id` values MUST point to **LEAF nodes** (nodes with no children in `enterprise_business_taxonomy`) — never assign facilities to parent/portfolio/segment-level EBT nodes
- Verify leaf status: `SELECT managed_segment_id FROM l1.enterprise_business_taxonomy WHERE managed_segment_id NOT IN (SELECT DISTINCT parent_segment_id FROM l1.enterprise_business_taxonomy WHERE parent_segment_id IS NOT NULL)`
- All EBT joins MUST include `AND ebt.is_current_flag = 'Y'` — without it, historical/inactive nodes pollute rollup results
- After any EBT data change, verify the hierarchy is a proper tree (no cycles, single root, all leaves reachable)

### Agreement-Facility Counterparty Alignment
- `credit_agreement_master.borrower_counterparty_id` MUST match `facility_master.counterparty_id` for all facilities under that agreement
- **Exception:** Syndicated facilities where the `credit_agreement_counterparty_participation` (CACP) table documents the multi-party relationship
- Verify alignment after bulk data loads:
  ```sql
  SELECT fm.facility_id, fm.counterparty_id, ca.borrower_counterparty_id
  FROM l1.facility_master fm
  JOIN l1.credit_agreement_master ca ON fm.credit_agreement_id = ca.credit_agreement_id
  WHERE fm.counterparty_id != ca.borrower_counterparty_id
  ```
  Non-zero results (outside syndicated deals) indicate broken FK chains that will cause incorrect counterparty-level rollups

### Benchmark Rate Transition Rules
- Ceased benchmarks (CDOR, SOR, LIBOR) MUST have `is_active_flag = FALSE` and a populated `cessation_date`
- Replacement rates (CORRA, SORA, TONA, ESTR) must be present and `is_active_flag = TRUE`
- Every rate index MUST have these fields populated: `cessation_date` (NULL if still active), `fallback_to_index_id` (FK to replacement rate), `is_bmu_compliant_flag`
- IBOR transition completeness: verify no active facilities reference ceased benchmark rates

### Basel III Exposure Type Rules (CCF Requirements)
Credit Conversion Factors per CRE 20.93 and Basel III Standardized Approach:

| Facility Type | `ccf_pct` | Regulation |
|--------------|-----------|------------|
| Financial guarantees (GUAR, SBLC) | 100% | CRE 20.93 |
| Performance guarantees (PERF_GUAR) | 50% | CRE 20.93 |
| Commercial letters of credit (COMM_LC) | 20% | CRE 20.93 |
| Unconditional commitments (COMMIT) | 40% | CRE 20.93 |

- All `facility_type_dim` entries with off-balance-sheet exposure types MUST have a `ccf_pct` consistent with these regulatory requirements
- RWA calculations in L3 depend on correct CCF values — errors here cascade to all capital metrics

### Counterparty Country Field Convention
- `country_code` (VARCHAR, ISO 3166-1 alpha-2, e.g., `'US'`, `'GB'`) is the **canonical FK** to `country_dim`
- `country_of_domicile`, `country_of_incorporation`, `country_of_risk` are **legacy INTEGER columns** storing ISO 3166-1 numeric codes (e.g., `840` for US)
- **Always use `country_code`** for new metric formulas, joins, and reporting — the alpha-2 code is human-readable and the standard FK target
- Never mix alpha-2 and numeric codes in the same join chain

### DPD Bucket Standard (FFIEC Alignment)
Days Past Due buckets must follow FFIEC Call Report granularity:

| Bucket Code | DPD Range | Purpose |
|-------------|-----------|---------|
| `CURRENT` | 0 DPD | Performing, no delinquency |
| `1-29` | 1-29 DPD | Early delinquency detection |
| `30-59` | 30-59 DPD | Past due, not yet classified |
| `60-89` | 60-89 DPD | Substandard trigger |
| `90+` | 90+ DPD | Non-accrual / default trigger |

- The legacy `0-30` bucket code has been narrowed to `CURRENT` (0 DPD only)
- The `1-29` bucket was added for early delinquency detection per FFIEC guidance
- All delinquency metrics MUST use these 5 buckets for consistent regulatory reporting

### Rating Tier PD Boundaries (GSIB Calibration)
Internal rating tiers must map to probability of default ranges consistent with GSIB calibration standards:

| Tier | PD Range | Basel III Equivalent |
|------|----------|---------------------|
| Investment Grade | PD <= 0.40% | Low default risk |
| Standard | 0.40% - 2.0% | Moderate risk |
| Substandard | 2.0% - 10.0% | Elevated risk |
| Doubtful | 10.0% - 30.0% | High default risk |
| Loss | 30.0% - 100.0% | Impaired / default |

- Investment Grade ceiling is 0.40% (not 0.05%) — the tighter bound applies only to sovereign/bank exposures
- `rating_scale_dim` PD boundaries must align with these tiers for consistent metric thresholding
- Metrics using PD-based bucketing (e.g., migration matrices, EL tiering) depend on these exact boundaries

### Entity Type Completeness
`entity_type_dim` must include all Basel III exposure classes:

| Code | Description | Basel III Treatment |
|------|-------------|-------------------|
| `CORP` | Corporate | Standard corporate RW |
| `BANK` | Bank/FI regulated | Preferential RW (SCRA) |
| `FI` | Financial Institution (non-bank) | Corporate RW |
| `SOV` | Sovereign | 0-150% RW by rating |
| `PSE` | Public Sector Entity | Preferential RW |
| `MDB` | Multilateral Development Bank | 0% RW (qualifying) |
| `FUND` | Investment Fund | Look-through or 1250% |
| `INS` | Insurance | Corporate RW |
| `PE` | Private Equity | 400% RW (speculative) |
| `RE` | Real Estate SPV | Specialized lending |
| `SPE` | Special Purpose Entity | Depends on structure |
| `OTH` | Other | Conservative treatment |

- PSE and MDB have preferential Basel III risk weights — missing these codes causes incorrect RWA calculations
- All counterparties MUST have a valid `entity_type_code` FK — NULL entity types default to the most conservative capital treatment

### L1 Validation Script
Run `npm run validate:l1` after any L1 data changes (dim table modifications, seed data updates, EBT restructuring). The script checks all rules above and exits with code 1 on CRITICAL failures. Add to CI/CD pipeline for automated regression prevention.

**What `validate:l1` checks:**
- EBT hierarchy integrity (single root, no cycles, facilities on leaf nodes only)
- Agreement-facility counterparty alignment
- Benchmark rate transition completeness
- CCF values for off-balance-sheet exposure types
- DPD bucket coverage (all 5 FFIEC buckets present)
- Rating tier PD boundary consistency
- Entity type completeness
- Country code FK integrity (alpha-2 format, valid `country_dim` references)

## Database Recon Indicators (Visualizer)
The visualizer shows live reconciliation between the data dictionary and PostgreSQL:
- **Non-blocking overlay:** Visualizer loads instantly from DD, then fetches `/api/db-status` async to overlay status dots
- **Status dots on TableNode:** Green (has data), Amber (empty), Red hollow (not in DB), Orange (orphan — in DB but not in DD)
- **Field-level drift:** `lib/db-status.ts` queries `information_schema.columns` and compares against DD fields to detect `in_dd_not_in_db`, `in_db_not_in_dd`, `type_mismatch`
- **SyncStatusBanner** (`components/visualizer/SyncStatusBanner.tsx`): Summary bar at top of visualizer — green/amber/gray, links to `/db-status`, dismissible
- **Detail panel drift section:** When a table has field drift, the detail panel shows color-coded badges (red=missing in DB, blue=extra in DB, orange=type mismatch)
- **Store:** `dbStatusMap` (keyed by `"L1.table_name"`), `dbStatusSummary`, `dbStatusConnected` in `store/modelStore.ts`
- **Without `DATABASE_URL`:** All tables show red "not in DB" dots, banner shows "Database not connected"

## Important Patterns
- **Metric storage priority:** Excel (`metrics_dimensions_filled.xlsx`) > JSON (`metrics-custom.json`) > seed metrics — merged via `getMergedMetrics()`
- **Schema bundle** (`/api/schema/bundle`): unified DataDictionary + L3 Tables + L3 Metrics (metrics list = `getMergedMetrics()` so agent and calculation see the same set). Supports `?summary=true` for token-efficient agent prompts
- **Data dictionary** cached at `facility-summary-mvp/output/data-dictionary/data-dictionary.json`. Updated by `db:introspect` (PostgreSQL) or `sync:data-model` (DDL fallback). The visualizer and data-model APIs read from it.
- When modifying metrics: always update both the catalogue item AND the L3 metric definition if both exist
- Level definitions use `sourcing_type`: `Raw` (direct field), `Calc` (computed), `Agg` (aggregated), `Avg` (weighted average)

### Level Logic Format (`level_logic` field)
Each `LevelDefinition` has a `level_logic` string written in SQL-like numbered steps. The UI (`LevelRollupTable.tsx`) auto-parses this into human-readable pseudo code with color-coded verbs. **When writing `level_logic`, follow this exact format so the parser works:**

```
1. LOAD  l2.table_name  (alias)
   WHERE alias.field = :param
2. JOIN  l2.other_table  (alias2)
   ON    alias2.fk = alias.pk
3. LEFT JOIN  l1.dim_table  (alias3)
   ON    alias3.code = alias.code
4. GROUP BY alias.grouping_field
5. COMPUTE
   metric_value = formula_expression
```

**Parser transformation rules (auto-applied in UI):**
| SQL syntax | Displayed as | Color |
|---|---|---|
| `LOAD` | **Read** [Table Name] | Blue |
| `JOIN` | **Link to** [Table Name] | Cyan |
| `LEFT JOIN` | **Look up** [Table Name] (if available) | Gray |
| `GROUP BY` | **Group by** [Field Name] | Amber |
| `COMPUTE` | **Calculate** [humanized formula] | Green |
| Plain text (e.g. "Not applicable...") | Italic note | Gray |

**Formula humanization (auto-applied):** `COALESCE(x, 0)` → `x`, `NULLIF(x, 0)` → `x`, `SUM(x)` → `Sum of (x)`, `MAX(x)` → `Latest (x)`, `COUNT(*)` → `Count`, `alias.field_name` → `Field Name`, `* ` → `×`, `AS alias` removed. Table/field names converted from snake_case to Title Case.

### Formula Storage — Option C (Hybrid)
- **YAML** (`scripts/calc_engine/metrics/**/*.yaml`) = technical source of truth for the calc-engine (formula_sql, source_tables, validations)
- **Excel** (`data/metrics_dimensions_filled.xlsx`) = business-facing view, generated from YAML via `npm run calc:sync:excel`
- **Catalogue** (`data/metric-library/catalogue.json`) = UI/demo view, derived from YAML via `npm run calc:sync:catalogue`
- Run `npm run calc:sync` after editing YAML to regenerate Excel and catalogue

## GCP Cloud SQL PostgreSQL — DDL & Data Upload Rules

When generating or modifying SQL DDL or INSERT data for PostgreSQL upload, follow these rules to avoid syntax errors, type mismatches, and FK constraint violations. Compiled from 3 sessions of DDL review, data validation, FK constraint fixing, and scenario coherence verification.

### DDL Syntax Rules

1. **Reserved words as column names must be double-quoted:**
   - `value` is reserved in PostgreSQL — always use `"value"` in CREATE TABLE and INSERT column lists
   - Other truly reserved words: `ALL`, `AND`, `ARRAY`, `AS`, `BETWEEN`, `CASE`, `CHECK`, `COLUMN`, `CONSTRAINT`, `CREATE`, `CROSS`, `DEFAULT`, `DISTINCT`, `DO`, `ELSE`, `END`, `EXCEPT`, `FALSE`, `FETCH`, `FOR`, `FOREIGN`, `FROM`, `FULL`, `GRANT`, `GROUP`, `HAVING`, `IN`, `INNER`, `INTO`, `IS`, `JOIN`, `LEADING`, `LEFT`, `LIKE`, `LIMIT`, `NOT`, `NULL`, `OFFSET`, `ON`, `ONLY`, `OR`, `ORDER`, `OUTER`, `PRIMARY`, `REFERENCES`, `RIGHT`, `SELECT`, `TABLE`, `THEN`, `TO`, `TRUE`, `UNION`, `UNIQUE`, `USER`, `USING`, `WHEN`, `WHERE`, `WINDOW`, `WITH`
   - Non-reserved (OK unquoted): `name`, `status`, `type`, `key`, `comment`, `level`, `role`, `action`, `source`, `position`, `domain`

2. **No double commas in DDL:** A trailing comma on a column definition followed by a bare comma on the next line creates invalid SQL. When programmatically generating DDL, always strip trailing commas before constraint blocks. We had 42 instances of this.

3. **No duplicate column names:** PostgreSQL rejects `CREATE TABLE` if any column name appears twice. Watch for `created_ts`/`updated_ts` being defined twice in generated DDL.

4. **Constraint name length limit is 63 characters (NAMEDATALEN):**
   - PostgreSQL silently truncates names >63 chars — no error, but confusing when debugging
   - Use abbreviations for long table names in constraint names (e.g., `fk_ca_cp_participation_` instead of `fk_credit_agreement_counterparty_participation_`)

5. **Every table MUST have a PRIMARY KEY** for GCP Cloud SQL logical replication. Use `BIGSERIAL PRIMARY KEY` for fact tables without a natural key.

6. **SET search_path** is required when FK REFERENCES cross schemas:
   - L2 DDL: `SET search_path TO l1, l2, public;` (references L1 tables)
   - L3 DDL: `SET search_path TO l1, l2, l3, public;` (references L1/L2 tables)
   - L1 DDL: not needed if all FKs are within L1 and fully schema-qualified

7. **COALESCE in unique indexes must match column type:**
   - BIGINT column: `COALESCE(facility_id, 0)` — NOT `COALESCE(facility_id, '')`
   - VARCHAR column: `COALESCE(variant_id, '')` — NOT `COALESCE(variant_id, 0)`

### Data Type Rules — The Naming Convention Contract

The DDL generator infers types from column name suffixes. **Every column name implicitly declares its type.**

| Suffix | Type | Example |
|--------|------|---------|
| `_id` | `BIGINT` | `counterparty_id`, `facility_id` |
| `_code` | `VARCHAR(30)` | `currency_code`, `fr2590_category_code` |
| `_name`, `_desc`, `_text` | `VARCHAR(500)` | `facility_name` |
| `_amt` | `NUMERIC(20,4)` | `committed_facility_amt` |
| `_pct` | `NUMERIC(10,6)` | `coverage_ratio_pct` |
| `_value` | `NUMERIC(12,6)` | |
| `_date` | `DATE` | `maturity_date` |
| `_ts` | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | `created_ts` |
| `_flag` | `BOOLEAN` | `is_active_flag` |
| `_count` | `INTEGER` | `number_of_loans` |
| `_bps` | `NUMERIC(10,4)` | `interest_rate_spread_bps` |
| fallback | `VARCHAR(64)` | |

**Exception IDs** (remain VARCHAR despite `_id` suffix): `metric_id`, `variant_id`, `source_metric_id`, `mdrm_id`, `mapped_line_id`, `mapped_column_id`

8. **Code columns use VARCHAR, not BIGINT:**
   - `_code` suffix columns (e.g., `fr2590_category_code`, `pricing_tier_code`) are `VARCHAR(20)` or `VARCHAR(30)`
   - If a dim table PK is VARCHAR, all FK references must also be VARCHAR — never mix BIGINT PK with VARCHAR FK or vice versa

9. **INSERT value types must match column DDL types exactly:**
   - BIGINT/INTEGER column: unquoted integer → `42` (not `'42'`)
   - VARCHAR column: quoted string → `'STANDARD'` (not `STANDARD` or `42`)
   - NUMERIC/DECIMAL column: unquoted number → `125.50` (not `'125.50'`)
   - DATE column: quoted string → `'2025-01-31'`
   - NULL: always unquoted → `NULL`
   - PostgreSQL will implicitly cast `'42'` to INTEGER, but bare `42` into VARCHAR will fail
   - **Critical**: When a `_code` column is a PRIMARY KEY and stores numeric-looking values (like `fr2590_category_code = '1'`), you MUST quote them. Unquoted integers work in most INSERT contexts but can fail in prepared statements or when used as FK values.

10. **No non-numeric strings in NUMERIC columns:**
    - `'SOFR-30D'` in a `NUMERIC(10,4)` column will crash — use a numeric rate value like `0.0530`
    - If a column stores both codes and numbers, the DDL type must be VARCHAR

### FK Referential Integrity Rules — The #1 Source of Failures

FK integrity was the single biggest category of issues: 96 FK violations in first pass, 80+ in second. Every single one of ~162 FK constraints (90 L1 internal + 66 L2→L1/L2 + 6 L3→L1/L2) must be satisfied.

11. **Parent table INSERTs must appear BEFORE child table INSERTs in the data file:**
    - Load order: L1 dims → L1 masters → L1 hierarchy/junction → L2 snapshots → L2 events → L3 derived
    - If a dim table (e.g., `pricing_tier_dim`) is defined late in the DDL, its seed data still must load before any L2 table that references it

12. **The Complete Chain Rule** — Every scenario needs a complete FK chain from L2 back to L1:
    ```
    L2.facility_exposure_snapshot.facility_id
      → L1.facility_master.facility_id
        → L1.facility_master.credit_agreement_id
          → L1.credit_agreement_master.credit_agreement_id
            → L1.credit_agreement_master.borrower_counterparty_id
              → L1.counterparty.counterparty_id
    ```
    If ANY link is missing, the data won't load (FK constraint violation) AND the dashboard can't join the tables.

13. **Every FK value in a child row must exist in the parent table:**
    - Watch for non-contiguous parent ID ranges (e.g., seed IDs 1-100 + scenario IDs 5001-5050 creates a gap at 101-5000)
    - Child rows referencing IDs in the gap will violate FK constraints

14. **String FK values must exactly match parent PK values:**
    - `pricing_tier = 'STANDARD'` fails if `pricing_tier_dim` only has codes `'1'`-`'10'` (where `'3'` = Standard)
    - `credit_status_code = 'CURRENT'` fails if the dim table uses integer codes `1`-`10`
    - Always verify FK string values against the actual parent PK values, not human-readable labels

15. **FK value ranges must be coordinated:** When generating scenario data, you must know which IDs exist in parent tables. If scenario creates `counterparty_id` 1001-1010, any child table referencing those IDs ONLY works if you also INSERT counterparty 1001-1010 into `l1.counterparty`.

### Primary Key Rules

16. **No duplicate PKs** — PostgreSQL rejects INSERT if the PK tuple already exists. Common causes:
    - ID range collisions between scenarios (S17 uses 1131-1135, S18 added 1121-1140 → collision at 1131-1135)
    - Scenario data overlapping seed data (S16 added facility_pricing for facilities 1-8 which already had seed pricing)
    - Modular arithmetic capping mapping scenario IDs back to seed range

17. **Composite PKs in L2/L3** — Many L2/L3 tables have composite PKs. Duplicates can occur:
    ```
    facility_pricing_snapshot PK = (facility_id, as_of_date)
    Seed: (1, '2025-01-31') ← exists
    S16:  (1, '2025-01-31') ← DUPLICATE! Use different date or facility_id
    ```
    Fix: Use different `as_of_date` values or assign scenario-specific facility_ids.

18. **After capping FK values, check for duplicate composite PKs:**
    - Modular arithmetic capping can map multiple child rows to the same parent ID, creating PK collisions
    - Run a deduplication pass: track `(pk_col_1, pk_col_2, ...)` tuples and drop duplicates

### ID Range Management (CRITICAL for Scaling)

**Never reuse IDs across scenarios. Never overlap with seed range.**

| Entity | Seed Range | Scenario Range | Notes |
|--------|-----------|----------------|-------|
| counterparty_id | 1-100 | 1001-1720 | Each scenario gets 10-20 IDs |
| facility_id | 1-410 | 5001-5720 | Mirrors counterparty offset |
| credit_agreement_id | 1-100 | 1091-1180 | Per-scenario allocation |
| credit_event_id | 1-2000 | 5001+ | Scenario events |
| risk_flag_id | 1-4000 | 5001+ | Scenario flags |
| facility_exposure_id | 1-10000 | 50001+ | Added rows for missing snapshots |
| collateral_asset_id | 1-5000 | 50101+ | Avoid seed collision |

**Per-Scenario Allocation Map (18 CRO Dashboard Scenarios):**

| Scenario | Counterparty IDs | Facility IDs | Credit Agr IDs |
|----------|-----------------|--------------|----------------|
| S1 | 1001-1010 | 5001-5010 | 1001-1010 |
| S2 | 1051-1060 | 5051-5060 | 1011-1020 |
| S3 | 1101-1110 | 5101-5110 | 1021-1030 |
| S4 | 1151-1155 | 5151-5165 | 1031-1035 |
| S5 | 1201-1205 | 5201-5205 | 1036-1040 |
| S6 | 1251-1260 | 5251-5260 | 1041-1050 |
| S7 | 1301-1305 | 5301-5315 | 1051-1055 |
| S8 | 1351-1355 | 5351-5355 | 1056-1060 |
| S9 | 1401-1412 | 5401-5412 | 1061-1072 |
| S10 | 1461-1475 | 5461-5475 | 1091-1105 |
| S11 | 1501-1510 | 5501-5510 | (no facilities) |
| S12 | (uses seed) | (uses seed) | (uses seed) |
| S13 | 1551-1560 | 5551-5560 | 1111-1112 |
| S14 | (uses S2 seed) | (uses S2 seed) | (uses S2 seed) |
| S15 | 1601-1610 | 5601-5610 | 1141 |
| S16 | (uses S3 seed) | (uses S3 seed) | (uses S3 seed) |
| S17 | 1651-1660 | 5651-5660 | 1131-1135 |
| S18 | 1701-1720 | 5701-5720 | 1161-1180 |

**Scaling rule for new scenarios:**
```python
BLOCK_SIZE = 50
scenario_base_cp = 1000 + (scenario_number * BLOCK_SIZE)
scenario_base_fac = 5000 + (scenario_number * BLOCK_SIZE)
```

### Scenario Data Generation Workflow

**Step 1: Define the Narrative** — Each scenario needs a clear GSIB story:
- Who (counterparties): industry, size, rating
- What (facilities): type, amount, status
- When (timeline): 3-month trend (Nov → Dec → Jan)
- Why (trigger): what event/trend drives the scenario
- Risk flags: what the CRO dashboard should highlight

**Step 2: Create L1 Reference Data** — INSERT in this order:
1. `l1.counterparty` — the borrowers/counterparties
2. `l1.credit_agreement_master` — the legal agreements
3. `l1.facility_master` — the facilities under each agreement
4. `l1.counterparty_hierarchy` — parent/subsidiary relationships

Every FK must be satisfied before moving to L2.

**Step 3: Create L2 Atomic Data** — INSERT:
1. `l2.facility_exposure_snapshot` — exposure amounts per facility per date
2. `l2.credit_event` — any credit events (defaults, downgrades)
3. `l2.credit_event_facility_link` — link events to specific facilities
4. `l2.collateral_snapshot` — collateral valuations
5. `l2.risk_flag` — flags that appear on the dashboard
6. Scenario-specific tables: `facility_pricing_snapshot`, `facility_delinquency_snapshot`, etc.

**Step 4: Create L3 Derived Data (if needed)** — Most L3 data is calculated by the engine. Only add L3 rows when the calculation engine doesn't cover the metric, or the scenario needs pre-computed stress test results.

**Step 5: Validate the Chain** — For EVERY facility in the scenario:
```sql
SELECT fm.facility_id, fm.counterparty_id, fm.credit_agreement_id,
       ca.borrower_counterparty_id, c.legal_name,
       fes.drawn_amount, fes.as_of_date
FROM l1.facility_master fm
JOIN l1.credit_agreement_master ca ON fm.credit_agreement_id = ca.credit_agreement_id
JOIN l1.counterparty c ON fm.counterparty_id = c.counterparty_id
LEFT JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id
WHERE fm.facility_id BETWEEN {scenario_fac_start} AND {scenario_fac_end};
```
If any JOIN returns NULL, the chain is broken.

### The Modular Arithmetic Trap (NEVER DO THIS)

**Never apply blind mathematical transformations to FK values.** In session 2, modular arithmetic capped FK values to seed data range:
```python
valid_ids = [1, 2, 3, ..., 100]  # seed counterparty IDs
capped_id = valid_ids[(original_id - 1) % len(valid_ids)]
```
This mapped scenario counterparty_id 1001 → seed counterparty_id 1. Result: 107 FK values were wrong, entire scenario narratives destroyed (facility for "Atlas Global Logistics" pointed to "Generic Seed Corp").

**Instead:**
1. Build a complete set of valid parent IDs from INSERT data
2. Only map child FK values to IDs that exist AND make narrative sense
3. Better yet: generate child data that already references the correct parent IDs

### Story Coherence Checklist

For each scenario, verify:
- All L1 counterparties exist with correct industry, rating, country
- Credit agreements link to correct borrower counterparty_id
- Facility_master has correct credit_agreement_id AND counterparty_id
- Exposure snapshots use correct facility_id and counterparty_id
- Risk flags reference correct facility_id and counterparty_id
- Event tables (credit_event, amendment_event) reference correct counterparty
- Event-facility links reference correct facility_ids
- 3-month trend data exists (Nov, Dec, Jan) for time-series scenarios
- Dollar amounts are realistic and internally consistent:
  - `drawn_amount <= committed_amount`
  - `undrawn_amount = committed_amount - drawn_amount`
  - `coverage_ratio_pct = drawn_amount / committed_amount * 100`
- Ratings align with narrative (e.g., deterioration scenario has ratings going DOWN)
- Risk flag codes match the scenario type (e.g., `MATURITY_CONCENTRATION` for maturity wall)

### Validation Pipeline

**Tier 1: Syntax Validation (Automated)** — Parse DDL for duplicate columns, double commas, missing PKs. Parse INSERT statements for column count mismatches. Verify INSERT value types match DDL column types. Check constraint name lengths < 63 chars.

**Tier 2: Structural Validation (Automated)** — Check all PK tuples are unique within each table. Check every FK value exists in the parent table. Verify INSERT order (parents before children). Verify no orphaned rows.

**Tier 3: Narrative Validation (Semi-Automated)** — Query the complete FK chain (facility → agreement → counterparty). Verify exposure amounts are realistic. Verify risk flags match the scenario narrative. Verify time-series data has correct date progression.

**Tier 4: Dashboard Validation (Manual)** — Load data into the dashboard. Select each scenario. Verify the story is visible and makes sense. Check drill-through works (facility → counterparty → portfolio).

### Data Factory Scaling Rules

**ID Allocation Strategy** — Use a central ID registry:
```python
class IDRegistry:
    def __init__(self):
        self.allocated = {}  # table_name → set of allocated IDs
    def allocate(self, table, count, start=None):
        existing = self.allocated.get(table, set())
        if start is None:
            start = max(existing) + 1 if existing else 1
        new_ids = set(range(start, start + count))
        if new_ids & existing:
            raise ValueError(f"ID collision in {table}: {new_ids & existing}")
        self.allocated[table] = existing | new_ids
        return list(new_ids)
```

**Scenario Template** — Every scenario should be generated from a template:
```python
def generate_scenario(scenario_id, narrative, counterparty_count, facility_per_cp):
    registry = IDRegistry()
    cp_ids = registry.allocate('counterparty', counterparty_count,
                                base=1000 + scenario_id * 50)
    fac_ids = registry.allocate('facility_master',
                                counterparty_count * facility_per_cp,
                                base=5000 + scenario_id * 50)
    agr_ids = registry.allocate('credit_agreement_master', counterparty_count,
                                base=1000 + scenario_id * 20)
    # Generate L1 then L2 with correct FK references
    for i, cp_id in enumerate(cp_ids):
        yield insert_counterparty(cp_id, narrative.counterparties[i])
        yield insert_credit_agreement(agr_ids[i], cp_id)
        for j in range(facility_per_cp):
            yield insert_facility(fac_ids[i*facility_per_cp + j], agr_ids[i], cp_id)
    for fac_id, cp_id in zip(fac_ids, cycle(cp_ids)):
        yield insert_exposure_snapshot(fac_id, cp_id, narrative.exposure_params)
```

**The 5 Rules That Would Have Prevented Every Issue:**
1. **Never reuse IDs across scenarios** — allocate from a central registry
2. **Always generate L1 before L2** — create parents before children
3. **Always pass parent IDs to child generators** — don't hardcode, pass the actual allocated IDs
4. **Validate the complete FK chain after generation** — run the join query for every scenario
5. **Never apply blind transformations to FK values** — modular arithmetic, random sampling, etc. will break narrative coherence

### Data Dictionary ↔ DDL Sync

19. **The data dictionary is the source of truth for the visualizer, not the SQL files:**
    - Visualizer reads from `facility-summary-mvp/output/data-dictionary/data-dictionary.json`
    - DDL generator (`lib/ddl-generator.ts`) converts data dictionary → SQL via `sqlTypeForField()`
    - If you edit SQL DDL files directly, the data dictionary becomes out of sync — update both
    - Type priority: explicit `data_type` field in data dictionary > naming convention defaults in DDL generator

## GSIB Data Model Audit (`/audit-db`)

A reusable skill for running comprehensive GSIB-level effective challenge reviews of the credit risk data model. Invoke with `/audit-db`.

### What it does
- Reads all input sources (data dictionary, DDL files, table metadata, metric catalogue, YAML metrics)
- Runs 9-step review procedure across 7 parallel domains: Structural Integrity, Data Types/Naming, Semantic Quality, Layer/Temporal, GSIB Coverage, Metric System, Scalability
- Checks 15 required GSIB credit risk subject areas
- Produces `~/Downloads/GSIB_CreditRisk_DataModel_Review.xlsx` with 200-400 findings (17-column schema)
- Compares against previous review to show delta/progress

### Key files
- `.claude/skills/audit-db/SKILL.md` — full skill definition with review procedure, thresholds, severity rules
- `scripts/generate-gsib-review.py` — base finding generator (76 structural findings)
- `scripts/merge-gsib-findings.py` — merges base + agent JSON findings into comprehensive Excel
- `review-findings/*.json` — granular findings from parallel analysis agents

### When to run
- After schema changes (new tables, altered columns, new DDL)
- After adding new metrics or metric domains
- Periodic regulatory readiness review
- Before major releases or regulatory submissions

## Data Factory (Scenario & Time-Series Generator)

The data factory generates GSIB-quality L2 data at scale — both scenario-based narratives and weekly time-series snapshots. Located in `scenarios/factory/`.

### Architecture
```
scenarios/factory/
  scenario-runner.ts      # Orchestrator: YAML → ID alloc → chain → V2 → validate → SQL
  schema-validator.ts     # Systemic schema drift prevention (reads DD, validates all output)
  sql-emitter.ts          # Converts validated rows → SQL INSERT statements
  validator.ts            # FK integrity, PK uniqueness, referential checks
  seed-time-series.ts     # Phase 2: weekly time-series for seed facilities
  chain-builder.ts        # L1 FK chain construction (CP → agreement → facility)
  id-registry.ts          # Central ID allocation (no collisions)
  v2/                     # V2 state machine engine
    time-series.ts        # Monthly step function driving all generators
    facility-state.ts     # Per-facility mutable state (drawn amt, PD, rating, etc.)
    generators/           # Per-table row generators (exposure, risk, pricing, etc.)
    db-writer.ts          # Direct PG writer (alternative to SQL file output)
```

### Pipeline Flow
1. Parse YAML scenario configs → `scenario-config.ts`
2. Allocate IDs via central registry → `id-registry.ts`
3. Build L1 FK chain (counterparty → agreement → facility) → `chain-builder.ts`
4. Run V2 state machine (monthly steps, all generators) → `v2/time-series.ts`
5. **Schema validation** (DD-based, systemic) → `schema-validator.ts`
6. Structural validation (FK/PK/dedup) → `validator.ts`
7. Quality controls → `quality-controls.ts`
8. SQL emission → `sql-emitter.ts`

### Schema Drift Prevention (CRITICAL)

The `schema-validator.ts` module provides **systemic** protection against schema drift between the data factory and PostgreSQL. It reads the golden-source data dictionary and validates all generated data before SQL emission.

**How it works:**
1. On pipeline startup, `SchemaRegistry.fromDataDictionary()` loads `facility-summary-mvp/output/data-dictionary/data-dictionary.json`
2. Builds an in-memory `Map<"schema.table", Set<column>>` from the DD's L1/L2/L3 arrays
3. `validateLoadOrder()` checks that every table in `LOAD_ORDER` exists in the DD
4. `validateAgainstSchema()` checks every generated row's table and columns against the DD
5. Failed validation halts the pipeline with specific error messages + Levenshtein suggestions

**When DDL changes (new columns, renamed fields, new tables):**
1. Run `npm run db:introspect` (or let the PostToolUse hook auto-run it)
2. The schema-validator will **automatically catch** any factory generators that emit columns not in the updated DD
3. Fix the generator(s) — the error messages tell you exactly which table/column drifted
4. No manual cross-referencing needed — the validator is the safety net

**Common drift patterns caught by the validator:**
- `is_active` → `is_active_flag` (boolean columns use `_flag` suffix in PG)
- `is_developed_market` → `is_developed_market_flag`
- `credit_event_facility_link_id` → `link_id` (PK field renamed)
- `change_field` → `change_type` (column renamed in DDL migration)
- `risk_shifting_flag` → `is_risk_shifting_flag` (missing `is_` prefix)

### Running the Factory

```bash
# Generate all scenarios (S19-S56) → SQL file
cd scenarios/factory && npx tsx scenario-runner.ts

# Generate weekly time-series for seed facilities → SQL file
cd scenarios/factory && npx tsx seed-time-series.ts

# Load into PostgreSQL
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -f sql/gsib-export/06-factory-scenarios-v2.sql
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -f sql/gsib-export/07-seed-time-series.sql
```

### SQL Output Files
- `sql/gsib-export/06-factory-scenarios-v2.sql` — 38 scenarios, ~16K rows
- `sql/gsib-export/07-seed-time-series.sql` — weekly time-series, ~128K rows

### Factory-Specific Lessons Learned

| Bug | Example | Fix |
|-----|---------|-----|
| Duplicate SQL templates | `FACTORY_COUNTRY_SETUP` in both `sql-emitter.ts` AND `db-writer.ts` | Always search for duplicated constant arrays — fix in ALL locations |
| PG returns NUMERIC as strings | `state.pd_annual.toFixed is not a function` | Use `numericize()` to convert PG query results before passing to V2 engine |
| PG returns DATE as JS Date objects | `"time zone gmt-0400 not recognized"` in SQL | Convert Date objects to `YYYY-MM-DD` strings before SQL emission |
| ESM/CJS pg import | `new Client()` fails with SCRAM error | Use `(pg as any).default?.Client ?? (pg as any).Client` pattern |
| Rating tier enum mismatch | `INVESTMENT_GRADE` vs `IG_HIGH` | Always check actual enum values in V2 types, not human-readable labels |
| Size profile enum mismatch | `MEDIUM` vs `MID` | Same — check `SizeProfile` type definition for valid values |
| `_flag` suffix convention | `is_active` column doesn't exist | ALL boolean columns in PG use `_flag` suffix — `is_active_flag`, `is_developed_market_flag`, etc. |
| search_path for cross-schema queries | `l1.collateral_asset_master` not found | Set `search_path TO l1, l2, public` before querying, OR remove schema prefixes |
| ON CONFLICT for idempotent loads | Weekly data overlaps existing monthly dates | Use `ON CONFLICT DO NOTHING` so re-runs don't fail on existing data |
| drawn_amount vs outstanding_balance_amt | Factory wrote `outstanding_balance_amt` but metrics use `drawn_amount` — 87% NULL | Exposure generator must populate BOTH column aliases. PG has both columns in FES. |
| Internal industry_id emitted to PG | `industry_id: profile.industry_id` emits factory ID 1-10, not NAICS 11+ | gsib-enrichment now maps via `industryMap.naicsCode`. Never emit `profile.industry_id` raw. |
| entity_type_code = NAICS prefix | RE counterparties got `entity_type_code = '53'` instead of `'RE'` | enrichCounterparty now throws on unknown industry_id. QC group 1 upgraded to error severity. |
| No FX rate rows generated | Factory has BASE_FX_RATES in market-environment but never writes l2.fx_rate | New fx-rate.ts generator creates rate rows for all (currency, date) combinations. |
| DPD buckets hardcoded wrong | Generator used `'0-30', '31-60', '61-90'` — not in l1.dpd_bucket_dim | Updated to FFIEC standard: `'CURRENT', '1-29', '30-59', '60-89', '90+'`. |
| QC registry fail = silent skip | `ReferenceDataRegistry.fromSeedSQL()` catch block just warned and continued | Now calls `process.exit(1)` — QC is mandatory for production data. |

## Agent Suite Architecture

A 3-layer agent system for GSIB credit risk metric decomposition, schema management, data generation, and regulatory compliance. 20 agents across experts, builders, and reviewers, coordinated by a master orchestrator.

### Directory Structure
```
.claude/
  commands/
    add-metric.md              # 10-phase metric addition workflow (entry point)
    fix-metric.md              # Metric debugging workflow
    review-pr.md               # PR review workflow
    experts/                   # Layer 1: Domain decomposition agents
      decomp-credit-risk.md    # Credit risk (PD, LGD, EAD, EL, DSCR, LTV, CECL)
      decomp-capital.md        # Capital adequacy (CET1, RWA, SLR, TLAC, SCB)
      decomp-ccr.md            # Counterparty credit risk (SA-CCR, CVA, PFE)
      decomp-liquidity.md      # Liquidity (LCR, NSFR, HQLA, FR 2052a)
      decomp-market-risk.md    # Market risk (FRTB, VaR, ES, SBM, DRC)
      decomp-irrbb-alm.md      # Interest rate risk (NII, EVE, FTP, duration gap)
      decomp-oprisk.md         # Operational risk (SMA, KRI, RCSA)
      decomp-compliance.md     # Compliance (DFAST/CCAR, Volcker, BSA/AML)
      data-model-expert.md     # Schema gap analysis (DDL recommendations)
      reg-mapping-expert.md    # Regulatory coverage mapping (FR Y-14Q, FFIEC)
    builders/                  # Layer 2: Execution agents
      db-schema-builder.md     # DDL validation (6-test battery) + transactional apply
      migration-manager.md     # Migration lifecycle (ordering, rollback, registry)
      data-factory-builder.md  # GSIB-quality synthetic L2 data generation
      metric-config-writer.md  # Decomposition → YAML metric config translator
    reviewers/                 # Layer 3: Quality gate agents
      risk-expert-reviewer.md  # PRE/POST execution gate (10-dimension assessment)
      sr-11-7-checker.md       # SR 11-7 / OCC 2011-12 documentation completeness
      drift-monitor.md         # Schema divergence detection (manifest vs live DB)
      audit-reporter.md        # Audit trail reporting (activity, findings, coverage)
  config/
    bank-profile.yaml          # Institutional config (tier, stripes, DB, agent defaults)
    generate-schema-manifest.ts # Generator: DD → schema-manifest.yaml
  audit/
    sessions/                  # JSON session logs (one file per agent run)
    schema-changes/            # JSON records of DDL changes (one per change)
    schema/
      audit_ddl.sql            # DDL for postgres_audit database (5 tables, 3 views)
    audit_logger.py            # Python utility for dual-destination audit writes
```

### Complete Agent Inventory

#### Layer 1 — Experts (Decomposition & Analysis)

| Agent | File | Invocation | Description |
|-------|------|------------|-------------|
| Credit Risk Decomp | `experts/decomp-credit-risk.md` | `/experts:decomp-credit-risk EL` | Reference implementation. Decomposes credit risk metrics into atomic ingredients, formulas, rollup architecture, schema gaps. Covers PD, LGD, EAD, EL, DSCR, LTV, CECL, NPL, migration matrices. |
| Capital Decomp | `experts/decomp-capital.md` | `/experts:decomp-capital CET1` | Capital adequacy: CET1, Tier 1, Total Capital ratios, RWA, SLR, TLAC, capital buffers, SCB, binding constraint. |
| CCR Decomp | `experts/decomp-ccr.md` | `/experts:decomp-ccr SA-CCR` | Counterparty credit risk: SA-CCR, CVA, PFE, EPE, wrong-way risk, netting, central clearing. |
| Liquidity Decomp | `experts/decomp-liquidity.md` | `/experts:decomp-liquidity LCR` | Liquidity: LCR, NSFR, HQLA, FR 2052a, intraday liquidity, funding concentration. |
| Market Risk Decomp | `experts/decomp-market-risk.md` | `/experts:decomp-market-risk FRTB` | Market risk: FRTB (IMA+SA), VaR, ES, SBM, DRC, RRAO, P&L attribution, backtesting. |
| IRRBB & ALM Decomp | `experts/decomp-irrbb-alm.md` | `/experts:decomp-irrbb-alm NII` | Interest rate risk: NII/EVE sensitivity, repricing gap, basis risk, FTP, duration gap. |
| OpRisk Decomp | `experts/decomp-oprisk.md` | `/experts:decomp-oprisk SMA` | Operational risk: SMA (Basel IV), Business Indicator, ILM, loss events, KRI, RCSA. |
| Compliance Decomp | `experts/decomp-compliance.md` | `/experts:decomp-compliance DFAST` | Compliance: DFAST/CCAR, FR Y-14, living wills, LEX, Volcker, BSA/AML, CRA. |
| Data Model Expert | `experts/data-model-expert.md` | `/experts:data-model-expert` | Analyzes schema gaps from decompositions. Produces DDL recommendations for DB Schema Builder. |
| Reg Mapping Expert | `experts/reg-mapping-expert.md` | `/experts:reg-mapping-expert` | Maps data model against US + BCBS regulatory requirements. Quantified coverage scores per schedule. |

#### Layer 2 — Builders (Execution & Implementation)

| Agent | File | Invocation | Description |
|-------|------|------------|-------------|
| DB Schema Builder | `builders/db-schema-builder.md` | `/builders:db-schema-builder` | Validates DDL with 6-test battery (syntax, duplicates, FK integrity, data types, naming, constraint lengths). Applies transactionally with rollback DDL. Requires PRE_EXECUTION reviewer gate. |
| Migration Manager | `builders/migration-manager.md` | `/builders:migration-manager` | Tracks migration lifecycle: ordering, dependencies, applied vs pending status, rollback scripts. Manages `sql/migrations/` directory. |
| Data Factory Builder | `builders/data-factory-builder.md` | `/builders:data-factory-builder` | Generates GSIB-quality synthetic L2 data via V2 state-machine engine. Schema-validated against DD. Correlation-aware (PD-LGD-EAD triangles). |
| Metric Config Writer | `builders/metric-config-writer.md` | `/builders:metric-config-writer` | Translates decomposition JSON into executable YAML metric configs. Runs calc:sync, calc:demo, PG validation. Bridges analysis → code. |

#### Layer 3 — Reviewers (Quality Gates & Compliance)

| Agent | File | Invocation | Description |
|-------|------|------------|-------------|
| Risk Expert Reviewer | `reviewers/risk-expert-reviewer.md` | `/reviewers:risk-expert-reviewer DDL path/to/file.sql` | Dual-mode gate: PRE_EXECUTION (blocks bad changes) + POST_EXECUTION (catches regressions). 10-dimension assessment. Returns APPROVED / BLOCKED / APPROVED_WITH_CONDITIONS. |
| SR 11-7 Checker | `reviewers/sr-11-7-checker.md` | `/reviewers:sr-11-7-checker` | Validates SR 11-7 / OCC 2011-12 model risk management documentation completeness. Checks required artifacts exist and are populated. |
| Drift Monitor | `reviewers/drift-monitor.md` | `/reviewers:drift-monitor` | Detects schema divergence between data dictionary/manifest and live PostgreSQL. Catches out-of-pipeline changes (manual psql, raw migrations). |
| Audit Reporter | `reviewers/audit-reporter.md` | `/reviewers:audit-reporter` | Generates audit reports from JSON + postgres_audit. Activity patterns, schema change velocity, finding resolution rates, regulatory coverage gaps. |

#### Orchestrator

| Agent | File | Invocation | Description |
|-------|------|------------|-------------|
| Master Orchestrator | `commands/orchestrate.md` | `/orchestrate add CECL allowance` | Coordinates multi-agent workflows end-to-end. 6 modes: DECOMPOSE, BUILD, FULL, REVIEW, MONITOR, DRY_RUN. Session resume, failure handling (retry/skip/abort), blocking reviewer gates. |

### Pipeline Flow

```
User: "Add CECL allowance metric"
  │
  ├─ 1. DECOMPOSE ──→ /experts:decomp-credit-risk CECL
  │     Output: metric_definition, ingredients, schema_gaps, rollup_architecture, regulatory_mapping
  │
  ├─ 2. REVIEW (PRE) ──→ /reviewers:risk-expert-reviewer (mode: pre_execution)
  │     Output: APPROVED | BLOCKED | APPROVED_WITH_CONDITIONS
  │     If BLOCKED → remediate → re-submit
  │
  ├─ 3. SCHEMA GAP ──→ /experts:data-model-expert → DDL recommendations
  │     ├──→ /builders:db-schema-builder → 6-test battery → apply DDL
  │     └──→ /builders:migration-manager → track migration
  │
  ├─ 4. REVIEW (POST) ──→ /reviewers:risk-expert-reviewer (mode: post_execution)
  │     Verify DDL applied correctly, no regressions
  │
  ├─ 5. DATA ──→ /builders:data-factory-builder → generate L2 test data
  │
  ├─ 6. METRIC ──→ /builders:metric-config-writer → YAML + calc:sync + calc:demo
  │
  ├─ 7. DOCS ──→ /reviewers:sr-11-7-checker → documentation completeness
  │
  └─ 8. AUDIT ──→ /reviewers:audit-reporter → session summary
```

### Configuration Files

**bank-profile.yaml** — Institutional configuration read by ALL agents. Key fields:
- `institution_tier`: GSIB (drives severity thresholds, regulatory scope)
- `active_risk_stripes[]`: 9 stripes (credit_risk live; 8 others planned) — filters domain routing
- `database.primary/capital/audit`: Connection details, schemas, conventions
- `migration_tooling`: psql path, env file, migration directory
- `agent_defaults.require_reviewer_gate`: true (non-bypassable)
- `agent_defaults.default_confidence_threshold`: MEDIUM

**schema-manifest.yaml** — Auto-generated from data dictionary. Contains every table, column, type, FK. Regenerate:
```bash
npx tsx .claude/config/generate-schema-manifest.ts
```

### 4-Layer Audit Trail

| Layer | Location | What Gets Logged | When |
|-------|----------|-----------------|------|
| **Local JSON** | `.claude/audit/sessions/{session_id}_{agent}_{timestamp}.json` | Full reasoning chain, actions, output payload, duration | Every agent run |
| **Schema Changes** | `.claude/audit/schema-changes/{change_id}.json` | Before/after DDL, rollback script, reviewer approval | Every DDL change |
| **PostgreSQL** | `postgres_audit.audit.*` (5 tables) | `agent_runs`, `schema_changes`, `metric_decompositions`, `review_findings`, `data_lineage` | Best-effort DB write alongside local JSON |
| **Git** | Standard commit history | Code/config changes with descriptive messages | Every commit |

**AuditLogger API** (`.claude/audit/audit_logger.py`):
```python
logger = AuditLogger(agent_name="decomp-credit-risk", trigger_source="user")
logger.write_reasoning_step(1, "Analyzing CECL ingredients", "PD, LGD, EAD required", confidence="HIGH")
logger.write_action("DECOMPOSITION_COMPLETE", "8 ingredients identified")
logger.write_schema_change("ADD_COLUMN", "l2", "facility_risk_snapshot", ddl_statement="ALTER TABLE...")
logger.write_finding("F-001", "SCHEMA_GAP", "HIGH", "credit_risk", "Missing lifetime_pd column")
logger.finalize_session("completed", output_payload={...})
```

### Session Sequencing (Build Order)

| Session | Agents Built | Depends On | File(s) Created |
|---------|-------------|------------|-----------------|
| S0 | Foundation | — | `bank-profile.yaml`, `audit_ddl.sql`, `audit_logger.py` |
| S1 | Credit Risk Decomp Expert | S0 | `experts/decomp-credit-risk.md` (reference implementation) |
| S2 | Data Model Expert + Reg Mapping Expert | S0 | `experts/data-model-expert.md`, `experts/reg-mapping-expert.md` |
| S2.5 | 7 Domain Decomp Experts | S1 (pattern) | `experts/decomp-{capital,ccr,liquidity,market-risk,irrbb-alm,oprisk,compliance}.md` |
| S3 | DB Schema Builder + Migration Manager | S2 | `builders/db-schema-builder.md`, `builders/migration-manager.md` |
| S4 | Risk Expert Reviewer + SR 11-7 Checker | S1 | `reviewers/risk-expert-reviewer.md`, `reviewers/sr-11-7-checker.md` |
| S5 | Data Factory Builder + Metric Config Writer | S3 | `builders/data-factory-builder.md`, `builders/metric-config-writer.md` |
| S6 | Dashboard Generator (stretch) | S1, S3 | `builders/dashboard-generator.md` (**NOT BUILT**) |
| S7 | Drift Monitor + Audit Reporter | S3, S0 | `reviewers/drift-monitor.md`, `reviewers/audit-reporter.md` |
| S8 | Master Orchestrator | All prior | `commands/orchestrate.md` |
| S9 | Integration test + CLAUDE.md update | S8 | This section |

### Adding a New Risk Stripe Expert

To add a new decomposition expert (e.g., for a new risk stripe):

1. Copy `experts/decomp-credit-risk.md` as template (reference implementation)
2. Replace domain-specific content: metric coverage list, ingredient patterns, regulatory references
3. Preserve the interface contract:
   - **Mode A** (direct): intake questions → structured decomposition JSON
   - **Mode B** (orchestrator): receives `{mode: "orchestrator", session_id, metric_name, ...}` → returns JSON
4. Include audit logging: `AuditLogger(agent_name="decomp-{stripe}")` with `write_reasoning_step()`, `write_action()`, `finalize_session()`
5. Add the stripe to `bank-profile.yaml` under `active_risk_stripes`
6. Register in orchestrator's agent map (when built)

### Agent Invocation Modes

All agents support two invocation modes:

**Mode A — Direct (user-facing):**
```
/experts:decomp-credit-risk EL
/builders:db-schema-builder
/reviewers:risk-expert-reviewer DDL sql/migrations/005.sql
/reviewers:risk-expert-reviewer metric EXP-001
/reviewers:drift-monitor
/reviewers:audit-reporter
```

**Mode B — Orchestrator (structured JSON):**
```json
{
  "mode": "orchestrator",
  "session_id": "uuid",
  "metric_name": "Expected Loss",
  "risk_stripe": "credit_risk",
  ...
}
```

### Payload Contracts Between Agents

**Decomp Expert → Metric Config Writer:**
```json
{
  "metric_definition": { "name": "...", "class": "CALCULATED", "direction": "..." },
  "ingredients": [{ "field": "...", "table": "...", "schema": "l2", "role": "MEASURE" }],
  "schema_gaps": [{ "type": "MISSING_COLUMN", "table": "...", "column": "...", "blocking": true }],
  "rollup_architecture": { "strategy": "sum-ratio", "levels": { "facility": "...", "counterparty": "..." } },
  "regulatory_mapping": { "fr_y14q": "...", "bcbs": "..." }
}
```

**Data Model Expert → DB Schema Builder:**
```json
{
  "mode": "orchestrator",
  "session_id": "uuid",
  "changes": [{ "change_type": "ADD_COLUMN", "object_schema": "l2", "object_name": "table", "ddl_statement": "ALTER TABLE..." }],
  "auto_execute": false
}
```

**Builder → Risk Expert Reviewer:**
```json
{
  "mode": "pre_execution",
  "review_target_type": "schema_change",
  "payload": { ... },
  "session_id": "uuid"
}
```
Reviewer returns: `{ "gate_decision": "APPROVED|BLOCKED|APPROVED_WITH_CONDITIONS", "findings": [...], "regulatory_coverage_score": 85 }`

### Known Issues (S9 Integration Test)

| Issue | Severity | Status |
|-------|----------|--------|
| `dashboard-generator.md` not built | LOW | S6 stretch goal; not required for pipeline |

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Agent can't load schema-manifest.yaml | File not generated | Run `npx tsx .claude/config/generate-schema-manifest.ts` |
| Audit writes fail silently | `postgres_audit` DB not created | Apply `audit_ddl.sql`: `psql -d postgres_audit -f .claude/audit/schema/audit_ddl.sql` |
| Reviewer returns unexpected mode error | Mode string format mismatch | Use snake_case in JSON: `"pre_execution"`, not `"PRE_EXECUTION"` |
| DB Schema Builder skips reviewer gate | Never happens — gate is non-bypassable | If gate logic is missing, check `require_reviewer_gate: true` in bank-profile.yaml |
| Decomp expert routes to wrong domain | Stripe not in `active_risk_stripes` | Add stripe to bank-profile.yaml with `status: live` |
| Pipeline halts at Data Factory | Source tables have 0 rows | Metric Config Writer returns `"data_needed"` — orchestrator must sequence Data Factory first |
| Metric formula passes sql.js but fails PG | Schema drift between sql.js sample and PG | Always test `formula_sql` against PostgreSQL (Phase 5A) |
