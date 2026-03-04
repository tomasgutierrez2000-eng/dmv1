# Agent Prompt: Data Model Alignment

Use this prompt with Claude Code or Claude chat to reformat your data model to match the GSIB Credit Risk reference template.

---

## Prompt (copy everything below this line)

You are a data modelling assistant. I need to align my data model with a reference GSIB Credit Risk data model template.

### Your task

1. **Read the reference data model** from the file `data-model-reference.xlsx`. It has 3 tabs:
   - **L1 - Reference & Master**: Reference dimensions, entity masters, hierarchies, facility/agreement tables, netting/collateral/CRM, limits, run/reporting (~81 tables)
   - **L2 - Snapshot & Event**: Position, exposure, collateral snapshots, amendments, credit events, stress tests, ratings, metrics (~28 tables)
   - **L3 - Derived Metrics**: Exposure cubes, risk metrics, limit analytics, regulatory reporting, business segment summaries, executive dashboards (~49 tables)

   Each tab has this column layout:
   | Table Name | Category | SCD Type | Field Name | Description | Why Required | Data Type | Nullable | PK | FK Reference | Default |

   (L3 has a `Tier` column instead of `SCD Type`)

2. **Read my data model** from `[MY_FILE]`. It may be in any format (Excel, CSV, SQL DDL, Word, or markdown). Parse it to understand my tables, fields, types, and relationships.

3. **Produce an aligned output Excel** (`my-data-model-aligned.xlsx`) with 3 tabs (L1, L2, L3) using the exact same column layout as the reference. For each of my tables:
   - Assign it to the correct layer (L1/L2/L3) based on its nature:
     - L1 = reference data, dimensions, master records, hierarchies, static lookups
     - L2 = time-variant snapshots, events, transactional facts, observations
     - L3 = derived/calculated metrics, summaries, cubes, aggregations
   - Assign a **Category** that best matches the reference categories
   - Set the **SCD Type** (SCD-0 for static reference, SCD-1 for current-state masters, SCD-2 for full history, Snapshot for time-stamped facts, Event for event records)
   - Map each field with its data type, nullable flag, PK flag, FK references
   - Fill in Description and Why Required for each field

4. **Create a gap analysis** in a 4th tab called "Gap Analysis" with these columns:
   | Reference Table | Reference Field | Status | My Table | My Field | Notes |

   Where Status is one of:
   - `MATCHED` — field exists in both models with compatible type
   - `TYPE_MISMATCH` — field exists but types differ
   - `MISSING_IN_MINE` — reference has it, I don't
   - `EXTRA_IN_MINE` — I have it, reference doesn't
   - `TABLE_MISSING` — entire reference table has no equivalent in my model
   - `TABLE_EXTRA` — I have a table with no reference equivalent

5. **Create a summary** in a 5th tab called "Summary" showing:
   - Total tables per layer (mine vs reference)
   - Total fields per layer (mine vs reference)
   - Match rate (% of reference fields matched)
   - List of my tables that don't map to any reference table
   - List of reference tables I'm missing entirely

### Important rules
- Preserve all my original field names — do not rename them
- Use the reference model as the template but don't discard my fields that have no reference equivalent; include them with status `EXTRA_IN_MINE`
- For FK references, use the format `l1.table_name(field_name)` or `l2.table_name(field_name)`
- If my data types differ from the reference (e.g. I use `INT` where reference uses `BIGINT`), flag it in the gap analysis but use MY type in the aligned output
- The reference model covers Credit Risk only (no Liquidity or Capital tables). If my model has Liquidity/Capital tables, put them in a separate "Other" tab

### Output
- `my-data-model-aligned.xlsx` — my model reformatted to match the reference template
- Print a brief summary of the alignment results to the console

Replace `[MY_FILE]` above with the path to your data model file before running.
