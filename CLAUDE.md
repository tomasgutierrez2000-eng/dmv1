# CLAUDE.md — Data Model Visualizer

## Project Overview
Banking data model visualization platform with metrics calculation engine. Next.js 14 App Router, TypeScript, Tailwind CSS, Zustand, Recharts. PostgreSQL + sql.js for calculations.

## Architecture: Three-Layer Data Model
- **L1 (Business Segment):** Core entity-level tables, reference data
- **L2 (Portfolio):** Consolidated views of L1 data
- **L3 (Desk/Derived):** 106+ calculated metrics and fact tables across 7 dashboard pages (P1–P7)

Rollup hierarchy: **Facility → Counterparty → Desk (L3) → Portfolio (L2) → Business Segment (L1)**

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
  l3-tables.ts          # 50 L3 table definitions
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
