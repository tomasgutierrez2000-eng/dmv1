---
description: "DQ Schema Conformance — validates column naming suffix-to-type convention across all L2 tables"
---

# DQ Schema Conformance

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You validate that every column in every L2 table follows the mandatory naming convention contract: column name suffixes determine the expected PostgreSQL data type. Violations indicate DDL drift, generator bugs, or manual schema edits that bypassed convention.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` for declared schema
3. Read `CLAUDE.md` section "Data Type Rules — The Naming Convention Contract" for the authoritative suffix-to-type mapping
4. If a baseline profile exists at `.claude/audit/dq-baselines/schema-conformance.json`, load it for delta comparison

### Suffix-to-Type Convention (from CLAUDE.md)

| Suffix | Expected PG Type | Notes |
|--------|-----------------|-------|
| `_id` | `bigint` | Exception IDs (metric_id, variant_id, source_metric_id, mdrm_id, mapped_line_id, mapped_column_id) → `character varying` |
| `_code` | `character varying(20)` or `character varying(30)` | |
| `_name`, `_desc`, `_text` | `character varying(500)` | |
| `_amt` | `numeric(20,4)` | |
| `_pct` | `numeric(10,6)` | |
| `_value` | `numeric(12,6)` | |
| `_date` | `date` | |
| `_ts` | `timestamp without time zone` | |
| `_flag` | `boolean` | |
| `_count` | `integer` | |
| `_bps` | `numeric(10,4)` | |
| fallback | `character varying(64)` | |

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/dimensions:dq-schema-conformance
/data-quality/dimensions:dq-schema-conformance --table l2.facility_master
/data-quality/dimensions:dq-schema-conformance --fix
```

### Mode B: Orchestrator
Receives JSON payload:
```json
{
  "mode": "orchestrator",
  "fix_mode": false,
  "tables": ["l2.facility_master", "l2.facility_exposure_snapshot"]
}
```

If `$ARGUMENTS` contains `--table <name>`, scope to that single table. If `--fix` is present, execute fix procedures after reporting. Otherwise, scan all L2 tables.

---

## 3. Check Procedures

### 3A. Enumerate All L2 Columns

Run this query to get every column in the `l2` schema with its actual PostgreSQL type:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT table_name, column_name, data_type,
       character_maximum_length, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema = 'l2'
ORDER BY table_name, ordinal_position;
"
```

### 3B. Apply Suffix Rules

For each column, extract the suffix and determine expected type:

```python
EXCEPTION_IDS = {'metric_id', 'variant_id', 'source_metric_id', 'mdrm_id',
                 'mapped_line_id', 'mapped_column_id'}

SUFFIX_RULES = {
    '_id':    ('bigint', None, None),
    '_code':  ('character varying', 30, None),
    '_name':  ('character varying', 500, None),
    '_desc':  ('character varying', 500, None),
    '_text':  ('character varying', 500, None),
    '_amt':   ('numeric', 20, 4),
    '_pct':   ('numeric', 10, 6),
    '_value': ('numeric', 12, 6),
    '_date':  ('date', None, None),
    '_ts':    ('timestamp without time zone', None, None),
    '_flag':  ('boolean', None, None),
    '_count': ('integer', None, None),
    '_bps':   ('numeric', 10, 4),
}
```

Logic:
1. If column_name is in EXCEPTION_IDS and ends with `_id` → expect `character varying`
2. Otherwise, match the longest matching suffix from SUFFIX_RULES
3. If no suffix matches → expect `character varying(64)` (fallback)
4. Compare `data_type` from information_schema against expected type
5. For `character varying`, also compare `character_maximum_length` (allow >= expected)
6. For `numeric`, compare `numeric_precision` and `numeric_scale` (exact match required)

### 3C. Classify Violations

| Severity | Condition |
|----------|-----------|
| CRITICAL | `_id` column is VARCHAR when it should be BIGINT (or vice versa) — FK join failures |
| CRITICAL | `_flag` column is VARCHAR instead of BOOLEAN — boolean comparison failures |
| HIGH | `_amt` column has wrong precision (e.g., NUMERIC(10,2) instead of NUMERIC(20,4)) — truncation risk |
| HIGH | `_pct` column is INTEGER instead of NUMERIC — precision loss |
| MEDIUM | `_code` column has smaller-than-expected max length (e.g., VARCHAR(10) vs VARCHAR(30)) |
| MEDIUM | `_date` column stored as VARCHAR — date comparison failures |
| LOW | `_name`/`_desc` column has smaller max length than 500 (may truncate long names) |
| INFO | Fallback columns (no matching suffix) — review for potential missing convention |

### 3D. Cross-Check Against Data Dictionary

For each violation found in 3B, also check the data dictionary:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT 'DD declares type for this column — compare against PG actual'
"
```

Parse `facility-summary-mvp/output/data-dictionary/data-dictionary.json` and for each L2 table entry, compare:
- DD declared `data_type` vs PG actual `data_type`
- DD declared `data_type` vs suffix convention expected type
- If all three disagree, flag as CRITICAL (three-way mismatch)

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true` in orchestrator payload.

### 4A. Safe Type Changes (automated)

These type changes are safe because they widen the column:

```sql
-- VARCHAR(N) → VARCHAR(500) for _name/_desc columns (widening)
ALTER TABLE l2.{table} ALTER COLUMN {column} TYPE VARCHAR(500);

-- INTEGER → BIGINT for _id columns (widening)
ALTER TABLE l2.{table} ALTER COLUMN {column} TYPE BIGINT;

-- VARCHAR(N) → VARCHAR(30) for _code columns (widening, only if current max < 30)
ALTER TABLE l2.{table} ALTER COLUMN {column} TYPE VARCHAR(30);
```

### 4B. Risky Type Changes (manual review required)

These require human approval — flag but do not execute:

```sql
-- VARCHAR → BIGINT for _id columns (data must be numeric)
-- First verify all values are numeric:
SELECT COUNT(*) FROM l2.{table} WHERE {column} !~ '^[0-9]+$' AND {column} IS NOT NULL;
-- If 0 non-numeric values:
ALTER TABLE l2.{table} ALTER COLUMN {column} TYPE BIGINT USING {column}::BIGINT;

-- VARCHAR → BOOLEAN for _flag columns
-- First verify all values are boolean-like:
SELECT DISTINCT {column} FROM l2.{table} WHERE {column} IS NOT NULL;
-- If only 'Y'/'N'/'true'/'false'/NULL:
ALTER TABLE l2.{table} ALTER COLUMN {column} TYPE BOOLEAN
  USING CASE WHEN {column} IN ('Y', 'true', 'TRUE', '1') THEN TRUE
             WHEN {column} IN ('N', 'false', 'FALSE', '0') THEN FALSE
             ELSE NULL END;

-- VARCHAR → DATE for _date columns
-- Verify format first:
SELECT {column} FROM l2.{table} WHERE {column} !~ '^\d{4}-\d{2}-\d{2}$' AND {column} IS NOT NULL LIMIT 5;

-- NUMERIC precision changes (narrowing is dangerous)
-- Flag for manual review — never auto-execute
```

### 4C. Fix Execution Pattern

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -c "
BEGIN;
-- Safe widening changes
ALTER TABLE l2.{table} ALTER COLUMN {column} TYPE {new_type};
-- Verify no data loss
SELECT COUNT(*) FROM l2.{table} WHERE {column} IS NOT NULL;
COMMIT;
"
```

After fixes, run `npm run db:introspect` to update the data dictionary.

---

## 5. Output Format

```json
{
  "agent": "dq-schema-conformance",
  "run_timestamp": "2026-03-25T10:00:00Z",
  "scope": "all_l2" | "l2.{table_name}",
  "summary": {
    "tables_checked": 102,
    "columns_checked": 1847,
    "violations": 23,
    "by_severity": {
      "CRITICAL": 2,
      "HIGH": 5,
      "MEDIUM": 10,
      "LOW": 4,
      "INFO": 2
    }
  },
  "findings": [
    {
      "finding_id": "SC-001",
      "table": "l2.facility_master",
      "column": "some_flag",
      "severity": "CRITICAL",
      "category": "type_mismatch",
      "expected_type": "boolean",
      "actual_type": "character varying(10)",
      "suffix": "_flag",
      "fix_sql": "ALTER TABLE l2.facility_master ALTER COLUMN some_flag TYPE BOOLEAN USING ...",
      "fix_safety": "risky",
      "message": "Column 'some_flag' has suffix '_flag' but PG type is VARCHAR(10), expected BOOLEAN"
    }
  ],
  "fixes_applied": [],
  "delta_from_baseline": {
    "new_findings": 3,
    "resolved_findings": 1,
    "unchanged_findings": 19
  }
}
```

---

## 6. Safety Rules

1. **Never DROP columns** — only ALTER TYPE for widening changes
2. **Never execute risky type changes without `--fix` flag AND user confirmation**
3. **Always run in a transaction** — ROLLBACK on any error
4. **Always run `db:introspect` after schema changes** to keep DD in sync
5. **Log all findings to `.claude/audit/sessions/`** with agent name and timestamp
6. **Exception ID list is authoritative** — do not flag metric_id, variant_id etc. as violations
7. **Precision widening is safe; narrowing is never safe** — flag narrowing for manual review
8. **If running in orchestrator mode**, return JSON payload only (no interactive prompts)
