# L3 Data Model — End-to-End SQL Generation Package

## File Inventory

| File | Purpose |
|---|---|
| `00_README.md` | This file — overview and Cursor instructions |
| `01_DDL_all_tables.sql` | CREATE TABLE statements for all 49 L3 tables |
| `02_POPULATION_tier1.sql` | INSERT/SELECT for Tier 1 tables (L1+L2 only) |
| `03_POPULATION_tier2.sql` | INSERT/SELECT for Tier 2 tables (reads Tier 1 L3) |
| `04_POPULATION_tier3.sql` | INSERT/SELECT for Tier 3 tables (reads Tier 1-2 L3) |
| `05_POPULATION_tier4.sql` | INSERT/SELECT for Tier 4 tables (reads all) |
| `06_ORCHESTRATOR.sql` | Master execution script with dependency order |
| `07_RECONCILIATION.sql` | Post-run validation checks |
| `08_INDEXES.sql` | Performance indexes for all tables |
| `09_GLOBAL_CONVENTIONS.md` | Data type mappings, naming, FK rules |

## Execution Order (CRITICAL)

Tables MUST be populated in tier order. Within a tier, order does not matter.

```
TIER 1 → TIER 2 → TIER 3 → TIER 4
```

## Schema Layout

```
l1.*  — 78 reference/master tables (READ ONLY)
l2.*  — 26 event/snapshot tables (READ ONLY)
l3.*  — 49 reporting/analytics tables (WRITE TARGET)
```

## Parameters (set before any execution)

```sql
@run_version_id      -- UUID for this processing run
@as_of_date          -- Reporting date (e.g., '2026-02-17')
@prior_as_of_date    -- Prior period date (typically as_of_date - 1 month)
@base_currency_code  -- Base currency (e.g., 'USD')
@default_hierarchy_id-- Default LoB hierarchy ID
```
