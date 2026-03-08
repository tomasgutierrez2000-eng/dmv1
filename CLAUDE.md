# CLAUDE.md — Data Model Visualizer

## Project Overview
Banking data model visualization platform with metrics calculation engine. Next.js 14 App Router, TypeScript, Tailwind CSS, Zustand, Recharts. PostgreSQL + sql.js for calculations.

## Architecture: Three-Layer Data Model
- **L1 — Reference Data (82 tables):** Dimensions, masters, lookups, hierarchies, configuration. Rarely changes. Examples: `counterparty`, `facility_master`, `currency_dim`, `metric_threshold`
- **L2 — Atomic Data (25 tables):** Raw source-system snapshots and events. Point-in-time observations, not computed. Examples: `facility_exposure_snapshot`, `credit_event`, `position`
- **L3 — Derived Data (54 tables):** Anything calculated, aggregated, or computed from L1+L2. Examples: `exposure_metric_cube`, `facility_financial_calc`, `stress_test_result`

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
  l3-metrics.ts         # 106+ metric definitions (SOURCE OF TRUTH for L3 metrics)
  l3-tables.ts          # 54 L3 table definitions
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

## Adding a New Metric (Automated Pipeline)
**One command:** Write YAML → `npm run calc:full` → catalogue + demo + viz config all auto-generated.

1. **Write YAML** in `scripts/calc_engine/metrics/{domain}/{METRIC_ID}.yaml` with `catalogue` block:
   ```yaml
   catalogue:
     item_id: "MET-XXX"           # Catalogue ID (default: metric_id)
     abbreviation: "SHORT_NAME"   # For UI display
     insight: "Business insight..."
     rollup_strategy: "direct-sum" # or "sum-ratio", "weighted-avg"
     primary_value_field: "result_field_name"
   ```
2. **(Optional) Write Python calculator** in `scripts/calc_engine/calculators/` for auto-generated demo data. Register in `__init__.py`.
3. **Run `npm run calc:full`** — syncs YAML → Excel + catalogue (creates if new), generates ingredient_fields from YAML source_tables, builds viz config, runs Python demo generator.

### Individual commands
- `npm run calc:sync` — YAML → Excel + catalogue (no demo data)
- `npm run calc:demo -- --metric MET-XXX --persist --force` — generate demo for one metric
- `npm run calc:demo:all` — generate demo for all metrics with calculators
- `npm run calc:full` — calc:sync + calc:demo:all

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
```

## Environment Variables
```
DATABASE_URL             # PostgreSQL (Neon) — golden source for schema
GOOGLE_GEMINI_API_KEY    # Gemini agent
ANTHROPIC_API_KEY        # Claude integration
AGENT_PROVIDER           # gemini|claude|ollama
```

## Golden Source: PostgreSQL
The live PostgreSQL database (Neon, via `DATABASE_URL`) is the **golden source of truth** for all table structures, fields, data types, PKs, and FKs. The data flow is:

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

## Important Patterns
- **Metric storage priority:** Excel (`metrics_dimensions_filled.xlsx`) > JSON (`metrics-custom.json`) > seed metrics — merged via `getMergedMetrics()`
- **Schema bundle** (`/api/schema/bundle`): unified DataDictionary + L3 Tables + L3 Metrics (metrics list = `getMergedMetrics()` so agent and calculation see the same set). Supports `?summary=true` for token-efficient agent prompts
- **Data dictionary** cached at `facility-summary-mvp/output/data-dictionary/data-dictionary.json`. Updated by `db:introspect` (PostgreSQL) or `sync:data-model` (DDL fallback). The visualizer and data-model APIs read from it.
- When modifying metrics: always update both the catalogue item AND the L3 metric definition if both exist
- Level definitions use `sourcing_type`: `Raw` (direct field), `Calc` (computed), `Agg` (aggregated), `Avg` (weighted average)

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
