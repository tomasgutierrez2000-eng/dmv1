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

## Adding a New Metric (Common Workflow)
1. Add CatalogueItem to `data/metric-library/catalogue.json` with `item_id`, `level_definitions`, `ingredient_fields`
2. If executable: add L3Metric entry to `data/l3-metrics.ts` with `formulaSQL` and `sourceFields`
3. Link via `executable_metric_id` on the catalogue item
4. Add demo data if interactive walkthrough is needed
5. Add lineage page in `app/metrics/[metric]-lineage/` if custom visualization needed

## Conventions
- **Commit messages:** Descriptive English — `Add [feature]`, `Fix [bug]`, `Merge branch 'claude/...'`
- **Branch naming:** `claude/<adjective-scientist>` for worktree sessions
- **Component files:** PascalCase (`LineageExplorer.tsx`)
- **API responses:** `{ ok?: boolean, error?: string, data?: T }`
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
npm run sync:data-model  # Sync model definitions
npm run export:data-model # Export to Excel
```

## Environment Variables
```
GOOGLE_GEMINI_API_KEY    # Gemini agent
ANTHROPIC_API_KEY        # Claude integration
AGENT_PROVIDER           # gemini|claude|ollama
```

## Important Patterns
- **Metric storage priority:** Excel (`metrics_dimensions_filled.xlsx`) > JSON (`metrics-custom.json`) > seed metrics — merged via `getMergedMetrics()`
- **Schema bundle** (`/api/schema/bundle`): unified DataDictionary + L3 Tables + L3 Metrics. Supports `?summary=true` for token-efficient agent prompts
- **Data dictionary** cached at `facility-summary-mvp/output/data-dictionary/data-dictionary.json`
- When modifying metrics: always update both the catalogue item AND the L3 metric definition if both exist
- Level definitions use `sourcing_type`: `Raw` (direct field), `Calc` (computed), `Agg` (aggregated), `Avg` (weighted average)

## GCP Cloud SQL PostgreSQL — DDL & Data Upload Rules

When generating or modifying SQL DDL or INSERT data for PostgreSQL upload, follow these rules to avoid syntax errors, type mismatches, and FK constraint violations.

### DDL Syntax Rules

1. **Reserved words as column names must be double-quoted:**
   - `value` is reserved in PostgreSQL — always use `"value"` in CREATE TABLE and INSERT column lists
   - Other truly reserved words: `ALL`, `AND`, `ARRAY`, `AS`, `BETWEEN`, `CASE`, `CHECK`, `COLUMN`, `CONSTRAINT`, `CREATE`, `CROSS`, `DEFAULT`, `DISTINCT`, `DO`, `ELSE`, `END`, `EXCEPT`, `FALSE`, `FETCH`, `FOR`, `FOREIGN`, `FROM`, `FULL`, `GRANT`, `GROUP`, `HAVING`, `IN`, `INNER`, `INTO`, `IS`, `JOIN`, `LEADING`, `LEFT`, `LIKE`, `LIMIT`, `NOT`, `NULL`, `OFFSET`, `ON`, `ONLY`, `OR`, `ORDER`, `OUTER`, `PRIMARY`, `REFERENCES`, `RIGHT`, `SELECT`, `TABLE`, `THEN`, `TO`, `TRUE`, `UNION`, `UNIQUE`, `USER`, `USING`, `WHEN`, `WHERE`, `WINDOW`, `WITH`
   - Non-reserved (OK unquoted): `name`, `status`, `type`, `key`, `comment`, `level`, `role`, `action`, `source`, `position`, `domain`

2. **Constraint name length limit is 63 characters (NAMEDATALEN):**
   - PostgreSQL silently truncates names >63 chars — no error, but confusing when debugging
   - Use abbreviations for long table names in constraint names (e.g., `fk_ca_cp_participation_` instead of `fk_credit_agreement_counterparty_participation_`)

3. **Every table MUST have a PRIMARY KEY** for GCP Cloud SQL logical replication. Use `BIGSERIAL PRIMARY KEY` for fact tables without a natural key.

4. **SET search_path** is required when FK REFERENCES cross schemas:
   - L2 DDL: `SET search_path TO l1, l2, public;` (references L1 tables)
   - L3 DDL: `SET search_path TO l1, l2, l3, public;` (references L1/L2 tables)
   - L1 DDL: not needed if all FKs are within L1 and fully schema-qualified

5. **COALESCE in unique indexes must match column type:**
   - BIGINT column: `COALESCE(facility_id, 0)` — NOT `COALESCE(facility_id, '')`
   - VARCHAR column: `COALESCE(variant_id, '')` — NOT `COALESCE(variant_id, 0)`

### Data Type Rules

6. **ID columns use BIGINT, not VARCHAR(64):**
   - All `_id` columns across L1, L2, L3 are `BIGINT` (e.g., `counterparty_id BIGINT`)
   - Exception: `metric_id`, `variant_id`, `source_metric_id`, `mdrm_id`, `mapped_line_id`, `mapped_column_id` remain `VARCHAR(64)` — these store string identifiers, not numeric IDs
   - The DDL generator (`lib/ddl-generator.ts`) defaults `_id` to BIGINT; override via explicit `data_type` in data dictionary for string IDs

7. **Code columns use VARCHAR, not BIGINT:**
   - `_code` suffix columns (e.g., `fr2590_category_code`, `pricing_tier_code`, `internal_risk_rating_bucket_code`) are `VARCHAR(20)` or `VARCHAR(30)`
   - If a dim table PK is VARCHAR, all FK references must also be VARCHAR — never mix BIGINT PK with VARCHAR FK or vice versa

8. **INSERT value types must match column DDL types exactly:**
   - BIGINT/INTEGER column: unquoted integer → `42` (not `'42'`)
   - VARCHAR column: quoted string → `'STANDARD'` (not `STANDARD` or `42`)
   - NUMERIC/DECIMAL column: unquoted number → `125.50` (not `'125.50'`)
   - DATE column: quoted string → `'2025-01-31'`
   - NULL: always unquoted → `NULL`
   - PostgreSQL will implicitly cast `'42'` to INTEGER, but bare `42` into VARCHAR will fail

9. **No non-numeric strings in NUMERIC columns:**
   - `'SOFR-30D'` in a `NUMERIC(10,4)` column will crash — use a numeric rate value like `0.0530`
   - If a column stores both codes and numbers, the DDL type must be VARCHAR

### FK Referential Integrity Rules

10. **Parent table INSERTs must appear BEFORE child table INSERTs in the data file:**
    - L1 dim/reference tables first, then L1 master tables, then L2 snapshot/event tables
    - If a dim table (e.g., `pricing_tier_dim`) is defined late in the DDL, its seed data still must load before any L2 table that references it

11. **Every FK value in a child row must exist in the parent table:**
    - Watch for non-contiguous parent ID ranges (e.g., seed IDs 1-100 + scenario IDs 5001-5050 creates a gap at 101-5000)
    - Child rows referencing IDs in the gap will violate FK constraints
    - Fix: cap child FK values using `valid_ids[(value - 1) % len(valid_ids)]` where `valid_ids` is built from actual parent INSERT data

12. **String FK values must exactly match parent PK values:**
    - `pricing_tier = 'STANDARD'` fails if `pricing_tier_dim` only has codes `'1'`-`'10'` (where `'3'` = Standard)
    - `credit_status_code = 'CURRENT'` fails if the dim table uses integer codes `1`-`10`
    - Always verify FK string values against the actual parent PK values, not human-readable labels

13. **After capping FK values, check for duplicate composite PKs:**
    - Modular arithmetic capping can map multiple child rows to the same parent ID, creating PK collisions
    - Run a deduplication pass: track `(pk_col_1, pk_col_2, ...)` tuples and drop duplicates

14. **Validate ALL FK constraints, not just L2→L1:**
    - L1 tables have internal FKs (e.g., `counterparty_hierarchy.counterparty_id → counterparty.counterparty_id`)
    - L2 tables have self-referential FKs (e.g., `amendment_change_detail.amendment_id → amendment_event.amendment_id`)
    - Check all 156 constraints (90 L1 internal + 66 L2→L1/L2)

### Data Dictionary ↔ DDL Sync

15. **The data dictionary is the source of truth for the visualizer, not the SQL files:**
    - Visualizer reads from `facility-summary-mvp/output/data-dictionary/data-dictionary.json`
    - DDL generator (`lib/ddl-generator.ts`) converts data dictionary → SQL via `sqlTypeForField()`
    - If you edit SQL DDL files directly, the data dictionary becomes out of sync — update both
    - Type priority: explicit `data_type` field in data dictionary > naming convention defaults in DDL generator

16. **DDL generator type inference defaults (in `lib/ddl-generator.ts`):**
    - `_id` → `BIGINT` (override with explicit `data_type: "VARCHAR(64)"` for string IDs)
    - `_code` → `VARCHAR(30)`
    - `_name`, `_desc`, `_text` → `VARCHAR(500)`
    - `_amt` → `NUMERIC(20,4)`
    - `_pct` → `NUMERIC(10,6)`
    - `_value` → `NUMERIC(12,6)`
    - `_count` → `INTEGER`
    - `_flag` → `BOOLEAN`
    - `_date` → `DATE`
    - `_ts` → `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
    - `_bps` → `NUMERIC(10,4)`
    - fallback → `VARCHAR(64)`
