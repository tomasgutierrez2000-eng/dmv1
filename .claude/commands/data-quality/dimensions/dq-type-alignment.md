---
description: "DQ Type Alignment — detects drift between data dictionary declared types and actual PostgreSQL column types"
---

# DQ Type Alignment

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You detect schema drift between the data dictionary (golden source for the UI/visualizer) and the actual PostgreSQL schema (golden source for data). Three-way mismatches between DD, PG, and naming convention indicate DDL migrations that were applied without re-running `db:introspect`, or manual edits that bypassed the pipeline.

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` — this is the DD source
3. Read `CLAUDE.md` section "Data Dictionary <-> DDL Sync" and "Golden Source: PostgreSQL"
4. If a baseline exists at `.claude/audit/dq-baselines/type-alignment.json`, load for delta

### Key Principle

PostgreSQL is the **golden source** for actual schema. The data dictionary is the **golden source** for the UI/visualizer. When they disagree, the fix is usually to run `npm run db:introspect` to re-sync the DD from PG. If PG is wrong, fix the DDL first.

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/dimensions:dq-type-alignment
/data-quality/dimensions:dq-type-alignment --table l2.facility_master
/data-quality/dimensions:dq-type-alignment --fix
```

### Mode B: Orchestrator
Receives JSON payload:
```json
{
  "mode": "orchestrator",
  "fix_mode": false,
  "tables": ["l2.facility_master"]
}
```

---

## 3. Check Procedures

### 3A. Extract PostgreSQL Schema

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT table_name, column_name, data_type,
       character_maximum_length, numeric_precision, numeric_scale,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'l2'
ORDER BY table_name, ordinal_position;
"
```

### 3B. Parse Data Dictionary

Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` and extract for each L2 table:
- `field_name`
- `data_type` (as declared in DD)
- `is_pk`
- `is_fk`

The DD uses a different type naming convention than information_schema. Map DD types to PG types:

| DD Type | PG information_schema `data_type` |
|---------|-----------------------------------|
| `BIGINT` | `bigint` |
| `INTEGER` | `integer` |
| `VARCHAR(N)` | `character varying` (with `character_maximum_length = N`) |
| `NUMERIC(P,S)` | `numeric` (with `numeric_precision = P`, `numeric_scale = S`) |
| `BOOLEAN` | `boolean` |
| `DATE` | `date` |
| `TIMESTAMP` | `timestamp without time zone` |
| `TEXT` | `text` |
| `BIGSERIAL` | `bigint` (with sequence default) |

### 3C. Three-Way Comparison

For each column in each L2 table, compare three sources:

1. **PG Actual** — from information_schema (Step 3A)
2. **DD Declared** — from data-dictionary.json (Step 3B)
3. **Convention Expected** — from suffix-to-type mapping (CLAUDE.md)

Classify each column:

| State | Description | Severity |
|-------|-------------|----------|
| All agree | PG = DD = Convention | OK |
| PG != DD | Schema drift — DD out of sync | HIGH |
| PG != Convention | Naming convention violation | MEDIUM |
| DD != Convention | DD declares non-standard type | LOW |
| All disagree | Three-way mismatch | CRITICAL |

### 3D. Missing Columns (DD vs PG)

**Columns in DD but not in PG (missing in database):**

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'l2'
ORDER BY table_name, column_name;
"
```

Compare against DD column list. Columns in DD but not in PG output indicate:
- DDL migration was written but not applied
- Column was dropped but DD wasn't re-introspected

**Columns in PG but not in DD (extra in database):**

Same comparison, opposite direction. Indicates:
- Column was added via `ALTER TABLE` but `db:introspect` wasn't run
- Manual schema edit bypassed the pipeline

### 3E. Missing Tables (DD vs PG)

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'l2' AND table_type = 'BASE TABLE'
ORDER BY table_name;
"
```

Compare against DD table list:
- Tables in DD but not PG: CRITICAL (visualizer shows phantom tables)
- Tables in PG but not DD: HIGH (data exists but invisible to UI)

### 3F. Precision Mismatch Detection

For NUMERIC columns, check exact precision:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT table_name, column_name, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema = 'l2' AND data_type = 'numeric'
ORDER BY table_name, column_name;
"
```

Common mismatches:
- `_amt` should be NUMERIC(20,4) — check for NUMERIC(10,2) (truncation risk)
- `_pct` should be NUMERIC(10,6) — check for NUMERIC(5,2) (precision loss)
- `_bps` should be NUMERIC(10,4) — check for INTEGER (decimal loss)

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true`.

### 4A. Re-introspect (fixes DD → PG drift)

The most common fix — DD is stale:

```bash
cd /Users/tomas/120/.claude/worktrees/beautiful-villani && npm run db:introspect
```

This regenerates `data-dictionary.json` from the current PG schema.

### 4B. Apply Missing DDL (fixes PG → DD drift where DD is correct)

If DD declares a column that PG doesn't have, the DDL migration needs to be applied:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -c "
ALTER TABLE l2.{table_name} ADD COLUMN {column_name} {data_type};
"
```

Then re-introspect to confirm alignment.

### 4C. Precision Correction

```sql
-- Widen precision (safe — no data loss)
ALTER TABLE l2.{table_name} ALTER COLUMN {column_name} TYPE NUMERIC(20,4);

-- Narrow precision (RISKY — flag for manual review)
-- First check if any values exceed the new precision:
SELECT {column_name}, LENGTH(SPLIT_PART({column_name}::TEXT, '.', 1)) AS int_digits,
       LENGTH(SPLIT_PART({column_name}::TEXT, '.', 2)) AS dec_digits
FROM l2.{table_name}
WHERE {column_name} IS NOT NULL
ORDER BY ABS({column_name}) DESC LIMIT 5;
```

### 4D. Fix Execution Pattern

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -c "
BEGIN;
{fix SQL here}
COMMIT;
"
# Then re-introspect
cd /Users/tomas/120/.claude/worktrees/beautiful-villani && npm run db:introspect
```

---

## 5. Output Format

```json
{
  "agent": "dq-type-alignment",
  "run_timestamp": "2026-03-25T10:00:00Z",
  "scope": "all_l2",
  "summary": {
    "tables_in_pg": 102,
    "tables_in_dd": 100,
    "tables_only_in_pg": 2,
    "tables_only_in_dd": 0,
    "columns_checked": 1847,
    "type_mismatches": 14,
    "missing_in_pg": 3,
    "extra_in_pg": 5,
    "precision_mismatches": 7,
    "by_severity": {
      "CRITICAL": 1,
      "HIGH": 8,
      "MEDIUM": 6,
      "LOW": 4
    }
  },
  "findings": [
    {
      "finding_id": "TA-001",
      "table": "l2.facility_risk_snapshot",
      "column": "risk_weight_std_pct",
      "severity": "HIGH",
      "category": "type_mismatch",
      "pg_type": "integer",
      "dd_type": "NUMERIC(10,6)",
      "convention_type": "NUMERIC(10,6)",
      "comparison": "PG != DD = Convention",
      "fix_type": "alter_column_type",
      "fix_sql": "ALTER TABLE l2.facility_risk_snapshot ALTER COLUMN risk_weight_std_pct TYPE NUMERIC(10,6);",
      "fix_safety": "safe",
      "message": "risk_weight_std_pct is INTEGER in PG but NUMERIC(10,6) in DD and by convention — precision loss"
    },
    {
      "finding_id": "TA-002",
      "table": "l2.position",
      "column": null,
      "severity": "HIGH",
      "category": "table_only_in_pg",
      "fix_type": "re_introspect",
      "fix_sql": "npm run db:introspect",
      "fix_safety": "safe",
      "message": "Table l2.position exists in PG but not in data dictionary — run db:introspect"
    }
  ],
  "fixes_applied": [],
  "delta_from_baseline": {
    "new_findings": 3,
    "resolved_findings": 1,
    "unchanged_findings": 10
  }
}
```

---

## 6. Safety Rules

1. **PostgreSQL is the golden source for actual data types** — when PG and DD disagree, usually re-introspect to fix DD
2. **Never narrow numeric precision without checking existing data** — could truncate values
3. **Never change column types on tables with active FK references** — ALTER TYPE cascades can break FKs
4. **Always run `db:introspect` after any schema fix** to keep DD in sync
5. **Table-level drift (missing/extra tables) is more severe than column-level drift**
6. **Log all findings to `.claude/audit/sessions/`**
7. **If running in orchestrator mode**, return JSON payload only
8. **Precision mismatches where PG has MORE precision than DD/convention are INFO-level** — widening is not harmful
9. **Never auto-fix three-way mismatches** — they require human judgment about which source is correct
