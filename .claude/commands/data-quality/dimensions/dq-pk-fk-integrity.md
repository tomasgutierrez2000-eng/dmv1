---
description: "DQ PK/FK Integrity — validates primary key uniqueness, foreign key referential integrity, and constraint health across all L2 tables"
---

# DQ PK/FK Integrity

You are a **data quality agent** for a GSIB wholesale credit risk data platform. You validate that every primary key is unique, every foreign key references an existing parent row, and no circular FK dependencies exist. FK integrity was the #1 source of data load failures in the platform's history (96 violations in first pass, 80+ in second).

Target: $ARGUMENTS

---

## 1. Context Loading (MANDATORY)

Before running any checks:

1. Read `.claude/config/bank-profile.yaml` for database connection and tier
2. Read `facility-summary-mvp/output/data-dictionary/data-dictionary.json` for declared PKs and FKs
3. Read `CLAUDE.md` section "FK Referential Integrity Rules" for known patterns
4. If a baseline profile exists at `.claude/audit/dq-baselines/pk-fk-integrity.json`, load it for delta comparison
5. Query PostgreSQL for actual constraint definitions:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT
  tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type,
  kcu.column_name,
  ccu.table_schema AS ref_schema, ccu.table_name AS ref_table, ccu.column_name AS ref_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'l2'
ORDER BY tc.table_name, tc.constraint_type, kcu.ordinal_position;
"
```

---

## 2. Invocation

### Mode A: Direct
```
/data-quality/dimensions:dq-pk-fk-integrity
/data-quality/dimensions:dq-pk-fk-integrity --table l2.facility_master
/data-quality/dimensions:dq-pk-fk-integrity --fix
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

---

## 3. Check Procedures

### 3A. Primary Key Uniqueness

For every L2 table, identify the PK columns and check for duplicates.

**Step 1: Get PK definitions**

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT tc.table_name,
       string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS pk_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'l2' AND tc.constraint_type = 'PRIMARY KEY'
GROUP BY tc.table_name
ORDER BY tc.table_name;
"
```

**Step 2: Check for duplicates per table**

For each table with PK columns `col1, col2, ...`:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT {pk_columns}, COUNT(*) AS dup_count
FROM l2.{table_name}
GROUP BY {pk_columns}
HAVING COUNT(*) > 1
LIMIT 20;
"
```

**Step 3: Check for tables without PKs**

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT t.table_name
FROM information_schema.tables t
LEFT JOIN information_schema.table_constraints tc
  ON t.table_name = tc.table_name AND t.table_schema = tc.table_schema AND tc.constraint_type = 'PRIMARY KEY'
WHERE t.table_schema = 'l2' AND t.table_type = 'BASE TABLE'
  AND tc.constraint_name IS NULL
ORDER BY t.table_name;
"
```

### 3B. Foreign Key Orphan Detection

For every FK constraint in L2, check for orphaned child rows.

**Step 1: Get all FK definitions**

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT
  tc.table_name AS child_table,
  kcu.column_name AS child_column,
  ccu.table_schema AS parent_schema,
  ccu.table_name AS parent_table,
  ccu.column_name AS parent_column,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
WHERE tc.table_schema = 'l2' AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;
"
```

**Step 2: Check each FK for orphans**

For each FK constraint:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT COUNT(*) AS orphan_count
FROM l2.{child_table} c
LEFT JOIN {parent_schema}.{parent_table} p ON c.{child_column} = p.{parent_column}
WHERE p.{parent_column} IS NULL AND c.{child_column} IS NOT NULL;
"
```

If orphan_count > 0, get sample orphan values:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT DISTINCT c.{child_column} AS orphan_value, COUNT(*) AS affected_rows
FROM l2.{child_table} c
LEFT JOIN {parent_schema}.{parent_table} p ON c.{child_column} = p.{parent_column}
WHERE p.{parent_column} IS NULL AND c.{child_column} IS NOT NULL
GROUP BY c.{child_column}
ORDER BY affected_rows DESC
LIMIT 10;
"
```

### 3C. FK Nullability Check

Check if FK columns allow NULL when they probably should not:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT c.table_name, c.column_name, c.is_nullable,
       COUNT(*) FILTER (WHERE c.is_nullable = 'YES') OVER () AS nullable_fk_count
FROM information_schema.columns c
JOIN information_schema.key_column_usage kcu
  ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name AND c.table_schema = kcu.table_schema
JOIN information_schema.table_constraints tc
  ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
WHERE c.table_schema = 'l2' AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY c.table_name, c.column_name;
"
```

For each nullable FK column, check actual NULL count:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT COUNT(*) AS null_count, COUNT(*) AS total,
       ROUND(100.0 * SUM(CASE WHEN {fk_column} IS NULL THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS null_pct
FROM l2.{table_name};
"
```

### 3D. Circular FK Detection

Check for FK cycles (A→B→C→A):

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
WITH RECURSIVE fk_chain AS (
  SELECT
    tc.table_name AS child,
    ccu.table_name AS parent,
    ARRAY[tc.table_name] AS path,
    1 AS depth
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.table_schema = 'l2' AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = 'l2'
  UNION ALL
  SELECT
    fc.child,
    ccu.table_name,
    fc.path || tc.table_name,
    fc.depth + 1
  FROM fk_chain fc
  JOIN information_schema.table_constraints tc
    ON tc.table_name = fc.parent AND tc.table_schema = 'l2' AND tc.constraint_type = 'FOREIGN KEY'
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE ccu.table_schema = 'l2'
    AND fc.depth < 10
    AND NOT tc.table_name = ANY(fc.path)
)
SELECT child, parent, path
FROM fk_chain
WHERE parent = child AND depth > 1;
"
```

### 3E. The Complete Chain Check

Verify the critical L2 FK chain is intact:

```bash
source /Users/tomas/120/.env && /opt/homebrew/Cellar/postgresql@18/18.3/bin/psql "$DATABASE_URL" -t -A -c "
SELECT
  'chain_completeness' AS check_name,
  COUNT(*) AS total_facilities,
  COUNT(ca.credit_agreement_id) AS has_agreement,
  COUNT(c.counterparty_id) AS has_counterparty,
  COUNT(fes.facility_id) AS has_exposure,
  COUNT(*) - COUNT(ca.credit_agreement_id) AS missing_agreement,
  COUNT(*) - COUNT(c.counterparty_id) AS missing_counterparty
FROM l2.facility_master fm
LEFT JOIN l2.credit_agreement_master ca ON fm.credit_agreement_id = ca.credit_agreement_id
LEFT JOIN l2.counterparty c ON fm.counterparty_id = c.counterparty_id
LEFT JOIN l2.facility_exposure_snapshot fes ON fm.facility_id = fes.facility_id;
"
```

### Severity Classification

| Severity | Condition |
|----------|-----------|
| CRITICAL | PK duplicates in any table |
| CRITICAL | FK orphans in core chain (facility_master → credit_agreement → counterparty) |
| CRITICAL | Tables without PKs (GCP Cloud SQL replication requirement) |
| CRITICAL | Circular FK references |
| HIGH | FK orphans in snapshot tables (exposure, risk, pricing) |
| HIGH | FK columns with >5% NULL values |
| MEDIUM | FK orphans in event/detail tables (credit_event, amendment) |
| LOW | Nullable FK columns with 0 actual NULLs (cosmetic — add NOT NULL constraint) |

---

## 4. Fix Procedures

Only execute fixes when `--fix` flag is present or `fix_mode: true`.

### 4A. PK Duplicate Removal

```sql
-- Identify and remove duplicates, keeping the row with the latest created_ts
DELETE FROM l2.{table_name}
WHERE ctid NOT IN (
  SELECT DISTINCT ON ({pk_columns}) ctid
  FROM l2.{table_name}
  ORDER BY {pk_columns}, created_ts DESC NULLS LAST
);
```

### 4B. FK Orphan Resolution

**Option 1: Delete orphan rows (when orphans are garbage data)**

```sql
DELETE FROM l2.{child_table}
WHERE {child_column} NOT IN (
  SELECT {parent_column} FROM {parent_schema}.{parent_table}
) AND {child_column} IS NOT NULL;
```

**Option 2: Insert missing parent rows (when orphans are valid data)**

```sql
INSERT INTO {parent_schema}.{parent_table} ({parent_column}, {other_required_columns})
SELECT DISTINCT c.{child_column}, {default_values}
FROM l2.{child_table} c
LEFT JOIN {parent_schema}.{parent_table} p ON c.{child_column} = p.{parent_column}
WHERE p.{parent_column} IS NULL AND c.{child_column} IS NOT NULL;
```

**Option 3: Set orphan FK to NULL (when column is nullable)**

```sql
UPDATE l2.{child_table} SET {child_column} = NULL
WHERE {child_column} NOT IN (
  SELECT {parent_column} FROM {parent_schema}.{parent_table}
);
```

### 4C. Add Missing PK

```sql
ALTER TABLE l2.{table_name} ADD COLUMN {table_name}_id BIGSERIAL PRIMARY KEY;
```

### 4D. Add NOT NULL Constraint

```sql
-- Only if column has 0 NULLs currently
ALTER TABLE l2.{table_name} ALTER COLUMN {fk_column} SET NOT NULL;
```

After any fix, run `npm run db:introspect` to update the data dictionary.

---

## 5. Output Format

```json
{
  "agent": "dq-pk-fk-integrity",
  "run_timestamp": "2026-03-25T10:00:00Z",
  "scope": "all_l2",
  "summary": {
    "tables_checked": 102,
    "pk_checks": {
      "tables_with_pk": 100,
      "tables_without_pk": 2,
      "tables_with_duplicates": 1,
      "total_duplicate_rows": 47
    },
    "fk_checks": {
      "constraints_checked": 66,
      "constraints_with_orphans": 8,
      "total_orphan_rows": 234,
      "nullable_fk_columns": 12
    },
    "circular_refs": 0,
    "chain_completeness": {
      "total_facilities": 410,
      "missing_agreement": 0,
      "missing_counterparty": 0
    },
    "by_severity": {
      "CRITICAL": 3,
      "HIGH": 5,
      "MEDIUM": 4,
      "LOW": 2
    }
  },
  "findings": [
    {
      "finding_id": "FK-001",
      "table": "l2.facility_exposure_snapshot",
      "column": "facility_id",
      "severity": "CRITICAL",
      "category": "fk_orphan",
      "parent_table": "l2.facility_master",
      "parent_column": "facility_id",
      "orphan_count": 15,
      "sample_values": [5999, 6001, 6002],
      "fix_sql": "DELETE FROM l2.facility_exposure_snapshot WHERE facility_id NOT IN (SELECT facility_id FROM l2.facility_master);",
      "fix_safety": "risky",
      "message": "15 rows in facility_exposure_snapshot reference non-existent facility_ids"
    }
  ],
  "fixes_applied": [],
  "delta_from_baseline": {
    "new_findings": 2,
    "resolved_findings": 0,
    "unchanged_findings": 10
  }
}
```

---

## 6. Safety Rules

1. **Never DELETE rows without `--fix` flag AND user confirmation**
2. **Prefer inserting missing parents over deleting orphan children** — data loss is worse than extra rows
3. **Always run in a transaction** — ROLLBACK on any error
4. **Always run `db:introspect` after any schema or data fix**
5. **Log all findings to `.claude/audit/sessions/`**
6. **The Complete Chain (facility → agreement → counterparty) is always CRITICAL** — never downgrade
7. **PK duplicates must be resolved before any other DQ checks** — they invalidate JOIN results
8. **If running in orchestrator mode**, return JSON payload only
9. **Never create FK constraints that don't exist in DDL** — only check existing ones
10. **Cap orphan sample queries at LIMIT 10** — large tables can have millions of orphans
