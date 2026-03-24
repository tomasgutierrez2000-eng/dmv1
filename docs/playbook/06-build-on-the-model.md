# 06 — Build on the Model

> **Audience:** Tech Leads and engineers extending the GSIB data model with new risk stripes (Market Risk, Liquidity, Operational Risk, etc.)
>
> **Prerequisites:** Completed [01 - Data Model Overview](01-data-model-overview.md) and have access to a running PostgreSQL instance.

---

## How to Use This Guide

```
                        ┌──────────────────────────────┐
                        │  I want to add a new stripe  │
                        └──────────────┬───────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │ Do I have metrics defined already?   │
                    └──────┬──────────────────────┬───────┘
                           │ YES                  │ NO
                           ▼                      ▼
                  ┌────────────────┐    ┌──────────────────────┐
                  │ Section 1:     │    │ Start with business   │
                  │ Decompose      │    │ requirements, then    │
                  │ metrics into   │    │ Section 1             │
                  │ ingredients    │    └──────────┬───────────┘
                  └───────┬────────┘               │
                          ▼                        ▼
                  ┌────────────────┐    ┌──────────────────────┐
                  │ Section 2:     │    │ Section 2:            │
                  │ Design new     │◄───│ Design new            │
                  │ tables         │    │ tables                │
                  └───────┬────────┘    └──────────────────────┘
                          ▼
                  ┌────────────────┐
                  │ Section 3:     │
                  │ Create sandbox │
                  │ environment    │
                  └───────┬────────┘
                          ▼
                  ┌────────────────┐
                  │ Section 4:     │
                  │ Generate seed  │
                  │ data           │
                  └───────┬────────┘
                          ▼
                  ┌────────────────┐
                  │ Section 5:     │
                  │ Author & test  │
                  │ metric YAMLs   │
                  └───────┬────────┘
                          ▼
                  ┌────────────────┐
                  │ Section 6:     │
                  │ Merge back to  │
                  │ main           │
                  └────────────────┘
```

---

## Section 0: Connecting to the Data Model

Before building anything, explore what already exists. The platform provides several ways to understand the current schema.

### Interactive Tools

| Tool | URL | What It Shows |
|------|-----|---------------|
| **Data Model Visualizer** | `/visualizer` | Interactive graph of all tables, FKs, and relationships. Green dots = has data, amber = empty, red = not in DB |
| **Data Elements** | `/data-elements` | Searchable table/field browser with types, PKs, FKs |
| **Metric Library** | `/metrics/library` | All existing metrics with formulas, demos, and rollup logic |
| **AI Agent** | `/agent` | Natural-language questions about the schema |
| **DB Status** | `/db-status` | Live reconciliation between data dictionary and PostgreSQL |

### Programmatic Access

| Endpoint | Usage |
|----------|-------|
| `GET /api/schema/bundle` | Full data dictionary + L3 tables + metrics (JSON) |
| `GET /api/schema/bundle?summary=true` | Token-efficient summary for AI prompts |
| `GET /api/metrics/library` | All catalogue items with level definitions |
| `GET /api/db-status` | Per-table database status (rows, drift) |

### Key Source Files

| File | Purpose |
|------|---------|
| `facility-summary-mvp/output/data-dictionary/data-dictionary.json` | Golden source for all table/field/FK definitions |
| `data/l1-table-meta.ts` | L1 table list with SCD types and categories |
| `data/l2-table-meta.ts` | L2 table list (includes `counterparty`, `facility_master`) |
| `data/l3-tables.ts` | L3 derived table definitions |
| `data/metric-library/catalogue.json` | All metric definitions with formulas |
| `data/metric-library/domains.json` | Metric domain registry |
| `scripts/calc_engine/metrics/**/*.yaml` | Technical metric source of truth |

### Important Schema Notes

- **`facility_master` and `counterparty` are L2 tables** (SCD-2 versioned), despite being foundational reference entities. Use `l2.facility_master` and `l2.counterparty` in FK REFERENCES.
- **Rollup hierarchy:** Facility → Counterparty → Desk (L3) → Portfolio (L2) → Business Segment (L1). The EBT (Enterprise Business Taxonomy) tree drives the desk/portfolio/segment rollup.
- **Data flows forward only:** L1 → L2 → L3. L3 tables compute from L1+L2 inputs. Never reference L3 from L2.

---

## Section 1: Metric Decomposition Agent

Use this prompt to decompose your metrics into atomic ingredients and identify what already exists in the data model vs. what needs to be built.

### What You Provide

- Metric name, formula, dimensions, and business description
- Target rollup levels (facility, counterparty, desk, portfolio, segment)
- Regulatory references (optional)

### What the Agent Produces

1. **Ingredient table:** Each atomic input field mapped to existing L1/L2 tables
2. **Gap analysis:** Missing tables and fields with proposed schema, layer, and rationale
3. **FK chain mapping:** How new tables connect to the existing model
4. **Rollup strategy recommendation** with mathematical rationale

### The Prompt

> Copy the full prompt below into your AI tool. Replace `{{YOUR_METRICS}}` with your metric details.

```markdown
# Metric Decomposition Agent

## Your Role
You are a GSIB banking data model specialist. Your job is to decompose metric
specifications into atomic data ingredients and map them to an existing
three-layer data model (L1 Reference, L2 Atomic, L3 Derived).

## Step 1: Read the Current Data Model
Before answering, read these files to understand what already exists:

- `facility-summary-mvp/output/data-dictionary/data-dictionary.json`
  — Full schema: every table, field, type, PK, FK
- `data/metric-library/catalogue.json`
  — All existing metrics with level definitions and ingredient fields
- `data/metric-library/domains.json`
  — Current metric domains

## Step 2: Understand the Layer Convention
- **L1 (Reference):** Dimensions, masters, lookups, hierarchies. Never calculated.
- **L2 (Atomic):** Raw source-system snapshots and events. Point-in-time, never computed.
- **L3 (Derived):** Anything calculated, aggregated, or computed from L1+L2.
- **Data flows forward only:** L1 → L2 → L3. Never backwards.
- **Calculated overlay pattern:** If an L2 table has derived fields, split them
  into an L3 table at the same grain with a FK back to the L2 source.

## Step 3: Naming Convention (types inferred from suffix)
| Suffix    | SQL Type          | Example                    |
|-----------|-------------------|----------------------------|
| `_id`     | BIGINT            | `counterparty_id`          |
| `_code`   | VARCHAR(30)       | `currency_code`            |
| `_name`   | VARCHAR(500)      | `facility_name`            |
| `_amt`    | NUMERIC(20,4)     | `committed_facility_amt`   |
| `_pct`    | NUMERIC(10,6)     | `coverage_ratio_pct`       |
| `_date`   | DATE              | `maturity_date`            |
| `_flag`   | BOOLEAN           | `is_active_flag`           |
| `_ts`     | TIMESTAMP         | `created_ts`               |
| `_count`  | INTEGER           | `facility_count`           |
| `_bps`    | NUMERIC(10,4)     | `interest_rate_spread_bps` |

## Step 4: Rollup Hierarchy
Facility → Counterparty → Desk (L3) → Portfolio (L2) → Business Segment (L1)

Rollup strategies:
- **direct-sum:** Additive amounts. `SUM(value)` at every level.
- **sum-ratio:** Ratios/percentages. `SUM(numerator) / NULLIF(SUM(denominator), 0)`.
  NEVER average pre-computed rates (Simpson's paradox).
- **count-ratio:** Percentage of count. `SUM(CASE flag) / COUNT(*)`.
- **weighted-avg:** `SUM(value * weight) / NULLIF(SUM(weight), 0)`.

## Step 5: Decompose These Metrics

{{YOUR_METRICS}}

## Required Output Format

For EACH metric, produce:

### Metric: [Name]

**Ingredient Table:**

| # | Ingredient Field | Exists? | Table | Schema | Layer | Role | Notes |
|---|-----------------|---------|-------|--------|-------|------|-------|
| 1 | field_name      | YES/NO  | table | l1/l2  | L1/L2 | MEASURE/DIMENSION/FILTER | ... |

**Gap Analysis (missing ingredients only):**

| # | Proposed Table | Proposed Field | Layer | Type | Rationale |
|---|---------------|---------------|-------|------|-----------|
| 1 | new_table     | new_field     | L2    | NUMERIC(20,4) | Needed for ... |

**FK Chain:**
```
new_table.facility_id → l2.facility_master.facility_id
                       → l2.facility_master.counterparty_id
                         → l2.counterparty.counterparty_id
```

**Rollup Strategy:** [direct-sum | sum-ratio | count-ratio | weighted-avg]
**Rationale:** [Why this strategy is correct for this metric]

**Duplicate Check:** [None found | Similar to MET-XXX — recommend extending instead]
```

---

## Section 2: Schema Design Guide

### L1/L2/L3 Decision Tree

```
Is this data calculated, aggregated, or derived from other fields?
├── YES → L3 (Derived)
│         Examples: DSCR, LTV, RWA, EL, risk scores
└── NO
    ├── Is this reference/configuration data that rarely changes?
    │   ├── YES → L1 (Reference)
    │   │         Examples: counterparty, currency_dim, rating_scale_dim
    │   └── NO
    │       └── Is this a point-in-time observation or event from a source system?
    │           ├── YES → L2 (Atomic)
    │           │         Examples: facility_exposure_snapshot, credit_event, position
    │           └── NO → Probably L1 (ask: does it change with each reporting cycle?)
    └── Special case: table has BOTH raw and derived fields?
        └── Split: raw fields → L2, derived fields → new L3 table at same grain
```

### Template DDL by Layer

**L1 Dimension Table:**
```sql
CREATE TABLE IF NOT EXISTS l1.{stripe}_type_dim (
  {stripe}_type_id     BIGSERIAL PRIMARY KEY,
  {stripe}_type_code   VARCHAR(30) NOT NULL UNIQUE,
  {stripe}_type_name   VARCHAR(500) NOT NULL,
  description          VARCHAR(500),
  is_active_flag       BOOLEAN DEFAULT TRUE,
  created_ts           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_ts           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**L2 Snapshot Table:**
```sql
SET search_path TO l1, l2, l3, public;

CREATE TABLE IF NOT EXISTS l2.{stripe}_snapshot (
  {stripe}_snapshot_id BIGSERIAL,
  facility_id          BIGINT NOT NULL,      -- FK → l2.facility_master
  as_of_date           DATE NOT NULL,
  -- metric input fields here --
  {measure}_amt        NUMERIC(20,4),
  {ratio}_pct          NUMERIC(10,6),
  created_ts           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (facility_id, as_of_date),
  CONSTRAINT fk_{stripe}_snap_facility
    FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id)
);
```

**L3 Calculation Table:**
```sql
CREATE TABLE IF NOT EXISTS l3.{stripe}_calc (
  {stripe}_calc_id     BIGSERIAL,
  facility_id          BIGINT NOT NULL,      -- FK → l2.facility_master
  as_of_date           DATE NOT NULL,
  -- derived fields here --
  {metric}_value       NUMERIC(12,6),
  {score}_pct          NUMERIC(10,6),
  created_ts           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (facility_id, as_of_date),
  CONSTRAINT fk_{stripe}_calc_facility
    FOREIGN KEY (facility_id) REFERENCES l2.facility_master(facility_id)
);
```

> **Note:** `facility_master` and `counterparty` live in the `l2` schema (SCD-2 versioned entities), despite being foundational reference-like tables. Always use `l2.facility_master` and `l2.counterparty` in FK REFERENCES. See `data/l2-table-meta.ts` for the full list.

### Schema Design Agent Prompt

> Use this prompt after the Metric Decomposition Agent has identified gaps.

```markdown
# Schema Design Agent

## Your Role
You are a PostgreSQL schema architect for a GSIB banking data model. Given a
gap analysis from the Metric Decomposition Agent, produce production-ready DDL
that follows all project conventions.

## Read These Files First
- `facility-summary-mvp/output/data-dictionary/data-dictionary.json` — existing schema
- `CLAUDE.md` → "DDL Syntax Rules" and "Data Type Rules" sections

## Critical Rules
1. Every table MUST have a PRIMARY KEY (required for GCP Cloud SQL replication)
2. Column names declare their SQL type via suffix (see naming convention)
3. Reserved words must be double-quoted: "value", "user", "order", etc.
4. SET search_path required for cross-schema FKs:
   - L2 DDL: `SET search_path TO l1, l2, public;`
   - L3 DDL: `SET search_path TO l1, l2, l3, public;`
5. Constraint names < 63 characters (NAMEDATALEN limit)
6. Use IF NOT EXISTS for idempotent migrations
7. All _flag columns are BOOLEAN (use = 'Y' in metric SQL for sql.js compat)
8. Every L2 snapshot table needs (facility_id, as_of_date) composite PK
9. Every L3 calc table needs FK back to its L2 source table

## Gap Analysis Input

{{PASTE_GAP_ANALYSIS_HERE}}

## Required Output

1. **DDL file** with sections:
   - Schema declarations (CREATE SCHEMA IF NOT EXISTS)
   - L1 tables first (dims, then masters)
   - L2 tables second (with FKs to L1)
   - L3 tables last (with FKs to L1+L2)

2. **Seed data** for L1 dim tables (INSERT statements with realistic values)

3. **Integration checklist:**
   - [ ] Tables registered in `data/l{N}-table-meta.ts`
   - [ ] `npm run db:introspect` run after DDL applied
   - [ ] Visualizer shows new tables at `/visualizer`
   - [ ] FKs verified with `npm run validate`
```

---

## Section 3: Sandbox Environment Setup

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GCP Cloud SQL Instance                     │
│                                                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │   postgres      │  │ postgres_      │  │ postgres_      │ │
│  │   (MAIN - DO    │  │ capital        │  │ {your_stripe}  │ │
│  │    NOT TOUCH)   │  │ (capital team) │  │ (YOUR sandbox) │ │
│  └───────┬────────┘  └────────────────┘  └───────┬────────┘ │
│          │                                        │           │
│          │           Full schema + data clone      │           │
│          └────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

**The main database (`postgres`) is read-only to stripe teams.** All schema changes happen in your stripe database first, then get merged back via migration review.

### Step-by-Step Setup

**1. Create your stripe database:**
```bash
npm run stripe:create -- --name {your_stripe}
# Example: npm run stripe:create -- --name market
# Creates: postgres_market with full schema + data clone
```

**2. Configure your environment:**
```bash
# Add to your .env (the create command prints this)
STRIPE_DATABASE_URL="postgresql://.../{your_stripe_db}?..."
```

**3. Apply your DDL changes to the stripe:**
```bash
source .env && psql "$STRIPE_DATABASE_URL" -f sql/my-new-tables.sql
```

**4. Pull upstream changes from main (when main gets new tables/columns):**
```bash
npm run stripe:sync -- --name {your_stripe}         # dry-run: see what changed
npm run stripe:sync -- --name {your_stripe} --yes   # apply changes
```

**5. When ready to merge: generate migration for review:**
```bash
npm run stripe:diff -- --name {your_stripe}
# Produces: sql/migrations/stripe-{name}-{timestamp}.sql
# Review, then apply to main after team approval
```

### Registering Stripe-Specific Additions

After adding new tables or columns in your stripe, update `stripe.config.json` so the sync script knows to preserve them:

```json
{
  "stripes": {
    "market": {
      "stripe_only_tables": [
        "l2.market_data_snapshot",
        "l1.market_instrument_type_dim",
        "l3.var_calc"
      ],
      "stripe_only_columns": [
        "l2.position.greeks_delta",
        "l2.position.greeks_gamma"
      ]
    }
  }
}
```

### CLI Reference

<!-- AUTO:STRIPE_CLI -->
| Command | Description |
|---------|-------------|
| `npm run stripe:create -- --name X` | Create isolated stripe database (full clone) |
| `npm run stripe:create -- --name X --schema-only` | Clone schema without data |
| `npm run stripe:create -- --name X --force` | Drop and recreate |
| `npm run stripe:sync -- --name X` | Dry-run: show pending changes from main |
| `npm run stripe:sync -- --name X --yes` | Apply pending changes from main |
| `npm run stripe:diff -- --name X` | Generate migration SQL (stripe → main) |
| `npm run stripe:diff -- --name X --stdout` | Print migration to terminal |
| `npm run stripe:diff -- --name X --include-data` | Include L1 seed INSERT statements |
| `npm run test:stripe` | Run stripe tooling integration tests |
<!-- /AUTO:STRIPE_CLI -->

### Guardrails

- `stripe:create` validates stripe names (lowercase, alphanumeric + underscores)
- `stripe:sync` preserves all stripe-specific additions listed in config
- `stripe:diff` generates idempotent SQL with `IF NOT EXISTS` guards
- The PostToolUse hook does **not** fire for stripe operations — main DB is untouched
- Stripe DBs share the same Cloud SQL instance, so network latency is zero

---

## Section 4: Data Factory Agent

### Sub-Prompt 4A: L1 Reference Data Generator

```markdown
# L1 Reference Data Factory Agent

## Your Role
Generate realistic L1 reference/dimension data for a GSIB banking data model.
L1 data is the foundation — errors here silently corrupt all metric calculations.

## Read These Files First
- `facility-summary-mvp/output/data-dictionary/data-dictionary.json` — existing schema
- `CLAUDE.md` → "L1 Reference Data Quality Rules" section (CRITICAL)
- `CLAUDE.md` → "FK Referential Integrity Rules" section

## Critical Rules

1. **INSERT order: dims → masters → hierarchies → junctions**
   Parent tables MUST be populated before children (FK constraints).

2. **ID range management:**
   - Seed IDs: 1–100 (counterparty), 1–410 (facility), 1–100 (agreements)
   - New stripe data must start ABOVE existing ranges
   - NEVER reuse IDs across stripes

3. **FK integrity:**
   - Every FK value in a child row MUST exist in the parent table
   - String FK values must EXACTLY match parent PK values (case-sensitive)
   - Verify the complete chain: facility → agreement → counterparty

4. **Value types must match DDL:**
   - BIGINT: unquoted integer → `42`
   - VARCHAR: quoted string → `'STANDARD'`
   - BOOLEAN: `TRUE` / `FALSE`
   - DATE: `'2025-01-31'`

5. **Dim table completeness:**
   - Include diverse values (not just 2-3 codes)
   - Every code must have a human-readable name/description
   - Include `is_active_flag` = TRUE on all current entries

## Input: New L1 Tables to Populate

{{PASTE_YOUR_L1_TABLE_DDLS_HERE}}

## Required Output

1. INSERT statements in FK-safe order
2. Summary table: `| Table | Rows | Notes |`
3. Validation query to verify FK integrity:
   ```sql
   SELECT child.*, parent.pk FROM child LEFT JOIN parent ...
   WHERE parent.pk IS NULL  -- should return 0 rows
   ```
```

### Sub-Prompt 4B: L2 Atomic Data Generator

```markdown
# L2 Atomic Data Factory Agent

## Your Role
Generate realistic L2 atomic/snapshot data for a GSIB banking data model.
L2 data feeds all metric calculations — it must be temporally consistent,
FK-valid, and have realistic value ranges.

## Read These Files First
- `facility-summary-mvp/output/data-dictionary/data-dictionary.json` — existing schema
- `CLAUDE.md` → "FK Referential Integrity Rules" and "Scenario Data Generation"
- `scripts/l2/seed-data.ts` — existing seed data generation patterns

## Critical Rules

1. **Temporal consistency:**
   - Generate 3 months of snapshots: `as_of_date` = Nov, Dec, Jan
   - All source tables must have overlapping dates (JOIN returns 0 rows if dates misalign)
   - Flag values must be consistent across dates for the same facility

2. **Realistic value ranges (GSIB calibration):**
   | Field Type | Realistic Range | Bad Default |
   |-----------|----------------|-------------|
   | PD (%) | 0.03–5% (mostly <2%) | 100.5 |
   | LGD (%) | 25–65% | 0 or 100 |
   | Exposure ($) | $1M–$500M | 1.00 |
   | Utilization (%) | 30–90% | 0 or 100 |
   | Spread (bps) | 50–500 | 0 |
   | Days Past Due | 0–120 (mostly 0) | NULL |

3. **Seed data quality checklist:**
   - [ ] Boolean flags have BOTH TRUE and FALSE values
   - [ ] Categorical fields have 3+ distinct values
   - [ ] Numeric fields span multiple threshold buckets
   - [ ] No placeholder strings like `column_name_1`
   - [ ] FK values all exist in parent tables
   - [ ] `drawn_amount <= committed_amount` always
   - [ ] Weight columns (exposure, balance) have 0% NULL

4. **sql.js compatibility:**
   - Use `= 'Y'` for boolean comparisons (not `= TRUE`)
   - No `::FLOAT` casts — use `* 1.0` instead
   - No CTEs — use inline subqueries

## Input: Tables and Facility IDs

{{PASTE_YOUR_L2_TABLE_DDLS_AND_FACILITY_RANGE_HERE}}

## Required Output

1. INSERT statements for each table, 3 date cycles per facility
2. Story arc pattern (facilities should show trends, not random noise):
   - 60% stable (minor fluctuations)
   - 20% deteriorating (increasing PD, decreasing coverage)
   - 10% improving (decreasing PD, increasing coverage)
   - 10% event-driven (sudden changes)
3. `seed-data.ts` handler for the new table:
   ```typescript
   case 'your_new_table':
     switch (columnName) {
       case 'your_field': return generateRealisticValue(rowIndex);
       // ...
     }
   ```
4. Validation: FK chain query + row count summary
```

---

## Section 5: Bulk Metric Authoring & Testing

### YAML Authoring Workflow

For each metric, create a YAML file at `scripts/calc_engine/metrics/{domain}/{METRIC_ID}.yaml`.

Key sections in every YAML:
- `identification:` — metric_id, name, description
- `classification:` — domain, metric_class, direction, unit_type
- `source_tables:` — every table and field referenced
- `levels:` — formula_sql at all 5 rollup levels
- `validation_rules:` — NOT_NULL + THRESHOLD at minimum
- `catalogue:` — UI display configuration

### Testing Pipeline

```bash
# 1. Sync YAML → catalogue + Excel
npm run calc:sync

# 2. Generate demo data (use MET-XXX catalogue IDs)
npm run calc:demo -- --metric MET-XXX --persist --force

# 3. Run calculation engine tests
npm run test:calc-engine

# 4. Test formulas against PostgreSQL (your STRIPE database)
source .env && psql "$STRIPE_DATABASE_URL" -c "
  SELECT facility_id AS dimension_key, SUM(your_measure) AS metric_value
  FROM l2.your_table
  WHERE as_of_date = '2025-01-31'
  GROUP BY facility_id
  LIMIT 10
"

# 5. Rollup reconciliation (direct-sum metrics)
# Verify: SUM(facility values) = counterparty value
```

### Quality Gates Agent Prompt

> Use this prompt before merging your stripe back to main. It reviews everything.

```markdown
# Quality Gates Agent

## Your Role
You are a GSIB data model reviewer performing pre-merge quality assurance.
Review all additions for schema correctness, data quality, formula validity,
and GSIB regulatory compliance.

## Read These Files First
- `facility-summary-mvp/output/data-dictionary/data-dictionary.json`
- `data/metric-library/catalogue.json`
- `CLAUDE.md` → "Common YAML Formula Bugs" table (CRITICAL — check every one)
- `CLAUDE.md` → "L1 Reference Data Quality Rules"
- All new YAML files in `scripts/calc_engine/metrics/{domain}/`

## Review Checklist

### A. Schema Review
For each new table:
- [ ] Correct layer (L1/L2/L3) per convention
- [ ] Has PRIMARY KEY
- [ ] Column names follow suffix → type convention
- [ ] FK constraints defined and reference correct parent tables
- [ ] Reserved words quoted ("value", "user", "order")
- [ ] Constraint names < 63 characters
- [ ] No duplicate column names

### B. Data Quality Review
For seed/test data:
- [ ] FK chain complete: facility → agreement → counterparty
- [ ] No orphaned child rows (all FK values exist in parent)
- [ ] Boolean flags have both TRUE and FALSE values
- [ ] Numeric ranges are GSIB-realistic (see ranges table)
- [ ] No placeholder values (`column_name_1` patterns)
- [ ] Temporal consistency (overlapping as_of_date across tables)

### C. Formula Review
For each metric YAML:
- [ ] `formula_sql` returns exactly `dimension_key` and `metric_value`
- [ ] `NULLIF(x, 0)` before every division
- [ ] `COALESCE()` on nullable fields
- [ ] All JOINs before WHERE clause
- [ ] `= 'Y'` for boolean comparisons (not `= TRUE`)
- [ ] No `::FLOAT` casts (use `* 1.0`)
- [ ] No CTEs (convert to inline subqueries)
- [ ] FX conversion only at aggregate levels (not facility)
- [ ] EBT joins include `AND ebt.is_current_flag = 'Y'`
- [ ] Rollup strategy matches actual SQL aggregation

### D. GSIB Sanity Check
| Metric Type | Healthy Range | Warning |
|------------|--------------|---------|
| PD (%) | 0.03–2% | >10% is distressed |
| LGD (%) | 30–45% | >70% is extreme |
| DSCR | >1.25x | <1.0x is default |
| LTV (%) | <65% | >80% is critical |
| Utilization | 30–70% | >100% is overdraw |

## Input: Files to Review

{{LIST_OF_NEW_YAML_FILES_AND_DDL_FILES}}

## Required Output

### Summary
| Item | Status | Issues |
|------|--------|--------|
| Schema | PASS/FAIL | ... |
| Data Quality | PASS/FAIL | ... |
| Formulas | PASS/FAIL | ... |
| GSIB Sanity | PASS/FAIL | ... |

### Findings (if any)
For each issue:
- **File:** path
- **Severity:** CRITICAL / HIGH / MEDIUM
- **Description:** what's wrong
- **Fix:** how to fix it
```

---

## Section 6: Integration & Merge Checklist

### Pre-Merge Checklist

Before creating a PR to merge your stripe work to main:

- [ ] All new tables registered in `data/l{N}-table-meta.ts` (L1/L2/L3 as appropriate)
- [ ] `npm run calc:sync` passes (YAML → catalogue + Excel)
- [ ] `npm run test:calc-engine` passes with 0 failures
- [ ] `npm run validate` passes (cross-referential integrity)
- [ ] `npm run validate:l1` passes (if L1 data was modified)
- [ ] Migration SQL generated via `npm run stripe:diff -- --name {stripe}`
- [ ] Migration reviewed by team lead
- [ ] Migration tested on a fresh clone of main
- [ ] No collisions with other in-flight stripes (check metric IDs, table names)

### Post-Merge Steps

After merging to main:

```bash
# 1. Apply migration to main database
source .env && psql "$DATABASE_URL" -f sql/migrations/stripe-{name}-{timestamp}.sql

# 2. Introspect to update data dictionary (hook should auto-fire)
npm run db:introspect

# 3. Sync catalogue from all merged YAMLs
npm run calc:sync

# 4. Generate demo data for new metrics
npm run calc:demo -- --metric MET-XXX --persist --force

# 5. Update doc counts
npm run doc:sync

# 6. Verify visualizer shows new tables
# Visit /visualizer and check for green dots
```

### Cross-Stripe Dependency Rules

| Scenario | Rule |
|----------|------|
| New L1 dim table needed by multiple stripes | Add to main first via migration, then all stripes inherit via sync |
| New column on shared L2 table (e.g., `facility_risk_snapshot`) | Coordinate via migration on main — don't add in stripe only |
| New L2 table specific to your stripe | Safe to add in stripe — no conflicts |
| New L3 calc table | Safe to add in stripe — calculated data is always stripe-specific |
| Metric YAML files | Conflict-safe (unique per metric in domain subfolder) |
| `catalogue.json` updates | Handled by `calc:sync` after merge — additive, auto-resolved |

### Scaling: New Metric Domains

To add a new metric domain (e.g., `liquidity`, `market`, `operational`):

1. **Add to `data/metric-library/domains.json`:**
   ```json
   {
     "domain_id": "liquidity",
     "domain_name": "Liquidity & Funding",
     "description": "Metrics related to liquidity coverage, funding stability, and cash flow"
   }
   ```

2. **Create YAML directory:** `scripts/calc_engine/metrics/liquidity/`

3. **Metric ID convention:** `{DOMAIN_PREFIX}-{NNN}` — e.g., `LIQ-001`, `MKT-001`, `OPS-001`

4. **Run `npm run doc:sync`** to update the domain list in this playbook (auto-synced)

### Scaling: ID Ranges for New Stripes

When adding seed data for a new stripe, allocate IDs above existing ranges to avoid collisions:

| Entity | Existing Range | New Stripe Start |
|--------|---------------|-----------------|
| counterparty_id | 1–1720 | 2001+ |
| facility_id | 1–5720 | 6001+ |
| credit_agreement_id | 1–1180 | 2001+ |

Use the block allocation pattern: `base = 2000 + (stripe_number * 500)` to keep stripes isolated.

---

## Appendix A: All AI Prompts (Quick Reference)

| # | Prompt | Purpose | Input | Section |
|---|--------|---------|-------|---------|
| 1 | Metric Decomposition Agent | Decompose metrics to ingredients | Metric specs | [Section 1](#section-1-metric-decomposition-agent) |
| 2 | Schema Design Agent | Produce DDL from gap analysis | Gap analysis table | [Section 2](#section-2-schema-design-guide) |
| 3 | L1 Reference Data Factory | Generate L1 dim/master seed data | L1 table DDLs | [Section 4](#sub-prompt-4a-l1-reference-data-generator) |
| 4 | L2 Atomic Data Factory | Generate L2 snapshot/event data | L2 table DDLs + facility range | [Section 4](#sub-prompt-4b-l2-atomic-data-generator) |
| 5 | Quality Gates Agent | Pre-merge review of all additions | YAML + DDL file list | [Section 5](#quality-gates-agent-prompt) |

---

## Appendix B: Current Model Statistics

<!-- AUTO:TABLE_COUNTS -->
The current data model contains:
- **L1 — Reference Data (75 tables):** Dimensions, masters, lookups, hierarchies
- **L2 — Atomic Data (102 tables):** Raw snapshots and events
- **L3 — Derived Data (76 tables):** Calculated and aggregated data
- **Total: all 253+ tables** across the three layers
<!-- /AUTO:TABLE_COUNTS -->

## Appendix C: Current Metric Domains

<!-- AUTO:DOMAIN_LIST -->
| Domain | Name | Description |
|--------|------|-------------|
| amendments | Amendments & Events | Metrics related to loan amendments, modifications, and restructurings |
| capital | Capital & RWA | Metrics related to capital adequacy and regulatory capital requirements |
| exposure | Exposure & Risk | Metrics related to credit exposure, concentration, and risk quantification |
| pricing | Pricing & Spreads | Metrics related to loan pricing, spreads, and interest rate dynamics |
| profitability | Profitability & Returns | Metrics related to net interest income, fees, and return on assets |
| reference | Reference & Master Data | Metrics related to data quality, completeness, and master data integrity |
| risk | Risk & Monitoring | Metrics related to risk flags, ratings, delinquency, and portfolio health |
<!-- /AUTO:DOMAIN_LIST -->

## Appendix D: Naming Convention Reference

<!-- AUTO:NAMING_CONVENTION -->
| Suffix | SQL Type | Example |
|--------|----------|---------|
| `_id` | BIGINT | `counterparty_id`, `facility_id` |
| `_code` | VARCHAR(30) | `currency_code`, `fr2590_category_code` |
| `_name`, `_desc`, `_text` | VARCHAR(500) | `facility_name` |
| `_amt` | NUMERIC(20,4) | `committed_facility_amt` |
| `_pct` | NUMERIC(10,6) | `coverage_ratio_pct` |
| `_value` | NUMERIC(12,6) | metric output values |
| `_date` | DATE | `maturity_date` |
| `_ts` | TIMESTAMP | `created_ts` |
| `_flag` | BOOLEAN | `is_active_flag` |
| `_count` | INTEGER | `number_of_loans` |
| `_bps` | NUMERIC(10,4) | `interest_rate_spread_bps` |
<!-- /AUTO:NAMING_CONVENTION -->

---

[← Back to Playbook Index](README.md)
