# Data Dictionary and Visualizer Sync

**For the AI / next time:** The visualizer shows tables and fields from the **data dictionary** only. If something exists in DDL but not in the data dictionary, it will not appear in the UI.

## Source of truth

- **Visualizer / "Load from Data Model":** `facility-summary-mvp/output/data-dictionary/data-dictionary.json`
- **DDL sources used for comparison/sync:**
  - **L1:** `scripts/l1/output/ddl.sql`
  - **L2:** `scripts/l2/output/ddl.sql`
  - **L3:** `sql/l3/01_DDL_all_tables.sql`

## Scripts (in repo root)

1. **Compare (report only)**  
   `node scripts/compare-ddl-to-datadict.mjs`  
   Reports missing tables/columns: DDL vs data dictionary for L1, L2, L3.

2. **Augment (fix gaps)**  
   `node scripts/augment-datadict-from-ddl.mjs`  
   Adds any missing tables/columns from DDL into the data dictionary. Preserves existing fields and only inserts missing ones in DDL order.

## When to use

- After changing L1/L2/L3 DDL: run compare, then augment if needed, so the visualizer can show the full model.
- If a user reports "I can't see field X": check whether X is in the data dictionary; if not, add it (or run augment if the column exists in DDL).

## Quick check

```bash
node scripts/compare-ddl-to-datadict.mjs
# OK = all DDL tables/columns present; exit 1 = missing items listed
```
