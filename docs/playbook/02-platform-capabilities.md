# 02 - Platform Capabilities

This section describes what the platform offers. Understanding these tools will help you see what your risk stripe is onboarding into, and what you get out of the box once your tables and metrics are defined.

---

## Data Model Visualizer (`/visualizer`)

The interactive visualizer renders all 182+ tables as draggable nodes on an SVG canvas, organized by L1/L2/L3 layers with color coding.

**Key features:**
- **Table nodes** -- Each table appears as a card showing the table name, layer, and a status dot indicating database state
- **Status dots** -- Green (has data), Amber (empty table), Red hollow (defined in data dictionary but not in DB), Orange (exists in DB but not in data dictionary)
- **Field detail** -- Click any table to expand its fields, showing PKs, FKs, data types, and descriptions
- **Field-level drift detection** -- The detail panel shows color-coded badges when the data dictionary and live PostgreSQL are out of sync (red = missing in DB, blue = extra in DB, orange = type mismatch)
- **Relationship lines** -- FK relationships are drawn as SVG lines between tables, making it easy to trace joins
- **Search and filter** -- Filter tables by layer (L1/L2/L3), category, or free-text search
- **Layout modes** -- Switch between domain-overview (grouped by business category), snowflake, and logical layouts
- **DDL export** -- Generate CREATE TABLE SQL for any table directly from the visualizer
- **Minimap** -- Overview minimap for navigating large models

**When onboarding:** Use the visualizer as your first stop to browse existing tables, understand FK relationships, and identify which tables your stripe can reuse.

---

## Metric Library (`/metrics/library`)

The metric library is the catalogue of all business metrics across all risk stripes.

**Key features:**
- **105+ catalogue items** across 7 domains (Amendments, Capital, Exposure, Pricing, Profitability, Reference, Risk)
- **Each catalogue item shows:**
  - Business definition and formula
  - Ingredient fields -- the raw L1/L2 fields it reads
  - Level definitions -- how the metric computes at each rollup level (facility, counterparty, desk, portfolio, business segment)
  - Sourcing type -- Raw (direct field read), Calc (computed), Agg (aggregated), Avg (weighted average)
- **Interactive demo walkthroughs** -- Step through a metric's calculation with sample data at each rollup level
- **Lineage visualization** -- SVG DAG showing source fields flowing through intermediate calculations to the final metric value
- **Domain filtering and search** -- Browse by domain or search across all metrics

**When onboarding:** Explore existing metrics in related domains. Your new metrics will appear here automatically after running `npm run calc:sync`.

---

## Metric Calculation Engine

The engine executes metric calculations defined in YAML specs. It follows this pipeline:

```
YAML metric spec  -->  Formula resolution  -->  SQL execution  -->  Results
                       (per rollup level)       (sql.js or PG)     (metric_result table)
```

**How it works:**
1. **Formula Resolution** -- For a given metric and rollup level, the engine finds the right SQL formula. It checks `formulasByDimension[level]` first, then falls back to the base `formulaSQL`.
2. **SQL Execution** -- Runs the SQL against either in-memory sql.js (for demos) or PostgreSQL (for production). Every formula must return `dimension_key` and `metric_value` columns.
3. **Validation** -- Post-calculation checks (NOT_NULL, NON_NEGATIVE, cross-level reconciliation, period-over-period thresholds).

**The 5 rollup levels:**

| Level | Grain | Typical Aggregation |
|-------|-------|-------------------|
| `facility` | Per-facility or per-position | RAW or CUSTOM |
| `counterparty` | Per-counterparty | SUM, WEIGHTED_AVG |
| `desk` | Per desk/org-unit (L3 taxonomy) | SUM |
| `portfolio` | Per portfolio (L2 taxonomy) | SUM |
| `business_segment` | Per business segment (L1 taxonomy) | SUM |

**Key CLI commands:**

```bash
npm run calc:run -- --metric MKT-001     # Execute one metric
npm run calc:validate -- --metric MKT-001 # Validate one metric
npm run calc:dag                          # Show metric dependency graph
npm run calc:list                         # List all registered metrics
```

---

## AI Agent (`/agent`)

The AI agent answers natural-language questions about the data model. It has access to the full schema bundle and can query tables, fields, relationships, and metrics.

**Example questions:**
- "What L1 tables exist in the Market Data category?"
- "Show me the fields in facility_risk_snapshot"
- "Which metrics use the position table?"
- "What FKs does facility_master have?"

**When onboarding:** Use the agent to quickly explore the model without manually browsing the data dictionary.

---

## DB Status Dashboard (`/db-status`)

Live reconciliation between the data dictionary and PostgreSQL. Shows:
- Which tables exist in the database vs. only in the data dictionary
- Which tables have data vs. are empty
- Field-level drift (columns added/removed/type-changed between data dictionary and DB)
- Overall sync health summary

---

## Schema Bundle API (`/api/schema/bundle`)

Programmatic JSON export of the entire data model:
- Full data dictionary (all tables, fields, types, PKs, FKs)
- L3 table manifest with tiers and categories
- All L105+ metric definitions

Use `?summary=true` for a token-efficient version suitable for AI prompts.

---

## Excel Export (`npm run export:data-model`)

Exports the full data model to an Excel workbook for offline review with stakeholders. Includes separate sheets for L1, L2, L3 tables with all fields, types, and relationships.

---

## Data Loading & Sync Tools

| Command | What It Does |
|---------|-------------|
| `npm run db:introspect` | Syncs PostgreSQL schema to `data-dictionary.json` |
| `npm run sync:data-model` | Syncs from DDL files (fallback when no DB connection) |
| `npm run validate` | Runs 30+ cross-referential integrity checks |
| `npm run export:data-model` | Exports model to Excel |

---

Next: [03 - Onboarding Guide](03-onboarding-guide.md)
